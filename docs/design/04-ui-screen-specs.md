# OptionScope — UI Screen Specs

**From:** design-ui-designer  
**Product:** OptionScope (opiontrading)  
**Date:** 2026-07-12  
**Aligns to:** `00-VISION-HANDOFF.md`, `01-brand-foundation.md`, `02-ux-ia-and-flows.md`, `03-layout-and-tokens.md`, `src/app/globals.css`  
**Emotional brief:** Calm cockpit for serious capital. Second brain. Clarity before capital. Manual checklist dignity. Not casino. Not generic SaaS admin.  
**Brand pillars in chrome:** *See the trade. Trust the process. Own the decision.* → Command · Trade Lab · Checklist/Journal.

### Upstream decisions locked (do not reopen)

| Item | Spec |
|------|------|
| Nav labels | **Command · Trade Lab · Compare · Saved · Journal · Settings · Education** |
| Routes | unchanged (`/dashboard`, `/builder`, …) |
| Brain | **No `/brain` route** — full brain in Trade Lab; **Brain pulse** on Command |
| Shell width | Drop global `max-w-4xl`; use zone-cockpit / zone-list / zone-reading |
| CTAs | Analyze · Explain · **Load in Lab** · Copy checklist · Save — never Place Trade |
| Tagline | See the trade. Trust the process. Own the decision. |

---

## Global chrome (all authenticated routes)

### Shell layout

| Zone | Spec |
|------|------|
| **Sidebar** | 224px (`w-56`) desktop; collapsible to icons at `< md`; bottom sheet / top bar on mobile |
| **Brand mark** | Wordmark “OptionScope” + small scope ring glyph (monoline circle + crosshair tick at 2 o’clock). Weight medium, not bold-tech. |
| **Nav items** | Labels per UX map: Command, Trade Lab, Compare, Saved, Journal, Settings, Education. 14px / 500; 8px pad; active = `bg-accent` + `text-accent` + 2px left bar |
| **Main** | **No global max-w-4xl.** Zones: `zone-cockpit` (Command, Trade Lab, Compare) full width; `zone-list` Journal/Saved ≤56rem; `zone-reading` Education ≤48rem; `zone-form` Settings ≤40rem |
| **Page padding** | `space-6` (24px) desktop / `space-4` (16px) mobile |
| **Mobile nav** | Bottom tabs: Command, Trade Lab, Compare, Saved, Journal; Settings + Education in More |
| **Footer** | Always-visible educational strip: 11–12px muted. OCC link. “Not investment advice · Manual execution only.” Never bury this. |

### Density & type

| Token use | Value |
|-----------|--------|
| Page title | 24px / 500 / tracking −0.01em |
| Section title | 14px / 500 |
| Body | 14px / 400 / `text-secondary` for supporting |
| Metric value | 18–20px / 500 tabular-nums |
| Metric label | 11px / 500 / uppercase optional · letter-spacing 0.04em · `text-muted` |
| Micro / legal | 11px `text-muted` |
| Radius | Cards `12px` (rounded-xl); tiles `8px`; pills `999px` |
| Borders | 1px `var(--border)`; emphasis `var(--border-strong)` or accent |

### Color application (cockpit rules)

- Background hierarchy: `surface-1` page → `surface-2` cards → nested tiles on `surface-1` again (depth without heavy shadows).
- Shadows: prefer **border + subtle elevation** `0 1px 0 rgba(0,0,0,0.04)` light / `0 1px 0 rgba(0,0,0,0.2)` dark. No glassmorphism, no glow stacks.
- Success / danger only for **P&L, gates, risk** — never decorative.
- Accent blue for **focus, links, primary analysis CTAs** only.
- **No green “go trade” primary buttons.**

### Primary CTA language (all screens)

| Allowed primary | Forbidden |
|-----------------|-----------|
| Analyze | Place trade / Buy / Sell / Execute |
| Load in Lab | Submit order |
| Explain (AI) | Auto-trade / One-click |
| Copy checklist | Connect Robinhood password |
| Save analysis / Save to journal | |

### Badge system (global)

