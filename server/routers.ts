import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";

const buildingInput = z.object({ name: z.string().trim().min(2).max(160), address: z.string().trim().min(4).max(1000), shiftSchedule: z.string().trim().min(3).max(80) });
const checkpointInput = z.object({ buildingId: z.number().int().positive(), label: z.string().trim().min(2).max(160), location: z.string().trim().min(2).max(220), nfcTag: z.string().trim().min(3).max(160), floor: z.string().trim().min(1).max(80), xPosition: z.number().int().min(0).max(100), yPosition: z.number().int().min(0).max(100) });

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  workspace: router({
    data: protectedProcedure.query(({ ctx }) => db.getWorkspaceDataForUser(ctx.user.id, ctx.user.role)),
    buildings: protectedProcedure.query(async ({ ctx }) => (await db.getWorkspaceDataForUser(ctx.user.id, ctx.user.role)).buildings),
    checkpoints: protectedProcedure.input(z.object({ buildingId: z.number().int().positive().optional() }).optional()).query(async ({ ctx, input }) => {
      const checkpoints = (await db.getWorkspaceDataForUser(ctx.user.id, ctx.user.role)).checkpoints;
      return input?.buildingId ? checkpoints.filter(checkpoint => checkpoint.buildingId === input.buildingId) : checkpoints;
    }),
    logs: protectedProcedure.query(async ({ ctx }) => (await db.getWorkspaceDataForUser(ctx.user.id, ctx.user.role)).logs),
    team: protectedProcedure.query(({ ctx }) => db.listTeamDirectoryForUser(ctx.user.id, ctx.user.role)),
    settings: protectedProcedure.query(() => db.ensureSettings()),
    submitProof: protectedProcedure.input(z.object({ checkpointId: z.number().int().positive(), notes: z.string().trim().max(2000).optional() })).mutation(async ({ ctx, input }) => {
      const checkpoint = await db.getCheckpoint(input.checkpointId);
      if (!checkpoint || !checkpoint.active) throw new TRPCError({ code: "NOT_FOUND", message: "Checkpoint not found." });
      if (ctx.user.role !== "admin" && !await db.getActiveAssignment(ctx.user.id, checkpoint.buildingId)) throw new TRPCError({ code: "FORBIDDEN", message: "You are not assigned to this building." });
      return db.submitProof({ checkpointId: checkpoint.id, buildingId: checkpoint.buildingId, submittedBy: ctx.user.id, notes: input.notes });
    }),
    decideProof: adminProcedure.input(z.object({ logId: z.number().int().positive(), proofId: z.number().int().positive(), decision: z.enum(["approved", "sent_back", "escalated"]) })).mutation(async ({ ctx, input }) => {
      const decisionContext = await db.getDecisionContext(input.logId, input.proofId);
      if (!decisionContext) throw new TRPCError({ code: "NOT_FOUND", message: "The proof or cleaning record no longer exists." });
      if (decisionContext === "mismatch") throw new TRPCError({ code: "BAD_REQUEST", message: "This proof does not belong to the selected cleaning record." });
      await db.decideProof({ ...input, reviewerId: ctx.user.id });
      return { success: true };
    }),
    reportIssue: protectedProcedure.input(z.object({ checkpointId: z.number().int().positive(), notes: z.string().trim().min(4).max(2000) })).mutation(async ({ ctx, input }) => {
      const checkpoint = await db.getCheckpoint(input.checkpointId);
      if (!checkpoint || !checkpoint.active) throw new TRPCError({ code: "NOT_FOUND", message: "Checkpoint not found." });
      if (ctx.user.role !== "admin" && !await db.getActiveAssignment(ctx.user.id, checkpoint.buildingId)) throw new TRPCError({ code: "FORBIDDEN", message: "You are not assigned to this building." });
      const id = await db.reportIssue({ ...input, buildingId: checkpoint.buildingId, assignedUserId: ctx.user.id });
      return { id };
    }),
  }),
  admin: router({
    data: adminProcedure.query(async () => ({ ...(await db.listAdminData()), siteHealth: await db.siteHealth(), settings: await db.ensureSettings() })),
    createBuilding: adminProcedure.input(buildingInput).mutation(async ({ ctx, input }) => {
      if (await db.getBuildingByName(input.name)) throw new TRPCError({ code: "CONFLICT", message: "A building with this name already exists." });
      const id = await db.createBuilding({ ...input, createdBy: ctx.user.id });
      await db.logAdminActivity(ctx.user.id, "Created building", "building", id, { name: input.name });
      return { id };
    }),
    updateBuilding: adminProcedure.input(z.object({ id: z.number().int().positive(), ...buildingInput.shape, active: z.boolean() })).mutation(async ({ ctx, input }) => {
      const existing = await db.getBuilding(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Building not found." });
      const conflict = await db.getBuildingByName(input.name);
      if (conflict && conflict.id !== input.id) throw new TRPCError({ code: "CONFLICT", message: "A building with this name already exists." });
      await db.updateBuilding(input.id, input);
      await db.logAdminActivity(ctx.user.id, "Updated building", "building", input.id, { name: input.name });
      return { success: true };
    }),
    deleteBuilding: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      if (!await db.getBuilding(input.id)) throw new TRPCError({ code: "NOT_FOUND", message: "Building not found." });
      await db.deactivateBuilding(input.id);
      await db.logAdminActivity(ctx.user.id, "Deactivated building", "building", input.id);
      return { success: true };
    }),
    createCheckpoint: adminProcedure.input(checkpointInput).mutation(async ({ ctx, input }) => {
      const [building, nfcConflict] = await Promise.all([db.getBuilding(input.buildingId), db.getCheckpointByNfcTag(input.nfcTag)]);
      if (!building || !building.active) throw new TRPCError({ code: "NOT_FOUND", message: "Active building not found." });
      if (nfcConflict) throw new TRPCError({ code: "CONFLICT", message: "That NFC tag is already assigned to a checkpoint." });
      const id = await db.createCheckpoint(input);
      await db.logAdminActivity(ctx.user.id, "Created checkpoint", "checkpoint", id, { label: input.label });
      return { id };
    }),
    updateCheckpoint: adminProcedure.input(z.object({ id: z.number().int().positive(), ...checkpointInput.omit({ buildingId: true }).shape, active: z.boolean() })).mutation(async ({ ctx, input }) => {
      if (!await db.getCheckpoint(input.id)) throw new TRPCError({ code: "NOT_FOUND", message: "Checkpoint not found." });
      const nfcConflict = await db.getCheckpointByNfcTag(input.nfcTag);
      if (nfcConflict && nfcConflict.id !== input.id) throw new TRPCError({ code: "CONFLICT", message: "That NFC tag is already assigned to a checkpoint." });
      await db.updateCheckpoint(input.id, input);
      await db.logAdminActivity(ctx.user.id, "Updated checkpoint", "checkpoint", input.id, { label: input.label });
      return { success: true };
    }),
    deleteCheckpoint: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      if (!await db.getCheckpoint(input.id)) throw new TRPCError({ code: "NOT_FOUND", message: "Checkpoint not found." });
      await db.deactivateCheckpoint(input.id);
      await db.logAdminActivity(ctx.user.id, "Deactivated checkpoint", "checkpoint", input.id);
      return { success: true };
    }),
    updateSettings: adminProcedure.input(z.object({ evidenceThreshold: z.number().int().min(0).max(100), defaultShiftHours: z.string().min(3).max(80), notificationRules: z.object({ proofNeedsReview: z.boolean(), cleanerOffline: z.boolean() }), retentionDays: z.number().int().min(30).max(3650) })).mutation(async ({ ctx, input }) => {
      const settings = await db.updateSettings({ ...input, updatedBy: ctx.user.id });
      await db.logAdminActivity(ctx.user.id, "Updated operational settings", "settings", 1, input);
      return settings;
    }),
    inviteTeamMember: adminProcedure.input(z.object({ email: z.string().email(), buildingId: z.number().int().positive(), assignmentRole: z.enum(["operator", "supervisor", "manager"]) })).mutation(async ({ ctx, input }) => {
      const [building, pendingInvite] = await Promise.all([db.getBuilding(input.buildingId), db.getPendingInvite(input.email, input.buildingId)]);
      if (!building || !building.active) throw new TRPCError({ code: "NOT_FOUND", message: "Active building not found." });
      if (pendingInvite) throw new TRPCError({ code: "CONFLICT", message: "A pending invitation already exists for this email and building." });
      const id = await db.createInvite({ ...input, invitedBy: ctx.user.id });
      await db.logAdminActivity(ctx.user.id, "Invited team member", "invite", id, { email: input.email });
      return { id };
    }),
    completeInvite: adminProcedure.input(z.object({ id: z.number().int().positive(), userId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const [invite, targetUser] = await Promise.all([db.getInvite(input.id), db.getUserById(input.userId)]);
      if (!invite || invite.status !== "pending") throw new TRPCError({ code: "NOT_FOUND", message: "A pending invitation was not found." });
      if (!targetUser || !targetUser.email || targetUser.email.toLowerCase() !== invite.email.toLowerCase()) throw new TRPCError({ code: "BAD_REQUEST", message: "Select the Manus OAuth user who matches this invitation email." });
      await db.acceptInvite(input.id);
      await db.upsertAssignment({ userId: targetUser.id, buildingId: invite.buildingId, assignmentRole: invite.assignmentRole, active: true });
      await db.logAdminActivity(ctx.user.id, "Completed team invitation", "invite", invite.id, { email: invite.email, userId: targetUser.id });
      return { success: true };
    }),
    setAssignment: adminProcedure.input(z.object({ userId: z.number().int().positive(), buildingId: z.number().int().positive(), assignmentRole: z.enum(["operator", "supervisor", "manager"]), active: z.boolean() })).mutation(async ({ ctx, input }) => {
      const [building, targetUser, currentAssignment] = await Promise.all([db.getBuilding(input.buildingId), db.getUserById(input.userId), db.getAssignment(input.userId, input.buildingId)]);
      if (!building || !building.active) throw new TRPCError({ code: "NOT_FOUND", message: "Active building not found." });
      if (!targetUser) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      if (!input.active && !currentAssignment) throw new TRPCError({ code: "NOT_FOUND", message: "No active assignment was found to deactivate." });
      await db.upsertAssignment(input);
      await db.logAdminActivity(ctx.user.id, input.active ? "Updated team assignment" : "Deactivated team assignment", "assignment", `${input.userId}:${input.buildingId}`);
      return { success: true };
    }),
    setUserRole: adminProcedure.input(z.object({ userId: z.number().int().positive(), role: z.enum(["user", "admin"]) })).mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id && input.role === "user") throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot remove your own Admin Mode access." });
      if (!await db.getUserById(input.userId)) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      await db.setUserRole(input.userId, input.role);
      await db.logAdminActivity(ctx.user.id, `Changed user role to ${input.role}`, "user", input.userId);
      return { success: true };
    }),
    cancelInvite: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const invite = await db.cancelInvite(input.id);
      if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "A pending invitation was not found." });
      await db.logAdminActivity(ctx.user.id, "Cancelled team invitation", "invite", input.id, { email: invite.email });
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
