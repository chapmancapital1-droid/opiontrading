# OptionScope — Component Library

**From:** design-ui-designer  
**Date:** 2026-07-12  
**Tokens:** `src/app/globals.css` + extensions in `03-layout-and-tokens.md` / `04-ui-screen-specs.md`  
**Upstream:** Brand `01`, UX IA `02`, Layout tokens `03`  
**Principle:** Calm cockpit primitives. Reuse over one-off chrome. Educational honesty baked into labels.  
**CTA language:** Analyze · Explain · **Load in Lab** · Copy checklist · Save — never Place Trade.

---

## 0. Design tokens (component-facing)

| Category | Tokens |
|----------|--------|
| Surfaces | `--surface-1`, `--surface-2`, **`--surface-3`** (nested wells; see `03`) |
| Borders | `--border`, `--border-strong`, `--border-accent`, `--border-danger`, `--border-warning` |
| Text | `--text-primary`, `--text-secondary`, `--text-muted`, `--text-success`, `--text-danger`, `--text-warning`, `--text-accent` |
| Fills | `--bg-accent`, `--bg-danger`, `--bg-warning`, **`--bg-success`** (add) |
| Type | `--font-sans`, **`--font-mono`** (add) |
| Radius | `--radius-sm` 6px · `--radius-md` 8px · `--radius-lg` 12px |
| Space | 4 / 8 / 12 / 16 / 24 / 32 |

### Interaction

| State | Spec |
|-------|------|
| Hover (cards/links) | Background → opposite surface step; border optional strengthen |
| Active press | No bounce; 1px translateY max if motion allowed |
| Focus-visible | `outline: 2px solid var(--border-accent); outline-offset: 2px` |
| Disabled | opacity 0.5; `cursor: not-allowed` |
| Loading | Skeleton shimmer using surface-1↔2 only (no rainbow) |

---

## 1. MetricTile

**Purpose:** Single number with honest label. Used in snapshot, rank cards, results strip, compare cells.

### Anatomy

```
┌─────────────────┐
│ LABEL           │  11px, muted, medium; optional badge slot
│ 68.2%           │  18–20px, primary, tabular-nums
│ model estimate  │  optional 10px muted footnote
└─────────────────┘
```

### Props

| Prop | Type | Notes |
|------|------|-------|
| `label` | string | Required |
| `value` | string \| number | Formatted by parent |
| `tone` | `neutral` \| `pos` \| `neg` \| `warn` | Colors value only |
| `estimate` | boolean | Shows “model estimate” micro-label or MODEL EST. badge |
| `size` | `sm` \| `md` \| `lg` | sm for rank cards; lg for hero results |
| `hint` | string | `title` / aria description |

### Visual

```css
.metric-tile {
  background: var(--surface-1); /* when parent is surface-2 */
  border-radius: var(--radius-md);
  padding: 8px 12px;
  min-width: 90px;
}
.metric-tile__label { font-size: 11px; color: var(--text-muted); font-weight: 500; }
.metric-tile__value { font-size: 18px; font-weight: 500; font-variant-numeric: tabular-nums; }
.metric-tile--pos .metric-tile__value { color: var(--text-success); }
.metric-tile--neg .metric-tile__value { color: var(--text-danger); }
.metric-tile--warn .metric-tile__value { color: var(--text-warning); }
```

### Rules

- **PoP and EV always `estimate={true}`.**
- Never rely on green alone for “good” — label remains.
- Empty value: em dash `—`, not `0` or `N/A` spam.

### A11y

- Prefer structure: `<div role="group" aria-label="{label}: {value}">` or visible text only.

---

## 2. RankCard

**Purpose:** One brain recommendation. Core of Trading Brain UX.

### Anatomy

1. Header row: `#rank · name` + optional `growth-primary` + action buttons  
2. Meta line: score · portfolio role · contracts · risk $  
3. MetricTile row: Model PoP · Model EV · Payoff RoR · Max loss/lot  
4. Strikes / engine notes (11px secondary)  
5. `<details>`: why rank · entry · exit · Robinhood path · book source  

