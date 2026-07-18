# OptionScope — UX Information Architecture & Flows

**Agent:** design-ux-architect (ArchitectUX)  
**Date:** 2026-07-12  
**Product:** OptionScope (`opiontrading`)  
**Upstream:** [`00-VISION-HANDOFF.md`](./00-VISION-HANDOFF.md), [`01-brand-foundation.md`](./01-brand-foundation.md)  
**Companion:** [`03-layout-and-tokens.md`](./03-layout-and-tokens.md)  
**Brand pillars in product chrome:** *See the trade. Trust the process. Own the decision.* → Command (see) · Trade Lab / brain (trust) · Checklist / Journal (own).

---

## 0. Decisions locked (do not re-open in sprint)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Nav labels | **Rename** for clarity & calm confidence | Functional stubs feel like admin SaaS; labels must encode the life-change ritual |
| Brain route | **No top-level `/brain`** — brain lives in **Trade Lab**, with a **Brain pulse** strip on Command | Brain without payoff/checklist is incomplete; dual routes = dual state bugs |
| Primary mental model | **Command → Lab → Checklist → Journal** | Morning scan, analyze, manual RH, calibrate |
| Desktop vs mobile | Desktop = analysis cockpit; mobile = review + checklist + halt | Matches non-negotiable #7 |
| Main content width | Drop global `max-w-4xl` on shell; use **zone max-widths** | Builder/Command need full cockpit width |
| Theme | Light / Dark / System toggle in shell header | Vision: dark first-class; tokens already exist |

### Navigation label map (implement)

| Route | Current label | **New nav label** | Page H1 |
|-------|---------------|-------------------|---------|
| `/dashboard` | Dashboard | **Command** | Command Center |
| `/builder` | Strategy builder | **Trade Lab** | Trade Lab |
| `/compare` | Compare | **Compare** | Compare strategies |
| `/saved` | Saved trades | **Saved** | Saved trades |
| `/journal` | Trade journal | **Journal** | Trade journal |
| `/settings` | Settings | **Settings** | Settings |
| `/education` | Education & risk | **Education** | Education & risk |

**Secondary / utility (not primary nav items):**

- Theme toggle (shell chrome)
- Data-mode badge: `Live · Paper · Demo` (shell chrome, always visible)
- Footer legal + OCC link (keep)
- In-page: Explain AI, Load in Lab, Copy checklist, Save trade

**Rejected alternatives:**

- “Brain” as top nav → over-promises a standalone product surface; brain is a *decision layer*, not a page.
- “Dashboard” kept as-is → too generic; “Command” encodes morning ritual from vision.
- “Builder” alone → undervalues ranking + checklist; “Trade Lab” = analysis workspace.

---

## 1. Site map

```
OptionScope (app shell)
│
├── /dashboard          Command Center          [LIVE · elevate]
│   ├── Account strip   (Alpaca paper equity, cash, positions count, halt)
│   ├── Market snapshot + context
│   ├── Chart + news (TradingView)
│   ├── Brain pulse     (top ranks / halt coach → Trade Lab)
│   └── Quick paths     (Lab, Compare, Journal, Education)
│
├── /builder            Trade Lab               [HERO · refine]
│   ├── Symbol + expiry + data source
│   ├── Market context (compact)
│   ├── Brain panel     (rank list, gates, Explain AI, Load)
│   ├── Structure editor (templates / legs / live chain)
│   ├── Analysis        (payoff, Greeks, MC PoP/EV — model estimates)
│   ├── Order checklist (copy for Robinhood — no Place Trade)
│   └── Save / Compare CTAs
│
├── /compare            Compare (3-up)          [STUB → design]
│   ├── Slot picker A | B | C
│   ├── Shared assumptions bar
│   └── Metric matrix + payoff overlays
│
├── /saved              Saved trades            [STUB → design]
│   ├── List / filter / sort
│   └── Open in Lab · Checklist · Archive
│
├── /journal            Trade journal           [STUB → design]
│   ├── Open positions ritual
│   ├── Log fill (open/close)
│   └── Forecast vs outcome scorecard
│
├── /settings           Settings                [basic → calm trust]
│   ├── Data providers (status, not secrets in browser)
│   ├── Theme preference
│   ├── Risk / size policy (display)
│   └── Connections health
│
└── /education          Education & risk        [content → voice]
    ├── Disclosures first
    ├── Model literacy concepts
    └── Links into Lab examples (optional later)
```

### Cross-cutting system objects (not pages)

