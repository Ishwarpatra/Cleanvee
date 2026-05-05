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
  } catch (e) {
    console.warn('[SettingsContext] localStorage write failed:', e);
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
      // Attempt Firestore persistence (only if Firebase is configured)
      const firestoreConfigured = Boolean(
        import.meta.env.VITE_FIREBASE_PROJECT_ID &&
        import.meta.env.VITE_FIREBASE_API_KEY
      );

      if (firestoreConfigured) {
        const { getFirestore, doc, setDoc } = await import('firebase/firestore');
        const { getApp } = await import('firebase/app');
        const db = getFirestore(getApp());
        await setDoc(doc(db, 'app_config', 'settings'), toSave, { merge: true });
      }

      // Always persist to localStorage as fallback
      saveToStorage(toSave);
      setSettings(toSave);
      setSavedSettings(toSave);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error saving settings';
      setSaveError(`Settings saved locally. Cloud sync failed: ${msg}`);
      // Still update local state even if cloud fails
      saveToStorage(toSave);
      setSavedSettings(toSave);
    } finally {
      setIsSaving(false);
    }
  }, [settings]);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    setSaveError(null);
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
