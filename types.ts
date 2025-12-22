export enum Role {
  CLEANER = 'cleaner',
  MANAGER = 'manager',
  ADMIN = 'admin'
}

export enum LogStatus {
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  FLAGGED = 'flagged_for_review'
}

export enum SyncStatus {
  SYNCED = 'synced',
  PENDING = 'pending_upload'
}

export interface User {
  uid: string;
  email: string;
  full_name: string;
  role: Role;
  assigned_building_ids: string[];
}

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
  };
}

export interface Checkpoint {
  id: string;
  building_id: string;
  location_label: string;
  floor_number: number;
  x_rel: number; // For visualization on floor plan (0-100)
  y_rel: number; // For visualization on floor plan (0-100)
  ai_config: {
    model_version: string;
    target_labels: string[];
  };
  current_status?: 'clean' | 'dirty' | 'attention' | 'unknown'; // Derived UI state
}

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

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy_meters: number;
}

export interface CleaningLog {
  id: string;
  cleaner_id: string;
  checkpoint_id: string;
  building_id: string;
  sync_status: SyncStatus;
  proof_of_presence: {
    nfc_tap_timestamp: string; // ISO 8601
    nfc_payload_hash: string;
    geo_location: GeoLocation;
  };
  proof_of_quality?: {
    photo_storage_path: string;
    ai_inference_timestamp: string;
    ai_model_used: string;
    inference_time_ms: number;
    detected_objects: DetectedObject[];
    overall_score: number; // 0-100
    passed_validation: boolean;
  };
  verification_result: {
    status: LogStatus;
    rejection_reason?: string | null;
  };
  created_at: string;
}

export interface ShiftReport {
  complianceScore: number;
  keyIssues: string[];
  efficiencyInsight: string;
  recommendation: string;
}