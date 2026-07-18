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

## Honesty rails

- Synthetic markets only (regime stress lab — not 400 years of real SPY tape).
- Champions are **not** live trade signals.
- No broker. No auto-trade.
- Live capital path remains: Trade Lab + manual checklist + your broker.

## Run

```powershell
cd "C:\Users\Michael Chapman\opiontrading"
npm run dev
# open http://localhost:3000/evolve
```
