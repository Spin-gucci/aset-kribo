// ================================
// Binance Realtime Crypto Dashboard
// FULL UI CONNECTED VERSION
// ================================

const symbols = [
    "btcusdt",
    "ethusdt",
    "bnbusdt",
    "solusdt",
    "xrpusdt"
];

const API_24H = "https://api.binance.com/api/v3/ticker/24hr";
let USDT_IDR = 16000; // default fallback

const tableBody = document.getElementById("cryptoTable");
const rateInfo = document.getElementById("rateInfo");

let marketData = {};

// ================================
// Fetch USDT to IDR Rate
// ================================
async function fetchRate() {
    try {
        const res = await fetch("https://api.exchangerate.host/latest?base=USD&symbols=IDR");
        const data = await res.json();
        USDT_IDR = data.rates.IDR;
        rateInfo.innerText = `USDT → IDR : ${USDT_IDR.toLocaleString()}`;
    } catch (e) {
        rateInfo.innerText = `USDT → IDR : ${USDT_IDR.toLocaleString()} (fallback)`;
    }
}

// ================================
// Render Table
// ================================
function renderTable() {
    tableBody.innerHTML = "";
    let i = 1;

    Object.values(marketData).forEach(item => {
        const priceIDR = (parseFloat(item.c) * USDT_IDR).toLocaleString();
        const change = parseFloat(item.P);

        const tr = document.createElement("tr");
        tr.className = "crypto-row";

        tr.innerHTML = `
            <td>${i++}</td>
            <td>${item.s.replace("USDT", "")}</td>
            <td>Rp ${priceIDR}</td>
            <td class="${change >= 0 ? 'positive' : 'negative'}">${change.toFixed(2)}%</td>
        `;

        tableBody.appendChild(tr);
    });
}

// ================================
// Initial Data Load
// ================================
async function loadInitialData() {
    const res = await fetch(API_24H);
    const data = await res.json();

    data.forEach(item => {
        const symbol = item.symbol.toLowerCase();
        if (symbols.includes(symbol)) {
            marketData[symbol] = item;
        }
    });

    renderTable();
}

// ================================
// WebSocket Realtime
// ================================
function connectWS() {
    const streams = symbols.map(s => `${s}@ticker`).join("/");
    const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);

    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        const data = msg.data;
        const symbol = data.s.toLowerCase();

        if (marketData[symbol]) {
            marketData[symbol] = data;
            renderTable();
        }
    };

    ws.onclose = () => {
        console.log("WS reconnecting...");
        setTimeout(connectWS, 3000);
    };
}

// ================================
// INIT
// ================================
fetchRate();
loadInitialData();
connectWS();
