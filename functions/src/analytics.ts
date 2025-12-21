import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { BigQuery } from "@google-cloud/bigquery";

const bigquery = new BigQuery();
const DATASET_ID = "vericlean_analytics";
const TABLE_ID = "cleaning_logs";

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