import numpy as np
import datetime
import random
import time
import logging

import torch
import torch.nn as nn



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

# ─── Proposed Solutions Registry ────────────────────────────────────
SOLUTIONS = {
    "inject_hqla": {
        "title": "Emergency HQLA Injection",
        "description": "Inject $5M of high-quality liquid assets from reserve facilities to shore up the liquidity buffer.",
        "severity": "warning",
        "effects": {"hqla_inject": 5_000_000},
        "duration": 0,  # Instant one-shot
    },
    "reduce_lending": {
        "title": "Freeze New Loan Issuance",
        "description": "Halt all new loan originations for 15 days to preserve cash and reduce outflow pressure.",
        "severity": "warning",
        "effects": {"loan_freeze": True},
        "duration": 15,
    },
    "emergency_credit": {
        "title": "Activate Emergency Credit Line",
        "description": "Draw $10M from the emergency credit facility — $5M to deposits, $5M to HQLA — to stabilize the balance sheet.",
        "severity": "critical",
        "effects": {"deposit_inject": 5_000_000, "hqla_inject": 5_000_000},
        "duration": 0,
    },
    "raise_deposit_rates": {
        "title": "Raise Deposit Rates (+50bp)",
        "description": "Increase deposit rates by 50 basis points to attract inflows. Deposit multiplier boosted 1.3x for 20 days.",
        "severity": "warning",
        "effects": {"deposit_multiplier": 1.3},
        "duration": 20,
    },
    "sell_loan_portfolio": {
        "title": "Sell Loan Portfolio ($8M)",
        "description": "Liquidate $8M of the loan book at a 25% haircut, converting to $6M HQLA immediately.",
        "severity": "critical",
        "effects": {"loan_sell": 8_000_000, "hqla_inject": 6_000_000},
        "duration": 0,
    },
}

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

# ─── Load Pre-Trained Model from Disk ───────────────────────────────
import os as _os
_MODEL_DIR = _os.path.dirname(_os.path.abspath(__file__))
_MODEL_PATH = _os.path.join(_MODEL_DIR, "survival_lstm.pt")
_NORM_PATH = _os.path.join(_MODEL_DIR, "feature_normalization.npz")

if not _os.path.exists(_MODEL_PATH) or not _os.path.exists(_NORM_PATH):
    raise FileNotFoundError(
        f"Pre-trained model not found!\n"
        f"  Expected: {_MODEL_PATH}\n"
        f"           {_NORM_PATH}\n"
        f"  Run 'python train_model.py' first to train and save the model."
    )

_pretrained_model = SurvivalLSTM(input_size=7).to(DEVICE)
_pretrained_model.load_state_dict(torch.load(_MODEL_PATH, map_location=DEVICE, weights_only=True))
_pretrained_model.eval()

_norm_data = np.load(_NORM_PATH)
_pt_fmin = _norm_data["f_min"]
_pt_fmax = _norm_data["f_max"]

