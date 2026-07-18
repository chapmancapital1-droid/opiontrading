# Product Acceptance — OptionScope Personal MVP

**Status:** Approved for engineering sprint scope  
**Author:** Alex (Product Manager)  
**Date:** 2026-07-15  
**Owner:** Michael Chapman (sole user)  
**Mission class:** Personal empire companion — not public SaaS  
**Gate label:** `SHIP_PERSONAL_MVP`  
**Sources (do not invent beyond):**  
- `docs/empire/00-PERSONAL-COMPANION-BRIEF.md`  
- `docs/empire/99-MASTER-EVALUATION.md`  
- `docs/empire/04-reality-check.md`  
- `docs/nexus/superagent/00-SUPERAGENT-KICKOFF.md`  

**Baseline at kickoff:** 130/130 tests green · typecheck green · Reality Checker **NEEDS_WORK** (lab strong, money loop weak)

---

## 0. One-sentence product

OptionScope is Michael’s **personal options trading assistant**: live chains, quantitative brain, book rules, and execution *checklists* so he can grow capital **$500 → $5k → $25k** without blowing up — **human always clicks the broker**.

### Press-release test (personal, not public)

> Michael opens OptionScope before Robinhood on trading days. The app knows his real equity (seed $500 / $1k / $5k or paper), refuses fantasy CSP sizing, ranks defined-risk micro structures he can actually fund, hands him a copyable Robinhood checklist, and remembers forecast vs outcome so the empire improves process — not vibes.

If that paragraph is false in the running app, **do not** stamp `SHIP_PERSONAL_MVP`.

---

## 1. Personal MVP user stories (Michael only)

All stories are for **one user**: Michael Chapman. No multi-tenant, no third-party advice surface, no shared workspaces.

### Persona

**Michael** — NerdCommand / Chapman Capital operator. Trades options on **Robinhood** (real ladder money). Uses OptionScope as **decision support + process memory**. Executes manually. Capital ladder: Seed **$500** → Stage 1 **$5k** → Stage 2 **$25k**. Doctrine: un-blow-up-able first; process before prediction; profits before public product.

---

### Story P0-1 — Seed capital truth

**As** Michael,  
**I want** a selectable seed equity profile ($500 / $1k / $5k) that the brain uses for sizing and gates,  
**so that** recommendations match my real (or paper-seed) life — not a $25k demo / $100k paper fantasy.

**Acceptance criteria:**
- [ ] Given seed profile = $500, when brain sizes a recommendation, then contract count and risk use **$500 equity** (not default demo $25,000).
- [ ] Given Alpaca is unconfigured, when any equity metric is shown from demo fallback, then UI shows a loud **DEMO** badge and never implies “your” live account is $25k.
- [ ] Given seed equity selected in Settings (or account strip), when I reload the app, then the profile persists for the session / local storage (personal MVP).
- [ ] Growth mode **`aggressive_growth` is never default** at seed; seed policy prefers defined-risk micro.

---

### Story P0-2 — Empire / seed policy + zero-size coach

**As** Michael,  
**I want** infeasible strategies filtered or coached when 1-lot max loss / collateral exceeds my risk budget,  
**so that** I never misread a silent “0 contracts” CSP as a smart #1 pick.

**Acceptance criteria:**
- [ ] Given equity = $500 and a CSP/wheel requiring cash-secured collateral >> budget, when brain ranks, then structure is **filtered or ranked last** with explicit **“infeasible at equity”** (not silent 0 as top pick).
- [ ] Given a 1-lot max loss $X where X > allowed risk (~0.5% target / 1% hard cap of equity), when size returns 0, then **zero-size coach** copy appears: max loss, allowed risk dollars, and feasible alternatives (tight debit/credit micro spreads).
- [ ] Given seed phase, when strategy allowlist applies, then default universe is **defined-risk micro** (cheap underlyings, tight widths) — not CSP-on-blue-chips as primary.
- [ ] Unit test: `sizePosition` / selector at **equity=500** — at least one defined-risk 1-lot feasible case and one CSP rejected/infeasible.

**Empire seed policy (product constraints — implement as policy, not soft copy):**

