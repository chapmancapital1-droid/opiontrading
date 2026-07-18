# 01 — Orchestrator Plan  
## OptionScope Personal Companion · 30-day money-loop sprint

| Field | Value |
|-------|--------|
| **Lead** | Superagent (`agents-orchestrator`) |
| **Date** | 2026-07-15 |
| **Repo** | `C:\Users\Michael Chapman\opiontrading` |
| **Branch** | `claude/openbb-data-news-integration` |
| **Doctrine** | Capital first · no auto-trade · RH = CSV/paste only · seed micro defined-risk for $500 ladder |
| **Kickoff** | [`00-SUPERAGENT-KICKOFF.md`](./00-SUPERAGENT-KICKOFF.md) |
| **Empire verdict** | [`docs/empire/99-MASTER-EVALUATION.md`](../../empire/99-MASTER-EVALUATION.md) → **NEEDS_WORK** as daily companion |
| **Reality bar** | [`docs/empire/04-reality-check.md`](../../empire/04-reality-check.md) §4 A–D |

---

## 0. Mission (one line)

Close the **money loop** so Michael can size for **his** $500–$5k equity, get a copyable RH checklist, import what he already did, journal forecast→outcome — **human always clicks the broker**.

**Success label:** `SHIP_PERSONAL_MVP` only when Reality Checker §4 A–D is evidence-backed.  
**Not success:** more PDF ingest, LM Studio polish, public SaaS chrome, auto-trade.

---

## 1. Baseline vs branch reality (truth before sequencing)

### Verified baseline (kickoff)

| Check | Result |
|-------|--------|
| `pnpm test` | 130/130 pass |
| `pnpm typecheck` | clean |
| Auto-trade | correctly absent |

### Empire eval gaps (2026-07-12) — critical path

| # | Gap (empire) | Why it kills daily use |
|---|--------------|------------------------|
| G1 | Seed account mode | Brain sizes fantasy equity |
| G2 | Empire / seed policy | CSP/wheel elevated when unaffordable |
| G3 | RH history import | Blind to real book |
| G4 | Journal product UI | No forecast→outcome memory |
| G5 | Checklist not wired in Lab | Execution path is theater |
| G6 | Command Center ritual | No morning capital truth |
| G7 | Zero-size / infeasible UX | Silent 0 contracts |
| G8 | Compare / Saved stubs | Secondary dignity |

### Branch delta (code inventory 2026-07-15) — do **not** rebuild

WIP already landed substantial scaffolding. Orchestrator treats these as **partial complete → harden**, not greenfield:

| Module | Path | Status for MVP |
|--------|------|----------------|
| Seed default | `src/brain/demoAccount.ts` (`DEFAULT_SEED_ACCOUNT` $500, `seedAccount`) | **Logic OK** — enforce UI presets + no silent $25k |
| Personal profile | `src/lib/personalAccount.ts` + Settings | **OK** — one-click $500/$1k/$5k polish remaining |
| Empire policy | `src/knowledge/empirePolicy.ts` + tests | **Logic OK** — wire rank demote + affordability everywhere |
| Zero-size coach | `zeroSizeCoach` in BrainRecommendPanel | **Partial** — ensure Lab + rank list never silent 0 |
| RH paste | `src/lib/rhImport.ts` + Settings paste | **Partial** — no `sharesHeld` → AccountState bridge |
| Checklist wire | `OptionScopeBuilder` + `OrderChecklistCard` | **Mostly wired** — fix journal `checklistText: null` |
| Command ritual | `CommandRitual` on Dashboard | **Partial** — strip + ladder; brain pulse = link not top-3 |
| Local journal | `localJournal` + journal page | **MVP shape OK** — Lab save path + process flags |
| Compare | `compare/page.tsx` uses `compareStrategies` | **Usable** — not a Week-1 blocker |

**Orchestrator rule:** Prefer smallest change that unblocks daily use. Delete nothing that works. No inventing auto-trade.

---

## 2. Phase sequence

