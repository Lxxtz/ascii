import numpy as np
import datetime
import random
import time
import logging

import torch
import torch.nn as nn

logging.getLogger('prophet').setLevel(logging.WARNING)
logging.getLogger('cmdstanpy').setLevel(logging.WARNING)

try:
    from prophet import Prophet
    import pandas as pd
    PROPHET_AVAILABLE = True
    print("[Engine] Prophet: loaded")
except ImportError:
    PROPHET_AVAILABLE = False
    print("[Engine] Prophet: not installed (pip install prophet)")

# ─── News Events with Severity Weights ──────────────────────────────
NEWS_EVENTS = [
    # Strong Positive
    {"headline": "Federal Reserve announces emergency 50bp rate cut", "base": 0.15, "weight": 3.0},
    {"headline": "Central bank injects $50B in emergency liquidity operations", "base": 0.18, "weight": 3.0},
    {"headline": "Major sovereign wealth fund announces $10B bank sector investment", "base": 0.12, "weight": 2.5},
    # Moderate Positive
    {"headline": "Unemployment claims fall to decade low, boosting consumer confidence", "base": 0.08, "weight": 1.5},
    {"headline": "Consumer spending rises 3.2%, exceeding analyst forecasts", "base": 0.06, "weight": 1.2},
    {"headline": "New fintech partnership drives surge in digital deposit accounts", "base": 0.05, "weight": 1.0},
    # Strong Negative
    {"headline": "Major bank reports $4.2B in unexpected commercial loan losses", "base": -0.15, "weight": 3.0},
    {"headline": "Credit rating agency downgrades 3 regional banks to junk status", "base": -0.12, "weight": 2.5},
    {"headline": "Interbank overnight lending rate spikes 200bp on liquidity fears", "base": -0.14, "weight": 2.5},
    {"headline": "Sovereign debt crisis erupts across emerging markets", "base": -0.10, "weight": 2.0},
    # Moderate Negative
    {"headline": "Inflation accelerates to 7.8%, tightening monetary conditions", "base": -0.08, "weight": 1.5},
    {"headline": "Housing market correction deepens as mortgage defaults rise 12%", "base": -0.07, "weight": 1.3},
    # Neutral / Low Impact
    {"headline": "Bond markets trade within normal range amid low volatility", "base": 0.0, "weight": 0.0},
    {"headline": "No significant macroeconomic releases scheduled today", "base": 0.0, "weight": 0.0},
    {"headline": "Quarterly earnings season opens with mixed corporate results", "base": 0.01, "weight": 0.5},
]

# ─── LSTM Architecture (Fixed) ──────────────────────────────────────
class SurvivalLSTM(nn.Module):
    """Direct regression: 30-day features → survival days."""
    def __init__(self, input_size=7, hidden_size=256, num_layers=3):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True, dropout=0.2)
        self.head = nn.Sequential(
            nn.Linear(hidden_size, 128),
            nn.ReLU(),
            nn.Dropout(0.15),
            nn.Linear(128, 32),
            nn.ReLU(),
            nn.Linear(32, 1)
        )

    def forward(self, x):
        lstm_out, _ = self.lstm(x)
        return self.head(lstm_out[:, -1, :])

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"[Engine] Device: {DEVICE}", end="")
if DEVICE.type == "cuda":
    print(f" — {torch.cuda.get_device_name(0)}")
else:
    print()

