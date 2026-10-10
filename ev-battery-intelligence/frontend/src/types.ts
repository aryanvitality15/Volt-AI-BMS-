export interface CellTelemetry {
  cell_id: number;
  voltage: number;
  current: number;
  temp_c: number;
  temperature?: number;
  soc: number;
  internal_resistance_mohm: number;
  internal_resistance?: number;
  capacity_ah?: number;
  capacity?: number;
  health_status?: string;
}

export interface PackTelemetry {
  timestamp: string;
  voltage: number;
  pack_voltage?: number;
  current: number;
  pack_current?: number;
  c_rate: number;
  soc: number;
  cycle: number;
  ambient_temp?: number;
  mode: string;
  avg_temp: number;
  avg_temperature?: number;
  max_temp?: number;
  max_temperature?: number;
  min_temp?: number;
  min_temperature?: number;
  temp_rise?: number;
  max_imbalance: number;
  voltage_sag?: number;
  resistance_growth?: number;
  capacity_fade?: number;
}

export interface AIRUL {
  rul_cycles: number;
  rul_uncertainty: number;
  rul_display: string;
  soh_in_100_cycles: number;
  estimated_eol_cycle: number;
}

export interface AIEngineState {
  soh: number;
  is_anomaly: boolean;
  anomaly_score: number;
  fault_class: string;
  fault_confidence: number;
  rul: AIRUL;
}

export interface RiskState {
  score: number;
  status: string;
  level: string;
  contributions_pct: {
    temperature: number;
    resistance: number;
    imbalance: number;
    voltage: number;
    cycle: number;
    soh: number;
    anomaly: number;
  };
}

export interface RCAState {
  probable_cause: string;
  evidence: string[];
  affected_cell: number | null;
  confidence: number;
}

export interface XAIFactor {
  name?: string;
  factor?: string;
  percentage?: number;
  contribution?: number;
  impact?: string;
  direction?: string;
}

export interface RecommendationState {
  action?: string;
  primary?: string;
  actions?: string[];
  urgency?: string;
  action_level?: string;
  rationale?: string;
  advisory_note?: string;
}

export interface SelfLearningMetrics {
  soh_r2: number;
  soh_mae: number;
  soh_rmse: number;
  fault_accuracy: number;
  fault_f1: number;
  anomaly_accuracy: number;
  total_clean_samples_used: number;
  model_version: string;
  last_retrain: string;
  training_duration_sec: number;
  learning_rate: number;
  feature_importance: Array<{ name: string; importance: number }>;
  convergence_history: Array<{ epoch: number; r2: number; mae: number; loss: number }>;
  pipeline_stats?: {
    total_received: number;
    clean_accepted: number;
    noise_rejected: number;
    acceptance_rate_pct: number;
    buffer_count: number;
  };
  is_retraining?: boolean;
}

export interface BatteryState {
  timestamp: string;
  pack: PackTelemetry;
  cells: CellTelemetry[];
  ai: AIEngineState;
  self_learning?: SelfLearningMetrics;
  risk: RiskState;
  rca: RCAState;
  xai: {
    method?: string;
    methodology?: string;
    title?: string;
    factors: XAIFactor[];
  };
  recommendation: RecommendationState;
}

export interface AlertItem {
  id: number;
  timestamp?: string;
  ts?: string;
  battery_id?: string;
  cell_id?: number | null;
  level?: 'NORMAL' | 'INFO' | 'WARNING' | 'CRITICAL';
  severity?: 'NORMAL' | 'INFO' | 'WARNING' | 'CRITICAL';
  title?: string;
  type?: string;
  description?: string;
  message?: string;
  evidence?: string;
  recommended_action?: string;
  observed_value?: string;
  expected_range?: string;
  probable_cause?: string;
  metric_value?: number;
  threshold_value?: number;
  status: 'ACTIVE' | 'RESOLVED';
  resolved_at?: string | null;
}
