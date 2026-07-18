/**
 * Server-only persistence for Hive Brain knowledge files.
 * Paths are git-tracked under src/knowledge/catalog/hive/
 */

import "server-only";
import { promises as fs } from "fs";
import path from "path";
import {
  applyRejected,
  emptyHiveBrain,
  evaluateHiveSuccess,
  mergeSuccessfulRun,
  strategyWinRatesExport,
  type HiveBrainDoc,
  type HiveChampionMetrics,
  type IngestResult,
} from "./hiveBrain";

const HIVE_DIR = path.join(process.cwd(), "src", "knowledge", "catalog", "hive");
const BRAIN_FILE = path.join(HIVE_DIR, "hive_brain.json");
const RATES_FILE = path.join(HIVE_DIR, "strategy_win_rates.json");
const RUNS_FILE = path.join(HIVE_DIR, "evolve_runs.jsonl");
const README_FILE = path.join(HIVE_DIR, "README.md");

async function ensureHiveDir(): Promise<void> {
  await fs.mkdir(HIVE_DIR, { recursive: true });
}

export async function readHiveBrain(): Promise<HiveBrainDoc> {
  try {
    const raw = await fs.readFile(BRAIN_FILE, "utf8");
    const parsed = JSON.parse(raw) as HiveBrainDoc;
    if (!parsed || typeof parsed !== "object") return emptyHiveBrain();
    return {
      ...emptyHiveBrain(),
      ...parsed,
      strategies: parsed.strategies ?? {},
      improvementLessons: parsed.improvementLessons ?? [],
    };
  } catch {
    return emptyHiveBrain();
  }
}

async function writeJson(file: string, data: unknown): Promise<void> {
  await ensureHiveDir();
  await fs.writeFile(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

async function appendRunLine(line: string): Promise<void> {
  await ensureHiveDir();
  await fs.appendFile(RUNS_FILE, line.endsWith("\n") ? line : line + "\n", "utf8");
}

async function ensureReadme(): Promise<void> {
  try {
    await fs.access(README_FILE);
  } catch {
    await fs.writeFile(
      README_FILE,
      `# Hive Brain (Evolve → knowledge)

Git-tracked cumulative knowledge from **successful** OptionScope Evolve Lab runs.

| File | Purpose |
|------|---------|
| \`hive_brain.json\` | Aggregate strategies, lessons, last champion |
| \`strategy_win_rates.json\` | Sorted win-rate rollup for dashboards |
| \`evolve_runs.jsonl\` | Append-only successful run log |

## Grow on GitHub

After Evolve ingests champions on a machine:

\`\`\`bash
git add src/knowledge/catalog/hive/
git commit -m "hive: evolve successful runs"
git push
\`\`\`

Other installs pull the grown hive. Synthetic lab only — not live fill PoP.
`,
      "utf8",
    );
  }
}

/**
 * Evaluate champion metrics; if successful, merge into hive files on disk.
 */
export async function ingestEvolveChampion(
  metrics: HiveChampionMetrics,
): Promise<IngestResult & { brain?: HiveBrainDoc }> {
  await ensureHiveDir();
  await ensureReadme();

  const at = new Date().toISOString();
  const gate = evaluateHiveSuccess(metrics);
  let brain = await readHiveBrain();

  if (!gate.success) {
    brain = applyRejected(brain, at);
    await writeJson(BRAIN_FILE, brain);
    await writeJson(RATES_FILE, strategyWinRatesExport(brain));
    return {
      ok: true,
      ingested: false,
      reason: "Champion did not meet hive success thresholds",
      failures: gate.failures,
      brain,
    };
  }

  const runId = `evo_${at.replace(/[:.]/g, "-")}_${metrics.strategyId}_${metrics.ticker}`;
  const merged = mergeSuccessfulRun(brain, metrics, at, runId);
  await writeJson(BRAIN_FILE, merged.brain);
  await writeJson(RATES_FILE, strategyWinRatesExport(merged.brain));
  await appendRunLine(JSON.stringify(merged.run));

  return {
    ok: true,
    ingested: true,
    runId,
    lessons: merged.lessons,
    strategy: merged.brain.strategies[metrics.strategyId]!,
    reason: "Champion ingested into hive brain + win-rate tracking",
    brain: merged.brain,
  };
}

export async function getHivePublicSnapshot(): Promise<{
  brain: HiveBrainDoc;
  winRates: ReturnType<typeof strategyWinRatesExport>;
  successThresholds: typeof import("./hiveBrain").HIVE_SUCCESS;
}> {
  const { HIVE_SUCCESS } = await import("./hiveBrain");
  const brain = await readHiveBrain();
  return {
    brain,
    winRates: strategyWinRatesExport(brain),
    successThresholds: HIVE_SUCCESS,
  };
}
