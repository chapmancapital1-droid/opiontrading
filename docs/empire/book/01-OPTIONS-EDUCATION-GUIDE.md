# OptionScope Field Manual — Options Education for Michael

**Classification:** Personal companion education only  
**Owner:** Michael Chapman · NerdCommand / Chapman Capital  
**Product:** OptionScope — educational second brain & risk cockpit  
**Doctrine:** Long live the empire — capital first, process over prediction  
**Tagline:** *See the trade. Trust the process. Own the decision.*  
**Date:** 2026-07-12  

---

## 0. Who this is for (and who it is not)

This guide is written for **you, Michael** — one trader building an empire carefully. It is not a public course, not a signal service, and not personalized investment advice to third parties.

OptionScope exists so you never fill the gap between curiosity and capital with hope, hype, or half-remembered clips. It ranks structures, surfaces **model estimates** with honest assumptions, sizes against paper equity, and ships a **Robinhood checklist you still own**.

**Hard laws (never negotiate these with yourself):**

1. Educational companion — you press the button in Robinhood.  
2. No auto-trade. No Robinhood password. No “one-click enter.”  
3. Model PoP / EV / Monte Carlo are **estimates under assumptions**, not oracles.  
4. Delta is a **sensitivity**, never Probability of Profit.  
5. Small-account reality: many textbook structures need more capital than Seed stage allows.  
6. Public SaaS later — only after real-life process and profits validate the path.  

**Footer stance (always calm, never shame):**  
*For education and analysis only. Not investment advice. Not affiliated with or endorsed by Robinhood. Verify every order before entry.*

---

## 1. Empire capital ladder — the only scoreboard that matters

You are not “beating the market today.” You are climbing a capital ladder without blowing the rungs.

| Phase | Equity target | Intent | Default posture |
|-------|---------------|--------|-----------------|
| **Seed** | **$500** | Survive. Learn process. Avoid blow-up. | Paper first; live only with micro defined-risk or no live options until process is boring. |
| **Stage 1** | **$500 → $5,000** (10×) | Proof of process under small-account constraints. | Defined-risk only as default; journal every fill; size for survival. |
| **Stage 2** | **$5,000 → $25,000** (5×) | Scale income engines + selective growth. | Same rules, larger tickets within risk budget; never “feel rich → size up.” |

### 1.1 $500 options reality (read twice)

Cash-secured puts and covered calls are **capital hogs** relative to a Seed account:

- Cash-secured put (CSP) on a **$200** stock ≈ **$20,000** cash locked per short put (100 shares × $200).  
- Covered call needs **100 shares** of the underlying first.  
- Naked short calls/puts are **undefined risk** and are blocked as a default companion path for good reason.

**Design implication for Seed / early Stage 1:**

- Prefer **defined-risk verticals** (and paper rehearsal of larger structures).  
- Prefer **paper equity + OptionScope** until your ritual is automatic.  
- Prefer **smaller underlyings** only if liquidity, spreads, and assignment math still make sense — never force a structure that needs capital you do not have.  
- If a structure’s collateral exceeds risk budget: **size 0 / do not enter**. Capital waits.

### 1.2 What “growing the empire” actually means

| Does count | Does not count |
|------------|----------------|
| Surviving drawdowns with process intact | One lucky YOLO that doubles equity |
| Forecast vs outcome calibration improving | “I called the direction” theater |
| Checklist discipline under boredom | Skipping checklist when “sure” |
| Paper → live only after boring competence | Live revenge trades after a loss |
| Risk budget respected when Brain says halt | Overriding halt because FOMO |

---

## 2. Options in plain English (war-room vocabulary)

### 2.1 Calls and puts

| Contract | Buyer’s right | Seller’s obligation |
|----------|---------------|---------------------|
| **Call** | Right to **buy** 100 shares at the strike by expiration | Obligation to **sell** 100 shares at the strike if assigned |
| **Put** | Right to **sell** 100 shares at the strike by expiration | Obligation to **buy** 100 shares at the strike if assigned |

- One standard equity option = control over **100 shares** (multiplier 100).  
- You **pay premium** as a buyer; you **receive premium** as a seller — and you take the other side’s risk.  
- **Assignment risk** exists whenever you are short an option that finishes (or is exercised) in-the-money. Plan for it; do not outsource it to hope.

### 2.2 Long vs short

