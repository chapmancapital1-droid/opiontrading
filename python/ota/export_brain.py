"""
Export a complete LOCAL copy of the trading brain for offline / multi-machine use.

Creates:
  TRADING_BRAIN_LOCAL/
    README_RUN_ME.txt
    requirements.txt
    ota/                 (full Python package)
    domain_ts/           (TypeScript domain engines for reference)
    data/                (catalog, champion genome, reports)
    RUN_SELF_IMPROVE.ps1
    RUN_DASHBOARD.ps1
    RUN_DEMO.ps1

Usage:
  cd python
  python -m ota.export_brain
  python -m ota.export_brain --dest "D:\\MyBrains\\OTA"
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

OTA_DIR = Path(__file__).resolve().parent
PYTHON_DIR = OTA_DIR.parent
REPO = PYTHON_DIR.parent
DEFAULT_DEST = REPO / "TRADING_BRAIN_LOCAL"

# Core Python modules that ARE the brain logic
PY_MODULES = [
    "agent.py",
    "pricing.py",
    "knowledge.py",
    "decision.py",
    "portfolio.py",
    "spy_1dte.py",
    "spy_strategy.py",
    "options_chain.py",
    "spy_dashboard.py",
    "backtester.py",
    "genome.py",
    "self_improve.py",
    "export_brain.py",
    "__init__.py",
    "__main__.py",
    "README.md",
]

# TS domain mirrors (read-only reference for OptionScope stack)
TS_DOMAIN = [
    "blackScholes.ts",
    "montecarlo.ts",
    "binomial.ts",
    "payoff.ts",
    "valuation.ts",
    "strikeProbability.ts",
    "normal.ts",
    "rng.ts",
    "types.ts",
    "money.ts",
]


README = """================================================================================
NERDCOMMAND TRADING BRAIN — LOCAL PORTABLE COPY
Exported: {timestamp}
Owner: Michael Chapman / NERDCOMMAND
================================================================================

WHAT THIS IS
  Full option trading brain logic you can run offline:
  - Black-Scholes + Monte Carlo pricing
  - Knowledge catalog + book ingest hooks
  - Decision / portfolio / risk
  - SPY 1DTE special strategy + live chain (yfinance)
  - Standalone SPY dashboard alerts
  - 400-year synthetic self-improve laboratory
  - TypeScript domain engines (reference; OptionScope UI uses these)

IMPORTANT TRUTH
  "400 years" = synthetic regime-switching stress lab (bull/bear/crisis/sideways).
  It is NOT 400 years of real SPY history. Use it to harden rules, then validate
  on real data before any live capital.

QUICK START (Windows PowerShell)
  1) cd into this folder
  2) python -m venv .venv
  3) .\\.venv\\Scripts\\Activate.ps1
  4) pip install -r requirements.txt
  5) .\\RUN_DEMO.ps1
  6) .\\RUN_SELF_IMPROVE.ps1          # default 400y validation lab
  7) .\\RUN_DASHBOARD.ps1             # SPY alerts (needs network for yfinance)

SELF-IMPROVE (full)
  python -m ota.self_improve --years 400 --generations 12 --pop 8
  python -m ota.self_improve --fast   # smoke test

Outputs written under ota/data/:
  champion_genome.json       — best evolved parameters
  self_improve_report.json   — full lab report
  brain_catalog.json         — knowledge + rules (auto-updated)
  spy_dashboard_latest.json  — last SPY alert

APPLY CHAMPION
  The agent loads strategy rules from brain_catalog.json.
  After self-improve, rules min_entry_score / min_pop / risk / adjustments
  are rewritten from the champion genome.

INGEST NEW BOOKS
  python -c "from ota.agent import NERDCOMMAND_OTA; NERDCOMMAND_OTA().ingest_new_book(r'C:\\path\\book.pdf','Title')"

STACK MAP
  ota/           Python brain (pipelines, SPY, self-improve)
  domain_ts/     TypeScript engines for OptionScope Next.js app
  docs/          Handoff + notes if present

