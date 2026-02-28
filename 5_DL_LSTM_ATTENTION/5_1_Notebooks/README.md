# Crypto Trading — LSTM + Attention Deep Learning System

> **Upgrade path:** XGBoost Fusion Model → Dual-Input GRU + Attention Neural Network  
> **Framework:** TensorFlow / Keras · Python 3.10+ · Google Colab

---

## Overview

This notebook replaces the tree-based XGBoost model in a Fusion trading strategy with a state-of-the-art deep learning architecture. It preserves all existing business logic — including the **0.53 confidence threshold** that guards against trading fees — while delivering significantly richer sequential pattern recognition through LSTM/GRU layers and an attention mechanism.

The system classifies every candle into one of three signals:

| Label | Value | Meaning |
|-------|-------|---------|
| Hold  | `0`   | No actionable edge detected |
| Buy   | `1`   | Forward return expected > +2% |
| Sell  | `2`   | Forward return expected < -2% |

---

## Architecture

```
TIME-SERIES INPUT          STATIC INPUT
(60 candles × 15 feat)     (3 features)
        │                       │
   GRU(128) ──► LayerNorm       Dense(32) ──► LayerNorm
        │                       │
   GRU(64)  ──► LayerNorm       │
        │                       │
  Attention Layer               │
  (per-timestep scores)         │
        │                       │
  Context Vector ───────────────┘
                    │
              Concatenate  ◄── Fusion Point
                    │
             Dense(128) + Dropout(0.3)
             Dense(64)  + Dropout(0.2)
                    │
             Softmax(3)
         [Hold │ Buy │ Sell]
```

**Why GRU + Attention?**
- **GRU layers** learn long-range sequential dependencies across 60 candles — volume build-ups, trend momentum, volatility regimes.
- **Attention mechanism** assigns a learned importance score to each timestep, letting the model focus on critical market moments (crash candles, breakout bars, abnormal volume spikes) rather than treating all candles equally.
- **Static branch** preserves the original Fusion strategy's NLP sentiment + on-chain signal fusion.

---

## Notebook Structure

| Cell | Title | Purpose |
|------|-------|---------|
| **0** | Install Libraries | `!pip install ta yfinance` — run alone first, then restart runtime |
| **1** | Imports & Config | All imports, seeds, global constants including `CONFIDENCE_THRESHOLD = 0.53` |
| **2** | Data Loading & Feature Engineering | OHLCV download, RSI, Bollinger Bands, MACD, ATR, OBV, log returns, label generation |
| **3** | Feature Split | Separates time-series features (→ LSTM) from static features (→ Dense) |
| **4** | Sequence Builder | Converts flat DataFrame into rolling 60-candle windows `(N, 60, 15)` |
| **5** | DataAugmenter Class | Gaussian Noise + Time Warping — applied to training set only |
| **6** | Model Architecture | `build_model()` — dual-input GRU + Attention + classification head |
| **7** | Walk-Forward CV | Purged TimeSeriesSplit across 5 folds with augmentation inside each fold |
| **8** | Metrics & Reporting | 4 diagnostic plots: confusion matrix, confidence histogram, F1 per fold, probability distributions |
| **9** | Final Training + Threshold Sweep | Full-data final model + threshold table from 0.40 → 0.75 |
| **10** | Live Inference Helper | `predict_signal()` function ready for production execution loop |

---

## Key Configuration

All global constants are defined at the top of **Cell 1** and can be tuned without touching any other code:

```python
CONFIDENCE_THRESHOLD = 0.53   # Fee-trap guard — only trade above this confidence
SEQUENCE_LEN         = 60     # Look-back window in candles
N_FORWARD            = 3      # Prediction horizon in candles
BUY_THRESH           =  0.02  # +2% forward return threshold for Buy label
SELL_THRESH          = -0.02  # -2% forward return threshold for Sell label
N_SPLITS             = 5      # Number of walk-forward folds
AUG_FACTOR           = 1      # Augmented copies per training sample
EPOCHS               = 50     # Max epochs (EarlyStopping will typically stop earlier)
BATCH_SIZE           = 64
```

---

## Features Used

### Time-Series Branch (LSTM input — 15 features)
| Feature | Description |
|---------|-------------|
| `Open, High, Low, Close, Volume` | Raw OHLCV candle data |
| `rsi` | Relative Strength Index (14-period) |
| `bb_width` | Bollinger Band width as fraction of midline |
| `bb_pct` | Price position within Bollinger Bands (0–1) |
| `macd`, `macd_sig`, `macd_diff` | MACD line, signal line, histogram |
| `atr` | Average True Range — volatility proxy |
| `obv` | On-Balance Volume — cumulative buying/selling pressure |
| `log_return` | Log return of Close price |
| `vol_ratio` | Volume normalised by 20-day rolling mean |

### Static Branch (Dense input — 3 features)
| Feature | Description | Source |
|---------|-------------|--------|
| `sentiment_score` | NLP score from news/social data | **Your NLP pipeline** |
| `onchain_addr_norm` | Normalised active addresses | **Your on-chain feed** |
| `fear_greed_norm` | Fear & Greed index (0–1) | **Your data provider** |

> **Production note:** The notebook uses simulated random values for static features. Replace the 3 lines in Cell 2, Section 2.3 with your live NLP model output and on-chain data feed.

---

## Data Augmentation

The `DataAugmenter` class in Cell 5 implements two techniques, applied **only to the training set**:

