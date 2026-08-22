# Cleanvee external browser and authenticated-session acceptance matrix

**Status:** Required before public launch.  
**Owner:** Release owner with access to a test `admin` and a test `user` Manus OAuth account.  
**Local evidence already complete:** Chromium public-entry accessibility, responsive overflow, keyboard focus, reduced-motion emulation, and 34 mounted/service tests.

> This matrix does not request or require a password. Each signer should use their own Manus OAuth session and an approved non-production test workspace.

| Target | Authenticated role | Required flows | Visual/a11y acceptance | Status |
|---|---|---|---|---|
| Chromium desktop, latest | `admin` | Shift, Review, Sites, Reports, Team, Settings, Admin Mode; proof decision; CSV export; building/team/rule mutation | Tab-only navigation, visible focus, dialog close/focus return, contrast, desktop hierarchy, no console errors | Pending live OAuth acceptance |
| Chromium mobile, current Android or iOS browser | `user` | Assigned-site search, log proof, report issue, all six tabs, restricted controls | Portrait and landscape layout, no clipping, 44 px target usability, role guidance | Pending live OAuth acceptance |
| Firefox desktop, latest | `admin` | All workspace tabs plus Admin Mode | Navigation, dialogs, CSV export, contrast, keyboard, no layout regression | Pending external browser coverage |
| Microsoft Edge desktop, latest | `admin` | All workspace tabs plus Admin Mode | Navigation, dialogs, CSV export, contrast, keyboard, no layout regression | Pending external browser coverage |
| Safari macOS, current | `admin` | All workspace tabs plus Admin Mode | Navigation, dialogs, CSV export, contrast, keyboard, no layout regression | Pending external browser coverage |
| Safari iOS, current | `user` | Assigned-site workflow and proof/issue dialogs | Portrait/landscape, scroll behavior, keyboard, touch targets, no clipping | Pending external browser coverage |

## Required signed-in page-by-page review

The reviewer should use representative fixture data that includes an approved, flagged, and waiting checkpoint. The following must be recorded as pass or fail with a screenshot or screen recording where a defect is found.

| Surface | Required signed-in evidence |
|---|---|
| Shift | Queue, floor plan, proof receipt, filters, global search, log-proof/report-issue dialogs, empty state, and CSV export. |
| Review | Queue filter, selected proof, admin decision controls, and `user` supervisor-review restriction. |
| Sites | Building selection, checkpoint map selection, no-sites guidance, and `admin` add-building entry point. |
| Reports | Metric cards, chart alignment, export action, and no-evidence state. |
| Team | Team search, role filter, directory loading/error/no-match states, and management entry point. |
| Settings | All five settings sections, non-admin explanation, and Admin Mode entry point. |
| Admin Mode | Overview, buildings/checkpoints, team access, operational rules, dialogs, error recovery, and workspace refresh after save. |

## Sign-off rule

Mark an entry complete only when the reviewer has verified the required flows under a real Manus OAuth session, observed no blocker or high-severity issue, and logged any medium/low-severity issues for remediation. Local mounted tests remain regression coverage; they do not replace this environment-specific acceptance check.
