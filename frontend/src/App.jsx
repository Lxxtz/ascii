import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Area, ComposedChart
} from 'recharts';
import { Play, Pause, AlertTriangle, RefreshCw, Rss } from 'lucide-react';
import './index.css';

function App() {
  const [data, setData] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const [isCrisis, setIsCrisis] = useState(false);

  const resetSimulation = async () => {
    setIsRunning(false);
    try {
      await fetch('http://127.0.0.1:8000/api/start', { method: 'POST' });
      setData([]);
      setHasFailed(false);
      setIsCrisis(false);
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

  useEffect(() => {
    let interval = null;
    if (isRunning && !hasFailed) {
      interval = setInterval(async () => {
        try {
          const response = await fetch('http://127.0.0.1:8000/api/step');
          const result = await response.json();
          setData(prev => [...prev, result.record]);
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
        </div>
      </header>

      {data.length === 0 ? (
        <div className="no-data">
          <h3>Simulation Idle</h3>
          <p>Press Start to begin real-time liquidity simulation.</p>
        </div>
      ) : (
        <main>
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
              <h2 className="chart-title">Regulatory Compliance (LCR & NSFR)</h2>
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
                </LineChart>
              </ResponsiveContainer>
              <div className="analysis-box">
                <strong>Interpretation:</strong> LCR measures 30-day survival capacity against the Basel III 100% minimum. NSFR measures structural funding stability. Crisis events rapidly deflate LCR as HQLA buffers are liquidated under fire-sale haircuts.
              </div>
            </div>

            <div className="chart-card">
              <h2 className="chart-title">Net Liquidity Position & HQLA Buffer</h2>
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
                </LineChart>
              </ResponsiveContainer>
              <div className="analysis-box">
                <strong>Interpretation:</strong> HQLA represents unencumbered liquid assets. As withdrawals outpace deposits, the bank liquidates HQLA to cover shortfalls. NLP crossing zero triggers insolvency.
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
    </div>
  );
}

export default App;
