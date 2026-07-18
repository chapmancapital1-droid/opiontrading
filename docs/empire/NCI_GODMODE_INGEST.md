# NCI GodMode package — what it is & empire fit

**Date:** 2026-07-12  
**Owner context:** Michael Chapman / GangsterNerds  
**You asked:** “I don’t know what this repo is but I put it as important — ingest and see if it helps the empire.”

## Identity (this is the package)

| Path | What it is |
|------|------------|
| `C:\Users\Michael Chapman\Downloads\NCI_GodMode_v2.0_BUILD_PACKAGE\` | **Main “important” build** — NCI Hybrid / GodMode v2.0 MT4 forex system |
| `C:\Users\Michael Chapman\Desktop\TRADINGBRAIN\` | Spec PDFs + companion HTML (ABC cycles, GodMode v3, gap analysis) |
| `C:\Users\Michael Chapman\opiontrading\pine\` | **Already in OptionScope** — NCI Pine + webhook bridge snippets |
| `C:\Users\Michael Chapman\opiontrading\src\indicators\nciTa\` | **Already in OptionScope** — TS engine + store + API |
| `Documents\githubrepotradingdata\EMARobot.mq4` | **Unrelated** pip-sniper EA — ignore for empire |

### What GodMode claims to be

Fusion of:

1. **NCI v1.8** — 15-voter confluence, capital preservation  
2. **GodMode v3** — weighted score, SCALP / SWING / LONG modes  
3. **ABC market cycles** — Consolidation / Expansion / Contraction  
4. **MT4 EAs** + **Python FastAPI bridge** + **HTML dashboard**  
5. Risk locks: **0.25% / trade**, **1% daily DD**, **3% weekly**, no martingale, 3-loss cooldown  

Domain: **forex pairs on MetaTrader 4**, not equity options on Robinhood.

### Package honesty check (as on disk)

| Claimed | On disk |
|---------|---------|
| Full Hybrid EA ~2000 lines | `NCI_Hybrid_v2.0.mq4` is tiny (~7 KB); v2.1 ~23 KB; root has larger `NCI_GodMode_v3_2_Fusion.mq4` |
| Patches/ folder | Referenced in docs; verify before compile |
| Data_CSVs / full docs set | Partial vs README_FIRST list |
| Bridge | `Python_Bridge/nci_bridge_v3.py` present; status file shows **DEMO** mode without MT4 files |

Treat as **useful design + risk charter + NCI language**, not a turnkey audited live system.

---

## Does it help OptionScope / empire?

### Already helping (integrated)

OptionScope **already speaks NCI**:

- Pine: `pine/NCI_Complete_Trading_Assistant_v2.pine`  
- Bridge: `pine/NCI_OptionScope_Alert_Bridge.pine` → `POST /api/nci-ta/webhook`  
- Brain: `selector.ts` boosts/penalizes by FIRE BUY/SELL, master BULL/BEAR/FLAT, ABC **C_CONTRACTION** blocks tactical growth, RoboTrick fade favors income  

So the “repo” is not foreign — it’s the **forex/MT4 sibling** of the chart language you already use for options bias.

### Pull into empire (YES — hygiene only)

| GodMode idea | Empire action |
|--------------|---------------|
| Hard % risk / daily halt | Align with `empirePolicy` + `riskGates` (already similar; seed even tighter) |
| No martingale / no stop widen | Keep undefined-risk ban + process notes |
| 3-loss cooldown | Optional AccountState flag from journal (not coded yet) |
| Chop / low ADX → skip directional | Already `minAdx` + FIRE gates; prefer credits in FLAT |
| Human approval before live | Manual RH checklist — same philosophy as GodMode “dashboard approval” |
| 14-day forward test before scale | Ladder stages + journal calibration before stage-ups |

### Do **not** pull (NO)

| Item | Why |
|------|-----|
| Auto-trade MT4 EA | Empire = **manual Robinhood options only** |
| Python FastAPI as core | Next.js APIs already host NCI snapshot/webhook |
| 28-pair FX heatmap | Wrong asset class for SOFI/AAPL options brain |
| EMARobot / De Pip Sniper | Random EA, not NCI |
| Leveraged FX SCALP modes | Not equity options DTE process |

---

## Recommended stance

1. **Keep GodMode package as the MT4/forex lab** (demo only until you personally validate).  
2. **Keep OptionScope as the equity options empire brain** — NCI TA = optional chart bias, not order bot.  
3. **Share language, not execution:** FIRE/ABC/master already bridge both worlds.  
4. **Optional next engineering (only if you want):**  
   - Show `abcStage` + ADX more loudly on Recommend UI  
   - Journal-driven 3-loss cooldown gate  
   - Do **not** merge MQL4 auto-execution into OptionScope  

## Code artifacts from this ingest

- `src/knowledge/nciGodModeRules.ts` — charter bullets  
- This doc  

No new `StrategyRule` from GodMode (would duplicate NCI soft scoring already in `selector.ts`).
