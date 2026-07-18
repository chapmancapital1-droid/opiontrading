# ADR-005 — Money Loop Architecture (Seed Account + Empire Policy)

**Status:** Accepted (implementation target for Superagent sprint)  
**Date:** 2026-07-15  
**Author:** engineering-software-architect  
**Repo:** `C:\Users\Michael Chapman\opiontrading`  
**Related:**  
- [`00-SUPERAGENT-KICKOFF.md`](./00-SUPERAGENT-KICKOFF.md)  
- [`docs/empire/03-security-robinhood-data.md`](../../empire/03-security-robinhood-data.md)  
- [`docs/empire/05-architecture-gaps.md`](../../empire/05-architecture-gaps.md)  
- [`docs/empire/02-capital-path-realism.md`](../../empire/02-capital-path-realism.md)

---

## Context

OptionScope’s lab stack (chain → market context → brain → model backtest) is strong. The **money loop** is the path from **real equity truth** → **phase-aware risk** → **manual RH execution** → **journal outcome**. Prior reality check: lab strong, money loop weak.

**Mission loop (single operator):**

```
Capital truth (seed / paper / paste)
        ↓
Empire phase policy (risk ceilings + strategy allow/block)
        ↓
Brain rank · size · explain · zero-size coach
        ↓
Order checklist (Trade Lab CTA) → human fills in Robinhood
        ↓
Journal plan → open → close (+ optional RH import process audit)
        ↓
Command Center ritual (see truth, pulse, next action)
```

**Hard laws (non-negotiable):**

1. Educational companion — not investment advice; no auto-trade  
2. RH data only via official export / CSV / paste — **never password or unofficial API**  
3. Seed equity defaults to **$500**, not $25k demo fantasy  
4. Prefer missing a trade over oversizing (`sizePosition` → 0 + coach)  
5. Dependency direction: **domain + knowledge policy** ← brain ← UI; brokers only through adapters  

---

## 1. Target architecture — seed account mode + empire policy

### 1.1 Bounded contexts

| Context | Responsibility | Key modules (today) |
|---------|----------------|---------------------|
| **Capital Truth** | Where equity/cash/shares come from | `personalAccount`, `liveAccount`, `rhImport` (positions later) |
| **Policy** | Growth modes + empire phase overlays | `portfolioPolicy`, `empirePolicy` |
| **Risk & Size** | Gates, contracts, profit split | `riskGates`, `portfolio` |
| **Decision** | Rank/score/explain recommendations | `selector`, `engineScore`, `explain` |
| **Execution Aid** | Manual RH checklist only | `orderChecklist`, `OrderChecklistCard` |
| **Memory** | Plan → fill → outcome | `localJournal`, journal page; optional Supabase later |
| **Ritual** | Daily cockpit strip | `CommandRitual`, Dashboard cockpit tab |

### 1.2 Account resolution (single source of truth for brain)

```
loadPersonalAccount()  → PersonalAccountProfile
         │
         ├─ equitySource === "manual_seed"
         │     → seedAccount(manualEquity, { cash, approval, sharesHeld })
         │
         ├─ equitySource === "alpaca_paper"
         │     → GET /api/alpaca/account → mapLiveToAccountState → AccountState
         │       (fallback: manual seed if feed down)
         │
         └─ equitySource === "robinhood_paste"
               → AccountState from seedAccount(manualEquity)
                 + optional openRisk / shares from last RH import summary
                 (import never invents equity from partial CSV)
```

**Implemented today:**

| Piece | Path | Behavior |
|-------|------|----------|
| Seed defaults | `src/brain/demoAccount.ts` | `DEFAULT_SEED_ACCOUNT` equity/cash $500; `seedAccount()`; legacy `DEFAULT_DEMO_ACCOUNT` $25k **tests/sandbox only** |
| Personal profile | `src/lib/personalAccount.ts` | localStorage `optionscope.personalAccount.v1`; `empireMode: true` |
| Live map | `src/brain/liveAccount.ts` | Alpaca → `AccountState`; `demoAsLiveClient()` still uses $25k demo (legacy) |
| Brain UI | `BrainRecommendPanel` | Resolves personal seed vs Alpaca paper; runs `runTradingBrain` with sized recs |

