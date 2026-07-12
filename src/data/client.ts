import type { UnderlyingQuote, OptionChain, EventData } from "./types";

export interface StatusInfo { id: string; usingDemoFallback: boolean }

async function j<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error((await res.json())?.error?.message ?? `HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export const dataClient = {
  quote: (symbol: string) =>
    j<{ quote: UnderlyingQuote; status: StatusInfo }>(`/api/quote?symbol=${encodeURIComponent(symbol)}`),
  expirations: (symbol: string) =>
    j<{ expirations: string[]; status: StatusInfo }>(`/api/chain?symbol=${encodeURIComponent(symbol)}`),
  chain: (symbol: string, expiration: string) =>
    j<{ chain: OptionChain; status: StatusInfo }>(
      `/api/chain?symbol=${encodeURIComponent(symbol)}&expiration=${encodeURIComponent(expiration)}`
    ),
  events: (symbol: string) =>
    j<{ events: EventData }>(`/api/events?symbol=${encodeURIComponent(symbol)}`),
};

/** Manual-entry quote builder — always labeled "manual" freshness. */
export function manualUnderlyingQuote(symbol: string, price: number): UnderlyingQuote {
  return {
    symbol: symbol.toUpperCase(), price,
    meta: { source: "manual", timestamp: new Date().toISOString(), freshness: "manual" },
  };
}