| Position | You… | Typical capital profile | Risk shape |
|----------|------|------------------------|------------|
| **Long option** | Buy call or put | Debit (premium paid) | Max loss ≈ premium paid (defined for single long) |
| **Short option** | Sell call or put | Credit (premium received) | Can be **undefined / large** if naked |

Companion rule of thumb: **long and defined-risk spreads first**. Naked short as a *default* empire tool is how Seed accounts die.

### 2.3 Vertical spreads (your workhorse at small size)

A **vertical** = same expiration, same type (calls or puts), **two strikes**, opposite long/short.

| Structure | Legs (concept) | Bias | Max loss | Max profit |
|-----------|----------------|------|----------|------------|
| **Bull call debit** | Long lower call + short higher call | Bullish | Net debit | Width − debit |
| **Bear put debit** | Long higher put + short lower put | Bearish | Net debit | Width − debit |
| **Bull put credit** | Short higher put + long lower put | Mild bullish / neutral-bull | Width − credit | Net credit |
| **Bear call credit** | Short lower call + long higher call | Mild bearish / neutral-bear | Width − credit | Net credit |

**Why verticals fit the ladder:**

- Max loss is **visible** before you touch Robinhood.  
- Collateral/margin is usually **the width of the spread**, not full stock notional.  
- OptionScope can show payoff, break-evens, Greeks, and **model** PoP/EV without pretending certainty.

### 2.4 Cash-secured put (CSP) and covered call (CC)

| Structure | What you do | Capital need | Empire note |
|-----------|-------------|--------------|-------------|
| **CSP** | Short put; cash reserved to buy 100 shares at strike | ≈ strike × 100 | Income + possible stock acquisition; often **too big** for Seed |
| **CC** | Long 100 shares + short call | Cost of 100 shares | Income on stock you own; not free money; caps upside |

**Wheel (high level):** sell CSP → if assigned, sell CC on the shares → if called away, repeat. The wheel is a **campaign**, not a magic machine. Journal each leg. Track cash events honestly.

### 2.5 Iron condor (high level)

**Iron condor** = short OTM put vertical + short OTM call vertical, same expiration.

- Goal: stock stays between short strikes; you keep premium.  
- Risk: defined (width of wings − net credit) if structured correctly.  
- Needs enough credit, width, and **liquidity**; event risk (earnings) can wreck the thesis.  
- Two break-evens; max profit is the **net credit** (roughly).  

Use iron condors when account size, IV context, and risk budget all clear — not because a video said “income.”

### 2.6 Strategy posture by ladder stage (defaults, not laws of nature)

| Stage | Default toolkit | Avoid as default |
|-------|-----------------|------------------|
| Seed ($500) | Paper full toolkit; live only micro defined-risk if any | Naked shorts, CSP on high-priced names, oversized CC |
| Stage 1 ($500→$5k) | Debit/credit verticals; selective small campaigns on paper→live | Undefined risk “because IV is high” |
| Stage 2 ($5k→$25k) | Verticals + carefully sized CSP/CC/condor where capital fits | Ego size; skipping halt gates |

---

## 3. Greeks — cockpit instruments, not fortune cookies

Greeks measure **how the model price changes** when inputs move. They are sensitivities under assumptions (vol, rates, time, price). They are **not** destiny.

| Greek | Plain English | Empire use |
|-------|---------------|------------|
| **Delta** | Roughly how much the option price moves when the underlying moves $1 (per share of option; ×100 for contract $) | Directional exposure; hedge intuition; **not** win probability |
| **Gamma** | How fast delta changes as price moves | Near expiration / ATM: gamma bites; small moves change risk shape fast |
| **Theta** | Time decay — option value change as one day passes (model) | Long options often pay theta; short options often collect it — **if** price stays cooperative |
| **Vega** | Sensitivity to implied volatility | Long options like IV up; short options like IV down — context matters (earnings IV crush) |
| **Rho** | Sensitivity to interest rates | Usually secondary for short-dated equity options; still labeled when relevant |

### 3.1 The non-negotiable myth kill: Delta ≠ PoP

- **Delta ≈ 0.30** does **not** mean “30% chance of profit.”  
- Probability of profit is a **path / distribution question** that depends on structure (long call ≠ short put ≠ iron condor), entry prices, fees, and model assumptions.  
- OptionScope reports **model PoP** from valuation / Monte Carlo under stated assumptions — always read the label **MODEL EST.**  
- Never size a trade because “delta says I’m right.”

### 3.2 How to read Greeks in Trade Lab

