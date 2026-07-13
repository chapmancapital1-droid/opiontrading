# Capital Path Realism — $500 → $5,000 → $25,000

**Document:** `02-capital-path-realism.md`  
**Author:** Morgan (Financial Analyst / empire capital path)  
**Date:** 2026-07-12  
**Classification:** Michael Chapman personal use only — company survival capital  
**Related:** `00-PERSONAL-COMPANION-BRIEF.md`, `src/knowledge/portfolioPolicy.ts`, `src/brain/portfolio.ts`  
**Version:** 1.0.0

---

## Executive verdict (read this first)

**The ladder is mathematically possible and process-plausible only under harsh constraints. It is not a “skill will 10× me” story. It is a “survive long enough to compound defined-risk edge while not oversizing” story.**

| Leg | Multiple | Realistic if… | Most common death mode |
|-----|----------|---------------|------------------------|
| $500 → $5,000 | **10×** | 18–36+ months, micro defined-risk, paper-proven process first, deposits may be required | Over-leverage / lottery tickets / undefined risk / revenge size |
| $5,000 → $25,000 | **5×** | 12–30 months after Stage 1, income structures become viable, still strict risk | Scaling size before edge is proven; cash-secured traps; correlation blowups |

**Harsh truth:** At **$500**, options are a **training + micro-edge** environment, not a wealth engine. A single 1-lot long option that goes to zero can erase **10–40%+** of the account. Selling cash-secured puts on most liquid names is **structurally impossible** without deposits far larger than seed. The empire survives by **not dying at $500**, not by “crushing” $500.

**Company-survival framing:** Treat the first $5k of *real* P/L as **existence capital for NerdCommand**, not lifestyle money and not SaaS marketing budget. If process is not proven on paper + small live, **do not** treat OptionScope as validated for public release.

---

## 1. Mathematical framing

### 1.1 Returns required (compound math)

Required compound return from equity A to B:

\[
R = \left(\frac{B}{A}\right)^{1/n} - 1
\]

where \(n\) = number of compounding periods (years or trade-cycles; we use years for clarity).

#### Leg A: $500 → $5,000 (10×)

| Horizon | CAGR required | Monthly compound (approx) | Commentary |
|---------|---------------|---------------------------|------------|
| 6 months | ~**900%+** annualized | ~**47%/mo** | Fantasy for *process* trading; lottery territory |
| 12 months | **900%** | ~**21%/mo** | Not a base case; requires extreme edge + luck |
| 18 months | ~**370%** | ~**13%/mo** | Still aggressive; survivable only with tiny size + high hit quality |
| 24 months | ~**216%** | ~**10%/mo** | Aggressive but *conceivable* with skill + favorable regimes |
| 36 months | ~**115%** | ~**6.5%/mo** | More honest “process path” if edge is real |

**Net of deposits:** If Michael adds **$200–500/mo** of fresh capital while trading small, time-to-$5k falls dramatically and **ruin risk drops**. Pure trading 10× from $500 without deposits is the hard mode; **hybrid (deposit + edge)** is the rational empire mode.

#### Leg B: $5,000 → $25,000 (5×)

| Horizon | CAGR required | Monthly compound (approx) | Commentary |
|---------|---------------|---------------------------|------------|
| 12 months | **400%** | ~**14%/mo** | Stretch; needs strong edge and/or favorable vol regime |
| 18 months | ~**185%** | ~**9%/mo** | Aggressive professional-grade stretch |
| 24 months | ~**124%** | ~**6.9%/mo** | Ambitious but more process-aligned |
| 36 months | ~**71%** | ~**4.6%/mo** | Credible if Stage 1 process is real |

#### Combined $500 → $25,000 (50×)

| Horizon | CAGR required | Reality check |
|---------|---------------|---------------|
| 24 months | ~**607%** | Not a planning assumption |
| 36 months | ~**268%** | Still heroic |
| 48–60 months | ~**120–150%** → **~85–100%** | Still hard; **plausible only** with deposits + process + no blow-up |

