// lib/services/firestore_service.dart
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/checkpoint_model.dart';
import '../models/cleaning_log_model_v2.dart';

/// Singleton service for Firestore operations
/// Provides real-time streams for the dashboard
class FirestoreService {
  static final FirestoreService _instance = FirestoreService._internal();
  factory FirestoreService() => _instance;
  FirestoreService._internal();

  final FirebaseFirestore _db = FirebaseFirestore.instance;

  // Collection references
  CollectionReference<Map<String, dynamic>> get _checkpointsRef =>
      _db.collection('checkpoints');
  
  CollectionReference<Map<String, dynamic>> get _logsRef =>
      _db.collection('cleaning_logs');

  /// Stream of checkpoints for a building
  /// Updates in real-time via Firestore listeners
  Stream<List<Checkpoint>> checkpointsStream(String buildingId) {
    return _checkpointsRef
        .where('building_id', isEqualTo: buildingId)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => Checkpoint.fromFirestore(doc))
            .toList());
  }

  /// Stream of cleaning logs for the last 24 hours
  /// Sorted by creation time (most recent first)
  Stream<List<CleaningLogV2>> logsStream(String buildingId) {
    final yesterday = DateTime.now().subtract(const Duration(hours: 24));
    
    return _logsRef
        .where('building_id', isEqualTo: buildingId)
        .where('created_at', isGreaterThanOrEqualTo: yesterday.toIso8601String())
        .orderBy('created_at', descending: true)
        .limit(100)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => CleaningLogV2.fromFirestore(doc))
            .toList());
  }

  /// Combined stream of checkpoints and logs for the dashboard
  /// Emits whenever either collection updates
  Stream<DashboardData> dashboardStream(String buildingId) {
    return checkpointsStream(buildingId).asyncExpand((checkpoints) {
      return logsStream(buildingId).map((logs) {
        return DashboardData(
          checkpoints: checkpoints,
          logs: logs,
          lastUpdated: DateTime.now(),
        );
      });
    });
  }
}

/// Combined data model for dashboard
class DashboardData {
  final List<Checkpoint> checkpoints;
  final List<CleaningLogV2> logs;
  final DateTime lastUpdated;

  const DashboardData({
    required this.checkpoints,
    required this.logs,
    required this.lastUpdated,
  });

  /// Get the latest log for a specific checkpoint
  CleaningLogV2? getLatestLogForCheckpoint(String checkpointId) {
    try {
      return logs
          .where((log) => log.checkpointId == checkpointId)
          .reduce((a, b) => a.createdAt.isAfter(b.createdAt) ? a : b);
    } catch (_) {
      return null;
    }
  }
}
