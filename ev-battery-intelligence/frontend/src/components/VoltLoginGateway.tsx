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
  Layers,
  Compass
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
  // Modes: 'signin' | 'signup' | 'forgot' | 'reset' | 'admin-key'
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot' | 'reset' | 'admin-key'>('signin');

  // Form Fields
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [role, setRole] = useState<OperatorRole>('BMS Engineer');
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [resetToken, setResetToken] = useState<string>('');
  const [adminKey, setAdminKey] = useState<string>('');

  // UX Feedback & State
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [showAdminKey, setShowAdminKey] = useState<boolean>(false);
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
      primary_battery_id: userProfile.primary_battery_id || 'EV-001',
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

  // 1-Click Instant Demo Tour for new visitors
  const handleInstantDemoTour = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);
    setLoadingMessage('Initializing Neural Lab Demo Tour...');

    try {
      const res = await api.startInstantDemoTour();
      sessionStorage.setItem('volt_demo_tour_active', 'true');
      setIsLoading(false);
      setSuccessMessage('Demo Tour verified! Entering Neural Lab...');
      setTimeout(() => {
        finalizeSession(res.user, 'demo');
      }, 300);
    } catch {
      const demoUser: OperatorProfile = {
        user_id: 'usr_evaluator_demo',
        name: 'Guest Evaluator',
        email: 'demo@voltbms.io',
        role: 'BMS Engineer',
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        primary_battery_id: 'EV-001'
      };
      sessionStorage.setItem('volt_demo_tour_active', 'true');
      finalizeSession(demoUser, 'demo');
    }
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
      triggerError(err.message || 'Login failed. Please check credentials or register.');
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
      setSuccessMessage(`Account registered for ${res.user.name}! Entering Neural Lab...`);
      setTimeout(() => {
        finalizeSession(res.user, 'password');
      }, 500);
    } catch (err: any) {
      setIsLoading(false);
      triggerError(err.message || 'Registration failed. Please try a different email.');
    }
  };

  // Handle Admin Key Authentication (Direct Fleet Admin privilege grant)
  const handleAdminKeyLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const keyToUse = adminKey.trim();
    if (!keyToUse) {
      triggerError('Please enter your 256-bit Admin Access Key.');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Verifying Admin Key SHA-256 hash & elevating privileges...');

    try {
      const res = await api.loginWithAdminKey(keyToUse, rememberMe);
      setIsLoading(false);
      setSuccessMessage(`Admin Key Verified: ${res.user.role} elevated access granted.`);
      setTimeout(() => {
        finalizeSession(res.user, 'token');
      }, 400);
    } catch (err: any) {
      setIsLoading(false);
      triggerError(err.message || 'Invalid or revoked Admin Access Key.');
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
          <div className="text-center mb-5 relative">
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

          {/* Instant Demo Tour Banner for New Visitors */}
          <div className="mb-5 p-3.5 rounded-xl bg-gradient-to-r from-cyan-500/15 via-blue-500/10 to-indigo-500/15 border border-cyan-400/40 shadow-[0_0_20px_rgba(6,182,212,0.15)] flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-cyan-300">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                NEW TO VOLT AI?
              </span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                No Password Needed
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              Launch the instant interactive demo tour with simulated 400V telemetry, 8-cell matrix, and ML degradation models.
            </p>
            <button
              type="button"
              onClick={handleInstantDemoTour}
              disabled={isLoading}
              className="w-full mt-1 py-2 px-3 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-orbitron font-extrabold text-xs tracking-wider transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.35)]"
            >
              <Compass className="w-4 h-4 text-slate-950" />
              <span>START INSTANT DEMO TOUR</span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </button>
          </div>

          {/* Tab Navigation (Sign In / Register ID / Admin Key / Recovery) */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-white/[0.04] rounded-xl border border-white/[0.08] mb-5 text-[11px] font-mono">
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
              Register ID
            </button>
            <button
              type="button"
              onClick={() => { setMode('admin-key'); setErrorMessage(null); setSuccessMessage(null); }}
              className={`py-1.5 rounded-lg transition font-medium flex items-center justify-center gap-1 ${
                mode === 'admin-key'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <KeyRound className="w-3 h-3 text-amber-400" />
              <span>Admin Key</span>
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
                  FULL OPERATOR NAME
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    id="reg-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Vance"
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
                    placeholder="alex@voltbms.io"
                    className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/40 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-medium text-slate-300 mb-1" htmlFor="reg-role">
                  ASSIGNED ROLE
                </label>
                <div className="relative">
                  <select
                    id="reg-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as OperatorRole)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0c101a] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/40 transition font-mono"
                  >
                    <option value="BMS Engineer">BMS Engineer (Read/Write Telemetry & Digital Twin)</option>
                    <option value="Fleet Admin">Fleet Admin (Full Fleet Oversight & Calibration)</option>
                    <option value="Read-Only Auditor">Read-Only Auditor (Inspection & Diagnostic Reports)</option>
                  </select>
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
                    onKeyDown={handleKeyModifierCheck}
                    onKeyUp={handleKeyModifierCheck}
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

                {/* Password Strength Meter */}
                {password.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <div className="flex-1 grid grid-cols-4 gap-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${strength.score >= 1 ? strength.color : 'bg-transparent'}`} />
                      <div className={`h-full ${strength.score >= 2 ? strength.color : 'bg-transparent'}`} />
                      <div className={`h-full ${strength.score >= 3 ? strength.color : 'bg-transparent'}`} />
                      <div className={`h-full ${strength.score >= 4 ? strength.color : 'bg-transparent'}`} />
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{strength.label}</span>
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
                    onKeyDown={handleKeyModifierCheck}
                    onKeyUp={handleKeyModifierCheck}
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
                    <span>{loadingMessage || 'Registering...'}</span>
                  </>
                ) : (
                  <>
                    <span>CREATE OPERATOR ACCOUNT</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* MODE: ADMIN KEY LOGIN */}
          {mode === 'admin-key' && (
            <form onSubmit={handleAdminKeyLogin} className="flex flex-col gap-3.5">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300/90 text-xs font-mono">
                <div className="flex items-center gap-1.5 font-bold text-amber-400 mb-1">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>FLEET ADMINISTRATOR DIRECT ACCESS</span>
                </div>
                <p className="text-[10px] text-slate-300 leading-relaxed">
                  Enter your private 256-bit Admin Access Key provided by system administrators to authenticate directly with elevated Fleet Admin privileges.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-medium text-slate-300 mb-1" htmlFor="admin-access-key">
                  ADMIN ACCESS KEY
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400 pointer-events-none" />
                  <input
                    id="admin-access-key"
                    type={showAdminKey ? 'text' : 'password'}
                    autoComplete="off"
                    spellCheck={false}
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value.trim())}
                    placeholder="Enter 256-bit Admin Access Key"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/[0.03] border border-amber-500/30 text-amber-200 text-xs placeholder-slate-600 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/40 transition font-mono tracking-wider font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminKey(!showAdminKey)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                    title={showAdminKey ? 'Hide key' : 'Show key'}
                  >
                    {showAdminKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] font-mono text-slate-500 mt-1">
                  Cryptographically verified via SHA-256 hash.
                </p>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-white/[0.05] border-white/20 text-cyan-500 focus:ring-0 focus:ring-offset-0"
                  />
                  <span className="text-[11px] font-mono text-slate-400">Persist Admin Session (30d)</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-cyan-500 hover:from-amber-400 hover:to-cyan-400 text-slate-950 font-orbitron font-bold text-xs tracking-wider transition shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>{loadingMessage || 'Verifying Admin Key...'}</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4 text-slate-950" />
                    <span>AUTHENTICATE AS FLEET ADMIN</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* MODE: FORGOT PASSWORD */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="flex flex-col gap-3.5">
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono">
                <p>Enter your operator email address. A recovery token will be generated to reset your credentials.</p>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-medium text-slate-300 mb-1" htmlFor="forgot-email">
                  OPERATOR EMAIL
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
                    <span>Generating token...</span>
                  </>
                ) : (
                  <>
                    <span>REQUEST RECOVERY TOKEN</span>
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
                    placeholder="Paste recovery token"
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

          {/* Quick Access Footer */}
          <div className="mt-5 pt-4 border-t border-white/[0.08] flex flex-col gap-2">
            <button
              type="button"
              onClick={handleInstantDemoTour}
              disabled={isLoading}
              className="w-full py-2 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-cyan-500/30 hover:border-cyan-400/60 text-cyan-300 font-mono text-[11px] font-semibold transition flex items-center justify-center gap-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Launch Instant Demo Tour (Guest Access)</span>
            </button>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 px-1 mt-1">
              <span>{mode === 'signup' ? 'Already have an ID?' : 'Want a personal ID?'}</span>
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'signup' ? 'signin' : 'signup');
                  setErrorMessage(null);
                }}
                className="text-cyan-400 hover:underline font-semibold"
              >
                {mode === 'signup' ? '← Sign In to Account' : 'Register Operator ID →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
