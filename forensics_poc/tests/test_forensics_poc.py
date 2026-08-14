from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from forensics_poc.agents.specialists import LogAnalysisAgent, NetworkForensicsAgent
from forensics_poc.api import app
from forensics_poc.models import AgentInput
from forensics_poc.pipeline import IntegrityError, InvestigationPipeline, verify_ledger
from forensics_poc.sample_data import build_demo_case


def test_agent_input_rejects_empty_evidence() -> None:
    with pytest.raises(ValidationError):
        AgentInput(case_id="CASE-TEST-001", artifacts=[])


def test_log_agent_detects_brute_force_and_lsass_access() -> None:
    case = build_demo_case()
    log_artifact = next(artifact for artifact in case.artifacts if artifact.artifact_id == "ART-LOG-001")
    output = LogAnalysisAgent().analyze(AgentInput(case_id=case.case_id, artifacts=[log_artifact]))
    techniques = {technique for item in output.findings for technique in item.technique_ids}
    assert output.status.value == "completed"
    assert {"T1110", "T1003.001"}.issubset(techniques)
    assert all(item.evidence_refs == ["ART-LOG-001"] for item in output.findings)


def test_network_agent_detects_beacon_and_exfiltration() -> None:
    case = build_demo_case()
    artifact = next(artifact for artifact in case.artifacts if artifact.artifact_id == "ART-NET-001")
    output = NetworkForensicsAgent().analyze(AgentInput(case_id=case.case_id, artifacts=[artifact]))
    c2 = next(item for item in output.findings if item.category == "c2_communication")
    assert c2.confidence >= 0.88
    assert c2.details["beacon_interval_seconds"] == 300
    assert any(item.category == "data_exfiltration" for item in output.findings)


def test_full_pipeline_runs_specialists_in_parallel_and_produces_reports(tmp_path: Path) -> None:
    result = InvestigationPipeline(case_root=tmp_path / "cases").run(build_demo_case())
    assert len(result.agent_outputs) == 7
    assert all(output.status.value == "completed" for output in result.agent_outputs)
    assert result.coordination.overall_confidence >= 0.95
    assert result.coordination.decision.value == "PROCEED_TO_REPORT"
    assert result.fusion.deduplicated_entities > 0
    assert result.timeline == sorted(result.timeline, key=lambda event: (event.timestamp, event.finding_id))


def test_chain_of_custody_ledger_verifies_and_detects_tampering(tmp_path: Path) -> None:
    result = InvestigationPipeline(case_root=tmp_path / "cases").run(build_demo_case())
    ledger = tmp_path / "cases" / result.case_id / "chain_of_custody.jsonl"
    assert verify_ledger(ledger)
    ledger.write_text(ledger.read_text(encoding="utf-8").replace("case_received", "case_altered", 1), encoding="utf-8")
    assert not verify_ledger(ledger)


def test_unverified_evidence_halts_before_agent_analysis(tmp_path: Path) -> None:
    request = build_demo_case()
    request.artifacts[0].verified = False
    with pytest.raises(IntegrityError, match="ART-LOG-001"):
        InvestigationPipeline(case_root=tmp_path / "cases").run(request)


def test_demo_api_exposes_conservative_investigation_result(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.chdir(tmp_path)
    client = TestClient(app)
    response = client.post("/cases/demo")
    assert response.status_code == 200
    body = response.json()
    assert body["case_id"] == "CASE-POC-20260715-001"
    assert body["coordination"]["decision"] == "PROCEED_TO_REPORT"
    assert "attribution" in body["coordination"]


def test_api_rejects_unverified_input() -> None:
    request = build_demo_case()
    request.artifacts[0].verified = False
    client = TestClient(app)
    response = client.post("/cases/analyze", json=request.model_dump(mode="json"))
    assert response.status_code == 422
    assert "unverified evidence" in response.json()["detail"]


def test_report_export_writes_human_and_machine_readable_outputs(tmp_path: Path) -> None:
    from forensics_poc.reporting import export_all

    result = InvestigationPipeline(case_root=tmp_path / "cases").run(build_demo_case())
    files = export_all(result, tmp_path / "reports")
    assert {"json", "html", "stix"}.issubset(files)
    assert all(path.exists() and path.stat().st_size > 100 for path in files.values())
    html_report = files["html"].read_text(encoding="utf-8")
    assert "203[.]0[.]113[.]47" in html_report
    assert "Attribution hypotheses" in html_report
    bundle = files["stix"].read_text(encoding="utf-8")
    assert '"type": "bundle"' in bundle


def test_cli_demo_and_ledger_verification(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    from forensics_poc.cli import main

    monkeypatch.setattr(
        "sys.argv",
        [
            "mafc",
            "demo",
            "--case-root",
            str(tmp_path / "cases"),
            "--reports-dir",
            str(tmp_path / "reports"),
        ],
    )
    main()
    demo_output = capsys.readouterr().out
    assert "Decision: PROCEED_TO_REPORT" in demo_output
    ledger = tmp_path / "cases" / "CASE-POC-20260715-001" / "chain_of_custody.jsonl"
    monkeypatch.setattr("sys.argv", ["mafc", "verify-ledger", str(ledger)])
    with pytest.raises(SystemExit) as exit_status:
        main()
    assert exit_status.value.code == 0
    assert "VALID" in capsys.readouterr().out
