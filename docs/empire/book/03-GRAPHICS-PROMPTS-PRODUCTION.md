# OptionScope — Graphics Prompts Production Book

**Agent:** design-image-prompt-engineer  
**Product:** OptionScope (personal empire companion)  
**Date:** 2026-07-12  
**Upstream:** `docs/design/01-brand-foundation.md`, `docs/design/02-ux-ia-and-flows.md`, `docs/design/04-ui-screen-specs.md`, `docs/empire/00-PERSONAL-COMPANION-BRIEF.md`  
**Note:** `02-FEATURE-GRAPHICS-PROMPT-BOOK.md` was not present; this book is the full production set derived from locked product features and brand.

---

## Doctrine (read before every generation)

| Rule | Meaning |
|------|---------|
| **Empire = process** | Capital growth through discipline, gates, paper rehearsal, calibration — never lottery energy |
| **Cockpit not casino** | Dark instrument panels, soft blue accents, quiet chrome — no neon, confetti, rockets, diamond hands |
| **Clarity before capital** | Max loss, model labels, badges, and checklists are hero subjects |
| **Manual dignity** | Never show “Place Trade,” buy/sell green CTAs, or auto-execution glory |
| **Honest models** | PoP/EV always read as *model estimates* in UI chrome when visible |
| **No get-rich imagery** | No yachts, Lambos, mansion balconies, cash stacks, champagne, “10x overnight” boards |

### Global style lock (apply to every shot)

```
STYLE LOCK — OptionScope educational graphic:
Calm dark trading cockpit aesthetic. Surfaces deep navy-charcoal
#12151b / #1a1f28 / #242a35. Soft instrument-panel blue accents
#2a6cb8 (light/primary) and #5a9fd9 (dark-mode glow edges).
Hairline borders, soft elevation (no glassmorph glow stacks),
monospace-friendly metrics, high legibility educational poster clarity.
Photoreal product UI hybrid OR precision 3D instrument metaphor —
cinematic restraint, fintech trust, measured composition.
Cool-neutral color grade, soft key light from upper left,
subtle rim separation, shallow depth only on supporting props.
Feeling: sober readiness, coach confidence, second-brain calm.
```

### Global negative prompt (append to every shot)

```
NEGATIVE:
get-rich imagery, yacht, sports car, mansion, cash stack, gold bars,
champagne, crypto neon, FOMO red pulse, rocket emoji energy, diamond hands,
bull/bear mascots, wall-street wolf cliché, casino chips, slot machine,
confetti, streak flames, big green BUY button, Place Trade CTA,
guaranteed returns, stock ticker rain of money, hyper-saturated neon,
cyberpunk overload, anime trading bro, aggressive crosshair combat sight,
blurry UI, illegible microtext as primary subject, watermark spam,
low contrast mud, cartoon clown aesthetic, meme stonk face
```

### Platform notes

| Platform | Tips |
|----------|------|
| **Flux / SD photoreal** | Lead with subject + materials; end with style lock + “8k UI mock photography” |
| **Midjourney** | Append `--ar 1:1` or `--ar 16:9 --stylize 100–200` (keep low chaos) |
| **DALL·E** | Prefer natural language paragraphs; restate “dark fintech cockpit, soft blue #5a9fd9” |
| **Post text** | Prefer clean UI mock + real typography overlay in Figma/Canva; AI text is unreliable |

### Aspect ratio guidance (all shots)

| Ratio | Use | Framing note |
|-------|-----|--------------|
| **1:1** | Education cards, carousel tiles, Notion/empire book figures | Center subject; leave top/bottom 8–12% safe for title + caption |
| **16:9** | Chapter openers, desktop hero, video stills, presentation | Wide cockpit; UI denser left/center; right third for copy or empty calm |

---

## Shot index (production set)

