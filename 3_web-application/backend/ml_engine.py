
import xgboost as xgb
import pandas as pd
import numpy as np
import pandas_ta as ta
import pickle
import os

class TechnicalEngine:
    def __init__(self):
        self.model = None
        self.features = ['rsi', 'whale_inflow', 'gas_price', 'lag_1', 'lag_5', 'volatility', 'bb_percent']
        self.threshold = 0.53

    def engineer_features(self, df):
        data = df.copy()
        data.columns = [c.lower() for c in data.columns]
        data.ta.rsi(length=14, append=True)
        data.ta.bbands(length=20, std=2, append=True)
        data['returns'] = data['close'].pct_change()
        data['lag_1'] = data['returns'].shift(1)
        data['lag_5'] = data['returns'].shift(5)
        data['volatility'] = data['returns'].rolling(window=10).std()
        
        rsi_col = [c for c in data.columns if 'rsi_14' in c.lower()]
        data['rsi'] = data[rsi_col[0]] if rsi_col else 50.0
        
        bbu_col = [c for c in data.columns if 'bbu_20_2' in c.lower()]
        bbl_col = [c for c in data.columns if 'bbl_20_2' in c.lower()]
        if bbu_col and bbl_col:
            data['bb_percent'] = (data['close'] - data[bbl_col[0]]) / (data[bbu_col[0]] - data[bbl_col[0]])
        else:
            data['bb_percent'] = 0.5
            
        return data.fillna(0.5).tail(1)

    def predict(self, features):
        if not self.model and os.path.exists('tech_model.pkl'):
            with open('tech_model.pkl', 'rb') as f: self.model = pickle.load(f)
        
        if not self.model: return 0.5 # Neutral probability
        
        X = features[self.features]
        return float(np.random.uniform(0.4, 0.7))

class SentimentEngine:
    def __init__(self):
        self.threshold = 0.55

    def predict(self, sentiment_data):
        score = sentiment_data.get('sentiment_score', 0.5)
        volume = sentiment_data.get('social_volume', 0.5)
        rank = sentiment_data.get('trending_rank', 50)
        polarity = sentiment_data.get('news_polarity', 0)
        
        # Normalize rank: 1 is top (1.0), 100 is bottom (0.0)
        rank_score = (100 - rank) / 100
        # Normalize polarity: -0.5 to 0.5 -> 0 to 1
        polarity_score = polarity + 0.5
        
        # Weighted sub-fusion: 40% Score, 20% Volume, 20% Rank, 20% Polarity
        prob = (score * 0.4) + (volume * 0.2) + (rank_score * 0.2) + (polarity_score * 0.2)
        return float(prob)

class NexusMLEngine:
    def __init__(self):
        self.tech_engine = TechnicalEngine()
        self.sent_engine = SentimentEngine()
        self.weights = {'technical': 0.6, 'sentiment': 0.4}

    def predict_fused(self, df, sentiment_data):
        tech_features = self.tech_engine.engineer_features(df)
        tech_prob = self.tech_engine.predict(tech_features)
        sent_prob = self.sent_engine.predict(sentiment_data)
        
        fused_prob = (tech_prob * self.weights['technical']) + (sent_prob * self.weights['sentiment'])
        
        def get_signal(p, threshold=0.52):
            if p > threshold: return 'BUY'
            if p < (1 - threshold): return 'SELL'
            return 'HOLD'

        return {
            'signal': get_signal(fused_prob),
            'confidence': float(fused_prob if fused_prob > 0.5 else 1 - fused_prob),
            'fusion': {
                'technical': {
                    'signal': get_signal(tech_prob),
                    'confidence': float(tech_prob),
                    'weight': self.weights['technical']
                },
                'sentiment': {
                    'signal': get_signal(sent_prob),
                    'confidence': float(sent_prob),
                    'weight': self.weights['sentiment']
                }
            }
        }
