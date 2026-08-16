# NCI — install today's build

Everything below drops into your existing `opiontrading` repo. Nothing is
replaced except `Dashboard.tsx` (one import + one tab added).

## 1. Copy the files in

Unzip this next to your repo, then from inside the repo folder:

```bash
cp -r ../nci-build-2026-08-16/runner ./
cp ../nci-build-2026-08-16/src/components/CommandBoard.tsx src/components/
cp "../nci-build-2026-08-16/src/app/(app)/Dashboard.tsx" "src/app/(app)/"
```

On Windows, just drag the `runner` folder into the repo root and drop the two
`src` files into their matching folders.

## 2. Install the one new dependency

```bash
npm install -D tsx
```

## 3. Add the runner scripts

Open `package.json` and add these inside `"scripts"`:

```json
"runner:london":    "tsx runner/daily.ts london",
"runner:premarket": "tsx runner/daily.ts premarket",
"runner:open":      "tsx runner/daily.ts open",
"runner:review":    "tsx runner/daily.ts review",
"runner:advance":   "tsx runner/daily.ts advance",
"runner:status":    "tsx runner/daily.ts status"
```

Add `.nci-runner/` to your `.gitignore` — that folder is your live trade
history and does not belong in git.

## 4. See the Command Board

```bash
npm run dev
```

Open **http://localhost:3000/dashboard**. The **Board** tab is now the default
view — the five whiteboard cards, live.

Things to actually try:
- Click **Bearish** under Chart Trends. Watch the strategy list re-rank.
- Toggle **Companion mode** off. Sell Put and Sell Call stop being GATED.
- Drag the **Delta** slider to 0.30 and read what it says about that zone.
- In **Pair → Pare**, set contracts to 4 and premium to 2.50, then change
  contracts to 2 and watch the capital-recovery warning flip.

## 5. Run the trading loop

```bash
npm run runner:status      # baseline — $300, zero trades
npm run runner:premarket   # today's 3 candidates
npm run runner:open        # place them (paper)
npm run runner:advance     # let the simulated day play out
npm run runner:review      # close, score, log
npm run runner:status      # see what it did to expectancy
```

Repeat steps 3–6 to build a sample. To fast-forward a month:

```bash
for i in $(seq 1 20); do
  npm run runner:open && npm run runner:advance && npm run runner:review
done
npm run runner:status
```

Windows PowerShell:

```powershell
1..20 | ForEach-Object {
  npm run runner:open; npm run runner:advance; npm run runner:review
}
npm run runner:status
```

## 6. Read your own history

```
.nci-runner/journal.jsonl   every trade AND every rejection, with reasons
.nci-runner/lessons.md      what each session concluded
.nci-runner/state.json      equity, open positions, rolling stats
```

The journal is append-only. It will tell you the truth even when the truth is
that the strategy isn't working yet — which is the entire point.

## What the numbers mean

- **Expectancy** — average dollars per trade. The only number that matters.
  Positive means the system makes money over a large sample. Negative means it
  leaks, no matter how good last week looked.
- **Profit factor** — gross wins / gross losses. Above 1.0 to survive.
- **Max drawdown** — worst peak-to-trough. This is the number that decides
  whether you can actually stay in the seat.
- **Forecast accuracy** — how often the written thesis was right. Separates
  "the trade worked" from "the reasoning was right."

Current state after the fixes: **93 trades, −$1.08 expectancy, 35% drawdown.**
That is the strategy failing against a random walk with realistic costs. The
harness is working correctly; the strategy needs work. Those are different
problems and it matters which one you're solving.
