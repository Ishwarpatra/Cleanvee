# Cleanvee Cloud Functions Security and Performance Review

## Executive summary

The updated Cloud Functions compile and their current Jest suites pass, but the review identified several **high-priority security and reliability risks** that are not covered by the existing tests. The most urgent issues are the occupant-feedback trust boundary, HTML injection into operational emails, unbounded event payloads, and non-idempotent retry behavior. The largest performance concern is that the main cleaning-log workflow still performs multiple sequential Firestore reads and writes, while the SLA monitor performs a building lookup for each overdue checkpoint.

The backend dependency audit also reports **23 production-tree vulnerabilities: 3 critical, 7 high, 12 moderate, and 1 low**. Only `firebase-admin` is a direct production dependency; the remaining findings are transitive and should be handled through dependency upgrades and a fresh lockfile review.

> **Review posture:** This pass was read-only. No production behavior was changed. The report separates verified findings from recommended remediations so fixes can be implemented and tested deliberately.

## Verification baseline

| Check | Result |
|---|---|
| Cloud Functions TypeScript build | Passed |
| Cloud Functions Jest tests | Passed: 2 suites, 16 tests |
| Production dependency audit | 23 reported vulnerabilities: 3 critical, 7 high, 12 moderate, 1 low |
| Firestore index inspection | Declared indexes cover the principal compound query shapes, but do not remove all application-level N+1 work |
| Direct production dependency findings | `firebase-admin` reported as moderate through `@google-cloud/firestore` |

## Security findings

### S-01 — High: occupant feedback can target arbitrary checkpoints and alter another tenant’s verified log

