# OptionScope — Vision Handoff to Agency Design

**From:** Grok NEXUS pipeline controller (engineering)  
**To:** Agency Design roster (`design-brand-guardian` → `design-ux-architect` → `design-ui-designer`)  
**Owner:** Michael Chapman — NerdCommand / Chapman Capital  
**Product:** OptionScope (repo `opiontrading`)  
**Date:** 2026-07-12  
**Authority:** Design team **decides** visual system, IA, and page hierarchy. Engineering implements. Do not wait for more product approval theater.

---

## 1. The life-change vision (why this exists)

Michael is not building “another options calculator.” He is building a **second brain for option trading** that turns chaos into calm, disciplined growth.

### Before OptionScope
- Robinhood is fast to tap and slow to *understand*
- Multi-leg risk is foggy (max loss, BE, assignment, IV crush)
- Book knowledge (100+ PDFs) lives offline while the market moves live
- NCI TA chart language and portfolio rules live in separate brains
- Paper account equity exists, but sizing still feels like guesswork
- Emotion fills the gap where a process should be

### After OptionScope (the life it enables)
1. **Clarity before capital** — Every trade idea becomes a visible payoff, model PoP/EV, and honest max-loss story *before* a finger hits Robinhood.
2. **A brain that ranks, not hypes** — Market context + book rules + NCI TA bias + live paper equity → ranked structures with size caps. Growth-primary income engines (wheel, credit spreads) preferred when conditions fit.
3. **Library in the loop** — Option book knowledge is machine-usable and *cited* in plain language (“Explain AI”), so learning compounds with every idea.
4. **Dignity of manual control** — Checklist only. No auto-trade. Confidence without surrendering agency. Sleep better.
5. **Calibration over ego** — Journal compares forecast vs outcome so the brain (and the trader) get smarter over years, not just louder over days.
6. **Wealth path as a system** — Options float + portfolio core allocation; profits reinvested by policy, not FOMO.

**Emotional promise of the product:**  
> “I never enter a trade alone again. I enter with a brain that has read the books, seen the chart, checked the account, and still makes *me* press the button.”

**Tagline candidates for Brand to own/kill:**  
- *See the trade. Trust the process. Own the decision.*  
- *Educational option clarity for Robinhood traders.*  
- *Your options second brain — manual execution only.*

---

## 2. Product capabilities (truth, not marketing fog)

| Layer | What it does today |
|-------|---------------------|
| **Domain engine** | Payoff, BE, BS/binomial, Monte Carlo PoP/EV, strategy templates |
| **Live data** | Quotes/chains via demo · Polygon · OpenBB · **Alpaca** |
| **Market context** | IV rank/trend, spot trend, EM, liquidity, events, news sentiment |
| **Trading brain** | Rule filter → score → size → Robinhood checklist copy |
| **NCI TA** | Chart bias (FIRE/master/ABC) via Pine webhook or compute API |
| **Book library** | 98 PDFs ingested → strategy rules + RAG-style citations |
| **Phase 5 AI** | Catalog-grounded explainer (no freelanced strikes) |
| **Live account** | Alpaca **paper** equity/cash/positions drive sizing |
| **Hard rule** | Never auto-trades. Never asks for Robinhood password. |

### App routes (current reality)

| Route | Visual maturity | Design priority |
|-------|-----------------|-----------------|
| `/dashboard` | Strong (TV chart, context, snapshot) | Elevate to “command center” |
| `/builder` | Strongest (brain + charts + MC) | Hero workflow; refine hierarchy |
| `/compare` | Stub | **Must design** full UI |
| `/saved` | Stub | Design empty + filled states |
| `/journal` | Stub | Design forecast vs outcome ritual |
| `/settings` | Basic | Calm trust/settings |
| `/education` | Content-only | Brand voice + risk theater done right |

Design tokens already exist (light/dark CSS vars). No logo pack. No mockup library. Shell is functional, not iconic.

---

## 3. Primary user (Michael + people like him)

- Trades options via **Robinhood** (Level 2+ / spreads)
- Understands calls/puts; multi-leg risk still expensive in mistakes
- Has (or wants) a **process**: wheel/income + selective growth
- Owns or aspires to a **library** of trading knowledge
- Uses chart systems (NCI TA / TradingView)
- Wants **paper → live discipline**, not dopamine buttons
- NerdCommand aesthetic: ambitious, cinematic, precise — but **fintech-trustworthy**, not casino neon

---

## 4. Core journeys design must own

1. **Morning command center** — Open app → see paper equity + market context for watchlist → brain ranks structures → explain → load builder → checklist.
2. **Single trade dignity** — Ticker → live chain → brain pick → exact legs → payoff truth → copy checklist → enter RH manually.
3. **Learning loop** — Explain AI cites books → education pages deepen → journal closes the loop later.
4. **Risk halt** — When gates fail, UI should feel like a wise coach, not a broken app.

---

## 5. Non-negotiables (design must encode)

1. **Educational / not advice** visible without killing confidence  
2. **No Place Trade** primary CTA — primary is *Analyze*, *Explain*, *Load*, *Copy checklist*  
3. Model metrics labeled as **model estimates** (PoP, EV)  
4. Live vs demo vs paper clearly badged  
5. Dark mode first-class (already tokenized)  
6. Accessibility WCAG AA  
7. Mobile usable for checklist review; desktop primary for analysis  

---

## 6. What Engineering needs from Design (deliverables)

Write under `docs/design/` and optionally `design/mocks/`:

1. **Brand foundation** — name lock, voice, color evolution, logo direction, do/don’t  
2. **UX IA** — information architecture, page map, navigation rethink if needed  
3. **Screen specs** — Dashboard, Builder (brain panel), Compare, Journal, Saved, Settings, Education  
4. **Component inventory** — cards, metrics, gates/pills, brain rank list, checklist, empty states  
5. **Token map** — map or extend existing CSS vars; spacing/type scale  
6. **Priority implementation order** for frontend (1 week sprint worth)  

**You decide** aesthetics. Engineering already proved the brain; design makes it *feel* like a life-changing co-pilot.

---

## 7. Handoff chain

```
Brand Guardian  →  brand soul + visual identity direction
       ↓
UX Architect    →  IA, flows, layout system, token architecture
       ↓
UI Designer     →  high-fidelity screen specs / HTML mocks / component polish notes
       ↓
Frontend (later) → implement in Next.js OptionScope
```

Return each agent’s **Handoff block** with artifact paths and next agent.

---

## 8. Success metric for design (not vanity)

A trader opens OptionScope before Robinhood **by habit**, because the brain makes them feel:

- safer without feeling small  
- smarter without feeling lectured  
- ready to act without feeling rushed  

If the UI looks like a generic SaaS admin table, we failed the vision.  
If it looks like a casino, we failed the trust.  
If it looks like a **calm cockpit for serious capital**, we win.
