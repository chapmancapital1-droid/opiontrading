# OptionScope — Master Agency Evaluation  
## Personal Empire Trading Companion

**Date:** 2026-07-12  
**For:** Michael Chapman only — NerdCommand / Chapman Capital empire  
**Doctrine:** Long live the empire. Real profits before public release.  
**Agency roster engaged:** Product Manager · Financial Analyst · Security Architect · Reality Checker · Software Architect · Content Creator · Image Prompt Engineer  

---

## 1. Empire verdict (one page)

| Question | Answer |
|----------|--------|
| **Is OptionScope a strong options brain?** | **YES** — engine, rank, size, explain, live chain, paper Alpaca, book library |
| **Is it your personal money companion for $500 → $5k → $25k today?** | **NO — NEEDS WORK** |
| **Can it become that companion?** | **YES — CONDITIONAL GO** on a 30-day personal MVP |
| **Public / multi-user product now?** | **HARD NO** until Stage 1 process + real profits |
| **Mission fit score (Product)** | **54 / 100** |
| **Reality grade** | **C / NEEDS_WORK** |

### One sentence for the empire
> **You already built a laboratory that can think about options; you have not yet built the survival cockpit that sizes a $500 life and learns from your Robinhood history.**

---

## 2. What the capital ladder really means (Finance)

| Leg | Pure trading fantasy | Empire-honest path |
|-----|----------------------|--------------------|
| **$500 → $5,000** (10×) | Lottery if “fast” | Process + time; often **deposits** help; **micro defined-risk only** |
| **$5,000 → $25,000** (5×) | Hard | Plausible if Stage 1 process is real |
| **$500 → $25,000** (50×) | Not a 12-month options base case | Multi-year + discipline + no blow-up |

### $500 physics (non-negotiable)
- 1% risk of $500 = **$5** → most real 1-lot max losses are **$25–$200+** → correct size is often **0 contracts**
- **CSP / wheel on blue chips is usually impossible** at seed (cash-secured put on $50 stock ≈ $5,000 cash)
- Default app demo account of **$25,000** is **dangerous fiction** for seed psychology
- Empire priority: **un-blow-up-able**, not bold

### Empire policy overlay (must implement)
| Rule | Seed (&lt; $5k) |
|------|----------------|
| Risk per trade | ~**0.5%** target, **1%** hard cap |
| Open risk budget | **8–10%** equity max |
| Campaigns | **1–2** max |
| Growth mode | **Never** `aggressive_growth` at seed |
| Structure allowlist | Defined-risk micro (cheap debit spreads, tight credits) — not CSP universe as default |
| Paper gate | Process proof before treating ladder as “on” with real seed |

Full math: `docs/empire/02-capital-path-realism.md`

---

## 3. Agency scorecard

| Agent | Verdict | Artifact |
|-------|---------|----------|
| **Product Manager** | Mission fit **54**; companion **NO-GO** today; 30-day **CONDITIONAL GO** | `01-product-evaluation.md` |
| **Financial Analyst** | Ladder plausible only with process + time + strict policy; 10× pure options not base case | `02-capital-path-realism.md` |
| **Security Architect** | RH data path **APPROVED** if CSV/paste only — never password / unofficial API | `03-security-robinhood-data.md` |
| **Reality Checker** | **NEEDS_WORK** — strong lab, weak money loop | `04-reality-check.md` |
| **Software Architect** | Strengths in brain/engine; gaps in RH truth, seed policy, journal product, ritual UI | `05-architecture-gaps.md` |
| **Content Creator** | Personal education field manual + feature graphic prompts | `book/01-…`, `book/02-…` |
| **Image Prompt Engineer** | 18 production graphic prompts, style-locked | `book/03-…` |

---

## 4. What you already have (keep — empire assets)

1. **Quantitative engine** — payoff, BE, BS/binomial, Monte Carlo PoP/EV  
2. **Trading brain** — market context → rules → rank → size → RH checklist copy  
3. **Book library** — 98 PDFs → structured rules + Explain citations  
4. **NCI TA bias** — chart language without auto-trade  
5. **Alpaca paper** — live equity sizing path (currently ~$100k paper, not your $500 seed)  
6. **Design system** — calm cockpit brand + Command / Trade Lab IA  
7. **LM Studio directives** — parked for options-obsessed local companion later  
8. **Correct ethics** — no auto-trade, no RH password design  

---

## 5. What is missing for *your* companion (blockers)

| # | Gap | Why it kills empire use |
|---|-----|-------------------------|
| 1 | **Seed account mode** | Brain thinks you have $25k demo / $100k paper, not $500 RH |
| 2 | **Empire / seed policy** | Growth-primary favors CSP/wheel you cannot fund |
| 3 | **Robinhood history import** | Cannot “see what you already did” or “what to fix” |
| 4 | **Journal product UI** | No closed loop forecast → outcome (repo math exists) |
| 5 | **Checklist not wired in Lab** | OrderChecklistCard exists but orphaned from builder flow |
| 6 | **Command Center ritual** | Chart shell only — no brain pulse, ladder, halt coach |
| 7 | **Zero-size / infeasible UX** | Silent “0 contracts” without teaching affordable structures |
| 8 | **Compare / Saved stubs** | Secondary but part of daily dignity |

---

## 6. Robinhood data (approved empire path)

**Security APPROVED for personal use:**

| Allowed | Forbidden |
|---------|-----------|
| Official RH export / statements | App fields for RH password / 2FA |
| CSV upload + paste of positions/orders | Unofficial / reverse-engineered RH APIs |
| Local or RLS-protected storage of **normalized** history | Storing raw CSV forever if avoidable |
| Process insights (“no plan before fill”, “oversized vs policy”) | “You should buy this now” as advice theater |