**So what:** Plan the **process path** on **2–4 years** for the full ladder, or accept that **external capital infusions** (income → account) are part of Stage 1. Marketing “10× in 90 days” as the empire path is how the company dies.

### 1.2 Trade-level math: what a 1% risk budget actually buys

Using portfolio policy language:

| Equity | 0.5% risk | 1.0% risk | 1.5% risk | 2.0% risk | 5% hard gate (`absoluteMaxLossPct`) |
|--------|-----------|-----------|-----------|-----------|--------------------------------------|
| **$500** | **$2.50** | **$5.00** | **$7.50** | **$10.00** | **$25.00** |
| **$5,000** | **$25** | **$50** | **$75** | **$100** | **$250** |
| **$25,000** | **$125** | **$250** | **$375** | **$500** | **$1,250** |

**Robinhood / options microstructure reality:**

- Options trade in **100-share lots**. Minimum is **1 contract**.
- Many liquid long calls/puts have premiums of **$0.50–$5.00** → **$50–$500** risk if held to worthless.
- At **$500 equity**, a **$50** premium = **10% of account** on a *single* long option — **5–20×** the “balanced” 1% risk target.
- Therefore: **at $500, true 0.5–1% risk per trade is often impossible** for 1-lot premium products. The account is forced into either:
  1. **Accepting oversized risk** on rare, carefully chosen micro trades, or  
  2. **Not trading live** until paper process is clean and/or equity is higher, or  
  3. **Ultra-cheap options** (high probability of total loss) — often negative EV noise.

**Empire implication:** Stage Seed is primarily a **survival + education + paper→micro-live** phase. Pretending 1% risk sizing “just works” at $500 without checking max loss per contract is a modeling lie.

### 1.3 Risk of ruin at $500 (qualitative + order-of-magnitude)

**Ruin** here = equity drawdown that ends the trading program (practically: **−50% to −100%**, or repeated hits that force “stop forever / quit process”).

Assume simplified independent trades, risk \(f\) of equity per loss, win rate \(p\), payoff ratio \(b\) (win $b for every $1 risked).

Kelly fraction (upper bound, not a target):

\[
f^* = p - \frac{1-p}{b}
\]

| Edge profile | Win rate \(p\) | Payoff \(b\) | Kelly \(f^*\) | Ruin tendency if size \(f = 10\%+\) |
|--------------|----------------|--------------|---------------|-------------------------------------|
| Coin flip long premium | 45% | 1.5 | **negative** | High — negative EV + oversize |
| Decent debit spread edge | 55% | 1.0 | ~10% | High if you take full Kelly |
| Income-style credit (defined) | 65% | 0.35 | ~**negative / tiny** | Many small wins, rare large losses — ruin if one loss >> many wins |
| Lottery OTM long | 20% | 5 | **0%** (no edge) | Near-certain ruin at small N |

**Small-account ruin drivers (ordered by lethality):**

1. **Fixed contract size >> risk budget** (structural; not optional at $500).  
2. **Undefined risk** (naked shorts, naked strangles) — one event gap = account death.  
3. **Clustered losses** (same thesis, same day, same underlying) — policy open-risk budget exists for this.  
4. **Daily revenge trading** after a loss — daily halt (3%) is designed against this; must be enforced psychologically, not only in code.  
5. **Commissions/slippage/spreads** on cheap options — edge erased before thesis plays out.  
6. **Assignment / early exercise / pin risk** on short options held into events without capital to take stock.

**Order-of-magnitude intuition at $500 with “typical retail” behavior:**

| Behavior | Approx path | Ruin (qualitative) |
|----------|-------------|---------------------|
| 5–15% of equity per trade, long OTM weeklies | Fast path to $0–$200 | **Very high** (months) |
| 2–5% when possible, defined risk, ≤3 concurrent, process log | Slow grind; many flat months | **Moderate** if edge exists |
| Paper until 50+ trade journal is +EV, then 0.5–2% micro-live | Slowest ego path | **Lowest** among live paths |
| Undefined risk “income” on small account | Occasional green weeks, one black swan | **Existential** |

**Policy hard gates already encode the correct fear:**

