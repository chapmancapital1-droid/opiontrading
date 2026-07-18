# Seed Finance Rules — OptionScope Empire Companion

**Document:** `docs/nexus/superagent/06-SEED-FINANCE-RULES.md`  
**Author:** Morgan (finance-financial-analyst)  
**Date:** 2026-07-15  
**Classification:** Michael Chapman personal companion only — not public product doctrine  
**Ladder:** $500 → $5,000 → $25,000  
**Code truth:** `src/knowledge/empirePolicy.ts`, `src/brain/portfolio.ts`, `src/brain/riskGates.ts`, `src/brain/demoAccount.ts`  
**Doctrine parents:** `docs/empire/02-capital-path-realism.md`, `docs/empire/99-MASTER-EVALUATION.md`  
**Version:** 1.0.0

---

## Executive rule (one sentence)

**At seed (&lt; $5k), the companion must refuse unfundable structures (especially CSP / blue-chip wheel as defaults), size to 0 when 1-lot max loss exceeds the empire ceiling, and teach affordable defined-risk alternatives — without advice theater or $25k demo fiction.**

---

## 1. Hard numeric rules — seed phase (`equity < 5_000`)

Phase resolver: `resolveCapitalPhase(equity)` → `"seed"` when equity is not finite/positive or `equity < 5_000`.  
Source of coded limits: `getEmpirePhaseLimits` / `empireRiskCeiling` in `empirePolicy.ts`.  
Sizing path: `sizePosition` intersects growth-mode targets with empire ceilings (`empireMode` default **true**).

### 1.1 Risk & campaign ceilings (non-negotiable)

| Parameter | Seed value | Dollars @ $500 | Dollars @ $2,500 | Dollars @ $4,999 | Notes |
|-----------|------------|----------------|------------------|------------------|-------|
| **Per-trade risk target** | **0.5%** | $2.50 | $12.50 | ~$25.00 | Soft target; preferred |
| **Per-trade risk hard cap** | **1.0%** | $5.00 | $25.00 | ~$50.00 | Never size above this for “normal” mode |
| **Open risk budget** | **10%** of equity | $50 | $250 | ~$500 | Total concurrent modeled max-loss dollars |
| **Absolute max loss / trade** | **2%** of equity | $10 | $50 | ~$100 | Empire overlay tighter than global 5% |
| **Daily loss halt** | **2%** of equity | $10 | $50 | ~$100 | After hit: no new risk recommendations that session |
| **Max open campaigns** | **2** | — | — | — | Prefer 0–1 live thesis at micro equity |
| **Growth mode (forced default)** | **`income_preservation`** | — | — | — | **Never** default `aggressive_growth` at seed |
| **`aggressive_growth`** | **LOCKED OUT** as default | — | — | — | Privilege for later phases + process proof only |
| **Undefined risk** | **Blocked** | — | — | — | `blockUndefinedRisk: true` — no override path for seed UI |
| **Execution** | **Manual checklist only** | — | — | — | No auto-trade |

**Hard ceiling formula (single trade):**

```
hardCeiling = min(
  equity × min(perTradeRiskPct, perTradeRiskCapPct),  // target∩cap → effectively equity × 0.5% when target ≤ cap
  equity × openRiskBudgetPct − openRiskDollars,       // remaining open budget
  equity × absoluteMaxLossPct                         // 2% absolute
)
```

Implementation note: `empireRiskCeiling` uses `perTrade = equity * min(perTradeRiskPct, perTradeRiskCapPct)` then  
`hardCeiling = min(perTrade, remainingBudget, absolute)`.  
`sizePosition` also mins against growth-mode numbers; at seed, empire is the binding constraint when growth mode is looser.

**Contract rule (indivisibility):**

```
if floor(hardCeiling / maxLossPerContract) < 1 → contracts = 0
```

**No “just this once” silent oversize.** Optional live micro-exception (if ever enabled) must be an *explicit* typed acknowledgment, tracked as policy exception — not default ranking behavior. See §1.5.

### 1.2 Structure allowlist / denylist (seed)

#### Allowlist (primary recommendations / preferred ranking)

IDs must match strategy catalog. Preferred set (`preferredStrategyIds` / `SEED_PREFERRED`):