| Rule | Seed (&lt; $5k) |
|------|----------------|
| Risk per trade | ~0.5% target, **1% hard cap** |
| Open risk budget | **8–10%** equity max |
| Campaigns | **1–2** max |
| Growth mode | **Never** `aggressive_growth` at seed |
| Structure allowlist | Defined-risk micro only as default |

---

### Story P0-3 — Decision → Robinhood checklist (same session)

**As** Michael,  
**I want** the Order checklist wired into Trade Lab as the primary climax after Analyze / brain load,  
**so that** I can copy exact legs, limits, and max loss into Robinhood without retyping from memory.

**Acceptance criteria:**
- [ ] Given live chain loaded and brain top pick loaded into Lab (or Analyze run), when analysis completes, then **OrderChecklistCard** is visible without hunting orphan components.
- [ ] Checklist includes: max loss, contracts, net limit, expiry, leg actions (RH-oriented steps).
- [ ] Copy / print works for the checklist content.
- [ ] **Zero** order-placement buttons; human executes on broker only.
- [ ] Path documented: keys in `.env.local` → Lab → brain → checklist (smoke path).

---

### Story P0-4 — Overnight memory (journal MVP)

**As** Michael,  
**I want** a local-first journal: plan → open → close → compare forecast vs result,  
**so that** process learning exists before any claim of ladder progress.

**Acceptance criteria:**
- [ ] Given a planned trade, when I open a journal entry, then I can store write-once **forecast** (structure, size, thesis, model PoP/EV if available).
- [ ] Given an open entry, when I close it, then I can record realized P/L and outcome notes.
- [ ] Journal lists at least the **last 20** entries (localStorage acceptable if Supabase not set for personal MVP).
- [ ] Journal page is **not** a “Connect Supabase only” stub — functional path for paper trade outcome exists.
- [ ] Fix-list direction: process misses only (e.g. no plan before fill, oversized vs policy) — not “you should buy this now” advice theater.

---

### Story P0-5 — Robinhood history in (approved path only)

**As** Michael,  
**I want** to paste or CSV-import official RH export / positions snapshot,  
**so that** the companion can see what I already did and estimate open risk — without password or unofficial API.

**Acceptance criteria:**
- [ ] At least **one official export shape** (CSV and/or paste) imports into normalized positions / closed trades / orders batch.
- [ ] Explicit UI label: **“RH import is user-provided; not live broker sync.”**
- [ ] Brain/gates can read imported **sharesHeld** (e.g. CC eligibility) and open risk proxy when data present.
- [ ] **Forbidden:** RH password fields, 2FA capture, unofficial reverse-engineered RH APIs.
- [ ] Security path: CSV/paste only; prefer normalized history over storing raw CSV forever.

---

### Story P0-6 — Command Center morning ritual

**As** Michael,  
**I want** Command Center to show account strip, brain pulse, capital ladder context, and LIVE·PAPER·DEMO badges,  
**so that** my daily ritual starts with capital truth → gates → focus symbols before Trade Lab.

**Acceptance criteria:**
- [ ] Command shows **DEMO / PAPER / LIVE** badges consistent with actual data source (no LIVE while on demo chain/quotes).
- [ ] Account strip shows seed/paper equity (or explicit override), not silent $25k as “me.”
- [ ] Brain pulse: top recommendations / focus symbol path visible from Command (not buried only after multi-step Lab load with zero ritual entry).
- [ ] Daily ritual path supported: **Command → Lab → checklist → journal**.
- [ ] Nav labels align muscle memory: Command / Trade Lab (not outdated Dashboard-only naming if specs already locked).

---

### Story P1-7 — Settings for companion control

**As** Michael,  
**I want** Settings to set equity override, see provider status, and lock growth mode for seed,  
**so that** I don’t edit source to run a real seed session.

**Acceptance criteria:**
- [ ] Equity override / seed profile control without code edit.
- [ ] Provider status chips (configured vs not) — honest, not fake LIVE.
- [ ] Growth mode lock visible at seed (cannot silently enable aggressive growth).

---

### Story P1-8 — Compare usable in UI

**As** Michael,  
**I want** Compare wired to existing `compareStrategies` engine,  
**so that** A vs B vs C decision support is usable, not a “being wired” stub.

**Acceptance criteria:**
- [ ] Compare page loads engine output for ≥2 candidate structures.
- [ ] No claim of full portfolio optimizer; personal decision support only.

---