```
Phase 0  Inventory gate (this plan + backlog + handoffs)     ── DONE when files land
    │
Phase 1  Capital truth + policy enforcement (Week 1 core)    ── Backend primary
    │
Phase 2  Decision → action loop (checklist + coach)          ── Frontend + Backend
    │
Phase 3  Position awareness (RH import → account)            ── Backend + light FE
    │
Phase 4  Ritual + memory (Command + journal path)            ── Frontend
    │
Phase 5  Evidence QA + Reality Checker retest                ── QA / Gate
    │
Phase 6  Week 2–4 (journal depth, proof, secondary)          ── After SHIP_PERSONAL_MVP candidate
```

Phases 1–4 may parallelize **only** where files do not collide (see §4). Quality gate after each task: tests green + task DoD.

---

## 3. Agent assignments

| Phase | Owner agent | Secondary | Deliverable focus |
|-------|-------------|-----------|-------------------|
| 0 | `agents-orchestrator` | — | Plan, backlog, handoffs |
| 1 | `engineering-backend-architect` | Finance analyst (policy math) | Seed fixtures, empire rank filter, size=0 coach API purity |
| 2 | `engineering-frontend-developer` | Backend | Lab checklist climax, coach banners, journal save text |
| 3 | `engineering-backend-architect` | Security architect (RH path) | RH rows → sharesHeld / open risk proxy; no password UX |
| 4 | `engineering-frontend-developer` | — | Command strip honesty, DEMO/PAPER/LIVE badges, journal ritual polish |
| 5 | `testing-evidence-collector` | `testing-reality-checker` | Screenshots + `SHIP_PERSONAL_MVP` / `NEEDS_WORK` |
| 6 | PM + Frontend + Backend | Reality Checker | Week 2–4 memory/proof (post-MVP candidate) |

**Do not spawn:** marketing, public SaaS, LM Studio productization, TradingAgents/VibeTrading skill theater until money loop ships.

---

## 4. Gap → owner → DoD → test idea (acceptance map)

Every critical empire gap has an owner, definition of done, and a concrete test idea.

### G1 — Seed account mode

| | |
|--|--|
| **Owner** | Backend (sizing source) + Frontend (presets) |
| **Code anchors** | `demoAccount.ts`, `personalAccount.ts`, Settings, `BrainRecommendPanel` account resolve |
| **DoD** | Manual seed $500 is default; Settings can set $500 / $1k / $5k without code edit; brain sizes from personal profile (not silent $25k); DEMO / seed source badge visible when not live broker equity |
| **Test idea** | Unit: `seedAccount(500).equity === 500` and `demoAccount()` without override uses seed defaults. Component/integration smoke: load Settings → set 500 → Lab brain uses equity 500 (assert via panel copy or size math fixture). |
| **Falsifier** | Any path presents $25k as “your” account without loud DEMO badge |

### G2 — Empire / seed policy

| | |
|--|--|
| **Owner** | Backend |
| **Code anchors** | `empirePolicy.ts`, `riskGates.ts`, `portfolio.ts` (`empireRiskCeiling`), `selector.ts` |
| **DoD** | Seed phase blocks CSP as primary; growth never forces `aggressive_growth` at seed; 1-lot max loss > hard ceiling → contracts 0 **and** coach string; preferred list = micro defined-risk verticals |
| **Test idea** | Existing `tests/knowledge/empirePolicy.test.ts` extended: selector/gates at equity=500 reject CSP; at least one feasible debit/credit vertical fixture sizes ≥1 when max loss ≤ ceiling (or honest 0 + coach if fixture still over budget) |
| **Falsifier** | Top rec is CSP/wheel with 0 contracts and no coach |

### G3 — Robinhood import surface

| | |
|--|--|
| **Owner** | Backend + Frontend (Settings already has paste) |
| **Code anchors** | `rhImport.ts`, Settings page, future map to `AccountState.sharesHeld` |
| **DoD** | Official CSV/paste parses ≥1 export shape; stored local; **explicit** “user-provided; not live broker sync”; optional: equity snapshot fields + sharesHeld merge into brain when source=`robinhood_paste`; **never** password/2FA fields |
| **Test idea** | `rhImport.test.ts`: headered CSV + free-text line; reject >500KB; processHints mention password ban. New: `rowsToSharesHeld` (or equivalent) maps stock qty by symbol for gates |
| **Falsifier** | Password input; unofficial RH API; import that does nothing visible |

