# Cleanvee integration dry-run audit

**Audit date:** 22 August 2026  
**Scope:** Non-destructive file connectivity, dependency reproducibility, client/server contracts, schema consistency, local development startup, and public-entry UI audit.

## Verified results

| Area | Evidence | Result |
|---|---|---|
| Dependency reproducibility | `pnpm install --frozen-lockfile --offline` | Passed with pnpm 10.4.1. |
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
| pnpm 10 ignored patch and override settings declared in `package.json`. | Settings now live in `pnpm-workspace.yaml`; the lockfile was regenerated and validated with a frozen offline install. |
| A Vite 5-only JSX-location plugin blocked development startup under Vite 7. | The optional locator integration and its incompatible dependency were removed. |

## Managed-environment acceptance still required

The local audit did not run real Manus OAuth sign-in, connect to a production MySQL database, or apply migrations to a production database. Those operations require the target environment’s managed variables and test users; they were intentionally not simulated, seeded, or altered during this dry run.

Before public launch, configure the managed environment variables, apply `drizzle/0001_worried_chimera.sql` and `drizzle/0002_neat_mandarin.sql` through the normal migration workflow, and complete the signed-in Chromium/Firefox/Safari/Edge acceptance matrix in `BROWSER_AND_AUTH_ACCEPTANCE_MATRIX.md`. The build retains a non-blocking shared-chunk size advisory that can be addressed with future vendor chunk splitting.
