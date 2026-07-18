# Superagent kickoff — OptionScope Personal Trading Assistant

**Date:** 2026-07-15  
**Lead:** Superagent (`agents-orchestrator`)  
**Owner:** Michael Chapman (personal use only)  
**Repo:** `C:\Users\Michael Chapman\opiontrading`  
**Branch:** `claude/openbb-data-news-integration`  
**Mission class:** Personal empire companion — **not** public SaaS launch

---

## Product (one sentence)

OptionScope is Michael’s **personal options trading assistant**: live chains, quantitative brain, book rules, and execution *checklists* so he can grow capital **$500 → $5k → $25k** without blowing up — human always clicks the broker.

## Doctrine (hard laws)

1. Educational companion — not third-party investment advice  
2. **No auto-trade**  
3. Model PoP/EV are estimates  
4. Seed accounts cannot default to naked / CSP universe  
5. Robinhood data only via **export/CSV/paste** — never password / unofficial API  
6. Real profits before multi-user public product  

## Baseline (verified this session)

| Check | Result |
|-------|--------|
| `pnpm test` | **130/130 pass** |
| `pnpm typecheck` | **0 errors** |
| Engine / brain / market context / book rules | Present in code |
| Prior Reality Checker (2026-07-12) | **NEEDS_WORK** — lab strong, money loop weak |
| Uncommitted WIP | UI + lab cockpit + Money Press calendar features on branch |

## Companion gap list (empire order)

### Critical — daily driver blockers

1. **Seed capital mode** — real $500 / $1k / $5k profile; not $25k fantasy demo  
2. **Seed / empire policy** — micro defined-risk allowlist; zero-size coach  
3. **RH import surface** — CSV/paste → positions/history (security-approved path)  
4. **Order checklist wired** into Trade Lab as primary CTA  
5. **Command Center ritual** — account strip, brain pulse, LIVE/PAPER badges  
6. **Journal product UI** — forecast → fill → outcome loop  

### Secondary

7. Compare / Saved pages beyond stubs  
8. Settings: equity override, provider chips, growth mode lock  
9. Education personal curriculum (books already ingested)  

## Superagent team roster

| Role | Agent slug | Job this sprint |
|------|------------|-----------------|
| **Lead** | `agents-orchestrator` | Sequence work, gates, handoffs |
| PM | `product-manager` | Prioritize personal MVP acceptance |
| Sprint | `product-sprint-prioritizer` | Ordered backlog from critical list |
| Delivery | `project-manager-senior` | Task cards + DoD |
| Architect | `engineering-software-architect` | Seed mode + RH import + ritual architecture |
| Backend | `engineering-backend-architect` | Policy, import pipeline, journal API |
| Frontend | `engineering-frontend-developer` | Command ritual, Lab checklist, seed UI |
| Finance | `finance-financial-analyst` | $500 physics validation on policies |
| Security | `security-architect` | RH import threat model guardrails |
| QA | `testing-evidence-collector` | Tests + evidence pack |
| Gate | `testing-reality-checker` | SHIP_PERSONAL_MVP vs NEEDS_WORK |

## Success = SHIP_PERSONAL_MVP only if

- [ ] Seed equity profile selectable and used by brain sizing  
- [ ] Infeasible strategies show **zero-size coach**, not silent 0  
- [ ] Order checklist visible in Trade Lab after recommendation  
- [ ] RH export import works for at least one official export shape  
- [ ] Journal can log a paper trade outcome  
- [ ] Tests green; Reality Checker **SHIP_PERSONAL_MVP** or explicit remaining blockers  

## Non-goals this sprint

- Auto-trading  
- Public multi-tenant SaaS  
- Unofficial Robinhood login  
- Guaranteeing 10× returns  

## Status

```
NEXUS-Sprint | Superagent | Phase 1 Strategy | OptionScope Personal Companion
Baseline: 130 tests green · typecheck green
Next: team plans → implement critical money loop
```
