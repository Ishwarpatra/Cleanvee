/// <reference types="vite/client" />
import { GoogleGenAI } from "@google/genai";
import { CleaningLog, Checkpoint, ShiftReport } from "../types";
import { mcpGetCleaningLogsForAI, mcpGetCheckpointsForAI } from "./mcpServer";

// ============================================================
// Fix #99: model is configurable via env var — defaults to flash
// ============================================================
const GEMINI_MODEL = (import.meta.env as Record<string, string>).VITE_GEMINI_MODEL ?? "gemini-1.5-flash";

// ============================================================
// Fix #100: Circuit Breaker
// Tracks consecutive Gemini failures. After 3 failures the
// breaker "opens" and we return a local fallback for 5 minutes.
// ============================================================
const circuitBreaker = {
  failures: 0,
  openUntil: 0,
  readonly MAX_FAILURES: 3,
  readonly RESET_MS: 5 * 60 * 1000, // 5 minutes

  isOpen(): boolean {
    if (this.openUntil > 0 && Date.now() < this.openUntil) return true;
    if (this.openUntil > 0 && Date.now() >= this.openUntil) {
      // half-open: reset and allow one attempt
      this.failures = 0;
      this.openUntil = 0;
    }
    return false;
  },

  recordSuccess() {
    this.failures = 0;
    this.openUntil = 0;
  },

  recordFailure() {
    this.failures += 1;
    if (this.failures >= this.MAX_FAILURES) {
      this.openUntil = Date.now() + this.RESET_MS;
      console.warn(`[Gemini CircuitBreaker] OPEN — too many failures. Pausing for ${this.RESET_MS / 1000}s.`);
    }
  },
};

