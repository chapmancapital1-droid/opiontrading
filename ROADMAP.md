# OptionScope build roadmap — toward the strategy "brain"

The end goal: a **real options strategy selector** that reads live market context,
consults a knowledge base (**your option book library**), scores candidate
strategies with the quantitative engine, and explains its picks with an AI layer —
all on live data with charting.

This document exists to answer one question precisely: **when do you add your
option book library?** Short answer: **at the Phase 3 → Phase 4 gate** (marked
⏳ below). Not before — the selector needs live *market context* to consult the
library against, and that context isn't fully in place until Phase 3.

---

## Phases

### ✅ Phase 0 — Foundation (done)
Buildable Next.js app; typed, unit-tested options engine (`src/domain`: payoff,
Black-Scholes, binomial, Monte Carlo, strategy definitions). `next build` ✓,
`tsc` ✓ 0 errors, `vitest` ✓ 16/16.

### ✅ Phase 1 — Live visualization (done)
TradingView on the dashboard: market-summary strip, live chart, symbol-aware
news timeline.

### ✅ Phase 2 — Live data plumbing (done)
Provider-independent data layer (`demo` / `polygon` / **OpenBB**) for quotes,
option chains, expirations, events, and news. **Market Snapshot** panel computes
the first context signals for a ticker: spot, ATM implied vol, nearest expiry,
next earnings.
- ✅ **Builder consumes a live chain**: type a ticker → "Load live chain" pulls
  quote + expirations + chain; each strategy leg snaps to the nearest *listed
  strike* with its *real mark* premium, and IV/DTE come from the live chain.
  Falls back to demo prices when nothing is loaded.
- ✅ **IV history store** (`src/data/ivHistory.ts` + `ivHistoryStore.ts`): caches
  a daily ATM IV (and spot) snapshot per underlying in localStorage (swap for a
  DB later). `useIvHistory` hook queries it and computes IV rank / percentile
  (0–1, 1 = highest). Feeds Phase 3.

### ✅ Phase 3 — Quantitative market-context engine (done)
Turns raw data into the **signals a selector conditions on**, per symbol, via
`computeMarketContext` (`src/lib/marketContext.ts`) → a typed `MarketContext`:
- `ivRank` (0–1) + `ivTrend` (elevated/neutral/low) from the IV history store
- `spotTrend` (up/sideways/down) from the snapshot spot series
- `expectedMove` from the ATM straddle
- `liquidity` (tight/normal/wide) from near-the-money spreads
- `eventProximity` (earnings/ex-div/clear) vs the nearest expiry
- `newsSentiment` (positive/neutral/negative) from the news feed
  (numeric scores when present, else a keyword fallback)

Surfaced live in the builder (after "Load live chain") and on the dashboard via
`MarketContextPanel`. Degrades gracefully to demo data with `confidence`/`notes`.
**This is the input the strategy brain reasons over.**

---

## ⏳ GATE — ADD YOUR OPTION BOOK LIBRARY HERE (Phase 3 → 4)

**Add the book library once `MarketContext` exists (end of Phase 3) and before
building the selector (Phase 4).** Reasons this is the right moment:

1. The library only becomes *useful* when the app can compute the market
   conditions each rule keys off of — that's exactly what Phase 3 produces.
2. The selector (Phase 4) is *built directly on* the library, so the library
   must land first.
3. Landing it earlier means encoding rules with nothing to test them against;
   landing it later means rebuilding the selector.

**What to hand over, and in what shape.** For the library to drive a selector
(and the AI layer), turn book knowledge into **structured, machine-usable
rules**, not prose. Suggested schema (`src/knowledge/strategies/*.json` or MD+frontmatter):

```jsonc
{
  "id": "bull-put-spread",
  "thesis": "moderately bullish / neutral",
  "iv_condition": "elevated (sell premium)",   // low | neutral | elevated
  "trend": ["up", "sideways"],
  "event_stance": "avoid through earnings",
  "risk_profile": "defined",                    // defined | undefined
  "structure": "short put + long lower put, same expiry",
  "entry_rules": ["IV rank > 50", "30–45 DTE", "delta ~0.30 short strike"],
  "exit_rules": ["50% max profit", "roll/close at 21 DTE", "stop at 2x credit"],
  "book_source": "…title / chapter …"
}
```

The richer and more explicit these rules, the smarter the selector and the more
grounded the AI explanations. Keep `book_source` so recommendations can cite the
library.