| strategyId | Structure | Seed rationale |
|------------|-----------|----------------|
| `bull_call_debit` | Bull call debit vertical | Defined risk; can be tight-width micro |
| `bear_put_debit` | Bear put debit vertical | Defined risk |
| `long_call` | Long call | Defined risk; often still 0-size if premium large |
| `long_put` | Long put | Defined risk; same |
| `bull_put_credit` | Bull put credit vertical | Defined risk if wings present; prefer tight width |
| `bear_call_credit` | Bear call credit vertical | Same |
| `money_press_put_diagonal` | Money Press put diagonal | Catalog-defined; still subject to max-loss sizing |

**Allowlist rules of use:**

1. **Defined-risk only** as default recommendation class.  
2. Prefer **tight widths** on liquid underlyings/ETFs so 1-lot max loss can approach seed ceiling.  
3. Prefer **≥7–14 DTE** for new short-premium structures (process doctrine; avoid 0DTE casino as empire path).  
4. Rank may surface preferred IDs first; non-preferred defined-risk may still size if gates pass — but must not outrank preferred when both pass and preferred is affordable.  
5. If max loss for 1-lot &gt; hard ceiling → **size 0 + coach** (never promote as “ready to enter RH”).

#### Denylist / hard blocks at seed

| strategyId / class | Seed treatment | Why |
|--------------------|----------------|-----|
| `cash_secured_put` | **BLOCK** (`EMPIRE_PHASE_BLOCK`) | Cash lock ≈ 100 × stock; blue chips need $5k–$20k+ collateral — not fundable as default income |
| Naked short put / call / strangle / straddle (undefined) | **BLOCK** | Ruin vector; `blockUndefinedRisk` |
| Ratio writes / naked short legs | **BLOCK** | Undefined or practically unbounded risk |
| Wheel-as-default / “run the wheel on AAPL” UX | **Forbidden as seed default** | Fantasy capital path |
| `covered_call` without ≥100 shares | **BLOCK** (`NO_SHARES_FOR_CC`) | Not a free income trade; stock cost >> seed |
| `covered_call` with shares | **Conditional allow** | Only if `sharesHeld[symbol] ≥ 100`; still size short call risk carefully |
| Iron condor / complex multi-leg as *default* hero | **Deprioritize** | Fees + min width often oversize seed; not blocked by ID unless catalog adds them — do not rank as seed defaults |
| LEAPS as seed primary | **Deprioritize** | Capital-heavy; opportunity cost high |

**CSP collateral reality check (must surface in UI when CSP is discussed educationally):**

| Underlying ≈ | Cash to secure 1 CSP | Fits $500 seed? |
|--------------|----------------------|-----------------|
| $5 | $500 | Borderline only |
| $15 | $1,500 | No |
| $50 | $5,000 | No |
| $100+ | $10,000+ | No |

**Product law:** App must **not** recommend CSP universe (AAPL/MSFT/NVDA-style wheel) as the default seed path. Stage 1+ (`equity ≥ $5k`) may re-open selective CSP/CC when cash/shares support them.

### 1.3 Growth mode lock

| Equity | Default growth mode | Allowed without special unlock |
|--------|---------------------|--------------------------------|
| &lt; $5,000 (seed) | `income_preservation` | Seed empire ceilings always apply |
| $5k–$25k (stage1) | `income_preservation` | CSP/CC re-enter preferred set when funded |
| $25k+ | `balanced` available | Still manual RH; no auto-trade |

`demoAccount()` / `seedAccount()` must align `growthMode` with `getEmpirePhaseLimits(equity).growthMode` unless explicitly overridden for tests.

### 1.4 Single-name & session concentration (process rules)

| Rule | Seed limit | Enforcement intent |
|------|------------|--------------------|
| Open campaigns | ≤ 2 | Gate `MAX_CAMPAIGNS` |
| Stacked risk same underlying | Prefer ≤ **5%** equity total modeled risk | Warn hard; block if product can measure open risk by symbol |
| New risk after daily halt | **0** | `DAILY_LOSS_HALT` |
| Equity floor (live) | &lt; **$300** → recommend paper-only | Coach + UI badge; do not pretend ladder is “on” |
| Paper gate | Default recommendations **paper/sim** until journal criteria met | Process before live seed |