- `blockUndefinedRisk: true`  
- `absoluteMaxLossPct: 0.05` (5% — still **too large** for $500 if hit often; see empire overlay)  
- `dailyLossHaltPct: 0.03`  
- Reject wide liquidity; respect event stance  

At $500, **even 5% absolute max ($25)** may be *below* the cost of many 1-lot structures → correct behavior is often **contracts = 0** (`sizePosition` already prefers miss over oversize). That is a feature, not a bug.

### 1.4 Time + sequence risk

- **Volatility regimes change.** A strategy that prints in high-IV crush environments dies in low-IV grind.  
- **Sample size:** 20 trades tell you almost nothing. **100–200+** closed trades with defined rules start to matter.  
- **Path dependence:** Hitting −40% early at $500 ($300 equity) makes 10× to $5k a **16.7×** from the trough. Survival of peak equity matters less than survival of *process capital*.

---

## 2. What is feasible at each tier (Robinhood-like constraints)

Assumptions: retail options enabled, American-style equities/ETFs, standard option multiplies (×100), **no portfolio margin**, cash or limited margin, **manual execution**, typical RH spread/liquidity on names in `wheelUniverse` / liquid ETFs.

### 2.1 Seed — **$500**

| Strategy | Feasible? | Notes |
|----------|-----------|--------|
| Long cheap single-leg options | **Barely** | Often 5–20%+ account risk per 1 lot; mostly educational / lottery unless premium is tiny *and* thesis is exceptional |
| Debit spreads (verticals) | **Limited** | Defined risk; width × 100 can still exceed risk budget. Prefer **tight** widths on cheap underlyings / index ETFs when liquidity allows |
| Credit spreads | **Limited** | Same collateral/max-loss math; buying power for short verticals may work on very tight widths; liquidity + early assignment risk still real |
| Iron condors / butterflies | **Rare** | Multi-leg fees/slippage + min width often oversized vs $500 |
| Cash-secured puts (CSP) | **No (most names)** | CSP on $50 stock ≈ **$5,000** cash; on $200 stock ≈ **$20,000**. Seed cannot run wheel as designed |
| Covered calls | **No** unless already long 100 shares | 100 × share price >> $500 for almost all liquid names |
| Naked short calls/puts | **Forbidden** | Empire law + policy `blockUndefinedRisk` |
| LEAPS / long-dated | **Poor fit** | Capital intensive; opportunity cost high at seed |
| 0DTE gambling | **Process poison** | High entertainment, high ruin; do not treat as empire path |
| Paper (Alpaca) sizing + journal | **Yes — primary** | Prove process *before* sizing up live |

**Seed mandate:** Defined-risk micro only when 1-lot max loss ≤ empire cap; otherwise **skip** or **paper**. Companion must say “no trade” without shame.

### 2.2 Stage 1 — **$5,000**

| Strategy | Feasible? | Notes |
|----------|-----------|--------|
| Debit / credit verticals | **Yes (core)** | Can finally size toward 0.5–2% risk on many structures |
| Iron condors / calendars (selective) | **Selective** | Still watch open risk budget & correlation |
| CSP on low-priced names / partial wheel | **Partial** | CSP on $30 stock ≈ $3,000; on $50 ≈ $5,000. Wheel only on **cheap, liquid** underlyings — not NVDA-style |
| Covered calls | **Only if assigned / shares held** | Still capital-heavy |
| Portfolio core (VTI/SCHD/etc.) | **Yes** | Policy profit split into core becomes meaningful |
| Aggressive multi-campaign (6 open) | **Dangerous** | Prefer fewer concurrent themes; correlation kills |

**Stage 1 mandate:** Prove **positive expectancy + drawdown control** with defined risk. Begin **income-preserving** structures only when max loss and collateral fit policy.

### 2.3 Stage 2 — **$25,000**

