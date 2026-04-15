"""
build_realistic_dataset.py
═══════════════════════════════════════════════════════════════════════
Downloads REAL macroeconomic data from FRED (Federal Reserve Economic Data)
and merges it with calibrated synthetic bank-level data to produce a
realistic 5-year training dataset for the LSTM survival model.

Data Sources (all public, no API key required):
  1. FRED — Federal Funds Rate (FEDFUNDS)
  2. FRED — 10-Year Treasury Constant Maturity Rate (DGS10)
  3. FRED — CBOE Volatility Index (VIXCLS)
  4. FRED — Deposits, All Commercial Banks (DPSACBW027SBOG)
  5. FRED — Loans and Leases in Bank Credit, All Commercial Banks (TOTLL)
  6. FRED — Effective Federal Funds Rate Daily (DFF)
  7. FRED — ICE BofA US High Yield Option-Adjusted Spread (BAMLH0A0HYM2)

Real Crisis Periods Used:
  - COVID-19 market crash (Feb 20 – Apr 9, 2020)
  - 2022 aggressive rate hike cycle (Jun 15 – Dec 31, 2022)
  - SVB / regional bank crisis (Mar 8 – Apr 15, 2023)
  - UK gilt crisis (Sep 23 – Oct 31, 2022)

Run:  python build_realistic_dataset.py
Output: bank_liquidity_realistic.csv + feature_normalization.npz + survival_lstm.pt
"""

import numpy as np
import pandas as pd
import datetime
import random
import time
import os
import sys
import io
import warnings

warnings.filterwarnings("ignore")

SAVE_DIR = os.path.dirname(os.path.abspath(__file__))
START_DATE = "2019-01-02"
END_DATE   = "2024-12-31"

# ─── FRED Direct CSV Download (no API key needed) ───────────────────
FRED_SERIES = {
    "DFF":                "https://fred.stlouisfed.org/graph/fredgraph.csv?id=DFF",          # Daily Fed Funds
    "DGS10":              "https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS10",        # 10Y Treasury
    "VIXCLS":             "https://fred.stlouisfed.org/graph/fredgraph.csv?id=VIXCLS",       # VIX
    "BAMLH0A0HYM2":      "https://fred.stlouisfed.org/graph/fredgraph.csv?id=BAMLH0A0HYM2", # HY Spread
}

# Weekly series (need resampling)
FRED_WEEKLY = {
    "DPSACBW027SBOG":     "https://fred.stlouisfed.org/graph/fredgraph.csv?id=DPSACBW027SBOG", # Bank Deposits (billions)
    "TOTLL":              "https://fred.stlouisfed.org/graph/fredgraph.csv?id=TOTLL",           # Total Loans (billions)
}

