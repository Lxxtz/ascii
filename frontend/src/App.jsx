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
            </div>

          </div>
        </main>
      )}
    </div>
  );
}

export default App;
