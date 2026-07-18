# 03 — Implementer Handoffs  
## Backend Architect · Frontend Developer

| Field | Value |
|-------|--------|
| **From** | Superagent (`agents-orchestrator`) |
| **Date** | 2026-07-15 |
| **Repo** | `C:\Users\Michael Chapman\opiontrading` |
| **Branch** | `claude/openbb-data-news-integration` |
| **Plans** | [`01-ORCHESTRATOR-PLAN.md`](./01-ORCHESTRATOR-PLAN.md) · [`02-SPRINT-BACKLOG.md`](./02-SPRINT-BACKLOG.md) |
| **Doctrine** | No auto-trade · RH CSV/paste only · seed micro defined-risk · capital first |

**How to use:** Copy the relevant handoff block into the agent spawn. Do not expand scope. Mark cards done only when DoD + tests pass.

---

# HANDOFF A — Backend Architect

## Role

`engineering-backend-architect` — personal empire companion, **not** SaaS platform work.

## Mission

Harden capital truth, empire policy, RH→account bridge, and $500 fixtures so the brain **never sizes a fantasy account** and **never silently returns 0 contracts**.

## Context (read first)

1. Kickoff: `docs/nexus/superagent/00-SUPERAGENT-KICKOFF.md`  
2. Gaps: `docs/empire/99-MASTER-EVALUATION.md` §5 · `docs/empire/04-reality-check.md` §3–4  
3. Architecture: `docs/empire/05-architecture-gaps.md` §2.1–2.2  
4. Seed finance lock: `docs/nexus/superagent/06-SEED-FINANCE-RULES.md` (0.5%/1% ceilings, CSP block, coach templates, $500 fixture)  
5. Code that already exists (do not rewrite from zero):

| Area | Path |
|------|------|
| Seed defaults | `src/brain/demoAccount.ts` — `DEFAULT_SEED_ACCOUNT` (500), `seedAccount()`, legacy `DEFAULT_DEMO_ACCOUNT` (25k tests only) |
| Empire overlay | `src/knowledge/empirePolicy.ts` — phase, ceilings, CSP block, `zeroSizeCoach`, `ladderProgress` |
| Sizing | `src/brain/portfolio.ts` — uses `empireRiskCeiling` |
| Gates | `src/brain/riskGates.ts` — `EMPIRE_PHASE_BLOCK` |
| Selector | `src/brain/selector.ts` |
| RH parse | `src/lib/rhImport.ts` — `parseRhPaste`, save/load local |
| Personal profile | `src/lib/personalAccount.ts` |
| Account map | `src/brain/liveAccount.ts` — Alpaca → `AccountState` |
| Tests | `tests/knowledge/empirePolicy.test.ts`, `tests/lib/rhImport.test.ts`, `tests/brain/*` |

## Your cards (Week 1)

### W1-B01 — Seed capital as system of record

**Problem:** Empire eval claimed $25k demo; branch fixed defaults but multi-path resolve may still prefer live/demo incorrectly.

**Do:**

1. Audit every construction of `AccountState` used by selector/Brain (`BrainRecommendPanel` resolve ~lines 200–360).  
2. Resolution order when `empireMode` / personal profile:  
   - `manual_seed` → `seedAccount(profile.manualEquity, { cash, approval, growth from empire })`  
   - `alpaca_paper` → map live **only if** feed ok; else fall back seed with badge note  
   - `robinhood_paste` → seed equity from profile + **sharesHeld from import** (after B04)  
3. Never use `DEFAULT_DEMO_ACCOUNT` in personal empire path without explicit sandbox flag.

**DoD:** Personal path defaults equity 500; tests prove `demoAccount()` / `seedAccount(500)` behavior.  
**Test:** extend demo/seed tests if missing; keep 130+ green.

### W1-B02 — Empire policy in rank/size

**Problem:** Growth-primary CSP universe starves $500.

**Do:**

1. Confirm `empireBlocksStrategy("cash_secured_put", 500) === true` and gates emit `EMPIRE_PHASE_BLOCK`.  
2. Prefer `SEED_PREFERRED` ids in selector scoring (boost or filter) when phase=seed.  
3. Keep `growthMode: income_preservation` at seed (no aggressive_growth).  
4. Rank notes should mention “infeasible at equity” when size would be 0.

**DoD:** CSP cannot be a clean #1 at $500; micro verticals preferred.  
**Test:** `empirePolicy.test.ts` + selector/gates cases at equity=500.

### W1-B03 — Zero-size coach purity

**Problem:** Size 0 without teaching is useless.

**Do:**

1. Keep `zeroSizeCoach` pure (no React).  
2. Ensure brain recommendation objects can carry coach string or FE has enough fields (`maxLossPerContract`, `suggestedContracts`, `strategyId`).  
3. Fixture: one structure with maxLoss under ceiling (if possible at $500 physics — note hard ceiling is ~$2.50 so many 1-lots still 0; honesty &gt; fake size). Document in test comments that seed often correctly sizes 0.

