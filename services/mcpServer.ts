/**
 * MCP Server - Model Context Protocol Implementation
 * 
 * This module provides the MCP interface for VeriClean, enabling:
 * 1. Automatic ticket creation in ServiceNow/Jira
 * 2. PII-safe data access for AI (Gemini)
 * 
 * MCP ensures that:
 * - AI only sees data explicitly passed through tools
 * - PII is filtered before any external system access
 * - Client ticketing systems can be integrated without custom code
 */

import {
    getServiceNowConnector,
    getJiraConnector,
    type CreateTicketRequest,
    type TicketResponse,
    TicketPriority,
    AlertType
} from './ticketing';

import {
    sanitizeLogForAI,
    sanitizeCheckpointForAI,
    sanitizeAlertForAI,
    sanitizeLogsForAI,
    sanitizeCheckpointsForAI,
    generatePrivacyAuditLog
} from './privacy';

import type { CleaningLog, Checkpoint } from '../types';

// ============================================
// MCP Tool Definitions
// ============================================

/**
 * MCP Tool: create_servicenow_ticket
 * Creates an incident in ServiceNow from a VeriClean alert
 */
export async function mcpCreateServiceNowTicket(
    alertId: string,
    title: string,
    description: string,
    priority: TicketPriority,
    alertType: AlertType,
    buildingId: string,
    checkpointId: string,
    location?: string,
    detectedIssues?: string[],
    score?: number
): Promise<TicketResponse> {
    const connector = getServiceNowConnector();

    const request: CreateTicketRequest = {
        title,
        description,
        priority,
        alertType,
        metadata: {
            alertId,
            buildingId,
            checkpointId,
            location,
            detectedIssues,
            score
        }
    };

    console.log(`[MCP] Creating ServiceNow ticket for alert ${alertId}`);
    return connector.createTicket(request);
}

/**
 * MCP Tool: create_jira_ticket
 * Creates an issue in Jira from a VeriClean alert
 */
export async function mcpCreateJiraTicket(
    alertId: string,
    title: string,
    description: string,
    priority: TicketPriority,
    alertType: AlertType,
    buildingId: string,
    checkpointId: string,
    location?: string,
    detectedIssues?: string[],
    score?: number
): Promise<TicketResponse> {
    const connector = getJiraConnector();

    const request: CreateTicketRequest = {
        title,
        description,
        priority,
        alertType,
        metadata: {
            alertId,
            buildingId,
            checkpointId,
            location,
            detectedIssues,
            score
        }
    };

    console.log(`[MCP] Creating Jira ticket for alert ${alertId}`);
    return connector.createTicket(request);
}

/**
 * MCP Tool: create_ticket (auto-routes to configured system)
 * Automatically creates a ticket in whichever system is configured
 */
export async function mcpCreateTicket(
    alertId: string,
    title: string,
    description: string,
    priority: TicketPriority,
    alertType: AlertType,
    buildingId: string,
    checkpointId: string,
    location?: string,
    detectedIssues?: string[],
    score?: number
): Promise<TicketResponse[]> {
    const results: TicketResponse[] = [];

    const serviceNow = getServiceNowConnector();
    const jira = getJiraConnector();

    const request: CreateTicketRequest = {
        title,
        description,
        priority,
        alertType,
        metadata: {
            alertId,
            buildingId,
            checkpointId,
            location,
            detectedIssues,
            score
        }
    };

    // Create in all configured systems
    if (serviceNow.isConfigured()) {
        results.push(await serviceNow.createTicket(request));
    }

    if (jira.isConfigured()) {
        results.push(await jira.createTicket(request));
    }

    // If nothing is configured, use mock mode on ServiceNow
    if (results.length === 0) {
        console.log('[MCP] No ticketing system configured, using ServiceNow mock');
        results.push(await serviceNow.createTicket(request));
    }

    return results;
}

/**
 * MCP Tool: get_alert_summary
 * Returns sanitized alert data for AI processing (PII filtered)
 */
export function mcpGetAlertSummary(alert: Record<string, any>): {
    sanitizedAlert: Record<string, any>;
    privacyAudit: ReturnType<typeof generatePrivacyAuditLog>;
} {
    const sanitizedAlert = sanitizeAlertForAI(alert);
    const privacyAudit = generatePrivacyAuditLog(alert, sanitizedAlert, 'ai_analysis');

    console.log(`[MCP] Alert sanitized for AI. Fields removed: ${privacyAudit.fieldsRemoved.length}`);

    return { sanitizedAlert, privacyAudit };
}

/**
 * MCP Tool: get_cleaning_logs_for_ai
 * Returns sanitized cleaning logs for AI analysis
 * Worker PII is stripped before passing to Gemini
 */
