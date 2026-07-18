/**
 * SSE evolution lab — self-improving synthetic options backtest.
 * Source: workspace-0890ad1c (scientific-method evolution engine).
 * No DB / no auto-trade — educational Test tab only.
 */

import {
  ALL_STRATEGIES,
  defaultConfig,
  getTickerProfile,
  runEvolution,
  type DTE,
  type EvolutionProgress,
} from "@/testlab/trading";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const strategyId = url.searchParams.get("strategy") || "5dte_iron_condor";
  const dte = parseInt(url.searchParams.get("dte") || "5", 10) as DTE;
  const tickerSymbol = (url.searchParams.get("ticker") || "SPY").toUpperCase();

  const strategy: (typeof ALL_STRATEGIES)[number] =
    ALL_STRATEGIES.find((s) => s.id === strategyId) ?? ALL_STRATEGIES[0]!;
  const ticker = getTickerProfile(tickerSymbol);

  const config = {
    ...defaultConfig(),
    marketYears: Math.min(
      80,
      Math.max(5, parseInt(url.searchParams.get("marketYears") || "40", 10)),
    ),
    evalYears: Math.min(
      30,
      Math.max(3, parseInt(url.searchParams.get("evalYears") || "12", 10)),
    ),
    generations: Math.min(
      20,
      Math.max(2, parseInt(url.searchParams.get("generations") || "8", 10)),
    ),
    populationSize: Math.min(
      16,
      Math.max(4, parseInt(url.searchParams.get("populationSize") || "8", 10)),
    ),
    seed: parseInt(
      url.searchParams.get("seed") || String(Date.now() % 100000),
      10,
    ),
    strategy,
    dte,
    ticker,
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          /* closed */
        }
      };

      send({
        type: "config",
        config: {
          generations: config.generations,
          populationSize: config.populationSize,
          marketYears: config.marketYears,
          evalYears: config.evalYears,
          strategy: strategy.id,
          dte,
          ticker: ticker.symbol,
        },
      });

      try {
        const champion = runEvolution(config, (event: EvolutionProgress) => {
          if (event.type === "market_generated" && event.market) {
            const m = event.market;
            send({
              type: "market_generated",
              data: {
                totalDays: m.totalDays,
                finalPrice: m.finalPrice,
                maxDrawdown: m.maxDrawdown,
                sharpeRatio: m.sharpeRatio,
                annualizedReturn: m.annualizedReturn,
                annualizedVol: m.annualizedVol,
              },
            });
          } else if (event.type === "generation_start") {
            send({
              type: "generation_start",
              generation: event.generation,
              totalGenerations: event.totalGenerations,
            });
          } else if (event.type === "generation_done" && event.result) {
            const bt = event.result.bestIndividual.backtest;
            send({
              type: "generation_done",
              generation: event.generation,
              data: {
                bestFitness: event.result.bestFitness,
                avgFitness: event.result.avgFitness,
                bestSharpe: event.result.bestSharpe,
                avgSharpe: event.result.avgSharpe,
                bestSortino: event.result.bestSortino,
                avgDrawdown: event.result.avgDrawdown,
                diversity: event.result.diversity,
                bestEquity: bt?.equity?.slice(0, 200) ?? [],
                bestIndividual: {
                  id: event.result.bestIndividual.id,
                  sharpe: bt?.sharpeRatio,
                  sortino: bt?.sortinoRatio,
                  maxDD: bt?.maxDrawdown,
                  winRate: bt?.winRate,
                  trades: bt?.totalTrades,
                  totalReturn: bt?.totalReturn,
                  profitFactor: bt?.profitFactor,
                  expectedValue: bt?.expectedValue,
                  statisticalEdge: bt?.statisticalEdge,
                  kellyOptimal: bt?.kellyOptimal,
                  regimeResults: bt?.regimeResults,
                },
              },
            });
          } else if (event.type === "complete") {
            /* handled after runEvolution returns */
          }
        });

        const bt = champion.backtest;
        send({
          type: "complete",
          elapsed: Date.now(),
          champion: {
            genome: champion.genome,
            strategyId: strategy.id,
            dte,
            ticker: ticker.symbol,
            sharpe: bt?.sharpeRatio ?? 0,
            sortino: bt?.sortinoRatio ?? 0,
            maxDD: bt?.maxDrawdown ?? 0,
            winRate: bt?.winRate ?? 0,
            trades: bt?.totalTrades ?? 0,
            totalReturn: bt?.totalReturn ?? 0,
            profitFactor: bt?.profitFactor ?? 0,
            annualizedReturn: bt?.annualizedReturn ?? 0,
            annualizedVol: bt?.annualizedVol ?? 0,
            calmarRatio: bt?.calmarRatio ?? 0,
            expectedValue: bt?.expectedValue ?? 0,
            kellyOptimal: bt?.kellyOptimal ?? 0,
            statisticalEdge: bt?.statisticalEdge ?? 0,
            regimeResults: bt?.regimeResults ?? {},
            equity: bt?.equity?.slice(0, 400) ?? [],
            fitness: champion.fitness,
          },
        });
      } catch (err) {
        send({
          type: "error",
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
