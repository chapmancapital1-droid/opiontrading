# OptionScope — Layout System & Design Tokens

**Agent:** design-ux-architect (ArchitectUX)  
**Date:** 2026-07-12  
**Product:** OptionScope (`opiontrading`)  
**Upstream:** [`00-VISION-HANDOFF.md`](./00-VISION-HANDOFF.md), [`01-brand-foundation.md`](./01-brand-foundation.md)  
**Companion:** [`02-ux-ia-and-flows.md`](./02-ux-ia-and-flows.md)  
**Implementation target:** `src/app/globals.css` + app shell `src/app/(app)/layout.tsx`

---

## 1. Layout architecture

### 1.1 App shell

```
┌────────────────────────────────────────────────────────────────┐
│  OPTIONAL top utility strip (mobile only): brand + badges     │
├──────────────┬─────────────────────────────────────────────────┤
│  SIDEBAR     │  MAIN                                           │
│  md+: fixed  │  flex-1 · min-w-0 · overflow-x-auto             │
│  w-56        │  padding: space-4 (mobile) / space-6 (md+)      │
│  border-r    │  NO global max-w-4xl                            │
│              │  Zone max-widths apply per page pattern         │
│  Brand       │                                                 │
│  Primary nav │  {page content}                                 │
│  Secondary   │                                                 │
│  nav         │  footer disclaimer (mt-10, border-t)            │
├──────────────┴─────────────────────────────────────────────────┤
│  MOBILE: bottom tab bar (primary 5) + overflow “More”          │
└────────────────────────────────────────────────────────────────┘
```

**Shell rules**

| Rule | Spec |
|------|------|
| Background | `var(--surface-1)` on `html/body` and shell |
| Cards / panels | `var(--surface-2)` + `border: 1px solid var(--border)` + `border-radius: var(--radius-lg)` |
| Nested wells | `var(--surface-3)` |
| Sidebar width | `14rem` (56 = 224px) desktop; hidden as side column on mobile |
| Main min height | `min-h-screen` |
| Footer | Always present; calm disclaimer + OCC link (brand voice) |

### 1.2 Sidebar vs top / bottom (responsive)

| Breakpoint | Navigation | Main chrome |
|------------|------------|-------------|
| **&lt; 768px (`md`)** | **Bottom tab bar** — Command, Trade Lab, Compare, Saved, Journal. Settings + Education under **More** sheet. | Top bar: OptionScope wordmark (compact) + data badges + theme icon |
| **≥ 768px** | **Left sidebar** full labels + icons | Optional thin top utility inside main for symbol-global actions only when page needs it |
| **≥ 1280px** | Sidebar unchanged | Command / Lab use full cockpit width |

**Bottom tab bar (mobile)**

- Height: 56px + safe-area inset  
- 5 equal slots; active = accent text + 2px top indicator  
- Does not cover sticky **Copy checklist** — checklist sits above tabs (`bottom: calc(56px + safe)`) when present  

### 1.3 Content width zones (replace `max-w-4xl`)

Current shell clamps main to `max-w-4xl` (~896px) — **too narrow** for Command charts and Trade Lab dual column. Change to:

| Zone class (conceptual) | Max width | Pages |
|-------------------------|-----------|-------|
| `zone-cockpit` | none (100% of main) | Command, Trade Lab, Compare |
| `zone-reading` | `48rem` (768px) | Education article body |
| `zone-form` | `40rem` (640px) | Settings forms if expanded |
| `zone-list` | `56rem` (896px) | Saved, Journal lists (can go full on xl) |

**CSS sketch:**

```css
.zone-cockpit { width: 100%; max-width: none; }
.zone-reading { width: 100%; max-width: 48rem; }
.zone-form { width: 100%; max-width: 40rem; }
.zone-list { width: 100%; max-width: 56rem; }
@media (min-width: 1280px) {
  .zone-list { max-width: none; }
}
```

### 1.4 Page grid patterns

#### Command Center — stack + split

```
grid-rows: auto strips
account: full width
snapshot | context: grid 1fr 1fr → 1 col mobile
brain pulse: full width
chart | news: grid minmax(0,1fr) 360px → stack mobile
quick: auto-fit minmax(200px, 1fr)
```

