// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { announceWorkspaceRefresh, invalidateConnectedWorkspace, subscribeToWorkspaceRefresh } from "../client/src/lib/connectedWorkspace";

describe("connected workspace refresh contract", () => {
  it("refreshes the data sources used by all six workspace tabs after an admin change", () => {
    const invalidate = vi.fn();
    invalidateConnectedWorkspace({ workspace: { data: { invalidate }, team: { invalidate }, buildings: { invalidate }, checkpoints: { invalidate }, settings: { invalidate } } });
    expect(invalidate).toHaveBeenCalledTimes(5);
  });

  it("notifies a separately opened same-origin workspace through the browser storage refresh signal", () => {
    const refresh = vi.fn();
    const unsubscribe = subscribeToWorkspaceRefresh(refresh);
    window.dispatchEvent(new StorageEvent("storage", { key: "cleanvee:workspace-refresh", newValue: "1" }));
    expect(refresh).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("publishes a refresh signal when Admin Mode completes a mutation", () => {
    announceWorkspaceRefresh();
    expect(window.localStorage.getItem("cleanvee:workspace-refresh")).toBeTruthy();
  });
});