// ============================================================
// Fix #98: In-memory response cache (hash → report + timestamp)
// For a production system, replace with Firestore/Redis TTL cache.
// ============================================================
const reportCache = new Map<string, { report: ShiftReport; cachedAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function hashLogs(logs: CleaningLog[]): string {
  // Cheap hash: sorted log IDs + first/last created_at
  const ids = logs.map(l => l.id).sort().join(",");
  return ids;
}

/**
 * Fix #100: Generate a local stats-based fallback report when Gemini is unavailable.
 */
function buildFallbackReport(logs: CleaningLog[], checkpoints: Checkpoint[]): ShiftReport {
  const total = logs.length;
  const verified = logs.filter(l => l.verification_result.status === "verified").length;
  const complianceScore = total > 0 ? Math.round((verified / total) * 100) : 0;
  const lowScoreLogs = logs.filter(l => (l.proof_of_quality?.overall_score ?? 100) < 70);

  return {
    complianceScore,
    keyIssues: lowScoreLogs.length > 0
      ? [`${lowScoreLogs.length} log(s) with quality score below threshold`]
      : ["No major quality issues detected"],
    efficiencyInsight: `${verified}/${total} logs verified. ${checkpoints.length} checkpoint(s) monitored.`,
    recommendation: complianceScore < 70
      ? "Review rejected logs and schedule re-cleaning for flagged checkpoints."
      : "Compliance within acceptable range. Continue regular monitoring.",
  };
}

/**
 * Generate a shift report using Gemini AI.
 * Fix #97: All logs are batched into a single API call.
 * Fix #98: Results are cached for 10 minutes by log-set hash.
 * Fix #99: Model is configurable via VITE_GEMINI_MODEL env var.
 * Fix #100: Circuit breaker degrades gracefully when API is down.
 */
export const generateShiftReport = async (
  logs: CleaningLog[],
  checkpoints: Checkpoint[]
): Promise<ShiftReport | null> => {
  const apiKey = (import.meta.env as Record<string, string>).VITE_GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("[Gemini Service] Missing VITE_GEMINI_API_KEY — returning fallback report.");
    return buildFallbackReport(logs, checkpoints);
  }

  // Fix #98: Check cache first
  const cacheKey = hashLogs(logs);
  const cached = reportCache.get(cacheKey);
  if (cached && (Date.now() - cached.cachedAt) < CACHE_TTL_MS) {
    console.log("[Gemini Service] Cache hit — returning cached report.");
    return cached.report;
  }

  // Fix #100: Check circuit breaker
  if (circuitBreaker.isOpen()) {
    console.warn("[Gemini Service] Circuit OPEN — returning fallback report.");
    return buildFallbackReport(logs, checkpoints);
  }

  try {
    // === MCP DATA PRIVACY LAYER ===
    const { sanitizedLogs, totalPiiFieldsRemoved } = mcpGetCleaningLogsForAI(logs);
    const sanitizedCheckpoints = mcpGetCheckpointsForAI(checkpoints);
    console.log(`[Gemini Service] Data sanitized via MCP. PII fields removed: ${totalPiiFieldsRemoved}`);

    // Fix #97: All logs are batched into ONE prompt (no per-log API calls)
    const prompt = buildShiftReportPrompt(sanitizedLogs, sanitizedCheckpoints);

    const genAI = new GoogleGenAI({ apiKey });
    const response = await genAI.models.generateContent({
      model: GEMINI_MODEL,   // Fix #99: configurable model
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const text = response.text;
    if (!text) {
      circuitBreaker.recordFailure();
      return buildFallbackReport(logs, checkpoints);
    }

    const report = JSON.parse(text) as ShiftReport;

    // Fix #98: Store in cache
    reportCache.set(cacheKey, { report, cachedAt: Date.now() });

    circuitBreaker.recordSuccess();
    return report;

  } catch (error) {
    console.error("[Gemini Service] Error generating shift report:", error);
    circuitBreaker.recordFailure();
    // Fix #100: Graceful degradation to local stats
    return buildFallbackReport(logs, checkpoints);
  }
};

/**
 * Build the prompt for shift report generation.
 * Uses only PII-sanitized data. Fix #97: all logs in one batch.
 */
function buildShiftReportPrompt(
  sanitizedLogs: Partial<CleaningLog>[],
  sanitizedCheckpoints: Partial<Checkpoint>[]
): string {
  const logsJson = JSON.stringify(sanitizedLogs, null, 2);
  const checkpointsJson = JSON.stringify(sanitizedCheckpoints, null, 2);

  return `
You are an AI assistant analyzing cleaning operations data for a facility management system.
Analyze ALL of the following cleaning logs and checkpoint data to generate ONE consolidated shift report.

IMPORTANT: This data has been privacy-filtered. No worker PII is included.

## Checkpoints (${sanitizedCheckpoints.length} locations being monitored):
${checkpointsJson}

## Cleaning Logs (${sanitizedLogs.length} logs — all batched in this single request):
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
 * Generate an alert analysis using Gemini AI.
 */
export const analyzeAlert = async (
  alert: Record<string, unknown>,
  relevantLogs: CleaningLog[]
): Promise<{ analysis: string; suggestedAction: string } | null> => {
  const apiKey = (import.meta.env as Record<string, string>).VITE_GEMINI_API_KEY;

  if (!apiKey) {
    console.error("Missing VITE_GEMINI_API_KEY in .env file");
    return null;
  }

  // Fix #100: check circuit breaker
  if (circuitBreaker.isOpen()) {
    return { analysis: "AI analysis unavailable (service degraded).", suggestedAction: "Please review the alert details manually." };
  }

  try {
    const { sanitizedLogs } = mcpGetCleaningLogsForAI(relevantLogs);

    const sanitizedAlert = {
      type: alert.type,
      severity: alert.severity,
      details: {
        score: (alert.details as Record<string, unknown>)?.score,
        detected_hazards: (alert.details as Record<string, unknown>)?.detected_hazards,
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
      model: GEMINI_MODEL,   // Fix #99
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const text = response.text;
    if (!text) return null;

    circuitBreaker.recordSuccess();
    return JSON.parse(text);
  } catch (error) {
    console.error("Error analyzing alert:", error);
    circuitBreaker.recordFailure();
    return null;
  }
};