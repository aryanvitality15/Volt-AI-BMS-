import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Database,
  Calendar,
  Filter,
  RefreshCw,
  Download,
  Activity,
  Zap,
  Flame,
  TrendingDown,
  ShieldAlert,
  Battery,
  Layers,
  Search,
  CheckCircle2,
  Clock
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { api, BatteryRecord, HistoricalTelemetryPoint } from '../services/api';

interface DataHistoryViewProps {
  batteries: BatteryRecord[];
  activeBatteryId: string;
  onSelectBattery: (batteryId: string) => void;
}

export const DataHistoryView: React.FC<DataHistoryViewProps> = ({
  batteries,
  activeBatteryId,
  onSelectBattery
}) => {
  const [selectedBattery, setSelectedBattery] = useState<string>(activeBatteryId);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [limit, setLimit] = useState<number>(100);
  const [historyRecords, setHistoryRecords] = useState<HistoricalTelemetryPoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<'telemetry' | 'table'>('telemetry');
  const [filterSource, setFilterSource] = useState<'ALL' | 'MQTT' | 'SIMULATED' | 'PHYSICAL'>('ALL');

  useEffect(() => {
    setSelectedBattery(activeBatteryId);
  }, [activeBatteryId]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const records = await api.getScopedHistory(selectedBattery, startDate || undefined, endDate || undefined, limit);
      setHistoryRecords(records);
    } catch (e) {
      console.error('Failed to load historical database records:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [selectedBattery, limit]);

  // Filter records by data source if requested
  const filteredRecords = useMemo(() => {
    if (filterSource === 'ALL') return historyRecords;
    return historyRecords.filter((r) => {
      const src = (r.data_source || 'PHYSICAL').toUpperCase();
      if (filterSource === 'MQTT') return src.includes('MQTT');
      if (filterSource === 'SIMULATED') return src.includes('SIMULAT');
      return !src.includes('MQTT') && !src.includes('SIMULAT');
    });
  }, [historyRecords, filterSource]);

  // Derived Summary Metrics
  const summary = useMemo(() => {
    if (!filteredRecords.length) return null;
    let sumV = 0;
    let sumI = 0;
    let maxT = -999;
    let minT = 999;
    let sumSoh = 0;

    filteredRecords.forEach((r) => {
      sumV += r.pack_voltage;
      sumI += r.pack_current;
      if (r.max_temperature > maxT) maxT = r.max_temperature;
      if (r.min_temperature < minT) minT = r.min_temperature;
      sumSoh += r.soh;
    });

    return {
      count: filteredRecords.length,
      avgVoltage: (sumV / filteredRecords.length).toFixed(2),
      avgCurrent: (sumI / filteredRecords.length).toFixed(1),
      peakTemp: maxT.toFixed(1),
      minTemp: minT.toFixed(1),
      avgSoh: (sumSoh / filteredRecords.length).toFixed(1),
      latestRecord: filteredRecords[filteredRecords.length - 1]
    };
  }, [filteredRecords]);

  // Export to CSV
  const handleExportCsv = () => {
    if (!filteredRecords.length) return;
    const headers = ['id', 'timestamp', 'battery_id', 'pack_voltage', 'pack_current', 'avg_temperature', 'max_temperature', 'soc', 'soh', 'cycle', 'max_cell_imbalance', 'data_source'];
    const rows = filteredRecords.map((r) => [
      r.id,
      r.timestamp,
      r.battery_id,
      r.pack_voltage,
      r.pack_current,
      r.avg_temperature,
      r.max_temperature,
      r.soc,
      r.soh,
      r.cycle,
      (r.max_cell_imbalance * 1000).toFixed(1),
      r.data_source || 'PHYSICAL'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `volt_history_${selectedBattery}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Filter Controls Card */}
      <div className="p-4 sm:p-5 rounded-2xl volt-glass-card border border-white/[0.08] shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-orbitron font-bold uppercase tracking-wider text-white">
                  PERSISTENT DATA HISTORY & AUDIT ARCHIVE
                </h2>
                <span className="text-[9px] font-orbitron font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  SQLite / Postgres Active
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Authentic historical battery readings, IoT measurements, and AI inferences
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchHistory}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-xs font-mono text-slate-300 hover:text-white transition flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
              <span>Query Database</span>
            </button>
            <button
              onClick={handleExportCsv}
              disabled={!filteredRecords.length}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-xs font-mono text-cyan-300 hover:text-white transition flex items-center gap-1.5 disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mt-4 pt-4 border-t border-white/[0.08]">
          {/* Battery Selector */}
          <div>
            <label className="block text-[10px] font-mono text-slate-400 mb-1">BATTERY PACK</label>
            <select
              value={selectedBattery}
              onChange={(e) => {
                setSelectedBattery(e.target.value);
                onSelectBattery(e.target.value);
              }}
              className="w-full px-3 py-1.5 rounded-xl bg-[#090c14] border border-white/[0.1] text-xs font-mono text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              {batteries.map((b) => (
                <option key={b.battery_id} value={b.battery_id}>
                  {b.battery_id} — {b.battery_name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Start */}
          <div>
            <label className="block text-[10px] font-mono text-slate-400 mb-1">FROM DATE / TIME</label>
            <input
              type="text"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="YYYY-MM-DD or ISO"
              className="w-full px-3 py-1.5 rounded-xl bg-[#090c14] border border-white/[0.1] text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Date Range End */}
          <div>
            <label className="block text-[10px] font-mono text-slate-400 mb-1">TO DATE / TIME</label>
            <input
              type="text"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="YYYY-MM-DD or ISO"
              className="w-full px-3 py-1.5 rounded-xl bg-[#090c14] border border-white/[0.1] text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Data Source Filter */}
          <div>
            <label className="block text-[10px] font-mono text-slate-400 mb-1">SOURCE TAG</label>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value as any)}
              className="w-full px-3 py-1.5 rounded-xl bg-[#090c14] border border-white/[0.1] text-xs font-mono text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="ALL">All Data Sources</option>
              <option value="PHYSICAL">Physical / HW Telemetry</option>
              <option value="MQTT">HiveMQ MQTT Ingestion</option>
              <option value="SIMULATED">Simulated Synthetic</option>
            </select>
          </div>

          {/* Limit Selector */}
          <div>
            <label className="block text-[10px] font-mono text-slate-400 mb-1">MAX RECORDS</label>
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value, 10))}
              className="w-full px-3 py-1.5 rounded-xl bg-[#090c14] border border-white/[0.1] text-xs font-mono text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value={25}>Latest 25 records</option>
              <option value={50}>Latest 50 records</option>
              <option value={100}>Latest 100 records</option>
              <option value={250}>Latest 250 records</option>
              <option value={500}>Latest 500 records</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-xl volt-glass-card border border-white/[0.08]">
            <span className="text-[10px] font-mono text-slate-400 block mb-1">TOTAL RECORDS</span>
            <span className="text-lg font-orbitron font-bold text-white">{summary.count}</span>
            <span className="text-[9px] font-mono text-slate-500 block">in current query</span>
          </div>

          <div className="p-3 rounded-xl volt-glass-card border border-white/[0.08]">
            <span className="text-[10px] font-mono text-slate-400 block mb-1">MEAN VOLTAGE</span>
            <span className="text-lg font-orbitron font-bold text-cyan-400">{summary.avgVoltage} V</span>
            <span className="text-[9px] font-mono text-slate-500 block">Pack Bus Voltage</span>
          </div>

          <div className="p-3 rounded-xl volt-glass-card border border-white/[0.08]">
            <span className="text-[10px] font-mono text-slate-400 block mb-1">MEAN CURRENT</span>
            <span className="text-lg font-orbitron font-bold text-blue-400">{summary.avgCurrent} A</span>
            <span className="text-[9px] font-mono text-slate-500 block">Net Flow</span>
          </div>

          <div className="p-3 rounded-xl volt-glass-card border border-white/[0.08]">
            <span className="text-[10px] font-mono text-slate-400 block mb-1">PEAK TEMPERATURE</span>
            <span className="text-lg font-orbitron font-bold text-amber-400">{summary.peakTemp} °C</span>
            <span className="text-[9px] font-mono text-slate-500 block">Envelope Peak</span>
          </div>

          <div className="p-3 rounded-xl volt-glass-card border border-white/[0.08]">
            <span className="text-[10px] font-mono text-slate-400 block mb-1">MEAN SOH</span>
            <span className="text-lg font-orbitron font-bold text-emerald-400">{summary.avgSoh} %</span>
            <span className="text-[9px] font-mono text-slate-500 block">Degradation Avg</span>
          </div>

          <div className="p-3 rounded-xl volt-glass-card border border-white/[0.08]">
            <span className="text-[10px] font-mono text-slate-400 block mb-1">LAST SYNC TIME</span>
            <span className="text-xs font-mono font-bold text-slate-200 truncate block">
              {summary.latestRecord?.timestamp?.split('T')[1]?.slice(0, 8) || 'Active'}
            </span>
            <span className="text-[9px] font-mono text-cyan-400 block">
              {summary.latestRecord?.data_source || 'PHYSICAL'}
            </span>
          </div>
        </div>
      )}

      {/* View Mode Toggle: Interactive Charts vs Raw Database Table */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2 text-xs font-mono">
        <button
          onClick={() => setActiveSubTab('telemetry')}
          className={`px-3 py-1.5 rounded-lg transition ${
            activeSubTab === 'telemetry'
              ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-400/40'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Telemetry Trend Charts
        </button>
        <button
          onClick={() => setActiveSubTab('table')}
          className={`px-3 py-1.5 rounded-lg transition ${
            activeSubTab === 'table'
              ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-400/40'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Raw Database Records ({filteredRecords.length})
        </button>
      </div>

      {/* Empty State */}
      {!isLoading && filteredRecords.length === 0 && (
        <div className="p-12 text-center rounded-2xl volt-glass-card border border-white/[0.08]">
          <Database className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-orbitron font-bold text-slate-300 uppercase">
            No Historical Records Found
          </h3>
          <p className="text-xs text-slate-500 font-mono mt-1 max-w-md mx-auto">
            No telemetry records match the selected date filters and battery ID '{selectedBattery}'.
            Try expanding the date range or selecting a different registered battery pack.
          </p>
        </div>
      )}

      {/* TREND CHARTS SUB-TAB */}
      {activeSubTab === 'telemetry' && filteredRecords.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Historical Voltage & Current */}
          <div className="p-5 rounded-2xl volt-glass-card border border-white/[0.08] shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-orbitron font-bold text-white uppercase tracking-wider">
                  Pack Voltage & Current History
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Database Time-Series</span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredRecords}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="timestamp"
                    stroke="#64748b"
                    tick={{ fontSize: 9 }}
                    tickFormatter={(v) => (v ? v.split('T')[1]?.slice(0, 8) || v.slice(-8) : '')}
                  />
                  <YAxis yAxisId="left" stroke="#00f0ff" tick={{ fontSize: 9 }} unit="V" domain={['auto', 'auto']} />
                  <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" tick={{ fontSize: 9 }} unit="A" domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ backgroundColor: '#0a0d14', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Line yAxisId="left" type="monotone" dataKey="pack_voltage" name="Voltage (V)" stroke="#00f0ff" strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="pack_current" name="Current (A)" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Temperature & Thermal Trends */}
          <div className="p-5 rounded-2xl volt-glass-card border border-white/[0.08] shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-orbitron font-bold text-white uppercase tracking-wider">
                  Thermal Trends (Max vs Avg)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-amber-400">°C Envelope</span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredRecords}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="timestamp"
                    stroke="#64748b"
                    tick={{ fontSize: 9 }}
                    tickFormatter={(v) => (v ? v.split('T')[1]?.slice(0, 8) || v.slice(-8) : '')}
                  />
                  <YAxis stroke="#f59e0b" tick={{ fontSize: 9 }} unit="°C" domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ backgroundColor: '#0a0d14', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Line type="monotone" dataKey="max_temperature" name="Peak Temp (°C)" stroke="#f43f5e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="avg_temperature" name="Avg Temp (°C)" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: SOC & SOH Trajectory */}
          <div className="p-5 rounded-2xl volt-glass-card border border-white/[0.08] shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-orbitron font-bold text-white uppercase tracking-wider">
                  SOC vs SOH Degradation History
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">Health Ledger</span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredRecords}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="timestamp"
                    stroke="#64748b"
                    tick={{ fontSize: 9 }}
                    tickFormatter={(v) => (v ? v.split('T')[1]?.slice(0, 8) || v.slice(-8) : '')}
                  />
                  <YAxis stroke="#10b981" tick={{ fontSize: 9 }} unit="%" domain={[50, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#0a0d14', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Line type="monotone" dataKey="soh" name="SOH (%)" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="soc" name="SOC (%)" stroke="#06b6d4" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Cell Imbalance & Cycle Progression */}
          <div className="p-5 rounded-2xl volt-glass-card border border-white/[0.08] shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-orbitron font-bold text-white uppercase tracking-wider">
                  Cell Imbalance (ΔV) & Cycle History
                </h3>
              </div>
              <span className="text-[10px] font-mono text-purple-400">Millivolts spread</span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredRecords}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="timestamp"
                    stroke="#64748b"
                    tick={{ fontSize: 9 }}
                    tickFormatter={(v) => (v ? v.split('T')[1]?.slice(0, 8) || v.slice(-8) : '')}
                  />
                  <YAxis stroke="#a855f7" tick={{ fontSize: 9 }} unit="V" domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ backgroundColor: '#0a0d14', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Line type="monotone" dataKey="max_cell_imbalance" name="Max Imbalance (V)" stroke="#a855f7" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* RAW DATABASE RECORDS TABLE SUB-TAB */}
      {activeSubTab === 'table' && filteredRecords.length > 0 && (
        <div className="rounded-2xl volt-glass-card border border-white/[0.08] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-white/[0.04] border-b border-white/[0.08] text-slate-400 text-[10px] font-orbitron">
                <tr>
                  <th className="p-3"># ID</th>
                  <th className="p-3">TIMESTAMP</th>
                  <th className="p-3">BATTERY</th>
                  <th className="p-3">VOLTAGE</th>
                  <th className="p-3">CURRENT</th>
                  <th className="p-3">AVG TEMP</th>
                  <th className="p-3">MAX TEMP</th>
                  <th className="p-3">SOC</th>
                  <th className="p-3">SOH</th>
                  <th className="p-3">CYCLE</th>
                  <th className="p-3">IMBALANCE</th>
                  <th className="p-3">RISK</th>
                  <th className="p-3">DATA SOURCE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-slate-300">
                {filteredRecords.map((r) => {
                  const isMqtt = (r.data_source || '').includes('MQTT');
                  const isSim = (r.data_source || '').includes('SIMULAT');
                  return (
                    <tr key={r.id} className="hover:bg-white/[0.02] transition">
                      <td className="p-3 text-slate-500 font-bold">{r.id}</td>
                      <td className="p-3 text-slate-200 whitespace-nowrap">
                        {r.timestamp?.replace('T', ' ')?.slice(0, 19)}
                      </td>
                      <td className="p-3 font-semibold text-cyan-300">{r.battery_id}</td>
                      <td className="p-3 tabular-nums">{r.pack_voltage?.toFixed(2)} V</td>
                      <td className="p-3 tabular-nums">{r.pack_current?.toFixed(1)} A</td>
                      <td className="p-3 tabular-nums">{r.avg_temperature?.toFixed(1)} °C</td>
                      <td className="p-3 tabular-nums text-amber-400">{r.max_temperature?.toFixed(1)} °C</td>
                      <td className="p-3 tabular-nums">{r.soc?.toFixed(1)} %</td>
                      <td className="p-3 tabular-nums text-emerald-400 font-bold">{r.soh?.toFixed(1)} %</td>
                      <td className="p-3 tabular-nums">{r.cycle}</td>
                      <td className="p-3 tabular-nums">{(r.max_cell_imbalance * 1000)?.toFixed(1)} mV</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          r.risk_level === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                          r.risk_level === 'WARNING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                          'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}>
                          {r.risk_level || 'NORMAL'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                          isMqtt ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' :
                          isSim ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' :
                          'bg-slate-700/40 text-slate-300 border border-slate-600/40'
                        }`}>
                          {r.data_source || 'PHYSICAL'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
