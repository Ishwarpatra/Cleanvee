/**
 * ServiceNow Connector
 * Integrates with ServiceNow REST API for automatic incident creation
 */

import {
    TicketPriority,
    type CreateTicketRequest,
    type TicketResponse,
    type ServiceNowConfig,
    type ServiceNowIncident,
    type TicketingConnector
} from './types';

// Map VeriClean priority to ServiceNow urgency/impact (1=high, 3=low)
const PRIORITY_TO_URGENCY: Record<TicketPriority, number> = {
    [TicketPriority.CRITICAL]: 1,
    [TicketPriority.HIGH]: 2,
    [TicketPriority.MEDIUM]: 2,
    [TicketPriority.LOW]: 3
};

const PRIORITY_TO_IMPACT: Record<TicketPriority, number> = {
    [TicketPriority.CRITICAL]: 1,
    [TicketPriority.HIGH]: 2,
    [TicketPriority.MEDIUM]: 2,
    [TicketPriority.LOW]: 3
};

export class ServiceNowConnector implements TicketingConnector {
    private config: ServiceNowConfig;
    private mockMode: boolean;

    constructor(config?: Partial<ServiceNowConfig>) {
        // Load from environment or use provided config
        this.config = {
            instance: config?.instance || process.env.SERVICENOW_INSTANCE || '',
            username: config?.username || process.env.SERVICENOW_USERNAME || '',
            password: config?.password || process.env.SERVICENOW_PASSWORD || '',
            enabled: config?.enabled ?? Boolean(process.env.SERVICENOW_INSTANCE)
        };

        // If not fully configured, run in mock mode
        this.mockMode = !this.config.instance || !this.config.username || !this.config.password;

        if (this.mockMode) {
            console.log('[ServiceNow] Running in MOCK mode - configure SERVICENOW_* env vars for real integration');
        }
    }

    getSystemName(): 'servicenow' {
        return 'servicenow';
    }

    isConfigured(): boolean {
        return !this.mockMode;
    }

    /**
     * Create an incident in ServiceNow
     */
    async createTicket(request: CreateTicketRequest): Promise<TicketResponse> {
        const incident = this.buildIncident(request);

        if (this.mockMode) {
            return this.mockCreateIncident(incident, request);
        }

        return this.realCreateIncident(incident);
    }

    /**
     * Build ServiceNow incident from VeriClean request
     */
    private buildIncident(request: CreateTicketRequest): ServiceNowIncident {
        const issuesList = request.metadata.detectedIssues?.join(', ') || 'None specified';

        return {
            short_description: request.title,
            description: `${request.description}

=== VeriClean Alert Details ===
Alert Type: ${request.alertType}
Building ID: ${request.metadata.buildingId}
Location: ${request.metadata.location || 'Checkpoint ' + request.metadata.checkpointId}
Quality Score: ${request.metadata.score ?? 'N/A'}
Detected Issues: ${issuesList}
Alert Reference: ${request.metadata.alertId}`,
            urgency: PRIORITY_TO_URGENCY[request.priority],
            impact: PRIORITY_TO_IMPACT[request.priority],
            category: 'Facilities',
            subcategory: 'Cleaning',
            u_building_id: request.metadata.buildingId,
            u_checkpoint_id: request.metadata.checkpointId
        };
    }

    /**
     * Mock incident creation for testing
     */
    private async mockCreateIncident(
        incident: ServiceNowIncident,
        _request: CreateTicketRequest
    ): Promise<TicketResponse> {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 100));

        const mockTicketId = `INC${Date.now().toString().slice(-10)}`;

        console.log('[ServiceNow MOCK] Would create incident:', {
            ticketId: mockTicketId,
            ...incident
        });

        return {
            success: true,
            ticketId: mockTicketId,
            ticketUrl: `https://mock-instance.service-now.com/nav_to.do?uri=incident.do?sys_id=${mockTicketId}`,
            externalSystem: 'servicenow'
        };
    }

    /**
     * Real ServiceNow API call
     */
    private async realCreateIncident(incident: ServiceNowIncident): Promise<TicketResponse> {
        const url = `https://${this.config.instance}/api/now/table/incident`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': 'Basic ' + btoa(`${this.config.username}:${this.config.password}`)
                },
                body: JSON.stringify(incident)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`ServiceNow API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();

            return {
                success: true,
                ticketId: data.result.number,
                ticketUrl: `https://${this.config.instance}/nav_to.do?uri=incident.do?sys_id=${data.result.sys_id}`,
                externalSystem: 'servicenow'
            };
        } catch (error) {
            console.error('[ServiceNow] Error creating incident:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                externalSystem: 'servicenow'
            };
        }
    }
}

// Singleton instance
let instance: ServiceNowConnector | null = null;

export function getServiceNowConnector(): ServiceNowConnector {
    if (!instance) {
        instance = new ServiceNowConnector();
    }
    return instance;
}
