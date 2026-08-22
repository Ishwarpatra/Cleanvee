# Cleanvee release guidance

## Readiness summary

The current release baseline passes **33 automated tests**, strict TypeScript validation, and the production build. It includes persistent MySQL/Drizzle operations data, Manus OAuth access, assignment-scoped non-admin work, administrator-only review decisions, full Admin Mode management, connected workspace updates, responsive layouts, a real CSV report export, and the reusable user-functionality review skill.

## Role behavior

| Role | Day-to-day capabilities |
|---|---|
| `user` | Sees assigned site data only; logs proof for assigned checkpoints; reports issues; views sites, team context, reports, and workspace settings; does not see Admin Mode or proof-decision actions. |
| `admin` | Has every workspace capability plus proof decisions, building and checkpoint management, role and assignment management, invitations, operational rules, retention, and activity oversight in **Admin Mode**. |

## Cross-session updates

When an administrator changes buildings, checkpoints, assignments, team access, or operational rules, the current window refreshes immediately. Independently open same-origin Workspace windows receive an immediate refresh signal through `BroadcastChannel`, with a `localStorage` event fallback. The mounted integration suite verifies that an actual Admin Mode rule save visibly updates a separately rendered Workspace through that cross-window signal. If browser signaling is unavailable, the existing 15-second data revalidation remains a resilience fallback; this fallback timing is documented by the query configuration but is not separately simulated in the mounted cross-window test.

## Publishing

1. Review the latest checkpoint in the project management panel.
2. Use the **Publish** button in the interface to publish the application; publication is intentionally user-controlled.
3. For initial rollout, have an `admin` create at least one building and checkpoint, then assign each non-admin member to an active building.
4. Confirm a non-admin account sees only its assigned work and that the `admin` account can reach **Admin Mode**.

> A manual OAuth acceptance test remains optional because no user session was provided during validation. Do not provide a password to an assistant; use the normal Manus OAuth flow or account recovery if you wish to perform this optional final check.
