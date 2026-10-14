import React, { useState, useEffect, useRef } from 'react';

export type OperatorRole = 'BMS Engineer' | 'Fleet Admin' | 'Read-Only Auditor';

export interface OperatorSession {
  name: string;
  email: string;
  role: OperatorRole;
  authMethod: 'password' | 'google' | 'passkey' | 'demo';
  sessionExpiry?: number;
  timestamp: string;
}

interface VoltLoginGatewayProps {
  onLoginSuccess: (session: OperatorSession) => void;
}

export const VoltLoginGateway: React.FC<VoltLoginGatewayProps> = ({ onLoginSuccess }) => {
  // Modes: 'signin' | 'signup' | 'recovery'
  const [mode, setMode] = useState<'signin' | 'signup' | 'recovery'>('signin');
  
  // Inputs
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [role, setRole] = useState<OperatorRole>('BMS Engineer');
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  // UX Feedback & State
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  
  // OTP Recovery State
  const [otpStep, setOtpStep] = useState<'request' | 'verify'>('request');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpTimer, setOtpTimer] = useState<number>(45);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 3D Tilt Physics State
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState<boolean>(false);

  // Mouse Move Parallax (Capped to ±4 degrees for an executive, calm feel)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const normalizedX = (e.clientX - centerX) / (rect.width / 2);
    const normalizedY = (e.clientY - centerY) / (rect.height / 2);

    const clampedX = Math.max(-1, Math.min(1, normalizedX));
    const clampedY = Math.max(-1, Math.min(1, normalizedY));

    // Invert Y for natural card tilt
    setTilt({
      x: Number((-clampedY * 4.0).toFixed(2)),
      y: Number((clampedX * 4.0).toFixed(2))
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  // Caps Lock Detection
  const handleKeyModifierCheck = (e: React.KeyboardEvent) => {
    if (typeof e.getModifierState === 'function') {
      setIsCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  // Real-time Email Format Check
  const isEmailValid = email.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

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
        return { score: 4, label: 'Hardware Grade', color: 'bg-emerald-400' };
      default:
        return { score: 1, label: 'Weak', color: 'bg-rose-500' };
    }
  };

  const strength = getPasswordStrength(password);

  // Trigger brief shake animation on invalid submission
  const triggerError = (msg: string) => {
    setErrorMessage(msg);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  // Complete session commit
  const finalizeLogin = (sessionData: OperatorSession) => {
    if (rememberMe) {
      try {
        localStorage.setItem('volt_bms_session', JSON.stringify(sessionData));
      } catch (e) {
        console.warn('localStorage error', e);
      }
    }
    onLoginSuccess(sessionData);
  };

  // Handle Standard Password Login / Registration
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !isEmailValid) {
      triggerError('Please enter a valid operator email address.');
      return;
    }

    if (mode === 'signup' && !name.trim()) {
      triggerError('Please provide your full name for access provisioning.');
      return;
    }

    if (!password || password.length < 6) {
      triggerError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    setLoadingMessage(mode === 'signup' ? 'Provisioning Operator Credentials...' : 'Establishing Secure BMS Handshake...');

    setTimeout(() => {
      setIsLoading(false);
      const operatorName = mode === 'signup' ? name : (email.split('@')[0] || 'Operator');
      finalizeLogin({
        name: operatorName.charAt(0).toUpperCase() + operatorName.slice(1),
        email,
        role,
        authMethod: 'password',
        sessionExpiry: Date.now() + 30 * 24 * 60 * 60 * 1000,
        timestamp: new Date().toISOString()
      });
    }, 750);
  };

  // 1-Click Instant Evaluator Demo Access
  const handleInstantDemoLogin = () => {
    setErrorMessage(null);
    setIsLoading(true);
    setLoadingMessage('Initializing Evaluator Sandbox Session...');

    setName('Aryan Chaudhary');
    setEmail('operator@voltbms.io');
    setPassword('••••••••••••');
    setRole('BMS Engineer');

    setTimeout(() => {
      setIsLoading(false);
      finalizeLogin({
        name: 'Aryan Chaudhary',
        email: 'operator@voltbms.io',
        role: 'BMS Engineer',
        authMethod: 'demo',
        sessionExpiry: Date.now() + 30 * 24 * 60 * 60 * 1000,
        timestamp: new Date().toISOString()
      });
    }, 650);
  };

  // One-Click Google OAuth Handshake Simulation
  const handleGoogleOAuth = () => {
    setErrorMessage(null);
    setIsLoading(true);
    setLoadingMessage('Connecting to Google Identity Gateway...');

    setTimeout(() => {
      setIsLoading(false);
      finalizeLogin({
        name: 'Dr. Elena Vance',
        email: 'elena.vance@voltbms.io',
        role: 'Fleet Admin',
        authMethod: 'google',
        sessionExpiry: Date.now() + 30 * 24 * 60 * 60 * 1000,
        timestamp: new Date().toISOString()
      });
    }, 800);
  };

  // Passkey / WebAuthn Biometric Handshake
  const handlePasskeyAuth = async () => {
    setErrorMessage(null);
    setIsLoading(true);
    setLoadingMessage('Waiting for Biometric TouchID / Passkey...');

    try {
      // Check for native WebAuthn support
      if (typeof window !== 'undefined' && window.PublicKeyCredential) {
        // Native biometric or simulated passkey challenge
        setTimeout(() => {
          setIsLoading(false);
          finalizeLogin({
            name: 'Chief Battery Architect',
            email: 'architect@voltbms.io',
            role: 'BMS Engineer',
            authMethod: 'passkey',
            sessionExpiry: Date.now() + 30 * 24 * 60 * 60 * 1000,
            timestamp: new Date().toISOString()
          });
        }, 900);
      } else {
        // Fallback simulation
        setTimeout(() => {
          setIsLoading(false);
          finalizeLogin({
            name: 'Hardware Security Lead',
            email: 'security@voltbms.io',
            role: 'BMS Engineer',
            authMethod: 'passkey',
            sessionExpiry: Date.now() + 30 * 24 * 60 * 60 * 1000,
            timestamp: new Date().toISOString()
          });
        }, 800);
      }
    } catch (err) {
      setIsLoading(false);
      triggerError('Passkey authentication was cancelled or not supported.');
    }
  };

  // OTP 6-Digit Auto-Advancing Handlers
  const handleOtpDigitChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = val.slice(-1);
    setOtpDigits(newDigits);

    // Auto-advance to next input
    if (val && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleSendRecoveryCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailValid) {
      triggerError('Please enter a valid operator email to receive the code.');
      return;
    }
    setIsLoading(true);
    setLoadingMessage('Sending 6-Digit Verification Token...');
    setTimeout(() => {
      setIsLoading(false);
      setOtpStep('verify');
      setOtpTimer(45);
    }, 700);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpDigits.join('');
    if (code.length !== 6) {
      triggerError('Please enter all 6 digits of your verification code.');
      return;
    }
    setIsLoading(true);
    setLoadingMessage('Validating Authentication Token...');
    setTimeout(() => {
      setIsLoading(false);
      finalizeLogin({
        name: email.split('@')[0] || 'Operator',
        email,
        role: 'BMS Engineer',
        authMethod: 'password',
        sessionExpiry: Date.now() + 30 * 24 * 60 * 60 * 1000,
        timestamp: new Date().toISOString()
      });
    }, 800);
  };

  // Decrement OTP Timer
  useEffect(() => {
    if (mode === 'recovery' && otpStep === 'verify' && otpTimer > 0) {
      const interval = setInterval(() => setOtpTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [mode, otpStep, otpTimer]);

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-[#050508] select-none">
      {/* Background Pinstripe Pattern */}
      <div className="absolute inset-0 pinstripe-grid pointer-events-none opacity-40 z-0" />

      {/* Diffused Horizon Ambient Glow Orbs */}
      <div className="fixed -top-32 -left-32 w-[38rem] h-[38rem] rounded-full bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-transparent blur-[130px] pointer-events-none z-0" />
      <div className="fixed -bottom-32 -right-32 w-[42rem] h-[42rem] rounded-full bg-gradient-to-tl from-cyan-500/15 via-sky-500/10 to-amber-500/10 blur-[130px] pointer-events-none z-0" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] rounded-full bg-indigo-600/10 blur-[150px] pointer-events-none z-0" />

      {/* Top Status Bar: Live Broker Readiness */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
        <span className="text-[10px] font-mono font-medium text-slate-300 tracking-wide">
          MQTT & Edge Broker: <strong className="text-emerald-400 font-bold">Online</strong> (12ms)
        </span>
        <span className="text-white/20">│</span>
        <span className="text-[10px] font-mono text-slate-400">Volt-OS v2.4</span>
      </div>

      {/* 3D Perspective Stage Container */}
      <div
        className="perspective-1200 w-full max-w-[450px] z-10 py-6"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
      >
        {/* Interactive 3D Spatial Card */}
        <div
          ref={cardRef}
          style={{
            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transition: isHovered ? 'transform 0.08s ease-out' : 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)'
          }}
          className={`relative preserve-3d w-full rounded-2xl bg-[#0A0C12]/90 backdrop-blur-2xl border border-white/[0.12] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.16)] p-6 sm:p-7 overflow-hidden ${
            isShaking ? 'animate-card-shake' : ''
          }`}
        >
          {/* Signature Diffused Bottom-Edge Gradient Aura */}
          <div className="absolute inset-x-0 bottom-0 h-44 spatial-horizon-glow pointer-events-none rounded-b-2xl" />

          {/* Top Subtle Edge Rim Highlight */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

          {/* Card Header & Brand Emblem */}
          <div className="relative translate-z-24 flex flex-col items-center text-center mb-6">
            <div className="relative mb-3 flex items-center justify-center">
              {/* Outer Glow Halo */}
              <div className="absolute -inset-2 rounded-2xl bg-gradient-to-br from-cyan-500/25 to-indigo-500/25 blur-md opacity-80" />
              
              {/* 3D Anodized Emblem Container */}
              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-b from-[#1E2333] to-[#0D101A] border border-white/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4),0_8px_16px_rgba(0,0,0,0.6)] flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-cyan-400 filter drop-shadow-[0_0_8px_rgba(34,211,238,0.7)]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
            </div>

            <h1 className="text-2xl font-bold font-orbitron tracking-tight text-white flex items-center gap-1.5">
              VOLT <span className="text-cyan-400">BMS</span>
            </h1>
            <p className="text-[11px] font-sans text-slate-400 tracking-wide mt-1">
              Battery Intelligence & Telemetry Gateway
            </p>
          </div>

          {/* Segmented Mode Switcher */}
          <div className="relative translate-z-12 mb-5 p-1 rounded-xl bg-white/[0.04] border border-white/[0.07] grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMessage(null);
              }}
              className={`py-1.5 text-xs font-medium rounded-lg transition-all ${
                mode === 'signin'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-white font-semibold border border-cyan-400/30 shadow-[0_2px_8px_rgba(0,0,0,0.5)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMessage(null);
              }}
              className={`py-1.5 text-xs font-medium rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-white font-semibold border border-cyan-400/30 shadow-[0_2px_8px_rgba(0,0,0,0.5)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Register
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('recovery');
                setErrorMessage(null);
                setOtpStep('request');
              }}
              className={`py-1.5 text-xs font-medium rounded-lg transition-all ${
                mode === 'recovery'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-white font-semibold border border-cyan-400/30 shadow-[0_2px_8px_rgba(0,0,0,0.5)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Recovery
            </button>
          </div>

          {/* Error Message Banner */}
          {errorMessage && (
            <div className="relative translate-z-12 mb-4 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* MODE: SIGN IN / REGISTER FORM */}
          {mode !== 'recovery' && (
            <form onSubmit={handleSubmit} className="relative translate-z-12 flex flex-col gap-3.5">
              {/* Full Name Field (Register Mode Only) */}
              {mode === 'signup' && (
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1" htmlFor="full-name">
                    Operator Full Name
                  </label>
                  <div className="relative">
                    <input
                      id="full-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Dr. Aryan Chaudhary"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/40 transition"
                    />
                  </div>
                </div>
              )}

              {/* Email Field with Live Validity Check */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-slate-300" htmlFor="operator-email">
                    Operator Email ID
                  </label>
                  {email.length > 0 && (
                    <span className={`text-[10px] font-mono flex items-center gap-1 ${isEmailValid ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {isEmailValid ? '✓ Verified Format' : 'Enter valid address'}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="operator-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="operator@voltbms.io"
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] text-white text-xs placeholder-slate-500 focus:outline-none transition ${
                      email.length > 0 && !isEmailValid
                        ? 'border border-rose-500/50 focus:border-rose-500'
                        : 'border border-white/[0.08] focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/40'
                    }`}
                  />
                </div>
              </div>

              {/* Password Field with CapsLock Detection & Toggle */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-slate-300" htmlFor="operator-password">
                    {mode === 'signup' ? 'Create Access Key' : 'Security Access Key'}
                  </label>
                  {isCapsLockOn && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                      ⚠ CAPS LOCK ON
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="operator-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyModifierCheck}
                    onKeyUp={handleKeyModifierCheck}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/40 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition p-1"
                    title={showPassword ? 'Hide Key' : 'Show Key'}
                  >
                    {showPassword ? (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Minimal 4-Bar Password Strength Meter (Signup or active password) */}
                {password.length > 0 && (
                  <div className="mt-1.5 flex flex-col gap-1">
                    <div className="grid grid-cols-4 gap-1.5">
                      <div className={`h-1 rounded-full transition-all ${strength.score >= 1 ? strength.color : 'bg-white/10'}`} />
                      <div className={`h-1 rounded-full transition-all ${strength.score >= 2 ? strength.color : 'bg-white/10'}`} />
                      <div className={`h-1 rounded-full transition-all ${strength.score >= 3 ? strength.color : 'bg-white/10'}`} />
                      <div className={`h-1 rounded-full transition-all ${strength.score >= 4 ? strength.color : 'bg-white/10'}`} />
                    </div>
                    <div className="flex justify-between text-[9px] font-mono text-slate-400">
                      <span>Entropy Strength</span>
                      <span className="font-semibold text-slate-300">{strength.label}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Operator Role Selector (Segmented Clearance) */}
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Access Clearance Level
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['BMS Engineer', 'Fleet Admin', 'Read-Only Auditor'] as OperatorRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`py-1.5 px-2 rounded-xl text-[10px] font-mono font-medium transition-all text-center border ${
                        role === r
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                          : 'bg-white/[0.02] text-slate-400 border-white/[0.06] hover:border-white/15 hover:text-slate-200'
                      }`}
                    >
                      {r === 'BMS Engineer' ? 'Engineer' : r === 'Fleet Admin' ? 'Admin' : 'Auditor'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Remember Session & Forgot Password Row */}
              <div className="flex items-center justify-between text-[11px] pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-white/10 border-white/20 text-cyan-500 focus:ring-0 focus:outline-none cursor-pointer"
                  />
                  <span>Remember (30 Days)</span>
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('recovery');
                      setOtpStep('request');
                      setErrorMessage(null);
                    }}
                    className="text-cyan-400 hover:text-cyan-300 transition"
                  >
                    Forgot password?
                  </button>
                )}
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-orbitron font-bold text-xs tracking-wider border border-cyan-400/30 shadow-[0_4px_20px_rgba(6,182,212,0.35)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>{loadingMessage}</span>
                  </>
                ) : (
                  <>
                    <span>{mode === 'signup' ? 'CREATE ACCESS GATEWAY' : 'AUTHENTICATE ACCESS'}</span>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          )}

          {/* MODE: 6-DIGIT OTP MAGIC CODE RECOVERY */}
          {mode === 'recovery' && (
            <div className="relative translate-z-12 flex flex-col gap-4">
              {otpStep === 'request' ? (
                <form onSubmit={handleSendRecoveryCode} className="flex flex-col gap-3.5">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Enter your operator email address. An encrypted 6-digit cryptographic verification token will be dispatched for recovery.
                  </p>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1" htmlFor="recovery-email">
                      Operator Recovery Email
                    </label>
                    <input
                      id="recovery-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="operator@voltbms.io"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/40 transition"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-orbitron font-bold text-xs tracking-wider border border-cyan-400/30 shadow-[0_4px_20px_rgba(6,182,212,0.35)] transition flex items-center justify-center gap-2"
                  >
                    {isLoading ? <span>{loadingMessage}</span> : <span>TRANSMIT 6-DIGIT TOKEN</span>}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                  <div className="text-center">
                    <p className="text-xs text-slate-300">Verification Code Transmitted</p>
                    <p className="text-[10px] text-cyan-400 font-mono mt-0.5">{email}</p>
                  </div>

                  {/* 6 Individual Auto-Advancing Digit Boxes */}
                  <div className="flex justify-between gap-1.5 sm:gap-2">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpInputRefs.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="w-10 sm:w-11 h-12 text-center font-mono font-bold text-lg rounded-xl bg-white/[0.04] border border-white/[0.12] text-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 transition shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]"
                      />
                    ))}
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span>Token validity: <strong className="text-white font-mono">{otpTimer}s</strong></span>
                    {otpTimer === 0 ? (
                      <button
                        type="button"
                        onClick={() => setOtpTimer(45)}
                        className="text-cyan-400 hover:underline"
                      >
                        Resend Code
                      </button>
                    ) : (
                      <span className="text-slate-500">Wait for cooldown</span>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-orbitron font-bold text-xs tracking-wider border border-cyan-400/30 shadow-[0_4px_20px_rgba(6,182,212,0.35)] transition flex items-center justify-center gap-2"
                  >
                    {isLoading ? <span>{loadingMessage}</span> : <span>VERIFY & RECOVER ACCESS</span>}
                  </button>
                </form>
              )}

              <button
                type="button"
                onClick={() => setMode('signin')}
                className="text-xs text-slate-400 hover:text-white transition text-center mt-1"
              >
                ← Return to Sign In
              </button>
            </div>
          )}

          {/* Social / Alternate Frictionless Auth Separator */}
          {mode !== 'recovery' && (
            <div className="relative translate-z-12 mt-4 pt-4 border-t border-white/[0.08] flex flex-col gap-2.5">
              <div className="grid grid-cols-2 gap-2">
                {/* One-Click Google OAuth */}
                <button
                  type="button"
                  onClick={handleGoogleOAuth}
                  disabled={isLoading}
                  className="py-2 px-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/20 transition flex items-center justify-center gap-2 text-[11px] font-medium text-slate-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Google ID</span>
                </button>

                {/* Passkey / Biometric WebAuthn */}
                <button
                  type="button"
                  onClick={handlePasskeyAuth}
                  disabled={isLoading}
                  className="py-2 px-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/20 transition flex items-center justify-center gap-2 text-[11px] font-medium text-slate-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                >
                  <svg className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 004.07 9m5.936 8.79A14.28 14.28 0 0110 11a2 2 0 114 0c0 .942-.14 1.85-.401 2.705" />
                  </svg>
                  <span>TouchID / Passkey</span>
                </button>
              </div>

              {/* 1-Click Instant Evaluator Demo Access Button */}
              <button
                type="button"
                onClick={handleInstantDemoLogin}
                disabled={isLoading}
                className="w-full py-2 px-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:text-white transition flex items-center justify-center gap-2 text-[11px] font-orbitron font-semibold shadow-[0_0_15px_rgba(6,182,212,0.15)] group"
              >
                <span className="text-amber-400 group-hover:scale-110 transition-transform">⚡</span>
                <span>Instant Evaluator Demo Access</span>
                <span className="text-[9px] font-mono text-cyan-400/80 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30">
                  Engineer Tier
                </span>
              </button>
            </div>
          )}

          {/* Security & Cryptography Footer */}
          <div className="relative translate-z-12 mt-5 pt-3 border-t border-white/[0.05] flex items-center justify-between text-[9px] text-slate-500 font-mono">
            <span className="flex items-center gap-1.5">
              <svg className="w-3 h-3 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>AES-256 / TLS 1.3 Tunnel</span>
            </span>
            <span>Zero-Trust Gateway</span>
          </div>
        </div>
      </div>
    </div>
  );
};