| Object | Lives | User action |
|--------|-------|-------------|
| **Brain decision** | API → Command pulse + Lab panel | Rank, gate, halt, size cap |
| **Recommendation** | Brain panel card | Explain · Load in Lab |
| **Structure (legs)** | Trade Lab | Edit · Analyze · Save |
| **Analysis result** | Trade Lab / Compare | Model PoP/EV, BE, max loss |
| **Checklist** | Lab + Saved detail | Copy only — never auto-submit |
| **Journal entry** | Journal | Forecast snapshot + outcome |
| **Data mode badge** | Shell | Trust: Live / Paper / Demo |

---

## 2. Navigation architecture

### 2.1 Primary nav (sidebar desktop · bottom or top sheet mobile)

**Order (top → bottom)** — frequency + ritual:

1. **Command** — morning home
2. **Trade Lab** — hero work
3. **Compare** — decision aid
4. **Saved** — library of ideas
5. **Journal** — calibration ritual  
   ——— separator ———
6. **Settings**
7. **Education**

Active state: accent border + `surface-2` fill + medium weight. Icons retain Tabler-style set; update labels only in sprint 1.

### 2.2 Shell chrome (always)

```
[OptionScope]                    [● Paper · Alpaca] [Theme ▾] 
sidebar | main content zones...
footer: educational disclaimer + OCC
```

- **Data badge:** `Paper` (Alpaca paper), `Live data` (chain/quotes), `Demo` when provider is demo — three independent bits if needed, e.g. `Demo quotes · Paper account`.
- **Theme:** Light | Dark | System (see tokens doc).
- **No “Place trade” anywhere in shell.**

### 2.3 Mobile nav

- **≥ md:** left sidebar `w-56` (current pattern).
- **< md:** sticky **bottom tab bar** for primary 5 (Command, Lab, Compare, Saved, Journal); Settings + Education under “More” overflow or secondary top icon row.
- Checklist copy must be one-thumb reachable on Lab when analysis exists.

---

## 3. Four core journeys (flow steps)

### Journey A — Morning command center

**Goal:** Calm scan → ranked opportunity → enter Lab with context.  
**Emotional beat:** “The cockpit is ready; I’m not guessing.”

| Step | Screen | User sees / does | System |
|------|--------|------------------|--------|
| A1 | Command | Open app (default land `/dashboard`) | Load paper equity, watchlist context |
| A2 | Command | Account strip: equity, cash, P&L day, position count | Alpaca paper; badge **Paper** |
| A3 | Command | Market snapshot + context for focus symbol | IV rank, trend, events, liquidity |
| A4 | Command | Chart + news for symbol | TradingView widgets |
| A5 | Command | **Brain pulse:** top 1–3 structures or **Halt coach** | Brain decision; gates pills |
| A6 | Command | Tap **Load in Trade Lab** or **Explain** | Deep-link `/builder?symbol=&strategy=` |
| A7 | Trade Lab | Brain structure locked + analysis ready | Exact legs from brain |
| A8 | Trade Lab | Review checklist → **Copy checklist** | Clipboard; user goes to Robinhood manually |

**Exit criteria:** Checklist copied or idea Saved; never an in-app order.

---

### Journey B — Single trade dignity

**Goal:** Ticker → truth → manual RH.  
**Emotional beat:** “I see max loss before I risk capital.”

| Step | Screen | User sees / does | System |
|------|--------|------------------|--------|
| B1 | Trade Lab | Enter ticker · Load chain | Provider badge updates |
| B2 | Trade Lab | Expiry pick (brain-preferred default) | `pickPreferredExpiration` |
| B3 | Trade Lab | Brain panel ranks structures | Filter → score → size |
| B4 | Trade Lab | **Explain (AI)** on a rank card | Catalog-grounded citations |
| B5 | Trade Lab | **Load** recommendation | Legs pinned; template fallback off |
| B6 | Trade Lab | Payoff + MC metrics | Labels: *model estimates* |
| B7 | Trade Lab | Adjust legs if needed · re-analyze | Engine recompute |
| B8 | Trade Lab | **Copy checklist** · optional **Save** · optional **Compare** | No Place Trade CTA |
| B9 | External | Robinhood manual entry | Dignity of control |

---

### Journey C — Learning loop

**Goal:** Books in the loop → journal closes ego.  
**Emotional beat:** “I get smarter every trade, not louder.”

