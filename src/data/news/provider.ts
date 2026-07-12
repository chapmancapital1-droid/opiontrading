import type { ProviderResult } from "../types";
import type { NewsItem, NewsQuery } from "./types";

export interface NewsProvider {
  readonly id: string;
  /** Company/ticker news when query.symbol is set, else broad market news. */
  getNews(query: NewsQuery): Promise<ProviderResult<NewsItem[]>>;
}
