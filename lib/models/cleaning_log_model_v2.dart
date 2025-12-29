// lib/models/cleaning_log_model_v2.dart
import 'package:cloud_firestore/cloud_firestore.dart';

/// Sync status for offline-first architecture
enum SyncStatus {
  synced,
  pendingUpload,
}

/// Log verification status
enum LogStatus {
  verified,
  rejected,
  flaggedForReview,
}

/// Detected object from AI inference
class DetectedObject {
  final String label;
  final double confidence;
  final BoundingBox boundingBox;

  const DetectedObject({
    required this.label,
    required this.confidence,
    required this.boundingBox,
  });

  factory DetectedObject.fromMap(Map<String, dynamic> map) {
    return DetectedObject(
      label: map['label'] ?? '',
      confidence: (map['confidence'] ?? 0).toDouble(),
      boundingBox: BoundingBox.fromMap(map['bounding_box'] ?? {}),
    );
  }
}

/// Bounding box for detected objects
class BoundingBox {
  final double x, y, w, h;

  const BoundingBox({
    required this.x,
    required this.y,
    required this.w,
    required this.h,
  });

  factory BoundingBox.fromMap(Map<String, dynamic> map) {
    return BoundingBox(
      x: (map['x'] ?? 0).toDouble(),
      y: (map['y'] ?? 0).toDouble(),
      w: (map['w'] ?? 0).toDouble(),
      h: (map['h'] ?? 0).toDouble(),
    );
  }
}

/// Geolocation data
class GeoLocation {
  final double latitude;
  final double longitude;
  final double accuracyMeters;

  const GeoLocation({
    required this.latitude,
    required this.longitude,
    required this.accuracyMeters,
  });

  factory GeoLocation.fromMap(Map<String, dynamic> map) {
    return GeoLocation(
      latitude: (map['latitude'] ?? 0).toDouble(),
      longitude: (map['longitude'] ?? 0).toDouble(),
      accuracyMeters: (map['accuracy_meters'] ?? 0).toDouble(),
    );
  }
}

/// Proof of Presence - NFC + GPS verification
class ProofOfPresence {
  final DateTime nfcTapTimestamp;
  final String nfcPayloadHash;
  final GeoLocation? geoLocation;

  const ProofOfPresence({
    required this.nfcTapTimestamp,
    required this.nfcPayloadHash,
    this.geoLocation,
  });

  factory ProofOfPresence.fromMap(Map<String, dynamic> map) {
    return ProofOfPresence(
      nfcTapTimestamp: DateTime.parse(map['nfc_tap_timestamp'] ?? DateTime.now().toIso8601String()),
      nfcPayloadHash: map['nfc_payload_hash'] ?? '',
      geoLocation: map['geo_location'] != null 
          ? GeoLocation.fromMap(map['geo_location']) 
          : null,
    );
  }
}

/// Proof of Quality - AI verification result
class ProofOfQuality {
  final String photoStoragePath;
  final DateTime aiInferenceTimestamp;
  final String aiModelUsed;
  final int inferenceTimeMs;
  final List<DetectedObject> detectedObjects;
  final int overallScore; // 0-100
  final bool passedValidation;
  final bool odorCheckPassed;   // Manual toggle for non-visual quality
  final bool suppliesRestocked; // Manual toggle for hygiene supplies

  const ProofOfQuality({
    required this.photoStoragePath,
    required this.aiInferenceTimestamp,
    required this.aiModelUsed,
    required this.inferenceTimeMs,
    required this.detectedObjects,
    required this.overallScore,
    required this.passedValidation,
    required this.odorCheckPassed,
    required this.suppliesRestocked,
  });

  factory ProofOfQuality.fromMap(Map<String, dynamic> map) {
    return ProofOfQuality(
      photoStoragePath: map['photo_storage_path'] ?? '',
      aiInferenceTimestamp: DateTime.parse(map['ai_inference_timestamp'] ?? DateTime.now().toIso8601String()),
      aiModelUsed: map['ai_model_used'] ?? 'unknown',
      inferenceTimeMs: map['inference_time_ms'] ?? 0,
      detectedObjects: (map['detected_objects'] as List<dynamic>?)
          ?.map((e) => DetectedObject.fromMap(e))
          .toList() ?? [],
      overallScore: _calculateWeightedScore(
        (map['overall_score'] ?? 0).toInt(),
        map['odor_check_passed'] ?? false,
        map['supplies_restocked'] ?? false,
      ),
      passedValidation: map['passed_validation'] ?? false,
      odorCheckPassed: map['odor_check_passed'] ?? false,
      suppliesRestocked: map['supplies_restocked'] ?? false,
    );
  }

  /// Calculates a weighted average of AI Vision (70%) and Manual Checks (30%)
  static int _calculateWeightedScore(int aiScore, bool odor, bool supplies) {
    double manualScore = (odor ? 50.0 : 0.0) + (supplies ? 50.0 : 0.0);
    return ((aiScore * 0.7) + (manualScore * 0.3)).round();
  }
}

/// Verification result from backend
class VerificationResult {
  final LogStatus status;
  final String? rejectionReason;

  const VerificationResult({
    required this.status,
    this.rejectionReason,
  });

  factory VerificationResult.fromMap(Map<String, dynamic> map) {
    return VerificationResult(
      status: _parseLogStatus(map['status']),
      rejectionReason: map['rejection_reason'],
    );
  }

  static LogStatus _parseLogStatus(String? status) {
    switch (status) {
      case 'verified': return LogStatus.verified;
      case 'rejected': return LogStatus.rejected;
      case 'flagged_for_review': return LogStatus.flaggedForReview;
      default: return LogStatus.flaggedForReview;
    }
  }
}

/// Complete Cleaning Log model
class CleaningLogV2 {
  final String id;
  final String cleanerId;
  final String checkpointId;
  final String buildingId;
  final SyncStatus syncStatus;
  final ProofOfPresence proofOfPresence;
  final ProofOfQuality? proofOfQuality;
  final VerificationResult verificationResult;
  final DateTime createdAt;

  const CleaningLogV2({
    required this.id,
    required this.cleanerId,
    required this.checkpointId,
    required this.buildingId,
    required this.syncStatus,
    required this.proofOfPresence,
    this.proofOfQuality,
    required this.verificationResult,
    required this.createdAt,
  });

  /// Factory for Firestore deserialization
  factory CleaningLogV2.fromFirestore(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data()!;
    return CleaningLogV2(
      id: doc.id,
      cleanerId: data['cleaner_id'] ?? '',
      checkpointId: data['checkpoint_id'] ?? '',
      buildingId: data['building_id'] ?? '',
      syncStatus: data['sync_status'] == 'synced' 
          ? SyncStatus.synced 
          : SyncStatus.pendingUpload,
      proofOfPresence: ProofOfPresence.fromMap(data['proof_of_presence'] ?? {}),
      proofOfQuality: data['proof_of_quality'] != null 
          ? ProofOfQuality.fromMap(data['proof_of_quality']) 
          : null,
      verificationResult: VerificationResult.fromMap(data['verification_result'] ?? {}),
      createdAt: DateTime.parse(data['created_at'] ?? DateTime.now().toIso8601String()),
    );
  }

  /// Check if this log represents a verified cleaning
  bool get isVerified => verificationResult.status == LogStatus.verified;

  /// Check if this log has quality issues
  bool get hasFailed => verificationResult.status == LogStatus.rejected;
}
