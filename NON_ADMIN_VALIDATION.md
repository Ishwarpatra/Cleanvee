# Non-admin experience validation

## 22 August 2026

The non-admin operating experience now has three explicit user outcomes: an **assignment-scoped** workspace, a **Log proof** action that writes an auditable record for the selected checkpoint, and an **issue-reporting** flow guarded by the same building assignment. Admin Mode stays absent from the workspace navigation for the `user` role; the Team tab is directory-only for that role.

The mounted regression suite verifies that a `user` sees “Assigned sites only,” has no Admin Mode control, can submit proof from the modal, and cannot manage the team. Server tests verify assignment-scoped workspace reads, assigned proof submission, and rejection of an unassigned issue report.

Desktop and narrow mobile preview checks remain structurally sound. The responsive shell turns the workspace navigation into a horizontal top strip at mobile width, while the operating panels stack without overlap. The preview’s empty data state is intentionally clear about missing checkpoints; administrators see the direct Admin Mode path for creating them, while a non-admin sees the assignment-specific empty state.

## Refresh expectation

Workspace data is revalidated every **15 seconds** as a reliability fallback. In the same browser view, Admin Mode mutations invalidate connected workspace queries immediately. In an independently opened same-origin Workspace session, an administrator’s building, assignment, checkpoint, or rule change now emits a browser refresh signal using `BroadcastChannel` with a `localStorage` event fallback, so the session refreshes immediately without reload. If browser storage and broadcast events are unavailable, the 15-second query refresh remains a documented, but not separately simulated, fallback. The workspace also clears a selected checkpoint or site when it disappears from the member’s assignment-scoped data.
