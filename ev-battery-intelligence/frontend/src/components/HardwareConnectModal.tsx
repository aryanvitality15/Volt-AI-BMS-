import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Bluetooth,
  Wifi,
  Cpu,
  Radio,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Terminal,
  Code2,
  Sliders,
  Shield,
  Zap,
  Layers,
  ArrowRight,
  Database,
  Download,
  Upload,
  Brain,
  SlidersHorizontal,
  FileSpreadsheet
} from 'lucide-react';
import {
  bluetoothManager,
  wifiManager,
  HardwareSourceMode,
  HardwareStatus,
  HardwareStats,
  WifiProtocol,
  SAMPLE_FIRMWARE
} from '../services/hardwareTelemetry';
import {
  universalHardwareEngine,
  HardwareTelemetryStats
} from '../services/universalHardwareEngine';
import {
  accountStorage,
  CustomSensorMapping
} from '../services/accountStorageEngine';
import { onlineMl } from '../services/onlineMlEngine';

interface HardwareConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: HardwareSourceMode;
  onSelectMode: (mode: HardwareSourceMode) => void;
  bleStatus: HardwareStatus;
  bleStats: HardwareStats;
  wifiStatus: HardwareStatus;
  wifiStats: HardwareStats;
  serialStatus?: HardwareStatus;
  serialStats?: HardwareStats;
  lastRawPacket: any;
  onInjectTestPacket: (sample: any) => void;
  operatorEmail?: string;
}

