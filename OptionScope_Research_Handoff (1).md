# OptionScope Research Handoff — Walk-Forward Robustness Study

**Prepared by:** NCI (NERDCOMMAND Core Intelligence) for GangsterNerds LLC / OptionScope
**For:** external AI research team (any capable coding/analysis agent)
**Date issued:** 2026-08-18
**Purpose:** Run the two blocking validation tasks on the OptionScope trading engine and return structured results. Do NOT place trades, connect to any broker, or touch the live Robinhood account. This is offline historical analysis only, against a git repo and cached market data.

---

## 0. Read this first

This file is a complete, self-contained work order. It is designed so the requesting AI (NCI, running in a separate session) does not need to re-derive methodology from your write-up — it needs your **raw output in the exact schema specified in Section 5**, plus your code/commands, so results can be verified and ingested programmatically.

Do not reimplement the strategy logic from a description. Pull the actual functions from the repo (Section 1) and run them unmodified except for the specific parameters each test asks you to vary. Divergence between your reimplementation and the real codebase would invalidate the results.

If anything in this spec is ambiguous or you have to make a judgment call, **state the judgment call explicitly in your output** rather than silently picking an interpretation.

---

## 1. Repo access

- Remote: `https://github.com/chapmancapital1-droid/opiontrading`
- Branch/PR in progress: PR #1 (verify current default branch on clone — do not assume `main`)
- Local mirror exists at `D:\GITHUBCLONES\opiontrading` on the project owner's machine, but you should work from a **fresh clone**, not that working copy, to avoid touching uncommitted local state.
- Stack: Next.js 16 + TypeScript. Setup script `setup-nci.js` at repo root wires the build if needed — safe to re-run, it no-ops on anything already in place.
- Relevant files for this study (read them before running anything):
  - `runner/sessions.ts` — contains `scoreMeanReversion()` (the surviving strategy) and `scoreBullish()` (the invalidated trend strategy — **do not use scoreBullish for anything, it is dead**, kept only for reference/negative-control purposes if a test explicitly calls for it)
  - `runner/replay.ts`, `runner/replay-cli.ts`, `REPLAY.bat` — no-lookahead historical replay harness. `visibleBars()` withholds future bars; do not bypass this.
  - `runner/exit-lab.ts` — exit-strategy comparison harness (fixed / breakeven / trailing / ladder / adaptive)
  - `runner/config.ts` — all risk parameters (position sizing, halts, floors) live here; do not hardcode risk values elsewhere
  - `data/bars-daily.json` — existing cached bar cache (10 symbols, 2024-01-02 → 2026-08-14). You will need to **extend** this, see Section 2.
  - `docs/ota/LESSONS_FROM_YOUR_TRADES.md` and `src/knowledge/catalog/ingested/rh_history_lessons.json` — the 877-trade personal history analysis (already complete, reference only, do not re-run)

Fill mechanics already encoded in the harness (preserve these — do not change fill assumptions):
- Gaps below the stop fill at the OPEN, not at the stop price
- A single bar touching both stop and target is assumed to hit the STOP first (conservative)
- No-lookahead is enforced structurally via `visibleBars()`, not by convention

---

## 2. Data requirements

### 2a. Universe
Use the **existing 30-symbol universe** from the most recent walk-forward run (`runner/sessions.ts` walk-forward test, 2026-08-18) if you can recover the exact symbol list from repo history/commits. If the exact list isn't recoverable, construct a comparable one and **report the symbols you used explicitly** — the prior run deliberately included real disasters (CHPT −97%, LCID −90%, PLUG −81%, NIO, SNAP) rather than survivors-only, to avoid survivorship bias. Match that spirit: don't cherry-pick winners.

For the wider-universe test (Section 4, Test 3) expand to 50–100 symbols, same rule: include names that fell hard, not just current large-caps.

### 2b. Date range — this is the critical change from the prior run
The prior walk-forward run covered 2023-01 → 2026-08, which is bull-market-only and is exactly why the mean-reversion result (2 folds, 1 profitable / 1 zero-trade) is considered too thin to fund.

**Extend the data back to at least 2020-01-01**, so the window includes:
- The Feb–Mar 2020 COVID crash (fast, deep bear)
- The 2022 rate-hike bear market (slow grind, growth/tech-heavy drawdown — this is the more relevant analog for the current universe, which skews growth/momentum names)
- The 2023–2026 bull run already tested

