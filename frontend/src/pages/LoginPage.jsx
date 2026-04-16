import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ShieldAlert, Cpu, AlertTriangle, CheckCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../lib/api';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim()) { setError('Email is required.'); return; }
    if (!password) { setError('Password is required.'); return; }

    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess(`Welcome back, ${data.user.username}! Redirecting...`);
        setTimeout(() => {
          login(data.user);
        }, 1000);
      } else {
        setError(data.message || 'Authentication failed.');
      }
    } catch (err) {
      setError('Network error. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full h-screen bg-tactical-bg text-tactical-text font-mono overflow-hidden relative">
      {/* ➲ Clickable Institutional Logo (Top Left Corner) */}
      <div 
        className="absolute top-8 left-8 flex items-center gap-2 cursor-pointer group z-50 px-4 py-2 bg-black/40 backdrop-blur-md border border-tactical-border/50 rounded-sm hover:border-tactical-green/50 transition-all" 
        onClick={() => navigate('/')}
      >
        <Activity className="text-tactical-green group-hover:animate-pulse" size={18} />
        <span className="text-xs font-sans font-black text-white uppercase tracking-widest transition-opacity group-hover:opacity-70">FluxShield</span>
      </div>

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
               Status: Secured
             </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT SIDE (Form) ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-[#0d0d0d] relative">
        <div className="w-full max-w-md p-8">

          <div className="mb-8">
            <h2 className="text-xs font-bold text-tactical-dim uppercase tracking-[0.2em] mb-1">Terminal Access</h2>
            <p className="text-white text-2xl font-sans font-light">Authenticate Identity</p>
          </div>

          {/* ── Status Messages ── */}
          {error && (
            <div className="mb-6 flex items-center gap-3 bg-[#1a0a0a] border border-red-500/30 px-4 py-3 text-xs text-red-400 animate-pulse">
              <AlertTriangle size={16} className="shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="mb-6 flex items-center gap-3 bg-[#0a1a0a] border border-green-500/30 px-4 py-3 text-xs text-green-400">
              <CheckCircle size={16} className="shrink-0" /> {success}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">

            {/* Email */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-tactical-dim">Email Address</label>
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoComplete="email"
                className="w-full bg-[#111] border border-tactical-border px-4 py-3 text-white text-sm focus:outline-none focus:border-tactical-green transition-colors" 
              />
            </div>
            
            {/* Password */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-tactical-dim">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full bg-[#111] border border-tactical-border px-4 py-3 text-white text-sm focus:outline-none focus:border-tactical-green transition-colors font-mono tracking-widest pr-10" 
                />
                <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-white transition-colors">
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-tactical-dim hover:bg-white disabled:bg-[#555] disabled:cursor-not-allowed text-black font-sans font-black text-xs tracking-widest uppercase py-4 transition-colors mt-4 shadow-[0_0_20px_rgba(255,255,255,0.05)] flex justify-center items-center gap-2">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Authenticating...</> : 'Initiate Login Sequence'}
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
