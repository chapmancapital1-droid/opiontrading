# OptionScope

Educational options strategy calculator & Robinhood trading companion.
Analyzes a trade's risk, reward, break-evens, Greeks, and model-based
probability of profit — then produces a manual-entry order checklist.
**Not affiliated with or endorsed by Robinhood. Not investment advice.**

## What it does
- Payoff & risk engine with correct unlimited/undefined-risk detection
- Black-Scholes (European) + CRR binomial (American, early exercise) + Greeks
- Seeded Monte Carlo probability of profit/loss, expected value, percentiles,
  and a Monte Carlo confidence interval (never a false-precision number)
- 15 same-expiration strategy templates; naked shorts blocked in companion mode
- Provider-independent market data (demo + manual + pluggable licensed feed)
- Trade journal with write-once forecast snapshots and probability calibration
- Copyable / printable Robinhood order checklist (no auto-trading)
- **Evolve Lab** (`/evolve`) — synthetic scientific-method self-improve tool
  (workspace-0890ad1c); not live signals; no auto-trade

## Install from GitHub
See **`install.txt`** (clone → `npm install` → `.env.local` → `npm run dev`).  
Live trading ritual: **`GO_LIVE_TRADING.txt`**.

## Quick start
```bash
npm install
cp .env.example .env.local     # demo mode works with no keys
npm run dev
```
Open http://localhost:3000. Demo mode needs no account. Sign-in is required
only to save to the journal.

## Testing
```bash
npm test        # unit tests for every strategy + lifecycle + Monte Carlo seed
npm run typecheck
```
All acceptance fixtures from the spec pass, including the 500/510 bull call
spread (net debit $310, max profit $690, break-even $503.10), the covered call
($97.50 BE, $9,750 max loss, $107.50 crossover), the iron condor (two BEs), the
wheel campaign (+$450), and the rolling ledger (+$300 cumulative, not +$450).

## Connect a licensed market-data provider
1. Set env (server-only — never NEXT_PUBLIC_):
   ```
   MARKET_DATA_PROVIDER=polygon
   MARKET_DATA_API_KEY=your_key
   MARKET_DATA_BASE_URL=https://api.polygon.io
   ```
2. Implement/verify the adapter in `src/data/providers/`. It must satisfy the
   `MarketDataProvider` interface. Field mappings in `polygon.ts` are a
   template — confirm them against your licensed contract.
3. The engine and UI never change. If the key is missing, the app falls back to
   clearly labeled demo data (see `providerStatus()`).

Never expose a market-data secret in client code. `src/data/serverProvider.ts`
imports `server-only` so a client import fails the build.

## Database (Supabase)
Run `db/schema.sql` in the Supabase SQL editor. It enables Row-Level Security
on every user-owned table, auto-creates a profile on signup, and stores the
roll/wheel ledger in `cash_events`. The forecast snapshot column is write-once
so calibration compares the original prediction against the real outcome.

## Architecture
```
src/domain/   pure calculation engine (no React, fully unit-tested)
src/data/     provider-independent market data + server routes
src/db/       schema types, Supabase clients, journal repo, calibration
src/workers/  Monte Carlo Web Worker (keeps the UI responsive)
src/app/      Next.js routes + API handlers
src/components/ UI
tests/        unit + integration
```

## Methodology
See `docs/methodology.md`: payoff derivation, break-even root-finding
(interval scan + bisection), unlimited-risk detection via tail slopes,
valuation model selection, GBM Monte Carlo, and calibration with Wilson
intervals. Probabilities are model estimates under stated assumptions, not
guarantees. Delta is reported as a sensitivity, never as probability of profit.

## License / disclaimer
For education and analysis only. No warranty. The authors are not liable for
trading losses. Verify every order in Robinhood before entering it.