| Strategy | Feasible? | Notes |
|----------|-----------|--------|
| Defined-risk verticals / IC / flies | **Yes** | Diversify underlyings; still cap open risk |
| CSP / wheel on broader universe | **Much better** | Still avoid over-concentration; one 100-share assignment can dominate cash |
| Covered call overlays on core | **Yes** | Aligns with `portfolioCorePct` growth modes |
| Selective directional debits | **Yes** | Funded by float; not by raiding core on losses (see `allocateProfit`) |
| Undefined naked short | **Still no as default** | Even at $25k, one gap through short put/call can erase months of income |

**Stage 2 mandate:** Scale **process**, not ego. 5× is easier than 10× *if* Stage 1 edge is real; if Stage 1 was luck, Stage 2 will reverse it faster.

### 2.4 Robinhood-specific frictions (companion must model)

- **Manual checklist only** — fat-finger and wrong strike/expiry risk is real; app must force confirm fields.  
- **No official full API** for live RH in this build path — delays in marks vs fills → EV estimates stale.  
- **Assignment** can force stock positions the cash balance cannot hold comfortably.  
- **Pattern day trader / settlement / buying power** nuances can block intended hedges.  
- **Wide markets** on multi-legs destroy edge — policy `rejectWideLiquidity` is non-negotiable.

---

## 3. Position sizing tables (0.5–2% risk per trade)

**Method:** Risk dollars = equity × risk%. Contracts = floor(risk dollars / max_loss_per_contract), subject to hard ceiling min(remaining open budget, absolute max).

### 3.1 Risk dollars by equity tier

| Equity | 0.5% | 1.0% | 1.5% | 2.0% |
|--------|------|------|------|------|
| $500 | $2.50 | $5.00 | $7.50 | $10.00 |
| $1,000 | $5 | $10 | $15 | $20 |
| $2,500 | $12.50 | $25 | $37.50 | $50 |
| $5,000 | $25 | $50 | $75 | $100 |
| $10,000 | $50 | $100 | $150 | $200 |
| $25,000 | $125 | $250 | $375 | $500 |

### 3.2 Contracts allowed for example max-loss structures

Max loss per **1 contract** examples (illustrative; always recompute from actual strikes):

| Structure (1-lot max loss) | $500 @ 1% ($5) | $500 @ 2% ($10) | $5k @ 1% ($50) | $5k @ 2% ($100) | $25k @ 1% ($250) | $25k @ 2% ($500) |
|----------------------------|----------------|-----------------|----------------|-----------------|------------------|------------------|
| Long option / debit risk **$25** | **0** | **0** | 2 | 4 | 10 | 20 |
| Debit/credit vertical **$50** | **0** | **0** | 1 | 2 | 5 | 10 |
| Vertical **$100** | **0** | **0** | **0** | 1 | 2 | 5 |
| Vertical **$200** | **0** | **0** | **0** | **0** | 1 | 2 |
| Vertical **$500** | **0** | **0** | **0** | **0** | **0** | 1 |

**Read this table until it hurts:** At **$500**, almost every real option structure returns **0 contracts** under 0.5–2% risk. That is correct. Live trading at seed either:

- waits,  
- papers,  
- or **violates** risk policy (how empires die).

`sizePosition` in `portfolio.ts` already encodes: **miss the trade rather than force oversized risk.** Empire policy should keep that bias forever.

### 3.3 Cash-secured put collateral (why wheel is not seed)

| Underlying price | Approx CSP collateral (100 sh) | Fits $500? | Fits $5k? | Fits $25k? |
|------------------|--------------------------------|------------|-----------|------------|
| $5 | $500 | Borderline | Yes | Yes |
| $15 | $1,500 | No | Partial | Yes |
| $50 | $5,000 | No | 1× full account | Yes |
| $100 | $10,000 | No | No | Partial |
| $200 | $20,000 | No | No | Partial / 1 name max |

Wheel universe names like AAPL/MSFT/NVDA are **Stage 2+ cash** problems, not Stage Seed income fantasies.

### 3.4 Open risk budget (portfolio policy)

Default modes (`portfolioPolicy.ts`):

| Mode | Open risk budget | Per-trade target | Per-trade cap | Max campaigns |
|------|------------------|------------------|---------------|---------------|
| aggressive_growth | 30% | 1.5% | 2% | 6 |
| balanced | 20% | 1.0% | 2% | 4 |
| income_preservation | 12% | 0.75% | 1.5% | 3 |

