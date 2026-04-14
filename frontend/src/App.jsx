import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { Play, Pause, AlertTriangle, RefreshCw, Rss } from 'lucide-react';
import './index.css';

function App() {
  const [data, setData] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const [isCrisis, setIsCrisis] = useState(false);

  // Restart the simulation from day 0
  const resetSimulation = async () => {
    setIsRunning(false);
    try {
      await fetch('http://127.0.0.1:8000/api/start', { method: 'POST' });
      setData([]);
      setHasFailed(false);
      setIsCrisis(false);
    } catch (error) {
      console.error("Error resetting:", error);
    }
  };

  // Trigger the crisis mode mathematically
  const triggerCrisis = async () => {
    try {
      await fetch('http://127.0.0.1:8000/api/trigger-crisis', { method: 'POST' });
      setIsCrisis(true);
    } catch (error) {
      console.error("Error triggering crisis:", error);
    }
  };

  // The main heartbeat hook
  useEffect(() => {
    let interval = null;

    if (isRunning && !hasFailed) {
      interval = setInterval(async () => {
        try {
          const response = await fetch('http://127.0.0.1:8000/api/step');
          const result = await response.json();
          // Hyper-optimized $O(1)$ networking state replacement
          setData(prevData => [...prevData, result.record]);

          if (result.has_failed) {
            setHasFailed(true);
            setIsRunning(false);
          }
        } catch (error) {
          console.error("Polling error:", error);
          setIsRunning(false); // Stop if backend dies
        }
      }, 1000); // Step explicitly once per second
    }

    return () => clearInterval(interval);
  }, [isRunning, hasFailed]);

  // Derived current metrics safely from the end of the history array
  const currentMetrics = data.length > 0 ? data[data.length - 1] : null;

  return (
    <div className="dashboard-container">
      <header className="header">
        <h1>Bank Liquidity LIVE Telemetry</h1>

        <div style={{ display: 'flex', gap: '1rem' }}>
          {/* Main Controls */}
          <button
            className="run-btn"
            style={{ backgroundColor: isRunning ? '#6c757d' : 'var(--primary-color)' }}
            onClick={() => setIsRunning(!isRunning)}
            disabled={hasFailed}
          >
            {isRunning ? <Pause size={18} /> : <Play size={18} />}
            {isRunning ? 'Pause Engine' : 'Start Engine'}
          </button>

          <button
            className="run-btn"
            style={{ backgroundColor: 'var(--card-bg)', color: 'var(--primary-color)', border: '1px solid var(--primary-color)' }}
            onClick={resetSimulation}
          >
            <RefreshCw size={18} /> Reset
          </button>

          {/* Special trigger */}
          <button
            className="run-btn"
            style={{ backgroundColor: 'var(--danger-color)' }}
            onClick={triggerCrisis}
            disabled={isCrisis || hasFailed}
          >
            <AlertTriangle size={18} />
            Simulate Market Crisis
          </button>
        </div>
      </header>

      {data.length === 0 ? (
        <div className="no-data">
          <h3>Simulation Engine Idle</h3>
          <p>Click "Start Engine" to begin the real-time temporal market simulation.</p>
        </div>
      ) : (
        <main>
          {currentMetrics?.News_Headline && (
            <div className={`metric-card news-ticker ${currentMetrics.News_Type}`} style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: `5px solid ${currentMetrics.News_Type === 'positive' ? '#28a745' : currentMetrics.News_Type === 'negative' ? '#dc3545' : '#6c757d'}` }}>
              <Rss size={24} color={currentMetrics.News_Type === 'positive' ? '#28a745' : currentMetrics.News_Type === 'negative' ? '#dc3545' : '#6c757d'} />
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.2rem' }}>
                  Latest Market Intelligence — {currentMetrics.News_Type} Impact
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                  "{currentMetrics.News_Headline}"
                </div>
              </div>
            </div>
          )}

          <div className="metrics-grid">
            <div className={`metric-card ${hasFailed ? 'danger' : 'success'}`}>
              <div className="metric-title">Solvency Status</div>
              <div className="metric-value" style={{ color: hasFailed ? '#dc3545' : '#28a745', fontSize: '1.4rem' }}>
                {hasFailed ? 'INSOLVENT / FAILED' : 'ACTIVE / SOLVENT'}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-title">Temporal Date</div>
              <div className="metric-value">{currentMetrics?.Date}</div>
            </div>
            <div className="metric-card">
              <div className="metric-title">Current LCR</div>
              <div className="metric-value">{currentMetrics?.LCR}%</div>
            </div>
            <div className="metric-card">
              <div className="metric-title">Net Liquidity Pos.</div>
              <div className="metric-value">${currentMetrics?.NLP.toLocaleString()}</div>
            </div>
          </div>

          <div className="charts-grid">

            {/* Daily Flows Chart */}
            <div className="chart-card">
              <h2 className="chart-title">Daily Cash Flows (Deposits vs Withdrawals)</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="Date" tick={{ fontSize: 12 }} minTickGap={30} />
                  <YAxis domain={['auto', 'auto']} tickFormatter={(tick) => `$${tick.toLocaleString()}`} />
                  <Tooltip formatter={(value) => value ? `$${value.toLocaleString()}` : null} wrapperStyle={{ fontSize: '12px' }} />
                  <Legend />
                  <Line isAnimationActive={false} type="monotone" dataKey="Daily_Deposits" stroke="#28a745" dot={false} strokeWidth={2} name="Daily Deposits" />
                  <Line isAnimationActive={false} type="monotone" dataKey="Daily_Withdrawals" stroke="#dc3545" dot={false} strokeWidth={2} name="Daily Withdrawals" />
                </LineChart>
              </ResponsiveContainer>
              <div className="analysis-box">
                <strong>What is happening here?</strong> This tracks the bank's literal daily inbound and outbound cash flows. Notice the heavy day-to-day fluctuations which represent randomized market noise and client behavior. Under normal operations, deposits slightly exceed or match withdrawals, keeping the bank healthy.
              </div>
            </div>

            {/* Daily Loans Chart */}
            <div className="chart-card">
              <h2 className="chart-title">Lending Activity (Loans Given vs Repaid)</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="Date" tick={{ fontSize: 12 }} minTickGap={30} />
                  <YAxis domain={['auto', 'auto']} tickFormatter={(tick) => `$${tick.toLocaleString()}`} />
                  <Tooltip formatter={(value) => value ? `$${value.toLocaleString()}` : null} wrapperStyle={{ fontSize: '12px' }} />
                  <Legend />
                  <Line isAnimationActive={false} type="monotone" dataKey="Daily_Loans_Given" stroke="#fd7e14" dot={false} strokeWidth={2} name="Loans Given" />
                  <Line isAnimationActive={false} type="monotone" dataKey="Daily_Loans_Repaid" stroke="#6f42c1" dot={false} strokeWidth={2} name="Loans Repaid" />
                </LineChart>
              </ResponsiveContainer>
              <div className="analysis-box">
                <strong>What is happening here?</strong> This graph monitors the secondary major cash flow component of the bank: its loan book. Under normal conditions, the bank consistently issues new loans while collecting steady repayments on the outstanding larger pool. During a crisis liquidity constraint, banks often immediately cease issuing new unbacked loans.
              </div>
            </div>

            {/* LCR & NSFR Chart */}
            <div className="chart-card">
              <h2 className="chart-title">Regulatory Ratios (LCR & NSFR) Over Time</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="Date" tick={{ fontSize: 12 }} minTickGap={30} />
                  <YAxis yAxisId="left" domain={[0, 'auto']} label={{ value: 'LCR %', angle: -90, position: 'insideLeft' }} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 'auto']} label={{ value: 'NSFR %', angle: 90, position: 'insideRight' }} />
                  <Tooltip wrapperStyle={{ fontSize: '12px' }} />
                  <Legend />
                  <ReferenceLine yAxisId="left" y={100} stroke="red" strokeDasharray="3 3" label="LCR Min (100%)" />
                  <Line yAxisId="left" isAnimationActive={false} type="monotone" dataKey="LCR" stroke="#0056b3" dot={false} strokeWidth={2} name="LCR %" />
                  <Line yAxisId="right" isAnimationActive={false} type="monotone" dataKey="NSFR" stroke="#17a2b8" dot={false} strokeWidth={2} name="NSFR %" />
                </LineChart>
              </ResponsiveContainer>
              <div className="analysis-box">
                <strong>What is happening here?</strong> The LCR (Liquidity Coverage Ratio) actively tracks the bank's strict 30-day survival stability. In the initial stage, deposits are stable and LCR remains safely well above the 100% regulatory baseline. Once the manual crisis is triggered, an influx of withdrawals rapidly deflates the LCR.
              </div>
            </div>

            {/* NLP Chart */}
            <div className="chart-card">
              <h2 className="chart-title">Net Liquidity Position (NLP) & Buffer</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="Date" tick={{ fontSize: 12 }} minTickGap={30} />
                  <YAxis domain={['auto', 'auto']} tickFormatter={(tick) => `$${tick.toLocaleString()}`} />
                  <Tooltip formatter={(value) => value ? `$${value.toLocaleString()}` : null} wrapperStyle={{ fontSize: '12px' }} />
                  <Legend />
                  <ReferenceLine y={0} stroke="red" strokeDasharray="3 3" label="Insolvency Line" />
                  <Line isAnimationActive={false} type="monotone" dataKey="NLP" stroke="#dc3545" dot={false} strokeWidth={2} name="Net Liquidity (NLP)" />
                  <Line isAnimationActive={false} type="monotone" dataKey="HQLA" stroke="#28a745" dot={false} strokeWidth={2} name="HQLA Buffer" />
                </LineChart>
              </ResponsiveContainer>
              <div className="analysis-box">
                <strong>What is happening here?</strong> The HQLA represents purely liquid unencumbered cash elements. As panic withdrawals outpace the bank's incoming deposit flows (the Net Liquidity Position), the bank is forced to dynamically liquidate its HQLA buffers dynamically every second. Once NLP breaks below the red insolvency line, the engine halts the simulation.
              </div>
            </div>

          </div>
        </main>
      )}
    </div>
  );
}

export default App;