# ─── Pre-Training Data with Fix ─────────────────────────────────────
def generate_pretraining_data(n_days=1500):
    """Generate bank data with many crisis cycles + pre-crisis rampdowns."""
    deposit_pool = 100_000_000.0
    loan_pool    = 70_000_000.0
    hqla         = 20_000_000.0
    repo         = 5.0
    sentiment    = 0.0

    # 8 crisis windows of varying severity for richer training
    crisis_windows = [
        (100, 160), (280, 350), (450, 530), (620, 680),
        (780, 860), (950, 1020), (1150, 1220), (1350, 1420),
    ]
    pre_crisis_windows = [(s - 40, s) for s, e in crisis_windows]

    features, lcr_values = [], []

    for day in range(n_days):
        is_crisis = any(s <= day <= e for s, e in crisis_windows)
        is_pre_crisis = any(s <= day <= e for s, e in pre_crisis_windows)
        crisis_day_count = 0
        if is_crisis:
            for s, e in crisis_windows:
                if s <= day <= e:
                    crisis_day_count = day - s + 1
        pre_crisis_severity = 0.0
        if is_pre_crisis:
            for s, e in pre_crisis_windows:
                if s <= day <= e:
                    pre_crisis_severity = (day - s + 1) / (e - s + 1)

        repo += np.random.normal(0, 0.05)

        if is_crisis:
            daily_in = deposit_pool * np.random.uniform(0.0001, 0.001)
            escalation = min(1.0 + crisis_day_count * 0.04, 4.0)
            daily_out = deposit_pool * np.random.uniform(0.003, 0.008) * escalation
            daily_l_given = deposit_pool * np.random.uniform(0.0, 0.0005)
            daily_l_repay = loan_pool * np.random.uniform(0.0005, 0.0015)
        elif is_pre_crisis:
            # Gradually worsening: withdrawals increase, deposits decrease
            daily_in  = deposit_pool * np.random.uniform(0.001, 0.004) * (1.0 - pre_crisis_severity * 0.5)
            daily_out = deposit_pool * np.random.uniform(0.002, 0.006) * (1.0 + pre_crisis_severity * 0.8)
            daily_l_given = deposit_pool * np.random.uniform(0.0005, 0.002)
            daily_l_repay = loan_pool * np.random.uniform(0.001, 0.003)
        else:
            daily_in_base  = deposit_pool * np.random.uniform(0.002, 0.006)
            daily_out_base = deposit_pool * np.random.uniform(0.002, 0.0055)
            daily_in  = max(0, daily_in_base + daily_in_base * np.random.uniform(-0.6, 0.8))
            daily_out = max(0, daily_out_base + daily_out_base * np.random.uniform(-0.6, 0.8))
            daily_l_given = deposit_pool * np.random.uniform(0.001, 0.003)
            daily_l_repay = loan_pool * np.random.uniform(0.0015, 0.004)

        # News impact
        if day > 0 and day % 10 == 0:
            ev = random.choice(NEWS_EVENTS)
            sentiment += ev["base"] * ev["weight"]
        else:
            sentiment *= 0.80

        dep_mult  = max(0.4, 1.0 + sentiment)
        with_mult = max(0.4, 1.0 - sentiment)
        daily_in  *= dep_mult
        daily_out *= with_mult

        deposit_pool += (daily_in - daily_out)
        deposit_pool = max(deposit_pool, 1000)
        loan_pool += (daily_l_given - daily_l_repay)
        loan_pool = max(loan_pool, 1000)

        net_cash = (daily_in + daily_l_repay) - (daily_out + daily_l_given)
        if net_cash < 0:
            haircut = np.random.uniform(0.05, 0.15) if is_crisis else 0.0
            hqla += net_cash * (1.0 + haircut)
        else:
            hqla += net_cash

        target_hqla = deposit_pool * 0.20
        hqla += (target_hqla - hqla) * 0.05 + hqla * np.random.normal(0, 0.001)

        expected_outflow = max(deposit_pool * 0.10, 100)
        lcr = min(hqla / expected_outflow, 5.0)
        hqla_ratio = hqla / max(deposit_pool, 1)
        loans_net = daily_l_given - daily_l_repay
        crisis_val = 1.0 if is_crisis else (0.5 if is_pre_crisis else 0.0)
        ldr = loan_pool / max(deposit_pool, 1)

        features.append([repo, sentiment, loans_net / max(deposit_pool, 1), crisis_val, lcr, hqla_ratio, ldr])
        lcr_values.append(lcr)

    features_arr = np.array(features, dtype=np.float32)
    lcr_arr = np.array(lcr_values, dtype=np.float32)

    # Compute ground-truth survival labels
    labels = np.full(n_days, 365.0, dtype=np.float32)
    for i in range(n_days):
        if lcr_arr[i] < 1.0:
            labels[i] = 0.0
        else:
            for j in range(i + 1, min(i + 366, n_days)):
                if lcr_arr[j] < 1.0:
                    labels[i] = float(j - i)
                    break

    return features_arr, labels


