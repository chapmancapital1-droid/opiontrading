# External drive trading data map (G / H / L)

Indexed into OptionScope: `src/knowledge/catalog/external/driveInventory.json`  
Re-index: `node scripts/index_external_drives.mjs`  
Re-ingest PDFs (includes these roots): `npm run ingest`

## G: — NCI brain memory

| Path | Role |
|------|------|
| `G:\NCI_Brain_CLAUDE.md` | NCI operational memory (Forex v3.1 12 ports, risk ladder, TP1/2/3) — **copied to** `docs/external-drives/G_NCI_Brain_CLAUDE.md` |
| `G:\codebase-memory-data\D-NERDCOMMANDCLAUDEBRAIN.db` | Codebase graph DB (~183 MB) for NERDCOMMANDCLAUDEBRAIN |

## H: — Pine Script training

| Path | Role |
|------|------|
| `H:\Tradingview Pine Script Strategies The Complete Guide\` | Full strategy course: order types, broker emulator, practical strategies |
| `H:\GetFreeCourses.Co-Udemy-Learn TradingView Pine Script Programming From Scratch\` | Pine v5 syntax + projects |

**Pulled into repo** as `pine/examples/*.txt` (50-pips/day, MACD H1, Hull MA strategy, RSI2, advanced order types, etc.).

## L: — Trading book library

| Path | Role |
|------|------|
| `L:\bookLibrary\` | Primary trading library (options courses, forex packs, EA manuals, TA mastery) |
| `L:\bookLibrary\The Advanced Options Trading Course Updated 2022\` | Bullish / bearish / neutral modules + cheat sheets |
| `L:\bookLibrary\Options Trading MasterClass Options With Technical Analysis\` | MasterClass + mindset PDF |
| `L:\bookLibrary\Options Trading Crash Course\` | Beginner options |
| `L:\bookLibrary\The-Overnight-SPY-Trader-Strategy-Guide-PDF.pdf` | SPY overnight edge (options-relevant) |
| `L:\bookLibrary\Forex TOP 15 Books Collection\` | Elder, Douglas, Naked Forex, Market Wizards, etc. |
| `L:\bookLibrary\EAs\` | EA manuals (reference only — not auto-trade hooks) |
| `L:\Tradingplan1.docx` | Personal trading plan stub |

## How this feeds OptionScope

1. **PDF ingest** walks C + G + H + L roots → knowledge catalog + strategy seeds  
2. **Pine examples** support NCI TA / alert bridge development  
3. **G NCI brain** risk rules align with portfolio policy (1% risk, hard caps, staged TP)  
4. **Never** auto-executes Robinhood or EA live paths from these files  

_Educational decision support only — not investment advice._
