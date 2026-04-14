import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.linear_model import LinearRegression
import warnings
warnings.filterwarnings('ignore')

from data_generator import generate_bank_data

def calculate_liquidity_metrics(df):
    """
    Calculates LCR and NSFR.
    """
    # LCR (Liquidity Coverage Ratio)
    # Basel III approach proxy: HQLA / (Expected 30-day outflows - Expected 30-day inflows)
    # Let's approximate expected 30-day run-off as 10% of total deposits pool.
    expected_30d_outflow = df['Total_Deposits_Pool'] * 0.10
    
    # Floor to avoid division by zero
    expected_30d_outflow = expected_30d_outflow.apply(lambda x: max(x, 100))
    
    df['LCR'] = (df['HQLA'] / expected_30d_outflow).clip(lower=0, upper=5) # Cap at 500% for stability
    
    # Provide a capped LCR for plot readability if it spirals to infinity
    # Normal LCR is around 1.0 (100%) to 1.5 (150%)
    
    # NSFR (Net Stable Funding Ratio)
    # NSFR = ASF / RSF
    df['NSFR'] = df['ASF'] / df['RSF']
    
    # Calculate daily Net Cash Flow
    df['Net_Cash_Flow'] = (df['Deposits'] + df['Loan_Repayment']) - (df['Withdrawals'] + df['Loans_Given'])
    
    # Net Liquidity Position (NLP)
    # Start with base HQLA buffer. 
    df['Cumulative_Net_Cash_Flow'] = df['Net_Cash_Flow'].cumsum()
    df['NLP'] = df['HQLA'].iloc[0] + df['Cumulative_Net_Cash_Flow']
    
    return df

def predict_survival_horizon(df, current_day, lookback_days=14):
    """
    Predicts how many days the bank can survive if the recent trend continues.
    Uses linear extrapolation based on the recent NLP trajectory.
    """
    if current_day < lookback_days:
        return np.nan  # Not enough data to predict
        
    y = df['NLP'].iloc[current_day - lookback_days:current_day].values.reshape(-1, 1)
    x = np.arange(lookback_days).reshape(-1, 1)
    
    model = LinearRegression()
    model.fit(x, y)
    
    trend_slope = model.coef_[0][0]
    current_nlp = y[-1][0]
    
    if trend_slope >= 0:
        return 365  # Unlimited survival, trending positive
    else:
        # How many days until NLP hits 0?
        days_to_zero = -current_nlp / trend_slope
        return int(max(0, min(days_to_zero, 365)))

def plot_trends(df):
    plt.style.use('dark_background')
    fig, axes = plt.subplots(3, 1, figsize=(12, 14), sharex=True)
    
    dates = df['Date']
    
    # Plot 1: LCR and NSFR
    ax1 = axes[0]
    ax1.plot(dates, df['LCR'] * 100, label='LCR (%)', color='#00ff00', linewidth=2)
    ax1.plot(dates, df['NSFR'] * 100, label='NSFR (%)', color='#00ffff', linewidth=2)
    ax1.axhline(100, color='red', linestyle='--', label='Regulatory Minimum (100%)')
    ax1.set_title('Regulatory Liquidity Ratios (LCR & NSFR)', fontsize=14)
    ax1.set_ylabel('Ratio (%)')
    ax1.legend(loc='upper right')
    ax1.grid(True, alpha=0.3)
    
    # Plot 2: HQLA & Net Liquidity Position
    ax2 = axes[1]
    ax2.plot(dates, df['HQLA'], label='HQLA Buffer', color='#ffaa00', linewidth=2)
    ax2.plot(dates, df['NLP'], label='Net Liquidity Position (NLP)', color='#ff00ff', linewidth=2)
    ax2.axhline(0, color='red', linestyle='--', label='Insolvency Line (0)')
    ax2.set_title('Bank Liquidity Health', fontsize=14)
    ax2.set_ylabel('Value (Thousands)')
    ax2.legend(loc='upper right')
    ax2.grid(True, alpha=0.3)
    
    # Plot 3: Survival Horizon Prediction
    ax3 = axes[2]
    # Cap survival days for plotting
    survival_days = df['Predicted_Survival_Days'].replace(999, 100) # Cap at 100 for viz
    ax3.plot(dates, survival_days, label='Predicted Survival Horizon (Days)', color='white', linewidth=2)
    ax3.fill_between(dates, 0, survival_days, color='white', alpha=0.1)
    
    # Highlight crisis
    crisis_starts = df[df['Predicted_Survival_Days'] < 30]['Date'].min()
    if pd.notna(crisis_starts):
        ax3.axvline(x=crisis_starts, color='red', linestyle=':', label=f'Crisis Trigger (< 30 days survival)')
        
    ax3.set_title('Survival Horizon Forecast', fontsize=14)
    ax3.set_xlabel('Date')
    ax3.set_ylabel('Days Remaining')
    ax3.set_ylim(0, 100)
    ax3.legend(loc='upper right')
    ax3.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('liquidity_trends.png', dpi=300)
    print("Trend plot saved to liquidity_trends.png")
    
