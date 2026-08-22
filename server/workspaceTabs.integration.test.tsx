// @vitest-environment jsdom
import React, { act, type ComponentType } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  go: vi.fn(),
  logout: vi.fn(),
  refetch: vi.fn(),
  invalidate: vi.fn(),
  mutate: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  auth: { user: { id: 7, role: "admin", name: "Flow Admin", email: "admin@example.com" }, loading: false, error: null as Error | null },
  data: { buildings: [{ id: 3, name: "Harbor House" }], checkpoints: [{ id: 9, buildingId: 3, label: "Lobby", floor: "Level 1", xPosition: 50, yPosition: 40 }], logs: [{ id: 14, checkpointId: 9, status: "flagged", updatedAt: new Date() }], proofs: [{ id: 23, cleaningLogId: 14, qualityScore: 66, presence: "nfc_gps", capturedAt: new Date() }], settings: { evidenceThreshold: 80, defaultShiftHours: "06:00 — 14:00", retentionDays: 365, notificationRules: { proofNeedsReview: true, cleanerOffline: true } } },
  dataQuery: { isLoading: false, isError: false, refetch: null as unknown, data: null as unknown },
  teamQuery: { isLoading: false, isError: false, refetch: null as unknown, data: { members: [], assignments: [], buildings: [] } },
}));

mocks.dataQuery.refetch = mocks.refetch;
mocks.dataQuery.data = mocks.data;
mocks.teamQuery.refetch = mocks.refetch;

vi.mock("@/lib/trpc", () => ({
  trpc: {
    workspace: {
      data: { useQuery: () => mocks.dataQuery },
      team: { useQuery: () => mocks.teamQuery },
      decideProof: { useMutation: () => ({ mutate: mocks.mutate, isPending: false }) },
      reportIssue: { useMutation: () => ({ mutate: mocks.mutate, isPending: false }) },
      submitProof: { useMutation: () => ({ mutate: mocks.mutate, isPending: false }) },
    },
    useUtils: () => ({ workspace: { data: { invalidate: mocks.invalidate }, team: { invalidate: mocks.invalidate }, buildings: { invalidate: mocks.invalidate }, checkpoints: { invalidate: mocks.invalidate }, settings: { invalidate: mocks.invalidate } } }),
  },
}));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ ...mocks.auth, logout: mocks.logout }) }));
vi.mock("@/const", () => ({ startLogin: vi.fn() }));
vi.mock("wouter", () => ({ useLocation: () => ["/", mocks.go] }));
vi.mock("sonner", () => ({ toast: mocks.toast }));

let Workspace: ComponentType;
let buildShiftReportCsv: (items: any[]) => string;

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
function button(label: string) { const match = Array.from(document.querySelectorAll("button")).find(candidate => candidate.textContent?.replace(/\s+/g, " ").trim() === label); if (!match) throw new Error(`Missing button: ${label}`); return match as HTMLButtonElement; }
function bodyText() { return document.body.textContent?.replace(/\s+/g, " ") ?? ""; }
function setValue(control: HTMLInputElement, value: string) { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set; setter?.call(control, value); control.dispatchEvent(new Event("input", { bubbles: true })); }