**DoD:** Unit tests for coach; sizePosition 0 when over ceiling.  
**Test:** existing cases in `empirePolicy.test.ts` — extend, don’t delete.

### W1-B04 — RH import → AccountState bridge

**Problem:** Paste stores rows but brain cannot use shares/open risk.

**Do:**

1. Add pure function e.g. `rowsToSharesHeld(rows: RhImportRow[]): Record<string, number>` — aggregate stock-like qty by symbol (best-effort; skip pure option lines if ambiguous).  
2. Optional: `estimateOpenRiskProxy(rows)` if price present.  
3. Export from `rhImport.ts` or `src/brain/rhAccount.ts`.  
4. Wire Brain account resolve: if `equitySource === "robinhood_paste"`, merge `sharesHeld` from `loadRhImport()`.  
5. **Never** accept password; keep 500KB cap; no network call to RH.

**DoD:** Import AAPL 100 shares → gates see `sharesHeld.AAPL` for covered-call share check.  
**Test:** unit map from sample CSV; rhImport tests still pass.

## Hard constraints

- No order placement, no broker “submit”, no Alpaca trade endpoints.  
- No unofficial Robinhood API.  
- Pure functions preferred for new logic (testable without Next).  
- Smallest diff; pure ffmpeg rule is **movie** pipeline — here: pure TS + Vitest.

## Done when

```
[ ] W1-B01 DoD
[ ] W1-B02 DoD
[ ] W1-B03 DoD
[ ] W1-B04 DoD
[ ] pnpm test green
[ ] pnpm typecheck green
[ ] Handoff note: files touched + remaining FE dependencies
```

## Return format (to Orchestrator)

```markdown
## Backend return
- Cards completed: …
- Files touched: …
- Tests added/updated: …
- Blockers for FE: …
- Not done / deferred: …
```

## Coordination

- FE owns Settings UI paste box and preset chips — you own parse→state bridge.  
- Do not rewrite `OptionScopeBuilder` checklist UI (FE W1-F01).  
- After your cards: FE can finish F03/F04 against real sharesHeld.

---

# HANDOFF B — Frontend Developer

## Role

`engineering-frontend-developer` — companion ritual + Lab execution surface for Michael only.

## Mission

Make the **daily loop** visible and clickable: seed presets → Command strip truth → Lab checklist → Save journal → Settings RH paste — without inventing auto-trade.

## Context (read first)

1. Kickoff + backlog cards W1-F01–F04  
2. Reality check §4 B–D (decision loop, memory, positions labels)  
3. Design target (do not gold-plate): `docs/design/04-ui-screen-specs.md`, `design/mocks/dashboard-command-center.html`  
4. Existing UI to extend:

| Surface | Path |
|---------|------|
| Trade Lab | `src/app/(app)/OptionScopeBuilder.tsx` — **already mounts** `OrderChecklistCard` |
| Checklist card | `src/components/OrderChecklistCard.tsx` |
| Checklist model | `src/lib/orderChecklist.ts` — `buildChecklist`, `checklistToText` |
| Brain panel | `src/components/BrainRecommendPanel.tsx` — seed resolve + zeroSizeCoach banner |
| Command | `src/components/CommandRitual.tsx` on `Dashboard.tsx` |
| Settings | `src/app/(app)/settings/page.tsx` — equity + RH paste |
| Journal | `src/app/(app)/journal/page.tsx` + `src/lib/localJournal.ts` |

## Your cards (Week 1)

### W1-F01 — Checklist climax + journal checklistText

**Bug / gap:** `OptionScopeBuilder` `onSave` passes `checklistText: null`.

**Do:**

1. Import/use `checklistToText` when saving journal plan.  
2. Keep checklist full-width below Lab when structure not blocked.  
3. Confirm copy + print buttons work; **no** Place Order control.  
4. Optional: toast instead of `alert` only if tiny change — not required.  
5. Ensure undefined-risk path still blocks checklist climax (`!blocked`).

**DoD:** Save → Journal shows plan; entry stores checklist text; max loss on plan.  
**Test idea:** Manual round-trip; unit already covers `buildChecklist`.

### W1-F02 — Seed presets

**Do:**

1. On Settings capital section: chips **$500 · $1,000 · $5,000** set `manualEquity` + `manualCash` (and optionally label).  
2. Show live empire phase from `getEmpirePhaseLimits(manualEquity)`.  
3. Persist via existing `savePersonalAccount`.  
4. Copy: default seed $500 — never fake $25k for ladder work.

**DoD:** Three-click seed without editing source.  
**Depends:** Align with Backend B01 defaults.

