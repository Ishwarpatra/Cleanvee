import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:nfc_manager/nfc_manager.dart';

class NfcScanScreen extends StatefulWidget {
  final String expectedCheckpointId;

  const NfcScanScreen({Key? key, required this.expectedCheckpointId}) : super(key: key);

  @override
  State<NfcScanScreen> createState() => _NfcScanScreenState();
}

class _NfcScanScreenState extends State<NfcScanScreen> {
  String? _message;
  bool _isScanning = false;

  @override
  void initState() {
    super.initState();
    _startNfcScan();
  }

  Future<void> _startNfcScan() async {
    setState(() {
      _isScanning = true;
      _message = null;
    });

    final isAvailable = await NfcManager.instance.isAvailable();
    if (!isAvailable) {
      if (mounted) {
        setState(() {
          _isScanning = false;
          _message = 'NFC is not available on this device.';
        });
      }
      return;
    }

    await NfcManager.instance.startSession(onDiscovered: (tag) async {
      await NfcManager.instance.stopSession();
      if (!mounted) return;
      setState(() {
        _isScanning = false;
        _message = 'Tag detected, but server-backed cryptographic verification is not configured. No cleaning log was submitted.';
      });
    });
  }

  @override
  void dispose() {
    NfcManager.instance.stopSession();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Verify NFC Presence')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(_isScanning ? Icons.nfc : Icons.error_outline, size: 100, color: _isScanning ? Colors.blue : Colors.orange),
              const SizedBox(height: 20),
              Text(
                _isScanning ? 'Hold the phone near the checkpoint tag' : (_message ?? 'NFC verification unavailable'),
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 20),
              if (!_isScanning) ...[
                ElevatedButton.icon(
                  onPressed: _startNfcScan,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Retry'),
                ),
                TextButton(onPressed: () => context.pop(), child: const Text('Cancel')),
              ],
              Text('Checkpoint: ${widget.expectedCheckpointId}', style: const TextStyle(color: Colors.grey)),
            ],
          ),
        ),
      ),
    );
  }
}
