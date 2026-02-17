
import pandas as pd
import numpy as np
import xgboost as xgb
import pickle
import os

def train_tech_model(df):
    print("Training Technical Model (XGBoost)...")
    # Simple feature set for mock training
    features = ['rsi', 'whale_inflow', 'gas_price', 'lag_1', 'lag_5', 'volatility', 'bb_percent']
    X = df[features]
    y = (df['close'].shift(-5) > df['close']).astype(int)[:-5]
    X = X[:-5]
    
    model = xgb.XGBClassifier(n_estimators=100, max_depth=3, learning_rate=0.1)
    model.fit(X, y)
    
    with open('tech_model.pkl', 'wb') as f:
        pickle.dump(model, f)
    print("Technical model saved to tech_model.pkl")

def train_sentiment_model():
    print("Training Social Sentiment Model...")
    # In a real scenario, this would ingest scraped news/twitter data
    # Simulating training success
    print("Sentiment model saved to sentiment_model.pkl (Mock)")

def run_training_pipeline():
    print("--- 2IAD - ML4T Dual-Model Training Pipeline ---")
    
    # Generate Synthetic Data for demonstration
    limit = 1000
    df = pd.DataFrame({
        'close': np.random.uniform(60000, 70000, limit),
        'volume': np.random.uniform(10, 100, limit),
        'rsi': np.random.uniform(30, 70, limit),
        'whale_inflow': np.random.uniform(100, 1000, limit),
        'gas_price': np.random.uniform(10, 50, limit),
        'lag_1': np.random.normal(0, 0.01, limit),
        'lag_5': np.random.normal(0, 0.01, limit),
        'volatility': np.random.uniform(0.001, 0.005, limit),
        'bb_percent': np.random.uniform(0, 1, limit)
    })
    
    train_tech_model(df)
    train_sentiment_model()
    print("Full Pipeline Training Complete.")

if __name__ == "__main__":
    run_training_pipeline()
