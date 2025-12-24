/**
 * Data Privacy Policy Configuration
 * Defines what data can be passed to AI (Gemini) and external systems
 * 
 * MCP ensures AI only sees data explicitly permitted through these policies
 */

// Fields that are safe to pass to AI for analysis
export const AI_SAFE_FIELDS = {
    cleaningLog: [
        'id',
        'checkpoint_id',
        'building_id',
        'sync_status',
        'created_at',
        // Proof of quality fields (no PII)
        'proof_of_quality.overall_score',
        'proof_of_quality.detected_objects',
        'proof_of_quality.ai_model_used',
        'proof_of_quality.inference_time_ms',
        'proof_of_quality.passed_validation',
        // Verification result (no PII)
        'verification_result.status',
        'verification_result.rejection_reason'
    ],

    checkpoint: [
        'id',
        'building_id',
        'location_label',
        'floor_number',
        'x_rel',
        'y_rel',
        'ai_config.model_version',
        'ai_config.target_labels',
        'current_status'
    ],

    building: [
        'id',
        'name',
        // SLA config is safe (no PII)
        'client_sla_config.required_cleanings_per_day',
        'client_sla_config.cleaning_window_start',
        'client_sla_config.cleaning_window_end'
    ],

    alert: [
        'id',
        'building_id',
        'checkpoint_id',
        'severity',
        'status',
        'type',
        'details.score',
        'details.detected_hazards',
        'created_at'
    ]
};

// Fields that contain PII and must NEVER be passed to AI
export const PII_FIELDS = {
    // User/Worker PII
    user: [
        'uid',
        'email',
        'full_name',
        'assigned_building_ids' // Could reveal employment info
    ],

    cleaningLog: [
        'cleaner_id', // Worker identifier
        'proof_of_presence.geo_location', // Worker location tracking
        'proof_of_presence.nfc_tap_timestamp' // Could identify worker schedules
    ],

    building: [
        'address.street',
        'address.city',
        'address.state',
        'address.zip'
    ]
};

// Redaction patterns for text content
export const REDACTION_PATTERNS = [
    // Email addresses
    { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL_REDACTED]' },
    // Phone numbers (various formats)
    { pattern: /\b(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, replacement: '[PHONE_REDACTED]' },
    // SSN
    { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN_REDACTED]' },
    // Employee IDs (assuming format EMP-XXXX or similar)
    { pattern: /\b(EMP|WORKER|USER)-[A-Z0-9]+\b/gi, replacement: '[WORKER_ID_REDACTED]' },
    // UUID patterns that might be user IDs
    { pattern: /\bcleaner[_-]?id[:\s]+[a-f0-9-]{36}\b/gi, replacement: 'cleaner_id: [REDACTED]' }
];

// Configuration for different contexts
export interface PrivacyContext {
    allowGeolocation: boolean;
    allowWorkerIds: boolean;
    allowBuildingAddress: boolean;
    allowTimestamps: boolean;
}

export const PRIVACY_CONTEXTS: Record<string, PrivacyContext> = {
    // For AI analysis - strictest
    ai_analysis: {
        allowGeolocation: false,
        allowWorkerIds: false,
        allowBuildingAddress: false,
        allowTimestamps: true // Timestamps are ok for pattern analysis
    },

    // For ticket creation - needs some location info
    ticketing: {
        allowGeolocation: false, // Still no GPS coords
        allowWorkerIds: false,
        allowBuildingAddress: true, // Need address for on-site support
        allowTimestamps: true
    },

    // For internal logging - can include more
    internal_logging: {
        allowGeolocation: true,
        allowWorkerIds: true,
        allowBuildingAddress: true,
        allowTimestamps: true
    }
};
