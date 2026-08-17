import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:hive_flutter/hive_flutter.dart';

class CleaningLog {
  final String id;
  final String checkpointId;
  final String buildingId;
  final String workerId;
  final DateTime timestamp;
  final String status;
  final String? photoUrl;
  final Map<String, dynamic>? verificationResult;
  final bool synced;

  CleaningLog({
    required this.id,
    required this.checkpointId,
    required this.buildingId,
    required this.workerId,
    required this.timestamp,
    required this.status,
    this.photoUrl,
    this.verificationResult,
    this.synced = false,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'checkpoint_id': checkpointId,
      'building_id': buildingId,
      'cleaner_id': workerId,
      'created_at': Timestamp.fromDate(timestamp.toUtc()),
      'status': status,
      'photo_url': photoUrl,
      'verification_result': verificationResult,
      'synced': synced,
    };
  }

  factory CleaningLog.fromMap(Map<String, dynamic> map) {
    return CleaningLog(
      id: map['id'] ?? '',
      checkpointId: map['checkpoint_id'] ?? '',
      buildingId: map['building_id'] ?? '',
      workerId: map['cleaner_id'] ?? map['worker_id'] ?? '',
      timestamp: _readTimestamp(map['created_at'] ?? map['timestamp']),
      status: map['status'] ?? 'pending',
      photoUrl: map['photo_url'],
      verificationResult: map['verification_result'],
      synced: map['synced'] ?? false,
    );
  }
}

DateTime _readTimestamp(dynamic value) {
  if (value is Timestamp) return value.toDate().toUtc();
  if (value is DateTime) return value.toUtc();
  if (value is String) return DateTime.tryParse(value)?.toUtc() ?? DateTime.now().toUtc();
  return DateTime.now().toUtc();
}

class CleaningLogProvider extends ChangeNotifier {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final Connectivity _connectivity = Connectivity();

  List<CleaningLog> _logs = [];
  bool _isLoading = false;
  String? _error;
  bool _isOnline = true;

  List<CleaningLog> get logs => _logs;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isOnline => _isOnline;

  CleaningLogProvider() {
    _initializeConnectivity();
    _initializeOfflineStorage();
  }

  void _initializeConnectivity() {
    _connectivity.onConnectivityChanged.listen((result) {
      _isOnline = result != ConnectivityResult.none;
      if (_isOnline) {
        _syncOfflineLogs();
      }
      notifyListeners();
    });
  }

  Future<void> _initializeOfflineStorage() async {
    try {
      await Hive.initFlutter();
      await Hive.openBox<Map>('cleaning_logs');
    } catch (e) {
      _error = 'Failed to initialize offline storage: $e';
    }
  }

  Future<void> loadLogs(String buildingId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      if (_isOnline) {
        final snapshot = await _firestore
            .collection('cleaning_logs')
            .where('building_id', isEqualTo: buildingId)
            .orderBy('created_at', descending: true)
            .limit(100)
            .get();

        _logs = snapshot.docs
            .map((doc) => CleaningLog.fromMap({...doc.data(), 'id': doc.id}))
            .toList();

        // Cache to offline storage
        final box = Hive.box<Map>('cleaning_logs');
        await box.clear();
        for (final log in _logs) {
          await box.put(log.id, log.toMap());
        }
      } else {
        // Load from offline storage
        final box = Hive.box<Map>('cleaning_logs');
        _logs = box.values
            .map((map) => CleaningLog.fromMap(Map<String, dynamic>.from(map)))
            .toList();
      }
    } catch (e) {
      _error = 'Failed to load logs: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> submitLog(CleaningLog log) async {
    try {
      final logData = log.toMap();

      if (_isOnline) {
        // Submit directly to Firestore
        await _firestore.collection('cleaning_logs').doc(log.id).set(log.toMap(), SetOptions(merge: false));
        logMap['synced'] = true;
      } else {
        // Store offline
        logData['synced'] = false;
      }

      // Update local cache
      final box = Hive.box<Map>('cleaning_logs');
      await box.put(log.id, logData);

      _logs = [
        CleaningLog.fromMap(logData),
        ..._logs.where((l) => l.id != log.id),
      ];
      notifyListeners();
      return true;
    } catch (e) {
      _error = 'Failed to submit log: $e';
      notifyListeners();
      return false;
    }
  }

  Future<void> _syncOfflineLogs() async {
    try {
      final box = Hive.box<Map>('cleaning_logs');
      final unsyncedLogs = box.values
          .where((map) => !(map['synced'] as bool? ?? false))
          .toList();

      for (final logMap in unsyncedLogs) {
        final log = CleaningLog.fromMap(Map<String, dynamic>.from(logMap));
        await _firestore.collection('cleaning_logs').doc(log.id).set(log.toMap(), SetOptions(merge: false));
        logMap['synced'] = true;
        await box.put(log.id, logMap);
      }

      notifyListeners();
    } catch (e) {
      _error = 'Failed to sync offline logs: $e';
      notifyListeners();
    }
  }
}