At **$500 balanced**: total open risk budget = **$100**. That is **one bad 1-lot** for many structures — so max concurrent live risk should often be **1 idea or zero**.

---

## 4. Why undefined risk / over-leverage kills the empire

### 4.1 Undefined risk

**Undefined (or practically unbounded) risk** = short options without a defined long hedge (naked short put/call, short strangle/straddle without wings, some ratio writes).

- Left-tail events (gap opens, halts, geopolitical shocks, single-name fraud) move **through** short strikes faster than retail can hedge.  
- “High PoP” credit trades **feel** safe until the loss is **multiples** of cumulative premium collected.  
- At small equity, **one** naked short disaster is not a drawdown — it is **liquidation of company-survival capital**.  
- Even when broker “margin” allows it, **empire law forbids it as default**. Policy correctly sets `blockUndefinedRisk: true`.

### 4.2 Over-leverage (the silent killer even with defined risk)

Defined risk does **not** mean safe if size is wrong:

| Failure mode | Mechanism | Empire outcome |
|--------------|-----------|----------------|
| 1-lot forces 10–40% account risk | Contract indivisibility | Path to ruin in 3–8 losses |
| Many “small” correlated trades | Same theme × 4 legs | Open risk budget blown in one session |
| Width too wide | Max loss = width − credit | “Defined” but still account-sized |
| Ignoring liquidity | Mid never tradeable | Realized edge << model PoP/EV |
| Scaling after wins | Hot-hand size-up | Gives back months in one week |
| Raiding core portfolio after losses | Violates capital split doctrine | Core becomes ATM for gambling |

### 4.3 Psychological leverage

- **Revenge size** after a loss is how disciplined models die on contact with human hands.  
- **Narrative trading** (“I need 10× for the company this quarter”) substitutes urgency for edge.  
- **App-as-permission-slip**: if OptionScope ranks a trade “high” without hard size = 0, Michael may treat model confidence as destiny. **Companion must refuse.**

**Cash flow truth:** Revenue (company) is vanity, profit is sanity, **cash that cannot be zeroed by one options weekend gap** is empire reality.

---

## 5. Recommended “empire policy” overlay (stricter than default balanced)

Default **balanced** is reasonable for mid-size accounts. For **company-survival capital** below $25k — especially below $5k — use a **stricter overlay**. Name it explicitly in the product: e.g. `empire_survival` / `personal_companion_seed`.

### 5.1 Overlay parameters (recommended)

| Parameter | Default balanced | **Empire overlay (equity &lt; $5k)** | **Empire overlay ($5k–$25k)** | Rationale |
|-----------|------------------|--------------------------------------|-------------------------------|-----------|
| `perTradeRiskPct` | 1.0% | **0.5%** target; soft | **0.75%** | Reduce ruin speed |
| `perTradeRiskCapPct` | 2.0% | **1.0%** hard (live) | **1.5%** | Cap ego size-ups |
| `openRiskBudgetPct` | 20% | **8–10%** | **12–15%** | Correlation safety |
| `maxOpenCampaigns` | 4 | **1–2** | **2–3** | One thesis at a time |
| `absoluteMaxLossPct` | 5% | **2–3%** live | **3–4%** | 5% is large when equity is tiny |
| `dailyLossHaltPct` | 3% | **1.5–2%** | **2–2.5%** | Stop revenge loops earlier |
| `reinvestOptionsPct` | 50% | **40%** | **45–50%** | Force core build earlier |
| `portfolioCorePct` | 50% | **60%** | **50–55%** | Survival parking |
| `blockUndefinedRisk` | true | **true (no override)** | **true (no override)** | Non-negotiable |
| Event stance | respect | **Flat into binary events unless defined hedge** | same | Gap risk |
| Liquidity | reject wide | **stricter spread % of mid** | standard+ | Slippage kills micro edge |
| Min DTE for new shorts | (none coded) | Prefer **≥7–14 DTE** for credit structures | ≥7 DTE | Reduce gamma/0DTE casino |
| Max % of equity in single underlying risk | (none) | **≤5%** | **≤8%** | Name risk |
| Paper gate | n/a | **Required until journal criteria met** | optional refresh | Process proof |

