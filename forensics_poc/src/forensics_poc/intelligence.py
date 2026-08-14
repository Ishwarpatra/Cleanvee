"""Evidence fusion, timeline reconstruction, and conservative coordination logic."""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Iterable
from statistics import mean

from forensics_poc.models import (
    AgentOutput,
    AgentStatus,
    AttributionHypothesis,
    Conflict,
    CoordinationDecision,
    CoordinationOutput,
    EvidenceGap,
    Finding,
    FusionOutput,
    GraphEdge,
    GraphNode,
    TimelineEvent,
    utc_now,
)

EXPECTED_AGENTS = {
    "log_analysis_v1": "log and authentication telemetry",
    "network_forensics_v1": "network telemetry",
    "memory_forensics_v1": "memory analysis",
    "malware_analysis_v1": "malware static-analysis metadata",
    "cloud_forensics_v1": "cloud audit telemetry",
    "endpoint_forensics_v1": "endpoint forensic artifacts",
    "threat_intel_v1": "offline threat-intelligence context",
}


def node_key(entity_type: str, value: str) -> str:
    return f"{entity_type.upper()}-{value.strip().lower()}"


class EvidenceFusionAgent:
    """Build an in-memory evidence graph, deduplicated by entity type and value."""

    agent_id = "evidence_fusion_v1"

    def fuse(self, case_id: str, outputs: Iterable[AgentOutput]) -> FusionOutput:
        nodes: dict[str, GraphNode] = {}
        edges: list[GraphEdge] = []
        for output in outputs:
            for item in output.findings:
                finding_nodes: list[str] = []
                for entity in item.entities:
                    key = node_key(entity.type, entity.value)
                    existing = nodes.get(key)
                    if existing is None:
                        nodes[key] = GraphNode(
                            node_id=key,
                            type=entity.type,
                            value=entity.value,
                            sources=[output.agent_id],
                            risk_score=min(0.99, item.confidence),
                        )
                    else:
                        sources = sorted(set(existing.sources) | {output.agent_id})
                        corroboration = 0.05 * max(0, len(sources) - 1)
                        nodes[key] = GraphNode(
                            node_id=existing.node_id,
                            type=existing.type,
                            value=existing.value,
                            sources=sources,
                            risk_score=min(0.99, max(existing.risk_score, item.confidence) + corroboration),
                        )
                    finding_nodes.append(key)
                for source, target in zip(finding_nodes, finding_nodes[1:], strict=False):
                    edges.append(
                        GraphEdge(
                            source=source,
                            target=target,
                            finding_id=item.finding_id,
                            technique_id=item.technique_ids[0],
                            confidence=item.confidence,
                        )
                    )
        return FusionOutput(
            case_id=case_id,
            nodes=sorted(nodes.values(), key=lambda node: node.node_id),
            edges=edges,
            deduplicated_entities=len(nodes),
        )


class TimelineReconstructionAgent:
    """Normalise validated timestamps into a stable ordered investigation timeline."""

    def reconstruct(self, outputs: Iterable[AgentOutput]) -> list[TimelineEvent]:
        events = [
            TimelineEvent(
                timestamp=finding.timestamp_start,
                finding_id=finding.finding_id,
                agent_id=output.agent_id,
                category=finding.category,
                technique_ids=finding.technique_ids,
                summary=finding.description,
                confidence=finding.confidence,
            )
            for output in outputs
            for finding in output.findings
        ]
        return sorted(events, key=lambda event: (event.timestamp, event.finding_id))


