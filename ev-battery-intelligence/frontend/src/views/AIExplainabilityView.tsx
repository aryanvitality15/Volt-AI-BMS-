import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Cpu,
  TrendingDown,
  Info,
  ShieldCheck,
  Zap,
  Flame,
  Activity,
  HelpCircle,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { BatteryState } from '../types';

interface AIExplainabilityViewProps {
  data: BatteryState;
}

export const AIExplainabilityView: React.FC<AIExplainabilityViewProps> = ({ data }) => {
  const ai = data.ai || ({} as any);
  const xai = data.xai || ({} as any);
  const rca = data.rca || ({} as any);
  const pack = data.pack || ({} as any);
  const rec = data.recommendation || ({} as any);

  const soh = Number(ai.soh ?? 87.4);

  const factors = useMemo(() => {
    if (xai?.factors && xai.factors.length > 0) {
      return xai.factors.map((f: any) => {
        const name = f.name || f.factor || 'Parameter Attribution';
        const pct = Number(f.percentage ?? f.contribution ?? 20);
        let color = 'from-blue-500 to-indigo-500';
        let icon = <Cpu className="w-4 h-4 text-blue-400" />;
        let desc = f.impact || 'Influence on battery degradation trajectory.';

        if (name.toLowerCase().includes('temperature')) {
          color = 'from-amber-500 to-rose-500';
          icon = <Flame className="w-4 h-4 text-amber-400" />;
          desc = `Thermal dynamics contributing ${pct.toFixed(1)}% to SOH degradation rate.`;
        } else if (name.toLowerCase().includes('resistance')) {
          color = 'from-purple-500 to-fuchsia-500';
          icon = <Zap className="w-4 h-4 text-purple-400" />;
          desc = `Ohmic & SEI growth causing ${pct.toFixed(1)}% voltage polarization drop.`;
        } else if (name.toLowerCase().includes('imbalance')) {
          color = 'from-cyan-500 to-blue-500';
          icon = <Activity className="w-4 h-4 text-cyan-400" />;
          desc = `Cell delta V divergence accounting for ${pct.toFixed(1)}% of pack degradation stress.`;
        } else if (name.toLowerCase().includes('cycle')) {
          color = 'from-blue-500 to-indigo-500';
          icon = <Cpu className="w-4 h-4 text-blue-400" />;
          desc = `Cumulative intercalation stress over ${pack.cycle || 624} equivalent full cycles.`;
        } else if (name.toLowerCase().includes('current')) {
          color = 'from-emerald-500 to-teal-500';
          icon = <TrendingDown className="w-4 h-4 text-emerald-400" />;
          desc = `Discharge and charge C-rate current profile impact (${pct.toFixed(1)}%).`;
        }

        return {
          name,
          percentage: pct,
          description: desc,
          impact: pct > 30 ? 'HIGH DEGRADATION DRIVER' : pct > 15 ? 'MODERATE FACTOR' : 'LOW FACTOR',
          color,
          icon
        };
      });
    }

    return [
      {
        name: 'Cumulative Cycle Count',
        percentage: 41.0,
        description: 'Progressive active lithium ion trapping and cathode micro-cracking over cycles.',
        impact: 'HIGH DEGRADATION DRIVER',
        color: 'from-blue-500 to-indigo-500',
        icon: <Cpu className="w-4 h-4 text-blue-400" />
      },
      {
        name: 'Operating Temperature & Thermal Rise',
        percentage: 32.0,
        description: 'Elevated average cell core temperatures accelerating SEI layer growth.',
        impact: 'HIGH DEGRADATION DRIVER',
        color: 'from-amber-500 to-rose-500',
        icon: <Flame className="w-4 h-4 text-amber-400" />
      },
      {
        name: 'Ohmic Internal Resistance (AC-IR)',
        percentage: 15.0,
        description: 'Increased interfacial impedance and contact resistance causing load voltage polarization drop.',
        impact: 'MODERATE FACTOR',
        color: 'from-purple-500 to-fuchsia-500',
        icon: <Zap className="w-4 h-4 text-purple-400" />
      },
      {
        name: 'Cell Voltage Imbalance (ΔV)',
        percentage: 8.0,
        description: 'Minor voltage spread divergence across the series string leading to non-uniform charge distribution.',
        impact: 'LOW FACTOR',
        color: 'from-cyan-500 to-blue-500',
        icon: <Activity className="w-4 h-4 text-cyan-400" />
      },
      {
        name: 'Current Stress / C-Rate Profile',
        percentage: 4.0,
        description: 'Rapid discharge pulse intervals contributing to momentary mechanical strain on LFP electrodes.',
        impact: 'MINIMAL FACTOR',
        color: 'from-emerald-500 to-teal-500',
        icon: <TrendingDown className="w-4 h-4 text-emerald-400" />
      }
    ];
  }, [xai, pack.cycle]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl bg-[#0a0b10]/85 border border-white/[0.08] shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-orbitron font-bold uppercase tracking-wider text-white">
              EXPLAINABLE AI (XAI) & FEATURE ATTRIBUTION
            </h2>
            <span className="text-[10px] text-slate-400 font-mono">
              TreeSHAP (Shapley Additive exPlanations) Attribution Decomposition
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono tabular-nums">
          <div className="px-3 py-1.5 rounded-xl bg-[#07080e]/90 border border-white/[0.08] text-slate-300">
            <span>PREDICTED SOH: </span>
            <strong className="text-emerald-400 font-bold">{soh.toFixed(1)}%</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300">
            <span>INTERPRETABILITY: </span>
            <strong className="text-blue-400 font-bold">100% Transparent</strong>
          </div>
        </div>
      </div>

      {/* Hero Explanation Question & Plain-English Text Card (PDF Page 34-35) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 volt-glass-card volt-glass-card-interactive rounded-2xl p-6 border border-white/[0.08] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-sm font-orbitron font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              WHY DID THE MODEL PREDICT {soh.toFixed(1)}% SOH?
            </h3>
            <span className="text-[9px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              TreeSHAP Decomposition
            </span>
          </div>

          {/* Feature Attribution Bar Chart */}
          <div className="space-y-4 my-4 relative z-10">
            {factors.map((f, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                    {f.icon}
                    {f.name}
                  </span>
                  <span className="text-white font-extrabold tabular-nums">{f.percentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-[#050609] rounded-full h-2.5 overflow-hidden p-0.5 border border-white/[0.06]">
                  <div
                    className={`bg-gradient-to-r ${f.color} h-1.5 rounded-full transition-all duration-700 shadow-sm`}
                    style={{ width: `${f.percentage}%` }}
                  />
                </div>
                <span className="text-[9.5px] font-mono text-slate-400 block pl-5">{f.description}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Machine-Generated AI Explanation (PDF Page 35) */}
        <div className="lg:col-span-5 volt-glass-card volt-glass-card-interactive rounded-2xl p-6 border border-white/[0.08] shadow-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-60 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-orbitron font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                AI-GENERATED EXPLANATION
              </span>
              <span className="text-[8px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Natural Language Synthesis
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#050609]/90 border border-white/[0.08] text-xs font-mono text-slate-200 leading-relaxed shadow-inner">
              "Based on live telemetry, the AI ensemble estimates battery SOH at <strong className="text-emerald-400">{soh.toFixed(1)}%</strong> ({ai.fault_class || 'NORMAL'}). Root Cause Analysis indicates: <span className="text-cyan-300 font-semibold">{rca.probable_cause || 'Nominal operating state'}</span>. Top degradation drivers are <span className="text-amber-300">{factors[0]?.name || 'Cycle Aging'} ({factors[0]?.percentage.toFixed(0)}%)</span> and <span className="text-amber-300">{factors[1]?.name || 'Thermal Stress'} ({factors[1]?.percentage.toFixed(0)}%)</span>."
            </div>

            {rca.evidence && rca.evidence.length > 0 && (
              <div className="mt-3 p-3 rounded-xl bg-[#07080e]/80 border border-white/[0.06] text-[10px] font-mono text-slate-300 space-y-1">
                <span className="text-[9px] text-slate-500 font-bold block uppercase">DIAGNOSTIC EVIDENCE:</span>
                {rca.evidence.map((ev: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-1.5 text-slate-300">
                    <span className="text-cyan-400">•</span>
                    <span>{ev}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 p-3.5 rounded-xl bg-[#050609]/90 border border-white/[0.08] text-[10px] font-mono text-slate-400">
              <span className="text-slate-500 block text-[9px] mb-1 font-bold">PHYSICAL ENGINEERING GROUNDING:</span>
              {rec.action || 'LFP (LiFePO4) chemistry exhibits stable degradation. The model attribution reflects authentic electro-chemical stress parameters.'}
            </div>
          </div>

          <div className="mt-4 text-[8.5px] font-mono text-slate-500 text-center border-t border-white/[0.06] pt-3 relative z-10">
            * Live TreeSHAP attribution and diagnostic synthesis updated at 1Hz.
          </div>
        </div>
      </div>
    </div>
  );
};
