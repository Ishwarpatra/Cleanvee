import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { BigQuery } from "@google-cloud/bigquery";
import * as admin from "firebase-admin";

const bigquery = new BigQuery();
const DATASET_ID = "cleanvee_analytics";
const TABLE_ID = "cleaning_logs";

// Initialize Admin SDK if not already done
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

/**
 * Aggregates cleaning log stats daily to reduce Firestore read costs on the dashboard.
 * Instead of reading all logs to calculate metrics, the dashboard can read one summary document.
 */
export const aggregateStats = onDocumentCreated("cleaning_logs/{logId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const data = snapshot.data();
  const buildingId = data.building_id || "unknown_building";
  // Use the log's creation date for the stats bucket
  const date = new Date(data.created_at || new Date().toISOString());
  const todayDateString = date.toISOString().split('T')[0]; // YYYY-MM-DD

  // Use a composite ID to keep it flat and easy to query/listen
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
  } catch (error) {
    console.error(`[aggregateStats] Error updating stats for ${buildingId}:`, error);
  }
});

export const streamToBigQuery = onDocumentCreated("cleaning_logs/{logId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const data = snapshot.data();
  const logId = event.params.logId;

  // Flatten the data for SQL (BigQuery prefers flat schemas over nested JSON)
  const row = {
    log_id: logId,
    building_id: data.building_id,
    checkpoint_id: data.checkpoint_id,
    cleaner_id: data.cleaner_id,
    timestamp: data.created_at, // Ensure this is ISO string or Timestamp

    // Quality Metrics
    quality_score: data.proof_of_quality?.overall_score || null,
    ai_model: data.proof_of_quality?.ai_model_used || null,
    has_hazards: (data.proof_of_quality?.detected_objects?.length || 0) > 0,

    // Presence Metrics
    nfc_hash: data.proof_of_presence?.nfc_payload_hash || null,
    lat: data.proof_of_presence?.geo_location?.latitude || null,
    lng: data.proof_of_presence?.geo_location?.longitude || null,

    // Status
    status: data.verification_result?.status || "unknown",
    ingested_at: bigquery.datetime(new Date().toISOString())
  };

  try {
    // Insert into BigQuery
    await bigquery
      .dataset(DATASET_ID)
      .table(TABLE_ID)
      .insert([row]);

    console.log(`Streamed Log ${logId} to BigQuery`);
  } catch (error) {
    console.error("BigQuery Insert Error:", error);
    // Note: In production, you might want to write failed inserts to a 'dead-letter' Firestore collection
  }
});