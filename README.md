# OptionScope

Educational options strategy calculator & Robinhood trading companion.
Analyzes a trade's risk, reward, break-evens, Greeks, and model-based
probability of profit — then produces a manual-entry order checklist.
**Not affiliated with or endorsed by Robinhood. Not investment advice.**

## Run from GitHub (local testing)

**Requirements:** [Git](https://git-scm.com/downloads) + [Node.js 20+](https://nodejs.org/) (includes npm).

```bash
git clone https://github.com/chapmancapital1-droid/opiontrading.git
cd opiontrading
npm run setup          # installs deps + creates .env.local (demo mode)
npm run dev            # http://localhost:3000
```

**Windows (PowerShell) — same flow:**

```powershell
git clone https://github.com/chapmancapital1-droid/opiontrading.git
cd opiontrading
npm run setup
npm run dev
```

Demo mode needs **no API keys**. First browser visit may show a free unlock form (name + email); local journal works without Supabase.

| Goal | Command |
|------|---------|
| Dev server | `npm run dev` → http://localhost:3000 |
| Unit tests | `npm test` |
| Typecheck | `npm run typecheck` |
| Tests + types | `npm run verify` |
| Production build | `npm run build` then `npm start` |

**Deep install guide** (Alpaca paper/live, OpenBB, Supabase journal, troubleshooting): [`install.txt`](./install.txt)  
**Day-of live-data ritual** (still no auto-trade): [`GO_LIVE_TRADING.txt`](./GO_LIVE_TRADING.txt)

### Manual setup (if you skip `npm run setup`)

```bash
npm install
cp .env.example .env.local     # Windows: Copy-Item .env.example .env.local
npm run dev
```

## What it does

- Payoff & risk engine with correct unlimited/undefined-risk detection
- Black-Scholes (European) + CRR binomial (American, early exercise) + Greeks
- Seeded Monte Carlo probability of profit/loss, expected value, percentiles,
  and a Monte Carlo confidence interval (never a false-precision number)
- 15 same-expiration strategy templates; naked shorts blocked in companion mode
- Provider-independent market data (demo + manual + pluggable licensed feed)
- Trade journal with write-once forecast snapshots and probability calibration
- Copyable / printable Robinhood order checklist (no auto-trading)
- **Evolve Lab** (`/evolve`) — synthetic scientific-method self-improve tool;
  not live signals; no auto-trade

## Connect a licensed market-data provider

1. Set env (server-only — never `NEXT_PUBLIC_`):
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

Other providers: **Alpaca** (paper recommended) and **OpenBB** (local REST) —
see `install.txt` and `docs/OPENBB_SETUP.md`.

## Database (Supabase) — optional

Local journal uses the browser (localStorage). No setup required.

For cloud journal + auth: run `db/schema.sql` in the Supabase SQL editor, then set
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` (server only) in `.env.local`.

## Architecture

```
src/domain/   pure calculation engine (no React, fully unit-tested)
src/data/     provider-independent market data + server routes
src/brain/    strategy selector, sizing, explain
src/db/       schema types, Supabase clients, journal repo, calibration
src/workers/  Monte Carlo Web Worker (keeps the UI responsive)
src/app/      Next.js routes + API handlers
src/components/ UI
tests/        unit + integration
```

## Methodology

See `docs/methodology.md` (if present): payoff derivation, break-even root-finding
(interval scan + bisection), unlimited-risk detection via tail slopes,
valuation model selection, GBM Monte Carlo, and calibration with Wilson
intervals. Probabilities are model estimates under stated assumptions, not
guarantees. Delta is reported as a sensitivity, never as probability of profit.

## License / disclaimer

For education and analysis only. No warranty. The authors are not liable for
trading losses. Verify every order in Robinhood (or your broker) before entering it.
The app does **not** place broker orders.