| Badge | Visual | When |
|-------|--------|------|
| **LIVE** | Pill, `bg-accent` / `text-accent`, 10px caps | Real provider quotes (Polygon/OpenBB/Alpaca market data) |
| **DEMO** | Pill, neutral surface + muted text, dashed border optional | `usingDemoFallback` or demo provider |
| **PAPER** | Pill, warning-tint bg / warning text | Alpaca paper account driving size |
| **LIVE ACCT** | Pill, success-tint (muted) | Alpaca live mode only — still no order button |
| **MODEL EST.** | Pill or inline suffix on metric labels | PoP, EV, Monte Carlo, any probabilistic output |
| **HALT** | Danger bg + danger text, full-width banner when active | Risk gates halt trading education mode |
| **NCI** | Neutral pill; success if gates pass; warn if conflict | NCI TA snapshot present |
| **GROWTH-PRIMARY** | Accent micro-label on rank cards | Selector preferred income/growth engine |

**Always pair data source + account mode:** e.g. `LIVE · PAPER` means live chain + paper equity sizing.

### Theme

- Dark is **first-class** and preferred default for analysis (matches trading hours focus).
- Light must pass WCAG AA on all text/icon pairs (4.5:1 body, 3:1 large/UI).
- Respect `data-theme` override over `prefers-color-scheme`.

### Accessibility

- Focus rings: 2px solid `border-accent`, offset 2px.
- Touch targets ≥ 44px on checklist CTAs and mobile nav.
- `prefers-reduced-motion`: disable rank-card lift and chart animations.
- All metrics have visible labels (not color-only).
- Gate fail/pass never color-only — include text “OK” / “Warn” / “Halt”.

---

## 1. Command Center

**Route:** `/dashboard` · **Nav:** Command · **H1:** Command Center  
**Job:** Morning ritual — equity, context, chart, **Brain pulse** → deep work in Trade Lab.  
**Emotional tone:** Quiet readiness. Mission board, not news feed casino.  
**Pillar:** *See the trade.*

### Hierarchy (top → bottom)

1. **Command header** — Title + symbol search + shell data badges (LIVE · PAPER · DEMO)  
2. **Account strip** — Paper equity, cash, buying power, risk budget remaining, open option risk  
3. **Watch / focus symbol row** — Snapshot tiles (spot, ATM IV, nearest expiry, earnings)  
4. **Context grid** — Seven brain signals as compact context tiles  
5. **Brain pulse** — Top 3 ranked structures (compact rank cards) **or** halt coach · CTA “Open in Trade Lab”  
6. **Primary workspace** — Chart (dominant) + news timeline (secondary column)  
7. **Journey rails** — Trade Lab, Compare, Journal, Education  
8. **Footer disclaimer**

### Layout (desktop ≥ 1024px)

```
┌─ Sidebar ─┬─ Command header (symbol · badges · account) ──────────────┐
│           ├─ AccountStrip ────────────────────────────────────────────┤
│           ├─ MarketSnapshot tiles ────────────────────────────────────┤
│           ├─ Context tiles (7) ───────────────────────────────────────┤
│           ├─ Brain pulse (top 3 / halt coach) ────────────────────────┤
│           ├─ Chart (flex 1) ────────────┬─ News timeline (360px) ─────┤
│           ├─ Journey rails ───────────────────────────────────────────┤
└───────────┴───────────────────────────────────────────────────────────┘
```

*(UX wireframe order: brain pulse before chart is preferred so ranking is not buried under TV chrome. Mocks may show either; implement brain pulse above chart.)*

### Components

| Component | Notes |
|-----------|--------|
| Symbol field | 200–240px; mono-friendly; placeholder `NASDAQ:AAPL` |
| Load chart | Soft accent (`bg-accent` + `text-accent`) — not solid green |
| AccountStrip | Full width; sticky optional |
| MarketSnapshot | Metric tiles; badge LIVE/DEMO top-right of card |
| Context tiles | Seven signals; tone-coded pills |
| Chart chrome | Title “Live chart · {SYMBOL}”; source attribution right |
| **Brain pulse** | Compact rank cards #1–#3; CTAs: Explain · **Load in Lab**; link “Open full brain in Trade Lab” |
| Journey rails | Trade Lab · Compare · Journal · Education |