### 1.5 Optional micro-live exception (not default)

Only if product later enables explicit exception mode:

| Condition | Value |
|-----------|--------|
| Max loss 1-lot | ≤ **$25–$50** AND ≤ remaining budget |
| Defined risk | Required |
| Paper criteria | Already met (see capital-path Appendix C) |
| UI | Show **exact risk % of equity**; require typed ack e.g. `ACCEPT OVERSIZE` |
| Logging | Tag as `policy_exception`, never as normal ranked “GO” |

**Default remains: contracts = 0 when 1-lot &gt; hard ceiling.**

### 1.6 Quick reference — $500 physics

| Budget | $ |
|--------|---|
| 0.5% risk target | **$2.50** |
| 1% hard cap | **$5.00** |
| 2% absolute / daily halt | **$10.00** |
| 10% open risk budget | **$50.00** |
| Typical 1-lot debit/vertical max loss | **$25–$200+** → often **0 contracts** |

**So what:** Missing the trade is correct empire behavior. The companion’s value at seed is **refusal + education**, not forced fills.

---

## 2. Zero-size coach message templates

**Tone laws:**

- Factual, educational, process-first  
- **Not** investment advice; **not** “you should buy X now”  
- **Not** shame; **not** hype; **not** lottery encouragement  
- Always include: equity, hard ceiling $, structure max loss $, risk % of equity  
- Always offer **process next steps** (tighter structure / paper / wait)  
- Align with `zeroSizeCoach()` in `empirePolicy.ts`; UI may expand templates below

### 2.1 Template A — Generic 1-lot oversize (default)

**When:** `contracts === 0` and strategy is not CSP/CC-specific.

```
Empire seed: equity ${equity} allows about ${hardCeiling} risk per trade
(${perTradeRiskPctDisplay}% target under seed policy).

This structure’s max loss per 1-lot is ${maxLossPerContract}
(${riskPctOfEquity}% of equity) — size is 0 to protect the account.

Next steps (education, not advice):
• Try a tighter-width defined-risk vertical, or a lower-priced debit, so 1-lot max loss ≤ ${hardCeiling}.
• Or paper the setup until equity and process support 1-lot risk.
• No-trade is a valid outcome at seed.
```

**Code-aligned short form** (existing `zeroSizeCoach`):

```
Empire {phase}: equity ${equity} allows ~${hardCeiling} risk per trade ({perTradeRiskPct}% target).
This structure's max loss per 1-lot is ${maxLossPerContract} ({riskPct}% of equity) — size is 0 to protect the empire.
Try a tighter-width vertical, lower-priced debit, or paper the process until equity supports 1-lot risk.
```

### 2.2 Template B — CSP blocked / unaffordable

**When:** `strategyId === "cash_secured_put"` (phase block or cash/collateral fail).

```
Cash-secured puts lock roughly 100 × stock price in cash for one contract.
Example: ${underlyingPrice} stock ≈ ${collateralEstimate} cash needed — vs your equity ${equity}.

At seed, CSP/wheel on typical liquid names is usually not fundable.
Empire phase seed blocks CSP as a default recommendation.

Educational alternatives to study (still subject to sizing = 0 if max loss is too large):
• Tight-width bull put credit (defined risk) when approval level allows multi-leg.
• Paper CSP mechanics until cash can secure the strike without using most of the account.
```

**Code-aligned short form:**

```
CSP/CC often need stock×100 cash or shares. At seed, prefer cheap defined-risk debit/credit verticals.
```

### 2.3 Template C — Covered call without shares

**When:** `covered_call` and `sharesHeld[symbol] < 100`.

```
A covered call requires at least 100 shares of ${symbol}.
Held: ${sharesHeld}. Equity ${equity} is not a substitute for share inventory.

Buying 100 shares to “start the wheel” at seed usually concentrates the entire account in one name.
Educational path: log share inventory if you already hold 100+, or paper covered-call mechanics.
```

### 2.4 Template D — Open risk budget exhausted

**When:** `remainingRiskBudget ≤ 0` or new trade would exceed remaining budget.

