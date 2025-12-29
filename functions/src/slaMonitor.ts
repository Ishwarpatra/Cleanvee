import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

// Ensure admin is initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Optimized SLA Watchdog - Event-Driven Aggregation Pattern
 * 
 * BEFORE (N+1 Problem):
 * - Fetch ALL buildings → Loop through ALL checkpoints → Query logs for EACH checkpoint
 * - O(B * C * L) where B=buildings, C=checkpoints per building, L=log queries
 * - At scale: 100 buildings × 10 checkpoints = 1,000+ Firestore reads every 15 minutes
 * 
 * AFTER (Denormalized Query):
 * - Single query: "Get all checkpoints where last_cleaned_timestamp < threshold"
 * - O(1) query complexity
 * - At scale: 1 query returns only the ~5 overdue checkpoints
 * 
 * PREREQUISITE: The index.ts trigger must update the checkpoint document
 * with `last_cleaned_timestamp` whenever a cleaning log is verified.
 */
export const checkSlaCompliance = onSchedule("every 15 minutes", async (event) => {
  const now = new Date();
  console.log(`[SLA Watchdog] Running optimized check at ${now.toISOString()}`);

  try {
    // 1. Define the Threshold
    // In production, this could be dynamic per building, but for simplicity
    // we'll use a global 4-hour SLA and also check per-building config
    const DEFAULT_MAX_GAP_HOURS = 4;
    const thresholdDate = new Date(now.getTime() - (DEFAULT_MAX_GAP_HOURS * 60 * 60 * 1000));
    const thresholdTimestamp = admin.firestore.Timestamp.fromDate(thresholdDate);

    // 2. The Optimized Single Query
    // This queries ONLY checkpoints that haven't been cleaned since the threshold.
    // IMPORTANT: Requires a composite index on (is_active, last_cleaned_timestamp)
    // Firebase will prompt you to create this index if missing
    const overdueCheckpointsSnapshot = await db.collection("checkpoints")
      .where("is_active", "==", true)
      .where("last_cleaned_timestamp", "<", thresholdTimestamp)
      .get();

    if (overdueCheckpointsSnapshot.empty) {
      console.log("[SLA Watchdog] All checkpoints are compliant. No action needed.");
      return;
    }

    console.log(`[SLA Watchdog] Found ${overdueCheckpointsSnapshot.size} overdue checkpoints.`);

    // 3. Batch Processing - Collect all alerts to create
    const alertsToCreate: Array<{
      checkpointId: string;
      buildingId: string;
      lastCleanedAt: string;
      hoursOverdue: number;
    }> = [];

    // Check for existing alerts to avoid duplicates
    // We do this in a batch read to minimize queries
    const checkpointIds = overdueCheckpointsSnapshot.docs.map(doc => doc.id);

    // Get all open SLA_MISSING_CLEAN alerts for these checkpoints
    // Note: Firestore 'in' queries are limited to 10 items, so we chunk if needed
    const existingAlertsMap = new Map<string, boolean>();

    const chunkSize = 10;
    for (let i = 0; i < checkpointIds.length; i += chunkSize) {
      const chunk = checkpointIds.slice(i, i + chunkSize);
      const existingAlerts = await db.collection("alerts")
        .where("checkpoint_id", "in", chunk)
        .where("type", "==", "SLA_MISSING_CLEAN")
        .where("status", "==", "OPEN")
        .get();

      for (const alertDoc of existingAlerts.docs) {
        existingAlertsMap.set(alertDoc.data().checkpoint_id, true);
      }
    }

    // Determine which checkpoints need new alerts
    for (const doc of overdueCheckpointsSnapshot.docs) {
      const checkpointId = doc.id;
      const data = doc.data();

      // Skip if already has an open alert
      if (existingAlertsMap.has(checkpointId)) {
        console.log(`[SLA Watchdog] Checkpoint ${checkpointId} already has an open alert. Skipping.`);
        continue;
      }

      const lastCleanedAt = data.last_cleaned_at || "never";
      const lastCleanedMs = data.last_cleaned_timestamp?.toMillis() || 0;
      const hoursOverdue = parseFloat(((now.getTime() - lastCleanedMs) / (1000 * 60 * 60)).toFixed(2));

      alertsToCreate.push({
        checkpointId,
        buildingId: data.building_id,
        lastCleanedAt,
        hoursOverdue,
      });
    }

    if (alertsToCreate.length === 0) {
      console.log("[SLA Watchdog] All overdue checkpoints already have open alerts.");
      return;
    }

    // 4. Batch Write - Create all alerts in one network request
    const batch = db.batch();
    const alertsRef = db.collection("alerts");

    for (const alert of alertsToCreate) {
      const newAlertRef = alertsRef.doc();
      batch.set(newAlertRef, {
        building_id: alert.buildingId,
        checkpoint_id: alert.checkpointId,
        type: "SLA_MISSING_CLEAN",
        severity: "MEDIUM",
        status: "OPEN",
        message: `Area has not been cleaned in ${alert.hoursOverdue} hours (SLA: ${DEFAULT_MAX_GAP_HOURS}h).`,
        details: {
          hours_overdue: alert.hoursOverdue,
          sla_threshold_hours: DEFAULT_MAX_GAP_HOURS,
        },
        last_cleaned_at: alert.lastCleanedAt,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`[SLA Watchdog] Queued alert for Checkpoint ${alert.checkpointId} (${alert.hoursOverdue}h overdue)`);
    }

    await batch.commit();
    console.log(`[SLA Watchdog] Successfully created ${alertsToCreate.length} new alerts.`);

    // 5. Optional: Update checkpoint status to reflect overdue state
    const statusBatch = db.batch();
    for (const alert of alertsToCreate) {
      const checkpointRef = db.collection("checkpoints").doc(alert.checkpointId);
      statusBatch.update(checkpointRef, {
        current_status: "OVERDUE",
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await statusBatch.commit();
    console.log("[SLA Watchdog] Updated checkpoint statuses to OVERDUE.");

  } catch (error) {
    console.error("[SLA Watchdog] Failed:", error);
    throw error; // Re-throw to mark as failed for monitoring
  }
});

/**
 * FIRESTORE INDEX REQUIREMENT:
 * 
 * You need to create a composite index for the optimized query to work:
 * 
 * Collection: checkpoints
 * Fields: 
 *   - is_active: Ascending
 *   - last_cleaned_timestamp: Ascending
 * 
 * Firebase Console: Firestore > Indexes > Add Index
 * Or via firebase.json / firestore.indexes.json:
 * 
 * {
 *   "indexes": [
 *     {
 *       "collectionGroup": "checkpoints",
 *       "queryScope": "COLLECTION",
 *       "fields": [
 *         { "fieldPath": "is_active", "order": "ASCENDING" },
 *         { "fieldPath": "last_cleaned_timestamp", "order": "ASCENDING" }
 *       ]
 *     }
 *   ]
 * }
 */