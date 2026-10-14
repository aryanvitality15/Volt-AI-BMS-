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
  ArrowRight
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

interface HardwareConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: HardwareSourceMode;
  onSelectMode: (mode: HardwareSourceMode) => void;
  bleStatus: HardwareStatus;
  bleStats: HardwareStats;
  wifiStatus: HardwareStatus;
  wifiStats: HardwareStats;
  lastRawPacket: any;
  onInjectTestPacket: (sample: any) => void;
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
  lastRawPacket,
  onInjectTestPacket
}) => {
  const [activeTab, setActiveTab] = useState<'BLE' | 'WIFI' | 'TERMINAL' | 'FIRMWARE'>('BLE');

  // BLE Configuration
  const [bleServiceUuid, setBleServiceUuid] = useState<string>('6e400001-b5a3-f393-e0a9-e50e24dcca9e');
  const [bleCharUuid, setBleCharUuid] = useState<string>('6e400003-b5a3-f393-e0a9-e50e24dcca9e');
  const [bleError, setBleError] = useState<string | null>(null);

  // Wi-Fi Configuration
  const [wifiProtocol, setWifiProtocol] = useState<WifiProtocol>('WEBSOCKET');
  const [wifiUrl, setWifiUrl] = useState<string>('ws://192.168.4.1:81');
  const [pollInterval, setPollInterval] = useState<number>(1000);
  const [wifiError, setWifiError] = useState<string | null>(null);

  // Firmware copy state
  const [selectedFirmware, setSelectedFirmware] = useState<'ESP32_BLE' | 'ESP32_WIFI_WEBSOCKET' | 'ESP32_WIFI_HTTP'>('ESP32_BLE');
  const [copiedFirmware, setCopiedFirmware] = useState<boolean>(false);

  // Check Web Bluetooth support
  const isBleSupported = bluetoothManager.isSupported();
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

  // Handle BLE Connect
  const handleBleConnect = async () => {
    setBleError(null);
    try {
      bluetoothManager.setCustomUuids(bleServiceUuid, bleCharUuid);
      const ok = await bluetoothManager.connect();
      if (ok) {
        onSelectMode('BLUETOOTH');
      }
    } catch (err: any) {
      setBleError(err.message || 'Failed to connect to BLE device.');
    }
  };

  const handleBleDisconnect = () => {
    bluetoothManager.disconnect();
    if (currentMode === 'BLUETOOTH') {
      onSelectMode('SIMULATOR');
    }
  };

  // Handle Wi-Fi Connect
  const handleWifiConnect = async () => {
    setWifiError(null);
    try {
      wifiManager.configure(wifiProtocol, wifiUrl, pollInterval);
      const ok = await wifiManager.connect();
      if (ok) {
        onSelectMode('WIFI');
      } else {
        setWifiError(`Unable to connect to ${wifiUrl}. Verify that the ESP32 / BMS server is reachable.`);
      }
    } catch (err: any) {
      setWifiError(err.message || 'Failed to connect to Wi-Fi stream.');
    }
  };

  const handleWifiDisconnect = () => {
    wifiManager.disconnect();
    if (currentMode === 'WIFI') {
      onSelectMode('SIMULATOR');
    }
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
    onInjectTestPacket(mock);
  };

  if (!isOpen) return null;

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
          className="relative w-full max-w-3xl bg-[#0a0b10]/95 backdrop-blur-2xl rounded-2xl p-5 sm:p-6 overflow-hidden border border-white/[0.1] shadow-[0_25px_80px_rgba(0,0,0,0.85)] max-h-[92vh] flex flex-col"
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
                    HARDWARE CONNECTIVITY HUB
                  </h3>
                  <span className="text-[8.5px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    BLE & Wi-Fi Direct
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Stream Live Telemetry from Physical ESP32 / Arduino / BMS Hardware Nodes
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
                    : 'bg-white/[0.06] text-cyan-300 border-white/[0.1]'
                }`}
              >
                {currentMode === 'BLUETOOTH'
                  ? '● BLUETOOTH BLE ACTIVE'
                  : currentMode === 'WIFI'
                  ? '● WI-FI HARDWARE ACTIVE'
                  : '● SYNTHETIC AI SIMULATOR'}
              </span>
            </div>

            {currentMode !== 'SIMULATOR' && (
              <button
                onClick={() => {
                  handleBleDisconnect();
                  handleWifiDisconnect();
                  onSelectMode('SIMULATOR');
                }}
                className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white border border-white/[0.08] text-[9px] transition"
              >
                Switch to Simulator
              </button>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 mt-4 pb-2 border-b border-white/[0.08] relative z-10 text-xs font-orbitron">
            <button
              onClick={() => setActiveTab('BLE')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all ${
                activeTab === 'BLE'
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Bluetooth className="w-3.5 h-3.5 text-blue-400" />
              <span>BLUETOOTH (BLE)</span>
              {bleStatus === 'STREAMING' && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('WIFI')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all ${
                activeTab === 'WIFI'
                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span>WI-FI DIRECT</span>
              {wifiStatus === 'STREAMING' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('TERMINAL')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all ${
                activeTab === 'TERMINAL'
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-purple-400" />
              <span>RAW PACKETS</span>
            </button>

            <button
              onClick={() => setActiveTab('FIRMWARE')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all ${
                activeTab === 'FIRMWARE'
                  ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-amber-400" />
              <span>FIRMWARE CODE</span>
            </button>
          </div>

          {/* Modal Body Content */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 relative z-10 custom-scrollbar text-slate-200">
            {/* ========================================================================= */}
            {/* TAB 1: BLUETOOTH (BLE) */}
            {/* ========================================================================= */}
            {activeTab === 'BLE' && (
              <div className="space-y-4">
                {/* Browser Compatibility Notice */}
                {!isBleSupported ? (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">Web Bluetooth API Not Available in This Browser</strong>
                      <span>
                        Web Bluetooth is supported on Google Chrome, Microsoft Edge, and Opera on Windows, macOS, Linux, and Android.
                        If you are using Safari or Firefox, please switch to the <strong>Wi-Fi Direct</strong> tab or open in Chrome.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-300 text-[10px] font-mono flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                      Web Bluetooth API Active (GATT Client Ready)
                    </span>
                    <span className="text-slate-400">Standard & Nordic UART GATT</span>
                  </div>
                )}

                {/* BLE Status Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono tabular-nums">
                  <div className="p-3 rounded-xl bg-[#07080e]/90 border border-white/[0.08]">
                    <span className="text-[8px] font-orbitron uppercase text-slate-400 block">STATUS</span>
                    <span
                      className={`text-sm font-bold ${
                        bleStatus === 'STREAMING' || bleStatus === 'CONNECTED'
                          ? 'text-blue-400'
                          : bleStatus === 'CONNECTING'
                          ? 'text-amber-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {bleStatus}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#07080e]/90 border border-white/[0.08]">
                    <span className="text-[8px] font-orbitron uppercase text-slate-400 block">DEVICE NAME</span>
                    <span className="text-sm font-bold text-white truncate block">
                      {bleStats.deviceName || 'No Device Paired'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#07080e]/90 border border-white/[0.08]">
                    <span className="text-[8px] font-orbitron uppercase text-slate-400 block">PACKETS RECEIVED</span>
                    <span className="text-sm font-bold text-emerald-400">
                      {bleStats.packetsReceived}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#07080e]/90 border border-white/[0.08]">
                    <span className="text-[8px] font-orbitron uppercase text-slate-400 block">STREAM RATE</span>
                    <span className="text-sm font-bold text-cyan-400">
                      {bleStats.packetRateHz} Hz
                    </span>
                  </div>
                </div>

                {/* Error Banner */}
                {bleError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
                    {bleError}
                  </div>
                )}

                {/* Primary Action Button */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  {bleStatus !== 'CONNECTED' && bleStatus !== 'STREAMING' ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleBleConnect}
                      disabled={!isBleSupported}
                      className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-orbitron font-bold text-xs tracking-wider uppercase transition shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center justify-center gap-2 border border-blue-400/40"
                    >
                      <Bluetooth className="w-4 h-4 fill-current" />
                      <span>PAIR BLUETOOTH BMS NODE</span>
                    </motion.button>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleBleDisconnect}
                      className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-orbitron font-bold text-xs tracking-wider uppercase transition flex items-center justify-center gap-2"
                    >
                      <span>DISCONNECT BLE NODE</span>
                    </motion.button>
                  )}
                </div>

                {/* Configurable UUIDs */}
                <div className="p-4 rounded-xl bg-[#07080e]/80 border border-white/[0.06] space-y-3">
                  <div className="flex items-center justify-between text-xs font-orbitron">
                    <span className="text-slate-300 font-bold flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-blue-400" />
                      GATT SERVICE & CHARACTERISTIC UUIDS
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">Defaults to Nordic UART</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px] font-mono">
                    <div>
                      <label className="text-slate-400 block mb-1">Service UUID</label>
                      <input
                        type="text"
                        value={bleServiceUuid}
                        onChange={(e) => setBleServiceUuid(e.target.value)}
                        className="w-full bg-[#050609] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-blue-400"
                        placeholder="e.g. 6e400001-b5a3-f393-e0a9-e50e24dcca9e"
                      />
                    </div>

                    <div>
                      <label className="text-slate-400 block mb-1">TX Characteristic UUID (Notify)</label>
                      <input
                        type="text"
                        value={bleCharUuid}
                        onChange={(e) => setBleCharUuid(e.target.value)}
                        className="w-full bg-[#050609] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-blue-400"
                        placeholder="e.g. 6e400003-b5a3-f393-e0a9-e50e24dcca9e"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: WI-FI DIRECT */}
            {/* ========================================================================= */}
            {activeTab === 'WIFI' && (
              <div className="space-y-4">
                {/* Mixed Content Warning on HTTPS */}
                {isHttps && (wifiUrl.startsWith('ws://') || wifiUrl.startsWith('http://')) && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Mixed-Content Security Notice</span>
                    </div>
                    <p className="text-[10px] text-slate-300 leading-relaxed">
                      You are viewing on HTTPS. Browsers restrict unencrypted <code>ws://</code> and <code>http://</code> connections to local IPs.
                      To connect to a local ESP32 (e.g. <code>ws://192.168.4.1:81</code>):
                      <br />• In Chrome/Edge: Click the tune/padlock icon in the URL bar &gt; <strong>Site settings</strong> &gt; set <strong>Insecure content</strong> to <strong>Allow</strong>.
                      <br />• Or use encrypted <code>wss://</code> with an ngrok / Cloudflare tunnel.
                    </p>
                  </div>
                )}

                {/* Protocol Selector */}
                <div className="p-3.5 rounded-xl bg-[#07080e]/90 border border-white/[0.08]">
                  <label className="text-[9px] font-orbitron font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    WI-FI STREAM PROTOCOL
                  </label>
                  <div className="grid grid-cols-3 gap-2 text-[10px] font-orbitron font-bold">
                    {[
                      { id: 'WEBSOCKET', label: 'WebSocket (ws://, wss://)' },
                      { id: 'HTTP_POLL', label: 'HTTP REST Polling' },
                      { id: 'MQTT_WSS', label: 'MQTT over WSS' }
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          const proto = p.id as WifiProtocol;
                          setWifiProtocol(proto);
                          if (proto === 'WEBSOCKET') setWifiUrl('ws://192.168.4.1:81');
                          if (proto === 'HTTP_POLL') setWifiUrl('http://192.168.1.100/telemetry');
                          if (proto === 'MQTT_WSS') setWifiUrl('wss://broker.hivemq.com:8884/mqtt');
                        }}
                        className={`py-2 px-2 rounded-xl border text-center transition-all ${
                          wifiProtocol === p.id
                            ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                            : 'bg-[#050609] border-white/[0.06] text-slate-400 hover:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Endpoint URL Input */}
                <div className="space-y-1.5 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-400 text-[10px] uppercase font-bold">
                      {wifiProtocol === 'WEBSOCKET' ? 'WebSocket URL' : wifiProtocol === 'HTTP_POLL' ? 'HTTP Endpoint URL' : 'MQTT Broker WSS URL'}
                    </label>
                    <span className="text-[9px] text-slate-500">
                      {wifiProtocol === 'WEBSOCKET' ? 'ws://<ESP32_IP>:81' : wifiProtocol === 'HTTP_POLL' ? 'http://<ESP32_IP>/telemetry' : 'wss://<broker>:8884/mqtt'}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={wifiUrl}
                    onChange={(e) => setWifiUrl(e.target.value)}
                    className="w-full bg-[#050609] border border-white/[0.08] rounded-xl px-3 py-2 text-slate-200 text-xs font-mono focus:outline-none focus:border-emerald-400"
                    placeholder="e.g. ws://192.168.4.1:81"
                  />
                </div>

                {/* HTTP Polling Interval Slider */}
                {wifiProtocol === 'HTTP_POLL' && (
                  <div className="p-3 rounded-xl bg-[#07080e]/80 border border-white/[0.06] space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>Poll Interval:</span>
                      <strong className="text-emerald-400 font-bold">{pollInterval} ms ({(1000 / pollInterval).toFixed(1)} Hz)</strong>
                    </div>
                    <input
                      type="range"
                      min={250}
                      max={3000}
                      step={250}
                      value={pollInterval}
                      onChange={(e) => setPollInterval(Number(e.target.value))}
                      className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>
                )}

                {/* Wi-Fi Status Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono tabular-nums">
                  <div className="p-3 rounded-xl bg-[#07080e]/90 border border-white/[0.08]">
                    <span className="text-[8px] font-orbitron uppercase text-slate-400 block">STATUS</span>
                    <span
                      className={`text-sm font-bold ${
                        wifiStatus === 'STREAMING' || wifiStatus === 'CONNECTED'
                          ? 'text-emerald-400'
                          : wifiStatus === 'CONNECTING'
                          ? 'text-amber-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {wifiStatus}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#07080e]/90 border border-white/[0.08]">
                    <span className="text-[8px] font-orbitron uppercase text-slate-400 block">PACKETS INGESTED</span>
                    <span className="text-sm font-bold text-white">
                      {wifiStats.packetsReceived}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#07080e]/90 border border-white/[0.08]">
                    <span className="text-[8px] font-orbitron uppercase text-slate-400 block">FREQUENCY</span>
                    <span className="text-sm font-bold text-cyan-400">
                      {wifiStats.packetRateHz} Hz
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#07080e]/90 border border-white/[0.08]">
                    <span className="text-[8px] font-orbitron uppercase text-slate-400 block">LATENCY</span>
                    <span className="text-sm font-bold text-purple-400">
                      {wifiStats.latencyMs ? `${wifiStats.latencyMs} ms` : '—'}
                    </span>
                  </div>
                </div>

                {wifiError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
                    {wifiError}
                  </div>
                )}

                {/* Action Buttons */}
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
            {/* TAB 3: LIVE PACKET TERMINAL */}
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
                      <p>Awaiting live packets from paired BLE or Wi-Fi hardware...</p>
                      <p className="text-[10px] text-slate-600">
                        Click "Inject Mock Test Packet" above to test the normalizer and charts right now.
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-[#07080e]/80 border border-white/[0.06] text-[10px] font-mono text-slate-400 space-y-1">
                  <span className="text-white font-bold block">ACCEPTED HARDWARE JSON SCHEMAS:</span>
                  <span>• Minimal: <code>{"{\"v\": 25.6, \"i\": 14.5, \"t\": 26.5, \"c\": [3.20, 3.21, 3.20, 3.20, 3.21, 3.20, 3.20, 3.21]}"}</code></span>
                  <br />
                  <span>• Verbose: <code>{"{\"voltage\": 25.6, \"current\": 14.5, \"temp\": 26.5, \"soc\": 65.0, \"cycles\": 625}"}</code></span>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 4: SAMPLE FIRMWARE (.INO) */}
            {/* ========================================================================= */}
            {activeTab === 'FIRMWARE' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-orbitron font-bold">
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
                      onClick={() => setSelectedFirmware('ESP32_WIFI_HTTP')}
                      className={`px-3 py-1.5 rounded-lg border text-[10px] transition ${
                        selectedFirmware === 'ESP32_WIFI_HTTP'
                          ? 'bg-amber-600/20 text-amber-300 border-amber-500/40 shadow-sm'
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
                  1. Paste this code into Arduino IDE. 2. Select board "ESP32 Dev Module". 3. Flash over USB. 4. Open this website and click "Pair Bluetooth BMS" or "Start Wi-Fi Stream".
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-[10px] text-slate-400 font-mono relative z-10">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              100% Real Browser Web Bluetooth & WebSockets Engine
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
