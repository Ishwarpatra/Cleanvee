"""Validated data contracts for the offline forensic proof of concept.

The package intentionally processes supplied evidence metadata and text fixtures only.  It does
not execute untrusted binaries, scripts, or macros; those belong in a separately controlled
analysis sandbox.
"""

from __future__ import annotations

from datetime import UTC, datetime
from enum import Enum
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

UTC = UTC


def utc_now() -> datetime:
    """Return an explicit UTC timestamp."""
    return datetime.now(UTC)


def utc_iso(value: datetime) -> str:
    """Serialise a timezone-aware timestamp consistently."""
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


class ArtifactKind(str, Enum):
    LOG = "log"
    NETWORK = "network"
    MEMORY = "memory"
    MALWARE = "malware"
    CLOUD = "cloud"
    ENDPOINT = "endpoint"
    THREAT_INTEL = "threat_intel"
    OTHER = "other"


class AgentStatus(str, Enum):
    COMPLETED = "completed"
    PARTIAL = "partial"
    FAILED = "failed"


class EvidenceArtifact(BaseModel):
    """Immutable-style evidence record used by all downstream agents."""

    model_config = ConfigDict(extra="forbid")

    artifact_id: str = Field(pattern=r"^ART-[A-Z0-9-]+$")
    source_name: str = Field(min_length=1, max_length=255)
    kind: ArtifactKind
    content: dict[str, Any] = Field(default_factory=dict)
    sha256: str = Field(pattern=r"^[a-fA-F0-9]{64}$")
    verified: bool = False
    acquired_at: datetime
    collector: str = Field(min_length=1, max_length=255)
    notes: str = Field(default="", max_length=1_000)

    @field_validator("acquired_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("acquired_at must include an explicit timezone")
        return value.astimezone(UTC)


class AgentInput(BaseModel):
    """Task card sent to a specialised analysis agent."""

    model_config = ConfigDict(extra="forbid")

    case_id: str = Field(pattern=r"^CASE-[A-Z0-9-]+$")
    artifacts: list[EvidenceArtifact] = Field(min_length=1)
    priority: int = Field(default=5, ge=1, le=10)
    requested_by: str | None = Field(default=None, max_length=255)
    iteration: int = Field(default=1, ge=1, le=3)
    focus_question: str | None = Field(default=None, max_length=1_000)


class Entity(BaseModel):
    """A typed indicator or contextual entity extracted from a finding."""

    model_config = ConfigDict(extra="forbid")

    type: str = Field(min_length=1, max_length=64)
    value: str = Field(min_length=1, max_length=500)
    role: str | None = Field(default=None, max_length=128)
    attributes: dict[str, Any] = Field(default_factory=dict)


class Finding(BaseModel):
    """A traceable, confidence-bounded analytical observation."""

    model_config = ConfigDict(extra="forbid")

    finding_id: str = Field(default_factory=lambda: f"FND-{uuid4().hex[:12].upper()}")
    agent_id: str
    category: str = Field(min_length=3, max_length=128)
    technique_ids: list[str] = Field(min_length=1)
    entities: list[Entity] = Field(min_length=1)
    evidence_refs: list[str] = Field(min_length=1)
    description: str = Field(min_length=50, max_length=2_000)
    confidence: float = Field(ge=0.0, le=0.99)
    confidence_method: str = Field(pattern=r"^(rule_based|ml_model|llm_inference)$")
    timestamp_start: datetime
    timestamp_end: datetime
    raw_evidence_snippet: str | None = Field(default=None, max_length=500)
    details: dict[str, Any] = Field(default_factory=dict)

    @field_validator("timestamp_start", "timestamp_end")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("finding timestamps must include an explicit timezone")
        return value.astimezone(UTC)

    @field_validator("technique_ids")
    @classmethod
    def validate_technique_ids(cls, values: list[str]) -> list[str]:
        for technique_id in values:
            if not technique_id.startswith("T") or not technique_id[1:].replace(".", "").isdigit():
                raise ValueError(f"invalid ATT&CK-style technique ID: {technique_id}")
        return values

    @model_validator(mode="after")
    def validate_time_range(self) -> Finding:
        if self.timestamp_end < self.timestamp_start:
            raise ValueError("timestamp_end cannot be earlier than timestamp_start")
        return self


class AgentOutput(BaseModel):
    """Complete submission from one independent analysis agent."""

    model_config = ConfigDict(extra="forbid")

    agent_id: str
    case_id: str
    run_id: str = Field(default_factory=lambda: str(uuid4()))
    started_at: datetime
    completed_at: datetime
    status: AgentStatus
    findings: list[Finding] = Field(default_factory=list)
    artifacts_processed: list[str] = Field(default_factory=list)
    overall_confidence: float = Field(ge=0.0, le=0.99)
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("started_at", "completed_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("agent output timestamps must include an explicit timezone")
        return value.astimezone(UTC)

    @model_validator(mode="after")
    def validate_order(self) -> AgentOutput:
        if self.completed_at < self.started_at:
            raise ValueError("completed_at cannot be earlier than started_at")
        if self.status == AgentStatus.COMPLETED and self.errors:
            raise ValueError("a completed agent output cannot include errors")
        return self


class GraphNode(BaseModel):
    model_config = ConfigDict(extra="forbid")

    node_id: str
    type: str
    value: str
    sources: list[str]
    risk_score: float = Field(ge=0.0, le=0.99)


class GraphEdge(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source: str
    target: str
    finding_id: str
    technique_id: str
    confidence: float = Field(ge=0.0, le=0.99)


class FusionOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    case_id: str
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    deduplicated_entities: int = Field(ge=0)


class TimelineEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    timestamp: datetime
    finding_id: str
    agent_id: str
    category: str
    technique_ids: list[str]
    summary: str
    confidence: float = Field(ge=0.0, le=0.99)

    @field_validator("timestamp")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("timeline timestamps must include an explicit timezone")
        return value.astimezone(UTC)


class Conflict(BaseModel):
    model_config = ConfigDict(extra="forbid")

    claim_a: str
    claim_b: str
    resolution_hypothesis: str
    conflict_weight: float = Field(ge=0.0, le=1.0)
    evidence_refs: list[str] = Field(min_length=1)


class EvidenceGap(BaseModel):
    model_config = ConfigDict(extra="forbid")

    severity: str = Field(pattern=r"^(CRITICAL|IMPORTANT|MINOR)$")
    description: str
    recommended_agent: str


class AttributionHypothesis(BaseModel):
    model_config = ConfigDict(extra="forbid")

    actor: str
    confidence: float = Field(ge=0.0, le=0.99)
    matching_ttps: list[str]
    evidence: str


class CoordinationDecision(str, Enum):
    PROCEED_TO_REPORT = "PROCEED_TO_REPORT"
    REQUEST_MORE_EVIDENCE = "REQUEST_MORE_EVIDENCE"
    INCONCLUSIVE = "INCONCLUSIVE"


class CoordinationOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    agent_id: str = "coordination_intelligence_v1"
    case_id: str
    run_id: str = Field(default_factory=lambda: str(uuid4()))
    completed_at: datetime = Field(default_factory=utc_now)
    incident_classification: str
    overall_confidence: float = Field(ge=0.0, le=0.99)
    confidence_breakdown: dict[str, float]
    investigation_completeness: float = Field(ge=0.0, le=1.0)
    conflicts_detected: list[Conflict] = Field(default_factory=list)
    gaps_identified: list[EvidenceGap] = Field(default_factory=list)
    next_best_actions: list[str] = Field(default_factory=list)
    attribution: list[AttributionHypothesis] = Field(default_factory=list)
    reasoning_trace: list[str] = Field(min_length=1)
    decision: CoordinationDecision
    coordinated_findings: list[Finding] = Field(default_factory=list)


class CaseRequest(BaseModel):
    """REST request for a self-contained POC investigation."""

    model_config = ConfigDict(extra="forbid")

    case_id: str = Field(pattern=r"^CASE-[A-Z0-9-]+$")
    collector: str = Field(min_length=1, max_length=255)
    artifacts: list[EvidenceArtifact] = Field(min_length=1)
    priority: int = Field(default=5, ge=1, le=10)


class InvestigationResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    case_id: str
    agent_outputs: list[AgentOutput]
    fusion: FusionOutput
    timeline: list[TimelineEvent]
    coordination: CoordinationOutput
