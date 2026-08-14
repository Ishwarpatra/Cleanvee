# Implementation Notes and Requirement Traceability

## Delivery Summary

The supplied architecture described an extensive multi-agent cyber-forensics platform. This implementation delivers a **safe, executable MVP** rather than claiming to complete the proposed 35-day production programme. It prioritises deterministic behaviour, local execution, testability, auditability, and explicit uncertainty.

| Requirement group | Implemented POC behaviour | Deferred production work |
|---|---|---|
| FR-01 — evidence ingestion | Validates typed pre-parsed artifacts, explicit-timezone acquisition metadata, SHA-256 format, `verified` status, and a hash-chained event ledger. | Byte-level acquisition, magic-byte classification, object storage, encryption, three-way checksums, and formal custodian workflows. |
| FR-02 — parallel agents | Seven independent specialists run in a bounded thread pool and emit schema-validated outputs. | Celery/Redis workers, container resource limits, horizontal scale, retry queues, and observability. |
| FR-03 — fusion | Deduplicates typed entities, retains agent provenance, and builds relationship edges. | Neo4j persistence, advanced entity resolution, and large-scale graph analytics. |
| FR-04 — timeline | Requires timezone-aware timestamps, orders events deterministically, and flags material timing conflicts. | Native EVTX/PCAP timestamp parsers, clock-skew calibration, gap visualisation, and D3 export. |
| FR-05 — attribution | Emits only confidence-scored hypotheses sourced from supplied offline context. | Curated actor profiles, measured evaluation, and governance review workflows. |
| FR-06 — coordination | Uses transparent quality weights, DST-style combination, conflict/gap detection, and a conservative decision gate. | Full belief-function modelling, intelligent targeted tasking, and stateful multi-iteration queueing. |
| FR-07 — reporting | Exports JSON, HTML, optional PDF, and a minimal STIX-like bundle; includes evidence references and caveats. | Full STIX conformance validation, ATT&CK Navigator layers, signed court-report templates, and multilingual reporting. |
| FR-08 — no paid software | Uses only local Python dependencies; no hosted model, enrichment, or paid API call is coded. | Offline update packages and software supply-chain governance. |

## Deliberate Safety Choices

The POC accepts **pre-parsed** evidence. This is intentional: raw malware and untrusted files should be processed only in a separately authorised, monitored, and isolated environment. The malware specialist therefore considers metadata such as supplied entropy, imports, strings, and YARA results; it never opens or runs the sample. Similarly, threat-intelligence context is supplied as local evidence rather than fetched while a case is active.

> A hash stored in a request is an assertion, not proof. The `verified` gate and hash-chained ledger demonstrate control flow only. A production system must calculate and re-verify content hashes from immutable source bytes under a formal evidence-handling process.

## Confidence Semantics

Confidence expresses the strength of the automated observation within the supplied evidence, not the likelihood of criminal responsibility. Every value is constrained to the range `0.000–0.990`. Confidence is increased only where multiple agents corroborate canonical entities, and documented conflicts reduce it. The coordinator declines to convert pattern similarity into a factual attribution claim.

## Validation Matrix

| Test | Validates |
|---|---|
| `test_agent_input_rejects_empty_evidence` | Evidence task schema cannot be empty. |
| `test_log_agent_detects_brute_force_and_lsass_access` | Known-answer detection of authentication and LSASS-access indicators. |
| `test_network_agent_detects_beacon_and_exfiltration` | Known-answer C2 interval and outbound-volume detection. |
| `test_full_pipeline_runs_specialists_in_parallel_and_produces_reports` | Specialist completion, fusion, timeline ordering, and conservative decision. |
| `test_chain_of_custody_ledger_verifies_and_detects_tampering` | Audit hash-chain validation and tamper detection. |
| `test_unverified_evidence_halts_before_agent_analysis` | Integrity gate halts before work begins. |
| `test_demo_api_exposes_conservative_investigation_result` | Local API contract for the synthetic scenario. |
| `test_api_rejects_unverified_input` | API cannot bypass the integrity gate. |

## Reference Model

The implementation models ATT&CK-style techniques as validation-bound identifiers and uses a minimal STIX-like export vocabulary. MITRE describes ATT&CK as a knowledge base of adversary tactics and techniques based on real-world observations, and the STIX 2.1 specification defines a language and overall structure for cyber-threat and observable information.[1] [2]

## References

[1]: https://attack.mitre.org/ "MITRE ATT&CK"
[2]: https://www.oasis-open.org/standard/6426/ "STIX Version 2.1 — OASIS Open"
