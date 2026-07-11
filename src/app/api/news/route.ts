import { NextRequest, NextResponse } from "next/server";
import { getServerNewsProvider } from "@/data/news/serverNews";
import { withRetry } from "@/data/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const provider = getServerNewsProvider();
  if (!provider) return NextResponse.json({ items: [], disabled: true });

  const symbol = req.nextUrl.searchParams.get("symbol") ?? undefined;
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 20);
  const r = await withRetry(() => provider.getNews(symbol ? { symbol, limit } : { limit }));
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.error.code === "rate_limited" ? 429 : 502 });
  return NextResponse.json({ items: r.data, source: provider.id });
}
