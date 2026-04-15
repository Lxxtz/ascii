"""
train_model.py — One-time LSTM Survival Model Training Script
═══════════════════════════════════════════════════════════════
Generates 5 years (1825 days) of synthetic bank liquidity data covering:
  • Normal market conditions with seasonal variation
  • Pre-crisis deterioration ramp-downs
  • 12 crisis windows of varying severity & duration
  • High-impact news events (positive + negative)
  • Recovery periods after crisis

Trains a 3-layer, 256-hidden LSTM with Huber loss and saves:
  • survival_lstm.pt          — model weights
  • feature_normalization.npz — feature min/max for inference normalization

Run once:  python train_model.py
"""

import numpy as np
import random
import time
import os
import torch
import torch.nn as nn

# ─── Reproducibility ────────────────────────────────────────────────
SEED = 42
np.random.seed(SEED)
random.seed(SEED)
torch.manual_seed(SEED)
if torch.cuda.is_available():
    torch.cuda.manual_seed_all(SEED)

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"[Train] Device: {DEVICE}", end="")
if DEVICE.type == "cuda":
    print(f" — {torch.cuda.get_device_name(0)}")
else:
    print()

SAVE_DIR = os.path.dirname(os.path.abspath(__file__))

# ─── News Events (same as production) ───────────────────────────────
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

# ─── LSTM Architecture (must match production) ──────────────────────
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