**Target refinements (implementers):**

1. **`demoAsLiveClient()`** must not reintroduce $25k into personal UX — prefer `seedAccount()` / personal profile.  
2. When `equitySource === "robinhood_paste"`, merge **sharesHeld** and rough **openRiskDollars** from `loadRhImport()` if present; equity remains **manualEquity** unless user explicitly sets it.  
3. Pass `empireMode: profile.empireMode` into `sizePosition` (today always empire-on via default `true`).  
4. Settings: persist growth mode / approval and surface empire phase live after save (storage event or shared hook).

### 1.3 Empire policy overlay (capital phases)

```
PORTFOLIO_POLICY (NCI-OS-BRAIN-1.0.0)
  broker: robinhood
  executionMode: manual_checklist_only
  growthModes: aggressive | balanced | income_preservation
  hardGates: blockUndefinedRisk, absoluteMaxLossPct, dailyLossHalt, liquidity, events
        ▲
        │  min(policy, empire) on every budget / campaign / halt
        │
empirePolicy.resolveCapitalPhase(equity)
  seed   < $5k     → 0.5% risk target, max 1% cap, CSP blocked, preferred verticals/longs
  stage1 < $25k    → slightly wider; CSP/CC allowed when cash/shares fit
  stage2 < $100k   → full balanced policy
  scale  ≥ $100k   → standard policy; still no auto-trade
```

**Wiring (already in core):**

| Concern | Function | File |
|---------|----------|------|
| Phase limits | `getEmpirePhaseLimits` | `empirePolicy.ts` |
| Per-trade ceiling | `empireRiskCeiling` | `empirePolicy.ts` |
| Strategy block | `empireBlocksStrategy` → `evaluateRuleGates` `EMPIRE_PHASE_BLOCK` | `riskGates.ts` |
| Preference boost | `empirePrefersStrategy` | `selector.ts` |
| Size | `sizePosition({ empireMode })` | `portfolio.ts` |
| Zero contracts UX | `zeroSizeCoach` | `empirePolicy.ts` + `BrainRecommendPanel` |
| Growth mode align | `demoAccount` / `seedAccount` | `demoAccount.ts` |

### 1.4 C4 — container view (money loop)

```
┌─────────────────────────────────────────────────────────────────┐
│ Browser (personal machine)                                      │
│  Dashboard / CommandRitual                                      │
│  Settings (seed + RH paste)                                     │
│  Trade Lab (OptionScopeBuilder + BrainRecommendPanel)           │
│  Journal (localStorage)                                         │
│  localStorage: personalAccount | rhImport | journal             │
└───────────────┬───────────────────────────┬─────────────────────┘
                │ market / alpaca paper     │ never RH password
                ▼                           ▼
┌───────────────────────────┐   ┌───────────────────────────────┐
│ Next.js API routes        │   │ Robinhood (external, human)   │
│ /api/alpaca/account       │   │ Official export → paste/CSV   │
│ /api/chain, quote, news   │   │ Human enters checklist orders │
│ /api/brain/explain        │   └───────────────────────────────┘
│ (server env keys only)    │
└───────────────────────────┘
```

### 1.5 Dependency rule

```
src/domain/*          pure math / legs / lifecycle
src/knowledge/*       policy + strategy rules (no UI, no broker secrets)
src/brain/*           decision: gates + size + rank (imports knowledge + domain)
src/lib/*             adapters: personalAccount, rhImport, orderChecklist, localJournal
src/components/*      presentation
src/app/*             composition / pages
```

**Forbidden:** UI or import path calling unofficial RH SDK; client holding market/service-role keys; brain placing orders.

---

## 2. How RH CSV import plugs in without secrets

### 2.1 Security contract (align with empire security ADR)