### Story P1-9 — Saved analyses resume

**As** Michael,  
**I want** to save and resume yesterday’s analysis (local-first OK),  
**so that** I don’t re-key legs every session.

**Acceptance criteria:**
- [ ] Save analysis from Lab (localStorage acceptable for personal MVP).
- [ ] Saved list shows recent items; open restores legs/context for re-analyze.

---

### Story P2-10 — Personal education playbook surface

**As** Michael,  
**I want** education aligned to the $500 playbook (field manual already written),  
**so that** curriculum matches seed reality, not generic risk theater only.

**Acceptance criteria:**
- [ ] Education links or embeds personal curriculum path (`docs/empire/book/01-OPTIONS-EDUCATION-GUIDE.md` doctrine).
- [ ] No get-rich marketing chrome; brand: *See the trade. Trust the process. Own the decision.*

---

### Story P2-11 — Daily loss honesty

**As** Michael,  
**I want** daily P/L gate to show **unknown** when broker activity isn’t wired,  
**so that** I never get false confidence from `dailyRealizedPL: 0`.

**Acceptance criteria:**
- [ ] If activity API not wired, daily loss gate is **unknown / not claimed OK** — not silent green on zero.

---

## 2. Acceptance criteria for `SHIP_PERSONAL_MVP`

### Definition

`SHIP_PERSONAL_MVP` means: **Michael can use OptionScope daily to size, decide, execute (manual RH), and learn from outcomes** on a **$500–$5k path** — as a **personal paper companion** first. It does **not** mean “risk real $500 ladder on” or public multi-user ready.

Honest label after UI complete: **personal paper companion** until process-proof gate (§2.E).  
Upgrade to “use with real $500” only after process proof — **not** at first UI complete.

---

### 2.A Capital honesty (must all pass)

| # | Criterion | Evidence |
|---|-----------|----------|
| A1 | Seed preset **$500** (and $1k / $5k) selectable without editing source | UI + persisted profile |
| A2 | Demo fallback never implies $25k is “your” account without loud **DEMO** badge | Screenshot every equity surface |
| A3 | Strategies with 1-lot collateral/max loss > risk budget filtered or ranked last with **infeasible** coaching | Brain list + coach copy |
| A4 | Default seed preference: **defined-risk micro spreads**, not CSP mega-cap primary | Policy + ranking behavior |
| A5 | Unit test equity=500: feasible defined-risk case + CSP infeasible/rejected | `pnpm test` evidence |

---

### 2.B Decision → action loop same session (must all pass)

| # | Criterion | Evidence |
|---|-----------|----------|
| B1 | Load ticker → live chain → brain top 3 → Load in Lab with exact legs | Smoke path |
| B2 | Analyze → **OrderChecklistCard** with copy/print | Screenshot |
| B3 | Checklist: max loss, contracts, net limit, expiry, leg actions | Checklist content |
| B4 | **Zero** order placement buttons | Code + UI review |
| B5 | No RH password / unofficial API path | Security review |

---

### 2.C Overnight memory (must all pass)

| # | Criterion | Evidence |
|---|-----------|----------|
| C1 | Journal: open planned trade with write-once forecast | UI |
| C2 | Close with realized P/L; list last 20 | UI |
| C3 | Local-first acceptable if Supabase unset | Functional without cloud |
| C4 | Command: badges + equity/seed + gate status + brain pulse for focus symbol | Screenshot |

---

### 2.D Position awareness — minimal RH path (must all pass)

| # | Criterion | Evidence |
|---|-----------|----------|
| D1 | Paste or CSV import of open positions / recent fills | Import success on ≥1 official shape |
| D2 | Imported shares / open risk proxy available to gates | Gate behavior with import |
| D3 | Explicit “user-provided; not live broker sync” labeling | UI copy |

---

### 2.E Process proof (before treating as money brain / real seed)

| # | Criterion | Note |
|---|-----------|------|
| E1 | ≥ **20 paper** closed trades journaled with forecast vs outcome | **Post-ship usage gate**, not day-1 UI gate |
| E2 | Documented hit rate vs model PoP (honesty > fantasy) | Even if model wrong |
| E3 | No single trade risked > policy absolute max on seed | Journal audit |
| E4 | Written playbook: underlyings, max width, max debit, when to stand down | Personal doc |

