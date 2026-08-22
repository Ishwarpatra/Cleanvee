import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  adminActivity,
  buildings,
  checkpoints,
  cleaningLogs,
  InsertUser,
  operationalSettings,
  proofRecords,
  teamAssignments,
  teamInvites,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let dbClient: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!dbClient && process.env.DATABASE_URL) dbClient = drizzle(process.env.DATABASE_URL);
  return dbClient;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  const db = await requireDb();
  const role = user.openId === ENV.ownerOpenId ? "admin" : user.role ?? "user";
  await db.insert(users).values({ ...user, role, lastSignedIn: new Date() }).onDuplicateKeyUpdate({
    set: { name: user.name ?? null, email: user.email ?? null, loginMethod: user.loginMethod ?? null, lastSignedIn: new Date() },
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await requireDb();
  return (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
}

export async function getUserById(id: number) {
  const db = await requireDb();
  return (await db.select().from(users).where(eq(users.id, id)).limit(1))[0];
}

export async function ensureSettings() {
  const db = await requireDb();
  const current = (await db.select().from(operationalSettings).where(eq(operationalSettings.id, 1)).limit(1))[0];
  if (current) return current;
  await db.insert(operationalSettings).values({ id: 1, notificationRules: { proofNeedsReview: true, cleanerOffline: true } });
  return (await db.select().from(operationalSettings).where(eq(operationalSettings.id, 1)).limit(1))[0]!;
}

export async function getWorkspaceData() {
  const db = await requireDb();
  const [siteRows, checkpointRows, logRows, proofRows, settings] = await Promise.all([
    db.select().from(buildings).where(eq(buildings.active, true)),
    db.select().from(checkpoints).where(eq(checkpoints.active, true)),
    db.select().from(cleaningLogs).orderBy(desc(cleaningLogs.updatedAt)).limit(120),
    db.select().from(proofRecords).orderBy(desc(proofRecords.capturedAt)).limit(120),
    ensureSettings(),
  ]);
  return { buildings: siteRows, checkpoints: checkpointRows, logs: logRows, proofs: proofRows, settings };
}

export async function getWorkspaceDataForUser(userId: number, role: "user" | "admin") {
  if (role === "admin") return getWorkspaceData();
  const db = await requireDb();
  const [assignmentRows, settings] = await Promise.all([
    db.select().from(teamAssignments).where(and(eq(teamAssignments.userId, userId), eq(teamAssignments.active, true))),
    ensureSettings(),
  ]);
  const buildingIds = assignmentRows.map(row => row.buildingId);
  if (!buildingIds.length) return { buildings: [], checkpoints: [], logs: [], proofs: [], settings };
  const [siteRows, checkpointRows, logRows] = await Promise.all([
    db.select().from(buildings).where(and(eq(buildings.active, true), inArray(buildings.id, buildingIds))),
    db.select().from(checkpoints).where(and(eq(checkpoints.active, true), inArray(checkpoints.buildingId, buildingIds))),
    db.select().from(cleaningLogs).where(inArray(cleaningLogs.buildingId, buildingIds)).orderBy(desc(cleaningLogs.updatedAt)).limit(120),
  ]);
  const logIds = logRows.map(row => row.id);
  const proofRows = logIds.length ? await db.select().from(proofRecords).where(inArray(proofRecords.cleaningLogId, logIds)).orderBy(desc(proofRecords.capturedAt)).limit(120) : [];
  return { buildings: siteRows, checkpoints: checkpointRows, logs: logRows, proofs: proofRows, settings };
}

export async function listWorkspaceBuildings() {
  const db = await requireDb();
  return db.select().from(buildings).where(eq(buildings.active, true)).orderBy(buildings.name);
}

export async function listWorkspaceCheckpoints(buildingId?: number) {
  const db = await requireDb();
  return buildingId
    ? db.select().from(checkpoints).where(and(eq(checkpoints.active, true), eq(checkpoints.buildingId, buildingId))).orderBy(checkpoints.label)
    : db.select().from(checkpoints).where(eq(checkpoints.active, true)).orderBy(checkpoints.label);
}

export async function listRecentWorkspaceLogs() {
  const db = await requireDb();
  return db.select().from(cleaningLogs).orderBy(desc(cleaningLogs.updatedAt)).limit(120);
}

export async function listTeamDirectory() {
  const db = await requireDb();
  const [memberRows, assignmentRows, buildingRows] = await Promise.all([
    db.select().from(users).orderBy(users.name),
    db.select().from(teamAssignments),
    db.select().from(buildings).where(eq(buildings.active, true)).orderBy(buildings.name),
  ]);
  return { members: memberRows, assignments: assignmentRows, buildings: buildingRows };
}

export async function listTeamDirectoryForUser(userId: number, role: "user" | "admin") {
  if (role === "admin") return listTeamDirectory();
  const db = await requireDb();
  const [memberRows, assignmentRows] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)).limit(1),
    db.select().from(teamAssignments).where(and(eq(teamAssignments.userId, userId), eq(teamAssignments.active, true))),
  ]);
  const buildingIds = assignmentRows.map(row => row.buildingId);
  const buildingRows = buildingIds.length
    ? await db.select().from(buildings).where(and(eq(buildings.active, true), inArray(buildings.id, buildingIds))).orderBy(buildings.name)
    : [];
  return { members: memberRows, assignments: assignmentRows, buildings: buildingRows };
}

