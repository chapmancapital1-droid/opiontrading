# 02 — Sprint Backlog  
## 30-day personal MVP · Week 1 critical path first

| Field | Value |
|-------|--------|
| **Product** | OptionScope personal options companion (not public SaaS) |
| **Horizon** | 30 days · this file prioritizes **Week 1** |
| **Source gaps** | Empire master eval §5 · Reality check §3–4 · Kickoff companion gap list |
| **Plan** | [`01-ORCHESTRATOR-PLAN.md`](./01-ORCHESTRATOR-PLAN.md) |
| **Handoffs** | [`03-HANDOFFS.md`](./03-HANDOFFS.md) |
| **Rule** | Smallest change that unblocks daily use · no auto-trade · no RH password |

### Card status legend

| Status | Meaning |
|--------|---------|
| `READY` | Unblocked — implement |
| `PARTIAL` | WIP on branch — harden only |
| `BLOCKED` | Waiting on dependency |
| `DONE` | DoD met + tests green (update when true) |
| `DEFER` | After Week 1 / personal MVP candidate |

---

## Week 1 critical path (ordered)

Ship order = dependency order. Do not skip capital truth for chrome.

```
W1-B01 Seed fixtures + personal equity truth
    → W1-B02 Empire policy enforcement in rank/size path
        → W1-B03 Zero-size coach purity + $500 selector fixtures
W1-F01 Lab checklist climax + journal checklistText   (// can start early)
W1-F02 Settings seed presets $500/$1k/$5k             (// with B01)
W1-B04 RH rows → sharesHeld / open-risk proxy
W1-F03 RH import surface polish + doctrine labels
W1-F04 Command ritual minimum honesty pass
W1-Q01 Evidence pack + Reality Checker retest
```

---

### W1-B01 — Seed capital profile as system of record

| | |
|--|--|
| **Gap** | G1 Seed account mode |
| **Owner** | Backend (+ FE touch for defaults) |
| **Status** | `PARTIAL` — `DEFAULT_SEED_ACCOUNT`, `seedAccount`, `personalAccount` exist |
| **Priority** | P0 |
| **Files** | `src/brain/demoAccount.ts`, `src/lib/personalAccount.ts`, `src/brain/liveAccount.ts`, `src/components/BrainRecommendPanel.tsx` |
| **Scope** | Ensure all brain sizing paths resolve: personal manual seed → else Alpaca map → **never** silent `DEFAULT_DEMO_ACCOUNT` ($25k) for empire mode. Keep `DEFAULT_DEMO_ACCOUNT` only for explicit sandbox/tests. |
| **Out of scope** | Broker order APIs; multi-user accounts |
| **DoD** | Equity 500 is default personal profile; empireMode true by default; Lab/Brain document “sizing from seed $X”; legacy $25k demo only if deliberately selected or test import |
| **Test idea** | `seedAccount(500)` fixture; assert `demoAccount()` default equity is 500; growth mode aligns with empire phase |
| **Depends on** | — |

---

### W1-B02 — Empire seed policy in gates + sizing

| | |
|--|--|
| **Gap** | G2 Empire / seed policy |
| **Owner** | Backend |
| **Status** | `PARTIAL` — `empirePolicy.ts`, riskGates `EMPIRE_PHASE_BLOCK`, portfolio `empireRiskCeiling` |
| **Priority** | P0 |
| **Files** | `src/knowledge/empirePolicy.ts`, `src/brain/riskGates.ts`, `src/brain/portfolio.ts`, `src/brain/selector.ts` |
| **Scope** | At equity &lt; $5k: block CSP primary; prefer SEED_PREFERRED verticals; never `aggressive_growth`; size 0 when 1-lot &gt; hard ceiling; demote/tag infeasible in rank notes |
| **Out of scope** | Changing mid-stage policy for $25k+ |
| **DoD** | CSP fails gates at $500; preferred micro structures can surface; hard ceiling ≈ 0.5% target ($2.50 at $500) documented in tests |
| **Test idea** | Extend `tests/knowledge/empirePolicy.test.ts` + selector fixture with seed equity |
| **Depends on** | W1-B01 |

---

### W1-B03 — Zero-size coach + $500 feasibility fixtures

| | |
|--|--|
| **Gap** | G7 Zero-size / infeasible UX |
| **Owner** | Backend (API pure) + Frontend display already partial |
| **Status** | `PARTIAL` — `zeroSizeCoach` + BrainRecommendPanel banner |
| **Priority** | P0 |
| **Files** | `empirePolicy.ts`, `BrainRecommendPanel.tsx`, optional Lab banner |
| **Scope** | Guarantee coach string for every size=0 recommendation with known maxLoss; add fixture: structure with maxLoss ≤ ceiling sizes ≥1 **or** document honest halt if no liquid micro structure in demo chain |
| **Out of scope** | Guaranteeing profitable trades |
| **DoD** | No silent 0 in Brain UI; unit tests cover coach copy + one seed size path |
| **Test idea** | maxLoss 150 @ equity 500 → contracts 0 + coach match `/size is 0/i` |
| **Depends on** | W1-B02 |

