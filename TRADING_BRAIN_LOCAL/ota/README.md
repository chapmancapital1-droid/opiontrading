# NERDCOMMAND OTA (Python)

Runnable option trading brain: Black-Scholes + Monte Carlo, knowledge ingest, **SPY 1DTE special strategy**, real options chain, standalone dashboard, backtester.

**Master handoff (give to dev team):**  
`docs/ota/NERDCOMMAND_OTA_MASTER_HANDOFF_v1.txt`

## Run full brain demo

```powershell
cd "C:\Users\Michael Chapman\opiontrading\python"
pip install -r requirements-ota.txt
python -m ota
```

## 400-year self-improve lab

```powershell
cd "C:\Users\Michael Chapman\opiontrading\python"
python -m ota.self_improve --years 400 --generations 12 --pop 8 --eval-years 80
python -m ota.self_improve --fast   # smoke test
```

Writes champion → `ota/data/champion_genome.json` and updates `brain_catalog.json`.

## Export local portable copy

```powershell
python -m ota.export_brain
# → C:\Users\Michael Chapman\opiontrading\TRADING_BRAIN_LOCAL\
# → TRADING_BRAIN_LOCAL_portable.zip
```

## SPY-only dashboard (standalone alerts)

```powershell
cd "C:\Users\Michael Chapman\opiontrading\python"
python -m ota.spy_dashboard --bias bullish --once
# every 15 minutes during market hours:
python -m ota.spy_dashboard --loop 900 --bias neutral
```

Writes:
- `python/ota/data/spy_dashboard_latest.json`
- `python/ota/data/spy_1dte_dashboard.log`

Optional webhook: `$env:OTA_SPY_WEBHOOK_URL = "https://..."`

## From Python

```python
from ota.agent import NERDCOMMAND_OTA
a = NERDCOMMAND_OTA()

# Special SPY 1DTE plan (≤4 high-POP strikes; fewer if market thin)
print(a.spy_trade_plan(bias="bullish"))
print(a.spy_high_pop_strikes(bias="bullish", num_strikes=4, min_pop=0.55))
print(a.spy_dashboard_alert())

# Books → brain
a.ingest_new_book(r"C:\path\to\book.pdf", "MyOptionsBook")
```

## Modules

| File | Role |
|------|------|
| `pricing.py` | BS + MC European (+ antithetic) |
| `knowledge.py` | Catalog + keyword auto-ingest |
| `decision.py` | Edge / size / confidence |
| `portfolio.py` | Cash + positions |
| `spy_1dte.py` | Entry score + adjustments |
| `spy_strategy.py` | **Special SPY 1DTE strategy** (≤4 high-POP, safe/cheap) |
| `options_chain.py` | **Real yfinance SPY chain** + synthetic fallback |
| `spy_dashboard.py` | **Standalone SPY alerts** |
| `backtester.py` | SPY 1DTE BT |
| `agent.py` | Orchestrator |

TypeScript live UI engines remain under `src/domain/*`.
