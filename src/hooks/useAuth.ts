/**
 * useAuth — Authentication state hook
 *
 * SOLID: Single Responsibility — auth state only
 * Dependency Inversion — components depend on this hook, not Firebase Auth directly
 *
 * Behaviour:
 * - If Firebase Auth is configured: subscribes to real auth state
 * - If not configured: returns a mock "demo" user for development
 * - Exposes role-based permission helpers
 */
import { useState, useEffect } from 'react';
import { Role } from '../../types';

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  assigned_building_ids: string[];
  isDemo: boolean;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
}

const DEMO_USER: AuthUser = {
  uid: 'demo-manager-001',
  email: 'demo@cleanvee.io',
  displayName: 'Demo Manager',
  role: Role.MANAGER,
  assigned_building_ids: ['bldg-001', 'bldg-002', 'bldg-003', 'bldg-004'],
  isDemo: true,
};

function isFirebaseAuthConfigured(): boolean {
  try {
    return Boolean(
      (import.meta.env as Record<string, string>).VITE_FIREBASE_PROJECT_ID &&
      (import.meta.env as Record<string, string>).VITE_FIREBASE_API_KEY
    );
  } catch {
    return false;
  }
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!isFirebaseAuthConfigured()) {
      // Demo mode: use mock manager user
      setState({ user: DEMO_USER, loading: false, error: null });
      return;
    }

    let unsubscribe: (() => void) | undefined;

    const init = async () => {
      try {
        const { getAuth, onAuthStateChanged } = await import('firebase/auth');
        const { getFirestore, doc, getDoc } = await import('firebase/firestore');
        const { getApp } = await import('firebase/app');
        const auth = getAuth(getApp());
        const db = getFirestore(getApp());

        unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (!firebaseUser) {
            setState({ user: null, loading: false, error: null });
            return;
          }

          try {
            // Fetch role and building assignments from Firestore
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (userDoc.exists()) {
              const data = userDoc.data();
              setState({
                user: {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email ?? '',
                  displayName: firebaseUser.displayName ?? data.full_name ?? 'User',
                  role: (data.role as Role) ?? Role.CLEANER,
                  assigned_building_ids: (data.assigned_building_ids as string[]) ?? [],
                  isDemo: false,
                },
                loading: false,
                error: null,
              });
            } else {
              // User doc missing — treat as cleaner with no buildings
              setState({
                user: {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email ?? '',
                  displayName: firebaseUser.displayName ?? 'User',
                  role: Role.CLEANER,
                  assigned_building_ids: [],
                  isDemo: false,
                },
                loading: false,
                error: null,
              });
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to load user profile';
            setState({ user: null, loading: false, error: msg });
          }
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Auth initialization failed';
        setState({ user: DEMO_USER, loading: false, error: msg });
      }
    };

    void init();
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  return state;
}

// ---- Permission helpers ----
export function canManageBuildings(user: AuthUser | null): boolean {
  return user?.role === Role.MANAGER || user?.role === Role.ADMIN;
}

export function canManageTeam(user: AuthUser | null): boolean {
  return user?.role === Role.MANAGER || user?.role === Role.ADMIN;
}

export function canViewSettings(user: AuthUser | null): boolean {
  return user?.role === Role.MANAGER || user?.role === Role.ADMIN;
}

export function canAccessBuilding(user: AuthUser | null, buildingId: string): boolean {
  if (!user) return false;
  if (user.role === Role.ADMIN) return true;
  return user.assigned_building_ids.includes(buildingId);
}