# ─── Real Crisis Periods ────────────────────────────────────────────
CRISIS_PERIODS = [
    {
        "name": "COVID-19 Market Crash",
        "start": "2020-02-20", "end": "2020-04-09",
        "pre_start": "2020-01-20", "pre_end": "2020-02-19",
        "severity": 2.8,
        "headlines": [
            "WHO declares COVID-19 a global pandemic — markets in freefall",
            "S&P 500 crashes 12% in single session — worst since 1987",
            "Fed slashes rates to zero in emergency session, announces unlimited QE",
            "Global lockdowns trigger mass deposit withdrawals from retail banks",
            "Interbank lending freezes as counterparty risk surges",
            "Corporate bond spreads blow out 400bp as credit markets seize",
        ]
    },
    {
        "name": "2022 Rate Hike Tightening",
        "start": "2022-06-15", "end": "2022-12-31",
        "pre_start": "2022-04-01", "pre_end": "2022-06-14",
        "severity": 1.5,
        "headlines": [
            "Fed delivers 75bp rate hike — steepest since 1994",
            "10-year Treasury yield surges past 4% for first time since 2008",
            "Mortgage rates hit 7%, housing market freezes",
            "Bank unrealized bond losses exceed $600B industry-wide",
            "Inflation reaches 9.1% — highest in 40 years",
            "Yield curve inversion deepens — recession signals flash",
        ]
    },
    {
        "name": "UK Gilt Crisis",
        "start": "2022-09-23", "end": "2022-10-31",
        "pre_start": "2022-09-01", "pre_end": "2022-09-22",
        "severity": 1.8,
        "headlines": [
            "UK government's mini-budget triggers gilt market collapse",
            "Bank of England launches emergency bond-buying program",
            "Pension funds face margin calls as LDI strategies unwind",
            "Sterling crashes to record low against dollar",
        ]
    },
    {
        "name": "SVB / Regional Bank Crisis",
        "start": "2023-03-08", "end": "2023-04-15",
        "pre_start": "2023-02-01", "pre_end": "2023-03-07",
        "severity": 2.2,
        "headlines": [
            "Silicon Valley Bank collapses — largest bank failure since 2008",
            "Signature Bank seized by regulators amid contagion fears",
            "First Republic Bank stock plunges 70% as deposits flee",
            "FDIC announces systemic risk exception — all deposits guaranteed",
            "Credit Suisse emergency takeover by UBS at fire-sale price",
            "Regional bank index crashes 35% in one week",
            "Fed opens emergency lending facility (BTFP) to stem panic",
        ]
    },
]

# ─── Real News Headlines (calibrated to actual events) ──────────────
REAL_NEWS_POSITIVE = [
    {"headline": "Fed signals potential rate cuts in 2024, markets rally",                 "base": 0.12, "weight": 2.5},
    {"headline": "US GDP grows 3.3% — stronger than expected",                              "base": 0.08, "weight": 1.5},
    {"headline": "Inflation falls to 3.0%, closer to Fed's 2% target",                     "base": 0.10, "weight": 2.0},
    {"headline": "Banks pass annual Fed stress tests with strong capital buffers",           "base": 0.06, "weight": 1.2},
    {"headline": "Consumer confidence hits 2-year high, spending remains resilient",         "base": 0.05, "weight": 1.0},
    {"headline": "Labor market adds 300K+ jobs, unemployment at 3.5%",                      "base": 0.07, "weight": 1.3},
    {"headline": "Treasury announces buyback program to support liquidity",                  "base": 0.14, "weight": 2.8},
    {"headline": "ECB and Fed announce coordinated swap lines to ease dollar funding",       "base": 0.15, "weight": 3.0},
    {"headline": "Corporate earnings beat expectations across banking sector",               "base": 0.06, "weight": 1.0},
    {"headline": "Deposit growth resumes at major banks after Q1 outflows stabilize",        "base": 0.08, "weight": 1.5},
]

REAL_NEWS_NEGATIVE = [
    {"headline": "Commercial real estate defaults surge 40%, credit losses mounting",        "base": -0.12, "weight": 2.5},
    {"headline": "Moody's downgrades 10 regional banks, citing deposit flight risk",         "base": -0.10, "weight": 2.0},
    {"headline": "FDIC reports unrealized losses at US banks hit $620B",                     "base": -0.14, "weight": 2.8},
    {"headline": "Interbank overnight rates spike 150bp on liquidity strain",                "base": -0.13, "weight": 2.5},
    {"headline": "Consumer credit card delinquencies reach highest level since 2012",        "base": -0.07, "weight": 1.3},
    {"headline": "China property crisis deepens — Evergrande enters liquidation",            "base": -0.08, "weight": 1.5},
    {"headline": "Oil prices surge above $100 amid geopolitical tensions",                   "base": -0.06, "weight": 1.2},
    {"headline": "10Y-2Y yield curve inversion reaches -100bp — deep recession signal",      "base": -0.09, "weight": 1.8},
    {"headline": "Major bank reports $3.5B unexpected loan loss provisions",                 "base": -0.11, "weight": 2.2},
    {"headline": "Fed minutes reveal higher-for-longer stance, crushing rate cut hopes",     "base": -0.10, "weight": 2.0},
]

