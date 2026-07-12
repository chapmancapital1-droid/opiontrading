import type { ContractId, ExerciseStyle } from "@/domain/types";

export type Freshness = "realtime" | "delayed" | "manual" | "stale";

export interface QuoteMeta {
  source: string;         // provider id, "demo", or "manual"
  timestamp: string;      // ISO
  freshness: Freshness;
  delayMinutes?: number;
}

export interface UnderlyingQuote {
  symbol: string;
  price: number;
  meta: QuoteMeta;
}

export interface OptionQuote {
  contract: ContractId;
  bid: number | null;
  ask: number | null;
  mark: number | null;
  impliedVol: number | null;   // decimal
  volume: number | null;
  openInterest: number | null;
  exerciseStyle: ExerciseStyle;
  meta: QuoteMeta;
}

export interface OptionChain {
  underlying: string;
  expiration: string;
  quotes: OptionQuote[];
  meta: QuoteMeta;
}

export interface EventData {
  nextEarnings?: string | null;   // ISO date or null
  exDividend?: string | null;
  dividendYield?: number | null;  // decimal
}

export interface ProviderError {
  code: "not_configured" | "not_found" | "rate_limited" | "upstream" | "bad_request";
  message: string;
  retryable: boolean;
}

export type ProviderResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ProviderError };