Schema direction: import batches → positions / orders / closed trades → **fix list** (process metrics).  
Detail: `03-security-robinhood-data.md`

---

## 7. 30-day personal MVP (must-ship for empire survival use)

### Week 1 — Truth about capital
- [ ] **Seed profile**: equity = your real number (start $500 or paper seed)  
- [ ] **`EmpirePolicy` / `seed_micro`**: tighter risk, structure affordability  
- [ ] **Zero-size coach**: “This 1-lot max loss is $X; at 0.5% of $500 you can risk $Y — here are feasible alternatives”  
- [ ] Wire **Order checklist** into Trade Lab as primary climax CTA  

### Week 2 — Memory
- [ ] **Journal MVP** (local-first OK): plan → open → close → compare forecast vs result  
- [ ] **RH paste / CSV import v1** for closed trades + positions snapshot  
- [ ] **Fix list** panel: process misses only  

### Week 3 — Ritual
- [ ] **Command Center**: account strip (seed/paper/RH), brain pulse, capital ladder, LIVE·PAPER·DEMO badges  
- [ ] Daily ritual: Command → Lab → checklist → journal  

### Week 4 — Proof
- [ ] Paper or tiny seed: **N planned trades** with journal adherence ≥ 70%  
- [ ] Reality Checker retest package  
- [ ] Only then discuss real $500 risk budget as “ladder on”  

**Defer until after process proof:** LM Studio chat, public marketing, multi-tenant SaaS, backtest vanity.

---

## 8. Success metrics (not vanity DAU)

| Metric | Target |
|--------|--------|
| OptionScope **before** RH on trading days | ≥ 80% |
| Fills that had a prior journal plan | ≥ 70% |
| Undefined-risk trades | **0** |
| Size within empire policy | ≥ 90% |
| Days to blow-up / rule-break halt | Track; goal = **never** |
| Equity 10× | **Lagging hope** — not Week-4 gate |

---

## 9. Education package (writers delivered)

| Book | Path | Use |
|------|------|-----|
| **Options field manual** | `docs/empire/book/01-OPTIONS-EDUCATION-GUIDE.md` | Your personal curriculum + daily ritual |
| **Feature graphics prompt book** | `docs/empire/book/02-FEATURE-GRAPHICS-PROMPT-BOOK.md` | Generate educational art per feature |
| **Production image prompts (18 shots)** | `docs/empire/book/03-GRAPHICS-PROMPTS-PRODUCTION.md` | Style-locked AI image generation |

Brand locked: calm cockpit, **See the trade. Trust the process. Own the decision.** No get-rich neon.

---

## 10. Architecture target (condensed)

```
RH CSV/paste ──► AccountSnapshotRh + TradeImport
                        │
Alpaca paper ───────────┤
Manual seed equity ─────┤
                        ▼
              EmpirePolicy (phase: seed | stage1 | stage2)
                        │
        MarketContext + NCI + Book rules
                        │
                        ▼
              Brain rank / size / gates
                        │
                        ▼
         Trade Lab + Checklist ──► Human → Robinhood
                        │
                        ▼
              Journal + Fix list + Calibration
                        │
                        ▼ (later)
              LM Studio companion (FACTS only)
```

Full gaps: `05-architecture-gaps.md`

---

## 11. Go / No-Go board

| Decision | Status | Condition to flip |
|----------|--------|-------------------|
| Use brain **today** for education + paper analysis | **GO** | Always (with disclaimers) |
| Trust demo/$100k paper sizing for **$500 life** | **NO-GO** | Seed mode shipped |
| Daily driver companion | **NO-GO** | Journal + RH import + checklist wired + seed policy |
| Risk real $500 toward ladder | **NO-GO** until | Process adherence ≥ 70% on paper/tiny size |
| Public product / sell to others | **HARD NO-GO** | Real profits + process proof (your rule) |
| LM Studio options obsession | **PARKED** | After 95% companion MVP; directives ready |

---

## 12. Long live the empire — operating oath

1. **Clarity before capital** — no naked undefined risk as a business model.  
2. **Process before prediction** — journal is the empire’s memory.  
3. **Human owns the button** — companion never places the trade.  
4. **Truth about account size** — never let $25k demo lie to a $500 warrior.  
5. **Profits first, product second** — no public launch until the ladder is real.  
6. **See · Trust · Own** — every session.

---

## 13. Index of empire documents

| File | Contents |
|------|----------|
| `00-PERSONAL-COMPANION-BRIEF.md` | Mission brief |
| `01-product-evaluation.md` | Product fit + 30-day backlog |
| `02-capital-path-realism.md` | Math, ruin, sizing tables |
| `03-security-robinhood-data.md` | Safe RH import design |
| `04-reality-check.md` | Ruthless readiness grade |
| `05-architecture-gaps.md` | Build phases P0–P2 |
| `99-MASTER-EVALUATION.md` | **This synthesis** |
| `book/01-OPTIONS-EDUCATION-GUIDE.md` | Personal education guide |
| `book/02-FEATURE-GRAPHICS-PROMPT-BOOK.md` | Feature graphic prompts |
| `book/03-GRAPHICS-PROMPTS-PRODUCTION.md` | 18 production image prompts |

---

## 14. Recommended next agent action

**Immediate engineering (Agency):**

1. `engineering-backend-architect` + `engineering-frontend-developer`  
   - EmpirePolicy + seed mode + RH paste  
   - Journal MVP + checklist wire  
2. `testing-reality-checker` retest after P0  

**Creative (optional parallel):**  
Generate book figures from `03-GRAPHICS-PROMPTS-PRODUCTION.md` Batch A.

---

_End of master evaluation. Agency consensus: powerful brain, unfinished money companion — build the survival loop next._
