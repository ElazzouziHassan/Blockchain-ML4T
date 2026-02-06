
import pandas as pd
import numpy as np
from ml_engine import NexusMLEngine
from data_provider import DataProvider
import os

def run_training_pipeline():
    print("--- NexusAlgo ML Training Pipeline ---")
    
    engine = NexusMLEngine()
    provider = DataProvider()
    
    # 1. Acquire Data
    print("Fetching historical training data...")
    # Fetch 1000 candles to ensure indicators (RSI, BB) have enough warm-up period
    df = provider.fetch_ohlcv(symbol='BTC/USDT', timeframe='1m', limit=1000)
    
    if len(df) < 200:
        print("Dataset too small, generating synthetic trend data for training...")
        now = pd.Timestamp.now()
        limit = 1000
        times = [now - pd.Timedelta(minutes=i) for i in range(limit)][::-1]
        
        price = 65000
        closes = []
        for _ in range(limit):
            price += np.random.normal(0, 50)
            closes.append(price)
            
        df = pd.DataFrame({
            'timestamp': times,
            'open': np.array(closes) + np.random.normal(0, 10, limit),
            'high': np.array(closes) + np.abs(np.random.normal(0, 20, limit)),
            'low': np.array(closes) - np.abs(np.random.normal(0, 20, limit)),
            'close': closes,
            'volume': np.random.uniform(10, 100, limit)
        })

    # Add mock on-chain features needed for the training matrix
    df['whale_inflow'] = np.random.uniform(100, 1000, len(df))
    df['gas_price'] = np.random.uniform(10, 50, len(df))

    # 2. Train Model
    print(f"Starting training on {len(df)} candles...")
    try:
        # NexusMLEngine.train now calls engineer_features internally
        accuracy = engine.train(df)
        print(f"Training Complete!")
        print(f"Cross-Validated Accuracy: {accuracy:.4f}")
        
        if os.path.exists('model.pkl'):
            print(f"Success: Model updated and saved to model.pkl")
        else:
            print("Error: Model file check failed.")
            
    except Exception as e:
        print(f"Training Pipeline CRASHED: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run_training_pipeline()
