"""FastAPI wrapper for self-contained offline forensic POC cases."""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException

from forensics_poc.models import CaseRequest, InvestigationResult
from forensics_poc.pipeline import IntegrityError, InvestigationPipeline
from forensics_poc.reporting import export_all
from forensics_poc.sample_data import build_demo_case

app = FastAPI(
    title="Multi-Agent Autonomous Cyber-Forensics POC",
    version="0.1.0",
    description=(
        "Offline-first, rule-based forensic triage over supplied pre-parsed evidence. "
        "This POC does not execute untrusted files and does not make attribution claims as fact."
    ),
)


def _pipeline() -> InvestigationPipeline:
    return InvestigationPipeline(case_root=Path("cases"))


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "mode": "offline_rule_based_poc"}


@app.post("/cases/analyze", response_model=InvestigationResult)
def analyze_case(request: CaseRequest) -> InvestigationResult:
    """Analyse integrity-verified, pre-parsed artifacts in isolated specialist threads."""
    try:
        return _pipeline().run(request)
    except IntegrityError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@app.post("/cases/demo", response_model=InvestigationResult)
def analyze_demo_case() -> InvestigationResult:
    """Run a deterministic synthetic scenario suitable for a safe local demonstration."""
    return _pipeline().run(build_demo_case())


@app.post("/cases/demo/reports")
def export_demo_reports() -> dict[str, str]:
    """Generate JSON, HTML, STIX, and optionally PDF reports for the synthetic demo."""
    result = _pipeline().run(build_demo_case())
    files = export_all(result, Path("reports") / result.case_id)
    return {name: str(path) for name, path in files.items()}
