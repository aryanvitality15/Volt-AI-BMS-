import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ShieldCheck, Activity, Cpu, CheckCircle2, ChevronRight } from 'lucide-react';

interface NeuralBootSequenceProps {
  onComplete: () => void;
}

export const NeuralBootSequence: React.FC<NeuralBootSequenceProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState<number>(10);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [isSkipped, setIsSkipped] = useState<boolean>(false);

  const steps = [
    { label: 'Initializing Telemetry Handshake (HiveMQ MQTT & WebSockets)', code: 'SYS_CONN_OK' },
    { label: 'Calibrating Equivalent-Circuit LFP Physics (8S1P Architecture)', code: 'PHYS_CALIB_DONE' },
    { label: 'Loading Random Forest SOH & RUL Prognostic Weights', code: 'ML_WEIGHTS_LOADED' },
    { label: 'TreeSHAP Attribution Decomposition Matrix Synchronized', code: 'XAI_READY' }
  ];

  useEffect(() => {
    // Respect reduced-motion immediately
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onComplete();
      return;
    }

    const timer1 = setTimeout(() => {
      setProgress(35);
      setStepIndex(1);
    }, 350);

    const timer2 = setTimeout(() => {
      setProgress(70);
      setStepIndex(2);
    }, 700);

    const timer3 = setTimeout(() => {
      setProgress(95);
      setStepIndex(3);
    }, 1050);

    const timer4 = setTimeout(() => {
      setProgress(100);
    }, 1300);

    const timerEnd = setTimeout(() => {
      onComplete();
    }, 1600);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        setIsSkipped(true);
        onComplete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timerEnd);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onComplete]);

  if (isSkipped) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.02 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#050508] pinstripe-grid text-slate-100 select-none overflow-hidden"
      >
        {/* Ambient Radial Backlights */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[38rem] h-[38rem] rounded-full bg-gradient-to-br from-cyan-500/20 via-indigo-500/15 to-emerald-500/10 blur-[130px] pointer-events-none" />

        {/* Top Bar Skip Control */}
        <div className="absolute top-6 right-6 z-20 flex items-center gap-3">
          <button
            onClick={() => {
              setIsSkipped(true);
              onComplete();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-slate-400 hover:text-white transition shadow-lg backdrop-blur-md"
            title="Skip entrance animation (Press ESC)"
          >
            <span>SKIP INTRO</span>
            <kbd className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-[10px] text-slate-300">ESC</kbd>
          </button>
        </div>

        {/* Central HUD Card */}
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-xl mx-4 p-6 sm:p-8 rounded-3xl volt-glass-card border border-white/10 shadow-[0_25px_80px_rgba(0,0,0,0.85)] flex flex-col justify-between"
        >
          {/* Top Brand Banner */}
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                <Zap className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-orbitron font-extrabold tracking-wider text-white">
                  VOLT<span className="text-cyan-400">AI</span>
                  <span className="text-slate-400 font-light ml-2 text-xs sm:text-sm font-mono tracking-widest">// NEURAL BATTERY LAB</span>
                </h1>
                <p className="text-[10px] sm:text-[11px] font-mono text-slate-400">
                  Autonomous EV Battery Intelligence & Real-Time Prognostics
                </p>
              </div>
            </div>
            <span className="text-[9px] font-orbitron font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 animate-pulse">
              BOOTING
            </span>
          </div>

          {/* Diagnostics Stage Timeline */}
          <div className="my-6 space-y-3 font-mono text-xs">
            {steps.map((st, i) => {
              const isPast = i < stepIndex || progress === 100;
              const isCurrent = i === stepIndex && progress < 100;
              return (
                <div
                  key={st.label}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-300 ${
                    isPast
                      ? 'bg-emerald-500/[0.06] border-emerald-500/30 text-emerald-300 shadow-[inset_0_1px_0_0_rgba(16,185,129,0.1)]'
                      : isCurrent
                      ? 'bg-cyan-500/[0.08] border-cyan-500/40 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                      : 'bg-white/[0.015] border-white/[0.05] text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    {isPast ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : isCurrent ? (
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping flex-shrink-0" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-700 flex-shrink-0" />
                    )}
                    <span className="truncate text-[11px] sm:text-xs">{st.label}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold flex-shrink-0">
                    {isPast ? 'OK' : isCurrent ? 'BUSY' : 'PENDING'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Progress Bar & Architectural Specs */}
          <div className="space-y-3 pt-3 border-t border-white/[0.08]">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>Architecture: <strong className="text-white font-semibold">LFP 8S1P (25.6V • 40Ah)</strong></span>
              </span>
              <span className="text-cyan-400 font-bold tabular-nums">{progress}%</span>
            </div>

            <div className="w-full bg-black/60 rounded-full h-2.5 overflow-hidden p-0.5 border border-white/[0.08]">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-cyan-300 transition-all duration-300 shadow-[0_0_10px_rgba(6,182,212,0.8)]"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span>Sensor Sampling: 1000ms Grounded Continuous</span>
              <span>ASIL-C Functional Safety Matrix</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
