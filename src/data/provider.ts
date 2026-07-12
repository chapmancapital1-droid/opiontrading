import type {
  UnderlyingQuote, OptionChain, EventData, ProviderResult,
} from "./types";
import type { OptionType } from "@/domain/types";

export interface MarketDataProvider {
  readonly id: string;
  getUnderlyingQuote(symbol: string): Promise<ProviderResult<UnderlyingQuote>>;
  listExpirations(symbol: string): Promise<ProviderResult<string[]>>;
  getOptionChain(symbol: string, expiration: string): Promise<ProviderResult<OptionChain>>;
  getEvents(symbol: string): Promise<ProviderResult<EventData>>;
  /** Optional single-contract quote (some feeds support it directly). */
  getOptionQuote?(
    symbol: string, expiration: string, strike: number, type: OptionType
  ): Promise<ProviderResult<OptionChain>>;
}

/** Small retry helper with exponential backoff for retryable provider errors. */
export async function withRetry<T>(
  fn: () => Promise<ProviderResult<T>>,
  attempts = 3,
  baseDelayMs = 200
): Promise<ProviderResult<T>> {
  let last: ProviderResult<T> | null = null;
  for (let i = 0; i < attempts; i++) {
    last = await fn();
    if (last.ok || !last.error.retryable) return last;
    await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** i));
  }
  return last!;
}
