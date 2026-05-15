/**
 * LoginScreen.tsx — Firebase Authentication UI
 *
 * Features:
 * - Email/password login
 * - Demo mode fallback (no Firebase required)
 * - Role-based redirect after login
 * - Error handling and loading states
 */

import React, { useState } from 'react';
import { Mail, Lock, LogIn, AlertCircle, Loader2 } from 'lucide-react';
import { Role } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (uid: string, email: string, role: Role) => void;
  isLoading?: boolean;
  error?: string | null;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, isLoading = false, error }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setIsSubmitting(true);

    try {
      // Check if Firebase is configured
      const firebaseConfigured = Boolean(
        import.meta.env.VITE_FIREBASE_PROJECT_ID &&
        import.meta.env.VITE_FIREBASE_API_KEY
      );

      if (!firebaseConfigured) {
        // Demo mode: accept any email/password
        if (!email || !password) {
          setLocalError('Email and password are required');
          setIsSubmitting(false);
          return;
        }

        // Simulate role assignment based on email
        let role: Role = Role.CLEANER;
        if (email.includes('manager') || email.includes('admin')) {
          role = Role.MANAGER;
        }
        if (email.includes('admin')) {
          role = Role.ADMIN;
        }

        // Simulate async delay
        await new Promise(resolve => setTimeout(resolve, 500));
        onLoginSuccess('demo-uid-' + Date.now(), email, role);
        return;
      }

      // Real Firebase authentication
      const { signInWithEmailAndPassword, getAuth } = await import('firebase/auth');
      const auth = getAuth();

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get user role from Firestore
      const { getFirestore, doc, getDoc } = await import('firebase/firestore');
      const db = getFirestore();
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        onLoginSuccess(user.uid, user.email || email, userData.role || Role.CLEANER);
      } else {
        // User document doesn't exist, create it with default role
        onLoginSuccess(user.uid, user.email || email, Role.CLEANER);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setLocalError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = error || localError;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-4">
            <LogIn size={32} className="text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Cleanvee</h1>
          <p className="text-blue-100">Facility Management Command Center</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6">
          {/* Demo Mode Notice */}
          {!import.meta.env.VITE_FIREBASE_PROJECT_ID && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
              <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-1">Demo Mode</p>
                <p>Firebase not configured. Use any email to login.</p>
                <p className="text-xs mt-1 opacity-75">Tip: Include "manager" or "admin" in email for different roles</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {displayError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
              <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">{displayError}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@cleanvee.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  disabled={isSubmitting || isLoading}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  disabled={isSubmitting || isLoading}
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting || isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center mb-3">Demo Credentials</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setEmail('cleaner@demo.com');
                  setPassword('demo123');
                }}
                className="p-2 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 text-gray-700 transition-colors"
              >
                Cleaner
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('manager@demo.com');
                  setPassword('demo123');
                }}
                className="p-2 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 text-gray-700 transition-colors"
              >
                Manager
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@demo.com');
                  setPassword('demo123');
                }}
                className="p-2 bg-gray-50 hover:bg-gray-100 rounded border border-gray-200 text-gray-700 transition-colors"
              >
                Admin
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-blue-100 text-xs mt-6">
          © 2025 Cleanvee. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
