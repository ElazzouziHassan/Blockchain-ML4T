# 2. Building a New Workflow for Blockchain (2IAD - ML4T)

This directory documents the technical "Pivot" from traditional equity research to the high-volatility, 24/7 world of **Blockchain Algorithmic Trading**. 

While Stefan Jansen’s framework provides the quantitative rigor, the blockchain market introduces unique friction points—specifically the **"Fee Trap"** and **Non-Stationarity**—that required us to build a custom execution pipeline.

## The Challenge: Stocks vs. Blockchain

During our transition, we identified three core difficulties that rendered traditional stock strategies ineffective:

1.  **Temporal Consistency**: Stocks have a "close" and an "open." Crypto is a continuous stream of noise. Indicators like "Daily Returns" must be replaced with rolling interval windows.
2.  **The Slippage/Liquidity Barrier**: In stocks, a 0.5% move is significant. In crypto, a 1% move can be entirely eaten by slippage and maker/taker fees.
3.  **Data Velocity**: The volume of WebSocket messages (Tick data) in a 24/7 market creates a "data silo" problem that standard CSV exports cannot handle.

## The 2IAD - ML4T Workflow

To solve these, we implemented a modernized workflow focused on **High-Conviction Execution**:

### 1. High-Speed Storage Layer (HDF5)
We moved away from flat files to **HDF5 (Hierarchical Data Format)**. This allows the system to store millions of rows of tick-level data with sub-millisecond retrieval speeds, mimicking the data silos used by institutional quant desks.

### 2. On-Chain Alpha Factors
We replaced traditional "Earnings Ratios" with blockchain-native telemetry:
- **Whale Inflow/Outflow**: Tracking large wallet movements as a leading indicator of liquidity shifts.
- **Gas Price Volatility**: Using network congestion as a proxy for panic or high-intensity trading activity.
- **Liquidity Flow**: Monitoring the bid/ask spread depth via WebSocket to model realistic slippage.

### 3. The "Fee Trap" Strategy (Precision > Recall)
The most critical addition to our workflow is the **Confidence Threshold Filter**.
- **The Problem**: A model with 51% accuracy that trades 100 times a day will lose money to fees.
- **The Solution**: We calculate the **Probability Density** of every signal. Our execution terminal is programmed to ignore any signal with a confidence score below **53%**.
- **Result**: By reducing the number of trades (Lowering Recall), we increase the quality of trades (Higher Precision), ensuring our alpha edge is larger than our execution cost.

## Current Results & Benchmarks

- **Predictive Intervals**: 5-minute and 15-minute rolling windows.
- **Backtested Accuracy**: Our optimized XGBoost models have demonstrated a range of **64.2% to 70.1%** accuracy on 5-minute intervals during high-volatility regimes.
- **Latency**: The full pipeline—from WebSocket ingestion to ML inference—now completes in **<1.5 seconds**.

## Technical Stack
- **Engine**: XGBoost (Extreme Gradient Boosting).
- **Validation**: Walk-Forward TimeSeriesSplit (Rolling Windows).
- **Execution Logic**: Probability-based thresholding (>53% conviction).

---
*This folder documents the bridge between Jansen’s theory and the reality of decentralized finance execution.*