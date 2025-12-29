import { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
  doc
} from 'firebase/firestore';
// We use '@/' to point to the root folder safely
import { CleaningLog, Checkpoint } from '../../types';
// Your actual configuration
const firebaseConfig = {
  apiKey: "AIzaSyDsfJnCJZ24i7cuiTHmFnm8f4fiR9KBnYU",
  authDomain: "cleanvee-aa847.firebaseapp.com",
  projectId: "cleanvee-aa847",
  storageBucket: "cleanvee-aa847.firebasestorage.app",
  messagingSenderId: "399462814786",
  appId: "1:399462814786:web:43d14e4615ccb2f1fac9db",
  measurementId: "G-D7BG44RMVF"
};

// Initialize Firebase (Singleton pattern to prevent "App already initialized" errors)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export const useFirestoreData = (buildingId: string) => {
  const [logs, setLogs] = useState<CleaningLog[]>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 1. Real-time Listener for Checkpoints
  useEffect(() => {
    if (!buildingId) return;

    const q = query(
      collection(db, 'checkpoints'),
      where('building_id', '==', buildingId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cpData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Checkpoint));

      setCheckpoints(cpData);
    });

    return () => unsubscribe();
  }, [buildingId]);

  // 2. Real-time Listener for Logs (Last 24 hours)
  useEffect(() => {
    if (!buildingId) {
      setLoading(false);
      return;
    }

    const yesterday = new Date(Date.now() - 86400000).toISOString();

    const q = query(
      collection(db, 'cleaning_logs'),
      where('building_id', '==', buildingId),
      where('created_at', '>=', yesterday),
      orderBy('created_at', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as CleaningLog));

      setLogs(logData);
      setLoading(false);
    }, (error) => {
      console.error('Firestore logs query error:', error);
      setLoading(false); // Stop loading even on error
    });

    return () => unsubscribe();
  }, [buildingId]);

  // 3. Real-time Listener for Daily Stats (Aggregated backend pattern)
  useEffect(() => {
    if (!buildingId) return;

    const todayDateString = new Date().toISOString().split('T')[0];
    const statsDocId = `${buildingId}_${todayDateString}`;

    const unsubscribe = onSnapshot(doc(db, 'stats_daily', statsDocId), (snapshot) => {
      if (snapshot.exists()) {
        setStats(snapshot.data());
      } else {
        setStats(null);
      }
    });

    return () => unsubscribe();
  }, [buildingId]);

  return { logs, checkpoints, stats, loading };
};