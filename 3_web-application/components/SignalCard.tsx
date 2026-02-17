
import React, { useState, useEffect } from 'react';
import { MLPrediction } from '../types';
import { 
  TrendingUp, TrendingDown, ShieldCheck, CheckCircle, 
  Cpu, Share2, Binary, ArrowUpRight, ArrowDownRight, 
  Hash, Activity, Globe, Info, Zap
} from 'lucide-react';

interface SignalCardProps {
  prediction: MLPrediction | null;
  loading: boolean;
  onExecuteOrder: (side: 'BUY' | 'SELL') => void;
  onCancelOrder: (orderId: string) => void;
  onConfirmOrder: () => void;
  lastOrderId: string | null;
  symbol: string;
}

const SignalCard: React.FC<SignalCardProps> = ({ 
  prediction, 
  loading, 
  onExecuteOrder, 
  onCancelOrder, 
  onConfirmOrder, 
  lastOrderId 
}) => {
  const [isPlaced, setIsPlaced] = useState(false);

  useEffect(() => {
    setIsPlaced(!!lastOrderId);
  }, [lastOrderId]);

  if (loading) {
    return (
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 h-full flex flex-col gap-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-4 w-32 bg-slate-800 rounded" />
          <div className="h-6 w-16 bg-slate-800 rounded" />
        </div>
        <div className="h-20 w-3/4 bg-slate-800 rounded" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-16 bg-slate-800 rounded" />
          <div className="h-16 bg-slate-800 rounded" />
        </div>
        <div className="h-24 bg-slate-800/50 rounded" />
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="bg-slate-950 border border-slate-800/50 rounded-2xl p-6 h-full flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-indigo-500/5 rounded-full flex items-center justify-center mb-4 border border-indigo-500/10">
          <Binary className="text-indigo-400/40 animate-pulse" size={32} />
        </div>
        <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Engine Initializing</h3>
        <p className="text-[11px] text-slate-600 max-w-[200px] leading-relaxed">Connecting to high-velocity social & technical data streams...</p>
      </div>
    );
  }

  const isBuy = prediction.signal === 'BUY';
  const isSell = prediction.signal === 'SELL';
  const isHold = prediction.signal === 'HOLD';
  
  const statusColor = isBuy ? 'text-emerald-400' : isSell ? 'text-rose-400' : 'text-slate-400';
  const shadowColor = isBuy ? 'shadow-emerald-500/5' : isSell ? 'shadow-rose-500/5' : 'shadow-slate-500/5';
  const confidence = Math.round(prediction.confidence * 100);

  return (
    <div className={`relative bg-slate-950 border-2 rounded-2xl p-6 h-full transition-all duration-700 flex flex-col overflow-hidden ${isPlaced ? 'border-indigo-500/40' : (isBuy ? 'border-emerald-500/10' : isSell ? 'border-rose-500/10' : 'border-slate-800')} ${shadowColor} shadow-2xl`}>
      
      {/* Background Decorative Element */}
      <div className={`absolute -top-24 -right-24 w-48 h-48 blur-[80px] rounded-full opacity-20 pointer-events-none ${isBuy ? 'bg-emerald-500' : isSell ? 'bg-rose-500' : 'bg-indigo-500'}`} />

      {isPlaced && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="bg-slate-900/80 border border-indigo-500/30 p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-5 w-full">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center border border-indigo-500/20">
              <CheckCircle size={24} className="text-indigo-400" />
            </div>
            <div>
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Execution Queued</span>
              <h4 className="text-white text-sm font-bold mt-1">Pending Confirmation</h4>
            </div>
            <div className="flex flex-col gap-2.5 w-full">
              <button onClick={onConfirmOrder} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-900/20">Acknowledge Trade</button>
              <button onClick={() => lastOrderId && onCancelOrder(lastOrderId)} className="w-full py-3 border border-slate-700 hover:border-rose-500/50 hover:text-rose-400 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Abort Transaction</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8 z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg">
            <Binary size={16} className="text-indigo-400" />
          </div>
          <div>
            <h3 className="text-slate-100 text-[11px] font-black uppercase tracking-widest leading-none">Ensemble Fusion</h3>
            <span className="text-slate-500 text-[9px] font-bold uppercase tracking-tighter">Multi-Layer Aggregation</span>
          </div>
        </div>
        <div className="px-3 py-1.5 bg-slate-900/50 border border-slate-800 rounded-lg flex items-center gap-2">
          <span className="text-[9px] text-slate-500 font-bold uppercase">Edge</span>
          <span className="text-[10px] font-mono font-black text-indigo-300">{(prediction.accuracy! * 100).toFixed(1)}%</span>
        </div>
      </div>

      {/* Main Signal Display */}
      <div className="flex items-center gap-5 mb-8 z-10">
        <div className={`text-7xl font-black ${statusColor} tracking-tighter drop-shadow-sm`}>
          {prediction.signal}
        </div>
        <div className={`p-3 rounded-2xl border ${isBuy ? 'border-emerald-500/20 bg-emerald-500/5' : isSell ? 'border-rose-500/20 bg-rose-500/5' : 'border-slate-800 bg-slate-900/50'}`}>
          {isBuy && <TrendingUp size={32} className="text-emerald-500 animate-bounce" style={{ animationDuration: '3s' }} />}
          {isSell && <TrendingDown size={32} className="text-rose-500 animate-bounce" style={{ animationDuration: '3s' }} />}
          {isHold && <Activity size={32} className="text-slate-500" />}
        </div>
      </div>

      {/* Sub-Model Modules */}
      <div className="grid grid-cols-2 gap-3 mb-6 z-10">
        <div className="p-3 bg-slate-900/40 border border-slate-800/50 rounded-xl flex flex-col gap-2 group hover:border-indigo-500/20 transition-colors">
          <div className="flex items-center justify-between">
            <div className="text-[9px] text-slate-500 uppercase font-black flex items-center gap-1.5">
              <Cpu size={10} className="text-indigo-400" /> Technical
            </div>
            <span className="text-[8px] font-bold text-slate-600">60%</span>
          </div>
          <div className={`text-sm font-mono font-bold flex items-baseline gap-1.5 ${prediction.fusion.technical.signal === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
            {prediction.fusion.technical.signal}
            <span className="text-[10px] opacity-50">{Math.round(prediction.fusion.technical.confidence * 100)}%</span>
          </div>
        </div>
        
        <div className="p-3 bg-slate-900/40 border border-slate-800/50 rounded-xl flex flex-col gap-2 group hover:border-indigo-500/20 transition-colors">
          <div className="flex items-center justify-between">
            <div className="text-[9px] text-slate-500 uppercase font-black flex items-center gap-1.5">
              <Share2 size={10} className="text-indigo-400" /> Social
            </div>
            <span className="text-[8px] font-bold text-slate-600">40%</span>
          </div>
          <div className={`text-sm font-mono font-bold flex items-baseline gap-1.5 ${prediction.fusion.sentiment.signal === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
            {prediction.fusion.sentiment.signal}
            <span className="text-[10px] opacity-50">{Math.round(prediction.fusion.sentiment.confidence * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Expanded Social Dashboard */}
      {prediction.sentiment_metrics && (
        <div className="bg-slate-900/20 border border-slate-800/40 rounded-xl p-4 mb-8 z-10">
          <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-black uppercase tracking-widest mb-4">
            <Zap size={12} className="text-indigo-400" /> Social Intelligence Feed
          </div>
          
          <div className="grid grid-cols-2 gap-y-4 gap-x-6">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-[8px] text-slate-500 font-bold uppercase">
                <Activity size={10} /> Volume
              </div>
              <div className="text-xs font-mono text-slate-200">{(prediction.sentiment_metrics.social_volume * 100).toFixed(0)}% <span className="text-[9px] text-slate-500">Intensity</span></div>
            </div>
            
            <div className="flex flex-col gap-1 text-right">
              <div className="flex items-center gap-1.5 text-[8px] text-slate-500 font-bold uppercase justify-end">
                <Hash size={10} /> Trending
              </div>
              <div className="text-xs font-mono text-indigo-400 font-bold">#{prediction.sentiment_metrics.trending_rank} <span className="text-[9px] text-slate-500 italic">Global</span></div>
            </div>
            
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-[8px] text-slate-500 font-bold uppercase">
                <Globe size={10} /> News
              </div>
              <div className={`text-xs font-mono font-bold ${prediction.sentiment_metrics.news_polarity > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {prediction.sentiment_metrics.news_polarity > 0 ? '+' : ''}{prediction.sentiment_metrics.news_polarity.toFixed(2)}
              </div>
            </div>
            
            <div className="flex flex-col gap-1 text-right">
              <div className="text-[8px] text-slate-500 font-bold uppercase">Agg. Sentiment</div>
              <div className="text-xs font-mono text-white">{(prediction.sentiment_metrics.sentiment_score * 10).toFixed(1)} <span className="text-[9px] text-slate-500">/ 10</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Fused Confidence Bar */}
      <div className="mb-8 z-10">
        <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] mb-2.5">
          <span className="flex items-center gap-2"><ShieldCheck size={14} className="text-indigo-500" /> Fused Conviction</span>
          <span className="text-white font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">{confidence}%</span>
        </div>
        <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
          <div 
            className={`h-full transition-all duration-1000 rounded-full ${isBuy ? 'bg-emerald-500' : isSell ? 'bg-rose-500' : 'bg-slate-500'} ${confidence > 60 ? 'animate-pulse' : ''}`} 
            style={{ width: `${confidence}%` }} 
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4 mt-auto pt-4 z-10 border-t border-slate-900">
        <button 
          onClick={() => onExecuteOrder('BUY')} 
          className="group relative flex flex-col items-center py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all active:scale-95 shadow-xl shadow-emerald-950/20 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-2 font-black text-xs uppercase tracking-widest relative z-10">
            <ArrowUpRight size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" /> BUY
          </div>
          <span className="text-[8px] font-bold opacity-70 uppercase tracking-tighter mt-1 relative z-10">Open Long Position</span>
        </button>
        
        <button 
          onClick={() => onExecuteOrder('SELL')} 
          className="group relative flex flex-col items-center py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-all active:scale-95 shadow-xl shadow-rose-950/20 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-2 font-black text-xs uppercase tracking-widest relative z-10">
            <ArrowDownRight size={18} className="group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-transform" /> SELL
          </div>
          <span className="text-[8px] font-bold opacity-70 uppercase tracking-tighter mt-1 relative z-10">Open Short Position</span>
        </button>
      </div>

      {/* Decorative Border Corner */}
      <div className="absolute bottom-0 right-0 w-8 h-8 pointer-events-none overflow-hidden opacity-10">
         <div className="absolute bottom-[-10px] right-[-10px] w-12 h-12 rotate-45 border border-white" />
      </div>
    </div>
  );
};

export default SignalCard;