```
Open risk budget for seed is ${openRiskBudgetPct}% of equity
(${openRiskBudgetDollars}). Remaining: ${remainingBudget}.

New risk is blocked until existing positions free budget or campaigns close.
This prevents correlation blow-ups on a small account.
```

### 2.5 Template E — Daily loss halt

**When:** `dailyRealizedPL ≤ −(equity × dailyLossHaltPct)`.

```
Daily loss circuit breaker: ${dailyLossHaltPct}% of equity (${dailyHaltDollars}).
Realized today: ${dailyRealizedPL}.

New risk recommendations are halted for this session.
Process next: journal the day; no revenge size.
```

### 2.6 Template F — Campaigns maxed

**When:** `openCampaigns >= maxOpenCampaigns` (seed max 2).

```
Seed allows at most ${maxOpenCampaigns} open campaign(s). Open: ${openCampaigns}.
At micro equity, one thesis at a time is usually safer than stacking themes.
```

### 2.7 Template G — Undefined risk block

**When:** `riskProfile === "undefined"` or naked structure.

```
Undefined-risk structures are blocked in companion mode.
Small accounts cannot survive a single gap through a naked short.
Defined-risk structures only as the default empire path.
```

### 2.8 Template H — Equity below live floor

**When:** live mode and equity &lt; $300 (process threshold).

```
Equity ${equity} is below the seed live floor (~$300).
Companion stance: paper / education primary — protect remaining capital.
Ladder progress resumes when process is clean and equity is rebuilt (deposits count).
```

### 2.9 Coach copy anti-patterns (forbidden)

| Forbidden | Why |
|-----------|-----|
| “This is a great high-probability income trade” on CSP at $500 | Unfundable fantasy |
| “Size up to capture the move” when ceiling is $2.50 | Encourages oversize |
| Silent `0` contracts with no explanation | Gap #7 in master eval |
| “Guaranteed” PoP / EV | False precision |
| Four-decimal confidence on wide markets | Noise |
| Framing no-trade as failure | Kills survival culture |

---

## 3. Recommended demo seed fixture

**Product default for personal companion / builder brain panel:**  
`DEFAULT_SEED_ACCOUNT` / `seedAccount()` — **not** `DEFAULT_DEMO_ACCOUNT` ($25k + blue-chip stack).

### 3.1 Canonical fixture (implement / test against)

| Field | Value | Rationale |
|-------|-------|-----------|
| `equity` | **500** | Ladder start |
| `cash` | **500** | Fully liquid seed; no fantasy BP |
| `optionsFloat` | **400** | 80% of equity available as options risk capital metaphor |
| `portfolioCore` | **100** | 20% “oxygen” parking metaphor (not fake ETFs held) |
| `openRiskDollars` | **0** | Clean book |
| `openCampaigns` | **0** | Clean book |
| `dailyRealizedPL` | **0** | Session start |
| `approvalProfile` | **`level3_spreads`** | Allows vertical study; still size-gated |
| `growthMode` | **`income_preservation`** | Empire seed default |
| `sharesHeld` | **`{}` empty** | **No** AAPL/MSFT/SPY 100-share fantasy stack |

### 3.2 Explicitly rejected demo fantasy

| Legacy / bad fixture | Why banned as seed default |
|----------------------|----------------------------|
| `equity: 25_000`, `cash: 20_000` | Trains wrong psychology for $500 life |
| `sharesHeld: { AAPL: 100, MSFT: 100, SPY: 100 }` | Implies covered-call / wheel readiness Michael does not have |
| Alpaca paper ~$100k as “your” seed size | Paper is fine for process; **label** it paper, never as seed equity |
| `growthMode: "aggressive_growth"` | 30% open risk / 1.5% target — empire death mode at seed |

`DEFAULT_DEMO_ACCOUNT` may remain for **sandbox/regression tests only**, never as personal companion first paint.

### 3.3 Fixture variants for tests

