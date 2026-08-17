# Cloud Functions Remediation Summary

## Implemented work

| Priority | Remediation | Status |
|---|---|---|
| 1 | Occupant-feedback authorization and cross-building validation | Implemented. Firestore rules now require authenticated ownership, checkpoint existence, building consistency, assignment scope, approved issue types, bounded details, and an allow-listed payload. The client now includes `submitted_by` and rejects unauthenticated or oversized submissions. The trigger validates the payload and rechecks checkpoint/building consistency. |
| 2 | Notification HTML escaping and production secret handling | Implemented. Firestore-derived notification fields are HTML-escaped. Missing SendGrid credentials now fail in deployed environments and only use mock delivery under emulator/test conditions. |
| 3 | Idempotent alert notification delivery and supervisor audit creation | Implemented. Notification delivery claims are stored under deterministic IDs for created and resolved alerts. The supervisor audit alert now uses a deterministic document ID and is created inside the streak transaction rather than through a side effect inside a retriable callback. |
| 4 | Analytics PII minimization | Implemented. BigQuery no longer receives `cleaner_id`, NFC payload hashes, or precise latitude/longitude. It retains only a boolean location-presence indicator. Daily aggregation now writes to the rules-covered `daily_stats` collection. |
| 5 | Batch and query scalability | Implemented. SLA building metadata is fetched using chunked document-ID queries instead of one read per checkpoint. Alert creation, checkpoint status updates, and SLA-alert resolution are chunked below Firestore’s 500-operation batch limit. |
| 6 | Boundary validation and regression coverage | Implemented. Added runtime validation for cleaning-log and feedback event payloads, plus tests for malformed data, allowed feedback, oversized input, and HTML escaping. |
| 7 | Dependency upgrades | Partially implemented. Updated BigQuery, Firebase Admin, Firebase Functions, Firebase Functions Test, and ts-jest to current compatible wanted versions. |

## Verification results

| Check | Result |
|---|---|
| Cloud Functions TypeScript build | Passed |
| Cloud Functions tests | Passed: 3 suites, 20 tests |
| Root production build | Passed |
| Git whitespace check | Passed |
| Production dependency audit after upgrades | 10 remaining findings: 0 critical, 1 high, 9 moderate |

The remaining dependency findings are transitive. `npm audit fix --omit=dev --package-lock-only` reports that some fixes would require incompatible or inappropriate dependency changes, including a forced downgrade path for `firebase-admin`. These should be handled as a separate dependency compatibility project rather than applied blindly.

## Important limitations

The repository does not currently include Firebase Emulator security-rule tests, and the Firebase CLI is not installed in the sandbox. The new rule changes therefore require a follow-up emulator or CI validation before deployment. The root application’s production build passes, but its existing TypeScript typecheck still contains unrelated pre-existing errors in UI/model files and was not part of the Cloud Functions verification gate.

The existing backend tests still use simplified local mocks for several production trigger behaviors. The new security tests cover pure validation and escaping helpers, but the next hardening step should exercise the actual trigger exports against the Firestore emulator, especially cross-building authorization, notification delivery claims, concurrent duplicate events, and 451/500/501-operation batch boundaries.
