import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { DashboardView } from './views/DashboardView';
import { LiveMonitorView } from './views/LiveMonitorView';
import { BatteryPack3DView } from './views/BatteryPack3DView';
import { SOHDegradationView } from './views/SOHDegradationView';
import { RULPredictionView } from './views/RULPredictionView';
import { AnomalyDetectionView } from './views/AnomalyDetectionView';
import { AIExplainabilityView } from './views/AIExplainabilityView';
import { MLModelView } from './views/MLModelView';
import { DataExplorationView } from './views/DataExplorationView';
import { ReportsView } from './views/ReportsView';

import { PassportModal } from './components/PassportModal';
import { WhatIfModal } from './components/WhatIfModal';
import { AlertsDrawer } from './components/AlertsDrawer';
import { SelfLearningModal } from './components/SelfLearningModal';
import { ParticleField } from './components/ParticleField';
import { BatteryState, AlertItem, CellTelemetry } from './types';

// Baseline fallback state
const INITIAL_BATTERY_STATE: BatteryState = {
  timestamp: new Date().toISOString(),
  pack: {
    timestamp: new Date().toISOString(),
    voltage: 25.6,
    current: 14.5,
    c_rate: 0.36,
    soc: 64.8,
    cycle: 624,
    ambient_temp: 25.0,
    mode: "DISCHARGING",
    avg_temp: 26.2,
    max_temp: 26.8,
    min_temp: 25.7,
    temp_rise: 1.2,
    max_imbalance: 0.012,
    voltage_sag: 0.18,
    resistance_growth: 3.2,
    capacity_fade: 12.6
  },
  cells: Array.from({ length: 8 }, (_, i) => ({
    cell_id: i + 1,
    voltage: 3.20 + (i % 2 === 0 ? 0.005 : -0.005),
    current: 14.5,
    temp_c: 26.0 + (i * 0.1),
    soc: 65.0,
    internal_resistance_mohm: 32.0 + (i * 0.2),
    health_status: "NORMAL"
  })),
  ai: {
    soh: 87.4,
    is_anomaly: false,
    anomaly_score: 12.0,
    fault_class: "NORMAL",
    fault_confidence: 94.2,
    rul: {
      rul_cycles: 280,
      rul_uncertainty: 35,
      rul_display: "280 ± 35 cycles",
      soh_in_100_cycles: 85.4,
      estimated_eol_cycle: 904
    }
  },
  risk: {
    score: 31.0,
    status: "HEALTHY",
    level: "LOW",
    contributions_pct: {
      temperature: 25.0,
      resistance: 22.0,
      imbalance: 18.0,
      voltage: 15.0,
      cycle: 12.0,
      soh: 5.0,
      anomaly: 3.0
    }
  },
  rca: {
    probable_cause: "Nominal Operating State",
    evidence: ["All cell voltages balanced within 15 mV", "Temperatures within 25–28°C envelope"],
    affected_cell: null,
    confidence: 94.2
  },
  xai: {
    method: "TreeSHAP Attribution Decomposition",
    factors: [
      { name: "Cumulative Cycle Aging", factor: "Cumulative Cycle Aging", percentage: 41, contribution: 41, impact: "High", direction: "Negative" },
      { name: "Operating Temperature Rise", factor: "Operating Temperature Rise", percentage: 32, contribution: 32, impact: "High", direction: "Negative" },
      { name: "Ohmic Resistance Growth", factor: "Ohmic Resistance Growth", percentage: 15, contribution: 15, impact: "Moderate", direction: "Negative" },
      { name: "Cell Voltage Imbalance (ΔV)", factor: "Cell Voltage Imbalance (ΔV)", percentage: 8, contribution: 8, impact: "Low", direction: "Negative" },
      { name: "Current Stress Profile", factor: "Current Stress Profile", percentage: 4, contribution: 4, impact: "Minimal", direction: "Neutral" }
    ]
  },
  recommendation: {
    action: "Standard operation nominal. No thermal or balancing intervention required.",
    urgency: "NORMAL",
    rationale: "Cell spread is tightly coupled below 15 mV with standard LFP thermal dissipation."
  }
};

