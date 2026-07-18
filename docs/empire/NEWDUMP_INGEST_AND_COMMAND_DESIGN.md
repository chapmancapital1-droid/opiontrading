# L:\newdump ingest + Command Center design

**Date:** 2026-07-12  
**Goal:** Slowly absorb the local trading / AI / pricing library into OptionScope logic, ship UI that supports a **profit-focused process**, and teach the brain what we did.

## Library map (what we found)

| Area | Path | App use |
|------|------|---------|
| Options + spreads | `Books - Investing and Options\Options Trading Collection` | Strategy rules, education |
| Volatility / VIX | `...\Volatility and VIX Collection` | IV-rich credit bias |
| Black-Scholes | `Basic Black-Scholes.pdf` (Crack) | Pricing discipline, no Δ≠PoP |
| Saliba spreads | `Saliba A. Option Spread Strategies…2009` | Defined-risk verticals / condors |
| AI assistants | `Build Your Own AI Assistant…` | Local LLM co-pilot limits |
| GenAI investing | `Cohan P. Brain Rush…2024` | AI as workflow, not oracle |
| Quantum AI | `Wichert A. Mind, Brain, Quantum AI…` | Out of scope for edge |
| Neuroscience AI | `Hassan M. Brain Networks…` | Personalization ≠ market edge |
| Noise | music, gospel, VDJ, HTML packs | **Ignored** for trading brain |

**Inventory file:** `src/knowledge/catalog/newdump_inventory.json` (metadata only — titles, paths, tags, size).

**Ingest policy:** Do **not** dump full copyrighted PDF text into the repo. Distill **structured StrategyRule** rows + charter bullets.

## Rules shipped into the brain

Module: `src/knowledge/newdumpRules.ts` → merged in `STRATEGY_RULES` **before** auto-ingest seeds so hand distillations win on id collisions.

| Rule id | Structure | Profit thesis |
|---------|-----------|---------------|
| `newdump_bs_discipline_credit` | bull put credit | Price risk window first |
| `newdump_saliba_call_credit` | bear call credit | Resistance / range sell |
| `newdump_saliba_condor` | iron condor | Sideways elevated IV |
| `newdump_vol_seller_iv_rich` | bull put credit | IV-rank sell premium |
| `newdump_cc_income` | covered call | Own-the-name income |
| `newdump_debit_cheap_iv` | bull call debit | Buy when IV low |
| `newdump_money_press_align` | put diagonal | Seed weekly press |

Plus `AI_COPILOT_CHARTER` — language models narrate; engine owns numbers.

## Command Center design (built)

**Tabs on Dashboard:**

1. **Cockpit** — ritual, snapshot, context, TV strip, chart, news, quick links  
2. **Brain** — profit charter + live `BrainRecommendPanel` for loaded ticker  
3. **Library** — ingest status + sample rules → full `/library` page  
4. **Playbook** — pre-trade plan form + post-trade review form (localStorage)

**Nav:** added **Library** primary link.

**Forms (from book process):**

- Pre: symbol, strategy, thesis, IV regime, max loss/profit, BEs, DTE, exit plan, event clear, size  
- Post: realized P/L, days, forecast PoP, what worked/failed, rule to keep  

## Brain education (what the AI must know)

1. **Obsession:** option profits via defined risk + IV fit + capital ladder — not stock chat.  
2. **Truth stack:** domain engine + chain + rules; LLM optional coach only.  
3. **Never:** invent strikes/marks, treat delta as PoP, auto-trade, market quantum magic.  
4. **Newdump is live** in selector ranking via `NEWDUMP_RULES`.  
5. **Recommend button** locks lab legs + model backtest (Trade Lab).  
6. **Playbook forms** close the learning loop with journal-style discipline.

Updated: `docs/research/LM_STUDIO_OPTIONS_BRAIN_DIRECTIVES.md` (pointer), education page, this file.

## Slow-ingest next passes (optional)

1. Re-run `scripts/ingest_option_pdfs.py` with root `L:\newdump\Books - Investing and Options` (page caps).  
2. Prefer text-layer PDFs over scanned (Saliba scan is image-heavy).  
3. Chapter-level rule refine for Natenberg / Cordier / Condor collections.  
4. Wire post-trade reviews into explain/calibration later.

## Algorithmic Essentials — Trading with Python (Strauss / Van Der Post 2024)

**Path:** `L:\newdump\newdump\Algorithmic Essentials_ Trading with Python_ …\….pdf` (~275 pages)

### What it is
Mass-market Python algorithmic trading primer (Reactive Publishing): Python start, data, ML intro, **backtesting**, microstructure, HFT, portfolio risk, optimization.

### Empire value
| Keep | Skip |
|------|------|
| Walk-forward / OOS discipline | HFT stack |
| Look-ahead & survivorship bias awareness | Auto-Python broker bots |
| Sharpe / max DD / stress scenarios as journal literacy | ML free-form signals |
| Rules before emotion (process) | Replacing Money Press structure |

### Shipped
- `NEWDUMP_ALGO_ESSENTIALS` charter in `newdumpRules.ts`
- Strategy rule `newdump_strauss_process_credit` → `bull_put_credit`
- Inventory tag `algo_python`
- AI co-pilot bullet: no live Python execution path from this book

## HBR — Artificial Intelligence: The Insights You Need (2019)

**Path:** `L:\newdump\newdump\Artificial Intelligence_ The Insights You Need from Harvard Business Review PDF\….pdf`  
**~193 pages** · HBR Press essay collection (Davenport intro; Brynjolfsson/McAfee; Ng; Wilson/Daugherty; etc.)

