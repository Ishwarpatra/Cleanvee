# Attached issue report mapping

## Scope of this review

The attached report describes a different Firebase-based cleaning application: it refers to Firebase Auth and Firestore, Cloud Functions, Twilio, FCM, QR feedback routes, `LoginScreen`, `ProfileDropdown`, and several modal components that are not present in this repository. Current Cleanvee uses **Manus OAuth**, React, tRPC, Drizzle, and MySQL. The review checked the active routes, current authentication hook, Workspace/Admin Mode UI, server procedures, existing test coverage, package manifest, and README.

> **Conclusion:** None of the 27 reported items identifies an unaddressed defect in the current Cleanvee source. Several describe capabilities that are already implemented through Cleanvee’s architecture; the remaining items refer to components, integrations, or UI surfaces that do not exist in this project.

## Item-by-item mapping

| Report items | Current Cleanvee finding | Disposition |
|---|---|---|
| 1, 18, 20 | There is no demo user, Firebase initialization, or direct Firestore profile creation. Authentication is completed with Manus OAuth; `useAuth()` exposes a real logout mutation and the invitation process completes against a matching OAuth user. | Does not apply. |
| 2 | The signed-in Workspace control calls `logout()` from the shared authentication hook. The server logout procedure clears the session cookie, and `server/auth.logout.test.ts` covers that behavior. | Already implemented. |
| 3, 4 | There is no hard-coded profile popup or Help menu in the current routes. The Workspace identity display reads the current OAuth user’s name and email. | Does not apply. |
| 5 | Admin Mode provides an **Add building** action that opens the active building form. | Already implemented. |
| 6 | The top-bar checkpoint search is controlled by state and filters the displayed workspace records. `workspaceTabs.integration.test.tsx` covers global checkpoint filtering; Team has its own live search. | Already implemented. |
| 7, 8 | Cleanvee has no Firestore alerts collection or “View All Notifications” control. Its notification drawer is derived from current workspace proof records and sends users to the relevant review item. | Does not apply. |
| 9, 10 | Cleanvee has no Email/Push toggle, FCM, Twilio, or advertised SMS integration. Admin Mode has only persisted, in-app proof-review and cleaner-offline notification policy controls. | Does not apply. |
| 11 | The current data model has no SLA watchdog or “max interval” fields. There is no disconnected SLA configuration to consolidate. | Does not apply. |
| 12 | Cleanvee deliberately models operational rules as a single administrator-managed live workspace policy. It is access-controlled by the server and propagated to open workspaces. Per-building or per-user policy would be a new product requirement and schema/API design, not a discovered implementation defect. | Product decision; no change made. |
| 13, 14 | `NewBuildingModal`, `NfcTagManagerModal`, `SlaSettingsModal`, and `OccupantReportForm` do not exist in this repository. Building creation/editing is implemented once in Admin Mode. | Does not apply. |
| 15 | NFC tags are managed directly on the active checkpoint create/edit form through its required **NFC TAG** field. | Already implemented. |
| 16, 17 | The current product has no public occupant QR-feedback feature, QR feedback Cloud Function, or hard-coded report IDs. | Does not apply. |
| 19 | The Admin Mode invitation form requires a building and assignment role. Completed invitations create active assignment records, with both procedure and connected-flow regression coverage. | Already implemented. |
| 21 | Current Admin Mode actions deactivate records or assignments through app actions; the reported browser `confirm()` deletion flow is not present. | Does not apply. |
| 22–26 | The reported dashboard KPI names, duplicate grid/map toggle, placeholder map, leftover wrapper, and dark-mode panel do not occur in the active Cleanvee Workspace/Admin Mode routes. | Does not apply. |
| 27 | `BuildingsViewComplete` is not present. The active configuration surface is `AdminMode.tsx`. | Does not apply. |

## Evidence retained in the codebase

| Area | Current implementation evidence |
|---|---|
| Authentication and sign-out | `client/src/_core/hooks/useAuth.ts`; `server/auth.logout.test.ts` |
| Active routes | `client/src/App.tsx` (`/` Workspace and `/admin` Admin Mode) |
| Search and notifications | `client/src/pages/Workspace.tsx`; `server/workspaceTabs.integration.test.tsx` |
| Buildings, checkpoints, NFC, team assignments, invitations | `client/src/pages/AdminMode.tsx`; `server/admin.procedures.test.ts`; `server/connectedFlows.test.ts` |
| Live rules propagation | `client/src/pages/AdminMode.tsx`; `server/livePropagation.integration.test.tsx` |

## Follow-up boundary

No application code was changed as part of this mapping because the report does not match the current codebase. If Firebase, SMS alerts, FCM, public QR feedback, per-building policy, or a profile/help-center experience is now desired for Cleanvee, each should be specified as a new feature with its intended workflow and authorization rules rather than treated as a repair to this app.