REAL_NEWS_NEUTRAL = [
    {"headline": "Bond markets trade sideways amid low volatility",                         "base": 0.0,  "weight": 0.0},
    {"headline": "No major economic releases scheduled — markets steady",                   "base": 0.0,  "weight": 0.0},
    {"headline": "Quarterly earnings season opens with mixed bank results",                 "base": 0.01, "weight": 0.5},
    {"headline": "Retail sales flat month-over-month, in line with expectations",            "base": 0.01, "weight": 0.3},
    {"headline": "Fed holds rates steady at current level, as expected",                     "base": 0.02, "weight": 0.5},
]


def download_fred_data():
    """Download all FRED series and merge into a single daily DataFrame."""
    print("[Data] Downloading FRED macroeconomic data...")

    all_data = {}

    # Daily series
    for name, url in FRED_SERIES.items():
        try:
            df = pd.read_csv(url, parse_dates=["DATE"], index_col="DATE")
            df.columns = [name]
            df[name] = pd.to_numeric(df[name], errors="coerce")
            all_data[name] = df
            print(f"  ✓ {name}: {len(df)} rows ({df.index.min().date()} — {df.index.max().date()})")
        except Exception as e:
            print(f"  ✗ {name}: {e}")

    # Weekly series (forward-fill to daily)
    for name, url in FRED_WEEKLY.items():
        try:
            df = pd.read_csv(url, parse_dates=["DATE"], index_col="DATE")
            df.columns = [name]
            df[name] = pd.to_numeric(df[name], errors="coerce")
            all_data[name] = df
            print(f"  ✓ {name}: {len(df)} rows (weekly, will resample)")
        except Exception as e:
            print(f"  ✗ {name}: {e}")

    # Create daily date range and merge
    date_range = pd.date_range(start=START_DATE, end=END_DATE, freq="B")  # Business days
    merged = pd.DataFrame(index=date_range)
    merged.index.name = "DATE"

    for name, df in all_data.items():
        merged = merged.join(df, how="left")

    # Forward-fill gaps (weekends, holidays, weekly data)
    merged = merged.ffill().bfill()

    print(f"[Data] Merged dataset: {len(merged)} business days, {len(merged.columns)} series")
    return merged


def get_crisis_phase(date, crisis_periods):
    """Returns (phase, severity, crisis_name) for a given date."""
    date_str = date.strftime("%Y-%m-%d")
    for cp in crisis_periods:
        if cp["pre_start"] <= date_str <= cp["pre_end"]:
            # Calculate severity ramp: 0→severity over the pre-crisis period
            pre_start = pd.Timestamp(cp["pre_start"])
            pre_end = pd.Timestamp(cp["pre_end"])
            pct = (date - pre_start).days / max((pre_end - pre_start).days, 1)
            return "pre_crisis", cp["severity"] * pct * 0.5, cp["name"]
        if cp["start"] <= date_str <= cp["end"]:
            crisis_start = pd.Timestamp(cp["start"])
            day_in_crisis = (date - crisis_start).days + 1
            return "crisis", cp["severity"], cp["name"], day_in_crisis, cp["headlines"]
    return "normal", 0.0, None


