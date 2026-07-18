# NCI TA ↔ OptionScope Brain Bridge

## Can the brain "read" a TradingView chart with the indicator live?

**Not through the embed widget.** TradingView’s public chart widget (what OptionScope already mounts) shows a chart but **cannot export custom Pine plot values** into our Next.js app.

### Two real live paths we built

| Path | How | Latency | Fidelity |
|------|-----|---------|----------|
| **A. TypeScript engine** | `computeNciTa(bars)` ports Pine math; `POST /api/nci-ta/compute` | On demand | High on chart TF; multi-TF needs bar series |
| **B. TradingView webhook** | Pine `alert()` / alertcondition → `POST /api/nci-ta/webhook` | On bar close / event | Exact Pine numbers from TV |

The brain consumes a single contract: **`NciTaSnapshot`** (`src/indicators/nciTa/types.ts`).

```
TradingView chart + NCI TA pine
        │
        ├─(alerts JSON)──► POST /api/nci-ta/webhook ──► putSnapshot()
        │
OHLCV bars (OpenBB/Polygon/demo)
        │
        └─(compute)──────► POST /api/nci-ta/compute ──► putSnapshot()
                                      │
                                      ▼
                         runTradingBrain({ nciTa: getSnapshot(sym) })
                                      │
                                      ▼
                    strategy ranking + Robinhood checklist (manual)
```

## What the Pine is saying (for the brain)

From `pine/NCI_Complete_Trading_Assistant_v2.pine`:

1. **SuperBias (24)** — always-on bull/bear tally → `sbNet` −24..+24  
2. **Companion (7)** — HTF EMA + RSI/stoch/CCI gate  
3. **ConfluenceBridge (6)** — M1→D1 EMA21/55 alignment  
4. **SuperBrain Ports (11)** — strategy-style votes  
5. **SuperBrain Voters (15)** — indicator votes  
6. **Master** — average of five normalized layers → `masterDir` BULL/BEAR/FLAT  
7. **ARM/FIRE** — SuperBias net + full gates → entry trigger language  
8. **RoboTrick fade** — mean-reversion layer (counter-trend by design)  
9. **ABC stage** — consolidation / expansion / contraction (contraction = avoid)

### Brain mapping (options account growth)

| NCI TA state | Options brain preference |
|--------------|---------------------------|
| ◆ FIRE BUY + gates | Bullish defined-risk / CSP / bull put credit |
| ◆ FIRE SELL + gates | Bearish defined-risk / bear call credit |
| Master FLAT | Iron condor / range income / CSP |
| ABC C CONTRACTION | Block growth_tactical |
| RoboTrick FADE | Prefer income engines, don’t chase |
| Hard gates fail | Deprioritize tactical; no “force” entries |

## Setup checklist

1. Load `pine/NCI_Complete_Trading_Assistant_v2.pine` on TradingView (stocks or forex).  
2. Paste alert JSON bridge from `pine/NCI_OptionScope_Alert_Bridge.pine`.  
3. Point webhook to `/api/nci-ta/webhook` (tunnel if local).  
4. Set `NCI_TA_WEBHOOK_SECRET` in `.env.local`.  
5. Verify: `GET /api/nci-ta/snapshot?symbol=SPY`.  
6. Pass snapshot into `runTradingBrain({ …, nciTa })`.

## Honest limits (from NCI indicator docs)

- Forex FIRE auto-entries alone are **not** a proven money printer — use as **co-pilot**.  
- SPY-class stocks showed better risk-adjusted results in NCI’s own notes.  
- OptionScope still **never** auto-sends Robinhood orders.

## PDF library expansion

`src/knowledge/catalog/optionsLibraryIndex.json` lists ~30 option books found under  
`Documents/Claude/Projects/option trader`. Structured rules already expanded in  
`src/knowledge/bookRulesExtra.ts`. Full PDF text extraction → rule compiler is Phase 4.2.