#### Trade Lab — dual rail

```
display: grid
grid-template-columns: minmax(0, 1fr) 380px   /* lg+ */
gap: var(--space-4)
align-items: start

/* brain rail sticky */
.lab-rail { position: sticky; top: var(--space-4); }

/* < lg: single column */
stack: context → brain (collapsible) → structure → analysis → checklist sticky bottom
```

#### Compare — 3-up

```
shared bar: full width flex wrap
columns: grid-template-columns: repeat(3, minmax(0, 1fr))  /* lg+ */
         repeat(1, 1fr) with horizontal scroll snap at md optional
         stack on mobile with snap-x mandatory cards min-w-[85%]
```

#### Journal / Saved — list ritual

```
header row: title + actions
sections: vertical stack gap-4
scorecard: grid 1fr 1fr 1fr → 1 col mobile
table: overflow-x-auto
```

### 1.5 Spacing scale (4px base)

Expose as CSS variables; Tailwind can map via arbitrary values or extend theme later.

| Token | Value | Use |
|-------|-------|-----|
| `--space-0` | `0` | — |
| `--space-1` | `0.25rem` (4px) | Icon gaps, tight chips |
| `--space-2` | `0.5rem` (8px) | Compact padding, pill gap |
| `--space-3` | `0.75rem` (12px) | Input padding y-ish |
| `--space-4` | `1rem` (16px) | Default card padding, grid gap mobile |
| `--space-5` | `1.25rem` (20px) | — |
| `--space-6` | `1.5rem` (24px) | Section gap, desktop main pad |
| `--space-8` | `2rem` (32px) | Major section separation |
| `--space-10` | `2.5rem` (40px) | — |
| `--space-12` | `3rem` (48px) | Page top breathing (rare) |
| `--space-16` | `4rem` (64px) | Marketing only |

**Vertical rhythm:** stack sections with `gap-4` (16) default; major blocks `gap-6` (24). Prefer gap over random margins.

### 1.6 Radius, elevation, borders

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | `0.375rem` (6px) | Pills, small inputs |
| `--radius-md` | `0.5rem` (8px) | Buttons, nav items |
| `--radius-lg` | `0.75rem` (12px) | Cards, panels (current `rounded-xl`) |
| `--radius-xl` | `1rem` (16px) | Rare hero panels |
| `--radius-full` | `9999px` | Theme toggle track, badges |

**Elevation:** prefer border over shadow. Optional soft shadow only on floating mobile sheets:

```css
--shadow-sheet: 0 -4px 24px rgba(12, 18, 32, 0.12);
```

Dark mode: reduce shadow opacity; rely on `surface-2` vs `surface-1` contrast.

### 1.7 Breakpoints

| Name | Min width | Role |
|------|-----------|------|
| `sm` | 640px | Comfortable forms |
| `md` | 768px | Sidebar appears; 2-col snapshot |
| `lg` | 1024px | Lab dual rail; chart|news; compare 3-up |
| `xl` | 1280px | Full cockpit; optional denser metrics |
| `2xl` | 1536px | Extra chart height ok; avoid ultra-wide single line forms |

**Mobile-first:** base styles = phone; enhance at `md` / `lg`.

---

## 2. Typography scale

### 2.1 Families

```css
:root {
  --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto,
    Helvetica, Arial, sans-serif;
  /* Optional product upgrade (UI Designer may pick Inter or Geist): */
  /* --font-sans: "Inter", var(--font-sans); */

  --font-mono: ui-monospace, "SF Mono", "Cascadia Code", Consolas, monospace;
}
```

- **UI body:** sans  
- **Legs, strikes, checklist lines, env keys:** mono  
- **No decorative display fonts in app**

### 2.2 Type scale

| Token | Size | Line height | Weight | Role |
|-------|------|-------------|--------|------|
| `--text-xs` | `0.75rem` (12px) | 1.4 | 400/500 | Badges, freshness, footer, chart attribution |
| `--text-sm` | `0.875rem` (14px) | 1.45 | 400/500 | Body UI, nav, metrics labels, secondary |
| `--text-base` | `1rem` (16px) | 1.5 | 400 | Education body, long form |
| `--text-lg` | `1.125rem` (18px) | 1.4 | 500 | Card titles, scorecard headers |
| `--text-xl` | `1.25rem` (20px) | 1.3 | 500 | Section titles |
| `--text-2xl` | `1.5rem` (24px) | 1.25 | 500 | Page H1 (current) |
| `--text-3xl` | `1.875rem` (30px) | 1.2 | 600 | Marketing only |

