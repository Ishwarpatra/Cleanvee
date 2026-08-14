"""Shared behaviours for specialised forensic agents."""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Iterable
from datetime import datetime
from typing import Any

from forensics_poc.models import (
    AgentInput,
    AgentOutput,
    AgentStatus,
    ArtifactKind,
    EvidenceArtifact,
    Finding,
    utc_now,
)


class ForensicAgent(ABC):
    """A passive, deterministic agent which never executes supplied evidence."""

    agent_id: str
    accepted_kinds: set[ArtifactKind]

    def __init__(self, agent_id: str, accepted_kinds: set[ArtifactKind]) -> None:
        self.agent_id = agent_id
        self.accepted_kinds = accepted_kinds

    @abstractmethod
    def analyze(self, task: AgentInput) -> AgentOutput:
        """Analyse task artifacts and return only schema-validated observations."""

    def eligible_artifacts(self, task: AgentInput) -> list[EvidenceArtifact]:
        """Return only verified artifacts with a kind supported by this agent."""
        return [
            artifact
            for artifact in task.artifacts
            if artifact.kind in self.accepted_kinds and artifact.verified
        ]

    def excluded_artifact_warnings(self, task: AgentInput) -> list[str]:
        warnings: list[str] = []
        for artifact in task.artifacts:
            if artifact.kind in self.accepted_kinds and not artifact.verified:
                warnings.append(
                    f"{artifact.artifact_id} was excluded because integrity verification is incomplete."
                )
        return warnings

    def output(
        self,
        task: AgentInput,
        started_at: datetime,
        findings: Iterable[Finding],
        artifacts_processed: Iterable[str],
        *,
        warnings: list[str] | None = None,
        errors: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> AgentOutput:
        """Construct a calibrated agent response in one consistent shape."""
        finding_list = list(findings)
        error_list = errors or []
        max_confidence = max((finding.confidence for finding in finding_list), default=0.0)
        status = AgentStatus.FAILED if error_list and not finding_list else AgentStatus.COMPLETED
        return AgentOutput(
            agent_id=self.agent_id,
            case_id=task.case_id,
            started_at=started_at,
            completed_at=utc_now(),
            status=status,
            findings=finding_list,
            artifacts_processed=list(artifacts_processed),
            overall_confidence=max_confidence,
            errors=error_list,
            warnings=(warnings or []) + self.excluded_artifact_warnings(task),
            metadata={
                "analysis_mode": "rule_based_only",
                "llm_used": False,
                "untrusted_content_handling": "Evidence values are treated as data, never instructions.",
                **(metadata or {}),
            },
        )
