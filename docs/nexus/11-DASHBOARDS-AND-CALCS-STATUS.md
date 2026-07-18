# OptionScope — Dashboards & option calculations status

**Date:** 2026-07-16  
**Repo:** `C:\Users\Michael Chapman\opiontrading`  
**Verify:** `pnpm test` **168/168** · `pnpm typecheck` **pass** · `pnpm build` **pass**

---

## Dashboards / app surfaces (all built & in production build)

| Route | Label | Status | What it does |
|-------|--------|--------|--------------|
| `/dashboard` | **Command** | Built (~1.1k lines) | Ritual, charts, market, companion panels |
| `/builder` | **Trade Lab** | Built (~1k lines) | Live chain, strategies, **domain payoff/MC/Greeks**, brain, checklist |
| `/scanner` | **Scanner** | Built | Strategy shortlist ≤15 tickers |
| `/evolve` | **Evolve** | Built | workspace-0890ad1c scientific-method evolution lab (synthetic) |
| `/library` | **Library** | Built | Book/catalog search |
| `/compare` | **Compare** | Built | Up to 3 structures · payoff + Monte Carlo table |
| `/journal` | **Journal** | Built | Plan → open → close with checklist text |
| `/saved` | **Saved** | Built | Local saved analyses |
| `/settings` | **Settings** | Built | Seed presets, RH paste/CSV, Alpaca, theme |
| `/education` | **Education** | Built | Risk + empire field manual |

Nav: `AppShell` primary + secondary. All routes appear in `next build` output.

---

## Option calculation engine (`src/domain/*`)

| Module | Purpose | Wired into UI | Tests |
|--------|---------|---------------|-------|
| `blackScholes.ts` | European price + Greeks | Valuation, demo chain, instantiate, **Greeks panel** | ✅ `blackScholes.test.ts` |
| `binomial.ts` | CRR American price/Greeks | Valuation American path | ✅ `binomial.test.ts` |
| `payoff.ts` | Expiration P/L, max P/L, BEs | Compare, brain, **Trade Lab (domain path)** | ✅ `strategyPayoffs.test.ts` |
| `montecarlo.ts` | Strategy PoP/EV + **European MC pricing** (antithetic, multi-step, BS check, GBM paths) | Compare, **Trade Lab (domain path)** | ✅ `montecarlo.test.ts` (12) |
| `valuation.ts` | Target-date reprice + aggregate Greeks | **Position Greeks panel** | ✅ `valuation.test.ts` |
| `strikeProbability.ts` | Strike hit / touch models | `StrikeHitProbabilityBox` on Lab | ✅ |
| `strategyDefinitions.ts` | Catalog of structures | Templates / brain | ✅ via payoffs |
| `tradeLifecycle.ts` | Lifecycle helpers | lifecycle tests | ✅ |
| `money.ts` / `collateral.ts` / `normal.ts` / `rng.ts` | Support math | Engine internals | indirect |

### Trade Lab engine routing (2026-07-16)

- **Standard same-expiry structures** → typed **`src/domain`** via `builderDomainBridge` (payoff + MC + Greeks).
- **Money Press / multi-DTE diagonal** → specialized UI residual-long path (diagonal still needs far-leg residual; domain is same-expiry expiration model).
- UI shows **Calc engine: Domain | Diagonal UI** and **Position Greeks** from domain always.

Bridge: `src/lib/builderDomainBridge.ts`  
Panel: `src/components/PositionGreeksPanel.tsx`

---

## Brain / context (feeds dashboards)

| Piece | Path | Status |
|-------|------|--------|
| Market context | `src/lib/marketContext.ts` | Built + tested |
| Selector / size / gates | `src/brain/*` | Built + tested |
| Live instantiate | `src/brain/instantiate.ts` | Built + tested |
| Explain | `src/brain/explain.ts` + API | Built + tested |
| NCI TA | `src/indicators/nciTa/*` | Built + tested |

---

## How to run

```powershell
cd "C:\Users\Michael Chapman\opiontrading"
pnpm install   # if needed
pnpm test
pnpm build
pnpm dev       # http://localhost:3000
```

Click through: **Command → Trade Lab → Compare → Journal → Library → Settings**.

---

## Honest caveats

1. Model PoP/EV are **estimates**, not guarantees (disclosed in UI).  
2. Live chains need provider keys (OpenBB/Polygon/Alpaca) for non-demo data.  
3. Phase 6 chart overlays / selector historical backtest still roadmap (not daily-driver blockers).  
4. Uncommitted Superagent money-loop WIP may still be on branch — commit when ready.

---

## Verdict

**Yes — dashboards and option calculations are built**, compile, test, and ship in `next build`.  
This pass **locked standard Lab math to the unit-tested domain engine** and added **Greeks + domain tests** so “built” is proven by evidence, not only UI chrome.
