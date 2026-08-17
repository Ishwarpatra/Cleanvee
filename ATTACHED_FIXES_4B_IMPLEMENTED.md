# Latest Attached Recommendations Applied

## Implemented changes

| Area | Applied remediation |
|---|---|
| Daily aggregates | Analytics now uses the canonical `daily_stats` collection already consumed by the frontend. |
| Aggregate updates | `aggregateStats` now handles create, update, and delete transitions with per-log contribution documents and a Firestore transaction, so verification changes adjust counts and scores idempotently. |
| BigQuery delivery | Analytics now normalizes timestamps, uses deterministic BigQuery insert IDs by log and status, and persists failed rows in `analytics_dead_letters` before rethrowing for retry. |
| SLA never-cleaned state | The SLA monitor no longer treats missing timestamps as Unix epoch zero. It evaluates missing-history checkpoints from their valid creation time with a default 24-hour onboarding grace period and skips records with malformed dates. |
| Shared contracts | Alert schemas now use the lowercase status values emitted by Functions and strict top-level/details validation. Checkpoint and cleaning-log schemas now reject unexpected top-level fields. Ticketing alert types now match live SLA vocabulary. |
| External ticketing | Jira and ServiceNow now fail closed when unconfigured instead of returning fake successful tickets, apply 10-second request timeouts, attach deterministic correlation/idempotency headers where available, and return stable `provider_unavailable` errors without provider response bodies. |
| MCP ticket routing | Removed the mock-ticket fallback and added deterministic alert correlation IDs to connector requests. |

## Verification

| Check | Result |
|---|---|
| Web production build | Passed |
| Cloud Functions build | Passed |
| Cloud Functions tests | Passed: 3 suites, 20 tests |
| JSON schema parsing | Passed for alert, checkpoint, and cleaning-log schemas |
| Git diff check | Passed |
| Root TypeScript typecheck | Still has unrelated existing UI/model/privacy typing failures; the web production build is successful. |

## Remaining limitations

A full end-to-end emulator test for aggregate updates, Firestore rules, Storage rules, and dashboard receipt is still required. The sandbox does not have the Firebase Emulator Suite installed. Existing records require a controlled migration if they use uppercase alert statuses or the legacy `stats_daily` collection.

The ticketing connector authorization model still needs to be moved behind a server-only validated alert workflow. The connectors now fail closed and redact provider errors, but callers should populate `authorizationChecked` only after verifying the alert’s tenant/building scope. Provider-side idempotency support should also be confirmed because Jira and ServiceNow may interpret `Idempotency-Key` differently.

The BigQuery row remains intentionally minimized compared with the original implementation, but dataset IAM, retention, deletion propagation, and restoration procedures must be configured operationally. The build still reports a large JavaScript chunk warning, which is a performance optimization opportunity rather than a release blocker.
