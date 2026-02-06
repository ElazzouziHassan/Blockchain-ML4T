
import React from 'react';
import { OnChainData, IndicatorData } from '../types';
import { Droplets, Users, Zap, Compass, Info } from 'lucide-react';

interface MarketStatsProps {
  onChain: OnChainData | null;
  indicators: IndicatorData | null;
}

const MarketStats: React.FC<MarketStatsProps> = ({ onChain, indicators }) => {
  const safeFormat = (val: any, decimals: number = 2) => {
    const num = Number(val);
    return isNaN(num) ? '0.00' : num.toFixed(decimals);
  };

  const stats = [
    {
      label: 'Whale Inflow',
      value: onChain?.whaleInflow !== undefined ? `${safeFormat(onChain.whaleInflow, 1)} BTC` : '...',
      icon: <Droplets className="text-blue-400" size={20} />,
      desc: 'Net large wallet activity',
      tooltip: 'Whale Inflow measures the net flow of assets into high-value wallets. Significant spikes often signal institutional accumulation or potential redistribution.'
    },
    {
      label: 'Active Addresses',
      value: onChain?.activeAddresses !== undefined ? Number(onChain.activeAddresses).toLocaleString() : '...',
      icon: <Users className="text-purple-400" size={20} />,
      desc: 'Network engagement',
      tooltip: 'Active Addresses represents the number of unique addresses involved in successful transactions. It is a key metric for network utility and user adoption.'
    },
    {
      label: 'Gas Price',
      value: onChain?.gasPrice !== undefined ? `${safeFormat(onChain.gasPrice, 1)} Gwei` : '...',
      icon: <Zap className="text-yellow-400" size={20} />,
      desc: 'Network congestion',
      tooltip: 'Gas Price (Gwei) measures the cost of processing transactions on the network. High gas indicates congestion, while low gas suggests reduced network demand.'
    },
    {
      label: 'RSI (14)',
      value: indicators?.rsi !== undefined ? safeFormat(indicators.rsi, 2) : '...',
      icon: <Compass className="text-emerald-400" size={20} />,
      desc: 'Momentum oscillator',
      tooltip: 'RSI: Relative Strength Index. A momentum oscillator that measures the speed and change of price movements. Above 70 is overbought, below 30 is oversold.'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <div 
          key={i} 
          className="group relative bg-slate-900/40 border border-slate-800/50 backdrop-blur-sm p-4 rounded-xl hover:border-slate-700/80 hover:bg-slate-900/60 transition-all cursor-help shadow-lg shadow-black/10"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-800/50 rounded-lg group-hover:bg-slate-700/50 transition-colors border border-white/5">{stat.icon}</div>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-tight">{stat.label}</span>
            </div>
            <Info size={14} className="text-slate-600 group-hover:text-indigo-400 transition-colors" />
          </div>
          <div className="text-xl font-mono font-bold text-white mb-1 group-hover:text-indigo-50 group-transition-colors">{stat.value}</div>
          <div className="text-[10px] text-slate-600 font-medium">{stat.desc}</div>

          {/* Tooltip UI */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-3 bg-slate-800/95 border border-slate-700/50 rounded-xl text-[11px] text-slate-300 leading-relaxed invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all z-[100] shadow-2xl pointer-events-none backdrop-blur-xl">
            <div className="font-bold text-white mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              {stat.label}
            </div>
            {stat.tooltip}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-slate-800/95" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default MarketStats;