export async function reportIssue(input: { checkpointId: number; buildingId: number; assignedUserId: number; notes: string }) {
  const db = await requireDb();
  const result = await db.insert(cleaningLogs).values({ ...input, status: "flagged" });
  return result[0].insertId;
}

export async function getActiveAssignment(userId: number, buildingId: number) {
  const db = await requireDb();
  return (await db.select().from(teamAssignments).where(and(eq(teamAssignments.userId, userId), eq(teamAssignments.buildingId, buildingId), eq(teamAssignments.active, true))).limit(1))[0];
}

export async function submitProof(input: { checkpointId: number; buildingId: number; submittedBy: number; notes?: string }) {
  const db = await requireDb();
  return db.transaction(async tx => {
    const logResult = await tx.insert(cleaningLogs).values({ checkpointId: input.checkpointId, buildingId: input.buildingId, assignedUserId: input.submittedBy, status: "waiting", notes: input.notes?.trim() || null });
    const logId = Number(logResult[0].insertId);
    const proofResult = await tx.insert(proofRecords).values({ cleaningLogId: logId, presence: "nfc", decision: "pending" });
    return { logId, proofId: Number(proofResult[0].insertId) };
  });
}

export async function getDecisionContext(logId: number, proofId: number) {
  const db = await requireDb();
  const [log, proof] = await Promise.all([
    db.select().from(cleaningLogs).where(eq(cleaningLogs.id, logId)).limit(1),
    db.select().from(proofRecords).where(eq(proofRecords.id, proofId)).limit(1),
  ]);
  if (!log[0] || !proof[0]) return null;
  if (proof[0].cleaningLogId !== logId) return "mismatch" as const;
  return { log: log[0], proof: proof[0] };
}

export async function logAdminActivity(adminUserId: number, action: string, targetType: string, targetId: string | number, details?: Record<string, unknown>) {
  const db = await requireDb();
  await db.insert(adminActivity).values({ adminUserId, action, targetType, targetId: String(targetId), details: details ?? null });
}

export async function listAdminData() {
  const db = await requireDb();
  const [siteRows, checkpointRows, userRows, assignments, invites, activity] = await Promise.all([
    db.select().from(buildings).orderBy(buildings.name),
    db.select().from(checkpoints).orderBy(checkpoints.label),
    db.select().from(users).orderBy(users.name),
    db.select().from(teamAssignments),
    db.select().from(teamInvites).orderBy(desc(teamInvites.createdAt)),
    db.select().from(adminActivity).orderBy(desc(adminActivity.createdAt)).limit(40),
  ]);
  return { buildings: siteRows, checkpoints: checkpointRows, users: userRows, assignments, invites, activity };
}

export async function createBuilding(input: { name: string; address: string; shiftSchedule: string; createdBy: number }) {
  const db = await requireDb();
  const result = await db.insert(buildings).values(input);
  return result[0].insertId;
}

export async function getBuilding(id: number) {
  const db = await requireDb();
  return (await db.select().from(buildings).where(eq(buildings.id, id)).limit(1))[0];
}

export async function getBuildingByName(name: string) {
  const db = await requireDb();
  return (await db.select().from(buildings).where(eq(buildings.name, name)).limit(1))[0];
}

export async function updateBuilding(id: number, input: { name: string; address: string; shiftSchedule: string; active: boolean }) {
  const db = await requireDb();
  await db.update(buildings).set(input).where(eq(buildings.id, id));
}

export async function deactivateBuilding(id: number) {
  const db = await requireDb();
  await db.update(buildings).set({ active: false }).where(eq(buildings.id, id));
}

