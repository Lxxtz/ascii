import React, { useState, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid, Legend, ComposedChart
} from 'recharts';
import {
  Play, Pause, AlertTriangle, RefreshCw, Rss, Shield, Check, X, Zap,
  TrendingDown, Activity, Bell, ChevronRight, ChevronLeft, Building, Droplet, BarChart2, Cpu, ChevronDown,
  ChevronUp, Info, Terminal, Gavel, Brain, LineChart as QueryStats,
  Calendar, Gauge as Speed, Landmark as AccountBalance,
  CreditCard as CreditScore, Sun, Moon
} from 'lucide-react';

const MonitorHeart = Activity; // Alias manually to avoid duplicate import binding
import { apiUrl } from './lib/api';
import './index.css';

/* ═══════════════════════════════════════════════════════════════════
   HELPERS & UI COMPONENTS
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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (d) => {
  if (!d) return '';
  const parts = d.split('-');
  if (parts.length < 3) return d;
  return `${MONTHS[parseInt(parts[1], 10) - 1]} ${parseInt(parts[2], 10)}`;
};

function MethodologyBox({ label, staticText, dynamicText }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`methodology-box ${expanded ? 'expanded' : ''}`}>
      <button className="methodology-toggle" onClick={() => setExpanded(e => !e)}>
        <div className="methodology-toggle-left">
          <Info size={13} />
          <span className="methodology-label">{label}</span>
        </div>
        <div className="methodology-toggle-right">
          <span className="methodology-hint">{expanded ? 'Hide' : 'Show'} Methodology</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>
      {expanded && (
        <div className="methodology-content">
          <div className="methodology-static">{staticText}</div>
          {dynamicText && (
            <div className="methodology-dynamic">
              <div className="methodology-dynamic-label">Current Tick Computation</div>
              <div className="methodology-formula">{dynamicText}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const TacticalTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111] border border-[#333] px-3 py-2 text-[10px] font-mono shadow-2xl">
      <div className="text-tactical-dim mb-1 font-bold">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex gap-2 items-center">
          <span className="inline-block w-2 h-2 rounded-sm" style={{ backgroundColor: p.stroke || p.fill }}></span>
          <span className="text-[#aaa]">{p.name}:</span>
          <span className="text-white font-bold">{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

const SectionHeader = ({ icon: Icon, title, subtitle, tag }) => (
  <div className="flex items-center justify-between mb-4 mt-2">
    <div className="flex items-center gap-3">
      {Icon && <Icon className="text-tactical-dim" size={18} />}
      <div>
        <h2 className="text-[11px] font-sans font-black tracking-widest uppercase text-white">{title}</h2>
        <p className="text-[9px] text-tactical-dim tracking-widest uppercase">{subtitle}</p>
      </div>
    </div>
    {tag && <span className="text-[9px] font-mono text-tactical-dim border border-tactical-border px-2 py-1 bg-black/20">{tag}</span>}
  </div>
);

const InterpretationBox = ({ icon: Icon, text, severity }) => (
  <div className={`flex items-start gap-2 px-4 py-3 border-l-2 text-[11px] font-sans leading-relaxed mt-2 rounded-lg ${severity === 'critical' ? 'border-tactical-red-bright bg-[#1a0a0a] text-[#ffaaaa]' :
      severity === 'warning' ? 'border-tactical-orange bg-[#1a1400] text-tactical-orange' :
        'border-tactical-dim bg-[#141414] text-[#999]'
    }`}>
    {Icon ? <Icon size={14} className="mt-0.5 shrink-0" /> : <Activity size={14} className="mt-0.5 shrink-0" />}
    <span>{text}</span>
  </div>
);

const KpiCard = ({ label, value, sub, color, icon: Icon }) => (
  <div className="glass-kpi p-4 flex flex-col gap-1 min-w-0 relative overflow-visible group rounded-xl">
    <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full blur-xl -mr-8 -mt-8 group-hover:bg-white/10 transition-all"></div>
    <div className="flex items-center gap-1.5 z-10">
      {Icon && <Icon className="text-tactical-dim" size={14} /> }
      <span className="text-[10px] font-sans font-bold text-tactical-dim uppercase tracking-widest truncate">{label}</span>
    </div>
    <span className={`text-2xl font-black font-mono truncate z-10 ${color || 'text-white'}`}>{value}</span>
    {sub && <span className="text-[10px] text-tactical-dim font-mono truncate z-10">{sub}</span>}
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
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLightMode, setIsLightMode] = useState(false);

  const simInterval = useRef(null);
  const contentRef = useRef(null);
  const reportSentRef = useRef(false);

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
        }));
        setSystemAlerts(prev => [...newAlerts, ...prev].slice(0, 30));
        setUnreadCount(prev => prev + newAlerts.length);


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

  // ── Auto Report on Insolvency ──
  useEffect(() => {
    if (hasFailed && !reportSentRef.current && contentRef.current) {
      reportSentRef.current = true;
      // Wait a moment for UI to visually reflect the "DEAD/INSOLVENT" state
      setTimeout(() => {
        html2canvas(contentRef.current, { backgroundColor: '#0a0a0a', scale: 1.5, windowHeight: contentRef.current.scrollHeight })
          .then(canvas => {
            const imgData = canvas.toDataURL('image/png', 1.0);
            const pdf = new jsPDF('p', 'pt', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            let heightLeft = pdfHeight;
            let position = 0;
            const pageHeight = pdf.internal.pageSize.getHeight();

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
              position = heightLeft - pdfHeight;
              pdf.addPage();
              pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
              heightLeft -= pageHeight;
            }

            const pdfBase64 = pdf.output('datauristring');
            fetch(apiUrl('/api/send-insolvency-report'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image_data: pdfBase64 }),
            }).catch(console.error);
          });
      }, 1500);
    }

    // Reset block if simulation gets reset
    if (!hasFailed && data.length === 0) {
      reportSentRef.current = false;
    }
  }, [hasFailed, data.length]);

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
  const current = data.length > 0 ? data[data.length - 1] : null;
  const lcr = current?.LCR;
  const nlpVal = current?.NLP;
  const ldr = current?.LDR;
  const nsfr = current?.NSFR;
  const lstmSurv = current?.LSTM_Survival;
  const hasCounterfactual = data.some(d => d.Counterfactual_LCR != null);

  const bestSurv = (() => {
    if (typeof lstmSurv === 'number') return lstmSurv;
    return null;
  })();

  const statusText = hasFailed ? 'INSOLVENT' : isCrisis ? 'CRITICAL' : (lcr !== undefined && lcr < 120) ? 'WARNING' : 'SOLVENT';
  const statusColor = hasFailed ? 'text-tactical-red-bright' : isCrisis ? 'text-tactical-red-bright' : statusText === 'WARNING' ? 'text-tactical-orange' : 'text-tactical-green';

  // Data slices for the detailed charts
  const last30 = data.slice(-30);
  const last7 = data.slice(-7);

  // ── Survival history for the forecast chart ──
  const survivalData = data.filter((_, i) => i % 1 === 0).map(d => ({
    Date: d.Date,
    LSTM: d.LSTM_Survival,
  }));

  // Interpretations (from the new UI/UX merge)
  const lcrInterp = lcr === undefined ? 'Awaiting data...'
    : lcr >= 150 ? 'LCR ratio is significantly above the Basel III 100% minimum. Strong short-term liquidity position maintained.'
      : lcr >= 100 ? 'LCR ratio remains above the regulatory minimum but buffer is narrowing. Continued monitoring advised.'
        : 'LCR has BREACHED the Basel III 100% minimum threshold. Immediate remediation is required.';
  
  // Notice we handle nlpVal === null/undefined correctly
  const nlpInterp = nlpVal === undefined || nlpVal === null ? 'Awaiting data...'
    : nlpVal > 15_000_000 ? 'Net liquidity position is healthy with strong HQLA buffer. No insolvency risk detected.'
      : nlpVal > 0 ? 'Net liquidity is positive but declining. HQLA buffer erosion detected — active monitoring recommended.'
        : 'Net liquidity has crossed the ZERO threshold. Insolvency conditions imminent.';
  const nlpSev = nlpVal === undefined || nlpVal === null ? 'info' : nlpVal > 15_000_000 ? 'info' : nlpVal > 0 ? 'warning' : 'critical';

  const survInterp = bestSurv === null ? 'Awaiting sufficient data for LSTM model convergence (30+ days needed)...'
    : bestSurv > 300 ? 'Forecast indicates survival horizon exceeds 300 days. No near-term breach risk.'
      : bestSurv > 100 ? `Forecasted survival horizon: ${bestSurv} days. Models detect gradual stress accumulation.`
        : bestSurv > 30 ? `WARNING: Survival horizon at ${bestSurv} days. Breach trajectory accelerating — intervention recommended.`
          : `CRITICAL: Only ${bestSurv} days until projected LCR breach. Immediate emergency action required.`;
  const survSev = bestSurv === null ? 'info' : bestSurv > 100 ? 'info' : bestSurv > 30 ? 'warning' : 'critical';

  const unreadAlerts = systemAlerts.filter(a => a.severity === 'critical').length;

  return (
    <div className={`flex flex-col w-full h-screen bg-tactical-bg text-tactical-text font-mono overflow-hidden ${isLightMode ? 'light-mode' : ''}`}>

      {/* ═══ TOP BAR ═══ */}
      <header className="h-12 shrink-0 border-b border-tactical-border flex items-center justify-between px-5 bg-tactical-surface z-30">
        <div className="flex items-center gap-3">
          <Terminal className="text-tactical-dim" size={18} />
          <span className="text-xs font-bold tracking-widest text-tactical-text font-sans">FLUXSHIELD</span>
          <span className="text-[9px] text-tactical-dim font-mono ml-3 font-semibold">
            {current ? `DAY ${data.length} // ${current.Date}` : 'AWAITING INIT'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={isRunning ? pauseSim : startSim} disabled={hasFailed}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-sans font-bold uppercase tracking-widest transition-all border ${hasFailed ? 'border-tactical-red-bright/30 text-tactical-red-bright/50 cursor-not-allowed' :
                isRunning ? 'border-tactical-green text-tactical-green hover:bg-tactical-green hover:text-black shadow-[0_0_10px_rgba(34,197,94,0.2)]' :
                  'border-white text-white bg-white/10 hover:bg-white hover:text-black'
              }`}>
            {isRunning ? <Pause size={14} /> : <Play size={14} />}
            {hasFailed ? 'FAILED' : isRunning ? 'PAUSE' : 'START'}
          </button>

          <button onClick={resetSim}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-sans font-bold uppercase tracking-widest border border-tactical-border text-tactical-dim hover:text-white hover:border-white transition-all">
            <RefreshCw size={14} /> RESET
          </button>

          <button onClick={triggerCrisis}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-sans font-bold uppercase tracking-widest border border-tactical-red-bright/40 text-tactical-red-bright bg-tactical-red-bright/5 hover:bg-tactical-red-bright hover:text-white hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all">
            <AlertTriangle size={14} /> TRIGGER CRISIS
          </button>

          <div className="relative">
            <button onClick={() => { setShowNotifications(!showNotifications); setUnreadCount(0); }}
              className="p-1.5 text-tactical-dim hover:text-white transition-colors relative">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-tactical-red-bright text-white text-[8px] font-bold flex items-center justify-center px-0.5 rounded-sm shadow-[0_0_8px_rgba(255,51,51,0.5)]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
                <div className="absolute right-0 top-12 w-96 bg-[#0d0d0d] border border-tactical-border shadow-2xl z-50 flex flex-col" style={{ maxHeight: '480px' }}>
                  <div className="px-5 py-3 border-b border-tactical-border flex justify-between items-center bg-[#111]">
                    <div className="flex items-center gap-2">
                      <Rss size={16} className="text-tactical-dim" />
                      <span className="text-[11px] font-sans font-bold tracking-widest uppercase text-white">Alerts</span>
                    </div>
                    <button onClick={() => setShowNotifications(false)} className="text-tactical-dim hover:text-white">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {systemAlerts.map(a => (
                      <div key={a.uid} className={`p-4 border-b border-tactical-border/30 hover:bg-white/5 transition-colors ${a.severity === 'critical' ? 'bg-tactical-red-bright/5' : ''}`}>
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-[10px] font-bold ${a.severity === 'critical' ? 'text-tactical-red-bright' : 'text-tactical-orange'}`}>{a.title}</span>
                          <span className="text-[8px] text-tactical-dim">{a.timestamp}</span>
                        </div>
                        <p className="text-[9px] text-[#aaa] leading-relaxed mb-3">{a.description}</p>
                        {a.solutions?.map(sid => (
                          <button key={sid} onClick={() => { applySolution(sid); setShowNotifications(false); }}
                            className="mr-2 px-2 py-1 text-[8px] font-bold uppercase bg-white/10 text-white border border-white/20 hover:bg-white hover:text-black">
                            {solutionCatalog[sid]?.short || sid}
                          </button>
                        ))}
                      </div>
                    ))}
                    {systemAlerts.length === 0 && (
                       <div className="flex flex-col items-center justify-center py-10 gap-2 opacity-30">
                         <Rss size={30} />
                         <span className="text-[10px] italic">No active alerts.</span>
                       </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          <button onClick={() => setIsLightMode(!isLightMode)} className="p-1.5 text-tactical-dim hover:text-white transition-colors">
            {isLightMode ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
      </header>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="flex-1 overflow-y-auto tactical-grid no-scrollbar" ref={contentRef}>
        {data.length === 0 ? (
          <div className="welcome-container">
            <div>
              <div className="section-header-centered">
                <div className="section-supertitle">KEY METRICS</div>
                <h2 className="section-title">Understanding FluxShield Dashboard</h2>
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
                    Forecasted number of days until the bank's LCR breaches the <strong>100% regulatory minimum</strong>.
                  </p>
                  <div className="formula-box">
                    Derived from LSTM deep learning forecasts
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section: Survival Forecasting */}
            <div>
              <div className="section-header-centered">
                <div className="section-supertitle">AI MODELS</div>
                <h2 className="section-title">Survival Forecasting</h2>
                <p className="section-subtitle">Deep learning models provide robust survival predictions based on temporal dependencies.</p>
              </div>

              <div className="flex justify-center">
                <div className="model-card" style={{ maxWidth: '600px', width: '100%' }}>
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
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-8">

            {/* Active Solutions Bar */}
            {activeSolutions.length > 0 && (
              <div className="active-solutions-bar mt-2 mb-4">
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
              <div className="bg-tactical-surface border rounded-md p-4 flex items-center justify-between shadow-md mb-6" style={{ borderColor: current.News_Type === 'positive' ? '#22c55e' : current.News_Type === 'negative' ? '#ef4444' : '#6b7280', borderLeftWidth: '4px' }}>
                <div className="flex items-center gap-4">
                  <Rss size={24} color={current.News_Type === 'positive' ? '#22c55e' : current.News_Type === 'negative' ? '#ef4444' : '#6b7280'} />
                  <div>
                    <div className="text-[9px] uppercase tracking-widest text-tactical-dim font-bold mb-1">Market Intelligence — {current.News_Type}</div>
                    <div className="text-sm text-tactical-text font-sans font-bold leading-tight uppercase">{current.News_Headline}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-mono text-tactical-dim bg-black/30 px-3 py-1.5 rounded">
                  <span className="flex items-center gap-1.5"><Calendar size={12} /> {current.News_Age}D AGO</span>
                  <span className="flex items-center gap-1.5"><AlertTriangle size={12} /> WT: {current.News_Weight?.toFixed(1)}</span>
                </div>
              </div>
            )}

            {/* KPI CARDS */}
            <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              <KpiCard label="Status" value={statusText} color={statusColor} icon={MonitorHeart} sub={isCrisis ? 'CRITICAL STATE' : 'MONITORING'} />
              <KpiCard label="Date" value={current?.Date || '—'} icon={Calendar} sub={`Day ${data.length}`} />
              <KpiCard label="LCR" value={lcr !== undefined ? `${lcr.toFixed(2)}%` : '—'} icon={Speed} color={lcr < 100 ? 'text-tactical-red-bright' : lcr < 120 ? 'text-tactical-orange' : 'text-tactical-text'} sub="Basel III Coverage" />
              <KpiCard label="Net Liquidity" value={fmt(nlpVal)} icon={AccountBalance} sub="Total HQLA Pool" />
              <KpiCard label="L-to-D Ratio" value={ldr !== undefined ? `${ldr.toFixed(2)}%` : '—'} icon={CreditScore} sub="Funding Structure" />
              <KpiCard label="LSTM Surv." value={lstmSurv !== undefined ? (lstmSurv >= 365 ? '365d+' : `${lstmSurv}d`) : '—'} icon={Brain} color={lstmSurv < 100 ? 'text-tactical-orange' : 'text-tactical-text'} sub="Deep Forecast" />
            </section>

            {/* ROW 1: FUNDING LIQUIDITY & LENDING (2 Graphs) */}
            <SectionHeader icon={Activity} title="Funding & Lending Velocity" subtitle="Intraday – 30 Day Operations" tag="SEC_01" />
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              
              {/* Deposit/Withdrawal Chart */}
              <div className="glass-panel flex flex-col p-4 rounded-xl">
                <h3 className="text-[11px] font-bold text-tactical-dim mb-4 uppercase tracking-[0.2em] flex items-center justify-between">
                  <span>Net Cashflow (Deposits vs Withdrawals)</span>
                  <span className="text-[9px] font-mono bg-black/30 px-2 py-0.5 border border-tactical-border text-tactical-dim">30D WINDOW</span>
                </h3>
                <div className="flex-1 min-h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={last30} margin={{ top: 10, right: 10, left: 20, bottom: 15 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--tactical-border)" vertical={false} />
                      <XAxis dataKey="Date" tick={{ fontSize: 9, fill: '#555' }} axisLine={false} tickLine={false} interval={Math.floor(last30.length / 5)} tickFormatter={fmtDate} angle={-35} textAnchor="end" height={40} />
                      <YAxis tick={{ fontSize: 9, fill: '#555' }} axisLine={false} tickLine={false} tickFormatter={fmtShort} />
                      <Tooltip content={<TacticalTooltip />} />
                      <Area type="monotone" dataKey="Daily_Deposits" name="Deposits" stroke="#04d45b" fill="#04d45b" fillOpacity={0.15} strokeWidth={2} dot={false} isAnimationActive={false} />
                      <Area type="monotone" dataKey="Daily_Withdrawals" name="Withdrawals" stroke="#ff3333" fill="#ff3333" fillOpacity={0.1} strokeWidth={2} dot={false} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <InterpretationBox icon={TrendingDown} severity={lcr < 120 ? 'warning' : 'info'} text={lcr < 120 ? 'Withdrawal pressure is accelerating beyond historical means. LCR buffer erosion imminent.' : 'Funding inflows remain within normal volatility bands.'} />
              </div>

               {/* Lending Velocity */}
              <div className="glass-panel flex flex-col p-4 rounded-xl">
                <h3 className="text-[11px] font-bold text-tactical-dim mb-4 uppercase tracking-[0.2em]">Lending Activities</h3>
                <div className="w-full min-h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={last30} barGap={-1} margin={{ top: 10, right: 10, left: 20, bottom: 15 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--tactical-border)" vertical={false} />
                      <XAxis dataKey="Date" tick={{ fontSize: 9, fill: '#555' }} axisLine={false} tickLine={false} interval={Math.floor(last30.length / 5)} tickFormatter={fmtDate} angle={-35} textAnchor="end" height={40} />
                      <YAxis tick={{ fontSize: 9, fill: '#555' }} axisLine={false} tickLine={false} tickFormatter={fmtShort} />
                      <Tooltip content={<TacticalTooltip />} cursor={{fill: '#f4f4f4', opacity: 0.1}}/>
                      <Bar dataKey="Daily_Loans_Given" name="Loans Issued" fill="#ff9933" fillOpacity={0.9} isAnimationActive={false} radius={[2,2,0,0]} />
                      <Bar dataKey="Daily_Loans_Repaid" name="Repayments" fill="#66aaff" fillOpacity={0.9} isAnimationActive={false} radius={[2,2,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <InterpretationBox icon={Gavel} severity="info" text="Lending issuance has been curtailed in response to current liquidity risk parameters." />
              </div>
            </section>

            {/* ROW 2: LIQUIDITY BUFFERS & COMPLIANCE (2 Graphs) */}
            <SectionHeader icon={Shield} title="Regulatory Compliance & Buffers" subtitle="Ratio Monitoring & HQLA Stability" tag="SEC_02" />
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              
              {/* LCR / NSFR Line Chart */}
              <div className="glass-panel flex flex-col p-4 rounded-xl">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-[11px] font-bold text-tactical-dim uppercase tracking-[0.2em]">Ratio Monitoring (LCR & NSFR)</h3>
                  {hasCounterfactual && <span className="text-[8px] text-tactical-red-bright font-black tracking-widest bg-tactical-red-bright/10 px-2 py-0.5 border border-tactical-red-bright/20 uppercase animate-pulse">Counterfactual Active</span>}
                </div>
                <div className="flex-1 min-h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 15 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--tactical-border)" vertical={false} />
                      <XAxis dataKey="Date" tick={{ fontSize: 9, fill: '#555' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={30} tickFormatter={fmtDate} angle={-35} textAnchor="end" height={40}/>
                      <YAxis domain={[0, 'auto']} tick={{ fontSize: 9, fill: '#555' }} axisLine={false} tickLine={false} />
                      <Tooltip content={TacticalTooltip} />
                      <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="5 5" strokeOpacity={0.7} label={{ value: '100% REG MIN', position: 'insideBottomRight', fill: '#ef4444', fontSize: 8, fontWeight: 'bold' }} />
                      <Line type="monotone" dataKey="LCR" name="LCR %" stroke="#3b82f6" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="NSFR" name="NSFR %" stroke="#14b8a6" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <InterpretationBox icon={Shield} severity={lcr < 100 ? 'critical' : lcr < 120 ? 'warning' : 'info'} text={lcrInterp} />
              </div>

               {/* Net Liquidity vs HQLA */}
               <div className="glass-panel flex flex-col p-4 rounded-xl">
                <h3 className="text-[11px] font-bold text-tactical-dim mb-4 uppercase tracking-[0.2em]">Net Liquidity Position & HQLA Buffer</h3>
                <div className="flex-1 min-h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={last7} margin={{ top: 10, right: 10, left: 20, bottom: 15 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--tactical-border)" vertical={false}/>
                      <XAxis dataKey="Date" tick={{ fontSize: 9, fill: '#555' }} axisLine={false} tickLine={false} tickFormatter={fmtDate} angle={-35} textAnchor="end" height={40} />
                      <YAxis tick={{ fontSize: 9, fill: '#555' }} axisLine={false} tickLine={false} tickFormatter={fmtShort} />
                      <ReferenceLine y={0} stroke="#ff3333" strokeDasharray="4 2" strokeWidth={0.5} />
                      <defs>
                        <linearGradient id="hqlaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#66aaff" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#66aaff" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="HQLA" name="HQLA Buffer" stroke="#66aaff" fill="url(#hqlaGrad)" strokeWidth={1} dot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="NLP" name="Net Liquidity" stroke="#fff" strokeWidth={2} dot={{ r: 2, fill: '#fff' }} isAnimationActive={false} />
                      <Tooltip content={<TacticalTooltip />} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <InterpretationBox icon={Shield} text={nlpInterp} severity={nlpSev} />
              </div>
            </section>

            {/* ROW 3: SURVIVAL FORECAST (1 Graph taking full width) */}
            <SectionHeader icon={Brain} title="AI Survival Models" subtitle="Deep Learning Forecast Horizon" tag="SEC_03" />
            <section className="grid grid-cols-1 gap-6 mb-8">
              <div className="glass-panel flex flex-col p-4 rounded-xl">
                <h3 className="text-[11px] font-bold text-tactical-dim mb-4 uppercase tracking-[0.2em] flex justify-between">
                  <span>LSTM Survival Prediction</span>
                  <span className="text-[9px] font-mono bg-[#ffcc00]/20 text-[#ffcc00] px-2 py-0.5 border border-[#ffcc00]/30">LSTM NEURAL NET</span>
                </h3>
                <div className="flex-1 min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={survivalData} margin={{ top: 10, right: 10, left: 10, bottom: 15 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--tactical-border)" vertical={false}/>
                      <XAxis dataKey="Date" tick={{ fontSize: 9, fill: '#555' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={30} tickFormatter={fmtDate} angle={-35} textAnchor="end" height={40}/>
                      <YAxis tick={{ fontSize: 9, fill: '#555' }} axisLine={false} tickLine={false} domain={[0, 'auto']} />
                      <ReferenceLine y={100} stroke="#d47b00" strokeDasharray="6 3" strokeWidth={1} label={{ value: 'WARNING (100d)', position: 'insideBottomRight', fill: '#d47b00', fontSize: 8 }} />
                      <ReferenceLine y={30} stroke="#ff3333" strokeDasharray="6 3" strokeWidth={1} label={{ value: 'CRITICAL (30d)', position: 'insideBottomRight', fill: '#ff3333', fontSize: 8 }} />
                      <Line type="monotone" dataKey="LSTM" name="LSTM Forecast" stroke="#ffcc00" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                      <Tooltip content={<TacticalTooltip />} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <InterpretationBox icon={Brain} text={survInterp} severity={survSev} />
              </div>
            </section>

            {/* ACTION PANEL REMOVED AS REQUESTED */}

          </div>
        )}
      </div>

      {/* ═══ FOOTER STATUS ═══ */}
      <footer className="h-8 shrink-0 bg-tactical-surface border-t border-tactical-border flex items-center justify-between px-6 z-30">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-tactical-green' : 'bg-tactical-red-bright'} animate-pulse`}></div>
            <span className="text-[9px] font-bold text-tactical-text tracking-widest uppercase">Engine Status: {isRunning ? 'Running' : 'Offline'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield size={12} className="text-tactical-dim" />
            <span className="text-[9px] font-bold text-tactical-dim tracking-widest uppercase">Sentinel Protocol: Active</span>
          </div>
        </div>
        <div className="text-[9px] font-mono text-tactical-dim uppercase tracking-tighter">
          &copy; 2026 ANTIGRAVITY // FLUXSHIELD // S/N: {Math.random().toString(36).substr(2, 6).toUpperCase()}
        </div>
      </footer>
    </div>
  );
}
