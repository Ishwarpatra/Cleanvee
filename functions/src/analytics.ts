import { BigQuery } from '@google-cloud/bigquery';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

const bigquery = new BigQuery();
const DATASET_ID = 'cleanvee_analytics';
const TABLE_ID = 'cleaning_logs';

if (admin.apps.length === 0) admin.initializeApp();
const db = admin.firestore();

type LogData = Record<string, any>;

function toDate(value: unknown): Date | null {
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    const date = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === 'string' || value instanceof Date) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function contribution(data: LogData | undefined) {
  if (!data) return null;
  const date = toDate(data.created_at);
  const buildingId = typeof data.building_id === 'string' ? data.building_id : null;
  if (!date || !buildingId) return null;
  const score = typeof data.proof_of_quality?.overall_score === 'number' && Number.isFinite(data.proof_of_quality.overall_score)
    ? data.proof_of_quality.overall_score
    : null;
  return {
    buildingId,
    date: date.toISOString().slice(0, 10),
    verified: data.verification_result?.status === 'verified',
    score,
  };
}

export const aggregateStats = onDocumentWritten({ document: 'cleaning_logs/{logId}', retry: true }, async (event) => {
  const beforeData = event.data?.before.exists ? event.data.before.data() : undefined;
  const afterData = event.data?.after.exists ? event.data.after.data() : undefined;
  const before = contribution(beforeData);
  const after = contribution(afterData);
  if (!before && !after) return;

  // Cleaning-log building/date fields are immutable; if malformed data attempts to move a log,
  // leave the existing bucket untouched and surface the event for investigation.
  if (before && after && (before.buildingId !== after.buildingId || before.date !== after.date)) {
    throw new Error(`Immutable analytics dimensions changed for ${event.params.logId}`);
  }
  const current = after ?? before;
  if (!current) return;

  const statsRef = db.doc(`daily_stats/${current.buildingId}_${current.date}`);
  const contributionRef = statsRef.collection('log_contributions').doc(event.params.logId);

  await db.runTransaction(async (transaction) => {
    const contributionSnapshot = await transaction.get(contributionRef);
    const statsSnapshot = await transaction.get(statsRef);
    const previous = contributionSnapshot.exists ? contributionSnapshot.data() : undefined;

    const next = after ? {
      verified: after.verified,
      score: after.score,
    } : null;
    if (previous && JSON.stringify(previous) === JSON.stringify(next)) return;

    const delta = (value: number | null | undefined) => value == null ? 0 : value;
    const verifiedDelta = delta(next?.verified ? 1 : 0) - delta(previous?.verified ? 1 : 0);
    const scoreDelta = delta(next?.score) - delta(previous?.score);
    const scoreCountDelta = (next?.score == null ? 0 : 1) - (previous?.score == null ? 0 : 1);
    const totalDelta = (next ? 1 : 0) - (previous ? 1 : 0);

    transaction.set(statsRef, {
      building_id: current.buildingId,
      date: current.date,
      total_logs: admin.firestore.FieldValue.increment(totalDelta),
      verified_count: admin.firestore.FieldValue.increment(verifiedDelta),
      score_sum: admin.firestore.FieldValue.increment(scoreDelta),
      score_count: admin.firestore.FieldValue.increment(scoreCountDelta),
      last_updated: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    if (next) transaction.set(contributionRef, next);
    else transaction.delete(contributionRef);
  });
});

export const streamToBigQuery = onDocumentWritten({ document: 'cleaning_logs/{logId}', retry: true }, async (event) => {
  const snapshot = event.data?.after;
  if (!snapshot?.exists) return;
  const data = snapshot.data();
  const logId = event.params.logId;
  const timestamp = toDate(data.created_at);
  if (!timestamp) throw new Error(`Invalid created_at for analytics log ${logId}`);

  const row = {
    log_id: logId,
    building_id: data.building_id,
    checkpoint_id: data.checkpoint_id,
    timestamp: timestamp.toISOString(),
    quality_score: typeof data.proof_of_quality?.overall_score === 'number' ? data.proof_of_quality.overall_score : null,
    ai_model: data.proof_of_quality?.ai_model_used || null,
    has_hazards: Array.isArray(data.proof_of_quality?.detected_objects) && data.proof_of_quality.detected_objects.length > 0,
    has_location: Boolean(data.proof_of_presence?.geo_location),
    status: data.verification_result?.status || 'unknown',
    ingested_at: new Date().toISOString(),
  };

  try {
    await bigquery.dataset(DATASET_ID).table(TABLE_ID).insert([{ insertId: `${logId}:${row.status}`, json: row }]);
  } catch (error) {
    await db.collection('analytics_dead_letters').doc(`${logId}:${row.status}`).set({
      log_id: logId,
      status: row.status,
      row,
      attempts: admin.firestore.FieldValue.increment(1),
      last_error_code: error instanceof Error ? error.name : 'unknown_error',
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    throw error;
  }
});