### CTAs

| Priority | Label | Destination |
|----------|-------|-------------|
| Primary | Load chart | In-page symbol bind |
| Primary (brain) | Load in Lab | `/builder` + strategy payload |
| Secondary | Open full brain in Trade Lab | `/builder` focused on brain rail |
| Tertiary | Journey rails | Lab / Compare / Journal / Education |

### Empty / edge states

| State | UI |
|-------|-----|
| No symbol | Gentle empty: “Enter a ticker to open the command center.” |
| Demo fallback | DEMO badge + calm note: “Demo chain — connect a provider in Settings for live quotes.” |
| Alpaca unavailable | Account strip shows demo account + muted note |
| No brain matches | “No structures ranked for this context. Widen DTE or try another symbol.” |
| Halt | Danger banner; suppress rank list; coach copy (not error red scare) |

### Mobile

- Stack: header → account → snapshot → context (2-col) → chart full width → news collapsed accordion → brain list → rails.
- Checklist review later is more important than chart height; chart min-height 280px.

---

## 2. Trade Lab — Hero Cockpit

**Route:** `/builder` · **Nav:** Trade Lab · **H1:** Trade Lab (strategy name as subhead or loaded title)  
**Job:** Single trade dignity — structure → truth → checklist.  
**Emotional tone:** Surgical calm. Every number earns its place.  
**Pillar:** *Trust the process.*

### Hierarchy

1. **Lab header** — Strategy name / “Trade Lab”, symbol, expiry, LIVE/DEMO, contracts  
2. **Account strip** (compact)  
3. **Dual-rail core (lg+)**  
   - **Left (engine)** — Legs editor, Analyze, payoff, Greeks, Monte Carlo, metric strip  
   - **Right (brain rail ~380px, sticky)** — Gates, ranks, Explain, Load  
4. **Market context** (compact under brain or above rails)  
5. **Order checklist** — Copy / Print / Save · own the decision  
6. **Disclaimer**

### Layout (desktop)

```
┌─ Header: Trade Lab · strategy · symbol · expiry · badges ─────────────┐
├─ AccountStrip compact ────────────────────────────────────────────────┤
├─ Structure / Analyze / payoff / MC ───┬─ Trading brain (sticky) ──────┤
│  Metric strip (MODEL EST. on PoP/EV)  │  Gates · NCI · ranks          │
│                                       │  Explain · Load in Lab        │
├─ Order checklist ─────────────────────┴───────────────────────────────┤
```

### Brain panel visual order