| Allowed | Forbidden |
|---------|-----------|
| Official RH activity / positions / tax CSV | Password, MFA, PIN fields |
| Manual paste of tabular rows | Unofficial RH APIs / session scrapers |
| Client-side parse → structured rows → localStorage | Long-term raw CSV in cloud without encryption |
| Process hints (“did you plan first?”) | Shipping raw exports to external LLMs |
| Size cap (500KB today; raise carefully) | Formula/`eval` on cells |

UI copy must stay: **“Import Robinhood export”** — never “Connect Robinhood” login.

### 2.2 Pipeline

```
Settings textarea / file pick
        │
        ▼
parseRhPaste(text)          // pure, src/lib/rhImport.ts
        │
        ├─ rows: RhImportRow[]
        ├─ errors[]
        ├─ processHints[]
        └─ summary
        │
        ▼
saveRhImport({ ...result, importedAt, sourceNote })
  → localStorage optionscope.rhImport.v1
        │
        ├─ CommandRitual: row count pulse
        ├─ Journal (optional): “import process audit” list
        ├─ Brain (target): sharesHeld / openRisk heuristics
        └─ Never auto-fills equity from incomplete CSV
```

### 2.3 What import is *not*

- Not a live broker connection  
- Not order placement  
- Not automatic journal `TradeRow` without human confirm (target: optional “link row → plan”)  
- Not source of secrets — **no new env vars** for RH  

### 2.4 Target enrichments (still no secrets)

| Enhancement | Owner | Notes |
|-------------|-------|-------|
| File picker (`.csv` only) | FE | Read as text; same parser; reject non-text |
| Positions snapshot columns | BE-ish pure lib | Map qty of stock → `sharesHeld` |
| Process fix-list rules | knowledge | e.g. sell-side without prior journal plan |
| Idempotent re-import | lib | content hash; replace last batch only |
| Server route (optional) | backend | Only if needed; **no persist raw**; same caps; still no RH auth |

### 2.5 Equity source `robinhood_paste`

Keep semantics honest:

- **Equity/cash:** user-entered `manualEquity` / `manualCash` (user may set from RH app balances).  
- **Import:** activity/process audit + optional shares/risk overlay.  
- Document in Settings: “Paste history for process review; set equity fields from your RH balance screen.”

---

## 3. Where to wire OrderChecklist in Trade Lab

### 3.1 Current state (partial complete)

`OptionScopeBuilder.tsx` already:

1. Builds domain legs from builder state  
2. `buildChecklist(...)` from net / maxLoss / break-evens  
3. Renders full-width `<OrderChecklistCard />` when structure is not undefined-risk blocked  
4. `onSave` → `addJournalPlan(...)`  

**Gaps vs Superagent acceptance:**

| Gap | Fix |
|-----|-----|
| `checklistText: null` on save | Pass `checklistToText(checklist)` |
| `plannedContracts: 1` always | Use brain `suggestedContracts` when loaded |
| Checklist buried below fold | Primary CTA strip after “Load from brain”; sticky or rail action “Open checklist” |
| Brain panel has no checklist handoff | On recommend apply, builder must keep legs + size so checklist matches size |
| Collateral null | Fill from brain/collateral maps when CSP/CC/spread width known |

### 3.2 Target UX flow (Trade Lab)

```
1. User sets ticker → Load chain
2. BrainRecommendPanel → Recommend
3. User clicks ranked card → legs + profit window + suggestedContracts land in builder
4. Model backtest refresh (existing)
5. OrderChecklistCard (climax CTA):
     - Copy checklist
     - Print
     - Save to journal (disabled until “I reviewed…” checkbox)
6. Human opens Robinhood and enters order
7. Journal: mark Opened / Closed with realized P/L
```

### 3.3 Wire points (file-level)

| Location | Action |
|----------|--------|
| `OptionScopeBuilder.tsx` | After brain select: store `suggestedContracts`; scale checklist leg quantities; pass checklist text + forecast into journal |
| `OrderChecklistCard.tsx` | Optional `suggestedContracts` badge; emphasize “manual RH only” |
| `BrainRecommendPanel.tsx` | Secondary button “Checklist focus” scrolling to checklist section id |
| `orderChecklist.ts` | Optional `empirePhase` / `riskDollars` fields for coach line on card |

