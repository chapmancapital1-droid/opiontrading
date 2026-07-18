# OptionScope — Product Evaluation (Personal Empire Companion)

**Author:** Alex (Product Manager agent)  
**Date:** 2026-07-12  
**Classification:** Michael Chapman personal use only — not a public launch readiness review  
**Decision scope:** Fitness of current app for capital ladder **$500 → $5,000 → $25,000** so NerdCommand stays alive  
**Sources reviewed:** `docs/empire/00-PERSONAL-COMPANION-BRIEF.md`, `docs/design/00-VISION-HANDOFF.md`, `ROADMAP.md`, `README.md`, `src/brain/*`, app routes under `src/app/(app)/`, knowledge policy + journal repo

---

## Executive verdict (no soft theater)

**OptionScope is a strong options analysis brain with a weak personal capital product.**

The engine, selector, sizing math, book-grounded explainer, live-chain instantiation, and manual Robinhood checklist path are real and non-trivial. That is the hard intellectual core — and it is largely **done**.

What is **not** done is the mission: a daily companion that protects a **$500** seed, forces process, imports **what Michael already did on Robinhood**, and measures progress on a capital ladder. Default account is a **$25,000 demo**. Journal / Saved / Compare are **stubs**. Robinhood history import is **absent**. Small-account economics are **not first-class**.

### Bottom line
| Question | Answer |
|----------|--------|
| Can this help him analyze a trade better than naked RH? | **Yes — today.** |
| Is it companion-ready for $500 → $5k capital process? | **No — not yet.** |
| Kill or continue? | **Continue hard.** Do not public-launch. Do not polish SaaS chrome. Ship a **30-day personal MVP** aimed only at Michael. |
| Public SaaS? | **No-Go until Stage 1 ($5k) is proven on real money with process adherence.** |

---

## 1. Mission fit score: **54 / 100**

### Score justification

| Dimension | Weight | Score (0–100) | Weighted | Notes |
|-----------|--------|---------------|----------|-------|
| Domain truth (payoff, Greeks, MC PoP/EV, risk class) | 20% | 88 | 17.6 | Unit-tested engine; undefined risk detection; companion blocks naked shorts |
| Decision brain (rank → size → checklist) | 20% | 78 | 15.6 | Selector + gates + engine score + Explain AI exist and are wired to builder |
| Small-account / capital-ladder product | 20% | 28 | 5.6 | Demo equity $25k; policy risk % breaks on $500; no ladder UI; wheel/CSP primary rules starve micro capital |
| Account feedback loop (RH history, journal, calibration) | 20% | 25 | 5.0 | Journal repo + calibration code exist; UI stub; **zero RH import**; no “what I did wrong” product |
| Daily companion ritual (morning / pre / post) | 10% | 40 | 4.0 | Dashboard + builder usable; no ritual framing, no capital state of the empire |
| Safety / hard laws (no auto-trade, no RH password) | 10% | 95 | 9.5 | Manual checklist only; policy invariant; never asks RH credentials — keep this sacred |
| **Mission fit** | **100%** | | **≈ 54** | |

### What the score is *not*
- Not a score of code quality (higher).
- Not a score of “is the vision good” (vision is clear and correct).
- It is: **does this product, as shipped, serve the empire capital mission under $500 realities?**

### Confidence
**~80%.** Evidence is file-backed (stubs, `DEFAULT_DEMO_ACCOUNT.equity = 25_000`, policy `perTradeRiskPct` 0.75–1.5%, no RH import path). Missing only live runtime verification of Michael’s env keys and whether Supabase is actually connected on his machine.

---

## 2. Jobs-to-be-done (personal companion)

These are **jobs**, not features. If a day passes and none of these jobs ran, the companion failed regardless of how pretty the builder is.

### 2.1 Morning — “Open eyes before open market”

**Job:** When Michael starts the day, he wants a single calm readout of **capital state + market context + what is allowed**, so he does not invent risk out of FOMO.

| Step | Outcome |
|------|---------|
| See ladder position | Equity vs $500 / $5k / $25k; distance; days since last process breach |
| See risk budget left | Daily loss halt status; open risk $; campaigns open |
| See watchlist context | IV rank, trend, expected move, event proximity for 3–8 names max |
| Brain shortlist | 0–3 **affordable** defined-risk ideas only (size ≥ 1 under seed rules) |
| Explicit halt | If gates fail: “No new risk today” feels like a coach, not a broken app |

