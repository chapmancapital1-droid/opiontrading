# OptionScope — Integration Reality Check

**Agent:** TestingRealityChecker (RealityIntegration)  
**Mission lens:** Michael’s personal money-making companion ($500 → $5k first)  
**Assessment date:** 2026-07-12  
**Doctrine:** Default **NEEDS_WORK** unless overwhelming evidence. Capital first; public SaaS later.

---

## 1. Verdict

### **NEEDS_WORK**

| Label | Meaning | Applies? |
|-------|---------|----------|
| `SHIP_PERSONAL_MVP` | Michael can use this daily to size, decide, execute (manual RH), and learn from outcomes on a **$500–$5k** path | **No** |
| `NEEDS_WORK` | Core engine/brain exist; companion loop has critical holes | **Yes** |
| `BLOCKED` | Cannot make progress without external dependency or rewrite | **No** |

**One-line truth:**  
OptionScope is a **solid educational options lab + selector brain**, not yet a **$500 daily driver companion**. Phases 0–5 logic is real in code and tests. The **money loop** (see positions → size for *your* capital → checklist → fill → journal → learn) is incomplete. Design mocks and UI specs are ahead of the app shell.

**Do not ship as personal MVP.** Do not claim production/companion-ready. Keep paper + process until the bar in §4 is met.

---

## 2. Evidence table: claim vs proof

| Claim (roadmap / brief / README) | Proof examined | Reality |
|----------------------------------|----------------|---------|
| Phase 0 foundation (engine, build, tests) | `src/domain/*`, `tests/domain/*`, `package.json` scripts | **PASS** — payoff, BS, binomial, MC, strategy fixtures exist |
| Phase 1 live viz | `Dashboard.tsx`, TradingView components | **PASS** — chart + timeline on Command |
| Phase 2 live data | providers, chain API, builder “Load live chain” | **PASS (code)** — provider stack present; **runtime LIVE** depends on env keys (not verified in this pass) |
| Phase 3 MarketContext | `src/lib/marketContext.ts`, `MarketContextPanel`, tests | **PASS** — IV rank, trend, EM, liquidity, events, news |
| Phase 4 brain selector + sizing + gates | `src/brain/*`, `portfolioPolicy.ts`, `strategyRules.ts`, `tests/brain/*` | **PASS (logic)** — real selector, risk gates, growth allocate |
| Phase 4.1 live chain instantiate + engine score | `instantiate.ts`, `engineScore.ts`, `BrainRecommendPanel` | **PASS** — wired on Trade Lab after live load |
| Phase 4.2 PDF / book rules | `bookIngestRules.ts`, catalog ingest, tests | **PASS** — ~36 seeds + catalog search; rules load into selector |
| Phase 5 grounded explain | `explain.ts`, `/api/brain/explain`, explain tests | **PASS** — deterministic, no auto-trade language |
| Phase 5.0b Alpaca paper sizing | `alpacaTrading.ts`, `/api/alpaca/account`, `liveAccount.ts`, Brain panel fetch | **PASS (plumbing)** — keys → equity → `mapLiveToAccountState`; **no orders**. Unconfigured → demo fallback |
| Robinhood manual checklist path | `orderChecklist.ts`, `OrderChecklistCard.tsx` | **FAIL for daily use** — library + card exist; **not imported by builder or any page** |
| Compare strategies | `src/lib/compare.ts` vs `compare/page.tsx` | **ENGINE YES / UI STUB** — page says “being wired” |
| Trade journal | `journalRepo.ts`, `db/schema.sql` vs `journal/page.tsx` | **REPO YES / UI STUB** — “Connect Supabase” only |
| Saved trades | `saved/page.tsx` | **STUB** — same Supabase warning, no list/save flow in UI |
| Command = morning ritual (account strip, brain pulse, badges) | `04-ui-screen-specs.md` vs `Dashboard.tsx` + `layout.tsx` | **FAIL vs spec** — snapshot + chart only; **no Brain pulse, no AccountStrip, no LIVE/PAPER badges**; shell still `max-w-4xl` (spec said drop it) |
| Nav labels Command · Trade Lab · … | layout NAV | **PARTIAL** — routes exist; labels still “Dashboard / Strategy builder” |
| Demo / seed account matches $500 ladder | `demoAccount.ts` | **FAIL** — default **$25,000** equity, **$20k cash**, 100 sh AAPL/MSFT/SPY. Fantasy for Stage Seed |
| $500 micro defined-risk design | brief + `sizePosition` + growth-primary CSP | **FAIL** — brief correctly notes CSP on $200 stock needs ~$20k cash; **growthPrimary prefers wheel/CSP**; no micro-equity policy or $500 fixture tests |
| Robinhood account data in (CSV/paste) | brief req #2; grep across src | **MISSING** — no import, paste, or position reconciliation path |
| Education as personal guide + graphic prompts | brief req #4; `education/page.tsx` | **PARTIAL** — risk disclosure concepts only; no personal curriculum, no graphic prompt kit |
| No auto-trade | policy + selector + growth tests | **PASS** — `manual_checklist_only`; tests assert no auto-exec fields |
| Undefined risk blocked | riskGates + builder banner | **PASS** — hard gate + UI block language |
| Daily loss halt from live broker | alpaca account route sets `dailyRealizedPL: 0` | **WEAK** — circuit breaker cannot fire on real day P/L until activity API wired |
| Settings usable for companion | `settings/page.tsx` | **WEAK** — static env table only; no theme toggle, provider status chips, approval/growth mode, equity override |
| Design mocks = shipped UI | `design/mocks/*.html` vs app pages | **MOCKS AHEAD OF APP** — cockpit/journal ritual not implemented in React |
| “Phases 0–5 done” roadmap narrative | code inventory above | **LOGIC mostly done; companion surfaces incomplete** — do not equate roadmap checkmarks with daily-driver readiness |