**Anchor:** add `id="order-checklist"` on the checklist section for deep-link from brain rail.

---

## 4. Minimum Command Center ritual components

**Surface:** Dashboard cockpit tab (`Dashboard.tsx` → `<CommandRitual />`).

### 4.1 Must-have strip (P0 — already mostly present)

| Component | Purpose | Source |
|-----------|---------|--------|
| **Account identity** | Label + empire phase label | `loadPersonalAccount` + `getEmpirePhaseLimits` |
| **Source badges** | Manual seed / Alpaca paper / Broker paste | `equitySource` + live feed |
| **Equity + cash** | Capital truth numbers | profile or Alpaca |
| **LIVE/PAPER feed badge** | Alpaca connected or not | `/api/alpaca/account` |
| **Capital ladder bar** | $500→$5k (or phase span) % | `ladderProgress` |
| **Phase note** | Seed coach text | `emp.note` |
| **Pulse: Trade Lab** | Next action | Link `/builder` |
| **Pulse: Journal** | planned/open/closed + P/L | `localJournal.journalStats` |
| **Pulse: History import** | RH row count | `loadRhImport` |
| **Pulse: Risk target** | % risk + max campaigns | empire phase |
| **CTA row** | Open Trade Lab / Journal / Seed equity | Links |

### 4.2 Minimum additions for SHIP_PERSONAL_MVP

| Addition | Why |
|----------|-----|
| **Brain gate pulse** | Show halt vs ready from last known decision or lightweight account-gate-only evaluation (`evaluateAccountGates(seedAccount(...))`) without full chain |
| **Refresh on focus** | Re-read localStorage when window focuses (settings save elsewhere) |
| **Zero-size / seed warning chip** | If equity &lt; 5k, badge “Seed mode · defined-risk bias” |
| **Do not** embed full brain chain load on Dashboard (keep ritual cheap) |

### 4.3 Explicit non-goals for ritual

- Full chart/brain scoring on Command Center (Brain tab + Trade Lab own that)  
- Auto-sync RH balances  
- Multi-user profiles  

---

## 5. File-level change list (create / modify)

Legend: **M** = modify existing · **C** = create · **T** = test · Priority **P0** closes Superagent MVP; **P1** polish.

### 5.1 Knowledge / brain (policy truth)

| File | Op | Pri | Change |
|------|----|-----|--------|
| `src/knowledge/empirePolicy.ts` | M | P1 | Optional `processMode: paper_rehearsal \| live_manual` helper text; export seed allowlist constants if FE needs them |
| `src/knowledge/portfolioPolicy.ts` | — | — | **Leave locked** unless invariant tests fail |
| `src/brain/demoAccount.ts` | M | P0 | Ensure public personal paths never default to `DEFAULT_DEMO_ACCOUNT` |
| `src/brain/liveAccount.ts` | M | P0 | `demoAsLiveClient()` → seed-shaped fallback; add optional `source: "robinhood_manual"` on client type if needed |
| `src/brain/portfolio.ts` | — | — | Empire sizing already correct; only touch if product adds override flag |
| `src/brain/riskGates.ts` | — | — | Empire blocks already wired |
| `src/brain/selector.ts` | M | P1 | Surface `zeroSizeCoach` message on rec when `suggestedContracts === 0` (if not only UI) |
| `src/brain/types.ts` | M | P1 | Optional `coachMessage?: string` on `BrainRecommendation` |
| `src/lib/personalAccount.ts` | M | P0 | Optional `onChange` storage event helper; document equity sources; ensure `robinhood_paste` docs in type comments |
| `src/lib/rhImport.ts` | M | P0 | `deriveSharesHeld(rows)`, optional `estimateOpenRiskHint`; file-size constants; pure helpers for positions |
| `src/lib/orderChecklist.ts` | M | P0 | Accept contracts override; optional empire fields |
| `src/lib/localJournal.ts` | M | P1 | Ensure checklistText stored; optional `source: 'trade_lab' \| 'manual' \| 'rh_import'` |