### Actions

| Button | Style | Label |
|--------|-------|-------|
| Explain | Secondary ghost border | `Explain (AI)` / `Hide AI` |
| Load | Accent outline / soft fill `bg-accent` + `text-accent` | **`Load in Lab`** |

**Never:** Place trade, Buy, Submit.

### States

| State | Treatment |
|-------|-----------|
| Default | border, surface-1 on surface-2 parent |
| Selected | border-accent, subtle bg-accent |
| Loading metrics | skeleton in metric row |
| Size 0 | meta line muted coach copy |
| Halt context | parent suppresses list |

### Spacing

- Card padding 12px; gap 8px  
- Rank number: tabular, medium  
- Match score: 2 decimals  

### A11y

- `article` with `aria-label="Rank {n}: {name}"`  
- Buttons keyboard reachable; details summary accessible  

---

## 3. GatePill

**Purpose:** Binary or graded status for account gates, NCI, context confidence.

### Anatomy

```
( ● Account gates OK )   ( ● NCI UP 72% · FIRE BUY )   ( ○ Context low · risk budget $1,200 )
```

### Variants

| Variant | Background | Text | Use |
|---------|------------|------|-----|
| `ok` | `--bg-success` | `--text-success` | Passed |
| `warn` | `--bg-warning` | `--text-warning` | Soft fail / caution |
| `danger` | `--bg-danger` | `--text-danger` | Halt / hard fail |
| `neutral` | `--surface-1` | `--text-secondary` | Info / loading / missing |
| `info` | `--bg-accent` | `--text-accent` | LIVE, accent facts |

### Props

| Prop | Notes |
|------|-------|
| `status` | ok \| warn \| danger \| neutral \| info |
| `label` | Full human text (not icon-only) |
| `icon` | optional leading glyph (check, alert, pause) |

### Visual

```css
.gate-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.3;
  max-width: 100%;
}
```

### Rules

- Truncate with title tooltip on overflow; never clip critical “HALT:”  
- HALT uses `danger` + parent banner (pill alone insufficient)  

---

## 4. StatusBadge (data provenance)

**Purpose:** LIVE / DEMO / PAPER / MODEL EST. honesty layer.

| ID | Classes | Text |
|----|---------|------|
| live | bg-accent, text-accent | LIVE |
| demo | surface-1, text-muted, border dashed optional | DEMO |
| paper | bg-warning, text-warning | PAPER |
| live-acct | bg-success, text-success | LIVE ACCT |
| model | surface-1, text-secondary, border | MODEL EST. |
| growth | text-accent, no fill or soft accent | GROWTH-PRIMARY |

Caps 10px, letter-spacing 0.06em, padding 2px 8px, radius full.

**Compose** next to section titles, not floating random corners.

---

## 5. ChecklistCard (Order checklist)

**Purpose:** Manual execution dignity. Primary “finish” artifact of analysis.

### Anatomy

1. Title: “Robinhood order checklist” + contracts × strategy  
2. Underlying · expiration  
3. Numbered legs list (border-y separator)  
4. Totals: net limit, max modeled loss, collateral, BEs, quote time, plan exits  
5. Confirmation checkbox (required for Save)  
6. Actions: **Copy** · **Print / PDF** · **Save to journal**  
7. Legal microcopy  

### Visual polish vs current

| Change | Spec |
|--------|------|
| Elevation | `rounded-xl` + `border` + optional left accent bar 3px `border-accent` (“ready to act manually”) |
| Max loss UNDEFINED | If undefined: full-width warn/danger callout inside card |
| Legs | Mono strikes; Buy/Sell as text, not green/red casino chips — use secondary weight |
| Confirm | Larger checkbox hit area (44px) |
| Primary action among secondary buttons | **Copy checklist** slightly stronger border (`border-strong`) |

### States

| State | UI |
|-------|-----|
| Unconfirmed | Save disabled |
| Copied | Button label “Copied” 1.5s |
| Print | Hide actions via `print:hidden` |

### Forbidden

