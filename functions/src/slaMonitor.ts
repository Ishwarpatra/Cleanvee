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
    // Fix #52: Use per-building SLA config when available, fallback to global default
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
    const neverCleanedSnapshot = await db.collection("checkpoints")
      .where("is_active", "==", true)
      .where("last_cleaned_timestamp", "==", null)
      .get();
    const checkpointDocs = [...new Map(
      [...overdueCheckpointsSnapshot.docs, ...neverCleanedSnapshot.docs].map((doc) => [doc.id, doc]),
    ).values()];

    if (checkpointDocs.length === 0) {
      console.log("[SLA Watchdog] All checkpoints are compliant. No action needed.");
      return;
    }

    console.log(`[SLA Watchdog] Found ${checkpointDocs.length} checkpoints requiring SLA evaluation.`);

    // 3. Batch Processing - Collect all alerts to create
    const alertsToCreate: Array<{
      checkpointId: string;
      buildingId: string;
      lastCleanedAt: string | null;
      hoursOverdue: number;
      slaThresholdHours: number; // Fix #52: per-checkpoint SLA threshold
      notifyUserIds: string[]; // Fix #66
    }> = [];

    // Check for existing alerts to avoid duplicates
    // We do this in a batch read to minimize queries
    const checkpointIds = checkpointDocs.map(doc => doc.id);

    // Get all open SLA_MISSING_CLEAN alerts for these checkpoints
    // Note: Firestore 'in' queries are limited to 10 items, so we chunk if needed
    const existingAlertsMap = new Map<string, boolean>();

    const chunkSize = 10;
    for (let i = 0; i < checkpointIds.length; i += chunkSize) {
      const chunk = checkpointIds.slice(i, i + chunkSize);
      const existingAlerts = await db.collection("alerts")
        .where("checkpoint_id", "in", chunk)
        .where("type", "==", "SLA_MISSING_CLEAN")
        .where("status", "==", "open")  // Fix #56: lowercase matches AlertStatus enum
        .get();

      for (const alertDoc of existingAlerts.docs) {
        existingAlertsMap.set(alertDoc.data().checkpoint_id, true);
      }
    }

    const buildingIds = [...new Set(checkpointDocs
      .map((doc) => doc.data().building_id)
      .filter((buildingId): buildingId is string => typeof buildingId === 'string' && buildingId.length > 0))];
    const managerIdsByBuilding = new Map<string, string[]>();
    for (let i = 0; i < buildingIds.length; i += chunkSize) {
      const chunk = buildingIds.slice(i, i + chunkSize);
      const buildings = await db.collection("buildings")
        .where(admin.firestore.FieldPath.documentId(), "in", chunk)
        .get();
      buildings.forEach((buildingDoc) => {
        const managerIds = buildingDoc.data().manager_ids;
        managerIdsByBuilding.set(
          buildingDoc.id,
          Array.isArray(managerIds) ? managerIds.filter((id): id is string => typeof id === 'string') : [],
        );
      });
    }

    // Determine which checkpoints need new alerts
    for (const doc of checkpointDocs) {
      const checkpointId = doc.id;
      const data = doc.data();

      // Skip if already has an open alert
      if (existingAlertsMap.has(checkpointId)) {
        console.log(`[SLA Watchdog] Checkpoint ${checkpointId} already has an open alert. Skipping.`);
        continue;
      }

      const lastCleanedTimestamp = data.last_cleaned_timestamp;
      const lastCleanedMs = typeof lastCleanedTimestamp?.toMillis === 'function'
        ? lastCleanedTimestamp.toMillis()
        : null;
      let lastCleanedAt: string | null = typeof data.last_cleaned_at === 'string' ? data.last_cleaned_at : null;
      let hoursOverdue: number;

      if (typeof lastCleanedMs === 'number' && Number.isFinite(lastCleanedMs)) {
        hoursOverdue = parseFloat(((now.getTime() - lastCleanedMs) / (1000 * 60 * 60)).toFixed(2));
      } else {
        const createdAtMs = typeof data.created_at?.toMillis === 'function'
          ? data.created_at.toMillis()
          : Date.parse(data.created_at ?? '');
        const onboardingGraceHours = typeof data.onboarding_grace_period_hours === 'number'
          ? data.onboarding_grace_period_hours
          : 24;
        if (!Number.isFinite(createdAtMs)) {
          console.warn(`[SLA Watchdog] Skipping checkpoint ${checkpointId}: missing valid creation time.`);
          continue;
        }
        hoursOverdue = parseFloat((((now.getTime() - createdAtMs) / (1000 * 60 * 60)) - onboardingGraceHours).toFixed(2));
        if (hoursOverdue <= 0) continue;
        lastCleanedAt = null;
      }
      // Fix #52: use building-level SLA config if stored on checkpoint, else use default
      const slaThresholdHours: number = typeof data.sla_max_gap_hours === 'number'
        ? data.sla_max_gap_hours
        : DEFAULT_MAX_GAP_HOURS;

      const managerIds = managerIdsByBuilding.get(data.building_id) ?? [];

      alertsToCreate.push({
        checkpointId,
        buildingId: data.building_id,
        lastCleanedAt,
        hoursOverdue,
        slaThresholdHours,
        notifyUserIds: managerIds, // Fix #66
      });
    }

    if (alertsToCreate.length === 0) {
      console.log("[SLA Watchdog] All overdue checkpoints already have open alerts.");
      return;
    }

    // 4. Batch Write - Create all alerts in one network request
    const alertsRef = db.collection("alerts");
    const batchSize = 450;

    for (let i = 0; i < alertsToCreate.length; i += batchSize) {
      const batch = db.batch();
      for (const alert of alertsToCreate.slice(i, i + batchSize)) {
        const newAlertRef = alertsRef.doc();
        batch.set(newAlertRef, {
        building_id: alert.buildingId,
        checkpoint_id: alert.checkpointId,
        type: "SLA_MISSING_CLEAN",
        severity: "medium",     // Fix #56: lowercase matches AlertSeverity enum
        status: "open",         // Fix #56: lowercase matches AlertStatus enum
        message: `Area has not been cleaned in ${alert.hoursOverdue} hours (SLA: ${alert.slaThresholdHours}h).`,
        details: {
          hours_overdue: alert.hoursOverdue,
          sla_threshold_hours: alert.slaThresholdHours,
        },
        notify_user_ids: alert.notifyUserIds, // Fix #66
        source_function: "checkSlaCompliance", // Fix #91
        last_cleaned_at: alert.lastCleanedAt,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`[SLA Watchdog] Queued alert for Checkpoint ${alert.checkpointId} (${alert.hoursOverdue}h overdue)`);
      }
      await batch.commit();
    }
    console.log(`[SLA Watchdog] Successfully created ${alertsToCreate.length} new alerts.`);

    // 5. Optional: Update checkpoint status to reflect overdue state
    for (let i = 0; i < alertsToCreate.length; i += batchSize) {
      const statusBatch = db.batch();
      for (const alert of alertsToCreate.slice(i, i + batchSize)) {
        const checkpointRef = db.collection("checkpoints").doc(alert.checkpointId);
        statusBatch.update(checkpointRef, {
          current_status: "overdue",
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      await statusBatch.commit();
    }
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