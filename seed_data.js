// scripts/seed_data.js
const admin = require("firebase-admin");
const serviceAccount = require("./service-account-key.json"); // DOWNLOAD THIS FROM FIREBASE

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const BUILDING_ID = "apex_tower_sf"; // Matches your Flutter App

const checkpoints = [
  {
    id: "checkpoint_lobby_main",
    building_id: BUILDING_ID,
    location_label: "Main Lobby",
    floor_number: 1,
    x_rel: 20, // X coordinate % for FloorPlan.tsx
    y_rel: 50, // Y coordinate %
    ai_config: { model_version: "v2.1", target_labels: ["spill", "debris"] },
    stats: { total_cleans: 0 }
  },
  {
    id: "restroom_a_floor_1", // Matches the NFC Tag ID in your Flutter App
    building_id: BUILDING_ID,
    location_label: "Restroom A (Men's)",
    floor_number: 1,
    x_rel: 45,
    y_rel: 20,
    ai_config: { model_version: "v3.0_sanitation", target_labels: ["paper_waste", "water_pool"] },
    stats: { total_cleans: 0 }
  },
  {
    id: "restroom_b_floor_1",
    building_id: BUILDING_ID,
    location_label: "Restroom B (Women's)",
    floor_number: 1,
    x_rel: 45,
    y_rel: 80,
    ai_config: { model_version: "v3.0_sanitation", target_labels: ["paper_waste", "water_pool"] },
    stats: { total_cleans: 0 }
  },
  {
    id: "cafeteria_zone_1",
    building_id: BUILDING_ID,
    location_label: "Cafeteria Seating",
    floor_number: 1,
    x_rel: 80,
    y_rel: 40,
    ai_config: { model_version: "v2.1", target_labels: ["food_waste", "tray"] },
    stats: { total_cleans: 0 }
  }
];

const buildingData = {
  id: BUILDING_ID,
  name: "Apex Tower HQ",
  address: { street: "123 Tech Blvd", city: "San Francisco", state: "CA", zip: "94107" },
  client_sla_config: {
    required_cleanings_per_day: 4,
    cleaning_window_start: "06:00",
    cleaning_window_end: "22:00"
  }
};

async function seed() {
  console.log("🌱 Seeding VeriClean Database...");

  // 1. Create Building
  await db.collection("buildings").doc(BUILDING_ID).set(buildingData);
  console.log(`✅ Building '${BUILDING_ID}' created.`);

  // 2. Create Checkpoints
  for (const cp of checkpoints) {
    await db.collection("checkpoints").doc(cp.id).set(cp);
    console.log(`   - Added Checkpoint: ${cp.location_label}`);
  }

  console.log("🚀 Database Seeded! Your Dashboard is ready.");
}

seed();