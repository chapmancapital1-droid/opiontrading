/**
 * POST /api/brain/explain
 * Grounded educational explanation for a brain recommendation.
 * Body: { decision, context, scored, strategyId? }
 * Optional: set AI_EXPLAIN_MODE=llm later; default is catalog-grounded local.
 */

import { NextResponse } from "next/server";
import { explainStrategy, explanationToMarkdown } from "@/brain/explain";
import type { BrainDecision } from "@/brain/types";
import type { MarketContext } from "@/lib/marketContext";
import type { ScoredRecommendation } from "@/brain/engineScore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const decision = body?.decision as BrainDecision | undefined;
    const context = body?.context as MarketContext | undefined;
    const scored = (body?.scored ?? []) as ScoredRecommendation[];
    const strategyId = typeof body?.strategyId === "string" ? body.strategyId : undefined;

    if (!decision || !context) {
      return NextResponse.json(
        { ok: false, error: "decision and context are required" },
        { status: 400 }
      );
    }

    const explanation = explainStrategy({ decision, context, scored, strategyId });
    const markdown = explanationToMarkdown(explanation);

    return NextResponse.json({
      ok: true,
      mode: "catalog_grounded",
      explanation,
      markdown,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "explain failed" },
      { status: 500 }
    );
  }
}