describe("authenticated connected Workspace tabs", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.auth.user = { id: 7, role: "admin", name: "Flow Admin", email: "admin@example.com" };
    mocks.auth.loading = false; mocks.auth.error = null;
    mocks.dataQuery.isLoading = false; mocks.dataQuery.isError = false; mocks.dataQuery.data = mocks.data;
    mocks.teamQuery.isLoading = false; mocks.teamQuery.isError = false; mocks.teamQuery.data = { members: [], assignments: [], buildings: [] };
    const workspaceModule = await import("../client/src/pages/Workspace");
    Workspace = workspaceModule.default;
    buildShiftReportCsv = workspaceModule.buildShiftReportCsv;
    document.body.innerHTML = "<div id=\"root\"></div>";
    root = createRoot(document.querySelector("#root")!);
    await act(async () => { root.render(<Workspace />); });
  });
  afterEach(async () => { await act(async () => root.unmount()); document.body.innerHTML = ""; });

  it("moves through Shift, Review, Sites, Reports, Team, Settings, and Admin Mode from one authenticated workspace", async () => {
    expect(bodyText()).toContain("Shift command center");
    for (const [tab, heading] of [["Review", "Review queue"], ["Sites", "Sites"], ["Reports", "Reports"], ["Team", "Team"], ["Settings", "Settings"]]) {
      await act(async () => { button(tab).click(); });
      expect(bodyText()).toContain(heading);
    }
    await act(async () => { button("Admin Mode").click(); });
    expect(mocks.go).toHaveBeenCalledWith("/admin");
  });

  it("renders the original Cleanvee icon set for the brand and all workspace navigation tabs", () => {
    expect(document.querySelector('[data-cleanvee-icon="mark"]')).not.toBeNull();
    const navigationIcons = Array.from(document.querySelectorAll(".sidebar nav [data-cleanvee-icon]")).map(icon => icon.getAttribute("data-cleanvee-icon"));
    expect(navigationIcons).toEqual(["shift", "review", "site", "reports", "team", "rules"]);
    expect(document.querySelector('[aria-label="Open notifications"] [data-cleanvee-icon="notice"]')).not.toBeNull();
  });

  it("keeps the primary Workspace and Admin Mode icon surfaces free of third-party generic icon imports", () => {
    const workspaceSource = readFileSync(resolve(process.cwd(), "client/src/pages/Workspace.tsx"), "utf8");
    const adminModeSource = readFileSync(resolve(process.cwd(), "client/src/pages/AdminMode.tsx"), "utf8");
    for (const source of [workspaceSource, adminModeSource]) {
      expect(source).toContain('from "@/components/CleanveeIcon"');
      expect(source).not.toContain('from "lucide-react"');
    }
  });

  it("renders loading, empty, error, and retry states from the shared query", async () => {
    mocks.dataQuery.isLoading = true;
    await act(async () => { root.render(<Workspace />); });
    expect(bodyText()).toContain("Syncing workspace records");
    mocks.dataQuery.isLoading = false; mocks.dataQuery.data = { ...mocks.data, buildings: [], checkpoints: [], logs: [], proofs: [] };
    await act(async () => { root.render(<Workspace />); button("Sites").click(); });
    expect(bodyText()).toContain("No sites available");
    mocks.dataQuery.isError = true;
    await act(async () => { root.render(<Workspace />); });
    expect(bodyText()).toContain("Workspace data is unavailable");
    await act(async () => { button("Try again").click(); });
    expect(mocks.refetch).toHaveBeenCalled();
  });

  it("persists a Shift proof decision and downloads the visible report rows", async () => {
    await act(async () => { button("Approve").click(); });
    expect(mocks.mutate).toHaveBeenCalledWith({ logId: 14, proofId: 23, decision: "approved" });
    const report = buildShiftReportCsv([{ name: "Lobby", building: "Harbor House", floor: "Level 1", status: "flagged", score: 66, presence: "NFC + GPS verified", captured: "09:15" }]);
    expect(report).toContain("Checkpoint,Building,Floor,Status,Quality score,Presence,Recorded time");
    expect(report).toContain('"Lobby","Harbor House","Level 1","FLAGGED","66"');
    const oldCreateObjectUrl = URL.createObjectURL;
    const oldRevokeObjectUrl = URL.revokeObjectURL;
    const createObjectUrl = vi.fn(() => "blob:cleanvee-report");
    const revokeObjectUrl = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectUrl });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectUrl });
    const download = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    await act(async () => { button("Reports").click(); });
    expect(bodyText()).toContain("Export-ready shift and compliance reporting.");
    await act(async () => { button("Export report").click(); });
    expect(createObjectUrl).toHaveBeenCalledOnce();
    expect(download).toHaveBeenCalledOnce();
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:cleanvee-report");
    download.mockRestore();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: oldCreateObjectUrl });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: oldRevokeObjectUrl });
  });

  it("filters checkpoints globally and filters the team directory by its own search field", async () => {
    const checkpointSearch = document.querySelector<HTMLInputElement>('input[placeholder="Search checkpoints"]');
    expect(checkpointSearch).not.toBeNull();
    await act(async () => { setValue(checkpointSearch!, "unmatched checkpoint"); });
    expect(bodyText()).toContain("Showing results for unmatched checkpoint");
    expect(bodyText()).toContain("No proofs in this view");
    const clearSearch = document.querySelector<HTMLButtonElement>(".global-search button");
    expect(clearSearch).not.toBeNull();
    await act(async () => { clearSearch!.click(); });
    expect(bodyText()).toContain("Lobby");

    mocks.teamQuery.data = { members: [{ id: 12, name: "Asha Rivera", email: "asha@example.com", role: "user" }, { id: 13, name: "Morgan Lee", email: "morgan@example.com", role: "admin" }], assignments: [{ userId: 12, buildingId: 3, active: true }], buildings: [{ id: 3, name: "Harbor House" }] } as never;
    await act(async () => { button("Team").click(); });
    const teamSearch = document.querySelector<HTMLInputElement>('input[placeholder="Search team"]');
    expect(teamSearch).not.toBeNull();
    await act(async () => { setValue(teamSearch!, "asha"); });
    expect(bodyText()).toContain("Asha Rivera");
    expect(bodyText()).not.toContain("Morgan Lee");
  });

  it("gives a non-admin an assigned-site workflow without exposing Admin Mode", async () => {
    mocks.auth.user = { id: 8, role: "user", name: "Site Operator", email: "operator@example.com" };
    await act(async () => { root.render(<Workspace />); });
    expect(bodyText()).toContain("Assigned sites only");
    expect(bodyText()).not.toContain("Admin Mode");
    expect(bodyText()).not.toContain("Approve");
    expect(bodyText()).toContain("Supervisor review required");
    await act(async () => { button("Log proof").click(); });
    expect(bodyText()).toContain("Record your completed checkpoint for supervisor review.");
    await act(async () => { button("Submit proof").click(); });
    expect(mocks.mutate).toHaveBeenCalledWith({ checkpointId: 9, notes: undefined });
    await act(async () => { button("Review").click(); });
    expect(bodyText()).toContain("Evidence status");
    expect(bodyText()).not.toContain("Approve");
    expect(bodyText()).toContain("Supervisor review required");
    await act(async () => { button("Sites").click(); });
    expect(bodyText()).toContain("Buildings");
    expect(bodyText()).not.toContain("Add building");
    await act(async () => { button("Reports").click(); });
    expect(bodyText()).toContain("Export-ready shift and compliance reporting.");
    await act(async () => { button("Team").click(); });
    expect(bodyText()).not.toContain("Manage team");
    await act(async () => { button("Settings").click(); });
    expect(bodyText()).toContain("Settings are visible to all workspace members.");
    expect(bodyText()).toContain("Only the admin role can change them.");
  });
});
