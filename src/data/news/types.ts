export interface NewsItem {
  id: string;
  title: string;
  url: string | null;
  source: string;              // publisher/site, e.g. "Benzinga"
  provider: string;            // upstream id, e.g. "openbb"
  published: string;           // ISO timestamp
  symbols: string[];           // tickers referenced
  summary: string | null;
  sentiment: number | null;    // optional, -1..1 when provided
}

export interface NewsQuery {
  symbol?: string;             // omit for broad market/world news
  limit?: number;
}
