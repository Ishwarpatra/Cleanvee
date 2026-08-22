# Cleanvee UI quality-assurance report

**Date:** 22 August 2026  
**Scope:** Production-ready Cleanvee entry and workspace interfaces, including functional behavior, visual integrity, accessibility, responsive behavior, and performance signals.

## Results summary

| Area | Result | Evidence |
|---|---|---|
| Functional behavior | Pass | **34 automated tests** across service contracts, mounted Workspace/Admin Mode flows, proof actions, CSV export, checkpoint/team search, invite conflict recovery, role protection, and cross-window refresh. |
| Navigation and roles | Pass | All six workspace tabs are covered by mounted tests; non-admin scope and absence of Admin Mode/review actions are asserted. |
| Responsive behavior | Pass | Automated overflow checks at 1440×900, 768×1024, 375×812, and 812×375 report **no horizontal overflow**; desktop and mobile visual captures were reviewed. |
| Accessibility | Pass for public entry; partial authenticated evidence | Rendered axe audit reports **0 violations**, no missing image alternative text, no unlabeled input, and a `main` landmark. Keyboard focus is visible on the sign-in control. The modal close control is labelled and the dialog has a programmatic title, but authenticated Workspace/Admin Mode keyboard, focus, and contrast checks remain external acceptance work. |
| Motion preferences | Pass for public entry | Chromium emulation of `prefers-reduced-motion: reduce` matched the query and found **0 elements exceeding 10 ms** for animation or transition duration. A global motion-reduction safeguard now covers all interface elements. |
| Visual and content | Pass for public entry; partial authenticated evidence | The TypeUI-inspired oat/matcha system, proof/floor-plan hierarchy, and public-entry layout were visually reviewed. Mounted Workspace/Admin Mode tests and source review cover all authenticated tabs, visible copy, and empty/error states, but are not a substitute for a signed-in, rendered page-by-page review. No placeholder copy was found by the rendered audit; the unused template home component was also cleaned. |
| Performance | Good local signal | Local headless Chromium measured **FCP 320 ms**, DOM-ready/load below 0.3 s, and production app code at **187 KB gzip** initial JS, **23 KB gzip** CSS, plus route-split Workspace/Admin Mode chunks. |

## Remediations made during QA

1. Fixed two serious public-entry contrast issues: the Cleanvee mark is now dark on the paper card and the entry-page eyebrow color meets the audit threshold.
2. Added semantic `main` landmarks and a polite loading announcement to the public entry/loading states.
3. Added route-level splitting for Workspace and Admin Mode. This reduced the initial JavaScript bundle from 210 KB gzip to 187 KB gzip and isolates the Workspace/Admin Mode code into deferred chunks.
4. Enhanced the reusable Chromium audit script to retain selector-level violation data for future fixes.
5. Added explicit global checkpoint and Team directory search tests, confirming that unmatched checkpoint queries expose an empty state and Team search narrows results.
6. Added explicit reduced-motion emulation to the rendered audit and a global `prefers-reduced-motion` override.
7. Labelled the dialog close control and programmatic dialog title, and removed inactive template placeholder content.

## Page-by-page review record

| Surface | Functional and content evidence | State coverage |
|---|---|---|
| Shift | Mounted Workflow test covers proof selection, approve action, report issue, CSV export, global checkpoint search, and the no-results queue. | Active proof, no proof, no active site, and user restrictions. |
| Review | Mounted tab navigation verifies the review queue; proof actions and admin-only decision restrictions are asserted. | Flagged/waiting filter and clear-queue empty state are implemented and source-reviewed. |
| Sites | Mounted tab navigation and empty-site state are verified. | Building selection, no-sites guidance, and non-admin omission of add-building are covered. |
| Reports | Mounted test verifies export creation and download invocation. | Metrics and no-evidence empty state are implemented and source-reviewed. |
| Team | Mounted test verifies Team search narrows the directory; role control is present. | Loading, retry, no-match, admin-management, and non-admin directory states are implemented and source-reviewed. |
| Settings | Mounted test verifies the non-admin visibility-and-restriction guidance. | Workspace, notifications, integrations, quality rules, and retention sections are implemented and source-reviewed. |
| Admin Mode | Dedicated mounted integration tests verify navigation, assignment deactivation confirmation, role restrictions, and duplicate-invite recovery. | Control-plane dialogs and recovery/error paths are covered by mounted tests. Admin Mode intentionally exposes no global search field; its sectioned lists are the current supported discovery model. |

## Scope limits and follow-up

This environment provides Chromium only. Chromium functional, responsive, accessibility, reduced-motion, and performance checks passed. The rendered browser session had no Manus OAuth cookie, so live browser inspection was limited to the public entry; authenticated Workspace and Admin Mode evidence is from mounted tests and source review, not a live signed-in browser session. Firefox, Safari, and Microsoft Edge should be included in a device-lab or CI browser matrix before a public launch. The production build still emits a non-blocking bundle-size advisory because the shared client entry is 619 KB minified; its 187 KB gzip transfer is acceptable for this QA pass, but deeper vendor splitting remains a future optimization.

The concrete outstanding browser and authenticated-session checks, the expected owner, and pass criteria are listed in [`BROWSER_AND_AUTH_ACCEPTANCE_MATRIX.md`](./BROWSER_AND_AUTH_ACCEPTANCE_MATRIX.md). These are intentionally recorded as external pre-launch acceptance work rather than represented as completed local testing.
