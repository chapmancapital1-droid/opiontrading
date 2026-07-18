# Money Press Method — OptionScope alignment notes

**Source (personal reference only):** Preston “Pirate” James, *The Money Press Method* (2020 PDF).  
Not investment advice. Book marketing claims are **not** treated as guarantees. Size under empire risk rules.

## Structure (what we model)

A Money Press is **always two put legs at the same time** (a diagonal, not a same-strike calendar):

| Leg | Action | Strike | Expiration | Role |
|-----|--------|--------|------------|------|
| Weekly | **Sell to open** | **Higher** (ATM / near money, 9/10 times) | ~7 DTE (current week) | Cash machine — collect premium |
| Protection | **Buy to open** | **Lower** | ~3–6 months | Insurance — defined downside |

**Hard rule from the book:** short weekly strike is **always higher** than the long protection strike.

### Book-style examples (shape only)

- **WORK** (~$22.23): Sell Mar weekly **$22.50** puts; buy Jul **$19** puts.
- **SPLK**: Sell weekly **$148** puts; buy Aug **$135** puts; order type **Diagonal**, often **net debit** at open.
- Expensive stock sketch: Sell **$420** weeklies; buy 3–4 month **$400** puts.

## How it makes money

- Thesis: **flat to upside** on the underlying.
- Weekly short put decays hard into Friday; seller keeps premium when OTM.
- Protection is bought “in bulk” (longer DTE cheaper per unit of time vs rolling weeklies).
- After each Friday: **roll / adjust** the short week (~20–30 min). Multi-week life of one protection leg.
- Risk capital ≈ **difference between the two strikes** (width); stacked weekly credits reduce net risk over the press.

## Entry cash flow

- New press often opens as a **net debit** (far put costs more than one week of short premium).
- Always **limit orders** on the diagonal.
- No shares required — capital is width + protection debit, offset by short credits.

## Method filters (street smarts / lessons)

1. Prefer **larger / triple-digit** liquid names over tiny double-digit names.
2. Fit presses **between earnings** (avoid earnings inside the weekly).
3. Avoid **commodities** and generally avoid **ETFs** for this method.
4. Diversify sectors; start small on size; experience reduces operational risk.
5. Choppy markets: protection is on; weeklies can get richer (edge for sellers).

## OptionScope mapping

| App id | Meaning |
|--------|---------|
| `money_press_put_diagonal` | Canonical Money Press |

**Removed (incorrect vs book):** same-strike call/put/double calendars as “Money Press.”  
Legacy calendar strategy ids still instantiate as the put diagonal in `instantiate.ts`.

Trade Lab: Near DTE = weekly short; Far DTE = protection (default ~105). P/L analysis is at **near** expiry with residual value on the long.

## Empire policy

- Seed preferred strategy includes `money_press_put_diagonal`.
- Still subject to max-loss / open-risk budgets — never size off book ROI anecdotes.

## Cheat Sheet 2016 add-ons (`L:\bookLibrary\Money Press Cheat Sheet 2016.pdf`)

Structured into rule `booklib_money_press_cheat_sheet`:

- Compelling circumstance required (earnings reaction, crow-bar, product launch, etc.) + volume/price confirm  
- No new press if earnings &lt; 2 weeks away  
- Protection cost ≈ **2.5×** ATM weekly put premium  
- Friday roll; keep protection ≥ ~6 weeks DTE  
- Avoid commodities / most ETFs / clothing / semis / policy-sensitive “earthy” names  
- Prefer triple-digit names; don’t raise wing just to cut margin  

## Related CrowBar (`L:\bookLibrary\Crow Bar Strategy…`)

Momentum LEAP call setup (52w high + double + ATH + EPS/RS ≥80) → rule `booklib_crowbar_leap` on `long_call`.  
Can enhance later with OTM weekly call sales; can also run Money Press / put credits on same name.