class CoordinationIntelligenceAgent:
    """Coordinate independently produced observations without inventing evidence."""

    agent_id = "coordination_intelligence_v1"

    @staticmethod
    def dempster_shafer_combine(confidences: list[float]) -> float:
        """Combine independent supporting beliefs using the agreed binary DST formula."""
        if not confidences:
            return 0.0
        combined = max(0.0, min(0.99, confidences[0]))
        for confidence in confidences[1:]:
            current = max(0.0, min(0.99, confidence))
            conflict = combined * (1 - current) + current * (1 - combined)
            denominator = max(1e-9, 1 - conflict)
            combined = min(0.99, (combined * current) / denominator)
        return round(combined, 3)

    @staticmethod
    def _entity_claims(outputs: Iterable[AgentOutput]) -> dict[str, list[tuple[str, Finding]]]:
        claims: dict[str, list[tuple[str, Finding]]] = defaultdict(list)
        for output in outputs:
            for item in output.findings:
                for entity in item.entities:
                    claims[node_key(entity.type, entity.value)].append((output.agent_id, item))
        return claims

    def detect_conflicts(self, outputs: Iterable[AgentOutput]) -> list[Conflict]:
        """Surface material alternative actor hypotheses and timestamp discrepancies."""
        output_list = list(outputs)
        conflicts: list[Conflict] = []
        actor_claims: list[tuple[str, Finding]] = []
        for output in output_list:
            for item in output.findings:
                if item.category == "threat_actor_hypothesis" and item.confidence >= 0.70:
                    actor = next((entity.value for entity in item.entities if entity.type == "threat_actor"), None)
                    if actor:
                        actor_claims.append((actor, item))
        unique_actors = {actor for actor, _ in actor_claims}
        if len(unique_actors) > 1:
            ordered = sorted(unique_actors)
            refs = sorted({ref for _, item in actor_claims for ref in item.evidence_refs})
            conflicts.append(
                Conflict(
                    claim_a=f"Actor hypothesis: {ordered[0]}",
                    claim_b=f"Actor hypothesis: {ordered[1]}",
                    resolution_hypothesis=(
                        "Similar TTPs and shared infrastructure can produce multiple plausible actor hypotheses; "
                        "obtain campaign-specific or victimology evidence before prioritising one."
                    ),
                    conflict_weight=0.15,
                    evidence_refs=refs,
                )
            )
        claims = self._entity_claims(output_list)
        for key, entity_claims in claims.items():
            timed_claims = [
                (agent_id, item)
                for agent_id, item in entity_claims
                if item.category not in {"ioc_enrichment", "threat_actor_hypothesis"}
            ]
            timestamps = [item.timestamp_start for _, item in timed_claims]
            if len(timestamps) >= 2 and max(timestamps) - min(timestamps) >= timedelta_hours(3):
                refs = sorted({ref for _, item in timed_claims for ref in item.evidence_refs})
                conflicts.append(
                    Conflict(
                        claim_a=f"Timestamp for {key}: {min(timestamps).isoformat()}",
                        claim_b=f"Timestamp for {key}: {max(timestamps).isoformat()}",
                        resolution_hypothesis=(
                            "A material time discrepancy may reflect timezone normalisation, clock drift, or a "
                            "reused entity. Verify original source timezone metadata before ordering the events."
                        ),
                        conflict_weight=0.10,
                        evidence_refs=refs,
                    )
                )
        return conflicts

    def quality_score(self, output: AgentOutput) -> float:
        """Use transparent rule-based quality weights rather than an opaque model judgement."""
        if output.status == AgentStatus.FAILED:
            return 0.0
        if not output.artifacts_processed:
            return 0.20
        if not output.findings:
            return 0.65
        specificity = mean(1.0 if item.evidence_refs else 0.0 for item in output.findings)
        technique_accuracy = mean(1.0 if item.technique_ids else 0.0 for item in output.findings)
        calibration = mean(1.0 if item.confidence <= 0.95 else 0.5 for item in output.findings)
        completeness = 1.0 if not output.errors else 0.5
        return round(mean([specificity, technique_accuracy, calibration, completeness]), 3)

    def _gaps(self, outputs: Iterable[AgentOutput]) -> list[EvidenceGap]:
        by_agent = {output.agent_id: output for output in outputs}
        gaps: list[EvidenceGap] = []
        for agent_id, capability in EXPECTED_AGENTS.items():
            output = by_agent.get(agent_id)
            if output is None or output.status == AgentStatus.FAILED:
                gaps.append(
                    EvidenceGap(
                        severity="CRITICAL",
                        description=f"No usable {capability} submission was available for coordination.",
                        recommended_agent=agent_id,
                    )
                )
            elif not output.artifacts_processed:
                gaps.append(
                    EvidenceGap(
                        severity="IMPORTANT",
                        description=f"The case supplied no verified {capability} artifact for {agent_id}.",
                        recommended_agent=agent_id,
                    )
                )
            elif output.warnings:
                gaps.append(
                    EvidenceGap(
                        severity="MINOR",
                        description=f"{agent_id} completed with documented scope warnings.",
                        recommended_agent=agent_id,
                    )
                )
        return gaps

    @staticmethod
    def _classification(findings: list[Finding]) -> str:
        categories = {item.category for item in findings}
        if {"c2_communication", "process_injection", "credential_attack"} & categories and "data_exfiltration" in categories:
            return "Suspected multi-stage intrusion with potential data exfiltration"
        if "data_exfiltration" in categories:
            return "Potential data exfiltration"
        if categories:
            return "Suspicious activity requiring analyst review"
        return "No validated suspicious activity detected"

    def coordinate(self, case_id: str, outputs: Iterable[AgentOutput], iteration: int = 1) -> CoordinationOutput:
        output_list = list(outputs)
        all_findings = [item for output in output_list for item in output.findings]
        gaps = self._gaps(output_list)
        conflicts = self.detect_conflicts(output_list)
        claims = self._entity_claims(output_list)
        corroborated_agents = {
            agent_id
            for entity_claims in claims.values()
            if len({agent_id for agent_id, _ in entity_claims}) >= 2
            for agent_id, _ in entity_claims
        }
        quality_weights = {output.agent_id: self.quality_score(output) for output in output_list}
        weighted = {
            output.agent_id: round(output.overall_confidence * quality_weights[output.agent_id], 3)
            for output in output_list
            if output.status != AgentStatus.FAILED and output.findings
        }
        convergent = [weighted[agent_id] for agent_id in corroborated_agents if agent_id in weighted]
        confidence = self.dempster_shafer_combine(sorted(convergent, reverse=True)) if len(convergent) >= 2 else round(
            max(weighted.values(), default=0.0), 3
        )
        confidence = max(0.0, confidence - sum(conflict.conflict_weight for conflict in conflicts))
        confidence = round(min(0.99, confidence), 3)
        completed = [output for output in output_list if output.agent_id in EXPECTED_AGENTS and output.status == AgentStatus.COMPLETED]
        completeness = round(len(completed) / len(EXPECTED_AGENTS), 3)
        critical_gap = any(gap.severity == "CRITICAL" for gap in gaps)
        if iteration >= 3:
            decision = CoordinationDecision.PROCEED_TO_REPORT
        elif confidence >= 0.85 and not critical_gap:
            decision = CoordinationDecision.PROCEED_TO_REPORT
        elif confidence < 0.65:
            decision = CoordinationDecision.INCONCLUSIVE
        else:
            decision = CoordinationDecision.REQUEST_MORE_EVIDENCE
        attribution: list[AttributionHypothesis] = []
        for item in all_findings:
            if item.category != "threat_actor_hypothesis":
                continue
            actor = next((entity.value for entity in item.entities if entity.type == "threat_actor"), None)
            if actor and item.confidence >= 0.60:
                attribution.append(
                    AttributionHypothesis(
                        actor=actor,
                        confidence=item.confidence,
                        matching_ttps=item.technique_ids,
                        evidence=(
                            "Attribution is a hypothesis, not a fact. "
                            f"{item.description}"
                        ),
                    )
                )
        reasoning = [
            f"{output.agent_id} reported {len(output.findings)} finding(s) with quality weight {quality_weights[output.agent_id]:.3f}."
            for output in output_list
        ]
        if corroborated_agents:
            reasoning.append(
                "Cross-agent entity corroboration was found for: " + ", ".join(sorted(corroborated_agents)) + "."
            )
        else:
            reasoning.append("No multi-agent entity corroboration was available; confidence was not amplified.")
        if conflicts:
            reasoning.append(f"{len(conflicts)} conflict(s) reduced coordinated confidence and remain documented.")
        next_actions = [
            f"Request or re-run {gap.recommended_agent}: {gap.description}" for gap in gaps if gap.severity != "MINOR"
        ]
        if not next_actions and decision != CoordinationDecision.PROCEED_TO_REPORT:
            next_actions.append("Obtain independent corroboration for the highest-impact finding before closing the case.")
        return CoordinationOutput(
            case_id=case_id,
            completed_at=utc_now(),
            incident_classification=self._classification(all_findings),
            overall_confidence=confidence,
            confidence_breakdown=weighted,
            investigation_completeness=completeness,
            conflicts_detected=conflicts,
            gaps_identified=gaps,
            next_best_actions=next_actions,
            attribution=attribution,
            reasoning_trace=reasoning,
            decision=decision,
            coordinated_findings=all_findings,
        )


def timedelta_hours(hours: int):
    """Avoid timezone-naive arithmetic in conflict detection."""
    from datetime import timedelta

    return timedelta(hours=hours)
