/**
 * Alpaca Trading API (paper or live) — server-only.
 * Used for account equity / cash / positions to size the brain.
 * NEVER places orders from OptionScope.
 */

import "server-only";

export interface AlpacaAccountSnapshot {
  id: string;
  accountNumber: string;
  status: string;
  currency: string;
  equity: number;
  cash: number;
  buyingPower: number;
  portfolioValue: number;
  longMarketValue: number;
  shortMarketValue: number;
  daytradeCount: number;
  patternDayTrader: boolean;
  tradingBlocked: boolean;
  /** paper | live inferred from base URL */
  mode: "paper" | "live";
  tradingBase: string;
  asOf: string;
}

export interface AlpacaPositionRow {
  symbol: string;
  qty: number;
  side: "long" | "short";
  marketValue: number;
  unrealizedPl: number;
  avgEntryPrice: number;
  currentPrice: number;
  assetClass: string;
}

export interface LiveBrokerSnapshot {
  ok: true;
  source: "alpaca";
  account: AlpacaAccountSnapshot;
  positions: AlpacaPositionRow[];
  /** Shares held (long stock only) for covered-call eligibility */
  sharesHeld: Record<string, number>;
  openOptionContracts: number;
  /** Rough open risk proxy: sum of abs market value of option positions */
  openOptionsMarketValue: number;
}

export interface LiveBrokerError {
  ok: false;
  source: "alpaca" | "none";
  error: string;
  configured: boolean;
}

function credentials(): {
  keyId: string;
  secret: string;
  tradingBase: string;
  mode: "paper" | "live";
} | null {
  const keyId = process.env.ALPACA_API_KEY_ID ?? process.env.MARKET_DATA_API_KEY ?? "";
  const secret = process.env.ALPACA_API_SECRET_KEY ?? process.env.ALPACA_SECRET_KEY ?? "";
  if (!keyId || !secret) return null;
  const tradingBase = (
    process.env.ALPACA_TRADING_BASE_URL ?? "https://paper-api.alpaca.markets"
  ).replace(/\/$/, "");
  const mode: "paper" | "live" = /paper-api/i.test(tradingBase) ? "paper" : "live";
  return { keyId, secret, tradingBase, mode };
}

export function isAlpacaTradingConfigured(): boolean {
  return credentials() != null;
}

async function alpacaGet<T>(path: string): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const creds = credentials();
  if (!creds) return { ok: false, error: "Alpaca keys not configured" };
  try {
    const url = `${creds.tradingBase}${path.startsWith("/") ? path : `/${path}`}`;
    const res = await fetch(url, {
      headers: {
        "APCA-API-KEY-ID": creds.keyId,
        "APCA-API-SECRET-KEY": creds.secret,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        error: `Alpaca HTTP ${res.status}${body ? `: ${body.slice(0, 180)}` : ""}`,
      };
    }
    return { ok: true, data: (await res.json()) as T };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Fetch paper/live account + positions for brain sizing.
 * Sanitized — no API keys in the result.
 */
export async function fetchLiveBrokerSnapshot(): Promise<LiveBrokerSnapshot | LiveBrokerError> {
  const creds = credentials();
  if (!creds) {
    return {
      ok: false,
      source: "none",
      configured: false,
      error: "Set ALPACA_API_KEY_ID and ALPACA_API_SECRET_KEY in .env.local",
    };
  }

  const [acctRes, posRes] = await Promise.all([
    alpacaGet<Record<string, unknown>>("/v2/account"),
    alpacaGet<unknown[]>("/v2/positions"),
  ]);

  if (!acctRes.ok) {
    return { ok: false, source: "alpaca", configured: true, error: acctRes.error };
  }

  const a = acctRes.data;
  const positions: AlpacaPositionRow[] = [];
  const sharesHeld: Record<string, number> = {};
  let openOptionContracts = 0;
  let openOptionsMarketValue = 0;

  if (posRes.ok && Array.isArray(posRes.data)) {
    for (const raw of posRes.data) {
      if (!raw || typeof raw !== "object") continue;
      const p = raw as Record<string, unknown>;
      const symbol = String(p.symbol ?? "").toUpperCase();
      if (!symbol) continue;
      const qty = Math.abs(num(p.qty));
      const side = String(p.side ?? "long").toLowerCase() === "short" ? "short" : "long";
      const assetClass = String(p.asset_class ?? "us_equity");
      const marketValue = num(p.market_value);
      const row: AlpacaPositionRow = {
        symbol,
        qty,
        side,
        marketValue,
        unrealizedPl: num(p.unrealized_pl),
        avgEntryPrice: num(p.avg_entry_price),
        currentPrice: num(p.current_price),
        assetClass,
      };
      positions.push(row);

      // Equity shares for covered-call eligibility
      if ((assetClass === "us_equity" || assetClass === "equity") && side === "long") {
        sharesHeld[symbol] = (sharesHeld[symbol] ?? 0) + qty;
      }
      // Option contracts (Alpaca may use us_option)
      if (assetClass.includes("option") || /\d{6}[CP]\d{8}$/.test(symbol)) {
        openOptionContracts += qty;
        openOptionsMarketValue += Math.abs(marketValue);
      }
    }
  }

  const equity = num(a.equity);
  const cash = num(a.cash);
  const account: AlpacaAccountSnapshot = {
    id: String(a.id ?? ""),
    accountNumber: String(a.account_number ?? ""),
    status: String(a.status ?? "UNKNOWN"),
    currency: String(a.currency ?? "USD"),
    equity,
    cash,
    buyingPower: num(a.buying_power),
    portfolioValue: num(a.portfolio_value, equity),
    longMarketValue: num(a.long_market_value),
    shortMarketValue: num(a.short_market_value),
    daytradeCount: num(a.daytrade_count),
    patternDayTrader: Boolean(a.pattern_day_trader),
    tradingBlocked: Boolean(a.trading_blocked),
    mode: creds.mode,
    tradingBase: creds.tradingBase,
    asOf: new Date().toISOString(),
  };

  return {
    ok: true,
    source: "alpaca",
    account,
    positions,
    sharesHeld,
    openOptionContracts,
    openOptionsMarketValue,
  };
}
