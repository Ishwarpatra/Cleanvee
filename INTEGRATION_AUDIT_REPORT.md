# Cleanvee integration dry-run audit

**Audit date:** 22 August 2026  
**Scope:** Non-destructive file connectivity, dependency reproducibility, client/server contracts, schema consistency, local development startup, and public-entry UI audit.

## Verified results

| Area | Evidence | Result |
|---|---|---|
| Dependency reproducibility | Frozen offline install from a clean repository copy | Passed with pnpm 10.4.1 without the package-manager configuration warning. |
| Client, server, and role contracts | Vitest regression suite | 12 files and 38 tests passed. |
| Type connectivity | `pnpm exec tsc --noEmit` | Passed. |
| Production packaging | `pnpm build` | Passed. |
| Drizzle migration consistency | `pnpm exec drizzle-kit check` | Passed. |
| Development startup | Isolated `pnpm dev` dry run | Passed on the next available local port when the preferred port was occupied. |
| Live public routes | `/` and `api/trpc/auth.me` probes | Both returned HTTP 200; unauthenticated auth contract returned `null` as expected. |
| Public-entry UI quality | Rendered Chromium audit against the actual selected local port | 0 WCAG 2 A/AA violations, no horizontal overflow in four viewports, reduced motion active, and no missing input labels or image alternative text. |

## Corrected integration defects

| Defect | Correction |
|---|---|
| Development Vite config injected a collector asset that is not part of the migrated repository. | The injection now occurs only when the optional collector file exists. |
| The rendered UI audit assumed port 3000 while the server deliberately falls back to an available port. | `UI_QA_BASE_URL` now selects the audit target; it defaults to `http://127.0.0.1:3000/`. |
| An unused Wouter route-collection patch required package-manager configuration that the pinned pnpm command warns is deprecated. | The unused patch and configuration were removed; the lockfile was regenerated and a clean extracted copy passed a warning-free frozen offline install. |
| A Vite 5-only JSX-location plugin blocked development startup under Vite 7. | The optional locator integration and its incompatible dependency were removed. |

## Managed-environment acceptance still required

The local audit did not run real Manus OAuth sign-in, connect to a production MySQL database, or apply migrations to a production database. Those operations require the target environment’s managed variables and test users; they were intentionally not simulated, seeded, or altered during this dry run.

Before public launch, configure the managed environment variables, apply `drizzle/0001_worried_chimera.sql` and `drizzle/0002_neat_mandarin.sql` through the normal migration workflow, and complete the signed-in Chromium/Firefox/Safari/Edge acceptance matrix in `BROWSER_AND_AUTH_ACCEPTANCE_MATRIX.md`. The build retains a non-blocking shared-chunk size advisory that can be addressed with future vendor chunk splitting.
