import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

enum UserRole { cleaner, manager, admin }

class AuthUser {
  final String uid;
  final String email;
  final String displayName;
  final UserRole role;
  final List<String> assignedBuildingIds;

  AuthUser({
    required this.uid,
    required this.email,
    required this.displayName,
    required this.role,
    required this.assignedBuildingIds,
  });

  factory AuthUser.fromFirestore(String uid, Map<String, dynamic> data) {
    return AuthUser(
      uid: uid,
      email: data['email'] ?? '',
      displayName: data['full_name'] ?? 'User',
      role: _parseRole(data['role'] ?? 'cleaner'),
      assignedBuildingIds: List<String>.from(data['assigned_building_ids'] ?? []),
    );
  }

  static UserRole _parseRole(String roleStr) {
    switch (roleStr.toLowerCase()) {
      case 'manager':
        return UserRole.manager;
      case 'admin':
        return UserRole.admin;
      default:
        return UserRole.cleaner;
    }
  }
}

class AuthProvider extends ChangeNotifier {
  final FirebaseAuth _firebaseAuth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  AuthUser? _currentUser;
  bool _isLoading = false;
  String? _error;

  AuthUser? get currentUser => _currentUser;
  bool get isAuthenticated => _currentUser != null;
  bool get isLoading => _isLoading;
  String? get error => _error;

  AuthProvider() {
    _initializeAuth();
  }

  void _initializeAuth() {
    _firebaseAuth.authStateChanges().listen((User? user) async {
      if (user != null) {
        await _loadUserProfile(user.uid);
      } else {
        _currentUser = null;
      }
      notifyListeners();
    });
  }

  Future<void> _loadUserProfile(String uid) async {
    try {
      final doc = await _firestore.collection('users').doc(uid).get();
      if (doc.exists) {
        _currentUser = AuthUser.fromFirestore(uid, doc.data()!);
      } else {
        _currentUser = AuthUser(
          uid: uid,
          email: _firebaseAuth.currentUser?.email ?? '',
          displayName: _firebaseAuth.currentUser?.displayName ?? 'User',
          role: UserRole.cleaner,
          assignedBuildingIds: [],
        );
      }
    } catch (e) {
      _error = 'Failed to load user profile: $e';
    }
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _firebaseAuth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
      _isLoading = false;
      notifyListeners();
      return true;
    } on FirebaseAuthException catch (e) {
      _error = e.message ?? 'Login failed';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    try {
      await _firebaseAuth.signOut();
      _currentUser = null;
      _error = null;
      notifyListeners();
    } catch (e) {
      _error = 'Logout failed: $e';
      notifyListeners();
    }
  }

  bool canAccessBuilding(String buildingId) {
    if (_currentUser == null) return false;
    if (_currentUser!.role == UserRole.admin) return true;
    return _currentUser!.assignedBuildingIds.contains(buildingId);
  }

  bool canManageTeam() {
    return _currentUser?.role == UserRole.manager ||
        _currentUser?.role == UserRole.admin;
  }

  bool canManageBuildings() {
    return _currentUser?.role == UserRole.manager ||
        _currentUser?.role == UserRole.admin;
  }
}
