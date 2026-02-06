
import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi } from 'lightweight-charts';
import { OHLCV, MLPrediction } from '../types';

interface TradingChartProps {
  data: OHLCV[];
  prediction: MLPrediction | null;
  selectedSymbol: string;
}

const TradingChart: React.FC<TradingChartProps> = ({ data, prediction, selectedSymbol }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const macdContainerRef = useRef<HTMLDivElement>(null);
  
  const mainChartRef = useRef<IChartApi | null>(null);
  const macdChartRef = useRef<IChartApi | null>(null);
  
  const candleSeriesRef = useRef<any>(null);
  // Bollinger Refs
  const bbUpperLineRef = useRef<any>(null);
  const bbLowerLineRef = useRef<any>(null);
  const bbMiddleLineRef = useRef<any>(null);
  const bbAreaRef = useRef<any>(null);

  const macdLineRef = useRef<any>(null);
  const signalLineRef = useRef<any>(null);
  const histSeriesRef = useRef<any>(null);

  const markersRef = useRef<any[]>([]);
  const lastUpdateRef = useRef<number>(0);

  const calculateBollingerHistory = (prices: number[], period: number = 20, stdDev: number = 2) => {
    if (prices.length < period) return { upper: [], middle: [], lower: [] };

    const upper: number[] = [];
    const middle: number[] = [];
    const lower: number[] = [];

    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        upper.push(prices[i]);
        middle.push(prices[i]);
        lower.push(prices[i]);
        continue;
      }
      const window = prices.slice(i - period + 1, i + 1);
      const avg = window.reduce((a, b) => a + b, 0) / period;
      const sd = Math.sqrt(window.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b, 0) / period);
      
      middle.push(avg);
      upper.push(avg + (sd * stdDev));
      lower.push(avg - (sd * stdDev));
    }

    return { upper, middle, lower };
  };

  const calculateMACDHistory = (prices: number[]) => {
    if (!prices || prices.length === 0) {
      return { macdLine: [], signalLine: [], histogram: [] };
    }

    const ema = (values: number[], period: number) => {
      if (values.length === 0) return [];
      const k = 2 / (period + 1);
      let prevEma = values[0] || 0;
      const emaArr: number[] = [prevEma];

      for (let i = 1; i < values.length; i++) {
        const val = values[i] || prevEma;
        const currentEma = val * k + prevEma * (1 - k);
        emaArr.push(currentEma);
        prevEma = currentEma;
      }
      return emaArr;
    };

    const ema12 = ema(prices, 12);
    const ema26 = ema(prices, 26);
    const macdLine = ema12.map((v, i) => v - (ema26[i] ?? v));
    const signalLine = ema(macdLine, 9);
    const histogram = macdLine.map((v, i) => v - (signalLine[i] ?? v));

    return { macdLine, signalLine, histogram };
  };

  useEffect(() => {
    if (!chartContainerRef.current || !macdContainerRef.current) return;

    const commonOptions = {
      layout: { background: { color: 'transparent' }, textColor: '#94a3b8' },
      grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
      crosshair: { mode: 0, vertLine: { labelBackgroundColor: '#1e293b' }, horzLine: { labelBackgroundColor: '#1e293b' } },
      timeScale: { borderColor: '#1e293b' },
    };

    const mainChart = createChart(chartContainerRef.current, {
      ...commonOptions,
      width: chartContainerRef.current.clientWidth,
      height: 320,
      timeScale: { ...commonOptions.timeScale, visible: false },
    });

    // Bollinger Series Initialization
    const bbArea = (mainChart as any).addAreaSeries({
      lineVisible: false,
      topColor: 'rgba(79, 70, 229, 0.05)',
      bottomColor: 'rgba(79, 70, 229, 0.01)',
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const bbUpper = (mainChart as any).addLineSeries({ color: 'rgba(148, 163, 184, 0.2)', lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
    const bbLower = (mainChart as any).addLineSeries({ color: 'rgba(148, 163, 184, 0.2)', lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
    const bbMiddle = (mainChart as any).addLineSeries({ color: 'rgba(99, 102, 241, 0.15)', lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });

    const candleSeries = (mainChart as any).addCandlestickSeries({
      upColor: '#22c55e', downColor: '#ef4444', borderVisible: false,
      wickUpColor: '#22c55e', wickDownColor: '#ef4444',
    });

    const macdChart = createChart(macdContainerRef.current, {
      ...commonOptions,
      width: macdContainerRef.current.clientWidth,
      height: 120,
      timeScale: { ...commonOptions.timeScale, visible: true },
    });

    const histSeries = (macdChart as any).addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'macd_hist',
    });
    
    const macdLineSeries = (macdChart as any).addLineSeries({
      color: '#3b82f6', lineWidth: 1.5, priceScaleId: 'macd_hist',
    });
    
    const signalLineSeries = (macdChart as any).addLineSeries({
      color: '#f59e0b', lineWidth: 1.5, priceScaleId: 'macd_hist',
    });

    mainChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (range) macdChart.timeScale().setVisibleLogicalRange(range);
    });
    macdChart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (range) mainChart.timeScale().setVisibleLogicalRange(range);
    });

    mainChartRef.current = mainChart;
    macdChartRef.current = macdChart;
    candleSeriesRef.current = candleSeries;
    bbAreaRef.current = bbArea;
    bbUpperLineRef.current = bbUpper;
    bbLowerLineRef.current = bbLower;
    bbMiddleLineRef.current = bbMiddle;
    macdLineRef.current = macdLineSeries;
    signalLineRef.current = signalLineSeries;
    histSeriesRef.current = histSeries;

    const handleResize = () => {
      if (chartContainerRef.current && mainChartRef.current) {
        mainChartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
      if (macdContainerRef.current && macdChartRef.current) {
        macdChartRef.current.applyOptions({ width: macdContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      mainChart.remove();
      macdChart.remove();
    };
  }, []);

  useEffect(() => {
    if (candleSeriesRef.current && data.length > 0) {
      const lastTick = data[data.length - 1];
      const timePoints = data.map(d => d.time as any);
      const closes = data.map(d => d.close);
      
      // Update Candle Data
      if (lastUpdateRef.current === lastTick.time) {
        candleSeriesRef.current.update(lastTick as any);
      } else {
        candleSeriesRef.current.setData(data.map(d => ({
          time: d.time as any, 
          open: d.open, high: d.high, low: d.low, close: d.close,
        })));
        lastUpdateRef.current = lastTick.time;
      }

      // Bollinger Calculation & Update
      const { upper, middle, lower } = calculateBollingerHistory(closes);
      if (bbUpperLineRef.current) bbUpperLineRef.current.setData(upper.map((v, i) => ({ time: timePoints[i], value: v })));
      if (bbLowerLineRef.current) bbLowerLineRef.current.setData(lower.map((v, i) => ({ time: timePoints[i], value: v })));
      if (bbMiddleLineRef.current) bbMiddleLineRef.current.setData(middle.map((v, i) => ({ time: timePoints[i], value: v })));
      
      // Bollinger Area Update (Fills from Upper line but masked/dynamic)
      if (bbAreaRef.current) {
        bbAreaRef.current.setData(upper.map((v, i) => ({ time: timePoints[i], value: v })));
        
        // Dynamic color shifting based on price position in bands
        const lastUpper = upper[upper.length - 1];
        const lastLower = lower[lower.length - 1];
        const lastPrice = closes[closes.length - 1];
        const range = lastUpper - lastLower;
        const position = range !== 0 ? (lastPrice - lastLower) / range : 0.5;

        // Shift color: closer to upper (1.0) -> Reddish tint, closer to lower (0.0) -> Greenish tint
        const red = Math.floor(position * 150);
        const green = Math.floor((1 - position) * 150);
        const areaColor = `rgba(${red}, ${green}, 180, 0.06)`;
        
        bbAreaRef.current.applyOptions({
          topColor: areaColor,
          bottomColor: 'transparent',
        });
      }

      // MACD & Indicators update
      const { macdLine, signalLine, histogram } = calculateMACDHistory(closes);
      if (macdLineRef.current) macdLineRef.current.setData(macdLine.map((v, i) => ({ time: timePoints[i], value: v })));
      if (signalLineRef.current) signalLineRef.current.setData(signalLine.map((v, i) => ({ time: timePoints[i], value: v })));
      if (histSeriesRef.current) {
        histSeriesRef.current.setData(histogram.map((v, i) => ({
          time: timePoints[i], value: v,
          color: v >= 0 ? 'rgba(16, 185, 129, 0.6)' : 'rgba(244, 63, 94, 0.6)'
        })));
      }

      if (prediction && candleSeriesRef.current) {
        const currentTime = lastTick.time as any;
        const exists = markersRef.current.some(m => m.time === currentTime && m.text === prediction.signal);
        
        if (!exists) {
          const newMarker = {
            time: currentTime,
            position: prediction.signal === 'BUY' ? 'belowBar' : (prediction.signal === 'SELL' ? 'aboveBar' : 'inBar'),
            color: prediction.signal === 'BUY' ? '#10b981' : (prediction.signal === 'SELL' ? '#f43f5e' : '#64748b'),
            shape: prediction.signal === 'BUY' ? 'arrowUp' : (prediction.signal === 'SELL' ? 'arrowDown' : 'circle'),
            text: prediction.signal,
            size: 1.5,
          };
          markersRef.current = [...markersRef.current, newMarker].slice(-50);
          candleSeriesRef.current.setMarkers(markersRef.current);
        }
      }
    }
  }, [data, prediction]);

  useEffect(() => {
    markersRef.current = [];
    if (candleSeriesRef.current) candleSeriesRef.current.setMarkers([]);
    lastUpdateRef.current = 0;
  }, [selectedSymbol]);

  const lastPrice = data.length > 0 ? data[data.length - 1].close : 0;

  return (
    <div className="relative w-full bg-slate-900/50 rounded-xl border border-slate-800 p-4 overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-white tracking-tight">{selectedSymbol} / USDT</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-mono uppercase font-bold tracking-widest border border-indigo-500/30 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Live WebSocket
          </span>
        </div>
        {data.length > 0 && (
          <div className="text-right">
            <div className="text-2xl font-mono font-bold text-emerald-400">
              ${lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Streaming Feed</div>
          </div>
        )}
      </div>
      
      <div className="flex flex-col gap-0 select-none">
        <div ref={chartContainerRef} className="w-full" />
        <div className="h-px bg-slate-800 my-1 flex items-center justify-center relative">
          <span className="absolute bg-slate-900 px-3 text-[8px] text-slate-500 uppercase font-black tracking-[0.2em] border border-slate-800 rounded-full">
            Technical Momentum Flow
          </span>
        </div>
        <div ref={macdContainerRef} className="w-full" />
      </div>
    </div>
  );
};

export default TradingChart;