**Current state:** Partial. Dashboard + MarketContext + brain exist. **No ladder. No seed account. Default sizes for a $25k fantasy.**

### 2.2 Pre-trade — “Dignity before the finger hits Robinhood”

**Job:** Before any RH order, he wants the trade fully legged, max-loss honest, size capped, exit rules stated, checklist copyable — and a forced pause if the idea fails gates.

| Step | Outcome |
|------|---------|
| Ticker → live chain | Real strikes / marks |
| Brain pick or manual structure | Exact legs load into builder |
| Truth panel | Max loss, BE, model PoP/EV (labeled estimates), collateral |
| Size | Contracts from **his** equity (seed or paper), not demo $25k |
| Explain | Book-cited “why / why not / risks” |
| Checklist | Copy → enter RH manually → never Place Trade CTA |
| Log intent | One-tap “Planned” journal entry with write-once forecast |

**Current state:** Strong on analysis + checklist + explain. **Weak on his equity, journal one-tap, and micro-universe filtering.**

### 2.3 Post-trade — “Calibration over ego”

**Job:** After fill or close, he wants the companion to compare **forecast vs reality** and tell him the process error class — not a pep talk.

| Step | Outcome |
|------|---------|
| Capture fill | Entry price, time, actual contracts (paste or RH CSV) |
| Capture exit | Realized P/L, reason (target / stop / time / assignment / panic) |
| Score forecast | Predicted PoP/EV vs win/loss (calibration bins when n grows) |
| Error taxonomy | e.g. oversized, no plan, held through earnings, undefined risk, revenge add, skipped exit |
| Allocation coach | If win: how much to options float vs core (policy); if loss: float shrinks first |
| Ladder update | Equity path tick; streak of process adherence |

**Current state:** Backend journal + calibration exist; **UI is a warning box.** No RH history. No error taxonomy product. Growth path function exists in `projectGrowthPath` but is not a companion surface.

### 2.4 Weekly — “What to fix” (supporting job)
Import last N RH fills → pattern report: most common strategy, average risk %, hold-through-earnings rate, process adherence %. This is the **empire mirror**. Currently **Missing**.

---

## 3. Feature gap matrix (capital ladder)

Status key: **Have** = usable for Michael today · **Partial** = logic or stub exists, not companion-ready · **Missing** = not built

| Capability | Status | Evidence | Ladder impact |
|------------|--------|----------|---------------|
| Payoff / BE / Greeks / unlimited-risk detection | **Have** | `src/domain`, README fixtures | Core honesty |
| Monte Carlo PoP / EV (model estimates) | **Have** | MC worker + builder | Decision quality |
| Strategy templates (defined risk) | **Have** | Domain + rules | Required for micro capital |
| Live chain load + strike snap | **Have** | Builder + providers | Real numbers |
| Market context (IV rank, trend, EM, liquidity, events) | **Have** | Phase 3 | Brain inputs |
| Trading brain rank → size → RH checklist | **Have** | `src/brain/*`, `BrainRecommendPanel` | Core companion |
| Book library + Explain AI citations | **Have** | catalog + `explain.ts` | Learning loop |
| NCI TA bias (webhook / compute) | **Have** | `src/indicators/nciTa` | Chart process |
| Block undefined risk / no auto-trade | **Have** | policy + selector | Survival |
| Alpaca **paper** equity → sizing | **Partial** | liveAccount + API; not RH live; not seed | Paper rehearsal OK; RH real capital still blind |
| Robinhood **order checklist** copy | **Have** | `OrderChecklistCard` | Execution dignity |
| Account = **Michael’s $500 seed mode** | **Missing** | `DEFAULT_DEMO_ACCOUNT` = $25k equity / $20k cash | **Critical miss** |
| Micro defined-risk universe (cheap debit / narrow width) | **Partial** | Rules include debit spreads & long options; not prioritized/filtered by affordability | CSP/wheel dominate growthPrimary but are often **untradeable** at $500 |
| Capital ladder UI ($500 / $5k / $25k) | **Missing** | No surface; only sim helper `projectGrowthPath` | Mission invisible in product |
| Trade journal UI (open/close/forecast) | **Partial** | `journalRepo` + schema; page is stub | No closed loop |
| Calibration dashboard | **Partial** | `src/db/calibration.ts`; not surfaced | Edge learning delayed |
| Saved trades | **Partial** | Page stub; needs Supabase | Friction mid-workflow |
| Compare strategies UI | **Partial** | `compare.ts` claimed; page stub | Nice-to-have for MVP |
| Robinhood **history import** (CSV/export) | **Missing** | No import module | Cannot see “what I already did wrong” |
| “What I did wrong” insight engine | **Missing** | — | Highest-leverage personal feature |
| Settings for personal equity / mode / RH import | **Partial** | Env-var table only | Companion needs in-app seed controls |
| Personal education + graphic prompts per feature | **Partial** | Generic education/risk page | Brief requires personal guide; not built |
| Profit allocation coach (float vs core) | **Partial** | `allocateProfit` / `suggestCoreParking` in code | Not ritualized in UI |
| Backtest selector history | **Missing** | Phase 6 roadmap | Defer post-MVP |
| Public multi-tenant SaaS | **Missing (correct)** | Intentional | **Do not build yet** |