- Any button labeled Place / Submit / Execute trade  

---

## 6. AccountStrip

**Purpose:** Always-visible capital truth. Drives trust and sizing literacy.

### Anatomy (full)

```
[ PAPER ] Alpaca paper · ACTIVE
Equity $24,180    Cash $6,420    BP $12,100    Risk budget $1,800    Open risk ~$640
```

### Anatomy (compact — builder)

Single row wrap of GatePills + key metrics inline.

### Props

| Prop | Notes |
|------|-------|
| `source` | alpaca \| demo |
| `mode` | paper \| live |
| `equity`, `cash`, `buyingPower` | numbers |
| `remainingRiskBudget` | from brain |
| `openRiskDollars` | optional |
| `note` | fallback explanation |

### Visual

- Container: `rounded-xl border bg surface-2 p-3`  
- Metrics: horizontal flex wrap gap 16px; labels 11px muted above or inline “Equity ”  
- DEMO/PAPER badges leading  

### Sticky behavior (dashboard optional)

`position: sticky; top: 0; z-index: 10; backdrop` surface-2 at 0.92 opacity — only if design QA shows benefit; not required v1.

---

## 7. ContextTile

**Purpose:** One market context signal (IV rank, IV trend, spot trend, EM, liquidity, events, sentiment).

### Anatomy

```
┌ IV rank        ┐
│ 62             │
│ Elevated       │  ← tone badge or secondary line
└────────────────┘
```

### Tone map (from existing MarketContextPanel)

| Signal value | Tone |
|--------------|------|
| Elevated IV / earnings / wide liquidity | warn |
| Tight liquidity / clear events / up trend / positive | pos (success) |
| Down trend / negative sentiment | neg |
| Neutral / sideways | neutral |

### Layout

- Grid `auto-fit minmax(120px, 1fr)`  
- Parent card titled “Market context · {TICKER}” + LIVE/DEMO  

---

## 8. ChartChrome

**Purpose:** Unified framing for TradingView, payoff Recharts, MC histogram.

### Anatomy

```
┌─ Title ────────────────────────── attribution / source ─┐
│                                                          │
│                     chart canvas                         │
│                                                          │
└─ optional footer: “Model estimate · educational only” ───┘
```

### Specs

| Element | Spec |
|---------|------|
| Outer | `rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-2` |
| Header | px-2 py-1; title 14px medium; attribution 12px muted |
| Min heights | Dashboard TV 520 desktop / 280 mobile; Payoff 280; MC hist 180 |
| Empty chart | Centered muted: “Analyze to render payoff.” |

### Payoff-specific

- Tooltip: surface-2, border, 12px, tabular $  
- Legend minimal  
- MODEL EST. footer when chart encodes probabilistic bands  

---

## 9. SectionCard

Generic container for panels (snapshot, brain, news).

```css
.section-card {
  border: 1px solid var(--border);
  background: var(--surface-2);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.section-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}
```

---

## 10. EmptyState

### Anatomy

- Optional monoline scope glyph (48px, muted)  
- Title 16px medium  
- Body 14px secondary (max 40ch)  
- 1–2 CTAs  

### Variants

| Variant | Border |
|---------|--------|
| Neutral | default border |
| Setup required | border-warning + bg-warning (Supabase) |
| Halt coach | border-danger + bg-danger |

Copy voice: coach, not error logs.  
Example: “No strategies matched current market context. Try another symbol or wait for IV history to accumulate.”

---

## 11. ExplainPanel

**Purpose:** Phase 5 catalog-grounded explainer.

### Anatomy

1. Eyebrow: “Catalog-grounded explainer” (accent, 12px)  
2. Headline  
3. Thesis paragraph  
4. Why now (list)  
5. Risks & exits (list)  
6. Book citations (muted, source + page + snippet)  
7. Confidence note + disclaimer  
8. Close  

### Visual

- Border accent; surface-1 fill inside brain card  
- Citations never look like buy signals — monochrome quotes  

---

## 12. Buttons