**SHIP_PERSONAL_MVP stamp** requires **A–D** with evidence package.  
**Real $500 risk budget “ladder on”** additionally requires **E** + process adherence (≥70% fills with prior journal plan per master eval).

---

### 2.F Engineering hygiene

| # | Criterion |
|---|-----------|
| F1 | `pnpm test` (or `npm test`) green |
| F2 | Typecheck green |
| F3 | Smoke path documented: `.env.local` → Lab → brain → checklist |
| F4 | Reality Checker retest returns **`SHIP_PERSONAL_MVP`** or lists **explicit remaining blockers** only |

---

### Falsifiers (any one kills ship)

| Falsifier | Why |
|-----------|-----|
| Demo equity still defaults to **$25k** without forced DEMO labeling | Fantasy risk |
| Top rec is CSP/wheel with **0 contracts** and no infeasible coach | Brain theater |
| Cannot copy RH checklist from analyzed trade | Execution path dead |
| Journal cannot record forecast → outcome | No process memory |
| No way to inject RH positions | Blind to real book |
| LIVE badge while using demo chain/quotes | Trust death |
| Any path that places orders or asks for RH password | Doctrine fail |
| Growth sim only at $10k+ with no $500 fixtures | Ladder untested |
| daily P/L always 0 while claiming day gates protect | False safety |

---

### Evidence package required on Reality Checker retest

1. Screenshot: Trade Lab **$500** → brain list feasible micro **or** halt + coach  
2. Screenshot: OrderChecklistCard populated; copy works  
3. Screenshot: Journal ≥1 open + ≥1 closed **or** local-first proof  
4. Screenshot: RH CSV/paste → shares/open risk in gates  
5. Command: account strip + brain pulse + badges  
6. Test + typecheck pass output  
7. Unit test equity=500 fixture cases  
8. Optional for real-seed: 5-day paper ritual notes (feeds into E)

---

### Go / No-Go matrix (product decisions)

| Decision | At SHIP_PERSONAL_MVP | Condition to flip further |
|----------|----------------------|---------------------------|
| Use brain for education + paper analysis | **GO** (already) | Always with disclaimers |
| Trust demo/$100k paper sizing for $500 life | **NO-GO** until seed mode | A1–A5 |
| Daily driver **paper** companion | **GO only if A–D** | Evidence package |
| Risk real $500 toward ladder | **NO-GO** until E + ≥70% plan adherence | Process proof |
| Public product / multi-user | **HARD NO-GO** | Real profits + process (empire doctrine) |
| LM Studio options chat | **PARKED** | After companion MVP |

---

## 3. Explicit non-goals

### This sprint / SHIP_PERSONAL_MVP scope

| Non-goal | Why deferred |
|----------|--------------|
| **Auto-trading** / broker order placement | Hard law — human owns the button |
| **Public multi-tenant SaaS** | Profits first, product second |
| **Unofficial Robinhood login / OAuth reverse-engineer** | Security APPROVED path is CSV/paste only |
| **Guaranteeing 10× / $500→$5k returns** | Ladder is lagging hope; process metrics gate, not P&L promises |
| **CSP / wheel as seed default** | Capital physics: CSP on blue chips usually unfundable at $500 |
| **Default aggressive growth at seed** | Empire policy — never at seed |
| **LM Studio local companion chat** | Parked until after ~95% companion MVP |
| **Backtest vanity / more PDF ingest perfection** | Does not close money loop |
| **Compare polish beyond engine wire (P1)** | Secondary dignity, not daily-driver blocker if A–D complete |
| **Marketing site / get-rich neon brand** | Brand locked calm cockpit |
| **Third-party personalized investment advice** | Educational companion only |
| **Live RH continuous sync** | Import is user-provided snapshot |
| **Treating equity 10× as Week-1 ship metric** | Explicitly lagging; not a UI acceptance gate |
| **dailyRealizedPL full Alpaca activity (P2 polish)** | Prefer honest “unknown” over false zero-green for ship |

### Not solved by this MVP

- $500 → $25k pure-options 12-month base case (master eval: multi-year + discipline + no blow-up)  
- Replacing judgment with model PoP/EV (estimates only)  
- Making undefined-risk / naked selling a seed business model  

---

## 4. Priority ranking — companion gaps

