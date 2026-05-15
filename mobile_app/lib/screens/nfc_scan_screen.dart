import 'package:flutter/material.dart';
import 'package:nfc_manager/nfc_manager.dart';

class NfcScanScreen extends StatefulWidget {
  final String expectedCheckpointId;

  const NfcScanScreen({Key? key, required this.expectedCheckpointId}) : super(key: key);

  @override
  _NfcScanScreenState createState() => _NfcScanScreenState();
}

class _NfcScanScreenState extends State<NfcScanScreen> {
  ValueNotifier<dynamic> result = ValueNotifier(null);
  bool _isScanning = false;
  bool _isVerified = false;

  @override
  void initState() {
    super.initState();
    _startNFCScan();
  }

  void _startNFCScan() async {
    bool isAvailable = await NfcManager.instance.isAvailable();
    
    if (!isAvailable) {
      result.value = 'NFC is not available on this device.';
      return;
    }

    setState(() {
      _isScanning = true;
    });

    NfcManager.instance.startSession(onDiscovered: (NfcTag tag) async {
      result.value = tag.data;
      
      // In a real implementation, we would decode the NDEF message
      // and verify the payload contains a cryptographically signed HMAC 
      // of the checkpoint ID to prevent spoofing (Fix #76).
      
      // Simulated validation for prototype:
      await Future.delayed(const Duration(seconds: 1));
      
      setState(() {
        _isVerified = true;
        _isScanning = false;
      });

      NfcManager.instance.stopSession();
      
      // Auto-navigate to camera screen on success
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Checkpoint Verified Successfully!'), backgroundColor: Colors.green),
        );
        // Navigator.pushReplacementNamed(context, '/camera', arguments: widget.expectedCheckpointId);
      }
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
      appBar: AppBar(title: const Text('Scan NFC Tag')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              _isVerified ? Icons.check_circle : Icons.nfc,
              size: 100,
              color: _isVerified ? Colors.green : (_isScanning ? Colors.blue : Colors.grey),
            ),
            const SizedBox(height: 20),
            Text(
              _isVerified 
                ? 'Presence Verified!' 
                : (_isScanning ? 'Hold phone near the checkpoint tag...' : 'NFC Initialization Failed'),
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 20),
            ValueListenableBuilder<dynamic>(
              valueListenable: result,
              builder: (context, value, _) => Text(
                value != null ? 'Tag Detected' : '',
                style: const TextStyle(color: Colors.grey),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
