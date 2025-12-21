import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { checkSlaCompliance } from "./slaMonitor"; // Import the new watchdog
import { streamToBigQuery } from "./analytics";

// Initialize the Firebase Admin SDK to interact with Firestore
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();

// Interfaces matching the data schema
interface CleaningLog {
  id: string;
  building_id: string;
  checkpoint_id: string;
  created_at: string; // ISO String or Timestamp
  proof_of_quality?: {
    overall_score: number;
    detected_objects: Array<{ label: string; confidence: number }>;
  };
}

interface Building {
  client_sla_config: {
    required_cleanings_per_day: number;
  };
}

/**
 * Trigger: Eventarc event on document creation in 'cleaning_logs' collection.
 * Region: Default (us-central1)
 * Memory: 256MiB (Default for Gen 2)
 */
export const onLogCreated = onDocumentCreated("cleaning_logs/{logId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    console.log("No data associated with the event");
    return;
  }

  const logData = snapshot.data() as CleaningLog;
  const logId = event.params.logId;

  // 1. Analyze Quality and Safety
  const overallScore = logData.proof_of_quality?.overall_score ?? 0;
  const hazards = logData.proof_of_quality?.detected_objects ?? [];
  const hasHazards = hazards.length > 0;
  const isLowScore = overallScore < 70;

  if (hasHazards || isLowScore) {
    console.log(`Alert triggered for Log ${logId}. Score: ${overallScore}, Hazards: ${hazards.length}`);

    // a. Create Alert Document
    await db.collection("alerts").add({
      related_log_id: logId,
      building_id: logData.building_id,
      checkpoint_id: logData.checkpoint_id,
      severity: "HIGH",
      status: "OPEN",
      type: hasHazards ? "SAFETY_HAZARD" : "QUALITY_FAILURE",
      details: {
        score: overallScore,
        detected_hazards: hazards.map(h => h.label),
      },
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    return; // Stop processing SLA if the cleaning failed
  }

  // 2. SLA Analysis (Only if verification passed)
  console.log(`Log ${logId} passed verification. Checking SLA compliance...`);

  try {
    // Fetch the Building Config to determine SLA threshold
    const buildingRef = db.collection("buildings").doc(logData.building_id);
    const buildingDoc = await buildingRef.get();

    if (!buildingDoc.exists) {
      console.warn(`Building ${logData.building_id} not found.`);
      return;
    }

    const buildingData = buildingDoc.data() as Building;
    const reqCleanings = buildingData.client_sla_config.required_cleanings_per_day || 1;
    
    // Calculate max allowed gap in milliseconds (Simple distribution: 24h / count)
    const maxGapMs = (24 * 60 * 60 * 1000) / reqCleanings;

    // Fetch the *previous* log for this specific checkpoint
    const lastLogQuery = await db.collection("cleaning_logs")
      .where("checkpoint_id", "==", logData.checkpoint_id)
      .where("created_at", "<", logData.created_at) // Strictly before current log
      .orderBy("created_at", "desc")
      .limit(1)
      .get();

    if (!lastLogQuery.empty) {
      const lastLog = lastLogQuery.docs[0].data() as CleaningLog;
      
      const currentTimestamp = new Date(logData.created_at).getTime();
      const lastTimestamp = new Date(lastLog.created_at).getTime();
      const timeSinceLastCleaning = currentTimestamp - lastTimestamp;

      // Check if the gap exceeded the allowed SLA window
      if (timeSinceLastCleaning > maxGapMs) {
        const gapHours = (timeSinceLastCleaning / (1000 * 60 * 60)).toFixed(2);
        const allowedHours = (maxGapMs / (1000 * 60 * 60)).toFixed(2);

        console.log(`SLA Breach Detected & Recovered. Gap: ${gapHours}h (Allowed: ${allowedHours}h)`);

        await db.collection("sla_events").add({
          type: "SLA_BREACH_RECOVERED",
          building_id: logData.building_id,
          checkpoint_id: logData.checkpoint_id,
          recovered_by_log_id: logId,
          details: {
            gap_duration_ms: timeSinceLastCleaning,
            gap_duration_hours: parseFloat(gapHours),
            allowed_duration_hours: parseFloat(allowedHours),
            previous_cleaning_at: lastLog.created_at,
            recovered_at: logData.created_at
          },
          created_at: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    } else {
      console.log("No previous logs found. This is the first cleaning.");
    }

  } catch (error) {
    console.error("Error analyzing SLA compliance:", error);
  }
});

// Export the scheduled function
export { checkSlaCompliance };
export { streamToBigQuery };