### What was *not* re-run in this pass

- Live `npm test` / `next build` (not executed here; claims rest on file inventory + prior roadmap).
- Live Alpaca paper HTTP with real keys.
- Playwright / visual QA screenshots (no `public/qa-screenshots` pipeline observed for this product).
- Real OpenBB/Polygon chain quality against Robinhood fills.

Absence of runtime proof **downgrades** any “production ready” fantasy further.

---

## 3. Blockers for $500 → $5k companion use

These are ordered by “will this actually grow/protect capital in daily practice?”

### Critical (must fix before calling it a personal daily driver)

1. **Seed capital model is wrong**  
   Demo brain account = $25k + shares. Growth-primary stack elevates **CSP / wheel**. On $500 cash:
   - Most CSPs size to **0 contracts** (cash/collateral), or
   - UI may still *rank* CSP high while size is 0 — confusing and easy to misread  
   **Need:** seed profile ($500 / $1k / $5k), prefer **cheap underlyings + tight debit/credit spreads**, hard-filter strategies whose **1-lot max loss or collateral > budget**.

2. **Execution path broken for daily ritual**  
   Checklist card is **orphaned**. Brain gives `robinhoodNextStep` text, but Trade Lab does not surface **Copy checklist** after Analyze. Without that, companion value collapses to “interesting analysis.”

3. **No closed-loop memory (journal UI)**  
   Process learning for 10× growth requires: planned forecast → fill → close → score. Repo + schema exist; **page is a warning stub**. Phase 7 calibration cannot start. You cannot prove process edge without this.

4. **No Robinhood “what I already did” intake**  
   Brief requires CSV/export or paste (not reverse-engineered login). **Zero implementation.** Companion cannot flag open risk, duplicate legs, or “you already hold this” vs brain recs when trading on RH, not Alpaca.

5. **Alpaca paper ≠ Robinhood reality**  
   Sizing from Alpaca paper is useful for rehearsal. Real ladder money is RH. Without RH snapshot/import, sizing is **wrong broker / wrong positions**.

### High (will stall money process even if you force daily use)

6. **Compare UI stub** — engine ready; decision support “A vs B vs C” not usable in UI.  
7. **Saved trades stub** — cannot resume yesterday’s analysis without re-keying.  
8. **Command Center incomplete** — morning ritual should be: equity → gates → top 3 → Lab. Today: chart + links. Brain buried behind Lab + live load.  
9. **dailyRealizedPL always 0** from Alpaca route — false confidence on “DAILY_LOSS_OK.”  
10. **No $500 path tests** — growth lock sim starts at **$10k** with $90 max-loss lots; never proves seed survival math.

### Medium (quality / honesty / UX)

11. Shell still `max-w-4xl`; nav/copy lag design lock (Command / Trade Lab).  
12. Education is generic risk theater, not “Michael’s $500 playbook.”  
13. Settings cannot set approval level / growth mode / seed equity without code edit.  
14. Optional LM Studio coach correctly backburnered — **not a blocker**; don’t let AI polish substitute for journal + sizing truth.

