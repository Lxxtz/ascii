import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, ComposedChart
} from 'recharts';
import { Play, Pause, AlertTriangle, RefreshCw, Rss, Shield, Check, X, Zap, TrendingDown, Activity, Mail, Settings } from 'lucide-react';
import './index.css';

// ─── Solution catalog (synced with backend SOLUTIONS) ───
const SOLUTION_CATALOG = {
  inject_hqla: { title: "Emergency HQLA Injection", short: "Inject $5M HQLA" },
  reduce_lending: { title: "Freeze New Loan Issuance", short: "Freeze Lending" },
  emergency_credit: { title: "Activate Emergency Credit Line", short: "Credit Line $10M" },
  raise_deposit_rates: { title: "Raise Deposit Rates (+50bp)", short: "Raise Rates" },
  sell_loan_portfolio: { title: "Sell Loan Portfolio ($8M)", short: "Sell Loans $8M" },
};

function App() {
  const [data, setData] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const [isCrisis, setIsCrisis] = useState(false);

  // Notifications & Solutions state
  const [notifications, setNotifications] = useState([]);
  const [activeSolutions, setActiveSolutions] = useState([]);
  const [successToasts, setSuccessToasts] = useState([]);
  const [appliedSolutionIds, setAppliedSolutionIds] = useState(new Set());
  const notifIdCounter = useRef(0);

  // Email alert state
  const [emailPanelOpen, setEmailPanelOpen] = useState(false);
  const [emailConfig, setEmailConfig] = useState({ sender_email: '', sender_password: '', recipient_email: '' });
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState(null);
  const [emailAlertsFired, setEmailAlertsFired] = useState([]);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState(null);

  // Fetch email status on mount
  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/email/status')
      .then(r => r.json())
      .then(d => { setEmailConfigured(d.is_configured); setEmailRecipient(d.recipient); })
      .catch(() => {});
  }, []);

  const saveEmailConfig = async () => {
    setEmailSaving(true);
    setEmailError(null);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/email/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailConfig),
      });
      const result = await res.json();
      if (result.status === 'configured') {
        setEmailConfigured(true);
        setEmailRecipient(result.recipient);
        setEmailPanelOpen(false);
      }
    } catch (err) {
      setEmailError('Failed to configure email. Check backend.');
    }
    setEmailSaving(false);
  };

  const resetSimulation = async () => {
    setIsRunning(false);
    try {
      await fetch('http://127.0.0.1:8000/api/start', { method: 'POST' });
      setData([]);
      setHasFailed(false);
      setIsCrisis(false);
      setNotifications([]);
      setActiveSolutions([]);
      setSuccessToasts([]);
      setAppliedSolutionIds(new Set());
    } catch (error) {
      console.error("Reset error:", error);
    }
  };

  const triggerCrisis = async () => {
    try {
      await fetch('http://127.0.0.1:8000/api/trigger-crisis', { method: 'POST' });
      setIsCrisis(true);
    } catch (error) {
      console.error("Crisis trigger error:", error);
    }
  };

  // ── Apply a solution ──
  const applySolution = useCallback(async (solutionId, notifUid) => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/apply-solution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solution_id: solutionId }),
      });
      const result = await res.json();

      if (result.success) {
        setAppliedSolutionIds(prev => new Set([...prev, solutionId]));
        setActiveSolutions(result.active_solutions || []);

        // Show success toast
        const toastId = `toast-${Date.now()}`;
        const title = SOLUTION_CATALOG[solutionId]?.title || solutionId;
        setSuccessToasts(prev => [...prev, { id: toastId, message: `Applied: ${title}` }]);
        setTimeout(() => {
          setSuccessToasts(prev => prev.map(t => t.id === toastId ? { ...t, exiting: true } : t));
          setTimeout(() => setSuccessToasts(prev => prev.filter(t => t.id !== toastId)), 350);
        }, 3000);

        // Remove the solution from the notification that triggered it
        setNotifications(prev => prev.map(n => {
          if (n.uid === notifUid) {
            return { ...n, solutions: n.solutions.filter(s => s !== solutionId) };
          }
          return n;
        }));
      }
    } catch (error) {
      console.error("Apply solution error:", error);
    }
  }, []);

  // ── Dismiss a notification ──
  const dismissNotification = useCallback((uid) => {
    setNotifications(prev => prev.map(n =>
      n.uid === uid ? { ...n, exiting: true } : n
    ));
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.uid !== uid));
    }, 350);
  }, []);

  // ── Auto-dismiss notifications after 30s ──
  useEffect(() => {
    const timers = notifications
      .filter(n => !n.exiting && !n.timerSet)
      .map(n => {
        n.timerSet = true;
        return setTimeout(() => dismissNotification(n.uid), 30000);
      });
    return () => timers.forEach(clearTimeout);
  }, [notifications, dismissNotification]);

  // ── Main simulation loop ──
  useEffect(() => {
    let interval = null;
    if (isRunning && !hasFailed) {
      interval = setInterval(async () => {
        try {
          const response = await fetch('http://127.0.0.1:8000/api/step');
          const result = await response.json();
          setData(prev => [...prev, result.record]);

          // Track email alerts fired
          if (result.email_alerts && result.email_alerts.alerts_fired && result.email_alerts.alerts_fired.length > 0) {
            setEmailAlertsFired(prev => [...prev, ...result.email_alerts.alerts_fired.map(a => ({ type: a, date: result.record.Date }))]);
          }

          // Update active solutions
          if (result.active_solutions) {
            setActiveSolutions(result.active_solutions);
          }

          // Process alerts into notifications
          if (result.alerts && result.alerts.length > 0) {
            const newNotifs = result.alerts.map(alert => ({
              ...alert,
              uid: `notif-${notifIdCounter.current++}`,
              exiting: false,
              timerSet: false,
              // Filter out already-applied solutions on the frontend side too
              solutions: alert.solutions.filter(s => !appliedSolutionIds.has(s)),
            })).filter(n => n.solutions.length > 0); // Only show if there are actionable solutions

            if (newNotifs.length > 0) {
              setNotifications(prev => {
                // Cap at 5 notifications max
                const combined = [...prev, ...newNotifs];
                return combined.slice(-5);
              });
            }
          }

          if (result.has_failed) {
            setHasFailed(true);
            setIsRunning(false);
          }
        } catch (error) {
          console.error("Polling error:", error);
          setIsRunning(false);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, hasFailed, appliedSolutionIds]);

  const current = data.length > 0 ? data[data.length - 1] : null;
  const hasCounterfactual = data.some(d => d.Counterfactual_LCR != null);

  const formatSurvival = (val) => {
    if (val == null) return '—';
    if (val >= 365) return '> 365d';
    if (val <= 0) return '0d';
    return `${val}d`;
  };

  const getNewsWeight = (w) => {
    if (w >= 2.5) return 'Critical';
    if (w >= 1.5) return 'High';
    if (w >= 1.0) return 'Medium';
    if (w > 0) return 'Low';
    return 'None';
  };

  const getSeverityIcon = (severity) => {
    if (severity === 'critical') return <AlertTriangle size={18} />;
    return <TrendingDown size={18} />;
  };

  return (
    <div className="dashboard-container">
      <header className="header">
        <h1>Liquidity Risk Monitor</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="run-btn"
            style={{ backgroundColor: isRunning ? '#4b5563' : '' }}
            onClick={() => setIsRunning(!isRunning)}
            disabled={hasFailed}
          >
            {isRunning ? <Pause size={16} /> : <Play size={16} />}
            {isRunning ? 'Pause' : 'Start'}
          </button>
          <button
            className="run-btn"
            style={{ backgroundColor: 'transparent', color: '#94a3b8', border: '1px solid #334155' }}
            onClick={resetSimulation}
          >
            <RefreshCw size={16} /> Reset
          </button>
          <button
            className="run-btn"
            style={{ backgroundColor: '#dc2626' }}
            onClick={triggerCrisis}
            disabled={isCrisis || hasFailed}
          >
            <AlertTriangle size={16} />
            Trigger Crisis
          </button>
          <button
            className="run-btn"
            style={{
              backgroundColor: emailConfigured ? '#166534' : 'transparent',
              color: emailConfigured ? '#fff' : '#94a3b8',
              border: emailConfigured ? 'none' : '1px solid #334155',
              position: 'relative',
            }}
            onClick={() => setEmailPanelOpen(!emailPanelOpen)}
            title={emailConfigured ? `Email alerts active → ${emailRecipient}` : 'Configure email alerts'}
          >
            <Mail size={16} />
            {emailConfigured ? 'Alerts On' : 'Email'}
            {emailConfigured && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                width: 10, height: 10, borderRadius: '50%',
                backgroundColor: '#22c55e',
                border: '2px solid #0f172a',
              }} />
            )}
          </button>
        </div>
      </header>

      {/* ═══ Email Config Panel ═══ */}
      {emailPanelOpen && (
        <div className="email-config-panel">
          <div className="email-config-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={16} />
              <strong>Email Crisis Alerts</strong>
              {emailConfigured && (
                <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4, backgroundColor: 'rgba(34,197,94,0.15)', color: '#22c55e', fontWeight: 600 }}>ACTIVE</span>
              )}
            </div>
            <button className="dismiss-btn" onClick={() => setEmailPanelOpen(false)} style={{ border: 'none', padding: '0.25rem' }}>
              <X size={14} />
            </button>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.5rem 0 1rem' }}>
            Sends automated Gmail alerts when <strong>LCR drops below 100%</strong> or <strong>predicted survival falls below 30 days</strong>.
            Uses Gmail App Password (enable 2FA → generate at <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" style={{ color: '#3b82f6' }}>Google App Passwords</a>).
          </p>
          <div className="email-fields">
            <div className="email-field">
              <label>Sender Gmail</label>
              <input
                type="email"
                placeholder="yourname@gmail.com"
                value={emailConfig.sender_email}
                onChange={e => setEmailConfig(prev => ({ ...prev, sender_email: e.target.value }))}
              />
            </div>
            <div className="email-field">
              <label>App Password</label>
              <input
                type="password"
                placeholder="xxxx xxxx xxxx xxxx"
                value={emailConfig.sender_password}
                onChange={e => setEmailConfig(prev => ({ ...prev, sender_password: e.target.value }))}
              />
            </div>
            <div className="email-field">
              <label>Recipient Email</label>
              <input
                type="email"
                placeholder="recipient@example.com"
                value={emailConfig.recipient_email}
                onChange={e => setEmailConfig(prev => ({ ...prev, recipient_email: e.target.value }))}
              />
            </div>
            <button
              className="run-btn"
              style={{ alignSelf: 'flex-end', padding: '0.5rem 1.25rem' }}
              onClick={saveEmailConfig}
              disabled={emailSaving || !emailConfig.sender_email || !emailConfig.sender_password || !emailConfig.recipient_email}
            >
              {emailSaving ? 'Saving…' : emailConfigured ? 'Update' : 'Activate'}
            </button>
          </div>
          {emailError && <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.5rem' }}>{emailError}</p>}
          {emailAlertsFired.length > 0 && (
            <div style={{ marginTop: '1rem', borderTop: '1px solid #1e293b', paddingTop: '0.75rem' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '0.5rem' }}>Emails Sent</div>
              {emailAlertsFired.slice(-5).map((a, i) => (
                <div key={i} style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <Mail size={12} style={{ marginTop: 2, color: '#22c55e' }} />
                  <span>{a.type === 'lcr_below_100' ? 'LCR below 100%' : 'Survival below 30 days'} — {a.date}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {data.length === 0 ? (
        <div className="no-data">
          <h3>Simulation Idle</h3>
          <p>Press Start to begin real-time liquidity simulation.</p>
        </div>
      ) : (
        <main>
          {/* Active Solutions Bar */}
          {activeSolutions.length > 0 && (
            <div className="active-solutions-bar">
              <div className="active-solutions-label">
                <Shield size={14} />
                Active Interventions
              </div>
              {activeSolutions.map((sol) => (
                <div key={sol.id} className="active-solution-badge">
                  <Zap size={12} />
                  {sol.title}
                  {sol.remaining > 0 && (
                    <span className="days">{sol.remaining}d left</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* News Banner */}
          {current?.News_Headline && (
            <div className="metric-card" style={{
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              borderLeft: `3px solid ${current.News_Type === 'positive' ? '#22c55e' : current.News_Type === 'negative' ? '#ef4444' : '#6b7280'}`
            }}>
              <Rss size={20} color={current.News_Type === 'positive' ? '#22c55e' : current.News_Type === 'negative' ? '#ef4444' : '#6b7280'} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.7rem', color: '#8892a8', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '0.15rem' }}>
                  Market Intelligence — {current.News_Type}
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                  {current.News_Headline}
                </div>
              </div>
              <div style={{
                padding: '0.25rem 0.6rem',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: '0.05em',
                backgroundColor: current.News_Weight >= 2.5 ? 'rgba(239,68,68,0.15)' : current.News_Weight >= 1.5 ? 'rgba(245,158,11,0.15)' : 'rgba(100,116,139,0.15)',
                color: current.News_Weight >= 2.5 ? '#ef4444' : current.News_Weight >= 1.5 ? '#f59e0b' : '#64748b',
              }}>
                {getNewsWeight(current.News_Weight)} Impact
              </div>
            </div>
          )}

          {/* Metrics */}
          <div className="metrics-grid">
            <div className={`metric-card ${hasFailed ? 'danger' : 'success'}`}>
              <div className="metric-title">Status</div>
              <div className="metric-value" style={{ color: hasFailed ? '#ef4444' : '#22c55e', fontSize: '1.1rem' }}>
                {hasFailed ? 'INSOLVENT' : 'SOLVENT'}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-title">Date</div>
              <div className="metric-value" style={{ fontSize: '1.1rem' }}>{current?.Date}</div>
            </div>
            <div className="metric-card">
              <div className="metric-title">LCR</div>
              <div className="metric-value" style={{ color: current?.LCR < 100 ? '#ef4444' : '#22c55e' }}>{current?.LCR}%</div>
            </div>
            <div className="metric-card">
              <div className="metric-title">Net Liquidity</div>
              <div className="metric-value" style={{ fontSize: '1.1rem' }}>${current?.NLP?.toLocaleString('en-US')}</div>
            </div>
            <div className="metric-card">
              <div className="metric-title">Loan-to-Deposit</div>
              <div className="metric-value">{current?.LDR}%</div>
            </div>
            <div className={`metric-card ${current?.LSTM_Survival != null && current.LSTM_Survival < 30 ? 'danger' : ''}`}>
              <div className="metric-title">LSTM Forecast</div>
              <div className="metric-value" style={{ fontSize: '1.1rem' }}>{formatSurvival(current?.LSTM_Survival)}</div>
            </div>
            <div className={`metric-card ${current?.Prophet_Survival != null && current.Prophet_Survival < 30 ? 'danger' : ''}`}>
              <div className="metric-title">Prophet Forecast</div>
              <div className="metric-value" style={{ fontSize: '1.1rem', color: '#14b8a6' }}>{formatSurvival(current?.Prophet_Survival)}</div>
            </div>
          </div>

          {/* Funding Liquidity */}
          <div className="section-header">
            <div className="risk-dimension-tag">Funding Liquidity · Intraday – 30 Days</div>
          </div>

          <div className="charts-grid">
            <div className="chart-card">
              <h2 className="chart-title">Daily Cash Flows</h2>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="Date" tick={{ fontSize: 11, fill: '#5a6580' }} minTickGap={40} />
                  <YAxis domain={['auto', 'auto']} tickFormatter={(t) => `$${(t/1e6).toFixed(1)}M`} tick={{ fill: '#5a6580' }} />
                  <Tooltip formatter={(v) => v ? `$${v.toLocaleString('en-US')}` : null} contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3042', borderRadius: 8 }} />
                  <Legend />
                  <Line isAnimationActive={false} type="monotone" dataKey="Daily_Deposits" stroke="#22c55e" dot={false} strokeWidth={1.5} name="Deposits" />
                  <Line isAnimationActive={false} type="monotone" dataKey="Daily_Withdrawals" stroke="#ef4444" dot={false} strokeWidth={1.5} name="Withdrawals" />
                </LineChart>
              </ResponsiveContainer>
              <div className="analysis-box">
                <strong>Interpretation:</strong> Tracks inbound deposit flows versus outbound withdrawals. Under stable conditions, deposits marginally exceed withdrawals. During crisis, withdrawals escalate exponentially while deposits collapse.
              </div>
            </div>

            <div className="chart-card">
              <h2 className="chart-title">Lending Activity</h2>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="Date" tick={{ fontSize: 11, fill: '#5a6580' }} minTickGap={40} />
                  <YAxis domain={['auto', 'auto']} tickFormatter={(t) => `$${(t/1e6).toFixed(1)}M`} tick={{ fill: '#5a6580' }} />
                  <Tooltip formatter={(v) => v ? `$${v.toLocaleString('en-US')}` : null} contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3042', borderRadius: 8 }} />
                  <Legend />
                  <Line isAnimationActive={false} type="monotone" dataKey="Daily_Loans_Given" stroke="#f97316" dot={false} strokeWidth={1.5} name="Loans Issued" />
                  <Line isAnimationActive={false} type="monotone" dataKey="Daily_Loans_Repaid" stroke="#a78bfa" dot={false} strokeWidth={1.5} name="Repayments" />
                </LineChart>
              </ResponsiveContainer>
              <div className="analysis-box">
                <strong>Interpretation:</strong> Monitors the loan book. Under normal conditions, the bank issues new loans while collecting repayments. During crisis, loan issuance halts as the bank conserves liquidity.
              </div>
            </div>

            {/* Market Liquidity */}
            <div className="section-header full-width-chart">
              <div className="risk-dimension-tag">Market Liquidity · Intraday – 7 Days</div>
            </div>

            <div className="chart-card">
              <h2 className="chart-title">
                Regulatory Compliance (LCR & NSFR)
                {hasCounterfactual && (
                  <span style={{ fontSize: '0.7rem', color: '#ef4444', marginLeft: '0.75rem', fontWeight: 500, opacity: 0.8 }}>
                    ● Dotted = Without Intervention
                  </span>
                )}
              </h2>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="Date" tick={{ fontSize: 11, fill: '#5a6580' }} minTickGap={40} />
                  <YAxis yAxisId="left" domain={[0, 'auto']} tick={{ fill: '#5a6580' }} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 'auto']} tick={{ fill: '#5a6580' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3042', borderRadius: 8 }} />
                  <Legend />
                  <ReferenceLine yAxisId="left" y={100} stroke="#ef4444" strokeDasharray="5 5" strokeOpacity={0.6} label={{ value: "100% Min", fill: '#ef4444', fontSize: 11 }} />
                  <Line yAxisId="left" isAnimationActive={false} type="monotone" dataKey="LCR" stroke="#3b82f6" dot={false} strokeWidth={1.5} name="LCR %" />
                  <Line yAxisId="right" isAnimationActive={false} type="monotone" dataKey="NSFR" stroke="#14b8a6" dot={false} strokeWidth={1.5} name="NSFR %" />
                  {/* Counterfactual LCR — dotted */}
                  {hasCounterfactual && (
                    <Line
                      yAxisId="left"
                      isAnimationActive={false}
                      type="monotone"
                      dataKey="Counterfactual_LCR"
                      stroke="#ef4444"
                      dot={false}
                      strokeWidth={1.5}
                      strokeDasharray="6 4"
                      strokeOpacity={0.55}
                      name="LCR % (No Intervention)"
                      connectNulls
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
              <div className="analysis-box">
                <strong>Interpretation:</strong> LCR measures 30-day survival capacity against the Basel III 100% minimum. NSFR measures structural funding stability. Crisis events rapidly deflate LCR as HQLA buffers are liquidated under fire-sale haircuts.
                {hasCounterfactual && (
                  <span style={{ color: '#ef4444' }}> The <strong>dotted red line</strong> shows the counterfactual LCR trajectory without any applied interventions.</span>
                )}
              </div>
            </div>

            <div className="chart-card">
              <h2 className="chart-title">
                Net Liquidity Position & HQLA Buffer
                {hasCounterfactual && (
                  <span style={{ fontSize: '0.7rem', color: '#ef4444', marginLeft: '0.75rem', fontWeight: 500, opacity: 0.8 }}>
                    ● Dotted = Without Intervention
                  </span>
                )}
              </h2>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="Date" tick={{ fontSize: 11, fill: '#5a6580' }} minTickGap={40} />
                  <YAxis domain={['auto', 'auto']} tickFormatter={(t) => `$${(t/1e6).toFixed(1)}M`} tick={{ fill: '#5a6580' }} />
                  <Tooltip formatter={(v) => v ? `$${v.toLocaleString('en-US')}` : null} contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3042', borderRadius: 8 }} />
                  <Legend />
                  <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="5 5" strokeOpacity={0.6} label={{ value: "Insolvency", fill: '#ef4444', fontSize: 11 }} />
                  <Line isAnimationActive={false} type="monotone" dataKey="NLP" stroke="#ef4444" dot={false} strokeWidth={1.5} name="Net Liquidity" />
                  <Line isAnimationActive={false} type="monotone" dataKey="HQLA" stroke="#22c55e" dot={false} strokeWidth={1.5} name="HQLA Buffer" />
                  {/* Counterfactual NLP — dotted */}
                  {hasCounterfactual && (
                    <Line
                      isAnimationActive={false}
                      type="monotone"
                      dataKey="Counterfactual_NLP"
                      stroke="#f97316"
                      dot={false}
                      strokeWidth={1.5}
                      strokeDasharray="6 4"
                      strokeOpacity={0.55}
                      name="NLP (No Intervention)"
                      connectNulls
                    />
                  )}
                  {/* Counterfactual HQLA — dotted */}
                  {hasCounterfactual && (
                    <Line
                      isAnimationActive={false}
                      type="monotone"
                      dataKey="Counterfactual_HQLA"
                      stroke="#86efac"
                      dot={false}
                      strokeWidth={1.5}
                      strokeDasharray="6 4"
                      strokeOpacity={0.45}
                      name="HQLA (No Intervention)"
                      connectNulls
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
              <div className="analysis-box">
                <strong>Interpretation:</strong> HQLA represents unencumbered liquid assets. As withdrawals outpace deposits, the bank liquidates HQLA to cover shortfalls. NLP crossing zero triggers insolvency.
                {hasCounterfactual && (
                  <span style={{ color: '#f97316' }}> <strong>Dotted lines</strong> show the counterfactual trajectory — what would have happened without your interventions.</span>
                )}
              </div>
            </div>

            {/* Structural Liquidity */}
            <div className="section-header full-width-chart">
              <div className="risk-dimension-tag">Structural Liquidity · 1 Month – 1 Year · LSTM + Prophet Ensemble</div>
            </div>

            <div className="chart-card full-width-chart">
              <h2 className="chart-title">Forecasted Survival Horizon (Days Until LCR Breach)</h2>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="Date" tick={{ fontSize: 11, fill: '#5a6580' }} minTickGap={40} />
                  <YAxis domain={[0, 365]} tick={{ fill: '#5a6580' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid #2a3042', borderRadius: 8 }} />
                  <Legend />
                  <ReferenceLine y={30} stroke="#f59e0b" strokeDasharray="5 5" strokeOpacity={0.6} label={{ value: "Critical (30d)", fill: '#f59e0b', fontSize: 11 }} />
                  <ReferenceLine y={100} stroke="#3b82f6" strokeDasharray="5 5" strokeOpacity={0.3} label={{ value: "Warning (100d)", fill: '#3b82f6', fontSize: 11 }} />
                  <Line isAnimationActive={false} type="monotone" dataKey="LSTM_Survival" stroke="#a78bfa" dot={false} strokeWidth={2} name="LSTM Forecast" connectNulls />
                  <Line isAnimationActive={false} type="stepAfter" dataKey="Prophet_Survival" stroke="#14b8a6" dot={false} strokeWidth={2} name="Prophet Forecast" connectNulls />
                  <Line isAnimationActive={false} type="stepAfter" dataKey="Prophet_Lower" stroke="#14b8a6" dot={false} strokeWidth={1} strokeDasharray="4 4" strokeOpacity={0.4} name="Prophet Lower Bound" connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="analysis-box">
                <strong>Interpretation:</strong> Two independent models forecast when the bank's LCR will breach the 100% Basel III minimum.
                <strong> LSTM</strong> (purple): A 2-layer, 128-unit deep neural network pre-trained on 3 years of synthetic data with 5x oversampled crisis sequences and Huber loss.
                <strong> Prophet</strong> (teal): Facebook's time-series forecasting model that directly projects the LCR trend forward with changepoint detection.
                Both models agree during stable periods and should converge during crisis — divergence indicates model uncertainty.
              </div>
            </div>

          </div>
        </main>
      )}

      {/* ═══ Notification Toast Stack ═══ */}
      <div className="notification-container">
        {/* Success toasts */}
        {successToasts.map((toast) => (
          <div key={toast.id} className={`success-toast ${toast.exiting ? 'exiting' : ''}`}>
            <div className="success-toast-icon">
              <Check size={14} />
            </div>
            <div className="success-toast-text">{toast.message}</div>
          </div>
        ))}

        {/* Alert notifications with solutions */}
        {notifications.map((notif) => (
          <div
            key={notif.uid}
            className={`notification-card ${notif.severity} ${notif.exiting ? 'exiting' : ''}`}
            style={{ position: 'relative', overflow: 'hidden' }}
          >
            <div className="notification-header">
              <div className={`notification-icon ${notif.severity}`}>
                {getSeverityIcon(notif.severity)}
              </div>
              <div style={{ flex: 1 }}>
                <div className="notification-title">{notif.title}</div>
              </div>
              <button
                className="dismiss-btn"
                onClick={() => dismissNotification(notif.uid)}
                style={{ padding: '0.25rem', border: 'none', marginLeft: 0 }}
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>

            <div className="notification-description">
              {notif.description}
            </div>

            {notif.solutions && notif.solutions.length > 0 && (
              <div className="notification-actions">
                {notif.solutions.map((solId) => (
                  <button
                    key={solId}
                    className="solution-btn"
                    onClick={() => applySolution(solId, notif.uid)}
                    disabled={appliedSolutionIds.has(solId)}
                  >
                    <Activity size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '3px' }} />
                    {SOLUTION_CATALOG[solId]?.short || solId}
                  </button>
                ))}
              </div>
            )}

            {/* Timer bar */}
            <div
              className={`notification-timer ${notif.severity}`}
              style={{ animationDuration: '30s' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
