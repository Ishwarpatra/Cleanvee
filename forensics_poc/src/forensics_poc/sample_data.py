"""Deterministic synthetic evidence used by the demo and automated tests."""

from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime, timedelta

from forensics_poc.models import ArtifactKind, CaseRequest, EvidenceArtifact

UTC = UTC
BASE = datetime(2026, 7, 15, 23, 30, tzinfo=UTC)


def content_hash(content: dict) -> str:
    return hashlib.sha256(json.dumps(content, sort_keys=True, separators=(",", ":")).encode("utf-8")).hexdigest()


def artifact(artifact_id: str, source_name: str, kind: ArtifactKind, content: dict) -> EvidenceArtifact:
    return EvidenceArtifact(
        artifact_id=artifact_id,
        source_name=source_name,
        kind=kind,
        content=content,
        sha256=content_hash(content),
        verified=True,
        acquired_at=BASE,
        collector="POC Collection Officer",
        notes="Synthetic evidence for deterministic tests; not a real incident artifact.",
    )


def build_demo_case(case_id: str = "CASE-POC-20260715-001") -> CaseRequest:
    """Build a complete APT-style scenario without using real victims or live IOCs."""
    failed_logons = [
        {
            "timestamp": (BASE + timedelta(seconds=index * 4)).isoformat(),
            "event_id": 4625,
            "user": "CORP\\jdoe",
            "ip": "203.0.113.47",
            "host": "WS-2024-042",
        }
        for index in range(50)
    ]
    logs = {
        "events": failed_logons
        + [
            {
                "timestamp": (BASE + timedelta(minutes=17)).isoformat(),
                "event_id": 4672,
                "user": "CORP\\jdoe",
                "host": "WS-2024-042",
            },
            {
                "timestamp": (BASE + timedelta(minutes=65)).isoformat(),
                "event_id": 4656,
                "user": "CORP\\jdoe",
                "process": "unknown_tool.exe",
                "object": "C:\\Windows\\System32\\lsass.exe",
                "access_mask": "0x1fffff",
            },
        ]
    }
    network = {
        "connections": [
            {
                "src": "10.1.2.54",
                "dst": "203.0.113.47",
                "dst_port": 443,
                "connection_count": 48,
                "beacon_interval_seconds": 300,
                "beacon_jitter_percent": 4.2,
                "bytes_uploaded": 52 * 1024 * 1024,
                "cert_anomalies": ["self_signed", "common_name_mismatch"],
                "first_seen": (BASE + timedelta(hours=2)).isoformat(),
                "last_seen": (BASE + timedelta(hours=6)).isoformat(),
                "threat_intel_match": True,
            },
            {"src": "10.1.2.54", "dst": "10.1.2.101", "dst_port": 445, "internal": True},
            {"src": "10.1.2.54", "dst": "10.1.2.102", "dst_port": 445, "internal": True},
            {"src": "10.1.2.54", "dst": "10.1.2.103", "dst_port": 445, "internal": True},
        ]
    }
    memory = {
        "processes": [
            {
                "name": "svchost.exe",
                "pid": 1844,
                "timestamp": (BASE + timedelta(hours=2, minutes=5)).isoformat(),
                "malfind_mz": True,
                "executable_writable": True,
                "address": "0x7FF800000000",
                "remote_ip": "203.0.113.47",
            },
            {
                "name": "unknown_tool.exe",
                "pid": 3721,
                "timestamp": (BASE + timedelta(hours=1, minutes=5)).isoformat(),
                "lsass_handle_full_access": True,
            },
        ]
    }
    malware = {
        "timestamp": (BASE + timedelta(hours=2)).isoformat(),
        "entropy": 7.82,
        "imports": ["VirtualAllocEx", "WriteProcessMemory", "CreateRemoteThread"],
        "strings": ["sekurlsa::logonpasswords", "powershell -enc"],
        "yara_matches": ["Cobalt_Strike_Beacon"],
        "threat_intel_match": True,
    }
    cloud_events = [
        {
            "timestamp": (BASE + timedelta(hours=7, seconds=index * 20)).isoformat(),
            "actor": "ci-pipeline-user",
            "action": "GetObject",
            "source_ip": "198.51.100.78",
            "bucket": "prod-customer-data",
            "bytes": 1_200_000_000,
            "geo_anomaly": True,
        }
        for index in range(121)
    ]
    cloud = {"events": cloud_events}
    endpoint = {
        "timestamp": (BASE + timedelta(hours=1, minutes=50)).isoformat(),
        "run_keys": [
            {
                "path": "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run\\Updater",
                "payload": "C:\\ProgramData\\Updater\\svc.exe",
                "suspicious": True,
            }
        ],
        "prefetch": ["SVC.EXE-ABC123.pf"],
        "shellbags": ["\\\\SERVER-FILE02\\ADMIN$\\staged.zip"],
    }
    threat_intel = {
        "timestamp": (BASE + timedelta(hours=6)).isoformat(),
        "ioc_matches": [
            {"type": "ip", "value": "203.0.113.47", "feeds": ["local_demo_feed", "local_campaign_feed"], "confidence": 0.93}
        ],
        "actor_ttp_similarity": {"APT28": 0.78, "APT29": 0.48},
    }
    return CaseRequest(
        case_id=case_id,
        collector="POC Collection Officer",
        artifacts=[
            artifact("ART-LOG-001", "security-events.json", ArtifactKind.LOG, logs),
            artifact("ART-NET-001", "network-summary.json", ArtifactKind.NETWORK, network),
            artifact("ART-MEM-001", "volatility-summary.json", ArtifactKind.MEMORY, memory),
            artifact("ART-MAL-001", "sample-metadata.json", ArtifactKind.MALWARE, malware),
            artifact("ART-CLD-001", "cloudtrail-summary.json", ArtifactKind.CLOUD, cloud),
            artifact("ART-END-001", "endpoint-summary.json", ArtifactKind.ENDPOINT, endpoint),
            artifact("ART-TI-001", "offline-threat-intel.json", ArtifactKind.THREAT_INTEL, threat_intel),
        ],
    )
