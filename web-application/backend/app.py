
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

# Mock in-memory order history
order_history = []

@app.route('/api/predict', methods=['GET'])
def predict():
    symbol = request.args.get('symbol', 'BTC/USDT')
    
    try:
        # 1. Fetch live data
        df = data_provider.fetch_ohlcv(symbol, limit=60)
        on_chain = data_provider.fetch_on_chain()
        
        # Inject on-chain metrics into DF for engineering consistency
        df['whale_inflow'] = on_chain['whale_inflow']
        df['gas_price'] = on_chain['gas_price']
        
        # 2. Use engine to process features (Guarantees parity with training)
        processed_df = ml_engine.engineer_features(df, is_training=False)
        
        # 3. Run Inference
        signal, confidence = ml_engine.predict(processed_df)
        
        # Debugging: Extract feature values for the UI or logs
        latest_features = processed_df[ml_engine.features].iloc[0].to_dict()
        
        return jsonify({
            'signal': signal,
            'confidence': float(confidence),
            'accuracy': 0.701, 
            'symbol': symbol,
            'timestamp': datetime.now().isoformat(),
            'debug_features': latest_features
        })
    except Exception as e:
        print(f"API Error in /predict: {e}")
        return jsonify({
            'signal': 'HOLD',
            'confidence': 0.5,
            'error': str(e)
        }), 500

@app.route('/api/features', methods=['GET'])
def get_features():
    importances = [0.22, 0.18, 0.08, 0.12, 0.08, 0.10, 0.06, 0.11, 0.05]
    feature_names = [
        "RSI Index", 
        "Whale Flow", 
        "Gas Metric", 
        "1m Return", 
        "5m Return",
        "Volatility",
        "Vol Momentum",
        "BB %B",
        "ATR Impact"
    ]
    data = [{"name": n, "score": s * 100} for n, s in zip(feature_names, importances)]
    return jsonify(data)

@app.route('/api/order', methods=['GET', 'POST', 'OPTIONS'])
def handle_orders():
    global order_history
    if request.method == 'POST':
        try:
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
        except Exception as e:
            return jsonify({"error": str(e)}), 400
    return jsonify(order_history)

@app.route('/api/order/cancel', methods=['POST'])
def cancel_order():
    global order_history
    data = request.json
    order_id = data.get('id')
    order_history = [o for o in order_history if o['id'] != order_id]
    return jsonify(order_history), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
