"""Concurrent orchestrator for the offline multi-agent forensic proof of concept."""

from __future__ import annotations

import hashlib
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

from forensics_poc.agents import all_specialists
from forensics_poc.intelligence import (
    CoordinationIntelligenceAgent,
    EvidenceFusionAgent,
    TimelineReconstructionAgent,
)
from forensics_poc.models import (
    AgentInput,
    AgentOutput,
    AgentStatus,
    CaseRequest,
    InvestigationResult,
    utc_iso,
    utc_now,
)


class IntegrityError(RuntimeError):
    """Raised when a case includes evidence that is not marked integrity verified."""


class ChainOfCustodyLedger:
    """Append-only JSONL ledger with a hash-chain for POC auditability."""

    def __init__(self, root: Path, case_id: str) -> None:
        self.path = root / case_id / "chain_of_custody.jsonl"
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def append(self, action: str, payload: dict[str, Any]) -> dict[str, Any]:
        prior_hash = "0" * 64
        if self.path.exists():
            lines = self.path.read_text(encoding="utf-8").strip().splitlines()
            if lines:
                prior_hash = json.loads(lines[-1])["entry_hash"]
        entry: dict[str, Any] = {
            "timestamp": utc_iso(utc_now()),
            "action": action,
            "payload": payload,
            "prior_hash": prior_hash,
        }
        canonical = json.dumps(entry, sort_keys=True, separators=(",", ":")).encode("utf-8")
        entry["entry_hash"] = hashlib.sha256(canonical).hexdigest()
        with self.path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(entry, sort_keys=True) + "\n")
        return entry


class InvestigationPipeline:
    """Run independent evidence agents concurrently and preserve an auditable result."""

    def __init__(self, case_root: str | Path = "cases") -> None:
        self.case_root = Path(case_root)
        self.fusion = EvidenceFusionAgent()
        self.timeline = TimelineReconstructionAgent()
        self.coordination = CoordinationIntelligenceAgent()

    def _validate_evidence(self, request: CaseRequest) -> None:
        unverified = [artifact.artifact_id for artifact in request.artifacts if not artifact.verified]
        if unverified:
            raise IntegrityError(
                "The pipeline will not analyse unverified evidence: " + ", ".join(sorted(unverified))
            )

    @staticmethod
    def _failed_output(agent_id: str, task: AgentInput, error: Exception) -> AgentOutput:
        now = utc_now()
        return AgentOutput(
            agent_id=agent_id,
            case_id=task.case_id,
            started_at=now,
            completed_at=now,
            status=AgentStatus.FAILED,
            findings=[],
            artifacts_processed=[],
            overall_confidence=0.0,
            errors=[f"{type(error).__name__}: {error}"],
            warnings=[],
            metadata={"analysis_mode": "not_run", "llm_used": False},
        )

    def run(self, request: CaseRequest, iteration: int = 1) -> InvestigationResult:
        """Run the POC once; agents are isolated so one failure does not hide others."""
        self._validate_evidence(request)
        ledger = ChainOfCustodyLedger(self.case_root, request.case_id)
        ledger.append(
            "case_received",
            {
                "collector": request.collector,
                "artifact_ids": [artifact.artifact_id for artifact in request.artifacts],
                "artifact_hashes": {artifact.artifact_id: artifact.sha256 for artifact in request.artifacts},
            },
        )
        task = AgentInput(
            case_id=request.case_id,
            artifacts=request.artifacts,
            priority=request.priority,
            requested_by=request.collector,
            iteration=iteration,
        )
        outputs: list[AgentOutput] = []
        specialists = all_specialists()
        with ThreadPoolExecutor(max_workers=len(specialists), thread_name_prefix="forensics") as executor:
            futures = {executor.submit(agent.analyze, task): agent.agent_id for agent in specialists}
            for future in as_completed(futures):
                agent_id = futures[future]
                try:
                    output = future.result()
                except Exception as error:  # Preserve the failure for coordination, not silently.
                    output = self._failed_output(agent_id, task, error)
                outputs.append(output)
                ledger.append(
                    "agent_completed" if output.status == AgentStatus.COMPLETED else "agent_failed",
                    {
                        "agent_id": agent_id,
                        "status": output.status.value,
                        "run_id": output.run_id,
                        "finding_count": len(output.findings),
                        "artifacts_processed": output.artifacts_processed,
                        "errors": output.errors,
                    },
                )
        outputs.sort(key=lambda output: output.agent_id)
        fusion = self.fusion.fuse(request.case_id, outputs)
        timeline = self.timeline.reconstruct(outputs)
        coordination = self.coordination.coordinate(request.case_id, outputs, iteration=iteration)
        ledger.append(
            "coordination_completed",
            {
                "decision": coordination.decision.value,
                "overall_confidence": coordination.overall_confidence,
                "completeness": coordination.investigation_completeness,
                "conflict_count": len(coordination.conflicts_detected),
                "gap_count": len(coordination.gaps_identified),
            },
        )
        return InvestigationResult(
            case_id=request.case_id,
            agent_outputs=outputs,
            fusion=fusion,
            timeline=timeline,
            coordination=coordination,
        )


def verify_ledger(path: str | Path) -> bool:
    """Verify the ledger hash chain without making a claim about source-evidence integrity."""
    ledger = Path(path)
    prior_hash = "0" * 64
    for line in ledger.read_text(encoding="utf-8").splitlines():
        entry = json.loads(line)
        claimed_hash = entry.pop("entry_hash")
        if entry["prior_hash"] != prior_hash:
            return False
        canonical = json.dumps(entry, sort_keys=True, separators=(",", ":")).encode("utf-8")
        actual_hash = hashlib.sha256(canonical).hexdigest()
        if claimed_hash != actual_hash:
            return False
        prior_hash = claimed_hash
    return True