| Variant | Use | Style |
|---------|-----|-------|
| `primary-analyze` | Analyze | Soft accent fill `bg-accent` + `text-accent` + `border-accent` |
| `secondary` | Copy, Print, toggles | Border strong / default, transparent bg |
| `ghost` | Close, Hide | Transparent, muted text |
| `danger-ghost` | Delete saved | Danger text, danger border on hover |

**Sizes:** sm 12px pad 6×10; md 14px pad 8×14 (default).

**No solid brand-green primary.**

---

## 13. Form controls

| Control | Spec |
|---------|------|
| Text input | border, surface-2/1, pad 8×12, radius 8, focus accent ring |
| Select | same |
| Checkbox | 18px; label gap 8px |
| Segmented (theme) | surface-1 track; active surface-2 + border |

---

## 14. Navigation item

| State | Style |
|-------|-------|
| Default | text-secondary, icon muted |
| Hover | bg surface-1 (sidebar is surface-2) or slight inset |
| Active | text-accent; left 2px accent bar; bg-accent |

Labels per UX lock: **Command**, **Trade Lab**, Compare, Saved, Journal, Settings, Education.

---

## 15. JourneyRail card (dashboard)

Quick destination tile:

- Title 14px medium  
- Description 13px secondary  
- Padding 16px  
- Hover surface shift  
- Full card is link (no nested buttons)

---

## 16. Comparison column

| Element | Spec |
|---------|------|
| Header | Strategy name, badges, remove  
| Cells | MetricTile-like; winning cell soft `bg-accent`  
| Sticky labels | Left 140px on mobile scroll  

---

## 17. JournalEntryCard

| Element | Spec |
|---------|------|
| Symbol + strategy | primary |
| Realized P&L | pos/neg tone + tabular |
| Model PoP vs outcome | secondary line with MODEL EST. on PoP |
| Alignment chip | ok / warn / neutral |

---

## 18. Skeleton / loading

- Pulse opacity 0.6–1 on surface-1 blocks  
- Prefer text “Running selector + engine…” for brain (honest process) over infinite spinners  

---

## Component → route map

| Component | Command | Trade Lab | Compare | Journal | Saved | Settings | Education |
|-----------|:-------:|:---------:|:-------:|:-------:|:-----:|:--------:|:---------:|
| MetricTile | ● | ● | ● | ● | ● | | |
| RankCard | Brain pulse | ● | | | | | |
| GatePill | ● | ● | | | | ● | |
| StatusBadge | ● | ● | ● | ● | ● | ● | |
| AccountStrip | ● | ● | | | | ● | |
| ContextTile | ● | ● | | | | | |
| ChartChrome | ● | ● | ● | | | | |
| ChecklistCard | | ● | | import | open | | |
| ExplainPanel | | ● | | | | | |
| EmptyState | ● | ● | ● | ● | ● | | ● |
| SectionCard | ● | ● | ● | ● | ● | ● | ● |
| HaltCoach | ● | ● | | | | | |

---

## File split recommendation (engineering)

```
src/components/ui/
  MetricTile.tsx
  GatePill.tsx
  StatusBadge.tsx
  SectionCard.tsx
  EmptyState.tsx
  Button.tsx          // optional thin wrapper
AccountStrip.tsx
RankCard.tsx          // extract from BrainRecommendPanel
// existing
BrainRecommendPanel.tsx
OrderChecklistCard.tsx
MarketContextPanel.tsx
MarketSnapshot.tsx
```

---

## Do / Don’t

| Do | Don’t |
|----|-------|
| Label model outputs | Imply certainty |
| Use accent for analysis actions | Green “go” trade buttons |
| Show DEMO/PAPER honestly | Hide demo fallback |
| Quiet borders for hierarchy | Neon gradients / glass stacks |
| Coach copy on halt | Blame-y error red walls |
| Tabular numbers for $ and % | Proportional figures that jump layout |

---

**UI Designer:** design-ui-designer  
**Status:** Component library ready for extraction + polish  
**Mocks:** demonstrate MetricTile, RankCard, GatePill, AccountStrip, ChartChrome, Checklist
