
import ccxt
import pandas as pd
import pandas_ta as ta
import numpy as np

class DataProvider:
    def __init__(self):
        self.exchange = ccxt.binance()

    def fetch_ohlcv(self, symbol='BTC/USDT', timeframe='1m', limit=100):
        try:
            # Fetch real data from Binance via CCXT
            ohlcv = self.exchange.fetch_ohlcv(symbol, timeframe, limit=limit)
            df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            return df
        except Exception as e:
            print(f"Error fetching CCXT data: {e}")
            # Fallback mock data
            now = pd.Timestamp.now()
            times = [now - pd.Timedelta(minutes=i) for i in range(limit)][::-1]
            data = {
                'timestamp': times,
                'open': np.random.uniform(60000, 70000, limit),
                'high': np.random.uniform(60000, 70000, limit),
                'low': np.random.uniform(60000, 70000, limit),
                'close': np.random.uniform(60000, 70000, limit),
                'volume': np.random.uniform(1, 10, limit)
            }
            return pd.DataFrame(data)

    def get_indicators(self, df):
        # Technical indicators using pandas_ta
        df.ta.rsi(append=True)
        df.ta.macd(append=True)
        df.ta.bbands(append=True)
        df.ta.atr(append=True)
        
        last_row = df.iloc[-1]
        return {
            'rsi': float(last_row.get('RSI_14', 50)),
            'macd': {
                'value': float(last_row.get('MACD_12_26_9', 0)),
                'signal': float(last_row.get('MACDs_12_26_9', 0)),
                'histogram': float(last_row.get('MACDh_12_26_9', 0))
            },
            'bollinger': {
                'upper': float(last_row.get('BBU_20_2.0', 0)),
                'middle': float(last_row.get('BBM_20_2.0', 0)),
                'lower': float(last_row.get('BBL_20_2.0', 0))
            },
            'atr': float(last_row.get('ATRr_14', 0))
        }

    def fetch_on_chain(self):
        # Simulating on-chain metrics as requested for the mock service
        return {
            'whale_inflow': float(np.random.uniform(100, 1000)),
            'active_addresses': int(np.random.uniform(10000, 50000)),
            'gas_price': float(np.random.uniform(10, 50))
        }
