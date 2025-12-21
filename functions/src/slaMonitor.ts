import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

// Ensure admin is initialized (safe to call multiple times if checked, 
// but usually shared via index.ts or initialized once per instance)
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

export const checkSlaCompliance = onSchedule("every 15 minutes", async (event) => {
  const now = new Date();
  console.log("Running SLA Watchdog at", now.toISOString());

  // 1. Get all active buildings
  const buildingsSnap = await db.collection('buildings').get();

  for (const buildingDoc of buildingsSnap.docs) {
    const buildingId = buildingDoc.id;
    
    // SLA Config: e.g., "Must be cleaned every 4 hours"
    // In production, fetch this from buildingDoc.data().client_sla_config
    const MAX_GAP_HOURS = 4; 
    const thresholdDate = new Date(now.getTime() - (MAX_GAP_HOURS * 60 * 60 * 1000));

    // 2. Get Checkpoints for this building
    const checkpointsSnap = await db.collection('checkpoints')
        .where('building_id', '==', buildingId)
        .get();

    for (const cpDoc of checkpointsSnap.docs) {
      const cpId = cpDoc.id;
      
      // 3. Find the last clean log for this checkpoint
      const lastLogSnap = await db.collection('cleaning_logs')
        .where('checkpoint_id', '==', cpId)
        .orderBy('created_at', 'desc')
        .limit(1)
        .get();

      let lastCleanedAt = new Date(0); // Epoch if never cleaned
      if (!lastLogSnap.empty) {
        lastCleanedAt = new Date(lastLogSnap.docs[0].data().created_at);
      }

      // 4. Check for Breach
      if (lastCleanedAt < thresholdDate) {
        console.warn(`SLA BREACH: Checkpoint ${cpId} not cleaned since ${lastCleanedAt.toISOString()}`);
        
        // Check if an OPEN alert already exists to prevent spamming
        const activeAlerts = await db.collection('alerts')
          .where('checkpoint_id', '==', cpId)
          .where('status', '==', 'OPEN')
          .where('type', '==', 'SLA_MISSING_CLEAN')
          .get();

        if (activeAlerts.empty) {
          // Create new Alert
          await db.collection('alerts').add({
            building_id: buildingId,
            checkpoint_id: cpId,
            type: 'SLA_MISSING_CLEAN',
            severity: 'MEDIUM',
            status: 'OPEN',
            message: `Area has not been cleaned in over ${MAX_GAP_HOURS} hours.`,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            last_cleaned_at: lastCleanedAt.toISOString()
          });
          
          console.log(`Alert created for ${cpId}`);
        }
      }
    }
  }
});