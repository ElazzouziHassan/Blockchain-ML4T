
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MarketState, MLPrediction } from './types.ts';
import { fetchOHLCVData, calculateTechnicalIndicators, fetchOnChainMetrics, subscribeBinanceWS } from './services/marketData.ts';
import TradingChart from './components/TradingChart.tsx';
import SignalCard from './components/SignalCard.tsx';
import MarketStats from './components/MarketStats.tsx';
import OrderHistory from './components/OrderHistory.tsx';
import FeatureImportance from './components/FeatureImportance.tsx';
import { ChevronDown, CheckCircle2, X, Terminal, FlaskConical, Coins, Binary } from 'lucide-react';

const SUPPORTED_COINS = [
  { id: 'BTCUSDT', name: 'Bitcoin', symbol: 'BTC' },
  { id: 'ETHUSDT', name: 'Ethereum', symbol: 'ETH' },
  { id: 'SOLUSDT', name: 'Solana', symbol: 'SOL' },
  { id: 'BNBUSDT', name: 'BNB', symbol: 'BNB' },
  { id: 'ADAUSDT', name: 'Cardano', symbol: 'ADA' },
];

const App: React.FC = () => {
  const [state, setState] = useState<MarketState>({
    selectedSymbol: 'BTCUSDT',
    prices: [],
    indicators: { rsi: 0, macd: { value: 0, signal: 0, histogram: 0 }, bollinger: { upper: 0, middle: 0, lower: 0 }, atr: 0 },
    onChain: { whaleInflow: 0, activeAddresses: 0, gasPrice: 0 },
    prediction: null,
    orders: [],
    loading: true,
    error: null
  });

  const [backendStatus, setBackendStatus] = useState<'connected' | 'error' | 'checking'>('checking');
  const [logs, setLogs] = useState<string[]>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning', message: string } | null>(null);
  const [isCoinSelectorOpen, setIsCoinSelectorOpen] = useState(false);
  const [lastPlacedOrderId, setLastPlacedOrderId] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const lastInferenceTime = useRef<number>(0);

  const addLog = (msg: string) => setLogs(prev => [msg, ...prev].slice(0, 8));

  const checkBackend = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:5000/api/order', { mode: 'cors' });
      if (res.ok) {
        setBackendStatus('connected');
        const orders = await res.json();
        setState(prev => ({ ...prev, orders: Array.isArray(orders) ? orders : [] }));
      } else {
        setBackendStatus('error');
      }
    } catch (err) {
      setBackendStatus('error');
    }
  }, []);

  const fetchFusedPrediction = useCallback(async (symbol: string): Promise<MLPrediction | null> => {
    try {
      const pair = symbol.replace('USDT', '/USDT');
      const res = await fetch(`http://localhost:5000/api/predict?symbol=${pair}`);
      if (res.ok) {
        const data = await res.json();
        addLog(`FUSION: Tech (${data.fusion.technical.signal}) | Social (${data.fusion.sentiment.signal})`);
        return data;
      }
      throw new Error("Engine Offline");
    } catch (e) {
      addLog(`SYSTEM: Fallback inference active.`);
      const mockProb = Math.random();
      return {
        signal: mockProb > 0.5 ? 'BUY' : 'SELL',
        confidence: mockProb > 0.5 ? mockProb : 1 - mockProb,
        accuracy: 0.542,
        symbol: symbol,
        timestamp: new Date().toISOString(),
        fusion: {
          technical: { signal: 'BUY', confidence: 0.55, weight: 0.6 },
          sentiment: { signal: 'SELL', confidence: 0.52, weight: 0.4 }
        }
      };
    }
  }, []);

  useEffect(() => {
    if (wsRef.current) wsRef.current.close();
    setState(prev => ({ ...prev, loading: true }));
    
    const initData = async () => {
      const history = await fetchOHLCVData(state.selectedSymbol, 200);
      const onChain = await fetchOnChainMetrics();
      const prediction = await fetchFusedPrediction(state.selectedSymbol);
      
      setState(prev => ({
        ...prev,
        prices: history,
        onChain: onChain,
        indicators: calculateTechnicalIndicators(history),
        prediction: prediction,
        loading: false
      }));
    };

    initData();

    const ws = subscribeBinanceWS(state.selectedSymbol, (candle) => {
      setState(prev => {
        const prices = [...prev.prices];
        const last = prices[prices.length - 1];
        let updatedPrices = last && last.time === candle.time ? [...prices.slice(0, -1), candle] : [...prices, candle].slice(-300);

        const now = Date.now();
        if (now - lastInferenceTime.current > 12000) {
          lastInferenceTime.current = now;
          fetchFusedPrediction(state.selectedSymbol).then(pred => pred && setState(p => ({ ...p, prediction: pred })));
        }

        return { ...prev, prices: updatedPrices, indicators: calculateTechnicalIndicators(updatedPrices) };
      });
    });

    wsRef.current = ws;
    return () => ws.close();
  }, [state.selectedSymbol, fetchFusedPrediction]);

  useEffect(() => {
    checkBackend();
    const interval = setInterval(checkBackend, 30000); 
    return () => clearInterval(interval);
  }, [checkBackend]);

  const cancelOrder = async (orderId: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/order/${orderId}`, {
        method: 'DELETE',
        mode: 'cors'
      });
      if (res.ok) {
        const updated = await res.json();
        setState(prev => ({ ...prev, orders: Array.isArray(updated) ? updated : prev.orders.filter(o => o.id !== orderId) }));
        setLastPlacedOrderId(null);
        setNotification({ type: 'warning', message: `Order Cancelled: #${orderId}` });
      }
    } catch (err) {
      setState(prev => ({ 
        ...prev, 
        orders: prev.orders.filter(o => o.id !== orderId) 
      }));
      setLastPlacedOrderId(null);
      setNotification({ type: 'warning', message: `Simulation Order Removed: #${orderId}` });
    }
  };

  const executeOrder = async (side: 'BUY' | 'SELL') => {
    const lastPrice = state.prices.length > 0 ? state.prices[state.prices.length - 1].close : 0;
    const amount = 0.05; 
    try {
      const res = await fetch('http://localhost:5000/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ side, amount, price: lastPrice, symbol: state.selectedSymbol.replace('USDT', '/USDT') })
      });
      if (res.ok) {
        const updated = await res.json();
        setLastPlacedOrderId(updated[0]?.id);
        setState(prev => ({ ...prev, orders: updated }));
        setNotification({ type: 'success', message: `${side} Fill: $${lastPrice.toLocaleString()}` });
      }
    } catch (err) {
      const mockId = Math.random().toString(36).substring(7).toUpperCase();
      setLastPlacedOrderId(mockId);
      setState(prev => ({ ...prev, orders: [{ id: mockId, side, price: lastPrice, amount, timestamp: new Date().toISOString(), symbol: state.selectedSymbol }, ...prev.orders] }));
      setNotification({ type: 'warning', message: `Local Simulation Fill: ${side} @ $${lastPrice}` });
    }
  };

  const selectedCoin = SUPPORTED_COINS.find(c => c.id === state.selectedSymbol);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-indigo-500/30 overflow-x-hidden font-inter">
      {notification && (
        <div className="fixed bottom-8 right-8 z-[100] max-w-sm w-full animate-in slide-in-from-right-8 p-4 rounded-xl border bg-slate-900/90 shadow-2xl backdrop-blur-md flex items-start gap-3 border-indigo-500/30">
          <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" size={18} />
          <p className="text-[11px] leading-relaxed opacity-90 font-medium">{notification.message}</p>
          <button onClick={() => setNotification(null)} className="opacity-50 hover:opacity-100"><X size={14} /></button>
        </div>
      )}

      <header className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30"><FlaskConical className="text-white" size={20} /></div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white leading-none">2IAD - ML4T </h1>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Dual-Model Execution</p>
              </div>
            </div>
            <div className="relative">
              <button onClick={() => setIsCoinSelectorOpen(!isCoinSelectorOpen)} className="flex items-center gap-3 px-3 py-1.5 bg-slate-900/40 border border-slate-700/50 rounded-lg transition-all group backdrop-blur-sm">
                <Coins size={12} className="text-indigo-400" />
                <span className="text-xs font-bold font-mono text-white">{selectedCoin?.symbol}</span>
                <ChevronDown size={14} className={`text-slate-500 transition-transform ${isCoinSelectorOpen ? 'rotate-180' : ''}`} />
              </button>
              {isCoinSelectorOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                  {SUPPORTED_COINS.map(coin => (
                    <button key={coin.id} onClick={() => { setState(prev => ({ ...prev, selectedSymbol: coin.id })); setIsCoinSelectorOpen(false); setLastPlacedOrderId(null); }} className="w-full px-4 py-3 hover:bg-indigo-600/10 text-xs font-bold text-slate-300 transition-colors border-b border-slate-800/50 last:border-0">{coin.symbol}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-[10px] text-emerald-500 font-bold uppercase tracking-widest">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> FUSION ACTIVE
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6 space-y-6">
        <MarketStats onChain={state.onChain} indicators={state.indicators} />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <TradingChart data={state.prices} prediction={state.prediction} selectedSymbol={state.selectedSymbol} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900/40 border border-slate-800/50 backdrop-blur-sm rounded-xl p-5 font-mono overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-indigo-400 text-[10px] font-bold uppercase flex items-center gap-2"><Terminal size={14} /> FUSION PIPELINE</div>
                  <div className="text-[9px] text-slate-500 uppercase">Dual-Sync 12s</div>
                </div>
                <div className="space-y-1.5 h-[180px] overflow-hidden">
                  {logs.map((log, i) => (
                    <div key={i} className={`text-[11px] ${i === 0 ? 'text-indigo-300' : 'text-slate-600'}`}>
                      <span className="opacity-30 mr-2">[{new Date().toLocaleTimeString([], { hour12: false })}]</span> {log}
                    </div>
                  ))}
                </div>
              </div>
              <OrderHistory orders={state.orders} />
            </div>
          </div>
          <div className="lg:col-span-4 flex flex-col gap-6">
            <SignalCard prediction={state.prediction} loading={state.loading} onExecuteOrder={executeOrder} onCancelOrder={cancelOrder} onConfirmOrder={() => setLastPlacedOrderId(null)} lastOrderId={lastPlacedOrderId} symbol={state.selectedSymbol} />
            <FeatureImportance />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