export function mcpGetCleaningLogsForAI(logs: CleaningLog[]): {
    sanitizedLogs: Partial<CleaningLog>[];
    totalPiiFieldsRemoved: number;
} {
    const sanitizedLogs = sanitizeLogsForAI(logs);

    // Calculate total PII protection
    let totalRemoved = 0;
    logs.forEach((log, i) => {
        const audit = generatePrivacyAuditLog(log, sanitizedLogs[i], 'ai_analysis');
        totalRemoved += audit.fieldsRemoved.length;
    });

    console.log(`[MCP] ${logs.length} logs sanitized. Total PII fields removed: ${totalRemoved}`);

    return { sanitizedLogs, totalPiiFieldsRemoved: totalRemoved };
}

/**
 * MCP Tool: get_checkpoints_for_ai
 * Returns sanitized checkpoint data for AI analysis
 */
export function mcpGetCheckpointsForAI(checkpoints: Checkpoint[]): Partial<Checkpoint>[] {
    return sanitizeCheckpointsForAI(checkpoints);
}

// ============================================
// MCP Server Configuration
// ============================================

export interface MCPToolDefinition {
    name: string;
    description: string;
    parameters: Record<string, { type: string; description: string; required?: boolean }>;
}

/**
 * Get all available MCP tool definitions
 * This can be used by MCP clients to discover available tools
 */
export function getMCPToolDefinitions(): MCPToolDefinition[] {
    return [
        {
            name: 'create_servicenow_ticket',
            description: 'Creates an incident in ServiceNow from a VeriClean alert',
            parameters: {
                alertId: { type: 'string', description: 'VeriClean alert ID', required: true },
                title: { type: 'string', description: 'Ticket title/short description', required: true },
                description: { type: 'string', description: 'Detailed description (PII-safe)', required: true },
                priority: { type: 'number', description: 'Priority 1-4 (1=critical)', required: true },
                alertType: { type: 'string', description: 'SAFETY_HAZARD | QUALITY_FAILURE | SLA_BREACH', required: true },
                buildingId: { type: 'string', description: 'Building ID', required: true },
                checkpointId: { type: 'string', description: 'Checkpoint ID', required: true },
                location: { type: 'string', description: 'Human-readable location', required: false },
                detectedIssues: { type: 'array', description: 'List of detected issues', required: false },
                score: { type: 'number', description: 'Quality score 0-100', required: false }
            }
        },
        {
            name: 'create_jira_ticket',
            description: 'Creates an issue in Jira from a VeriClean alert',
            parameters: {
                alertId: { type: 'string', description: 'VeriClean alert ID', required: true },
                title: { type: 'string', description: 'Issue summary', required: true },
                description: { type: 'string', description: 'Detailed description (PII-safe)', required: true },
                priority: { type: 'number', description: 'Priority 1-4 (1=critical)', required: true },
                alertType: { type: 'string', description: 'SAFETY_HAZARD | QUALITY_FAILURE | SLA_BREACH', required: true },
                buildingId: { type: 'string', description: 'Building ID', required: true },
                checkpointId: { type: 'string', description: 'Checkpoint ID', required: true }
            }
        },
        {
            name: 'create_ticket',
            description: 'Creates a ticket in all configured ticketing systems',
            parameters: {
                alertId: { type: 'string', description: 'VeriClean alert ID', required: true },
                title: { type: 'string', description: 'Ticket title', required: true },
                description: { type: 'string', description: 'Description (PII-safe)', required: true },
                priority: { type: 'number', description: 'Priority 1-4', required: true },
                alertType: { type: 'string', description: 'Alert type', required: true },
                buildingId: { type: 'string', description: 'Building ID', required: true },
                checkpointId: { type: 'string', description: 'Checkpoint ID', required: true }
            }
        },
        {
            name: 'get_alert_summary',
            description: 'Returns PII-sanitized alert data safe for AI processing',
            parameters: {
                alert: { type: 'object', description: 'Raw alert object', required: true }
            }
        },
        {
            name: 'get_cleaning_logs_for_ai',
            description: 'Returns PII-sanitized cleaning logs for AI analysis. Worker identifiers are stripped.',
            parameters: {
                logs: { type: 'array', description: 'Array of cleaning log objects', required: true }
            }
        },
        {
            name: 'get_checkpoints_for_ai',
            description: 'Returns sanitized checkpoint data for AI analysis',
            parameters: {
                checkpoints: { type: 'array', description: 'Array of checkpoint objects', required: true }
            }
        }
    ];
}

/**
 * Log MCP tool invocation for audit trail
 */
export function logMCPInvocation(
    toolName: string,
    params: Record<string, any>,
    result: any
): void {
    console.log(`[MCP Audit] Tool: ${toolName}`, {
        timestamp: new Date().toISOString(),
        parametersProvided: Object.keys(params),
        success: result?.success !== false
    });
}
