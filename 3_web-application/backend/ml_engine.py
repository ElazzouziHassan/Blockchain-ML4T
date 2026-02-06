
import xgboost as xgb
import pandas as pd
import numpy as np
import pandas_ta as ta
import pickle
import os
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import accuracy_score

class NexusMLEngine:
    def __init__(self):
        self.model = None
        self.features = [
            'rsi', 
            'whale_inflow', 
            'gas_price', 
            'lag_1', 
            'lag_5', 
            'volatility', 
            'volume_change',
            'bb_percent',  
            'atr_percent'  
        ]

    def engineer_features(self, df, is_training=True):
        """
        Consolidated source of truth for all technical transformations.
        """
        data = df.copy()
        
        # Ensure column names are lowercase for consistency with CCXT
        data.columns = [c.lower() for c in data.columns]

        # 1. Technical Indicators via pandas_ta
        data.ta.rsi(length=14, append=True)
        data.ta.bbands(length=20, std=2, append=True)
        data.ta.atr(length=14, append=True)
        
        # 2. Returns and Lags
        data['returns'] = data['close'].pct_change()
        data['lag_1'] = data['returns'].shift(1)
        data['lag_5'] = data['returns'].shift(5)
        data['volatility'] = data['returns'].rolling(window=10).std()
        data['volume_change'] = data['volume'].pct_change()
        
        # 3. Robust Column Mapping (Handles different pandas-ta versions)
        # RSI mapping
        rsi_col = [c for c in data.columns if 'rsi_14' in c.lower()]
        data['rsi'] = data[rsi_col[0]] if rsi_col else 50.0
        
        # Bollinger Bands mapping
        bbu_col = [c for c in data.columns if 'bbu_20_2' in c.lower()]
        bbl_col = [c for c in data.columns if 'bbl_20_2' in c.lower()]
        
        if bbu_col and bbl_col:
            bb_upper = data[bbu_col[0]]
            bb_lower = data[bbl_col[0]]
            data['bb_percent'] = (data['close'] - bb_lower) / (bb_upper - bb_lower)
        else:
            data['bb_percent'] = 0.5
            
        # ATR mapping
        atr_col = [c for c in data.columns if 'atr_14' in c.lower()]
        if atr_col:
            data['atr_percent'] = data[atr_col[0]] / data['close']
        else:
            data['atr_percent'] = 0.0

        # Fill neutral values for missing/NaN
        data['bb_percent'] = data['bb_percent'].fillna(0.5)
        data['rsi'] = data['rsi'].fillna(50.0)
        data['atr_percent'] = data['atr_percent'].fillna(0.0)

        # 4. Target Generation (Only for training)
        if is_training:
            data['target'] = (data['close'].shift(-5) > data['close']).astype(int)
            return data.dropna(subset=self.features + ['target'])
        
        return data.tail(1)

    def train(self, data):
        df = self.engineer_features(data, is_training=True)
        if len(df) < 50:
            raise ValueError(f"Insufficient samples for training after cleanup: {len(df)}")
            
        X = df[self.features]
        y = df['target']

        tscv = TimeSeriesSplit(n_splits=5)
        best_accuracy = 0
        
        for train_index, test_index in tscv.split(X):
            X_train, X_test = X.iloc[train_index], X.iloc[test_index]
            y_train, y_test = y.iloc[train_index], y.iloc[test_index]
            
            clf = xgb.XGBClassifier(
                n_estimators=150,
                max_depth=4,
                learning_rate=0.05,
                subsample=0.8,
                colsample_bytree=0.8,
                random_state=42,
                eval_metric='logloss'
            )
            clf.fit(X_train, y_train)
            
            preds = clf.predict(X_test)
            acc = accuracy_score(y_test, preds)
            if acc > best_accuracy:
                best_accuracy = acc
                self.model = clf

        self.save_model()
        return best_accuracy

    def predict(self, current_features):
        if not self.model:
            if os.path.exists('model.pkl'):
                self.load_model()
            else:
                return "HOLD", 0.5
        
        try:
            # Re-order columns to match training set exactly
            X = current_features[self.features]
            prob = self.model.predict_proba(X)[0]
            prediction = np.argmax(prob)
            confidence = prob[prediction]
            
            if confidence < 0.53:
                return "HOLD", confidence
                
            signal = "BUY" if prediction == 1 else "SELL"
            return signal, confidence
        except Exception as e:
            print(f"Prediction Core Error: {e}")
            return "HOLD", 0.5

    def save_model(self, path='model.pkl'):
        with open(path, 'wb') as f:
            pickle.dump(self.model, f)

    def load_model(self, path='model.pkl'):
        try:
            with open(path, 'rb') as f:
                self.model = pickle.load(f)
        except:
            self.model = None
