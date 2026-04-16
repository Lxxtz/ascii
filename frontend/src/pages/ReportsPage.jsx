import React, { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Calendar, Download, LogOut, Activity, Search, ShieldCheck, Play, Pause, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

/* ═══════════════════════════════════════════════════════════════════
   DETERMINISTIC DAILY DATA GENERATOR
   Generates realistic institutional liquidity data for every single
   day in the requested date range. Uses a seeded PRNG so the same
   dates always produce the same numbers.
   ═══════════════════════════════════════════════════════════════════ */

function seedRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const TX_TYPES = ['Deposit', 'Withdrawal', 'Settlement', 'Lending', 'Repo', 'Penalty', 'Liquidation', 'Maturity'];
const TX_DESCS = {
  Deposit:     ['Retail Inflow (Regional)', 'Institutional Inflow (Pension)', 'Corporate Treasury Deposit', 'Government Bond Coupon', 'Interbank Deposit Received'],
  Withdrawal:  ['Corporate Deposit Flight', 'Retail Outflow (Digital)', 'Insurance Claims Outflow', 'Wholesale Funding Run-off', 'Large Depositor Redemption'],
  Settlement:  ['Overnight Repo Facility', 'Interbank Lending (Outflow)', 'Derivative Margin Settlement', 'FX Swap Settlement', 'Cross-border Wire Transfer'],
  Lending:     ['Commercial Loan Disbursement', 'Mortgage Portfolio Funding', 'SME Credit Facility Draw', 'Syndicated Loan Participation', 'Trade Finance LC Issuance'],
  Repo:        ['Reverse Repo Maturity', 'Tri-party Repo Rollover', 'Securities Lending Collateral', 'Central Bank Repo Facility', 'Overnight Repo Renewal'],
  Penalty:     ['Discount Window Borrowing Cost', 'Regulatory Penalty Assessment', 'Late Settlement Fee', 'Capital Surcharge Accrual', 'Operational Risk Penalty'],
  Liquidation: ['Emergency HQLA Sell-off (L1)', 'Level 2A Asset Liquidation', 'Portfolio Rebalance Sale', 'Distressed Asset Disposal', 'HQLA Buffer Rebuild'],
  Maturity:    ['Treasury Bill Maturity', 'Certificate of Deposit Maturity', 'Commercial Paper Maturity', 'Sovereign Bond Coupon', 'Agency Bond Redemption'],
};

function generateDailyData(startStr, endStr) {
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(start) || isNaN(end) || start > end) return [];

  const days = [];
  const cur = new Date(start);

  // Initial state
  let poolBalance = 10_500_000_000;
  let hqla        = 19_500_000;
  let nlp         = 19_500_000;
  let lcr         = 188.70;
  let nsfr        = 112.40;
  let ldr         = 71.09;
  let lstm        = 347;
  let txCounter   = 9001;

  while (cur <= end) {
    const dateStr = cur.toISOString().slice(0, 10);
    const daySeed = cur.getFullYear() * 10000 + (cur.getMonth() + 1) * 100 + cur.getDate();
    const rng = seedRandom(daySeed);

    // Daily flows — realistic institutional scale
    const dailyDeposits    = Math.round((200_000_000 + rng() * 1_800_000_000) / 1000) * 1000;
    const dailyWithdrawals = Math.round((150_000_000 + rng() * 1_500_000_000) / 1000) * 1000;
    const loansIssued      = Math.round((50_000_000 + rng() * 800_000_000) / 1000) * 1000;
    const loansRepaid      = Math.round((40_000_000 + rng() * 600_000_000) / 1000) * 1000;

    const netCashflow = dailyDeposits - dailyWithdrawals;
    poolBalance += netCashflow;
    if (poolBalance < 1_000_000_000) poolBalance = 1_000_000_000 + Math.round(rng() * 500_000_000);

    // KPI drift
    hqla = Math.max(5_000_000, hqla + (netCashflow > 0 ? rng() * 800_000 : -(rng() * 600_000)));
    nlp  = Math.max(1_000_000, nlp + (netCashflow > 0 ? rng() * 700_000 : -(rng() * 500_000)));
    lcr  = Math.max(85, Math.min(250, lcr + (netCashflow > 0 ? rng() * 5 : -(rng() * 8))));
    nsfr = Math.max(90, Math.min(150, nsfr + (rng() - 0.5) * 3));
    ldr  = Math.max(55, Math.min(95, ldr + (rng() - 0.48) * 2));
    lstm = Math.max(30, Math.min(365, Math.round(lstm + (netCashflow > 0 ? rng() * 8 : -(rng() * 12)))));

    // Pick transaction type based on net flow direction
    let type;
    if (netCashflow > 500_000_000) type = 'Deposit';
    else if (netCashflow < -500_000_000) type = 'Withdrawal';
    else {
      const typeIdx = Math.floor(rng() * TX_TYPES.length);
      type = TX_TYPES[typeIdx];
    }
    const descList = TX_DESCS[type];
    const desc = descList[Math.floor(rng() * descList.length)];

    const status = lcr < 100 ? 'Critical' : lcr < 120 ? 'Warning' : 'Completed';
    const kpiStatus = lcr < 100 ? 'CRITICAL' : lcr < 120 ? 'WARNING' : 'SOLVENT';

    days.push({
      id: `TX-${txCounter++}`,
      date: dateStr,
      type,
      desc,
      dailyDeposits,
      dailyWithdrawals,
      netCashflow,
      loansIssued,
      loansRepaid,
      poolBalance: Math.round(poolBalance),
      hqla: Math.round(hqla),
      nlp: Math.round(nlp),
      lcr: Math.round(lcr * 100) / 100,
      nsfr: Math.round(nsfr * 100) / 100,
      ldr: Math.round(ldr * 100) / 100,
      lstm,
      status,
      kpiStatus,
    });

    cur.setDate(cur.getDate() + 1);
  }

  return days;
}

