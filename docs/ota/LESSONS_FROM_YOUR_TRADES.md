# Lessons from your Robinhood history

Generated: 2026-07-16T16:01:39.342869+00:00
Matched option trades: **877**
Win rate: **50.1%**
Total option P/L (matched): **$-25264.04**
Avg win: $125.4 · Avg loss: $-183.37 · PF: 0.685

## Consistent patterns
- LONG OPTIONS: win_rate=23% pnl=$-49305 on 339 trades — debit buys often expire worthless; prefer defined-risk debit spreads + time stops.
- ASSIGNMENT: 107 events, pnl=$-9845 — short puts/calls getting assigned; manage earlier or use defined-risk spreads.
- EXPIRATION: 130 closes via OEXP, pnl=$-882 — too many held to zero; exit losers at −40–50% premium (SPY playbook rule).
- WORST SYMBOLS (by total P/L): SPXW $-25062 (n=3, wr=0%), CLSK $-1951 (n=6, wr=50%), ULTY $-1333 (n=6, wr=50%), MSTY $-1289 (n=50, wr=48%), BITO $-576 (n=48, wr=42%)
- BEST SYMBOLS (by total P/L): GERN $1245 (n=52, wr=56%), PLUG $1190 (n=135, wr=49%), SXC $648 (n=6, wr=50%), NYMT $519 (n=45, wr=38%), ZETA $420 (n=6, wr=50%)

## How you could do better
- Never risk >1–2% equity per campaign (empire rule).
- Prefer defined-risk spreads over naked STO when assignment shows up in history.
- Exit long options before OEXP wipeouts; use −40% premium adjust/exit.
- Avoid repeating worst symbols until process review is journaled.
- Use NCI Bias + SPY playbook gates before next entry on liquid underlyings.
- LONG OPTIONS: win_rate=23% pnl=$-49305 on 339 trades — debit buys often expire worthless; prefer defined-risk debit spreads + time stops.
- ASSIGNMENT: 107 events, pnl=$-9845 — short puts/calls getting assigned; manage earlier or use defined-risk spreads.
- EXPIRATION: 130 closes via OEXP, pnl=$-882 — too many held to zero; exit losers at −40–50% premium (SPY playbook rule).
- WORST SYMBOLS (by total P/L): SPXW $-25062 (n=3, wr=0%), CLSK $-1951 (n=6, wr=50%), ULTY $-1333 (n=6, wr=50%), MSTY $-1289 (n=50, wr=48%), BITO $-576 (n=48, wr=42%)

## Build on wins
- Lean into GERN-like setups that already paid ($1245 on 52 trades, wr 56%) — size only within 1–2% risk.
- Lean into PLUG-like setups that already paid ($1190 on 135 trades, wr 49%) — size only within 1–2% risk.
- Lean into SXC-like setups that already paid ($648 on 6 trades, wr 50%) — size only within 1–2% risk.
- Short premium has edge in this sample — keep defined-risk credit spreads; avoid naked assignment risk.

## Worst symbols
```
[
  {
    "symbol": "SPXW",
    "n": 3,
    "win_rate": 0.0,
    "pnl": -25061.94,
    "avg_pnl": -8353.98
  },
  {
    "symbol": "CLSK",
    "n": 6,
    "win_rate": 0.5,
    "pnl": -1950.51,
    "avg_pnl": -325.08
  },
  {
    "symbol": "ULTY",
    "n": 6,
    "win_rate": 0.5,
    "pnl": -1332.75,
    "avg_pnl": -222.12
  },
  {
    "symbol": "MSTY",
    "n": 50,
    "win_rate": 0.48,
    "pnl": -1288.9,
    "avg_pnl": -25.78
  },
  {
    "symbol": "BITO",
    "n": 48,
    "win_rate": 0.417,
    "pnl": -575.76,
    "avg_pnl": -11.99
  }
]
```

## Best symbols
```
[
  {
    "symbol": "GERN",
    "n": 52,
    "win_rate": 0.558,
    "pnl": 1244.73,
    "avg_pnl": 23.94
  },
  {
    "symbol": "PLUG",
    "n": 135,
    "win_rate": 0.489,
    "pnl": 1190.4,
    "avg_pnl": 8.82
  },
  {
    "symbol": "SXC",
    "n": 6,
    "win_rate": 0.5,
    "pnl": 647.7,
    "avg_pnl": 107.95
  },
  {
    "symbol": "NYMT",
    "n": 45,
    "win_rate": 0.378,
    "pnl": 519.48,
    "avg_pnl": 11.54
  },
  {
    "symbol": "ZETA",
    "n": 6,
    "win_rate": 0.5,
    "pnl": 419.76,
    "avg_pnl": 69.96
  }
]
```

_Educational reconstruction from activity CSVs. Fees/partials/assignments can skew P/L. Not tax advice._