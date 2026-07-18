================================================================================
NERDCOMMAND TRADING BRAIN — LOCAL PORTABLE COPY
Exported: 2026-07-16T15:20:07.721896+00:00
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
  3) .\.venv\Scripts\Activate.ps1
  4) pip install -r requirements.txt
  5) .\RUN_DEMO.ps1
  6) .\RUN_SELF_IMPROVE.ps1          # default 400y validation lab
  7) .\RUN_DASHBOARD.ps1             # SPY alerts (needs network for yfinance)

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
  python -c "from ota.agent import NERDCOMMAND_OTA; NERDCOMMAND_OTA().ingest_new_book(r'C:\path\book.pdf','Title')"

STACK MAP
  ota/           Python brain (pipelines, SPY, self-improve)
  domain_ts/     TypeScript engines for OptionScope Next.js app
  docs/          Handoff + notes if present

================================================================================
