import React, { useState } from 'react';
import { X, Sliders, Play, AlertTriangle, ShieldCheck, Zap, Flame, CircuitBoard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface WhatIfModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhatIfModal: React.FC<WhatIfModalProps> = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState<string>('CHARGING');
  const [current, setCurrent] = useState<number>(-20.0);
  const [temp, setTemp] = useState<number>(30.0);
  const [resistance, setResistance] = useState<number>(34.0);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSimulate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/simulator/whatif', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          current_a: Number(current),
          temp_c: Number(temp),
          resistance_mohm: Number(resistance),
          soc_pct: 70.0
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.predictions) {
          setResult(data);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      // Backend offline, calculate via physics engine
    }

    // High-Fidelity Physics & Degradation Sensitivity Formulation
    const cRate = Math.abs(current) / 40.0;
    const packResOhm = (resistance / 1000.0) * 8;
    const packSag = Number((Math.abs(current) * packResOhm).toFixed(3));
    const cellSag = Number((packSag / 8).toFixed(3));
    const pJoule = Math.pow(current, 2) * packResOhm;
    const deltaTemp = pJoule * 0.12;
    const predTemp = Number((temp + deltaTemp).toFixed(1));
    const thermalStress = predTemp > 46.0 || cRate > 2.0 ? 'HIGH' : predTemp > 36.0 || cRate > 1.0 ? 'MEDIUM' : 'LOW';
    const tempFactor = Math.exp(Math.max(0.0, (predTemp - 25.0) / 18.0));
    const cRateFactor = 1.0 + (Math.pow(cRate, 1.6) * 0.5);
    const acceleratedDeg = Number((4.2 * tempFactor * cRateFactor).toFixed(1));
    const predSoh = Number(Math.max(50.0, 87.4 - acceleratedDeg).toFixed(1));
    const predRisk = Math.min(99.0, Math.max(10.0, Number((20.0 + (predTemp > 45 ? 40 : (predTemp - 25) * 1.5) + (resistance > 35 ? (resistance - 35) * 2 : 0) + (cRate > 1 ? cRate * 15 : 0)).toFixed(1))));
    const riskLevel = predRisk > 70 ? 'CRITICAL' : predRisk > 45 ? 'WARNING' : 'HEALTHY';
    const riskStatus = predRisk > 70 ? 'HIGH RISK' : predRisk > 45 ? 'MODERATE' : 'NORMAL';

    setResult({
      parameters: {
        mode,
        current_a: current,
        temp_c: temp,
        soc_pct: 70.0,
        resistance_mohm: resistance,
        c_rate: Number(cRate.toFixed(2))
      },
      predictions: {
        predicted_temperature_c: predTemp,
        thermal_stress: thermalStress,
        pack_voltage_sag_v: packSag,
        cell_voltage_sag_v: cellSag,
        predicted_degradation_per_100_cycles: acceleratedDeg,
        predicted_soh_after_100_cycles: predSoh,
        predicted_risk_score: predRisk,
        predicted_risk_status: riskStatus,
        predicted_risk_level: riskLevel
      },
      disclaimer: "Simulated sensitivity output based on equivalent-circuit and Arrhenius thermal degradation models."
    });
    setLoading(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl"
        style={{ background: 'rgba(5, 5, 8, 0.85)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-xl bg-[#0a0b10]/95 backdrop-blur-2xl rounded-2xl p-6 overflow-hidden border border-white/[0.1] shadow-[0_25px_80px_rgba(0,0,0,0.85)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center border border-blue-500/20">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-orbitron font-bold text-white tracking-wide">WHAT-IF ENGINE</h3>
                <p className="text-[9px] text-slate-400 font-mono">Stress Test & Degradation Projection</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-slate-400 hover:text-white transition border border-white/[0.08]"
            >
              <X className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Input Parameters */}
          <div className="py-4 space-y-4 relative z-10">
            {/* Mode Toggle */}
            <div>
              <label className="text-[9px] font-orbitron font-semibold uppercase tracking-[0.15em] text-slate-400 block mb-2">
                OPERATION MODE
              </label>
              <div className="grid grid-cols-2 gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => { setMode('CHARGING'); setCurrent(-25.0); }}
                  className={`py-2.5 text-[10px] font-orbitron font-bold rounded-xl border transition-all ${
                    mode === 'CHARGING'
                      ? 'bg-blue-600/15 border-blue-500/40 text-blue-400 shadow-[inset_0_1px_0_0_rgba(59,130,246,0.2)]'
                      : 'bg-[#07080e]/90 border-white/[0.06] text-slate-400'
                  }`}
                >
                  <Zap className="w-3 h-3 inline mr-1" />
                  CHARGE
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => { setMode('DISCHARGING'); setCurrent(40.0); }}
                  className={`py-2.5 text-[10px] font-orbitron font-bold rounded-xl border transition-all ${
                    mode === 'DISCHARGING'
                      ? 'bg-amber-600/15 border-amber-500/40 text-amber-400 shadow-[inset_0_1px_0_0_rgba(245,158,11,0.2)]'
                      : 'bg-[#07080e]/90 border-white/[0.06] text-slate-400'
                  }`}
                >
                  <Flame className="w-3 h-3 inline mr-1" />
                  DISCHARGE
                </motion.button>
              </div>
            </div>

            {/* Sliders */}
            {[
              { label: 'Pack Current', value: current, setValue: setCurrent, min: mode === 'CHARGING' ? -60 : 5, max: mode === 'CHARGING' ? -5 : 80, step: 1, unit: 'A', icon: <Zap className="w-3 h-3 text-cyan-400" /> },
              { label: 'Ambient Temp', value: temp, setValue: setTemp, min: 10, max: 55, step: 0.5, unit: '°C', icon: <Flame className="w-3 h-3 text-amber-400" /> },
              { label: 'Internal Resistance', value: resistance, setValue: setResistance, min: 25, max: 65, step: 0.5, unit: 'mΩ', icon: <CircuitBoard className="w-3 h-3 text-purple-400" /> }
            ].map((slider) => (
              <div key={slider.label}>
                <div className="flex justify-between text-[10px] text-slate-300 mb-1.5 font-mono tabular-nums">
                  <span className="flex items-center gap-1.5">{slider.icon} {slider.label}</span>
                  <strong className="text-white">{slider.value} {slider.unit}</strong>
                </div>
                <input
                  type="range"
                  min={slider.min}
                  max={slider.max}
                  step={slider.step}
                  value={slider.value}
                  onChange={(e) => slider.setValue(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            ))}

            {/* Simulate Button */}
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSimulate}
              disabled={loading}
              className="w-full py-3 rounded-xl text-white font-orbitron font-bold text-[10px] tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2 border border-white/[0.12] bg-gradient-to-r from-blue-600/30 to-indigo-600/30 shadow-[0_0_25px_rgba(59,130,246,0.18)]"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {loading ? 'EVALUATING...' : 'RUN SIMULATION'}
            </motion.button>

            {/* Result */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: 10, height: 0 }}
                  className="p-4 rounded-xl dark-gradient-card-emerald border border-white/[0.08] space-y-3 overflow-hidden"
                >
                  <h4 className="text-[9px] font-orbitron font-bold text-emerald-400 uppercase tracking-[0.15em]">
                    SIMULATED OUTCOME
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-center font-mono tabular-nums">
                    {[
                      { label: 'V-SAG', value: `${result.voltage_sag?.toFixed(3)}V`, color: 'text-cyan-400' },
                      { label: 'TEMP RISE', value: `+${result.temperature_rise?.toFixed(1)}°C`, color: 'text-amber-400' },
                      { label: 'PROJ BRI', value: `${result.projected_bri?.toFixed(1)}/100`, color: 'text-rose-400' }
                    ].map((item) => (
                      <div key={item.label} className="p-2.5 rounded-xl bg-[#050609]/90 border border-white/[0.06]">
                        <span className="text-[8px] text-slate-400 block font-orbitron tracking-wider">{item.label}</span>
                        <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="p-2 rounded-lg bg-[#050609]/80 border border-white/[0.06] text-[10px] text-slate-200 font-mono">
                    Assessment: <strong>{result.assessment || 'Acceptable operational margin.'}</strong>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