### What it is
Management guide to **AI adoption** (understanding ML, first projects, data quality, when algorithms fail, future of work, collaborative intelligence). **Not** a trading/options book.

### Empire map
| HBR idea | OptionScope |
|----------|-------------|
| Narrow AI / task support | Explain + score — not full auto-broker |
| What AI must never do | Never invent strikes/marks/orders |
| Data quality | Chain/quote confidence gates |
| Quick-win first project | Recommend + checklist before moon shots |
| Plan when algorithms fail | Risk gates, daily halt, human fill |
| Human + AI | Companion mode |

### Shipped
- `NEWDUMP_HBR_AI` charter in `newdumpRules.ts`
- Inventory tag `ai_governance`
- **No StrategyRule** (would only pollute selector)

## An Illustrated Guide to AI Agents (O’Reilly Early Release EPUB)

**Path:** `L:\newdump\newdump\An Illustrated Guide to AI Agents - …\….epub`  
**UID:** 979-8-341-66269-8 · **Incomplete early release** (preface: “Brief TOC Not Yet Final”)

### What’s actually in *this* file
| Available | Unavailable in this EPUB |
|-----------|---------------------------|
| Ch. Memory (final book ch.4) | Intro, LLM, Reasoning LLMs |
| Ch. Tool Usage, Learning, Protocols (final ch.5) | Evaluating agents, multi-agent, multimodal, coding agent, training, SLM |

### Empire map
| Book idea | OptionScope |
|-----------|-------------|
| LLMs are stateless without memory | Journal + account + catalog as memory |
| RAG / agentic RAG | `searchCatalog` + rules, not free web facts |
| Context as specification | Phase 5 explain grounded in BrainDecision facts |
| Tools enable action | Real APIs only; **no place_order tool** |
| Tool create/define/select/call/process | Validate marks before size |
| Low vs high autonomy tool flow | Fixed brain pipeline (safe) |

### Shipped
- `NEWDUMP_AI_AGENTS_GUIDE` in `newdumpRules.ts`
- Inventory tag `ai_agents`
- **No StrategyRule**

## Saliba — Option Spread Strategies (2009) — DEEP PASS

**Path:** `L:\newdump\Saliba A. Option Spread Strategies. Trading Up, Down, and Sideways Markets 2009\….pdf`  
**Bloomberg Press** · ~282 pages · Anthony J. Saliba et al.

### Chapters
Covered-Write · Verticals · Collars · Straddles/Strangles · Butterflies/Condors · Calendars · Ratios · Backspreads

### Rules in brain (`newdumpRules.ts`)
| ID | strategyId |
|----|------------|
| `newdump_saliba_put_credit` | bull_put_credit |
| `newdump_saliba_call_credit` | bear_call_credit |
| `newdump_saliba_bull_call_debit` | bull_call_debit |
| `newdump_saliba_condor` | iron_condor |
| `newdump_saliba_calendar` | money_press_put_diagonal |
| `newdump_saliba_covered_write` | covered_call |

Plus `NEWDUMP_SALIBA_PLAYBOOK` hygiene + **reject ratio/backspread/naked strangle for seed**.

### Core Saliba → empire
- Limited-risk spreads are the point (esp. post-crisis risk fashion in intro)
- High IV → verticals over naked long options
- Range → butterfly/condor with S/R + mean reversion + time-in-range
- Covered-write = short-put risk; not cash machine
- Multi-leg entry; do not leg or leave one side naked

## Wichert — Mind, Brain, Quantum AI, and the Multiverse (2023)

**Path:** `L:\newdump\Wichert A. Mind, Brain, Quantum AI, and the Multiverse 2023\….pdf`  
**CRC Press** · ~199 pages · Andreas Wichert

### What it is
Academic bridge: philosophy of mind → computer science/AI → brain science → quantum physics/quantum AI → Everett many-worlds multiverse. Prefaces connection of mind/brain/multiverse; **not** a trading text.

### Chapters
1 Intro (dualism, computationalism, free will)  
2 Computer metaphor (Gödel, Turing, AI, complex systems, ML)  
3 Brain (neurons, consciousness)  
4 Quantum reality (entropy, QM, qubits, quantum ML/AI)  
5 Multiverse (Everett, quantum cognition metaphors)  
6 Conclusion (ethics)

### Empire map
| Book | OptionScope |
|------|-------------|
| Quantum AI / multiverse | **Philosophy only** — no strategy rules |
| Path ensembles | MC stays classical PoP/EV — not "multiverse picks" |
| Free will / dualism debates | Do not skip risk gates |
| Ethics of powerful AI | Transparent engine + human fill |

### Shipped
- `NEWDUMP_WICHERT_QUANTUM` charter  
- Hardened `AI_COPILOT_CHARTER` (no quantum branding of MC)  
- Inventory already had Wichert row  
- **No StrategyRule**

## Cohan — Brain Rush: Generative AI Invest & Compete (2024)

**Path:** `L:\newdump\Cohan P. Brain Rush…\….pdf`  
**Apress** · ~403 pages · Peter Cohan

### What it is
Business book: GenAI definition, end uses, services, software, cloud, hardware value chain, investor implications, societal risk/benefit. Financial services case studies (JPM advisor-like bots, State Street Alpha, GS tests). **Not** options spreads.

### Empire map
| Book | OptionScope |
|------|-------------|
| Hallucination / liability | Never invent strikes; verify engine facts |
| AI investment advisors | Co-pilot only; human RH fill |
| AI stock ecosystem | Theme literacy — not seed primary edge |
| Dos: experiments | Explain/journal/checklist first |

### Shipped
- `NEWDUMP_COHAN_BRAIN_RUSH`
- Inventory tag `ai_business`
- **No StrategyRule**
