"""Offline report generation with explicit uncertainty and provenance references."""

from __future__ import annotations

import html
import json
from datetime import UTC
from pathlib import Path
from uuid import uuid4

from forensics_poc.models import InvestigationResult


def defang(value: str) -> str:
    """Defang common indicator forms for human-readable output."""
    return value.replace(".", "[.]").replace("http://", "hxxp://").replace("https://", "hxxps://")


def _json_default(value):
    if hasattr(value, "isoformat"):
        return value.astimezone(UTC).isoformat().replace("+00:00", "Z")
    raise TypeError(f"cannot serialise {type(value).__name__}")


def export_json(result: InvestigationResult, destination: Path) -> Path:
    path = destination / "investigation.json"
    path.write_text(json.dumps(result.model_dump(mode="json"), indent=2), encoding="utf-8")
    return path


def export_html(result: InvestigationResult, destination: Path) -> Path:
    coordination = result.coordination
    finding_rows = "".join(
        "<tr>"
        f"<td>{html.escape(finding.agent_id)}</td>"
        f"<td>{html.escape(finding.category)}</td>"
        f"<td>{html.escape(', '.join(finding.technique_ids))}</td>"
        f"<td>{finding.confidence:.3f}</td>"
        f"<td>{html.escape(defang(finding.description))}</td>"
        f"<td>{html.escape(', '.join(finding.evidence_refs))}</td>"
        "</tr>"
        for finding in coordination.coordinated_findings
    ) or "<tr><td colspan='6'>No validated findings.</td></tr>"
    gap_rows = "".join(
        f"<tr><td>{html.escape(gap.severity)}</td><td>{html.escape(gap.recommended_agent)}</td>"
        f"<td>{html.escape(gap.description)}</td></tr>" for gap in coordination.gaps_identified
    ) or "<tr><td colspan='3'>No material gaps recorded.</td></tr>"
    timeline_rows = "".join(
        f"<tr><td>{event.timestamp.isoformat()}</td><td>{html.escape(event.agent_id)}</td>"
        f"<td>{html.escape(event.category)}</td><td>{event.confidence:.3f}</td></tr>" for event in result.timeline
    ) or "<tr><td colspan='4'>No timeline events.</td></tr>"
    attribution = "".join(
        f"<li><strong>{html.escape(item.actor)}</strong> — hypothesis confidence {item.confidence:.3f}. "
        f"{html.escape(item.evidence)}</li>" for item in coordination.attribution
    ) or "<li>No attribution hypothesis met the reporting threshold.</li>"
    provenance = "".join(
        f"<li>{html.escape(output.agent_id)}: {html.escape(output.status.value)}, "
        f"{len(output.findings)} finding(s), {len(output.artifacts_processed)} artifact(s) processed.</li>"
        for output in result.agent_outputs
    )
    document = f"""<!doctype html>
<html lang='en'>
<head><meta charset='utf-8'><title>Forensic report — {html.escape(result.case_id)}</title>
<style>
body {{ font-family: Arial, sans-serif; color: #172033; margin: 38px; line-height: 1.42; }}
h1 {{ color: #12355b; border-bottom: 3px solid #1e7d8a; padding-bottom: 8px; }}
h2 {{ color: #12355b; margin-top: 28px; }}
.notice {{ background: #fff5db; border-left: 5px solid #bf7b00; padding: 12px; }}
.metric {{ display: inline-block; padding: 10px 14px; margin: 4px; background: #e8f3f5; border-radius: 4px; }}
table {{ width: 100%; border-collapse: collapse; font-size: 0.9em; }}
th {{ background: #12355b; color: #fff; text-align: left; }}
th, td {{ border: 1px solid #ccd5df; vertical-align: top; padding: 8px; }}
.small {{ font-size: 0.85em; color: #4b5563; }}
</style></head>
<body>
<h1>Autonomous Cyber-Forensics POC Report</h1>
<p><strong>Case:</strong> {html.escape(result.case_id)} &nbsp; <strong>Decision:</strong> {html.escape(coordination.decision.value)}</p>
<div class='notice'><strong>Interpretation limitation.</strong> Findings are automated triage observations over supplied, pre-parsed evidence. They are not legal conclusions, do not establish actor attribution as fact, and require qualified analyst review.</div>
<h2>Executive assessment</h2>
<p>{html.escape(coordination.incident_classification)}</p>
<div class='metric'><strong>Overall confidence</strong><br>{coordination.overall_confidence:.3f} / 0.990</div>
<div class='metric'><strong>Investigation completeness</strong><br>{coordination.investigation_completeness:.1%}</div>
<div class='metric'><strong>Evidence graph</strong><br>{len(result.fusion.nodes)} entities / {len(result.fusion.edges)} relationships</div>
<h2>Attribution hypotheses</h2><ul>{attribution}</ul>
<h2>Evidence findings</h2><table><thead><tr><th>Agent</th><th>Category</th><th>ATT&amp;CK</th><th>Confidence</th><th>Description (defanged)</th><th>Evidence</th></tr></thead><tbody>{finding_rows}</tbody></table>
<h2>Timeline</h2><table><thead><tr><th>UTC timestamp</th><th>Agent</th><th>Category</th><th>Confidence</th></tr></thead><tbody>{timeline_rows}</tbody></table>
<h2>Evidence gaps and requested next actions</h2><table><thead><tr><th>Severity</th><th>Recommended agent</th><th>Gap</th></tr></thead><tbody>{gap_rows}</tbody></table>
<ul>{''.join(f'<li>{html.escape(action)}</li>' for action in coordination.next_best_actions) or '<li>No additional automated action requested.</li>'}</ul>
<h2>Reasoning trace</h2><ol>{''.join(f'<li>{html.escape(trace)}</li>' for trace in coordination.reasoning_trace)}</ol>
<h2>Provenance and chain of custody</h2><p class='small'>The corresponding <code>chain_of_custody.jsonl</code> is an append-only SHA-256 hash chain for this proof of concept. It documents pipeline events but is not a replacement for an organisation's formal evidence-handling policy.</p><ul>{provenance}</ul>
</body></html>"""
    path = destination / "investigation.html"
    path.write_text(document, encoding="utf-8")
    return path


