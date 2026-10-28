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
  SlidersHorizontal,
  Bluetooth,
  LogOut,
  User
} from 'lucide-react';
import { motion } from 'framer-motion';
import { HardwareSourceMode, HardwareStatus } from '../services/hardwareTelemetry';
import { OperatorSession } from './VoltLoginGateway';

interface HeaderProps {
  scenario: string;
  onScenarioChange: (scenario: string) => void;
  isConnected: boolean;
  onOpenPassport: () => void;
  onOpenWhatIf: () => void;
  onOpenSelfLearning?: () => void;
  onOpenAlerts?: () => void;
  onOpenHardwareConnect?: () => void;
  hardwareMode?: HardwareSourceMode;
  hardwareStatus?: HardwareStatus;
  activeAlertCount: number;
  onToggleSidebar?: () => void;
  operatorSession?: OperatorSession | null;
  onSignOut?: () => void;
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
  onOpenHardwareConnect,
  hardwareMode = 'SIMULATOR',
  hardwareStatus = 'DISCONNECTED',
  activeAlertCount,
  onToggleSidebar,
  operatorSession,
  onSignOut
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
    <header className="sticky top-0 z-30 w-full bg-[#07080e]/92 backdrop-blur-2xl border-b border-white/[0.07] px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 shadow-[0_10px_30px_rgba(0,0,0,0.7)] select-none">
      <div className="w-full flex flex-col gap-2.5">
        
        {/* Tier 1: Main Bar */}
        <div className="flex items-center justify-between gap-3 min-w-0">
          
          {/* Left: Branding & Vehicle/Battery Identifiers */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
            {/* Mobile / Tablet Hamburger Toggle */}
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-slate-300 hover:text-white lg:hidden transition flex-shrink-0"
              title="Toggle Navigation Menu"
              aria-label="Toggle Navigation Menu"
            >
              <Menu className="w-4 h-4 text-cyan-400" />
            </button>

            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2 whitespace-nowrap">
                <h1 className="text-xs sm:text-sm font-orbitron font-extrabold tracking-wider text-white flex items-center gap-1.5">
                  <span className="text-white">VOLT</span>
                  <span className="text-cyan-400">AI</span>
                  <span className="text-white/30 font-mono text-[10px] sm:text-xs">/</span>
                  <span className="hidden sm:inline text-slate-300 text-[10px] sm:text-xs tracking-wider">NEURAL BATTERY LAB</span>
                </h1>
                <span className="text-[8px] sm:text-[8.5px] font-orbitron uppercase font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex-shrink-0">
                  LFP 8S1P
                </span>
              </div>
              
              <div className="hidden 2xl:flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5 whitespace-nowrap">
                <span>Battery: <strong className="text-slate-200 font-semibold">EV-BAT-001</strong></span>
                <span className="text-white/20">│</span>
                <span>Vehicle: <strong className="text-cyan-400 font-semibold">KA05ER7777</strong></span>
                <span className="text-white/20">│</span>
                <span className="text-slate-300">25.6V • 40Ah (1.02 kWh)</span>
              </div>
            </div>
          </div>

          {/* Right Desktop/Tablet: Live Status & Fast Action Triggers */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Unified Telemetry Status & Live Clock Capsule */}
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[9px] sm:text-[10px] font-mono shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] whitespace-nowrap">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isConnected || hardwareMode !== 'SIMULATOR' ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]'}`} />
              <span className={`${isConnected || hardwareMode !== 'SIMULATOR' ? 'text-emerald-400' : 'text-cyan-400'} font-bold font-orbitron text-[8.5px] sm:text-[9px]`}>
                {hardwareMode === 'BLUETOOTH' ? 'BLE 10Hz' : hardwareMode === 'WIFI' ? 'WI-FI 10Hz' : hardwareMode === 'SERIAL' ? 'SERIAL 20Hz' : isConnected ? 'LIVE 1Hz' : 'ONLINE 1Hz'}
              </span>
              <span className="hidden 2xl:inline text-white/20">│</span>
              <span className="hidden 2xl:inline text-slate-400 text-[9px]">
                {hardwareMode === 'BLUETOOTH' ? 'Web BLE' : hardwareMode === 'WIFI' ? 'Direct Wi-Fi' : hardwareMode === 'SERIAL' ? 'USB Serial' : isConnected ? 'FastAPI' : 'Physics Sim'}
              </span>
              <span className="hidden sm:inline text-white/20">│</span>
              <span className="hidden sm:inline text-slate-300 font-mono tabular-nums font-semibold">
                {currentTime || '12:00:00 AM'}
              </span>
            </div>