### Capital-path realism (ruthless)

| Ladder stage | Can OptionScope *honestly* support it today? |
|--------------|-----------------------------------------------|
| **Seed $500** | **No as primary driver.** Analysis yes; process companion no. Many ranked income engines are capital-infeasible. |
| **Paper rehearsal (any size)** | **Partial.** Brain + chain + explain work if data keys configured. Checklist/journal missing. |
| **$500 → $5k process proof** | **No** until journal + seed policy + checklist + RH import exist and you complete N closed trades with recorded forecasts. |
| **$5k → $25k** | Premature to discuss. Policy modes exist on paper; unvalidated by live process. |

**Hard law from brief still correct:** paper until process works; small accounts cannot default to naked/undefined risk; many textbook “income” structures need more than $500.

---

## 4. Minimum bar to call “personal daily driver”

All of the following must be **true in the running app**, not only in unit tests:

### A. Capital honesty
- [ ] Seed account preset: **$500** (and $1k / $5k) selectable without editing source  
- [ ] When Alpaca unconfigured, UI **never implies** $25k is “your” account without a loud DEMO badge  
- [ ] Strategies with 1-lot collateral/max loss > remaining risk budget are **filtered or ranked last with “infeasible at equity”** — not presented as #1 with 0 contracts without explanation  
- [ ] Default preference at seed equity: **defined-risk micro spreads** (tight widths, liquid underlyings), not CSP on mega-cap names  

### B. Decision → action loop (same session)
- [ ] Load ticker → live chain → brain top 3 → **Load in Lab** with exact legs  
- [ ] Analyze → **OrderChecklistCard** with copy/print  
- [ ] Checklist includes max loss, contracts, net limit, expiry, leg actions  
- [ ] Still **zero** order placement buttons  

### C. Overnight memory
- [ ] Save analysis (localStorage acceptable for personal MVP if Supabase not set)  
- [ ] Journal: open planned trade with write-once forecast; close with realized P/L; list last 20  
- [ ] Morning Command shows: DEMO/PAPER/LIVE badges, equity (or seed override), gate status, brain pulse top 3 for focus symbol  

### D. Position awareness (minimal RH path)
- [ ] Paste or CSV import of open positions / recent fills (manual)  
- [ ] Brain/gates read imported shares for CC eligibility and open risk estimate  
- [ ] Explicit “RH import is user-provided; not live broker sync” labeling  

### E. Process proof gate (before treating as money brain)
- [ ] ≥ **20 paper** closed trades journaled with forecast vs outcome  
- [ ] Documented hit rate vs model PoP (even if model is wrong — honesty > fantasy)  
- [ ] No single trade risked > policy absolute max (5% equity) on seed  
- [ ] Written playbook: which underlyings, max width, max debit, when to stand down  

### F. Engineering hygiene for personal use
- [ ] `npm test` green; typecheck green  
- [ ] One smoke path documented: keys in `.env.local` → Lab → brain → checklist  
- [ ] Design labels Command / Trade Lab applied so muscle memory matches docs  

**Until A–D are done, call it a Lab, not a Companion.**

---

## 5. What would falsify readiness

Any of these falsifies “ready as personal daily driver” even if agents claim otherwise:

| Falsifier | Why it kills the mission |
|-----------|--------------------------|
| Demo equity still defaults to **$25k** without forced DEMO labeling on every metric | You will size fantasy risk |
| Top recommendation is CSP/wheel with **0 contracts** and no “infeasible” coaching | Brain looks smart, acts useless |
| User cannot copy a Robinhood checklist from the analyzed trade | Manual execution path is theater |
| Journal cannot record forecast → outcome | No process; no 10× proof; pure vibes |
| No way to inject RH positions | Companion blind to real book |
| LIVE badge while using demo chain/quotes | Trust death |
| Any path that places orders or asks for RH password | Doctrine violation — automatic fail |
| “A+ / production ready / luxury companion” without journal + seed policy evidence | Fantasy approval pattern |
| Growth simulation only at $10k+ with no $500 fixtures | Capital ladder untested |
| daily P/L always 0 while claiming risk gates protect the day | False safety |

**Falsifiers of a harsher “BLOCKED” verdict (none currently apply):**  
engine missing; selector missing; auto-trade only path; no defined-risk templates. Those would block. Here the product is **incomplete**, not dead.

---

## 6. Retest criteria

