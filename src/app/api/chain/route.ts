import { NextRequest, NextResponse } from "next/server";
import { getServerProvider, providerStatus } from "@/data/serverProvider";
import { withRetry } from "@/data/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  const expiration = req.nextUrl.searchParams.get("expiration");
  if (!symbol) return NextResponse.json({ error: "symbol required" }, { status: 400 });

  const provider = getServerProvider();

  if (!expiration) {
    const r = await withRetry(() => provider.listExpirations(symbol));
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 502 });
    return NextResponse.json({ expirations: r.data, status: providerStatus() });
  }

  const r = await withRetry(() => provider.getOptionChain(symbol, expiration));
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 502 });
  return NextResponse.json({ chain: r.data, status: providerStatus() });
}