### 5.2 UI — Trade Lab & checklist

| File | Op | Pri | Change |
|------|----|-----|--------|
| `src/app/(app)/OptionScopeBuilder.tsx` | M | **P0** | Wire checklist as primary climax: `id="order-checklist"`; save `checklistToText`; apply `suggestedContracts` to leg qty / journal; scroll target |
| `src/components/OrderChecklistCard.tsx` | M | P0 | Stronger CTA copy; show contracts from brain; disable save until confirm (already) |
| `src/components/BrainRecommendPanel.tsx` | M | P0 | Zero-size coach always visible when contracts=0; link “Jump to checklist”; never silent 0 |
| `src/components/CommandRitual.tsx` | M | **P0** | Focus refresh; seed badge; account-gate pulse (halt/ready) |
| `src/app/(app)/Dashboard.tsx` | M | P1 | Keep ritual first on cockpit; optional compact seed banner if equitySource not set |
| `src/app/(app)/settings/page.tsx` | M | P0 | File picker for CSV; security copy reinforcement; after import optional shares preview |
| `src/app/(app)/journal/page.tsx` | M | P0 | Show checklistText when present; close flow already exists — ensure paper trade outcome path is obvious |

### 5.3 Optional create

| File | Op | Pri | Change |
|------|----|-----|--------|
| `src/hooks/usePersonalAccount.ts` | C | P1 | Shared load/save + storage event for Settings / Ritual / Brain |
| `src/lib/rhImportPositions.ts` | C | P1 | Split positions vs activity parsers if CSV shapes diverge |
| `src/components/RhImportPanel.tsx` | C | P1 | Extract Settings import UI for reuse |
| `src/components/AccountGatePulse.tsx` | C | P1 | Presentational tile for ritual |
| `docs/nexus/superagent/05-ARCHITECTURE-MONEY-LOOP.md` | C | — | **This document** |

### 5.4 Tests

| File | Op | Pri | Change |
|------|----|-----|--------|
| `tests/knowledge/empirePolicy.test.ts` | M | P0 | Keep seed ceiling / CSP block / zero-size coach (exists) |
| `tests/lib/rhImport.test.ts` | M | P0 | Real-ish RH header variants; size reject; no password in UI strings (grep/fixture) |
| `tests/brain/liveAccount.test.ts` | M | P0 | Fallback is seed-shaped when personal mode |
| `tests/brain/portfolio.test.ts` / `growthLock.test.ts` | M | P1 | Explicit $500 fixtures |
| `tests/lib/orderChecklist.test.ts` | C | P1 | contracts override + text contains manual RH disclaimer |
| `tests/brain/riskGates` (existing patterns) | M | P0 | EMPIRE_PHASE_BLOCK for CSP at seed (partially in empirePolicy.test) |

### 5.5 Explicitly do **not** create this sprint

- RH OAuth / unofficial SDK packages  
- Auto-trade routes  
- Multi-tenant import tables (unless Supabase personal later)  
- Server persistence of raw CSV  
- LM Studio chat over raw imports  

---

## 6. Risks and test plan

### 6.1 Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Brain sizes against wrong equity ($25k demo bleed) | **Critical** | Seed defaults; tests; Ritual + Settings show equity; `demoAsLiveClient` fix |
| Silent `contracts: 0` → user force-sizes 1-lot in RH | **High** | Mandatory `zeroSizeCoach` UI; checklist shows risk vs equity |
| RH password phishing UI regression | **Critical** | Code review + tests forbidding password fields; security ADR |
| CSV formula injection / huge paste | **High** | Caps; data-only parse; no eval |
| Import mistaken for live positions truth | **Med** | Labels: “process history”; equity always manual or Alpaca |
| Checklist qty ≠ brain size | **Med** | Single contracts state in builder after brain load |
| Journal without forecast | **Med** | Lab save path stores PoP/EV; imports stay forecast-less |
| Over-scoping microservices | **Low** | Stay modular monolith; localStorage first |
| Stage policy too tight → no trades ever | **Med** | Accept by design; paper rehearsal + coach; finance validates $500 physics |

