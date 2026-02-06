
import React from 'react';
import { Order } from '../types';
import { ShoppingBag, Clock } from 'lucide-react';

interface OrderHistoryProps {
  orders: Order[];
}

const OrderHistory: React.FC<OrderHistoryProps> = ({ orders }) => {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 h-full flex flex-col">
      <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-4 flex items-center gap-2">
        <Clock size={16} /> Trade Execution History
      </h3>
      
      <div className="flex-1 overflow-y-auto max-h-[300px] pr-2 space-y-2">
        {orders.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-lg text-slate-500">
            <ShoppingBag size={24} className="mb-2 opacity-20" />
            <span className="text-xs">No orders executed yet</span>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="bg-slate-950/50 border border-slate-800/50 p-3 rounded-lg flex items-center justify-between hover:bg-slate-800/30 transition-colors">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${order.side === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {order.side}
                  </span>
                  <span className="text-xs font-mono text-slate-300">#{order.id}</span>
                  <span className="text-[10px] text-slate-500 font-bold">{order.symbol?.replace('USDT', '')}</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1">
                  {new Date(order.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono font-bold text-white">${order.price.toLocaleString()}</div>
                <div className="text-[10px] text-slate-400">{order.amount} {order.symbol?.replace('USDT', '')}</div>
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="mt-4 pt-4 border-t border-slate-800/50 flex justify-between items-center text-[10px] text-slate-500 uppercase tracking-tighter">
        <span>Session Total</span>
        <span className="text-slate-300 font-mono">{orders.length} Trades</span>
      </div>
    </div>
  );
};

export default OrderHistory;
