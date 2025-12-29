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
exports.aggregateStats = exports.streamToBigQuery = exports.checkSlaCompliance = exports.onOccupantFeedback = exports.onLogCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const slaMonitor_1 = require("./slaMonitor");
Object.defineProperty(exports, "checkSlaCompliance", { enumerable: true, get: function () { return slaMonitor_1.checkSlaCompliance; } });
const analytics_1 = require("./analytics");
Object.defineProperty(exports, "streamToBigQuery", { enumerable: true, get: function () { return analytics_1.streamToBigQuery; } });
Object.defineProperty(exports, "aggregateStats", { enumerable: true, get: function () { return analytics_1.aggregateStats; } });
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const AlertService = {
    async createSafetyAlert(logId, logData) {
        const overallScore = logData.proof_of_quality?.overall_score ?? 0;
        const hazards = logData.proof_of_quality?.detected_objects ?? [];
        const hasHazards = hazards.length > 0;
        const isLowScore = overallScore < 70;
        if (!hasHazards && !isLowScore) {
            return false;
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
        return true;
    },
    async resolveMissingCleanAlerts(checkpointId, resolvedByLogId) {
        const openAlerts = await db.collection("alerts")
            .where("checkpoint_id", "==", checkpointId)
            .where("type", "==", "SLA_MISSING_CLEAN")
            .where("status", "==", "OPEN")
            .get();
        if (openAlerts.empty)
            return;
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
const FacilityStateService = {
    async updateCheckpointState(checkpointId, cleanedAt) {
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
const SlaEventService = {
    async recordBreachRecovery(logData, logId, previousCleaningAt, gapDurationMs, allowedDurationMs) {
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
exports.onLogCreated = (0, firestore_1.onDocumentCreated)("cleaning_logs/{logId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        console.log("No data associated with the event");
        return;
    }
    const logData = snapshot.data();
    const logId = event.params.logId;
    console.log(`[Trigger] Processing new cleaning log: ${logId}`);
    try {
        const alertCreated = await AlertService.createSafetyAlert(logId, logData);
        if (alertCreated) {
            console.log(`[Trigger] Quality/Safety issue detected in Log ${logId}`);
        }
        const isVerified = logData.verification_result?.status === "verified";
        if (isVerified) {
            await FacilityStateService.updateCheckpointState(logData.checkpoint_id, logData.created_at);
            await AlertService.resolveMissingCleanAlerts(logData.checkpoint_id, logId);
            const checkpointDoc = await db.collection("checkpoints").doc(logData.checkpoint_id).get();
            if (checkpointDoc.exists) {
                const checkpointData = checkpointDoc.data();
                const buildingId = checkpointData?.building_id || logData.building_id;
                const buildingDoc = await db.collection("buildings").doc(buildingId).get();
                if (buildingDoc.exists) {
                    const buildingData = buildingDoc.data();
                    const reqCleanings = buildingData?.client_sla_config?.required_cleanings_per_day || 1;
                    const maxGapMs = (24 * 60 * 60 * 1000) / reqCleanings;
                    const previousCleanedAt = checkpointData?.last_cleaned_at;
                    if (previousCleanedAt) {
                        const currentTimestamp = new Date(logData.created_at).getTime();
                        const lastTimestamp = new Date(previousCleanedAt).getTime();
                        const timeSinceLastCleaning = currentTimestamp - lastTimestamp;
                        if (timeSinceLastCleaning > maxGapMs) {
                            await SlaEventService.recordBreachRecovery(logData, logId, previousCleanedAt, timeSinceLastCleaning, maxGapMs);
                        }
                    }
                }
            }
            console.log(`[Trigger] Successfully processed verified Log ${logId}`);
            const userRef = db.collection("users").doc(logData.cleaner_id);
            try {
                await db.runTransaction(async (transaction) => {
                    const userDoc = await transaction.get(userRef);
                    const currentStreak = (userDoc.exists ? userDoc.data()?.verified_streak : 0) || 0;
                    const newStreak = currentStreak + 1;
                    if (newStreak >= 10) {
                        console.log(`[Trigger] Cleaner ${logData.cleaner_id} reached 10 verified logs. Triggering SUPERVISOR_AUDIT_REQUEST.`);
                        await db.collection("alerts").add({
                            building_id: logData.building_id,
                            checkpoint_id: logData.checkpoint_id,
                            type: "SUPERVISOR_AUDIT_REQUEST",
                            severity: "MEDIUM",
                            status: "OPEN",
                            message: `Cleaner streak reached 10. Manual spot check requested for ${logData.checkpoint_id}.`,
                            details: {
                                cleaner_id: logData.cleaner_id,
                                streak: newStreak
                            },
                            created_at: admin.firestore.FieldValue.serverTimestamp(),
                        });
                        transaction.set(userRef, { verified_streak: 0 }, { merge: true });
                    }
                    else {
                        transaction.set(userRef, { verified_streak: newStreak }, { merge: true });
                    }
                });
            }
            catch (e) {
                console.error(`[Trigger] Error updating cleaner streak:`, e);
            }
        }
        else {
            console.log(`[Trigger] Log ${logId} not verified (status: ${logData.verification_result?.status}). Skipping state update.`);
            if (logData.verification_result?.status === "rejected") {
                await db.collection("users").doc(logData.cleaner_id).set({ verified_streak: 0 }, { merge: true });
            }
        }
    }
    catch (error) {
        console.error(`[Trigger] Error processing Log ${logId}:`, error);
        throw error;
    }
});
exports.onOccupantFeedback = (0, firestore_1.onDocumentCreated)("occupant_feedback/{feedbackId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot)
        return;
    const feedback = snapshot.data();
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
//# sourceMappingURL=index.js.map