const apiUrl = (path) => `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${path}`;

export default function ReportsPage() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const role = user?.role?.toLowerCase() || 'executive';
  if (role === 'viewer') {
    return (
      <div className="flex flex-col w-full h-screen bg-tactical-bg text-tactical-text font-mono items-center justify-center gap-4">
        <Activity size={48} className="text-tactical-red-bright animate-pulse" />
        <h1 className="text-xl font-sans font-black text-white uppercase tracking-tighter">Access Restricted</h1>
        <p className="text-sm text-[#777] max-w-xs text-center">Your account level (Viewer) does not have authorization to access Institutional Ledgers.</p>
        <button onClick={() => navigate('/dashboard')} className="mt-4 px-6 py-2 border border-tactical-border text-tactical-dim text-xs uppercase font-bold hover:text-white hover:border-white transition-all">
          Return to Dashboard
        </button>
      </div>
    );
  }

  const [startDate, setStartDate] = useState('2026-03-01');
  const [endDate, setEndDate] = useState('2026-04-30');
  const [searchQuery, setSearchQuery] = useState('');
  const tableRef = useRef(null);

  const formatCurrency = (val) => {
    if (val === 0) return '$0.00';
    const isNeg = val < 0;
    const absVal = Math.abs(val);
    if (absVal >= 1e9) return `${isNeg ? '-' : ''}$${(absVal / 1e9).toFixed(2)}B`;
    if (absVal >= 1e6) return `${isNeg ? '-' : ''}$${(absVal / 1e6).toFixed(2)}M`;
    if (absVal >= 1e3) return `${isNeg ? '-' : ''}$${(absVal / 1e3).toFixed(1)}K`;
    return `${isNeg ? '-' : ''}$${absVal.toFixed(2)}`;
  };
  // ── Engine Controls ──
  const [isRunning, setIsRunning] = useState(false);
  const startSim = () => setIsRunning(true);
  const pauseSim = () => setIsRunning(false);
  
  const resetSim = async () => {
    if (!user?.id) return;
    try {
      await fetch(apiUrl('/api/start'), { 
        method: 'POST',
        headers: { 'X-User-ID': user.id.toString() }
      });
      setIsRunning(false);
    } catch (e) {
      console.error('[Reports] reset error:', e);
    }
  };

  // ── Generate daily data for the full date range ──
  const dailyData = useMemo(() => {
    const all = generateDailyData(startDate, endDate);
    if (!searchQuery) return all;
    const q = searchQuery.toLowerCase();
    return all.filter(d =>
      d.id.toLowerCase().includes(q) ||
      d.desc.toLowerCase().includes(q) ||
      d.type.toLowerCase().includes(q)
    );
  }, [startDate, endDate, searchQuery]);

  // ── Export PDF ──
  const exportPDF = () => {
    if (!tableRef.current) return;
    html2canvas(tableRef.current, { backgroundColor: '#0a0a0a', scale: 2 }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth() - 40;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.setFillColor(10, 10, 10);
      pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), 'F');
      pdf.setFontSize(16);
      pdf.setTextColor(255, 255, 255);
      pdf.text('FluxShield \u2014 Official Institutional Statement', 20, 30);
      pdf.setFontSize(9);
      pdf.setTextColor(120, 120, 120);
      pdf.text(`Role: ${role.toUpperCase()} | Period: ${startDate} to ${endDate} | Generated: ${new Date().toISOString().slice(0, 10)}`, 20, 45);
      pdf.addImage(imgData, 'PNG', 20, 60, pdfWidth, pdfHeight);
      pdf.save(`FluxShield_Statement_${startDate}_${endDate}.pdf`);
    });
  };

  // ── Export Excel ──
  const exportExcel = () => {
    const showBalance = role === 'executive' || role === 'admin';
    const rows = [];

    rows.push(['FluxShield \u2014 Institutional Liquidity Report']);
    rows.push(['Generated', new Date().toISOString().slice(0, 10), '', 'Role', role.toUpperCase(), '', 'Period', `${startDate} to ${endDate}`, '', `Total Days: ${dailyData.length}`]);
    rows.push([]);

    // Header
    const header = [
      'Day #', 'Date', 'Tx ID', 'Type', 'Description',
      'Daily Deposits (USD)', 'Daily Withdrawals (USD)', 'Net Cashflow (USD)',
      'Loans Issued (USD)', 'Loans Repaid (USD)',
    ];
    if (showBalance) header.push('Pool Balance (USD)');
    header.push('HQLA Buffer (USD)', 'Net Liquidity (USD)', 'LCR (%)', 'NSFR (%)', 'L-to-D Ratio (%)', 'LSTM Survival (days)', 'Solvency Status', 'Protocol Flag');
    rows.push(header);

    dailyData.forEach((d, idx) => {
      const row = [
        idx + 1,
        d.date,
        d.id,
        d.type,
        d.desc,
        d.dailyDeposits,
        d.dailyWithdrawals,
        d.netCashflow,
        d.loansIssued,
        d.loansRepaid,
      ];
      if (showBalance) row.push(d.poolBalance);
      row.push(d.hqla, d.nlp, d.lcr, d.nsfr, d.ldr, d.lstm, d.kpiStatus, d.status);
      rows.push(row);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Professional column widths
    const cols = [
      { wch: 7 },  { wch: 12 }, { wch: 10 }, { wch: 13 }, { wch: 40 },
      { wch: 22 }, { wch: 22 }, { wch: 20 },
      { wch: 18 }, { wch: 18 },
    ];
    if (showBalance) cols.push({ wch: 22 });
    cols.push({ wch: 18 }, { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 16 }, { wch: 20 }, { wch: 16 }, { wch: 14 });
    ws['!cols'] = cols;

    XLSX.utils.book_append_sheet(wb, ws, 'FluxShield Report');
    XLSX.writeFile(wb, `FluxShield_Report_${startDate}_${endDate}.xlsx`);
  };

  return (
    <div className="flex flex-col w-full h-screen bg-tactical-bg text-tactical-text font-mono overflow-auto selection:bg-[#333]">
      {/* ── TOP NAV ── */}
      <header className="h-14 shrink-0 border-b border-tactical-border flex items-center justify-between px-6 bg-tactical-surface sticky top-0 z-30">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <Activity className="text-tactical-green animate-pulse" size={18} />
            <span className="text-xs font-bold tracking-widest text-white font-sans uppercase">FluxShield</span>
          </div>
          <div className="h-4 w-px bg-tactical-border/50"></div>
          <nav className="flex gap-4">
            <button onClick={() => navigate('/dashboard')} className="text-[10px] uppercase font-bold text-tactical-dim hover:text-white transition-colors">Live Dashboard</button>
            <button className="text-[10px] uppercase font-bold text-white transition-colors border-b-2 border-white pb-1">Reports & Ledgers</button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {/* Simulation Controls (Added for Viewer/Analyst/Executive) */}
          <div className="flex items-center gap-2">
            <button onClick={isRunning ? pauseSim : startSim}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-sans font-bold uppercase tracking-widest transition-all border ${
                isRunning ? 'border-tactical-green text-tactical-green' : 'border-white text-white bg-white/5'
              }`}>
              {isRunning ? <Pause size={12} /> : <Play size={12} />}
              {isRunning ? 'RUNNING' : 'START SIM'}
            </button>
            <button onClick={resetSim}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-sans font-bold uppercase tracking-widest border border-tactical-border text-tactical-dim hover:text-white transition-all">
              <RefreshCw size={12} /> RESET
            </button>
          </div>

          <div className="h-6 w-px bg-tactical-border/50 mx-1"></div>

          <div className="flex items-center gap-2 text-[10px] font-bold text-tactical-dim uppercase bg-black/50 px-3 py-1.5 border border-tactical-border">
             <div className="w-1.5 h-1.5 bg-tactical-green rounded-full"></div> Role: {user?.role || 'Executive'}
          </div>
          <button onClick={logout} className="text-tactical-dim hover:text-tactical-red-bright transition-colors" title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* ── REPORTS CONTENT ── */}
      <div className="p-8 max-w-[1600px] mx-auto w-full flex-1">

        {/* ── HEADER & EXPORTS ── */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-2xl font-sans font-black text-white uppercase tracking-tighter mb-2 flex items-center gap-3">
              <FileText size={24} className="text-tactical-dim" /> Official Bank Statement
            </h1>
            <p className="text-[11px] text-[#777] uppercase tracking-widest">
              Daily Institutional Liquidity Ledger — All Components — Restricted Access
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={exportExcel} className="flex items-center gap-2 bg-tactical-green/10 text-tactical-green border border-tactical-green/30 px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-tactical-green hover:text-black transition-all shadow-[0_0_12px_rgba(34,197,94,0.15)]">
              <Download size={14} /> Export Excel
            </button>
            <button onClick={exportPDF} className="flex items-center gap-2 bg-white text-black px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-[#e0e0e0] transition-colors shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              <Download size={14} /> Export PDF
            </button>
          </div>
        </div>

        {/* ── FILTERS ── */}
        <div className="bg-[#111]/50 border border-tactical-border p-4 mb-8 flex flex-wrap gap-6 items-end rounded-sm relative shadow-2xl">
          <div className="space-y-2">
            <label className="text-[9px] uppercase font-bold text-tactical-dim tracking-widest block">Start Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-tactical-dim pointer-events-none" size={14} />
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="bg-black border border-tactical-border text-white text-xs px-3 py-2 pl-9 focus:outline-none focus:border-white transition-colors"
                style={{ colorScheme: 'dark' }} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[9px] uppercase font-bold text-tactical-dim tracking-widest block">End Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-tactical-dim pointer-events-none" size={14} />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="bg-black border border-tactical-border text-white text-xs px-3 py-2 pl-9 focus:outline-none focus:border-white transition-colors"
                style={{ colorScheme: 'dark' }} />
            </div>
          </div>
          <div className="space-y-2 flex-1 min-w-[200px]">
            <label className="text-[9px] uppercase font-bold text-tactical-dim tracking-widest block">Search</label>
            <div className="relative w-full">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tactical-dim pointer-events-none" size={14} />
               <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tx ID, Type, or Description..."
                  className="w-full bg-black border border-tactical-border text-white text-xs px-3 py-2 pl-9 focus:outline-none focus:border-white transition-colors placeholder:text-[#444]" />
            </div>
          </div>
          <div className="px-4 py-2 border border-tactical-border bg-black/50 text-[10px] font-bold text-tactical-dim uppercase flex items-center h-[34px] mb-[1px]">
             {dailyData.length} Days
          </div>
        </div>

        {/* ── TABLE ── */}
        <div ref={tableRef} className="border border-tactical-border bg-black/40 overflow-x-auto rounded-sm">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-[#1a1a1a] border-b border-tactical-border text-[9px] uppercase tracking-widest text-[#777] font-bold">
                <th className="px-4 py-3">Day</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Tx ID</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Deposits</th>
                <th className="px-4 py-3 text-right">Withdrawals</th>
                <th className="px-4 py-3 text-right">Net Cashflow</th>
                {['executive', 'admin'].includes(role) && <th className="px-4 py-3 text-right">Pool Balance</th>}
                <th className="px-4 py-3 text-right">LCR %</th>
                <th className="px-4 py-3 text-right">Net Liquidity</th>
                <th className="px-4 py-3 text-right">LDR %</th>
                <th className="px-4 py-3 text-right">LSTM</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {dailyData.map((d, idx) => (
                <tr key={idx} className="border-b border-tactical-border/30 hover:bg-[#111] transition-colors">
                  <td className="px-4 py-3 text-[10px] text-[#666]">{idx + 1}</td>
                  <td className="px-4 py-3 text-[11px] text-[#aaa]">{d.date}</td>
                  <td className="px-4 py-3 text-[10px] font-bold text-[#888]">{d.id}</td>
                  <td className="px-4 py-3 text-[10px] uppercase font-bold text-[#ccc]">{d.type}</td>
                  <td className="px-4 py-3 text-[11px] text-white max-w-[200px] truncate">{d.desc}</td>
                  <td className="px-4 py-3 text-right text-[11px] text-tactical-green">{formatCurrency(d.dailyDeposits)}</td>
                  <td className="px-4 py-3 text-right text-[11px] text-tactical-red-bright">{formatCurrency(d.dailyWithdrawals)}</td>
                  <td className={`px-4 py-3 text-right text-[11px] font-bold ${d.netCashflow >= 0 ? 'text-tactical-green' : 'text-tactical-red-bright'}`}>
                    {d.netCashflow >= 0 ? '+' : ''}{formatCurrency(d.netCashflow)}
                  </td>
                  {['executive', 'admin'].includes(role) && (
                    <td className="px-4 py-3 text-right text-[11px] font-mono text-white">{formatCurrency(d.poolBalance)}</td>
                  )}
                  <td className={`px-4 py-3 text-right text-[11px] font-bold ${d.lcr < 100 ? 'text-tactical-red-bright' : d.lcr < 120 ? 'text-tactical-orange' : 'text-white'}`}>{d.lcr}%</td>
                  <td className="px-4 py-3 text-right text-[11px] text-white">{formatCurrency(d.nlp)}</td>
                  <td className="px-4 py-3 text-right text-[11px] text-white">{d.ldr}%</td>
                  <td className={`px-4 py-3 text-right text-[11px] font-bold ${d.lstm < 100 ? 'text-tactical-orange' : 'text-white'}`}>{d.lstm}d</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 text-[8px] uppercase tracking-widest font-bold border rounded-sm
                      ${d.kpiStatus === 'SOLVENT' ? 'border-tactical-green text-tactical-green bg-tactical-green/5' :
                        d.kpiStatus === 'WARNING' ? 'border-tactical-orange text-tactical-orange bg-tactical-orange/5' :
                        'border-tactical-red-bright text-tactical-red-bright bg-tactical-red-bright/10 animate-pulse'}
                    `}>{d.kpiStatus}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {dailyData.length === 0 && (
            <div className="p-12 text-center text-[#555] text-xs uppercase tracking-widest">
              No data for the selected date range.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
