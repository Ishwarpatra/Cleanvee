// lib/models/checkpoint_model.dart
import 'package:cloud_firestore/cloud_firestore.dart';

/// AI Configuration for a checkpoint
class AiConfig {
  final String modelVersion;
  final List<String> targetLabels;

  const AiConfig({
    required this.modelVersion,
    required this.targetLabels,
  });

  factory AiConfig.fromMap(Map<String, dynamic> map) {
    return AiConfig(
      modelVersion: map['model_version'] ?? 'unknown',
      targetLabels: List<String>.from(map['target_labels'] ?? []),
    );
  }

  Map<String, dynamic> toMap() => {
    'model_version': modelVersion,
    'target_labels': targetLabels,
  };
}

/// Room status enum matching dashboard logic
enum RoomStatus {
  clean,      // Green - verified within 4 hours
  attention,  // Yellow - 4-8 hours since last clean
  dirty,      // Red - failed verification or overdue
  unknown,    // Gray - no data
}

/// Checkpoint model representing a room/area to be cleaned
class Checkpoint {
  final String id;
  final String buildingId;
  final String locationLabel;
  final int floorNumber;
  final double xRel; // 0-100 for floor plan visualization
  final double yRel; // 0-100 for floor plan visualization
  final AiConfig aiConfig;
  final RoomStatus? currentStatus;

  const Checkpoint({
    required this.id,
    required this.buildingId,
    required this.locationLabel,
    required this.floorNumber,
    required this.xRel,
    required this.yRel,
    required this.aiConfig,
    this.currentStatus,
  });

  /// Factory constructor for Firestore deserialization
  factory Checkpoint.fromFirestore(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data()!;
    return Checkpoint(
      id: doc.id,
      buildingId: data['building_id'] ?? '',
      locationLabel: data['location_label'] ?? 'Unknown Room',
      floorNumber: data['floor_number'] ?? 1,
      xRel: (data['x_rel'] ?? 50).toDouble(),
      yRel: (data['y_rel'] ?? 50).toDouble(),
      aiConfig: AiConfig.fromMap(data['ai_config'] ?? {}),
      currentStatus: _parseStatus(data['current_status']),
    );
  }

  /// Parse status string to enum
  static RoomStatus? _parseStatus(String? status) {
    switch (status) {
      case 'clean': return RoomStatus.clean;
      case 'attention': return RoomStatus.attention;
      case 'dirty': return RoomStatus.dirty;
      default: return RoomStatus.unknown;
    }
  }

  /// Convert to map for Firestore
  Map<String, dynamic> toMap() => {
    'building_id': buildingId,
    'location_label': locationLabel,
    'floor_number': floorNumber,
    'x_rel': xRel,
    'y_rel': yRel,
    'ai_config': aiConfig.toMap(),
    'current_status': currentStatus?.name,
  };
}
