/**
 * Seed Data Script for Firebase Emulator
 * 
 * This script populates the local Firestore emulator with test data
 * to test the SLA monitoring and alert generation features.
 * 
 * Usage:
 *   node seed_emulator.js
 * 
 * Prerequisite: Firebase emulators must be running on port 8080
 */

const admin = require("firebase-admin");

// Connect to Firestore Emulator
process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";

// Initialize without credentials (emulator mode)
admin.initializeApp({
    projectId: "vericlean-demo" // Use any project ID for emulator
});

const db = admin.firestore();

const BUILDING_ID = "apex_tower_sf";

// Calculate timestamps
const now = new Date();
const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000);
const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);

const checkpoints = [
    {
        id: "room-101",
        building_id: BUILDING_ID,
        location_label: "Room 101 - Conference",
        floor_number: 1,
        x_rel: 20,
        y_rel: 30,
        is_active: true,
        current_status: "OVERDUE",
        // This one hasn't been cleaned in 5 hours - should trigger alert!
        last_cleaned_at: fiveHoursAgo.toISOString(),
        last_cleaned_timestamp: admin.firestore.Timestamp.fromDate(fiveHoursAgo),
        ai_config: { model_version: "v2.1", target_labels: ["spill", "debris"] },
    },
    {
        id: "room-102",
        building_id: BUILDING_ID,
        location_label: "Room 102 - Meeting",
        floor_number: 1,
        x_rel: 45,
        y_rel: 30,
        is_active: true,
        current_status: "CLEAN",
        // This one was recently cleaned - should pass SLA
        last_cleaned_at: twoHoursAgo.toISOString(),
        last_cleaned_timestamp: admin.firestore.Timestamp.fromDate(twoHoursAgo),
        ai_config: { model_version: "v2.1", target_labels: ["spill", "debris"] },
    },
    {
        id: "lobby-main",
        building_id: BUILDING_ID,
        location_label: "Main Lobby",
        floor_number: 1,
        x_rel: 50,
        y_rel: 80,
        is_active: true,
        current_status: "CLEAN",
        // Recently cleaned
        last_cleaned_at: oneHourAgo.toISOString(),
        last_cleaned_timestamp: admin.firestore.Timestamp.fromDate(oneHourAgo),
        ai_config: { model_version: "v2.1", target_labels: ["footprint", "debris"] },
    },
    {
        id: "restroom-a",
        building_id: BUILDING_ID,
        location_label: "Restroom A (Men's)",
        floor_number: 1,
        x_rel: 80,
        y_rel: 20,
        is_active: true,
        current_status: "OVERDUE",
        // 6 hours ago - also overdue!
        last_cleaned_at: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
        last_cleaned_timestamp: admin.firestore.Timestamp.fromDate(
            new Date(now.getTime() - 6 * 60 * 60 * 1000)
        ),
        ai_config: { model_version: "v3.0_sanitation", target_labels: ["paper_waste", "water_pool"] },
    },
    {
        id: "inactive-room",
        building_id: BUILDING_ID,
        location_label: "Storage Room (Inactive)",
        floor_number: 1,
        x_rel: 90,
        y_rel: 90,
        is_active: false, // Should be skipped by SLA monitor
        current_status: "UNKNOWN",
        last_cleaned_at: null,
        last_cleaned_timestamp: null,
        ai_config: { model_version: "v2.1", target_labels: [] },
    },
];

const buildingData = {
    id: BUILDING_ID,
    name: "Apex Tower HQ",
    address: { street: "123 Tech Blvd", city: "San Francisco", state: "CA", zip: "94107" },
    client_sla_config: {
        required_cleanings_per_day: 6, // Every 4 hours
        cleaning_window_start: "06:00",
        cleaning_window_end: "22:00"
    }
};