### 5.2 Seed-specific hard rule (product + personal)

**If `maxLossPerContract > equity × empireCap`, contracts = 0.** No “just this once.”

Optional **micro-exception** (only if you insist on live seed learning): allow **one** structure with max loss ≤ **$25–50** only when:

1. Paper criteria already met,  
2. Weekly loss budget remaining,  
3. Defined risk only,  
4. Explicit UI warning: “This is **X%** of equity — over standard risk — educational live only.”

Even then, track it as **policy exception**, not normal mode.

### 5.3 Profit allocation doctrine (keep / strengthen)

From `allocateProfit`:

- Wins split to options float + portfolio core per mode.  
- **Losses hit options float only — never raid core.**  

Empire overlay should **raise core share at low equity** so that some capital becomes “boring” (VTI/SCHD/etc.) and is harder to gamble. Boring capital is **oxygen**.

### 5.4 Growth mode recommendation by phase

| Equity | Mode |
|--------|------|
| &lt; $1,000 | **Paper primary** + empire overlay if any live; never `aggressive_growth` |
| $1,000–$5,000 | Empire overlay ≈ **stricter than income_preservation** on risk, moderate reinvest |
| $5,000–$15,000 | `income_preservation` or custom empire mid |
| $15,000–$25,000+ | `balanced` only after metrics green; `aggressive_growth` only with proven edge + full hard gates |

**Do not enable aggressive_growth as default for personal companion seed.** It is a later privilege, not a starting personality.

---

## 6. Scenario table — conservative / base / aggressive

Assumptions (stated explicitly):

- **Starting equity:** $500 options float (unless noted).  
- **No lifestyle withdrawals.**  
- **Edge** means process with positive expectancy *after* friction; not guaranteed.  
- **Deposits** mean external income added to the account.  
- Ruin = program-ending drawdown or abandonment after capital wipe.

| Path | Deposits | Strategy discipline | Horizon to ~$5k | Horizon $5k→~$25k | Assumed gross edge | Max DD tolerated | Ruin probability (qualitative) | Notes |
|------|----------|---------------------|-----------------|-------------------|--------------------|------------------|--------------------------------|-------|
| **Conservative** | $200–400/mo | Paper → micro defined risk; empire overlay; 0–2 trades/week | **6–18 mo** (mostly deposits + small gains) | **24–48 mo** | Modest (+0.2–0.5R / trade) | 15–25% | **Low–moderate** | Best empire survival; 10× not pure trading heroics |
| **Base** | $100–200/mo | Defined risk only; 0.5–1.5% when sizeable; journal; daily halt | **12–30 mo** | **18–36 mo** | Small edge (+0.1–0.3R) | 25–40% | **Moderate** | Plausible if process real; still needs time |
| **Aggressive** | $0–50/mo | Frequent trading, 2%+ effective risk, occasional lottery, “need 10×” | **6–18 mo *or never*** | **12–24 mo *or reverse*** | Unstable / luck-driven | 40–80% | **High–very high** | Path of company death; occasional jackpot survivors create false doctrine |
| **Aggressive + undefined risk** | any | Naked / loose risk | Irrelevant | Irrelevant | Illusory high PoP | 100% possible single event | **Extreme** | Forbidden |
| **Paper-only until proof** | any | No live risk | Clock doesn’t start | Clock doesn’t start | Learning | n/a | **Ruin of capital: near zero** | Opportunity cost only; recommended gate |

### 6.1 Scenario narratives

**Conservative (recommended for survival capital)**  
Michael treats $500 as **tuition + process lab**. Most “growth” to $5k is **income deposits + not losing**. Options contribute **skill verification** and small positive expectancy. Core portfolio receives a majority of wins. Time is the price paid for existence.

**Base**  
Genuine edge on defined-risk structures, carefully sized once equity allows 1-lot within 1%. Some losing months. Ladder completes in multi-year span. App enforces gates; human does not override after losses.

