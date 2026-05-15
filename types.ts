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

// Fix #81: standardised rejection reasons for consistent analytics
export enum RejectionReason {
  QUALITY_TOO_LOW = 'QUALITY_TOO_LOW',
  HAZARD_DETECTED = 'HAZARD_DETECTED',
  INCOMPLETE_PHOTO = 'INCOMPLETE_PHOTO',
  INVALID_LOCATION = 'INVALID_LOCATION',
  DUPLICATE_LOG = 'DUPLICATE_LOG',
  OTHER = 'OTHER'
}

// Fix #82: standardised appeal reasons for aggregation
export enum AppealReason {
  PHOTO_QUALITY_ISSUE = 'PHOTO_QUALITY_ISSUE',
  GPS_INACCURACY = 'GPS_INACCURACY',
  AI_MISCLASSIFICATION = 'AI_MISCLASSIFICATION',
  EQUIPMENT_FAILURE = 'EQUIPMENT_FAILURE',
  OTHER = 'OTHER'
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
  // Fix #88: audit trail for compliance
  created_by?: string;   // uid of admin who created this user
  updated_at?: string;
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
  // Fix #87: required field — building must always have a creation timestamp
  created_at: string;
  // Fix #90: audit trail
  created_by?: string;
  updated_at?: string;
  // Fix #65: bump this when SLA config changes to invalidate cached stats
  config_version?: number;
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
  // Fix #62: use only Timestamp string; last_cleaned_timestamp (Firestore Timestamp) lives server-side only
  last_cleaned_at?: string;  // ISO string — kept for UI display; set by Cloud Function
  is_active?: boolean;
  assigned_cleaner_ids?: string[];
  // Fix #63: status transition timestamps for audit trail
  became_clean_at?: string;
  became_overdue_at?: string;
  // Fix #89: audit trail
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  // Fix #52: optional override of global SLA threshold (hours)
  sla_max_gap_hours?: number;
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
    // Fix #81: use enum for consistent analytics
    rejection_reason?: RejectionReason | null;
    reviewed_by?: string;
    reviewed_at?: string;
    // Fix #82: structured appeal reason
    appeal_reason?: AppealReason;
    appeal_resolved_by?: string;
    appeal_resolved_at?: string;
    // Fix #84: reason when appeal is denied
    appeal_resolution_reason?: string;
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
