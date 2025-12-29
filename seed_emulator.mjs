/**
 * Seed Data Script for Firebase Emulator (CommonJS version)
 * 
 * Usage:
 *   node seed_emulator.cjs
 * 
 * Prerequisite: Firebase emulators must be running on port 8080
 */

// Use dynamic import for firebase-admin
async function main() {
    // Set emulator host BEFORE importing firebase-admin
    process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";

    const admin = await import("firebase-admin");

    // Initialize without credentials (emulator mode)
    if (!admin.default.apps.length) {
        admin.default.initializeApp({
            projectId: "vericlean-demo"
        });
    }

    const db = admin.default.firestore();
    const Timestamp = admin.default.firestore.Timestamp;

    const BUILDING_ID = "apex_tower_sf";

    // Calculate timestamps
    const now = new Date();
    const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000);
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
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
            last_cleaned_at: fiveHoursAgo.toISOString(),
            last_cleaned_timestamp: Timestamp.fromDate(fiveHoursAgo),
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
            last_cleaned_at: twoHoursAgo.toISOString(),
            last_cleaned_timestamp: Timestamp.fromDate(twoHoursAgo),
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
            last_cleaned_at: oneHourAgo.toISOString(),
            last_cleaned_timestamp: Timestamp.fromDate(oneHourAgo),
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
            last_cleaned_at: sixHoursAgo.toISOString(),
            last_cleaned_timestamp: Timestamp.fromDate(sixHoursAgo),
            ai_config: { model_version: "v3.0_sanitation", target_labels: ["paper_waste", "water_pool"] },
        },
        {
            id: "inactive-room",
            building_id: BUILDING_ID,
            location_label: "Storage Room (Inactive)",
            floor_number: 1,
            x_rel: 90,
            y_rel: 90,
            is_active: false,
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
            required_cleanings_per_day: 6,
            cleaning_window_start: "06:00",
            cleaning_window_end: "22:00"
        }
    };

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
        const { id, ...data } = cp;
        await db.collection("checkpoints").doc(id).set(data);
        const status = cp.is_active
            ? (cp.current_status === "OVERDUE" ? "⚠️ OVERDUE" : "✅ CLEAN")
            : "⏸️ INACTIVE";
        console.log(`   ${status} ${cp.location_label} (${id})`);
    }

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

main().catch(console.error);