def generate_realistic_dataset(macro_df):
    """
    Generate bank-level data calibrated against real macro indicators.
    Uses real FRED data to modulate cash flows, spreads, and sentiment.
    """
    np.random.seed(42)
    random.seed(42)

    n_days = len(macro_df)
    dates = macro_df.index.tolist()

    # ── Bank State ──
    deposit_pool = 100_000_000.0   # $100M
    loan_pool    = 70_000_000.0    # $70M
    hqla         = 20_000_000.0    # $20M
    capital      = 15_000_000.0    # $15M
    sentiment    = 0.0
    cumulative_net = 0.0

    # ── Scaling factors from macro data ──
    vix_mean = macro_df["VIXCLS"].mean()
    dff_mean = macro_df["DFF"].mean()
    hy_spread_mean = macro_df["BAMLH0A0HYM2"].mean() if "BAMLH0A0HYM2" in macro_df.columns else 4.0

    records = []
    features = []
    lcr_values = []

    print(f"[Data] Generating {n_days}-day realistic bank simulation...")

    for i, date in enumerate(dates):
        row = macro_df.iloc[i]

        # ── Get real macro values ──
        repo_rate = row.get("DFF", 2.5)
        vix = row.get("VIXCLS", 15.0)
        treasury_10y = row.get("DGS10", 2.5)
        hy_spread = row.get("BAMLH0A0HYM2", hy_spread_mean)

        # Real aggregate bank data (billions → scale to our bank)
        agg_deposits = row.get("DPSACBW027SBOG", 17000.0)  # system-wide deposits in billions
        agg_loans = row.get("TOTLL", 11000.0)

        # ── Determine crisis phase ──
        phase_result = get_crisis_phase(date, CRISIS_PERIODS)
        is_crisis = phase_result[0] == "crisis"
        is_pre_crisis = phase_result[0] == "pre_crisis"
        severity = phase_result[1]
        crisis_name = phase_result[2]
        crisis_day_count = phase_result[3] if is_crisis else 0
        crisis_headlines = phase_result[4] if is_crisis and len(phase_result) > 4 else []

        # ── VIX-based stress multiplier ──
        # Higher VIX → more stress. Normal VIX ~15, crisis VIX 30-80
        vix_stress = max(0.0, (vix - 15.0) / 25.0)  # 0 at VIX=15, 1 at VIX=40, 2+ at VIX=65

        # ── Rate environment affects deposit/loan behavior ──
        rate_impact = (repo_rate - dff_mean) / max(dff_mean, 0.5)  # positive = tighter policy

        # ── Seasonal pattern ──
        day_of_year = date.timetuple().tm_yday
        seasonal = 1.0 + 0.015 * np.sin(2 * np.pi * day_of_year / 365.25)

        # ── Calculate daily cash flows ──
        if is_crisis:
            escalation = min(1.0 + crisis_day_count * 0.04 * severity, 4.0 * severity)
            daily_in = deposit_pool * np.random.uniform(0.0001, 0.001) * seasonal
            daily_out = deposit_pool * np.random.uniform(0.003, 0.008) * escalation
            daily_l_given = deposit_pool * np.random.uniform(0.0, 0.0005)
            daily_l_repay = loan_pool * np.random.uniform(0.0005, 0.0015)
        elif is_pre_crisis:
            daily_in  = deposit_pool * np.random.uniform(0.001, 0.004) * (1.0 - severity * 0.4) * seasonal
            daily_out = deposit_pool * np.random.uniform(0.002, 0.006) * (1.0 + severity * 0.6)
            daily_l_given = deposit_pool * np.random.uniform(0.0005, 0.002)
            daily_l_repay = loan_pool * np.random.uniform(0.001, 0.003)
        else:
            # Normal — modulated by VIX and rates
            base_in  = deposit_pool * np.random.uniform(0.002, 0.006) * seasonal
            base_out = deposit_pool * np.random.uniform(0.002, 0.0055) * seasonal

            # Higher VIX slightly increases withdrawals
            daily_in  = max(0, base_in * (1.0 - vix_stress * 0.15))
            daily_out = max(0, base_out * (1.0 + vix_stress * 0.2))

            # Higher rates reduce loan origination, increase repayment
            rate_adj = max(0.5, 1.0 - rate_impact * 0.1)
            daily_l_given = deposit_pool * np.random.uniform(0.001, 0.003) * rate_adj
            daily_l_repay = loan_pool * np.random.uniform(0.0015, 0.004)

        # ── News impact + sentiment ──
        news_headline = None
        news_type = "neutral"
        news_weight = 0.0

        news_interval = random.randint(5, 10)
        if i > 0 and i % news_interval == 0:
            if is_crisis and crisis_headlines:
                # Use real crisis headlines
                headline_data = random.choice(crisis_headlines)
                if isinstance(headline_data, str):
                    news_headline = headline_data
                    sentiment -= random.uniform(0.08, 0.18) * severity
                    news_type = "negative"
                    news_weight = severity
            elif is_pre_crisis:
                ev = random.choice(REAL_NEWS_NEGATIVE if random.random() < 0.6 else REAL_NEWS_NEUTRAL)
                news_headline = ev["headline"]
                sentiment += ev["base"] * ev["weight"]
                news_type = "negative" if ev["base"] < 0 else "neutral"
                news_weight = ev["weight"]
            elif vix > 25:  # elevated stress
                ev = random.choice(REAL_NEWS_NEGATIVE if random.random() < 0.5 else REAL_NEWS_POSITIVE)
                news_headline = ev["headline"]
                sentiment += ev["base"] * ev["weight"]
                news_type = "negative" if ev["base"] < 0 else "positive"
                news_weight = ev["weight"]
            else:
                pool = REAL_NEWS_POSITIVE + REAL_NEWS_NEGATIVE + REAL_NEWS_NEUTRAL
                ev = random.choice(pool)
                news_headline = ev["headline"]
                sentiment += ev["base"] * ev["weight"]
                news_type = "positive" if ev["base"] > 0 else ("negative" if ev["base"] < 0 else "neutral")
                news_weight = ev["weight"]
        else:
            sentiment *= 0.85  # decay

        # Apply sentiment to flows
        dep_mult  = max(0.4, 1.0 + sentiment)
        with_mult = max(0.4, 1.0 - sentiment)
        daily_in  *= dep_mult
        daily_out *= with_mult

        # ── Update pools ──
        deposit_pool += (daily_in - daily_out)
        deposit_pool = max(deposit_pool, 1000)
        loan_pool += (daily_l_given - daily_l_repay)
        loan_pool = max(loan_pool, 1000)

        # ── HQLA dynamics ──
        net_cash = (daily_in + daily_l_repay) - (daily_out + daily_l_given)
        if net_cash < 0:
            haircut = np.random.uniform(0.05, 0.15) if is_crisis else np.random.uniform(0.0, 0.03)
            hqla += net_cash * (1.0 + haircut)
        else:
            hqla += net_cash

        target_hqla = deposit_pool * 0.20
        hqla += (target_hqla - hqla) * 0.05 + hqla * np.random.normal(0, 0.001)

        cumulative_net += net_cash
        nlp = 20_000_000.0 + cumulative_net  # base + cumulative

        # ── Compute ratios ──
        expected_outflow = max(deposit_pool * 0.10, 100)
        lcr = min(hqla / expected_outflow, 5.0)
        hqla_ratio = hqla / max(deposit_pool, 1)
        loans_net = daily_l_given - daily_l_repay
        ldr = loan_pool / max(deposit_pool, 1)
        crisis_val = 1.0 if is_crisis else (0.5 if is_pre_crisis else 0.0)

        # Interest rate
        interest_rate = repo_rate + np.random.uniform(1.5, 2.5)
        market_rate = repo_rate + np.random.uniform(-0.5, 0.5)

        # ── Compute NSFR (simplified) ──
        asf = deposit_pool * 1.05 + capital
        rsf = loan_pool * 0.85 + (deposit_pool - hqla) * 0.05
        nsfr = asf / max(rsf, 1)

        # ── Features for LSTM (7 features) ──
        features.append([repo_rate, sentiment, loans_net / max(deposit_pool, 1), crisis_val, lcr, hqla_ratio, ldr])
        lcr_values.append(lcr)

        # ── Record ──
        records.append({
            "Date": date.strftime("%Y-%m-%d"),
            "Repo_Rate": round(repo_rate, 6),
            "Interest_Rate": round(interest_rate, 6),
            "Market_Rate": round(market_rate, 6),
            "VIX": round(vix, 2),
            "Treasury_10Y": round(treasury_10y, 4),
            "HY_Spread": round(hy_spread, 4),
            "Deposits": round(daily_in, 2),
            "Withdrawals": round(daily_out, 2),
            "Loans_Given": round(daily_l_given, 2),
            "Loan_Repayment": round(daily_l_repay, 2),
            "HQLA": round(hqla, 2),
            "ASF": round(asf, 2),
            "RSF": round(rsf, 2),
            "Total_Deposits_Pool": round(deposit_pool, 2),
            "Total_Loans_Pool": round(loan_pool, 2),
            "LCR": round(lcr * 100, 4),
            "NSFR": round(nsfr * 100, 4),
            "Net_Cash_Flow": round(net_cash, 2),
            "Cumulative_Net_Cash_Flow": round(cumulative_net, 2),
            "NLP": round(nlp, 2),
            "Crisis_Phase": "crisis" if is_crisis else ("pre_crisis" if is_pre_crisis else "normal"),
            "Crisis_Name": crisis_name or "",
            "VIX_Stress": round(vix_stress, 4),
            "Sentiment": round(sentiment, 6),
            "News_Headline": news_headline or "",
            "News_Type": news_type,
            "News_Weight": round(news_weight, 2),
        })

    # ── Compute survival labels ──
    features_arr = np.array(features, dtype=np.float32)
    lcr_arr = np.array(lcr_values, dtype=np.float32)

    labels = np.full(n_days, 365.0, dtype=np.float32)
    for i in range(n_days):
        if lcr_arr[i] < 1.0:
            labels[i] = 0.0
        else:
            for j in range(i + 1, min(i + 366, n_days)):
                if lcr_arr[j] < 1.0:
                    labels[i] = float(j - i)
                    break

    # Stats
    crisis_days = sum(1 for l in labels if l == 0)
    short_surv = sum(1 for l in labels if 0 < l < 100)
    safe_days = sum(1 for l in labels if l >= 365)
    total_crisis_phase = sum(1 for r in records if r["Crisis_Phase"] == "crisis")
    total_pre_crisis = sum(1 for r in records if r["Crisis_Phase"] == "pre_crisis")

    print(f"\n[Data] Dataset Statistics:")
    print(f"  Total days: {n_days}")
    print(f"  Crisis days: {total_crisis_phase}")
    print(f"  Pre-crisis days: {total_pre_crisis}")
    print(f"  Normal days: {n_days - total_crisis_phase - total_pre_crisis}")
    print(f"  Label: LCR<1 (failed): {crisis_days}")
    print(f"  Label: survival<100d: {short_surv}")
    print(f"  Label: safe (365d): {safe_days}")

    # Save CSV
    df = pd.DataFrame(records)
    csv_path = os.path.join(SAVE_DIR, "bank_liquidity_realistic.csv")
    df.to_csv(csv_path, index=False)
    print(f"\n[Data] Saved CSV → {csv_path} ({len(df)} rows)")

    return features_arr, labels


