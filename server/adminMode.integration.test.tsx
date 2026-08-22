// @vitest-environment jsdom
import React, { act, type ComponentType } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const invalidate = vi.fn();
  const mutations: Record<string, ReturnType<typeof vi.fn>> = { setAssignment: vi.fn() };
  const mutation = (name: string) => ({ useMutation: (options: { onSuccess?: () => void }) => ({ isPending: false, mutate: vi.fn((input) => { (mutations[name] ??= vi.fn())(input); options.onSuccess?.(); }) }) });
  return { go: vi.fn(), logout: vi.fn(), refetch: vi.fn(), invalidate, mutations, mutation, toast: { success: vi.fn(), error: vi.fn() }, auth: { user: { id: 7, role: "admin", name: "Flow Admin", email: "admin@example.com" } as { id: number; role: "admin" | "user"; name: string; email: string }, loading: false }, dataQuery: { isLoading: false, isError: false, refetch: null as unknown, data: null as unknown } };
});

const adminData = {
  buildings: [{ id: 3, name: "Harbor House", address: "1 Pier Way", shiftSchedule: "06:00 — 14:00", active: true }],
  checkpoints: [{ id: 9, buildingId: 3, label: "Lobby", floor: "Level 1", active: true }],
  users: [{ id: 7, name: "Flow Admin", email: "admin@example.com", role: "admin" }, { id: 19, name: "Team Member", email: "member@example.com", role: "user" }],
  assignments: [{ id: 2, userId: 19, buildingId: 3, assignmentRole: "operator", active: true }],
  invites: [], activity: [], siteHealth: [], settings: { evidenceThreshold: 80, defaultShiftHours: "06:00 — 14:00", retentionDays: 365, notificationRules: { proofNeedsReview: true, cleanerOffline: true } },
};

const mutationNames = ["createBuilding", "updateBuilding", "deleteBuilding", "createCheckpoint", "updateCheckpoint", "deleteCheckpoint", "inviteTeamMember", "completeInvite", "cancelInvite", "setAssignment", "setUserRole", "updateSettings"] as const;
vi.mock("@/lib/trpc", () => ({ trpc: { admin: { data: { useQuery: () => mocks.dataQuery }, ...Object.fromEntries(mutationNames.map(name => [name, mocks.mutation(name)])), inviteTeamMember: { useMutation: (options: { onError?: (error: Error) => void }) => ({ isPending: false, mutate: vi.fn(() => options.onError?.(new Error("A pending invitation already exists for this email."))) }) } }, useUtils: () => ({ admin: { data: { invalidate: mocks.invalidate } }, workspace: { data: { invalidate: mocks.invalidate }, team: { invalidate: mocks.invalidate }, buildings: { invalidate: mocks.invalidate }, checkpoints: { invalidate: mocks.invalidate }, settings: { invalidate: mocks.invalidate } } }) } }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ ...mocks.auth, logout: mocks.logout }) }));
vi.mock("wouter", () => ({ useLocation: () => ["/admin", mocks.go] }));
vi.mock("sonner", () => ({ toast: mocks.toast }));

