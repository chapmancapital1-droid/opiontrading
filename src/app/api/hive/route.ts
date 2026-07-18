/**
 * GET /api/hive — public snapshot of hive brain + strategy win rates.
 * Cumulative knowledge from successful Evolve Lab runs (git-tracked files).
 */

import { NextResponse } from "next/server";
import { getHivePublicSnapshot } from "@/knowledge/hiveStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snap = await getHivePublicSnapshot();
    return NextResponse.json({
      ok: true,
      ...snap,
      paths: {
        brain: "src/knowledge/catalog/hive/hive_brain.json",
        winRates: "src/knowledge/catalog/hive/strategy_win_rates.json",
        runs: "src/knowledge/catalog/hive/evolve_runs.jsonl",
      },
      growOnGithub:
        "git add src/knowledge/catalog/hive/ && git commit -m \"hive: evolve successful runs\" && git push",
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}
