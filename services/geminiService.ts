/// <reference types="vite/client" />
import { GoogleGenAI } from "@google/genai";
import { CleaningLog, Checkpoint, ShiftReport } from "../types";
import { mcpGetCleaningLogsForAI, mcpGetCheckpointsForAI } from "./mcpServer";

/**
 * Generate a shift report using Gemini AI
 * 
 * IMPORTANT: Data is passed through MCP tools to ensure PII protection.
 * Worker names, IDs, and other PII are stripped before AI processing.
 */
export const generateShiftReport = async (
  logs: CleaningLog[],
  checkpoints: Checkpoint[]
): Promise<ShiftReport | null> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    console.error("Missing VITE_GEMINI_API_KEY in .env file");
    return null;
  }

  try {
    // === MCP DATA PRIVACY LAYER ===
    // Use MCP tools to get PII-sanitized data
    // This ensures worker information is never sent to the AI
    const { sanitizedLogs, totalPiiFieldsRemoved } = mcpGetCleaningLogsForAI(logs);
    const sanitizedCheckpoints = mcpGetCheckpointsForAI(checkpoints);

    console.log(`[Gemini Service] Data sanitized via MCP. PII fields removed: ${totalPiiFieldsRemoved}`);

    // Build the prompt with sanitized data only
    const prompt = buildShiftReportPrompt(sanitizedLogs, sanitizedCheckpoints);

    // Initialize Gemini
    const genAI = new GoogleGenAI({ apiKey });

    const response = await genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    // Parse the response
    const text = response.text;
    if (!text) {
      console.error("Empty response from Gemini");
      return null;
    }

    const report = JSON.parse(text) as ShiftReport;
    return report;

  } catch (error) {
    console.error("Error generating shift report:", error);
    return null;
  }
};

/**
 * Build the prompt for shift report generation
 * Uses only PII-sanitized data
 */
function buildShiftReportPrompt(
  sanitizedLogs: Partial<CleaningLog>[],
  sanitizedCheckpoints: Partial<Checkpoint>[]
): string {
  const logsJson = JSON.stringify(sanitizedLogs, null, 2);
  const checkpointsJson = JSON.stringify(sanitizedCheckpoints, null, 2);

  return `
You are an AI assistant analyzing cleaning operations data for a facility management system.
Analyze the following cleaning logs and checkpoint data to generate a shift report.

IMPORTANT: This data has been privacy-filtered. No worker PII is included.

## Checkpoints (locations being monitored):
${checkpointsJson}

## Cleaning Logs (recent cleaning activities):
${logsJson}

Generate a JSON response with the following structure:
{
  "complianceScore": <number 0-100 representing overall cleaning compliance>,
  "keyIssues": [<array of string descriptions of main issues found>],
  "efficiencyInsight": "<string with insights about cleaning efficiency>",
  "recommendation": "<string with actionable recommendation>"
}

Focus on:
- Quality scores and pass/fail rates
- Detected objects and hazards
- Location coverage gaps
- Patterns in the data

Respond ONLY with valid JSON, no markdown or explanation.
`;
}

/**
 * Generate an alert analysis using Gemini AI
 * For when a quality failure or safety hazard is detected
 */
export const analyzeAlert = async (
  alert: Record<string, any>,
  relevantLogs: CleaningLog[]
): Promise<{ analysis: string; suggestedAction: string } | null> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    console.error("Missing VITE_GEMINI_API_KEY in .env file");
    return null;
  }

  try {
    // Sanitize data via MCP before AI processing
    const { sanitizedLogs } = mcpGetCleaningLogsForAI(relevantLogs);

    // Note: alert data should also be sanitized, but we'll do it inline here
    const sanitizedAlert = {
      type: alert.type,
      severity: alert.severity,
      details: {
        score: alert.details?.score,
        detected_hazards: alert.details?.detected_hazards
      }
    };

    const prompt = `
Analyze this cleaning alert and provide insights:

Alert: ${JSON.stringify(sanitizedAlert)}
Recent logs for this location: ${JSON.stringify(sanitizedLogs.slice(0, 5))}

Respond with JSON:
{
  "analysis": "<brief analysis of what might have caused this>",
  "suggestedAction": "<recommended next step>"
}
`;

    const genAI = new GoogleGenAI({ apiKey });

    const response = await genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) return null;

    return JSON.parse(text);
  } catch (error) {
    console.error("Error analyzing alert:", error);
    return null;
  }
};