### W1-F03 — RH import surface polish

**Do:**

1. Settings paste: short doctrine (“Official export/CSV only. Never passwords.”).  
2. Show `summary`, `errors`, `processHints`, row count, `importedAt`.  
3. If Backend B04 landed: show “Shares detected: AAPL 100 …” from `rowsToSharesHeld`.  
4. Keep source selector `robinhood_paste`.  
5. **Forbidden:** password, 2FA, “connect Robinhood” OAuth theater.

**DoD:** One successful paste is visible and understandable.  
**Test:** rely on `tests/lib/rhImport.test.ts`.

### W1-F04 — Command ritual honesty pass

**Do:**

1. Audit badges: Manual seed / Alpaca paper / Broker paste; PAPER FEED vs PAPER OFF.  
2. Equity display must match profile (not stale $25k).  
3. Journal + RH tiles already present — ensure numbers refresh on load.  
4. CTAs: Trade Lab, Journal, Seed equity settings.  
5. Brain pulse minimum: keep Lab link; do **not** block Week 1 on live top-3 if chain keys missing.  
6. No LIVE badge unless true live market path (Lab owns chain badges).

**DoD:** Morning strip answers capital truth in one screenful.  
**Evidence:** Screenshot for Reality Checker.

## Hard constraints

- No auto-trade buttons or “Execute” that hits a broker.  
- No RH password fields.  
- Prefer localStorage personal MVP (already the pattern).  
- Smallest CSS/token tweaks; don’t redesign shell wholesale.  
- Match calm cockpit voice: See · Trust · Own.

## Done when

```
[ ] W1-F01 DoD (checklistText fixed)
[ ] W1-F02 DoD (presets)
[ ] W1-F03 DoD (import UX clear)
[ ] W1-F04 DoD (ritual honesty)
[ ] pnpm test green (if you touch pure modules)
[ ] pnpm typecheck green
[ ] Note any blocked-on-backend items
```

## Return format (to Orchestrator)

```markdown
## Frontend return
- Cards completed: …
- Files touched: …
- Screenshots / paths for evidence: …
- Blockers on Backend: …
- Not done / deferred: …
```

## Coordination

- Backend owns `rowsToSharesHeld` and policy math — call it, don’t reimplement in React.  
- Avoid simultaneous heavy edits of `BrainRecommendPanel` if Backend is mid-account-resolve; sequence: B01/B04 then FE badge copy if conflict.  
- Journal page already works — prefer Lab→journal path over redesigning Journal.

---

# HANDOFF C — QA / Reality Checker (after implementers)

## Role

`testing-evidence-collector` then `testing-reality-checker`.

## Mission

Prove or **deny** `SHIP_PERSONAL_MVP` with evidence. Default **NEEDS_WORK**.

## Checklist (from `04-reality-check.md` §6)

1. $500 seed → brain list feasible micro **or** halt + coach  
2. OrderChecklistCard populated; copy works  
3. Journal ≥1 planned (+ open/closed if possible) local-first  
4. RH paste import reflected (rows + optional shares)  
5. Command strip + badges  
6. `pnpm test` + `pnpm typecheck` logs  
7. Unit equity=500 fixtures  
8. (Optional Week 1) short note of smoke path: Settings seed → Lab → checklist → Journal  

## Falsifiers (instant fail)

- Demo $25k as personal without DEMO  
- CSP #1 with silent 0 contracts  
- No copyable checklist  
- Journal cannot plan/close  
- No RH inject path  
- LIVE on demo data  
- Any order placement / RH password  

## Return stamp

```
VERDICT: SHIP_PERSONAL_MVP | NEEDS_WORK | BLOCKED
A capital honesty: PASS/FAIL
B decision→action: PASS/FAIL
C overnight memory: PASS/FAIL
D position awareness: PASS/FAIL
Evidence paths: docs/nexus/04-evidence/…
Remaining blockers: …
```

---

# Orchestrator close-out (this document)

| Deliverable | Path |
|-------------|------|
| Plan | `docs/nexus/superagent/01-ORCHESTRATOR-PLAN.md` |
| Backlog | `docs/nexus/superagent/02-SPRINT-BACKLOG.md` |
| Handoffs | `docs/nexus/superagent/03-HANDOFFS.md` (this file) |

**Immediate spawn order:**

1. Backend Handoff A (W1-B01→B04)  
2. Frontend Handoff B (W1-F01 first — unblocks journal text without waiting)  
3. QA Handoff C when Gate B ready  

**Status line:**

```
NEXUS-Sprint | Superagent | Phase 1 Strategy COMPLETE → implement
Baseline: 130 tests · typecheck clean · companion loop PARTIAL on branch
Next: Backend + Frontend Week 1 cards · then Reality Checker
```

---

_Educational tooling only — not investment advice. Human owns every Robinhood click._
