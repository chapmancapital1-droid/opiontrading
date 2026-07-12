import "server-only";
import type { NewsProvider } from "../provider";
import type { NewsItem, NewsQuery } from "../types";
import type { ProviderResult } from "../../types";

export class OpenBBNewsProvider implements NewsProvider {
  readonly id = "openbb";
  private readonly base: string;
  private readonly provider: string;

  constructor(opts?: { baseUrl?: string; provider?: string }) {
    this.base = (opts?.baseUrl ?? process.env.OPENBB_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");
    this.provider = opts?.provider ?? process.env.NEWS_API_PROVIDER ?? "benzinga";
  }

  async getNews(query: NewsQuery): Promise<ProviderResult<NewsItem[]>> {
    const limit = String(query.limit ?? 20);
    const path = query.symbol ? "/news/company" : "/news/world";
    const params = new URLSearchParams({ provider: this.provider, limit });
    if (query.symbol) params.set("symbol", query.symbol);
    const url = `${this.base}/api/v1${path}?${params.toString()}`;

    let res: Response;
    try {
      res = await fetch(url, { cache: "no-store" });
    } catch (e) {
      return { ok: false, error: { code: "upstream", message: `OpenBB news unreachable: ${(e as Error).message}`, retryable: true } };
    }
    if (res.status === 429) return { ok: false, error: { code: "rate_limited", message: "OpenBB news rate limited", retryable: true } };
    if (!res.ok) return { ok: false, error: { code: "upstream", message: `OpenBB news ${res.status}`, retryable: res.status >= 500 } };

    let body: unknown;
    try { body = await res.json(); } catch { return { ok: false, error: { code: "upstream", message: "OpenBB news non-JSON", retryable: true } }; }
    const rows = (body as { results?: unknown }).results;
    if (!Array.isArray(rows)) return { ok: false, error: { code: "upstream", message: "OpenBB news missing results[]", retryable: false } };

    const items: NewsItem[] = rows.map((raw, i) => {
      const row = raw as Record<string, unknown>;
      const pick = (...keys: string[]): string | null => {
        for (const k of keys) { const v = row[k]; if (typeof v === "string" && v.trim() !== "") return v; }
        return null;
      };
      const symbolsRaw = row["symbols"];
      const symbols =
        Array.isArray(symbolsRaw) ? symbolsRaw.map(String)
        : typeof symbolsRaw === "string" ? symbolsRaw.split(",").map((s) => s.trim()).filter(Boolean)
        : query.symbol ? [query.symbol.toUpperCase()] : [];
      const sentRaw = row["sentiment"];
      return {
        id: pick("id", "url") ?? `openbb-${i}`,
        title: pick("title", "headline") ?? "(untitled)",
        url: pick("url", "link"),
        source: pick("source", "publisher", "site") ?? "unknown",
        provider: "openbb",
        published: pick("date", "published", "published_at", "created_at") ?? new Date().toISOString(),
        symbols,
        summary: pick("text", "summary", "description"),
        sentiment: typeof sentRaw === "number" ? sentRaw : null,
      };
    });
    return { ok: true, data: items };
  }
}
