const MAX_ID_LENGTH = 128;
const MAX_DETAILS_LENGTH = 1000;
const MAX_DETECTED_OBJECTS = 100;
const ALLOWED_FEEDBACK_TYPES = new Set(['BAD_SMELL', 'DIRTY', 'SPILL', 'ISSUE', 'OTHER']);
const ALLOWED_LOG_STATUSES = new Set(['verified', 'rejected', 'flagged_for_review', 'appealed', 'appeal_resolved']);

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBoundedString(value: unknown, maxLength = MAX_ID_LENGTH): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export interface FeedbackData {
  checkpoint_id: string;
  building_id: string;
  type: string;
  details: string;
  submitted_by: string;
}

export function parseFeedback(data: unknown): FeedbackData | null {
  if (!isRecord(data)) return null;

  const { checkpoint_id, building_id, type, details, submitted_by } = data;
  if (
    !isBoundedString(checkpoint_id) ||
    !isBoundedString(building_id) ||
    !isBoundedString(type, 32) ||
    !ALLOWED_FEEDBACK_TYPES.has(type) ||
    typeof details !== 'string' ||
    details.length > MAX_DETAILS_LENGTH ||
    !isBoundedString(submitted_by)
  ) {
    return null;
  }

  return { checkpoint_id, building_id, type, details, submitted_by };
}

export function isValidCleaningLog(data: unknown): boolean {
  if (!isRecord(data)) return false;
  if (!isBoundedString(data.building_id) || !isBoundedString(data.checkpoint_id) || !isBoundedString(data.cleaner_id)) return false;
  if (typeof data.created_at !== 'string' || !Number.isFinite(Date.parse(data.created_at))) return false;

  if (data.proof_of_quality !== undefined) {
    if (!isRecord(data.proof_of_quality)) return false;
    const quality = data.proof_of_quality;
    if (!isFiniteNumber(quality.overall_score) || quality.overall_score < 0 || quality.overall_score > 100) return false;
    if (!Array.isArray(quality.detected_objects) || quality.detected_objects.length > MAX_DETECTED_OBJECTS) return false;
    if (!quality.detected_objects.every((item) => {
      if (!isRecord(item)) return false;
      return isBoundedString(item.label, 128) && isFiniteNumber(item.confidence) && item.confidence >= 0 && item.confidence <= 1;
    })) return false;
  }

  if (data.verification_result !== undefined) {
    if (!isRecord(data.verification_result) || !ALLOWED_LOG_STATUSES.has(data.verification_result.status as string)) return false;
  }

  return true;
}
