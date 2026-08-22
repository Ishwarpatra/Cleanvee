import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  getDecisionContext: vi.fn(),
  decideProof: vi.fn(),
  getCheckpoint: vi.fn(),
  getActiveAssignment: vi.fn(),
  reportIssue: vi.fn(),
  submitProof: vi.fn(),
}));

vi.mock("./db", () => dbMocks);
const { appRouter } = await import("./routers");

function userContext(role: "user" | "admin" = "user"): TrpcContext {
  return { user: { id: 14, openId: "workspace-tester", email: "tester@example.com", name: "Workspace Tester", loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("Cleanvee workspace mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getDecisionContext.mockResolvedValue({ log: { id: 9 }, proof: { id: 12 } });
    dbMocks.getCheckpoint.mockResolvedValue({ id: 4, buildingId: 3, active: true });
    dbMocks.getActiveAssignment.mockResolvedValue({ id: 1, userId: 14, buildingId: 3, active: true });
    dbMocks.reportIssue.mockResolvedValue(71);
    dbMocks.submitProof.mockResolvedValue({ logId: 72, proofId: 73 });
  });

  it("records an approved proof decision against the authenticated reviewer", async () => {
    const caller = appRouter.createCaller(userContext("admin"));
    await expect(caller.workspace.decideProof({ logId: 9, proofId: 12, decision: "approved" })).resolves.toEqual({ success: true });
    expect(dbMocks.decideProof).toHaveBeenCalledWith({ logId: 9, proofId: 12, decision: "approved", reviewerId: 14 });
  });

  it("rejects a proof that does not belong to the selected cleaning log", async () => {
    dbMocks.getDecisionContext.mockResolvedValue("mismatch");
    const caller = appRouter.createCaller(userContext("admin"));
    await expect(caller.workspace.decideProof({ logId: 9, proofId: 12, decision: "sent_back" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("blocks a non-admin workspace member from making a proof decision", async () => {
    const caller = appRouter.createCaller(userContext());
    await expect(caller.workspace.decideProof({ logId: 9, proofId: 12, decision: "approved" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.decideProof).not.toHaveBeenCalled();
  });

  it("persists a checkpoint issue with the selected building and reporter", async () => {
    const caller = appRouter.createCaller(userContext());
    await expect(caller.workspace.reportIssue({ checkpointId: 4, notes: "Supply closet has no replacement soap." })).resolves.toEqual({ id: 71 });
    expect(dbMocks.reportIssue).toHaveBeenCalledWith({ checkpointId: 4, buildingId: 3, assignedUserId: 14, notes: "Supply closet has no replacement soap." });
  });

  it("allows an assigned workspace user to submit an auditable proof record", async () => {
    const caller = appRouter.createCaller(userContext());
    await expect(caller.workspace.submitProof({ checkpointId: 4, notes: "Sanitized and restocked." })).resolves.toEqual({ logId: 72, proofId: 73 });
    expect(dbMocks.submitProof).toHaveBeenCalledWith({ checkpointId: 4, buildingId: 3, submittedBy: 14, notes: "Sanitized and restocked." });
  });
});
