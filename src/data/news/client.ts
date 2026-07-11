import type { NewsItem } from "./types";

export async function fetchNews(symbol?: string, limit = 20): Promise<{ items: NewsItem[]; disabled?: boolean }> {
  const qs = new URLSearchParams({ limit: String(limit) });
  if (symbol) qs.set("symbol", symbol);
  const res = await fetch(`/api/news?${qs.toString()}`);
  if (!res.ok) throw new Error(`news ${res.status}`);
  return res.json();
}