### G4 — Journal product UI

| | |
|--|--|
| **Owner** | Frontend (local-first already) |
| **Code anchors** | `localJournal.ts`, `journal/page.tsx`, Lab `onSave` |
| **DoD** | Plan from Lab checklist → appears in Journal; mark opened / closed with realized P/L; list last N; stats strip honest |
| **Test idea** | Unit localJournal plan→open→close transitions; manual: Lab Save → Journal shows planned with max loss + strategy |
| **Falsifier** | Journal still “connect Supabase only”; Lab save with empty checklist text forever |

### G5 — Order checklist wired in Trade Lab

| | |
|--|--|
| **Owner** | Frontend |
| **Code anchors** | `orderChecklist.ts`, `OrderChecklistCard.tsx`, `OptionScopeBuilder.tsx` |
| **DoD** | After structure analyzed (not blocked undefined risk), checklist is primary CTA: legs, contracts, net limit, max loss, copy/print; **no** place-order button; Save to journal writes `checklistText` via `checklistToText` |
| **Test idea** | Unit `buildChecklist` shape; manual screenshot Lab with card populated; copy path non-empty |
| **Falsifier** | Checklist orphaned; any auto-submit order control |

### G6 — Command Center ritual (minimum)

| | |
|--|--|
| **Owner** | Frontend |
| **Code anchors** | `CommandRitual.tsx`, `Dashboard.tsx` |
| **DoD** | Morning strip shows: equity (or seed override), capital phase + ladder, source badge (Manual seed / PAPER / paste), journal pulse counts, RH import row count, CTA to Lab + Journal + Settings. Brain “pulse” minimum = clear path to ranked recs (top-3 inline **nice-to-have** if chain available without blocking) |
| **Test idea** | Manual screenshot Command with $500 seed + ladder; no $25k without DEMO |
| **Falsifier** | Chart-only shell with no capital truth |

### G7 — Zero-size / infeasible UX

| | |
|--|--|
| **Owner** | Backend (copy + filter) + Frontend (display) |
| **Code anchors** | `zeroSizeCoach`, BrainRecommendPanel, selector ranking notes |
| **DoD** | Whenever `suggestedContracts < 1` and max loss known, coach text visible; infeasible strategies deprioritized or tagged “infeasible at equity” |
| **Test idea** | `zeroSizeCoach` string match at equity 500 / maxLoss 150; UI path in Brain panel |
| **Falsifier** | Rank #1 with 0 contracts and no explanation |

### G8 — Compare / Saved (secondary — Week 2+)

| | |
|--|--|
| **Owner** | Frontend |
| **DoD (Week 2)** | Compare already engine-wired — polish only. Saved list local-first usable |
| **Test idea** | Compare three micro structures sorts by PoP; Saved round-trip localStorage |
| **Not a Week-1 gate** for `SHIP_PERSONAL_MVP` if A–D otherwise met |

---

## 5. Quality gates

### Gate A — Task complete

- [ ] DoD checklist for that card met in code
- [ ] `pnpm test` green
- [ ] `pnpm typecheck` green
- [ ] No auto-trade language or order placement APIs added
- [ ] No RH password / unofficial API

### Gate B — Week 1 money-loop candidate

All of Reality Checker §4 **A–D** at least partially true in the **running app**:

| § | Requirement | Gate check |
|---|-------------|------------|
| A | Capital honesty | Seed preset + empire filters + coach |
| B | Decision → action | Lab checklist copy |
| C | Overnight memory | Local journal plan + close |
| D | Position awareness | RH paste import + label; sharesHeld bridge preferred |

### Gate C — `SHIP_PERSONAL_MVP` (Reality Checker)

Evidence package from `04-reality-check.md` §6:

1. $500 account → feasible micro structures **or** clear halt + coach  
2. OrderChecklistCard populated + copy works  
3. Journal ≥1 planned + ≥1 closed (or open) local-first  
4. RH CSV/paste import reflected  
5. Command strip + badges  
6. Tests + typecheck pass logs  
7. Unit fixtures at equity=500  
8. (Week 4) 5-day paper ritual note — **not** required for UI-complete candidate; required before real $500 risk  

**Default verdict if evidence weak:** `NEEDS_WORK`.

### Gate D — Hard fail (any phase)

| Falsifier | Action |
|-----------|--------|
| Auto-trade / broker order placement | **BLOCKED** — revert |
| RH password field or unofficial API | **BLOCKED** — revert |
| LIVE badge on demo chain | Fail QA |
| $25k presented as personal seed without DEMO | Fail QA |

---

## 6. Week 1 critical path (summary)

Order optimized for **smallest change that unblocks daily use**:

1. **Harden seed + empire in brain path** (G1/G2/G7) — already 70% code; finish enforcement + tests  
2. **Checklist → journal text + always-on Lab CTA** (G5/G4) — one file fix + UX assert  
3. **RH import → AccountState bridge** (G3) — map symbols/qty; Settings already pastes  
4. **Command ritual honesty pass** (G6) — DEMO/seed badges, no fantasy equity  
5. **Evidence pack + Reality Checker** (Gate C)

Detail cards: [`02-SPRINT-BACKLOG.md`](./02-SPRINT-BACKLOG.md).  
Implementer packets: [`03-HANDOFFS.md`](./03-HANDOFFS.md).  
Seed finance lock (parallel agency): [`06-SEED-FINANCE-RULES.md`](./06-SEED-FINANCE-RULES.md) — 0.5%/1% · CSP blocked · $500 empty shares · coach templates.

---

## 7. Parallelism & collision map

| Track | Safe parallel with | Avoid concurrent edit |
|-------|--------------------|------------------------|
| Empire policy + tests | RH pure parse utils | `selector.ts` + `riskGates.ts` same PR as FE brain UI |
| Lab checklist save | Settings RH UI | `OptionScopeBuilder.tsx` dual agents |
| CommandRitual | Journal page polish | Dashboard only if one owner |
| Reality Checker | nothing (end of Week 1) | — |

**Max retries per task:** 3 (dev ↔ QA). Escalate with blocker note; do not lower DoD to green-wash.

---

## 8. Weeks 2–4 (after Week 1 candidate)

| Week | Focus | Gate |
|------|-------|------|
| **2** | Journal depth (process flags, fill paste), RH fix-list panel, Saved local | Memory loop reliable |
| **3** | Command top-3 brain pulse (if chain env), nav labels Command/Trade Lab, daily P/L honesty or “unknown” | Ritual muscle memory |
| **4** | N paper closes, adherence ≥70%, Reality Checker retest for **real seed** discussion | Process proof (§4 E) |

**Parked:** LM Studio companion, multi-tenant SaaS, backtest vanity, more dump ingest.

---

## 9. Status reporting template

```
NEXUS-Sprint | Superagent | Phase N | OptionScope
Task: [id] [title]
Owner: Backend | Frontend | QA
Attempt: 1/3
Tests: pass/fail
Gate: open | passed | blocked
Next: [agent + card id]
```

---

## 10. Orchestrator decision log

| Decision | Rationale |
|----------|-----------|
| Local-first journal/settings over Supabase-first | Unblocks offline personal use; schema already exists for later |
| Harden WIP before new features | Branch already has seed/policy/checklist/ritual — smallest path |
| RH paste only | Security APPROVED path; doctrine |
| No auto-trade ever this sprint | Empire hard law |
| Compare not Week-1 critical | Engine UI already present; capital loop first |
| Default QA to NEEDS_WORK | Reality Checker doctrine |

---

## 11. Next agent action (immediate)

1. Backend implementer: execute backlog cards **W1-B01 → W1-B03** (see handoffs).  
2. Frontend implementer: execute **W1-F01 → W1-F03** after or parallel where non-colliding.  
3. QA: hold until Gate B checklist ready; then evidence pack + Reality Checker.

---

_Educational companion only. Manual Robinhood execution only. Long live the empire._