import { clientSimulator } from './services/clientSimulator';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const [data, setData] = useState<BatteryState>(() => clientSimulator.step(0));
  const [scenario, setScenario] = useState<string>("NORMAL");
  const [isLiveBackend, setIsLiveBackend] = useState<boolean>(false);
  const [alerts, setAlerts] = useState<AlertItem[]>(() => clientSimulator.getAlerts());
  const [history, setHistory] = useState<Array<{ timestamp: string; voltage: number; current: number; temp: number; soh: number }>>([]);
  const [selectedCell, setSelectedCell] = useState<CellTelemetry | null>(null);

  // Modals & Drawers
  const [isPassportOpen, setIsPassportOpen] = useState<boolean>(false);
  const [isWhatIfOpen, setIsWhatIfOpen] = useState<boolean>(false);
  const [isSelfLearningOpen, setIsSelfLearningOpen] = useState<boolean>(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);

  // Fetch alerts from API if backend is online, else from clientSimulator
  const refreshAlerts = async () => {
    try {
      const res = await fetch('/api/alerts');
      if (res.ok) {
        const json = await res.json();
        if (json && json.history) {
          setAlerts(json.history);
          return;
        }
      }
    } catch (e) {
      // Backend not running
    }
    setAlerts(clientSimulator.getAlerts());
  };

  // Connect to WebSocket with auto-reconnect
  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimeout: any;

    const connect = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const envWs = (import.meta as any).env?.VITE_WS_URL;
        const wsUrl = envWs || `${protocol}//${host}/ws/telemetry`;

        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsLiveBackend(true);
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            const stateData: BatteryState = payload.data || payload;

            if (stateData && stateData.pack) {
              setData(stateData);

              // Update rolling history (last 50 points)
              const packVoltage = Number(stateData.pack.voltage ?? (stateData.pack as any).pack_voltage ?? 25.6);
              const packCurrent = Number(stateData.pack.current ?? (stateData.pack as any).pack_current ?? 14.5);
              const packTemp = Number(stateData.pack.avg_temp ?? (stateData.pack as any).avg_temperature ?? 26.0);
              const sohVal = Number(stateData.ai?.soh ?? 87.4);

              setHistory((prev) => {
                const newPoint = {
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                  voltage: Number(packVoltage.toFixed(2)),
                  current: Number(packCurrent.toFixed(1)),
                  temp: Number(packTemp.toFixed(1)),
                  soh: Number(sohVal.toFixed(1))
                };
                return [...prev.slice(-49), newPoint];
              });
            }
          } catch (e) {
            console.error("Error parsing telemetry message:", e);
          }
        };

        ws.onerror = () => {
          setIsLiveBackend(false);
        };

        ws.onclose = () => {
          setIsLiveBackend(false);
          reconnectTimeout = setTimeout(connect, 4000);
        };
      } catch (e) {
        setIsLiveBackend(false);
        reconnectTimeout = setTimeout(connect, 4000);
      }
    };

    connect();
    refreshAlerts();
    const alertInterval = setInterval(refreshAlerts, 2500);

    return () => {
      clearTimeout(reconnectTimeout);
      clearInterval(alertInterval);
      if (ws) ws.close();
    };
  }, []);

  // Autonomous 1Hz High-Fidelity Physics & AI Simulation Loop (Runs continuously when live backend is not attached)
  useEffect(() => {
    if (!isLiveBackend) {
      const pollInterval = setInterval(() => {
        // Step the grounded electrochemical simulation engine
        const nextState = clientSimulator.step(1.0);
        setData(nextState);

        const packVoltage = nextState.pack.voltage;
        const packCurrent = nextState.pack.current;
        const packTemp = nextState.pack.avg_temp;
        const sohVal = nextState.ai.soh;

        // Update rolling history
        setHistory((prevHist) => {
          const point = {
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            voltage: Number(packVoltage.toFixed(2)),
            current: Number(packCurrent.toFixed(1)),
            temp: Number(packTemp.toFixed(1)),
            soh: Number(sohVal.toFixed(1))
          };
          return [...prevHist.slice(-49), point];
        });

        // Sync alerts
        setAlerts(clientSimulator.getAlerts());
      }, 1000);

      return () => clearInterval(pollInterval);
    }
  }, [isLiveBackend, scenario]);

  // Handle Scenario Change across Simulator and Backend
  const handleScenarioChange = async (newScenario: string) => {
    setScenario(newScenario);
    clientSimulator.setScenario(newScenario);
    
    // Immediately calculate and push updated simulation state
    const nextState = clientSimulator.step(0.1);
    setData(nextState);

    // Update rolling history
    const packVoltage = nextState.pack.voltage;
    const packCurrent = nextState.pack.current;
    const packTemp = nextState.pack.avg_temp;
    const sohVal = nextState.ai.soh;

    setHistory((prevHist) => {
      const point = {
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        voltage: Number(packVoltage.toFixed(2)),
        current: Number(packCurrent.toFixed(1)),
        temp: Number(packTemp.toFixed(1)),
        soh: Number(sohVal.toFixed(1))
      };
      return [...prevHist.slice(-49), point];
    });

    try {
      await fetch('/api/simulator/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: newScenario })
      });
    } catch (e) {
      // Backend offline, clientSimulator takes precedence
    }
    refreshAlerts();
  };

  const handleResolveAlert = async (alertId: number) => {
    clientSimulator.resolveAlert(alertId);
    setAlerts(clientSimulator.getAlerts());

    try {
      await fetch(`/api/alerts/${alertId}/resolve`, { method: 'POST' });
    } catch (e) {
      // Backend offline
    }
    refreshAlerts();
  };

  const activeAlerts = alerts.filter((a) => a.status === 'ACTIVE' || !a.status);

  // Handle Cell selection from anywhere
  const handleCellSelect = (cell: CellTelemetry | null) => {
    setSelectedCell(cell);
    if (cell && activeTab !== 'battery-pack' && activeTab !== 'dashboard') {
      setActiveTab('battery-pack');
    }
  };

  return (
    <div className="min-h-screen text-slate-100 flex font-sans relative bg-[#050a15] overflow-x-hidden">
      {/* 3D Dynamic Particle Background */}
      <ParticleField />

      {/* Collapsible Left Sidebar (Desktop) */}
      <div className="hidden lg:block">
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          activeAnomalyCount={activeAlerts.length}
          isConnected={true}
          isLiveBackend={isLiveBackend}
        />
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-72 h-full">
            <Sidebar
              activeTab={activeTab}
              onTabChange={(tab) => {
                setActiveTab(tab);
                setIsMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              isCollapsed={false}
              onToggleCollapse={() => setIsMobileMenuOpen(false)}
              activeAnomalyCount={activeAlerts.length}
              isConnected={true}
              isLiveBackend={isLiveBackend}
            />
          </div>
        </div>
      )}

      {/* Main Content Area (Offset dynamically by sidebar width) */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        {/* Global Technical Header */}
        <Header
          scenario={scenario}
          onScenarioChange={handleScenarioChange}
          isConnected={isLiveBackend}
          onOpenPassport={() => setIsPassportOpen(true)}
          onOpenWhatIf={() => setIsWhatIfOpen(true)}
          onOpenSelfLearning={() => setIsSelfLearningOpen(true)}
          onOpenAlerts={() => setIsAlertsOpen(true)}
          activeAlertCount={activeAlerts.length}
          onToggleSidebar={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        {/* Dynamic Viewport Router */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 relative z-10">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <DashboardView
                key="dashboard"
                data={data}
                onNavigate={(tab) => {
                  setActiveTab(tab);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onSelectCell={handleCellSelect}
              />
            )}

            {activeTab === 'live-monitor' && (
              <LiveMonitorView
                key="live-monitor"
                data={data}
                history={history}
                isConnected={isLiveBackend}
              />
            )}

            {activeTab === 'battery-pack' && (
              <BatteryPack3DView
                key="battery-pack"
                data={data}
                selectedCell={selectedCell}
                onSelectCell={setSelectedCell}
              />
            )}

            {activeTab === 'soh-degradation' && (
              <SOHDegradationView key="soh-degradation" data={data} />
            )}

            {activeTab === 'rul-prediction' && (
              <RULPredictionView key="rul-prediction" data={data} />
            )}

            {activeTab === 'anomaly-detection' && (
              <AnomalyDetectionView
                key="anomaly-detection"
                data={data}
                alerts={alerts}
                onResolveAlert={handleResolveAlert}
              />
            )}

            {activeTab === 'explainability' && (
              <AIExplainabilityView key="explainability" data={data} />
            )}

            {activeTab === 'ml-models' && (
              <MLModelView key="ml-models" data={data} />
            )}

            {activeTab === 'data-exploration' && (
              <DataExplorationView key="data-exploration" data={data} />
            )}

            {activeTab === 'reports' && (
              <ReportsView
                key="reports"
                data={data}
                onScenarioChange={handleScenarioChange}
              />
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Dedicated Modals & Drawers */}
      <PassportModal
        isOpen={isPassportOpen}
        onClose={() => setIsPassportOpen(false)}
        data={data}
      />

      <WhatIfModal
        isOpen={isWhatIfOpen}
        onClose={() => setIsWhatIfOpen(false)}
      />

      <SelfLearningModal
        isOpen={isSelfLearningOpen}
        onClose={() => setIsSelfLearningOpen(false)}
        metrics={data.self_learning}
      />

      <AlertsDrawer
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        alerts={alerts}
        onResolveAlert={handleResolveAlert}
      />
    </div>
  );
}