| Shot ID | Title | Feature / concept |
|---------|-------|-------------------|
| OS-EG-01 | Command Center Morning | `/dashboard` ritual |
| OS-EG-02 | Account Strip Truth | Paper equity + risk budget |
| OS-EG-03 | Brain Pulse Rank | Top structures on Command |
| OS-EG-04 | Trade Lab Hero | Full `/builder` workspace |
| OS-EG-05 | Brain Rank Card | Decision layer anatomy |
| OS-EG-06 | Payoff Truth | Defined risk made visible |
| OS-EG-07 | Model Monte Carlo | PoP/EV as estimates |
| OS-EG-08 | Gate Halt Coach | Risk halt as wisdom |
| OS-EG-09 | Robinhood Checklist | Manual copy dignity |
| OS-EG-10 | Explain + Citations | Catalog-grounded education |
| OS-EG-11 | Compare Three-Up | Decision matrix |
| OS-EG-12 | Journal Forecast vs Outcome | Calibration loop |
| OS-EG-13 | Live · Paper · Demo Badges | Data honesty |
| OS-EG-14 | Capital Ladder Path | $500 → $5k → $25k process |
| OS-EG-15 | See · Trust · Own Pillars | Brand emotional map |
| OS-EG-16 | NCI TA Context (not signal) | Chart bias as input |
| OS-EG-17 | Small-Account Defined Risk | Micro structures reality |
| OS-EG-18 | Agency Climax | Checklist ready — human button |

---

## OS-EG-01 — Command Center Morning

**Feature:** Command Center (`/dashboard`) — morning ritual, equity + context + brain pulse before Robinhood.

### Hero prompt

```
Professional educational product photograph of a dark-mode fintech trading
command center UI on a matte black ultrawide monitor in a quiet home desk
setup at pre-market dawn. Screen shows OptionScope Command Center: left
sidebar with wordmark OptionScope and nav labels Command, Trade Lab,
Compare, Saved, Journal; main area with calm account strip (paper equity,
cash, risk budget), market snapshot tiles, Brain pulse strip with three
compact ranked structure cards, soft blue accent #5a9fd9 on selection
edges, LIVE · PAPER badges, muted news column. No green buy buttons.
Desk: closed notebook, mechanical pencil, ceramic mug of black coffee,
soft window light from left, deep charcoal room, instrument-panel clarity.
Shot on 35mm equivalent, eye-level, f/2.8, slight UI sharpness priority,
cool color grade, cinematic but restrained, educational poster quality,
8k photoreal UI mock hybrid.
```

### Style lock

Global style lock + *morning readiness, mission board not news casino*.

### Negative prompt

Global negative + `stock exchange trading floor chaos, multiple phone FOMO alerts, green BUY banner, crypto dashboard neon`.

### Aspect variants

| Ratio | Notes |
|-------|--------|
| **1:1** | Crop to monitor bezel + partial desk props; sidebar may clip — keep Brain pulse + account strip readable |
| **16:9** | Full ultrawide cockpit + desk environment; leave right 20% slightly darker for chapter title overlay |

### Text overlay suggestions (post)

- **Title:** `Command Center`
- **Subtitle:** `Orient capital before you open the ticket`
- **Footer micro:** `Paper equity · Live context · Brain pulse`
- **Optional tagline line:** `See the trade.`

---

## OS-EG-02 — Account Strip Truth

**Feature:** Account strip — paper equity, cash, buying power, remaining risk budget, open option risk.

### Hero prompt

```
Close-up educational UI render of a dark fintech account metrics strip,
horizontal instrument panel across a charcoal surface #1a1f28. Five metric
cells with hairline dividers: Paper Equity, Cash, Buying Power, Risk Budget
Remaining, Open Option Risk. Large tabular numerals in cool white #eef1f5,
11px uppercase muted labels, soft blue accent underline under one selected
metric #5a9fd9. Small PAPER badge pill in warm caution tint. Clean sans
typography, monospaced numbers feel, no decorative charts behind.
Lighting: soft top light like a precision instrument faceplate, shallow
depth of field on outer edges only. Photoreal UI product shot, educational
infographic clarity, 85mm macro feel, dark cockpit aesthetic, 8k.
```

### Style lock

Global + *metrics as instruments; green/red only if P&L math, never decorative*.

### Negative prompt

Global + `animated spinning PnL, confetti on profit, balance exploding, lifestyle wealth flex`.

### Aspect variants

| Ratio | Notes |
|-------|--------|
| **1:1** | Stack metrics 2×3 or vertical list on phone-like card; keep all five labels legible |
| **16:9** | Full-width strip as hero band; generous side margins for captions |