| Name | Spec | Use |
|------|------|-----|
| `seed_500_clean` | Canonical §3.1 | Default UI + unit tests |
| `seed_500_budget_used` | equity 500, openRiskDollars 50 | Budget exhausted gate |
| `seed_500_halt` | equity 500, dailyRealizedPL −10 | Daily halt |
| `seed_500_one_campaign` | openCampaigns 1 | Campaign room left |
| `seed_500_two_campaigns` | openCampaigns 2 | Max campaigns block |
| `seed_2500` | equity/cash 2500, empty shares | Mid-seed sizing |
| `seed_4999` | equity 4999 | Still seed phase (not stage1) |
| `stage1_5000` | equity 5000 | Phase boundary: CSP may unblock |
| `seed_with_100_shares_cheap` | equity 500 + `sharesHeld: { F: 100 }` only if testing CC path | Conditional CC — do not use mega-cap fantasy |

### 3.4 Derived numbers implementers should assert on $500 clean

| Metric | Expected |
|--------|----------|
| Phase | `seed` |
| Per-trade target $ | **$2.50** |
| Per-trade cap $ | **$5.00** |
| Absolute max $ | **$10.00** |
| Open budget $ | **$50.00** |
| Daily halt $ | **$10.00** |
| Max campaigns | **2** |
| `empireBlocksStrategy("cash_secured_put", 500)` | **true** |
| `empirePrefersStrategy("bull_put_credit", 500)` | **true** |
| `sizePosition({ maxLossPerContract: 25, account: seed_500 })` | **contracts: 0** |
| `sizePosition({ maxLossPerContract: 2, account: seed_500 })` | **contracts: 1** (if 2 ≤ hardCeiling path) — verify against actual ceiling mins |

---

## 4. Validation checklist (implementers must test)

Use this as DoD for seed mode / empire policy work. Prefer automated tests; manual QA where UI-only.

### 4.1 Phase & policy math

- [ ] `resolveCapitalPhase(4999) === "seed"`
- [ ] `resolveCapitalPhase(5000) === "stage1"`
- [ ] `resolveCapitalPhase(0)` / `NaN` / negative → `"seed"` (safe default)
- [ ] Seed `perTradeRiskPct === 0.005`, `perTradeRiskCapPct === 0.01`
- [ ] Seed `openRiskBudgetPct === 0.1`, `maxOpenCampaigns === 2`
- [ ] Seed `absoluteMaxLossPct === 0.02`, `dailyLossHaltPct === 0.02`
- [ ] Seed `growthMode === "income_preservation"`
- [ ] `empireRiskCeiling(500, 0).hardCeiling` equals min of target/cap path, full budget, absolute → document expected **$2.50** (target binds when target &lt; absolute)
- [ ] `empireRiskCeiling(500, 40)` remaining budget = max(0, 50−40) = **$10**; hardCeiling mins with that

### 4.2 Structure gates

- [ ] `cash_secured_put` → gate fail `EMPIRE_PHASE_BLOCK` at equity 500
- [ ] Same strategy at equity 5000 → **not** phase-blocked (may still fail cash/collateral sizing)
- [ ] Undefined risk rule → `UNDEFINED_RISK_BLOCKED`
- [ ] `covered_call` with empty `sharesHeld` → `NO_SHARES_FOR_CC`
- [ ] `covered_call` with 100 shares of symbol → shares gate passes (other gates still apply)
- [ ] Preferred vertical IDs not blocked at seed
- [ ] Ranking / default recommend path does **not** surface CSP as top seed pick when equity &lt; 5k

### 4.3 Sizing behavior

- [ ] `maxLossPerContract = 25` on $500 seed → **0 contracts** + non-empty coach text
- [ ] `maxLossPerContract = 50` → **0**
- [ ] `maxLossPerContract = 2` with clean budget → **≥1** only if ≤ hardCeiling (assert exact)
- [ ] Collateral CSP-style `collateralPerContract = 5000`, cash 500 → **0**, `cappedBy: "cash"` or phase block first
- [ ] `empireMode: false` test path documented; production UI leaves empire **on**
- [ ] Miss-over-oversize: never returns contracts ≥ 1 when 1-lot max loss &gt; hardCeiling

### 4.4 Account gates