---

### W1-F01 — Order checklist primary CTA + journal text

| | |
|--|--|
| **Gap** | G5 Checklist · G4 Journal save path |
| **Owner** | Frontend |
| **Status** | `PARTIAL` — card mounted in `OptionScopeBuilder`; `onSave` sets `checklistText: null` (**bug**) |
| **Priority** | P0 |
| **Files** | `src/app/(app)/OptionScopeBuilder.tsx`, `src/lib/orderChecklist.ts`, `src/components/OrderChecklistCard.tsx`, `src/lib/localJournal.ts` |
| **Scope** | Keep checklist full-width after analyze; wire `checklistToText(checklist)` into journal save; ensure max loss / legs / net limit present; still **zero** order placement buttons |
| **Out of scope** | Auto-submit to RH; Supabase journal API |
| **DoD** | Copy works; Save → Journal entry has non-null `checklistText` and plannedMaxLoss; undefined-risk remains blocked before checklist climax |
| **Test idea** | Unit `buildChecklist` + `checklistToText` non-empty; manual Lab → Journal round-trip |
| **Depends on** | — (can parallel B01) |

---

### W1-F02 — Seed presets in Settings ($500 / $1k / $5k)

| | |
|--|--|
| **Gap** | G1 (UI completeness) |
| **Owner** | Frontend |
| **Status** | `PARTIAL` — Settings has equity numbers; no one-click ladder presets |
| **Priority** | P0 |
| **Files** | `src/app/(app)/settings/page.tsx`, `personalAccount.ts` |
| **Scope** | Buttons/chips: Seed $500 · $1,000 · $5,000 set equity+cash; show empire phase label live; keep RH paste section; never add password field |
| **Out of scope** | Theme system rewrite |
| **DoD** | Three presets work offline; save persists localStorage; phase label updates |
| **Test idea** | Manual; optional pure helper `presetSeed(500)` unit |
| **Depends on** | W1-B01 (defaults consistency) |

---

### W1-B04 — RH import → AccountState bridge

| | |
|--|--|
| **Gap** | G3 RH import (awareness, not just storage) |
| **Owner** | Backend |
| **Status** | `PARTIAL` — parse + localStorage; **no** sharesHeld merge |
| **Priority** | P0 |
| **Files** | `src/lib/rhImport.ts`, `src/brain/liveAccount.ts` or small `rhToAccount.ts`, BrainRecommendPanel account resolve |
| **Scope** | `rowsToSharesHeld(rows)` / equity override when `equitySource === "robinhood_paste"`; open risk proxy optional (sum abs qty * price if present); processHints already required |
| **Out of scope** | Live RH sync; option multi-leg reconstruction v2 |
| **DoD** | After import + source=paste, brain/gates can see shares for CC eligibility on imported symbols; UI labels user-provided |
| **Test idea** | CSV with AAPL buy 100 → sharesHeld.AAPL ≥ 100; password never in API surface |
| **Depends on** | W1-B01; pairs with W1-F03 |

---

### W1-F03 — RH import surface polish (Settings)

| | |
|--|--|
| **Gap** | G3 surface |
| **Owner** | Frontend |
| **Status** | `PARTIAL` — paste box exists |
| **Priority** | P0 |
| **Files** | `settings/page.tsx`, maybe CommandRitual RH tile |
| **Scope** | Clear helper text: official export only; show parse summary + errors + processHints; last import timestamp; link from Command “History import” tile already points Settings |
| **Out of scope** | File drag-drop multi-format perfection |
| **DoD** | Michael can paste one CSV shape and see row count; doctrine copy visible |
| **Test idea** | Manual screenshot; unit tests already in `rhImport.test.ts` |
| **Depends on** | W1-B04 for sharesHeld visibility; surface alone can land earlier |

---

### W1-F04 — Command ritual minimum

| | |
|--|--|
| **Gap** | G6 Command Center ritual |
| **Owner** | Frontend |
| **Status** | `PARTIAL` — `CommandRitual` on Dashboard: ladder, equity, journal stats, RH count |
| **Priority** | P0 |
| **Files** | `src/components/CommandRitual.tsx`, `Dashboard.tsx` |
| **Scope** | Honesty pass: source badges (Manual seed / PAPER FEED / Broker paste); never imply LIVE broker without data; risk target from empire phase; CTAs Lab/Journal/Settings. **Minimum brain pulse** = Trade Lab link + copy; inline top-3 only if free (else Week 3) |
| **Out of scope** | Full mock parity with `design/mocks/dashboard-command-center.html` |
| **DoD** | Morning strip answers: what equity am I sizing? what phase? where is journal? where is import? |
| **Test idea** | Screenshot evidence for Reality Checker §6 item 5 |
| **Depends on** | W1-B01, W1-F02 for correct equity display |

---

### W1-Q01 — Evidence pack + Reality Checker

