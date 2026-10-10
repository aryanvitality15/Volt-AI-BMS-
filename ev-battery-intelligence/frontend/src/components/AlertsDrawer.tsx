import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  X,
  Shield,
  Thermometer,
  Zap,
  Flame,
  Activity,
  Filter,
  CheckCheck,
  Clock,
  Cpu,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertItem } from '../types';

interface AlertsDrawerProps {
  alerts: AlertItem[];
  isOpen: boolean;
  onClose: () => void;
  onResolveAlert: (id: number) => void;
}

export const AlertsDrawer: React.FC<AlertsDrawerProps> = ({
  alerts,
  isOpen,
  onClose,
  onResolveAlert
}) => {
  const [filterTab, setFilterTab] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ALL');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING'>('ALL');

  // Format timestamp helper
  const formatTimestamp = (ts?: string) => {
    if (!ts) return 'Just now';
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return ts;
    }
  };

  // Icon helper based on alert title/type
  const getAlertIcon = (alert: AlertItem) => {
    const text = (alert.title || alert.type || alert.description || '').toLowerCase();
    if (text.includes('therm') || text.includes('temp') || text.includes('heat')) {
      return <Flame className="w-4 h-4 text-rose-400" />;
    }
    if (text.includes('imbalance') || text.includes('voltage') || text.includes('undervoltage')) {
      return <Zap className="w-4 h-4 text-amber-400" />;
    }
    if (text.includes('current') || text.includes('overcurrent') || text.includes('c-rate')) {
      return <Activity className="w-4 h-4 text-cyan-400" />;
    }
    if (text.includes('sensor') || text.includes('resistance')) {
      return <Cpu className="w-4 h-4 text-purple-400" />;
    }
    return <ShieldAlert className="w-4 h-4 text-rose-400" />;
  };

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    return (alerts || []).filter((al) => {
      if (filterTab === 'ACTIVE' && al.status !== 'ACTIVE') return false;
      if (filterTab === 'RESOLVED' && al.status !== 'RESOLVED') return false;
      if (severityFilter !== 'ALL' && al.level !== severityFilter) return false;
      return true;
    });
  }, [alerts, filterTab, severityFilter]);

  const activeCount = useMemo(() => (alerts || []).filter((a) => a.status === 'ACTIVE').length, [alerts]);
  const resolvedCount = useMemo(() => (alerts || []).filter((a) => a.status === 'RESOLVED').length, [alerts]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-end p-0 backdrop-blur-md"
        style={{ background: 'rgba(5, 10, 21, 0.82)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ x: 450, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 450, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-lg h-full glass-panel-elevated border-l border-emerald-500/15 p-6 flex flex-col overflow-hidden shadow-2xl"
          style={{ boxShadow: '-25px 0 80px rgba(0, 0, 0, 0.6)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Background grid */}
          <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-700/60 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/25 flex items-center justify-center shadow-[0_0_15px_rgba(244,63,94,0.15)]">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-orbitron font-bold text-white tracking-wide flex items-center gap-2">
                  <span>SYSTEM ALERTS & INCIDENTS</span>
                  {activeCount > 0 && (
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
                      {activeCount} Active
                    </span>
                  )}
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">
                  ISO 26262 ASIL-C Safety Monitor • Total: {alerts.length}
                </span>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition border border-slate-700/50"
            >
              <X className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Filter Toolbar */}
          <div className="py-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 relative z-10">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/80 border border-slate-800">
              <button
                onClick={() => setFilterTab('ALL')}
                className={`px-2.5 py-1 text-[9px] font-orbitron font-bold rounded-lg transition-all ${
                  filterTab === 'ALL'
                    ? 'bg-slate-700 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ALL ({alerts.length})
              </button>
              <button
                onClick={() => setFilterTab('ACTIVE')}
                className={`px-2.5 py-1 text-[9px] font-orbitron font-bold rounded-lg transition-all ${
                  filterTab === 'ACTIVE'
                    ? 'bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.4)]'
                    : 'text-rose-400 hover:bg-rose-500/10'
                }`}
              >
                ACTIVE ({activeCount})
              </button>
              <button
                onClick={() => setFilterTab('RESOLVED')}
                className={`px-2.5 py-1 text-[9px] font-orbitron font-bold rounded-lg transition-all ${
                  filterTab === 'RESOLVED'
                    ? 'bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                    : 'text-emerald-400 hover:bg-emerald-500/10'
                }`}
              >
                RESOLVED ({resolvedCount})
              </button>
            </div>

            {/* Severity Filter */}
            <div className="flex items-center gap-1 text-[9px] font-mono">
              <span className="text-slate-500">Severity:</span>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as any)}
                className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-[9px] focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Levels</option>
                <option value="CRITICAL">Critical Only</option>
                <option value="WARNING">Warning Only</option>
              </select>
            </div>
          </div>

          {/* Specific Alerts List */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1 relative z-10">
            {filteredAlerts && filteredAlerts.length > 0 ? (
              filteredAlerts.map((al, idx) => {
                const isCritical = al.level === 'CRITICAL';
                const isActive = al.status === 'ACTIVE';
                const alertTitle = al.title || al.type || 'SYSTEM ALERT';
                const alertDesc = al.description || al.message || 'Telemetry parameter deviated from safety boundaries.';
                const timeString = formatTimestamp(al.timestamp || al.ts);

                return (
                  <motion.div
                    key={al.id || idx}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className={`p-4 rounded-2xl border transition-all duration-200 relative overflow-hidden ${
                      isActive
                        ? isCritical
                          ? 'bg-rose-500/10 border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.12)]'
                          : 'bg-amber-500/10 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.12)]'
                        : 'bg-slate-900/50 border-slate-800/80 opacity-60 hover:opacity-90'
                    }`}
                  >
                    {/* Header Row: Severity Badge, Target Cell, Time */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-700/60 flex items-center justify-center">
                          {getAlertIcon(al)}
                        </div>
                        <span
                          className={`text-[8px] font-orbitron font-bold uppercase tracking-[0.15em] px-2 py-0.5 rounded-md border ${
                            isCritical
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                              : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                          }`}
                        >
                          {al.level || 'ALERT'}
                        </span>

                        {/* Affected Cell Badge */}
                        {al.cell_id !== undefined && al.cell_id !== null ? (
                          <span className="text-[8px] font-orbitron font-bold px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                            <Layers className="w-2.5 h-2.5" />
                            CELL C{al.cell_id}
                          </span>
                        ) : (
                          <span className="text-[8px] font-mono px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700">
                            PACK-LEVEL
                          </span>
                        )}
                      </div>

                      {/* Timestamp */}
                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {timeString}
                      </span>
                    </div>

                    {/* Specific Alert Title */}
                    <h4 className="text-xs font-orbitron font-bold text-white mb-1.5 tracking-wide">
                      {alertTitle}
                    </h4>

                    {/* Specific Detailed Description */}
                    <p className="text-[11px] text-slate-300 leading-relaxed mb-2.5 font-sans">
                      {alertDesc}
                    </p>

                    {/* Specific Evidence Box (if available) */}
                    {al.evidence && (
                      <div className="mb-2.5 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-[10px] font-mono text-emerald-400/90 flex items-start gap-1.5">
                        <span className="text-slate-500">Telemetry Evidence:</span>
                        <strong className="text-slate-200">{al.evidence}</strong>
                      </div>
                    )}

                    {/* Specific Recommended Action Box */}
                    {al.recommended_action && (
                      <div className="mb-3 p-2.5 rounded-xl bg-blue-500/8 border border-blue-500/20 text-[10px] font-sans text-blue-200 flex items-start gap-2">
                        <span className="text-[9px] font-orbitron font-bold text-blue-400 uppercase tracking-wider block shrink-0">
                          MITIGATION:
                        </span>
                        <span>{al.recommended_action}</span>
                      </div>
                    )}

                    {/* Footer: Status and Resolve Button */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">Status:</span>
                        <span
                          className={`font-bold flex items-center gap-1 ${
                            isActive ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? 'bg-rose-400 animate-ping' : 'bg-emerald-400'
                            }`}
                          />
                          {al.status || 'ACTIVE'}
                        </span>
                      </div>

                      {isActive ? (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onResolveAlert(al.id)}
                          className="px-3 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400 font-orbitron font-bold text-[9px] tracking-wider transition flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                        >
                          <CheckCircle className="w-3 h-3" />
                          RESOLVE INCIDENT
                        </motion.button>
                      ) : (
                        <span className="text-[9px] text-slate-500 flex items-center gap-1">
                          <CheckCheck className="w-3 h-3 text-emerald-500/60" />
                          Resolved & Logged
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="text-center py-20 text-slate-500 text-xs font-orbitron tracking-wider flex flex-col items-center gap-3">
                <CheckCircle className="w-8 h-8 text-emerald-400/40" />
                <span>NO INCIDENTS MATCHING CURRENT FILTER</span>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