| Step | Screen | User sees / does | System |
|------|--------|------------------|--------|
| C1 | Trade Lab | Explain AI cites book rules | Phase 5 explainer |
| C2 | Education | Deepen concept (PoP, delta myths, credit risk) | Static concepts + disclosures |
| C3 | Trade Lab / Saved | Save analysis with forecast snapshot | Persist when Supabase up |
| C4 | Journal | After fill: log open with linked analysis | Forecast PoP/EV frozen |
| C5 | Journal | On close: log outcome | Realized P&L |
| C6 | Journal | Scorecard: forecast vs outcome | Calibration over time |

---

### Journey D — Risk halt

**Goal:** Failed gates feel like a wise coach, not a broken app.  
**Emotional beat:** “The brain protected me; I’m still in control.”

| Step | Screen | User sees / does | System |
|------|--------|------------------|--------|
| D1 | Command or Lab | Account/risk gate fails | `haltTrading: true` + reason |
| D2 | UI | **Halt coach panel** (not red error toast only) | Calm warning surface |
| D3 | UI | Shows: which gate, what it means, what to do | e.g. size, liquidity, event, equity |
| D4 | UI | Allowed: still **view/analyze** educationally | Rank list may empty or dim |
| D5 | UI | Blocked: **Load for live size** / checklist for RH may soft-block with confirmation | Never silent fail |
| D6 | Education / Settings | Link to policy / disclosures | Learn why |

**Halt coach copy pattern (voice):**

> **Pause on new risk.**  
> {reason in plain language}.  
> You can still study structures and run models. Capital sizing stays capped until gates clear.  
> *Educational rules — not a brokerage lockout.*

---

## 4. Empty, error, and halt states

### 4.1 Empty states (stub → product)

| Surface | Empty condition | UI treatment |
|---------|-----------------|--------------|
| **Saved** | No saved trades / no Supabase | Illustration-free calm card: “Save analyses from Trade Lab to reopen, tweak, and rebuild checklists.” CTA → Trade Lab. Secondary: connect Supabase (Settings). |
| **Journal** | No entries / no Supabase | “Calibration starts with one closed trade.” CTA → log first fill · link Trade Lab for forecast. Warning only if env missing (not panic). |
| **Compare** | No slots filled | Three empty slots with “Add from Lab / Saved / Template.” |
| **Brain panel** | No ticker / chain | “Load a symbol to rank structures.” |
| **Brain panel** | Chain OK, zero pass filter | “No structures passed rules for this context.” Show failed filters as coach pills. |
| **Command chart** | Invalid symbol | Inline form error; keep last good symbol. |
| **Checklist** | No analysis yet | Disabled copy button + “Analyze a structure first.” |

### 4.2 Error states

| Error | Tone | Pattern |
|-------|------|---------|
| Chain load fail | Honest, recoverable | Inline error on Lab load row: message + Retry + switch provider hint (Settings) |
| Brain API fail | Non-blocking | Panel error with Retry; Lab templates still work |
| Explain AI fail | Soft | “Explain unavailable — try again.” Keep rank card usable |
| Quote stale | Trust badge | Freshness chip: `Stale · {age}` + refresh |
| Supabase down | Warning surface | Yellow `bg-warning` card (existing pattern); rest of app works |
| Network offline | System | Banner: “You’re offline — models use last inputs only.” |

**Never:** full-page crash for a single panel failure. Isolate errors to the failing card/panel.

### 4.3 Halt states (gates)

| Gate type | Visual | Interaction |
|-----------|--------|-------------|
| **Account halt** | Full-width coach banner (warning tokens) | Explain reason; analysis allowed |
| **Per-strategy fail** | Dimmed rank card + fail pills | Explain still available; Load may require “Study only” |
| **Size cap** | Size metric shows capped contracts | Tooltip: policy source |
| **Event / liquidity** | Context chips red/amber | Brain down-ranks or filters |

### 4.4 Trust badges (global)

| Badge | Meaning |
|-------|---------|
| `Demo` | Synthetic / demo market data |
| `Live` | Real quotes/chains from configured provider |
| `Paper` | Alpaca paper account driving equity/sizing |
| `Model estimate` | PoP, EV, MC outputs — not guarantees |

Place badges near the data they describe (metric headers, shell for account/data mode).

---

## 5. Page-level UX contracts

### Command Center (`/dashboard`)

**Job:** Orient capital + market + brain before any click in Robinhood.

**Hierarchy:**

1. Title row + symbol load  
2. Account strip (new elevation)  
3. Market snapshot  
4. Market context  
5. Brain pulse (new)  
6. Chart | News  
7. Quick paths  
8. Disclaimer microcopy  

