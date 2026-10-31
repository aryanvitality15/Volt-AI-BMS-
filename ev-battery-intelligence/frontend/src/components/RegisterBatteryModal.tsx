import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BatteryCharging, Plus, CheckCircle2, AlertTriangle, Layers, Cpu, Zap } from 'lucide-react';
import { api, BatteryRecord } from '../services/api';

interface RegisterBatteryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBatteryCreated: (battery: BatteryRecord) => void;
}

export const RegisterBatteryModal: React.FC<RegisterBatteryModalProps> = ({
  isOpen,
  onClose,
  onBatteryCreated
}) => {
  const [batteryId, setBatteryId] = useState('');
  const [batteryName, setBatteryName] = useState('');
  const [chemistry, setChemistry] = useState('LFP');
  const [ratedCapacity, setRatedCapacity] = useState('40.0');
  const [nominalVoltage, setNominalVoltage] = useState('25.6');
  const [numCells, setNumCells] = useState('8');
  const [specs, setSpecs] = useState('8S1P Prismatic High-Rate Cells');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanId = batteryId.trim().toUpperCase();
    if (!cleanId) {
      setError('Please provide a Battery Pack ID (e.g., EV-002, VOLT-B01).');
      return;
    }

    setIsLoading(true);
    try {
      const newBat = await api.createBattery({
        battery_id: cleanId,
        battery_name: batteryName.trim() || `Pack ${cleanId}`,
        chemistry,
        rated_capacity: parseFloat(ratedCapacity) || 40.0,
        nominal_voltage: parseFloat(nominalVoltage) || 25.6,
        num_cells: parseInt(numCells, 10) || 8,
        specs: specs.trim()
      });
      setIsLoading(false);
      onBatteryCreated(newBat);
      onClose();
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Failed to register battery.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg rounded-2xl bg-[#0b0e17] border border-cyan-500/30 p-6 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-4">
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <BatteryCharging className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-orbitron font-bold text-white tracking-wide">
              REGISTER NEW BATTERY PACK
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Link a new hardware pack or modular pack to your operator account
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="font-mono text-[11px]">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-slate-300 mb-1">
                BATTERY PACK ID *
              </label>
              <input
                type="text"
                value={batteryId}
                onChange={(e) => setBatteryId(e.target.value.toUpperCase())}
                placeholder="e.g. EV-002"
                className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-xs font-mono uppercase focus:outline-none focus:border-cyan-400 transition"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-300 mb-1">
                PACK NAME / ALIAS
              </label>
              <input
                type="text"
                value={batteryName}
                onChange={(e) => setBatteryName(e.target.value)}
                placeholder="e.g. Prototype Beta"
                className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-cyan-400 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-slate-300 mb-1">
                CHEMISTRY
              </label>
              <select
                value={chemistry}
                onChange={(e) => setChemistry(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0f1320] border border-white/[0.08] text-white text-xs font-mono focus:outline-none focus:border-cyan-400 cursor-pointer"
              >
                <option value="LFP">LFP (LiFePO4)</option>
                <option value="NMC">NMC (NiMnCo)</option>
                <option value="LCO">LCO (LiCoO2)</option>
                <option value="SOLID_STATE">Solid State</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-300 mb-1">
                RATED CAPACITY (Ah)
              </label>
              <input
                type="number"
                step="0.1"
                value={ratedCapacity}
                onChange={(e) => setRatedCapacity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-xs font-mono focus:outline-none focus:border-cyan-400 transition"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-300 mb-1">
                NUM CELLS (SERIES)
              </label>
              <input
                type="number"
                value={numCells}
                onChange={(e) => {
                  setNumCells(e.target.value);
                  const n = parseInt(e.target.value, 10) || 8;
                  const perCell = chemistry === 'LFP' ? 3.2 : 3.7;
                  setNominalVoltage((n * perCell).toFixed(1));
                }}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-xs font-mono focus:outline-none focus:border-cyan-400 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-300 mb-1">
              HARDWARE SPECIFICATIONS
            </label>
            <input
              type="text"
              value={specs}
              onChange={(e) => setSpecs(e.target.value)}
              placeholder="e.g. 8S1P Prism LFP High-Rate Cells"
              className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white text-xs focus:outline-none focus:border-cyan-400 transition"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-slate-300 font-mono text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-orbitron font-bold text-xs tracking-wider transition shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center gap-2 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isLoading ? 'Registering...' : 'REGISTER PACK'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