### Ladder-critical gaps (must close before “companion ready”)
1. Seed account mode ($500 realities)  
2. Journal ritual UI (local persistence acceptable if Supabase not up)  
3. RH history CSV import + error insights  
4. Affordability filter (only recommend structures where 1 lot ≤ risk budget)  
5. Capital ladder + process-adherence metrics  

---

## 4. Small-account product constraints ($500 realities)

### 4.1 Hard arithmetic (product must encode this, not hide it)

| Fact | Implication |
|------|-------------|
| 1 options contract = 100 shares exposure on underlyings | Cheap underlyings and **narrow defined-risk** structures only |
| CSP on a $50 stock ≈ **$5,000** cash | **Wheel CSP is not a $500 default strategy** |
| Covered call needs **100 shares** | Unaffordable on most names at $500 |
| Balanced policy `perTradeRiskPct = 1%` → **$5** risk budget on $500 | Most 1-lot debits cost **more than $5** → size always 0 under current soft targets |
| Absolute hard cap 5% → **$25** | Only micro-debits / very cheap long options fit “safe” sizing |
| Commissions/spread on RH are small but **slippage on wide markets kills micro accounts** | Reject wide liquidity is correct; tighten watchlist to liquid names |
| One bad 1-lot can be −20% to −100% of account | Process > edge at seed stage |

### 4.2 Product laws for seed stage

1. **Default growth mode for $500: `seed_micro` (new)** — not `balanced` designed for mid accounts.  
2. **Primary structures:** $1-wide credit/debit verticals when Level 3; long calls/puts sized to **full premium loss ≤ X% equity**; **no CSP/CC as primary** until equity ≥ threshold (e.g. $2,000–$3,000 or explicit share position).  
3. **Paper-first gate:** Product should prefer Alpaca paper (or RH paper if used) until **N closed trades with process adherence ≥ threshold** — not until “feels ready.”  
4. **Size honesty:** If 1 lot exceeds budget → recommendation shows **“Not affordable — paper only / wait / narrower width / different name”**, never silent 0 contracts with no coaching.  
5. **Max open campaigns at seed:** 1 (maybe 2). Current balanced allows 4 — too many for $500.  
6. **Daily loss halt:** 3% of $500 = $15 is tiny; keep the circuit breaker but **label it in dollars** so it is visceral.  
7. **Do not romanticize 10×.** Stage 1 ($500 → $5k) is a **process proof** with high variance. Product success = **survive + improve process**, not guaranteed 10×.  
8. **Undefined risk remains banned.** No “YOLO naked short” exception for small accounts — that is how empires die.

### 4.3 What “good trading” looks like at $500 (product framing)
- Fewer trades, smaller max loss, higher process score  
- Prefer liquid tickers (SPY/QQQ options, liquid mega-cap chains)  
- Journal every planned trade even if skipped  
- RH import weekly to catch self-deception  

---

## 5. Robinhood history import as a product

### 5.1 Non-negotiables
- **No password scraping. No unofficial RH login reverse-engineering. No session hijack.**  
- User-provided artifacts only: **CSV export, account statement download, or manual paste.**  
- Educational companion language: insights about **process**, not “you should have bought X.”  
- Data stays local/personal (or his Supabase) — this is empire private infrastructure.