================================================================================
"""


def export(dest: Path) -> Path:
    dest = Path(dest)
    if dest.exists():
        # Clean partial re-export of package dirs only
        for sub in ("ota", "domain_ts", "docs"):
            p = dest / sub
            if p.exists():
                shutil.rmtree(p)
    dest.mkdir(parents=True, exist_ok=True)

    ota_out = dest / "ota"
    ota_out.mkdir(parents=True, exist_ok=True)
    (ota_out / "data").mkdir(exist_ok=True)

    for name in PY_MODULES:
        src = OTA_DIR / name
        if src.exists():
            shutil.copy2(src, ota_out / name)

    # data artifacts
    data_src = OTA_DIR / "data"
    if data_src.exists():
        for f in data_src.iterdir():
            if f.is_file() and f.suffix in {".json", ".log", ".txt"}:
                shutil.copy2(f, ota_out / "data" / f.name)

    # Ensure genome seed exists
    genome_path = ota_out / "data" / "champion_genome.json"
    if not genome_path.exists():
        from ota.genome import BrainGenome

        BrainGenome().save(genome_path)

    # TypeScript domain reference
    ts_src = REPO / "src" / "domain"
    ts_out = dest / "domain_ts"
    ts_out.mkdir(exist_ok=True)
    if ts_src.exists():
        for name in TS_DOMAIN:
            p = ts_src / name
            if p.exists():
                shutil.copy2(p, ts_out / name)

    # Docs
    docs_out = dest / "docs"
    docs_out.mkdir(exist_ok=True)
    handoff = REPO / "docs" / "ota" / "NERDCOMMAND_OTA_MASTER_HANDOFF_v1.txt"
    if handoff.exists():
        shutil.copy2(handoff, docs_out / handoff.name)

    # requirements
    req = PYTHON_DIR / "requirements-ota.txt"
    if req.exists():
        shutil.copy2(req, dest / "requirements.txt")
    else:
        (dest / "requirements.txt").write_text(
            "numpy>=1.26\nscipy>=1.11\npandas>=2.0\nyfinance>=0.2\n",
            encoding="utf-8",
        )

    # Runner scripts
    (dest / "RUN_DEMO.ps1").write_text(
        "$ErrorActionPreference='Stop'\n"
        "Set-Location $PSScriptRoot\n"
        "if (Test-Path .\\.venv\\Scripts\\Activate.ps1) { . .\\.venv\\Scripts\\Activate.ps1 }\n"
        "$env:PYTHONPATH = (Resolve-Path .).Path\n"
        "python -m ota\n",
        encoding="utf-8",
    )
    (dest / "RUN_SELF_IMPROVE.ps1").write_text(
        "$ErrorActionPreference='Stop'\n"
        "Set-Location $PSScriptRoot\n"
        "if (Test-Path .\\.venv\\Scripts\\Activate.ps1) { . .\\.venv\\Scripts\\Activate.ps1 }\n"
        "$env:PYTHONPATH = (Resolve-Path .).Path\n"
        "Write-Host 'Long-horizon self-improve (400y validation). This can take a while…'\n"
        "python -m ota.self_improve --years 400 --generations 12 --pop 8 --eval-years 80\n"
        "Write-Host 'Done. See ota\\data\\champion_genome.json and self_improve_report.json'\n",
        encoding="utf-8",
    )
    (dest / "RUN_DASHBOARD.ps1").write_text(
        "$ErrorActionPreference='Stop'\n"
        "Set-Location $PSScriptRoot\n"
        "if (Test-Path .\\.venv\\Scripts\\Activate.ps1) { . .\\.venv\\Scripts\\Activate.ps1 }\n"
        "$env:PYTHONPATH = (Resolve-Path .).Path\n"
        "python -m ota.spy_dashboard --bias neutral --once\n",
        encoding="utf-8",
    )
    (dest / "RUN_SELF_IMPROVE_FAST.ps1").write_text(
        "$ErrorActionPreference='Stop'\n"
        "Set-Location $PSScriptRoot\n"
        "if (Test-Path .\\.venv\\Scripts\\Activate.ps1) { . .\\.venv\\Scripts\\Activate.ps1 }\n"
        "$env:PYTHONPATH = (Resolve-Path .).Path\n"
        "python -m ota.self_improve --fast\n",
        encoding="utf-8",
    )

    # package marker so `python -m ota` works when PYTHONPATH=dest
    ts = datetime.now(timezone.utc).isoformat()
    (dest / "README_RUN_ME.txt").write_text(
        README.format(timestamp=ts), encoding="utf-8"
    )

    manifest = {
        "exported_at": ts,
        "dest": str(dest),
        "python_modules": PY_MODULES,
        "domain_ts": TS_DOMAIN,
        "how_to_self_improve": "python -m ota.self_improve --years 400 --generations 12 --pop 8",
    }
    (dest / "MANIFEST.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    # Also zip for easy USB copy
    zip_base = dest.parent / f"{dest.name}_portable"
    archive = shutil.make_archive(str(zip_base), "zip", root_dir=str(dest))
    print(f"Exported folder: {dest}")
    print(f"Exported zip:    {archive}")
    return dest


def main(argv: Optional[list] = None) -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--dest", type=str, default=str(DEFAULT_DEST))
    args = p.parse_args(argv)
    export(Path(args.dest))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
