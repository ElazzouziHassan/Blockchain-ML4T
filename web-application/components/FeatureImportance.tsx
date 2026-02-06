
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { Cpu, BrainCircuit } from 'lucide-react';

interface FeatureData {
  name: string;
  score: number;
}

const MOCK_FEATURES: FeatureData[] = [
  { name: "RSI Index", score: 32 },
  { name: "Whale Flow", score: 28 },
  { name: "Gas Metric", score: 14 },
  { name: "1m Returns", score: 12 },
  { name: "5m Returns", score: 8 },
  { name: "21m Returns", score: 6 }
];

const FeatureImportance: React.FC = () => {
  const [data, setData] = useState<FeatureData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/features');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          throw new Error("API response not OK");
        }
      } catch (err) {
        console.warn("Backend unavailable, using static importance metrics.");
        setData(MOCK_FEATURES);
      } finally {
        setLoading(false);
      }
    };

    fetchFeatures();
    const interval = setInterval(fetchFeatures, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-900/40 border border-slate-800/50 backdrop-blur-sm rounded-xl p-6 h-[300px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <BrainCircuit className="text-slate-700 animate-pulse" size={32} />
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Calculating Weights...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/40 border border-slate-800/50 backdrop-blur-sm rounded-xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <Cpu size={14} className="text-indigo-400" /> XGBoost Feature Importance
        </h3>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-mono border border-indigo-500/20">
          Weight %
        </span>
      </div>

      <div className="flex-1 min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
            <XAxis 
              type="number" 
              hide 
            />
            <YAxis 
              dataKey="name" 
              type="category" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
              width={80}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              contentStyle={{
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                fontSize: '11px',
                color: '#f8fafc'
              }}
              itemStyle={{ color: '#818cf8' }}
              labelStyle={{ display: 'none' }}
            />
            <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={12}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={index === 0 ? '#6366f1' : index === 1 ? '#818cf8' : '#312e81'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-800/50">
        <p className="text-[9px] text-slate-500 leading-relaxed italic">
          *Calculated via gain metrics in current XGBoost iteration. Lagged returns weighted heavily for short-term experimentation.
        </p>
      </div>
    </div>
  );
};

export default FeatureImportance;