### 5.2 User experience (v1)

**Entry points:** Settings → “Import Robinhood history” · Journal → “Import fills” · Morning banner if no import in 14 days.

**Flow:**
1. Instructions: Robinhood app/web → Account → Statements & history / tax docs / export path (document exact current RH UI; it changes — keep instructions editable in markdown).  
2. Upload CSV **or** paste rows.  
3. Parser maps columns → normalized `FillEvent`: symbol, side, qty, price, instrument type (equity/option), option occ symbol if present, timestamp, fees.  
4. Preview table: “We read N option fills, M equity fills, date range.” User confirms.  
5. Store immutable import batch + derived trades (best-effort grouping of multi-leg).  
6. Generate **Insight Report** (below).  
7. Optional: match open RH positions manually if CSV incomplete.

**Graceful degradation:** If RH export is incomplete (common), support **manual trade paste form** (symbol, strategy, entry, exit, P/L) so the journal never blocks on perfect CSV.

### 5.3 “What I did wrong” insights (product, not moralizing)

Score each closed trade and the overall sample against process rules:

| Insight class | Detection signal (examples) |
|---------------|-----------------------------|
| **No plan** | Fill with no prior “planned” journal row within 24h |
| **Oversized** | Max loss / equity at entry > seed or policy cap |
| **Undefined risk** | Naked short call/put pattern in fills |
| **Event blindness** | Opened/held through known earnings window without flag |
| **No exit rule** | Held to worthless / large loss without profit-target or time stop |
| **Revenge / cluster** | ≥3 entries same day after a loss |
| **Illiquid tax** | Wide mid-mark vs fill (if marks available) or penny-name options |
| **Wheel without capital** | CSP assigned cascade on account too small |
| **Skipped companion** | Trades exist in RH with zero OptionScope planned rows |

**Output:** Top 3 fix themes for next 2 weeks + one **stop doing** rule (e.g. “No second trade same day after a full stop-out”).

### 5.4 Why this is higher priority than Compare UI
Compare helps choose structure A vs B. RH import tells Michael **whether he is the bottleneck**. For empire survival, self-deception is the bigger product risk.

---

## 6. Prioritized 30-day personal MVP backlog (him only)

**North star for 30 days:** Michael can run morning → pre-trade → post-trade on **his** capital (or paper equity) with journal + RH history mirror, under seed constraints.  
**Out of scope:** Public launch, multi-user SaaS polish, Compare v1, backtest, LM Studio companion, brand redesign theater.

### Must-ship (P0) — if these slip, MVP fails

| # | Item | Why | Done when |
|---|------|-----|-----------|
| 1 | **Seed account mode** | Everything sizes wrong without it | Settings: equity/cash/open risk; presets $500 / paper-live; default demo no longer $25k for personal profile |
| 2 | **`seed_micro` policy** | 1% of $500 is unusable | Growth mode: 1 campaign, higher explicit max-loss floor **or** absolute $ risk bands, CSP/CC gated by min equity/shares, defined-risk prefer |
| 3 | **Affordability coach on brain cards** | Silent `contracts: 0` is useless | Card explains $ max loss vs budget; suggests narrower width / paper / skip |
| 4 | **Journal UI v1 (local-first OK)** | No loop without it | Create planned trade from builder checklist; mark filled; mark closed + realized P/L; list history |
| 5 | **Write-once forecast snapshot** | Calibration needs truth | Snapshot stored at plan; cannot edit after fill |
| 6 | **RH CSV import v1** | See history / fix behavior | Upload → normalize fills → list; no password path |
| 7 | **Insight report v0** | “What I did wrong” | At least 5 process heuristics over imported + journaled trades |
| 8 | **Capital ladder strip** | Mission visible | Header/dashboard: $500 → $5k → $25k with current equity + paper badge |
| 9 | **Morning risk strip** | Daily halt / budget in dollars | Equity, cash, open risk, daily P/L, halt yes/no |
| 10 | **One-click plan from brain** | Reduce friction | Brain pick → builder legs → checklist → “Save planned” |

### Should-ship (P1) — same 30 days if capacity

