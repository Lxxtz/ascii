import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ShieldAlert, Cpu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('executive');

  const handleLogin = (e) => {
    e.preventDefault();
    login({ type: 'enterprise', role });
  };

  return (
    <div className="flex w-full h-screen bg-tactical-bg text-tactical-text font-mono overflow-hidden">
      {/* ── LEFT SIDE (Visuals) ── */}
      <div className="hidden lg:flex w-1/2 bg-[#090909] relative flex-col justify-center px-16 border-r border-tactical-border/50">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>
        <div className="relative z-10">
          <Activity size={48} className="text-tactical-dim mb-8" />
          <h1 className="text-5xl font-sans font-black text-white uppercase tracking-tighter mb-4">
            Command<br />Center
          </h1>
          <p className="text-sm text-[#777] max-w-sm leading-relaxed mb-8">
            Access the FluxShield liquidity risk engine. Monitoring tick-level cashflow fluctuations in real-time. Unauthorized access is strictly logged and prosecuted under systemic regulations.
          </p>
          <div className="flex gap-4">
             <div className="px-3 py-1.5 border border-tactical-border text-[9px] uppercase tracking-widest text-[#555] font-bold">
               Protocol: Alpha
             </div>
             <div className="px-3 py-1.5 border border-tactical-border text-[9px] uppercase tracking-widest text-[#555] font-bold">
               Status: Verified
             </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT SIDE (Form) ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-[#0d0d0d] relative">
        <div className="w-full max-w-md p-8">
          
          <div className="mb-10 lg:hidden">
            <Activity size={32} className="text-tactical-dim mb-4" />
            <h1 className="text-3xl font-sans font-black text-white uppercase tracking-tighter">FluxShield</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-xs font-bold text-tactical-dim uppercase tracking-[0.2em] mb-1">Terminal Access</h2>
            <p className="text-white text-2xl font-sans font-light">Authenticate Identity</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-tactical-dim">Role Selection</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className={`border p-3 cursor-pointer transition-all flex items-center justify-center gap-2 ${role === 'viewer' ? 'border-tactical-green bg-tactical-green/5 text-tactical-green' : 'border-tactical-border text-[#777] hover:border-[#555]'}`}>
                  <input type="radio" name="role" value="viewer" className="hidden" checked={role === 'viewer'} onChange={() => setRole('viewer')} />
                  <Activity size={14} />
                  <span className="text-[10px] uppercase font-bold tracking-wider">Viewer</span>
                </label>
                <label className={`border p-3 cursor-pointer transition-all flex items-center justify-center gap-2 ${role === 'analyst' ? 'border-tactical-green bg-tactical-green/5 text-tactical-green' : 'border-tactical-border text-[#777] hover:border-[#555]'}`}>
                  <input type="radio" name="role" value="analyst" className="hidden" checked={role === 'analyst'} onChange={() => setRole('analyst')} />
                  <Cpu size={14} />
                  <span className="text-[10px] uppercase font-bold tracking-wider">Analyst</span>
                </label>
                <label className={`border p-3 cursor-pointer transition-all flex items-center justify-center gap-2 ${role === 'executive' ? 'border-tactical-green bg-tactical-green/5 text-tactical-green' : 'border-tactical-border text-[#777] hover:border-[#555]'}`}>
                  <input type="radio" name="role" value="executive" className="hidden" checked={role === 'executive'} onChange={() => setRole('executive')} />
                  <ShieldAlert size={14} />
                  <span className="text-[10px] uppercase font-bold tracking-wider">Executive</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-tactical-dim">Email Address</label>
              <input 
                type="email" 
                defaultValue="admin@fluxshield.com"
                className="w-full bg-[#111] border border-tactical-border px-4 py-3 text-white text-sm focus:outline-none focus:border-tactical-green transition-colors" 
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-tactical-dim">Access Key (Password)</label>
              <input 
                type="password" 
                defaultValue="••••••••"
                className="w-full bg-[#111] border border-tactical-border px-4 py-3 text-white text-sm focus:outline-none focus:border-tactical-green transition-colors font-mono tracking-widest" 
              />
            </div>

            <button type="submit" className="w-full bg-tactical-dim hover:bg-white text-black font-sans font-black text-xs tracking-widest uppercase py-4 transition-colors mt-4 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
              Initiate Login Sequence
            </button>
          </form>

          <p className="mt-8 text-center text-[10px] text-[#666]">
            New Enterprise Node? <button onClick={() => navigate('/signup')} className="text-tactical-dim hover:text-white underline underline-offset-4">Register Here</button>
          </p>
        </div>
      </div>
    </div>
  );
}