**1. Gaussian Noise Injection**
Adds feature-scaled random noise to every timestep. The noise magnitude is proportional to each feature's own standard deviation (`noise_std=0.005` by default), keeping it imperceptible to the model while preventing memorisation of exact price levels.

**2. Time Warping**
Resamples the sequence along a smoothly distorted time axis using random spline control points. This simulates market regimes playing out at different speeds — a crash over 2 days vs. 5 days — without changing the fundamental pattern shape.

> **Safety guarantee:** `augmenter.augment()` is called inside the training fold only. Validation and test sets always receive raw, unmodified sequences.

---

## Walk-Forward Cross-Validation

Standard K-Fold is **not used** because shuffling time-series data creates look-ahead bias — the model would train on future candles to predict past ones, which is impossible in live trading.

Instead, the notebook uses **Purged Walk-Forward Validation**:

```
Fold 1:  Train ████████████░░░░░  Val ████  Test ░░░░
Fold 2:  Train ████████████████░  Val ████  Test ░░░░
Fold 3:  Train ████████████████████  Val ████  Test ░░░░
                                         ↑
                              Gap = N_FORWARD + 1 candles
                       (purge prevents label leakage)
```

The gap between train end and validation start prevents leakage from the `N_FORWARD`-candle labelling window — a candle labelled with a 3-day forward return cannot appear in both train and validation.

---

## Output Reports

Running Cell 8 generates 4 diagnostic plots and saves them as PNG files:

| File | Contents |
|------|----------|
| `plot1_confusion_matrix.png` | Heatmap (% of row) — shows Buy↔Sell confusion |
| `plot2_confidence_dist.png` | Histogram of max class probabilities with 0.53 threshold line |
| `plot3_fold_f1.png` | Weighted F1 score per walk-forward fold |
| `plot4_prob_by_class.png` | Predicted probability distribution grouped by true class |

Running Cell 9 prints a **threshold sweep table** from 0.40 to 0.75 showing precision and trade frequency at each level — use this to decide whether 0.53 remains optimal for the new model.

---

## Live Inference

Cell 10 provides a `predict_signal()` function ready to drop into your execution loop:

```python
result = predict_signal(
    ohlcv_df        = live_dataframe,     # must have >= 60 rows with all TS features
    sentiment_score = nlp_model_output,   # float in [-1, 1]
    onchain_norm    = onchain_metric,      # float in [0, 1]
    fear_greed_norm = fear_greed / 100,   # float in [0, 1]
    model           = final_model,
    ts_scaler       = ts_scaler_final,
    static_scaler   = static_scaler_final
)

# result = {
#   'signal'           : 'Buy',
#   'confidence'       : 0.71,
#   'probabilities'    : {'Hold': 0.12, 'Buy': 0.71, 'Sell': 0.17},
#   'action'           : 'Buy',            # or 'HOLD (low confidence)'
#   'passes_threshold' : True
# }
```

The function enforces the `CONFIDENCE_THRESHOLD` gate before returning an actionable signal — identical to the original Fusion strategy's execution logic.

---

## Common Issues & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `ModuleNotFoundError: No module named 'ta'` | `!pip install` and `import` in same cell | Put `!pip install ta yfinance` in its own Cell 0, run it, then **Runtime → Restart session**, then run Cell 1 |
| `Figure size 2000x1600 with 0 Axes` | `gridspec` render bug in Colab | Use the fixed Cell 8 — each plot is an independent `plt.subplots()` call |
| Class imbalance warning | Hold dominates Buy/Sell | Already handled via `compute_class_weight('balanced')` in Cell 7 |
| Training very slow | Large augmented dataset on CPU | Switch Colab runtime to GPU: **Runtime → Change runtime type → T4 GPU** |
| `NaN` in loss after epoch 1 | Learning rate too high or un-normalised features | Verify scalers are fit before training; reduce `learning_rate` to `5e-4` |

---

## Replacing Demo Data with Production Feeds

Three locations in the notebook require substitution for live trading:

**1. OHLCV Data (Cell 2, Section 2.1)**
```python
# REPLACE:
raw = yf.download('BTC-USD', ...)

# WITH your broker / exchange API, e.g.:
raw = your_exchange_client.get_ohlcv('BTCUSDT', interval='1d', limit=1500)
```

**2. Sentiment Score (Cell 2, Section 2.3)**
```python
# REPLACE:
df['sentiment_score'] = np.clip(np.random.normal(...), -1, 1)

# WITH your NLP pipeline output merged on timestamp:
df['sentiment_score'] = sentiment_df['score'].reindex(df.index).fillna(0)
```

**3. On-Chain Metrics (Cell 2, Section 2.3)**
```python
# REPLACE:
df['onchain_addr_norm'] = np.clip(np.random.normal(...), 0, 1)

# WITH your on-chain data provider (e.g. Glassnode, CryptoQuant):
df['onchain_addr_norm'] = onchain_df['active_addresses_norm'].reindex(df.index).fillna(0.5)
```

---

## Dependencies

```
tensorflow >= 2.13
scikit-learn >= 1.3
pandas >= 2.0
numpy >= 1.24
matplotlib >= 3.7
seaborn >= 0.12
ta >= 0.10
yfinance >= 0.2   # demo data only — not needed in production
```

Install in Colab:
```
!pip install ta yfinance --quiet
```
All other packages are pre-installed in the Colab environment.

---

## License & Disclaimer

This notebook is for **research and educational purposes only**. It does not constitute financial advice. Past model performance on historical data does not guarantee future trading results. Always validate thoroughly on out-of-sample data before deploying capital.
