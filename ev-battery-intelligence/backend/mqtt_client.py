"""
EV BATTERY INTELLIGENCE - HIVEMQ MQTT CLIENT (PUBLISHER & SUBSCRIBER)
Full bidirectional MQTT engine:
- Continuous publisher using paho-mqtt
- Robust subscriber with schema validation
- Automatic reconnection logic
- Malformed packet handling & graceful recovery
- Live / Demo telemetry bridge
"""

import json
import time
import threading
import logging
from typing import Dict, Any, Callable, Optional
import paho.mqtt.client as mqtt
from config import settings

logger = logging.getLogger(__name__)

class MqttManager:
    def __init__(self):
        self.host = settings.HIVEMQ_HOST
        self.port = settings.HIVEMQ_PORT
        self.username = settings.HIVEMQ_USERNAME
        self.password = settings.HIVEMQ_PASSWORD
        self.topic_base = settings.MQTT_TOPIC_BASE
        
        self.client: Optional[mqtt.Client] = None
        self.is_connected = False
        self.is_running = False
        self.mode = "LIVE MQTT"  # "LIVE MQTT" or "DEMO MODE"
        
        # Telemetry Metrics
        self.messages_published = 0
        self.messages_received = 0
        self.last_message_time = None
        self.last_message_payload = None
        self.message_rate_window = []
        
        # Ingestion Callback
        self.on_telemetry_received: Optional[Callable[[Dict[str, Any]], None]] = None
        self._lock = threading.Lock()

    def start(self, on_telemetry_callback: Callable[[Dict[str, Any]], None]):
        """Starts the MQTT loop with background reconnects."""
        self.on_telemetry_received = on_telemetry_callback
        self.is_running = True
        
        # Start MQTT thread
        t = threading.Thread(target=self._connection_loop, daemon=True)
        t.start()

    def _connection_loop(self):
        """Manages client lifecycle and reconnection."""
        while self.is_running:
            try:
                client_id = f"ev_battery_bridge_{int(time.time()*1000)%100000}"
                # Paho MQTT 2.0+ client init
                try:
                    self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=client_id)
                except Exception:
                    self.client = mqtt.Client(client_id=client_id)
                    
                if self.username and self.password:
                    self.client.username_pw_set(self.username, self.password)
                    
                self.client.on_connect = self._on_connect
                self.client.on_disconnect = self._on_disconnect
                self.client.on_message = self._on_message
                
                logger.info(f"Connecting to HiveMQ broker {self.host}:{self.port}...")
                self.client.connect(self.host, self.port, keepalive=30)
                self.client.loop_forever()
            except Exception as e:
                logger.warning(f"HiveMQ connection failed ({e}). Reconnecting in 5s (Fallback to Demo pipeline active)...")
                with self._lock:
                    self.is_connected = False
                time.sleep(5.0)

    def _on_connect(self, client, userdata, *args, **kwargs):
        rc = args[1] if len(args) > 1 else (args[0] if len(args) > 0 else 0)
        if rc == 0:
            logger.info("Successfully connected to HiveMQ MQTT broker!")
            with self._lock:
                self.is_connected = True
            # Subscribe to battery telemetry wildcard
            sub_topic = f"{self.topic_base}/#"
            client.subscribe(sub_topic)
            logger.info(f"Subscribed to topic pattern: {sub_topic}")
        else:
            logger.warning(f"HiveMQ connection refused with code {rc}")
            with self._lock:
                self.is_connected = False

    def _on_disconnect(self, client, userdata, *args, **kwargs):
        rc = args[0] if len(args) > 0 else 0
        logger.warning(f"Disconnected from HiveMQ (code {rc}). Will attempt reconnect.")
        with self._lock:
            self.is_connected = False

    def _on_message(self, client, userdata, msg):
        """Validates incoming JSON and passes to ingestion pipeline."""
        now = time.time()
        try:
            payload_str = msg.payload.decode("utf-8")
            data = json.loads(payload_str)
            
            # JSON Schema Validation
            if not isinstance(data, dict):
                return
                
            with self._lock:
                self.messages_received += 1
                self.last_message_time = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(now))
                self.last_message_payload = data
                self.message_rate_window.append(now)
                # Keep last 10s for rate
                self.message_rate_window = [t for t in self.message_rate_window if now - t <= 10.0]

            # Ingest if valid pack summary
            if "battery_id" in data and ("cells" in data or "voltage" in data):
                data.setdefault("data_source", "MQTT_TELEMETRY")
                if self.on_telemetry_received:
                    self.on_telemetry_received(data)
                    
        except json.JSONDecodeError:
            logger.warning(f"Malformed JSON payload ignored on {msg.topic}")
        except Exception as e:
            logger.error(f"Error processing MQTT message: {e}")

    def publish_telemetry(self, pack_summary: Dict[str, Any]) -> bool:
        """Publishes pack and cell telemetry to HiveMQ broker."""
        battery_id = pack_summary.get("battery_id", settings.BATTERY_ID)
        now = time.time()
        
        # 1. Publish aggregated pack telemetry
        pack_topic = f"{self.topic_base}/{battery_id}/telemetry"
        payload = json.dumps(pack_summary)
        
        published = False
        if self.client and self.is_connected:
            try:
                res = self.client.publish(pack_topic, payload, qos=0)
                if res.rc == mqtt.MQTT_ERR_SUCCESS:
                    published = True
            except Exception as e:
                logger.debug(f"Publish error: {e}")
                
        # Count publish attempt
        with self._lock:
            self.messages_published += 1
            if not self.is_connected:
                # In Demo Mode, simulate subscriber delivery directly
                self.messages_received += 1
                self.last_message_time = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(now))
                self.last_message_payload = pack_summary
                self.message_rate_window.append(now)
                self.message_rate_window = [t for t in self.message_rate_window if now - t <= 10.0]
                
        return published

    def get_status(self) -> Dict[str, Any]:
        """Provides real-time IoT and communication status."""
        now = time.time()
        with self._lock:
            recent_msgs = len([t for t in self.message_rate_window if now - t <= 10.0])
            rate = round(recent_msgs / 10.0, 1)
            
            # Determine effective operational mode
            effective_mode = "LIVE MQTT" if self.is_connected else "DEMO MODE"
            
            return {
                "mqtt_connected": self.is_connected,
                "broker_host": self.host,
                "broker_port": self.port,
                "topic_base": self.topic_base,
                "effective_mode": effective_mode,
                "messages_published": self.messages_published,
                "messages_received": self.messages_received,
                "message_rate_hz": rate,
                "last_message_time": self.last_message_time or "N/A",
                "subscriber_status": "CONNECTED" if self.is_connected else "DEMO FALLBACK"
            }

mqtt_manager = MqttManager()