**Evidence:** The Firestore rule only checks that `submitted_by` equals the authenticated user and that `checkpoint_id` is a string. It does not verify that the checkpoint exists or belongs to the submitter’s assigned building ([firestore.rules](firestore.rules#L142-L153)). The `onOccupantFeedback` trigger then queries the latest verified log for the supplied checkpoint and changes its status to `flagged_for_review` without checking the feedback author, checkpoint ownership, or building relationship ([functions/src/index.ts](functions/src/index.ts#L368-L391)).

**Impact:** Any authenticated user who can create feedback can potentially flag logs belonging to unrelated buildings, creating cross-tenant integrity violations and an operational denial-of-service against verification records.

**Remediation:** Enforce checkpoint existence and building membership in the create rule, require a valid bounded feedback type and bounded details field, and make the trigger re-check the checkpoint’s building and the submitter’s assigned buildings before changing a log. Prefer writing an immutable moderation event rather than directly mutating the log from untrusted feedback.

### S-02 — High: unescaped Firestore data is interpolated into HTML email

**Evidence:** Alert type, severity, building ID, checkpoint ID, message, and serialized details are inserted directly into the HTML template ([functions/src/notifications.ts](functions/src/notifications.ts#L92-L140)). These values originate from Firestore documents and several upstream fields are not schema- or length-constrained.

**Impact:** Crafted values can produce malformed email markup or HTML injection in downstream mail clients and security scanners. Even where script execution is blocked by the mail client, injected links or deceptive markup can facilitate phishing and reduce message trust.

**Remediation:** Escape all interpolated text and attribute values with a dedicated HTML escaping helper, avoid rendering arbitrary `details` as HTML, and cap the rendered message/details size. The same treatment is required for the resolved-alert template ([functions/src/notifications.ts](functions/src/notifications.ts#L218-L253)).

### S-03 — High: Cloud Functions trust event payloads without schema, size, or range validation

**Evidence:** The main trigger casts Firestore data directly to `CleaningLog` ([functions/src/index.ts](functions/src/index.ts#L213-L221)). The rules validate only selected relationships and timestamps and do not bound string lengths, array sizes, numeric ranges, or the complete document schema ([firestore.rules](firestore.rules#L82-L104)). The analytics trigger forwards cleaner identifiers, NFC hashes, and precise latitude/longitude to BigQuery ([functions/src/analytics.ts](functions/src/analytics.ts#L52-L80)).

**Impact:** Oversized or malformed documents can increase Firestore, email, BigQuery, and function execution costs; invalid timestamps can cause runtime failures; and unexpected fields can widen sensitive-data egress. Admin-written or migrated documents bypass client rules entirely.

**Remediation:** Validate event data at the function boundary with a small schema validator. Reject or quarantine malformed events, cap text and array sizes, require finite scores and coordinates within valid ranges, and validate timestamps before constructing Firestore timestamps or external rows. Add corresponding Firestore rule constraints for client-created logs.

### S-04 — High: broad tenant authorization in Firestore rules undermines backend isolation

**Evidence:** Any manager or admin can create or update any building or checkpoint because those rules do not require the target building to be assigned to the manager ([firestore.rules](firestore.rules#L57-L73)). `daily_stats` is readable by any authenticated user and `sla_events` by any manager/admin without building-scoped checks ([firestore.rules](firestore.rules#L119-L139)).

**Impact:** A manager may modify configuration outside their assigned scope or read cross-tenant operational analytics. Because Cloud Functions use the Admin SDK, these rules are the principal client-side tenant boundary and should be treated as a security control, not only a UI permission.

**Remediation:** Use `resource.data` and `request.resource.data` building IDs to enforce assignment on reads and writes. For global configuration, restrict access to administrators or separate per-building configuration documents with explicit scope. Add emulator-based authorization tests for cross-building reads and writes.

### S-05 — Medium: notification retry behavior can duplicate email delivery

**Evidence:** Both notification handlers enable retries ([functions/src/notifications.ts](functions/src/notifications.ts#L16-L20) and [functions/src/notifications.ts](functions/src/notifications.ts#L179-L183)), but neither checks a durable sent marker before sending. The created-alert handler writes `notified_at` only after SendGrid returns ([functions/src/notifications.ts](functions/src/notifications.ts#L156-L166)).

**Impact:** If SendGrid succeeds and the Firestore marker update fails, the retry sends the same email again. The resolved-alert path has no durable notification marker at all.

**Remediation:** Make each delivery idempotent with a transaction or deterministic delivery document keyed by alert ID and notification type. Check the marker before sending, record the provider message ID after success, and use a bounded retry/dead-letter policy for permanent SendGrid failures.

### S-06 — Medium: missing SendGrid secret silently degrades to a fake-success path

**Evidence:** The handlers replace a missing secret with `SG.placeholder` and log that delivery is being mocked ([functions/src/notifications.ts](functions/src/notifications.ts#L21-L23) and [functions/src/notifications.ts](functions/src/notifications.ts#L151-L157)).

**Impact:** A production misconfiguration can mark an alert as notified without delivering an email, producing a silent operational failure.

**Remediation:** Allow the mock only under an explicit emulator/development flag. In deployed environments, fail loudly when the secret is absent and avoid writing `notified_at` for a message that was not sent.

### S-07 — Medium: analytics exports more sensitive data than the stated minimum — resolved

**Original evidence:** The BigQuery row previously included `cleaner_id`, an NFC payload hash, and precise latitude/longitude.

**Resolution:** The current analytics row omits worker identifiers, NFC material, and precise coordinates. It retains only the building/checkpoint identifiers, quality/status fields, and a boolean indicating whether location proof was supplied. Dataset IAM, retention, and deletion-propagation controls remain operational follow-ups.

### S-08 — Medium: analytics collection mismatch — resolved

**Original evidence:** The pre-remediation Function wrote to `stats_daily/{buildingId}_{date}` while the client and rules used `daily_stats/{docId}`.

**Resolution:** The current Function, frontend listener, and rules use the canonical `daily_stats/{buildingId}_{date}` collection. An emulator end-to-end test should still be added in CI to prove aggregate creation and authorized dashboard receipt.

## Performance and reliability findings

### P-01 — High: the SLA monitor retains an application-level N+1 building lookup

**Evidence:** After the optimized checkpoint and alert queries, the monitor fetches one building document per overdue checkpoint ([functions/src/slaMonitor.ts](functions/src/slaMonitor.ts#L88-L118)). The declared indexes cover the checkpoint and alert query shapes ([firestore.indexes.json](firestore.indexes.json#L3-L52]), but indexes do not eliminate these per-checkpoint reads.

**Impact:** For `N` overdue checkpoints spanning `B` buildings, the function performs up to `N` additional building reads and serial network round trips. A broad outage or missed cleaning window can make `N` large and increase latency and cost.

**Remediation:** Collect unique building IDs, fetch them in `in` query chunks of at most 10, and map manager IDs in memory. Alternatively denormalize notification recipients onto checkpoints when configuration changes. Keep the existing alert deduplication query and batch writes.

### P-02 — High: batch writes are not chunked at Firestore’s 500-operation limit

**Evidence:** `resolveMissingCleanAlerts` adds every matching alert update to one batch ([functions/src/index.ts](functions/src/index.ts#L108-L126)). The SLA monitor creates one batch for alerts and another for checkpoint status updates without a size guard ([functions/src/slaMonitor.ts](functions/src/slaMonitor.ts#L126-L164)).

**Impact:** A large overdue population or accumulated open alerts can exceed Firestore’s batch limit, causing the entire operation to fail and leaving alert/status state partially unprocessed.

**Remediation:** Chunk writes into batches of no more than 500 operations, preferably with a conservative margin such as 450, and commit chunks with bounded concurrency. Add tests for 501 and 1,001 records.

### P-03 — High: the cleaning-log workflow performs many sequential reads and writes

**Evidence:** A verified log can perform alert checks and writes, checkpoint state update, alert-resolution query and batch, checkpoint read, building read, breach-alert query, SLA-event write, streak transaction, and possibly an audit-alert write ([functions/src/index.ts](functions/src/index.ts#L44-L204) and [functions/src/index.ts](functions/src/index.ts#L238-L336)). Three independent Firestore-created triggers also process every cleaning log: the main trigger, daily aggregation, and BigQuery streaming ([functions/src/index.ts](functions/src/index.ts#L213-L213) and [functions/src/analytics.ts](functions/src/analytics.ts#L19-L52)).

**Impact:** End-to-end latency and cost scale with the number of listeners and sequential round trips. Cold starts and transient failures can produce inconsistent secondary state because the analytics functions currently swallow errors.

**Remediation:** Measure per-step latency and Firestore read/write counts in production telemetry. Parallelize independent reads, consolidate event processing where operationally appropriate, and make downstream work idempotent. Treat analytics failures as retryable or route them to a durable dead-letter collection rather than logging and returning success.

### P-04 — High: a non-transactional external write occurs inside a Firestore transaction callback

**Evidence:** The streak transaction callback writes a Firestore alert with `db.collection("alerts").add(...)` before committing the streak transaction ([functions/src/index.ts](functions/src/index.ts#L300-L335)).

**Impact:** Firestore may retry a transaction callback. External writes inside the callback can therefore create duplicate supervisor-audit alerts or duplicate side effects when contention occurs.

**Remediation:** Use a deterministic alert document ID and `transaction.create` so the streak update and audit alert are atomic, or commit the streak transaction first and use an idempotent outbox/worker for alert creation. Do not perform non-transactional side effects inside a retriable callback.

### P-05 — Medium: analytics failures are swallowed and data loss is silent

**Evidence:** `aggregateStats` catches and logs write failures without retrying ([functions/src/analytics.ts](functions/src/analytics.ts#L36-L50]). `streamToBigQuery` also catches insert failures and returns successfully ([functions/src/analytics.ts](functions/src/analytics.ts#L82-L93)).

**Impact:** Firestore triggers can report success even though derived metrics or BigQuery rows were lost. This creates inaccurate dashboards and incomplete audit/analytics records.

**Remediation:** Enable trigger retries where safe, write failed payload metadata to a bounded dead-letter collection, and make BigQuery inserts idempotent using a stable row identifier. Alert on repeated dead-letter growth.

### P-06 — Medium: alert deduplication is check-then-write rather than atomic

**Evidence:** `createSafetyAlert` queries for an existing open alert and then calls `.add()` when none is found ([functions/src/index.ts](functions/src/index.ts#L62-L97)). The SLA monitor follows the same read-then-batch-write pattern ([functions/src/slaMonitor.ts](functions/src/slaMonitor.ts#L66-L152)).

**Impact:** Concurrent duplicate events can both observe no open alert and create duplicates. Retries and simultaneous scheduler invocations amplify the problem.

**Remediation:** Use deterministic alert IDs when the business key is stable, or use a transaction that reads and creates the alert atomically. Preserve history by including the triggering log ID or a unique event ID in the deterministic key where appropriate.

## Test coverage gaps

The existing backend tests pass, but they do not execute the production trigger exports. The tests recreate simplified alert and SLA logic in local helpers, so they cannot detect regressions in notification idempotency, email escaping, BigQuery egress, transaction side effects, or Firestore rule enforcement. The SLA tests also contain assumptions about uppercase alert statuses that differ from the current source’s lowercase values.

The next test layer should use the Firebase Functions test harness plus Firestore emulator tests for cross-building authorization, malformed payloads, duplicate delivery, 501-item batches, and concurrent duplicate events. Add pure unit tests for schema validation and HTML escaping, then add contract tests around BigQuery row minimization.

## Recommended remediation order

| Priority | Workstream | Rationale |
|---|---|---|
| 1 | Fix occupant-feedback authorization and cross-building validation | Direct cross-tenant integrity risk through an authenticated client path. |
| 2 | Escape notification HTML and remove the production placeholder path | Prevent injection and eliminate silent notification loss. |
| 3 | Make alert and notification processing idempotent | Cloud Functions delivery is retryable and duplicate side effects are currently possible. |
| 4 | Remove or pseudonymize unnecessary analytics PII | Reduce data exposure and governance scope. |
| 5 | Chunk writes and batch building reads | Prevent large-outage failures and reduce scheduler latency/cost. |
| 6 | Add boundary validation and emulator-based security tests | Convert implicit trust into testable controls. |
| 7 | Upgrade backend dependencies and re-run the audit | Address 23 reported production-tree vulnerabilities, prioritizing critical/high transitive paths. |

## Conclusion

The updated backend has a solid baseline in compilation, declared query indexes, default-deny rules, and explicit retry handling on notifications. However, the current design still relies on unvalidated event data and contains several at-least-once delivery hazards. The highest-value next step is not a broad rewrite: it is a focused hardening pass around tenant authorization, input validation, HTML encoding, idempotent writes, and bounded batch/query behavior, followed by emulator-backed regression tests.