### Text overlay suggestions (post)

- **Title:** `Know the account before the idea`
- **Callouts (arrows):** `Paper · not live bravado` · `Risk budget remaining`
- **Footer:** `Sizing starts from equity truth`

---

## OS-EG-03 — Brain Pulse Rank

**Feature:** Brain pulse on Command — top 1–3 ranked structures or halt coach; CTAs Explain / Load in Lab.

### Hero prompt

```
Dark-mode UI product still of OptionScope Brain pulse panel: three compact
rank cards stacked or in a row, #1 #2 #3 with structure names like Iron
Condor, Bull Put Credit, Debit Call Spread, model score bars in soft blue
#2a6cb8 to #5a9fd9, gate status pills OK / Warn, max loss amounts in sober
danger red only as numbers not drama, size cap line, secondary actions
Explain and Load in Lab as calm blue outline buttons — never Place Trade.
Background deep surface #12151b with subtle grid of cockpit chrome.
Educational poster composition, high legibility, fintech trust, soft
rim light on card edges, 50mm product photography style of a screen,
8k sharp UI.
```

### Style lock

Global + *ranked process, not hype picks*.

### Negative prompt

Global + `AI says BUY, signal fire emoji, hot tip banner, guru face, unlimited risk hidden`.

### Aspect variants

| Ratio | Notes |
|-------|--------|
| **1:1** | Three cards stacked vertically; #1 largest |
| **16:9** | Three cards horizontal as pulse strip with empty dark field above for title |

### Text overlay suggestions (post)

- **Title:** `Brain pulse`
- **Subtitle:** `Ranked structures. Size caps. Your load into Lab.`
- **Micro labels:** `Model score · Gates · Max loss`
- **Avoid:** “Top AI picks” / “Signals”

---

## OS-EG-04 — Trade Lab Hero

**Feature:** Trade Lab (`/builder`) — full hero workspace: symbol, brain rail, structure, analysis, checklist.

### Hero prompt

```
Wide dark-mode multi-panel trading laboratory UI mock for OptionScope Trade
Lab. Left-main: symbol header with LIVE badge, structure leg editor with
strikes in monospace, payoff diagram area, Greeks and Monte Carlo metric
tiles labeled MODEL EST. Right sticky rail ~380px: Brain ranking panel
above Robinhood order checklist card with Copy checklist primary action.
Soft blue accents #5a9fd9 on selected brain row and focus rings. Surfaces
#12151b page, #1a1f28 cards, #242a35 nested wells. Dense but calm cockpit
layout, aligned columns, educational clarity, no green execute buttons.
Photoreal flat monitor capture look, slight perspective 5 degrees, soft
studio key light, cinematic restraint, 8k UI hybrid.
```

### Style lock

Global + *hero workflow density with quiet chrome*.

### Negative prompt

Global + `Place Trade, one-click auto-enter, broker password modal, cluttered red/green heat map chaos`.

### Aspect variants

| Ratio | Notes |
|-------|--------|
| **1:1** | Emphasize right rail (brain + checklist) with partial main analysis |
| **16:9** | Full two-column Lab; ideal chapter hero |

### Text overlay suggestions (post)

- **Title:** `Trade Lab`
- **Subtitle:** `Brain · structure · payoff · checklist`
- **Pillar strip:** `Trust the process.`
- **CTA language only:** `Analyze · Explain · Load · Copy checklist`

---

## OS-EG-05 — Brain Rank Card (anatomy)

**Feature:** Single brain recommendation card — score, gates, size, actions.

### Hero prompt

```
Isolated educational UI component render: one large OptionScope brain
recommendation card on deep charcoal void. Card surface #1a1f28, 12px
radius, hairline border. Anatomy clearly zoned: (1) rank badge #1 and
structure name, (2) GROWTH-PRIMARY or income micro-label in soft accent,
(3) model score meter in blue gradient without neon, (4) row of gate pills
Liquidity OK, IV OK, Event Warn, (5) size cap and contracts suggestion,
(6) max loss defined $ amount, (7) bottom actions Explain · Load in Lab
as calm secondary/primary blue controls. Soft drop elevation, product
design system photography, instructional poster clarity, 85mm, f/4,
8k, dark cockpit aesthetic.
```

