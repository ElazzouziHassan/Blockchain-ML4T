
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MarketState, Order, MLPrediction, OHLCV } from './types.ts';
import { fetchOHLCVData, calculateTechnicalIndicators, fetchOnChainMetrics, subscribeBinanceWS } from './services/marketData.ts';
import TradingChart from './components/TradingChart.tsx';
import SignalCard from './components/SignalCard.tsx';
import MarketStats from './components/MarketStats.tsx';
import OrderHistory from './components/OrderHistory.tsx';
import FeatureImportance from './components/FeatureImportance.tsx';
import { RefreshCw, Layers, ChevronDown, CheckCircle2, AlertCircle, X, Terminal, Cpu, Coins, Zap, FlaskConical } from 'lucide-react';

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
      const res = await fetch('http://localhost:5000/api/order', { 
        mode: 'cors',
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        setBackendStatus('connected');
        const orders = await res.json();
        setState(prev => ({ ...prev, orders: Array.isArray(orders) ? orders : [] }));
      } else {
        setBackendStatus('error');
      }
    } catch (err) {
      // Graceful degradation: If backend is not running, we show it as disconnected but don't crash
      setBackendStatus('error');
    }
  }, []);

  const fetchLocalPrediction = useCallback(async (symbol: string): Promise<MLPrediction | null> => {
    try {
      const pair = symbol.replace('USDT', '/USDT');
      const res = await fetch(`http://localhost:5000/api/predict?symbol=${pair}`);
      if (res.ok) {
        const data = await res.json();
        addLog(`ML CORE: Prediction updated (${data.signal})`);
        return {
          signal: data.signal,
          confidence: data.confidence,
          accuracy: data.accuracy,
          symbol: data.symbol,
          timestamp: data.timestamp
        };
      }
      throw new Error("Local engine unavailable");
    } catch (e) {
      // Fallback prediction logic for demo purposes when backend is down
      const mockSignal: any = Math.random() > 0.6 ? 'BUY' : Math.random() > 0.3 ? 'HOLD' : 'SELL';
      addLog(`SYSTEM: Using fallback inference (Engine Offline)`);
      return {
        signal: mockSignal,
        confidence: 0.5 + Math.random() * 0.3,
        accuracy: 0.642,
        symbol: symbol,
        timestamp: new Date().toISOString()
      };
    }
  }, []);

  const syncStaticData = useCallback(async (symbol: string) => {
    try {
      const history = await fetchOHLCVData(symbol, 200);
      const onChain = await fetchOnChainMetrics();
      const prediction = await fetchLocalPrediction(symbol);
      
      setState(prev => ({
        ...prev,
        prices: history,
        onChain: onChain,
        indicators: calculateTechnicalIndicators(history),
        prediction: prediction,
        loading: false,
        error: null
      }));
      addLog(`SYSTEM: Snapshot synced for ${symbol}`);
    } catch (err) {
      setState(prev => ({ ...prev, error: "Snapshot sync failed", loading: false }));
    }
  }, [fetchLocalPrediction]);

  useEffect(() => {
    if (wsRef.current) wsRef.current.close();
    
    setState(prev => ({ ...prev, loading: true }));
    syncStaticData(state.selectedSymbol);

    const ws = subscribeBinanceWS(state.selectedSymbol, (candle) => {
      setState(prev => {
        const prices = [...prev.prices];
        const last = prices[prices.length - 1];
        
        let updatedPrices;
        if (last && last.time === candle.time) {
          updatedPrices = [...prices.slice(0, -1), candle];
        } else {
          updatedPrices = [...prices, candle].slice(-300);
        }

        const now = Date.now();
        if (now - lastInferenceTime.current > 15000) {
          lastInferenceTime.current = now;
          fetchLocalPrediction(state.selectedSymbol).then(pred => {
            if (pred) setState(p => ({ ...p, prediction: pred }));
          });
        }

        return {
          ...prev,
          prices: updatedPrices,
          indicators: calculateTechnicalIndicators(updatedPrices)
        };
      });
    });

    wsRef.current = ws;
    return () => ws.close();
  }, [state.selectedSymbol, syncStaticData, fetchLocalPrediction]);

  useEffect(() => {
    checkBackend();
    const interval = setInterval(checkBackend, 30000); 
    return () => clearInterval(interval);
  }, [checkBackend]);

  const executeOrder = async (side: 'BUY' | 'SELL') => {
    const lastPrice = state.prices.length > 0 ? state.prices[state.prices.length - 1].close : 0;
    const amount = 0.05; 
    
    addLog(`ORDER: Executing ${side} ${amount} ${state.selectedSymbol}`);
    
    try {
      const res = await fetch('http://localhost:5000/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          side,
          amount,
          price: lastPrice,
          symbol: state.selectedSymbol.replace('USDT', '/USDT')
        })
      });

      if (res.ok) {
        const updatedOrders = await res.json();
        setLastPlacedOrderId(updatedOrders[0]?.id);
        setState(prev => ({ ...prev, orders: updatedOrders }));
        setNotification({ type: 'success', message: `${side} order filled @ $${lastPrice.toLocaleString()}` });
      } else {
        throw new Error("Execution failed");
      }
    } catch (err) {
      // Mock execution if backend is down
      const mockOrderId = Math.random().toString(36).substring(7).toUpperCase();
      const newOrder: Order = {
        id: mockOrderId,
        side,
        price: lastPrice,
        amount,
        timestamp: new Date().toISOString(),
        symbol: state.selectedSymbol
      };
      setLastPlacedOrderId(mockOrderId);
      setState(prev => ({ ...prev, orders: [newOrder, ...prev.orders] }));
      setNotification({ type: 'warning', message: `Local Simulated Fill: ${side} @ $${lastPrice.toLocaleString()}` });
      addLog(`SYSTEM: Simulated trade fill (Engine Offline)`);
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      const res = await fetch('http://localhost:5000/api/order/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId })
      });
      if (res.ok) {
        const updatedOrders = await res.json();
        setState(prev => ({ ...prev, orders: updatedOrders }));
        setLastPlacedOrderId(null);
        setNotification({ type: 'warning', message: `Order #${orderId} revoked.` });
      } else {
        throw new Error("Cancellation failed");
      }
    } catch (err) {
      // Handle local cancellation if backend is down
      setState(prev => ({ ...prev, orders: prev.orders.filter(o => o.id !== orderId) }));
      setLastPlacedOrderId(null);
      setNotification({ type: 'warning', message: `Order #${orderId} removed (Local).` });
    }
  };

  const dismissOrderOverlay = () => {
    setLastPlacedOrderId(null);
    addLog("SYSTEM: Trade confirmed and finalized.");
  };

  const selectedCoin = SUPPORTED_COINS.find(c => c.id === state.selectedSymbol);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-indigo-500/30">
      {notification && (
        <div className="fixed bottom-8 right-8 z-[100] max-w-sm w-full animate-in slide-in-from-right-8 p-4 rounded-xl border bg-slate-900/90 shadow-2xl backdrop-blur-md flex items-start gap-3 border-indigo-500/30">
          {notification.type === 'success' ? <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" size={18} /> : 
           notification.type === 'warning' ? <AlertCircle className="text-amber-400 shrink-0 mt-0.5" size={18} /> :
           <AlertCircle className="text-rose-400 shrink-0 mt-0.5" size={18} />}
          <div className="flex-1">
            <p className="text-[11px] leading-relaxed opacity-90 font-medium">{notification.message}</p>
          </div>
          <button onClick={() => setNotification(null)} className="opacity-50 hover:opacity-100 transition-opacity"><X size={14} /></button>
        </div>
      )}

      <header className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent opacity-50" />
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <FlaskConical className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white leading-none">2iad-ML4T</h1>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Strategy Experiment</p>
              </div>
            </div>
            
            <div className="h-4 w-px bg-slate-800" />
            
            <div className="relative">
              <button 
                onClick={() => setIsCoinSelectorOpen(!isCoinSelectorOpen)}
                className="flex items-center gap-3 px-3 py-1.5 bg-slate-900/40 hover:bg-slate-800/80 border border-slate-700/50 rounded-lg transition-all group backdrop-blur-sm"
              >
                <div className="w-5 h-5 bg-indigo-500/20 rounded-full flex items-center justify-center">
                  <Coins size={12} className="text-indigo-400" />
                </div>
                <span className="text-xs font-bold font-mono tracking-tight text-white">{selectedCoin?.symbol} / USDT</span>
                <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${isCoinSelectorOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isCoinSelectorOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-slate-900/95 border border-slate-800/50 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 backdrop-blur-xl">
                  {SUPPORTED_COINS.map(coin => (
                    <button
                      key={coin.id}
                      onClick={() => {
                        setState(prev => ({ ...prev, selectedSymbol: coin.id }));
                        setIsCoinSelectorOpen(false);
                        setLastPlacedOrderId(null);
                        addLog(`ASSET: Monitoring ${coin.symbol}...`);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-indigo-600/10 transition-colors group ${state.selectedSymbol === coin.id ? 'bg-indigo-600/5 border-l-2 border-indigo-500' : ''}`}
                    >
                      <div className="flex flex-col">
                        <span className={`text-xs font-bold ${state.selectedSymbol === coin.id ? 'text-indigo-400' : 'text-slate-200'}`}>{coin.symbol}</span>
                        <span className="text-[10px] text-slate-500">{coin.name}</span>
                      </div>
                      {state.selectedSymbol === coin.id && <CheckCircle2 size={12} className="text-indigo-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 text-[10px] font-mono">
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse`} />
                <span className="text-emerald-500 uppercase font-bold tracking-widest flex items-center gap-1.5">
                  <Zap size={10} fill="currentColor" /> Live Feed
                </span>
              </div>
              <div className="h-4 w-px bg-slate-800" />
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${backendStatus === 'connected' ? 'bg-indigo-500' : 'bg-rose-500'}`} />
                <span className="text-slate-500 uppercase">Engine: {backendStatus}</span>
              </div>
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
              <div className="bg-slate-900/40 border border-slate-800/50 backdrop-blur-sm rounded-xl p-5 font-mono">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase">
                    <Terminal size={14} /> System Pipeline
                  </div>
                  <div className="flex items-center gap-2 px-2 py-0.5 bg-slate-800/50 rounded text-[9px] text-slate-400">
                    <Cpu size={10} /> ML-Sync Active
                  </div>
                </div>
                <div className="space-y-1.5 h-[200px] overflow-hidden">
                  {logs.map((log, i) => (
                    <div key={i} className={`text-[11px] ${i === 0 ? 'text-indigo-300' : 'text-slate-600'}`}>
                      <span className="opacity-30 mr-2">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                      {log}
                    </div>
                  ))}
                  <div className="text-[10px] text-slate-700 mt-4 italic font-bold">
                    {`>> ${state.selectedSymbol} experimentation engine initialized...`}
                  </div>
                </div>
              </div>
              <OrderHistory orders={state.orders} />
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-6">
            <SignalCard 
              prediction={state.prediction} 
              loading={state.loading} 
              onExecuteOrder={executeOrder}
              onCancelOrder={cancelOrder}
              onConfirmOrder={dismissOrderOverlay}
              lastOrderId={lastPlacedOrderId}
              symbol={state.selectedSymbol} 
            />
            
            <FeatureImportance />
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800/40 py-8 px-6 text-center text-[10px] text-slate-500 font-mono tracking-tight">
        <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 uppercase">
          <span>2iad-ML4T Live Streaming Terminal</span>
          <span className="hidden md:inline opacity-30">|</span>
          <span>ML4T for Crypto</span>
          <span className="hidden md:inline opacity-30">|</span>
          <span>
            Designed & Developed by{' '}
            <a 
              href="https://wizardy.vercel.app/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 transition-colors font-bold underline underline-offset-4 decoration-indigo-500/30"
            >
              @Elazzouzi
            </a>{' '}
            & @Chwayt
          </span>
          <span className="hidden md:inline opacity-30">|</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Status: Fully Synchronized
          </span>
        </div>
      </footer>
    </div>
  );
};

export default App;
