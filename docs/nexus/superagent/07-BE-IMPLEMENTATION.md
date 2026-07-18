# 07 — Backend Implementation Note (Week 1 B01–B04)

| Field | Value |
|-------|--------|
| **Agent** | `engineering-backend-architect` |
| **Date** | 2026-07-15 |
| **Branch** | `claude/openbb-data-news-integration` |
| **Cards** | W1-B01 · W1-B02 · W1-B03 · W1-B04 (+ orderChecklist) |

---

## Summary

Hardened capital truth, empire seed policy, zero-size coach purity, RH→sharesHeld bridge, and checklist contracts override so the brain **never sizes a $25k fantasy account** on the personal path and **never silently returns 0 contracts without coach text**.

**Constraints honored:** no auto-trade · no RH password / unofficial API · pure TS + Vitest.

---

## Cards completed

### W1-B01 — Seed capital as system of record

- `DEFAULT_SEED_ACCOUNT` / `demoAccount()` / `seedAccount(500)` remain $500 equity, empty shares, `income_preservation`.
- `DEFAULT_DEMO_ACCOUNT` ($25k) kept **only** for explicit sandbox/tests.
- `demoAsLiveClient()` now maps **seed $500**, not $25k.
- New pure resolver: `resolvePersonalAccountState()` in `src/brain/resolveAccount.ts`:
  - `manual_seed` → `seedAccount(manualEquity)`
  - `alpaca_paper` → live map only if `source === "alpaca"`; else seed fallback
  - `robinhood_paste` → seed equity + RH `sharesHeld`
- `BrainRecommendPanel` uses resolver (no silent demo $25k).

### W1-B02 — Empire policy in rank/size

- CSP blocked at seed (`empireBlocksStrategy` + `EMPIRE_PHASE_BLOCK`) — confirmed in tests.
- Seed sort prefers `SEED_PREFERRED` IDs over growth-primary engines.
- Rank notes: `"Infeasible at equity $N: 1-lot max loss $X exceeds empire hard ceiling"`.
- Growth mode forced `income_preservation` at seed via phase limits + `seedAccount`.

### W1-B03 — Zero-size coach purity

- `zeroSizeCoach` remains pure (no React).
- `BrainRecommendation.zeroSizeCoach` populated whenever `contracts < 1` and maxLoss known.
- UI prefers brain-attached coach string.
- Fixture: maxLoss $150 @ $500 → 0 contracts + coach; micro $2 maxLoss → ≥1 contract.
- Documented: seed hard ceiling ≈ **$2.50** (0.5% of $500); many 1-lots correctly size 0.

### W1-B04 — RH import → AccountState bridge

- `rowsToSharesHeld(rows)` / `deriveSharesHeld` — skip option call/put lines; aggregate stock qty.
- `estimateOpenRiskProxy(rows)` — sum `|qty * price|` when present.
- Brain resolve merges RH shares when import present; gates can see `sharesHeld.AAPL` for CC.

### orderChecklist

- `buildChecklist({ contracts })` override scales contract count, option leg qty, est total, max loss.
- `checklistToText` already journal-ready; unit tests cover non-empty text.

---

## Files touched

| Path | Change |
|------|--------|
| `src/brain/resolveAccount.ts` | **New** — pure personal account resolve |
| `src/brain/demoAccount.ts` | (unchanged defaults; covered by tests) |
| `src/brain/liveAccount.ts` | `demoAsLiveClient` → seed $500 |
| `src/brain/selector.ts` | Seed preferred sort; infeasible notes; attach `zeroSizeCoach` |
| `src/brain/types.ts` | `zeroSizeCoach?: string \| null` on recommendation |
| `src/brain/index.ts` | Export resolve helpers |
| `src/lib/rhImport.ts` | `rowsToSharesHeld`, `deriveSharesHeld`, `estimateOpenRiskProxy` |
| `src/lib/orderChecklist.ts` | Contracts override + scale legs/totals |
| `src/components/BrainRecommendPanel.tsx` | Resolve via pure helper + RH shares merge |
| `src/app/(app)/settings/page.tsx` | exactOptionalPropertyTypes fix for RH meta |
| `tests/brain/demoAccount.test.ts` | **New** seed + resolve fixtures |
| `tests/brain/liveAccount.test.ts` | Seed fallback assertion |
| `tests/brain/selector.test.ts` | CSP block + coach/infeasible at $500 |
| `tests/knowledge/empirePolicy.test.ts` | Coach purity + micro size fixture |
| `tests/lib/rhImport.test.ts` | sharesHeld + CC gate bridge |
| `tests/lib/orderChecklist.test.ts` | **New** override + text |

---

## Test results

```
pnpm test      → 19 files, 154 passed
pnpm typecheck → clean (tsc --noEmit)
```

(Prior baseline was ~130; suite now **154** with new seed/RH/checklist coverage.)

---

## Blockers for FE

| FE card | Backend ready? | Notes |
|---------|----------------|-------|
| W1-F01 Checklist journal `checklistText` | Yes | Use `checklistToText(buildChecklist({ ..., contracts }))` |
| W1-F02 Seed presets $500/$1k/$5k | Yes | Defaults already $500; `getEmpirePhaseLimits(equity)` for phase label |
| W1-F03 RH import surface | Yes | `rowsToSharesHeld` / preview can show symbol counts |
| W1-F04 Command ritual honesty | Yes | Equity source badges from `personalAccount.equitySource` |

No FE blockers on capital truth or coach copy.

---

## Not done / deferred

- Live multi-leg option reconstruction from RH CSV (v2).
- Automatic equity inference from incomplete RH CSV (intentionally never).
- Week 2 journal process flags / Supabase memory.

---

## Backend return (orchestrator)

```markdown
## Backend return
- Cards completed: W1-B01, W1-B02, W1-B03, W1-B04, orderChecklist contracts override
- Files touched: resolveAccount.ts (new), liveAccount, selector, types, index, rhImport, orderChecklist, BrainRecommendPanel, settings (type fix); tests under brain/, knowledge/, lib/
- Tests added/updated: demoAccount, selector seed cases, empirePolicy coach, rhImport bridge, orderChecklist, liveAccount seed
- Blockers for FE: none for F01–F04
- Not done / deferred: RH multi-leg reconstruction; inventing equity from CSV
```
