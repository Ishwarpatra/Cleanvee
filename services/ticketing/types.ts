/**
 * Ticketing System Types
 * Shared interfaces for ServiceNow and Jira integration
 */

// Severity levels matching VeriClean's alert system
export enum TicketPriority {
    CRITICAL = 1,
    HIGH = 2,
    MEDIUM = 3,
    LOW = 4
}

export enum TicketStatus {
    NEW = 'new',
    IN_PROGRESS = 'in_progress',
    PENDING = 'pending',
    RESOLVED = 'resolved',
    CLOSED = 'closed'
}

export enum AlertType {
    SAFETY_HAZARD = 'SAFETY_HAZARD',
    QUALITY_FAILURE = 'QUALITY_FAILURE',
    SLA_BREACH = 'SLA_BREACH'
}

// Unified ticket creation request
export interface CreateTicketRequest {
    title: string;
    description: string;
    priority: TicketPriority;
    alertType: AlertType;
    metadata: {
        buildingId: string;
        checkpointId: string;
        alertId: string;
        location?: string;
        detectedIssues?: string[];
        score?: number;
    };
}

// Unified ticket response
export interface TicketResponse {
    success: boolean;
    ticketId?: string;
    ticketUrl?: string;
    externalSystem: 'servicenow' | 'jira';
    error?: string;
}

// ServiceNow-specific types
export interface ServiceNowConfig {
    instance: string;
    username: string;
    password: string;
    enabled: boolean;
}

export interface ServiceNowIncident {
    short_description: string;
    description: string;
    urgency: number;
    impact: number;
    category: string;
    subcategory: string;
    caller_id?: string;
    assignment_group?: string;
    u_building_id?: string;
    u_checkpoint_id?: string;
}

// Jira-specific types
export interface JiraConfig {
    host: string;
    email: string;
    apiToken: string;
    projectKey: string;
    enabled: boolean;
}

export interface JiraIssue {
    fields: {
        project: { key: string };
        summary: string;
        description: {
            type: 'doc';
            version: 1;
            content: Array<{
                type: 'paragraph';
                content: Array<{ type: 'text'; text: string }>;
            }>;
        };
        issuetype: { name: string };
        priority: { name: string };
        labels?: string[];
        customfield_building_id?: string;
        customfield_checkpoint_id?: string;
    };
}

// Connector interface for dependency injection
export interface TicketingConnector {
    createTicket(request: CreateTicketRequest): Promise<TicketResponse>;
    isConfigured(): boolean;
    getSystemName(): 'servicenow' | 'jira';
}