Ordered by empire “will this protect/grow capital in daily practice?” (sources: master eval blockers, reality-check sprint order, superagent gap list).

### P0 — Ship blockers (daily driver money loop)

| Rank | Gap | User story | Why P0 |
|------|-----|------------|--------|
| **P0.1** | **Seed capital mode** — real $500/$1k/$5k profile used by sizing | P0-1 | Brain currently thinks demo $25k / paper ~$100k |
| **P0.2** | **Empire / seed policy** + **zero-size coach** + micro defined-risk allowlist | P0-2 | Silent 0 contracts + CSP ranking kills trust and capital |
| **P0.3** | **Order checklist wired** into Trade Lab as primary CTA | P0-3 | Orphaned card = execution theater |
| **P0.4** | **Journal product UI** (local-first OK) plan → open → close | P0-4 | No closed-loop memory → no process edge |
| **P0.5** | **RH import surface** CSV/paste (one official shape) | P0-5 | Companion blind to real RH book |
| **P0.6** | **Command Center ritual** — account strip, brain pulse, LIVE/PAPER/DEMO badges | P0-6 | Morning ritual is chart shell only today |

**P0 exit:** All §2.A–D acceptance rows true with evidence; tests green; no falsifier.

---

### P1 — High (stalls money process if forced daily use without them)

| Rank | Gap | User story | Why P1 |
|------|-----|------------|--------|
| **P1.1** | **Settings** equity override, provider chips, growth mode lock | P1-7 | Companion control without code edits |
| **P1.2** | **Saved trades** beyond stub | P1-9 | Resume analysis; session dignity |
| **P1.3** | **Compare UI** wired to engine | P1-8 | Decision support A vs B vs C |
| **P1.4** | **Fix list panel** from RH/journal process misses | P0-4 extension | “What to fix” without advice theater |
| **P1.5** | Nav/copy Command · Trade Lab muscle memory polish | P0-6 adjacent | Spec lag, not logic |

**P1 exit:** Settings + save/resume reliable; Compare usable; fix-list v1 optional if journal tags process misses.

---

### P2 — Medium / later (quality, honesty, education)

| Rank | Gap | User story | Why P2 |
|------|-----|------------|--------|
| **P2.1** | Personal education curriculum in-app | P2-10 | Books exist; UI is generic risk theater |
| **P2.2** | `dailyRealizedPL` from activity **or** gate shows unknown | P2-11 | False DAILY_LOSS_OK |
| **P2.3** | Shell/design fidelity (`max-w-4xl`, mock parity) | — | Specs ahead of app; not money-loop blocker |
| **P2.4** | Full calibration dashboards (Phase 7 style) | — | Needs ≥20 journaled closes first |
| **P2.5** | LM Studio options-obsessed companion | — | Parked by doctrine |

**Explicit deprioritize forever-this-sprint:** public SaaS chrome, unofficial RH, auto-trade, return guarantees, backtest vanity.

---

### Mapping to 30-day empire weeks (master eval)

| Week | Focus | P-level |
|------|--------|---------|
| Week 1 — Truth about capital | Seed profile, EmpirePolicy, zero-size coach, checklist wire | **P0.1–P0.3** |
| Week 2 — Memory | Journal MVP, RH import, fix list | **P0.4–P0.5**, P1.4 |
| Week 3 — Ritual | Command Center strip / pulse / badges | **P0.6** |
| Week 4 — Proof | N planned paper trades, adherence ≥70%, retest | **§2.E + Reality Checker** |

---

## 5. Success metrics — first 14 days of personal use

**Scope:** Process metrics only. **No return guarantees.** Equity 10× is lagging hope — not a 14-day gate.

### 5.1 Primary process metrics (14-day window)