def pretrain_lstm(features, labels, seq_len=30, epochs=1000, lr=0.003):
    """Pre-train with oversampled crisis data and Huber loss."""
    n = len(features)
    f_min = features.min(axis=0)
    f_max = features.max(axis=0)
    rng = f_max - f_min; rng[rng == 0] = 1.0
    X_norm = (features - f_min) / rng

    # Normalize labels to [0, 1]
    Y_norm = labels / 365.0

    # Build sequences
    sequences, targets = [], []
    crisis_sequences, crisis_targets = [], []  # For oversampling

    for i in range(n - seq_len):
        seq = X_norm[i:i+seq_len]
        target = Y_norm[i + seq_len]
        sequences.append(seq)
        targets.append(target)
        # If this is a low-survival sample, collect for oversampling
        if target < 0.85:  # survival < ~310 days
            crisis_sequences.append(seq)
            crisis_targets.append(target)

    # Oversample crisis data 8x
    print(f"[Pre-train] Normal samples: {len(sequences)}, Crisis samples: {len(crisis_sequences)} (will 5x oversample)")
    for _ in range(8):
        sequences.extend(crisis_sequences)
        targets.extend(crisis_targets)

    # Shuffle
    combined = list(zip(sequences, targets))
    random.shuffle(combined)
    sequences, targets = zip(*combined)

    X_t = torch.tensor(np.array(sequences), dtype=torch.float32).to(DEVICE)
    Y_t = torch.tensor(np.array(targets), dtype=torch.float32).unsqueeze(1).to(DEVICE)

    model = SurvivalLSTM(input_size=features.shape[1]).to(DEVICE)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
    criterion = nn.SmoothL1Loss()  # Huber loss — robust to label imbalance

    print(f"[Pre-train] {len(X_t)} total sequences ({len(crisis_sequences)} crisis × 8 oversampled), {epochs} epochs on {DEVICE}...")
    t0 = time.time()

    model.train()
    for epoch in range(epochs):
        optimizer.zero_grad()
        pred = model(X_t)
        loss = criterion(pred, Y_t)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        scheduler.step()
        if (epoch + 1) % 200 == 0:
            print(f"   Epoch {epoch+1}/{epochs}  Loss: {loss.item():.6f}")

    elapsed = time.time() - t0
    print(f"[Pre-train] Done in {elapsed:.1f}s  Final loss: {loss.item():.6f}")
    model.eval()
    return model, f_min, f_max


# ─── Run pre-training ───────────────────────────────────────────────
print("[Engine] Generating 4+ years of labeled training data...")
_pt_features, _pt_labels = generate_pretraining_data(1500)
_pretrained_model, _pt_fmin, _pt_fmax = pretrain_lstm(_pt_features, _pt_labels, seq_len=30, epochs=1000)