---

### ✅ Phase 4 — Strategy selector ("the brain") — DONE (logic locked)
Given `MarketContext` + the book-library rules:
1. **Filter** candidate strategies whose conditions match the context.
2. **Score** via rule match + growth-primary preference (`src/brain/selector.ts`).
3. **Size** contracts under per-trade risk / open-risk budget / cash collateral (`src/brain/portfolio.ts`).
4. **Allocate** realized profits into options float + portfolio core (compound growth).
5. **Robinhood path**: manual checklist next-step only — never auto-trade.

**Locked artifacts**
- Policy: `src/knowledge/portfolioPolicy.ts` (`NCI-OS-BRAIN-1.0.0`)
- Rules: `src/knowledge/strategyRules.ts` (wheel + income + tactical)
- Brain API: `src/brain/*`
- Snapshot: `NCI_Brain_updated.txt` (+ `C:\NCI\Brain\NCI_Brain_updated.txt`)
- Tests: `tests/brain/*` (portfolio, selector, growth-lock simulation)

### ✅ Phase 4.1 — Live chain instantiation + engine score + builder wire (done)
- Instantiate strikes/premiums from live chain: `src/brain/instantiate.ts`
- Score candidates with full engine (PoP / EV / RoR): `src/brain/engineScore.ts`
- Wire `runTradingBrain` into builder UI: `BrainRecommendPanel` on builder after live load
- Demo account sizing: `src/brain/demoAccount.ts`
- Tests: `tests/brain/instantiate.test.ts`

### ✅ Phase 4.0b — NCI TA Pine bridge + book library index (done)
- Pine source vendored: `pine/NCI_Complete_Trading_Assistant_v2.pine`
- TypeScript port: `src/indicators/nciTa/*` → `NciTaSnapshot` the brain reads
- Live path A: `POST /api/nci-ta/compute` (OHLCV → engine)
- Live path B: `POST /api/nci-ta/webhook` (TradingView alerts → store)
- Selector consumes `nciTa` (FIRE/master/ABC/RoboTrick bias)
- Option PDF library indexed: `src/knowledge/catalog/optionsLibraryIndex.json`
- Extra book rules: `src/knowledge/bookRulesExtra.ts`
- Docs: `docs/NCI_TA_PINE_BRIDGE.md`

### ✅ Phase 4.2 — PDF library ingest (done)
- `python scripts/ingest_option_pdfs.py` → 100 PDFs scanned, **98 OK**, **2270** knowledge entries
- Catalog: `src/knowledge/catalog/ingested/ota_knowledge_catalog.json` + `entries.jsonl`
- Strategy seeds → `src/knowledge/bookIngestRules.ts` (36 book-backed rules)
- Query API: `searchCatalog()` / `listIngestedSources()` in `src/knowledge/catalog.ts`
- Re-run: `npm run ingest`

**Phase 4.3 (optional deepen)**
- Higher page caps / LLM chapter refinement on top books
- Multi-TF bar feed from market-data provider into `computeNciTa`
- Wire catalog citations into builder UI recommendation cards

### ✅ Phase 5 — AI reasoning layer ("Quantum AI") — catalog-grounded (done)
- Deterministic explainer: `src/brain/explain.ts` + `POST /api/brain/explain`
- UI: **Explain (AI)** on each brain card → thesis / why-now / risks / book citations
- Grounded only in `ScoredRecommendation` + `MarketContext` + `searchCatalog` (no freelanced strikes)
- Builder load applies **exact instantiated legs** the engine scored
- Optional future: LLM polish behind `AI_EXPLAIN_MODE=llm` without changing fact block

### 🤖 Phase 5.1 — Optional LLM polish (open)
Wire SpaceXAI / Grok to rewrite the grounded markdown for tone only — must not
mutate `facts` (PoP, strikes, size, max loss). Keep disclaimers mandatory.

### 📈 Phase 6 — Charting & backtest
Overlay strategy payoff/breakevens on the live chart; backtest the selector's
historical picks to measure edge.

### 🔁 Phase 7 — Calibration loop
The trade journal scores each forecast vs. realized outcome and feeds accuracy
back into selection weighting.

---

## One-line answer
Keep building live data + the quantitative context engine now. **Drop in your
option book library at the end of Phase 3 (the ⏳ gate) — right before we build
the selector.** Ping me then and hand it over as structured strategy rules.

_Educational tooling only — not investment advice._
