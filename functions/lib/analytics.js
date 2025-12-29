"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function (o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function () { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function (o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function (o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function (o, v) {
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
exports.streamToBigQuery = exports.aggregateStats = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const bigquery_1 = require("@google-cloud/bigquery");
const admin = __importStar(require("firebase-admin"));
const bigquery = new bigquery_1.BigQuery();
const DATASET_ID = "cleanvee_analytics";
const TABLE_ID = "cleaning_logs";
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();
exports.aggregateStats = (0, firestore_1.onDocumentCreated)("cleaning_logs/{logId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot)
        return;
    const data = snapshot.data();
    const buildingId = data.building_id || "unknown_building";
    const date = new Date(data.created_at || new Date().toISOString());
    const todayDateString = date.toISOString().split('T')[0];
    const statsDocId = `${buildingId}_${todayDateString}`;
    const statsRef = db.doc(`stats_daily/${statsDocId}`);
    const isVerified = data.verification_result?.status === 'verified';
    const score = data.proof_of_quality?.overall_score || 0;
    try {
        await statsRef.set({
            building_id: buildingId,
            date: todayDateString,
            total_logs: admin.firestore.FieldValue.increment(1),
            verified_count: isVerified ? admin.firestore.FieldValue.increment(1) : admin.firestore.FieldValue.increment(0),
            avg_score_sum: admin.firestore.FieldValue.increment(score),
            last_updated: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log(`[aggregateStats] Updated stats for ${buildingId} on ${todayDateString}`);
    }
    catch (error) {
        console.error(`[aggregateStats] Error updating stats for ${buildingId}:`, error);
    }
});
exports.streamToBigQuery = (0, firestore_1.onDocumentCreated)("cleaning_logs/{logId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot)
        return;
    const data = snapshot.data();
    const logId = event.params.logId;
    const row = {
        log_id: logId,
        building_id: data.building_id,
        checkpoint_id: data.checkpoint_id,
        cleaner_id: data.cleaner_id,
        timestamp: data.created_at,
        quality_score: data.proof_of_quality?.overall_score || null,
        ai_model: data.proof_of_quality?.ai_model_used || null,
        has_hazards: (data.proof_of_quality?.detected_objects?.length || 0) > 0,
        nfc_hash: data.proof_of_presence?.nfc_payload_hash || null,
        lat: data.proof_of_presence?.geo_location?.latitude || null,
        lng: data.proof_of_presence?.geo_location?.longitude || null,
        status: data.verification_result?.status || "unknown",
        ingested_at: bigquery.datetime(new Date().toISOString())
    };
    try {
        await bigquery
            .dataset(DATASET_ID)
            .table(TABLE_ID)
            .insert([row]);
        console.log(`Streamed Log ${logId} to BigQuery`);
    }
    catch (error) {
        console.error("BigQuery Insert Error:", error);
    }
});
//# sourceMappingURL=analytics.js.map