def train_lstm_on_realistic_data(features, labels, seq_len=30, epochs=1500, lr=0.003):
    """Train the LSTM survival model on the realistic dataset."""
    import torch
    import torch.nn as nn

    DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\n[Train] Device: {DEVICE}", end="")
    if DEVICE.type == "cuda":
        print(f" — {torch.cuda.get_device_name(0)}")
    else:
        print()

    # Import model class
    sys.path.insert(0, SAVE_DIR)
    from train_model import SurvivalLSTM

    n = len(features)

    # Feature normalization
    f_min = features.min(axis=0)
    f_max = features.max(axis=0)
    rng = f_max - f_min
    rng[rng == 0] = 1.0
    X_norm = (features - f_min) / rng
    Y_norm = labels / 365.0

    # Build sequences
    sequences, targets = [], []
    crisis_sequences, crisis_targets = [], []

    for i in range(n - seq_len):
        seq = X_norm[i:i+seq_len]
        target = Y_norm[i + seq_len]
        sequences.append(seq)
        targets.append(target)
        if target < 0.85:
            crisis_sequences.append(seq)
            crisis_targets.append(target)

    print(f"[Train] Normal samples: {len(sequences)}, Crisis-adjacent: {len(crisis_sequences)}")

    # Oversample crisis data 8x
    for _ in range(8):
        sequences.extend(crisis_sequences)
        targets.extend(crisis_targets)

    combined = list(zip(sequences, targets))
    random.shuffle(combined)
    sequences, targets = zip(*combined)

    X_t = torch.tensor(np.array(sequences), dtype=torch.float32).to(DEVICE)
    Y_t = torch.tensor(np.array(targets), dtype=torch.float32).unsqueeze(1).to(DEVICE)

    model = SurvivalLSTM(input_size=features.shape[1]).to(DEVICE)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
    criterion = nn.SmoothL1Loss()

    print(f"[Train] {len(X_t)} total sequences, {epochs} epochs")
    print(f"[Train] {'='*60}")

    t0 = time.time()
    best_loss = float("inf")

    model.train()
    for epoch in range(epochs):
        optimizer.zero_grad()
        pred = model(X_t)
        loss = criterion(pred, Y_t)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        scheduler.step()

        cl = loss.item()
        if cl < best_loss:
            best_loss = cl
        if (epoch + 1) % 100 == 0:
            elapsed = time.time() - t0
            print(f"   Epoch {epoch+1:>5}/{epochs}  Loss: {cl:.6f}  Best: {best_loss:.6f}  [{elapsed:.1f}s]")

    total_time = time.time() - t0
    print(f"[Train] {'='*60}")
    print(f"[Train] Done in {total_time:.1f}s  Final loss: {loss.item():.6f}")

    # Save
    model.eval()
    model_path = os.path.join(SAVE_DIR, "survival_lstm.pt")
    torch.save(model.state_dict(), model_path)
    print(f"[Train] Model saved → {model_path}")

    norm_path = os.path.join(SAVE_DIR, "feature_normalization.npz")
    np.savez(norm_path, f_min=f_min, f_max=f_max)
    print(f"[Train] Normalization saved → {norm_path}")

    # Sanity check
    with torch.no_grad():
        test_seq = torch.tensor(X_norm[-30:], dtype=torch.float32).unsqueeze(0).to(DEVICE)
        pred_days = model(test_seq).item() * 365.0
        print(f"\n[Train] Sanity: last window → {pred_days:.1f}d (label: {labels[-1]:.0f}d)")

    print(f"\n[Train] ✓ Done! Model trained on REAL macro data + crisis periods.")


if __name__ == "__main__":
    print("=" * 70)
    print("  Realistic Bank Liquidity Dataset Builder")
    print("  Sources: FRED (Fed Funds, VIX, Treasury, HY Spreads, Bank Deposits)")
    print("  Period: 2019-01-02 to 2024-12-31 (~5 years)")
    print("=" * 70)

    # Step 1: Download FRED data
    macro_df = download_fred_data()

    # Step 2: Generate calibrated bank-level dataset
    features, labels = generate_realistic_dataset(macro_df)

    # Step 3: Train LSTM
    train_lstm_on_realistic_data(features, labels, epochs=1500, lr=0.003)

    print("\n✓ All done! Files created:")
    print("  • bank_liquidity_realistic.csv  — 5-year dataset with real macro data")
    print("  • survival_lstm.pt              — trained LSTM model")
    print("  • feature_normalization.npz     — normalization params")
