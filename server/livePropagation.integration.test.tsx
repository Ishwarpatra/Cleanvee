// @vitest-environment jsdom
import React, { act, type ComponentType, useSyncExternalStore } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  const workspaceData = { buildings: [{ id: 3, name: "Harbor House" }], checkpoints: [{ id: 9, buildingId: 3, label: "Lobby", floor: "Level 1", xPosition: 50, yPosition: 40 }], logs: [{ id: 14, checkpointId: 9, status: "flagged", updatedAt: new Date() }], proofs: [{ id: 23, cleaningLogId: 14, qualityScore: 66, presence: "nfc_gps", capturedAt: new Date() }], settings: { evidenceThreshold: 80, defaultShiftHours: "06:00 — 14:00", retentionDays: 365, notificationRules: { proofNeedsReview: true, cleanerOffline: true } } };
  return { listeners, workspaceData, workspaceQuery: { isLoading: false, isError: false, refetch: vi.fn(), data: workspaceData }, go: vi.fn(), invalidate: vi.fn(), suppressWorkspacePublish: false, auth: { user: { id: 7, role: "admin", name: "Flow Admin", email: "admin@example.com" }, loading: false }, adminQuery: { isLoading: false, isError: false, refetch: vi.fn(), data: { buildings: [{ id: 3, name: "Harbor House", address: "1 Pier Way", shiftSchedule: "06:00 — 14:00", active: true }], checkpoints: [], users: [{ id: 7, name: "Flow Admin", email: "admin@example.com", role: "admin" }], assignments: [], invites: [], activity: [], siteHealth: [], settings: workspaceData.settings } } };
});

function subscribe(listener: () => void) { mocks.listeners.add(listener); return () => mocks.listeners.delete(listener); }
function publishWorkspaceSettings(input: { evidenceThreshold: number; notificationRules: { proofNeedsReview: boolean; cleanerOffline: boolean } }) { mocks.workspaceQuery = { ...mocks.workspaceQuery, data: { ...mocks.workspaceQuery.data, settings: { ...mocks.workspaceQuery.data.settings, evidenceThreshold: input.evidenceThreshold, notificationRules: input.notificationRules } } }; if (!mocks.suppressWorkspacePublish) mocks.listeners.forEach(listener => listener()); }
function mutation(onMutate?: (input: any) => void) { return { useMutation: (options: { onSuccess?: () => void }) => ({ isPending: false, mutate: (input: any) => { onMutate?.(input); options.onSuccess?.(); } }) }; }

