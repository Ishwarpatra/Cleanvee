# Operational Runbooks

This document translates the supplied runbooks into controls that apply to the implemented **offline proof of concept**. The POC accepts pre-parsed evidence metadata; it is not a replacement for a managed evidence store, malware sandbox, or incident-response process.

## RB-000 — Case Startup

| Step | Operator action | Stop condition |
|---|---|---|
| 1 | Confirm the case ID, collector identity, and at least one supplied artifact. | Missing case metadata. |
| 2 | Verify every artifact has an approved SHA-256 value and `verified: true`. | Any integrity verification failure. |
| 3 | Create the case ledger and record the receipt event with artifact IDs and hashes. | Ledger write failure. |
| 4 | Submit the Pydantic-validated case to the API or CLI. | Input-schema validation failure. |
| 5 | Confirm all specialist outputs, fusion, and coordination are present. | Evidence-collection or ledger failure; preserve all partial outputs. |

> **Evidence integrity takes precedence over throughput.** The POC throws an `IntegrityError` before it creates any agent task when even one artifact is unverified.

## RB-001 — Specialist Failure

| Classification | Example | POC action | Escalation |
|---|---|---|---|
| Recoverable | Malformed optional event field or a parsing scope warning | Record the warning and continue with the validated subset. | Review scope in the final report. |
| Partial | One specialist raises an exception while other specialists complete | Preserve a failed `AgentOutput`, continue coordination, and record a gap. | Request the missing evidence or re-run the failed specialist. |
| Critical | Evidence verification, ledger creation, or storage integrity failure | Stop before analysis and preserve the source record. | Notify the evidence custodian and re-acquire or verify the artifact. |

The orchestrator never silently removes a failed specialist. A failure is recorded in the hash-chained ledger and becomes a coordination gap.

## RB-002 — Local-Model Failure (Future Extension)

The current POC runs without an LLM. If local-model enrichment is later enabled, use a finite fallback sequence: reduce the bounded context once, use an approved local fallback model once, then complete in rule-based-only mode. Record model identity, error, fallback, and any confidence adjustment in `metadata`. Do not use a remote model or external enrichment endpoint as an automatic fallback.

## RB-003 — Time and Integrity Anomalies

A parser must reject timestamps without an explicit timezone rather than assume UTC. The coordination layer treats material discrepancies as a conflict and requests review of source-time metadata. An integrity mismatch excludes only the affected artifact; it does not invalidate other independently verified artifacts.

## RB-004 — Iterative Investigation

A coordination decision of `REQUEST_MORE_EVIDENCE` must name the target agent, artifact scope, incident window, and answerable question. Do not repeat the same request with unchanged inputs. After three iterations, create a report with documented residual uncertainty rather than running indefinitely.

| Iteration | Allowed work | Required output |
|---|---|---|
| 1 | All available verified artifact types. | Initial coordination decision. |
| 2 | Targeted re-analysis of named artifact(s) or narrowed period. | New evidence or an explicit no-change result. |
| 3 | Final targeted request. | Final report decision with residual gaps. |

## RB-005 — Scope and Safety Boundaries

The POC must never execute an uploaded file, macro, script, binary, or network payload. Malware analysis consumes only metadata extracted by a separately authorised analysis environment. Threat-intelligence information must be pre-loaded or explicitly approved; no live lookups occur while an investigation is running. Human review remains mandatory before any containment, notification, attribution, legal submission, or external dissemination.
