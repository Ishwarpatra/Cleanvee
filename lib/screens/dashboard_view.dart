// lib/screens/dashboard_view.dart
import 'package:flutter/material.dart';
import '../services/firestore_service.dart';
import '../models/checkpoint_model.dart';
import '../models/cleaning_log_model_v2.dart';
import '../widgets/room_status_card.dart';

/// Manager Command Center Dashboard
/// 
/// Displays a real-time grid of rooms with color-coded status indicators.
/// Uses StreamBuilder for live Firestore updates (<2s latency).
class DashboardView extends StatefulWidget {
  final String buildingId;
  
  const DashboardView({
    super.key,
    required this.buildingId,
  });

  @override
  State<DashboardView> createState() => _DashboardViewState();
}

class _DashboardViewState extends State<DashboardView> {
  final FirestoreService _firestoreService = FirestoreService();
  String? _selectedCheckpointId;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB), // gray-50
      appBar: _buildAppBar(),
      body: StreamBuilder<DashboardData>(
        stream: _firestoreService.dashboardStream(widget.buildingId),
        builder: (context, snapshot) {
          // Loading State
          if (snapshot.connectionState == ConnectionState.waiting) {
            return _buildLoadingState();
          }

          // Error State
          if (snapshot.hasError) {
            return _buildErrorState(snapshot.error.toString());
          }

          // No Data State
          if (!snapshot.hasData || snapshot.data!.checkpoints.isEmpty) {
            return _buildEmptyState();
          }

          final data = snapshot.data!;
          return _buildDashboard(data);
        },
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      backgroundColor: Colors.white,
      elevation: 0,
      shadowColor: Colors.black12,
      surfaceTintColor: Colors.transparent,
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFFEFF6FF), // blue-50
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(
              Icons.dashboard_rounded,
              color: Color(0xFF2563EB), // blue-600
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Command Center',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF111827), // gray-900
                ),
              ),
              Text(
                'Live Building Status',
                style: TextStyle(
                  fontSize: 12,
                  color: Color(0xFF6B7280), // gray-500
                ),
              ),
            ],
          ),
        ],
      ),
      actions: [
        // Legend
        Padding(
          padding: const EdgeInsets.only(right: 16),
          child: Row(
            children: [
              _buildLegendItem(const Color(0xFF10B981), 'Clean'),
              const SizedBox(width: 12),
              _buildLegendItem(const Color(0xFFF59E0B), 'Review'),
              const SizedBox(width: 12),
              _buildLegendItem(const Color(0xFFEF4444), 'Hazard', pulse: true),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildLegendItem(Color color, String label, {bool pulse = false}) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: color.withOpacity(0.4),
                blurRadius: 4,
              ),
            ],
          ),
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w500,
            color: Color(0xFF374151), // gray-700
          ),
        ),
      ],
    );
  }

  Widget _buildLoadingState() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF2563EB)),
          ),
          SizedBox(height: 16),
          Text(
            'Connecting to Cleanvee Live...',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Color(0xFF111827),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState(String error) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.error_outline,
            color: Color(0xFFEF4444),
            size: 48,
          ),
          const SizedBox(height: 16),
          const Text(
            'Connection Error',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Color(0xFF111827),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            error,
            style: const TextStyle(
              fontSize: 14,
              color: Color(0xFF6B7280),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.room_preferences_outlined,
            color: Color(0xFF9CA3AF),
            size: 48,
          ),
          SizedBox(height: 16),
          Text(
            'No Checkpoints Found',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Color(0xFF111827),
            ),
          ),
          SizedBox(height: 8),
          Text(
            'Add checkpoints to this building to start monitoring.',
            style: TextStyle(
              fontSize: 14,
              color: Color(0xFF6B7280),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDashboard(DashboardData data) {
    return Column(
      children: [
        // Stats Overview
        _buildStatsBar(data),
        
        // Room Grid
        Expanded(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: LayoutBuilder(
              builder: (context, constraints) {
                // Responsive grid columns
                int crossAxisCount = 1;
                if (constraints.maxWidth > 1200) {
                  crossAxisCount = 4;
                } else if (constraints.maxWidth > 900) {
                  crossAxisCount = 3;
                } else if (constraints.maxWidth > 600) {
                  crossAxisCount = 2;
                }

                return GridView.builder(
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: crossAxisCount,
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 16,
                    childAspectRatio: 1.6,
                  ),
                  itemCount: data.checkpoints.length,
                  itemBuilder: (context, index) {
                    final checkpoint = data.checkpoints[index];
                    final lastLog = data.getLatestLogForCheckpoint(checkpoint.id);

                    return RoomStatusCard(
                      checkpoint: checkpoint,
                      lastLog: lastLog,
                      onTap: () => _onCheckpointSelected(checkpoint),
                    );
                  },
                );
              },
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStatsBar(DashboardData data) {
    // Calculate stats
    int cleanCount = 0;
    int warningCount = 0;
    int criticalCount = 0;

    for (final checkpoint in data.checkpoints) {
      final log = data.getLatestLogForCheckpoint(checkpoint.id);
      if (log == null || !log.isVerified) {
        criticalCount++;
      } else {
        final hours = DateTime.now().difference(log.createdAt).inHours;
        if (hours > 8) {
          criticalCount++;
        } else if (hours > 4) {
          warningCount++;
        } else {
          cleanCount++;
        }
      }
    }

    return Container(
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildStatItem(
            icon: Icons.check_circle,
            color: const Color(0xFF10B981),
            label: 'Clean',
            value: cleanCount.toString(),
          ),
          _buildDivider(),
          _buildStatItem(
            icon: Icons.access_time,
            color: const Color(0xFFF59E0B),
            label: 'Due Soon',
            value: warningCount.toString(),
          ),
          _buildDivider(),
          _buildStatItem(
            icon: Icons.warning,
            color: const Color(0xFFEF4444),
            label: 'Attention',
            value: criticalCount.toString(),
          ),
          _buildDivider(),
          _buildStatItem(
            icon: Icons.room,
            color: const Color(0xFF6B7280),
            label: 'Total',
            value: data.checkpoints.length.toString(),
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem({
    required IconData icon,
    required Color color,
    required String label,
    required String value,
  }) {
    return Column(
      children: [
        Row(
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(width: 8),
            Text(
              value,
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: Color(0xFF6B7280),
          ),
        ),
      ],
    );
  }

  Widget _buildDivider() {
    return Container(
      height: 40,
      width: 1,
      color: const Color(0xFFE5E7EB),
    );
  }

  void _onCheckpointSelected(Checkpoint checkpoint) {
    setState(() {
      _selectedCheckpointId = checkpoint.id;
    });
    
    // Show detail modal
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _buildCheckpointDetail(checkpoint),
    );
  }

  Widget _buildCheckpointDetail(Checkpoint checkpoint) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.6,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        children: [
          // Handle
          Container(
            margin: const EdgeInsets.only(top: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey[300],
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          // Header
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      checkpoint.locationLabel,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Level ${checkpoint.floorNumber} • Model: ${checkpoint.aiConfig.modelVersion}',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
          ),
          const Divider(),
          // Content placeholder
          Expanded(
            child: Center(
              child: Text(
                'Checkpoint ID: ${checkpoint.id}',
                style: TextStyle(color: Colors.grey[600]),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
