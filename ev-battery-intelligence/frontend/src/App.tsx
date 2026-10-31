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
import { DataHistoryView } from './views/DataHistoryView';

import { PassportModal } from './components/PassportModal';
import { WhatIfModal } from './components/WhatIfModal';
import { AlertsDrawer } from './components/AlertsDrawer';
import { SelfLearningModal } from './components/SelfLearningModal';
import { RegisterBatteryModal } from './components/RegisterBatteryModal';
import { ParticleField } from './components/ParticleField';
import { NeuralBootSequence } from './components/NeuralBootSequence';
import { BatteryState, AlertItem, CellTelemetry } from './types';
import { HardwareConnectModal } from './components/HardwareConnectModal';
import { VoltLoginGateway, OperatorSession } from './components/VoltLoginGateway';
import { api, BatteryRecord } from './services/api';
import {
  bluetoothManager,
  wifiManager,
  normalizeTelemetryPayload,
  HardwareSourceMode,
  HardwareStatus,
  HardwareStats
} from './services/hardwareTelemetry';
import { universalHardwareEngine } from './services/universalHardwareEngine';
import { esp32Bridge } from './services/esp32HardwareBridge';
import { accountStorage } from './services/accountStorageEngine';
import { onlineMl } from './services/onlineMlEngine';

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

  // Operator Authentication Session State
  const [operatorSession, setOperatorSession] = useState<OperatorSession | null>(() => {
    try {
      const stored = localStorage.getItem('volt_bms_session');
      if (stored) {
        const parsed: OperatorSession = JSON.parse(stored);
        if (!parsed.sessionExpiry || parsed.sessionExpiry > Date.now()) {
          return parsed;
        }
      }
    } catch {
      // Ignore
    }
    return null;
  });

  // User Battery Pack Scoping State
  const [batteries, setBatteries] = useState<BatteryRecord[]>([]);
  const [activeBatteryId, setActiveBatteryId] = useState<string>('EV-001');
  const [isRegisterBatteryOpen, setIsRegisterBatteryOpen] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const [isBooting, setIsBooting] = useState<boolean>(() => {
    try {
      return !sessionStorage.getItem('volt_booted');
    } catch {
      return false;
    }
  });

  // Verify stored session token against real backend on mount
  useEffect(() => {
    const token = localStorage.getItem('volt_bms_token') || localStorage.getItem('volt_session_token');
    if (token) {
      api.getMe().then((res) => {
        if (res.authenticated && res.user) {
          setOperatorSession({
            user_id: res.user.user_id,
            name: res.user.name,
            email: res.user.email,
            role: res.user.role,
            authMethod: 'token',
            sessionExpiry: Date.now() + 24 * 60 * 60 * 1000,
            timestamp: new Date().toISOString()
          });
        }
      }).catch(() => {
        handleSignOut();
      });
    }
  }, []);

  // Fetch registered battery packs for authenticated user
  const refreshUserBatteries = async () => {
    if (!operatorSession) return;
    try {
      const list = await api.getUserBatteries();
      if (list && list.length > 0) {
        setBatteries(list);
        if (!list.some((b) => b.battery_id === activeBatteryId)) {
          setActiveBatteryId(list[0].battery_id);
        }
      }
    } catch (err) {
      console.error('Failed to load user batteries:', err);
    }
  };

  useEffect(() => {
    if (operatorSession) {
      refreshUserBatteries();
    }
  }, [operatorSession]);

  // Sync real database telemetry and cell states for active battery
  useEffect(() => {
    if (!activeBatteryId) return;
    let isMounted = true;

    const syncBatteryData = async () => {
      try {
        const [packData, cellsData] = await Promise.all([
          api.getScopedPack(activeBatteryId),
          api.getScopedCells(activeBatteryId)
        ]);

        if (isMounted && packData) {
          setLastSyncTime(new Date().toLocaleTimeString());
          setData((prev) => ({
            ...prev,
            timestamp: packData.timestamp || new Date().toISOString(),
            pack: {
              ...prev.pack,
              voltage: Number(packData.voltage ?? prev.pack.voltage),
              current: Number(packData.current ?? prev.pack.current),
              soc: Number(packData.soc ?? prev.pack.soc),
              cycle: Number(packData.cycle_count ?? prev.pack.cycle),
              avg_temp: Number(packData.avg_temp ?? prev.pack.avg_temp),
              max_temp: Number(packData.max_temp ?? prev.pack.max_temp),
              min_temp: Number(packData.min_temp ?? prev.pack.min_temp),
            },
            cells: (cellsData && cellsData.length > 0)
              ? cellsData.map((c: any) => ({
                  cell_id: c.cell_id,
                  voltage: Number(c.voltage),
                  current: Number(c.current ?? packData.current ?? prev.pack.current),
                  temp_c: Number(c.temperature),
                  soc: Number(c.soc),
                  internal_resistance_mohm: Number(c.internal_resistance_mohm ?? 32.0),
                  health_status: c.health_status || "NORMAL"
                }))
              : prev.cells
          }));
        }
      } catch (e) {
        // Backend offline, fallback to simulation
      }
    };

    syncBatteryData();
    const interval = setInterval(syncBatteryData, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeBatteryId]);

  const handleLoginSuccess = (session: OperatorSession) => {
    setOperatorSession(session);
    setIsBooting(true);
  };

  const handleSignOut = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore
    }
    try {
      localStorage.removeItem('volt_bms_session');
      localStorage.removeItem('volt_bms_token');
      sessionStorage.removeItem('volt_booted');
    } catch {
      // Ignore
    }
    setIsBooting(true);
    setOperatorSession(null);
    setBatteries([]);
  };

  // Modals & Drawers
  const [isPassportOpen, setIsPassportOpen] = useState<boolean>(false);
  const [isWhatIfOpen, setIsWhatIfOpen] = useState<boolean>(false);
  const [isSelfLearningOpen, setIsSelfLearningOpen] = useState<boolean>(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState<boolean>(false);

  // Hardware Connectivity State
  const [isHardwareModalOpen, setIsHardwareModalOpen] = useState<boolean>(false);
  const [hardwareSourceMode, setHardwareSourceMode] = useState<HardwareSourceMode>('SIMULATOR');
  const [bleStatus, setBleStatus] = useState<HardwareStatus>('DISCONNECTED');
  const [bleStats, setBleStats] = useState<HardwareStats>({
    packetsReceived: 0,
    lastPacketTimestamp: null,
    packetRateHz: 0,
    latencyMs: 0,
  });
  const [wifiStatus, setWifiStatus] = useState<HardwareStatus>('DISCONNECTED');
  const [wifiStats, setWifiStats] = useState<HardwareStats>({
    packetsReceived: 0,
    lastPacketTimestamp: null,
    packetRateHz: 0,
    latencyMs: 0,
  });
  const [serialStatus, setSerialStatus] = useState<HardwareStatus>('DISCONNECTED');
  const [serialStats, setSerialStats] = useState<HardwareStats>({
    packetsReceived: 0,
    lastPacketTimestamp: null,
    packetRateHz: 0,
    latencyMs: 0,
  });
  const [lastRawPacket, setLastRawPacket] = useState<string | null>(null);

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

  // Initialize active operator ML memory and IndexedDB account retention
  useEffect(() => {
    const activeEmail = operatorSession?.email || 'operator@voltbms.io';
    universalHardwareEngine.setAccountEmail(activeEmail);
    universalHardwareEngine.setBaseline(data);
    esp32Bridge.setAccountEmail(activeEmail);
    esp32Bridge.setBaseline(data);
    accountStorage.loadMlCheckpoint(activeEmail).then((ckpt) => {
      if (ckpt) {
        onlineMl.restoreCheckpoint(ckpt);
      }
    });
  }, [operatorSession]);

  // Register Universal Hardware Ingestion Engine (BLE, Wi-Fi, USB Serial, MQTT)
  useEffect(() => {
    universalHardwareEngine.setBaseline(data);
    universalHardwareEngine.setCallbacks(
      (normalizedState, rawPayload) => {
        setLastRawPacket(typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload, null, 2));
        setData(normalizedState);
        const packVoltage = normalizedState.pack.voltage;
        const packCurrent = normalizedState.pack.current;
        const packTemp = normalizedState.pack.avg_temp;
        const sohVal = normalizedState.ai.soh;

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

        // Instant hardware threshold safety checks
        if (packVoltage > 29.2 || packVoltage < 20.0 || normalizedState.pack.max_imbalance > 0.045) {
          setAlerts((prevAlerts) => {
            const hasRecentAlert = prevAlerts.some((a) => a.type === 'Hardware Ingestion Engine' && a.status === 'ACTIVE');
            if (!hasRecentAlert) {
              const alertTitle = packVoltage > 29.2 ? 'Pack Overvoltage Exceeded' : packVoltage < 20.0 ? 'Pack Undervoltage Limit' : 'Cell Imbalance Threshold Exceeded';
              const newAlert: AlertItem = {
                id: Date.now(),
                timestamp: new Date().toLocaleTimeString(),
                title: alertTitle,
                severity: 'CRITICAL',
                status: 'ACTIVE',
                type: 'Hardware Ingestion Engine',
                description: `Live hardware sensor reading crossed safe operating bounds: V=${packVoltage.toFixed(2)}V, ΔV=${(normalizedState.pack.max_imbalance * 1000).toFixed(0)}mV.`,
                expected_range: '[20.0V - 29.2V], ΔV < 45mV',
                observed_value: `${packVoltage.toFixed(2)}V`,
                recommended_action: 'Reduce discharge current or engage passive cell balancing.'
              };
              return [newAlert, ...prevAlerts.slice(0, 19)];
            }
            return prevAlerts;
          });
        }
      },
      (stats) => {
        const mappedStatus: HardwareStatus = stats.state === 'SCANNING' ? 'CONNECTING' : stats.state;

        if (stats.transport === 'BLE') {
          setBleStatus(mappedStatus);
          setBleStats({
            packetsReceived: stats.packetsReceived,
            lastPacketTimestamp: stats.lastPacketTime,
            packetRateHz: stats.packetRateHz,
            latencyMs: stats.latencyMs
          });
          if (stats.state === 'CONNECTED' || stats.state === 'STREAMING') {
            setHardwareSourceMode('BLUETOOTH');
          } else if (hardwareSourceMode === 'BLUETOOTH') {
            setHardwareSourceMode('SIMULATOR');
          }
        } else if (stats.transport === 'WIFI_WS' || stats.transport === 'WIFI_HTTP' || stats.transport === 'WIFI_MQTT') {
          setWifiStatus(mappedStatus);
          setWifiStats({
            packetsReceived: stats.packetsReceived,
            lastPacketTimestamp: stats.lastPacketTime,
            packetRateHz: stats.packetRateHz,
            latencyMs: stats.latencyMs
          });
          if (stats.state === 'CONNECTED' || stats.state === 'STREAMING') {
            setHardwareSourceMode('WIFI');
          } else if (hardwareSourceMode === 'WIFI') {
            setHardwareSourceMode('SIMULATOR');
          }
        } else if (stats.transport === 'SERIAL_UART') {
          setSerialStatus(mappedStatus);
          setSerialStats({
            packetsReceived: stats.packetsReceived,
            lastPacketTimestamp: stats.lastPacketTime,
            packetRateHz: stats.packetRateHz,
            latencyMs: stats.latencyMs
          });
          if (stats.state === 'STREAMING' || stats.state === 'CONNECTED') {
            setHardwareSourceMode('SERIAL');
          } else if (hardwareSourceMode === 'SERIAL') {
            setHardwareSourceMode('SIMULATOR');
          }
        }
      }
    );

    // Register Dedicated ESP32 Firmware Node Bridge (10Hz Streams: BLE, WebSocket, HTTP, USB Serial)
    esp32Bridge.setBaseline(data);
    esp32Bridge.setCallbacks(
      (normalizedState, rawPayload) => {
        setLastRawPacket(typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload, null, 2));
        setData(normalizedState);
        const packVoltage = normalizedState.pack.voltage;
        const packCurrent = normalizedState.pack.current;
        const packTemp = normalizedState.pack.avg_temp;
        const sohVal = normalizedState.ai.soh;

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

        // Instant hardware threshold safety checks for 48V/13S BMS
        if (packVoltage > 56.5 || packVoltage < 36.0 || normalizedState.pack.max_imbalance > 0.045) {
          setAlerts((prevAlerts) => {
            const hasRecentAlert = prevAlerts.some((a) => a.type === 'ESP32 Hardware Node' && a.status === 'ACTIVE');
            if (!hasRecentAlert) {
              const alertTitle = packVoltage > 56.5 ? 'ESP32: 48V Overvoltage Exceeded' : packVoltage < 36.0 ? 'ESP32: Undervoltage Limit' : 'ESP32: Cell Spread High';
              const newAlert: AlertItem = {
                id: Date.now(),
                timestamp: new Date().toLocaleTimeString(),
                title: alertTitle,
                severity: 'CRITICAL',
                status: 'ACTIVE',
                type: 'ESP32 Hardware Node',
                description: `ESP32 live telemetry reading: V=${packVoltage.toFixed(2)}V, ΔV=${(normalizedState.pack.max_imbalance * 1000).toFixed(0)}mV.`,
                expected_range: '[36.0V - 54.6V], ΔV < 45mV',
                observed_value: `${packVoltage.toFixed(2)}V`,
                recommended_action: 'Reduce load or activate passive cell balancing.'
              };
              return [newAlert, ...prevAlerts.slice(0, 19)];
            }
            return prevAlerts;
          });
        }
      },
      (stats) => {
        const mappedStatus: HardwareStatus = stats.status === 'SCANNING' ? 'CONNECTING' : stats.status;
        if (stats.transport === 'BLE') {
          setBleStatus(mappedStatus);
          setBleStats({
            packetsReceived: stats.packetsReceived,
            lastPacketTimestamp: stats.lastPacketTimestamp,
            packetRateHz: stats.packetRateHz,
            latencyMs: stats.latencyMs
          });
          if (stats.status === 'CONNECTED' || stats.status === 'STREAMING') {
            setHardwareSourceMode('BLUETOOTH');
          } else if (hardwareSourceMode === 'BLUETOOTH' && stats.status === 'DISCONNECTED') {
            setHardwareSourceMode('SIMULATOR');
          }
        } else if (stats.transport === 'WIFI_WS' || stats.transport === 'WIFI_HTTP') {
          setWifiStatus(mappedStatus);
          setWifiStats({
            packetsReceived: stats.packetsReceived,
            lastPacketTimestamp: stats.lastPacketTimestamp,
            packetRateHz: stats.packetRateHz,
            latencyMs: stats.latencyMs
          });
          if (stats.status === 'CONNECTED' || stats.status === 'STREAMING') {
            setHardwareSourceMode('WIFI');
          } else if (hardwareSourceMode === 'WIFI' && stats.status === 'DISCONNECTED') {
            setHardwareSourceMode('SIMULATOR');
          }
        } else if (stats.transport === 'SERIAL_UART') {
          setSerialStatus(mappedStatus);
          setSerialStats({
            packetsReceived: stats.packetsReceived,
            lastPacketTimestamp: stats.lastPacketTimestamp,
            packetRateHz: stats.packetRateHz,
            latencyMs: stats.latencyMs
          });
          if (stats.status === 'CONNECTED' || stats.status === 'STREAMING') {
            setHardwareSourceMode('SERIAL');
          } else if (hardwareSourceMode === 'SERIAL' && stats.status === 'DISCONNECTED') {
            setHardwareSourceMode('SIMULATOR');
          }
        }
      }
    );

    // Fallback manager listeners
    bluetoothManager.setCallbacks(
      (normalizedState, rawPayload) => {
        setLastRawPacket(typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload, null, 2));
        setData(normalizedState);
      },
      (status, stats) => {
        setBleStatus(status);
        setBleStats(stats);
      }
    );

    wifiManager.setCallbacks(
      (normalizedState, rawPayload) => {
        setLastRawPacket(typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload, null, 2));
        setData(normalizedState);
      },
      (status, stats) => {
        setWifiStatus(status);
        setWifiStats(stats);
      }
    );
  }, [hardwareSourceMode, operatorSession]);

  // Handle Mock Test Packet Injection from Hardware modal
  const handleInjectMockPacket = (mockPayload: any) => {
    setLastRawPacket(typeof mockPayload === 'string' ? mockPayload : JSON.stringify(mockPayload, null, 2));
    universalHardwareEngine.injectRawPacket(mockPayload);
    setData((prev) => {
      const normalized = normalizeTelemetryPayload(mockPayload, prev);
      const packVoltage = normalized.pack.voltage;
      const packCurrent = normalized.pack.current;
      const packTemp = normalized.pack.avg_temp;
      const sohVal = normalized.ai.soh;

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

      return normalized;
    });
  };

  // Autonomous 1Hz High-Fidelity Physics & AI Simulation Loop (Runs continuously when live backend or live hardware is not attached)
  useEffect(() => {
    if (!isLiveBackend && hardwareSourceMode === 'SIMULATOR') {
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
  }, [isLiveBackend, scenario, hardwareSourceMode]);

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

  // Guard: If operator is not authenticated, render 3D Spatial VoltLoginGateway
  if (!operatorSession) {
    return <VoltLoginGateway onLoginSuccess={handleLoginSuccess} />;
  }

  // Initial Experience: Cinematic Neural Boot Sequence (ESC to bypass, respects reduced-motion)
  if (isBooting) {
    return (
      <NeuralBootSequence
        onComplete={() => {
          try {
            sessionStorage.setItem('volt_booted', 'true');
          } catch {
            // Ignore
          }
          setIsBooting(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen text-slate-100 flex font-sans relative bg-[#030508] overflow-x-hidden pinstripe-grid">
      {/* Ambient Chromatic Backlight Orbs for Genuine Optical Glass Refraction */}
      <div className="fixed -top-40 -left-40 w-[46rem] h-[46rem] rounded-full bg-gradient-to-br from-[#4f46e5]/25 via-[#6366f1]/20 to-transparent blur-[140px] pointer-events-none z-0" />
      <div className="fixed top-1/4 -right-40 w-[42rem] h-[42rem] rounded-full bg-gradient-to-bl from-[#06b6d4]/22 via-[#38bdf8]/15 to-transparent blur-[150px] pointer-events-none z-0" />
      <div className="fixed -bottom-40 left-1/4 w-[50rem] h-[50rem] rounded-full bg-gradient-to-tr from-[#10b981]/18 via-[#06b6d4]/12 to-transparent blur-[160px] pointer-events-none z-0" />
      <div className="fixed bottom-10 -right-20 w-[38rem] h-[38rem] rounded-full bg-gradient-to-tl from-[#f59e0b]/10 to-transparent blur-[140px] pointer-events-none z-0" />

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
          onOpenHardwareConnect={() => setIsHardwareModalOpen(true)}
          hardwareMode={hardwareSourceMode}
          operatorSession={operatorSession}
          onSignOut={handleSignOut}
        />
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#050508]/85 backdrop-blur-md"
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
              onOpenHardwareConnect={() => setIsHardwareModalOpen(true)}
              hardwareMode={hardwareSourceMode}
              operatorSession={operatorSession}
              onSignOut={handleSignOut}
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
          onOpenHardwareConnect={() => setIsHardwareModalOpen(true)}
          hardwareMode={hardwareSourceMode}
          hardwareStatus={
            hardwareSourceMode === 'BLUETOOTH'
              ? bleStatus
              : hardwareSourceMode === 'WIFI'
              ? wifiStatus
              : hardwareSourceMode === 'SERIAL'
              ? serialStatus
              : undefined
          }
          activeAlertCount={activeAlerts.length}
          onToggleSidebar={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          operatorSession={operatorSession}
          onSignOut={handleSignOut}
          batteries={batteries}
          activeBatteryId={activeBatteryId}
          onSelectBattery={(id) => setActiveBatteryId(id)}
          onOpenRegisterBattery={() => setIsRegisterBatteryOpen(true)}
          lastSyncTime={lastSyncTime || undefined}
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
                alerts={alerts}
                isLiveBackend={isLiveBackend}
                activeBatteryId={activeBatteryId}
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

            {activeTab === 'data-history' && (
              <DataHistoryView
                key="data-history"
                activeBatteryId={activeBatteryId}
                batteries={batteries}
                onSelectBattery={(id) => setActiveBatteryId(id)}
              />
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Dedicated Modals & Drawers */}
      <RegisterBatteryModal
        isOpen={isRegisterBatteryOpen}
        onClose={() => setIsRegisterBatteryOpen(false)}
        onBatteryCreated={(newBattery) => {
          setBatteries((prev) => [newBattery, ...prev]);
          setActiveBatteryId(newBattery.battery_id);
        }}
      />

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

      {/* Hardware Connectivity Modal (Web Bluetooth, Wi-Fi Direct & USB Serial UART) */}
      <HardwareConnectModal
        isOpen={isHardwareModalOpen}
        onClose={() => setIsHardwareModalOpen(false)}
        currentMode={hardwareSourceMode}
        onSelectMode={(mode) => setHardwareSourceMode(mode)}
        bleStatus={bleStatus}
        bleStats={bleStats}
        wifiStatus={wifiStatus}
        wifiStats={wifiStats}
        serialStatus={serialStatus}
        serialStats={serialStats}
        lastRawPacket={lastRawPacket}
        onInjectTestPacket={handleInjectMockPacket}
        operatorEmail={operatorSession?.email || 'operator@voltbms.io'}
      />
    </div>
  );
}