Use split-adjusted daily bars, same as the existing cache. Source via the same method the repo already uses (Robinhood MCP pull, per the existing `data/bars-daily.json` generation — check the script/command that produced that file and reuse it, extending the date range).

---

## 3. Test 1 (PRIMARY / BLOCKING) — Extended walk-forward, mean reversion, more folds + bear window

This is next-action item #6 from `NCI_MEMORY.md`: *"More folds + a bear-market window for mean reversion — only 2 folds completed. THE BLOCKING ITEM NOW."*

**Input:**
- Strategy under test: `scoreMeanReversion()` from `runner/sessions.ts`, unmodified
- Data: universe + extended date range from Section 2
- Walk-forward scheme: minimum **6 folds** (up from 3 in the trend-strategy run and 2 in the initial mean-reversion run). Use rolling fit/test windows — fit 12 months, test 6 months, roll forward — and ensure at least one fold's *test* window falls substantially inside the 2022 bear market and, separately, at least one fold's test window covers the 2020 COVID crash if data range permits.
- Exit logic: run this **twice** — once with the `ladder` exit plan (the prior winner) and once with `fixed` (the simplest baseline) — so we can see whether the mean-reversion edge depends on the same fragile exit tuning that broke the trend strategy.
- Keep all risk/sizing parameters at the values in `runner/config.ts` unless a parameter is explicitly what's being varied (Test 2).

