import React, { useState, useEffect } from 'react';
import {
  Activity,
  ShieldCheck,
  Zap,
  Cpu,
  Sliders,
  FileText,
  Wifi,
  WifiOff,
  AlertTriangle,
  Radio,
  Brain,
  Sparkles,
  Menu,
  Clock,
  Download,
  Bell,
  SlidersHorizontal
} from 'lucide-react';
import { motion } from 'framer-motion';

interface HeaderProps {
  scenario: string;
  onScenarioChange: (scenario: string) => void;
  isConnected: boolean;
  onOpenPassport: () => void;
  onOpenWhatIf: () => void;
  onOpenSelfLearning?: () => void;
  onOpenAlerts?: () => void;
  activeAlertCount: number;
  onToggleSidebar?: () => void;
}

const SCENARIOS = [
  "NORMAL",
  "HIGH TEMPERATURE",
  "CELL IMBALANCE",
  "HIGH RESISTANCE",
  "OVERCURRENT",
  "UNDERVOLTAGE",
  "SELF-DISCHARGE",
  "CAPACITY DEGRADATION",
  "SENSOR ANOMALY",
  "FAST CHARGING",
  "HIGH C-RATE",
  "DEEP DISCHARGE"
];

export const Header: React.FC<HeaderProps> = ({
  scenario,
  onScenarioChange,
  isConnected,
  onOpenPassport,
  onOpenWhatIf,
  onOpenSelfLearning,
  onOpenAlerts,
  activeAlertCount,
  onToggleSidebar
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 w-full bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/80 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 shadow-2xl select-none">
      <div className="max-w-7xl mx-auto flex flex-col gap-2.5">
        
        {/* Tier 1: Main Bar */}
        <div className="flex items-center justify-between gap-3">
          
          {/* Left: Branding & Vehicle/Battery Identifiers */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {/* Mobile / Tablet Hamburger Toggle */}
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-xl bg-slate-900/90 border border-slate-700/60 text-slate-300 hover:text-white lg:hidden transition flex-shrink-0"
              title="Toggle Navigation Menu"
              aria-label="Toggle Navigation Menu"
            >
              <Menu className="w-4 h-4 text-cyan-400" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h1 className="text-xs sm:text-sm font-orbitron font-extrabold tracking-wider text-white truncate">
                  VOLT<span className="text-cyan-400">AI</span> <span className="hidden xs:inline">INTELLIGENCE</span>
                </h1>
                <span className="text-[8px] sm:text-[8.5px] font-orbitron uppercase font-bold px-1.5 sm:px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex-shrink-0">
                  LFP 8S1P
                </span>
              </div>
              
              <div className="hidden sm:flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                <span>Battery: <strong className="text-slate-200 font-semibold">EV-BAT-001</strong></span>
                <span className="text-slate-700">│</span>
                <span>Vehicle: <strong className="text-cyan-400 font-semibold">KA05ER7777</strong></span>
                <span className="text-slate-700">│</span>
                <span className="text-slate-300">25.6V • 40Ah (1.02 kWh)</span>
              </div>
            </div>
          </div>

          {/* Right Desktop/Tablet: Live Status & Fast Action Triggers */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Live Clock (Desktop) */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[10px] font-mono text-slate-300">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Updated:</span>
              <strong className="text-white font-bold">{currentTime || '12:04:32'}</strong>
            </div>

            {/* Real-time Status Badge */}
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-slate-900/90 border border-slate-800 text-[9px] sm:text-[10px] font-mono">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]'}`} />
              <span className={`${isConnected ? 'text-emerald-400' : 'text-cyan-400'} font-bold font-orbitron text-[8.5px] sm:text-[9px]`}>
                {isConnected ? 'LIVE 1Hz' : 'ONLINE 1Hz'}
              </span>
              <span className="hidden sm:inline text-slate-600">│</span>
              <span className="hidden sm:inline text-slate-400 text-[9px]">
                {isConnected ? 'FastAPI Stream' : 'Physics Simulator'}
              </span>
            </div>

            {/* Alert Counter Button */}
            <button
              onClick={onOpenAlerts}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-orbitron font-bold border transition ${
                activeAlertCount > 0
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.3)] animate-pulse'
                  : 'bg-slate-900 border-slate-700/60 text-slate-400 hover:text-white'
              }`}
              title="View Active Anomalies & Safety Alerts"
            >
              <Bell className="w-3.5 h-3.5 text-rose-400" />
              <span>{activeAlertCount > 0 ? `${activeAlertCount}` : '0'} <span className="hidden xs:inline">ALERTS</span></span>
            </button>

            {/* Desktop Scenario Selector */}
            <div className="hidden md:flex items-center gap-1.5 bg-slate-900 border border-slate-700/60 rounded-xl px-2.5 py-1 text-xs">
              <Cpu className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <select
                value={scenario}
                onChange={(e) => onScenarioChange(e.target.value)}
                className="bg-transparent text-[10px] font-mono font-bold text-white focus:outline-none cursor-pointer pr-1"
                aria-label="Simulation Scenario"
              >
                {SCENARIOS.map((s) => (
                  <option key={s} value={s} className="bg-slate-900 text-slate-200">
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* AI Self Learning Badge */}
            <button
              onClick={onOpenSelfLearning}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-[10px] font-orbitron font-bold text-emerald-300 transition"
              title="Continuous Self-Learning & Accuracy Metrics"
            >
              <Brain className="w-3 h-3 text-emerald-400" />
              <span>AI LEARN</span>
              <span className="text-[8.5px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300">99.6%</span>
            </button>

            {/* Battery Passport Button */}
            <button
              onClick={onOpenPassport}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 text-[10px] font-orbitron font-bold text-purple-300 transition"
              title="EU Battery Digital Passport"
            >
              <FileText className="w-3 h-3 text-purple-400" />
              <span>PASSPORT</span>
            </button>
          </div>
        </div>

        {/* Tier 2: Mobile / Small Tablet Control Toolbar (Shown on mobile & small screens) */}
        <div className="flex md:hidden items-center justify-between gap-2 pt-1 border-t border-slate-850 text-xs">
          {/* Mobile Scenario Selector */}
          <div className="flex-1 flex items-center gap-1.5 bg-slate-900 border border-slate-700/60 rounded-xl px-2.5 py-1 min-w-0">
            <Cpu className="w-3 h-3 text-emerald-400 flex-shrink-0" />
            <select
              value={scenario}
              onChange={(e) => onScenarioChange(e.target.value)}
              className="w-full bg-transparent text-[9.5px] font-mono font-bold text-white focus:outline-none cursor-pointer truncate"
              aria-label="Simulation Scenario Mobile"
            >
              {SCENARIOS.map((s) => (
                <option key={s} value={s} className="bg-slate-900 text-slate-200">
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Mobile Quick Action Buttons */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={onOpenSelfLearning}
              className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-[9px] font-orbitron font-bold text-emerald-300 transition flex items-center gap-1"
              title="AI Learning"
            >
              <Brain className="w-3 h-3 text-emerald-400" />
              <span>99.6%</span>
            </button>

            <button
              onClick={onOpenPassport}
              className="px-2.5 py-1 rounded-xl bg-purple-500/10 border border-purple-500/25 text-[9px] font-orbitron font-bold text-purple-300 transition flex items-center gap-1"
              title="EU Battery Passport"
            >
              <FileText className="w-3 h-3 text-purple-400" />
              <span>PASSPORT</span>
            </button>
          </div>
        </div>

      </div>
    </header>
  );
};