**Hierarchy classes (conceptual BEM / utility):**

| Class | Spec |
|-------|------|
| `.text-page-title` | `text-2xl font-medium text-primary` |
| `.text-section` | `text-sm font-medium text-primary` |
| `.text-metric-value` | `text-lg font-medium tabular-nums` (mono optional) |
| `.text-metric-label` | `text-xs text-muted` |
| `.text-body` | `text-sm text-secondary` |
| `.text-disclaimer` | `text-xs text-muted` |

**Tabular numbers:** metrics, P&amp;L, strikes → `font-variant-numeric: tabular-nums`.

---

## 3. Color tokens — extend `globals.css`

### 3.1 Principles

1. **Evolve, don’t replace** — brand §6 mapping.  
2. **Semantic first** — success/danger/warning for risk math and gates only.  
3. **Brand blue for analysis actions** — never green “buy” CTAs.  
4. **Light default in file; dark via `prefers-color-scheme` + `data-theme` override.**  
5. **System theme:** no `data-theme` attribute → follow OS.

### 3.2 Target token set (full)

Implement by updating `:root` and dark media / `[data-theme]` blocks.

#### Light (`:root` and `:root[data-theme="light"]`)

```css
:root {
  --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto,
    Helvetica, Arial, sans-serif;
  --font-mono: ui-monospace, "SF Mono", "Cascadia Code", Consolas, monospace;

  /* Brand */
  --brand-primary: #2a6cb8;
  --brand-primary-hover: #245fa3;
  --brand-primary-muted: #d4e6f7;
  --brand-ink: #0c1220;
  --focus-ring: #2a6cb8;

  /* Surfaces */
  --surface-1: #f2f4f7;
  --surface-2: #ffffff;
  --surface-3: #e8ecf2;

  /* Borders */
  --border: #dfe3ea;
  --border-strong: #b8c0cc;
  --border-accent: #2f6fbd;
  --border-danger: #e5b4b3;
  --border-warning: #e6d3a3;

  /* Text */
  --text-primary: #12161e;
  --text-secondary: #4a515c;
  --text-muted: #7e8796;
  --text-success: #0f8a66;
  --text-danger: #c53634;
  --text-warning: #8a6c10;
  --text-accent: #2a6cb8;
  --text-on-brand: #ffffff;

  /* Semantic fills */
  --bg-accent: #e7f0fa;
  --bg-danger: #fbeceb;
  --bg-warning: #fbf5e6;
  --bg-success: #e6f5ef; /* new — soft gate pass wells */

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;

  /* Type */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;

  /* Radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-full: 9999px;

  /* Layout */
  --sidebar-width: 14rem;
  --lab-rail-width: 23.75rem; /* 380px */
  --news-rail-width: 22.5rem; /* 360px */
  --container-reading: 48rem;
  --container-list: 56rem;

  /* Motion */
  --ease-standard: cubic-bezier(0.2, 0.8, 0.2, 1);
  --duration-fast: 120ms;
  --duration-normal: 200ms;

  color-scheme: light;
}
```

#### Dark (media + explicit)

```css
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --brand-primary: #5a9fd9;
    --brand-primary-hover: #6eb0ea;
    --brand-primary-muted: #1a2f45;
    --brand-ink: #eef1f5;
    --focus-ring: #6eb0ea;

    --surface-1: #12151b;
    --surface-2: #1a1f28;
    --surface-3: #242a35;

    --border: #2e3542;
    --border-strong: #434b5a;
    --border-accent: #5a9fd9;
    --border-danger: #6b3a39;
    --border-warning: #6b5a2a;

    --text-primary: #eef1f5;
    --text-secondary: #b6bdc8;
    --text-muted: #8a93a3;
    --text-success: #3ecf9a;
    --text-danger: #f0716e;
    --text-warning: #e0c56e;
    --text-accent: #6eb0ea;
    --text-on-brand: #0c1220;

    --bg-accent: #152636;
    --bg-danger: #2e1b1b;
    --bg-warning: #2c2413;
    --bg-success: #142820;

    color-scheme: dark;
  }
}

:root[data-theme="dark"] {
  /* same dark block as above — explicit override wins */
  color-scheme: dark;
  /* …duplicate token assignments… */
}

:root[data-theme="light"] {
  color-scheme: light;
  /* ensure light tokens if OS is dark */
}
```

