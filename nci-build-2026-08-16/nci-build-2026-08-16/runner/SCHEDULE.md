# NCI Daily Runner — schedule

All times **America/New_York**. Set your crontab's timezone or use `TZ=` per line.

```cron
# NERDCOMMAND NCI Runner
CRON_TZ=America/New_York

# 03:05  London overlap — 30m charts, bullish bias, SCAN + STAGE ONLY
 5  3 * * 1-5  cd /path/to/opiontrading && npx tsx runner/daily.ts london   >> .nci-runner/cron.log 2>&1

# 08:05  Pre-market — screen down to 3 candidates for the open
 5  8 * * 1-5  cd /path/to/opiontrading && npx tsx runner/daily.ts premarket >> .nci-runner/cron.log 2>&1

# 09:35  US open — execute (5 min after the bell; the open is noise)
35  9 * * 1-5  cd /path/to/opiontrading && npx tsx runner/daily.ts open      >> .nci-runner/cron.log 2>&1

# 15:50  Close intraday, score forecasts, write lessons
50 15 * * 1-5  cd /path/to/opiontrading && npx tsx runner/daily.ts review    >> .nci-runner/cron.log 2>&1
```

Install: `crontab -e`, paste, save. Check with `crontab -l`.

On Windows, use Task Scheduler with the same four times and
`npx tsx runner/daily.ts <session>` as the action.

---

## Why the London session does not place orders

You asked for 3am–6am ET on the 30-minute chart with a bullish bias. The scan
runs exactly then. Execution does not, and here's the honest reason:

That window is the London session for **forex**, where it earns its reputation.
For **US equities on Robinhood** it is pre-market — a thin, fragmented book with
spreads several times wider than regular hours. On a $300 account buying ~14
shares, a spread that wide can eat a meaningful share of the move before the
trade has done anything.

Robinhood's MCP also only exposes equities and long options. It cannot trade
forex at all. If forex is what you actually want for that window, it needs a
different broker and a separate integration — say the word and I'll scope it.

So: the 3am pass finds the setups and stages them. The 9:35 pass trades them
into real liquidity. You get the London read without paying the pre-market
spread. If you want to override this, `sessions.london.allowExecution` in
`runner/config.ts` is the switch — but change it knowing what it costs.

---

## Modes

Paper is the default and requires nothing. Live needs **two** keys:

1. `NCI_RUNNER_MODE=live` in the environment
2. A file at `.nci-runner/LIVE_ARMED`

Either one alone keeps the runner in paper. This is deliberate — an env var
left over from a test cannot arm real money on its own.

`npx tsx runner/daily.ts status` prints the live-readiness gate: 100 closed
trades, positive expectancy, drawdown under 20%. Until those pass, it tells you
no and says why.

---

## The risk rules, in one place

Every number lives in `runner/config.ts`. Nothing else hardcodes risk.

| Rule | Value | Why |
|---|---|---|
| Risk per trade | $15 | Fixed dollar, ~20 losses before ruin. Percentage sizing at $300 produces units the spread eats. |
| Max concurrent | 2 | Two $15 risks is 10% of the account exposed at once. |
| Daily loss halt | $30 | Two full losers ends the day. |
| Weekly loss halt | $60 | Four full losers ends the week. |
| Equity floor | $200 | Stop and reassess. This is not a signal to add money. |
| Stop loss | Always | ATR-based, capped at 5%. No stopless entries, ever. |
| Min reward:risk | 1.5:1 | Below this the required win rate stops being realistic. |
| Max spread | 0.6% | Wider than this and the spread is a large share of the target. |
| Earnings blackout | 2 days | Gaps jump straight through stops. |

Gates fail **closed**. Bad data, a missing price, an unparseable quote — all of
it blocks the trade. The runner may lose money by being wrong about the market.
It may never lose money by being confused about its own state.

---

## Files it writes

```
.nci-runner/
  state.json      current equity, open positions, rolling stats
  journal.jsonl   append-only. Every trade AND every rejection, with reasons.
  lessons.md      what each session concluded, newest last
  LIVE_ARMED      presence = half the live key
```

`journal.jsonl` is append-only on purpose. A trade log you can quietly edit is
a trade log that will eventually flatter you.

Every trade stores its `forecast` — thesis, target, stop, probability — written
**before** the outcome is known, then scored at close. That's what makes the
system able to improve: you can measure whether the reasoning was right, not
just whether the trade was lucky.
