// lib/widgets/room_status_card.dart
import 'package:flutter/material.dart';
import '../models/checkpoint_model.dart';
import '../models/cleaning_log_model_v2.dart';

/// Status information for display
class RoomStatusInfo {
  final Color backgroundColor;
  final Color borderColor;
  final Color textColor;
  final IconData icon;
  final Color iconColor;
  final String statusText;
  final String statusLevel; // 'good', 'warning', 'critical'

  const RoomStatusInfo({
    required this.backgroundColor,
    required this.borderColor,
    required this.textColor,
    required this.icon,
    required this.iconColor,
    required this.statusText,
    required this.statusLevel,
  });

  /// Green status - Clean & Verified
  static RoomStatusInfo good() => const RoomStatusInfo(
    backgroundColor: Color(0xFFECFDF5), // emerald-50
    borderColor: Color(0xFFA7F3D0), // emerald-200
    textColor: Color(0xFF047857), // emerald-700
    icon: Icons.check_circle,
    iconColor: Color(0xFF10B981), // emerald-500
    statusText: 'Clean & Verified',
    statusLevel: 'good',
  );

  /// Yellow status - Due Soon
  static RoomStatusInfo warning(int hoursSince) => RoomStatusInfo(
    backgroundColor: const Color(0xFFFFFBEB), // amber-50
    borderColor: const Color(0xFFFDE68A), // amber-200
    textColor: const Color(0xFFB45309), // amber-700
    icon: Icons.access_time,
    iconColor: const Color(0xFFF59E0B), // amber-500
    statusText: 'Due Soon (${hoursSince}h ago)',
    statusLevel: 'warning',
  );

  /// Red status - Critical
  static RoomStatusInfo critical(String reason) => RoomStatusInfo(
    backgroundColor: const Color(0xFFFEF2F2), // red-50
    borderColor: const Color(0xFFFECACA), // red-200
    textColor: const Color(0xFFB91C1C), // red-700
    icon: reason == 'failed' ? Icons.cancel : Icons.warning,
    iconColor: const Color(0xFFEF4444), // red-500
    statusText: reason == 'failed' ? 'Cleaning Failed' : reason,
    statusLevel: 'critical',
  );

  /// Gray status - Never cleaned
  static RoomStatusInfo neverCleaned() => const RoomStatusInfo(
    backgroundColor: Color(0xFFFEF2F2), // red-50
    borderColor: Color(0xFFFECACA), // red-200
    textColor: Color(0xFFB91C1C), // red-700
    icon: Icons.block,
    iconColor: Color(0xFFEF4444), // red-500
    statusText: 'Never Cleaned',
    statusLevel: 'critical',
  );
}

/// Room status card widget for dashboard grid
class RoomStatusCard extends StatelessWidget {
  final Checkpoint checkpoint;
  final CleaningLogV2? lastLog;
  final VoidCallback? onTap;

  const RoomStatusCard({
    super.key,
    required this.checkpoint,
    this.lastLog,
    this.onTap,
  });

  /// Calculate room status based on log data
  /// Matches logic from DashboardGrid.tsx
  RoomStatusInfo _getRoomStatus() {
    if (lastLog == null) {
      return RoomStatusInfo.neverCleaned();
    }

    final now = DateTime.now();
    final hoursDiff = now.difference(lastLog!.createdAt).inHours;

    // Check if verification failed
    if (!lastLog!.isVerified) {
      return RoomStatusInfo.critical('failed');
    }

    // Check time thresholds
    if (hoursDiff > 8) {
      return RoomStatusInfo.critical('Overdue (+${hoursDiff}h)');
    }

    if (hoursDiff > 4) {
      return RoomStatusInfo.warning(hoursDiff);
    }

    return RoomStatusInfo.good();
  }

  String _formatTime(DateTime dateTime) {
    final hour = dateTime.hour.toString().padLeft(2, '0');
    final minute = dateTime.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }

  @override
  Widget build(BuildContext context) {
    final status = _getRoomStatus();

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: status.backgroundColor,
          border: Border.all(color: status.borderColor),
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Room Info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        checkpoint.locationLabel,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                          color: Color(0xFF111827), // gray-900
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Level ${checkpoint.floorNumber}',
                        style: TextStyle(
                          fontSize: 11,
                          color: Colors.grey[500],
                          fontFamily: 'monospace',
                        ),
                      ),
                    ],
                  ),
                ),
                // Status Icon
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 2,
                      ),
                    ],
                  ),
                  child: Icon(
                    status.icon,
                    color: status.iconColor,
                    size: 20,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            
            // Status Row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Status',
                  style: TextStyle(
                    fontSize: 13,
                    color: Color(0xFF6B7280), // gray-500
                  ),
                ),
                Text(
                  status.statusText,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: status.textColor,
                  ),
                ),
              ],
            ),

            // Last Cleaned Info
            if (lastLog != null) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.only(top: 8),
                decoration: const BoxDecoration(
                  border: Border(
                    top: BorderSide(
                      color: Color(0x0D000000), // black/5
                    ),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Last: ${_formatTime(lastLog!.createdAt)}',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey[500],
                      ),
                    ),
                    if (lastLog!.proofOfQuality != null)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          border: Border.all(color: const Color(0xFFE5E7EB)),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          'Score: ${lastLog!.proofOfQuality!.overallScore}%',
                          style: const TextStyle(
                            fontSize: 10,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
