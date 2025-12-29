"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkSlaCompliance = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
exports.checkSlaCompliance = (0, scheduler_1.onSchedule)("every 15 minutes", async (event) => {
    const now = new Date();
    console.log(`[SLA Watchdog] Running optimized check at ${now.toISOString()}`);
    try {
        const DEFAULT_MAX_GAP_HOURS = 4;
        const thresholdDate = new Date(now.getTime() - (DEFAULT_MAX_GAP_HOURS * 60 * 60 * 1000));
        const thresholdTimestamp = admin.firestore.Timestamp.fromDate(thresholdDate);
        const overdueCheckpointsSnapshot = await db.collection("checkpoints")
            .where("is_active", "==", true)
            .where("last_cleaned_timestamp", "<", thresholdTimestamp)
            .get();
        if (overdueCheckpointsSnapshot.empty) {
            console.log("[SLA Watchdog] All checkpoints are compliant. No action needed.");
            return;
        }
        console.log(`[SLA Watchdog] Found ${overdueCheckpointsSnapshot.size} overdue checkpoints.`);
        const alertsToCreate = [];
        const checkpointIds = overdueCheckpointsSnapshot.docs.map(doc => doc.id);
        const existingAlertsMap = new Map();
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
        for (const doc of overdueCheckpointsSnapshot.docs) {
            const checkpointId = doc.id;
            const data = doc.data();
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
    }
    catch (error) {
        console.error("[SLA Watchdog] Failed:", error);
        throw error;
    }
});
//# sourceMappingURL=slaMonitor.js.map