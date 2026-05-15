import 'package:flutter/material.dart';
import 'package:hive/hive.dart';
import 'package:logger/logger.dart';

enum SyncStatus { SYNCED, PENDING, FAILED }

class SyncProvider extends ChangeNotifier {
  final Logger _logger = Logger();
  bool _isSyncing = false;
  
  bool get isSyncing => _isSyncing;

  Future<void> initializeHive() async {
    // In main.dart, Hive.initFlutter() should be called first.
    // Register adapters here...
    await Hive.openBox('offline_logs');
    _logger.i('Hive offline storage initialized.');
  }

  Future<void> saveLogOffline(Map<String, dynamic> logData) async {
    final box = Hive.box('offline_logs');
    
    // Add sync status
    logData['sync_status'] = SyncStatus.PENDING.name;
    logData['local_id'] = DateTime.now().millisecondsSinceEpoch.toString();
    
    await box.put(logData['local_id'], logData);
    _logger.i('Log saved offline. Pending sync.');
    notifyListeners();
    
    // Attempt sync immediately if possible
    _attemptSync();
  }

  Future<void> _attemptSync() async {
    if (_isSyncing) return;
    
    _isSyncing = true;
    notifyListeners();
    
    try {
      final box = Hive.box('offline_logs');
      final pendingLogs = box.values.where((log) => log['sync_status'] == SyncStatus.PENDING.name).toList();
      
      if (pendingLogs.isEmpty) {
        _isSyncing = false;
        notifyListeners();
        return;
      }
      
      _logger.i('Attempting to sync ${pendingLogs.length} logs...');
      
      // Real implementation would iterate over logs and push to Firestore via Firebase Cloud Functions / API.
      // If successful:
      // box.delete(log['local_id']);
      
      // Mock network delay
      await Future.delayed(const Duration(seconds: 2));
      
      _logger.i('Sync complete.');
    } catch (e) {
      _logger.e('Sync failed: $e');
      // Fix #85: implement retry logic and FAILED status
    } finally {
      _isSyncing = false;
      notifyListeners();
    }
  }
}
