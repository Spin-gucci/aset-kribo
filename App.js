/* =============================
   FIXED & REFACTORED VERSION
   Binance Real API (USDT market)
   Auto Convert USDT -> IDR
   Stable WebSocket
   Production-ready structure
============================= */

// ================= CONFIG =================
const CONFIG = {
    updateInterval: 15000,
    defaultFiat: 'IDR',
    useWebSocket: true
};

// ================= SYMBOL LIST (REAL BINANCE MARKET) =================
const CRYPTO_LIST = [
    { symbol: 'BTC', name: 'Bitcoin', binanceSymbol: 'BTCUSDT', cmcId: 1 },
    { symbol: 'ETH', name: 'Ethereum', binanceSymbol: 'ETHUSDT', cmcId: 1027 },
    { symbol: 'BNB', name: 'Binance Coin', binanceSymbol: 'BNBUSDT', cmcId: 1839 },
    { symbol: 'SOL', name: 'Solana', binanceSymbol: 'SOLUSDT', cmcId: 5426 },
    { symbol: 'XRP', name: 'Ripple', binanceSymbol: 'XRPUSDT', cmcId: 52 },
    { symbol: 'ADA', name: 'Cardano', binanceSymbol: 'ADAUSDT', cmcId: 2010 },
    { symbol: 'DOGE', name: 'Dogecoin', binanceSymbol: 'DOGEUSDT', cmcId: 74 },
    { symbol: 'DOT', name: 'Polkadot', binanceSymbol: 'DOTUSDT', cmcId: 6636 }
];

// ================= STATE =================
const appState = {
    cryptoData: [],
    usdtToIdr: 0,
    ws: null
};

// ================= UTILS =================
function formatIDR(num){
    return `Rp ${Math.round(num).toLocaleString('id-ID')}`;
}

// ================= BINANCE API =================
class BinanceAPI{
    constructor(){
        this.baseURL = 'https://api.binance.com/api/v3';
        this.wsURL = 'wss://stream.binance.com:9443/ws';
    }

    async getTicker24hr(symbol){
        const res = await fetch(`${this.baseURL}/ticker/24hr?symbol=${symbol}`);
        return res.json();
    }

    async getKlines(symbol, interval='1h', limit=24){
        const res = await fetch(`${this.baseURL}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
        return res.json();
    }

    createWebSocket(symbols, callback){
        const streams = symbols.map(s=>`${s.toLowerCase()}@ticker`).join('/');
        const ws = new WebSocket(`${this.wsURL}/${streams}`);

        ws.onmessage = e => callback(JSON.parse(e.data));
        ws.onclose = ()=> setTimeout(()=> this.createWebSocket(symbols, callback), 3000);
        return ws;
    }
}

// ================= RATE SERVICE =================
async function getUSDTtoIDR(){
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const data = await res.json();
    return data.rates.IDR;
}

// ================= APP =================
class CryptoMarketApp{
    constructor(){
        this.api = new BinanceAPI();
        this.init();
    }

    async init(){
        appState.usdtToIdr = await getUSDTtoIDR();
        await this.loadAllData();
        if(CONFIG.useWebSocket) this.initWS();
    }

    async loadAllData(){
        const promises = CRYPTO_LIST.map(c=>this.loadCrypto(c));
        const data = await Promise.all(promises);
        appState.cryptoData = data.filter(Boolean);
        this.render();
    }

    async loadCrypto(crypto){
        try{
            const t = await this.api.getTicker24hr(crypto.binanceSymbol);
            const k = await this.api.getKlines(crypto.binanceSymbol);

            const priceUSDT = parseFloat(t.lastPrice);
            const priceIDR = priceUSDT * appState.usdtToIdr;

            return {
                ...crypto,
                priceUSDT,
                priceIDR,
                change24h: parseFloat(t.priceChangePercent),
                volumeUSDT: parseFloat(t.quoteVolume),
                sparkline: k.map(x=>parseFloat(x[4]) * appState.usdtToIdr)
            }
        }catch(e){
            console.error('Load error', crypto.symbol, e);
            return null;
        }
    }

    initWS(){
        const symbols = CRYPTO_LIST.map(c=>c.binanceSymbol);
        appState.ws = this.api.createWebSocket(symbols, data=>this.onWS(data));
    }

    onWS(data){
        const sym = data.s;
        const coin = appState.cryptoData.find(c=>c.binanceSymbol===sym);
        if(!coin) return;

        coin.priceUSDT = parseFloat(data.c);
        coin.priceIDR = coin.priceUSDT * appState.usdtToIdr;
        coin.change24h = parseFloat(data.P);
        this.render();
    }

    render(){
        console.clear();
        console.table(appState.cryptoData.map(c=>({
            Coin: c.symbol,
            Price_IDR: formatIDR(c.priceIDR),
            Change: c.change24h+'%'
        })));
    }
}

// ================= INIT =================
document.addEventListener('DOMContentLoaded',()=>{
    window.app = new CryptoMarketApp();
});
