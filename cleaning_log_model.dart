// lib/models/cleaning_log_model.dart
import 'package:cloud_firestore/cloud_firestore.dart';

class CleaningLog {
  final String id;
  final String cleanerId;
  final String checkpointId;
  final String buildingId;
  final DateTime createdAt;
  final Map<String, dynamic>? proofOfQuality;
  final Map<String, dynamic> verificationResult;

  CleaningLog({
    required this.id,
    required this.cleanerId,
    required this.checkpointId,
    required this.buildingId,
    required this.createdAt,
    this.proofOfQuality,
    required this.verificationResult,
  });

  Map<String, dynamic> toMap() {
    return {
      'cleaner_id': cleanerId,
      'checkpoint_id': checkpointId,
      'building_id': buildingId,
      'created_at': createdAt.toIso8601String(), // Required by Cloud Functions
      'proof_of_quality': proofOfQuality,
      'verification_result': verificationResult,
    };
  }
}