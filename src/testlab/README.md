# Workspace 0890ad1c integration — Evolve Lab

Source lineage: `workspace-0890ad1c` scientific-method evolution engine  
(portable extracts under Downloads / `import/` are wrappers; this is the app integration).

## First-class tool UI

| Surface | Path |
|---------|------|
| **Nav tab** | **Evolve** in AppShell primary nav |
| **Route** | `/evolve` — tool IA header + cross-tool strip + engine |
| **API** | `GET /api/testlab/evolve` (SSE stream) |
| **Engine** | `src/testlab/trading/*` |
| **Panel** | `src/components/EvolutionLabPanel.tsx` |
| **Offline twin** | `python/ota` · `TRADING_BRAIN_LOCAL` |

## Hive brain (successful runs → git knowledge)

On each completed evolve, the server evaluates the champion. If it passes success
gates (WR / Sharpe / edge / trades / DD), results are merged into:

| File | Role |
|------|------|
| `src/knowledge/catalog/hive/hive_brain.json` | Aggregate + improvement lessons |
| `src/knowledge/catalog/hive/strategy_win_rates.json` | Per-strategy win-rate tracking |
| `src/knowledge/catalog/hive/evolve_runs.jsonl` | Append-only successful run log |

Logic: `src/knowledge/hiveBrain.ts` · store: `src/knowledge/hiveStore.ts` · API: `GET /api/hive`

```bash
git add src/knowledge/catalog/hive/
git commit -m "hive: evolve successful runs"
git push
```

## Honesty rails

- Synthetic markets only (regime stress lab — not 400 years of real SPY tape).
- Champions are **not** live trade signals.
- Hive win rates are **lab** stats, not Robinhood fill WR.
- No broker. No auto-trade.
- Live capital path remains: Trade Lab + manual checklist + your broker.

## Run

```powershell
cd "C:\Users\Michael Chapman\opiontrading"
npm run dev
# open http://localhost:3000/evolve
```
