import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, ShieldCheck, AlertTriangle, CheckCircle, Loader2, Eye, EyeOff, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../lib/api';

export default function SignupPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('viewer');
  const [institution, setInstitution] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Client-side validation
    if (!username.trim()) { setError('Username is required.'); return; }
    if (!email.trim()) { setError('Email is required.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (!agreed) { setError('You must accept the compliance policy.'); return; }

    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/signup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password,
          role,
          institution: institution.trim(),
        }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess('Account created! Redirecting to dashboard...');
        setTimeout(() => {
          login(data.user);
        }, 1200);
      } else {
        setError(data.message || 'Signup failed.');
      }
    } catch (err) {
      setError('Network error. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full min-h-screen bg-tactical-bg text-tactical-text font-mono overflow-auto relative">
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

          <div className="mb-8">
            <h2 className="text-xs font-bold text-tactical-dim uppercase tracking-[0.2em] mb-1">Onboarding Sequence</h2>
            <p className="text-white text-2xl font-sans font-light">Register Institution</p>
          </div>

          {/* ── Status Messages ── */}
          {error && (
            <div className="mb-6 flex items-center gap-3 bg-[#1a0a0a] border border-red-500/30 px-4 py-3 text-xs text-red-400">
              <AlertTriangle size={16} className="shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="mb-6 flex items-center gap-3 bg-[#0a1a0a] border border-green-500/30 px-4 py-3 text-xs text-green-400">
              <CheckCircle size={16} className="shrink-0" /> {success}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-5">
            
            {/* Username */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-tactical-dim">Username</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. john_doe"
                required
                className="w-full bg-[#111] border border-tactical-border px-4 py-3 text-white text-sm focus:outline-none focus:border-tactical-green transition-colors" 
              />
            </div>

            {/* Institution */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-tactical-dim">Institution Name</label>
              <input 
                type="text" 
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="e.g. Apex Financial Corp"
                className="w-full bg-[#111] border border-tactical-border px-4 py-3 text-white text-sm focus:outline-none focus:border-tactical-green transition-colors" 
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-tactical-dim">Email Address</label>
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@institution.com"
                required
                className="w-full bg-[#111] border border-tactical-border px-4 py-3 text-white text-sm focus:outline-none focus:border-tactical-green transition-colors" 
              />
            </div>
            
            {/* Passwords */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-tactical-dim">Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-[#111] border border-tactical-border px-4 py-3 text-white text-sm focus:outline-none focus:border-tactical-green transition-colors font-mono tracking-widest pr-10" 
                  />
                  <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-white transition-colors">
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-tactical-dim">Confirm</label>
                <input 
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full bg-[#111] border border-tactical-border px-4 py-3 text-white text-sm focus:outline-none focus:border-tactical-green transition-colors font-mono tracking-widest" 
                />
              </div>
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-tactical-dim">Access Level</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'viewer', label: 'Viewer' },
                  { value: 'analyst', label: 'Analyst' },
                  { value: 'executive', label: 'Executive' },
                ].map(r => (
                  <label key={r.value} className={`border p-3 cursor-pointer transition-all flex items-center justify-center gap-2 text-center
                    ${role === r.value ? 'border-tactical-green bg-tactical-green/5 text-tactical-green' : 'border-tactical-border text-[#777] hover:border-[#555]'}`}>
                    <input type="radio" name="role" value={r.value} className="hidden" checked={role === r.value} onChange={() => setRole(r.value)} />
                    <span className="text-[10px] uppercase font-bold tracking-wider">{r.label}</span>
                  </label>
                ))}
              </div>
            </div>


            {/* Compliance Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 bg-[#111] border-tactical-border" />
                <span className="text-[10px] text-[#777] leading-relaxed">
                  I confirm that the institution is authorized to bind to FluxShield standard compliance policies regarding systemic risk monitoring data sharing (Title 12 CFR Part 50).
                </span>
              </label>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-white text-black hover:bg-[#e0e0e0] disabled:bg-[#555] disabled:cursor-not-allowed font-sans font-black text-xs tracking-widest uppercase py-4 transition-colors mt-4 shadow-[0_0_20px_rgba(255,255,255,0.1)] flex justify-center items-center gap-2">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Creating Account...</> : <><UserPlus size={16} /> Create Account</>}
            </button>
          </form>

          <p className="mt-8 text-center text-[10px] text-[#666]">
            Already have an account? <button onClick={() => navigate('/login')} className="text-white hover:underline underline-offset-4">Login Here</button>
          </p>
        </div>
      </div>
    </div>
  );
}
