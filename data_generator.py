import pandas as pd
import numpy as np

def generate_bank_data(days=365, seed=None):
    """
    Generates synthetic but realistic banking data for LCR/NSFR monitoring.
    Introduces slight randomization so each run is unique.
    Also introduces a macro stress event to ensure a measurable survival horizon.
    """
    if seed is not None:
        np.random.seed(seed)
    else:
        # Use random seed for different data each time
        np.random.seed()
        
    dates = pd.date_range(start='2026-01-01', periods=days, freq='D')
    
    # 1. Macro Rates (Random Walk)
    # Repo rate starts around 5.0%
    repo_rate_changes = np.random.normal(loc=0.0, scale=0.05, size=days)
    repo_rate = 5.0 + np.cumsum(repo_rate_changes)
    
    # Interest rate depends on repo rate + bank spread
    spread = np.random.normal(loc=2.0, scale=0.1, size=days)
    interest_rate = repo_rate + spread
    
    # Market rate (general economic indicator)
    market_rate = repo_rate + np.random.normal(loc=0.5, scale=0.2, size=days)
    
    # 2. Deposits & Withdrawals
    # Base deposits start at 100,000,000 ($100M)
    base_deposits = 100000000
    
    deposits = np.zeros(days)
    withdrawals = np.zeros(days)
    deposit_pool_history = np.zeros(days)
    
    # Stress event starting point (randomly chosen between day 100 and 150)
    stress_start = np.random.randint(100, 150)
    
    current_deposit_pool = base_deposits
    
    # 3. Loans
    # Outstanding loans pool
    current_loan_pool = 70000000 
    loans_given = np.zeros(days)
    loan_repayment = np.zeros(days)
    
    for i in range(days):
        if i < stress_start:
            # Normal operations
            # Daily incoming deposits (0.1% to 0.5% of pool)
            daily_in = current_deposit_pool * np.random.uniform(0.001, 0.005)
            # Daily withdrawals (0.1% to 0.4% of pool) -> Net positive usually
            daily_out = current_deposit_pool * np.random.uniform(0.001, 0.004)
        else:
            # Stress event condition (e.g. panic)
            # Incoming deposits dry up
            daily_in = current_deposit_pool * np.random.uniform(0.0001, 0.001)
            # Escalating withdrawals
            escalation_factor = min(1.0 + (i - stress_start) * 0.05, 5.0) # Up to 5x normal withdrawals
            daily_out = current_deposit_pool * np.random.uniform(0.002, 0.01) * escalation_factor
            
        deposits[i] = daily_in
        withdrawals[i] = daily_out
        current_deposit_pool += (daily_in - daily_out)
        # Prevent completely negative pool for metrics to not break prematurely
        current_deposit_pool = max(current_deposit_pool, 1000)
        deposit_pool_history[i] = current_deposit_pool

    # 3. Loans
    # Outstanding loans pool
    current_loan_pool = 70000 
    loans_given = np.zeros(days)
    loan_repayment = np.zeros(days)
    
    for i in range(days):
        if i < stress_start:
            # Normal loan activity
            daily_l_given = deposit_pool_history[i] * np.random.uniform(0.001, 0.003)
            # Repayments based on outstanding loans
            daily_l_repay = current_loan_pool * np.random.uniform(0.0015, 0.0025)
        else:
            # Under stress, bank stops giving loans
            daily_l_given = deposit_pool_history[i] * np.random.uniform(0.000, 0.0005)
            # Repayments might slow down (defaults)
            daily_l_repay = current_loan_pool * np.random.uniform(0.0005, 0.0015)
            
        loans_given[i] = daily_l_given
        loan_repayment[i] = daily_l_repay
        current_loan_pool += (daily_l_given - daily_l_repay)
        
    # 4. HQLA (High Quality Liquid Assets)
    # Starts at 20% of initial deposits
    hqla = np.zeros(days)
    current_hqla = base_deposits * 0.20
    
    for i in range(days):
        # HQLA changes based on net cash flow + some small market variation
        net_cash_flow = (deposits[i] + loan_repayment[i]) - (withdrawals[i] + loans_given[i])
        market_variation = current_hqla * np.random.normal(0, 0.001)
        
        # When net cash is positive, part of it may go back to HQLA. 
        # When negative, it heavily drains HQLA.
        if net_cash_flow < 0:
            current_hqla += net_cash_flow  # Drain HQLA 1:1
        else:
            current_hqla += net_cash_flow * 0.5  # Rebuild slowly
            
        current_hqla += market_variation
        hqla[i] = current_hqla

    # Calculate ASF and RSF proxies for NSFR calculation over time
    # ASF (Available Stable Funding) ~ total retail deposits + capital
    # Assume capital is constant $15,000,000
    capital = 15000000
    deposit_pool_arr = np.zeros(days)
    loan_pool_arr = np.zeros(days)
    
    d_pool = base_deposits
    l_pool = 70000000
    for i in range(days):
        d_pool += (deposits[i] - withdrawals[i])
        l_pool += (loans_given[i] - loan_repayment[i])
        deposit_pool_arr[i] = max(d_pool, 100)
        loan_pool_arr[i] = max(l_pool, 100)
        
    # ASF factor for retail deposits is ~ 90%
    asf = (deposit_pool_arr * 0.90) + capital
    
    # RSF factor for loans is ~ 85%
    rsf = loan_pool_arr * 0.85
    
    df = pd.DataFrame({
        'Date': dates,
        'Repo_Rate': repo_rate,
        'Interest_Rate': interest_rate,
        'Market_Rate': market_rate,
        'Deposits': deposits,
        'Withdrawals': withdrawals,
        'Loans_Given': loans_given,
        'Loan_Repayment': loan_repayment,
        'HQLA': hqla,
        'ASF': asf,
        'RSF': rsf,
        'Total_Deposits_Pool': deposit_pool_arr,
        'Total_Loans_Pool': loan_pool_arr
    })
    
    return df

if __name__ == "__main__":
    df = generate_bank_data()
    print("Sample generated data:")
    print(df.head())
    print("\nData Shape:", df.shape)
    df.to_csv("synthetic_bank_data.csv", index=False)
