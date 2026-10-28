import React from 'react';
import {
  LayoutDashboard,
  Activity,
  Layers,
  TrendingDown,
  Clock,
  AlertTriangle,
  Sparkles,
  Cpu,
  BarChart3,
  FileText,
  ChevronLeft,
  ChevronRight,
  Zap,
  Sliders,
  ShieldAlert,
  Server,
  Radio,
  Bluetooth,
  Wifi,
  LogOut,
  User
} from 'lucide-react';
import { HardwareSourceMode } from '../services/hardwareTelemetry';
import { OperatorSession } from './VoltLoginGateway';

export type NavTab =
  | 'dashboard'
  | 'live-monitor'
  | 'battery-pack'
  | 'soh-degradation'
  | 'rul-prediction'
  | 'anomaly-detection'
  | 'explainability'
  | 'ml-models'
  | 'data-exploration'
  | 'reports';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  activeAnomalyCount?: number;
  isConnected?: boolean;
  isLiveBackend?: boolean;
  onOpenHardwareConnect?: () => void;
  hardwareMode?: HardwareSourceMode;
  operatorSession?: OperatorSession | null;
  onSignOut?: () => void;
}

interface NavItem {
  id: NavTab;
  label: string;
  subLabel: string;
  icon: React.ReactNode;
  badge?: string | number;
  badgeColor?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
  activeAnomalyCount = 0,
  isConnected = true,
  isLiveBackend = false,
  onOpenHardwareConnect,
  hardwareMode = 'SIMULATOR',
  operatorSession,
  onSignOut
}) => {
  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      subLabel: 'Overview & Hero SOH',
      icon: <LayoutDashboard className="w-4 h-4" />
    },
    {
      id: 'live-monitor',
      label: 'Live Monitor',
      subLabel: '1Hz Telemetry Stream',
      icon: <Activity className="w-4 h-4" />,
      badge: isLiveBackend ? '● API 1Hz' : '● LIVE 1Hz',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.3)] animate-pulse'
    },
    {
      id: 'battery-pack',
      label: '3D Battery Pack',
      subLabel: 'Digital Twin & Shaders',
      icon: <Layers className="w-4 h-4" />
    },
    {
      id: 'soh-degradation',
      label: 'SOH & Degradation',
      subLabel: 'Aging & Capacity Fade',
      icon: <TrendingDown className="w-4 h-4" />
    },
    {
      id: 'rul-prediction',
      label: 'RUL Prediction',
      subLabel: 'Remaining Useful Life',
      icon: <Clock className="w-4 h-4" />
    },
    {
      id: 'anomaly-detection',
      label: 'Anomaly Detection',
      subLabel: 'Timeline & Faults',
      icon: <AlertTriangle className="w-4 h-4" />,
      badge: activeAnomalyCount > 0 ? activeAnomalyCount : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
    },
    {
      id: 'explainability',
      label: 'AI Explainability',
      subLabel: 'TreeSHAP Attributions',
      icon: <Sparkles className="w-4 h-4" />
    },
    {
      id: 'ml-models',
      label: 'ML Model Evaluation',
      subLabel: 'Metrics, OLS, XGBoost',
      icon: <Cpu className="w-4 h-4" />,
      badge: 'R² 0.94',
      badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    },
    {
      id: 'data-exploration',
      label: 'Data Exploration',
      subLabel: 'Correlation Heatmap',
      icon: <BarChart3 className="w-4 h-4" />
    },
    {
      id: 'reports',
      label: 'Reports & Simulation',
      subLabel: 'PDF Export & Simulator',
      icon: <FileText className="w-4 h-4" />
    }
  ];

  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 z-40 flex flex-col bg-[#07080e]/92 backdrop-blur-2xl border-r border-white/[0.07] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_20px_50px_rgba(0,0,0,0.8)] transition-all duration-300 ease-in-out select-none ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/[0.07]">
        {!isCollapsed ? (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-emerald-400 flex items-center justify-center text-slate-950 font-bold shadow-[0_0_15px_rgba(6,182,212,0.35)] flex-shrink-0">
              <Zap className="w-4 h-4 fill-slate-950" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-orbitron font-extrabold text-sm tracking-wider text-white truncate">
                VOLT<span className="text-cyan-400">AI</span>
              </span>
              <span className="text-[9px] font-mono text-cyan-300/80 tracking-widest uppercase truncate">
                Neural Battery Lab
              </span>
            </div>
          </div>
        ) : (
          <div className="mx-auto">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-400 flex items-center justify-center text-slate-950 font-bold shadow-[0_0_15px_rgba(6,182,212,0.35)]">
              <Zap className="w-4 h-4 fill-slate-950" />
            </div>
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className={`p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.08] hover:border-white/20 transition ${
            isCollapsed ? 'hidden' : 'block'
          }`}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1 custom-scrollbar">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative text-left ${
                isActive
                  ? 'bg-gradient-to-r from-white/[0.08] to-white/[0.02] border border-white/20 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_8px_20px_rgba(0,0,0,0.4)] font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent hover:border-white/[0.06]'
              }`}
            >
              {/* Icon Container */}
              <div
                className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                    : 'bg-white/[0.03] text-slate-400 border border-white/[0.04] group-hover:text-slate-200 group-hover:bg-white/[0.06]'
                }`}
              >
                {item.icon}
              </div>

              {/* Title & Subtitle */}
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-orbitron tracking-wide truncate block">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`text-[8px] font-mono font-bold px-1.5 py-0.2 rounded border ml-1 ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[9.5px] font-mono text-slate-500 truncate block mt-0.5">
                    {item.subLabel}
                  </span>
                </div>
              )}

              {/* Collapsed Tooltip Floating Indicator */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-[#0a0b10] text-white text-xs font-orbitron rounded-xl border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.9)] opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                  <div className="font-bold">{item.label}</div>
                  <div className="text-[9px] font-mono text-slate-400">{item.subLabel}</div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Collapse Toggle & Mini Hardware Trigger */}
      {isCollapsed && (
        <div className="p-2 border-t border-white/[0.07] flex flex-col items-center gap-2">
          {onOpenHardwareConnect && (
            <button
              onClick={onOpenHardwareConnect}
              className={`p-2 rounded-lg border transition ${
                hardwareMode === 'BLUETOOTH'
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-300 animate-pulse'
                  : hardwareMode === 'WIFI'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 animate-pulse'
                  : 'bg-white/[0.03] border-white/[0.08] text-cyan-400 hover:text-white'
              }`}
              title="Connect Hardware (BLE / Wi-Fi)"
            >
              {hardwareMode === 'BLUETOOTH' ? <Bluetooth className="w-4 h-4" /> : hardwareMode === 'WIFI' ? <Wifi className="w-4 h-4" /> : <Radio className="w-4 h-4" />}
            </button>
          )}

          {operatorSession && onSignOut && (
            <button
              onClick={onSignOut}
              className="w-8 h-8 rounded-lg bg-white/[0.03] hover:bg-rose-500/20 border border-white/[0.08] hover:border-rose-500/40 text-slate-300 hover:text-rose-300 flex items-center justify-center transition"
              title={`Operator: ${operatorSession.name} (${operatorSession.role}) - Click to Sign Out`}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.08] hover:border-white/20 transition"
            title="Expand Sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* System Status Footprint & Hardware Quick Connect */}
      {!isCollapsed && (
        <div className="p-3 border-t border-white/[0.07] bg-[#07080e]/80 font-mono text-[10px] space-y-2">
          {/* Operator Profile in Sidebar */}
          {operatorSession && (
            <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-500/25 to-indigo-500/25 border border-cyan-400/40 flex items-center justify-center text-[10px] font-bold text-cyan-300 flex-shrink-0">
                  {operatorSession.name ? operatorSession.name.charAt(0).toUpperCase() : 'O'}
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold text-slate-200 truncate leading-tight">
                    {operatorSession.name}
                  </div>
                  <div className={`text-[8.5px] font-mono font-bold leading-tight ${
                    operatorSession.role === 'BMS Engineer' ? 'text-emerald-400' : operatorSession.role === 'Fleet Admin' ? 'text-purple-400' : 'text-amber-400'
                  }`}>
                    {operatorSession.role}
                  </div>
                </div>
              </div>
              {onSignOut && (
                <button
                  onClick={onSignOut}
                  className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition flex-shrink-0"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
          {onOpenHardwareConnect && (
            <button
              onClick={onOpenHardwareConnect}
              className={`w-full py-2 px-2.5 rounded-xl border flex items-center justify-between text-left transition ${
                hardwareMode === 'BLUETOOTH'
                  ? 'bg-blue-500/15 border-blue-500/40 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.25)]'
                  : hardwareMode === 'WIFI'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                  : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08] text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                {hardwareMode === 'BLUETOOTH' ? (
                  <Bluetooth className="w-3.5 h-3.5 text-blue-400" />
                ) : hardwareMode === 'WIFI' ? (
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                )}
                <div>
                  <div className="font-orbitron font-bold text-[9px] uppercase tracking-wider">
                    {hardwareMode === 'BLUETOOTH' ? 'BLE BMS NODE' : hardwareMode === 'WIFI' ? 'WI-FI BMS NODE' : 'CONNECT HARDWARE'}
                  </div>
                  <div className="text-[8px] text-slate-400 font-mono">
                    {hardwareMode !== 'SIMULATOR' ? 'Hardware Stream Active' : 'ESP32 / BLE / Wi-Fi'}
                  </div>
                </div>
              </div>
              <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-white/[0.08] text-white">
                {hardwareMode !== 'SIMULATOR' ? 'ONLINE' : 'SETUP'}
              </span>
            </button>
          )}

          <div className="pt-1 border-t border-white/[0.04]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-500 flex items-center gap-1">
                <Server className={`w-3 h-3 ${isLiveBackend || hardwareMode !== 'SIMULATOR' ? 'text-emerald-400 animate-pulse' : 'text-cyan-400'}`} />
                PIPELINE
              </span>
              <span className={`font-bold ${hardwareMode === 'BLUETOOTH' ? 'text-blue-400' : hardwareMode === 'WIFI' ? 'text-emerald-400' : isLiveBackend ? 'text-emerald-400' : 'text-cyan-400'}`}>
                {hardwareMode === 'BLUETOOTH' ? 'WEB BLE STREAM' : hardwareMode === 'WIFI' ? 'DIRECT WI-FI' : isLiveBackend ? 'FASTAPI LIVE' : '1Hz SIMULATOR'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[9px] text-slate-400">
              <span>Model Version:</span>
              <span className="text-slate-300 font-semibold">v1.4.2 (RF-Ensemble)</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