**Primary CTAs:** Load chart · Load in Trade Lab · Explain (if rank present)  
**Anti-CTAs:** No trade buttons.

### Trade Lab (`/builder`)

**Job:** Hero workspace — brain + engine + checklist.

**Hierarchy (desktop 2-column):**

- **Left / main:** Symbol load → structure → payoff/MC analysis  
- **Right rail (~360–400px):** Brain panel sticky → then checklist when analysis ready  
- **Above fold on load:** Market context compact + brain  

**Primary CTAs:** Analyze · Explain · Load · Copy checklist · Save  
**Secondary:** Send to Compare · Open Education concept  

### Compare (`/compare`)

**Job:** Up to **3** structures, same assumptions, honest side-by-side.

**Layout:** 3 equal columns desktop; horizontal snap cards mobile.  
**Shared bar:** spot, IV, DTE, drift mode, sims.  
**Matrix:** net debit/credit, max profit/loss, BEs, model PoP, model EV, return-on-risk.  
**CTA per column:** Open in Lab · Copy checklist  

### Saved (`/saved`)

**Job:** Idea library → reopen dignity.

**List row:** symbol, strategy name, date, model PoP/EV snapshot, max loss, data-mode at save.  
**Actions:** Open in Lab · Checklist · Compare slot · Archive  

### Journal (`/journal`)

**Job:** Forecast vs outcome ritual (calibration, not diary fluff).

**Sections:**

1. **Open loop** — positions needing close log  
2. **Log fill** form (open/close, qty, price, fees, date)  
3. **Scorecard** — planned PoP/EV vs realized; optional tags (emotion, thesis)  
4. **History** table  

### Settings (`/settings`)

**Job:** Trust and control without exposing secrets in the browser.

- Connection health (ok / missing env)  
- Theme preference  
- Provider display names (not raw secret values)  
- Risk policy summary (read-only until product owns edits)  
- Link docs  

### Education (`/education`)

**Job:** Risk theater done right + model literacy.

- Disclosures block first (keep warning tokens)  
- Concepts scannable  
- Footer OCC always available via shell  

---

## 6. Wireframe-level layouts

### 6.1 Command Center

```
┌─ SHELL ─────────────────────────────────────────────────────────────┐
│ OptionScope    [● Live data · Paper]              [☀ Light|Dark|Sys] │
├─ NAV ──┬─ MAIN (full width, px-6) ──────────────────────────────────┤
│Command●│  Command Center                    [ AAPL▾ ] [Load chart]  │
│Trade Lab│ ┌─ ACCOUNT STRIP ───────────────────────────────────────┐ │
│Compare │ │ Equity $xx,xxx  Cash $x,xxx  Day ±$xx  Pos 3  Gates ✓ │ │
│Saved   │ └────────────────────────────────────────────────────────┘ │
│Journal │ ┌─ SNAPSHOT ─────────┐ ┌─ CONTEXT ──────────────────────┐ │
│        │ │ Spot · Change · IV  │ │ IV rank · Trend · EM · Events  │ │
│───     │ └────────────────────┘ └────────────────────────────────┘ │
│Settings│ ┌─ BRAIN PULSE ──────────────────────────────────────────┐ │
│Educat. │ │ Top ranks: 1 CSP · 2 Bull put · 3 Cov call   [Explain] │ │
│        │ │ Size cap: 2  ·  [Load #1 in Trade Lab]                 │ │
│        │ └────────────────────────────────────────────────────────┘ │
│        │ ┌─ CHART (flex) ──────────────┐ ┌─ NEWS (360) ──────────┐ │
│        │ │ TradingView                 │ │ Timeline              │ │
│        │ │                             │ │                      │ │
│        │ └─────────────────────────────┘ └───────────────────────┘ │
│        │ [Trade Lab] [Compare] [Journal] [Education]  quick cards   │
│        │ … educational microcopy …                                  │
└────────┴────────────────────────────────────────────────────────────┘
```

**Halt variant (Brain pulse becomes coach):**

```
│ ┌─ HALT COACH ────────────────────────────────────────────────────┐ │
│ │ ⏸ Pause on new risk                                             │ │
│ │ {haltReason} · Analysis still available · Sizing locked         │ │
│ │ [Review in Trade Lab]  [What this means → Education]            │ │
│ └─────────────────────────────────────────────────────────────────┘ │
```

---

### 6.2 Trade Lab (+ Brain)

