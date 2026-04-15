import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, ComposedChart
} from 'recharts';
import { Play, Pause, AlertTriangle, RefreshCw, Rss, Shield, Check, X, Zap, TrendingDown, Activity, Bell, ChevronRight, ChevronLeft, Building, Droplet, BarChart2, Cpu, LineChart } from 'lucide-react';
import './index.css';

// ─── Solution catalog (synced with backend SOLUTIONS) ───
// duration > 0 means it can only be applied once (tracked globally)
const SOLUTION_CATALOG = {
  inject_hqla: { title: "Emergency HQLA Injection", short: "Inject $5M HQLA", icon: "💉", reusable: true },
  reduce_lending: { title: "Freeze New Loan Issuance", short: "Freeze Lending", icon: "🧊", reusable: false },
  emergency_credit: { title: "Activate Emergency Credit Line", short: "Credit Line $10M", icon: "🏦", reusable: true },
  raise_deposit_rates: { title: "Raise Deposit Rates (+50bp)", short: "Raise Rates +50bp", icon: "📈", reusable: false },
  sell_loan_portfolio: { title: "Sell Loan Portfolio ($8M)", short: "Sell Loans $8M", icon: "💰", reusable: true },
};

function App() {
  const [data, setData] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const [isCrisis, setIsCrisis] = useState(false);

  // Sidebar & notifications
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [activeSolutions, setActiveSolutions] = useState([]);
  const [successToasts, setSuccessToasts] = useState([]);
  const [appliedSolutionIds, setAppliedSolutionIds] = useState(new Set());
  const appliedRef = useRef(new Set()); // ref to avoid stale closure
  const notifIdCounter = useRef(0);
  const [unreadCount, setUnreadCount] = useState(0);

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
      appliedRef.current = new Set();
      setUnreadCount(0);
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
  const [applyingNow, setApplyingNow] = useState(new Set()); // debounce guard

  const applySolution = useCallback(async (solutionId, notifUid) => {
    // Prevent double-click, but allow re-application of reusable solutions
    if (applyingNow.has(`${solutionId}_${notifUid}`)) return;

    setApplyingNow(prev => new Set([...prev, `${solutionId}_${notifUid}`]));

    try {
      const res = await fetch('http://127.0.0.1:8000/api/apply-solution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solution_id: solutionId }),
      });
      const result = await res.json();

      if (result.success) {
        // Only permanently track non-reusable solutions
        const isReusable = SOLUTION_CATALOG[solutionId]?.reusable;
        if (!isReusable) {
          appliedRef.current.add(solutionId);
          setAppliedSolutionIds(prev => new Set([...prev, solutionId]));
        }
        setActiveSolutions(result.active_solutions || []);

        // Mark the notification's solution as applied (per-card tracking)
        setNotifications(prev => prev.map(n => {
          if (n.uid === notifUid) {
            return {
              ...n,
              appliedInThis: [...(n.appliedInThis || []), solutionId]
            };
          }
          return n;
        }));

        // Show success toast
        const toastId = `toast-${Date.now()}`;
        const title = SOLUTION_CATALOG[solutionId]?.title || solutionId;
        setSuccessToasts(prev => [...prev, { id: toastId, message: `✓ ${title}` }]);
        setTimeout(() => {
          setSuccessToasts(prev => prev.filter(t => t.id !== toastId));
        }, 4000);
      }
    } catch (error) {
      console.error("Apply solution error:", error);
    }
  }, [applyingNow]);

  // ── Dismiss a notification ──
  const dismissNotification = useCallback((uid) => {
    setNotifications(prev => prev.filter(n => n.uid !== uid));
  }, []);

  // ── Main simulation loop ──
  useEffect(() => {
    let interval = null;
    if (isRunning && !hasFailed) {
      interval = setInterval(async () => {
        try {
          const response = await fetch('http://127.0.0.1:8000/api/step');
          const result = await response.json();
          setData(prev => [...prev, result.record]);

          if (result.active_solutions) {
            setActiveSolutions(result.active_solutions);
          }

          // Process alerts into notifications
          if (result.alerts && result.alerts.length > 0) {
            const newNotifs = result.alerts
              .map(alert => ({
                ...alert,
                uid: `notif-${notifIdCounter.current++}`,
                timestamp: new Date().toLocaleTimeString(),
                appliedInThis: [],
                // Keep ALL solutions — don't filter by applied. Let UI show disabled state.
                solutions: alert.solutions,
              }))
              .filter(n => n.solutions.length > 0);

            if (newNotifs.length > 0) {
              setNotifications(prev => [...newNotifs, ...prev].slice(0, 30)); // newest first, cap at 30
              setUnreadCount(prev => prev + newNotifs.length);

              // Auto-open sidebar on critical alerts
              const hasCritical = newNotifs.some(n => n.severity === 'critical');
              if (hasCritical) {
                setSidebarOpen(true);
                setUnreadCount(0);
              }
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
  }, [isRunning, hasFailed]);

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

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
    if (!sidebarOpen) setUnreadCount(0);
  };

  return (
    <div className={`app-layout ${sidebarOpen ? 'sidebar-open' : ''}`}>
      {/* ═══ Main Content Area ═══ */}
      <div className="main-content">
        <div className="dashboard-container">
          <header className="header">
            <h1>Liquidity Risk Monitor</h1>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
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

              {/* Sidebar Toggle */}
              <button className="sidebar-toggle-btn" onClick={toggleSidebar} id="sidebar-toggle">
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>
            </div>
          </header>

          {data.length === 0 ? (
            <div className="welcome-container">
              
              {/* Top Section: Understanding the Dashboard */}
              <div>
                <div className="section-header-centered">
                  <div className="section-supertitle">KEY METRICS</div>
                  <h2 className="section-title">Understanding the Dashboard</h2>
                  <p className="section-subtitle">Core regulatory and financial metrics monitored in real-time during the simulation.</p>
                </div>

                <div className="metrics-grid-3x2">
                  <div className="info-card">
                    <div className="metric-info-header">
                      <div className="metric-icon-wrapper icon-blue">
                        <Shield size={18} />
                      </div>
                      <div className="metric-title-group">
                        <span className="metric-abbr">LCR</span>
                        <span className="metric-fullname">Liquidity Coverage Ratio</span>
                      </div>
                    </div>
                    <p className="metric-desc">
                      Measures whether a bank holds enough high-quality liquid assets to survive a <strong>30-day stress scenario</strong>. Basel III mandates a minimum of <strong>100%</strong>.
                    </p>
                    <div className="formula-box">
                      LCR = (HQLA / Net Cash Outflows) × 100
                    </div>
                  </div>

                  <div className="info-card">
                    <div className="metric-info-header">
                      <div className="metric-icon-wrapper icon-teal">
                        <Building size={18} />
                      </div>
                      <div className="metric-title-group">
                        <span className="metric-abbr">NSFR</span>
                        <span className="metric-fullname">Net Stable Funding Ratio</span>
                      </div>
                    </div>
                    <p className="metric-desc">
                      Ensures the bank's <strong>long-term funding structure</strong> is stable. Compares available stable funding against required stable funding over a <strong>1-year horizon</strong>.
                    </p>
                    <div className="formula-box">
                      NSFR = Available Stable Funding / Required Stable Funding
                    </div>
                  </div>

                  <div className="info-card">
                    <div className="metric-info-header">
                      <div className="metric-icon-wrapper icon-green">
                        <Droplet size={18} />
                      </div>
                      <div className="metric-title-group">
                        <span className="metric-abbr">HQLA</span>
                        <span className="metric-fullname">High-Quality Liquid Assets</span>
                      </div>
                    </div>
                    <p className="metric-desc">
                      Unencumbered assets that can be <strong>instantly converted to cash</strong> — government bonds, central bank reserves, and top-rated corporate debt.
                    </p>
                    <div className="formula-box">
                      HQLA = Level 1 Assets + Level 2A (×0.85) + Level 2B (×0.50)
                    </div>
                  </div>

                  <div className="info-card">
                    <div className="metric-info-header">
                      <div className="metric-icon-wrapper icon-red">
                        <Activity size={18} />
                      </div>
                      <div className="metric-title-group">
                        <span className="metric-abbr">NLP</span>
                        <span className="metric-fullname">Net Liquidity Position</span>
                      </div>
                    </div>
                    <p className="metric-desc">
                      The bank's <strong>real-time cash buffer</strong> — total liquid assets minus all obligations. When NLP crosses <strong>zero</strong>, the bank is insolvent.
                    </p>
                    <div className="formula-box">
                      NLP = Total Deposits + HQLA - Withdrawals - Loans Outstanding
                    </div>
                  </div>

                  <div className="info-card">
                    <div className="metric-info-header">
                      <div className="metric-icon-wrapper icon-orange">
                        <BarChart2 size={18} />
                      </div>
                      <div className="metric-title-group">
                        <span className="metric-abbr">LDR</span>
                        <span className="metric-fullname">Loan-to-Deposit Ratio</span>
                      </div>
                    </div>
                    <p className="metric-desc">
                      Indicates how much of the bank's deposits are lent out. A ratio above <strong>90%</strong> signals aggressive lending with thin liquidity margins.
                    </p>
                    <div className="formula-box">
                      LDR = (Total Loans / Total Deposits) × 100
                    </div>
                  </div>

                  <div className="info-card">
                    <div className="metric-info-header">
                      <div className="metric-icon-wrapper icon-yellow">
                        <TrendingDown size={18} />
                      </div>
                      <div className="metric-title-group">
                        <span className="metric-abbr">Survival Days</span>
                        <span className="metric-fullname">Predicted Horizon</span>
                      </div>
                    </div>
                    <p className="metric-desc">
                      Forecasted number of days until the bank's LCR breaches the <strong>100% regulatory minimum</strong> — the core output of our ML ensemble models.
                    </p>
                    <div className="formula-box">
                      Derived from LSTM + Prophet ensemble forecasts
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Section: Forecasting Ensemble */}
              <div>
                <div className="section-header-centered">
                  <div className="section-supertitle">AI MODELS</div>
                  <h2 className="section-title">Forecasting Ensemble</h2>
                  <p className="section-subtitle">Two independent models provide robust survival predictions with uncertainty quantification.</p>
                </div>

                <div className="models-grid-2x1">
                  <div className="model-card">
                    <div className="model-header">
                      <div className="model-title-group">
                        <Cpu className="model-icon icon-purple" size={20} />
                        <span className="model-name">LSTM Neural Network</span>
                      </div>
                      <span className="model-tag tag-purple">DEEP LEARNING</span>
                    </div>

                    <div className="model-props-list">
                      <div className="model-prop-row">
                        <span className="prop-label">Architecture</span>
                        <span className="prop-value">3-Layer, 256 Hidden Units</span>
                      </div>
                      <div className="model-prop-row">
                        <span className="prop-label">Training Data</span>
                        <span className="prop-value">5 Years Synthetic Bank Data</span>
                      </div>
                      <div className="model-prop-row">
                        <span className="prop-label">Lookback Window</span>
                        <span className="prop-value">30 Days Rolling</span>
                      </div>
                      <div className="model-prop-row">
                        <span className="prop-label">Output</span>
                        <span className="prop-value">Days Until LCR Breach</span>
                      </div>
                    </div>

                    <div className="model-summary-box">
                      Captures complex non-linear temporal dependencies in liquidity flows using gated recurrent memory cells.
                    </div>
                  </div>

                  <div className="model-card">
                    <div className="model-header">
                      <div className="model-title-group">
                        <LineChart className="prophet-icon" size={20} />
                        <span className="model-name">Prophet Forecaster</span>
                      </div>
                      <span className="model-tag tag-teal">TIME-SERIES</span>
                    </div>

                    <div className="model-props-list">
                      <div className="model-prop-row">
                        <span className="prop-label">Framework</span>
                        <span className="prop-value">Meta Prophet (Additive)</span>
                      </div>
                      <div className="model-prop-row">
                        <span className="prop-label">Changepoints</span>
                        <span className="prop-value">Auto-detected Regime Shifts</span>
                      </div>
                      <div className="model-prop-row">
                        <span className="prop-label">Uncertainty</span>
                        <span className="prop-value">80% Confidence Interval</span>
                      </div>
                      <div className="model-prop-row">
                        <span className="prop-label">Output</span>
                        <span className="prop-value">Survival + Lower Bound</span>
                      </div>
                    </div>

                    <div className="model-summary-box">
                      Decomposes LCR trajectory into trend and changepoint components with built-in uncertainty bands.
                    </div>
                  </div>
                </div>
              </div>

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
                      {hasCounterfactual && (
                        <Line yAxisId="left" isAnimationActive={false} type="monotone" dataKey="Counterfactual_LCR" stroke="#ef4444" dot={false} strokeWidth={1.5} strokeDasharray="6 4" strokeOpacity={0.55} name="LCR % (No Intervention)" connectNulls />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="analysis-box">
                    <strong>Interpretation:</strong> LCR measures 30-day survival capacity against the Basel III 100% minimum. NSFR measures structural funding stability.
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
                      {hasCounterfactual && (
                        <Line isAnimationActive={false} type="monotone" dataKey="Counterfactual_NLP" stroke="#f97316" dot={false} strokeWidth={1.5} strokeDasharray="6 4" strokeOpacity={0.55} name="NLP (No Intervention)" connectNulls />
                      )}
                      {hasCounterfactual && (
                        <Line isAnimationActive={false} type="monotone" dataKey="Counterfactual_HQLA" stroke="#86efac" dot={false} strokeWidth={1.5} strokeDasharray="6 4" strokeOpacity={0.45} name="HQLA (No Intervention)" connectNulls />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="analysis-box">
                    <strong>Interpretation:</strong> HQLA represents unencumbered liquid assets. NLP crossing zero triggers insolvency.
                    {hasCounterfactual && (
                      <span style={{ color: '#f97316' }}> <strong>Dotted lines</strong> show what would have happened without your interventions.</span>
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
                    <strong> LSTM</strong> (purple): 3-layer, 256-unit deep neural network pre-trained on 5 years of synthetic data.
                    <strong> Prophet</strong> (teal): Facebook's time-series forecasting model with changepoint detection.
                  </div>
                </div>
              </div>
            </main>
          )}
        </div>
      </div>

      {/* ═══ Right Sidebar — Alerts & Solutions Panel ═══ */}
      <aside className={`alerts-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-title">
            <AlertTriangle size={16} />
            <span>Alerts & Solutions</span>
            {notifications.length > 0 && (
              <span className="sidebar-count">{notifications.length}</span>
            )}
          </div>
          <button className="sidebar-close-btn" onClick={toggleSidebar}>
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Success Toasts — inline at top */}
        {successToasts.map((toast) => (
          <div key={toast.id} className="sidebar-success-toast">
            <Check size={14} />
            <span>{toast.message}</span>
          </div>
        ))}

        {/* Active Solutions Summary */}
        {activeSolutions.length > 0 && (
          <div className="sidebar-active-section">
            <div className="sidebar-section-label">ACTIVE INTERVENTIONS</div>
            {activeSolutions.map((sol) => (
              <div key={sol.id} className="sidebar-active-pill">
                <Zap size={11} />
                <span>{sol.title}</span>
                {sol.remaining > 0 && <span className="pill-days">{sol.remaining}d</span>}
              </div>
            ))}
          </div>
        )}

        {/* Notification List */}
        <div className="sidebar-notifications-list">
          {notifications.length === 0 ? (
            <div className="sidebar-empty">
              <Bell size={24} strokeWidth={1.5} />
              <p>No alerts yet</p>
              <span>Alerts will appear here when the bank's health deteriorates</span>
            </div>
          ) : (
            notifications.map((notif) => (
              <div key={notif.uid} className={`sidebar-notif-card ${notif.severity}`}>
                <div className="sidebar-notif-top">
                  <div className={`sidebar-notif-severity ${notif.severity}`}>
                    {notif.severity === 'critical' ? <AlertTriangle size={13} /> : <TrendingDown size={13} />}
                    {notif.severity.toUpperCase()}
                  </div>
                  <span className="sidebar-notif-time">{notif.timestamp}</span>
                  <button className="sidebar-notif-dismiss" onClick={() => dismissNotification(notif.uid)}>
                    <X size={13} />
                  </button>
                </div>

                <div className="sidebar-notif-title">{notif.title}</div>
                <div className="sidebar-notif-desc">{notif.description}</div>

                {notif.solutions && notif.solutions.length > 0 && (
                  <div className="sidebar-notif-actions">
                    <div className="sidebar-actions-label">PROPOSED SOLUTIONS</div>
                    {notif.solutions.map((solId) => {
                      const appliedInThisCard = (notif.appliedInThis || []).includes(solId);
                      const isReusable = SOLUTION_CATALOG[solId]?.reusable;
                      // Non-reusable: disabled globally. Reusable: only disabled on THIS card after clicking.
                      const isDisabled = appliedInThisCard || (!isReusable && appliedSolutionIds.has(solId));
                      const info = SOLUTION_CATALOG[solId];
                      return (
                        <button
                          key={solId}
                          className={`sidebar-solution-btn ${isDisabled ? 'applied' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isDisabled) applySolution(solId, notif.uid);
                          }}
                          disabled={isDisabled}
                        >
                          <span className="sol-btn-icon">{appliedInThisCard ? '✓' : (info?.icon || '⚡')}</span>
                          <span className="sol-btn-text">{info?.short || solId}</span>
                          {appliedInThisCard && <span className="sol-btn-applied">Applied</span>}
                          {isReusable && !appliedInThisCard && <span className="sol-btn-reusable">♻</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Sidebar toggle tab (visible when closed) */}
      {!sidebarOpen && (
        <button className="sidebar-tab" onClick={toggleSidebar}>
          <ChevronLeft size={14} />
          <Bell size={16} />
          {unreadCount > 0 && <span className="tab-badge">{unreadCount}</span>}
        </button>
      )}
    </div>
  );
}

export default App;
