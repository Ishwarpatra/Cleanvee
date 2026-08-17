import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'firebase_options.dart';
import 'providers/auth_provider.dart';
import 'providers/cleaning_log_provider.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'screens/checkpoint_detail_screen.dart';
import 'screens/nfc_scan_screen.dart';
import 'screens/camera_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  runApp(const CleanveeApp());
}

class CleanveeApp extends StatelessWidget {
  const CleanveeApp({Key? key}) : super(key: key);

  GoRouter _buildRouter(AuthProvider authProvider) {
    return GoRouter(
      initialLocation: '/login',
      refreshListenable: authProvider,
      routes: [
        GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
        GoRoute(
          path: '/home',
          builder: (_, __) => const HomeScreen(),
          routes: [
            GoRoute(
              path: 'checkpoint/:id',
              builder: (context, state) => CheckpointDetailScreen(
                checkpointId: state.pathParameters['id']!,
              ),
              routes: [
                GoRoute(
                  path: 'nfc',
                  builder: (_, state) => NfcScanScreen(
                    expectedCheckpointId: state.pathParameters['id']!,
                  ),
                ),
                GoRoute(
                  path: 'camera',
                  builder: (context, state) => CameraScreen(
                    checkpointId: state.pathParameters['id']!,
                    buildingId: context.read<AuthProvider>().currentUser?.assignedBuildingIds.first ?? '',
                  ),
                ),
              ],
            ),
          ],
        ),
      ],
      redirect: (_, state) {
        final isLoggedIn = authProvider.isAuthenticated;
        if (!isLoggedIn && state.matchedLocation != '/login') return '/login';
        if (isLoggedIn && state.matchedLocation == '/login') return '/home';
        return null;
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => CleaningLogProvider()),
      ],
      child: Builder(
        builder: (context) => MaterialApp.router(
          title: 'Cleanvee Mobile',
          theme: ThemeData(
            useMaterial3: true,
            colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF2563EB)),
            fontFamily: 'Roboto',
          ),
          routerConfig: _buildRouter(context.read<AuthProvider>()),
          debugShowCheckedModeBanner: false,
        ),
      ),
    );
  }
}