# ─── Simulation Engine ──────────────────────────────────────────────
class BankSimulationEngine:
    def __init__(self):
        self.reset()

    def reset(self):
        self.day = 0
        self.is_crisis = False
        self.has_failed = False
        self.repo_rate = 5.0

        self.current_deposit_pool = 100_000_000.0
        self.current_loan_pool    = 70_000_000.0
        self.current_hqla         = 20_000_000.0
        self.capital              = 15_000_000.0

        self.start_date = datetime.date(2026, 1, 1)
        self.cumulative_net_cash = 0.0
        self.base_hqla = self.current_hqla
        self.market_sentiment = 0.0
        self.latest_news = None
        self.crisis_day_count = 0

        # LSTM (cloned from pre-trained)
        self.lstm_model = SurvivalLSTM(input_size=7).to(DEVICE)  # 256-hidden, 3-layer
        self.lstm_model.load_state_dict(_pretrained_model.state_dict())
        self.lstm_model.eval()
        self.feature_history = []
        self.feature_min = _pt_fmin.copy()
        self.feature_max = _pt_fmax.copy()
        self._lstm_survival = 365

        # Prophet
        self.lcr_history = []
        self.date_history = []
        self._prophet_survival = None
        self._prophet_lower = None
        self._prophet_upper = None

        self.history = []

    def trigger_crisis(self):
        self.is_crisis = True

    # ── LSTM Prediction ──────────────────────────────────────────────
    def _normalize(self, arr):
        rng = self.feature_max - self.feature_min
        rng[rng == 0] = 1.0
        return (arr - self.feature_min) / rng

    def _predict_lstm(self, current_lcr):
        if current_lcr < 1.0:
            self._lstm_survival = 0
            return 0

        if len(self.feature_history) < 30:
            return self._lstm_survival

        X_raw = np.array(self.feature_history[-30:], dtype=np.float32)
        X_norm = self._normalize(X_raw)
        seq = torch.tensor(X_norm, dtype=torch.float32).unsqueeze(0).to(DEVICE)

        with torch.no_grad():
            raw = self.lstm_model(seq).item()

        # Model outputs normalized [0,1] range → scale to days
        raw_days = raw * 365.0
        raw_days = max(0, min(365, raw_days))

        # Smooth (50% new, 50% cached)
        smoothed = int(0.5 * raw_days + 0.5 * self._lstm_survival)
        self._lstm_survival = max(0, min(365, smoothed))
        return self._lstm_survival

    # ── Prophet Prediction ───────────────────────────────────────────
    def _fit_prophet(self):
        if not PROPHET_AVAILABLE or len(self.lcr_history) < 15:
            return

        # Use LCR as percentage + add crisis flag as regressor
        lcr_pct = [lcr * 100 for lcr in self.lcr_history]
        crisis_flags = []
        for feat in self.feature_history[-len(self.lcr_history):]:
            crisis_flags.append(feat[3])  # crisis_val from feature vector

        df = pd.DataFrame({
            'ds': pd.to_datetime(self.date_history),
            'y': lcr_pct,
            'crisis': crisis_flags[:len(lcr_pct)],
        })

        try:
            m = Prophet(
                changepoint_prior_scale=0.9,      # Very aggressive — reacts fast to trend shifts
                changepoint_range=0.95,            # Detect changes in last 95% of data (not just 80%)
                yearly_seasonality=False,
                weekly_seasonality=False,
                daily_seasonality=False,
                uncertainty_samples=100,
                n_changepoints=min(30, len(df) // 3),  # More changepoints for granularity
            )
            m.add_regressor('crisis', standardize=False)
            m.fit(df)

            # Build future dataframe with crisis regressor
            future = m.make_future_dataframe(periods=365)
            # Assume current crisis state continues into the future
            current_crisis = crisis_flags[-1] if crisis_flags else 0.0
            future['crisis'] = current_crisis
            # For historical rows, use actual values
            future.loc[:len(df)-1, 'crisis'] = df['crisis'].values

            forecast = m.predict(future)
            future_only = forecast[forecast['ds'] > df['ds'].max()]

            self._prophet_survival = 365
            self._prophet_lower = 365
            self._prophet_upper = 365

            for _, row in future_only.iterrows():
                days_out = (row['ds'] - df['ds'].max()).days
                if self._prophet_survival == 365 and row['yhat'] < 100:
                    self._prophet_survival = days_out
                if self._prophet_lower == 365 and row['yhat_lower'] < 100:
                    self._prophet_lower = days_out
                if self._prophet_upper == 365 and row['yhat_upper'] < 100:
                    self._prophet_upper = days_out

            if self.lcr_history[-1] < 1.0:
                self._prophet_survival = 0
                self._prophet_lower = 0

        except Exception as e:
            print(f"[Prophet] Fit error: {e}")

    # ── Main simulation tick ─────────────────────────────────────────
    def step(self):
        current_date = self.start_date + datetime.timedelta(days=self.day)
        self.repo_rate += np.random.normal(0, 0.05)

        if not self.is_crisis:
            daily_in_base  = self.current_deposit_pool * np.random.uniform(0.002, 0.006)
            daily_out_base = self.current_deposit_pool * np.random.uniform(0.002, 0.0055)
            spike_in  = daily_in_base  * np.random.uniform(-0.6, 0.8)
            spike_out = daily_out_base * np.random.uniform(-0.6, 0.8)
            daily_in  = max(0, daily_in_base + spike_in)
            daily_out = max(0, daily_out_base + spike_out)
            daily_l_given = self.current_deposit_pool * np.random.uniform(0.001, 0.003)
            daily_l_repay = self.current_loan_pool * np.random.uniform(0.0015, 0.004)
        else:
            self.crisis_day_count += 1
            daily_in = self.current_deposit_pool * np.random.uniform(0.0001, 0.001)
            escalation = min(1.0 + self.crisis_day_count * 0.05, 5.0)
            daily_out = self.current_deposit_pool * np.random.uniform(0.002, 0.01) * escalation
            daily_l_given = self.current_deposit_pool * np.random.uniform(0.000, 0.0005)
            daily_l_repay = self.current_loan_pool * np.random.uniform(0.0005, 0.0015)

        # ── Weighted News ──
        news_impact = None
        if self.day > 0 and self.day % 10 == 0:
            event = random.choice(NEWS_EVENTS)
            impact = event["base"] * event["weight"]
            self.market_sentiment += impact
            news_impact = event["weight"]
            self.latest_news = {
                "headline": event["headline"],
                "type": "positive" if event["base"] > 0 else "negative" if event["base"] < 0 else "neutral",
                "weight": event["weight"],
                "days_ago": 0,
            }
        else:
            self.market_sentiment *= 0.80
            if self.latest_news:
                self.latest_news["days_ago"] += 1

        dep_mult  = max(0.4, 1.0 + self.market_sentiment)
        with_mult = max(0.4, 1.0 - self.market_sentiment)
        daily_in  *= dep_mult
        daily_out *= with_mult

        self.current_deposit_pool += (daily_in - daily_out)
        self.current_deposit_pool = max(self.current_deposit_pool, 1000)
        self.current_loan_pool += (daily_l_given - daily_l_repay)
        self.current_loan_pool = max(self.current_loan_pool, 1000)

        net_cash_flow = (daily_in + daily_l_repay) - (daily_out + daily_l_given)

        market_variation = self.current_hqla * np.random.normal(0, 0.001)
        if net_cash_flow < 0:
            haircut = np.random.uniform(0.05, 0.15) if self.is_crisis else 0.0
            self.current_hqla += net_cash_flow * (1.0 + haircut)
        else:
            self.current_hqla += net_cash_flow

        target_hqla = self.current_deposit_pool * 0.20
        rebalance_drift = (target_hqla - self.current_hqla) * 0.05
        self.current_hqla += rebalance_drift + market_variation

        expected_30d_outflow = max(self.current_deposit_pool * 0.10, 100)
        lcr = min(self.current_hqla / expected_30d_outflow, 5.0)

        asf = (self.current_deposit_pool * 0.90) + self.capital
        rsf = self.current_loan_pool * 0.85
        nsfr = asf / rsf if rsf > 0 else 5.0
        ldr = (self.current_loan_pool / self.current_deposit_pool) * 100 if self.current_deposit_pool > 0 else 0

        self.cumulative_net_cash += net_cash_flow
        nlp = self.base_hqla + self.cumulative_net_cash
        if nlp < 0:
            self.has_failed = True

        # ── Track features ──
        loans_net = daily_l_given - daily_l_repay
        crisis_val = 1.0 if self.is_crisis else 0.0
        hqla_ratio = self.current_hqla / max(self.current_deposit_pool, 1)
        ldr_ratio = self.current_loan_pool / max(self.current_deposit_pool, 1)

        self.feature_history.append([
            self.repo_rate, self.market_sentiment,
            loans_net / max(self.current_deposit_pool, 1),
            crisis_val, lcr, hqla_ratio, ldr_ratio,
        ])
        self.lcr_history.append(lcr)
        self.date_history.append(current_date.strftime('%Y-%m-%d'))

        # ── LSTM prediction (every tick, it's instant) ──
        lstm_pred = self._predict_lstm(lcr)

        # ── Prophet prediction ──
        # Refit every 15 ticks normally, every 5 ticks during crisis
        prophet_interval = 5 if self.is_crisis else 15
        if self.day >= 15 and self.day % prophet_interval == 0:
            self._fit_prophet()

        # Prophet hard override: if LCR already <100%, survival = 0
        prophet_pred = self._prophet_survival
        if lcr < 1.0 and prophet_pred is not None:
            prophet_pred = 0
            self._prophet_survival = 0
            self._prophet_lower = 0

        record = {
            "Date":                    current_date.strftime('%Y-%m-%d'),
            "LCR":                     round(lcr * 100, 2),
            "NSFR":                    round(nsfr * 100, 2),
            "NLP":                     round(nlp, 2),
            "HQLA":                    round(self.current_hqla, 2),
            "LDR":                     round(ldr, 2),
            "LSTM_Survival":           lstm_pred,
            "Prophet_Survival":        prophet_pred,
            "Prophet_Lower":           self._prophet_lower,
            "Prophet_Upper":           self._prophet_upper,
            "Daily_Deposits":          round(daily_in, 2),
            "Daily_Withdrawals":       round(daily_out, 2),
            "Daily_Loans_Given":       round(daily_l_given, 2),
            "Daily_Loans_Repaid":      round(daily_l_repay, 2),
            "is_crisis":               self.is_crisis,
            "has_failed":              self.has_failed,
            "News_Headline":           self.latest_news["headline"] if self.latest_news else None,
            "News_Type":               self.latest_news["type"]     if self.latest_news else None,
            "News_Weight":             self.latest_news.get("weight", 0) if self.latest_news else 0,
            "News_Age":                self.latest_news["days_ago"] if self.latest_news else 0,
        }

        self.history.append(record)
        self.day += 1
        return record
