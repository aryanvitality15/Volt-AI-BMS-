/**
 * Volt AI — Neural Battery Lab
 * Production API Client & Persistent Database Connector
 * Handles Bearer token authentication, user batteries, scoped telemetry, and real data history.
 */

export interface OperatorProfile {
  user_id: string;
  name: string;
  email: string;
  role: 'BMS Engineer' | 'Fleet Admin' | 'Read-Only Auditor';
  status: string;
  created_at: string;
  primary_battery_id: string;
  batteries?: BatteryRecord[];
  batteries_count?: number;
}

export interface BatteryRecord {
  battery_id: string;
  owner_user_id?: string;
  battery_name: string;
  chemistry: string;
  rated_capacity: number;
  nominal_voltage: number;
  num_cells: number;
  manufactured_date?: string;
  initial_resistance?: number;
  initial_soh?: number;
  battery_specs?: string;
  battery_config?: string;
  created_at?: string;
}

export interface HistoricalTelemetryPoint {
  id: number;
  timestamp: string;
  battery_id: string;
  pack_voltage: number;
  pack_current: number;
  avg_temperature: number;
  max_temperature: number;
  min_temperature: number;
  soc: number;
  soh: number;
  cycle: number;
  max_cell_imbalance: number;
  mode: string;
  risk_score: number;
  risk_level: string;
  data_source?: string;
}

// Detect API Base URL with support for VITE_API_URL or relative /api
const getApiBase = (): string => {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  // If running on Vite dev server (port 5173), proxy to port 8000
  if (typeof window !== 'undefined' && window.location.port === '5173') {
    return 'http://localhost:8000';
  }
  return '';
};

export const API_BASE = getApiBase();

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = this.loadToken();
  }

  private loadToken(): string | null {
    try {
      return localStorage.getItem('volt_session_token') || sessionStorage.getItem('volt_session_token') || null;
    } catch {
      return null;
    }
  }

  public setToken(token: string, remember: boolean = true) {
    this.token = token;
    try {
      if (remember) {
        localStorage.setItem('volt_session_token', token);
      } else {
        sessionStorage.setItem('volt_session_token', token);
      }
    } catch (e) {
      console.warn('Could not persist session token:', e);
    }
  }

  public clearToken() {
    this.token = null;
    try {
      localStorage.removeItem('volt_session_token');
      sessionStorage.removeItem('volt_session_token');
      localStorage.removeItem('volt_bms_session');
    } catch (e) {
      console.warn('Could not clear session token:', e);
    }
  }

  public getToken(): string | null {
    if (!this.token) {
      this.token = this.loadToken();
    }
    return this.token;
  }

  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    const t = this.getToken();
    if (t) {
      headers['Authorization'] = `Bearer ${t}`;
      headers['X-Session-Token'] = t;
    }
    return headers;
  }

  // --- Auth Endpoints ---

  async register(name: string, email: string, password: string, role: string = 'BMS Engineer') {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ name, email, password, role })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || data.message || 'Registration failed');
    }
    if (data.session_token) {
      this.setToken(data.session_token, true);
    }
    return data;
  }

  async login(email: string, password: string, rememberMe: boolean = true) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ email, password, remember_me: rememberMe })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || data.message || 'Authentication failed');
    }
    if (data.session_token) {
      this.setToken(data.session_token, rememberMe);
    }
    return data;
  }

  async loginWithAdminKey(adminKey: string, rememberMe: boolean = true) {
    const res = await fetch(`${API_BASE}/api/auth/admin-key-login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ admin_key: adminKey.trim() })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || data.message || 'Invalid or revoked Admin Key');
    }
    if (data.session_token) {
      this.setToken(data.session_token, rememberMe);
    }
    return data;
  }

  async getMe(): Promise<{ authenticated: boolean; user: OperatorProfile }> {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      method: 'GET',
      headers: this.getHeaders()
    });
    if (!res.ok) {
      this.clearToken();
      throw new Error('Session invalid or expired');
    }
    return res.json();
  }

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: this.getHeaders()
      });
    } catch {
      // Ignore network errors on logout
    } finally {
      this.clearToken();
    }
  }

  async forgotPassword(email: string): Promise<{ status: string; message: string; reset_token: string }> {
    const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || data.message || 'Password recovery request failed');
    }
    return data;
  }

  async resetPassword(token: string, newPassword: string): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ token, new_password: newPassword })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || data.message || 'Password reset failed');
    }
    return data;
  }

  // --- User Batteries & Telemetry ---

  async getUserBatteries(): Promise<BatteryRecord[]> {
    const res = await fetch(`${API_BASE}/api/user/batteries`, {
      method: 'GET',
      headers: this.getHeaders()
    });
    if (!res.ok) {
      throw new Error('Failed to fetch user battery registry');
    }
    const data = await res.json();
    return data.batteries || [];
  }

  async createBattery(data: {
    battery_id: string;
    battery_name?: string;
    chemistry?: string;
    rated_capacity?: number;
    nominal_voltage?: number;
    num_cells?: number;
    specs?: string;
  }): Promise<BatteryRecord> {
    const res = await fetch(`${API_BASE}/api/user/batteries`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.detail || result.message || 'Failed to register battery');
    }
    return result.battery;
  }

  async getScopedPack(batteryId: string) {
    const res = await fetch(`${API_BASE}/api/battery/scoped/${encodeURIComponent(batteryId)}/pack`, {
      headers: this.getHeaders()
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.pack;
  }

  async getScopedCells(batteryId: string) {
    const res = await fetch(`${API_BASE}/api/battery/scoped/${encodeURIComponent(batteryId)}/cells`, {
      headers: this.getHeaders()
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.cells || [];
  }

  async getScopedHistory(batteryId: string, startDate?: string, endDate?: string, limit: number = 100): Promise<HistoricalTelemetryPoint[]> {
    const params = new URLSearchParams();
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    params.set('limit', limit.toString());

    const res = await fetch(`${API_BASE}/api/battery/scoped/${encodeURIComponent(batteryId)}/history?${params.toString()}`, {
      headers: this.getHeaders()
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.history || [];
  }

  async getScopedAlerts(batteryId: string, status?: string, limit: number = 50) {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    params.set('limit', limit.toString());

    const res = await fetch(`${API_BASE}/api/battery/scoped/${encodeURIComponent(batteryId)}/alerts?${params.toString()}`, {
      headers: this.getHeaders()
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.alerts || [];
  }

  async acknowledgeAlert(alertId: number) {
    const res = await fetch(`${API_BASE}/api/alerts/${alertId}/acknowledge`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    return res.ok;
  }

  async publishTestMqtt(payload: any) {
    const res = await fetch(`${API_BASE}/api/mqtt/publish-test`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    });
    return res.json();
  }
}

export const api = new ApiService();
