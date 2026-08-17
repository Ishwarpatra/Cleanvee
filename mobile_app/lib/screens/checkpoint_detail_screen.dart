import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class CheckpointDetailScreen extends StatelessWidget {
  final String checkpointId;

  const CheckpointDetailScreen({Key? key, required this.checkpointId}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final basePath = '/home/checkpoint/$checkpointId';
    return Scaffold(
      appBar: AppBar(title: Text('Checkpoint: $checkpointId')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.cleaning_services, size: 64),
              const SizedBox(height: 16),
              Text('Checkpoint Details', style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 8),
              Text('ID: $checkpointId', style: Theme.of(context).textTheme.bodyMedium),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  icon: const Icon(Icons.nfc),
                  label: const Text('Verify NFC Presence'),
                  onPressed: () => context.push('$basePath/nfc'),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  icon: const Icon(Icons.camera_alt),
                  label: const Text('Capture Proof Photo'),
                  onPressed: () => context.push('$basePath/camera'),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'NFC verification is required before submitting a cleaning log.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