**Note:** Today light is only in bare `:root` and dark only in `@media`. Explicit `data-theme="light"` must **re-apply light tokens** when OS prefers dark (gap to fix). Structure:

1. Base light on `:root`  
2. `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { …dark } }`  
3. `:root[data-theme="dark"] { …dark }`  
4. `:root[data-theme="light"] { …light full set }` for force-light

### 3.3 Semantic usage (brand non-negotiables)

| Token family | Allowed meaning | Forbidden |
|--------------|-----------------|-----------|
| success / green | Gate pass, +EV model math, profitable *realized* journal | “Buy” CTA, confetti, streaks |
| danger / red | Max loss, gate fail, validation, undefined risk | Blood animation, shaming |
| warning / amber | Halt coach, stale data, assumption callouts | Mild annoyance only |
| brand / accent | Nav active, Analyze/Load/Copy primary, selection, links | Implying brokerage execution |
| muted | Attribution, legal, timestamps | Critical risk numbers |

### 3.4 Component token aliases (optional layer)

```css
:root {
  --btn-primary-bg: var(--brand-primary);
  --btn-primary-bg-hover: var(--brand-primary-hover);
  --btn-primary-text: var(--text-on-brand);
  --btn-secondary-bg: var(--surface-2);
  --btn-secondary-border: var(--border-strong);
  --card-bg: var(--surface-2);
  --card-border: var(--border);
  --nav-active-bg: var(--bg-accent);
  --nav-active-border: var(--border-accent);
  --halt-bg: var(--bg-warning);
  --halt-border: var(--border-warning);
  --halt-text: var(--text-warning);
  --badge-live-bg: var(--bg-success);
  --badge-demo-bg: var(--surface-3);
  --badge-paper-bg: var(--bg-accent);
  --badge-stale-bg: var(--bg-warning);
}
```

---

## 4. Theme: light / dark / system

### 4.1 Behavior

| User choice | Storage | DOM |
|-------------|---------|-----|
| **System** | remove `theme` key | remove `data-theme` |
| **Light** | `localStorage.theme = "light"` | `data-theme="light"` |
| **Dark** | `localStorage.theme = "dark"` | `data-theme="dark"` |

Apply **before paint** with a tiny inline script in root layout to avoid flash (UI Designer / frontend).

### 4.2 Toggle placement

- Desktop: sidebar footer or top of sidebar under brand  
- Mobile: top utility bar icon → menu with 3 options  
- Settings: mirror preference control  

**A11y:** `role="radiogroup"` aria-label="Theme"; each option `role="radio"` + `aria-checked`.

### 4.3 ThemeManager (spec — implement in `js` or client component)

Same contract as standard ArchitectUX `ThemeManager`: read storage → apply → listen to toggle → update UI. Optional: listen to `matchMedia('(prefers-color-scheme: dark)')` when mode is system to refresh if needed (attribute absence is enough if CSS is correct).

---

## 5. Component architecture

### 5.1 Hierarchy

```
1. Layout shell     AppShell, SidebarNav, MobileTabBar, MainZone, FooterLegal
2. Domain panels    AccountStrip, MarketSnapshot, MarketContext, BrainPulse,
                    BrainRecommendPanel, OrderChecklistCard, HaltCoach
3. Analysis         PayoffChart, MetricGrid, McHistogram, CompareColumn
4. Data display     Badge (Live/Demo/Paper/Stale), GatePill, Metric, FreshnessChip
5. Actions          Button (primary/secondary/ghost), IconButton, CopyButton
6. Forms            TextField, Select, SymbolField
7. Feedback         EmptyState, InlineError, Banner (warning/danger/info)
8. Overlays         MoreSheet (mobile), ExplainPanel (inline expand preferred)
```

