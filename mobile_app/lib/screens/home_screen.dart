import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/cleaning_log_provider.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 0;

  @override
  void initState() {
    super.initState();
    _loadInitialData();
  }

  void _loadInitialData() {
    final authProvider = context.read<AuthProvider>();
    if (authProvider.currentUser != null &&
        authProvider.currentUser!.assignedBuildingIds.isNotEmpty) {
      final logProvider = context.read<CleaningLogProvider>();
      logProvider.loadLogs(authProvider.currentUser!.assignedBuildingIds.first);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Cleanvee'),
        elevation: 0,
        actions: [
          Consumer<AuthProvider>(
            builder: (context, authProvider, _) {
              return PopupMenuButton(
                itemBuilder: (context) => [
                  PopupMenuItem(
                    child: const Text('Profile'),
                    onTap: () {
                      // Navigate to profile
                    },
                  ),
                  PopupMenuItem(
                    child: const Text('Settings'),
                    onTap: () {
                      // Navigate to settings
                    },
                  ),
                  const PopupMenuDivider(),
                  PopupMenuItem(
                    child: const Text('Sign Out'),
                    onTap: () async {
                      await authProvider.logout();
                      if (mounted) {
                        Navigator.of(context).pushReplacementNamed('/login');
                      }
                    },
                  ),
                ],
              );
            },
          ),
        ],
      ),
      body: Consumer2<AuthProvider, CleaningLogProvider>(
        builder: (context, authProvider, logProvider, _) {
          if (authProvider.currentUser == null) {
            return const Center(child: CircularProgressIndicator());
          }

          return IndexedStack(
            index: _selectedIndex,
            children: [
              _buildDashboardTab(context, authProvider, logProvider),
              _buildLogsTab(context, logProvider),
              _buildProfileTab(context, authProvider),
            ],
          );
        },
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: (index) {
          setState(() {
            _selectedIndex = index;
          });
        },
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.list),
            label: 'Logs',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }

  Widget _buildDashboardTab(
    BuildContext context,
    AuthProvider authProvider,
    CleaningLogProvider logProvider,
  ) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Welcome card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Welcome, ${authProvider.currentUser?.displayName}!',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Role: ${authProvider.currentUser?.role.toString().split('.').last.toUpperCase()}',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.grey.shade600,
                        ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          // Status card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Icon(
                    logProvider.isOnline ? Icons.cloud_done : Icons.cloud_off,
                    color: logProvider.isOnline ? Colors.green : Colors.orange,
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        logProvider.isOnline ? 'Online' : 'Offline',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      Text(
                        logProvider.isOnline
                            ? 'Connected to cloud'
                            : 'Working offline',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          // Recent logs
          Text(
            'Recent Logs',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 12),
          if (logProvider.isLoading)
            const Center(child: CircularProgressIndicator())
          else if (logProvider.logs.isEmpty)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Center(
                  child: Text(
                    'No logs yet',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.grey.shade600,
                        ),
                  ),
                ),
              ),
            )
          else
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: logProvider.logs.take(5).length,
              itemBuilder: (context, index) {
                final log = logProvider.logs[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    title: Text('Checkpoint: ${log.checkpointId}'),
                    subtitle: Text(log.timestamp.toString()),
                    trailing: Chip(
                      label: Text(log.status),
                      backgroundColor: log.status == 'completed'
                          ? Colors.green.shade100
                          : Colors.orange.shade100,
                    ),
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  Widget _buildLogsTab(BuildContext context, CleaningLogProvider logProvider) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          if (logProvider.isLoading)
            const Center(child: CircularProgressIndicator())
          else if (logProvider.logs.isEmpty)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: Text('No cleaning logs'),
              ),
            )
          else
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: logProvider.logs.length,
              itemBuilder: (context, index) {
                final log = logProvider.logs[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: ListTile(
                    title: Text('${log.checkpointId} - ${log.status}'),
                    subtitle: Text(log.timestamp.toString()),
                    trailing: log.synced
                        ? const Icon(Icons.cloud_done, color: Colors.green)
                        : const Icon(Icons.cloud_off, color: Colors.orange),
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  Widget _buildProfileTab(
    BuildContext context,
    AuthProvider authProvider,
  ) {
    final user = authProvider.currentUser;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 48,
                    child: Text(user?.displayName[0] ?? 'U'),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    user?.displayName ?? 'Unknown',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    user?.email ?? '',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.grey.shade600,
                        ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Account Information',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 16),
                  ListTile(
                    title: const Text('Role'),
                    trailing: Text(
                      user?.role.toString().split('.').last.toUpperCase() ?? '',
                    ),
                  ),
                  ListTile(
                    title: const Text('Assigned Buildings'),
                    trailing: Text('${user?.assignedBuildingIds.length ?? 0}'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
