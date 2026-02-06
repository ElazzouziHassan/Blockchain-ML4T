
export interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorData {
  rsi: number;
  macd: {
    value: number;
    signal: number;
    histogram: number;
  };
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
  };
  atr: number;
}

export interface OnChainData {
  whaleInflow: number;
  activeAddresses: number;
  gasPrice: number;
}

export type SignalType = 'BUY' | 'SELL' | 'HOLD';

export interface Order {
  id: string;
  side: 'BUY' | 'SELL';
  price: number;
  amount: number;
  timestamp: string;
  symbol: string;
}

export interface MLPrediction {
  signal: SignalType;
  confidence: number;
  accuracy?: number;
  symbol: string;
  timestamp: string;
}

export interface MarketState {
  selectedSymbol: string;
  prices: OHLCV[];
  indicators: IndicatorData;
  onChain: OnChainData;
  prediction: MLPrediction | null;
  orders: Order[];
  loading: boolean;
  error: string | null;
}
