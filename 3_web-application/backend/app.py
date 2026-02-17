
from flask import Flask, jsonify, request
from flask_cors import CORS
from ml_engine import NexusMLEngine
from data_provider import DataProvider
import pandas as pd
import numpy as np
import uuid
from datetime import datetime

app = Flask(__name__)
CORS(app, supports_credentials=True)

ml_engine = NexusMLEngine()
data_provider = DataProvider()

order_history = []

@app.route('/api/predict', methods=['GET'])
def predict():
    symbol = request.args.get('symbol', 'BTC/USDT')
    
    try:
        # 1. Fetch Data
        df = data_provider.fetch_ohlcv(symbol, limit=60)
        on_chain = data_provider.fetch_on_chain()
        
        # Inject on-chain metrics for technical analysis
        df['whale_inflow'] = on_chain['whale_inflow']
        df['gas_price'] = on_chain['gas_price']
        
        # 2. Mock Social Media Metrics
        sentiment_data = {
            'sentiment_score': float(np.random.uniform(0.35, 0.75)),
            'social_volume': float(np.random.uniform(0.2, 0.9)),
            'trending_rank': float(np.random.randint(1, 100)),
            'news_polarity': float(np.random.uniform(-0.5, 0.5))
        }
        
        # 3. Fused Prediction
        prediction = ml_engine.predict_fused(df, sentiment_data)
        
        return jsonify({
            **prediction,
            'sentiment_metrics': sentiment_data,
            'symbol': symbol,
            'timestamp': datetime.now().isoformat(),
            'accuracy': 0.542
        })
    except Exception as e:
        print(f"Prediction Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/features', methods=['GET'])
def get_features():
    feature_names = ["RSI Index", "Whale Flow", "Social Sentiment", "News Polarity", "Gas Metric", "Vol Momentum"]
    importances = [0.25, 0.20, 0.18, 0.15, 0.12, 0.10]
    data = [{"name": n, "score": s * 100} for n, s in zip(feature_names, importances)]
    return jsonify(data)

@app.route('/api/order', methods=['GET', 'POST'])
def handle_orders():
    global order_history
    if request.method == 'POST':
        data = request.json
        new_order = {
            'id': str(uuid.uuid4())[:8].upper(),
            'side': data.get('side', 'BUY'),
            'amount': float(data.get('amount', 0.1)),
            'price': float(data.get('price', 0.0)),
            'symbol': data.get('symbol', 'BTC/USDT'),
            'timestamp': datetime.now().isoformat(),
            'status': 'FILLED'
        }
        order_history.insert(0, new_order)
        return jsonify(order_history), 201
    return jsonify(order_history)

@app.route('/api/order/<order_id>', methods=['DELETE'])
def delete_order(order_id):
    global order_history
    order_history = [o for o in order_history if o['id'] != order_id]
    return jsonify(order_history), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
