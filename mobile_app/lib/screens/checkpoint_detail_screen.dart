import 'package:flutter/material.dart';

class CheckpointDetailScreen extends StatelessWidget {
  final String checkpointId;

  const CheckpointDetailScreen({
    Key? key,
    required this.checkpointId,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Checkpoint: $checkpointId'),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.cleaning_services, size: 64),
            const SizedBox(height: 16),
            Text(
              'Checkpoint Details',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              'ID: $checkpointId',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              icon: const Icon(Icons.camera_alt),
              label: const Text('Take Photo'),
              onPressed: () {
                // Implement camera functionality
              },
            ),
            const SizedBox(height: 8),
            ElevatedButton.icon(
              icon: const Icon(Icons.nfc),
              label: const Text('Scan NFC Tag'),
              onPressed: () {
                // Implement NFC scan functionality
              },
            ),
          ],
        ),
      ),
    );
  }
}
