# VibeTrading skill PR form

**Upstream:** https://github.com/VibeTradingLabs/vibetrading.git  
**Site:** https://vibetrading.dev  
**License:** MIT  

## What it is

Prompt-to-strategy **crypto** framework (generate → validate → backtest → live).  
Includes an upstream Agent skill at `skills/vibetrading/SKILL.md`.

## Empire fit

| Useful | Not useful |
|--------|------------|
| Process: validate before run | Live Hyperliquid/Paradex deploy |
| Backtest metrics vocabulary | Seed equity options structure |
| Agent skill packaging pattern | RH auto-trade |

## UI

Command Center → **Playbook** → **VibeTrading skill PR form**

## Grok skill

`.grok/skills/vibetrading-skill-pr/SKILL.md`

## Policy

`src/knowledge/vibeTradingPolicy.ts`
