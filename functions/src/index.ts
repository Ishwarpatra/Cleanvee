import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { beforeUserCreated } from "firebase-functions/v2/identity";
import * as admin from "firebase-admin";
import { checkSlaCompliance } from "./slaMonitor";
import { streamToBigQuery, aggregateStats } from "./analytics";

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
  cleaner_id: string;
  created_at: string;
  proof_of_quality?: {
    overall_score: number;
    detected_objects: Array<{ label: string; confidence: number }>;
  };
  verification_result?: {
    status: string;
    confidence?: number;
    flag_reason?: string;
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

    // Fetch building to get manager_ids (Fix #66)
    const buildingDoc = await db.collection("buildings").doc(logData.building_id).get();
    const managerIds = buildingDoc.exists ? (buildingDoc.data()?.manager_ids || []) : [];

    const alertType = hasHazards ? "HAZARD_DETECTED" : "LOW_QUALITY_SCORE";

    // Fix #119: Check for existing open alert for this checkpoint to prevent spam
    const existingAlerts = await db.collection("alerts")
      .where("checkpoint_id", "==", logData.checkpoint_id)
      .where("type", "==", alertType)
      .where("status", "in", ["open", "acknowledged"])
      .limit(1)
      .get();

    if (!existingAlerts.empty) {
      const existingAlert = existingAlerts.docs[0];
      await existingAlert.ref.update({
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        "details.duplicate_count": admin.firestore.FieldValue.increment(1),
        "details.latest_log_id": logId,
        "details.latest_score": overallScore,
      });
      console.log(`[AlertService] Updated existing ${alertType} alert for Checkpoint ${logData.checkpoint_id}.`);
      return true;
    }

    await db.collection("alerts").add({
      related_log_id: logId, // Primary log that triggered it
      building_id: logData.building_id,
      checkpoint_id: logData.checkpoint_id,
      severity: hasHazards ? "high" : "medium",
      status: "open",
      type: alertType,
      details: {
        score: overallScore,
        detected_hazards: hazards.map((h) => h.label),
        duplicate_count: 0
      },
      notify_user_ids: managerIds,
      source_function: "onLogCreated:AlertService",
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`[AlertService] Created ${alertType} alert for Log ${logId}. Score: ${overallScore}, Hazards: ${hazards.length}. Notifying ${managerIds.length} users.`);
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
      .where("status", "==", "open")  // Fix #56: lowercase
      .get();

    if (openAlerts.empty) return;

    const batch = db.batch();
    for (const alertDoc of openAlerts.docs) {
      batch.update(alertDoc.ref, {
        status: "resolved",                                   // Fix #56: lowercase
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
      current_status: "clean",  // Fix #56: lowercase matches CheckpointStatus enum
      // Fix #63: record when the status transitioned for audit trail
      became_clean_at: cleanedAt,
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
    allowedDurationMs: number,
    // Fix #64: link recovery to the original breach alert
    resolvedAlertId?: string
  ): Promise<void> {
    const gapHours = (gapDurationMs / (1000 * 60 * 60)).toFixed(2);
    const allowedHours = (allowedDurationMs / (1000 * 60 * 60)).toFixed(2);

    await db.collection("sla_events").add({
      type: "SLA_BREACH_RECOVERED",
      building_id: logData.building_id,
      checkpoint_id: logData.checkpoint_id,
      recovered_by_log_id: logId,
      // Fix #64: reference to the original SLA_MISSING_CLEAN alert
      resolved_alert_id: resolvedAlertId ?? null,
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
              // Fix #64: find the original SLA alert ID to link to recovery
              const breachAlertSnap = await db.collection("alerts")
                .where("checkpoint_id", "==", logData.checkpoint_id)
                .where("type", "==", "SLA_MISSING_CLEAN")
                .where("status", "in", ["open", "acknowledged"])
                .limit(1)
                .get();
              const resolvedAlertId = breachAlertSnap.empty ? undefined : breachAlertSnap.docs[0].id;

              await SlaEventService.recordBreachRecovery(
                logData,
                logId,
                previousCleanedAt,
                timeSinceLastCleaning,
                maxGapMs,
                resolvedAlertId
              );
            }
          }
        }
      }

      console.log(`[Trigger] Successfully processed verified Log ${logId}`);

      // Task 5: Random Audit Logic (Streak tracking per building - Fix #113)
      // If a cleaner gets 10 "verified" logs in a row at a specific building, trigger a manual audit
      const streakId = `${logData.building_id}_${logData.cleaner_id}`;
      const streakRef = db.collection("streaks").doc(streakId);
      
      try {
        await db.runTransaction(async (transaction) => {
          const streakDoc = await transaction.get(streakRef);
          const currentStreak = (streakDoc.exists ? streakDoc.data()?.verified_streak : 0) || 0;
          const newStreak = currentStreak + 1;

          transaction.set(streakRef, {
            cleaner_id: logData.cleaner_id,
            building_id: logData.building_id,
            verified_streak: newStreak,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });

          if (newStreak >= 10) {
            console.log(`[Trigger] Cleaner ${logData.cleaner_id} reached 10 verified logs at Building ${logData.building_id}. Triggering SUPERVISOR_AUDIT_REQUEST.`);

            await db.collection("alerts").add({
              building_id: logData.building_id,
              checkpoint_id: logData.checkpoint_id,
              type: "SUPERVISOR_AUDIT_REQUEST",
              severity: "medium",   // Fix #56: lowercase
              status: "open",       // Fix #56: lowercase
              message: `Cleaner streak reached 10. Manual spot check requested for ${logData.checkpoint_id}.`,
              details: {
                cleaner_id: logData.cleaner_id,
                streak: newStreak,
                // Fix #61: include the log that triggered the audit for evidence
                trigger_log_id: logId,
              },
              created_at: admin.firestore.FieldValue.serverTimestamp(),
            });

            transaction.set(streakRef, { verified_streak: 0 }, { merge: true });
          } else {
            transaction.set(streakRef, { verified_streak: newStreak }, { merge: true });
          }
        });
      } catch (e) {
        console.error(`[Trigger] Error updating cleaner streak:`, e);
      }

    } else {
      console.log(`[Trigger] Log ${logId} not verified (status: ${logData.verification_result?.status}). Skipping state update.`);

      // Fix #60, #113, #148: Reset streak on any non-verified outcome per building, using enums
      const nonVerifiedStatuses = [LogStatus.REJECTED, LogStatus.FLAGGED, LogStatus.APPEALED];
      if (logData.verification_result?.status && nonVerifiedStatuses.includes(logData.verification_result.status as LogStatus)) {
        const streakId = `${logData.building_id}_${logData.cleaner_id}`;
        await db.collection("streaks").doc(streakId).set({
          cleaner_id: logData.cleaner_id,
          building_id: logData.building_id,
          verified_streak: 0,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log(`[Trigger] Reset streak for cleaner ${logData.cleaner_id} at building ${logData.building_id} to 0 due to non-verified status.`);
      }
    }

  } catch (error) {
    console.error(`[Trigger] Error processing Log ${logId}:`, error);
    throw error;
  }
});

/**
 * Trigger for Occupant Feedback - The "Occupant Loop"
 * Overrides AI "Green" status if a human reports an issue shortly after.
 */
export const onOccupantFeedback = onDocumentCreated("occupant_feedback/{feedbackId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  const feedback = snapshot.data();

  // If feedback is negative, look for the last verification to invalidate
  if (['BAD_SMELL', 'DIRTY', 'SPILL', 'ISSUE', 'OTHER'].includes(feedback.type)) {
    const lastLogs = await db.collection("cleaning_logs")
      .where("checkpoint_id", "==", feedback.checkpoint_id)
      .where("verification_result.status", "==", "verified")
      .orderBy("created_at", "desc")
      .limit(1)
      .get();

    if (!lastLogs.empty) {
      const lastLog = lastLogs.docs[0];
      await lastLog.ref.update({
        'verification_result.status': 'flagged_for_review',
        'verification_result.flag_reason': `Occupant reported ${feedback.type}: ${feedback.details || 'No details provided'}`
      });

      console.log(`[Feedback] Overrode Log ${lastLog.id} status due to occupant feedback ${event.params.feedbackId}`);
    }
  }
});

// Export scheduled and analytics functions
export { checkSlaCompliance };
export { streamToBigQuery, aggregateStats };
export { onAlertCreated, onAlertUpdated } from "./notifications";

/**
 * Fix #93: Auto-provision a Firestore user doc when Firebase Auth creates a new user.
 * This closes the security gap where new users had no role/building assignment.
 * Cloud Function runs server-side with admin SDK — not accessible by clients.
 */
export const onAuthUserCreated = beforeUserCreated(async (event) => {
  const user = event.data;
  if (!user) return;

  // Create a minimal user doc with default cleaner role and no buildings
  // Admin must then assign a role and buildings via the admin UI
  await db.collection("users").doc(user.uid).set({
    uid: user.uid,
    email: user.email ?? "",
    full_name: user.displayName ?? user.email ?? "New User",
    role: "cleaner",               // default: least privileged role
    assigned_building_ids: [],      // no buildings until admin assigns
    is_active: true,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
    created_by: "system:onAuthUserCreated",
  });

  console.log(`[onAuthUserCreated] Provisioned Firestore doc for new user: ${user.uid} (${user.email})`);
});