### 5.2 Inventory map (existing → elevate)

| Existing | Role | Token / layout notes |
|----------|------|----------------------|
| `MarketSnapshot` | Command | Card surface-2; metric grid |
| `MarketContextPanel` | Command + Lab compact | Chips use surface-3 / border |
| `MarketSummary` | Horizontal strip | Keep; tighten gap tokens |
| `TradingViewChart` | Command | Full flex column; min height 420 desktop |
| `TradingViewTimeline` | News rail 360 | Collapse under accordion mobile |
| `BrainRecommendPanel` | Lab rail hero | Sticky; halt banner uses HaltCoach styling |
| `OrderChecklistCard` | Lab rail / mobile sticky | Primary Copy = brand-primary |

### 5.3 New components (design → build)

| Component | Purpose |
|-----------|---------|
| **AccountStrip** | Paper equity, cash, day P&amp;L, positions, aggregate gates |
| **BrainPulse** | Command summary of top ranks or halt |
| **HaltCoach** | Full-width coach banner (Journey D) |
| **DataModeBadges** | Shell cluster Live · Demo · Paper · Stale |
| **ThemeToggle** | 3-way control |
| **EmptyState** | Title, body, primary/secondary actions |
| **CompareSlot** | One of three columns |
| **JournalScorecard** | Forecast vs realized |
| **SavedTradeRow** | List row actions |
| **NavLink** | Active styles + labels Command / Trade Lab / … |
| **ModelEstimateLabel** | Microcopy wrapper for PoP/EV headers |

### 5.4 Button specs

| Variant | Background | Text | Border | Use |
|---------|------------|------|--------|-----|
| **Primary** | `--brand-primary` | `--text-on-brand` | none | Analyze, Load, Copy checklist |
| **Secondary** | `--surface-2` | `--text-primary` | `--border-strong` | Save, Compare, Retry |
| **Ghost** | transparent | `--text-accent` | none | Explain, text links |
| **Danger outline** | transparent | `--text-danger` | `--border-danger` | Archive only |
| **Disabled** | surface-3 | muted | border | Pre-analyze checklist |

Height: 36px default (`py-1.5` + text-sm); mobile checklist primary ≥ 44px.

### 5.5 Card / panel

```
padding: var(--space-4)
background: var(--surface-2)
border: 1px solid var(--border)
border-radius: var(--radius-lg)
```

Inset table header: `background: var(--surface-3)`.

### 5.6 Badges & pills

| Kind | Style |
|------|-------|
| Live | success text + bg-success |
| Demo | muted text + surface-3 |
| Paper | accent text + bg-accent |
| Stale | warning text + bg-warning |
| Gate OK | success pill + check icon + text |
| Gate fail | danger/muted pill + x icon + text |
| NCI/FIRE bias | surface-3 + border + **text label** (never buy/sell chrome) |

### 5.7 HaltCoach

```
border: 1px solid var(--border-warning)
background: var(--bg-warning)
color: var(--text-warning)
padding: var(--space-4)
border-radius: var(--radius-lg)
icon: pause / shield (not explosion)
actions: secondary + ghost (Review in Lab, Education)
```

### 5.8 EmptyState

Centered left-aligned in card (not vertical center page): title (text-lg), body (text-sm secondary), primary CTA, optional secondary. No illustrations required in sprint 1 (calm type-only).

---

## 6. How to extend `globals.css` (developer recipe)

### Step order

1. **Add** spacing, type, radius, layout, brand, focus, surface-3, bg-success tokens to `:root`.  
2. **Evolve** existing color hex values per brand tables (light + dark).  
3. **Fix theme cascade** so `data-theme="light"|"dark"` fully overrides OS.  
4. **Add** base focus style:

```css
:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
```

5. **Add** utility classes only if needed (prefer Tailwind + CSS vars):

```css
@layer utilities {
  .font-mono-data { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
  .zone-cockpit { max-width: none; width: 100%; }
  .zone-reading { max-width: var(--container-reading); }
  .zone-list { max-width: var(--container-list); }
}
```

