/**
 * useFirestoreData — Real-time Firestore data hook with mock fallback
 *
 * SOLID Principles:
 * - Single Responsibility: data fetching only
 * - Open/Closed: swap data source without changing consumers
 * - Dependency Inversion: components depend on this hook, not Firebase directly
 *
 * Behaviour:
 *   1. If Firebase env vars are present → subscribe to Firestore real-time listeners
 *   2. If Firebase not configured → fall back to MOCK data (dev/demo mode)
 *   3. On Firestore error → fall back to mock data and surface error message
 *   4. Retry logic: exponential backoff up to 3 attempts on transient errors
 *   5. Debounce on buildingId changes to prevent listener churn and memory leaks
 */
import { useState, useEffect, useRef } from 'react';
import { CleaningLog, Checkpoint, AggregatedStats } from '../../types';
import {
  MOCK_CHECKPOINTS,
  INITIAL_LOGS,
  getMockCheckpointsForBuilding,
  getMockLogsForBuilding,
} from '../../constants';

interface FirestoreDataResult {
  logs: CleaningLog[];
  checkpoints: Checkpoint[];
  stats: AggregatedStats | null;
  loading: boolean;
  error: string | null;
  isUsingMockData: boolean;
}

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;
const DEBOUNCE_MS = 300;

function isDemoModeEnabled(): boolean {
  return (import.meta.env as Record<string, string | undefined>).VITE_DEMO_MODE === 'true';
}

function isFirebaseConfigured(): boolean {
  return Boolean(
    typeof import.meta !== 'undefined' &&
    (import.meta as unknown as Record<string, unknown>).env &&
    (import.meta.env as Record<string, string>).VITE_FIREBASE_PROJECT_ID &&
    (import.meta.env as Record<string, string>).VITE_FIREBASE_API_KEY
  );
}

export const useFirestoreData = (buildingId: string): FirestoreDataResult => {
  const [logs, setLogs] = useState<CleaningLog[]>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [stats, setStats] = useState<AggregatedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUsingMockData, setIsUsingMockData] = useState(false);
  const retryCount = useRef(0);
  const unsubscribers = useRef<Array<() => void>>([]);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const loadMockData = (reason?: string) => {
    setCheckpoints(getMockCheckpointsForBuilding(buildingId));
    setLogs(getMockLogsForBuilding(buildingId));
    setStats(null);
    setIsUsingMockData(true);
    if (reason) setError(reason);
    setLoading(false);
  };

  useEffect(() => {
    // Clear previous debounce timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Debounce building changes to prevent rapid listener churn
    debounceTimer.current = setTimeout(() => {
      // Clean up previous listeners
      unsubscribers.current.forEach(fn => fn());
      unsubscribers.current = [];
      setLoading(true);
      setError(null);
      retryCount.current = 0;

      if (!isFirebaseConfigured()) {
        if (isDemoModeEnabled()) {
          loadMockData('Demo mode is explicitly enabled. Live operational actions are disabled.');
        } else {
          setCheckpoints([]);
          setLogs([]);
          setStats(null);
          setIsUsingMockData(false);
          setError('Live data is not configured. Enable demo mode explicitly to view sample data.');
          setLoading(false);
        }
        return;
      }

      let cancelled = false;

      const subscribe = async (attempt: number) => {
        try {
          const { getFirestore, collection, query, where, orderBy, onSnapshot, doc, Timestamp } =
            await import('firebase/firestore');
          const { getApp } = await import('firebase/app');
          const db = getFirestore(getApp());

          // --- Checkpoints listener ---
          const cpQuery = query(
            collection(db, 'checkpoints'),
            where('building_id', '==', buildingId),
            where('is_active', '==', true)
          );
          const unsubCp = onSnapshot(
            cpQuery,
            (snap) => {
              if (cancelled) return;
              setCheckpoints(snap.docs.map(d => ({ id: d.id, ...d.data() } as Checkpoint)));
            },
            (err) => {
              if (cancelled) return;
              handleError(err, attempt);
            }
          );

          // --- Logs listener (today's UTC logs; daily_stats remains the totals source) ---
          const todayStart = new Date();
          todayStart.setUTCHours(0, 0, 0, 0);
          const logsQuery = query(
            collection(db, 'cleaning_logs'),
            where('building_id', '==', buildingId),
            where('created_at', '>=', Timestamp.fromDate(todayStart)),
            orderBy('created_at', 'desc')
          );
          const unsubLogs = onSnapshot(
            logsQuery,
            (snap) => {
              if (cancelled) return;
              setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as CleaningLog)));
            },
            (err) => {
              if (cancelled) return;
              handleError(err, attempt);
            }
          );

          // --- Daily stats listener ---
          const todayDateString = new Date().toISOString().slice(0, 10);
          const statsDocId = `${buildingId}_${todayDateString}`;
          const unsubStats = onSnapshot(
            doc(db, 'daily_stats', statsDocId),
            (snapshot) => {
              if (cancelled) return;
              if (snapshot.exists()) {
                setStats(snapshot.data() as AggregatedStats);
              } else {
                setStats(null);
              }
            },
            (err) => {
              if (cancelled) return;
              console.warn('[useFirestoreData] Stats listener error (non-critical):', err);
            }
          );

          unsubscribers.current = [unsubCp, unsubLogs, unsubStats];
          setIsUsingMockData(false);
          setLoading(false);
        } catch (err) {
          if (!cancelled) handleError(err as Error, attempt);
        }
      };

      const handleError = (err: Error | unknown, attempt: number) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[useFirestoreData] Error (attempt ${attempt}):`, msg);

        if (attempt < MAX_RETRIES) {
          const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
          console.log(`[useFirestoreData] Retrying in ${delay}ms...`);
          setTimeout(() => {
            if (!cancelled) subscribe(attempt + 1);
          }, delay);
        } else {
          setCheckpoints([]);
          setLogs([]);
          setStats(null);
          setIsUsingMockData(false);
          setError(`Live data unavailable after ${MAX_RETRIES} attempts. No sample data was substituted.`);
          setLoading(false);
        }
      };

      subscribe(0);

      return () => {
        cancelled = true;
        unsubscribers.current.forEach(fn => fn());
        unsubscribers.current = [];
      };
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      unsubscribers.current.forEach(fn => fn());
      unsubscribers.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingId]);

  return { logs, checkpoints, stats, loading, error, isUsingMockData };
};
