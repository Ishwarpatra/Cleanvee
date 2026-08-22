# Cleanvee user-functionality review

## User-outcome summary

Cleanvee has a coherent operational shell: all required workspace tabs are reachable, Admin Mode is role-gated, data mutations have typed service contracts, and the mounted stress suite proves several connected updates without reload. However, the review found two misleading calls to action that appear usable to an operator but do not complete the advertised task. The most significant is in **Shift**, where visible proof-decision buttons perform no mutation. The review therefore treats Shift decision actionability and honest report-export behavior as release-blocking usability work.

## Connected task-chain evidence

| Task chain | User outcome checked | Evidence level | Current result |
|---|---|---:|---|
| Shift → Review → proof decision | Inspect a checkpoint, decide proof, see change in the record. | Mounted + service | **Pass**: Shift and Review both call the persistent proof-decision mutation. |
| Review → notification policy | Open notifications, turn off proof alerts, see drawer close without reload. | Mounted | **Pass**: live policy test confirms the drawer closes and document policy changes. |
| Sites → Admin Mode → sites | Manage building/checkpoint inventory and return to the operational context. | Service + mounted navigation | **Partial**: routes and contracts exist; no live OAuth acceptance run. |
| Reports → export | Obtain an export-ready report artifact. | Mounted + unit | **Pass**: visible checkpoint rows are serialized to CSV and downloaded. |
| Team → Admin Mode | Invite, resolve duplicate conflict, activate/deactivate an assignment. | Mounted + service | **Pass**: the dialog remains open after a duplicate conflict; assignment controls invalidate connected caches. |
| Settings → Admin Mode rules | Change live rule and observe a still-open Workspace update. | Mounted | **Pass**: Workspace and Admin Mode mounted together show the updated threshold and policy consequence without reload. |

## Prioritized findings

| Priority | Finding | User impact | Recommended resolution |
|---:|---|---|---|
| Resolved P1 | Shift’s **Send back**, **Approve**, and **Escalate** controls previously received a no-op callback. | An operator could believe a decision was recorded when nothing changed. | Shift now uses the same persistent proof-decision flow as Review, with a mounted regression test. |
| Resolved P1 | **Export report** previously presented an export affordance but did not generate a file. | A supervisor could not obtain the advertised audit artifact. | Reports now download a CSV generated from the visible checkpoint rows, with export-path coverage. |
| P2 | Review filters, floor-plan selector, and Team role filter are visible but not functional. | The interface suggests controls that do not change the result set. | Implement the filters or label them clearly as unavailable until supported. |
| P2 | Live OAuth browser acceptance is not yet performed. | No manual confirmation of the exact deployed identity/session path. | Keep as an optional user acceptance check; never request or handle a password. |

## Validation status

The connected-flow suite now validates mounted tab navigation, authorization recovery, duplicate-invite recovery, loading/empty/error/retry states, workspace policy propagation, Admin Mode cache propagation, Shift proof actions, and report download. **25 tests pass**, strict type checking passes, and the production build succeeds. A real browser OAuth login remains an optional manual acceptance step because no authenticated session was provided.