### Style lock

Global + *inspectable decision, second brain not second ego*.

### Negative prompt

Global + `black box smart badge, mysterious AI orb, buy now sticker`.

### Aspect variants

| Ratio | Notes |
|-------|--------|
| **1:1** | Card centered with generous padding; best for callout diagrams |
| **16:9** | Card left-third; right side empty dark for numbered anatomy callouts in post |

### Text overlay suggestions (post)

- Numbered callouts: `1 Score` · `2 Gates` · `3 Size cap` · `4 Max loss` · `5 Explain / Load`
- **Headline:** `Show the work`
- **Footer:** `If the brain can’t show its work, it doesn’t ship`

---

## OS-EG-06 — Payoff Truth

**Feature:** Payoff diagram — max profit, max loss, break-evens, defined vs undefined risk.

### Hero prompt

```
Educational financial chart visualization of a multi-leg options payoff
diagram on dark instrument panel background. Clean vector-like Recharts
style area: horizontal strike axis, vertical P&L, soft blue filled payoff
region #2a6cb8 at 40% opacity, break-even vertical dashed lines labeled
BE, max loss zone marked in restrained danger red #f0716e as a clear
horizontal cap for defined risk, max profit plateau labeled. Grid subtle
#2e3542, title “Payoff · model under assumptions,” no cartoon arrows to
the moon. Surrounding chrome: small metric chips Max loss · Max profit ·
BEs. Photoreal UI screen crop, high legibility educational poster, cool
grade, 8k sharp.
```

### Style lock

Global + *worst case first-class; clarity is kindness*.

### Negative prompt

Global + `to the moon arrow, infinite upside glory without label, happy profit confetti, crypto candlestick casino`.

### Aspect variants

| Ratio | Notes |
|-------|--------|
| **1:1** | Square chart with metric chips stacked below |
| **16:9** | Wide payoff with callout annotations room on right |

### Text overlay suggestions (post)

- **Title:** `See the trade`
- **Key lines:** `Max loss is not a footnote` · `Break-evens labeled` · `Defined risk visible`
- **Disclaimer micro:** `Educational diagram · not a recommendation`

---

## OS-EG-07 — Model Monte Carlo

**Feature:** Monte Carlo PoP / EV — honest model estimates with assumptions.

### Hero prompt

```
Dark fintech analysis panel showing Monte Carlo model output for options
education: left a soft histogram of simulated P&L paths in muted blue-gray
bars with a vertical zero line; right metric tiles reading Model PoP 54%,
Model EV, paths 10,000, each with MODEL EST. pill badge in accent blue.
Assumption chips below: volatility model, days to expiry, seed methodology
link style. Amber caution chip “Estimates under assumptions — not a
promise.” Surfaces charcoal, no green “you will win” styling on PoP.
Photoreal UI product crop, educational infographic clarity, soft top light,
8k, OptionScope cockpit aesthetic.
```

### Style lock

Global + *false precision is a brand crime; label models*.

### Negative prompt

Global + `54% chance you win, guaranteed EV, crystal ball AI, probability oracle glow`.

### Aspect variants

| Ratio | Notes |
|-------|--------|
| **1:1** | Histogram above, three metric tiles below |
| **16:9** | Side-by-side histogram + metrics + assumptions strip |

### Text overlay suggestions (post)

- **Title:** `Model estimates, labeled as models`
- **Bullets:** `PoP · EV · paths · assumptions`
- **Coach line:** `Use probability as context — pair with max loss and size`

---

## OS-EG-08 — Gate Halt Coach

**Feature:** Risk halt / gate fail — wise coach, not broken app.

### Hero prompt

```
Calm dark UI moment of OptionScope risk halt coach state. Full-width
HALT banner in restrained danger surface #2e1b1b with clear text “Gate
failed: liquidity” and coach copy “Tighten the chain or pick another
expiration — capital waits.” Below, dimmed brain cards with failed gate
pills, no angry error explosions. Soft blue secondary button “Review
rules” and neutral “Open Education.” Atmosphere of steady respect for
adult capital, not shame. Instrument panel lighting, educational poster
composition, photoreal product UI, 8k, dark cockpit #12151b.
```