- [ ] `openCampaigns = 2` at seed → `MAX_CAMPAIGNS` fail
- [ ] `openRiskDollars = 50` at $500 → `RISK_BUDGET_EXHAUSTED` or remaining 0
- [ ] `dailyRealizedPL = -10` at $500 → `DAILY_LOSS_HALT`
- [ ] `dailyRealizedPL = -9.99` → halt not triggered (boundary)

### 4.5 Demo / default account

- [ ] App companion default = **$500 seed**, empty shares — not $25k demo
- [ ] `demoAccount()` without override returns seed-aligned growth mode
- [ ] `seedAccount(500)` has `sharesHeld: {}`
- [ ] Legacy `DEFAULT_DEMO_ACCOUNT` not used in Command Center / Lab first load
- [ ] Paper/Alpaca large equity labeled **PAPER**, not SEED

### 4.6 Zero-size UX

- [ ] UI shows coach when size is 0 (not silent zero)
- [ ] Coach includes equity, ceiling $, max loss $, % of equity
- [ ] CSP/CC paths use collateral/shares-specific copy
- [ ] Copy contains no “guaranteed”, no “you should buy”, no 10× promise
- [ ] No-trade presented as valid / protective outcome

### 4.7 Integration / ritual

- [ ] Account strip shows phase label **Seed ($0–$5k)** and true equity
- [ ] Ladder widget uses `ladderProgress(equity)` honesty (distance to $5k)
- [ ] Checklist still requires human confirm; size 0 cannot mark “ready” as enterable RH size
- [ ] Journal can log “skipped — size 0 under seed policy” as first-class outcome

### 4.8 Regression / anti-fantasy

- [ ] No test or storybook that sets seed user into aggressive_growth by default
- [ ] No seed fixture with AAPL+MSFT+SPY 100 shares as “default Michael”
- [ ] Wheel universe educational content labeled **Stage 1+ capital** when shown in seed mode
- [ ] Book rules that seed CSP still pass through empire block (ingest weight ≠ permission)

### 4.9 Scenario sensitivity (manual finance QA)

- [ ] $500 + $50 max-loss vertical → refuse  
- [ ] $500 + $2 max-loss micro → allow only if gates pass  
- [ ] $4,999 still seed; CSP still blocked  
- [ ] $5,000 stage1: CSP not phase-blocked; sizing still cash-aware  
- [ ] 15% swing in win-rate assumption does **not** change refuse logic (sizing is math, not edge storytelling)

---

## 5. Assumptions & honesty (finance)

| Assumption | Stance |
|------------|--------|
| 1% of $500 = $5 buys almost no real 1-lot | **Fact** of options microstructure |
| Pure options 10× from $500 quickly | **Not base case** |
| Deposits + process + no blow-up | **Honest path** to Stage 1 |
| Companion optimizes survival | **Primary KPI** = not ruined + high-quality refusals |
| This document is educational process policy | **Not** investment advice |

---

## 6. Handoff map

| Consumer | Action |
|----------|--------|
| Backend / brain | Keep `empirePolicy` + `sizePosition` + `riskGates` aligned with §1 numbers |
| Frontend | Wire seed fixture §3; surface coach templates §2; never silent 0 |
| QA / Reality Checker | Execute checklist §4 for SHIP_PERSONAL_MVP seed criteria |
| Product | Seed mode is P0 money-loop; CSP default is ship-blocker |

**Related code:**

- `src/knowledge/empirePolicy.ts` — phase limits, blocks, `zeroSizeCoach`, ladder  
- `src/knowledge/portfolioPolicy.ts` — base growth modes + hard gates  
- `src/brain/portfolio.ts` — `sizePosition` miss-over-oversize  
- `src/brain/riskGates.ts` — campaigns, halt, EMPIRE_PHASE_BLOCK, CC/CSP gates  
- `src/brain/demoAccount.ts` — `DEFAULT_SEED_ACCOUNT` vs legacy demo  

**Related docs:**

- `docs/empire/02-capital-path-realism.md` — full math & scenarios  
- `docs/empire/99-MASTER-EVALUATION.md` — companion gaps & 30-day MVP  
- `docs/nexus/superagent/00-SUPERAGENT-KICKOFF.md` — sprint frame  

---

_End of seed finance rules. Empire priority: un-blow-up-able at $500 — not bold._
