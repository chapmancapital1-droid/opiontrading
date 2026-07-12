import { NextRequest, NextResponse } from "next/server";
import { getServerProvider, providerStatus } from "@/data/serverProvider";
import { withRetry } from "@/data/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  const provider = getServerProvider();
  const r = await withRetry(() => provider.getUnderlyingQuote(symbol));
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.error.code === "not_found" ? 404 : 502 });
  return NextResponse.json({ quote: r.data, status: providerStatus() });
}