### 6.2 Test plan

**Unit (Vitest — must stay green):**

1. `resolveCapitalPhase(500|6000|30000|100000)`  
2. `empireRiskCeiling(500,0).hardCeiling ≈ 2.5`  
3. `empireBlocksStrategy("cash_secured_put", 500)`  
4. `sizePosition` seed + maxLoss 150 → 0 contracts + coach text  
5. `parseRhPaste` CSV + free text + empty + oversize  
6. `buildChecklist` / `checklistToText` disclaimer + leg lines  
7. `seedAccount(500).growthMode === income_preservation`  
8. Account gates: daily loss halt under empire `dailyLossHaltPct`  
9. Policy invariants `assertPolicyInvariants()`  

**Integration (manual / FE evidence):**

| # | Scenario | Pass criteria |
|---|----------|---------------|
| I1 | Settings set equity $500 → Trade Lab recommend | Brain account snapshot ~$500; not $25k |
| I2 | Recommend CSP-like structures at seed | Blocked or 0-size with coach |
| I3 | Load vertical into builder | Checklist shows legs + copy works |
| I4 | Checklist Save to journal | Journal planned entry with checklist text |
| I5 | Mark open → close with P/L | Stats update on Journal + Ritual pulse |
| I6 | Paste sample CSV in Settings | Row count on Ritual; process hints; no password field |
| I7 | Alpaca paper selected with keys | Ritual PAPER FEED; brain can use live equity |
| I8 | Undefined-risk structure | Checklist hidden / blocked banner |

**Regression:**

- `pnpm test` (baseline 130+)  
- `pnpm typecheck`  
- Reality Checker: **SHIP_PERSONAL_MVP** only if kickoff checklist complete  

### 6.3 Acceptance mapping (kickoff)

| Kickoff criterion | Architecture owner path |
|-------------------|-------------------------|
| Seed equity selectable and used by sizing | Settings → personalAccount → seedAccount → sizePosition |
| Zero-size coach not silent 0 | empirePolicy + BrainRecommendPanel |
| Order checklist in Trade Lab CTA | OptionScopeBuilder + OrderChecklistCard |
| RH export import one shape | rhImport + Settings |
| Journal paper outcome | localJournal + journal page |
| Tests green + Reality Checker | QA / testing-reality-checker |

---

## 7. Trade-off summary

| Decision | Gain | Give up |
|----------|------|---------|
| Seed default $500 + empire overlay | Honest sizing; survival bias | Fewer “green” recs; often 0 contracts |
| Manual checklist only | No auto-trade blast radius | Friction; user error at RH still possible |
| localStorage capital + journal | Zero infra for personal MVP | No multi-device; easy clear-data loss |
| RH paste not live API | Security + ToS safe | Stale positions; manual equity |
| Modular monolith | Ship speed | Later extract only if multi-user profits proven |

---

## 8. ADRs embedded

### ADR-005a: Capital phase overlay on portfolio policy  
**Decision:** Keep `PORTFOLIO_POLICY` as global lock; apply `empirePolicy` as **stricter min()** overlay by equity.  
**Consequence:** One brain path; seed safety without forking entire policy matrix.

### ADR-005b: RH import is provenance, not broker session  
**Decision:** Client parse + localStorage only for P0; equity remains user/Alpaca.  
**Consequence:** Process audit without credential surface.

### ADR-005c: Checklist is the only execution interface  
**Decision:** No order API to RH; checklist + journal is the money loop close.  
**Consequence:** Aligns with `executionMode: "manual_checklist_only"`.

---

## Status line

```
NEXUS-Sprint | Architect | Money Loop Architecture | OptionScope Personal Companion
Core policy/sizing/seed paths EXIST · Gaps: demo bleed, checklist fidelity, ritual refresh, RH→shares overlay
Next: FE (Trade Lab checklist + Ritual) + BE-shaped pure lib (import/account) · then QA evidence
```
