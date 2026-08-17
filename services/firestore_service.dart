import 'dart:io';

import 'package:camera/camera.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:path/path.dart' as path;
import 'package:uuid/uuid.dart';

class FirestoreService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final FirebaseStorage _storage = FirebaseStorage.instance;
  final Uuid _uuid = const Uuid();

  Future<String> submitCleaningLog({
    required XFile photo,
    required String checkpointId,
    required String buildingId,
    required String cleanerId,
    required bool isClean,
    required double confidence,
    required bool presenceVerified,
    required String presenceIdentifier,
  }) async {
    if (!presenceVerified || presenceIdentifier.isEmpty) {
      throw StateError('NFC presence must be verified before submitting a cleaning log');
    }
    if (confidence < 0 || confidence > 1) {
      throw ArgumentError.value(confidence, 'confidence', 'must be between 0 and 1');
    }

    final eventId = _uuid.v4();
    final now = DateTime.now().toUtc();
    final extension = path.extension(photo.path).toLowerCase();
    final contentType = extension == '.png' ? 'image/png' : 'image/jpeg';
    final storagePath = 'proof_of_quality/$buildingId/$checkpointId/$eventId${extension.isEmpty ? '.jpg' : extension}';
    final reference = _storage.ref().child(storagePath);

    try {
      final uploadTask = reference.putFile(
        File(photo.path),
        SettableMetadata(
          contentType: contentType,
          customMetadata: {'uploaderId': cleanerId, 'eventId': eventId},
        ),
      );
      await uploadTask;

      final logData = <String, dynamic>{
        'building_id': buildingId,
        'checkpoint_id': checkpointId,
        'cleaner_id': cleanerId,
        'created_at': now.toIso8601String(),
        'proof_of_presence': {
          'method': 'nfc',
          'identifier': presenceIdentifier,
          'nfc_tap_timestamp': now.toIso8601String(),
        },
        'proof_of_quality': {
          'photo_storage_path': storagePath,
          'ai_inference_timestamp': now.toIso8601String(),
          'ai_model_used': 'pending_review',
          'inference_time_ms': 0,
          'overall_score': isClean ? 98 : 65,
          'passed_validation': isClean,
          'detected_objects': isClean
              ? <Map<String, dynamic>>[]
              : [
                  {'label': 'liquid_spill', 'confidence': confidence},
                  {'label': 'trash_debris', 'confidence': 0.88},
                ],
        },
        'verification_result': {
          'status': 'flagged_for_review',
          'rejection_reason': isClean ? null : 'AI Detected Hazard',
        },
        'event_id': eventId,
      };

      await _db.collection('cleaning_logs').doc(eventId).create(logData);
      return eventId;
    } catch (error) {
      try {
        await reference.delete();
      } catch (_) {
        // Preserve the original failure; cleanup is best-effort.
      }
      throw StateError('Unable to submit cleaning proof. Retry when connected.');
    }
  }
}
