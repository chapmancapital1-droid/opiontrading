# L:\dump2 ingest

**Date:** 2026-07-12  
**Focus path:** `L:\dump2\Python Algo Trading Market Neutral Hedge Fund Strategy`

## What it is

TutsGalaxy / Quantopian-era course: **Python algo trading → market-neutral long/short equities** with:

1. Intro + Quantopian platform tour (legacy — platform shut down)  
2. Python / NumPy / Pandas basics  
3. **Pipeline** API (factors, filters, classifiers, universe masks)  
4. **Professional quant workflow** (6 steps)  
5. **Psychsignal** StockTwits mood factors  
6. **Sentdex** news sentiment factors  
7. Alphalens-style factor IC + tear-sheet backtests  

~30 MP4 lessons + captions. Sections 8–9 were **empty on disk** but present inside the `.zip` — captions extracted for distillation only.

## What we distilled into OptionScope

| Artifact | Location |
|----------|----------|
| Rules | `src/knowledge/dump2Rules.ts` → merged into `STRATEGY_RULES` |
| Inventory | `src/knowledge/catalog/dump2_inventory.json` |
| Workflow checklist | `DUMP2_QUANT_WORKFLOW` |
| Sentiment hygiene | `DUMP2_SENTIMENT_HYGIENE` |

### Strategy rules (options-mapped, not equity LS)

| ID | strategyId | Intent |
|----|------------|--------|
| `dump2_universe_liquidity_credit` | `bull_put_credit` | Liquid universe + event filters |
| `dump2_sentiment_soft_debit` | `bull_call_debit` | News soft-confirm; no signal → no trade |
| `dump2_neutral_multi_alpha_condor` | `iron_condor` | Multi-condition income; no single-alpha book |

## Explicitly rejected for empire runtime

- Quantopian / Zipline / Blaze code  
- StockTwits long-short equity books as primary seed strategy  
- Course marketing Sharpe / annual-return tear sheets as live expectations  
- Auto-broker execution (course → IB path; we stay manual Robinhood)

## How it helps the options brain

- **Process health:** universe → alpha → combine → risk → size → execute  
- **Sentiment hygiene:** empty signal days, earnings, M&A pin risk  
- **Multi-alpha warning:** matches multi-gate selector design  

It does **not** replace Money Press, CrowBar, or defined-risk option structure rules.

---

## Sargent T. Python Programming for Economics and Finance (2023)

**Path:** `L:\dump2\Sargent T. Python Programming for Economics and Finance 2023\`  
**File:** single PDF (~9 MB, 365 pages) — Thomas J. Sargent & John Stachurski (QuantEcon lecture book, Dec 20 2023)

### Structure

| Part | Chapters | Content |
|------|----------|---------|
| I Introduction to Python | 1–8 | About Python, install/Jupyter, white-noise example, functions, essentials, OOP, longer programs/Git |
| II Scientific Libraries | 9–14 | Scientific computing, NumPy, Matplotlib, SciPy (stats/roots/opt/integrate/linalg), Pandas, SymPy |
| III HPC | 15–17 | Numba, parallelization, JAX |
| IV Advanced | 18–20 | Writing good code, language features, debugging |
| V Other | 21–22 | Troubleshooting, execution stats |

### Relevance to OptionScope

| Useful as | Not useful as |
|-----------|----------------|
| Offline Python literacy for research notebooks | Option strategy entry/exit rules |
| Reminder: pure functions, tests, vectorization | Live Recommend / chain pricing source |
| Conceptual link: SciPy numerics ↔ BS/MC math | Drop-in Python dependency for Next app |
| MC worker isolation motivation (HPC chapters) | JAX/Numba models picking SOFI puts |

**Keyword scan:** essentially **no** Black–Scholes, options trading, or portfolio-construction trading chapters in this volume — it is the **programming** first book in the QuantEcon series, not asset-pricing lectures.

### Distillation

- `DUMP2_SARGENT_TOOLING` in `src/knowledge/dump2Rules.ts` (charter bullets only)  
- Inventory rows tagged `tooling`  
- **No new `StrategyRule` IDs** (would only add noise to selector)

### Policy

Keep PDF on `L:\` for study. Do not import into `pnpm` app. Brain remains pure TypeScript + existing MC worker.

---

## Kneusel R. Math for Programming (2025)

**Path:** `L:\dump2\Kneusel R. Math for Programming. Learn the Math, Write Better Code 2025\`  
**File:** PDF ~13 MB, ~617 pages — Ronald T. Kneusel, No Starch Press (ISBN 978-1-7185-0358-8)  
**Ignore:** bundled `Readme.txt` (third-party “solutions” spam — not part of the book)

### Structure (brief contents)

| Ch | Topic | Soft map to OptionScope |
|----|--------|-------------------------|
| 1 | Computers & numbers / floating point | Money cents, MC float hygiene |
| 2–4 | Sets, Boolean, functions/relations | Data structures & pure logic |
| 5–6 | Induction, recurrence/recursion | Algorithm correctness mindset |
| 7–8 | Number theory, combinatorics | Hash/crypto literacy; complexity |
| 9–10 | Graphs, trees | Search/sort structures |
| 11–12 | Probability, statistics | MC PoP + journal calibration literacy |
| 13 | Linear algebra | Multi-factor numerics background |
| 14–16 | Diff/integral calc, DEs | Continuous models — not live Greeks source |

### Relevance

| Useful as | Not useful as |
|-----------|----------------|
| Programmer math literacy | Option entry/exit rules |
| Float / prob / stats intuition | Recommend strategy IDs |
| Better domain code quality | Scraping book exercises into chain marks |

### Distillation

- `DUMP2_KNEUSEL_MATH` in `dump2Rules.ts`  
- Inventory rows tagged `tooling`  
- **No new `StrategyRule` IDs**