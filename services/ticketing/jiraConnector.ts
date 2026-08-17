/**
 * Jira Connector
 * Integrates with Jira REST API for automatic issue creation
 * Supports both Jira Cloud and Jira Server
 */

import {
    TicketPriority,
    AlertType,
    type CreateTicketRequest,
    type TicketResponse,
    type JiraConfig,
    type JiraIssue,
    type TicketingConnector
} from './types';

// Map Cleanvee priority to Jira priority names
const PRIORITY_TO_JIRA: Record<TicketPriority, string> = {
    [TicketPriority.CRITICAL]: 'Highest',
    [TicketPriority.HIGH]: 'High',
    [TicketPriority.MEDIUM]: 'Medium',
    [TicketPriority.LOW]: 'Low'
};

// Map Cleanvee alert type to Jira issue type
const ALERT_TYPE_TO_ISSUE_TYPE: Record<AlertType, string> = {
    [AlertType.SAFETY_HAZARD]: 'Bug',
    [AlertType.QUALITY_FAILURE]: 'Task',
    [AlertType.SLA_MISSING_CLEAN]: 'Task',
    [AlertType.SLA_BREACH_RECOVERED]: 'Task'
};

export class JiraConnector implements TicketingConnector {
    private config: JiraConfig;
    private mockMode: boolean;

    constructor(config?: Partial<JiraConfig>) {
        // Load from environment or use provided config
        this.config = {
            host: config?.host || process.env.JIRA_HOST || '',
            email: config?.email || process.env.JIRA_EMAIL || '',
            apiToken: config?.apiToken || process.env.JIRA_API_TOKEN || '',
            projectKey: config?.projectKey || process.env.JIRA_PROJECT_KEY || 'VERI',
            enabled: config?.enabled ?? Boolean(process.env.JIRA_HOST)
        };

        // If not fully configured, run in mock mode
        this.mockMode = !this.config.host || !this.config.email || !this.config.apiToken;

        if (this.mockMode) {
            console.warn('[Jira] Integration is not configured; ticket creation will fail closed.');
        }
    }

    getSystemName(): 'jira' {
        return 'jira';
    }

    isConfigured(): boolean {
        return !this.mockMode;
    }

    /**
     * Create an issue in Jira
     */
    async createTicket(request: CreateTicketRequest): Promise<TicketResponse> {
        const issue = this.buildIssue(request);

        if (this.mockMode || !this.config.enabled) {
            return { success: false, error: 'integration_not_configured', externalSystem: 'jira' };
        }

        return this.realCreateIssue(issue, request.metadata.correlationId);
    }

    /**
     * Build Jira issue from Cleanvee request
     */
    private buildIssue(request: CreateTicketRequest): JiraIssue {
        const issuesList = request.metadata.detectedIssues?.join(', ') || 'None specified';

        const descriptionText = `${request.description}

h3. Cleanvee Alert Details
* *Alert Type:* ${request.alertType}
* *Building ID:* ${request.metadata.buildingId}
* *Location:* ${request.metadata.location || 'Checkpoint ' + request.metadata.checkpointId}
* *Quality Score:* ${request.metadata.score ?? 'N/A'}
* *Detected Issues:* ${issuesList}
* *Alert Reference:* ${request.metadata.alertId}`;

        return {
            fields: {
                project: { key: this.config.projectKey },
                summary: request.title,
                description: {
                    type: 'doc',
                    version: 1,
                    content: [
                        {
                            type: 'paragraph',
                            content: [{ type: 'text', text: descriptionText }]
                        }
                    ]
                },
                issuetype: { name: ALERT_TYPE_TO_ISSUE_TYPE[request.alertType] || 'Task' },
                priority: { name: PRIORITY_TO_JIRA[request.priority] },
                labels: [
                    'cleanvee',
                    'automated',
                    request.alertType.toLowerCase().replace('_', '-')
                ]
            }
        };
    }

    /**
     * Mock issue creation for testing
     */
    private async mockCreateIssue(
        issue: JiraIssue,
        _request: CreateTicketRequest
    ): Promise<TicketResponse> {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 100));

        const mockIssueKey = `${this.config.projectKey}-${Math.floor(Math.random() * 10000)}`;

        console.log('[Jira MOCK] Would create issue:', {
            key: mockIssueKey,
            ...issue.fields
        });

        return {
            success: true,
            ticketId: mockIssueKey,
            ticketUrl: `https://mock-jira.atlassian.net/browse/${mockIssueKey}`,
            externalSystem: 'jira'
        };
    }

    /**
     * Real Jira API call (Jira Cloud)
     */
    private async realCreateIssue(issue: JiraIssue, correlationId?: string): Promise<TicketResponse> {
        const url = `https://${this.config.host}/rest/api/3/issue`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': 'Basic ' + btoa(`${this.config.email}:${this.config.apiToken}`),
                    ...(correlationId ? { 'Idempotency-Key': correlationId } : {})
                },
                signal: AbortSignal.timeout(10000),
                body: JSON.stringify(issue)
            });

            if (!response.ok) {
                throw new Error(`Jira provider returned HTTP ${response.status}`);
            }

            const data = await response.json();

            return {
                success: true,
                ticketId: data.key,
                ticketUrl: `https://${this.config.host}/browse/${data.key}`,
                externalSystem: 'jira'
            };
        } catch (error) {
            console.error('[Jira] Error creating issue:', error);
            return {
                success: false,
                error: 'provider_unavailable',
                externalSystem: 'jira'
            };
        }
    }
}

// Singleton instance
let instance: JiraConnector | null = null;

export function getJiraConnector(): JiraConnector {
    if (!instance) {
        instance = new JiraConnector();
    }
    return instance;
}