1. Build or **Load** the structure.  
2. Read **max loss / undefined risk** first.  
3. Read break-evens and payoff shape.  
4. Then Greeks for *exposure story* (what hurts if price jumps / vol expands / time passes).  
5. Then model PoP / EV — as **estimates**, paired with size cap.

---

## 4. Risk of ruin — why process beats prediction

**Risk of ruin** is the probability that a sequence of losses drives you out of the game (account too small to trade your plan, or psychologically broken).

You do not need a PhD formula to respect it:

- **Size** so a single defined-risk loss is a small slice of equity, not a ladder reset.  
- **Correlated bets** (five bullish structures on the same sector) can act like one big bet.  
- **Undefined risk** can make max loss theoretical until the market invents a worse number.  
- **Revenge trading** after a loss is how Seed becomes zero.  

### 4.1 Prediction is optional. Process is not.

| Prediction mindset | Process mindset |
|--------------------|-----------------|
| “I know where price goes” | “I know max loss if I’m wrong” |
| Hides size under confidence | Size from equity + gates + max loss |
| Skips checklist when “obvious” | Checklist is non-optional ritual |
| Journal only winners | Forecast snapshot every serious idea |
| Overrides halt because “setup is gold” | Halt means capital waits; study still allowed |

**OptionScope’s job:** make process visible and boring.  
**Your job:** own the decision and the button.

### 4.2 Risk budget language (use this with yourself)

- **Risk budget remaining** — how much more defined loss you can absorb under your rules.  
- **Size 0** — brain / policy says no capital for this structure today. Not an insult. A survival feature.  
- **Halt** — new risk pauses; analysis may continue. Educational rule, not a brokerage lockout.  
- **Liquidity gate** — wide markets and thin open interest are how “good theses” become bad fills.

---

## 5. How to use OptionScope daily — the ritual

Primary mental model (locked):

> **Command → Trade Lab → Checklist → Journal**

Pillars map:

| Pillar | Product surface | Feeling target |
|--------|-----------------|----------------|
| *See the trade* | Command Center | Oriented, not overwhelmed |
| *Trust the process* | Trade Lab + Brain | Curious, selective, sober |
| *Own the decision* | Checklist + Journal | Ready, deliberate, accountable |

### 5.1 Morning — Command Center (`/dashboard`)

**Job:** Calm scan. Equity truth. Context. Brain pulse. Then deep work in Lab.

1. Open OptionScope. Confirm shell badges: **LIVE · PAPER · DEMO** (never mix modes without reading labels).  
2. **Account strip** — paper equity, cash, buying power, risk budget, open option risk.  
3. Focus symbol — market snapshot (spot, ATM IV, expiry, events).  
4. **Market context** tiles — regime / IV / trend / liquidity / events as **context**, not “buy now.”  
5. **NCI TA bias** (if present) — labeled context only; never a green BUY button.  
6. **Brain pulse** — top ranked structures **or** Halt coach.  
7. If something earns attention: **Explain** (optional) → **Load in Lab**.  
8. If halt: read the coach. You may still study. You do not force size.

**Exit criteria:** You know whether today is “analyze and maybe checklist” or “observe and journal.” Heart rate lower than when you opened Twitter.

### 5.2 Work block — Trade Lab (`/builder`)

**Job:** Single trade dignity — structure → truth → checklist.

1. Symbol + expiry; confirm data badge (LIVE vs DEMO).  
2. Brain panel: gates (account · NCI · context confidence · risk budget).  
3. Rank cards: score, engine role (income / growth), contracts, **max loss**, model PoP/EV labeled.  
4. **Explain (AI)** — plain language + catalog citations. Education, not “AI says buy.”  
5. **Load in Lab** — legs pinned; inspect every strike / right / side / qty.  
6. **Analyze** — payoff, break-evens, Greeks, Monte Carlo model estimates.  
7. If undefined max loss shows **UNDEFINED** — treat as a hard truth, not a UI bug.  
8. Adjust only with a reason; re-analyze.  
9. **Copy checklist** when ready. Optional: **Save**, **Compare**, **Journal** later.

### 5.3 Execution — Order checklist → Robinhood (manual)

1. Copy checklist from OptionScope.  
2. Open Robinhood **separately**.  
3. Rebuild each leg carefully: symbol, expiration, strike, call/put, buy/sell, quantity, limit price philosophy.  
4. Verify **net debit/credit** and **max loss** match what you analyzed (fills move; do not pretend).  
5. Enter only if the live ticket still fits risk budget.  
6. If anything disagrees: cancel the fantasy, return to Lab.