**Aggressive**  
Trades too often, sizes by gut, chases 0DTE or wide risk, confuses dopamine with edge. **Either** early 5–10× **or** account obliteration. Survivorship bias will tempt future product marketing. **Do not encode aggressive fantasy as default success path.**

### 6.2 Sensitivity (recommendation flips)

| If this assumption breaks… | Path impact |
|----------------------------|-------------|
| True edge ≤ 0 after costs | Deposits become **only** reliable ladder; trading is a hobby tax |
| Win rate good but payoff ratio terrible | Death by a thousand commission/spread cuts |
| One 30%+ day (violation of halt) | Psychological ruin; process fracture |
| No journal / no review | No learning → random walk with fees |
| Undefined risk “just once” | Non-linear ruin; ladder ends |

**If a 15% change in win rate or average R flips “continue trading live” → “stop,” the edge was never robust.** Prefer more paper.

---

## 7. What the app MUST enforce or warn (survival features)

These are **product requirements** for personal companion mode, not nice-to-haves.

### 7.1 Hard enforcements (block or force size = 0)

1. **Undefined risk structures** — block recommend / checklist.  
2. **`sizePosition` contracts = 0** when max loss &gt; empire risk ceiling — show **why** in plain English.  
3. **Daily loss halt** — after −1.5% to −3% realized (per overlay), block new risk recommendations for the session.  
4. **Open risk budget** — refuse new campaigns when remaining budget &lt; next trade risk.  
5. **Wide liquidity** — reject or severely downrank when spread/mid exceeds threshold.  
6. **Event stance** — block or force reduce size into binary events (FOMC, earnings on short premium) per rules.  
7. **Manual checklist completeness** — strike, expiry, right, qty, max loss $, defined/undefined flag, thesis tag — all confirmed before “ready to enter RH.”  
8. **Profit split integrity** — losses do not suggest selling core holdings to “reload” options float.  
9. **Single-underlying concentration** — warn/block when stacked risk on one name exceeds cap.  
10. **Paper gate flag** — until user marks journal criteria met, default recommendations stay **paper / sim**.

### 7.2 Hard warnings (allow override only with typed acknowledgment)

1. **Trade risk &gt; 1% (seed) or &gt; empire cap** — require typing `ACCEPT OVERSIZE` or similar.  
2. **0–3 DTE short premium** — casino warning.  
3. **CSP collateral &gt; X% of cash** — “this is a stock purchase plan, not free income.”  
4. **Model PoP/EV** — always label **estimate**; never “guaranteed.”  
5. **Correlation** — multi-campaign same sector/theme.  
6. **After 3 consecutive losses** — force review mode, not next trade.  
7. **Equity below seed floor** (e.g. &lt; $300) — recommend halt live trading; paper only.  
8. **Checklist vs RH fill mismatch** — if user pastes fills that differ from plan, flag drift.

### 7.3 Dashboard truths (education + psychology)

- Show **risk dollars and risk %** before rank score.  
- Show **“contracts allowed at policy”** next to any “attractive” EV.  
- Show **ruin-oriented metrics**: rolling max DD, time under water, avg R, expectancy.  
- Show **ladder progress** with honesty: distance to $5k/$25k, implied CAGR if only trading P/L, vs deposits.  
- Separate **historical facts** vs **forward projections** in any growth path UI.

### 7.4 What the app must NOT do

- Promise 10× timelines.  
- Auto-trade.  
- Soften undefined risk as “high probability income.”  
- Hide that $500 cannot run the wheel on blue chips.  
- Use four-decimal PoP as false precision on garbage liquidity.

---

## 8. Verdict — is the ladder plausible with process?

### 8.1 Short answer

| Question | Answer |
|----------|--------|
| Is **$500 → $5,000** via options alone, quickly, with high probability? | **No.** |
| Is **$500 → $5,000** with process + time + (usually) deposits + no blow-up? | **Yes, plausible.** |
| Is **$5,000 → $25,000** with proven defined-risk process? | **Plausible over multi-year horizons; not guaranteed.** |
| Is **$500 → $25,000** a professional planning base case in &lt; 2 years pure trading? | **No. Fantasy marketing.** |
| Can OptionScope help the empire survive this path? | **Yes — if it enforces refusal and sizing more than it “finds heat.”** |