# ─── 5-Year Training Data Generator ─────────────────────────────────
def generate_5yr_training_data():
    """
    Generates 1825 days (5 years) of realistic bank liquidity data.
    
    Includes 12 crisis windows of varying severity, pre-crisis deterioration,
    post-crisis recovery phases, seasonal deposit variation, and news-driven
    sentiment shocks.
    """
    n_days = 1825
    
    deposit_pool = 100_000_000.0
    loan_pool    = 70_000_000.0
    hqla         = 20_000_000.0
    repo         = 5.0
    sentiment    = 0.0

    # 12 crisis windows spread across 5 years with varying severity
    # (start, end, severity_multiplier)
    crisis_windows = [
        # Year 1 — mild crisis + moderate crisis
        (80, 120, 1.0),
        (250, 330, 1.5),
        # Year 2 — sharp short crisis + prolonged slow burn
        (420, 460, 2.0),
        (550, 650, 1.2),
        # Year 3 — twin crises
        (750, 810, 1.8),
        (870, 920, 1.3),
        # Year 4 — severe GFC-style crisis + brief aftershock
        (1050, 1160, 2.5),
        (1200, 1230, 1.6),
        # Year 5 — moderate + severe terminal crisis
        (1380, 1430, 1.4),
        (1520, 1570, 1.7),
        (1650, 1740, 2.2),
        (1780, 1820, 2.0),
    ]
    
    # Pre-crisis deterioration windows (30-50 days before each crisis)
    pre_crisis_windows = []
    for s, e, sev in crisis_windows:
        pre_len = random.randint(25, 50)
        pre_crisis_windows.append((max(0, s - pre_len), s, sev))
    
    # Recovery windows (after each crisis, 20-40 days of slow recovery)
    recovery_windows = []
    for s, e, sev in crisis_windows:
        rec_len = random.randint(20, 40)
        recovery_windows.append((e, min(n_days - 1, e + rec_len), sev))

    features, lcr_values = [], []

    print(f"[Train] Generating {n_days} days of training data...")
    print(f"[Train] Crisis windows: {len(crisis_windows)}")
    print(f"[Train] Pre-crisis windows: {len(pre_crisis_windows)}")
    print(f"[Train] Recovery windows: {len(recovery_windows)}")

    for day in range(n_days):
        # ── Determine regime ──
        is_crisis = False
        crisis_severity = 1.0
        crisis_day_count = 0
        for s, e, sev in crisis_windows:
            if s <= day <= e:
                is_crisis = True
                crisis_severity = sev
                crisis_day_count = day - s + 1
                break
        
        is_pre_crisis = False
        pre_crisis_severity_pct = 0.0
        for s, e, sev in pre_crisis_windows:
            if s <= day <= e:
                is_pre_crisis = True
                pre_crisis_severity_pct = ((day - s + 1) / (e - s + 1)) * sev
                break
        
        is_recovery = False
        recovery_pct = 0.0
        for s, e, sev in recovery_windows:
            if s <= day <= e:
                is_recovery = True
                recovery_pct = (day - s + 1) / (e - s + 1)
                break

        # ── Seasonal deposit variation (quarterly cycles) ──
        seasonal = 1.0 + 0.02 * np.sin(2 * np.pi * day / 90)

        # ── Repo rate random walk ──
        repo += np.random.normal(0, 0.05)
        repo = max(0.5, min(15.0, repo))

        # ── Cash flows based on regime ──
        if is_crisis:
            daily_in = deposit_pool * np.random.uniform(0.0001, 0.001)
            escalation = min(1.0 + crisis_day_count * 0.04 * crisis_severity, 4.0 * crisis_severity)
            daily_out = deposit_pool * np.random.uniform(0.003, 0.008) * escalation
            daily_l_given = deposit_pool * np.random.uniform(0.0, 0.0005)
            daily_l_repay = loan_pool * np.random.uniform(0.0005, 0.0015)
        elif is_pre_crisis:
            daily_in  = deposit_pool * np.random.uniform(0.001, 0.004) * (1.0 - pre_crisis_severity_pct * 0.4)
            daily_out = deposit_pool * np.random.uniform(0.002, 0.006) * (1.0 + pre_crisis_severity_pct * 0.6)
            daily_l_given = deposit_pool * np.random.uniform(0.0005, 0.002)
            daily_l_repay = loan_pool * np.random.uniform(0.001, 0.003)
        elif is_recovery:
            # Slowly recovering — deposits coming back, withdrawals normalizing
            recovery_boost = recovery_pct * 0.3
            daily_in  = deposit_pool * np.random.uniform(0.003, 0.007) * (1.0 + recovery_boost)
            daily_out = deposit_pool * np.random.uniform(0.002, 0.005) * (1.0 - recovery_boost * 0.5)
            daily_l_given = deposit_pool * np.random.uniform(0.001, 0.002)
            daily_l_repay = loan_pool * np.random.uniform(0.002, 0.004)
        else:
            # Normal operations with seasonal variation
            daily_in_base  = deposit_pool * np.random.uniform(0.002, 0.006) * seasonal
            daily_out_base = deposit_pool * np.random.uniform(0.002, 0.0055) * seasonal
            daily_in  = max(0, daily_in_base + daily_in_base * np.random.uniform(-0.6, 0.8))
            daily_out = max(0, daily_out_base + daily_out_base * np.random.uniform(-0.6, 0.8))
            daily_l_given = deposit_pool * np.random.uniform(0.001, 0.003)
            daily_l_repay = loan_pool * np.random.uniform(0.0015, 0.004)

        # ── News impact (every 7-12 days for more coverage) ──
        news_interval = random.randint(7, 12)
        if day > 0 and day % news_interval == 0:
            # During crisis, bias toward negative news
            if is_crisis:
                neg_events = [e for e in NEWS_EVENTS if e["base"] < 0]
                ev = random.choice(neg_events if random.random() < 0.7 else NEWS_EVENTS)
            elif is_recovery:
                pos_events = [e for e in NEWS_EVENTS if e["base"] > 0]
                ev = random.choice(pos_events if random.random() < 0.6 else NEWS_EVENTS)
            else:
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
        crisis_val = 1.0 if is_crisis else (0.5 if is_pre_crisis else (0.25 if is_recovery else 0.0))
        ldr = loan_pool / max(deposit_pool, 1)

        features.append([repo, sentiment, loans_net / max(deposit_pool, 1), crisis_val, lcr, hqla_ratio, ldr])
        lcr_values.append(lcr)

    features_arr = np.array(features, dtype=np.float32)
    lcr_arr = np.array(lcr_values, dtype=np.float32)

    # ── Compute ground-truth survival labels ──
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
    print(f"[Train] Label distribution: crisis={crisis_days}, short(<100d)={short_surv}, safe(365d)={safe_days}")

    return features_arr, labels