let AdminMode: ComponentType;
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
function button(label: string) { const match = Array.from(document.querySelectorAll("button")).find(candidate => candidate.textContent?.replace(/\s+/g, " ").trim() === label); if (!match) throw new Error(`Missing button: ${label}`); return match as HTMLButtonElement; }
function bodyText() { return document.body.textContent?.replace(/\s+/g, " ") ?? ""; }
function iconNames() { return Array.from(document.querySelectorAll<SVGSVGElement>("svg[data-cleanvee-icon]")).map(icon => icon.dataset.cleanveeIcon); }
function expectCustomIcons(...names: string[]) { const rendered = iconNames(); expect(rendered.length).toBeGreaterThan(0); expect(Array.from(document.querySelectorAll("svg")).every(icon => icon.hasAttribute("data-cleanvee-icon"))).toBe(true); for (const name of names) expect(rendered).toContain(name); }
function iconButton(label: string) { const control = document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`); if (!control) throw new Error(`Missing icon button: ${label}`); return control; }

describe("mounted Admin Mode connected flows", () => {
  beforeEach(async () => {
    vi.clearAllMocks(); Object.values(mocks.mutations).forEach(call => call.mockClear());
    mocks.auth.user = { id: 7, role: "admin", name: "Flow Admin", email: "admin@example.com" }; mocks.auth.loading = false;
    mocks.dataQuery.isLoading = false; mocks.dataQuery.isError = false; mocks.dataQuery.refetch = mocks.refetch; mocks.dataQuery.data = adminData;
    AdminMode = (await import("../client/src/pages/AdminMode")).default;
    document.body.innerHTML = "<div id=\"root\"></div>"; root = createRoot(document.querySelector("#root")!);
    await act(async () => { root.render(<AdminMode />); });
  });
  afterEach(async () => { await act(async () => root.unmount()); document.body.innerHTML = ""; });

  it("navigates the Admin Mode sections and propagates an assignment deactivation to all workspace data views", async () => {
    expect(bodyText()).toContain("Workspace control plane");
    await act(async () => { button("Team access").click(); });
    expect(bodyText()).toContain("Team access");
    await act(async () => { button("Deactivate").click(); });
    expect(bodyText()).toContain("Deactivate team assignment");
    await act(async () => { button("Deactivate assignment").click(); });
    expect(mocks.mutations.setAssignment).toHaveBeenCalledWith({ userId: 19, buildingId: 3, assignmentRole: "operator", active: false });
    expect(mocks.invalidate).toHaveBeenCalledTimes(6);
    await act(async () => { button("Buildings & checkpoints").click(); });
    expect(bodyText()).toContain("Buildings & checkpoints");
    await act(async () => { button("Operational rules").click(); });
    expect(bodyText()).toContain("Operational rules");
  });

  it("uses the original Cleanvee icon system for administrator navigation and identity", () => {
    const navigationIcons = Array.from(document.querySelectorAll(".admin-sidebar nav [data-cleanvee-icon]")).map(icon => icon.getAttribute("data-cleanvee-icon"));
    expect(navigationIcons).toEqual(["review", "site", "team", "rules"]);
    expect(document.querySelector('.admin-header [data-cleanvee-icon="admin"]')).not.toBeNull();
  });

  it("renders only original Cleanvee SVGs across all Admin Mode sections and management dialogs", async () => {
    expectCustomIcons("mark", "review", "site", "team", "rules", "back", "admin");

    await act(async () => { button("Buildings & checkpoints").click(); });
    expectCustomIcons("site", "add");
    await act(async () => { button("Add building").click(); });
    expectCustomIcons("close");
    await act(async () => { iconButton("Close").click(); });

    await act(async () => { button("Team access").click(); });
    expectCustomIcons("team");
    await act(async () => { button("Invite member").click(); });
    expectCustomIcons("team", "close");
    await act(async () => { iconButton("Close").click(); });
    await act(async () => { button("Deactivate").click(); });
    expectCustomIcons("close");
    await act(async () => { iconButton("Close").click(); });

    await act(async () => { button("Operational rules").click(); });
    expectCustomIcons("rules");
  });

  it("guides a first-time administrator straight to building setup instead of an inert empty overview", async () => {
    mocks.dataQuery.data = { ...adminData, buildings: [], checkpoints: [], assignments: [], siteHealth: [] };
    await act(async () => { root.render(<AdminMode />); });
    expect(bodyText()).toContain("Buildings & checkpoints");
    await act(async () => { button("Add building").click(); });
    expect(bodyText()).toContain("Create building");
  });

  it("renders the mounted access-recovery state for a user role", async () => {
    mocks.auth.user = { id: 19, role: "user", name: "Team Member", email: "member@example.com" };
    await act(async () => { root.render(<AdminMode />); });
    expect(bodyText()).toContain("Admin Mode is restricted");
    await act(async () => { button("Return to workspace").click(); });
    expect(mocks.go).toHaveBeenCalledWith("/");
  });

  it("keeps the invitation flow open after a duplicate-conflict error so the admin can recover without reload", async () => {
    await act(async () => { button("Team access").click(); });
    await act(async () => { button("Invite member").click(); });
    const email = document.querySelector("input[type=email]") as HTMLInputElement;
    const setNativeValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    await act(async () => { setNativeValue?.call(email, "member@example.com"); email.dispatchEvent(new Event("input", { bubbles: true })); email.dispatchEvent(new Event("change", { bubbles: true })); button("Send invitation").click(); });
    expect(mocks.toast.error).toHaveBeenCalledWith("A pending invitation already exists for this email.");
    expect(bodyText()).toContain("Invite team member");
    expect(email.value).toBe("member@example.com");
    expect(mocks.go).not.toHaveBeenCalled();
  });
});