print(f"[Engine] Loaded pre-trained LSTM from {_MODEL_PATH}")
print(f"[Engine] Loaded normalization params from {_NORM_PATH}")



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

        self.lcr_history = []
        self.date_history = []

        self.history = []

        # ── Solutions State ──
        self.active_solutions = []  # [{id, title, remaining, effects}]
        self.applied_solution_ids = set()
        self.loan_freeze_remaining = 0
        self.deposit_multiplier_boost = 1.0
        self.deposit_boost_remaining = 0

        # ── Counterfactual Shadow State ──
        self._counterfactual_active = False
        self._shadow_deposit_pool = None
        self._shadow_loan_pool = None
        self._shadow_hqla = None
        self._shadow_cumulative_net = None
        self._shadow_market_sentiment = None
        self._shadow_crisis_day_count = 0

        # ── Alert cooldowns (prevent spamming) ──
        self._alert_cooldowns = {}
        self._lcr_trend = []  # last 5 LCR values for drop detection
        self._deposit_trend = []  # last 5 net deposit flows

    def trigger_crisis(self):
        self.is_crisis = True

    # ── Solution Application ─────────────────────────────────────────
    def apply_solution(self, solution_id):
        """Apply a solution. Returns True if successful."""
        if solution_id not in SOLUTIONS:
            return False, "Unknown solution"

        sol = SOLUTIONS[solution_id]
        effects = sol["effects"]

        # Duration-based solutions (loan freeze, deposit rates) can only be applied once
        if sol["duration"] > 0 and solution_id in self.applied_solution_ids:
            return False, "Already active"

        # Snapshot shadow state on first solution application
        if not self._counterfactual_active:
            self._snapshot_shadow_state()

        # Apply instant effects
        if "hqla_inject" in effects:
            self.current_hqla += effects["hqla_inject"]
        if "deposit_inject" in effects:
            self.current_deposit_pool += effects["deposit_inject"]
        if "loan_sell" in effects:
            self.current_loan_pool = max(1000, self.current_loan_pool - effects["loan_sell"])
        if "loan_freeze" in effects:
            self.loan_freeze_remaining = sol["duration"]
        if "deposit_multiplier" in effects:
            self.deposit_multiplier_boost = effects["deposit_multiplier"]
            self.deposit_boost_remaining = sol["duration"]

        # Track applied (duration-based get locked, instant can be re-applied)
        if sol["duration"] > 0:
            self.applied_solution_ids.add(solution_id)

        # Track active solution with unique key
        self._apply_counter = getattr(self, '_apply_counter', 0) + 1
        self.active_solutions.append({
            "id": solution_id,
            "title": sol["title"],
            "remaining": max(sol["duration"], 1),
            "effects": effects,
            "_key": f"{solution_id}_{self._apply_counter}",
        })

        return True, f"Applied: {sol['title']}"

    def _snapshot_shadow_state(self):
        """Fork the current state for counterfactual tracking."""
        self._counterfactual_active = True
        self._shadow_deposit_pool = self.current_deposit_pool
        self._shadow_loan_pool = self.current_loan_pool
        self._shadow_hqla = self.current_hqla
        self._shadow_cumulative_net = self.cumulative_net_cash
        self._shadow_market_sentiment = self.market_sentiment
        self._shadow_crisis_day_count = self.crisis_day_count

    def _step_shadow(self, daily_in_raw, daily_out_raw, daily_l_given_raw, daily_l_repay_raw,
                     dep_mult, with_mult, is_crisis):
        """Run one tick of the shadow (no-solution) simulation."""
        if not self._counterfactual_active:
            return None

        # Shadow uses raw cash flows WITHOUT solution modifiers
        s_daily_in = daily_in_raw * dep_mult
        s_daily_out = daily_out_raw * with_mult

        self._shadow_deposit_pool += (s_daily_in - s_daily_out)
        self._shadow_deposit_pool = max(self._shadow_deposit_pool, 1000)
        self._shadow_loan_pool += (daily_l_given_raw - daily_l_repay_raw)
        self._shadow_loan_pool = max(self._shadow_loan_pool, 1000)

        s_net = (s_daily_in + daily_l_repay_raw) - (s_daily_out + daily_l_given_raw)
        s_variation = self._shadow_hqla * np.random.normal(0, 0.0005)  # slight noise
        if s_net < 0:
            haircut = np.random.uniform(0.05, 0.15) if is_crisis else 0.0
            self._shadow_hqla += s_net * (1.0 + haircut)
        else:
            self._shadow_hqla += s_net

        target = self._shadow_deposit_pool * 0.20
        self._shadow_hqla += (target - self._shadow_hqla) * 0.05 + s_variation

        s_expected_outflow = max(self._shadow_deposit_pool * 0.10, 100)
        s_lcr = min(self._shadow_hqla / s_expected_outflow, 5.0)

        self._shadow_cumulative_net += s_net
        s_nlp = self.base_hqla + self._shadow_cumulative_net

        return {
            "LCR": round(s_lcr * 100, 2),
            "NLP": round(s_nlp, 2),
            "HQLA": round(self._shadow_hqla, 2),
        }

    def _check_alerts(self, lcr, net_deposit_flow):
        """Detect conditions and return alerts with suggested solutions."""
        alerts = []

        # Update trends
        self._lcr_trend.append(lcr)
        if len(self._lcr_trend) > 5:
            self._lcr_trend = self._lcr_trend[-5:]
        self._deposit_trend.append(net_deposit_flow)
        if len(self._deposit_trend) > 5:
            self._deposit_trend = self._deposit_trend[-5:]

        # Cooldown is shorter during crisis
        base_cooldown = 3 if self.is_crisis else 8

        def _can_alert(alert_id, cooldown=None):
            if cooldown is None:
                cooldown = base_cooldown
            last = self._alert_cooldowns.get(alert_id, -999)
            return self.day - last >= cooldown

        def _fire(alert_id, severity, title, desc, solutions, cooldown=None):
            if not _can_alert(alert_id, cooldown):
                return
            # Always include all solutions — instant ones can be re-applied
            # Only filter out duration-based solutions that are currently active
            available = [s for s in solutions if s not in self.applied_solution_ids]
            # Add back instant solutions (duration=0) that can be re-applied
            for s in solutions:
                if s not in available and s in SOLUTIONS and SOLUTIONS[s]["duration"] == 0:
                    available.append(s)
            self._alert_cooldowns[alert_id] = self.day
            alerts.append({
                "id": alert_id,
                "severity": severity,
                "title": title,
                "description": desc,
                "solutions": available,
            })

        # ── LCR dropping rapidly (>10% over 5 ticks) ──
        if len(self._lcr_trend) >= 5:
            lcr_drop = self._lcr_trend[0] - self._lcr_trend[-1]
            if lcr_drop > 0.10:
                _fire("lcr_rapid_drop", "warning",
                      "LCR Declining Rapidly",
                      f"LCR has dropped {lcr_drop*100:.1f}% over the last 5 days. Immediate action recommended.",
                      ["inject_hqla", "reduce_lending", "raise_deposit_rates"])

        # ── LCR below warning threshold ──
        if lcr < 1.2 and lcr >= 1.0:
            _fire("lcr_warning", "warning",
                  "LCR Approaching Regulatory Minimum",
                  f"LCR at {lcr*100:.1f}% — dangerously close to the 100% Basel III floor.",
                  ["inject_hqla", "reduce_lending", "sell_loan_portfolio"])

        # ── LCR below critical threshold ──
        if lcr < 1.0:
            _fire("lcr_critical", "critical",
                  "LCR BREACH — Below Regulatory Minimum",
                  f"LCR has fallen to {lcr*100:.1f}%, breaching the 100% Basel III requirement. Emergency action required.",
                  ["emergency_credit", "inject_hqla", "sell_loan_portfolio"])

        # ── Survival forecast critical ──
        if self._lstm_survival is not None and self._lstm_survival < 60:
            _fire("survival_critical", "critical",
                  "Survival Horizon Critical",
                  f"LSTM model predicts only {self._lstm_survival} days until LCR breach.",
                  ["emergency_credit", "reduce_lending", "sell_loan_portfolio"])

        # ── Crisis ongoing (fires every few ticks, not just at onset) ──
        if self.is_crisis:
            _fire("crisis_ongoing", "critical",
                  f"Market Crisis — Day {self.crisis_day_count}",
                  f"Crisis day {self.crisis_day_count}: deposit outflows accelerating, interbank rates spiking. Apply emergency measures.",
                  ["emergency_credit", "inject_hqla", "reduce_lending", "raise_deposit_rates", "sell_loan_portfolio"],
                  cooldown=5)

        # ── Consecutive deposit outflows ──
        if len(self._deposit_trend) >= 3 and all(d < 0 for d in self._deposit_trend[-3:]):
            _fire("deposit_outflow", "warning",
                  "Sustained Deposit Outflows",
                  "Net deposit outflows for 3+ consecutive days. Deposit base eroding.",
                  ["raise_deposit_rates", "inject_hqla"])

        return alerts

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

        # ── Save raw values for shadow sim BEFORE solution modifiers ──
        daily_in_raw = daily_in
        daily_out_raw = daily_out
        daily_l_given_raw = daily_l_given
        daily_l_repay_raw = daily_l_repay

        # ── Apply ongoing solution effects ──
        if self.loan_freeze_remaining > 0:
            daily_l_given = 0.0
            self.loan_freeze_remaining -= 1
        if self.deposit_boost_remaining > 0:
            daily_in *= self.deposit_multiplier_boost
            self.deposit_boost_remaining -= 1
            if self.deposit_boost_remaining == 0:
                self.deposit_multiplier_boost = 1.0

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

        # ── Run counterfactual shadow sim ──
        counterfactual = self._step_shadow(
            daily_in_raw, daily_out_raw, daily_l_given_raw, daily_l_repay_raw,
            dep_mult, with_mult, self.is_crisis
        )

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



        # ── Check for alerts ──
        net_deposit_flow = daily_in - daily_out
        alerts = self._check_alerts(lcr, net_deposit_flow)

        # ── Tick down active solutions ──
        still_active = []
        for sol in self.active_solutions:
            sol["remaining"] -= 1
            if sol["remaining"] > 0:
                still_active.append(sol)
        self.active_solutions = still_active

        record = {
            "Date":                    current_date.strftime('%Y-%m-%d'),
            "LCR":                     round(lcr * 100, 2),
            "NSFR":                    round(nsfr * 100, 2),
            "NLP":                     round(nlp, 2),
            "HQLA":                    round(self.current_hqla, 2),
            "LDR":                     round(ldr, 2),
            "LSTM_Survival":           lstm_pred,

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
            # ── Counterfactual ──
            "Counterfactual_LCR":      counterfactual["LCR"] if counterfactual else None,
            "Counterfactual_NLP":      counterfactual["NLP"] if counterfactual else None,
            "Counterfactual_HQLA":     counterfactual["HQLA"] if counterfactual else None,
            # ── Methodology — real-time formulas ──
            "Methodology": {
                "cash_flows": (
                    f"Deposits = Pool × U(0.002,0.006) × depMult({dep_mult:.3f}) = ${daily_in:,.0f}. "
                    f"Withdrawals = Pool × U(0.002,0.0055) × withMult({with_mult:.3f}) = ${daily_out:,.0f}. "
                    + (f"CRISIS MODE: escalation={1.0 + self.crisis_day_count * 0.05:.2f}×, deposits suppressed to U(0.0001,0.001). " if self.is_crisis else "")
                    + f"Sentiment={self.market_sentiment:.4f} → depMult=max(0.4, 1+sent), withMult=max(0.4, 1−sent). "
                    + (f"Loan freeze active ({self.loan_freeze_remaining}d remaining). " if self.loan_freeze_remaining > 0 else "")
                    + (f"Deposit rate boost ×{self.deposit_multiplier_boost:.2f} ({self.deposit_boost_remaining}d remaining). " if self.deposit_boost_remaining > 0 else "")
                    + f"Net cash flow = (Deposits + LoanRepay) − (Withdrawals + LoansGiven) = ${net_cash_flow:,.0f}."
                ),
                "lending": (
                    f"Loans Issued = Pool × U(0.001,0.003) = ${daily_l_given:,.0f}. "
                    f"Repayments = LoanPool × U(0.0015,0.004) = ${daily_l_repay:,.0f}. "
                    + (f"Crisis: lending frozen to U(0,0.0005), repayments slow to U(0.0005,0.0015). " if self.is_crisis else "")
                    + f"Net lending = Issued − Repaid = ${(daily_l_given - daily_l_repay):,.0f}. "
                    f"Loan-to-Deposit ratio = LoanPool/DepositPool = {ldr:.2f}%."
                ),
                "lcr_nsfr": (
                    f"LCR = HQLA / Expected30dOutflow × 100. "
                    f"HQLA = ${self.current_hqla:,.0f}, Expected30dOutflow = DepositPool × 10% = ${expected_30d_outflow:,.0f}. "
                    f"LCR = {lcr*100:.2f}% (Basel III min: 100%). "
                    f"NSFR = ASF/RSF × 100. ASF = Deposits×0.90 + Capital = ${asf:,.0f}. "
                    f"RSF = Loans×0.85 = ${rsf:,.0f}. NSFR = {nsfr*100:.2f}% (min: 100%). "
                    f"HQLA target = DepositPool × 20% = ${target_hqla:,.0f}; "
                    f"rebalance drift = (target − HQLA) × 5% = ${rebalance_drift:,.0f}."
                ),
                "nlp_hqla": (
                    f"NLP = BaseHQLA + CumulativeNetCash = ${self.base_hqla:,.0f} + ${self.cumulative_net_cash:,.0f} = ${nlp:,.0f}. "
                    f"NLP < 0 → insolvency. "
                    f"HQLA updated by: netCashFlow × (1 + haircut) if negative, else + netCashFlow. "
                    + (f"Crisis haircut applied: 5-15% additional loss on negative flows. " if self.is_crisis else "No haircut (normal operations). ")
                    + f"Market noise: HQLA × N(0, 0.001) = ${market_variation:,.0f}. "
                    f"Total HQLA = ${self.current_hqla:,.0f}."
                ),
                "survival": (
                    f"LSTM: 3-layer, 256-unit LSTM trained on 5 years of realistic macro data "
                    f"(Fed Funds, VIX, 10Y Treasury, 4 crisis periods). Input: 30-day sliding window of "
                    f"[repo_rate, sentiment, loans_net_ratio, crisis_flag, LCR, hqla_ratio, LDR]. "
                    f"Output: {lstm_pred}d until LCR < 100%. "

                    + f"Feature vector: [repo={self.repo_rate:.2f}, sent={self.market_sentiment:.4f}, "
                    f"loansNet={loans_net/max(self.current_deposit_pool,1):.6f}, crisis={crisis_val}, "
                    f"lcr={lcr:.4f}, hqlaRatio={hqla_ratio:.4f}, ldr={ldr_ratio:.4f}]."
                ),
            },
        }

        self.history.append(record)
        self.day += 1
        return record, alerts


