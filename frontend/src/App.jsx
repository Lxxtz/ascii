import React, { useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { Play, Activity, Pin } from 'lucide-react';
import './index.css';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pinnedData, setPinnedData] = useState(null);

  const chartData = data?.timeSeries?.map((item, index) => {
    let mergedItem = { ...item };
    if (pinnedData && pinnedData[index]) {
      const p = pinnedData[index];
      mergedItem = {
        ...mergedItem,
        Pinned_LCR: p.LCR,
        Pinned_NSFR: p.NSFR,
        Pinned_NLP: p.NLP,
        Pinned_HQLA: p.HQLA,
        Pinned_Predicted_Survival_Days: p.Predicted_Survival_Days,
        Pinned_Repo_Rate: p.Repo_Rate,
        Pinned_Market_Rate: p.Market_Rate,
        Pinned_Loans_Given: p.Loans_Given,
        Pinned_Loan_Repayment: p.Loan_Repayment,
        Pinned_Deposits: p.Deposits,
        Pinned_Withdrawals: p.Withdrawals,
        Pinned_Total_Deposits_Pool: p.Total_Deposits_Pool,
      };
    }
    return mergedItem;
  });

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
        <div className="header-actions">
          {data && (
            <button 
              className={`pin-btn ${pinnedData ? 'active' : ''}`}
              onClick={() => setPinnedData(pinnedData ? null : data.timeSeries)}
              title={pinnedData ? "Unpin previous run" : "Pin current run to compare"}
            >
              <Pin size={18} />
              {pinnedData ? 'Unpin Run' : 'Pin Run'}
            </button>
          )}
          <button 
            className="run-btn" 
            onClick={runSimulation} 
            disabled={loading}
          >
            {loading ? <Activity size={18} className="animate-spin" /> : <Play size={18} />}
            {loading ? 'Running Simulation...' : 'Run Simulation'}
          </button>
        </div>
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
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="Date" tick={{ fontSize: 12 }} minTickGap={30} />
                  <YAxis yAxisId="left" domain={[0, 'auto']} label={{ value: 'LCR %', angle: -90, position: 'insideLeft' }} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 'auto']} label={{ value: 'NSFR %', angle: 90, position: 'insideRight' }} />
                  <Tooltip wrapperStyle={{ fontSize: '12px' }} />
                  <Legend />
                  <ReferenceLine yAxisId="left" y={100} stroke="red" strokeDasharray="3 3" label="LCR Min (100%)" />
                  {pinnedData && <Line yAxisId="left" type="monotone" dataKey="Pinned_LCR" stroke="#b0b0b0" strokeDasharray="5 5" dot={false} strokeWidth={2} name="Pinned LCR %" />}
                  {pinnedData && <Line yAxisId="right" type="monotone" dataKey="Pinned_NSFR" stroke="#d3d3d3" strokeDasharray="5 5" dot={false} strokeWidth={2} name="Pinned NSFR %" />}
                  <Line yAxisId="left" type="monotone" dataKey="LCR" stroke="#0056b3" dot={false} strokeWidth={2} name="LCR %" />
                  <Line yAxisId="right" type="monotone" dataKey="NSFR" stroke="#17a2b8" dot={false} strokeWidth={2} name="NSFR %" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* NLP Chart */}
            <div className="chart-card">
              <h2 className="chart-title">Net Liquidity Position (NLP) & Buffer</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="Date" tick={{ fontSize: 12 }} minTickGap={30} />
                  <YAxis domain={['auto', 'auto']} tickFormatter={(tick) => `$${tick.toLocaleString()}`} />
                  <Tooltip formatter={(value) => value != null ? `$${value.toLocaleString()}` : ''} wrapperStyle={{ fontSize: '12px' }} />
                  <Legend />
                  <ReferenceLine y={0} stroke="red" strokeDasharray="3 3" label="Insolvency Line" />
                  {pinnedData && <Line type="monotone" dataKey="Pinned_NLP" stroke="#b0b0b0" strokeDasharray="5 5" dot={false} strokeWidth={2} name="Pinned NLP" />}
                  {pinnedData && <Line type="monotone" dataKey="Pinned_HQLA" stroke="#d3d3d3" strokeDasharray="5 5" dot={false} strokeWidth={2} name="Pinned HQLA Buffer" />}
                  <Line type="monotone" dataKey="NLP" stroke="#dc3545" dot={false} strokeWidth={2} name="Net Liquidity (NLP)" />
                  <Line type="monotone" dataKey="HQLA" stroke="#28a745" dot={false} strokeWidth={2} name="HQLA Buffer" />
                </LineChart>
              </ResponsiveContainer>
            </div>

             {/* Survival Chart */}
             <div className="chart-card">
              <h2 className="chart-title">Estimated Survival Horizon (Days)</h2>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="Date" tick={{ fontSize: 12 }} minTickGap={30} />
                  <YAxis domain={[0, 400]} />
                  <Tooltip wrapperStyle={{ fontSize: '12px' }} />
                  <Legend />
                  <ReferenceLine y={30} stroke="orange" strokeDasharray="3 3" label="Critical (30 Days)" />
                  {pinnedData && <Line type="stepAfter" dataKey="Pinned_Predicted_Survival_Days" stroke="#b0b0b0" strokeDasharray="5 5" dot={false} strokeWidth={2} name="Pinned Survival" />}
                  <Line type="stepAfter" dataKey="Predicted_Survival_Days" stroke="#6f42c1" dot={false} strokeWidth={2} name="Survival Horizon" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Interest Rates Chart */}
            <div className="chart-card">
              <h2 className="chart-title">Interest Rates (%)</h2>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="Date" tick={{ fontSize: 12 }} minTickGap={30} />
                  <YAxis domain={['auto', 'auto']} tickFormatter={(tick) => `${Number(tick).toFixed(2)}%`} width={60} />
                  <Tooltip formatter={(value) => value != null ? `${Number(value).toFixed(2)}%` : ''} wrapperStyle={{ fontSize: '12px' }} />
                  <Legend />
                  {pinnedData && <Line type="monotone" dataKey="Pinned_Repo_Rate" stroke="#b0b0b0" strokeDasharray="5 5" dot={false} strokeWidth={2} name="Pinned Repo Rate" />}
                  {pinnedData && <Line type="monotone" dataKey="Pinned_Market_Rate" stroke="#d3d3d3" strokeDasharray="5 5" dot={false} strokeWidth={2} name="Pinned Market Rate" />}
                  <Line type="monotone" dataKey="Repo_Rate" stroke="#f39c12" dot={false} strokeWidth={2} name="Repo Rate" />
                  <Line type="monotone" dataKey="Market_Rate" stroke="#9b59b6" dot={false} strokeWidth={2} name="Market Rate" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Loan Activity Chart */}
            <div className="chart-card">
              <h2 className="chart-title">Loan Activity / Liquidity Flows</h2>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="Date" tick={{ fontSize: 12 }} minTickGap={30} />
                  <YAxis domain={['auto', 'auto']} tickFormatter={(tick) => `$${Number(tick).toLocaleString()}`} width={80} />
                  <Tooltip formatter={(value) => value != null ? `$${Number(value).toLocaleString()}` : ''} wrapperStyle={{ fontSize: '12px' }} />
                  <Legend />
                  {pinnedData && <Line type="monotone" dataKey="Pinned_Loans_Given" stroke="#b0b0b0" strokeDasharray="5 5" dot={false} strokeWidth={2} name="Pinned Loan Given" />}
                  {pinnedData && <Line type="monotone" dataKey="Pinned_Loan_Repayment" stroke="#d3d3d3" strokeDasharray="5 5" dot={false} strokeWidth={2} name="Pinned Loan Repayment" />}
                  <Line type="monotone" dataKey="Loans_Given" stroke="#d35400" dot={false} strokeWidth={2} name="Loan Given" />
                  <Line type="monotone" dataKey="Loan_Repayment" stroke="#27ae60" dot={false} strokeWidth={2} name="Loan Repayment" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Deposits & Withdrawals Chart */}
            <div className="chart-card">
              <h2 className="chart-title">Deposits & Withdrawals vs Total Balance</h2>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="Date" tick={{ fontSize: 12 }} minTickGap={30} />
                  <YAxis yAxisId="left" domain={['auto', 'auto']} tickFormatter={(tick) => `$${Number(tick).toLocaleString()}`} width={80} />
                  <YAxis yAxisId="right" orientation="right" domain={['auto', 'auto']} tickFormatter={(tick) => `$${Number(tick).toLocaleString()}`} width={80} />
                  <Tooltip formatter={(value) => value != null ? `$${Number(value).toLocaleString()}` : ''} wrapperStyle={{ fontSize: '12px' }} />
                  <Legend />
                  {pinnedData && <Line yAxisId="left" type="monotone" dataKey="Pinned_Deposits" stroke="#b0b0b0" strokeDasharray="5 5" dot={false} strokeWidth={2} name="Pinned Deposits" />}
                  {pinnedData && <Line yAxisId="left" type="monotone" dataKey="Pinned_Withdrawals" stroke="#d3d3d3" strokeDasharray="5 5" dot={false} strokeWidth={2} name="Pinned Withdrawals" />}
                  {pinnedData && <Line yAxisId="right" type="monotone" dataKey="Pinned_Total_Deposits_Pool" stroke="#e0e0e0" strokeDasharray="5 5" dot={false} strokeWidth={2} name="Pinned Total Pool" />}
                  <Line yAxisId="left" type="monotone" dataKey="Deposits" stroke="#28a745" dot={false} strokeWidth={2} name="Deposits (Flow)" />
                  <Line yAxisId="left" type="monotone" dataKey="Withdrawals" stroke="#dc3545" dot={false} strokeWidth={2} name="Withdrawals (Flow)" />
                  <Line yAxisId="right" type="monotone" dataKey="Total_Deposits_Pool" stroke="#0056b3" dot={false} strokeWidth={2} name="Total Balance Pool" />
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