| Metric | Definition | 14-day target | How measured |
|--------|------------|---------------|--------------|
| **Pre-broker ritual** | Trading days where OptionScope opened **before** RH | ≥ **80%** of trading days | Self-log or ritual checklist |
| **Plan before fill** | Fills (paper or tiny seed) with a **prior** journal plan | ≥ **70%** | Journal timestamp &lt; fill time |
| **Undefined-risk trades** | Naked / undefined risk as executed structure | **0** | Journal + policy audit |
| **Size within empire policy** | Sized ≤ seed hard caps (1% trade / open risk budget) | ≥ **90%** of planned trades | Journal size vs equity |
| **Checklist used** | Analyzed trades where RH checklist was copied/used | ≥ **70%** of Lab analyzes that led to a fill attempt | Self-log / habit |
| **Journal completeness** | Closed paper trades with forecast + outcome both filled | ≥ **10** closed entries by day 14 (path to 20 for real-seed) | Journal count |
| **Seed honesty sessions** | Sessions run under seed $500/$1k/$5k or explicit PAPER — not silent demo | **100%** of money-relevant sessions | Badge + profile audit |
| **Rule-break / blow-up halt** | Days with policy breach or account-ending error | Track; goal = **never** | Journal + equity path |
| **Infeasible coach encounters** | Times zero-size/infeasible coach shown and Michael did **not** force CSP fantasy | Qualitative: coach used ≥1× in first week | Session notes |

### 5.2 Lagging / do-not-gate (observe only)

| Metric | 14-day treatment |
|--------|------------------|
| Account equity / P&L | **Observe only** — not ship or success gate |
| Model PoP vs hit rate | Start logging; **no pass/fail** at day 14 |
| $500 → $5k progress | **Out of window** — multi-period process proof |

### 5.3 Ritual definition (what “used the product” means)

A **valid companion day** requires:

1. Command: see badges + equity truth  
2. Lab: chain + brain under **seed/paper** profile  
3. Checklist copied if a trade is considered  
4. Journal plan written **before** any fill  
5. Close/update journal when position ends (same day or next open)

### 5.4 14-day review questions (PM + Michael)

1. Did seed mode stop me from taking unfundable CSPs?  
2. Did checklist reduce execution mistakes vs freestyle RH?  
3. Did journal catch “no plan” or “oversized” process misses?  
4. Did RH import change any “duplicate risk / already hold” decisions?  
5. What is the single biggest remaining friction for Week 3–4?

### 5.5 Exit criteria from 14-day personal pilot

| Outcome | Condition |
|---------|-----------|
| **Continue paper companion** | Process metrics mostly on track; no falsifier regressions |
| **Extend paper only** | &lt;70% plan-before-fill or journal &lt;10 closes — **do not** open real $500 risk budget |
| **Consider real seed (tiny)** | Toward **§2.E** (aim 20 closes, ≥70% adherence, 0 undefined risk) — **not automatic at day 14** |
| **Product regression** | Any falsifier returns → Reality Checker **NEEDS_WORK**; fix before process credit |

---

## 6. Stakeholder alignment

| Role | Responsibility for this doc |
|------|------------------------------|
| PM (Alex) | Acceptance ownership; say no to scope outside P0 |
| Superagent | Gate sequence; refuse fantasy ship stamps |
| Architect / Backend / Frontend | Implement P0.1–P0.6 only until A–D green |
| Finance | Validate $500 physics on seed policy numbers |
| Security | RH CSV/paste threat model; reject password paths |
| Reality Checker | Sole authority to stamp `SHIP_PERSONAL_MVP` vs `NEEDS_WORK` |
| Michael | Sole user; runs 14-day process metrics; owns broker button |

---

## 7. Recommended next agent actions

1. **`product-sprint-prioritizer`** — convert P0 table into ordered sprint backlog with effort t-shirts.  
2. **`engineering-software-architect`** — SeedAccountProfile + EmpirePolicy + RH import + ritual architecture.  
3. **`engineering-backend-architect`** + **`engineering-frontend-developer`** — implement P0.1–P0.6.  
4. **`finance-financial-analyst`** — validate seed risk tables against size fixtures.  
5. **`security-architect`** — RH import guardrails on the implemented path.  
6. **`testing-evidence-collector`** + **`testing-reality-checker`** — evidence package → stamp or blockers.

---

## 8. Operating oath (acceptance-linked)

1. **Clarity before capital** — no naked undefined risk as default.  
2. **Process before prediction** — journal is empire memory.  
3. **Human owns the button** — companion never places the trade.  
4. **Truth about account size** — never let $25k demo lie to a $500 warrior.  
5. **Profits first, product second** — no public launch until ladder process is real.  
6. **See · Trust · Own** — every session.

---

_Educational tooling only — not investment advice. Manual execution only. `SHIP_PERSONAL_MVP` certifies the **survival cockpit loop**, not returns._