| # | Item | Why |
|---|------|-----|
| 11 | Process adherence score (7d / 30d) | Leading indicator before equity moves |
| 12 | Allocation coach after win/loss | Use existing `allocateProfit` |
| 13 | Seed education pack (personal) | 5–7 cards: what $500 can/can’t do; verticals; long options; why no naked short |
| 14 | Watchlist of liquid micro-friendly underlyings | Reduce FOMO ticker hopping |
| 15 | Paper gate checklist | “N closed paper trades + adherence ≥ X before live size-up” |

### Explicitly deferred (P2+) — do not touch in 30 days
- Compare page full UI  
- Saved trades cloud polish  
- Phase 6 backtest  
- LM Studio local coach  
- Public GTM, marketing site, multi-tenant auth hardening  
- Visual identity redesign beyond minimum ladder/journal usability  

### 30-day sequencing (suggested)
| Week | Focus |
|------|--------|
| **W1** | Seed mode + policy + affordability + ladder strip (brain tells truth at $500) |
| **W2** | Journal UI local-first + plan-from-builder + forecast freeze |
| **W3** | RH CSV import + fill list + match to journal |
| **W4** | Insights v0 + morning strip + paper gate + harden with his real exports |

**Owner model:** Engineering builds; Michael is the only user and the acceptance tester daily. No committee.

---

## 7. Success metrics for $500 → $5k process (not vanity DAU)

### 7.1 North star (personal)
**Process-adjusted capital survival and growth** — not clicks, not DAU, not “features shipped.”

Primary outcome metric:
> **Equity trajectory under a declared risk policy, with process adherence ≥ 70%, no undefined-risk trades, and no account blow-up (< −40% from peak without mandatory paper reset).**

### 7.2 Metric table

| Goal | Metric | Baseline (assume day 0) | Target | Window |
|------|--------|-------------------------|--------|--------|
| Survive | Max drawdown from peak | n/a | ≥ −40% triggers paper reset rule | Continuous |
| Survive | Undefined-risk trades | Unknown | **0** | Always |
| Process | % of RH fills with prior planned journal entry | ~0% | ≥ 70% | Rolling 30 trades |
| Process | % trades within size policy at entry | Unknown | ≥ 90% | Rolling 30 trades |
| Process | Daily loss halt respected (no new risk after halt) | Unknown | 100% | Continuous |
| Calibration | Journal closed trades with forecast snapshot | 0 | ≥ 20 | 30–60 days |
| Learning | Insight themes actioned (documented rule changes) | 0 | ≥ 3 | 30 days |
| Paper readiness | Closed paper trades before increasing live risk | 0 | ≥ 15 with adherence ≥ 70% | Before size-up |
| Capital Stage 1 | Equity $500 → $5,000 | $500 | **Process-first**; $5k is **outcome hope**, not MVP gate | Multi-month |
| Companion habit | Days OptionScope opened **before** RH on trading days | Unknown | ≥ 80% of trading days | 30 days |
| Product quality | Brain recommendations with contracts=0 and no coach copy | Common today | **0** silent zeros | 30 days |

### 7.3 What we explicitly refuse as success
- App DAU / session length  
- Number of strategies in the catalog  
- “Shipped Phase 6” without journal use  
- Single lucky 10× week without process  
- Public waitlist signups  

### 7.4 Honest capital math note (PM judgment)
**$500 → $5,000 is a 10× outcome.** Product can improve edge and kill suicide risk; it cannot promise 10×. Treat Stage 1 as:
1. **Proof of process** (primary)  
2. **Positive expectancy under constraints** (secondary)  
3. **Equity multiple** (lagging, high variance)

If process metrics hit and equity does not, **do not abandon process** — adjust strategy universe and risk bands with evidence. If equity hits without process, **do not public-launch** — luck is not a product.

---

## 8. Go / No-Go — “Companion ready”

### Decision: **NO-GO for companion-ready today**  
### Decision: **CONDITIONAL GO on 30-day personal MVP**  
### Decision: **HARD NO-GO on public release** until Stage 1 capital + process proof

### Companion-ready definition (binary checklist)
All must be true:

