"""Passive, deterministic specialised agents for synthetic or pre-parsed forensic evidence.

Each agent consumes already-extracted metadata and event records.  No agent opens a raw memory
image, executes a binary, invokes a shell, or contacts a threat-intelligence service.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta
from math import log2
from typing import Any

from forensics_poc.agents.base import ForensicAgent
from forensics_poc.models import (
    AgentInput,
    ArtifactKind,
    Entity,
    EvidenceArtifact,
    Finding,
    utc_now,
)


def parse_time(value: Any) -> datetime | None:
    """Parse an explicit ISO-8601 timestamp; naive timestamps are deliberately rejected."""
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        return None
    return parsed.astimezone(utc_now().tzinfo)


def bounded(value: float) -> float:
    return max(0.0, min(0.99, value))


def entropy(value: str) -> float:
    """Calculate Shannon entropy for a domain-like string."""
    if not value:
        return 0.0
    counts = Counter(value)
    length = len(value)
    return -sum((count / length) * log2(count / length) for count in counts.values())


def finding(
    agent_id: str,
    artifact: EvidenceArtifact,
    category: str,
    technique_ids: list[str],
    entities: list[Entity],
    description: str,
    confidence: float,
    start: datetime | None = None,
    end: datetime | None = None,
    details: dict[str, Any] | None = None,
) -> Finding:
    now = utc_now()
    return Finding(
        agent_id=agent_id,
        category=category,
        technique_ids=technique_ids,
        entities=entities,
        evidence_refs=[artifact.artifact_id],
        description=description,
        confidence=bounded(confidence),
        confidence_method="rule_based",
        timestamp_start=start or artifact.acquired_at or now,
        timestamp_end=end or start or artifact.acquired_at or now,
        details=details or {},
    )


class LogAnalysisAgent(ForensicAgent):
    def __init__(self) -> None:
        super().__init__("log_analysis_v1", {ArtifactKind.LOG})

    def analyze(self, task: AgentInput):
        started = utc_now()
        findings: list[Finding] = []
        warnings: list[str] = []
        artifacts = self.eligible_artifacts(task)
        for artifact in artifacts:
            events = artifact.content.get("events", [])
            if not isinstance(events, list):
                warnings.append(f"{artifact.artifact_id} has no parseable events list.")
                continue
            failed: dict[tuple[str, str], list[tuple[datetime, dict[str, Any]]]] = defaultdict(list)
            for event in events:
                if not isinstance(event, dict):
                    continue
                if event.get("event_id") == 4625:
                    timestamp = parse_time(event.get("timestamp"))
                    if timestamp:
                        failed[(str(event.get("ip", "unknown")), str(event.get("user", "unknown")))].append(
                            (timestamp, event)
                        )
                    else:
                        warnings.append(
                            f"{artifact.artifact_id} contains Event 4625 without an explicit timezone."
                        )
            for (ip, user), values in failed.items():
                values.sort(key=lambda item: item[0])
                if len(values) >= 20 and values[-1][0] - values[0][0] <= timedelta(minutes=10):
                    findings.append(
                        finding(
                            self.agent_id,
                            artifact,
                            "credential_attack",
                            ["T1110"],
                            [Entity(type="ip", value=ip, role="source"), Entity(type="user", value=user, role="target")],
                            f"{len(values)} failed logon events for {user} from {ip} occurred within ten minutes. "
                            "The concentrated authentication failures are consistent with a credential attack and "
                            "require validation against approved identity-provider activity.",
                            0.82,
                            values[0][0],
                            values[-1][0],
                            {"event_id": 4625, "failed_logons": len(values)},
                        )
                    )
            for event in events:
                if not isinstance(event, dict):
                    continue
                timestamp = parse_time(event.get("timestamp"))
                if not timestamp:
                    continue
                event_id = event.get("event_id")
                user = str(event.get("user", "unknown"))
                host = str(event.get("host", event.get("workstation", "unknown")))
                if event_id == 4672:
                    findings.append(
                        finding(
                            self.agent_id,
                            artifact,
                            "privilege_escalation",
                            ["T1078"],
                            [Entity(type="user", value=user, role="subject"), Entity(type="host", value=host, role="target")],
                            f"Event 4672 recorded special privileges for {user} on {host}. The event is an "
                            "elevation indicator and should be correlated with the account's approved administrative role.",
                            0.70,
                            timestamp,
                            timestamp,
                            {"event_id": 4672},
                        )
                    )
                if event_id == 4656 and "lsass" in str(event.get("object", "")).lower():
                    mask = str(event.get("access_mask", ""))
                    if mask.lower() in {"0x1fffff", "0x1010"}:
                        findings.append(
                            finding(
                                self.agent_id,
                                artifact,
                                "credential_dumping",
                                ["T1003.001"],
                                [
                                    Entity(type="process", value="lsass.exe", role="target"),
                                    Entity(type="process", value=str(event.get("process", "unknown")), role="requestor"),
                                ],
                                "A nonstandard process requested a high-privilege handle to LSASS. This access "
                                "pattern is consistent with credential-dumping activity, subject to validation against "
                                "approved security tooling and the originating process lineage.",
                                0.89,
                                timestamp,
                                timestamp,
                                {"event_id": 4656, "access_mask": mask},
                            )
                        )
        return self.output(
            task,
            started,
            findings,
            [artifact.artifact_id for artifact in artifacts],
            warnings=warnings,
            metadata={"events_processed": sum(len(a.content.get("events", [])) for a in artifacts)},
        )


class NetworkForensicsAgent(ForensicAgent):
    def __init__(self) -> None:
        super().__init__("network_forensics_v1", {ArtifactKind.NETWORK})

    def analyze(self, task: AgentInput):
        started = utc_now()
        findings: list[Finding] = []
        artifacts = self.eligible_artifacts(task)
        for artifact in artifacts:
            connections = artifact.content.get("connections", [])
            if not isinstance(connections, list):
                continue
            internal_smb_targets: set[str] = set()
            for connection in connections:
                if not isinstance(connection, dict):
                    continue
                src = str(connection.get("src", "unknown"))
                dst = str(connection.get("dst", "unknown"))
                port = int(connection.get("dst_port", 0) or 0)
                start_time = parse_time(connection.get("first_seen")) or artifact.acquired_at
                end_time = parse_time(connection.get("last_seen")) or start_time
                interval = connection.get("beacon_interval_seconds") or connection.get("beacon_interval")
                observed = int(connection.get("connection_count", 0) or 0)
                jitter = float(connection.get("beacon_jitter_percent", 100) or 100)
                if interval and (observed >= 10 or bool(connection.get("is_beacon"))) and jitter <= 15:
                    uploaded = int(connection.get("bytes_uploaded", connection.get("bytes", 0)) or 0)
                    cert_anomalies = connection.get("cert_anomalies", [])
                    extra = 0.06 if connection.get("threat_intel_match") else 0.0
                    findings.append(
                        finding(
                            self.agent_id,
                            artifact,
                            "c2_communication",
                            ["T1071.001"],
                            [
                                Entity(type="ip", value=src, role="infected_host"),
                                Entity(type="ip", value=dst, role="suspected_c2"),
                                Entity(type="port", value=str(port), role="destination"),
                            ],
                            f"{src} connected to {dst}:{port} at a regular interval of approximately {interval} "
                            "seconds. The regularity and associated certificate or reputation indicators are "
                            "consistent with application-layer command-and-control, pending packet-level review.",
                            0.88 + extra,
                            start_time,
                            end_time,
                            {
                                "beacon_interval_seconds": interval,
                                "beacon_jitter_percent": jitter,
                                "bytes_uploaded": uploaded,
                                "certificate_anomalies": cert_anomalies,
                            },
                        )
                    )
                    if uploaded > 10 * 1024 * 1024:
                        findings.append(
                            finding(
                                self.agent_id,
                                artifact,
                                "data_exfiltration",
                                ["T1041"],
                                [Entity(type="ip", value=src, role="source"), Entity(type="ip", value=dst, role="external_destination")],
                                f"The connection from {src} to {dst} transferred {uploaded:,} outbound bytes. "
                                "The volume exceeds the POC review threshold and is consistent with potential "
                                "exfiltration, but the content and business purpose remain unverified.",
                                0.80,
                                start_time,
                                end_time,
                                {"bytes_uploaded": uploaded},
                            )
                        )
                domain = str(connection.get("domain", ""))
                if domain and len(domain) > 12 and entropy(domain.replace(".", "")) > 3.5:
                    findings.append(
                        finding(
                            self.agent_id,
                            artifact,
                            "dga_domain",
                            ["T1568.002"],
                            [Entity(type="domain", value=domain, role="candidate_dga")],
                            f"DNS activity included the high-entropy domain {domain}. Its character distribution "
                            "is consistent with a domain-generation candidate and should be corroborated with "
                            "NXDOMAIN rates or threat-intelligence evidence.",
                            0.60,
                            start_time,
                            end_time,
                            {"domain_entropy": round(entropy(domain.replace(".", "")), 3)},
                        )
                    )
                if port == 445 and connection.get("internal", False):
                    internal_smb_targets.add(dst)
            if len(internal_smb_targets) >= 3:
                findings.append(
                    finding(
                        self.agent_id,
                        artifact,
                        "lateral_movement",
                        ["T1021.002"],
                        [Entity(type="host", value=value, role="smb_target") for value in sorted(internal_smb_targets)],
                        "SMB connections reached multiple internal destinations during the observed window. This "
                        "fan-out pattern is consistent with lateral movement, although approved administration "
                        "and software deployment activity must be ruled out.",
                        0.76,
                        artifact.acquired_at,
                        artifact.acquired_at,
                        {"smb_targets": sorted(internal_smb_targets)},
                    )
                )
        return self.output(task, started, findings, [a.artifact_id for a in artifacts])


class MemoryForensicsAgent(ForensicAgent):
    def __init__(self) -> None:
        super().__init__("memory_forensics_v1", {ArtifactKind.MEMORY})

    def analyze(self, task: AgentInput):
        started = utc_now()
        findings: list[Finding] = []
        artifacts = self.eligible_artifacts(task)
        for artifact in artifacts:
            processes = artifact.content.get("processes", [])
            for process in processes if isinstance(processes, list) else []:
                if not isinstance(process, dict):
                    continue
                name = str(process.get("name", "unknown"))
                pid = str(process.get("pid", "unknown"))
                observed_at = parse_time(process.get("timestamp")) or artifact.acquired_at
                if process.get("malfind_mz") and process.get("executable_writable"):
                    remote_ip = str(process.get("remote_ip", "unknown"))
                    confidence = 0.94 if remote_ip != "unknown" else 0.86
                    findings.append(
                        finding(
                            self.agent_id,
                            artifact,
                            "process_injection",
                            ["T1055.001"],
                            [
                                Entity(type="process", value=name, role="injected", attributes={"pid": pid}),
                                Entity(type="memory_address", value=str(process.get("address", "unknown")), role="region"),
                                Entity(type="ip", value=remote_ip, role="remote_connection"),
                            ],
                            f"Volatility-style metadata indicates an executable and writable memory region with an "
                            f"MZ header in {name} (PID {pid}). The observation is consistent with process injection "
                            "and requires preservation of the memory image and plugin output for independent review.",
                            confidence,
                            observed_at,
                            observed_at,
                            {"malfind_mz": True, "executable_writable": True},
                        )
                    )
                if process.get("lsass_handle_full_access") and name.lower() != "lsass.exe":
                    findings.append(
                        finding(
                            self.agent_id,
                            artifact,
                            "credential_dumping",
                            ["T1003.001"],
                            [Entity(type="process", value=name, role="requestor", attributes={"pid": pid}), Entity(type="process", value="lsass.exe", role="target")],
                            f"{name} (PID {pid}) held an elevated handle to LSASS in memory metadata. This is "
                            "consistent with credential-access activity unless validated as an authorised security product.",
                            0.91,
                            observed_at,
                            observed_at,
                        )
                    )
                if process.get("hidden_from_pslist"):
                    findings.append(
                        finding(
                            self.agent_id,
                            artifact,
                            "rootkit_indicator",
                            ["T1014"],
                            [Entity(type="process", value=name, role="hidden_candidate", attributes={"pid": pid})],
                            f"{name} (PID {pid}) was present in a scan-oriented view but absent from the primary "
                            "process list. The discrepancy is a rootkit indicator and should be confirmed with "
                            "a second memory acquisition and independent plugin output.",
                            0.88,
                            observed_at,
                            observed_at,
                        )
                    )
        return self.output(task, started, findings, [a.artifact_id for a in artifacts])


class MalwareAnalysisAgent(ForensicAgent):
    def __init__(self) -> None:
        super().__init__("malware_analysis_v1", {ArtifactKind.MALWARE})

    def analyze(self, task: AgentInput):
        started = utc_now()
        findings: list[Finding] = []
        artifacts = self.eligible_artifacts(task)
        dangerous_imports = {"virtualallocex", "writeprocessmemory", "createremotethread", "minidumpwritedump"}
        suspicious_strings = {"sekurlsa", "mimikatz", "powershell -enc", "createremotethread"}
        for artifact in artifacts:
            metadata = artifact.content
            imports = {str(item).lower() for item in metadata.get("imports", [])}
            strings = {str(item).lower() for item in metadata.get("strings", [])}
            yara_matches = [str(item) for item in metadata.get("yara_matches", [])]
            artifact_time = parse_time(metadata.get("timestamp")) or artifact.acquired_at
            matched_imports = sorted(imports & dangerous_imports)
            matched_strings = sorted({token for token in suspicious_strings if any(token in value for value in strings)})
            entropy_score = float(metadata.get("entropy", 0.0) or 0.0)
            if yara_matches or (entropy_score > 7.0 and matched_imports and matched_strings):
                confidence = 0.95 if yara_matches and metadata.get("threat_intel_match") else 0.88 if yara_matches else 0.72
                findings.append(
                    finding(
                        self.agent_id,
                        artifact,
                        "malware_identification",
                        ["T1027", "T1055.001"],
                        [
                            Entity(type="file", value=artifact.source_name, role="sample"),
                            Entity(type="hash", value=artifact.sha256, role="sha256"),
                        ],
                        f"Static metadata for {artifact.source_name} indicates packed or suspicious executable "
                        "characteristics, including high entropy, dangerous API imports, strings of interest, or "
                        "YARA matches. The sample was not executed by this POC and requires controlled sandbox review.",
                        confidence,
                        artifact_time,
                        artifact_time,
                        {
                            "entropy": entropy_score,
                            "dangerous_imports": matched_imports,
                            "strings_of_interest": matched_strings,
                            "yara_matches": yara_matches,
                            "analysis_scope": "metadata_only_no_execution",
                        },
                    )
                )
        return self.output(task, started, findings, [a.artifact_id for a in artifacts])


class CloudForensicsAgent(ForensicAgent):
    def __init__(self) -> None:
        super().__init__("cloud_forensics_v1", {ArtifactKind.CLOUD})

    def analyze(self, task: AgentInput):
        started = utc_now()
        findings: list[Finding] = []
        artifacts = self.eligible_artifacts(task)
        escalation_actions = {"AttachUserPolicy", "AttachRolePolicy", "CreateAccessKey", "UpdateAssumeRolePolicy", "AssumeRole"}
        for artifact in artifacts:
            events = artifact.content.get("events", [])
            get_objects: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
            for event in events if isinstance(events, list) else []:
                if not isinstance(event, dict):
                    continue
                timestamp = parse_time(event.get("timestamp")) or artifact.acquired_at
                actor = str(event.get("actor", "unknown"))
                action = str(event.get("action", ""))
                source_ip = str(event.get("source_ip", "unknown"))
                if action in escalation_actions:
                    findings.append(
                        finding(
                            self.agent_id,
                            artifact,
                            "cloud_privilege_escalation",
                            ["T1098"],
                            [Entity(type="iam_user", value=actor, role="subject"), Entity(type="ip", value=source_ip, role="source")],
                            f"Cloud audit data shows {action} performed by {actor} from {source_ip}. The operation "
                            "can alter privileges or access paths and should be compared with approved change records.",
                            0.85,
                            timestamp,
                            timestamp,
                            {"action": action},
                        )
                    )
                if action == "GetObject":
                    get_objects[(actor, source_ip)].append(event)
                if action == "StopLogging":
                    findings.append(
                        finding(
                            self.agent_id,
                            artifact,
                            "impair_defenses",
                            ["T1562.008"],
                            [Entity(type="iam_user", value=actor, role="subject"), Entity(type="ip", value=source_ip, role="source")],
                            f"Cloud audit data indicates that {actor} requested logging disruption. Disabling or "
                            "stopping cloud audit logging is a high-risk defensive-impairment action requiring immediate review.",
                            0.95,
                            timestamp,
                            timestamp,
                            {"action": action},
                        )
                    )
            for (actor, source_ip), downloads in get_objects.items():
                total = sum(int(item.get("bytes", 0) or 0) for item in downloads)
                first = parse_time(downloads[0].get("timestamp")) or artifact.acquired_at
                last = parse_time(downloads[-1].get("timestamp")) or first
                foreign = any(bool(item.get("geo_anomaly")) for item in downloads)
                if len(downloads) > 100 or total > 1024**3:
                    confidence = 0.92 if foreign else 0.78
                    bucket = str(downloads[0].get("bucket", "unknown"))
                    findings.append(
                        finding(
                            self.agent_id,
                            artifact,
                            "data_exfiltration",
                            ["T1530"],
                            [
                                Entity(type="iam_user", value=actor, role="subject"),
                                Entity(type="s3_bucket", value=bucket, role="source"),
                                Entity(type="ip", value=source_ip, role="source"),
                            ],
                            f"{actor} made {len(downloads)} cloud object retrievals totaling {total:,} bytes from "
                            f"{bucket}. The volume{', foreign-source anomaly' if foreign else ''} is consistent with "
                            "potential cloud data exfiltration and should be reconciled with the owner's legitimate workload.",
                            confidence,
                            first,
                            last,
                            {"object_requests": len(downloads), "bytes": total, "geo_anomaly": foreign},
                        )
                    )
        return self.output(task, started, findings, [a.artifact_id for a in artifacts])


class EndpointForensicsAgent(ForensicAgent):
    def __init__(self) -> None:
        super().__init__("endpoint_forensics_v1", {ArtifactKind.ENDPOINT})

    def analyze(self, task: AgentInput):
        started = utc_now()
        findings: list[Finding] = []
        artifacts = self.eligible_artifacts(task)
        for artifact in artifacts:
            content = artifact.content
            observed_at = parse_time(content.get("timestamp")) or artifact.acquired_at
            run_keys = content.get("run_keys", [])
            prefetch = {str(item).lower() for item in content.get("prefetch", [])}
            for key in run_keys if isinstance(run_keys, list) else []:
                if not isinstance(key, dict) or not key.get("suspicious"):
                    continue
                payload = str(key.get("payload", "unknown"))
                executed = any(payload.lower().split("\\")[-1] in entry for entry in prefetch)
                findings.append(
                    finding(
                        self.agent_id,
                        artifact,
                        "persistence_mechanism",
                        ["T1547.001"],
                        [
                            Entity(type="registry_key", value=str(key.get("path", "unknown")), role="persistence"),
                            Entity(type="file", value=payload, role="payload"),
                        ],
                        f"A suspicious startup registry entry references {payload}. "
                        f"{'Prefetch evidence supports execution.' if executed else 'Execution evidence was not supplied.'} "
                        "The entry should be compared against authorised software installation records.",
                        0.93 if executed else 0.72,
                        observed_at,
                        observed_at,
                        {"prefetch_confirmed": executed},
                    )
                )
            for path in content.get("shellbags", []) if isinstance(content.get("shellbags", []), list) else []:
                lowered = str(path).lower()
                if "\\\\" in lowered and ("admin$" in lowered or "\\c$" in lowered):
                    findings.append(
                        finding(
                            self.agent_id,
                            artifact,
                            "remote_share_access",
                            ["T1021.002"],
                            [Entity(type="path", value=str(path), role="remote_share")],
                            f"ShellBag metadata records access to the remote administrative share {path}. The access "
                            "may support a lateral-movement hypothesis but requires user, logon, and administrative-change context.",
                            0.78,
                            observed_at,
                            observed_at,
                        )
                    )
        return self.output(task, started, findings, [a.artifact_id for a in artifacts])


class ThreatIntelAgent(ForensicAgent):
    def __init__(self) -> None:
        super().__init__("threat_intel_v1", {ArtifactKind.THREAT_INTEL})

    def analyze(self, task: AgentInput):
        started = utc_now()
        findings: list[Finding] = []
        artifacts = self.eligible_artifacts(task)
        for artifact in artifacts:
            content = artifact.content
            observed_at = parse_time(content.get("timestamp")) or artifact.acquired_at
            ioc_matches = content.get("ioc_matches", [])
            actors = content.get("actor_ttp_similarity", {})
            for match in ioc_matches if isinstance(ioc_matches, list) else []:
                if not isinstance(match, dict):
                    continue
                value = str(match.get("value", "unknown"))
                feeds = [str(feed) for feed in match.get("feeds", [])]
                match_confidence = float(match.get("confidence", 0.0) or 0.0)
                if feeds and match_confidence >= 0.7:
                    findings.append(
                        finding(
                            self.agent_id,
                            artifact,
                            "ioc_enrichment",
                            ["T1588"],
                            [Entity(type=str(match.get("type", "indicator")), value=value, role="matched_ioc")],
                            f"The indicator {value} matched {len(feeds)} locally supplied threat-intelligence source(s). "
                            "The enrichment strengthens prioritisation but does not independently establish actor attribution.",
                            min(0.95, match_confidence),
                            observed_at,
                            observed_at,
                            {"feeds": feeds},
                        )
                    )
            for actor, similarity in actors.items() if isinstance(actors, dict) else []:
                score = float(similarity)
                if score >= 0.60:
                    findings.append(
                        finding(
                            self.agent_id,
                            artifact,
                            "threat_actor_hypothesis",
                            ["T1589"],
                            [Entity(type="threat_actor", value=str(actor), role="hypothesis")],
                            f"Locally supplied TTP profiles show a similarity score of {score:.2f} for {actor}. "
                            "This is an analytical hypothesis only because unrelated actors can reuse infrastructure and techniques.",
                            min(0.85, score),
                            observed_at,
                            observed_at,
                            {"actor_ttp_similarity": score},
                        )
                    )
        return self.output(task, started, findings, [a.artifact_id for a in artifacts])


def all_specialists() -> list[ForensicAgent]:
    """Return the independent specialists run in parallel by the orchestrator."""
    return [
        LogAnalysisAgent(),
        NetworkForensicsAgent(),
        MemoryForensicsAgent(),
        MalwareAnalysisAgent(),
        CloudForensicsAgent(),
        EndpointForensicsAgent(),
        ThreatIntelAgent(),
    ]