# ─── Training Function ──────────────────────────────────────────────
def train_and_save(epochs=1500, lr=0.003, seq_len=30):
    """Train LSTM on 5-year data and save model + normalization params."""
    
    features, labels = generate_5yr_training_data()
    n = len(features)
    
    # Feature normalization
    f_min = features.min(axis=0)
    f_max = features.max(axis=0)
    rng = f_max - f_min
    rng[rng == 0] = 1.0
    X_norm = (features - f_min) / rng

    # Normalize labels to [0, 1]
    Y_norm = labels / 365.0

    # Build sequences
    sequences, targets = [], []
    crisis_sequences, crisis_targets = [], []

    for i in range(n - seq_len):
        seq = X_norm[i:i+seq_len]
        target = Y_norm[i + seq_len]
        sequences.append(seq)
        targets.append(target)
        if target < 0.85:  # survival < ~310 days → crisis-adjacent
            crisis_sequences.append(seq)
            crisis_targets.append(target)

    print(f"[Train] Normal samples: {len(sequences)}, Crisis-adjacent samples: {len(crisis_sequences)}")

    # Oversample crisis data 8x for balanced learning
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
    criterion = nn.SmoothL1Loss()  # Huber loss

    total_samples = len(X_t)
    print(f"[Train] Total sequences: {total_samples} ({len(crisis_sequences)} crisis × 8 oversampled)")
    print(f"[Train] Starting {epochs} epochs on {DEVICE}...")
    print(f"[Train] {'='*60}")
    
    t0 = time.time()
    best_loss = float('inf')

    model.train()
    for epoch in range(epochs):
        optimizer.zero_grad()
        pred = model(X_t)
        loss = criterion(pred, Y_t)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        scheduler.step()

        current_loss = loss.item()
        if current_loss < best_loss:
            best_loss = current_loss

        if (epoch + 1) % 100 == 0:
            elapsed = time.time() - t0
            lr_now = optimizer.param_groups[0]['lr']
            print(f"   Epoch {epoch+1:>5}/{epochs}  Loss: {current_loss:.6f}  Best: {best_loss:.6f}  LR: {lr_now:.6f}  [{elapsed:.1f}s]")

    total_time = time.time() - t0
    print(f"[Train] {'='*60}")
    print(f"[Train] Training complete in {total_time:.1f}s")
    print(f"[Train] Final loss: {loss.item():.6f}  Best loss: {best_loss:.6f}")

    # ── Save model ──
    model.eval()
    model_path = os.path.join(SAVE_DIR, "survival_lstm.pt")
    torch.save(model.state_dict(), model_path)
    print(f"[Train] Model saved → {model_path}")

    # ── Save normalization params ──
    norm_path = os.path.join(SAVE_DIR, "feature_normalization.npz")
    np.savez(norm_path, f_min=f_min, f_max=f_max)
    print(f"[Train] Normalization saved → {norm_path}")

    # ── Quick sanity check ──
    print(f"\n[Train] Sanity check:")
    with torch.no_grad():
        # Test on last 30-day window
        test_seq = torch.tensor(X_norm[-30:], dtype=torch.float32).unsqueeze(0).to(DEVICE)
        pred_norm = model(test_seq).item()
        pred_days = pred_norm * 365.0
        actual = labels[-1]
        print(f"   Last window prediction: {pred_days:.1f} days (actual label: {actual:.0f} days)")

    print(f"\n[Train] ✓ Done! You can now run the app without retraining.")
    print(f"[Train] Files: survival_lstm.pt, feature_normalization.npz")


if __name__ == "__main__":
    train_and_save(epochs=1500, lr=0.003, seq_len=30)
