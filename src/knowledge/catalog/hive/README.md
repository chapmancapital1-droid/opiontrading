# Hive Brain (Evolve → knowledge)

Git-tracked cumulative knowledge from **successful** OptionScope Evolve Lab runs.

| File | Purpose |
|------|---------|
| `hive_brain.json` | Aggregate strategies, lessons, last champion |
| `strategy_win_rates.json` | Sorted win-rate rollup for dashboards |
| `evolve_runs.jsonl` | Append-only successful run log |

## Success thresholds (ingested only if all pass)

- Win rate ≥ 48%
- Sharpe ≥ 0.15
- Trades ≥ 8
- Statistical edge ≥ 2%
- Max drawdown ≤ 45%

## Grow on GitHub

After Evolve ingests champions:

```bash
git add src/knowledge/catalog/hive/
git commit -m "hive: evolve successful runs"
git push
```

Fresh installs pull the grown hive with the repo.  
**Synthetic lab only** — not live fill probability of profit.
