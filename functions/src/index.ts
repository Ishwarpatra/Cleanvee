import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { checkSlaCompliance } from "./slaMonitor";
import { streamToBigQuery } from "./analytics";

// Initialize Admin SDK once
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// --- Interfaces ---
interface CleaningLog {
  id: string;
  building_id: string;
  checkpoint_id: string;
  created_at: string;
  proof_of_quality?: {
    overall_score: number;
    detected_objects: Array<{ label: string; confidence: number }>;
  };
  verification_result?: {
    status: string;
    confidence?: number;
  };
}

// --- Service Layer (Separation of Concerns) ---

/**
 * Service to handle Alert generation.
 * Single Responsibility: Create and manage alerts for safety/quality issues.
 */
const AlertService = {
  /**
   * Analyzes a cleaning log and creates an alert if safety issues or low quality detected.
   * @param logId - The ID of the cleaning log
   * @param logData - The cleaning log data
   */
  async createSafetyAlert(logId: string, logData: CleaningLog): Promise<boolean> {
    const overallScore = logData.proof_of_quality?.overall_score ?? 0;
    const hazards = logData.proof_of_quality?.detected_objects ?? [];

    const hasHazards = hazards.length > 0;
    const isLowScore = overallScore < 70;

    // Only alert if score is low or hazards exist
    if (!hasHazards && !isLowScore) {
      return false; // No alert needed
    }

    await db.collection("alerts").add({
      related_log_id: logId,
      building_id: logData.building_id,
      checkpoint_id: logData.checkpoint_id,
      severity: "HIGH",
      status: "OPEN",
      type: hasHazards ? "SAFETY_HAZARD" : "QUALITY_FAILURE",
      details: {
        score: overallScore,
        detected_hazards: hazards.map((h) => h.label),
      },
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`[AlertService] Created ${hasHazards ? 'SAFETY_HAZARD' : 'QUALITY_FAILURE'} alert for Log ${logId}. Score: ${overallScore}, Hazards: ${hazards.length}`);
    return true; // Alert was created
  },

  /**
   * Closes any existing SLA_MISSING_CLEAN alerts for a checkpoint when it gets cleaned.
   * @param checkpointId - The checkpoint ID to resolve alerts for
   * @param resolvedByLogId - The log ID that resolved the alert
   */
  async resolveMissingCleanAlerts(checkpointId: string, resolvedByLogId: string): Promise<void> {
    const openAlerts = await db.collection("alerts")
      .where("checkpoint_id", "==", checkpointId)
      .where("type", "==", "SLA_MISSING_CLEAN")
      .where("status", "==", "OPEN")
      .get();

    if (openAlerts.empty) return;

    const batch = db.batch();
    for (const alertDoc of openAlerts.docs) {
      batch.update(alertDoc.ref, {
        status: "RESOLVED",
        resolved_at: admin.firestore.FieldValue.serverTimestamp(),
        resolved_by_log_id: resolvedByLogId,
      });
    }

    await batch.commit();
    console.log(`[AlertService] Resolved ${openAlerts.size} SLA_MISSING_CLEAN alerts for Checkpoint ${checkpointId}`);
  },
};

/**
 * Service to update the "State" of the facility.
 * This fixes the N+1 scalability issue by denormalizing data.
 * Single Responsibility: Manage checkpoint state updates.
 */
const FacilityStateService = {
  /**
   * Updates the checkpoint document with the latest cleaning timestamp.
   * This enables the SLA monitor to query this field directly instead of
   * querying all cleaning_logs for each checkpoint (N+1 problem fix).
   * 
   * @param checkpointId - The checkpoint document ID
   * @param cleanedAt - ISO timestamp of when cleaning occurred
   */
  async updateCheckpointState(checkpointId: string, cleanedAt: string): Promise<void> {
    const cleanedDate = new Date(cleanedAt);

    await db.collection("checkpoints").doc(checkpointId).update({
      last_cleaned_at: cleanedAt,
      last_cleaned_timestamp: admin.firestore.Timestamp.fromDate(cleanedDate),
      current_status: "CLEAN",
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`[FacilityStateService] Updated Checkpoint ${checkpointId} - last_cleaned_at: ${cleanedAt}`);
  },
};

/**
 * Service to track SLA events for analytics and audit trail.
 * Single Responsibility: Record SLA-related events.
 */
const SlaEventService = {
  /**
   * Records when an SLA breach was recovered (area got cleaned after being overdue).
   * @param logData - The cleaning log that recovered the breach
   * @param logId - The ID of the recovering log
   * @param previousCleaningAt - When the previous cleaning occurred
   * @param gapDurationMs - The gap duration in milliseconds
   * @param allowedDurationMs - The allowed gap duration in milliseconds
   */
  async recordBreachRecovery(
    logData: CleaningLog,
    logId: string,
    previousCleaningAt: string,
    gapDurationMs: number,
    allowedDurationMs: number
  ): Promise<void> {
    const gapHours = (gapDurationMs / (1000 * 60 * 60)).toFixed(2);
    const allowedHours = (allowedDurationMs / (1000 * 60 * 60)).toFixed(2);

    await db.collection("sla_events").add({
      type: "SLA_BREACH_RECOVERED",
      building_id: logData.building_id,
      checkpoint_id: logData.checkpoint_id,
      recovered_by_log_id: logId,
      details: {
        gap_duration_ms: gapDurationMs,
        gap_duration_hours: parseFloat(gapHours),
        allowed_duration_hours: parseFloat(allowedHours),
        previous_cleaning_at: previousCleaningAt,
        recovered_at: logData.created_at,
      },
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`[SlaEventService] Recorded SLA breach recovery. Gap: ${gapHours}h (Allowed: ${allowedHours}h)`);
  },
};

// --- The Clean Trigger ---

/**
 * Main trigger: Fires when a new cleaning log is created.
 * Orchestrates the service calls with clear separation of concerns.
 */
export const onLogCreated = onDocumentCreated("cleaning_logs/{logId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    console.log("No data associated with the event");
    return;
  }

  const logData = snapshot.data() as CleaningLog;
  const logId = event.params.logId;

  console.log(`[Trigger] Processing new cleaning log: ${logId}`);

  try {
    // Task 1: Check Quality & Safety - Create alert if needed
    const alertCreated = await AlertService.createSafetyAlert(logId, logData);

    // If alert was created (quality/safety issue), we still update checkpoint
    // but with a different status
    if (alertCreated) {
      console.log(`[Trigger] Quality/Safety issue detected in Log ${logId}`);
    }

    // Task 2: Check verification status
    const isVerified = logData.verification_result?.status === "verified";

    if (isVerified) {
      // Task 3: Denormalization - Update checkpoint's last cleaned timestamp
      // This is THE KEY FIX for the N+1 scalability issue
      await FacilityStateService.updateCheckpointState(
        logData.checkpoint_id,
        logData.created_at
      );

      // Task 4: Resolve any open SLA_MISSING_CLEAN alerts for this checkpoint
      await AlertService.resolveMissingCleanAlerts(logData.checkpoint_id, logId);

      // Task 5: Optional - Check if this was a breach recovery
      // (This is optional analytics, the main SLA monitoring happens in slaMonitor.ts)
      const checkpointDoc = await db.collection("checkpoints").doc(logData.checkpoint_id).get();
      if (checkpointDoc.exists) {
        const checkpointData = checkpointDoc.data();
        const buildingId = checkpointData?.building_id || logData.building_id;

        // Fetch building SLA config
        const buildingDoc = await db.collection("buildings").doc(buildingId).get();
        if (buildingDoc.exists) {
          const buildingData = buildingDoc.data();
          const reqCleanings = buildingData?.client_sla_config?.required_cleanings_per_day || 1;
          const maxGapMs = (24 * 60 * 60 * 1000) / reqCleanings;

          // Get previous cleaning time from checkpoint (before we updated it)
          const previousCleanedAt = checkpointData?.last_cleaned_at;
          if (previousCleanedAt) {
            const currentTimestamp = new Date(logData.created_at).getTime();
            const lastTimestamp = new Date(previousCleanedAt).getTime();
            const timeSinceLastCleaning = currentTimestamp - lastTimestamp;

            if (timeSinceLastCleaning > maxGapMs) {
              await SlaEventService.recordBreachRecovery(
                logData,
                logId,
                previousCleanedAt,
                timeSinceLastCleaning,
                maxGapMs
              );
            }
          }
        }
      }

      console.log(`[Trigger] Successfully processed verified Log ${logId}`);
    } else {
      console.log(`[Trigger] Log ${logId} not verified (status: ${logData.verification_result?.status}). Skipping state update.`);
    }

  } catch (error) {
    console.error(`[Trigger] Error processing Log ${logId}:`, error);
    throw error; // Re-throw to mark function as failed for retry
  }
});

// Export scheduled and analytics functions
export { checkSlaCompliance };
export { streamToBigQuery };