1. Title: `Trading brain · {TICKER}` + version micro  
2. Account pills  
3. Expiry note  
4. Gate strip (Account · NCI · Context confidence · Risk budget)  
5. Halt banner **or** rank cards (#1…#5)  
6. Expandable Explain (AI) — catalog-grounded, citations  
7. Disclaimer line

### Rank card anatomy

```
┌ Rank #1 · Bull put credit ──── growth-primary ── [Explain] [Load in Lab] ─┐
│ score 0.86 · income engine · 2 contracts · risk $420                        │
│ ┌ Model PoP* ┐ ┌ Model EV* ┐ ┌ Payoff RoR ┐ ┌ Max loss/lot ┐               │
│ │   68.2%    │ │   +$42    │ │   0.31x    │ │    $210      │               │
│ └────────────┘ └───────────┘ └────────────┘ └──────────────┘               │
│ Strikes note…                                                                │
│ ▸ Why this rank · entry / exit · Robinhood path                              │
└──────────────────────────────────────────────────────────────────────────────┘
* Label: “model estimate” microcopy under PoP/EV (never bare “PoP” as fact)
```

### Payoff / chart chrome

- Grid lines: low contrast border color at 40% opacity  
- Zero P&L line: `text-muted` dashed  
- Spot marker: accent  
- BE markers: warning or secondary, labeled  
- No gradient fills that look like “profit green mountains” — flat area at 8–12% opacity success/danger

### CTAs

| Priority | Label |
|----------|-------|
| Primary | **Analyze** (recompute payoff/MC) |
| Primary (brain) | **Load in Lab** |
| Secondary | **Explain (AI)** |
| Secondary | **Copy checklist** (own the decision) |
| Tertiary | Print / PDF · Save analysis · Save to journal · Send to Compare |

### Empty / edge

| State | UI |
|-------|-----|
| Idle brain | “Load a ticker to run the OptionScope trading brain.” |
| Loading | Skeleton tiles + “Running selector + engine…” |
| Error | Danger text + retry |
| Undefined max loss | **UNDEFINED** in danger emphasis — never hide |
| Size 0 | “size 0 (budget / max-loss)” muted coach note |

### Mobile

- Brain collapses above or below legs as accordion tabs: **Structure | Brain | Results | Checklist**
- Sticky **Copy checklist** above bottom tab bar (`bottom: calc(56px + safe)`)

---

## 3. Compare

**Route:** `/compare`  
**Job:** Side-by-side truth for up to 3 structures.  
**Maturity:** Stub → full design now.

### Hierarchy

1. Header + “Add strategy” (from builder saved / brain pick / blank)  
2. Column headers (A | B | C) with strategy name, legs summary, badges  
3. **Comparison matrix** rows  
4. Overlay payoff chart (optional toggle)  
5. Winner highlights are **structural** (best model PoP, lowest max loss) — not gamified trophies  

### Matrix rows

| Row | Notes |
|-----|--------|
| Net debit/credit | Signed $ |
| Max profit | unlimited capable |
| Max loss | UNDEFINED danger treatment |
| Break-evens | List |
| Model PoP | Badge MODEL EST. |
| Model EV | Badge MODEL EST. |
| Payoff RoR | × |
| Capital / collateral | $ |
| Suggested contracts | From brain if linked |
| Book role | income / growth / hedge |

### Layout

- Desktop: 3 equal columns, sticky first column labels  
- Mobile: horizontal scroll with snap; label column sticky left 120px  

### Empty state

Illustrated quiet empty (Scope Mark monoline faint):  
“Compare up to three structures. Load from Trade Lab or Saved.”  
CTA: **Open Trade Lab** · **Open Saved**

### CTAs

- Add slot · Remove slot · **Load in Lab** · Copy summary  

**No “best trade” confetti.** Soft highlight: `bg-accent` at 40% on winning cell only.

---

## 4. Journal — Forecast vs Outcome Ritual

**Route:** `/journal`  
**Job:** Calibration over ego. Close the loop.  
**Emotional tone:** Reflective, honest, non-judgmental.

### Hierarchy

1. Header + period filter (7d / 30d / YTD / All)  
2. **Calibration strip** — forecast hit rate, avg model PoP vs win rate, total realized  
3. Entry list (cards)  
4. Detail drawer / page: open forecast → close outcome → score  

### Journal entry card

```
┌ AAPL · Bull put credit · closed ─────────────────── +$86  ┐
│ Opened 2026-06-02 · Closed 2026-06-12 · 2 lots              │
│ Model PoP at entry 64%  ·  Outcome: WIN                     │
│ Forecast vs outcome: aligned ✓                              │
└─────────────────────────────────────────────────────────────┘
```

### Detail ritual sections

1. **What I planned** — checklist snapshot, model metrics (MODEL EST.)  
2. **What happened** — fills, exit reason, realized P&L  
3. **Score** — binary or graded: aligned / optimistic / pessimistic  
4. **Note** — free text, optional emotion tag (calm / rushed / FOMO) — never shaming palette  

### Empty states

| State | Copy |
|-------|------|
| No Supabase | Warning card → Settings link (trust, not panic) |
| Connected, zero entries | “Your first closed trade becomes the brain’s memory. Save a checklist from Trade Lab.” |
| Filter empty | “No entries in this period.” |

### CTAs

- New entry (manual) · Import from saved checklist · Export CSV (secondary)

---

## 5. Saved trades

**Route:** `/saved`  
**Job:** Resume analysis; promote to checklist/journal.

### Hierarchy

1. Header + search + sort (recent / symbol / strategy)  
2. Grid or list of saved analysis cards  
3. Bulk actions minimal (delete only with confirm)

### Saved card

- Symbol · strategy name · saved date  
- Spot at save · expiry · model PoP (MODEL EST.) · max loss  
- Badges: DEMO/LIVE at save time frozen  
- Actions: **Open in Lab** · **Checklist** · Delete  

### Empty

Scope Mark + “Saved analyses live here. From Trade Lab, save after Analyze.”  
CTA: **Open Trade Lab**

### Supabase missing

Same calm warning pattern as Journal (border-warning, bg-warning).

---

## 6. Settings — Trust surface

**Route:** `/settings`  
**Job:** Data provenance, theme, account mode honesty.  
**Emotional tone:** Institutional calm. No marketing clutter.

### Sections

1. **Theme** — System / Light / Dark (segmented control)  
2. **Data providers** — status chips: connected / missing / demo  
3. **Account** — Alpaca paper/live mode read-only status (keys never client-displayed)  
4. **Env reference table** — current educational table, refined typography  
5. **Risk preferences** (future) — approval profile, growth mode, max daily risk %  
6. **Danger zone** — clear local IV history only  

### Status chip rules

| State | Visual |
|-------|--------|
| Connected | success pill |
| Using demo | warning pill |
| Not configured | muted pill |

### CTAs

- Save preferences (client-only for theme)  
- “How to configure providers” → docs link  
No “Connect Robinhood” OAuth fantasy.

---

## 7. Education & risk

**Route:** `/education`  
**Job:** Risk theater done right — dignity, not fear porn.

### Hierarchy

1. Hero: “Clarity before capital” + short promise  
2. How probabilities are built (model estimate honesty)  
3. What the brain does / does not do  
4. OCC / standardized options risks  
5. Manual checklist philosophy  
6. Links into book-grounded explainers  

### Visual

- Long-form readable: max measure ~68ch  
- Callout cards: Info (accent), Warning (warning tokens), Hard rule (border-strong)  
- No stock-photo rockets  

### CTA

- **Open Trade Lab** (practice) · **Read risk disclosure** (OCC)

---

## Implementation priority (aligns with UX sprint)

| Day | Focus |
|-----|--------|
| 1 | Tokens from `03` (`--bg-success`, `--surface-3`, spacing, radius); shell: nav labels, drop `max-w-4xl`, theme; badge primitives |
| 2 | AccountStrip + MetricTile + GatePill + StatusBadge |
| 3 | Command Center restructure + **Brain pulse** |
| 4 | Trade Lab hierarchy + BrainRecommendPanel polish + MODEL EST. labels + sticky brain rail |
| 5 | OrderChecklistCard dignity pass + mobile sticky copy |
| 6 | Compare 3-up scaffold + Saved empty/filled |
| 7 | Journal ritual + Settings theme + Education callouts |

---

## Token extensions (implement in `globals.css`)

```css
:root {
  /* add if missing */
  --bg-success: #e8f7f1;
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 0.75rem;
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --font-mono: ui-monospace, "Cascadia Code", "Segoe UI Mono", monospace;
  --shadow-card: 0 1px 0 rgb(20 24 31 / 0.04), 0 1px 2px rgb(20 24 31 / 0.04);
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg-success: #152820;
    --shadow-card: 0 1px 0 rgb(0 0 0 / 0.25);
  }
}
```

Also mirror under `:root[data-theme="dark"]` / `light` explicit blocks when engineering expands theme override.

---

## WCAG AA checklist (screen QA)

- [ ] Body text on surface-1/2 ≥ 4.5:1  
- [ ] Muted text used only for non-essential secondary (≥ 4.5:1 preferred; if fails, darken `--text-muted`)  
- [ ] Danger/success text on tinted backgrounds verified  
- [ ] Focus visible on all interactive controls  
- [ ] Badges not sole status indicator  
- [ ] Charts have numeric tables or accessible summaries for key metrics  

---

**UI Designer:** design-ui-designer  
**Status:** Screen specs ready for implementation  
**Mocks:** `design/mocks/dashboard-command-center.html`, `design/mocks/builder-brain-cockpit.html`, `design/mocks/journal-ritual.html`
