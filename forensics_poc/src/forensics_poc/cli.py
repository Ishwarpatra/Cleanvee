"""Command-line entry points for the forensic proof of concept."""

from __future__ import annotations

import argparse
from pathlib import Path

from forensics_poc.pipeline import InvestigationPipeline, verify_ledger
from forensics_poc.reporting import export_all
from forensics_poc.sample_data import build_demo_case


def main() -> None:
    parser = argparse.ArgumentParser(description="Offline multi-agent forensic POC")
    subparsers = parser.add_subparsers(dest="command", required=True)
    demo = subparsers.add_parser("demo", help="run the deterministic synthetic incident")
    demo.add_argument("--case-root", default="cases", help="case-data directory")
    demo.add_argument("--reports-dir", default="reports", help="report output directory")
    demo.add_argument("--no-reports", action="store_true", help="do not write report files")
    verify = subparsers.add_parser("verify-ledger", help="verify one POC chain-of-custody ledger")
    verify.add_argument("path", help="path to chain_of_custody.jsonl")
    args = parser.parse_args()

    if args.command == "verify-ledger":
        valid = verify_ledger(args.path)
        print("VALID" if valid else "INVALID")
        raise SystemExit(0 if valid else 1)

    result = InvestigationPipeline(case_root=args.case_root).run(build_demo_case())
    print(f"Case: {result.case_id}")
    print(f"Decision: {result.coordination.decision.value}")
    print(f"Overall confidence: {result.coordination.overall_confidence:.3f}")
    print(f"Findings: {len(result.coordination.coordinated_findings)}")
    if not args.no_reports:
        files = export_all(result, Path(args.reports_dir) / result.case_id)
        print("Reports:")
        for name, path in files.items():
            print(f"  {name}: {path}")


if __name__ == "__main__":
    main()