```
┌─ NAV ──┬─ TRADE LAB ────────────────────────────────────────────────┤
│        │  Trade Lab · AAPL · Exp 2026-08-15 · [Live] [Paper]        │
│        │  [Ticker____] [Load chain]  Expiry▾   source freshness     │
│        │ ┌─ Market context (compact strip) ───────────────────────┐ │
│        │ └────────────────────────────────────────────────────────┘ │
│        │ ┌─ STRUCTURE / ENGINE (1fr) ─────┐ ┌─ BRAIN RAIL (380) ──┐ │
│        │ │ Template▾ | Legs table          │ │ Brain · vX · manual │ │
│        │ │ Spot σ DTE r q drift sims       │ │ Gates: ✓ ✓ ✗        │ │
│        │ │ [Analyze]                       │ │ ┌ rank card #1 ───┐ │ │
│        │ │                                 │ │ │ score · size    │ │ │
│        │ │ ┌ Payoff chart ───────────────┐ │ │ │ [Explain][Load] │ │ │
│        │ │ └─────────────────────────────┘ │ │ └─────────────────┘ │ │
│        │ │ Metrics: max loss · BEs ·       │ │ #2 … #3 …           │ │
│        │ │ model PoP · model EV · CI       │ │ or HALT coach       │ │
│        │ │ MC histogram                    │ │                     │ │
│        │ │                                 │ │ ┌ CHECKLIST ──────┐ │ │
│        │ │ [Save] [Send to Compare]        │ │ │ RH steps        │ │ │
│        │ │                                 │ │ │ [Copy checklist]│ │ │
│        │ │                                 │ │ └─────────────────┘ │ │
│        │ └─────────────────────────────────┘ └─────────────────────┘ │
└────────┴────────────────────────────────────────────────────────────┘
```

**Mobile Lab:** stack Symbol → Brain (collapsible) → Structure → Analysis → sticky **Copy checklist** bar.

---

### 6.3 Compare (3-up)

```
┌─ COMPARE STRATEGIES ────────────────────────────────────────────────┐
│ Shared: Spot [__]  IV [__]  DTE [__]  Drift [RN▾]  Sims [20k] [Run] │
├──────────────────┬──────────────────┬───────────────────────────────┤
│ SLOT A           │ SLOT B           │ SLOT C                        │
│ [+ Add structure]│ [+ Add]          │ [+ Add]                       │
│ or AAPL CSP …    │ AAPL bull put    │ empty                         │
│                  │                  │                               │
│ Payoff mini      │ Payoff mini      │ placeholder                   │
│ Net: +$180       │ Net: −$420       │                               │
│ Max loss: $x     │ Max loss: $y     │                               │
│ BE: …            │ BE: …            │                               │
│ model PoP: 62%   │ model PoP: 48%   │                               │
│ model EV: +$12   │ model EV: −$5    │                               │
│ RoR: …           │ RoR: …           │                               │
│ [Open Lab][Copy] │ [Open Lab][Copy] │                               │
└──────────────────┴──────────────────┴───────────────────────────────┘
│ Optional: overlay chart (all three P/L curves, muted colors)        │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 6.4 Journal ritual

```
┌─ TRADE JOURNAL ─────────────────────────────────────────────────────┐
│ Trade journal                    [+ Log fill]                       │
│ Calibration: forecast vs outcome · Educational scoring only         │
├─ OPEN LOOPS ────────────────────────────────────────────────────────┤
│ ○ AAPL CSP  opened 06-01  forecast PoP 64%  [Log close]             │
│ ○ …                                                                 │
├─ LOG FILL (drawer or inline) ───────────────────────────────────────┤
│ Side: Open|Close  Symbol  Strategy  Qty  Price  Fees  Date          │
│ Link analysis: [Saved▾]  Notes: [thesis / emotion tags]             │
│ [Save entry]                                                        │
├─ SCORECARD (selected / latest close) ───────────────────────────────┤
│ ┌ Model forecast ──┐  ┌ Realized ──────────┐  ┌ Calibration ─────┐ │
│ │ PoP 64% (model)  │  │ P&L +$210          │  │ Hit / Miss       │ │
│ │ EV +$18 (model)  │  │ Hold 12d           │  │ Notes…           │ │
│ │ Max loss $800    │  │ Exit reason ▾      │  │                  │ │
│ └──────────────────┘  └────────────────────┘  └──────────────────┘ │
├─ HISTORY ───────────────────────────────────────────────────────────┤
│ Date · Symbol · Structure · Forecast PoP · Realized · Δ vs model    │
└─────────────────────────────────────────────────────────────────────┘
```

**Empty journal:** single coach card + Log fill + “Why journal?” link to Education concept.

---

### 6.5 Saved list

```
┌─ SAVED TRADES ──────────────────────────────────────────────────────┐
│ Saved trades          [Search]  Sort: Recent▾  Filter: Symbol▾      │
├─────────────────────────────────────────────────────────────────────┤
│ ┌ row ────────────────────────────────────────────────────────────┐ │
│ │ AAPL · Cash-secured put · 2026-07-10 · Paper snapshot           │ │
│ │ model PoP 64% · model EV +$18 · Max loss $820 · 2 contracts     │ │
│ │ [Open in Lab] [Checklist] [Compare] [⋯]                         │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│ ┌ row ────────────────────────────────────────────────────────────┐ │
│ │ …                                                               │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│ empty → calm CTA to Trade Lab + Settings if persistence offline     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. Interaction patterns (global)