| # | Condition | Today |
|---|-----------|-------|
| C1 | Seed account mode live; default personal equity is Michael’s number (or paper), not $25k demo | ❌ |
| C2 | Brain only ranks **affordable** defined-risk ideas at seed; CSP/CC gated | ❌ |
| C3 | Journal: plan → fill → close with write-once forecast works without heroics | ❌ |
| C4 | RH history import via CSV/export/paste (no password) works on his real file | ❌ |
| C5 | At least one “what I did wrong” report generated from real history | ❌ |
| C6 | Capital ladder + daily risk strip visible every session | ❌ |
| C7 | Hard laws intact: no auto-trade, no RH password, model estimates labeled, undefined risk blocked | ✅ |
| C8 | Michael completes **5 full days** of morning / pre / post ritual without leaving the product | ❌ |

**When C1–C8 pass → GO companion-ready (personal).**  
**Public GO** requires additionally: live Stage 1 equity path evidence + ≥ 30 closed real trades with adherence ≥ 70% + no blow-up — **not this quarter’s vanity ship.**

### Risks if we ignore this and “just trade with the builder”
- Sizing against $25k demo while living on $500 → **account death**  
- Wheel-primary brain suggestions he cannot fund → frustration → YOLO  
- No journal → no learning → same mistakes on loop  
- Public launch temptation before profits → empire attention drain  

---

## Trade-offs made explicit

| Choice | Accept | Reject |
|--------|--------|--------|
| Personal MVP over design polish | Ugly ladder + journal that works | Beautiful stubs |
| Local journal if Supabase friction | Speed for one user | Perfect multi-device SaaS journal |
| RH CSV not official API | Legal/safe import | Password scraping “convenience” |
| Process metrics over equity FOMO | Survival | Lottery scoreboard as sole KPI |
| Defer Compare/backtest | Focus | Feature completeness theater |

---

## Appendix A — Architecture truth snapshot (for engineering)

| Layer | Path | Personal MVP note |
|-------|------|-------------------|
| Brain API | `src/brain/*` | Extend account presets + seed gates; don’t rebuild selector |
| Policy | `src/knowledge/portfolioPolicy.ts` | Add `seed_micro`; gate wheel |
| Rules | `src/knowledge/strategyRules.ts` | Prefer defined micro; keep citations |
| Journal backend | `src/db/journalRepo.ts`, `calibration.ts` | Wire UI; local adapter if needed |
| Checklist | `OrderChecklistCard` | Attach “Save planned” |
| Live paper | `liveAccount.ts` + Alpaca API | Keep for paper path |
| Stubs | `/journal`, `/saved`, `/compare` | Journal first; others later |
| Demo lie | `demoAccount.ts` $25k | **Replace for personal profile** |

---

## Appendix B — Press-release test (personal, not public)

> *This morning I opened OptionScope before Robinhood. It showed my $500 seed, $X risk left, and “no CSP — account too small.” It ranked a $1-wide put credit I can actually lose at most $Y on, cited the book rule, and gave me a checklist. I entered RH by hand. At night I imported last week’s RH CSV; it told me I oversized twice and traded twice after a stop-out. I fixed the rule. I still press every button myself — but I don’t trade alone.*

**If we cannot ship that paragraph’s behavior in 30 days, we are still building a calculator, not a companion.**

---

# Handoff block

| Field | Value |
|-------|--------|
| **Artifact** | `C:\Users\Michael Chapman\opiontrading\docs\empire\01-product-evaluation.md` |
| **Decision** | **NO-GO companion-ready today.** **CONDITIONAL GO** 30-day personal MVP. **HARD NO-GO public.** |
| **Mission fit** | **54/100** — brain strong; capital product incomplete |
| **Top 5 must-build** | (1) Seed account mode (2) seed_micro policy + affordability coach (3) Journal UI plan/fill/close (4) RH CSV import (5) What-I-did-wrong insights + ladder strip |
| **Do not build now** | Public GTM, Compare polish, backtest, LM Studio, brand theater |
| **Next agent** | **Engineering lead / fullstack implementer** — execute 30-day P0 backlog starting Week 1 seed mode + policy; parallel thin vertical for journal local-first |
| **Parallel optional** | Design only if it unblocks journal/ladder UX clarity — **no full brand pass** |
| **Blockers** | Need one real Robinhood export sample from Michael to lock CSV column mapping; confirm whether Supabase is live or force localStorage journal adapter |
| **Success bar for next review** | C1–C8 companion checklist above; re-score mission fit (target ≥ 75 for personal GO) |

**Firm close:** The empire does not need another options toy. It needs a **$500-survival coach with a memory**. Build that. Everything else waits.
