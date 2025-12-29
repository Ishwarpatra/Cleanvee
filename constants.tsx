import { Building, Checkpoint, CleaningLog, LogStatus, Role, SyncStatus, User } from './types';

// All available buildings
export const ALL_BUILDINGS: Building[] = [
  {
    id: 'bldg-001',
    name: 'Apex Tower HQ',
    address: {
      street: '101 Tech Blvd',
      city: 'San Francisco',
      state: 'CA',
      zip: '94105'
    },
    client_sla_config: {
      required_cleanings_per_day: 3,
      cleaning_window_start: '06:00',
      cleaning_window_end: '20:00'
    }
  },
  {
    id: 'bldg-002',
    name: 'Westside Logistics',
    address: {
      street: '4400 Industrial Pkwy',
      city: 'Oakland',
      state: 'CA',
      zip: '94601'
    },
    client_sla_config: {
      required_cleanings_per_day: 4,
      cleaning_window_start: '05:00',
      cleaning_window_end: '22:00'
    }
  },
  {
    id: 'bldg-003',
    name: 'Downtown Medical Center',
    address: {
      street: '500 Healthcare Blvd',
      city: 'San Jose',
      state: 'CA',
      zip: '95113'
    },
    client_sla_config: {
      required_cleanings_per_day: 6,
      cleaning_window_start: '00:00',
      cleaning_window_end: '23:59'
    }
  },
  {
    id: 'bldg-004',
    name: 'Tech Campus Alpha',
    address: {
      street: '1 Innovation Way',
      city: 'Palo Alto',
      state: 'CA',
      zip: '94301'
    },
    client_sla_config: {
      required_cleanings_per_day: 2,
      cleaning_window_start: '07:00',
      cleaning_window_end: '19:00'
    }
  }
];

// Default building (first in the list)
export const MOCK_BUILDING: Building = ALL_BUILDINGS[0];

export const MOCK_CHECKPOINTS: Checkpoint[] = [
  {
    id: 'cp-001',
    building_id: 'bldg-001',
    location_label: 'Main Lobby Entrance',
    floor_number: 1,
    x_rel: 50,
    y_rel: 85,
    ai_config: {
      model_version: 'lobby_v1.tflite',
      target_labels: ['spill', 'trash']
    },
    current_status: 'clean'
  },
  {
    id: 'cp-002',
    building_id: 'bldg-001',
    location_label: 'Elevator Bank A',
    floor_number: 1,
    x_rel: 20,
    y_rel: 50,
    ai_config: {
      model_version: 'floor_v2.tflite',
      target_labels: ['spill', 'debris']
    },
    current_status: 'attention'
  },
  {
    id: 'cp-003',
    building_id: 'bldg-001',
    location_label: 'Restroom (Men)',
    floor_number: 1,
    x_rel: 80,
    y_rel: 20,
    ai_config: {
      model_version: 'restroom_v3.tflite',
      target_labels: ['overflowing_trash', 'wet_floor']
    },
    current_status: 'dirty'
  },
  {
    id: 'cp-004',
    building_id: 'bldg-001',
    location_label: 'Break Room Kitchen',
    floor_number: 1,
    x_rel: 60,
    y_rel: 30,
    ai_config: {
      model_version: 'kitchen_v1.tflite',
      target_labels: ['spill', 'food_waste']
    },
    current_status: 'unknown'
  }
];

export const MOCK_USERS: User[] = [
  {
    uid: 'u-101',
    email: 'sarah.j@vericlean.com',
    full_name: 'Sarah Jenkins',
    role: Role.CLEANER,
    assigned_building_ids: ['bldg-001']
  },
  {
    uid: 'u-102',
    email: 'mike.t@vericlean.com',
    full_name: 'Mike Torres',
    role: Role.CLEANER,
    assigned_building_ids: ['bldg-001']
  }
];

export const INITIAL_LOGS: CleaningLog[] = [
  {
    id: 'log-001',
    cleaner_id: 'u-101',
    checkpoint_id: 'cp-001',
    building_id: 'bldg-001',
    sync_status: SyncStatus.SYNCED,
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
    proof_of_presence: {
      nfc_tap_timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      nfc_payload_hash: 'abc123hash',
      geo_location: {
        latitude: 37.78193,
        longitude: -122.40476,
        accuracy_meters: 12
      }
    },
    proof_of_quality: {
      photo_storage_path: 'gs://bucket/photo1.jpg',
      ai_inference_timestamp: new Date(Date.now() - 1000 * 60 * 44).toISOString(),
      ai_model_used: 'lobby_v1.tflite',
      inference_time_ms: 145,
      detected_objects: [],
      overall_score: 98,
      passed_validation: true
    },
    verification_result: {
      status: LogStatus.VERIFIED,
      rejection_reason: null
    }
  },
  {
    id: 'log-002',
    cleaner_id: 'u-102',
    checkpoint_id: 'cp-003',
    building_id: 'bldg-001',
    sync_status: SyncStatus.SYNCED,
    created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10 mins ago
    proof_of_presence: {
      nfc_tap_timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      nfc_payload_hash: 'def456hash',
      geo_location: {
        latitude: 37.78185,
        longitude: -122.40460,
        accuracy_meters: 8
      }
    },
    proof_of_quality: {
      photo_storage_path: 'gs://bucket/photo2.jpg',
      ai_inference_timestamp: new Date(Date.now() - 1000 * 60 * 9).toISOString(),
      ai_model_used: 'restroom_v3.tflite',
      inference_time_ms: 180,
      detected_objects: [
        { label: 'overflowing_trash', confidence: 0.89, bounding_box: { x: 10, y: 10, w: 50, h: 50 } }
      ],
      overall_score: 45,
      passed_validation: false
    },
    verification_result: {
      status: LogStatus.FLAGGED,
      rejection_reason: 'LOW_AI_SCORE'
    }
  }
];