def main():
    print("Generating synthetic bank data...")
    df = generate_bank_data(days=365)
    
    print("Calculating LCR, NSFR, and NLP metrics...")
    df = calculate_liquidity_metrics(df)
    
    print("Predicting daily survival horizon...")
    survival_predictions = []
    for i in range(len(df)):
        survival_predictions.append(predict_survival_horizon(df, i, lookback_days=14))
        
    df['Predicted_Survival_Days'] = survival_predictions
    
    # Output critical points
    crisis_day = df[(df['NLP'] < 0) | ((df['LCR'] * 100) < 100)].first_valid_index()
    if crisis_day is not None:
        failure_date = df.iloc[crisis_day]['Date']
        print(f"\n--- LIQUIDITY CRISIS DETECTED ---")
        print(f"Bank predicted to fall into liquidity shortfall on: {failure_date.date()}")
        print(f"Metrics on {failure_date.date()}:")
        print(f"LCR:  {df.iloc[crisis_day]['LCR']*100:.2f}%")
        print(f"NSFR: {df.iloc[crisis_day]['NSFR']*100:.2f}%")
        print(f"NLP:  {df.iloc[crisis_day]['NLP']:,.2f}")
    else:
        print("\n--- BANK REMAINS SOLVENT THROUGH 365 DAYS ---")
    
    print("\nSaving data to bank_liquidity_metrics.csv...")
    df.to_csv('bank_liquidity_metrics.csv', index=False)
    
    print("Plotting graphs...")
    plot_trends(df)

def run_simulation_api():
    df = generate_bank_data(days=365)
    df = calculate_liquidity_metrics(df)
    
    survival_predictions = []
    for i in range(len(df)):
        survival_predictions.append(predict_survival_horizon(df, i, lookback_days=14))
    df['Predicted_Survival_Days'] = survival_predictions
    
    # Extract telemetry
    crisis_day = df[(df['NLP'] < 0) | ((df['LCR'] * 100) < 100)].first_valid_index()
    
    if crisis_day is not None:
        failure_date = df.iloc[crisis_day]['Date'].strftime('%Y-%m-%d')
        lcr_fail = float(df.iloc[crisis_day]['LCR'] * 100)
        nsfr_fail = float(df.iloc[crisis_day]['NSFR'] * 100)
        nlp_fail = float(df.iloc[crisis_day]['NLP'])
        is_crisis = True
    else:
        failure_date = "N/A"
        lcr_fail = float(df.iloc[-1]['LCR'] * 100)
        nsfr_fail = float(df.iloc[-1]['NSFR'] * 100)
        nlp_fail = float(df.iloc[-1]['NLP'])
        is_crisis = False
        
    df['Date'] = df['Date'].dt.strftime('%Y-%m-%d')
    records = df[['Date', 'LCR', 'NSFR', 'NLP', 'HQLA', 'Predicted_Survival_Days']].replace({np.nan: None}).to_dict(orient='records')
    
    return {
        "isCrisis": is_crisis,
        "failureDate": failure_date,
        "metricsAtFailure": {
            "LCR": round(lcr_fail, 2),
            "NSFR": round(nsfr_fail, 2),
            "NLP": round(nlp_fail, 2)
        },
        "timeSeries": records
    }

if __name__ == "__main__":
    main()