6. **Do not** hardcode hex in components — always `var(--token)`.  
7. **Shell edit:** `layout.tsx` — remove `max-w-4xl` from `<main>`; add `zone-*` per page or default cockpit; wire ThemeToggle + DataModeBadges + new nav labels.

### File ownership

| File | Owns |
|------|------|
| `src/app/globals.css` | All design tokens + base element styles |
| `src/app/(app)/layout.tsx` | Shell structure, nav, theme mount point |
| Page components | Zone class + composition only |
| `src/components/*` | Domain panels using tokens |

Optional later split (not required sprint 1):

```
globals.css          /* @import tokens + base */
styles/tokens.css    /* variables only */
styles/themes.css    /* data-theme blocks */
```

---

## 7. Responsive strategy summary

| Concern | Mobile | Desktop |
|---------|--------|---------|
| Nav | Bottom tabs + More | Sidebar |
| Command chart | Full width, height ~360 | Chart \| news 360 |
| Trade Lab | Single column; brain collapse; sticky checklist | Dual column sticky rail |
| Compare | Snap cards | 3-up grid |
| Journal scorecard | Stack | 3-col |
| Primary work | Review checklist, halt, symbol switch | Full analysis |
| Touch targets | ≥ 44px primary | 36px ok |

**Performance:** don’t load three heavy charts on Compare mobile until slot focused; Command may defer news below fold on small screens.

---

## 8. Motion (restraint)

| Interaction | Motion |
|-------------|--------|
| Theme switch | `background-color`, `color` 200ms ease-standard |
| Nav hover | background 120ms |
| Panel expand (Explain) | height auto / grid 200ms; no bounce |
| Halt appear | fade+slide 200ms once |
| Forbidden | Confetti, pulse “BUY”, infinite badge blink, parallax casino |

`prefers-reduced-motion: reduce` → disable non-essential transitions.

---

## 9. Accessibility checklist (layout-level)

- [ ] Skip link to `#main`  
- [ ] One `h1` per page  
- [ ] Sidebar / tabs keyboard reachable; `aria-current="page"` on active  
- [ ] Focus ring via `--focus-ring` never removed  
- [ ] Contrast AA for text-primary/secondary on surface-1/2  
- [ ] Status messages (`HaltCoach`) use `role="status"` or `alert` if urgent  
- [ ] Charts: text summary of max loss / BE adjacent (not chart-only)  
- [ ] Form labels on all inputs (symbol, journal fill)  

---

## 10. Implementation priority (tokens + layout only)

Aligned with IA sprint; layout-specific sequence:

| Order | Task |
|-------|------|
| 1 | Expand `globals.css` tokens (brand, space, type, radius, surface-3, theme fix) |
| 2 | Shell: nav labels, active state, remove max-w-4xl, badges, theme toggle |
| 3 | Mobile tab bar + checklist safe offset |
| 4 | Command grids + AccountStrip / BrainPulse spacing |
| 5 | Lab dual-rail layout tokens (`--lab-rail-width`) |
| 6 | Compare 3-up grid utilities |
| 7 | Component polish (buttons, badges, HaltCoach) under UI Designer specs |

---

## 11. Wireframe cross-reference

ASCII layouts for Command, Trade Lab, Compare, Journal, Saved live in:

→ **[`02-ux-ia-and-flows.md`](./02-ux-ia-and-flows.md) §6**

Use this doc for **measurements, tokens, and shell behavior**; use §6 for **content placement**.

---

## 12. Acceptance criteria (layout + tokens)

- [ ] No component hardcodes brand hex; uses CSS variables  
- [ ] Light / Dark / System all work; force-light works when OS is dark  
- [ ] Main content not trapped in `max-w-4xl` for cockpit pages  
- [ ] Lab has usable dual-rail ≥ lg; mobile checklist reachable above tabs  
- [ ] Spacing/type follow scales above  
- [ ] Primary buttons use brand blue, not success green  
- [ ] Halt / warning / danger surfaces match semantic tokens  
- [ ] WCAG AA focus and contrast for core text pairs  

---

**ArchitectUX** · Foundation date: 2026-07-12  
**Ready for:** design-ui-designer high-fidelity screens + component polish  
**Engineering can start:** token PR + shell layout in parallel with UI specs
