// ============================================================
// CLEANVEE — Core Type Definitions
// SOLID Principle: Single Responsibility — types only here
// ============================================================

export enum Role {
  CLEANER = 'cleaner',
  MANAGER = 'manager',
  ADMIN = 'admin'
}

export enum LogStatus {
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  FLAGGED = 'flagged_for_review',
  APPEALED = 'appealed',
  APPEAL_RESOLVED = 'appeal_resolved'
}

export enum SyncStatus {
  SYNCED = 'synced',
  PENDING = 'pending_upload',
  FAILED = 'failed_upload'
}

export enum CheckpointStatus {
  CLEAN = 'clean',
  DIRTY = 'dirty',
  ATTENTION = 'attention',
  UNKNOWN = 'unknown',
  OVERDUE = 'overdue'
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum AlertStatus {
  OPEN = 'open',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved'
}

// ---- User ----
export interface User {
  uid: string;
  email: string;
  full_name: string;
  role: Role;
  assigned_building_ids: string[];
  is_active?: boolean;
  created_at?: string;
  last_login?: string;
}

// ---- Building ----
export interface Building {
  id: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  client_sla_config: {
    required_cleanings_per_day: number;
    cleaning_window_start: string;
    cleaning_window_end: string;
    max_cleaning_interval_hours?: number;
    grace_period_minutes?: number;
  };
  floor_plan_svg_path?: string;
  manager_ids?: string[];
  is_active?: boolean;
  created_at?: string;
}

// ---- Checkpoint ----
export interface Checkpoint {
  id: string;
  building_id: string;
  location_label: string;
  floor_number: number;
  x_rel: number;
  y_rel: number;
  ai_config: {
    model_version: string;
    target_labels: string[];
    quality_threshold?: number;
  };
  current_status?: CheckpointStatus;
  last_cleaned_timestamp?: string;
  is_active?: boolean;
  assigned_cleaner_ids?: string[];
}

// ---- Detected Object ----
export interface DetectedObject {
  label: string;
  confidence: number;
  bounding_box: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

// ---- Geo Location ----
export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy_meters: number;
}

// ---- Cleaning Log ----
export interface CleaningLog {
  id: string;
  cleaner_id: string;
  checkpoint_id: string;
  building_id: string;
  sync_status: SyncStatus;
  proof_of_presence: {
    nfc_tap_timestamp: string;
    nfc_payload_hash: string;
    nfc_nonce?: string;
    geo_location: GeoLocation;
  };
  proof_of_quality?: {
    photo_storage_path: string;
    thumbnail_path?: string;
    ai_inference_timestamp: string;
    ai_model_used: string;
    inference_time_ms: number;
    detected_objects: DetectedObject[];
    overall_score: number;
    passed_validation: boolean;
    image_dimensions?: { width: number; height: number };
  };
  verification_result: {
    status: LogStatus;
    rejection_reason?: string | null;
    reviewed_by?: string;
    reviewed_at?: string;
    appeal_reason?: string;
    appeal_resolved_by?: string;
    appeal_resolved_at?: string;
  };
  created_at: string;
  updated_at?: string;
}

// ---- Shift Report ----
export interface ShiftReport {
  complianceScore: number;
  keyIssues: string[];
  efficiencyInsight: string;
  recommendation: string;
}

// ---- Alert ----
export interface Alert {
  id: string;
  building_id: string;
  checkpoint_id: string;
  type: 'SLA_MISSING_CLEAN' | 'LOW_QUALITY_SCORE' | 'HAZARD_DETECTED' | 'OFFLINE_SYNC_FAILURE';
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  details?: Record<string, unknown>;
  last_cleaned_at?: string;
  created_at: string;
  acknowledged_by?: string;
  resolved_at?: string;
}

// ---- App Settings ----
export interface AppSettings {
  qualityThreshold: number;
  flagYellowAlerts: boolean;
  autoReviewLowScores: boolean;
  requireGps: boolean;
  allowOffline: boolean;
  photoRequired: boolean;
  maxOfflineHours: number;
  emailNotifications: boolean;
  pushNotifications: boolean;
  slaAlerts: boolean;
  digestFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  maxCleaningIntervalHours: number;
  gracePeriodMinutes: number;
  updatedAt?: string;
  updatedBy?: string;
}

// ---- Aggregated Stats ----
export interface AggregatedStats {
  total_logs: number;
  verified_count: number;
  avg_score_sum: number;
  building_id: string;
  date: string;
}

// ---- Validation helpers ----
export function isValidAppSettings(s: Partial<AppSettings>): s is AppSettings {
  return (
    typeof s.qualityThreshold === 'number' &&
    s.qualityThreshold >= 0 &&
    s.qualityThreshold <= 100 &&
    typeof s.maxOfflineHours === 'number' &&
    s.maxOfflineHours > 0 &&
    typeof s.maxCleaningIntervalHours === 'number' &&
    s.maxCleaningIntervalHours > 0 &&
    typeof s.gracePeriodMinutes === 'number' &&
    s.gracePeriodMinutes >= 0
  );
}
