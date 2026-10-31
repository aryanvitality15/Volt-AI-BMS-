import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Zap,
  Lock,
  Mail,
  User,
  KeyRound,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Terminal,
  Activity,
  Layers
} from 'lucide-react';
import { api, OperatorProfile } from '../services/api';

export type OperatorRole = 'BMS Engineer' | 'Fleet Admin' | 'Read-Only Auditor';

export interface OperatorSession {
  user_id: string;
  name: string;
  email: string;
  role: OperatorRole;
  authMethod: 'password' | 'demo' | 'token';
  primary_battery_id?: string;
  sessionExpiry?: number;
  timestamp: string;
}

interface VoltLoginGatewayProps {
  onLoginSuccess: (session: OperatorSession) => void;
}

export const VoltLoginGateway: React.FC<VoltLoginGatewayProps> = ({ onLoginSuccess }) => {
  // Modes: 'signin' | 'signup' | 'forgot' | 'reset'
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot' | 'reset'>('signin');

  // Form Fields
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [role, setRole] = useState<OperatorRole>('BMS Engineer');
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [resetToken, setResetToken] = useState<string>('');

  // UX Feedback & State
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);

  // 3D Parallax Tilt State
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const normalizedX = (e.clientX - centerX) / (rect.width / 2);
    const normalizedY = (e.clientY - centerY) / (rect.height / 2);
    setTilt({
      x: Number((-Math.max(-1, Math.min(1, normalizedY)) * 4.0).toFixed(2)),
      y: Number((Math.max(-1, Math.min(1, normalizedX)) * 4.0).toFixed(2))
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  const handleKeyModifierCheck = (e: React.KeyboardEvent) => {
    if (typeof e.getModifierState === 'function') {
      setIsCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  // Email Format Validation
  const isEmailValid = email.length > 0 && /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(email);

  // 4-Bar Password Strength Calculator
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'Empty', color: 'bg-slate-700' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    switch (score) {
      case 1:
        return { score: 1, label: 'Weak', color: 'bg-rose-500' };
      case 2:
        return { score: 2, label: 'Fair', color: 'bg-amber-500' };
      case 3:
        return { score: 3, label: 'Good', color: 'bg-cyan-400' };
      case 4:
        return { score: 4, label: 'Production Grade', color: 'bg-emerald-400' };
      default:
        return { score: 1, label: 'Weak', color: 'bg-rose-500' };
    }
  };

  const strength = getPasswordStrength(password);

  const triggerError = (msg: string) => {
    setErrorMessage(msg);
    setSuccessMessage(null);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const finalizeSession = (userProfile: OperatorProfile, authMethod: 'password' | 'demo' | 'token') => {
    const sessionData: OperatorSession = {
      user_id: userProfile.user_id,
      name: userProfile.name,
      email: userProfile.email,
      role: (userProfile.role as OperatorRole) || 'BMS Engineer',
      authMethod,
      primary_battery_id: userProfile.primary_battery_id,
      sessionExpiry: Date.now() + 30 * 24 * 60 * 60 * 1000,
      timestamp: new Date().toISOString()
    };
    try {
      localStorage.setItem('volt_bms_session', JSON.stringify(sessionData));
    } catch {
      // Ignore
    }
    onLoginSuccess(sessionData);
  };

  // Handle Login
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email || !isEmailValid) {
      triggerError('Please enter a valid operator email address.');
      return;
    }
    if (!password) {
      triggerError('Please enter your account password.');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Verifying credentials & establishing secure session...');

    try {
      const res = await api.login(email, password, rememberMe);
      setIsLoading(false);
      setSuccessMessage('Authentication verified. Loading telemetry lab...');
      setTimeout(() => {
        finalizeSession(res.user, 'password');
      }, 400);
    } catch (err: any) {
      setIsLoading(false);
      triggerError(err.message || 'Login failed. Please check credentials.');
    }
  };

  // Handle Registration
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      triggerError('Please enter your full name for access provisioning.');
      return;
    }
    if (!email || !isEmailValid) {
      triggerError('Please enter a valid operator email address.');
      return;
    }
    if (!password || password.length < 6) {
      triggerError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      triggerError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Provisioning operator identity and battery pack...');

    try {
      const res = await api.register(name, email, password, role);
      setIsLoading(false);
      setSuccessMessage('Account registered successfully! Entering Neural Lab...');
      setTimeout(() => {
        finalizeSession(res.user, 'password');
      }, 500);
    } catch (err: any) {
      setIsLoading(false);
      triggerError(err.message || 'Registration failed. Please try a different email.');
    }
  };

  // Handle Forgot Password Request
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email || !isEmailValid) {
      triggerError('Please enter your registered operator email address.');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Generating cryptographically secure reset token...');

    try {
      const res = await api.forgotPassword(email);
      setIsLoading(false);
      setResetToken(res.reset_token);
      setSuccessMessage('Reset token generated! Enter your new password below.');
      setMode('reset');
    } catch (err: any) {
      setIsLoading(false);
      triggerError(err.message || 'Password recovery request failed.');
    }
  };

  // Handle Password Reset Execution
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!resetToken.trim()) {
      triggerError('Please enter the reset token.');
      return;
    }
    if (!password || password.length < 6) {
      triggerError('New password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      triggerError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Updating password hash & invalidating prior sessions...');

    try {
      const res = await api.resetPassword(resetToken, password);
      setIsLoading(false);
      setSuccessMessage('Password reset successfully! Please sign in with your new credentials.');
      setMode('signin');
      setPassword('');
      setConfirmPassword('');
      setResetToken('');
    } catch (err: any) {
      setIsLoading(false);
      triggerError(err.message || 'Password reset failed. Token may be expired.');
    }
  };

  // 1-Click Instant Demo Login (Real Backend Authentication)
  const handleInstantDemoLogin = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);
    setLoadingMessage('Authenticating with primary evaluator credentials...');

    try {
      const res = await api.login('operator@voltbms.io', 'VoltBms2026!', true);
      setIsLoading(false);
      setSuccessMessage('Evaluator session verified. Initializing lab...');
      setTimeout(() => {
        finalizeSession(res.user, 'demo');
      }, 400);
    } catch (err: any) {
      setIsLoading(false);
      triggerError('Instant demo authentication failed. Check backend connection.');
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-3 sm:p-6 overflow-hidden bg-[#07090e] select-none">
      {/* Background Pinstripe Grid & Ambient Energy Pulses */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none z-0" />

      {/* Electric Cyan & Ice-Blue Atmospheric Light Pools */}
      <div className="fixed -top-32 -left-32 w-[34rem] h-[34rem] rounded-full bg-cyan-500/10 blur-[140px] pointer-events-none z-0 animate-pulse" />
      <div className="fixed -bottom-32 -right-32 w-[38rem] h-[38rem] rounded-full bg-blue-600/15 blur-[150px] pointer-events-none z-0" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[28rem] h-[28rem] rounded-full bg-cyan-600/8 blur-[160px] pointer-events-none z-0" />

      {/* Floating Animated Battery Node Sparks */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[18%] left-[12%] flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.02] border border-cyan-500/20 backdrop-blur-md text-[10px] font-mono text-cyan-400 opacity-60 hidden md:flex">
          <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
          <span>400V HV BUS • NOMINAL</span>
        </div>
        <div className="absolute bottom-[22%] right-[10%] flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.02] border border-emerald-500/20 backdrop-blur-md text-[10px] font-mono text-emerald-400 opacity-60 hidden md:flex">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>LFP THERMAL SHIELD • SECURE</span>
        </div>
      </div>

      {/* 3D Perspective Stage Container */}
      <div
        className="w-full max-w-[460px] z-10 py-4 px-2"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
      >
        {/* Interactive 3D Spatial Glass Card */}
        <div
          ref={cardRef}
          style={{
            transform: `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transition: isHovered ? 'transform 0.08s ease-out' : 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)'
          }}
          className={`relative w-full rounded-2xl bg-[#0a0d14]/85 backdrop-blur-2xl border border-white/[0.12] shadow-[0_30px_90px_-20px_rgba(0,0,0,0.9),0_0_40px_rgba(6,182,212,0.12),inset_0_1px_0_0_rgba(255,255,255,0.18)] p-5 sm:p-7 overflow-hidden ${
            isShaking ? 'animate-bounce' : ''
          }`}
        >
          {/* Cyan Horizon Glow Accent */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 bg-cyan-400/20 blur-2xl rounded-full pointer-events-none" />

          {/* Header Branding */}
          <div className="text-center mb-6 relative">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 via-blue-500/15 to-transparent border border-cyan-400/40 shadow-[0_0_25px_rgba(6,182,212,0.3)] mb-3">
              <Zap className="w-6 h-6 text-cyan-400 animate-pulse" />
            </div>
            <h1 className="text-xl sm:text-2xl font-orbitron font-extrabold text-white tracking-wider flex items-center justify-center gap-2">
              <span>VOLT</span>
              <span className="text-cyan-400">AI</span>
              <span className="text-white/20 font-mono text-sm">/</span>
              <span className="text-xs sm:text-sm font-sans font-medium text-slate-300 tracking-normal">BMS GATEWAY</span>
            </h1>
            <p className="text-[11px] text-slate-400 mt-1 font-mono">
              Neural Battery Intelligence & Prognostics Platform
            </p>
          </div>

          {/* Tab Navigation (Sign In / Register / Recovery) */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-white/[0.04] rounded-xl border border-white/[0.08] mb-5 text-xs font-mono">
            <button
              type="button"
              onClick={() => { setMode('signin'); setErrorMessage(null); setSuccessMessage(null); }}
              className={`py-1.5 rounded-lg transition font-medium ${
                mode === 'signin'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setErrorMessage(null); setSuccessMessage(null); }}
              className={`py-1.5 rounded-lg transition font-medium ${
                mode === 'signup'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Register
            </button>
            <button
              type="button"
              onClick={() => { setMode('forgot'); setErrorMessage(null); setSuccessMessage(null); }}
              className={`py-1.5 rounded-lg transition font-medium ${
                mode === 'forgot' || mode === 'reset'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Recover
            </button>
          </div>

          {/* Error Message Toast */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5"
              >
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span className="flex-1 font-mono text-[11px]">{errorMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success Message Toast */}
          <AnimatePresence>
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="flex-1 font-mono text-[11px]">{successMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* MODE: SIGN IN */}
          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-[11px] font-mono font-medium text-slate-300 mb-1" htmlFor="login-email">
                  OPERATOR EMAIL
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="operator@voltbms.io"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/40 transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-mono font-medium text-slate-300" htmlFor="login-password">
                    PASSWORD
                  </label>
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setErrorMessage(null); }}
                    className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 transition"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onKeyDown={handleKeyModifierCheck}
                    onKeyUp={handleKeyModifierCheck}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/40 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {isCapsLockOn && (
                  <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                    <span>⚠️ Caps Lock is active</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-white/[0.05] border-white/20 text-cyan-500 focus:ring-0 focus:ring-offset-0"
                  />
                  <span className="text-[11px] font-mono text-slate-400">Keep session active (30d)</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-orbitron font-bold text-xs tracking-wider transition shadow-[0_0_20px_rgba(6,182,212,0.35)] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>{loadingMessage || 'Authenticating...'}</span>
                  </>
                ) : (
                  <>
                    <span>AUTHENTICATE OPERATOR</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* MODE: REGISTER / SIGN UP */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="flex flex-col gap-3">
              <div>
                <label className="block text-[11px] font-mono font-medium text-slate-300 mb-1" htmlFor="reg-name">
                  FULL NAME
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    id="reg-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. Aryan Chaudhary"
                    className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/40 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-medium text-slate-300 mb-1" htmlFor="reg-email">
                  OPERATOR EMAIL
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="engineer@voltbms.io"
                    className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/40 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-medium text-slate-300 mb-1">
                  OPERATIONAL ROLE
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
                  {(['BMS Engineer', 'Fleet Admin', 'Read-Only Auditor'] as OperatorRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`py-1.5 px-1 rounded-lg border text-center transition ${
                        role === r
                          ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 font-bold'
                          : 'bg-white/[0.02] border-white/[0.08] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {r.replace(' ', '\n')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-medium text-slate-300 mb-1" htmlFor="reg-password">
                  PASSWORD
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full pl-10 pr-10 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/40 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Strength Meter */}
                {password.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <div className="flex-1 grid grid-cols-4 gap-1 h-1">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`rounded-full h-full ${
                            step <= strength.score ? strength.color : 'bg-slate-800'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[9px] font-mono text-slate-400">{strength.label}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-mono font-medium text-slate-300 mb-1" htmlFor="reg-confirm">
                  CONFIRM PASSWORD
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    id="reg-confirm"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full pl-10 pr-10 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/40 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-orbitron font-bold text-xs tracking-wider transition shadow-[0_0_20px_rgba(6,182,212,0.35)] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>{loadingMessage || 'Creating account...'}</span>
                  </>
                ) : (
                  <>
                    <span>REGISTER OPERATOR ACCOUNT</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* MODE: FORGOT PASSWORD REQUEST */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="flex flex-col gap-3.5">
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono">
                Enter your operator email address. The system will generate a genuine cryptographic recovery token stored in the database.
              </div>

              <div>
                <label className="block text-[11px] font-mono font-medium text-slate-300 mb-1" htmlFor="forgot-email">
                  REGISTERED OPERATOR EMAIL
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="operator@voltbms.io"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/40 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-orbitron font-bold text-xs tracking-wider transition shadow-[0_0_20px_rgba(6,182,212,0.35)] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>{loadingMessage || 'Generating reset token...'}</span>
                  </>
                ) : (
                  <>
                    <span>REQUEST RESET TOKEN</span>
                    <KeyRound className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center mt-2">
                <button
                  type="button"
                  onClick={() => { setMode('reset'); setErrorMessage(null); }}
                  className="text-[11px] font-mono text-cyan-400 hover:underline"
                >
                  Already have a recovery token? Enter it here →
                </button>
              </div>
            </form>
          )}

          {/* MODE: RESET PASSWORD */}
          {mode === 'reset' && (
            <form onSubmit={handleResetPassword} className="flex flex-col gap-3">
              <div>
                <label className="block text-[11px] font-mono font-medium text-slate-300 mb-1" htmlFor="reset-token">
                  RECOVERY TOKEN
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    id="reset-token"
                    type="text"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="Paste your 32-character recovery token"
                    className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/40 transition font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-medium text-slate-300 mb-1" htmlFor="new-pass">
                  NEW PASSWORD
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    id="new-pass"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full pl-10 pr-10 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/40 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-medium text-slate-300 mb-1" htmlFor="confirm-new-pass">
                  CONFIRM NEW PASSWORD
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    id="confirm-new-pass"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full pl-10 pr-10 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/40 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-orbitron font-bold text-xs tracking-wider transition shadow-[0_0_20px_rgba(6,182,212,0.35)] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Updating password...</span>
                  </>
                ) : (
                  <>
                    <span>RESET & UPDATE CREDENTIALS</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Instant Demo Sandbox Access Button (Calls real backend API) */}
          <div className="mt-5 pt-4 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={handleInstantDemoLogin}
              disabled={isLoading}
              className="w-full py-2 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-cyan-500/30 hover:border-cyan-400/60 text-cyan-300 font-mono text-[11px] font-semibold transition flex items-center justify-center gap-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Instant Evaluator Demo Login (Aryan / BMS Engineer)</span>
            </button>
            <p className="text-[10px] text-slate-500 text-center mt-2 font-mono">
              Authenticates against verified database user <span className="text-slate-400">operator@voltbms.io</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