vi.mock("@/lib/trpc", () => ({
  trpc: {
    workspace: { data: { useQuery: () => useSyncExternalStore(subscribe, () => mocks.workspaceQuery) }, team: { useQuery: () => ({ isLoading: false, isError: false, refetch: vi.fn(), data: { members: [], assignments: [], buildings: [] } }) }, decideProof: mutation(), reportIssue: mutation(), submitProof: mutation() },
    admin: { data: { useQuery: () => mocks.adminQuery }, createBuilding: mutation(), updateBuilding: mutation(), deleteBuilding: mutation(), createCheckpoint: mutation(), updateCheckpoint: mutation(), deleteCheckpoint: mutation(), inviteTeamMember: mutation(), completeInvite: mutation(), cancelInvite: mutation(), setAssignment: mutation(), setUserRole: mutation(), updateSettings: mutation(publishWorkspaceSettings) },
    useUtils: () => ({ admin: { data: { invalidate: mocks.invalidate } }, workspace: { data: { invalidate: mocks.invalidate }, team: { invalidate: mocks.invalidate }, buildings: { invalidate: mocks.invalidate }, checkpoints: { invalidate: mocks.invalidate }, settings: { invalidate: mocks.invalidate } } }),
  },
}));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ ...mocks.auth, logout: vi.fn() }) }));
vi.mock("@/const", () => ({ startLogin: vi.fn() }));
vi.mock("wouter", () => ({ useLocation: () => ["/", mocks.go] }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

let Workspace: ComponentType;
let AdminMode: ComponentType;
let workspaceRoot: Root;
let secondaryWorkspaceRoot: Root;
let adminRoot: Root;
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
function button(root: Element, label: string) { const match = Array.from(root.querySelectorAll("button")).find(candidate => candidate.textContent?.replace(/\s+/g, " ").trim() === label); if (!match) throw new Error(`Missing button: ${label}`); return match as HTMLButtonElement; }
function text(root: Element) { return root.textContent?.replace(/\s+/g, " ") ?? ""; }

describe("live Admin Mode → Workspace propagation", () => {
  beforeEach(async () => {
    vi.clearAllMocks(); mocks.suppressWorkspacePublish = false; mocks.workspaceQuery = { ...mocks.workspaceQuery, data: { ...mocks.workspaceQuery.data, settings: { ...mocks.workspaceQuery.data.settings, evidenceThreshold: 80, notificationRules: { proofNeedsReview: true, cleanerOffline: true } } } };
    Workspace = (await import("../client/src/pages/Workspace")).default; AdminMode = (await import("../client/src/pages/AdminMode")).default;
    document.body.innerHTML = "<div id=\"workspace\"></div><div id=\"workspace-secondary\"></div><div id=\"admin\"></div>";
    workspaceRoot = createRoot(document.querySelector("#workspace")!); secondaryWorkspaceRoot = createRoot(document.querySelector("#workspace-secondary")!); adminRoot = createRoot(document.querySelector("#admin")!);
    await act(async () => { workspaceRoot.render(<Workspace />); secondaryWorkspaceRoot.render(<Workspace />); adminRoot.render(<AdminMode />); });
  });
  afterEach(async () => { await act(async () => { workspaceRoot.unmount(); secondaryWorkspaceRoot.unmount(); adminRoot.unmount(); }); document.body.innerHTML = ""; });

  it("updates the visible already-open Workspace Settings threshold after a live Admin Mode rule save without reloading", async () => {
    const workspace = document.querySelector("#workspace")!; const admin = document.querySelector("#admin")!;
    await act(async () => { button(workspace, "Settings").click(); });
    expect(text(workspace)).toContain("80 / 100");
    await act(async () => { button(admin, "Operational rules").click(); });
    const range = admin.querySelector("input[type=range]") as HTMLInputElement;
    const setNativeValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    await act(async () => { setNativeValue?.call(range, "90"); range.dispatchEvent(new Event("input", { bubbles: true })); range.dispatchEvent(new Event("change", { bubbles: true })); });
    expect(text(admin)).toContain("90 / 100");
    await act(async () => { button(admin, "Save live rules").click(); });
    expect(text(workspace)).toContain("90 / 100");
    expect(mocks.go).not.toHaveBeenCalled();
  });

  it("closes an already-open proof drawer and turns off its live trigger policy after Admin Mode disables proof review alerts", async () => {
    const workspace = document.querySelector("#workspace")!; const admin = document.querySelector("#admin")!;
    const notificationButton = workspace.querySelector(".notification-button") as HTMLButtonElement;
    await act(async () => { notificationButton.click(); });
    expect(workspace.querySelector(".notification-drawer")).not.toBeNull();
    await act(async () => { button(admin, "Operational rules").click(); });
    const proofReviewToggle = admin.querySelector("input[type=checkbox]") as HTMLInputElement;
    await act(async () => { proofReviewToggle.click(); });
    await act(async () => { button(admin, "Save live rules").click(); });
    expect(document.documentElement.dataset.cleanveeProofReviewAlerts).toBe("off");
    expect(workspace.querySelector(".notification-drawer")).toBeNull();
    expect(mocks.go).not.toHaveBeenCalled();
  });

  it("visibly refreshes an independently mounted Workspace after a same-origin cross-window storage signal", async () => {
    const secondaryWorkspace = document.querySelector("#workspace-secondary")!;
    await act(async () => { button(secondaryWorkspace, "Settings").click(); });
    expect(text(secondaryWorkspace)).toContain("80 / 100");
    mocks.invalidate.mockImplementation(() => { mocks.listeners.forEach(listener => listener()); });
    mocks.workspaceQuery = { ...mocks.workspaceQuery, data: { ...mocks.workspaceQuery.data, settings: { ...mocks.workspaceQuery.data.settings, evidenceThreshold: 92 } } };
    await act(async () => { window.dispatchEvent(new StorageEvent("storage", { key: "cleanvee:workspace-refresh", newValue: "cross-window" })); });
    expect(text(secondaryWorkspace)).toContain("92 / 100");
    expect(mocks.invalidate).toHaveBeenCalled();
  });

  it("refreshes the independent Workspace through the signal emitted by an actual Admin Mode rule save", async () => {
    const secondaryWorkspace = document.querySelector("#workspace-secondary")!; const admin = document.querySelector("#admin")!;
    await act(async () => { button(secondaryWorkspace, "Settings").click(); button(admin, "Operational rules").click(); });
    expect(text(secondaryWorkspace)).toContain("80 / 100");
    mocks.suppressWorkspacePublish = true;
    mocks.invalidate.mockImplementation(() => { mocks.listeners.forEach(listener => listener()); });
    const range = admin.querySelector("input[type=range]") as HTMLInputElement;
    const setNativeValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    await act(async () => { setNativeValue?.call(range, "93"); range.dispatchEvent(new Event("input", { bubbles: true })); range.dispatchEvent(new Event("change", { bubbles: true })); button(admin, "Save live rules").click(); });
    expect(text(secondaryWorkspace)).toContain("93 / 100");
    expect(mocks.invalidate).toHaveBeenCalled();
  });
});
