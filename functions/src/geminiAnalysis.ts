import { GoogleGenAI } from '@google/genai';
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret, defineString } from 'firebase-functions/params';
import * as admin from 'firebase-admin';

const geminiApiKey = defineSecret('GEMINI_API_KEY');
const appOrigin = defineString('APP_ORIGIN', { default: '' });
const modelName = defineString('GEMINI_MODEL', { default: 'gemini-1.5-flash' });
const DAILY_REQUEST_LIMIT = 100;
const MAX_PROMPT_LENGTH = 50_000;

type RequestLike = { header(name: string): string | undefined };
type ResponseLike = {
  status(code: number): ResponseLike;
  json(body: unknown): unknown;
  set(field: string, value: string): unknown;
  send(body: string): unknown;
};

function setCors(req: RequestLike, res: ResponseLike): boolean {
  const origin = req.header('origin');
  const allowedOrigin = appOrigin.value();
  if (origin && allowedOrigin && origin !== allowedOrigin) {
    res.status(403).json({ error: 'origin_not_allowed' });
    return false;
  }
  if (origin && allowedOrigin) res.set('Access-Control-Allow-Origin', allowedOrigin);
  res.set('Vary', 'Origin');
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  return true;
}

async function consumeDailyQuota(uid: string): Promise<boolean> {
  const date = new Date().toISOString().slice(0, 10);
  const ref = admin.firestore().collection('ai_usage').doc(`${uid}_${date}`);
  return admin.firestore().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const count = snapshot.exists ? Number(snapshot.data()?.count ?? 0) : 0;
    if (count >= DAILY_REQUEST_LIMIT) return false;
    transaction.set(ref, {
      uid,
      date,
      count: admin.firestore.FieldValue.increment(1),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return true;
  });
}

export const geminiAnalysis = onRequest({
  region: 'us-central1',
  secrets: [geminiApiKey],
  timeoutSeconds: 60,
  memory: '256MiB',
}, async (req, res) => {
  if (!setCors(req, res)) return;
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  try {
    const authorization = req.header('authorization') ?? '';
    if (!authorization.startsWith('Bearer ')) {
      res.status(401).json({ error: 'authentication_required' });
      return;
    }
    const decoded = await admin.auth().verifyIdToken(authorization.slice(7));
    const userDoc = await admin.firestore().collection('users').doc(decoded.uid).get();
    const user = userDoc.data();
    if (!userDoc.exists || user?.is_active === false || !Array.isArray(user?.assigned_building_ids)) {
      res.status(403).json({ error: 'user_not_authorized' });
      return;
    }

    const operation = req.body?.operation;
    const prompt = req.body?.prompt;
    if (!['shift_report', 'alert_analysis'].includes(operation) || typeof prompt !== 'string' || prompt.length === 0 || prompt.length > MAX_PROMPT_LENGTH) {
      res.status(400).json({ error: 'invalid_request' });
      return;
    }
    if (!(await consumeDailyQuota(decoded.uid))) {
      res.status(429).json({ error: 'daily_ai_quota_exceeded' });
      return;
    }

    const response = await new GoogleGenAI({ apiKey: geminiApiKey.value() }).models.generateContent({
      model: modelName.value(),
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    if (!response.text) {
      res.status(502).json({ error: 'provider_empty_response' });
      return;
    }
    res.status(200).json({ text: response.text });
  } catch (error) {
    console.error('[geminiAnalysis] provider or authorization failure', error);
    res.status(502).json({ error: 'ai_provider_unavailable' });
  }
});
