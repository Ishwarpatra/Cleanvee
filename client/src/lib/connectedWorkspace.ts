type InvalidateTarget = { invalidate: () => unknown };
const workspaceSyncKey = "cleanvee:workspace-refresh";
const workspaceSyncEvent = "cleanvee:workspace-refresh";

export type ConnectedWorkspaceUtils = {
  workspace: {
    data: InvalidateTarget;
    team: InvalidateTarget;
    buildings: InvalidateTarget;
    checkpoints: InvalidateTarget;
    settings: InvalidateTarget;
  };
};

/** Refresh every data view consumed by Shift, Review, Sites, Reports, Team, and Settings. */
export function invalidateConnectedWorkspace(utils: ConnectedWorkspaceUtils) {
  void utils.workspace.data.invalidate();
  void utils.workspace.team.invalidate();
  void utils.workspace.buildings.invalidate();
  void utils.workspace.checkpoints.invalidate();
  void utils.workspace.settings.invalidate();
}

/** Notify other same-origin tabs that workspace data changed. Each receiver re-fetches with its own access scope. */
export function announceWorkspaceRefresh() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(workspaceSyncEvent));
  try { window.localStorage.setItem(workspaceSyncKey, String(Date.now())); } catch { /* Storage can be disabled; BroadcastChannel still provides a best-effort signal. */ }
  try { const channel = new BroadcastChannel(workspaceSyncEvent); channel.postMessage({ changedAt: Date.now() }); channel.close(); } catch { /* BroadcastChannel is not available in every embedded browser. */ }
}

/** Subscribe a Workspace view to same-origin Admin Mode changes made in another browser tab. */
export function subscribeToWorkspaceRefresh(onRefresh: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const onEvent = () => onRefresh();
  const onStorage = (event: StorageEvent) => { if (event.key === workspaceSyncKey) onRefresh(); };
  window.addEventListener(workspaceSyncEvent, onEvent);
  window.addEventListener("storage", onStorage);
  let channel: BroadcastChannel | undefined;
  try { channel = new BroadcastChannel(workspaceSyncEvent); channel.onmessage = onEvent; } catch { /* Storage events remain available for cross-window refresh. */ }
  return () => { window.removeEventListener(workspaceSyncEvent, onEvent); window.removeEventListener("storage", onStorage); channel?.close(); };
}
