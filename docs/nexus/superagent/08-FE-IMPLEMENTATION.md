# 08 — Frontend Implementation (Week 1)

| Field | Value |
|-------|--------|
| **Agent** | `engineering-frontend-developer` |
| **Date** | 2026-07-15 |
| **Branch** | `claude/openbb-data-news-integration` |
| **Handoff** | B — W1-F01 → W1-F04 |

## Cards completed

| Card | Status | Notes |
|------|--------|-------|
| **W1-F01** Checklist climax + journal `checklistText` | **Done** | Save path stores `checklistToText(checklist)`; `plannedContracts` from brain size; `#order-checklist` anchor; apply `suggestedContracts` to leg qty when ≥1; size-0 badge on card |
| **W1-F02** Seed presets $500 / $1k / $5k | **Done** | Settings capital chips set `manualEquity` + `manualCash`; live empire phase / risk / growth mode |
| **W1-F03** RH paste/import polish | **Done** | Doctrine banner (never password); CSV file picker (500KB); summary · errors · hints · row count · importedAt; shares via `rowsToSharesHeld`; source selector kept |
| **W1-F04** Command ritual honesty | **Done** | Manual seed / Alpaca paper / Broker paste; seed badge; focus+storage refresh; no LIVE badge; no fake day P/L; gate pulse; CTAs Lab · Journal · Seed |
| **zeroSizeCoach** always when contracts=0 | **Done** | Rec cards + applied panel; prefer brain-attached coach when present |

## Files touched

| File | Change |
|------|--------|
| `src/app/(app)/OptionScopeBuilder.tsx` | `checklistToText` on save; `suggestedContracts` state; scale legs; `#order-checklist` |
| `src/lib/orderChecklist.ts` | Optional `contracts` override (incl. 0) |
| `src/components/OrderChecklistCard.tsx` | Climax CTA copy; SIZE 0 badge; manual RH only |
| `src/components/BrainRecommendPanel.tsx` | Always coach at size 0; jump to checklist; applied coach |
| `src/app/(app)/settings/page.tsx` | Presets + RH surface + CSV picker + shares preview |
| `src/lib/rhImport.ts` | `rowsToSharesHeld` / `estimateOpenRiskProxy` (aligns with BE B04) |
| `src/components/CommandRitual.tsx` | Honesty pass: seed badge, refresh, paper feed, gate pulse |
| `src/app/(app)/journal/page.tsx` | Show stored `checklistText` on entries |
| `tests/lib/rhImport.test.ts` | Shares map + risk proxy cases |
| `docs/nexus/superagent/08-FE-IMPLEMENTATION.md` | This note |

## Smoke path (manual)

1. **Settings** → chip **$500** → Save capital profile  
2. **Command** → equity ~$500 · Seed mode badge · Refresh  
3. **Trade Lab** → ticker → chain → ✦ Recommend → **Jump to checklist**  
4. Confirm checklist · **Save to journal**  
5. **Journal** → planned entry shows checklist details  
6. **Settings** → paste/CSV RH export → rows + process hints (+ shares if stock-like)

## Constraints honored

- No auto-trade / Place Order / Execute broker buttons  
- No RH password or 2FA fields  
- Design tokens / AppShell unchanged  
- Capital default narrative: **$500 seed**, never silent $25k personal  

## Blockers on Backend

- **None blocking FE.** B01–B04 appear landed (`resolvePersonalAccountState`, `rowsToSharesHeld` wired into brain).  
- If BE refines share heuristics further, Settings preview will pick them up automatically via shared lib.

## Not done / deferred

- Toast instead of `alert` on journal save (optional, not required)  
- Sticky checklist rail / mobile polish  
- Screenshots for Reality Checker (QA handoff C)

## Commands

```bash
pnpm typecheck
pnpm test
```

---

_Educational companion only — human owns every Robinhood click._
