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
  Server
} from 'lucide-react';

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
  isLiveBackend = false
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
      className={`fixed top-0 left-0 bottom-0 z-40 flex flex-col bg-slate-950/95 backdrop-blur-xl border-r border-slate-800/80 transition-all duration-300 ease-in-out select-none ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80">
        {!isCollapsed ? (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-400 flex items-center justify-center text-slate-950 font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)] flex-shrink-0">
              <Zap className="w-4 h-4 fill-slate-950" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-orbitron font-extrabold text-sm tracking-wider text-white truncate">
                VOLT<span className="text-cyan-400">AI</span> BMS
              </span>
              <span className="text-[9px] font-mono text-slate-400 tracking-tight truncate">
                EV Battery Intelligence
              </span>
            </div>
          </div>
        ) : (
          <div className="mx-auto">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-400 flex items-center justify-center text-slate-950 font-bold shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <Zap className="w-4 h-4 fill-slate-950" />
            </div>
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className={`p-1.5 rounded-lg bg-slate-900 border border-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-800 transition ${
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
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group relative text-left ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/15 to-emerald-500/10 border border-cyan-500/30 text-white shadow-[0_0_15px_rgba(6,182,212,0.15)] font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              {/* Icon Container */}
              <div
                className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                    : 'bg-slate-900 text-slate-400 group-hover:text-slate-200 group-hover:bg-slate-800'
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
                <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-orbitron rounded-lg border border-slate-700 shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                  <div className="font-bold">{item.label}</div>
                  <div className="text-[9px] font-mono text-slate-400">{item.subLabel}</div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Collapse Toggle for Mini Mode */}
      {isCollapsed && (
        <div className="p-2 border-t border-slate-800/80 flex justify-center">
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg bg-slate-900 border border-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Expand Sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* System Status Footprint */}
      {!isCollapsed && (
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 font-mono text-[10px]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-slate-500 flex items-center gap-1">
              <Server className={`w-3 h-3 ${isLiveBackend ? 'text-emerald-400 animate-pulse' : 'text-cyan-400'}`} />
              PIPELINE
            </span>
            <span className={`font-bold ${isLiveBackend ? 'text-emerald-400' : 'text-cyan-400'}`}>
              {isLiveBackend ? 'FASTAPI LIVE' : '1Hz SIMULATOR'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[9px] text-slate-400">
            <span>Model Version:</span>
            <span className="text-slate-300 font-semibold">v1.4.2 (RF-Ensemble)</span>
          </div>
          <div className="flex items-center justify-between text-[9px] text-slate-400 mt-0.5">
            <span>Status:</span>
            <span className="text-emerald-400 font-semibold">ONLINE (1 Hz)</span>
          </div>
        </div>
      )}
    </aside>
  );
};