### Style lock

Global + *coach not nanny; halt feels wise*.

### Negative prompt

Global + `skull icon drama, YOU CAN’T DO THAT, red screen of death, nanny finger wag, siren animation energy`.

### Aspect variants

| Ratio | Notes |
|-------|--------|
| **1:1** | Banner + one coach card centered |
| **16:9** | Banner across Lab chrome with context panels muted behind |

### Text overlay suggestions (post)

- **Title:** `Capital waits`
- **Subtitle:** `A failed gate is process — not a broken app`
- **Quote:** `Tighten the chain or choose another expiration`

---

## OS-EG-09 — Robinhood Checklist (manual dignity)

**Feature:** Order checklist — copy for Robinhood; never auto-trade; human owns the button.

### Hero prompt

```
Product UI still life of OptionScope Robinhood order checklist card on
dark surface: title “Robinhood order checklist,” strategy name, contracts,
ordered leg list with action Buy/Sell to open, quantity, strike, expiry,
limit price hints in monospace, verification checklist empty boxes for
human review, primary action Copy checklist with soft blue accent #5a9fd9,
secondary Save to journal. Explicit absence of Place Trade. Beside the
screen edge, a human hand holding a phone with blurred generic brokerage
app — focus remains on checklist card (dignity of manual control). Soft
desk light, educational narrative photography hybrid, calm, 8k.
```

### Style lock

Global + *agency is the climax; readiness not submission*.

### Negative prompt

Global + `one-click execute glory, API auto-submit fireworks, password entry for Robinhood, robotic hand trading for human`.

### Aspect variants

| Ratio | Notes |
|-------|--------|
| **1:1** | Checklist card only, no phone — pure component hero |
| **16:9** | Checklist + soft phone context on right third (phone out of focus) |

### Text overlay suggestions (post)

- **Title:** `Copy the checklist. You press the button.`
- **Steps:** `Analyze → Explain → Load → Copy → Robinhood`
- **Footer:** `Manual execution only · Not affiliated with Robinhood`

---

## OS-EG-10 — Explain + Citations

**Feature:** Catalog-grounded Explain AI — plain language + book sources; education not signals.

### Hero prompt

```
Dark educational panel for OptionScope Explain: eyebrow “Catalog-grounded
explainer” in soft accent blue, plain-language body text blocks about a
credit spread thesis in readable white secondary text, citation chips
“Sources: [Book title], ch. N” as calm surface-3 pills, disclaimer line
“Educational context — not a recommendation.” No glowing AI brain orb.
Layout like a precise coach note inside Trade Lab rail. Soft key light,
high legibility typography poster quality, photoreal UI, 8k, cockpit
charcoal palette #1a1f28 cards on #12151b.
```

### Style lock

Global + *scholarly-practical; citations over charisma*.

### Negative prompt

Global + `GPT trader badge, AI predicts the market, hologram robot face, uncited hot take, guru podcast mic`.

### Aspect variants

| Ratio | Notes |
|-------|--------|
| **1:1** | Explainer card full frame |
| **16:9** | Explainer rail right, dimmed payoff left for context |

### Text overlay suggestions (post)

- **Title:** `Explain in plain language`
- **Subtitle:** `Books in the loop`
- **Footer:** `Sources cited · education only`

---

## OS-EG-11 — Compare Three-Up

**Feature:** Compare (`/compare`) — A | B | C slots, shared assumptions, metric matrix, payoff overlays.

### Hero prompt

```
Dark-mode three-column strategy comparison UI for OptionScope Compare:
columns A B C with structure titles, compact payoff sparklines in soft
blue, shared assumptions bar across top (DTE, IV, model), metric matrix
rows for Model PoP, Model EV, Max loss, Max profit, Size cap — numbers
tabular and aligned. Selected column subtle accent border #5a9fd9.
Educational decision-aid aesthetic, calm not competitive gaming UI.
Photoreal product screen, wide instrument panel, 8k sharp.
```

### Style lock

Global + *decision aid, not battle royale*.

### Negative prompt

Global + `winner crown confetti, versus fight graphics, esports scoreboard neon`.

### Aspect variants

| Ratio | Notes |
|-------|--------|
| **1:1** | Two columns only or stacked matrix (label as mobile/compare lite) |
| **16:9** | True three-up — preferred |

