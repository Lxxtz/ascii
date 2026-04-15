import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSignup = (e) => {
    e.preventDefault();
    login({ type: 'new', role: 'admin' });
  };

  return (
    <div className="flex w-full min-h-screen bg-tactical-bg text-tactical-text font-mono overflow-auto">
      {/* ── LEFT SIDE (Visuals) ── */}
      <div className="hidden lg:flex w-1/2 bg-[#090909] relative flex-col justify-center px-16 border-r border-tactical-border/50">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none text-tactical-green"></div>
        <div className="relative z-10">
          <ShieldCheck size={48} className="text-tactical-dim mb-8" />
          <h1 className="text-5xl font-sans font-black text-white uppercase tracking-tighter mb-4">
            Initialize<br />Instance
          </h1>
          <p className="text-sm text-[#777] max-w-sm leading-relaxed mb-8">
            Deploy a dedicated FluxShield monitoring node for your institution. Connect your structural ledgers to our LSTM deep learning network to identify hidden intraday run vulnerabilities.
          </p>
          <div className="space-y-3">
             <div className="flex items-center gap-3">
               <div className="w-1.5 h-1.5 bg-tactical-dim"></div>
               <span className="text-[10px] uppercase font-bold text-[#666]">End-to-End Encryption</span>
             </div>
             <div className="flex items-center gap-3">
               <div className="w-1.5 h-1.5 bg-tactical-dim"></div>
               <span className="text-[10px] uppercase font-bold text-[#666]">Automated Stress Testing</span>
             </div>
             <div className="flex items-center gap-3">
               <div className="w-1.5 h-1.5 bg-tactical-dim"></div>
               <span className="text-[10px] uppercase font-bold text-[#666]">Regulatory Reporting Generation</span>
             </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT SIDE (Form) ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-[#0d0d0d] relative py-12">
        <div className="w-full max-w-md p-8">
          
          <div className="mb-10 lg:hidden">
            <ShieldCheck size={32} className="text-tactical-dim mb-4" />
            <h1 className="text-3xl font-sans font-black text-white uppercase tracking-tighter">FluxShield</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-xs font-bold text-tactical-dim uppercase tracking-[0.2em] mb-1">Onboarding Sequence</h2>
            <p className="text-white text-2xl font-sans font-light">Register Institution</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-tactical-dim">Institution Name</label>
              <input 
                type="text" 
                placeholder="e.g. Apex Financial Corp"
                required
                className="w-full bg-[#111] border border-tactical-border px-4 py-3 text-white text-sm focus:outline-none focus:border-tactical-green transition-colors" 
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-tactical-dim">Administrator Email</label>
              <input 
                type="email" 
                placeholder="admin@institution.com"
                required
                className="w-full bg-[#111] border border-tactical-border px-4 py-3 text-white text-sm focus:outline-none focus:border-tactical-green transition-colors" 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-tactical-dim">Root Password</label>
                <input 
                  type="password"
                  required
                  className="w-full bg-[#111] border border-tactical-border px-4 py-3 text-white text-sm focus:outline-none focus:border-tactical-green transition-colors font-mono tracking-widest" 
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-tactical-dim">Confirm Password</label>
                <input 
                  type="password" 
                  required
                  className="w-full bg-[#111] border border-tactical-border px-4 py-3 text-white text-sm focus:outline-none focus:border-tactical-green transition-colors font-mono tracking-widest" 
                />
              </div>
            </div>

            <div className="space-y-2">
               <label className="block text-[10px] font-bold uppercase tracking-widest text-tactical-dim">Estimated Asset Under Management (AUM)</label>
               <select className="w-full bg-[#111] border border-tactical-border px-4 py-3 text-[#999] text-sm focus:outline-none focus:border-tactical-green transition-colors appearance-none">
                 <option value="" disabled selected>Select AUM Range</option>
                 <option value="tier1">$10B - $50 Billion (Regional / Mid-Cap)</option>
                 <option value="tier2">$50B - $250 Billion (Large-Cap Institutional)</option>
                 <option value="tier3">&gt; $250 Billion (Tier 1 Systemic Risk)</option>
               </select>
            </div>

            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" required className="mt-1 bg-[#111] border-tactical-border" />
                <span className="text-[10px] text-[#777] leading-relaxed">
                  I confirm that the institution is authorized to bind to FluxShield standard compliance policies regarding systemic risk monitoring data sharing (Title 12 CFR Part 50).
                </span>
              </label>
            </div>

            <button type="submit" className="w-full bg-white text-black hover:bg-[#e0e0e0] font-sans font-black text-xs tracking-widest uppercase py-4 transition-colors mt-4 shadow-[0_0_20px_rgba(255,255,255,0.1)] flex justify-center items-center gap-2">
              <UserPlus size={16} /> Deploy Private Engine
            </button>
          </form>

          <p className="mt-8 text-center text-[10px] text-[#666]">
            Already deployed? <button onClick={() => navigate('/login')} className="text-white hover:underline underline-offset-4">Authenticate</button>
          </p>
        </div>
      </div>
    </div>
  );
}