Re-run this agent / this doc only after the following **evidence package** exists:

### Must attach on retest
1. Screenshot or notes: Trade Lab with **$500** account → brain list showing **feasible** micro structures (or clear halt with coach copy)  
2. Screenshot: **OrderChecklistCard** populated from same analysis; copy works  
3. Screenshot: Journal with ≥1 open + ≥1 closed entry **or** local-first journal proof if Supabase skipped  
4. Screenshot: RH CSV/paste import → shares/open risk reflected in gates  
5. Command Center with account strip + brain pulse + DEMO/PAPER/LIVE badges  
6. `npm test` + `npm run typecheck` output (pass)  
7. Unit test: `sizePosition` / selector at **equity=500** with fixture chain (at least one defined-risk 1-lot feasible case and one CSP rejected/infeasible)  
8. Short written: 5-day paper ritual Michael actually ran  

### Pass thresholds for upgrade to `SHIP_PERSONAL_MVP`
- All of §4 A–D checked with evidence  
- No critical falsifier from §5  
- Honest label: **personal paper companion** until §4 E process proof complete  
- Upgrade to “use with real $500” only after §4 E (process proof) — **not** at first UI complete  

### Expected quality rating today

| Dimension | Rating | Note |
|-----------|--------|------|
| Quant engine | **B+** | Real, tested fixtures |
| Brain logic | **B** | Solid; capital-context incomplete |
| Live data plumbing | **B-** | Code ready; ops/env dependent |
| Companion UX loop | **D+** | Stubs + orphaned checklist |
| $500 ladder fitness | **D** | Defaults and priorities wrong |
| Design fidelity | **C-** | Specs/mocks strong; app lagging |
| **Overall personal MVP** | **C / NEEDS_WORK** | Normal for pre-companion; not ship |

**Timeline (realistic, not fantasy):**  
- **1 focused sprint:** seed policy + checklist wire + local save/journal MVP + Command brain pulse → *personal paper driver candidate*  
- **2–3 sprints + 20 paper closes:** process evidence → *optional real-seed use*  
- Public empire product: **after** real profits validate (brief doctrine) — out of scope for this cert  

---

## 7. Constructive sprint order (for next agents)

Ruthless priority for **money companion**, not feature theater:

1. **SeedAccountProfile** ($500/$1k/$5k) + filter infeasible 1-lots; demote CSP when cash < strike×100  
2. **Wire OrderChecklistCard** into Trade Lab after analyze / from brain load  
3. **Local-first journal + saved** (Supabase optional later) so process works offline  
4. **RH paste/CSV import** → `sharesHeld` + open risk proxy  
5. **Command Center:** AccountStrip + Brain pulse + badges; drop misleading demo equity  
6. Wire Compare UI to `compareStrategies`  
7. Fix `dailyRealizedPL` from broker activity or hide daily gate as “unknown”  
8. Then polish design tokens / nav rename / education personal playbook  

Do **not** prioritize: LM Studio, public SaaS chrome, backtest perfection, more PDF ingest, fantasy RH OAuth.

---

## 8. Cross-check vs prior narrative

| Narrative risk | Assessment |
|----------------|------------|
| Roadmap ✅ through Phase 5 implies “ready” | **Reject.** Phases mark **logic modules**, not companion loop completeness |
| README “trade journal” / “copyable checklist” | **Overclaims shipping state** — code exists, product surfaces incomplete |
| Design specs as “done UI” | Specs are **target**; React app is **earlier shell** |
| “Brain will make money” | Brain is **decision support**. Edge must be proven by journaled outcomes. No model PoP is a profit guarantee |

---

## 9. Final certification stamp

```
VERDICT:           NEEDS_WORK
PERSONAL MVP:      NOT READY
$500→$5k LADDER:   NOT SUPPORTED AS DAILY DRIVER
AUTO-TRADE:        CORRECTLY ABSENT (keep it that way)
RETEST:            After §6 evidence package
DEFAULT:           Held — fantasy approvals rejected
```

**Integration Agent:** RealityIntegration  
**Evidence basis:** source inventory (`src/brain`, `src/domain`, stubs under `compare|journal|saved`, `demoAccount.ts`, layout/Dashboard/builder, policy, design specs, companion brief, ROADMAP)  
**Evidence location:** this file `docs/empire/04-reality-check.md`  
**Re-assessment required:** after seed policy + checklist + journal + RH import land  

_Educational tooling only — not investment advice. Manual execution only._