### Text overlay suggestions (post)

- **Title:** `Compare under the same assumptions`
- **Subtitle:** `Max loss side by side with model estimates`
- **Micro:** `Shared DTE · IV · model`

---

## OS-EG-12 — Journal Forecast vs Outcome

**Feature:** Journal — forecast snapshot vs realized outcome; calibration over ego.

### Hero prompt

```
Educational UI of OptionScope trade journal scorecard on dark surface:
entry card with frozen forecast chips Model PoP, Model EV, planned max
loss, thesis one-liner; outcome section with realized P&L in restrained
success or danger color, notes field, calibration tag “Process followed /
Process broken.” Split layout forecast | outcome with calm horizontal
rule. No victory champagne. Soft blue accent on “Log fill” secondary.
Feeling: accountable improvement, learning velocity. Photoreal UI product
shot, 8k, cockpit aesthetic.
```

### Style lock

Global + *calibration over “called it” theater*.

### Negative prompt

Global + `trophy room, streak flames, guru scoreboard, money rain on wins`.

### Aspect variants

| Ratio | Notes |
|-------|--------|
| **1:1** | Single scorecard card full frame |
| **16:9** | Journal list left + scorecard detail right |

### Text overlay suggestions (post)

- **Title:** `Forecast vs outcome`
- **Subtitle:** `Get smarter every trade — not louder`
- **Labels:** `Frozen model snapshot` · `Realized result` · `Process check`

---

## OS-EG-13 — Live · Paper · Demo Badges

**Feature:** Data provenance badges — Live / Demo / Paper / Stale honesty.

### Hero prompt

```
Macro product photography style of four fintech status badge pills arranged
on dark charcoal fabric-like UI surface: LIVE (soft blue fill accent),
PAPER (warm warning tint), DEMO (neutral dashed border muted), STALE
(amber caution). Clean sans labels, 10px caps feel, educational legend
composition like an instrument key. Soft overhead light, shallow depth,
8k, OptionScope brand blues #2a6cb8 #5a9fd9, no neon glow stacks.
```

### Style lock

Global + *trust is labeled data; demo never looks premium-live*.

### Negative prompt

Global + `unlabeled live-looking fake data, holographic cyber badges, RGB gamer LEDs`.

### Aspect variants

| Ratio | Notes |
|-------|--------|
| **1:1** | 2×2 badge grid with caption under each |
| **16:9** | Horizontal legend strip with short definitions beside each badge |

### Text overlay suggestions (post)

- **Title:** `Always know what you’re looking at`
- **Definitions:**  
  - `LIVE` — real provider quotes  
  - `PAPER` — paper equity sizing  
  - `DEMO` — fallback / practice data  
  - `STALE` — refresh before decisions  
- **Footer:** `Demo must never look like premium live`

---

## OS-EG-14 — Capital Ladder Path

**Feature:** Empire capital ladder — Seed $500 → Stage 1 $5,000 → Stage 2 $25,000; process survival, not lottery.

### Hero prompt

```
Educational infographic on dark cockpit background: three ascending stone
or brushed-metal instrument steps forming a calm capital ladder, not a
skyrocket. Step plaques in soft blue edge light: Seed $500 “Survive &
learn process”; Stage 1 $500→$5,000 “Proof under small-account constraints”;
Stage 2 $5,000→$25,000 “Scale defined-risk income + selective growth.”
Subtle path line connecting steps, no dollar rain. Minimal 3D product
render hybrid with UI typography, cool grade, serious empire discipline
mood, soft key light, 8k, fintech educational poster.
```

### Style lock

Global + *empire = disciplined capital growth*.

### Negative prompt

Global + `yacht at top step, Lamborghini reward, moon rocket ladder, overnight 100x, mansion unlock`.

### Aspect variants

| Ratio | Notes |
|-------|--------|
| **1:1** | Vertical ladder centered |
| **16:9** | Horizontal three-stage path left→right with more annotation room |

### Text overlay suggestions (post)

- **Title:** `Capital ladder`
- **Subtitle:** `Process first. Survival first. Scale when earned.`
- **Stage labels:** as on plaques  
- **Footer:** `Paper until process works · defined-risk micro when capital is small`

