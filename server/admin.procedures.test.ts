import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  ensureSettings: vi.fn(),
  getBuilding: vi.fn(),
  getInvite: vi.fn(),
  getPendingInvite: vi.fn(),
  getUserById: vi.fn(),
  acceptInvite: vi.fn(),
  createInvite: vi.fn(),
  upsertAssignment: vi.fn(),
  updateSettings: vi.fn(),
  logAdminActivity: vi.fn(),
}));

vi.mock("./db", () => dbMocks);

const { appRouter } = await import("./routers");

function adminContext(): TrpcContext {
  return {
    user: {
      id: 7,
      openId: "admin-test-user",
      email: "admin@example.com",
      name: "Admin Test User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Cleanvee Admin Mode procedures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getBuilding.mockResolvedValue({ id: 3, active: true });
    dbMocks.getInvite.mockResolvedValue({ id: 11, email: "cleaner@example.com", buildingId: 3, assignmentRole: "operator", status: "pending" });
    dbMocks.getUserById.mockResolvedValue({ id: 19, role: "user" });
    dbMocks.getPendingInvite.mockResolvedValue(undefined);
    dbMocks.createInvite.mockResolvedValue(55);
    dbMocks.updateSettings.mockResolvedValue({ id: 1, evidenceThreshold: 85, defaultShiftHours: "18:00–02:00", retentionDays: 365 });
    dbMocks.logAdminActivity.mockResolvedValue(undefined);
  });

  it("blocks a duplicate pending invitation before creating a new invite", async () => {
    dbMocks.getPendingInvite.mockResolvedValue({ id: 11, status: "pending" });
    const caller = appRouter.createCaller(adminContext());

    await expect(caller.admin.inviteTeamMember({ email: "cleaner@example.com", buildingId: 3, assignmentRole: "operator" })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(dbMocks.createInvite).not.toHaveBeenCalled();
  });

  it("refuses a role change for a user record that no longer exists", async () => {
    dbMocks.getUserById.mockResolvedValue(undefined);
    const caller = appRouter.createCaller(adminContext());

    await expect(caller.admin.setUserRole({ userId: 19, role: "admin" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("passes all live operational rules to the persistent settings update", async () => {
    const caller = appRouter.createCaller(adminContext());
    const input = { evidenceThreshold: 85, defaultShiftHours: "18:00–02:00", retentionDays: 365, notificationRules: { proofNeedsReview: false, cleanerOffline: true } };

    await caller.admin.updateSettings(input);

    expect(dbMocks.updateSettings).toHaveBeenCalledWith({ ...input, updatedBy: 7 });
    expect(dbMocks.logAdminActivity).toHaveBeenCalledWith(7, "Updated operational settings", "settings", 1, input);
  });

  it("completes a matching Manus OAuth invitation and creates its active assignment", async () => {
    dbMocks.getUserById.mockResolvedValue({ id: 19, email: "cleaner@example.com" });
    const caller = appRouter.createCaller(adminContext());

    await expect(caller.admin.completeInvite({ id: 11, userId: 19 })).resolves.toEqual({ success: true });
    expect(dbMocks.acceptInvite).toHaveBeenCalledWith(11);
    expect(dbMocks.upsertAssignment).toHaveBeenCalledWith({ userId: 19, buildingId: 3, assignmentRole: "operator", active: true });
  });
});