**Dignity rule:** The emotional peak is *checklist ready*, not *order submitted*.

### 5.4 After the trade — Journal calibration (`/journal`)

1. Log open fill with **forecast snapshot** (model PoP/EV, structure, thesis) — write-once honesty.  
2. On close: realized P&L, exit reason, emotion tag (calm / rushed / FOMO) without shame palette.  
3. Score: forecast vs outcome — aligned / optimistic / pessimistic.  
4. Weekly: read calibration strip. Improve process, not ego.

### 5.5 Weekly / as needed surfaces

| Surface | When |
|---------|------|
| **Compare** | Two or three structures compete for the same capital |
| **Saved** | Resume an idea; rebuild checklist without rewriting memory |
| **Settings** | Provider health, theme, account mode honesty (keys never in browser theater) |
| **Education** | Refresh model literacy, OCC risk, manual philosophy |

---

## 6. Robinhood manual discipline (companion rules)

OptionScope is **where you decide**. Robinhood is **where you enter**. Not affiliated. Not endorsed.

### 6.1 Non-negotiables

- No unofficial reverse-engineered Robinhood login.  
- No password in OptionScope.  
- No auto-send orders.  
- RH account visibility = **manual export / CSV / paste** first generation — flag what was done; fix process.  
- Checklist is copyable / printable only.  

### 6.2 Pre-ticket discipline (say it out loud)

1. What is my **max loss in dollars**?  
2. What **% of equity** is that?  
3. What event is inside the DTE window?  
4. Is data **LIVE** or **DEMO**? Is account **PAPER** or live cash?  
5. Did Brain **halt** or **size 0** for a reason I am about to ignore?  
6. Can I explain the structure in one sentence without jargon?

If any answer is mush: **do not enter**.

### 6.3 Fill and management hygiene

- Prefer limit logic you understand; do not market-panic multi-leg.  
- After fill, snapshot reality into journal (actual credits/debits differ from mid).  
- Rolling is a **new decision** with new max loss — analyze in Lab, don’t “fix” on hope.  
- Wheel / campaign cash events: ledger honesty (do not double-count glory).

---

## 7. Reading the brain without worshiping it

The trading brain ranks and sizes with rules, context, library knowledge, and account state. It is a **second brain**, not a second ego.

| Brain does | Brain does not |
|------------|----------------|
| Filter structures that fail gates | Guarantee profit |
| Score candidates under policy | Replace your judgment |
| Suggest size vs paper equity / risk budget | Place the order |
| Cite book/catalog context in Explain | Invent live fills |
| Halt when rules say capital waits | Shame you for losses |

**When Brain and gut disagree:** write both in the journal. Often the disagreement is “I want action” vs “process says wait.” Prefer process until Stage 2 process is boring.

---

## 8. Model literacy — honesty is a feature

### 8.1 What “model estimate” means

Black-Scholes, binomial trees, and Monte Carlo paths are **maps**. Markets are **terrain**.

- **PoP** — share of simulated or model scenarios that finish profitable under assumptions (vol, rates, no jumps, etc.).  
- **EV** — average outcome across those scenarios — still a model number.  
- **CI / percentiles** — uncertainty bands; use them; do not round to fake certainty.  
- Seeds and path counts matter for MC stability; methodology lives in product docs.

### 8.2 Assumptions that bite in real life

- Implied vol changes (earnings crush / expansion).  
- Gaps overnight.  
- Early exercise (American options — binomial path exists for a reason).  
- Wide bid/ask: your “theoretical edge” dies in the spread.  
- Fees and assignment.

### 8.3 Calibration closes the loop

The journal’s job is to ask: *When model PoP was ~60%, how often did I actually win?*  
If reality diverges, fix **process and selection** — do not blame “the AI” or inflate stories.

---

## 9. Data badges — never trade on unlabeled fog

| Badge | Meaning |
|-------|---------|
| **LIVE** | Real provider quotes / chain |
| **DEMO** | Demo or fallback data — study only for live decisions |
| **PAPER** | Alpaca (or similar) paper equity driving size |
| **LIVE ACCT** | Live account mode visible — still **no** in-app Place Trade |
| **MODEL EST.** | Probabilistic metric is not a promise |
| **HALT** | Risk gates pause new risk posture |
| **STALE** | Refresh before you trust the number |

