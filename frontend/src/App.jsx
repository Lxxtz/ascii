import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid, Legend, ComposedChart
} from 'recharts';
import { apiUrl } from './lib/api';

/* ═══════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════ */
const fmt = (val) => {
  if (val === undefined || val === null) return '—';
  if (Math.abs(val) >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(val) >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (Math.abs(val) >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
  return `$${val.toFixed(0)}`;
};
const fmtShort = (val) => {
  if (val === undefined || val === null) return '—';
  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return `${val.toFixed(0)}`;
};

/* Tooltip Renderer */
const TacticalTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111] border border-[#333] px-3 py-2 text-[10px] font-mono">
      <div className="text-tactical-dim mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex gap-2 items-center">
          <span className="inline-block w-2 h-2" style={{ backgroundColor: p.stroke || p.fill }}></span>
          <span className="text-[#aaa]">{p.name}:</span>
          <span className="text-white font-bold">{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

/* Section Header */
const SectionHeader = ({ icon, title, subtitle, tag }) => (
  <div className="flex items-center justify-between mb-4 mt-2">
    <div className="flex items-center gap-3">
      <span className="material-symbols-outlined text-tactical-dim text-[18px]">{icon}</span>
      <div>
        <h2 className="text-[11px] font-sans font-black tracking-widest uppercase text-white">{title}</h2>
        <p className="text-[9px] text-tactical-dim tracking-widest uppercase">{subtitle}</p>
      </div>
    </div>
    {tag && <span className="text-[9px] font-mono text-tactical-dim border border-tactical-border px-2 py-1">{tag}</span>}
  </div>
);

/* Interpretation Box */
const InterpretationBox = ({ icon, text, severity }) => (
  <div className={`flex items-start gap-2 px-4 py-3 mt-2 border-l-2 text-[10px] font-sans leading-relaxed ${
    severity === 'warning' ? 'border-tactical-orange bg-[#1a1400] text-tactical-orange'
    : severity === 'critical' ? 'border-tactical-red-bright bg-[#1a0a0a] text-[#ffaaaa]'
    : 'border-tactical-dim bg-[#141414] text-[#999]'
  }`}>
    <span className="material-symbols-outlined text-[14px] mt-0.5 shrink-0">{icon || 'analytics'}</span>
    <span>{text}</span>
  </div>
);

/* KPI Card */
const KpiCard = ({ label, value, sub, color, icon }) => (
  <div className="bg-tactical-surface border border-tactical-border p-4 flex flex-col gap-1 min-w-0">
    <div className="flex items-center gap-1.5">
      {icon && <span className="material-symbols-outlined text-[14px] text-tactical-dim">{icon}</span>}
      <span className="text-[9px] font-sans font-bold text-tactical-dim uppercase tracking-widest truncate">{label}</span>
    </div>
    <span className={`text-xl font-bold font-mono truncate ${color || 'text-white'}`}>{value}</span>
    {sub && <span className="text-[9px] text-tactical-dim font-mono truncate">{sub}</span>}
  </div>
);


/* ═══════════════════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════════════════ */
export default function App() {
  const [data, setData] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const [isCrisis, setIsCrisis] = useState(false);
  const [systemAlerts, setSystemAlerts] = useState([]);
  const [solutionCatalog, setSolutionCatalog] = useState({});
  const [activeSolutions, setActiveSolutions] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const simInterval = useRef(null);
  const contentRef = useRef(null);

  // ── Fetch solutions catalog ──
  useEffect(() => {
    fetch(apiUrl('/api/solutions'))
      .then(r => r.json())
      .then(d => setSolutionCatalog(d.solutions || {}))
      .catch(console.error);
  }, []);

  // ── Step engine ──
  const stepEngine = async () => {
    try {
      const res = await fetch(apiUrl('/api/step'));
      const payload = await res.json();

      setData(prev => {
        const d = [...prev, payload.record];
        return d.length > 90 ? d.slice(-90) : d;
      });

      if (payload.record.has_failed) {
        setHasFailed(true);
        setIsRunning(false);
      }
      setIsCrisis(payload.record.is_crisis);
      setActiveSolutions(payload.active_solutions || []);

      if (payload.alerts?.length > 0) {
        const newAlerts = payload.alerts.map(a => ({
          ...a,
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          uid: Math.random().toString(36).substr(2, 9),
          nodeId: `LQN_${['CORE','EDGE','NODE'][Math.floor(Math.random()*3)]}_${String(Math.floor(Math.random()*20)).padStart(2,'0')}`
        }));
        setSystemAlerts(prev => [...newAlerts, ...prev].slice(0, 30));
      }
    } catch (e) {
      console.error('[Engine] step error:', e);
    }
  };

  // ── Polling ──
  useEffect(() => {
    if (isRunning && !hasFailed) {
      simInterval.current = setInterval(stepEngine, 1500);
    } else {
      clearInterval(simInterval.current);
    }
    return () => clearInterval(simInterval.current);
  }, [isRunning, hasFailed]);

  // ── Controls ──
  const startSim = () => {
    if (data.length === 0) {
      fetch(apiUrl('/api/start'), { method: 'POST' })
        .then(() => setIsRunning(true))
        .catch(console.error);
    } else {
      setIsRunning(true);
    }
  };
  const pauseSim = () => setIsRunning(false);
  const resetSim = async () => {
    await fetch(apiUrl('/api/start'), { method: 'POST' }).catch(console.error);
    setData([]); setSystemAlerts([]); setHasFailed(false); setIsCrisis(false); setIsRunning(false);
  };
  const triggerCrisis = async () => {
    await fetch(apiUrl('/api/trigger-crisis'), { method: 'POST' }).catch(console.error);
    stepEngine();
  };
  const applySolution = async (id) => {
    await fetch(apiUrl('/api/apply-solution'), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ solution_id: id }),
    }).catch(console.error);
    stepEngine();
  };

  // ── Derived ──
  const c = data.length > 0 ? data[data.length - 1] : null;
  const lcr = c?.LCR;
  const nsfr = c?.NSFR;
  const hqla = c?.HQLA;
  const nlpVal = c?.NLP;
  const ldr = c?.LDR;
  const lstmSurv = c?.LSTM_Survival;
  const prophetSurv = c?.Prophet_Survival;
  const prophetLower = c?.Prophet_Lower;

  const bestSurv = (() => {
    if (typeof lstmSurv === 'number' && typeof prophetSurv === 'number') return Math.min(lstmSurv, prophetSurv);
    if (typeof lstmSurv === 'number') return lstmSurv;
    if (typeof prophetSurv === 'number') return prophetSurv;
    return null;
  })();

  const statusText = hasFailed ? 'INSOLVENT' : isCrisis ? 'CRITICAL' : (lcr !== undefined && lcr < 120) ? 'WARNING' : 'SOLVENT';
  const statusColor = hasFailed ? 'text-tactical-red-bright' : isCrisis ? 'text-tactical-red-bright' : statusText === 'WARNING' ? 'text-tactical-orange' : 'text-tactical-green';

  // Data slices for different timeframes
  const last30 = data.slice(-30);
  const last7 = data.slice(-7);

  // ── Survival history for the forecast chart ──
  const survivalData = data.filter((_, i) => i % 1 === 0).map(d => ({
    Date: d.Date,
    LSTM: d.LSTM_Survival,
    Prophet: d.Prophet_Survival,
    Prophet_Lower: d.Prophet_Lower,
  }));

  // LCR interpretation
  const lcrInterp = lcr === undefined ? 'Awaiting data...'
    : lcr >= 150 ? 'LCR ratio is significantly above the Basel III 100% minimum. Strong short-term liquidity position maintained.'
    : lcr >= 100 ? 'LCR ratio remains above the regulatory minimum but buffer is narrowing. Continued monitoring advised.'
    : 'LCR has BREACHED the Basel III 100% minimum threshold. Immediate remediation is required.';
  const lcrSev = lcr === undefined ? 'info' : lcr >= 150 ? 'info' : lcr >= 100 ? 'warning' : 'critical';

  // NLP interpretation
  const nlpInterp = nlpVal === undefined || nlpVal === null ? 'Awaiting data...'
    : nlpVal > 15_000_000 ? 'Net liquidity position is healthy with strong HQLA buffer. No insolvency risk detected.'
    : nlpVal > 0 ? 'Net liquidity is positive but declining. HQLA buffer erosion detected — active monitoring recommended.'
    : 'Net liquidity has crossed the ZERO threshold. Insolvency conditions imminent.';
  const nlpSev = nlpVal === undefined || nlpVal === null ? 'info' : nlpVal > 15_000_000 ? 'info' : nlpVal > 0 ? 'warning' : 'critical';

  // Survival interpretation
  const survInterp = bestSurv === null ? 'Awaiting sufficient data for LSTM/Prophet model convergence (30+ days needed)...'
    : bestSurv > 300 ? 'Ensemble forecast indicates survival horizon exceeds 300 days. No near-term breach risk.'
    : bestSurv > 100 ? `Forecasted survival horizon: ${bestSurv} days. Models detect gradual stress accumulation.`
    : bestSurv > 30 ? `WARNING: Survival horizon at ${bestSurv} days. Breach trajectory accelerating — intervention recommended.`
    : `CRITICAL: Only ${bestSurv} days until projected LCR breach. Immediate emergency action required.`;
  const survSev = bestSurv === null ? 'info' : bestSurv > 100 ? 'info' : bestSurv > 30 ? 'warning' : 'critical';

  const unreadAlerts = systemAlerts.filter(a => a.severity === 'critical').length;

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col w-full h-screen bg-tactical-bg text-tactical-text font-mono overflow-hidden">

      {/* ═══ TOP BAR ═══ */}
      <header className="h-12 shrink-0 border-b border-tactical-border/60 flex items-center justify-between px-5 bg-[#0a0a0a] z-30">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-tactical-dim text-[18px]">terminal</span>
          <span className="text-xs font-bold tracking-widest text-white font-sans">RISK_ENGINE_V2.0</span>
          <span className="text-[9px] text-tactical-dim font-mono ml-3">
            {c ? `DAY ${data.length} // ${c.Date}` : 'AWAITING INIT'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Start / Pause */}
          <button onClick={isRunning ? pauseSim : startSim} disabled={hasFailed}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-sans font-bold uppercase tracking-widest transition-all border ${
              hasFailed ? 'border-tactical-red-bright/30 text-tactical-red-bright/50 cursor-not-allowed'
              : isRunning ? 'border-tactical-green text-tactical-green hover:bg-tactical-green hover:text-black'
              : 'border-white text-white bg-white/10 hover:bg-white hover:text-black'
            }`}>
            <span className="material-symbols-outlined text-[14px]">{isRunning ? 'pause' : 'play_arrow'}</span>
            {hasFailed ? 'DEAD' : isRunning ? 'PAUSE' : 'START'}
          </button>

          {/* Reset */}
          <button onClick={resetSim}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-sans font-bold uppercase tracking-widest border border-tactical-border text-tactical-dim hover:text-white hover:border-white transition-all">
            <span className="material-symbols-outlined text-[14px]">refresh</span>
            RESET
          </button>

          {/* Trigger Crisis */}
          <button onClick={triggerCrisis}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-sans font-bold uppercase tracking-widest border border-tactical-red-bright/40 text-tactical-red-bright bg-tactical-red-bright/5 hover:bg-tactical-red-bright hover:text-white transition-all">
            <span className="material-symbols-outlined text-[14px]">crisis_alert</span>
            TRIGGER CRISIS
          </button>

          {/* Notification Bell */}
          <div className="relative">
            <button onClick={() => setShowNotifications(!showNotifications)}
              className="p-1.5 text-tactical-dim hover:text-white transition-colors relative">
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              {unreadAlerts > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-tactical-red-bright text-white text-[8px] font-bold flex items-center justify-center">
                  {unreadAlerts}
                </span>
              )}
            </button>
            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-10 w-80 bg-[#111] border border-tactical-border shadow-2xl z-50 max-h-80 overflow-y-auto no-scrollbar">
                <div className="px-4 py-3 border-b border-tactical-border text-[10px] font-sans font-bold tracking-widest uppercase text-white">ALERTS ({systemAlerts.length})</div>
                {systemAlerts.length === 0 ? (
                  <div className="p-4 text-[10px] text-tactical-dim italic">No alerts yet.</div>
                ) : systemAlerts.slice(0, 10).map(a => (
                  <div key={a.uid} className="px-4 py-3 border-b border-tactical-border/50 hover:bg-[#1a1a1a]">
                    <div className="flex justify-between">
                      <span className={`text-[9px] font-bold uppercase ${a.severity === 'critical' ? 'text-tactical-red-bright' : 'text-tactical-orange'}`}>{a.severity}</span>
                      <span className="text-[9px] text-tactical-dim">{a.timestamp}</span>
                    </div>
                    <div className="text-[10px] text-white mt-1">{a.title}</div>
                    <div className="text-[9px] text-tactical-dim mt-0.5">{a.description}</div>
                    {a.solutions?.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {a.solutions.map(sid => (
                          <button key={sid} onClick={() => { applySolution(sid); setShowNotifications(false); }}
                            className="px-2 py-0.5 text-[8px] font-bold uppercase bg-white text-black hover:bg-tactical-green transition-colors">
                            {solutionCatalog[sid]?.title || sid}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Settings */}
          <button className="p-1.5 text-tactical-dim hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </button>
        </div>
      </header>

      {/* ═══ MAIN CONTENT ═══ */}
      <div ref={contentRef} className="flex-1 overflow-y-auto no-scrollbar tactical-grid">
        <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">

          {/* ═══ KPI SUMMARY CARDS ═══ */}
          <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <KpiCard label="Status" value={statusText} color={statusColor} icon="monitor_heart" sub={isCrisis ? 'CRISIS ACTIVE' : 'MONITORING'} />
            <KpiCard label="Date" value={c?.Date || '—'} icon="calendar_today" sub={`Day ${data.length}`} />
            <KpiCard label="LCR" value={lcr !== undefined ? `${lcr.toFixed(2)}%` : '—'} icon="speed"
              color={lcr !== undefined && lcr < 100 ? 'text-tactical-red-bright' : lcr !== undefined && lcr < 120 ? 'text-tactical-orange' : 'text-white'}
              sub="Liquidity Coverage" />
            <KpiCard label="Net Liquidity" value={fmt(nlpVal)} icon="account_balance" sub="Available Liquid Funds" />
            <KpiCard label="Loan-to-Deposit" value={ldr !== undefined && ldr !== null ? `${ldr.toFixed(2)}%` : '—'} icon="credit_score" sub="LDR Metric" />
            <KpiCard label="LSTM Forecast" value={lstmSurv !== undefined && lstmSurv !== null ? (lstmSurv > 365 ? '> 365d' : `${lstmSurv}d`) : '—'} icon="neurology"
              color={lstmSurv !== undefined && lstmSurv !== null && lstmSurv < 60 ? 'text-tactical-red-bright' : lstmSurv !== undefined && lstmSurv !== null && lstmSurv < 100 ? 'text-tactical-orange' : 'text-white'}
              sub="Deep Learning" />
            <KpiCard label="Prophet Forecast" value={prophetSurv !== undefined && prophetSurv !== null ? (prophetSurv > 365 ? '> 365d' : `${prophetSurv}d`) : '—'} icon="query_stats"
              color={prophetSurv !== undefined && prophetSurv !== null && prophetSurv < 60 ? 'text-tactical-red-bright' : prophetSurv !== undefined && prophetSurv !== null && prophetSurv < 100 ? 'text-tactical-orange' : 'text-white'}
              sub="Time-Series" />
          </section>

          {/* ═══════════════════════════════════════════════════════════
             SECTION 1: FUNDING LIQUIDITY (Intraday – 30 Days)
             ═══════════════════════════════════════════════════════════ */}
          <SectionHeader icon="water_drop" title="Funding Liquidity" subtitle="Intraday – 30 Day Monitoring Window" tag="SECTION_01" />

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 8. Daily Cash Flows */}
            <div className="bg-tactical-surface border border-tactical-border flex flex-col shadow-lg">
              <div className="px-4 pt-4 pb-2 border-b border-tactical-border/50 flex justify-between items-center shrink-0">
                <span className="text-[10px] font-sans font-bold tracking-widest uppercase text-tactical-dim">Daily Cash Flows</span>
                <div className="flex gap-3 text-[9px] font-sans font-bold">
                  <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 bg-tactical-green"></span> DEPOSITS</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 bg-tactical-red-bright"></span> WITHDRAWALS</span>
                </div>
              </div>
              <div className="flex-1 p-3" style={{ minHeight: '220px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={last30}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                    <XAxis dataKey="Date" tick={{ fontSize: 9, fill: '#555' }} axisLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#555' }} axisLine={false} tickFormatter={fmtShort} />
                    <Tooltip content={<TacticalTooltip />} />
                    <Area type="monotone" dataKey="Daily_Deposits" name="Deposits" stroke="#04d45b" fill="#04d45b" fillOpacity={0.15} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                    <Area type="monotone" dataKey="Daily_Withdrawals" name="Withdrawals" stroke="#ff3333" fill="#ff3333" fillOpacity={0.1} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <InterpretationBox icon="analytics"
                text={c ? (c.Daily_Deposits > c.Daily_Withdrawals
                  ? `Net deposit inflow of ${fmt(c.Daily_Deposits - c.Daily_Withdrawals)}. Funding liquidity is being replenished — positive pressure on LCR.`
                  : `Net deposit OUTFLOW of ${fmt(c.Daily_Withdrawals - c.Daily_Deposits)}. Deposit base eroding — withdrawal pressure escalating.`)
                  : 'Awaiting simulation data for cash flow analysis.'}
                severity={c ? (c.Daily_Deposits > c.Daily_Withdrawals ? 'info' : 'warning') : 'info'} />
            </div>

            {/* 9. Lending Activity */}
            <div className="bg-tactical-surface border border-tactical-border flex flex-col shadow-lg">
              <div className="px-4 pt-4 pb-2 border-b border-tactical-border/50 flex justify-between items-center shrink-0">
                <span className="text-[10px] font-sans font-bold tracking-widest uppercase text-tactical-dim">Lending Activity</span>
                <div className="flex gap-3 text-[9px] font-sans font-bold">
                  <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 bg-[#ff9933]"></span> LOANS ISSUED</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 bg-[#66aaff]"></span> REPAYMENTS</span>
                </div>
              </div>
              <div className="flex-1 p-3" style={{ minHeight: '220px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={last30} barGap={-1}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                    <XAxis dataKey="Date" tick={{ fontSize: 9, fill: '#555' }} axisLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#555' }} axisLine={false} tickFormatter={fmtShort} />
                    <Tooltip content={<TacticalTooltip />} />
                    <Bar dataKey="Daily_Loans_Given" name="Loans Issued" fill="#ff9933" fillOpacity={0.7} isAnimationActive={false} />
                    <Bar dataKey="Daily_Loans_Repaid" name="Repayments" fill="#66aaff" fillOpacity={0.7} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <InterpretationBox icon="credit_score"
                text={c ? (c.Daily_Loans_Given > c.Daily_Loans_Repaid
                  ? `Net loan expansion of ${fmt(c.Daily_Loans_Given - c.Daily_Loans_Repaid)}. Lending pressure increasing — loan book growing faster than repayments.`
                  : `Net loan contraction of ${fmt(c.Daily_Loans_Repaid - c.Daily_Loans_Given)}. Loan book is deleveraging — positive for liquidity buffer preservation.`)
                  : 'Awaiting simulation data for lending analysis.'}
                severity={c ? (c.Daily_Loans_Given > c.Daily_Loans_Repaid ? 'warning' : 'info') : 'info'} />
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════════
             SECTION 2: MARKET LIQUIDITY (Intraday – 7 Days)
             ═══════════════════════════════════════════════════════════ */}
          <SectionHeader icon="public" title="Market Liquidity" subtitle="Intraday – 7 Day Regulatory Window" tag="SECTION_02" />

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 10. Regulatory Compliance */}
            <div className="bg-tactical-surface border border-tactical-border flex flex-col shadow-lg">
              <div className="px-4 pt-4 pb-2 border-b border-tactical-border/50 flex justify-between items-center shrink-0">
                <span className="text-[10px] font-sans font-bold tracking-widest uppercase text-tactical-dim">Regulatory Compliance</span>
                <div className="flex gap-3 text-[9px] font-sans font-bold">
                  <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 bg-tactical-green"></span> LCR%</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 bg-[#aaa]"></span> NSFR%</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-2 h-[1px] bg-tactical-red-bright"></span> BASEL III</span>
                </div>
              </div>
              <div className="flex-1 p-3" style={{ minHeight: '220px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={last7}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                    <XAxis dataKey="Date" tick={{ fontSize: 9, fill: '#555' }} axisLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#555' }} axisLine={false} domain={['auto', 'auto']} />
                    <ReferenceLine y={100} stroke="#ff3333" strokeDasharray="6 3" strokeWidth={1} label={{ value: 'BASEL III MIN (100%)', position: 'insideBottomRight', fill: '#ff3333', fontSize: 8 }} />
                    <Line type="monotone" dataKey="LCR" name="LCR %" stroke="#04d45b" strokeWidth={2} dot={{ r: 2, fill: '#04d45b' }} isAnimationActive={false} />
                    <Line type="monotone" dataKey="NSFR" name="NSFR %" stroke="#aaa" strokeWidth={1.5} dot={{ r: 2, fill: '#aaa' }} isAnimationActive={false} />
                    <Tooltip content={<TacticalTooltip />} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <InterpretationBox icon="gavel" text={lcrInterp} severity={lcrSev} />
            </div>

            {/* 11. Net Liquidity Position & HQLA Buffer */}
            <div className="bg-tactical-surface border border-tactical-border flex flex-col shadow-lg">
              <div className="px-4 pt-4 pb-2 border-b border-tactical-border/50 flex justify-between items-center shrink-0">
                <span className="text-[10px] font-sans font-bold tracking-widest uppercase text-tactical-dim">Net Liquidity & HQLA Buffer</span>
                <div className="flex gap-3 text-[9px] font-sans font-bold">
                  <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 bg-[#66aaff]"></span> HQLA</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 bg-white"></span> NET LIQ.</span>
                </div>
              </div>
              <div className="flex-1 p-3" style={{ minHeight: '220px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={last7}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                    <XAxis dataKey="Date" tick={{ fontSize: 9, fill: '#555' }} axisLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#555' }} axisLine={false} tickFormatter={fmtShort} />
                    <ReferenceLine y={0} stroke="#ff3333" strokeDasharray="4 2" strokeWidth={0.5} label={{ value: 'INSOLVENCY', position: 'insideBottomRight', fill: '#ff3333', fontSize: 8 }} />
                    <defs>
                      <linearGradient id="hqlaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#66aaff" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#66aaff" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="HQLA" name="HQLA Buffer" stroke="#66aaff" fill="url(#hqlaGrad)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="NLP" name="Net Liquidity" stroke="#fff" strokeWidth={2} dot={{ r: 2, fill: '#fff' }} isAnimationActive={false} />
                    <Tooltip content={<TacticalTooltip />} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <InterpretationBox icon="shield" text={nlpInterp} severity={nlpSev} />
            </div>
          </section>

          {/* ═══════════════════════════════════════════════════════════
             SECTION 3: STRUCTURAL LIQUIDITY (1 Month – 1 Year)
             ═══════════════════════════════════════════════════════════ */}
          <SectionHeader icon="architecture" title="Structural Liquidity" subtitle="1 Month – 1 Year Forecast Horizon" tag="SECTION_03" />

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 12. Forecasted Survival Horizon */}
            <div className="lg:col-span-2 bg-tactical-surface border border-tactical-border flex flex-col shadow-lg">
              <div className="px-4 pt-4 pb-2 border-b border-tactical-border/50 flex justify-between items-center shrink-0">
                <span className="text-[10px] font-sans font-bold tracking-widest uppercase text-tactical-dim">Forecasted Survival Horizon</span>
                <div className="flex gap-4 text-[9px] font-sans font-bold">
                  <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 bg-[#ffcc00]"></span> LSTM</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 bg-[#ff66ff]"></span> PROPHET</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 bg-[#ff66ff33]"></span> LOWER BOUND</span>
                </div>
              </div>
              <div className="flex-1 p-3" style={{ minHeight: '250px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={survivalData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                    <XAxis dataKey="Date" tick={{ fontSize: 9, fill: '#555' }} axisLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#555' }} axisLine={false} domain={[0, 'auto']} />
                    <ReferenceLine y={100} stroke="#d47b00" strokeDasharray="6 3" strokeWidth={1} label={{ value: 'WARNING (100d)', position: 'insideTopRight', fill: '#d47b00', fontSize: 8 }} />
                    <ReferenceLine y={30} stroke="#ff3333" strokeDasharray="6 3" strokeWidth={1} label={{ value: 'CRITICAL (30d)', position: 'insideTopRight', fill: '#ff3333', fontSize: 8 }} />
                    <Area type="monotone" dataKey="Prophet_Lower" name="Prophet Lower" stroke="none" fill="#ff66ff" fillOpacity={0.08} isAnimationActive={false} />
                    <Line type="monotone" dataKey="LSTM" name="LSTM Forecast" stroke="#ffcc00" strokeWidth={2} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="Prophet" name="Prophet Forecast" stroke="#ff66ff" strokeWidth={1.5} dot={false} isAnimationActive={false} strokeDasharray="4 2" />
                    <Tooltip content={<TacticalTooltip />} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <InterpretationBox icon="neurology" text={survInterp} severity={survSev} />
            </div>

            {/* Intervention Panel */}
            <div className="bg-tactical-surface border border-tactical-border flex flex-col shadow-lg">
              <div className="px-4 pt-4 pb-2 border-b border-tactical-border/50 flex justify-between items-center shrink-0">
                <span className="text-[10px] font-sans font-bold tracking-widest uppercase text-tactical-dim">Intervention Engine</span>
                <span className="text-[9px] text-tactical-dim font-mono">{activeSolutions.length} ACTIVE</span>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar">
                {Object.entries(solutionCatalog).map(([sid, sol]) => {
                  const active = activeSolutions.find(a => a.id === sid);
                  return (
                    <div key={sid} onClick={() => !active && applySolution(sid)}
                      className={`px-4 py-3 border-b text-[10px] font-mono cursor-pointer transition-colors ${
                        active ? 'bg-[#e0e0e0] text-black border-[#444]' : 'border-tactical-border/50 hover:bg-[#1a1a1a] text-tactical-dim'}`}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className={`material-symbols-outlined text-[14px] ${active ? 'text-black' : 'text-tactical-dim'}`}>
                            {active ? 'check_circle' : 'security'}
                          </span>
                          <span className="font-bold text-[9px]">{sol.title.toUpperCase()}</span>
                        </div>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 ${active ? 'bg-black text-white' : ''}`}>
                          {active ? `${active.remaining}D` : 'DEPLOY'}
                        </span>
                      </div>
                      <p className={`text-[9px] mt-1 leading-relaxed ${active ? 'text-[#333]' : 'text-[#555]'}`}>{sol.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ═══ NEWS + INCIDENT STREAM ═══ */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Market Signal */}
            <div className="bg-tactical-surface border border-tactical-border p-5 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-sans font-bold tracking-widest uppercase text-tactical-dim">MARKET_SIGNAL</span>
                {c?.News_Type && (
                  <span className={`text-[9px] font-bold font-sans uppercase px-2 py-0.5 ${
                    c.News_Type === 'negative' ? 'bg-tactical-red-bright text-white'
                    : c.News_Type === 'positive' ? 'bg-tactical-green text-black'
                    : 'bg-tactical-dim text-white'}`}>{c.News_Type}</span>
                )}
              </div>
              {c?.News_Headline ? (
                <p className="text-sm text-white font-sans font-bold leading-snug">{c.News_Headline}</p>
              ) : (
                <p className="text-sm text-tactical-dim italic font-sans">No market signals received.</p>
              )}
              <div className="text-[9px] text-tactical-dim font-mono">
                {c?.News_Age !== undefined ? `${c.News_Age}D AGO` : ''} {c?.News_Weight ? `// SEVERITY_WEIGHT: ${c.News_Weight.toFixed(1)}` : ''}
              </div>
            </div>

            {/* Incident Stream */}
            <div className="lg:col-span-2 bg-tactical-surface border border-tactical-border flex flex-col">
              <div className="px-5 py-3 flex justify-between items-center border-b border-tactical-border">
                <span className="text-[10px] font-sans font-black tracking-widest uppercase text-white">REAL_TIME_INCIDENT_STREAM</span>
                <div className="flex items-center gap-2 text-[9px] font-sans font-bold tracking-widest">
                  <div className={`w-2 h-2 ${isRunning ? 'bg-tactical-green animate-pulse' : 'bg-tactical-dim'}`}></div>
                  <span className={isRunning ? 'text-tactical-green' : 'text-tactical-dim'}>{isRunning ? 'LIVE' : 'PAUSED'}</span>
                </div>
              </div>
              <div className="grid grid-cols-12 gap-2 px-5 py-2 bg-[#151515] text-[8px] font-sans font-bold tracking-widest uppercase text-tactical-dim border-b border-tactical-border">
                <div className="col-span-2">TIMESTAMP</div>
                <div className="col-span-2">NODE_ID</div>
                <div className="col-span-5">EVENT_TYPE</div>
                <div className="col-span-1">VALUE_Δ</div>
                <div className="col-span-2 text-right">RISK_SCORE</div>
              </div>
              <div className="flex flex-col max-h-48 overflow-y-auto no-scrollbar">
                {systemAlerts.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-tactical-dim uppercase tracking-widest italic text-[9px]">Awaiting telemetry...</div>
                ) : systemAlerts.map((a, i) => (
                  <div key={a.uid} className={`grid grid-cols-12 gap-2 px-5 py-2.5 border-b border-tactical-border/30 items-center hover:bg-[#161616] transition-colors text-[10px] ${i === 0 ? 'bg-[#1a0f0f]' : ''}`}>
                    <div className="col-span-2 text-tactical-dim">{a.timestamp}</div>
                    <div className="col-span-2 text-tactical-dim truncate">{a.nodeId}</div>
                    <div className={`col-span-5 uppercase font-bold truncate ${a.severity === 'critical' ? 'text-tactical-red-bright' : a.severity === 'warning' ? 'text-tactical-orange' : 'text-tactical-dim'}`}>
                      {a.title.replace(/ /g, '_')}
                    </div>
                    <div className="col-span-1 text-tactical-red-bright text-[9px]">{a.severity === 'critical' ? '-$1.4M' : '-$0.8M'}</div>
                    <div className="col-span-2 text-right">
                      <span className={`px-1.5 py-0.5 font-bold text-[9px] ${a.severity === 'critical' ? 'bg-tactical-red-bright text-white' : a.severity === 'warning' ? 'bg-tactical-orange text-[#111]' : 'bg-tactical-dim text-white'}`}>
                        {a.severity === 'critical' ? '0.89' : '0.72'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Footer */}
          <div className="text-[9px] text-tactical-dim font-mono text-center py-4 tracking-widest uppercase border-t border-tactical-border/30">
            SYSTEM_USER: AUTHORIZED // DATA_STREAM: ENCRYPTED // ENGINE_BUILD: V2.1.4-PROD // MODELS: LSTM_V3 + PROPHET_V2
          </div>
        </div>
      </div>
    </div>
  );
}
