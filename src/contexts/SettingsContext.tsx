/**
 * SettingsContext — Persistent application settings
 *
 * SOLID Principles:
 * - Single Responsibility: manages only settings state + persistence
 * - Open/Closed: new settings fields added to AppSettings type, not this file
 * - Dependency Inversion: uses abstract storage interface (Firestore or localStorage)
 *
 * Persistence strategy:
 *   1. Reads from localStorage on mount (instant, offline-first)
 *   2. Attempts Firestore write on save (if Firebase configured)
 *   3. Falls back to localStorage-only if Firestore unavailable
 *   4. Implements conflict resolution: uses timestamp-based last-write-wins
 *   5. Skips Firestore writes in demo mode to avoid unnecessary quota usage
 */
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { AppSettings, isValidAppSettings } from '../../types';

const SETTINGS_STORAGE_KEY = 'cleanvee-app-settings';
const SETTINGS_TIMESTAMP_KEY = 'cleanvee-app-settings-timestamp';

export const DEFAULT_SETTINGS: AppSettings = {
  qualityThreshold: 70,
  flagYellowAlerts: true,
  autoReviewLowScores: true,
  requireGps: true,
  allowOffline: true,
  photoRequired: true,
  maxOfflineHours: 4,
  emailNotifications: true,
  pushNotifications: true,
  slaAlerts: true,
  digestFrequency: 'daily',
  maxCleaningIntervalHours: 4,
  gracePeriodMinutes: 15,
};

interface SettingsContextValue {
  settings: AppSettings;
  hasChanges: boolean;
  isSaving: boolean;
  saveError: string | null;
  updateSettings: (partial: Partial<AppSettings>) => void;
  saveSettings: () => Promise<void>;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

function isFirebaseConfigured(): boolean {
  try {
    return Boolean(
      (import.meta.env as Record<string, string>).VITE_FIREBASE_PROJECT_ID &&
      (import.meta.env as Record<string, string>).VITE_FIREBASE_API_KEY
    );
  } catch {
    return false;
  }
}

function loadFromStorage(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    // Merge with defaults to handle new fields added after initial save
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveToStorage(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    localStorage.setItem(SETTINGS_TIMESTAMP_KEY, new Date().toISOString());
  } catch (e) {
    console.warn('[SettingsContext] localStorage write failed:', e);
  }
}

function getStorageTimestamp(): string {
  try {
    return localStorage.getItem(SETTINGS_TIMESTAMP_KEY) || '1970-01-01T00:00:00Z';
  } catch {
    return '1970-01-01T00:00:00Z';
  }
}

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(loadFromStorage);
  const [savedSettings, setSavedSettings] = useState<AppSettings>(loadFromStorage);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  // Sync to localStorage whenever settings change (draft state)
  useEffect(() => {
    saveToStorage(settings);
  }, [settings]);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
    setSaveError(null);
  }, []);

  const saveSettings = useCallback(async () => {
    // Validate before saving
    if (!isValidAppSettings(settings)) {
      setSaveError('Invalid settings values. Please check thresholds and intervals.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    const toSave: AppSettings = {
      ...settings,
      updatedAt: new Date().toISOString(),
    };

    try {
      const firebaseConfigured = isFirebaseConfigured();

      // Skip Firestore write in demo mode to avoid unnecessary quota usage
      if (firebaseConfigured) {
        const { getFirestore, doc, setDoc, getDoc } = await import('firebase/firestore');
        const { getApp } = await import('firebase/app');
        const { getAuth } = await import('firebase/auth');
        const app = getApp();
        const db = getFirestore(app);
        const user = getAuth(app).currentUser;
        if (!user) throw new Error('Sign in before saving settings');

        const profile = await getDoc(doc(db, 'users', user.uid));
        const assignedBuildingIds = profile.data()?.assigned_building_ids;
        const buildingId = Array.isArray(assignedBuildingIds) ? assignedBuildingIds[0] : undefined;
        if (!buildingId) throw new Error('No assigned building is available for settings');

        const docRef = doc(db, 'app_config', buildingId);
        const docSnap = await getDoc(docRef);

        let firestoreSettings: AppSettings | null = null;
        if (docSnap.exists()) {
          firestoreSettings = docSnap.data() as AppSettings;
        }

        // Conflict resolution: compare timestamps
        const localTimestamp = new Date(toSave.updatedAt || new Date()).getTime();
        const remoteTimestamp = firestoreSettings?.updatedAt 
          ? new Date(firestoreSettings.updatedAt).getTime() 
          : 0;

        // If remote is newer, merge with preference for remote values
        if (remoteTimestamp > localTimestamp && firestoreSettings) {
          console.warn('[SettingsContext] Remote settings are newer, merging...');
          const merged = { ...toSave, ...firestoreSettings, updatedAt: new Date().toISOString() };
          setSettings(merged);
          setSavedSettings(merged);
          await setDoc(docRef, merged, { merge: true });
          setSaveError('Settings merged with remote version (remote had newer changes).');
          return;
        }

        // Local is newer or equal, write to Firestore
        await setDoc(docRef, { ...toSave, building_id: buildingId }, { merge: true });
      }

      saveToStorage(toSave);
      setSettings(toSave);
      setSavedSettings(toSave);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error saving settings';
      setSaveError(`Cloud sync failed; changes remain a local draft: ${msg}`);
      saveToStorage(toSave);
    } finally {
      setIsSaving(false);
    }
  }, [settings]);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    setSavedSettings(DEFAULT_SETTINGS);
    setSaveError(null);
    saveToStorage(DEFAULT_SETTINGS);
  }, []);

  return (
    <SettingsContext.Provider
      value={{ settings, hasChanges, isSaving, saveError, updateSettings, saveSettings, resetSettings }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextValue => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
};
