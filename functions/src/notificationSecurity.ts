import * as admin from 'firebase-admin';

const DELIVERY_LEASE_MS = 10 * 60 * 1000;

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function claimNotificationDelivery(
  db: FirebaseFirestore.Firestore,
  deliveryId: string,
): Promise<boolean> {
  const ref = db.collection('notification_deliveries').doc(deliveryId);
  const now = Date.now();

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const existing = snapshot.exists ? snapshot.data() : undefined;
    if (existing?.status === 'sent') return false;

    const updatedAt = existing?.updated_at?.toMillis?.() ?? 0;
    if (existing?.status === 'processing' && now - updatedAt < DELIVERY_LEASE_MS) return false;

    transaction.set(ref, {
      status: 'processing',
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      attempts: admin.firestore.FieldValue.increment(1),
    }, { merge: true });
    return true;
  });
}

export async function markNotificationSent(
  db: FirebaseFirestore.Firestore,
  deliveryId: string,
): Promise<void> {
  await db.collection('notification_deliveries').doc(deliveryId).set({
    status: 'sent',
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

export async function markNotificationFailed(
  db: FirebaseFirestore.Firestore,
  deliveryId: string,
  error: unknown,
): Promise<void> {
  await db.collection('notification_deliveries').doc(deliveryId).set({
    status: 'failed',
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
    last_error: String(error).slice(0, 500),
  }, { merge: true });
}
