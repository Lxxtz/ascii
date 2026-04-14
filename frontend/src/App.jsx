import React, { useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { Play, Activity } from 'lucide-react';
import './index.css';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const runSimulation = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/simulate');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching simulation data:", error);
      alert("Failed to connect to backend server. Make sure the FastAPI python server is running on port 8000.");
    }
    setLoading(false);
  };

  return (
    <div className="dashboard-container">
      <header className="header">
        <h1>Bank Liquidity & Risk Dashboard</h1>
        <button 
          className="run-btn" 
          onClick={runSimulation} 
          disabled={loading}
        >
          {loading ? <Activity size={18} className="animate-spin" /> : <Play size={18} />}
          {loading ? 'Running Simulation...' : 'Run Simulation'}
        </button>
      </header>

      {!data ? (
        <div className="no-data">
          <h3>No Telemetry Data Available</h3>
          <p>Click "Run Simulation" to execute the stochastic liquidity model and view the resulting metrics.</p>
        </div>
      ) : (
        <main>
          <div className="metrics-grid">
            <div className={`metric-card ${data.isCrisis ? 'danger' : 'success'}`}>
              <div className="metric-title">Crisis Status</div>
              <div className="metric-value" style={{ color: data.isCrisis ? '#dc3545' : '#28a745' }}>
                {data.isCrisis ? 'CRISIS DETECTED' : 'SOLVENT'}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-title">Failure Date</div>
              <div className="metric-value">{data.failureDate}</div>
            </div>
            <div className="metric-card">
              <div className="metric-title">Terminal LCR (&lt; 100% fail)</div>
              <div className="metric-value">{data.metricsAtFailure.LCR}%</div>
            </div>
            <div className="metric-card">
              <div className="metric-title">Terminal NLP Pos.</div>
              <div className="metric-value">${data.metricsAtFailure.NLP.toLocaleString()}</div>
            </div>
          </div>

          <div className="charts-grid">
            
            {/* LCR & NSFR Chart */}
            <div className="chart-card">
              <h2 className="chart-title">Regulatory Ratios (LCR & NSFR) Over Time</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.timeSeries} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="Date" tick={{ fontSize: 12 }} minTickGap={30} />
                  <YAxis yAxisId="left" domain={[0, 'auto']} label={{ value: 'LCR %', angle: -90, position: 'insideLeft' }} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 'auto']} label={{ value: 'NSFR %', angle: 90, position: 'insideRight' }} />
                  <Tooltip wrapperStyle={{ fontSize: '12px' }} />
                  <Legend />
                  <ReferenceLine yAxisId="left" y={100} stroke="red" strokeDasharray="3 3" label="LCR Min (100%)" />
                  <Line yAxisId="left" type="monotone" dataKey="LCR" stroke="#0056b3" dot={false} strokeWidth={2} name="LCR %" />
                  <Line yAxisId="right" type="monotone" dataKey="NSFR" stroke="#17a2b8" dot={false} strokeWidth={2} name="NSFR %" />
                </LineChart>
              </ResponsiveContainer>
              <div className="analysis-box">
                <strong>What is happening here?</strong> The LCR (Liquidity Coverage Ratio) actively tracks the bank's strict 30-day survival stability. In the initial stage, deposits are stable and LCR remains safely well above the 100% regulatory baseline. When the simulated market panic triggers, an influx of withdrawals rapidly deflates the LCR. The NSFR remains relatively static as long-term loans structurally cannot be converted quickly into liquid cash during the crunch.
              </div>
            </div>

            {/* NLP Chart */}
            <div className="chart-card">
              <h2 className="chart-title">Net Liquidity Position (NLP) & Buffer</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.timeSeries} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="Date" tick={{ fontSize: 12 }} minTickGap={30} />
                  <YAxis domain={['auto', 'auto']} tickFormatter={(tick) => `$${tick.toLocaleString()}`} />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} wrapperStyle={{ fontSize: '12px' }} />
                  <Legend />
                  <ReferenceLine y={0} stroke="red" strokeDasharray="3 3" label="Insolvency Line" />
                  <Line type="monotone" dataKey="NLP" stroke="#dc3545" dot={false} strokeWidth={2} name="Net Liquidity (NLP)" />
                  <Line type="monotone" dataKey="HQLA" stroke="#28a745" dot={false} strokeWidth={2} name="HQLA Buffer" />
                </LineChart>
              </ResponsiveContainer>
              <div className="analysis-box">
                <strong>What is happening here?</strong> The HQLA (High-Quality Liquid Assets) represents purely liquid unencumbered cash elements (like treasury bonds) the bank relies on. As panic withdrawals outpace the bank's incoming deposit flows (the Net Liquidity Position), the bank is forced to dynamically liquidate its HQLA buffers day by day. Once NLP breaks below the red insolvency line, the bank physically cannot disburse cash for incoming outflow requests.
              </div>
            </div>

             {/* Survival Chart */}
             <div className="chart-card">
              <h2 className="chart-title">Estimated Survival Horizon (Days)</h2>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.timeSeries} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="Date" tick={{ fontSize: 12 }} minTickGap={30} />
                  <YAxis domain={[0, 400]} />
                  <Tooltip wrapperStyle={{ fontSize: '12px' }} />
                  <Legend />
                  <ReferenceLine y={30} stroke="orange" strokeDasharray="3 3" label="Critical (30 Days)" />
                  <Line type="stepAfter" dataKey="Predicted_Survival_Days" stroke="#6f42c1" dot={false} strokeWidth={2} name="Survival Horizon" />
                </LineChart>
              </ResponsiveContainer>
              <div className="analysis-box">
                <strong>What is happening here?</strong> A real-time Linear Regression model algorithm evaluates cash burnout rate over the preceding 14-days. During stable operations, survival horizons remain securely capped near infinity (extrapolating positively). Upon entering the distress stage, the algorithm observes the immediate structural outflow trends and recalculates exactly how many mathematical days remain until the Net Cash buffer zeros out, acting as an early warning telemetric.
              </div>
            </div>

            {/* Interest Rates Chart */}
            <div className="chart-card">
              <h2 className="chart-title">Interest Rates (%)</h2>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.timeSeries} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="Date" tick={{ fontSize: 12 }} minTickGap={30} />
                  <YAxis domain={['auto', 'auto']} tickFormatter={(tick) => `${Number(tick).toFixed(2)}%`} width={60} />
                  <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} wrapperStyle={{ fontSize: '12px' }} />
                  <Legend />
                  <Line type="monotone" dataKey="Repo_Rate" stroke="#f39c12" dot={false} strokeWidth={2} name="Repo Rate" />
                  <Line type="monotone" dataKey="Market_Rate" stroke="#9b59b6" dot={false} strokeWidth={2} name="Market Rate" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Loan Activity Chart */}
            <div className="chart-card">
              <h2 className="chart-title">Loan Activity / Liquidity Flows</h2>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.timeSeries} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="Date" tick={{ fontSize: 12 }} minTickGap={30} />
                  <YAxis domain={['auto', 'auto']} tickFormatter={(tick) => `$${Number(tick).toLocaleString()}`} width={80} />
                  <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} wrapperStyle={{ fontSize: '12px' }} />
                  <Legend />
                  <Line type="monotone" dataKey="Loans_Given" stroke="#d35400" dot={false} strokeWidth={2} name="Loan Given" />
                  <Line type="monotone" dataKey="Loan_Repayment" stroke="#27ae60" dot={false} strokeWidth={2} name="Loan Repayment" />
                </LineChart>
              </ResponsiveContainer>
            </div>

          </div>
        </main>
      )}
    </div>
  );
}

export default App;