def export_stix(result: InvestigationResult, destination: Path) -> Path:
    """Export a minimal STIX 2.1-like local bundle without external enrichment."""
    now = result.coordination.completed_at.isoformat().replace("+00:00", "Z")
    objects = [
        {
            "type": "report",
            "spec_version": "2.1",
            "id": f"report--{uuid4()}",
            "created": now,
            "modified": now,
            "name": f"Forensic POC: {result.case_id}",
            "published": now,
            "report_types": ["threat-report"],
            "labels": ["synthetic", "poc", "analyst-review-required"],
            "description": (
                "Automated triage report. Attribution is hypothesis-only and all findings require analyst validation."
            ),
            "object_refs": [],
        }
    ]
    report = objects[0]
    for finding in result.coordination.coordinated_findings:
        indicator = {
            "type": "note",
            "spec_version": "2.1",
            "id": f"note--{uuid4()}",
            "created": now,
            "modified": now,
            "content": (
                f"{finding.category}; ATT&CK={','.join(finding.technique_ids)}; "
                f"confidence={finding.confidence:.3f}; evidence={','.join(finding.evidence_refs)}"
            ),
            "object_refs": [],
            "labels": ["forensic-finding", "analyst-review-required"],
        }
        objects.append(indicator)
        report["object_refs"].append(indicator["id"])
    bundle = {"type": "bundle", "id": f"bundle--{uuid4()}", "objects": objects}
    path = destination / "investigation.stix.json"
    path.write_text(json.dumps(bundle, indent=2), encoding="utf-8")
    return path


def export_pdf(html_path: Path, destination: Path) -> Path | None:
    """Render PDF when WeasyPrint is installed; HTML remains the canonical fallback."""
    try:
        from weasyprint import HTML
    except ImportError:
        return None
    pdf_path = destination / "investigation.pdf"
    HTML(filename=str(html_path)).write_pdf(str(pdf_path))
    return pdf_path


def export_all(result: InvestigationResult, destination: str | Path) -> dict[str, Path]:
    """Write all standard report representations and return the generated file map."""
    output_dir = Path(destination)
    output_dir.mkdir(parents=True, exist_ok=True)
    html_path = export_html(result, output_dir)
    files = {
        "json": export_json(result, output_dir),
        "html": html_path,
        "stix": export_stix(result, output_dir),
    }
    pdf_path = export_pdf(html_path, output_dir)
    if pdf_path:
        files["pdf"] = pdf_path
    return files
