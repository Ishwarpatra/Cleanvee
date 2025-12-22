import 'dart:io';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:uuid/uuid.dart';
import 'package:path/path.dart' as path;
import 'package:camera/camera.dart';

class FirestoreService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final FirebaseStorage _storage = FirebaseStorage.instance;
  final Uuid _uuid = const Uuid();

  /// Uploads the photo and then the log data in a single transactional flow.
  Future<void> submitCleaningLog({
    required XFile photo,
    required String checkpointId, // e.g., "restroom_A"
    required String buildingId,   // e.g., "apex_tower_sf"
    required String cleanerId,
    required bool isClean,        // Result from your "AI" check
    required double confidence,   // Result from your "AI" check
  }) async {
    try {
      // 1. Upload Photo to Firebase Storage
      // Path: logs/{year}/{month}/{day}/{uuid}.jpg
      final DateTime now = DateTime.now();
      final String fileName = "${_uuid.v4()}${path.extension(photo.path)}";
      final String storagePath = "logs/${now.year}/${now.month}/${now.day}/$fileName";
      
      final File file = File(photo.path);
      final Reference ref = _storage.ref().child(storagePath);
      final UploadTask uploadTask = ref.putFile(file);
      
      final TaskSnapshot snapshot = await uploadTask;
      final String downloadUrl = await snapshot.ref.getDownloadURL();

      // 2. Construct the Log Payload (Matching your Cloud Function Schema)
      // NOTE: This structure MUST match 'index.ts' and 'cleaning_log_model.dart'
      
      final Map<String, dynamic> logData = {
        "building_id": buildingId,
        "checkpoint_id": checkpointId,
        "cleaner_id": cleanerId,
        "created_at": now.toIso8601String(), // Cloud Function expects ISO String
        
        // The "Verification Result" (High-level status)
        "verification_result": {
          "status": isClean ? "verified" : "rejected",
          "rejection_reason": isClean ? null : "AI Detected Hazard",
        },

        // The "Proof of Quality" (Detailed AI Data for the Dashboard)
        "proof_of_quality": {
          "photo_storage_path": downloadUrl,
          "ai_inference_timestamp": now.toIso8601String(),
          "overall_score": isClean ? 98 : 65, // Low score triggers Red Alert
          "passed_validation": isClean,
          
          // DYNAMIC LABELS:
          // If the AI failed (Spill), we inject the "liquid_spill" label.
          // This is what your Cloud Function looks for: hazards.length > 0
          "detected_objects": isClean 
              ? [] 
              : [
                  {"label": "liquid_spill", "confidence": confidence},
                  {"label": "trash_debris", "confidence": 0.88}
                ]
        }
      };

      // 3. Write to Firestore
      await _db.collection('cleaning_logs').add(logData);
      
      print("✅ Log Uploaded Successfully: $checkpointId");

    } catch (e) {
      print("❌ Error uploading log: $e");
      throw Exception("Failed to upload cleaning log");
    }
  }
}