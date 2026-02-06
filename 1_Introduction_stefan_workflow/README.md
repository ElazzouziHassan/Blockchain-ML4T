# 1. Introduction & Stefan Jansen's Workflow (2IAD - ML4T)

This directory serves as the foundational research layer for the **2IAD - ML4T** project. It contains the initial exploration, environment setup, and theoretical analysis of the methodologies presented in Stefan Jansen’s *“Machine Learning for Algorithmic Trading (2nd Edition)”*.

## The "Uncomfortable Truth" of Financial ML

In our initial study of the Jansen workflow, we identified a critical reality that separates professional quantitative finance from standard academic ML: **High accuracy is usually a bug, not a feature.**

### Realistic Benchmarks
- **Directional Accuracy**: Jansen’s models typically achieve **52% to 54%**. 
- **The Philosophy**: In algorithmic trading, a 51% edge is a "money-printing machine" if managed correctly. While the "Casino Edge" in Roulette is ~5.26%, a 54% edge in the markets places a fund manager in the "superstar" category.
- **The IC Metric**: We prioritize the **Information Coefficient (IC)** over raw accuracy. We target an IC of **0.05 to 0.10**, measuring the correlation between predicted asset rankings and actual future performance.

## The Implementation Recipe

We adopted Jansen's "World Class" stack for tabular financial data:

### 1. The Model Choice: LightGBM
While Deep Learning (LSTMs/CNNs) is flashy, the "Champion" model for noisy market data is **LightGBM (Gradient Boosting)**.
- **Why?** Financial data is tabular and extremely noisy. Deep Learning requires massive datasets to converge, whereas Gradient Boosting excels at capturing non-linear patterns in the "smaller," noisier datasets typical of intraday trading.

### 2. The Ensemble Approach (Stacking)
We don't trust a single model. Our architecture follows Jansen’s stacking strategy:
- **Model A (Random Forest)**: Captures complex non-linearities.
- **Model B (LightGBM)**: Corrects errors and handles gradients.
- **Model C (Linear Regression)**: Anchors the system to basic trends.
- **Result**: Averaging these predictions reduces variance and stabilizes accuracy at the **~53% target**.

### 3. Engineering "Alpha Factors"
Success is 80% feature engineering. We move beyond raw price to create:
- **Volatility Normalized Factors**: Adjusting returns by volatility to ensure signals are consistent across market regimes.
- **Rankings**: We predict the **relative ranking** of assets (e.g., "Which coin will be in the top 10%?") rather than raw percentage moves. This makes the model robust to market crashes.

## Walk-Forward Validation

To strictly avoid **Look-Ahead Bias**, we implement Jansen's Rolling Window validation:
1. Train on 2021-2022 -> Test on 2023.
2. Train on 2022-2023 -> Test on 2024.
This forces the model to adapt to changing market regimes (Bull vs. Bear) without manual re-tuning.

## The Pivot: From Stocks to Blockchain

While the Jansen workflow is the gold standard for the **Stock Market**, our research found significant friction when applying it to **Blockchain**:
- **Liquidity & Fees**: Traditional stock fees are low. Crypto has high slippage and commissions.
- **The "Fee Trap"**: A 51% edge is eaten by fees if we trade every signal.
- **The 2IAD - ML4T Solution**: We implemented a **Confidence Filter**. We only execute trades if our model conviction is **>53%**, sacrificing trade frequency (Recall) for higher profitability (Precision).

---
*This folder documents the "Alpha Factory" phase where raw market data is transformed into predictive power.*