# OpenBB integration — live market data + news

OptionScope reads live options chains, quotes, and news through
[OpenBB](https://github.com/OpenBB-finance/OpenBB), which normalizes 30+ data
providers (CBOE, Polygon, Tradier, FMP, Intrinio, Benzinga, Tiingo, …) behind a
single REST API. You run OpenBB; OptionScope talks to it. Your provider API keys
live in OpenBB's own config, never in the OptionScope app.

## Why OpenBB

- **Options chains _and_ news in one place** — the only open-source layer that
  covers both, so OptionScope gets its two live inputs from one dependency.
- **Provider-agnostic** — swap CBOE → Polygon → Tradier by changing one env var,
  no code change (OptionScope already isolates data behind `MarketDataProvider`).
- **AI-agent ready** — OpenBB also ships an MCP server, so the same data is
  reachable by the `options-trading-analyst` agent later.

## 1. Run the OpenBB REST server

```bash
pip install openbb
uvicorn openbb_core.api.rest_api:app --host 0.0.0.0 --port 8000
# REST now at http://localhost:8000  (docs at /docs)
```

## 2. Add provider API keys to OpenBB (not to OptionScope)

Free to start: **CBOE** needs no key for delayed options chains. For news, add a
key for a news provider (Benzinga, Tiingo, FMP, …) in OpenBB:

```python
from openbb import obb
obb.account.login(pat="...")                     # optional OpenBB Hub login, or:
# edit ~/.openbb_platform/user_settings.json:
# { "credentials": { "benzinga_api_key": "...", "polygon_api_key": "..." } }
```

Quick check:

```bash
curl "http://localhost:8000/api/v1/derivatives/options/chains?symbol=AAPL&provider=cboe" | head
curl "http://localhost:8000/api/v1/news/company?symbol=AAPL&provider=benzinga&limit=5" | head
```

## 3. Point OptionScope at OpenBB

Copy `.env.example` → `.env.local` and set:

```
MARKET_DATA_PROVIDER=openbb
OPENBB_BASE_URL=http://localhost:8000
OPENBB_API_PROVIDER=cboe
OPENBB_DELAY_MINUTES=15
NEWS_PROVIDER=openbb
NEWS_API_PROVIDER=benzinga
```

## 4. Wire the code

`optionscope-openbb-integration.ts` follows the repo's bundled
`===== FILE: path =====` convention. Split each section to its path:

| Section | Destination |
|---|---|
| `OpenBBProvider` | `src/data/providers/openbb.ts` |
| News `types` / `provider` / `providers/openbb` / `serverNews` / `client` | `src/data/news/…` |
| `src/app/api/news/route.ts` | uncomment into a Next.js route |
| **PATCH** block | add the `case "openbb"` to `src/data/serverProvider.ts` |

The `OpenBBProvider` implements the **same `MarketDataProvider` interface** as
`DemoProvider`/`PolygonProvider`, so the payoff / Greeks / Monte-Carlo engine and
the UI need **zero changes** — selecting `MARKET_DATA_PROVIDER=openbb` is enough.

## Freshness & honesty

OpenBB/CBOE data is typically ~15 minutes delayed unless your downstream
entitlement is real-time. The provider labels every quote `delayed` with
`delayMinutes`, and the UI surfaces it — OptionScope never claims real-time data
it does not have. This matches the product spec's data-transparency rule.

## Data source, not advice

This wiring supplies market data and headlines only. OptionScope remains an
educational analysis tool — all probabilities are model-based estimates, not
guarantees or personalized investment recommendations.
