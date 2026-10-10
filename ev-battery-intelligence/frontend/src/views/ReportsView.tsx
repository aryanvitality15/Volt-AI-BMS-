import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Download,
  Printer,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Flame,
  ShieldCheck,
  Cpu,
  Layers
} from 'lucide-react';
import { BatteryState } from '../types';

interface ReportsViewProps {
  data: BatteryState;
  onScenarioChange?: (scenario: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ data, onScenarioChange }) => {
  const [reportData, setReportData] = useState<any>(null);
  const [historyRows, setHistoryRows] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [isSimRunning, setIsSimRunning] = useState(true);

  const pack = data.pack || ({} as any);
  const ai = data.ai || ({} as any);

  // Fetch report summary payload
  useEffect(() => {
    fetch('/api/report/summary')
      .then((res) => res.json())
      .then((json) => {
        if (json) setReportData(json);
      })
      .catch(() => {});

    fetch('/api/battery/history?limit=50')
      .then((res) => res.json())
      .then((json) => {
        if (json && json.history) setHistoryRows(json.history);
      })
      .catch(() => {});
  }, []);

  const handlePrintReport = () => {
    window.print();
  };

  const handleSpeedChange = (speed: number) => {
    setSpeedMultiplier(speed);
    fetch(`/api/simulator/speed?speed=${speed}`, { method: 'POST' }).catch(() => {});
  };

  const handleDownloadCsv = () => {
    if (!historyRows || historyRows.length === 0) return;
    const headers = ['Timestamp', 'Battery ID', 'Cycle', 'Voltage (V)', 'Current (A)', 'Avg Temp (C)', 'SOC (%)', 'SOH (%)'];
    const rows = historyRows.map((r) => [
      r.timestamp,
      r.battery_id || 'EV-001',
      r.cycle || 624,
      r.voltage || r.pack_voltage,
      r.current || r.pack_current,
      r.avg_temp || r.avg_temperature,
      r.soc || 70,
      r.soh || 87.4
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EV_Battery_Telemetry_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRows = historyRows.filter((r) => {
    if (!searchQuery) return true;
    return (
      String(r.timestamp).toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(r.cycle).includes(searchQuery)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-orbitron font-bold uppercase tracking-wider text-white">
              BATTERY HEALTH REPORT & SIMULATION CONTROL
            </h2>
            <span className="text-[10px] text-slate-400 font-mono">
              Engineering ISO 26262 Compliance Report & Parameter Tuning Suite
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-orbitron font-bold transition"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>EXPORT CSV</span>
          </button>
          <button
            onClick={handlePrintReport}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-[10px] font-orbitron font-bold transition shadow-[0_0_12px_rgba(6,182,212,0.4)]"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>GENERATE PDF REPORT</span>
          </button>
        </div>
      </div>

      {/* PRINTABLE REPORT PREVIEW (PDF Pages 15, 41) */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-700/50 shadow-2xl printable-area">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-400 flex items-center justify-center text-slate-950 font-bold">
              <Zap className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <h3 className="text-sm font-orbitron font-extrabold text-white tracking-wider">
                VOLTAI BATTERY STATE-OF-HEALTH REPORT
              </h3>
              <span className="text-[10px] font-mono text-slate-400">
                Official Engineering SOH & Safety Diagnostics Certificate
              </span>
            </div>
          </div>

          <div className="text-right font-mono text-[10px] text-slate-400">
            <div>Report ID: <strong className="text-cyan-400">{reportData?.report_id || 'REP-20261001'}</strong></div>
            <div>Timestamp: <strong className="text-slate-200">{new Date().toLocaleString()}</strong></div>
          </div>
        </div>

        {/* Report Key Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800 mb-5 text-xs font-mono">
          <div>
            <span className="text-slate-500 text-[9px] block">BATTERY IDENTIFIER</span>
            <strong className="text-white text-sm font-orbitron">{reportData?.battery_id || 'EV-BAT-001'}</strong>
          </div>
          <div>
            <span className="text-slate-500 text-[9px] block">ESTIMATED SOH</span>
            <strong className="text-emerald-400 text-sm font-orbitron">{reportData?.health_assessment?.soh || 87.4}%</strong>
          </div>
          <div>
            <span className="text-slate-500 text-[9px] block">REMAINING USEFUL LIFE</span>
            <strong className="text-cyan-400 text-sm font-orbitron">{reportData?.health_assessment?.rul_cycles || 280} Cycles</strong>
          </div>
          <div>
            <span className="text-slate-500 text-[9px] block">PREDICTIVE RISK LEVEL</span>
            <strong className="text-emerald-400 text-sm font-orbitron">{reportData?.health_assessment?.risk_level || 'LOW'} ({reportData?.health_assessment?.risk_score || 31.0}/100)</strong>
          </div>
        </div>

        {/* Detailed Report Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 text-xs font-mono">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-850 space-y-2">
            <h4 className="text-[10px] font-orbitron font-bold text-cyan-400 uppercase tracking-wider">
              PACK SPECIFICATIONS & TOPOLOGY
            </h4>
            <div className="flex justify-between border-b border-slate-800/80 py-1 text-slate-300">
              <span>Chemistry:</span>
              <strong className="text-white">Lithium Iron Phosphate (LFP)</strong>
            </div>
            <div className="flex justify-between border-b border-slate-800/80 py-1 text-slate-300">
              <span>Nominal Pack Voltage:</span>
              <strong className="text-white">25.6 V (8 Series)</strong>
            </div>
            <div className="flex justify-between border-b border-slate-800/80 py-1 text-slate-300">
              <span>Rated Capacity:</span>
              <strong className="text-white">40.0 Ah (1.024 kWh)</strong>
            </div>
            <div className="flex justify-between border-b border-slate-800/80 py-1 text-slate-300">
              <span>Current Cycle Count:</span>
              <strong className="text-white">{pack.cycle || 624} Cycles</strong>
            </div>
            <div className="flex justify-between py-1 text-slate-300">
              <span>Max Cell Imbalance:</span>
              <strong className="text-emerald-400">{((pack.max_imbalance || 0.012) * 1000).toFixed(0)} mV</strong>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-850 space-y-2">
            <h4 className="text-[10px] font-orbitron font-bold text-emerald-400 uppercase tracking-wider">
              AI MODEL & ROOT CAUSE SUMMARY
            </h4>
            <div className="flex justify-between border-b border-slate-800/80 py-1 text-slate-300">
              <span>Model Architecture:</span>
              <strong className="text-white">Random Forest (v1.4.2)</strong>
            </div>
            <div className="flex justify-between border-b border-slate-800/80 py-1 text-slate-300">
              <span>R² Score / MAE:</span>
              <strong className="text-emerald-400">0.942 / 1.82%</strong>
            </div>
            <div className="flex justify-between border-b border-slate-800/80 py-1 text-slate-300">
              <span>Primary Degradation Factor:</span>
              <strong className="text-white">Cycle Aging (41%)</strong>
            </div>
            <div className="flex justify-between border-b border-slate-800/80 py-1 text-slate-300">
              <span>Secondary Degradation Factor:</span>
              <strong className="text-amber-400">Thermal Rise (32%)</strong>
            </div>
            <div className="flex justify-between py-1 text-slate-300">
              <span>Prescribed Action:</span>
              <strong className="text-cyan-400 truncate max-w-[200px]">Nominal operating cycle</strong>
            </div>
          </div>
        </div>
      </div>

      {/* DATA SOURCE & SIMULATION CONTROLS (PDF Pages 41-43) */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-700/50 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xs font-orbitron font-bold uppercase tracking-wider text-white">
                SIMULATION SPEED & DATA SOURCE MANAGEMENT
              </h3>
              <span className="text-[9px] text-slate-400 font-mono">
                Controlled safe stress injection & time acceleration
              </span>
            </div>
          </div>

          {/* Speed Multipliers (PDF Page 43) */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-slate-400 mr-1">SIM SPEED:</span>
            {[1, 5, 10, 50].map((s) => (
              <button
                key={s}
                onClick={() => handleSpeedChange(s)}
                className={`px-2.5 py-1 rounded-lg text-[9px] font-orbitron font-bold border transition ${
                  speedMultiplier === s
                    ? 'bg-cyan-600 border-cyan-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>

        {/* Simulation Scenarios Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
          {[
            { id: 'NORMAL', label: 'Nominal Cycle', desc: 'Standard 25°C, 14.5A load' },
            { id: 'HIGH TEMPERATURE', label: 'Thermal Anomaly', desc: 'Accelerated 48°C+ hotspot' },
            { id: 'CELL IMBALANCE', label: 'Cell Imbalance', desc: 'Delta V divergence > 120mV' },
            { id: 'HIGH RESISTANCE', label: 'Ohmic Growth', desc: 'SEI Resistance surge > 45mΩ' },
            { id: 'FAST CHARGING', label: 'Fast Charging', desc: 'High negative current (-50A)' },
            { id: 'OVERCURRENT', label: 'Overcurrent Peak', desc: 'High surge demand (88A)' },
            { id: 'UNDERVOLTAGE', label: 'Undervoltage Cutoff', desc: 'Depleted lower knee (<2.75V)' },
            { id: 'HIGH C-RATE', label: 'High C-Rate Stress', desc: '2.25C continuous discharge' }
          ].map((sc) => (
            <button
              key={sc.id}
              onClick={() => onScenarioChange && onScenarioChange(sc.id)}
              className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-700/60 hover:border-cyan-500/40 text-left transition group"
            >
              <span className="text-xs font-orbitron font-bold text-white group-hover:text-cyan-300 block mb-0.5">
                {sc.label}
              </span>
              <span className="text-[9px] font-mono text-slate-500 block">
                {sc.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* HISTORICAL TELEMETRY LOGS TABLE (PDF Pages 39, 40) */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-700/50 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-orbitron font-bold uppercase tracking-wider text-white">
              HISTORICAL TELEMETRY LOGS ({filteredRows.length} ROWS)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search timestamp, cycle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-48 sm:w-60"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[320px] custom-scrollbar">
          <table className="w-full text-left font-mono text-xs">
            <thead className="sticky top-0 bg-slate-950 border-b border-slate-800 text-slate-400 text-[9.5px] uppercase">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Battery ID</th>
                <th className="py-2.5 px-3">Cycle</th>
                <th className="py-2.5 px-3">Voltage (V)</th>
                <th className="py-2.5 px-3">Current (A)</th>
                <th className="py-2.5 px-3">Avg Temp (°C)</th>
                <th className="py-2.5 px-3">SOC (%)</th>
                <th className="py-2.5 px-3 text-right">SOH (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {filteredRows.slice(0, 20).map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-900/60 text-slate-300">
                  <td className="py-2.5 px-3 text-slate-400">{row.timestamp}</td>
                  <td className="py-2.5 px-3 text-white font-semibold">{row.battery_id || 'EV-001'}</td>
                  <td className="py-2.5 px-3 text-cyan-400">{row.cycle || 624}</td>
                  <td className="py-2.5 px-3">{Number(row.voltage || row.pack_voltage || 25.6).toFixed(2)}</td>
                  <td className="py-2.5 px-3">{Number(row.current || row.pack_current || 14.5).toFixed(1)}</td>
                  <td className="py-2.5 px-3">{Number(row.avg_temp || row.avg_temperature || 26.0).toFixed(1)}</td>
                  <td className="py-2.5 px-3">{Number(row.soc || 70).toFixed(1)}%</td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                    {Number(row.soh || 87.4).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
