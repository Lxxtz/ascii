import numpy as np
import datetime

class BankSimulationEngine:
    def __init__(self):
        self.reset()
        
    def reset(self):
        self.day = 0
        self.is_crisis = False
        self.has_failed = False
        self.repo_rate = 5.0
        
        self.current_deposit_pool = 100000000.0  # $100M
        self.current_loan_pool = 70000000.0      # $70M
        self.current_hqla = 20000000.0           # 20% of Deposits
        self.capital = 15000000.0                # $15M
        
        self.start_date = datetime.date(2026, 1, 1)
        self.cumulative_net_cash = 0
        self.base_hqla = self.current_hqla
        
        self.market_sentiment = 0.0  # 0 is neutral
        self.latest_news = None
        
        self.history = []
        self.ml_memory = []
        
    def trigger_crisis(self):
        self.is_crisis = True
        
    def step(self):
        current_date = self.start_date + datetime.timedelta(days=self.day)
        
        repo_change = np.random.normal(0, 0.05)
        self.repo_rate += repo_change
        
        if not self.is_crisis:
            # Normal operations - organically growing slightly or stable over time
            # Make sure minimum incoming is slightly higher than outgoing organically
            daily_in_base = self.current_deposit_pool * np.random.uniform(0.002, 0.006)
            daily_out_base = self.current_deposit_pool * np.random.uniform(0.002, 0.0055)
            
            # Massive day-to-day random spikes to make the chart highly fluctuant
            spike_in = daily_in_base * np.random.uniform(-0.6, 0.8)
            spike_out = daily_out_base * np.random.uniform(-0.6, 0.8)
            
            daily_in = max(0, daily_in_base + spike_in)
            daily_out = max(0, daily_out_base + spike_out)
            
            # Balance loans given vs repaid organically
            daily_l_given = self.current_deposit_pool * np.random.uniform(0.001, 0.003)
            # Loans repaid based on existing loan pool but scaled closer to balance
            daily_l_repay = self.current_loan_pool * np.random.uniform(0.0015, 0.004)
        else:
            # Market Crisis!
            daily_in = self.current_deposit_pool * np.random.uniform(0.0001, 0.001)
            crisis_days = len([h for h in self.history if h.get('is_crisis')])
            escalation = min(1.0 + crisis_days * 0.05, 5.0)
            daily_out = self.current_deposit_pool * np.random.uniform(0.002, 0.01) * escalation
            daily_l_given = self.current_deposit_pool * np.random.uniform(0.000, 0.0005)
            daily_l_repay = self.current_loan_pool * np.random.uniform(0.0005, 0.0015)
            
        # --- MARKET NEWS SYSTEM ---
        # Generate news every 10 days
        news_event_today = None
        if self.day > 0 and self.day % 10 == 0:
            events = [
                ("Tech sector boom drives unexpected deposit surges.", 0.25),
                ("Federal reserve announces rate cuts, stabilizing local banks.", 0.35),
                ("New government regulation increases trust in banking sector.", 0.15),
                ("Unemployment drops, strengthening retail deposit base.", 0.20),
                ("Rumors of massive institutional default sparks worry.", -0.30),
                ("Inflation ticks higher, tightening market liquidity.", -0.20),
                ("Major corporate client faces bankruptcy.", -0.35),
                ("Geopolitical tensions cause flight to safety away from regional banks.", -0.25),
                ("Market remains quiet amidst typical trading day.", 0.0),
                ("No major macroeconomic indicators reported today.", 0.0)
            ]
            import random
            headline, sentiment = random.choice(events)
            
            # Apply an instantaneous sentiment shock
            self.market_sentiment += sentiment
            
            self.latest_news = {
                "headline": headline,
                "type": "positive" if sentiment > 0 else "negative" if sentiment < 0 else "neutral",
                "days_ago": 0
            }
        else:
            # Gradually decay sentiment shock back to neutral (0)
            self.market_sentiment *= 0.80
            if self.latest_news:
                self.latest_news["days_ago"] += 1
                
        # Apply sentiment multipliers to the daily flows
        # Positive sentiment increases deposits and decreases withdrawals
        sentiment_dep_multiplier = 1.0 + self.market_sentiment
        sentiment_with_multiplier = 1.0 - self.market_sentiment
        
        # Prevent completely halting everything
        sentiment_with_multiplier = max(0.4, sentiment_with_multiplier)
        sentiment_dep_multiplier = max(0.4, sentiment_dep_multiplier)
        
        daily_in *= sentiment_dep_multiplier
        daily_out *= sentiment_with_multiplier
            
        self.current_deposit_pool += (daily_in - daily_out)
        self.current_deposit_pool = max(self.current_deposit_pool, 1000)
        
        self.current_loan_pool += (daily_l_given - daily_l_repay)
        self.current_loan_pool = max(self.current_loan_pool, 1000)
        
        net_cash_flow = (daily_in + daily_l_repay) - (daily_out + daily_l_given)
        market_variation = self.current_hqla * np.random.normal(0, 0.001)
        
        if net_cash_flow < 0:
            self.current_hqla += net_cash_flow
        else:
            # Rebuild liquid assets at 1:1 to maintain structural stability
            self.current_hqla += net_cash_flow
            
        # Target HQLA rebalancing (banks actively manage this buffer to keep it ~20%)
        target_hqla = self.current_deposit_pool * 0.20
        rebalance_drift = (target_hqla - self.current_hqla) * 0.05 # slowly drift towards 20%
        self.current_hqla += rebalance_drift + market_variation
        
        expected_30d_outflow = max(self.current_deposit_pool * 0.10, 100)
        lcr = min(self.current_hqla / expected_30d_outflow, 5.0)
        
        asf = (self.current_deposit_pool * 0.90) + self.capital
        rsf = self.current_loan_pool * 0.85
        nsfr = asf / rsf if rsf > 0 else 5.0
        
        self.cumulative_net_cash += net_cash_flow
        nlp = self.base_hqla + self.cumulative_net_cash
        
        if nlp < 0:
            self.has_failed = True
            
        loans_net = daily_l_given - daily_l_repay
        crisis_val = 1.0 if self.is_crisis else 0.0
        
        feature_vector = [1.0, self.repo_rate, self.market_sentiment, loans_net, crisis_val]
        self.ml_memory.append({
            "X": feature_vector,
            "y": net_cash_flow
        })
        
        survival_days = None
        lookback = 30
        if len(self.ml_memory) >= lookback:
            memory_slice = self.ml_memory[-lookback:]
            X_mat = np.array([m["X"] for m in memory_slice])
            Y_vec = np.array([m["y"] for m in memory_slice])
            
            # Sub-millisecond Hardware-Accelerated BLAS/LAPACK Algebraic OLS: B = (X^T * X)^-1 * X^T * Y
            try:
                B = np.linalg.pinv(X_mat.T @ X_mat) @ X_mat.T @ Y_vec
            except np.linalg.LinAlgError:
                B = np.zeros(5)
                
            temp_nlp = nlp
            temp_sentiment = self.market_sentiment
            days_survived = 0
            
            # Extrapolate theoretical future path based on Multi-variate mathematical correlations over up to 999 days
            while temp_nlp > 0 and days_survived < 999:
                days_survived += 1
                temp_sentiment *= 0.80 # Sentiment fades mathematically in the future
                future_X = np.array([1.0, self.repo_rate, temp_sentiment, loans_net, crisis_val])
                pred_cash_flow = np.dot(future_X, B)
                
                temp_nlp += pred_cash_flow
                
                if pred_cash_flow >= 0 and temp_nlp > 0 and days_survived > 14:
                    # Trajectory established positive escape velocity
                    days_survived = 999
                    break
                    
            survival_days = days_survived
                
        record = {
            "Date": current_date.strftime('%Y-%m-%d'),
            "LCR": round(lcr * 100, 2), # Send as percentage
            "NSFR": round(nsfr * 100, 2),
            "NLP": round(nlp, 2),
            "HQLA": round(self.current_hqla, 2),
            "Predicted_Survival_Days": survival_days,
            "Daily_Deposits": round(daily_in, 2),
            "Daily_Withdrawals": round(daily_out, 2),
            "Daily_Loans_Given": round(daily_l_given, 2),
            "Daily_Loans_Repaid": round(daily_l_repay, 2),
            "is_crisis": self.is_crisis,
            "has_failed": self.has_failed,
            "News_Headline": self.latest_news['headline'] if self.latest_news else None,
            "News_Type": self.latest_news['type'] if self.latest_news else None,
            "News_Age": self.latest_news['days_ago'] if self.latest_news else 0
        }
        
        self.history.append(record)
        self.day += 1
        
        return record