---

## OS-EG-15 — See · Trust · Own Pillars

**Feature:** Brand pillars / tagline emotional map for empire education chapter openers.

### Hero prompt

```
Cinematic but restrained triptych educational graphic on deep navy #0c1220:
three vertical panels separated by hairline borders. Panel 1 “See” —
minimal payoff curve icon in soft blue. Panel 2 “Trust” — stacked book
lines + gate check marks as abstract instrument icons. Panel 3 “Own” —
simple checklist with a human fingertip silhouette at final empty box
(decision). Below panels, tagline space reserved. Scope aperture mark
(thin ring + horizon tick + center decision point) small at top center.
No mascots. Soft volumetric light, museum poster clarity, 8k, OptionScope
brand blues #2a6cb8 #5a9fd9.
```

### Style lock

Global + *See / Trust / Own = visibility / process / agency*.

### Negative prompt

Global + `superhero trader, AI god figure, aggressive sniper scope, meme icons`.

### Aspect variants

| Ratio | Notes |
|-------|--------|
| **1:1** | Three stacked bands or 2+1 compact triptych |
| **16:9** | True three equal columns — best for chapter opener |

### Text overlay suggestions (post)

- **Main:** `See the trade. Trust the process. Own the decision.`
- **Pillar one-liners:**  
  - See — Payoff and risk made visible  
  - Trust — Models, rules, citations you can inspect  
  - Own — Manual checklist; you execute  

---

## OS-EG-16 — NCI TA Context (not a signal)

**Feature:** NCI TA bias (FIRE / master / ABC) as **context input** to brain — never buy/sell styling.

### Hero prompt

```
Dark cockpit UI composition: TradingView-like chart panel muted in
background with calm candles; foreground floating context chip row
“NCI TA bias: FIRE · bullish” as neutral/info pill not green buy button,
timestamped, labeled Context. Adjacent brain panel partially visible
showing multiple inputs (IV rank, liquidity, book rules, NCI) as equal
weight tiles. Soft blue accent only on selection, educational poster
overlay style “One input among many.” Photoreal UI hybrid, 8k, no
traffic-light trade buttons.
```

### Style lock

Global + *chart bias is context; process outranks heat*.

### Negative prompt

Global + `FIRE signal ENTER NOW, buy/sell traffic lights, signal fire emoji, hot alert pulse`.

### Aspect variants

| Ratio | Notes |
|-------|--------|
| **1:1** | Chip + “context not order” callout card |
| **16:9** | Chart + multi-input brain tiles full story |

### Text overlay suggestions (post)

- **Title:** `NCI TA is context`
- **Subtitle:** `Bias informs rank — it does not replace gates or max loss`
- **Footer:** `Never styled as a buy/sell order`

---

## OS-EG-17 — Small-Account Defined Risk

**Feature:** $500 options reality — defined-risk micro structures; paper until process works; no naked undefined default.

### Hero prompt

```
Educational concept graphic: dark desk with printed risk card and UI tablet
showing a defined-risk debit spread payoff with tight max-loss cap
highlighted; beside it a ghosted rejected panel labeled “Undefined risk —
not default for small accounts” with subdued danger border. Soft blue
accent on the defined-risk path only. Minimal props: index card with
handwritten “1% risk policy,” no luxury flex. Lighting soft and serious.
Photoreal hybrid educational still, 8k, OptionScope calm cockpit palette.
```

### Style lock

Global + *small accounts: survive, defined risk, paper rehearsal*.

### Negative prompt

Global + `naked short glory, YOLO size, unlimited risk as macho, rags-to-riches montage`.

### Aspect variants

| Ratio | Notes |
|-------|--------|
| **1:1** | Two cards stacked: defined OK / undefined rejected |
| **16:9** | Side-by-side comparison with capital callouts |

### Text overlay suggestions (post)

- **Title:** `$500 reality`
- **Bullets:** `Defined-risk micro` · `Paper until process works` · `Many CSPs need more capital than the account`
- **Coach:** `Survival is the first profit`

---

## OS-EG-18 — Agency Climax (checklist ready)

**Feature:** Emotional peak of product — checklist ready + verification, not trade submitted.

