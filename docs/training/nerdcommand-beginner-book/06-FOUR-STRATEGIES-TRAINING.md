# Four Higher-Safety Strategies — Full Training  
## OptionScope platform walkthrough · Seed-aware

**Source logic:** `strategyRules.ts` · `empirePolicy.ts` · Steadiest / book ingest notes · NCI income bias  
**Beginner core only:** defined-risk. **CSP blocked as seed primary.**

---

# Strategy 1 — Bull Put Credit Spread

## 1.1 Plain English
You are **moderately bullish or neutral**. You sell a put and buy a lower put (same expiry).  
You collect a **credit**. Risk is **defined**: width − credit (per share) × 100 × contracts.

## 1.2 When to look for it
| Prefer | Avoid |
|--------|--------|
| IV elevated or neutral | IV crushed + still selling premium blindly |
| Trend up / sideways | Knife-catch after crash without thesis |
| Liquid underlyings | Earnings inside short DTE (rule: avoid) |
| Short put ~0.25–0.30 delta band (guide) | Short delta >0.40 “coin flip” |

## 1.3 Max loss / max profit
- **Max profit** ≈ credit received × 100 × contracts  
- **Max loss** ≈ (spread width − credit) × 100 × contracts  
- **Break-even** ≈ short put strike − credit  

## 1.4 OptionScope path (clicks)
1. **Settings** — equity honest.  
2. **Scanner** — strategy `bull put credit` · price band sensible · seed mode on.  
3. Open hit → **Trade Lab**.  
4. **Load live chain** (not DEMO if live money).  
5. **Recommend / template** bull put credit · apply legs.  
6. Read **Brain** notes + size (obey size 0).  
7. **Analyze** — payoff, PoP/EV (model).  
8. **Order checklist** — copy.  
9. Broker enter **exact** legs.  
10. **Journal** plan → open → later close.

## 1.5 Exit rules (desk standard)
- Take profit ~50% of max credit when available  
- Manage by ~21 DTE if still open (close/roll decision)  
- Hard respect: stop thinking ~2× credit risk style rules from book notes  
- Friday pin risk: don’t ignore short between strikes near expiry  

## 1.6 Practice drill
Paper 3 bull put credits on liquid names; journal max loss before each.

---

# Strategy 2 — Bear Call Credit Spread

## 2.1 Plain English
You are **moderately bearish or neutral**. Sell a call; buy a higher call.  
Credit in; defined risk = width − credit.

## 2.2 When to look for it
| Prefer | Avoid |
|--------|--------|
| Resistance / down-sideways bias | Fighting a vertical melt-up without hedge |
| Elevated IV (sell premium) | Binary event week without plan |
| Liquid names | Illiquid calls wide markets |

## 2.3 Formulas
- **Max profit** ≈ credit × 100 × contracts  
- **Max loss** ≈ (width − credit) × 100 × contracts  
- **Break-even** ≈ short call + credit  

## 2.4 OptionScope path
Same as Strategy 1 with Scanner/template **bear call credit**.  
Cross-check **Bias** tab — if SuperBias violently bullish, demand written override or skip.

## 2.5 Exit
Mirror credit rules: 50% profit, 21 DTE decision, defined risk always known.

## 2.6 Practice drill
Paper 3; one must be “skip” because bias or event fails green lights.

---

# Strategy 3 — Iron Condor

## 3.1 Plain English
**Range income:** short put spread + short call spread, same expiry, defined wings.  
You want price to stay **between** short strikes. Defined max loss on either side.

## 3.2 When to look for it
| Prefer | Avoid |
|--------|--------|
| Expected move fits inside shorts | Earnings bomb in window |
| Elevated IV crush candidate **after** event is wrong timing — prefer post-event or calm | “IV high so always condor” without range thesis |
| Stage 1+ capital for comfortable width | Forcing condor on $500 when width blows risk ceiling |

**Seed note:** Paper heavily first. Live only when 1-lot max loss ≤ empire ceiling.

## 3.3 Formulas
- Credit = sum of both spreads’ credits  
- Max loss ≈ wider wing risk − net credit (know **each** side)  
- Platform: use Lab payoff + checklist — speak numbers out loud  

## 3.4 OptionScope path
1. Scanner or manual liquid ETF (SPY/IWM/etc. per liquidity).  
2. Lab iron condor template / brain.  
3. **Compare** optional vs single credit spread (is condor earning enough for complexity?).  
4. Checklist both sides’ strikes.  
5. Journal “range thesis” one sentence.

## 3.5 Management
- Scale out / take profit early when both sides decay  
- Don’t turn into naked short by closing longs only  
- If tested hard on one wing, manage as credit spread crisis  

## 3.6 Practice drill
One full condor paper lifecycle: open → 50% → close; write time decay observation.

---

# Strategy 4 — Bull Call Debit Spread

## 4.1 Plain English
You are **bullish** but refuse naked long call lottery as a system.  
Buy lower call; sell higher call. **Debit** paid = max loss (defined). Max gain = width − debit.

## 4.2 When to look for it
| Prefer | Avoid |
|--------|--------|
| Up bias + catalyst you accept | Buying debit into known IV crush without plan |
| Defined risk fits seed micro | Wide debits that exceed risk % |
| Liquid options | Far OTM “cheap” spreads with tiny PoP |

## 4.3 Formulas
- **Max loss** = net debit × 100 × contracts  
- **Max profit** = (width − debit) × 100 × contracts  
- **Break-even** ≈ long call + debit  

## 4.4 OptionScope path
1. Bias confirms bullish or you write thesis.  
2. Scanner debit / bull call · or Lab template.  
3. Prefer brain + domain payoff path.  
4. Checklist debit and max loss equal honesty.  
5. Journal target and invalidation (what price kills thesis).

## 4.5 Exit
- Scale at thesis hit  
- Cut if structure thesis broken (not “hope to expiry” by default)  
- Don’t average losers by doubling contracts  

## 4.6 Practice drill
Two debits: one trend-aligned, one forced against bias (should feel wrong — skip second).

---

# Master comparison (teach this table)

| Strategy | Bias | Credit/Debit | Seed friendliness | Main failure mode |
|----------|------|--------------|-------------------|-------------------|
| Bull put credit | Bull/sideways | Credit | High if width small | Sharp breakdown |
| Bear call credit | Bear/sideways | Credit | High if width small | Melt-up |
| Iron condor | Range | Credit | Medium (capital/width) | Expansion / event |
| Bull call debit | Bull | Debit | High micro | Wrong direction / IV |

---

# Platform “what to look for” (all four)

1. **LIVE chain** for live money  
2. **Max loss $** on checklist  
3. **Size** under Settings equity rules  
4. **IV / event** notes in Market Context  
5. **Bias** not violently opposed (or written override)  
6. **Liquidity** — not cartoon spreads  
7. **Journal** before fill  

---

# Homework progression

| Day | Task |
|-----|------|
| 1–2 | Strategy 1 paper ×3 |
| 3–4 | Strategy 2 paper ×3 |
| 5–6 | Strategy 3 paper ×1 full lifecycle |
| 7–8 | Strategy 4 paper ×2 |
| 9–10 | Mixed: only take A+ green lights; skip rest |
| 11–14 | Review journal; no new live |

*Educational only. Not investment advice.*
