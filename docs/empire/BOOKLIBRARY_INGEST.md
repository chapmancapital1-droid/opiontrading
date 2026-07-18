# L:\bookLibrary ingest

**Date:** 2026-07-12  
**Root:** `L:\bookLibrary` (~4.6k files, ~152 PDFs; many EAs/junk skipped)

## High-value options methods ingested

| Source | Structured rule | App strategy |
|--------|-----------------|--------------|
| Money Press Cheat Sheet 2016 | `booklib_money_press_cheat_sheet` | `money_press_put_diagonal` |
| Money Press Method 2020 | (existing) | put diagonal |
| Crow Bar Strategy | `booklib_crowbar_leap` | `long_call` LEAP |
| Steadiest Option Trader PDF | (prior pass) | CSP / credits |
| TA risk modules | `booklib_risk_mgmt_credit` | `bull_put_credit` |

## Also cataloged (metadata / charter)

- Options crash course, advanced options course notes  
- Adler ChatGPT day trading, Jesse GenAI for trading — **co-pilot only**  
  - Full assessment: `docs/empire/jesse-gai-brain-health-assessment.md`  
- Elder / Douglas / Lien / Naked Forex — psychology & FX (not primary equity options engine)  
- Pine Script / Python / AI coding manuals — tooling  

## Explicitly not in options brain

- MetaTrader EA “robots” and binary options packs  
- Windows/codecs/marketing email dumps / non-trading folders  

## Inventory

`src/knowledge/catalog/booklibrary_inventory.json`

## Code

`src/knowledge/bookLibraryRules.ts` → merged into `STRATEGY_RULES`.