// Sample cleaning log for testing the trigger
const sampleCleaningLog = {
    id: "test-log-001",
    cleaner_id: "user_test_001",
    checkpoint_id: "room-102",
    building_id: BUILDING_ID,
    sync_status: "synced",
    proof_of_presence: {
        nfc_tap_timestamp: now.toISOString(),
        nfc_payload_hash: "sha256:abc123def456",
        geo_location: {
            latitude: 37.7749,
            longitude: -122.4194,
            accuracy_meters: 5.0
        }
    },
    proof_of_quality: {
        photo_storage_path: "gs://vericlean-demo/test/photo.jpg",
        ai_inference_timestamp: now.toISOString(),
        ai_model_used: "gemini-1.5-flash",
        inference_time_ms: 1200,
        detected_objects: [],
        overall_score: 92,
        passed_validation: true
    },
    verification_result: {
        status: "verified",
        confidence: 0.95
    },
    created_at: now.toISOString()
};

// Sample low-score log to test alert generation
const lowScoreLog = {
    id: "test-log-002",
    cleaner_id: "user_test_001",
    checkpoint_id: "room-101",
    building_id: BUILDING_ID,
    sync_status: "synced",
    proof_of_presence: {
        nfc_tap_timestamp: now.toISOString(),
        nfc_payload_hash: "sha256:xyz789",
        geo_location: {
            latitude: 37.7749,
            longitude: -122.4194,
            accuracy_meters: 5.0
        }
    },
    proof_of_quality: {
        photo_storage_path: "gs://vericlean-demo/test/photo2.jpg",
        ai_inference_timestamp: now.toISOString(),
        ai_model_used: "gemini-1.5-flash",
        inference_time_ms: 1500,
        detected_objects: [
            { label: "trash", confidence: 0.88 }
        ],
        overall_score: 45, // LOW SCORE - should trigger alert!
        passed_validation: false
    },
    verification_result: {
        status: "rejected",
        rejection_reason: "Quality score too low"
    },
    created_at: now.toISOString()
};

async function seed() {
    console.log("🌱 Seeding VeriClean Emulator Database...\n");
    console.log("📅 Current time:", now.toISOString());
    console.log("⏰ 5 hours ago:", fiveHoursAgo.toISOString());
    console.log("\n");

    // 1. Create Building
    await db.collection("buildings").doc(BUILDING_ID).set(buildingData);
    console.log(`✅ Building '${buildingData.name}' created.`);

    // 2. Create Checkpoints
    console.log("\n📍 Creating Checkpoints:");
    for (const cp of checkpoints) {
        await db.collection("checkpoints").doc(cp.id).set(cp);
        const status = cp.is_active
            ? (cp.current_status === "OVERDUE" ? "⚠️ OVERDUE" : "✅ CLEAN")
            : "⏸️ INACTIVE";
        console.log(`   ${status} ${cp.location_label} (${cp.id})`);
    }

    // 3. Create sample cleaning logs (optional - uncomment to test triggers)
    console.log("\n📝 Sample Cleaning Logs:");
    console.log("   To test the trigger, create a log in the Firestore UI at localhost:4000");
    console.log("   or run: firebase functions:shell and call onLogCreated()");

    // Uncommenting these will trigger the functions if they're running
    // await db.collection("cleaning_logs").doc(sampleCleaningLog.id).set(sampleCleaningLog);
    // console.log(`   ✅ Created good log: ${sampleCleaningLog.id}`);
    // await db.collection("cleaning_logs").doc(lowScoreLog.id).set(lowScoreLog);
    // console.log(`   ⚠️ Created low-score log: ${lowScoreLog.id}`);

    console.log("\n" + "=".repeat(60));
    console.log("🚀 Database Seeded Successfully!");
    console.log("=".repeat(60));
    console.log("\n📋 Expected SLA Monitor Behavior:");
    console.log("   When you run checkSlaCompliance(), it should create alerts for:");
    console.log("   - room-101 (5 hours since last clean)");
    console.log("   - restroom-a (6 hours since last clean)");
    console.log("\n   It should SKIP:");
    console.log("   - room-102 (2 hours - within SLA)");
    console.log("   - lobby-main (1 hour - within SLA)");
    console.log("   - inactive-room (is_active = false)");
    console.log("\n🔗 Firestore UI: http://localhost:4000/firestore");
    console.log("🔗 Functions UI: http://localhost:4000/functions\n");
}

seed().catch(console.error);
