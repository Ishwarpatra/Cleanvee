import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  getWorkspaceData: vi.fn(), getWorkspaceDataForUser: vi.fn(), listWorkspaceBuildings: vi.fn(), listWorkspaceCheckpoints: vi.fn(), listRecentWorkspaceLogs: vi.fn(), listTeamDirectory: vi.fn(), listTeamDirectoryForUser: vi.fn(), ensureSettings: vi.fn(),
  getDecisionContext: vi.fn(), decideProof: vi.fn(), getCheckpoint: vi.fn(), getActiveAssignment: vi.fn(), reportIssue: vi.fn(), submitProof: vi.fn(),
  listAdminData: vi.fn(), siteHealth: vi.fn(), getBuildingByName: vi.fn(), createBuilding: vi.fn(), getBuilding: vi.fn(),
  createCheckpoint: vi.fn(), getCheckpointByNfcTag: vi.fn(), logAdminActivity: vi.fn(), getUserById: vi.fn(), getAssignment: vi.fn(), upsertAssignment: vi.fn(),
}));

vi.mock("./db", () => dbMocks);
const { appRouter } = await import("./routers");

function context(role: "user" | "admin" = "admin"): TrpcContext {
  return { user: { id: 7, openId: `${role}-flow`, email: `${role}@example.com`, name: "Flow Tester", loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("Cleanvee connected page and tab flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getWorkspaceDataForUser.mockResolvedValue({ buildings: [{ id: 3, name: "Harbor House" }], checkpoints: [{ id: 9, buildingId: 3, label: "Lobby" }], logs: [], proofs: [], settings: { id: 1 } });
    dbMocks.listWorkspaceBuildings.mockResolvedValue([{ id: 3, name: "Harbor House" }]);
    dbMocks.listWorkspaceCheckpoints.mockResolvedValue([{ id: 9, buildingId: 3, label: "Lobby" }]);
    dbMocks.listRecentWorkspaceLogs.mockResolvedValue([]);
    dbMocks.listTeamDirectoryForUser.mockResolvedValue({ members: [], assignments: [], buildings: [] });
    dbMocks.ensureSettings.mockResolvedValue({ id: 1, evidenceThreshold: 80, notificationRules: { proofNeedsReview: true, cleanerOffline: true } });
    dbMocks.getDecisionContext.mockResolvedValue({ log: { id: 14 }, proof: { id: 23 } });
    dbMocks.getCheckpoint.mockResolvedValue({ id: 9, buildingId: 3, active: true });
    dbMocks.getActiveAssignment.mockResolvedValue({ id: 1, userId: 7, buildingId: 3, active: true });
    dbMocks.reportIssue.mockResolvedValue(44);
    dbMocks.submitProof.mockResolvedValue({ logId: 45, proofId: 46 });
    dbMocks.listAdminData.mockResolvedValue({ buildings: [], checkpoints: [], users: [], assignments: [], invites: [], activity: [] });
    dbMocks.siteHealth.mockResolvedValue([]);
    dbMocks.getBuilding.mockResolvedValue({ id: 3, active: true });
    dbMocks.getBuildingByName.mockResolvedValue(undefined);
    dbMocks.createBuilding.mockResolvedValue(3);
    dbMocks.createCheckpoint.mockResolvedValue(9);
    dbMocks.getCheckpointByNfcTag.mockResolvedValue(undefined);
    dbMocks.getUserById.mockResolvedValue({ id: 19, email: "member@example.com" });
    dbMocks.getAssignment.mockResolvedValue({ id: 1, userId: 19, buildingId: 3, assignmentRole: "operator", active: true });
  });

  it("serves every workspace tab from the same persistent data surface", async () => {
    const caller = appRouter.createCaller(context("user"));
    const [shift, sites, checkpoints, logs, team, settings] = await Promise.all([caller.workspace.data(), caller.workspace.buildings(), caller.workspace.checkpoints({ buildingId: 3 }), caller.workspace.logs(), caller.workspace.team(), caller.workspace.settings()]);
    expect(shift.buildings[0].name).toBe("Harbor House");
    expect(sites[0].id).toBe(3);
    expect(checkpoints[0].buildingId).toBe(3);
    expect(logs).toEqual([]);
    expect(team).toEqual({ members: [], assignments: [], buildings: [] });
    expect(settings.evidenceThreshold).toBe(80);
    expect(dbMocks.getWorkspaceDataForUser).toHaveBeenCalledWith(7, "user");
    expect(dbMocks.listTeamDirectoryForUser).toHaveBeenCalledWith(7, "user");
    expect(dbMocks.listWorkspaceBuildings).not.toHaveBeenCalled();
    expect(dbMocks.listWorkspaceCheckpoints).not.toHaveBeenCalled();
    expect(dbMocks.listRecentWorkspaceLogs).not.toHaveBeenCalled();
    expect(dbMocks.listTeamDirectory).not.toHaveBeenCalled();
  });

  it("propagates review and report actions through their shared checkpoint record", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await caller.workspace.decideProof({ logId: 14, proofId: 23, decision: "approved" });
    await expect(caller.workspace.reportIssue({ checkpointId: 9, notes: "Spill needs attention" })).resolves.toEqual({ id: 44 });
    expect(dbMocks.decideProof).toHaveBeenCalledWith({ logId: 14, proofId: 23, decision: "approved", reviewerId: 7 });
    expect(dbMocks.reportIssue).toHaveBeenCalledWith({ checkpointId: 9, buildingId: 3, assignedUserId: 7, notes: "Spill needs attention" });
  });

  it("lets an assigned non-admin log proof but blocks actions outside an assigned building", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.workspace.submitProof({ checkpointId: 9, notes: "Lobby completed" })).resolves.toEqual({ logId: 45, proofId: 46 });
    expect(dbMocks.submitProof).toHaveBeenCalledWith({ checkpointId: 9, buildingId: 3, submittedBy: 7, notes: "Lobby completed" });
    dbMocks.getActiveAssignment.mockResolvedValueOnce(undefined);
    await expect(caller.workspace.reportIssue({ checkpointId: 9, notes: "Spill needs attention" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("connects Admin Mode site, checkpoint, and assignment mutations to the workspace model", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await caller.admin.createBuilding({ name: "Harbor House", address: "1 Pier Way", shiftSchedule: "06:00 — 14:00" });
    await caller.admin.createCheckpoint({ buildingId: 3, label: "Lobby", location: "Ground floor", nfcTag: "nfc-lobby-9", floor: "Level 1", xPosition: 50, yPosition: 50 });
    await caller.admin.setAssignment({ userId: 19, buildingId: 3, assignmentRole: "manager", active: false });
    expect(dbMocks.createBuilding).toHaveBeenCalledWith({ name: "Harbor House", address: "1 Pier Way", shiftSchedule: "06:00 — 14:00", createdBy: 7 });
    expect(dbMocks.createCheckpoint).toHaveBeenCalledWith({ buildingId: 3, label: "Lobby", location: "Ground floor", nfcTag: "nfc-lobby-9", floor: "Level 1", xPosition: 50, yPosition: 50 });
    expect(dbMocks.upsertAssignment).toHaveBeenCalledWith({ userId: 19, buildingId: 3, assignmentRole: "manager", active: false });
  });
});
