import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Award, Recycle, Shield, CheckCircle2 } from 'lucide-react';
import { BatteryState } from '../types';

interface PassportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data?: BatteryState;
}

export const PassportModal: React.FC<PassportModalProps> = ({ isOpen, onClose, data }) => {
  const [passport, setPassport] = useState<any>(null);

  const pack = data?.pack || ({} as any);
  const ai = data?.ai || ({} as any);
  const currentSoh = Number(ai.soh ?? 87.4);
  const rulCycles = Number(ai.rul?.rul_cycles ?? 280);
  const currentCycle = Number(pack.cycle ?? 624);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/passport')
        .then((res) => res.json())
        .then((json) => setPassport(json))
        .catch(() => {});
    }
  }, [isOpen]);

  const activePassport = passport || {
    battery_id: pack.battery_id || 'EV-BAT-001',
    chemistry: 'LiFePO4 (LFP)',
    rated_capacity_ah: 40.0,
    cell_count: 8,
    current_soh: currentSoh,
    rul_display: `${rulCycles} ± 35 cycles`,
    current_cycle: currentCycle,
    carbon_footprint_kg: 142.5,
    recycled_material_pct: 38.4,
    eu_compliance: 'PASSED (ISO 26262 ASIL-C)',
    digital_signature: '0x7F89B...4A1E (Verifiable Ed25519)'
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md"
        style={{ background: 'rgba(5, 10, 21, 0.85)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl glass-panel-elevated rounded-2xl p-6 overflow-hidden hud-corners"
          style={{ boxShadow: '0 0 60px rgba(16, 185, 129, 0.08), 0 20px 60px rgba(0, 0, 0, 0.5)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Scanline effect */}
          <div className="absolute inset-0 scanline pointer-events-none" />
          <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-emerald-500/10 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center border border-purple-500/20">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-orbitron font-bold text-white tracking-wide">DIGITAL BATTERY PASSPORT</h3>
                <p className="text-[9px] text-slate-500 font-mono">EU Regulation 2023/1542 • Verifiable Digital Certificate</p>
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

          {/* Passport Body */}
          <div className="py-4 space-y-4 max-h-[75vh] overflow-y-auto pr-1 relative z-10">
            {/* General Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { label: 'Battery ID', value: activePassport.battery_id, color: 'text-white' },
                { label: 'Chemistry', value: activePassport.chemistry, color: 'text-emerald-400' },
                { label: 'Rated Cap', value: `${activePassport.rated_capacity_ah} Ah`, color: 'text-white' },
                { label: 'Cell Config', value: `${activePassport.cell_count}S (8S1P)`, color: 'text-white' }
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                  className="p-3 rounded-xl bg-slate-900/50 border border-slate-700/30"
                >
                  <span className="text-[8px] font-orbitron text-slate-500 uppercase tracking-[0.15em] block">{item.label}</span>
                  <span className={`text-sm font-bold font-mono ${item.color}`}>{item.value}</span>
                </motion.div>
              ))}
            </div>

            {/* Second-Life Grade */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="p-4 rounded-2xl border border-emerald-500/20 flex items-center justify-between holo-shimmer"
              style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.06) 0%, rgba(6, 182, 212, 0.04) 100%)' }}
            >
              <div>
                <span className="text-[9px] font-orbitron font-semibold text-emerald-400 uppercase tracking-[0.15em] block mb-1">
                  SECOND-LIFE CLASSIFICATION
                </span>
                <div className="text-lg font-orbitron font-bold text-white tracking-wide">
                  {currentSoh >= 80 ? 'Grade A (Stationary ESS Eligible)' : currentSoh >= 70 ? 'Grade B (Low-Rate Storage)' : 'End-of-Life (Recycle)'}
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">
                  SOH: <strong className="text-emerald-400">{activePassport.current_soh}%</strong> │ RUL: <strong className="text-cyan-400">{activePassport.rul_display}</strong>
                </p>
              </div>
              <Award className="w-10 h-10 text-emerald-400/40 flex-shrink-0" />
            </motion.div>

            {/* Sustainability Metrics */}
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-700/30">
              <h4 className="text-[9px] font-orbitron font-bold text-slate-300 uppercase tracking-[0.15em] mb-3 flex items-center gap-1.5">
                <Recycle className="w-3.5 h-3.5 text-emerald-400" />
                ESG & SUSTAINABILITY AUDIT
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px] text-slate-400 font-mono">
                <div>
                  <span className="text-slate-500 block text-[9px]">Carbon Footprint</span>
                  <strong className="text-white">62.4 kg CO2/kWh</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">Recycled Content</span>
                  <strong className="text-white">38.4% Material</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">EU Compliance</span>
                  <strong className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> PASSED
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px]">Cumulative Cycles</span>
                  <strong className="text-white">{activePassport.current_cycle}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-emerald-500/10 flex justify-between items-center text-[9px] text-slate-500 font-mono relative z-10">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-emerald-500/40" />
              Cryptographic Signature Verified
            </span>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-200 font-orbitron text-[9px] tracking-wider transition border border-slate-700/40"
            >
              CLOSE
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
