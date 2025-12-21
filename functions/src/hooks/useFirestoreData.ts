import { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  where 
} from 'firebase/firestore';
// We use '@/' to point to the root folder safely
import { CleaningLog, Checkpoint } from '@/types';

// Your actual configuration
const firebaseConfig = {
  apiKey: "AIzaSyDnLhKEkQH-JTkWlk1iye1jtZQwo12CyzI",
  authDomain: "vericlean-1a6ee.firebaseapp.com",
  projectId: "vericlean-1a6ee",
  storageBucket: "vericlean-1a6ee.firebasestorage.app",
  messagingSenderId: "931450395496",
  appId: "1:931450395496:web:f16dfff3c55932c42e14dd",
  measurementId: "G-1FNJZ897L4"
};

// Initialize Firebase (Singleton pattern to prevent "App already initialized" errors)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export const useFirestoreData = (buildingId: string) => {
  const [logs, setLogs] = useState<CleaningLog[]>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
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
    if (!buildingId) return;

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
    });

    return () => unsubscribe();
  }, [buildingId]);

  return { logs, checkpoints, loading };
};