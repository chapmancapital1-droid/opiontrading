# OptionScope — NEXUS brief (Grok takeover)

**Date:** 2026-07-12  
**Product:** OptionScope — educational options strategy calculator + Robinhood companion brain  
**Repo:** `https://github.com/chapmancapital1-droid/opiontrading`  
**Local:** `C:\Users\Michael Chapman\opiontrading`  
**Branch:** `claude/openbb-data-news-integration`

## Why Grok took over
Claude Code hit org subscription lockout (“disabled Claude subscription access for Claude Code”). Uncommitted Phase 4 work was at risk; Grok + Agency agents resumed.

## Stack
- Next.js 14, TypeScript, Tailwind, Vitest
- Domain engine: Black-Scholes / binomial / Monte Carlo
- Data: demo / Polygon / OpenBB
- Brain: NCI-OS policy + book rules + NCI TA bias

## Done (through Phase 4.1)
- Phases 0–3: foundation, TV viz, live data, market context
- Phase 4: selector, portfolio sizing, risk gates, PDF library ingest
- Phase 4.0b: NCI TA Pine bridge
- Phase 4.1: live-chain instantiate + engine PoP/EV + builder panel

## Next (Phase 5+)
1. AI reasoning layer (RAG over book catalog, grounded explanations)
2. Chart overlays + selector backtest
3. Journal calibration loop

## Non-goals
- Auto-trading / Robinhood API order placement
- Presenting model PoP as guaranteed outcomes