| | |
|--|--|
| **Gap** | Gate C / empire retest |
| **Owner** | `testing-evidence-collector` + `testing-reality-checker` |
| **Status** | `READY` after W1-B* / W1-F* |
| **Priority** | P0 gate |
| **Files** | `docs/empire/04-reality-check.md` (retest section), `docs/nexus/04-evidence/` |
| **Scope** | Capture §6 evidence 1–7; run `pnpm test` + typecheck; stamp `SHIP_PERSONAL_MVP` or explicit remaining blockers. Default **NEEDS_WORK** if any critical falsifier |
| **Out of scope** | §4 E process proof (20 paper closes) — Week 4 |
| **DoD** | Written retest note with pass/fail per A–D |
| **Test idea** | Checklist from reality-check §6 |
| **Depends on** | W1-B01–B04, W1-F01–F04 |

---

## Week 2 — Memory (ordered after Gate B)

| ID | Title | Gap | Owner | Status | DoD (short) |
|----|-------|-----|-------|--------|-------------|
| W2-F01 | Journal process flags taxonomy | G4 | FE | `DEFER` | Flags: no plan, oversized, earnings, undefined, revenge |
| W2-B01 | RH import → suggested journal rows | G3 | BE | `DEFER` | Optional map closed fills → planned/closed stubs |
| W2-F02 | Fix-list panel (process misses) | G3/G4 | FE | `DEFER` | Read-only list from journal + import hints |
| W2-F03 | Saved analyses local-first polish | G8 | FE | `DEFER` | List/resume without Supabase |
| W2-F04 | Compare polish (seed-friendly structures) | G8 | FE | `DEFER` | Prefer verticals in default slots |

---

## Week 3 — Ritual depth

| ID | Title | Gap | Owner | Status | DoD (short) |
|----|-------|-----|-------|--------|-------------|
| W3-F01 | Command brain top-3 pulse (focus symbol) | G6 | FE | `DEFER` | Optional live chain; no auto-trade |
| W3-B01 | dailyRealizedPL honesty or “unknown” gate | Reality §9 | BE | `DEFER` | Hide false DAILY_LOSS_OK if P/L always 0 |
| W3-F02 | Nav labels Command · Trade Lab | Design IA | FE | `DEFER` | Match docs muscle memory |
| W3-F03 | Education = Michael $500 playbook entry | Secondary | FE | `DEFER` | Link field manual + ritual steps |

---

## Week 4 — Process proof (before real $500 risk)

| ID | Title | Owner | Status | DoD (short) |
|----|-------|-------|--------|-------------|
| W4-P01 | N paper planned trades journaled | Michael + companion | `DEFER` | Adherence ≥70%; forecasts recorded |
| W4-Q01 | Reality Checker full retest + §4 E | Reality Checker | `DEFER` | Real-seed discussion allowed only if pass |
| W4-D01 | Written personal playbook | Michael | `DEFER` | Underlyings, max width, max debit, stand-down rules |

---

## Critical gap index (empire → cards)

| Empire gap | Cards | Owner | Week | Test idea (one-liner) |
|------------|-------|-------|------|------------------------|
| G1 Seed mode | W1-B01, W1-F02 | BE+FE | 1 | `seedAccount(500)`; Settings preset |
| G2 Empire policy | W1-B02 | BE | 1 | CSP blocked @500; ceiling ~$2.50 |
| G3 RH import | W1-B04, W1-F03 | BE+FE | 1 | CSV parse + sharesHeld map |
| G4 Journal UI | W1-F01, W2-* | FE | 1–2 | plan→open→close local |
| G5 Checklist wire | W1-F01 | FE | 1 | `checklistToText` on save |
| G6 Command ritual | W1-F04, W3-F01 | FE | 1–3 | Screenshot strip + badges |
| G7 Zero-size coach | W1-B03 | BE+FE | 1 | coach regex + size 0 |
| G8 Compare/Saved | W2-F03, W2-F04 | FE | 2 | local save + compare sort |

---

## Non-goals (explicit)

- Auto-trading / Alpaca order placement  
- Unofficial Robinhood login or password fields  
- Public multi-tenant SaaS  
- Guaranteeing 10× returns  
- LM Studio productization this sprint  
- Large rewrite of domain engine  

---

## Progress tracker (update in PR / handoff)

| Card | Status | Attempt | Notes |
|------|--------|---------|-------|
| W1-B01 | PARTIAL | 0 | Defaults already $500 — enforce paths |
| W1-B02 | PARTIAL | 0 | Policy + tests exist — selector notes |
| W1-B03 | PARTIAL | 0 | Coach in Brain panel |
| W1-F01 | PARTIAL | 0 | Fix `checklistText: null` |
| W1-F02 | READY | 0 | Preset chips |
| W1-B04 | READY | 0 | Bridge missing |
| W1-F03 | PARTIAL | 0 | Paste exists |
| W1-F04 | PARTIAL | 0 | Honesty pass |
| W1-Q01 | BLOCKED | 0 | After above |

---

_Baseline: 130 tests green. Prefer extend tests over snapshot theater. Long live the empire._
