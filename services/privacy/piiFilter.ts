/**
 * PII Filter Service
 * Sanitizes data before passing to AI (Gemini) or external systems
 * 
 * Key principle: AI only sees what we explicitly allow through MCP tools
 */

import {
    AI_SAFE_FIELDS,
    PII_FIELDS,
    REDACTION_PATTERNS,
    PRIVACY_CONTEXTS,
    type PrivacyContext
} from './dataPolicy';
import type { CleaningLog, Checkpoint, Building, User } from '../../types';

/**
 * Recursively picks only specified paths from an object
 */
function pickPaths<T extends Record<string, any>>(obj: T, paths: string[]): Partial<T> {
    const result: Record<string, any> = {};

    for (const path of paths) {
        const parts = path.split('.');
        let source: any = obj;
        let target: any = result;

        for (let i = 0; i < parts.length; i++) {
            const key = parts[i];

            if (source === undefined || source === null) break;

            if (i === parts.length - 1) {
                // Last part - copy the value
                if (source[key] !== undefined) {
                    target[key] = source[key];
                }
            } else {
                // Intermediate part - create nested object if needed
                if (source[key] !== undefined) {
                    target[key] = target[key] || {};
                    source = source[key];
                    target = target[key];
                }
            }
        }
    }

    return result as Partial<T>;
}

/**
 * Recursively removes specified paths from an object (mutates a clone)
 */
function omitPaths<T extends Record<string, any>>(obj: T, paths: string[]): T {
    const clone = JSON.parse(JSON.stringify(obj)) as T;

    for (const path of paths) {
        const parts = path.split('.');
        let current: any = clone;

        for (let i = 0; i < parts.length - 1; i++) {
            if (current === undefined || current === null) break;
            current = current[parts[i]];
        }

        if (current !== undefined && current !== null) {
            delete current[parts[parts.length - 1]];
        }
    }

    return clone;
}

/**
 * Applies redaction patterns to text content
 */
export function redactText(text: string): string {
    let result = text;

    for (const { pattern, replacement } of REDACTION_PATTERNS) {
        result = result.replace(pattern, replacement);
    }

    return result;
}

/**
 * Sanitize a CleaningLog for AI processing
 * Removes worker IDs, geolocation, and other PII
 */
export function sanitizeLogForAI(log: CleaningLog): Partial<CleaningLog> {
    // Pick only AI-safe fields
    const sanitized = pickPaths(log, AI_SAFE_FIELDS.cleaningLog);

    // Additional text redaction in case of embedded PII
    if (sanitized.verification_result?.rejection_reason) {
        sanitized.verification_result.rejection_reason = redactText(
            sanitized.verification_result.rejection_reason
        );
    }

    return sanitized;
}

/**
 * Sanitize a Checkpoint for AI processing
 */
export function sanitizeCheckpointForAI(checkpoint: Checkpoint): Partial<Checkpoint> {
    return pickPaths(checkpoint, AI_SAFE_FIELDS.checkpoint);
}

/**
 * Sanitize a Building for AI processing
 * Removes physical address
 */
export function sanitizeBuildingForAI(building: Building): Partial<Building> {
    return pickPaths(building, AI_SAFE_FIELDS.building);
}

/**
 * Sanitize an alert object for AI processing
 */
export function sanitizeAlertForAI(alert: Record<string, any>): Record<string, any> {
    const sanitized = pickPaths(alert, AI_SAFE_FIELDS.alert);

    // Redact any text fields
    if (sanitized.details && typeof sanitized.details === 'object') {
        for (const key of Object.keys(sanitized.details)) {
            if (typeof sanitized.details[key] === 'string') {
                sanitized.details[key] = redactText(sanitized.details[key]);
            }
        }
    }

    return sanitized;
}

/**
 * Sanitize data based on context (AI, ticketing, internal)
 */
export function sanitizeForContext<T extends Record<string, any>>(
    data: T,
    entityType: 'cleaningLog' | 'checkpoint' | 'building' | 'alert',
    contextName: keyof typeof PRIVACY_CONTEXTS = 'ai_analysis'
): Partial<T> {
    const context = PRIVACY_CONTEXTS[contextName];
    const safeFields = AI_SAFE_FIELDS[entityType] || [];

    let sanitized = pickPaths(data, safeFields);

    // Add back context-allowed fields
    if (context.allowTimestamps && (data as any).created_at) {
        (sanitized as any).created_at = (data as any).created_at;
    }

    return sanitized;
}

/**
 * Batch sanitize multiple logs for AI
 */
export function sanitizeLogsForAI(logs: CleaningLog[]): Partial<CleaningLog>[] {
    return logs.map(sanitizeLogForAI);
}

/**
 * Batch sanitize multiple checkpoints for AI
 */
export function sanitizeCheckpointsForAI(checkpoints: Checkpoint[]): Partial<Checkpoint>[] {
    return checkpoints.map(sanitizeCheckpointForAI);
}

/**
 * Generate a privacy audit log entry
 * Tracks what data was filtered before AI access
 */
export function generatePrivacyAuditLog(
    originalData: Record<string, any>,
    sanitizedData: Record<string, any>,
    context: string
): {
    timestamp: string;
    context: string;
    fieldsRemoved: string[];
    piiProtected: boolean;
} {
    const originalKeys = getAllPaths(originalData);
    const sanitizedKeys = getAllPaths(sanitizedData);
    const fieldsRemoved = originalKeys.filter(k => !sanitizedKeys.includes(k));

    return {
        timestamp: new Date().toISOString(),
        context,
        fieldsRemoved,
        piiProtected: fieldsRemoved.length > 0
    };
}

/**
 * Helper to get all paths in an object
 */
function getAllPaths(obj: Record<string, any>, prefix = ''): string[] {
    const paths: string[] = [];

    for (const key of Object.keys(obj)) {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        paths.push(fullPath);

        if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
            paths.push(...getAllPaths(obj[key], fullPath));
        }
    }

    return paths;
}
