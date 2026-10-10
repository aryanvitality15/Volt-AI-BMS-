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
  Bell
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
    <header
      className="sticky top-0 z-30 w-full bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80 px-4 lg:px-8 py-3 shadow-2xl select-none"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Left: Mobile Toggle & Battery System Identification (PDF Page 18) */}
        <div className="flex items-center justify-between md:justify-start gap-3">
          <div className="flex items-center gap-2.5">
            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-xl bg-slate-900 border border-slate-700/60 text-slate-400 hover:text-white lg:hidden transition"
              title="Toggle Navigation Menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-orbitron font-extrabold tracking-wider text-white">
                  VOLT<span className="text-cyan-400">AI</span> INTELLIGENCE
                </h1>
                <span className="text-[8.5px] font-orbitron uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  LFP 8S1P
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                <span>Battery: <strong className="text-slate-200 font-semibold">EV-BAT-001</strong></span>
                <span className="text-slate-700">│</span>
                <span>Vehicle: <strong className="text-cyan-400 font-semibold">KA05ER7777</strong></span>
                <span className="text-slate-700">│</span>
                <span className="text-slate-300">25.6V • 40Ah</span>
              </div>
            </div>
          </div>

          {/* Time & Sync Stamp (Mobile) */}
          <div className="md:hidden text-[9px] font-mono text-slate-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>{currentTime}</span>
          </div>
        </div>

        {/* Right: Real-time Indicators & Quick Action Tools (PDF Page 18) */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Timestamp Pill (Desktop) */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[10px] font-mono text-slate-300">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Updated:</span>
            <strong className="text-white font-bold">{currentTime || '12:04:32'}</strong>
          </div>

          {/* Data Source Label (PDF Page 18, 19) */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/90 border border-slate-800 text-[10px] font-mono">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]'}`} />
            <span className={`${isConnected ? 'text-emerald-400' : 'text-cyan-400'} font-bold font-orbitron text-[9px]`}>
              {isConnected ? 'LIVE 1Hz' : 'ONLINE 1Hz'}
            </span>
            <span className="text-slate-600">│</span>
            <span className="text-slate-400 text-[9px]">
              {isConnected ? 'FastAPI Stream' : 'Physics Simulator'}
            </span>
          </div>

          {/* Simulation Scenario Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/60 rounded-xl px-2.5 py-1 text-xs">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <select
              value={scenario}
              onChange={(e) => onScenarioChange(e.target.value)}
              className="bg-transparent text-[10px] font-mono font-bold text-white focus:outline-none cursor-pointer pr-1"
            >
              {SCENARIOS.map((s) => (
                <option key={s} value={s} className="bg-slate-900 text-slate-200">
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Alert Counter Button */}
          <button
            onClick={onOpenAlerts}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-orbitron font-bold border transition ${
              activeAlertCount > 0
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.3)] animate-pulse'
                : 'bg-slate-900 border-slate-700/60 text-slate-400 hover:text-white'
            }`}
            title="View Active Anomalies & Safety Alerts"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>{activeAlertCount > 0 ? `${activeAlertCount} ALERTS` : '0 ALERTS'}</span>
          </button>

          {/* AI Self Learning Badge */}
          <button
            onClick={onOpenSelfLearning}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-[10px] font-orbitron font-bold text-emerald-300 transition"
            title="Continuous Self-Learning & Accuracy Metrics"
          >
            <Brain className="w-3 h-3 text-emerald-400" />
            <span>AI LEARN</span>
            <span className="text-[8.5px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300">99.6%</span>
          </button>

          {/* Battery Passport Modal */}
          <button
            onClick={onOpenPassport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 text-[10px] font-orbitron font-bold text-purple-300 transition"
            title="EU Battery Digital Passport"
          >
            <FileText className="w-3 h-3 text-purple-400" />
            <span className="hidden sm:inline">PASSPORT</span>
          </button>
        </div>
      </div>
    </header>
  );
};
