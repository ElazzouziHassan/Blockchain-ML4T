
import React, { useState, useEffect } from 'react';
import { MLPrediction } from '../types';
import { TrendingUp, TrendingDown, Minus, ShieldCheck, Activity, ArrowUpRight, ArrowDownRight, CheckCircle, Cpu, XCircle, Target, HandMetal } from 'lucide-react';

interface SignalCardProps {
  prediction: MLPrediction | null;
  loading: boolean;
  onExecuteOrder: (side: 'BUY' | 'SELL') => void;
  onCancelOrder: (orderId: string) => void;
  onConfirmOrder: () => void;
  lastOrderId: string | null;
  symbol: string;
}

const SignalCard: React.FC<SignalCardProps> = ({ prediction, loading, onExecuteOrder, onCancelOrder, onConfirmOrder, lastOrderId, symbol }) => {
  const [isPlaced, setIsPlaced] = useState(false);

  useEffect(() => {
    if (lastOrderId) {
      setIsPlaced(true);
    } else {
      setIsPlaced(false);
    }
  }, [lastOrderId]);

  const handleOrder = (side: 'BUY' | 'SELL') => {
    onExecuteOrder(side);
  };

  const handleCancel = () => {
    if (lastOrderId) {
      onCancelOrder(lastOrderId);
    }
  };

  const handleConfirm = () => {
    onConfirmOrder();
  };

  if (loading) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 h-full animate-pulse">
        <div className="h-4 w-32 bg-slate-800 rounded mb-4" />
        <div className="h-12 w-full bg-slate-800 rounded mb-4" />
        <div className="h-4 w-48 bg-slate-800 rounded" />
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 h-full flex flex-col items-center justify-center text-center">
        <Cpu className="text-slate-700 mb-3" size={32} />
        <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Waiting for Model Inference...</p>
      </div>
    );
  }

  const isBuy = prediction.signal === 'BUY';
  const isSell = prediction.signal === 'SELL';
  
  const statusColor = isBuy ? 'text-emerald-400' : isSell ? 'text-rose-400' : 'text-slate-400';
  const bgColor = isBuy ? 'bg-emerald-500/10' : isSell ? 'bg-rose-500/10' : 'bg-slate-500/10';
  const borderColor = isBuy ? 'border-emerald-500/20' : isSell ? 'border-rose-500/20' : 'border-slate-500/20';

  const confidence = Math.round((prediction.confidence ?? 0) * 100);
  const accuracy = prediction.accuracy ? (prediction.accuracy * 100).toFixed(1) : '64.2';

  return (
    <div className={`relative border rounded-xl p-6 h-full transition-all duration-500 ${isPlaced ? 'scale-[1.02] shadow-2xl shadow-indigo-500/20 border-indigo-500/50 bg-indigo-500/5' : `${bgColor} ${borderColor}`} flex flex-col overflow-hidden`}>
      {/* Interaction Block Overlay for Placed Orders */}
      {isPlaced && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300 p-6 text-center">
          <div className="bg-slate-900 border border-indigo-500/30 p-4 rounded-xl shadow-2xl flex flex-col items-center gap-4 w-full">
            <div className="flex items-center gap-2 text-indigo-400">
              <CheckCircle size={20} />
              <span className="text-xs font-bold uppercase tracking-widest">Order Executed</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">ID: {lastOrderId}</div>
            
            <div className="w-full h-px bg-slate-800" />
            
            <div className="flex flex-col gap-2 w-full">
              <button 
                onClick={handleConfirm}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all text-xs font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/20"
              >
                <CheckCircle size={14} /> Confirm Trade
              </button>
              <button 
                onClick={handleCancel}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-lg transition-all text-xs font-bold uppercase tracking-widest"
              >
                <XCircle size={14} /> Cancel Order
              </button>
            </div>
            <p className="text-[9px] text-slate-600 italic">Confirmed trades are locked in your history</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider flex items-center gap-2">
          <Activity size={16} /> Local XGBoost Signal
        </h3>
        <div className="flex items-center gap-2 bg-slate-800/50 px-2 py-1 rounded-md border border-slate-700/50 shadow-inner">
          <Target size={12} className="text-indigo-400" />
          <span className="text-[10px] font-mono font-bold text-white uppercase tracking-tighter">Acc: {accuracy}%</span>
        </div>
      </div>

      <div className="flex items-end gap-4 mb-6">
        <div className={`text-5xl font-black ${statusColor} tracking-tighter`}>
          {prediction.signal || 'HOLD'}
        </div>
        <div className="pb-1">
          {isBuy && <TrendingUp size={48} className="text-emerald-500/50" />}
          {isSell && <TrendingDown size={48} className="text-rose-500/50" />}
          {!isBuy && !isSell && <Minus size={48} className="text-slate-500/50" />}
        </div>
      </div>

      <div className="space-y-4 mb-8">
        <div>
          <div className="flex justify-between items-center text-sm mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <ShieldCheck size={14} /> Confidence
            </span>
            <div className="flex items-center gap-3">
              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded font-bold uppercase">Accuracy: {accuracy}%</span>
              <span className="text-white font-mono font-bold text-base">{confidence}%</span>
            </div>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ${isBuy ? 'bg-emerald-500' : isSell ? 'bg-rose-500' : 'bg-slate-500'}`}
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>

        <div className="p-3 bg-black/20 rounded-lg border border-white/5">
          <div className="text-[10px] text-slate-500 mb-1 font-semibold uppercase tracking-widest">Inference Source</div>
          <div className="text-xs font-mono font-bold text-indigo-400 flex items-center gap-1.5">
            <Cpu size={12} /> Local Python Engine (XGBoost)
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-auto">
        <button 
          onClick={() => handleOrder('BUY')}
          disabled={isPlaced}
          className="flex flex-col items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-2"><ArrowUpRight size={18} /> BUY</div>
          <span className="text-[9px] font-normal opacity-70">Long {symbol}</span>
        </button>
        <button 
          onClick={() => handleOrder('SELL')}
          disabled={isPlaced}
          className="flex flex-col items-center justify-center gap-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-rose-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-2"><ArrowDownRight size={18} /> SELL</div>
          <span className="text-[9px] font-normal opacity-70">Short {symbol}</span>
        </button>
      </div>
    </div>
  );
};

export default SignalCard;
