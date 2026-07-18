# The Steadiest Option Trader — OptionScope alignment notes

**Source (personal reference only):** Henry Moldavskiy, *The Steadiest Option Trader* (2023, Invest With Henry, LLC).  
PDF path used for ingest: `C:\Windows.old\Users\NerdC\Downloads\67a68be769aecb02281abe63.pdf`.  
Not investment advice. Book income anecdotes and ROI claims are **not** guarantees. Empire risk sizing always wins.

## Thesis of the book

- Prefer **selling** options for income (“be the casino”) vs lottery long premium.
- Edge narrative: institutions bid puts for hedges → puts often **overpriced** for sellers (anomaly claim — treat as thesis, not law).
- Safe **OTM** selling + fundamentals/TA + written plan + long-term discipline.
- Fix five retail problems: inconsistency, mismanaging gains, slow loss cuts, wrong strategies, wrong stocks.

## Strategy map → OptionScope

| Book chapter | Structure | App strategyId | Rule ids |
|--------------|-----------|----------------|----------|
| Ch.4 Covered calls | Long stock + short call | `covered_call` | `steadiest_wheel_cc`, `wheel_cc_income` |
| Ch.8 Put selling | CSP / OTM puts | `cash_secured_put` | `steadiest_wheel_csp`, `wheel_csp_entry` |
| Ch.9 Wheel | CSP → assignment → CC | CSP + CC campaign | above |
| Ch.10 Straddle/strangle | Long vol (earnings only in book) | `long_straddle` (existing) | keep low priority / tactical |
| Ch.11 Call credit | Bear call credit | `bear_call_credit` | `steadiest_call_credit` |
| Ch.12 Put credit | Bull put credit | `bull_put_credit` | `steadiest_put_credit` |
| Ch.13 Iron condor | Range credit | `iron_condor` | `steadiest_iron_condor` |

Complements (does not replace) Money Press put diagonal from Preston James 2020.

## Hard operating rules distilled

### Wheel / CSP
1. Only stocks you would not mind owning.
2. Short put **delta ~0.20–0.30** ideal; **>0.40** ≈ high assignment odds.
3. Prefer quality names; book stresses **high free-cash-flow yield** among S&P-style names for risk-adjusted put selling.
4. Avoid earnings inside the short window.
5. Assignment is process, not failure → sell covered calls.
6. Cash must cover strike × 100 (blocks most seed-ladder accounts).

### Credit verticals
- Max profit = **net credit**; max loss = **width − credit**.
- Call credit: neutral/bearish; resistance, overbought, consolidation high, index fade.
- Put credit: neutral/bullish; capital-efficient vs CSP.
- **Pin risk pro tip:** if price is between strikes near expiration, close **Friday morning** rather than hope.

### Iron condor
- OTM put credit + OTM call credit; profit if stays in the band.
- Prefer elevated IV; manage/roll when price approaches wings.
- Shorter DTE = faster theta and tighter management.

### Mindset (process, not prediction)
- Written plan: entry, exit, size, risk.
- Long-term statistical edge over single-trade heroics.
- Diversify positions/sectors; continual learning.

## Empire ladder notes

| Phase | How this book applies |
|-------|------------------------|
| Seed (~$500) | CSP/wheel usually **blocked** by cash lock. Prefer small **put credits**, **call credits**, **Money Press diagonals**. |
| Stage 1 ($5k) | Defined credits + selective CSP on cheaper underlyings if cash allows. |
| Stage 2+ ($25k) | Full wheel + condors sized under open-risk budgets. |

## What we did **not** ship as guarantees

- “$5,000+/month” or student ROI screenshots from the book.
- “40% annualized from premiums” marketing claims.
- Any auto-trading or broker order routing.

Rules live in `src/knowledge/bookRulesExtra.ts` (`steadiest_*`) and tightened core entries in `strategyRules.ts`.