### 8.2 Conditions for plausibility (all required)

1. **Process over prophecy** — written rules, journal, review cadence.  
2. **Defined risk only** as default; undefined risk never “empire income.”  
3. **Size = 0** when structure does not fit risk math (especially &lt; $5k).  
4. **Paper Alpaca (or equivalent) until metrics clear** — e.g. N≥50–100 trades, positive expectancy after friction, max DD within limits, rules followed ≥90%.  
5. **Empire policy overlay stricter than balanced** below $25k.  
6. **Deposits treated as first-class** Stage 1 capital path — not shameful.  
7. **Core portfolio parking** of a large share of wins — oxygen.  
8. **Daily/weekly halt discipline** — code + human.  
9. **Time horizon 2–5 years** for full ladder without lottery thinking.  
10. **No company-saving urgency in trade selection** — urgency is a risk factor.

### 8.3 Conditions that make the ladder a lie

- Needing $25k in months to pay bills.  
- Using aggressive_growth + max campaigns from day one.  
- Naked shorts for “income.”  
- Ignoring contract indivisibility at $500.  
- Skipping paper proof.  
- Overriding app blocks after losses.  
- Confusing a lucky 3× month with a repeatable system.

### 8.4 Final empire judgment

**The capital ladder is a valid strategic narrative only if it is framed as survival compounding under constraint — not as a rocket ship.**

- **Stage Seed ($500):** Graduate school of process. Primary KPI = **not ruined** + journal quality + refusal rate when size invalid.  
- **Stage 1 ($5k):** Proof that expectancy survives contact with live fills.  
- **Stage 2 ($25k):** Scaling defined-risk income + selective growth without reintroducing undefined risk addiction.

**OptionScope’s job is not to make Michael bold. It is to make Michael un-blow-up-able while he becomes skilled.**

If the product optimizes for engagement, trade frequency, or “exciting” rankings at seed size, it will **accelerate company death**. If it optimizes for **hard gates, honest math, and no-trade as a first-class outcome**, it can be the companion that keeps the empire alive long enough for skill and capital to meet.

---

## Appendix A — Quick reference: required multiples

| From | To | Multiple | Pure-trading difficulty |
|------|-----|----------|-------------------------|
| $500 | $5,000 | 10× | Extreme without deposits/time |
| $5,000 | $25,000 | 5× | Hard; process-dependent |
| $500 | $25,000 | 50× | Not a base-case pure options plan |

## Appendix B — Alignment with current code policy

| Code element | Empire assessment |
|--------------|-------------------|
| `manual_checklist_only` / Robinhood | Correct for this build |
| `blockUndefinedRisk: true` | Correct — never relax for seed |
| `absoluteMaxLossPct: 0.05` | Good backstop; **too loose alone** for &lt;$5k — overlay tighter |
| `dailyLossHaltPct: 0.03` | Good; tighten under overlay |
| `sizePosition` miss-over-oversize | **Critical correct behavior** — keep |
| `allocateProfit` losses → float only | Correct capital hygiene |
| `aggressive_growth` 30% open risk / 1.5% target | **Not for seed**; lock behind equity + metrics |
| Wheel universe blue chips | Educational for later stages; **label CSP capital needs in UI** |

## Appendix C — Suggested paper graduation criteria (before treating live ladder as “on”)

1. ≥ **50** closed paper trades under written rules (prefer 100).  
2. Expectancy **&gt; 0** after estimated spread/slippage.  
3. Max drawdown within pre-committed limit (e.g. ≤25% paper equity).  
4. ≥ **90%** rule adherence (no undefined, no revenge, halt respected).  
5. Can explain **max loss $** for every structure before entry.  
6. 20-trade rolling window not dependent on one outlier winner.

---

**Document status:** Complete for agency evaluation track.  
**Honesty standard:** Prefer survival over heroics. Long live the empire — by not dying at $500.