export async function createCheckpoint(input: { buildingId: number; label: string; location: string; nfcTag: string; floor: string; xPosition: number; yPosition: number }) {
  const db = await requireDb();
  const result = await db.insert(checkpoints).values(input);
  return result[0].insertId;
}

export async function getCheckpoint(id: number) {
  const db = await requireDb();
  return (await db.select().from(checkpoints).where(eq(checkpoints.id, id)).limit(1))[0];
}

export async function getCheckpointByNfcTag(nfcTag: string) {
  const db = await requireDb();
  return (await db.select().from(checkpoints).where(eq(checkpoints.nfcTag, nfcTag)).limit(1))[0];
}

export async function updateCheckpoint(id: number, input: { label: string; location: string; nfcTag: string; floor: string; xPosition: number; yPosition: number; active: boolean }) {
  const db = await requireDb();
  await db.update(checkpoints).set(input).where(eq(checkpoints.id, id));
}

export async function deactivateCheckpoint(id: number) {
  const db = await requireDb();
  await db.update(checkpoints).set({ active: false }).where(eq(checkpoints.id, id));
}

export async function updateSettings(input: { evidenceThreshold: number; defaultShiftHours: string; notificationRules: Record<string, boolean>; retentionDays: number; updatedBy: number }) {
  const db = await requireDb();
  await db.insert(operationalSettings).values({ id: 1, ...input }).onDuplicateKeyUpdate({ set: input });
  return ensureSettings();
}

export async function decideProof(input: { logId: number; proofId: number; decision: "approved" | "sent_back" | "escalated"; reviewerId: number }) {
  const db = await requireDb();
  const status = input.decision === "approved" ? "approved" : input.decision === "sent_back" ? "flagged" : "flagged";
  await db.transaction(async tx => {
    await tx.update(proofRecords).set({ decision: input.decision, reviewerId: input.reviewerId, reviewedAt: new Date() }).where(eq(proofRecords.id, input.proofId));
    await tx.update(cleaningLogs).set({ status }).where(eq(cleaningLogs.id, input.logId));
  });
}

export async function createInvite(input: { email: string; buildingId: number; assignmentRole: "operator" | "supervisor" | "manager"; invitedBy: number }) {
  const db = await requireDb();
  const result = await db.insert(teamInvites).values(input);
  return result[0].insertId;
}

export async function getInvite(id: number) {
  const db = await requireDb();
  return (await db.select().from(teamInvites).where(eq(teamInvites.id, id)).limit(1))[0];
}

export async function acceptInvite(id: number) {
  const db = await requireDb();
  await db.update(teamInvites).set({ status: "accepted", acceptedAt: new Date() }).where(eq(teamInvites.id, id));
}

export async function getPendingInvite(email: string, buildingId: number) {
  const db = await requireDb();
  return (await db.select().from(teamInvites).where(and(eq(teamInvites.email, email), eq(teamInvites.buildingId, buildingId), eq(teamInvites.status, "pending"))).limit(1))[0];
}

export async function upsertAssignment(input: { userId: number; buildingId: number; assignmentRole: "operator" | "supervisor" | "manager"; active: boolean }) {
  const db = await requireDb();
  await db.insert(teamAssignments).values(input).onDuplicateKeyUpdate({ set: { assignmentRole: input.assignmentRole, active: input.active, deactivatedAt: input.active ? null : new Date() } });
}

export async function getAssignment(userId: number, buildingId: number) {
  const db = await requireDb();
  return (await db.select().from(teamAssignments).where(and(eq(teamAssignments.userId, userId), eq(teamAssignments.buildingId, buildingId))).limit(1))[0];
}

export async function setUserRole(userId: number, role: "user" | "admin") {
  const db = await requireDb();
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function cancelInvite(id: number) {
  const db = await requireDb();
  const invite = (await db.select().from(teamInvites).where(eq(teamInvites.id, id)).limit(1))[0];
  if (!invite || invite.status !== "pending") return null;
  await db.update(teamInvites).set({ status: "cancelled" }).where(eq(teamInvites.id, id));
  return invite;
}

export async function siteHealth() {
  const db = await requireDb();
  return db.select({ buildingId: buildings.id, buildingName: buildings.name, checkpoints: sql<number>`count(${checkpoints.id})` })
    .from(buildings)
    .leftJoin(checkpoints, and(eq(checkpoints.buildingId, buildings.id), eq(checkpoints.active, true)))
    .groupBy(buildings.id, buildings.name);
}
