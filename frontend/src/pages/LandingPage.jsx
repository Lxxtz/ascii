import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Zap, Target, Cpu, ChevronRight, Activity, Globe } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-tactical-text font-mono overflow-y-auto selection:bg-[#333]">
      
      {/* ── HEADER NAVIGATION ── */}
      <header className="fixed top-0 w-full h-16 border-b border-tactical-border bg-black/80 backdrop-blur-md z-50 flex items-center justify-between px-8">
        <div className="flex items-center gap-3">
          <Activity className="text-tactical-dim" size={20} />
          <span className="text-sm font-bold tracking-widest uppercase font-sans text-white">FluxShield System</span>
        </div>
        <div className="flex items-center gap-6 text-[11px] font-bold tracking-widest uppercase">
          <a href="#uniqueness" className="hover:text-white transition-colors">Architecture</a>
          <a href="#productivity" className="hover:text-white transition-colors">Capabilities</a>
          <a href="#how-to" className="hover:text-white transition-colors">Operations</a>
          <button 
            onClick={() => navigate('/login')}
            className="text-tactical-dim hover:text-white transition-colors"
          >
            Access Terminal
          </button>
          <button 
            onClick={() => navigate('/signup')} 
            className="px-4 py-2 border border-tactical-border bg-white/5 hover:bg-white hover:text-black transition-all"
          >
            INITIATE
          </button>
        </div>
      </header>

      {/* ── HERO SECTION ── */}
      <section className="relative pt-32 pb-20 px-8 min-h-[80vh] flex flex-col justify-center items-center text-center overflow-hidden">
        {/* Abstract Background element */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none flex justify-center items-center">
          <div className="w-[800px] h-[800px] border border-tactical-border/50 rounded-full animate-[spin_60s_linear_infinite]"></div>
          <div className="absolute w-[600px] h-[600px] border border-tactical-border/50 rounded-full animate-[spin_40s_linear_infinite_reverse]"></div>
        </div>

        <div className="relative z-10 max-w-4xl max-w-3xl mx-auto flex flex-col items-center">
          <div className="mb-6 px-4 py-1.5 border border-tactical-border bg-black/50 text-[10px] font-bold uppercase tracking-[0.3em] inline-flex items-center gap-2">
            <span className="w-2 h-2 bg-tactical-green rounded-full animate-pulse"></span>
            System Online - Version 2.0.4
          </div>
          
          <h1 className="text-5xl md:text-7xl font-sans font-black tracking-tight leading-none mb-6 text-white uppercase drop-shadow-2xl">
            Detect Liquidity Collapses <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-tactical-green to-blue-500">Before They Occur.</span>
          </h1>

          <p className="text-[#999] text-base md:text-lg max-w-2xl font-mono leading-relaxed mb-10">
            A state-of-the-art predictive simulation engine designed to monitor, forecast, and structurally mitigate intraday run-risk. Because survival is not an accident.
          </p>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/signup')}
              className="flex items-center gap-2 px-8 py-4 bg-white text-black font-sans font-black uppercase tracking-widest text-xs hover:bg-[#e0e0e0] transition-colors"
            >
              Get Started <ChevronRight size={16} />
            </button>
            <button 
              onClick={() => navigate('/login')}
              className="px-8 py-4 border border-tactical-border bg-black/50 font-sans font-bold uppercase tracking-widest text-xs hover:border-white transition-colors"
            >
              Enterprise Login
            </button>
          </div>
        </div>
      </section>

      {/* ── QUOTE OF THE DAY / INSOLVENCY QUOTE ── */}
      <section className="py-20 border-y border-tactical-border bg-[#111]/30">
        <div className="max-w-5xl mx-auto px-8 relative">
          <div className="absolute -left-4 top-0 text-[#222] text-9xl font-sans font-black pointer-events-none">"</div>
          <blockquote className="text-xl md:text-3xl font-sans font-medium text-white leading-relaxed pl-8 border-l-4 border-tactical-red-bright relative z-10">
            "We were told the bank was highly capitalized on Thursday. By Friday morning, $42 billion had evaporated in a digital run. Traditional metrics look backward; modern insolvency happens in real-time."
          </blockquote>
          <div className="mt-6 flex flex-col items-end pr-8">
            <span className="text-tactical-dim text-xs uppercase tracking-widest font-bold">Post-Mortem Analysis</span>
            <span className="text-[#666] text-[10px]">&mdash; 2023 Systemic Liquidity Event</span>
          </div>
        </div>
      </section>

      {/* ── UNIQUENESS (Architecture) ── */}
      <section id="uniqueness" className="py-24 px-8 max-w-6xl mx-auto">
        <div className="mb-16">
          <h2 className="text-xs uppercase tracking-[0.2em] text-tactical-dim mb-2 font-bold font-sans">01 // Architectural Uniqueness</h2>
          <h3 className="text-3xl lg:text-4xl font-sans font-black text-white uppercase">Beyond Static Ratios</h3>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: Cpu, title: 'LSTM Deep Learning', desc: 'Predictive survival horizons calculated continuously using 3-layer recurrent neural networks.' },
            { icon: Zap, title: 'Tick-Level Simulation', desc: 'Models intraday liquidity flows under extreme digital deposit flight constraints.' },
            { icon: Target, title: 'Counterfactual Engine', desc: 'Stress test alternative interventions instantly to secure theoretical HQLA buffers.' }
          ].map((feature, i) => (
            <div key={i} className="border border-tactical-border bg-[#111]/20 p-8 hover:bg-[#111] transition-colors relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <feature.icon size={120} />
              </div>
              <feature.icon className="text-tactical-dim mb-6" size={32} />
              <h4 className="text-sm font-sans font-black text-white uppercase tracking-wider mb-3">{feature.title}</h4>
              <p className="text-[11px] text-[#888] leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRODUCTIVITY ── */}
      <section id="productivity" className="py-24 px-8 border-t border-tactical-border/50 bg-[#0f0f0f]">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2">
            <h2 className="text-xs uppercase tracking-[0.2em] text-tactical-dim mb-2 font-bold font-sans">02 // Capability & Productivity</h2>
            <h3 className="text-3xl lg:text-4xl font-sans font-black text-white uppercase mb-6">Compressing Crisis Response Time</h3>
            <p className="text-sm text-[#999] leading-relaxed mb-8">
              Legacy tools require overnight batch processing. FluxShield evaluates systemic shocks instantly. By integrating market sentiment, NLP headlines, and transaction velocity all in one command-center, ALM teams react within minutes, not days.
            </p>
            <ul className="space-y-4 text-xs font-bold font-sans text-tactical-dim uppercase tracking-widest">
              <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-tactical-green"></span> 99% Reduction in data aggregation latency</li>
              <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-tactical-green"></span> Automated regulatory reporting generation</li>
              <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-tactical-green"></span> Real-time intervention modeling</li>
            </ul>
          </div>
          <div className="lg:w-1/2 w-full glass-panel aspect-video flex items-center justify-center p-8 relative rounded-sm">
            <div className="absolute inset-0 bg-gradient-to-tr from-tactical-bg to-[#222]/20 shadow-inner"></div>
             {/* Mock visual placeholder representing the dashboard */}
            <div className="w-full h-full border border-tactical-border/30 bg-[#000] p-4 flex flex-col gap-2 relative z-10 overflow-hidden shadow-2xl">
               <div className="flex justify-between items-center border-b border-[#333] pb-2 mb-2">
                 <div className="w-24 h-2 bg-[#333]"></div>
                 <div className="w-12 h-2 bg-[#ffaaaa]"></div>
               </div>
               <div className="flex gap-2 h-1/2">
                 <div className="w-2/3 h-full bg-[#111] border border-[#222]"></div>
                 <div className="w-1/3 h-full bg-[#111] border border-[#222]"></div>
               </div>
               <div className="w-full h-1/2 bg-[#111] border border-[#222] mt-2 flex items-end p-2 gap-1">
                 {[40, 20, 60, 30, 80, 50, 90, 70].map((h, i) => (
                   <div key={i} className="flex-1 bg-[#333]/50" style={{ height: `${h}%`}}></div>
                 ))}
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW TO USE ── */}
      <section id="how-to" className="py-24 px-8 max-w-4xl mx-auto text-center border-t border-tactical-border/50">
        <h2 className="text-xs uppercase tracking-[0.2em] text-tactical-dim mb-2 font-bold font-sans">03 // Operations</h2>
        <h3 className="text-3xl lg:text-4xl font-sans font-black text-white uppercase mb-12">Deployment Protocol</h3>

        <div className="grid md:grid-cols-3 gap-6 text-left">
          <div className="p-6 border border-tactical-border bg-black/40 relative">
            <span className="absolute -top-3 left-4 bg-tactical-dim text-black font-black text-xs px-2 py-0.5 font-sans">STEP 1</span>
            <Globe className="text-tactical-dim mb-4" size={24} />
            <h4 className="text-white font-bold text-sm uppercase tracking-wide mb-2">Authenticate</h4>
            <p className="text-[10px] text-[#777]">Set up your institution boundaries and connect to the core API gateways via Role-Based Access controls.</p>
          </div>
          <div className="p-6 border border-tactical-border bg-black/40 relative">
            <span className="absolute -top-3 left-4 bg-tactical-dim text-black font-black text-xs px-2 py-0.5 font-sans">STEP 2</span>
            <Activity className="text-tactical-dim mb-4" size={24} />
            <h4 className="text-white font-bold text-sm uppercase tracking-wide mb-2">Monitor Engine</h4>
            <p className="text-[10px] text-[#777]">Observe the tick-level simulation engine dynamically forecast your LCR over rolling 30-day horizons.</p>
          </div>
          <div className="p-6 border border-tactical-border bg-black/40 relative">
            <span className="absolute -top-3 left-4 bg-tactical-dim text-black font-black text-xs px-2 py-0.5 font-sans">STEP 3</span>
            <Shield className="text-tactical-dim mb-4" size={24} />
            <h4 className="text-white font-bold text-sm uppercase tracking-wide mb-2">Engage Defenses</h4>
            <p className="text-[10px] text-[#777]">When breaches are identified, apply targeted remediation directly from the catalog to restabilize.</p>
          </div>
        </div>
      </section>

      {/* ── FOOTER / CTA ── */}
      <footer className="py-20 border-t border-tactical-border text-center bg-black">
        <h2 className="text-2xl font-bold font-sans text-white uppercase tracking-widest mb-6">Awaiting Initialization Code</h2>
        <div className="flex justify-center flex-wrap gap-4 px-8">
          <button 
            onClick={() => navigate('/signup')}
            className="bg-white text-black px-8 py-3 font-bold text-xs uppercase tracking-[0.2em] hover:bg-[#ccc]"
          >
            Create Authorized Profile
          </button>
          <button 
            onClick={() => navigate('/login')}
            className="border border-tactical-border text-tactical-dim px-8 py-3 font-bold text-xs uppercase tracking-[0.2em] hover:text-white"
          >
            Terminal Login
          </button>
        </div>
        <p className="mt-12 text-[9px] text-[#444] uppercase tracking-widest font-mono">
          &copy; 2026 FluxShield Security Engine // Access Restricted.
        </p>
      </footer>
    </div>
  );
}