### Hero prompt

```
Quiet cinematic product moment: dark room, single monitor showing
OptionScope “Checklist ready” completion state with calm blue check
icon (not confetti), Copy checklist button in soft accent #5a9fd9,
prompt text “Verify every leg in Robinhood before you enter.” Empty
coffee mug, still hand resting near keyboard not clicking frantically.
Cool moonish window light, deep navy shadows, emotional promise of
readiness without rush. Photoreal narrative still, 35mm, f/2.0, 8k,
fintech trust, educational empire mood — disciplined capital, not
dopamine climax.
```

### Style lock

Global + *climax = readiness + agency; time-to-calm*.

### Negative prompt

Global + `order filled fireworks, profit popper, high-five trading floor, countdown timer FOMO`.

### Aspect variants

| Ratio | Notes |
|-------|--------|
| **1:1** | Monitor + hand crop; strong for social/education end card |
| **16:9** | Wider desk narrative for chapter close / trailer still |

### Text overlay suggestions (post)

- **Title:** `Checklist ready`
- **Subtitle:** `You never enter alone — you still own the button`
- **Tagline:** `See the trade. Trust the process. Own the decision.`
- **Disclaimer:** `Educational analysis only · Not investment advice`

---

## Production batch recipes

### Batch A — UI truth (priority for product education)

1. OS-EG-01 Command Center  
2. OS-EG-04 Trade Lab  
3. OS-EG-06 Payoff  
4. OS-EG-07 Monte Carlo  
5. OS-EG-09 Checklist  
6. OS-EG-08 Halt coach  

### Batch B — Empire doctrine (personal book)

1. OS-EG-14 Capital ladder  
2. OS-EG-15 See · Trust · Own  
3. OS-EG-17 Small-account defined risk  
4. OS-EG-12 Journal calibration  
5. OS-EG-18 Agency climax  

### Batch C — Trust & literacy

1. OS-EG-13 Badges  
2. OS-EG-10 Explain + citations  
3. OS-EG-05 Brain card anatomy  
4. OS-EG-03 Brain pulse  
5. OS-EG-11 Compare  
6. OS-EG-16 NCI context  
7. OS-EG-02 Account strip  

---

## Post-production checklist (every export)

- [ ] No Place Trade / Buy primary CTA visible  
- [ ] PoP/EV include “Model” language if numbers shown  
- [ ] Live / Paper / Demo not ambiguous  
- [ ] Accent blue only (not Robinhood green as brand CTA)  
- [ ] Disclaimer or “educational” present on public-facing crops  
- [ ] 1:1 safe margins for title; 16:9 left/right copy safe if used in video  
- [ ] Empire framing = process ladder, not lifestyle wealth  

---

## Optional Figma text styles (overlay)

| Role | Spec |
|------|------|
| Chapter title | 28–36px, medium, `#eef1f5` on dark |
| Subtitle | 16–18px, `#b6bdc8` |
| Micro label | 11–12px uppercase tracking, `#8a93a3` |
| Accent underline | 2px `#5a9fd9` |
| Disclaimer | 11px `#8a93a3` |

---

## File naming convention

```
OS-EG-{##}_{slug}_{1x1|16x9}_{v#}.{png|webp}
```

Examples:

- `OS-EG-01_command-center_16x9_v1.png`  
- `OS-EG-09_checklist-dignity_1x1_v2.png`  
- `OS-EG-14_capital-ladder_16x9_v1.png`

---

## Handoff

| Next | Action |
|------|--------|
| **design-ui-designer** | Map shots to Education module figures + empty-state art direction |
| **Image gen run** | Batch A first; lock 2 heroes (01, 04) as style references for consistency |
| **Empire book editor** | Place 14–18 figures into personal companion curriculum order (ritual → lab → checklist → journal → ladder) |
| **Missing 02 book** | Optional: reverse-generate `02-FEATURE-GRAPHICS-PROMPT-BOOK.md` as a shorter feature→shot index from this production file |

---

**Status:** PRODUCTION READY — 18 major visuals  
**Brand guardian alignment:** Calm cockpit · model honesty · manual dignity · no get-rich  
**Owner:** Michael Chapman / NerdCommand · OptionScope personal empire education