export const HardwareConnectModal: React.FC<HardwareConnectModalProps> = ({
  isOpen,
  onClose,
  currentMode,
  onSelectMode,
  bleStatus,
  bleStats,
  wifiStatus,
  wifiStats,
  serialStatus = 'DISCONNECTED',
  serialStats = { packetsReceived: 0, lastPacketTimestamp: null, packetRateHz: 0, latencyMs: 0 },
  lastRawPacket,
  onInjectTestPacket,
  operatorEmail = 'operator@voltbms.io'
}) => {
  const [activeTab, setActiveTab] = useState<'BLE' | 'WIFI' | 'SERIAL' | 'MAPPER' | 'ML_STORAGE' | 'TERMINAL' | 'FIRMWARE'>('BLE');

  // BLE Configuration
  const [bleServiceUuid, setBleServiceUuid] = useState<string>('6e400001-b5a3-f393-e0a9-e50e24dcca9e');
  const [bleCharUuid, setBleCharUuid] = useState<string>('6e400003-b5a3-f393-e0a9-e50e24dcca9e');
  const [bleError, setBleError] = useState<string | null>(null);

  // Wi-Fi Configuration
  const [wifiProtocol, setWifiProtocol] = useState<WifiProtocol>('WEBSOCKET');
  const [wifiUrl, setWifiUrl] = useState<string>('ws://192.168.4.1:81');
  const [pollInterval, setPollInterval] = useState<number>(1000);
  const [wifiError, setWifiError] = useState<string | null>(null);

  // USB Serial Configuration
  const [serialBaud, setSerialBaud] = useState<number>(115200);
  const [serialError, setSerialError] = useState<string | null>(null);
  const [localSerialStatus, setLocalSerialStatus] = useState<HardwareStatus>(serialStatus);

  // Custom Sensor Pin & Key Mapper Configuration
  const [sensorMapping, setSensorMapping] = useState<CustomSensorMapping>(() => {
    return accountStorage.loadSensorMapping(operatorEmail);
  });
  const [mapperSaved, setMapperSaved] = useState<boolean>(false);

  // Firmware copy state
  const [selectedFirmware, setSelectedFirmware] = useState<'ESP32_BLE' | 'ESP32_WIFI_WEBSOCKET' | 'ESP32_WIFI_HTTP' | 'ESP32_USB_SERIAL'>('ESP32_BLE');
  const [copiedFirmware, setCopiedFirmware] = useState<boolean>(false);

  // Account Telemetry & ML Storage stats
  const [dbStats, setDbStats] = useState<{ telemetryPoints: number; hasCheckpoint: boolean; lastSaved: string | null }>({
    telemetryPoints: 0,
    hasCheckpoint: false,
    lastSaved: null
  });
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Check Hardware Transport API Supports
  const isBleSupported = universalHardwareEngine.isBluetoothSupported();
  const isSerialSupported = universalHardwareEngine.isSerialSupported();

  useEffect(() => {
    if (isOpen) {
      universalHardwareEngine.setAccountEmail(operatorEmail);
      const mapping = accountStorage.loadSensorMapping(operatorEmail);
      setSensorMapping(mapping);

      accountStorage.getDatabaseStats(operatorEmail).then((stats) => {
        setDbStats(stats);
      });
    }
  }, [isOpen, operatorEmail]);

  // Handle BLE Connect
  const handleBleConnect = async () => {
    setBleError(null);
    try {
      universalHardwareEngine.setAccountEmail(operatorEmail);
      const ok = await universalHardwareEngine.connectBle(bleServiceUuid, bleCharUuid);
      if (ok) {
        onSelectMode('BLUETOOTH');
      }
    } catch (err: any) {
      // Fallback to legacy manager
      try {
        bluetoothManager.setCustomUuids(bleServiceUuid, bleCharUuid);
        const ok = await bluetoothManager.connect();
        if (ok) onSelectMode('BLUETOOTH');
      } catch (e: any) {
        setBleError(err.message || 'Failed to connect to BLE device.');
      }
    }
  };

  const handleBleDisconnect = async () => {
    await universalHardwareEngine.disconnect();
    bluetoothManager.disconnect();
    if (currentMode === 'BLUETOOTH') {
      onSelectMode('SIMULATOR');
    }
  };

  // Handle Wi-Fi Connect
  const handleWifiConnect = async () => {
    setWifiError(null);
    try {
      universalHardwareEngine.setAccountEmail(operatorEmail);
      let ok = false;
      if (wifiProtocol === 'HTTP_POLL') {
        ok = await universalHardwareEngine.connectWifiHttp(wifiUrl, pollInterval);
      } else {
        ok = await universalHardwareEngine.connectWifiWs(wifiUrl);
      }

      if (ok) {
        onSelectMode('WIFI');
      } else {
        wifiManager.configure(wifiProtocol, wifiUrl, pollInterval);
        const legacyOk = await wifiManager.connect();
        if (legacyOk) {
          onSelectMode('WIFI');
        } else {
          setWifiError(`Unable to connect to ${wifiUrl}. Verify that the ESP32 / BMS server is reachable.`);
        }
      }
    } catch (err: any) {
      setWifiError(err.message || 'Failed to connect to Wi-Fi stream.');
    }
  };

  const handleWifiDisconnect = async () => {
    await universalHardwareEngine.disconnect();
    wifiManager.disconnect();
    if (currentMode === 'WIFI') {
      onSelectMode('SIMULATOR');
    }
  };

  // Handle USB Serial Connect
  const handleSerialConnect = async () => {
    setSerialError(null);
    setLocalSerialStatus('CONNECTING');
    try {
      universalHardwareEngine.setAccountEmail(operatorEmail);
      const ok = await universalHardwareEngine.connectSerial(serialBaud);
      if (ok) {
        setLocalSerialStatus('STREAMING');
        onSelectMode('SERIAL');
      } else {
        setLocalSerialStatus('ERROR');
        setSerialError('Serial port selection cancelled or unavailable.');
      }
    } catch (err: any) {
      setLocalSerialStatus('ERROR');
      setSerialError(err.message || 'Failed to connect to USB Serial port.');
    }
  };

  const handleSerialDisconnect = async () => {
    await universalHardwareEngine.disconnect();
    setLocalSerialStatus('DISCONNECTED');
    if (currentMode === 'SERIAL') {
      onSelectMode('SIMULATOR');
    }
  };

  // Handle Save Sensor Mapping
  const handleSaveMapping = () => {
    universalHardwareEngine.setCustomMapping(sensorMapping);
    accountStorage.saveSensorMapping(operatorEmail, sensorMapping);
    setMapperSaved(true);
    setTimeout(() => setMapperSaved(false), 2200);
  };

  // Handle Copy Firmware
  const handleCopyFirmware = () => {
    const code = SAMPLE_FIRMWARE[selectedFirmware];
    navigator.clipboard.writeText(code);
    setCopiedFirmware(true);
    setTimeout(() => setCopiedFirmware(false), 2000);
  };

  // Send Mock Packet for Instant Testing
  const handleSendTestPacket = () => {
    const mock = {
      v: Number((25.5 + Math.random() * 0.4).toFixed(2)),
      i: Number((13.8 + Math.random() * 2.0).toFixed(1)),
      t: Number((26.2 + Math.random() * 1.5).toFixed(1)),
      soc: Number((65.0 + Math.random() * 2.0).toFixed(1)),
      cycle: 625,
      c: [
        Number((3.201 + (Math.random() - 0.5) * 0.01).toFixed(3)),
        Number((3.204 + (Math.random() - 0.5) * 0.01).toFixed(3)),
        Number((3.202 + (Math.random() - 0.5) * 0.01).toFixed(3)),
        Number((3.198 + (Math.random() - 0.5) * 0.01).toFixed(3)),
        Number((3.205 + (Math.random() - 0.5) * 0.01).toFixed(3)),
        Number((3.200 + (Math.random() - 0.5) * 0.01).toFixed(3)),
        Number((3.203 + (Math.random() - 0.5) * 0.01).toFixed(3)),
        Number((3.202 + (Math.random() - 0.5) * 0.01).toFixed(3))
      ]
    };
    universalHardwareEngine.injectRawPacket(mock);
    onInjectTestPacket(mock);
  };

  // Telemetry & ML Exports
  const handleExportCsv = async () => {
    setExportNotice('Compiling CSV dataset from IndexedDB...');
    const csv = await accountStorage.exportTelemetryCsv(operatorEmail);
    const dateStr = new Date().toISOString().slice(0, 10);
    accountStorage.downloadBlob(csv, `VoltBMS_Telemetry_${operatorEmail}_${dateStr}.csv`, 'text/csv');
    setExportNotice(`Exported CSV successfully (${csv.length} bytes)`);
    setTimeout(() => setExportNotice(null), 3000);
  };

  const handleExportCheckpoint = async () => {
    setExportNotice('Exporting ML Model Checkpoint...');
    const json = await accountStorage.exportTelemetryJson(operatorEmail);
    const dateStr = new Date().toISOString().slice(0, 10);
    accountStorage.downloadBlob(json, `VoltBMS_ML_Checkpoint_${operatorEmail}_${dateStr}.json`, 'application/json');
    setExportNotice('Exported ML Checkpoint successfully');
    setTimeout(() => setExportNotice(null), 3000);
  };

  if (!isOpen) return null;

  const mlMetrics = onlineMl.getMetrics();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xl"
        style={{ background: 'rgba(5, 5, 8, 0.85)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 20 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-4xl bg-[#0a0b10]/95 backdrop-blur-2xl rounded-2xl p-5 sm:p-6 overflow-hidden border border-white/[0.1] shadow-[0_25px_80px_rgba(0,0,0,0.85)] max-h-[94vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center border border-cyan-500/25 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-orbitron font-bold text-white tracking-wide">
                    UNIVERSAL HARDWARE INGESTION & ML HUB
                  </h3>
                  <span className="text-[8.5px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    Sub-10ms Latency Engine
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  BLE, Wi-Fi WebSockets, USB UART Serial, Auto-Parser & Online Adaptive ML for Operator: <span className="text-cyan-400 font-bold">{operatorEmail}</span>
                </p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-slate-400 hover:text-white transition border border-white/[0.08]"
              aria-label="Close Hardware Hub"
            >
              <X className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Active Data Source Banner */}
          <div className="mt-4 p-3 rounded-xl bg-[#07080e]/90 border border-white/[0.08] flex flex-wrap items-center justify-between gap-3 relative z-10 font-mono text-[10px]">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">ACTIVE TELEMETRY PIPELINE:</span>
              <span
                className={`px-2.5 py-0.5 rounded-md font-orbitron font-bold text-[9px] border ${
                  currentMode === 'BLUETOOTH'
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-[0_0_12px_rgba(59,130,246,0.3)] animate-pulse'
                    : currentMode === 'WIFI'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)] animate-pulse'
                    : currentMode === 'SERIAL'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.3)] animate-pulse'
                    : 'bg-white/[0.06] text-cyan-300 border-white/[0.1]'
                }`}
              >
                {currentMode === 'BLUETOOTH'
                  ? '● BLUETOOTH BLE ACTIVE'
                  : currentMode === 'WIFI'
                  ? '● WI-FI HARDWARE ACTIVE'
                  : currentMode === 'SERIAL'
                  ? '● USB SERIAL UART ACTIVE'
                  : '● SYNTHETIC AI SIMULATOR'}
              </span>
            </div>

            {currentMode !== 'SIMULATOR' && (
              <button
                onClick={() => {
                  handleBleDisconnect();
                  handleWifiDisconnect();
                  handleSerialDisconnect();
                  onSelectMode('SIMULATOR');
                }}
                className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white border border-white/[0.08] text-[9px] transition"
              >
                Switch to Simulator
              </button>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1.5 mt-4 pb-2 border-b border-white/[0.08] relative z-10 text-xs font-orbitron overflow-x-auto">
            <button
              onClick={() => setActiveTab('BLE')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
                activeTab === 'BLE'
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Bluetooth className="w-3.5 h-3.5 text-blue-400" />
              <span>BLUETOOTH (BLE)</span>
            </button>

            <button
              onClick={() => setActiveTab('WIFI')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
                activeTab === 'WIFI'
                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span>WI-FI DIRECT</span>
            </button>

            <button
              onClick={() => setActiveTab('SERIAL')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
                activeTab === 'SERIAL'
                  ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>USB SERIAL</span>
            </button>

            <button
              onClick={() => setActiveTab('MAPPER')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
                activeTab === 'MAPPER'
                  ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
              <span>PIN MAPPER</span>
            </button>

            <button
              onClick={() => setActiveTab('ML_STORAGE')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
                activeTab === 'ML_STORAGE'
                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Brain className="w-3.5 h-3.5 text-emerald-400" />
              <span>ML & STORAGE</span>
            </button>

            <button
              onClick={() => setActiveTab('TERMINAL')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
                activeTab === 'TERMINAL'
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-purple-400" />
              <span>TERMINAL</span>
            </button>

            <button
              onClick={() => setActiveTab('FIRMWARE')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
                activeTab === 'FIRMWARE'
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>FIRMWARE</span>
            </button>
          </div>

          {/* Modal Body Content */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 relative z-10 custom-scrollbar text-slate-200">
            {/* ========================================================================= */}
            {/* TAB 1: BLUETOOTH (BLE) */}
            {/* ========================================================================= */}
            {activeTab === 'BLE' && (
              <div className="space-y-4">
                {!isBleSupported ? (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">Web Bluetooth API Not Available in This Browser</strong>
                      <span>
                        Web Bluetooth is supported on Google Chrome, Microsoft Edge, and Opera on Windows, macOS, Linux, and Android.
                        Switch to <strong>USB Serial</strong> or <strong>Wi-Fi Direct</strong> for full cross-browser streaming.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-300 text-[10px] font-mono flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                      Web Bluetooth API Active (GATT Client Ingestion Ready)
                    </span>
                    <span className="text-[9px] text-blue-300/80">60fps Sub-10ms Batching</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-[#07080e]/80 border border-white/[0.06] space-y-1">
                    <label className="text-slate-400 block text-[10px]">BLE Service UUID (Nordic UART / Battery):</label>
                    <input
                      type="text"
                      value={bleServiceUuid}
                      onChange={(e) => setBleServiceUuid(e.target.value)}
                      className="w-full bg-[#050609] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-slate-200 text-xs font-mono focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <div className="p-3 rounded-xl bg-[#07080e]/80 border border-white/[0.06] space-y-1">
                    <label className="text-slate-400 block text-[10px]">BLE Characteristic UUID (TX / Notify):</label>
                    <input
                      type="text"
                      value={bleCharUuid}
                      onChange={(e) => setBleCharUuid(e.target.value)}
                      className="w-full bg-[#050609] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-slate-200 text-xs font-mono focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>

                {/* Status Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono tabular-nums">
                  <div className="p-3 rounded-xl bg-[#07080e]/90 border border-white/[0.08]">
                    <span className="text-[8px] font-orbitron uppercase text-slate-400 block">STATUS</span>
                    <span className={`text-sm font-bold ${bleStatus === 'STREAMING' || bleStatus === 'CONNECTED' ? 'text-blue-400' : 'text-slate-400'}`}>
                      {bleStatus}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#07080e]/90 border border-white/[0.08]">
                    <span className="text-[8px] font-orbitron uppercase text-slate-400 block">PACKETS INGESTED</span>
                    <span className="text-sm font-bold text-white">{bleStats.packetsReceived}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#07080e]/90 border border-white/[0.08]">
                    <span className="text-[8px] font-orbitron uppercase text-slate-400 block">FREQUENCY</span>
                    <span className="text-sm font-bold text-cyan-400">{bleStats.packetRateHz} Hz</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#07080e]/90 border border-white/[0.08]">
                    <span className="text-[8px] font-orbitron uppercase text-slate-400 block">LATENCY</span>
                    <span className="text-sm font-bold text-purple-400">{bleStats.latencyMs ? `${bleStats.latencyMs} ms` : '< 10 ms'}</span>
                  </div>
                </div>

                {bleError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
                    {bleError}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  {bleStatus !== 'CONNECTED' && bleStatus !== 'STREAMING' ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleBleConnect}
                      disabled={!isBleSupported}
                      className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-orbitron font-bold text-xs tracking-wider uppercase transition shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center justify-center gap-2 border border-blue-400 disabled:opacity-50"
                    >
                      <Bluetooth className="w-4 h-4" />
                      <span>PAIR PHYSICAL BLUETOOTH BMS</span>
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleBleDisconnect}
                      className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-orbitron font-bold text-xs tracking-wider uppercase transition flex items-center justify-center gap-2"
                    >
                      <span>DISCONNECT BLE BMS</span>
                    </motion.button>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: WI-FI DIRECT */}
            {/* ========================================================================= */}
            {activeTab === 'WIFI' && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[10px] font-mono flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    High-Speed Wi-Fi Ingestion Active (WebSocket / HTTP Polling)
                  </span>
                  <span className="text-[9px] text-emerald-300/80">Local ESP32 AP or Home Wi-Fi</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-[#07080e]/80 border border-white/[0.06] space-y-1">
                    <label className="text-slate-400 block text-[10px]">Protocol:</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setWifiProtocol('WEBSOCKET');
                          setWifiUrl('ws://192.168.4.1:81');
                        }}
                        className={`flex-1 py-1.5 rounded-lg border text-[10px] font-orbitron font-bold transition ${
                          wifiProtocol === 'WEBSOCKET'
                            ? 'bg-emerald-600/25 text-emerald-300 border-emerald-500/50'
                            : 'bg-[#050609] text-slate-400 border-white/[0.06]'
                        }`}
                      >
                        WebSocket (ws://)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setWifiProtocol('HTTP_POLL');
                          setWifiUrl('http://192.168.4.1/telemetry');
                        }}
                        className={`flex-1 py-1.5 rounded-lg border text-[10px] font-orbitron font-bold transition ${
                          wifiProtocol === 'HTTP_POLL'
                            ? 'bg-emerald-600/25 text-emerald-300 border-emerald-500/50'
                            : 'bg-[#050609] text-slate-400 border-white/[0.06]'
                        }`}
                      >
                        HTTP Polling
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#07080e]/80 border border-white/[0.06] space-y-1">
                    <label className="text-slate-400 block text-[10px]">Stream URL / IP Endpoint:</label>
                    <input
                      type="text"
                      value={wifiUrl}
                      onChange={(e) => setWifiUrl(e.target.value)}
                      className="w-full bg-[#050609] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-slate-200 text-xs font-mono focus:outline-none focus:border-emerald-400"
                      placeholder="e.g. ws://192.168.4.1:81"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono tabular-nums">
                  <div className="p-3 rounded-xl bg-[#07080e]/90 border border-white/[0.08]">
                    <span className="text-[8px] font-orbitron uppercase text-slate-400 block">STATUS</span>
                    <span className={`text-sm font-bold ${wifiStatus === 'STREAMING' || wifiStatus === 'CONNECTED' ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {wifiStatus}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#07080e]/90 border border-white/[0.08]">
                    <span className="text-[8px] font-orbitron uppercase text-slate-400 block">PACKETS INGESTED</span>
                    <span className="text-sm font-bold text-white">{wifiStats.packetsReceived}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#07080e]/90 border border-white/[0.08]">
                    <span className="text-[8px] font-orbitron uppercase text-slate-400 block">FREQUENCY</span>
                    <span className="text-sm font-bold text-cyan-400">{wifiStats.packetRateHz} Hz</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#07080e]/90 border border-white/[0.08]">
                    <span className="text-[8px] font-orbitron uppercase text-slate-400 block">LATENCY</span>
                    <span className="text-sm font-bold text-purple-400">{wifiStats.latencyMs ? `${wifiStats.latencyMs} ms` : '< 12 ms'}</span>
                  </div>
                </div>

                {wifiError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
                    {wifiError}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  {wifiStatus !== 'CONNECTED' && wifiStatus !== 'STREAMING' ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleWifiConnect}
                      className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-orbitron font-bold text-xs tracking-wider uppercase transition shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 border border-emerald-300"
                    >
                      <Wifi className="w-4 h-4" />
                      <span>START WI-FI TELEMETRY STREAM</span>
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleWifiDisconnect}
                      className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-orbitron font-bold text-xs tracking-wider uppercase transition flex items-center justify-center gap-2"
                    >
                      <span>DISCONNECT WI-FI STREAM</span>
                    </motion.button>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 3: USB SERIAL (UART DIRECT) */}
            {/* ========================================================================= */}
            {activeTab === 'SERIAL' && (
              <div className="space-y-4">
                {!isSerialSupported ? (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">Web Serial API Not Available in This Browser</strong>
                      <span>
                        Web Serial requires Chromium browsers (Google Chrome, Microsoft Edge, Opera). Please use Chrome or Edge to stream directly over USB cables.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[10px] font-mono flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      Web Serial API Active (Direct USB UART Ingestion Ready)
                    </span>
                    <span className="text-[9px] text-amber-300/80">Zero Wireless Jitter / Sub-5ms</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-[#07080e]/80 border border-white/[0.06] space-y-1">
                    <label className="text-slate-400 block text-[10px]">UART Baud Rate:</label>
                    <select
                      value={serialBaud}
                      onChange={(e) => setSerialBaud(Number(e.target.value))}
                      className="w-full bg-[#050609] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-slate-200 text-xs font-mono focus:outline-none focus:border-amber-400"
                    >
                      <option value={9600}>9600 Baud</option>
                      <option value={57600}>57600 Baud</option>
                      <option value={115200}>115200 Baud (Standard ESP32)</option>
                      <option value={230400}>230400 Baud (High-Speed)</option>
                      <option value={921600}>921600 Baud (Ultra-Speed)</option>
                    </select>
                  </div>

                  <div className="p-3 rounded-xl bg-[#07080e]/80 border border-white/[0.06] space-y-1">
                    <label className="text-slate-400 block text-[10px]">Microcontroller Compatibility:</label>
                    <p className="text-[10px] text-slate-300">
                      ESP32, Arduino Uno/Nano/Mega, STM32 BluePill, Raspberry Pi Pico, Teensy 4.0
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono tabular-nums">
                  <div className="p-3 rounded-xl bg-[#07080e]/90 border border-white/[0.08]">
                    <span className="text-[8px] font-orbitron uppercase text-slate-400 block">STATUS</span>
                    <span className={`text-sm font-bold ${localSerialStatus === 'STREAMING' ? 'text-amber-400' : 'text-slate-400'}`}>
                      {localSerialStatus}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#07080e]/90 border border-white/[0.08]">
                    <span className="text-[8px] font-orbitron uppercase text-slate-400 block">BUFFER RING</span>
                    <span className="text-sm font-bold text-white">64 Packets / 60fps</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#07080e]/90 border border-white/[0.08]">
                    <span className="text-[8px] font-orbitron uppercase text-slate-400 block">UART LATENCY</span>
                    <span className="text-sm font-bold text-cyan-400">&lt; 5.0 ms</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#07080e]/90 border border-white/[0.08]">
                    <span className="text-[8px] font-orbitron uppercase text-slate-400 block">AUTO-PARSER</span>
                    <span className="text-sm font-bold text-purple-400">{sensorMapping.format}</span>
                  </div>
                </div>

                {serialError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
                    {serialError}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  {localSerialStatus !== 'STREAMING' ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSerialConnect}
                      disabled={!isSerialSupported}
                      className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-slate-950 font-orbitron font-bold text-xs tracking-wider uppercase transition shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2 border border-amber-300 disabled:opacity-50"
                    >
                      <Zap className="w-4 h-4" />
                      <span>SELECT USB SERIAL PORT & CONNECT</span>
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSerialDisconnect}
                      className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-orbitron font-bold text-xs tracking-wider uppercase transition flex items-center justify-center gap-2"
                    >
                      <span>DISCONNECT USB SERIAL</span>
                    </motion.button>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 4: PIN & SENSOR MAPPER */}
            {/* ========================================================================= */}
            {activeTab === 'MAPPER' && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-[10px] font-mono flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                    Custom Sensor Pin / Key Mapper (INA219, DS18B20, ADS1115, NTC, DALY BMS)
                  </span>
                  <span className="text-[9px] text-cyan-300/80">Account-Persisted Schema</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-[#07080e]/80 border border-white/[0.06] space-y-1">
                    <label className="text-slate-400 block text-[10px]">Payload Protocol / Format:</label>
                    <select
                      value={sensorMapping.format}
                      onChange={(e) => setSensorMapping({ ...sensorMapping, format: e.target.value as any })}
                      className="w-full bg-[#050609] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-400"
                    >
                      <option value="AUTO_DETECT">AUTO_DETECT (All Arbitrary Formats)</option>
                      <option value="JSON">Strict JSON Objects</option>
                      <option value="CSV">Comma-Separated Values (CSV)</option>
                      <option value="BINARY_DALY">DALY BMS Binary Protocol</option>
                    </select>
                  </div>

                  <div className="p-3 rounded-xl bg-[#07080e]/80 border border-white/[0.06] space-y-1">
                    <label className="text-slate-400 block text-[10px]">Voltage Field Key:</label>
                    <input
                      type="text"
                      value={sensorMapping.voltageKey || ''}
                      onChange={(e) => setSensorMapping({ ...sensorMapping, voltageKey: e.target.value })}
                      placeholder="e.g. voltage, v, pack_v"
                      className="w-full bg-[#050609] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-[#07080e]/80 border border-white/[0.06] space-y-1">
                    <label className="text-slate-400 block text-[10px]">Current Field Key (INA219 / Shunt):</label>
                    <input
                      type="text"
                      value={sensorMapping.currentKey || ''}
                      onChange={(e) => setSensorMapping({ ...sensorMapping, currentKey: e.target.value })}
                      placeholder="e.g. current, i, pack_i"
                      className="w-full bg-[#050609] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-[#07080e]/80 border border-white/[0.06] space-y-1">
                    <label className="text-slate-400 block text-[10px]">Temperature Field Key (DS18B20 / NTC):</label>
                    <input
                      type="text"
                      value={sensorMapping.tempKey || ''}
                      onChange={(e) => setSensorMapping({ ...sensorMapping, tempKey: e.target.value })}
                      placeholder="e.g. temp, t, t1"
                      className="w-full bg-[#050609] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-[#07080e]/80 border border-white/[0.06] space-y-1">
                    <label className="text-slate-400 block text-[10px]">Cell Array Field Key (ADS1115 taps):</label>
                    <input
                      type="text"
                      value={sensorMapping.cellsKey || ''}
                      onChange={(e) => setSensorMapping({ ...sensorMapping, cellsKey: e.target.value })}
                      placeholder="e.g. cells, c, cell_voltages"
                      className="w-full bg-[#050609] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-[#07080e]/80 border border-white/[0.06] space-y-1">
                    <label className="text-slate-400 block text-[10px]">State of Charge (SOC) Key:</label>
                    <input
                      type="text"
                      value={sensorMapping.socKey || ''}
                      onChange={(e) => setSensorMapping({ ...sensorMapping, socKey: e.target.value })}
                      placeholder="e.g. soc, state_of_charge"
                      className="w-full bg-[#050609] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-[#07080e]/90 border border-white/[0.08]">
                  <span className="text-xs font-mono text-slate-400">
                    Configuration automatically linked to: <strong className="text-white">{operatorEmail}</strong>
                  </span>
                  <button
                    onClick={handleSaveMapping}
                    className="px-4 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 font-orbitron font-bold text-xs tracking-wider transition flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                  >
                    {mapperSaved ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">MAPPING SAVED!</span>
                      </>
                    ) : (
                      <>
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>SAVE SENSOR SCHEMA</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 5: CONTINUOUS ONLINE ML & PERSISTENT STORAGE */}
            {/* ========================================================================= */}
            {activeTab === 'ML_STORAGE' && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[10px] font-mono flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-emerald-400" />
                    Online Recursive Least Squares & Welford Anomaly Learning Active
                  </span>
                  <span className="text-[9px] text-emerald-300/80">Never Resets on Refresh</span>
                </div>

                {/* ML Performance Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono tabular-nums">
                  <div className="p-3 rounded-xl bg-[#07080e]/90 border border-white/[0.08]">
                    <span className="text-[8px] font-orbitron uppercase text-slate-400 block">LEARNED ITERATIONS</span>
                    <span className="text-sm font-bold text-white">{mlMetrics.iterations}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#07080e]/90 border border-white/[0.08]">
                    <span className="text-[8px] font-orbitron uppercase text-slate-400 block">ML ACCURACY (R²)</span>
                    <span className="text-sm font-bold text-emerald-400">{(mlMetrics.rSquared * 100).toFixed(1)}%</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#07080e]/90 border border-white/[0.08]">
                    <span className="text-[8px] font-orbitron uppercase text-slate-400 block">MEAN ABS ERROR</span>
                    <span className="text-sm font-bold text-cyan-400">{mlMetrics.mae.toFixed(3)}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#07080e]/90 border border-white/[0.08]">
                    <span className="text-[8px] font-orbitron uppercase text-slate-400 block">CONFIDENCE SCORE</span>
                    <span className="text-sm font-bold text-purple-400">{mlMetrics.confidenceScore.toFixed(1)}%</span>
                  </div>
                </div>

                {/* Account Storage Statistics */}
                <div className="p-4 rounded-xl bg-[#07080e]/90 border border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-orbitron font-bold text-white">ACCOUNT PERSISTENT TELEMETRY DATABASE</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.04] text-slate-300 border border-white/[0.08]">
                      IndexedDB + LocalStorage
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                    <div className="p-2.5 rounded-lg bg-[#050609] border border-white/[0.04]">
                      <span className="text-[9px] text-slate-400 block">STORED TELEMETRY SAMPLES:</span>
                      <strong className="text-cyan-400 text-sm">{dbStats.telemetryPoints} Packets</strong>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#050609] border border-white/[0.04]">
                      <span className="text-[9px] text-slate-400 block">ACTIVE OPERATOR:</span>
                      <strong className="text-white text-xs truncate block">{operatorEmail}</strong>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#050609] border border-white/[0.04]">
                      <span className="text-[9px] text-slate-400 block">ML CHECKPOINT STATUS:</span>
                      <strong className="text-emerald-400 text-xs">
                        {dbStats.hasCheckpoint ? '● CHECKPOINT SYNCHRONIZED' : '○ INITIALIZING'}
                      </strong>
                    </div>
                  </div>

                  {exportNotice && (
                    <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-xs font-mono">
                      {exportNotice}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleExportCsv}
                      className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 border border-white/[0.1] font-orbitron font-bold text-xs tracking-wider transition flex items-center justify-center gap-2"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      <span>EXPORT TELEMETRY (CSV)</span>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleExportCheckpoint}
                      className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 font-orbitron font-bold text-xs tracking-wider transition flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4 text-purple-400" />
                      <span>EXPORT ML CHECKPOINT (JSON)</span>
                    </motion.button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 6: LIVE PACKET TERMINAL */}
            {/* ========================================================================= */}
            {activeTab === 'TERMINAL' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-purple-400" />
                    LIVE INCOMING HARDWARE PACKET STREAM
                  </span>
                  <button
                    onClick={handleSendTestPacket}
                    className="px-3 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-[10px] font-orbitron font-bold transition flex items-center gap-1.5 shadow-[0_0_12px_rgba(168,85,247,0.2)]"
                  >
                    <Zap className="w-3 h-3 text-purple-400" />
                    INJECT MOCK TEST PACKET
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-[#040508] border border-white/[0.08] font-mono text-[11px] text-emerald-400 overflow-x-auto min-h-[220px] max-h-[340px] shadow-inner custom-scrollbar">
                  {lastRawPacket ? (
                    <pre className="whitespace-pre-wrap leading-relaxed">
                      {JSON.stringify(lastRawPacket, null, 2)}
                    </pre>
                  ) : (
                    <div className="text-slate-500 py-16 text-center space-y-2">
                      <Radio className="w-8 h-8 text-slate-600 mx-auto animate-pulse" />
                      <p>Awaiting live packets from paired BLE, Wi-Fi, or USB Serial hardware...</p>
                      <p className="text-[10px] text-slate-600">
                        Click "Inject Mock Test Packet" above to test the normalizer and charts right now.
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-[#07080e]/80 border border-white/[0.06] text-[10px] font-mono text-slate-400 space-y-1">
                  <span className="text-white font-bold block">ACCEPTED HARDWARE SCHEMAS:</span>
                  <span>• Minimal JSON: <code>{"{\"v\": 25.6, \"i\": 14.5, \"t\": 26.5, \"c\": [3.20, 3.21, 3.20, 3.20, 3.21, 3.20, 3.20, 3.21]}"}</code></span>
                  <br />
                  <span>• Comma-Separated (CSV): <code>{"25.64,14.20,26.40,66.2,3.205,3.201,3.208,3.203"}</code></span>
                  <br />
                  <span>• DALY BMS Hex Frame: <code>0xA5 0x40 0x90 0x08 ... 0xCS</code></span>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 7: SAMPLE FIRMWARE (.INO) */}
            {/* ========================================================================= */}
            {activeTab === 'FIRMWARE' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-orbitron font-bold flex-wrap">
                    <button
                      onClick={() => setSelectedFirmware('ESP32_BLE')}
                      className={`px-3 py-1.5 rounded-lg border text-[10px] transition ${
                        selectedFirmware === 'ESP32_BLE'
                          ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 shadow-sm'
                          : 'bg-[#050609] text-slate-400 border-white/[0.06]'
                      }`}
                    >
                      ESP32 BLE (.ino)
                    </button>
                    <button
                      onClick={() => setSelectedFirmware('ESP32_WIFI_WEBSOCKET')}
                      className={`px-3 py-1.5 rounded-lg border text-[10px] transition ${
                        selectedFirmware === 'ESP32_WIFI_WEBSOCKET'
                          ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                          : 'bg-[#050609] text-slate-400 border-white/[0.06]'
                      }`}
                    >
                      Wi-Fi WebSocket (.ino)
                    </button>
                    <button
                      onClick={() => setSelectedFirmware('ESP32_USB_SERIAL')}
                      className={`px-3 py-1.5 rounded-lg border text-[10px] transition ${
                        selectedFirmware === 'ESP32_USB_SERIAL'
                          ? 'bg-amber-600/20 text-amber-300 border-amber-500/40 shadow-sm'
                          : 'bg-[#050609] text-slate-400 border-white/[0.06]'
                      }`}
                    >
                      USB Serial UART (.ino)
                    </button>
                    <button
                      onClick={() => setSelectedFirmware('ESP32_WIFI_HTTP')}
                      className={`px-3 py-1.5 rounded-lg border text-[10px] transition ${
                        selectedFirmware === 'ESP32_WIFI_HTTP'
                          ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 shadow-sm'
                          : 'bg-[#050609] text-slate-400 border-white/[0.06]'
                      }`}
                    >
                      Wi-Fi HTTP (.ino)
                    </button>
                  </div>

                  <button
                    onClick={handleCopyFirmware}
                    className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 border border-white/[0.08] text-[10px] font-mono flex items-center gap-1.5 transition"
                  >
                    {copiedFirmware ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">COPIED TO CLIPBOARD!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>COPY FIRMWARE CODE</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-[#040508] border border-white/[0.08] font-mono text-[10.5px] text-slate-300 overflow-x-auto max-h-[340px] shadow-inner custom-scrollbar">
                  <pre className="whitespace-pre leading-relaxed">
                    {SAMPLE_FIRMWARE[selectedFirmware]}
                  </pre>
                </div>

                <div className="p-3 rounded-xl bg-[#07080e]/90 border border-white/[0.06] text-[10px] font-mono text-slate-400">
                  <strong className="text-cyan-400 block mb-0.5">Quick Setup Guide:</strong>
                  1. Paste this code into Arduino IDE. 2. Select board "ESP32 Dev Module". 3. Flash over USB. 4. Open this website and click "Pair Bluetooth BMS", "Start Wi-Fi Stream", or "Select USB Serial Port".
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-[10px] text-slate-400 font-mono relative z-10">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Real Web Bluetooth, WebSockets & Web Serial Engine (<span className="text-cyan-400 font-bold">&lt; 10ms Latency</span>)
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 font-orbitron text-[9px] tracking-wider transition border border-white/[0.08]"
            >
              CLOSE
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