Example truth string: `LIVE · PAPER` = live chain, paper sizing.  
`DEMO · PAPER` = practice cockpit, not a live ticket basis.

---

## 10. Halt coach — when capital waits

Halt is not a broken app. Halt is the empire protecting the ladder.

**Pattern to internalize:**

> **Pause on new risk.**  
> {reason in plain language}.  
> You can still study structures and run models. Capital sizing stays capped until gates clear.  
> *Educational rules — not a brokerage lockout.*

Common gate themes: size / max loss vs equity, liquidity, event risk, account mode, undefined risk policy, daily risk budget.

**Allowed under halt:** analyze, learn, compare educationally, journal.  
**Not allowed as empire default:** “I’ll just take half size of undefined risk because I feel fine.”

---

## 11. Field checklist — single page

### Before market open

- [ ] Equity and risk budget known (Command account strip)  
- [ ] Data badges read (LIVE / DEMO / PAPER)  
- [ ] Focus list symbols, not infinite scroll  
- [ ] Emotional state: calm enough for process (if not — observe only)

### Before any Robinhood entry

- [ ] Structure loaded in Trade Lab  
- [ ] Max loss / UNDEFINED read first  
- [ ] Break-evens known  
- [ ] Model PoP/EV read **as estimates**  
- [ ] Delta not confused with PoP  
- [ ] Explain or self-explain in one sentence  
- [ ] Checklist copied  
- [ ] Ticket matches checklist leg-by-leg  
- [ ] Size fits ladder stage and risk budget  

### After close

- [ ] Journal outcome vs forecast  
- [ ] Note process break (if any) without self-abuse  
- [ ] Update campaign ledger if wheel/roll  

---

## 12. Glossary (quick reference)

| Term | Meaning |
|------|---------|
| **ATM / ITM / OTM** | At / in / out of the money relative to spot vs strike |
| **BE** | Break-even underlying price(s) at expiration (approx; fees matter) |
| **Collateral** | Cash/shares reserved for short premium structures |
| **Credit / Debit** | Net cash in / out at open |
| **DTE** | Days to expiration |
| **Defined risk** | Max loss known and capped by structure (e.g. vertical) |
| **Undefined risk** | Loss can grow beyond a comfortable known cap (e.g. naked short) |
| **IV** | Implied volatility priced into options |
| **Legs** | Individual option (or stock) pieces of a structure |
| **Multi-leg** | Structure with more than one option/stock component |
| **OCC** | Options Clearing Corporation — standardized options risk education |
| **Payoff diagram** | P&L vs underlying at expiration (or path if modeled) |
| **Vertical** | Same expiry spread across two strikes |

---

## 13. Personal oath (optional, useful)

1. I will not confuse a model number with a promise.  
2. I will not confuse delta with probability of profit.  
3. I will not sell naked undefined risk as my Seed-stage personality.  
4. I will not skip the checklist when I feel sure.  
5. I will halt when the cockpit says halt.  
6. I will journal forecast vs outcome so ego cannot rewrite history.  
7. I will grow **$500 → $5k → $25k** by surviving first.  
8. I will press the button myself — or not at all.

---

## 14. Disclaimers (permanent)

- This document is **personal education for Michael Chapman** in support of OptionScope as a private empire companion.  
- It is **not** investment advice, a solicitation, or a recommendation to buy/sell any security or option.  
- Options involve substantial risk and are not suitable for all persons. You can lose more than intended, especially with short and multi-leg strategies; some losses can be large or theoretically unlimited on undefined-risk positions.  
- **Not affiliated with or endorsed by Robinhood Markets, Inc.** or any broker.  
- Market data may be delayed, demo, or paper. Always verify orders on the broker ticket.  
- Past process success does not guarantee future results.  
- No warranty. Authors and builders are not liable for trading losses.  

**OCC:** Read standardized options risk disclosures from the Options Clearing Corporation and your broker before trading options.

---

## 15. Where to go next in the book

| Chapter | Purpose |
|---------|---------|
| **02 — Feature Graphics Prompt Book** | Production-ready image prompts for every major OptionScope surface (educational graphics) |
| **Product Education route** | In-app `/education` — model literacy + disclosures beside competence |
| **Methodology docs** | Deeper payoff, MC, calibration math when you want the engine room |

---

**Field manual status:** ACTIVE for personal use  
**Voice:** Peer coach · calm cockpit · NerdCommand ambition under fintech restraint  
**End of chapter 01**
