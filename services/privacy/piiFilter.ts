/**
 * PII Filter Service
 * Sanitizes data before passing to AI (Gemini) or external systems
 *
 * Key principle: AI only sees what we explicitly allow through MCP tools
 */

import {
    AI_SAFE_FIELDS,
    REDACTION_PATTERNS,
    PRIVACY_CONTEXTS,
} from './dataPolicy';
import type { CleaningLog, Checkpoint, Building, Alert } from '../../types';

type UnknownRecord = Record<string, unknown>;

/**
 * Recursively picks only specified paths from an object.
 */
function pickPaths<T extends UnknownRecord>(obj: T, paths: string[]): Partial<T> {
    const result: UnknownRecord = {};

    for (const path of paths) {
        const parts = path.split('.');
        let source: unknown = obj;
        let target: UnknownRecord = result;

        for (let i = 0; i < parts.length; i += 1) {
            if (!isRecord(source)) break;

            const key = parts[i];
            if (i === parts.length - 1) {
                if (source[key] !== undefined) target[key] = source[key];
                break;
            }

            if (source[key] === undefined) break;
            const child = target[key];
            if (!isRecord(child)) target[key] = {};
            source = source[key];
            target = target[key] as UnknownRecord;
        }
    }

    return result as Partial<T>;
}

function isRecord(value: unknown): value is UnknownRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Applies redaction patterns to text content.
 */
export function redactText(text: string): string {
    return REDACTION_PATTERNS.reduce(
        (result, { pattern, replacement }) => result.replace(pattern, replacement),
        text,
    );
}

/**
 * Sanitize a CleaningLog for AI processing.
 * Removes worker IDs, geolocation, and other PII.
 */
export function sanitizeLogForAI(log: CleaningLog): Partial<CleaningLog> {
    const sanitized = pickPaths(log, AI_SAFE_FIELDS.cleaningLog);

    if (sanitized.verification_result?.rejection_reason) {
        sanitized.verification_result.rejection_reason = redactText(
            sanitized.verification_result.rejection_reason,
        );
    }

    return sanitized;
}

/** Sanitize a Checkpoint for AI processing. */
export function sanitizeCheckpointForAI(checkpoint: Checkpoint): Partial<Checkpoint> {
    return pickPaths(checkpoint, AI_SAFE_FIELDS.checkpoint);
}

/** Sanitize a Building for AI processing. */
export function sanitizeBuildingForAI(building: Building): Partial<Building> {
    return pickPaths(building, AI_SAFE_FIELDS.building);
}

/** Sanitize an alert object for AI processing. */
export function sanitizeAlertForAI(alert: Alert): Partial<Alert> {
    const sanitized = pickPaths(alert, AI_SAFE_FIELDS.alert);

    if (isRecord(sanitized.details)) {
        for (const key of Object.keys(sanitized.details)) {
            const value = sanitized.details[key];
            if (typeof value === 'string') sanitized.details[key] = redactText(value);
        }
    }

    return sanitized;
}

/** Sanitize data based on context (AI, ticketing, internal). */
export function sanitizeForContext<T extends UnknownRecord>(
    data: T,
    entityType: 'cleaningLog' | 'checkpoint' | 'building' | 'alert',
    contextName: keyof typeof PRIVACY_CONTEXTS = 'ai_analysis',
): Partial<T> {
    const context = PRIVACY_CONTEXTS[contextName];
    const safeFields = AI_SAFE_FIELDS[entityType] || [];
    const sanitized = pickPaths(data, safeFields);
    const timestamp = data['created_at'];

    if (context.allowTimestamps && timestamp !== undefined) {
        (sanitized as UnknownRecord)['created_at'] = timestamp;
    }

    return sanitized;
}

/** Batch sanitize multiple logs for AI. */
export function sanitizeLogsForAI(logs: CleaningLog[]): Partial<CleaningLog>[] {
    return logs.map(sanitizeLogForAI);
}

/** Batch sanitize multiple checkpoints for AI. */
export function sanitizeCheckpointsForAI(checkpoints: Checkpoint[]): Partial<Checkpoint>[] {
    return checkpoints.map(sanitizeCheckpointForAI);
}

/** Generate a privacy audit log entry. */
export function generatePrivacyAuditLog(
    originalData: UnknownRecord,
    sanitizedData: UnknownRecord,
    context: string,
): {
    timestamp: string;
    context: string;
    fieldsRemoved: string[];
    piiProtected: boolean;
} {
    const originalKeys = getAllPaths(originalData);
    const sanitizedKeys = getAllPaths(sanitizedData);
    const fieldsRemoved = originalKeys.filter((key) => !sanitizedKeys.includes(key));

    return {
        timestamp: new Date().toISOString(),
        context,
        fieldsRemoved,
        piiProtected: fieldsRemoved.length > 0,
    };
}

function getAllPaths(obj: UnknownRecord, prefix = ''): string[] {
    const paths: string[] = [];

    for (const key of Object.keys(obj)) {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        paths.push(fullPath);

        if (isRecord(obj[key])) paths.push(...getAllPaths(obj[key], fullPath));
    }

    return paths;
}