**What "SURVIVED" vs "INVALIDATED" means (use this exact bar, don't loosen it):**
- SURVIVED: majority of folds profitable AND out-of-sample expectancy positive AND out-of-sample expectancy retains ≥30% of in-sample expectancy (the prior run retained 47.2% over just 2 folds — the bar is whether that holds up over 6+)
- INVALIDATED: sign flips out-of-sample (like `scoreBullish` did: +$4.18 in-sample → −$2.40 OOS), or the optimizer/parameters are unstable fold-to-fold
- INCONCLUSIVE: neither of the above cleanly, e.g. too few trades in bear-market folds to be statistically meaningful — say so explicitly, don't force a verdict

**Report per fold:** fold number, fit window dates, test window dates, market regime label (bull/bear/choppy — your judgment, state your criteria), number of OOS trades, OOS P&L, OOS expectancy per trade, win rate, profit factor, max drawdown.

---

## 4. Test 2 — Parameter stability sweep on mean reversion

The prior study found the trend strategy's ladder-exit result was parameter-fragile (minScore 4 → +$1.66 expectancy / $888 final equity; minScore 5 → −$2.16 expectancy / $196, hitting the equity floor — a one-point change flipped the sign). That fragility test was run on the earlier (now-invalidated) trend setup. It has **not** been re-run against `scoreMeanReversion()`, and it needs to be, because a strategy that only "works" in one narrow parameter corner has not demonstrated real edge.

**Input:**
- Strategy: `scoreMeanReversion()`
- Sweep the entry-threshold-equivalent parameter(s) it uses (e.g. RSI oversold cutoff — the prior conditional-edge scan compared RSI<25 vs RSI<30) across a grid of at least 5 values bracketing the value currently used in the codebase
- For each value, run the full walk-forward from Test 1 (or at minimum the highest-N single-window backtest if full walk-forward per grid point is too expensive) and record expectancy, profit factor, and final equity
- Same for any exit-ladder parameters (the pare-at-1R / pare-at-2R thresholds) — sweep those independently, holding entry threshold fixed at its current codebase value

**Deliverable:** a table (see schema in Section 5) showing expectancy/PF/final-equity as a function of each swept parameter, so NCI can visually assess whether the result is a stable edge or a lucky corner like the trend strategy's ladder result was.

---

## 5. Required output format

Return **one JSON file** named `optionscope_handback.json` with this exact top-level structure. Do not omit fields — use `null` and a note in `caveats` if something couldn't be produced. Also return the raw per-trade CSV logs your harness produced (one CSV per test) as separate attachments, named `test1_folds.csv` and `test2_sweep.csv`, since NCI will spot-check a sample rather than trust the JSON summary blindly.

```json
{
  "meta": {
    "run_date": "YYYY-MM-DD",
    "repo_commit_sha": "string — the exact commit you ran against",
    "data_source": "string — how bars were pulled, e.g. 'Robinhood MCP via <script>'",
    "date_range_used": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
    "universe_used": ["TICKER", "..."],
    "deviations_from_spec": "string — anything you had to interpret or couldn't do exactly as specified"
  },
  "test1_walk_forward": {
    "strategy": "scoreMeanReversion",
    "exit_plan": "ladder | fixed",
    "folds": [
      {
        "fold": 1,
        "fit_window": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
        "test_window": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
        "regime_label": "bull | bear | choppy",
        "regime_label_basis": "string — how you decided the label",
        "oos_trades": 0,
        "oos_pnl_usd": 0.0,
        "oos_expectancy_per_trade": 0.0,
        "win_rate_pct": 0.0,
        "profit_factor": 0.0,
        "max_drawdown_pct": 0.0
      }
    ],
    "aggregate": {
      "folds_profitable": "X of N",
      "total_oos_trades": 0,
      "total_oos_pnl_usd": 0.0,
      "in_sample_expectancy_per_trade": 0.0,
      "out_of_sample_expectancy_per_trade": 0.0,
      "edge_retained_pct": 0.0,
      "verdict": "SURVIVED | INVALIDATED | INCONCLUSIVE",
      "verdict_reasoning": "string"
    }
  },
  "test2_parameter_sweep": {
    "entry_threshold_sweep": {
      "parameter_name": "string, e.g. rsi_oversold_cutoff",
      "codebase_default_value": 0,
      "grid": [
        { "value": 0, "oos_expectancy_per_trade": 0.0, "profit_factor": 0.0, "final_equity_usd": 0.0, "oos_trades": 0 }
      ],
      "sign_flips_observed": true,
      "stability_assessment": "string — your read on whether this is a stable edge or a fragile corner"
    },
    "exit_ladder_sweep": {
      "parameter_name": "string, e.g. pare_at_1R_pct / pare_at_2R_pct",
      "codebase_default_value": "string or number",
      "grid": [
        { "value": "string or number", "oos_expectancy_per_trade": 0.0, "profit_factor": 0.0, "final_equity_usd": 0.0, "oos_trades": 0 }
      ],
      "sign_flips_observed": true,
      "stability_assessment": "string"
    }
  },
  "test3_wider_universe": {
    "universe_size": 0,
    "symbols": ["TICKER", "..."],
    "aggregate_oos_expectancy_per_trade": 0.0,
    "aggregate_win_rate_pct": 0.0,
    "comparison_to_test1_10-30_symbol_result": "string — does the edge hold, weaken, or strengthen with a wider universe?"
  },
  "bugs_or_anomalies_found": [
    "string — anything that looked wrong in the harness, the data, or your own methodology while running this. The prior study found 3 real harness bugs this way (stopped clock, wrong sequencing, halt counters never resetting) — report anything similar, don't paper over it."
  ],
  "caveats": [
    "string — sample sizes that are too thin, folds with zero trades, anything that should stop NCI from treating a result as more solid than it is"
  ]
}
```

---

## 6. Ground rules (non-negotiable)

1. **No lookahead, ever.** If your harness or reimplementation can see a future bar when generating a signal, the entire result is invalid. Use the repo's existing `visibleBars()` mechanism rather than building your own.
2. **Fail closed.** If data is missing or stale for a symbol/date, exclude that trade rather than guessing or interpolating.
3. **No survivorship bias.** Don't quietly drop delisted/collapsed names from the universe.
4. **Report negative and null results plainly.** If Test 1 comes back INVALIDATED or INCONCLUSIVE, that is a useful and expected possible outcome — say so as directly as the prior study said "the trend strategy is DEAD." Do not soften a bad result to seem more useful.
5. **Do not place any live or paper broker order, and do not touch `runner/gates.ts`-gated execution paths.** This is read/simulate only.
6. **Do not modify `runner/config.ts` risk values.** Sweep parameters only within the scope Test 2 defines, and only in your test harness invocation, not by editing the committed config.
7. **Cite the exact commit SHA you ran against** in `meta.repo_commit_sha` — results are meaningless without knowing which code version produced them.

---

## 7. What NCI will do with this

On return, NCI will spot-check a sample of the CSV logs against the JSON summary, cross-reference the verdict against `NCI_MEMORY.md` section 7c/7d, and — if Test 1 comes back SURVIVED with a stable Test 2 sweep — update the project memory to move item #6 from blocking to done, and take up next-action item #7 (resolving the long-options contradiction: equities-only automation vs. manual short-premium execution vs. waiting on MCP spread support).

If Test 1 comes back INVALIDATED or INCONCLUSIVE, the honest read is that the agent-automatable path stays equities-only (or nothing) for now, and the proven edge (short premium, 66.9% win rate, +$24,041 over 538 trades) remains a manual, app-assisted process rather than something the runner executes.