| Pattern | Spec |
|---------|------|
| **Primary button** | Accent fill — Analyze, Load, Copy checklist |
| **Secondary button** | Border surface — Save, Compare, Retry |
| **Ghost** | Explain, Education links |
| **Destructive** | Rare — Archive only; never “trade” red |
| **Focus** | Visible 2px accent ring (WCAG) |
| **Hover cards** | `surface-1` lift, no casino glow |
| **Metrics** | Success/danger/warning semantic text; always pair PoP with EV |
| **Pills/gates** | OK = success; fail = danger/muted; halt = warning banner |
| **Sticky checklist** | Lab right rail desktop; bottom bar mobile after analyze |

---

## 8. Accessibility foundation

- Semantic landmarks: `nav`, `main`, `complementary` (brain rail), `status` for halt  
- All icon-only controls need `aria-label`  
- Theme toggle: `role="radiogroup"`  
- Tables in Settings/Journal: proper headers  
- Color never sole signal for gates (icon + text)  
- Target size ≥ 44px on mobile checklist actions  
- Contrast AA on text-primary/secondary vs surfaces  

---

## 9. Priority order — frontend implementation (1-week sprint)

Assume one focused frontend week on top of live engine/brain.

| Day | Priority | Work | Why |
|-----|----------|------|-----|
| **1** | P0 Shell | Nav labels (Command, Trade Lab, …); active route; drop main `max-w-4xl` → zone widths; data-mode badge; theme toggle wired to `data-theme` | Everything sits in shell |
| **1–2** | P0 Command | Account strip; Brain pulse / Halt coach; hierarchy spacing; symbol form polish | Morning journey |
| **2–3** | P0 Trade Lab | Two-column Lab layout (engine + sticky brain/checklist); CTA hierarchy; model-estimate labels | Hero workflow |
| **3–4** | P1 Compare | Full 3-up UI on `src/lib/compare.ts`; empty slots; shared assumptions; Open in Lab | Highest design gap |
| **4** | P1 Journal | Ritual layout: open loops, log fill, scorecard shells (Supabase when present; honest empty) | Calibration promise |
| **5** | P1 Saved | List + empty + row actions (Open Lab / Checklist) | Completes library loop |
| **5** | P2 Settings / Education | Health badges, theme setting, disclosure polish, voice pass | Trust |
| **Buffer** | Polish | Error isolation, stale chips, mobile bottom tabs, focus rings | AA + mobile checklist |

**Out of sprint (do not block):** logo pack, marketing site, auto-trade anything, freestanding `/brain` route, casino animations.

**Definition of done (sprint):**

1. User can complete Journey A and B without confusion.  
2. Halt coach is visible and calm when `haltTrading`.  
3. Compare shows three structures with model metrics.  
4. No primary “Place trade” CTA exists.  
5. Light/dark/system works from shell.

---

## 10. Success check (UX)

Traders open OptionScope **before** Robinhood because:

- Command makes capital + market + brain legible in one breath  
- Trade Lab makes max loss and model truth impossible to miss  
- Checklist preserves agency  
- Halt feels like coaching  
- Journal makes ego accountable  

If it still feels like a generic admin table → failed vision.  
If it feels like a casino → failed trust.  
**Target:** calm cockpit for serious capital.

---

**ArchitectUX** · Foundation date: 2026-07-12  
**Next:** UI Designer → high-fidelity screen specs / component polish from these wireframes + tokens in `03-layout-and-tokens.md`
