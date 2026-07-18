# How to Use the NCI Complete Trading Assistant (TradingView)
**For: Michael Chapman | GangsterNerds LLC | Backtest-validated settings v2 — 2026-07-01**

## What the backtests proved (read this first)
Three tests on 13 months of real GBPUSD data (401k bars, Dukascopy):
- The indicator's **auto-entry signals alone do NOT have a proven money-making edge**. Default settings: 32% WR, ~breakeven. Tuned settings looked great in-sample (77% WR) but only 55.6% WR and −$4 on the 5 months of data the tuning never saw.
- What it IS good at: telling you the **bias direction and when NOT to trade**. Losing months were mixed/contraction regimes; winning months were clean trends. The dashboard identifies those regimes in real time.
- **Use it as your co-pilot, not your autopilot.** You read price action; the panel confirms or vetoes.

## Setup (5 minutes)
1. TradingView → Pine Editor → paste `NCI_Bias_Strategy.pine` → Save → Add to chart.
2. Chart: **GBPUSD, M5 timeframe**.
3. Settings — use the backtest-validated v2 values:
   - ARM = 18, **FIRE = 22** (only 1 dissenting SuperBias signal)
   - Companion gate = **6** (of 7)
   - Session: ON — but only trade **13:00–17:00 UTC (NY morning)**; that was the only consistently profitable window
   - Exit mode: FIXED
4. Set alerts: right-click chart → Add Alert → condition "NCI ◆ FIRE BUY / FIRE SELL".

## Reading the dashboard (top to bottom)
| Section | What it tells you | Green light |
|---|---|---|
| MASTER header | Combined verdict of all 5 layers | BULL/BEAR ≥ 50% |
| TIMEFRAME TREND | M1→D1 arrows | 5+ of 6 same color |
| SUPERBIAS 24 | The trigger engine | bear count ≤ 2 (buy) |
| PORTS / VOTERS | SuperBrain strategy consensus | clear majority, not split |
| COMPANION v1 | HTF alignment + momentum | 6+/7 same side |
| TRIGGER STATE | ARM/FIRE machine | ○ ARMED → wait for ◆ |
| MARKET PHASE | ABC stage | B EXPANSION only |
| HARD GATES | ADX/FER/Kinetic/Session | ALL GATES ✓ PASS |

## The trade routine
1. **Only look at the chart 13:00–17:00 UTC.** Outside that window the stats say don't bother.
2. Wait for background shading (ARMED) or the arm alert. Do nothing before that.
3. When ◆ FIRE arrow prints AND "ALL GATES ✓ PASS" is green AND Master ≥ 50%:
   - **You** check price action: no immediate S/R wall, no news in next 30 min, candle structure agrees.
   - If yes → enter at next M5 open.
4. Orders: **SL 25 pips, TP 12 pips** (the tested exit — high win rate, controlled loss). 0.01 lots per $1000.
5. Hard rules: max 2 trades/day, stop for the day after 2 losses, never widen a stop.
6. **Skip entirely when:** ABC shows C CONTRACTION, gates show ✗, timeframe row is mixed colors, or it's Friday after 15:00 UTC.

## What the numbers looked like (be realistic)
At 0.01 lots per $1000: best honest expectation is single-digit dollars/month with ~$9 drawdowns. The path to real money is (a) confirming edge forward on demo, then (b) scaling lots — not the reverse. Log every manual trade so we can compare your judgment+indicator vs. indicator-alone (indicator-alone data is in `strategy/backtest/results_test3_trades.csv`).

## Kept data / rerun commands
- `strategy/backtest/data/GBPUSD_M1.csv` — 13 months M1
- `strategy/backtest/nci_backtest.py` — full logic replica; rerun: `python nci_backtest.py --start 2025-07-01 --end 2026-07-01 --cfg cfg_v2.json`
- Results: `results_test1_5mo.json`, `results_test2_1yr.json`, `results_test3_trades.csv`

## Level 2 Grid (added 2026-07-01, from NCI_MasterDashboard.mq4)
The indicator now plots the pivot ladder (PP, R1–R3, S1–S3), yesterday H/L/C fibs (38.2/50/61.8), and shows a LEVEL 2 GRID panel section: day-range position %, SMA 21/34/233 stack, stoch overbought/oversold, and a "(!) N/15 OPPOSE" warning when 5+ SuperBrain voters disagree with the master bias.

**Backtest verdict on the grid as an auto-filter (honest):** the pivot-side rule changes nothing (FIRE entries were already on the correct side of the pivot). The 8-pip S/R proximity veto trimmed out-of-sample losses slightly (−$4.00 → −$2.70) but cost profit in-sample ($17.50 → $11.60). Net: **marginal — not an edge by itself.** Its real value is visual: you can see when a FIRE signal is printing straight into R1, and skip it yourself.

**Grid rule for manual trading:** don't take a BUY within ~8 pips below the next resistance line (PP/R1/R2), or a SELL within ~8 pips above the next support. Prefer entries in the 45–80% zone of yesterday's range in the trend direction.

## Using it on STOCKS (added 2026-07-01)
The indicator auto-detects the instrument (Market Type → "Auto"). On a stock symbol it switches automatically:
- **Session:** exchange regular hours in the exchange's own timezone (e.g. 9:30–16:00 ET for US stocks) instead of the forex UTC window. Pre/post-market bars are gated out.
- **Exit distances:** ATR-based instead of pips — default stop = 2×ATR(14), trail = 1.5×ATR(14). A $500 stock and a $5 stock get proportionate distances; the panel shows the live dollar values.
- Volume voters actually get **better** on stocks — real share volume instead of forex tick volume.

Stock-specific guidance:
- Best on liquid large caps and ETFs (SPY, QQQ, AAPL-class). Avoid thin small caps — the Donchian/volume ports whipsaw on gappy books.
- **Opening 15 minutes:** the session gate is open but ATR is inflated and levels get run — treat FIRE arrows before ~09:45 ET as lower quality.
- Overnight gaps reset the Level 2 Grid hard: yesterday's pivots may all sit inside the gap. On big gap days trust VWAP (port 8) and the fibs of the *current* day over the pivot ladder.
- The 24-signal SuperBias, Companion, ports, and voters are all price-structure math — they carry over unchanged.
- **SPY backtest (2026-07-01, 13 months real data):** tuned settings, full year = 70 trades, 45.7% win rate, **profit factor 2.28, +$32.69 per share held, max drawdown only $5.85**. Profitable in both the training and the untouched test window — unlike forex, no overfit signature. Honest caveat: buy-and-hold SPY made +$130 the same year; the strategy's advantage is risk-adjusted (return/drawdown ~5.6 vs ~3.7 for holding) and it works short too (11 of 70 trades). It underperforms a raging bull market in absolute dollars — its lane is chop protection and capital efficiency, not beating a straight-up trend. Trades kept in `strategy/backtest/results_spy_trades.csv`.