            {/* Hardware Connect Trigger Button */}
            <button
              onClick={onOpenHardwareConnect}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-orbitron font-bold border transition whitespace-nowrap ${
                hardwareMode === 'BLUETOOTH'
                  ? 'bg-blue-600/20 border-blue-500/50 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.3)] animate-pulse'
                  : hardwareMode === 'WIFI'
                  ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse'
                  : hardwareMode === 'SERIAL'
                  ? 'bg-amber-600/20 border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse'
                  : 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30 text-cyan-300 hover:text-white hover:border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
              }`}
              title="Connect ESP32 / Arduino / BLE BMS Hardware"
            >
              {hardwareMode === 'BLUETOOTH' ? (
                <Bluetooth className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              ) : hardwareMode === 'WIFI' ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              ) : hardwareMode === 'SERIAL' ? (
                <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              ) : (
                <Radio className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              )}
              <span>
                {hardwareMode === 'BLUETOOTH'
                  ? 'BLE BMS'
                  : hardwareMode === 'WIFI'
                  ? 'WI-FI BMS'
                  : hardwareMode === 'SERIAL'
                  ? 'USB SERIAL'
                  : 'HARDWARE I/O'}
              </span>
            </button>

            {/* Alert Counter Button */}
            <button
              onClick={onOpenAlerts}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-orbitron font-bold border transition whitespace-nowrap ${
                activeAlertCount > 0
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse'
                  : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-white hover:border-white/20'
              }`}
              title="View Active Anomalies & Safety Alerts"
            >
              <Bell className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
              <span>{activeAlertCount > 0 ? `${activeAlertCount}` : '0'} <span className="hidden sm:inline">ALERTS</span></span>
            </button>

            {/* Desktop Scenario Selector (Shown on wider desktop displays) */}
            <div className="hidden 2xl:flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.08] rounded-xl px-2.5 py-1 text-xs shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] whitespace-nowrap">
              <Cpu className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <select
                value={scenario}
                onChange={(e) => onScenarioChange(e.target.value)}
                className="bg-transparent text-[10px] font-mono font-bold text-white focus:outline-none cursor-pointer pr-1"
                aria-label="Simulation Scenario"
              >
                {SCENARIOS.map((s) => (
                  <option key={s} value={s} className="bg-[#0a0b10] text-slate-200">
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* AI Self Learning Badge */}
            <button
              onClick={onOpenSelfLearning}
              className="hidden 2xl:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-[10px] font-orbitron font-bold text-emerald-300 transition shadow-[0_0_12px_rgba(16,185,129,0.15)] whitespace-nowrap"
              title="Continuous Self-Learning & Accuracy Metrics"
            >
              <Brain className="w-3 h-3 text-emerald-400 flex-shrink-0" />
              <span>AI LEARN</span>
              <span className="text-[8.5px] font-mono px-1 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300">99.6%</span>
            </button>

            {/* Battery Passport Button */}
            <button
              onClick={onOpenPassport}
              className="hidden 2xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 text-[10px] font-orbitron font-bold text-purple-300 transition shadow-[0_0_12px_rgba(168,85,247,0.15)] whitespace-nowrap"
              title="EU Battery Digital Passport"
            >
              <FileText className="w-3 h-3 text-purple-400 flex-shrink-0" />
              <span>PASSPORT</span>
            </button>

            {/* Operator Profile & Sign Out Control (Always visible & inside frame) */}
            {operatorSession && (
              <div className="flex items-center gap-1.5 sm:gap-2 pl-2 sm:pl-3 border-l border-white/[0.08] flex-shrink-0">
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white/[0.03] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] flex-shrink-0">
                  <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-cyan-500/25 to-indigo-500/25 border border-cyan-400/40 flex items-center justify-center text-[10px] font-bold text-cyan-300 flex-shrink-0">
                    {operatorSession.name ? operatorSession.name.charAt(0).toUpperCase() : 'O'}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-semibold text-slate-200 leading-tight truncate max-w-[80px] sm:max-w-[110px]">
                      {operatorSession.name}
                    </span>
                    <span className={`text-[8px] font-mono font-bold leading-tight ${
                      operatorSession.role === 'BMS Engineer' ? 'text-emerald-400' : operatorSession.role === 'Fleet Admin' ? 'text-purple-400' : 'text-amber-400'
                    }`}>
                      {operatorSession.role}
                    </span>
                  </div>
                </div>

                {onSignOut && (
                  <button
                    onClick={onSignOut}
                    className="p-1.5 rounded-xl bg-white/[0.03] hover:bg-rose-500/15 border border-white/[0.08] hover:border-rose-500/40 text-slate-400 hover:text-rose-300 transition flex-shrink-0"
                    title="Sign Out of Volt BMS Gateway"
                    aria-label="Sign Out of Volt BMS Gateway"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tier 2: Scenario & Quick Controls Toolbar (Shown on 2xl and below for effortless access) */}
        <div className="flex 2xl:hidden items-center justify-between gap-2 pt-1.5 border-t border-white/[0.07] text-xs">
          {/* Mobile/Tablet Scenario Selector */}
          <div className="flex-1 flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.08] rounded-xl px-2.5 py-1 min-w-0">
            <Cpu className="w-3 h-3 text-emerald-400 flex-shrink-0" />
            <select
              value={scenario}
              onChange={(e) => onScenarioChange(e.target.value)}
              className="w-full bg-transparent text-[9.5px] font-mono font-bold text-white focus:outline-none cursor-pointer truncate"
              aria-label="Simulation Scenario Mobile"
            >
              {SCENARIOS.map((s) => (
                <option key={s} value={s} className="bg-[#0a0b10] text-slate-200">
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Action Buttons for smaller screens */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={onOpenHardwareConnect}
              className={`px-2.5 py-1 rounded-xl border text-[9px] font-orbitron font-bold transition flex items-center gap-1 ${
                hardwareMode !== 'SIMULATOR'
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-300 animate-pulse'
                  : 'bg-cyan-500/10 border-cyan-500/25 text-cyan-300'
              }`}
              title="Hardware I/O"
            >
              <Radio className="w-3 h-3" />
              <span>I/O</span>
            </button>

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

            {onSignOut && (
              <button
                onClick={onSignOut}
                className="px-2 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-[9px] font-orbitron font-bold text-rose-300 transition flex items-center gap-1"
                title="Sign Out"
              >
                <LogOut className="w-3 h-3" />
                <span>EXIT</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </header>
  );
};
