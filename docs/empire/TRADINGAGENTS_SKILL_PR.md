# TradingAgents skill PR form

**Upstream:** https://github.com/TauricResearch/TradingAgents.git  
**arXiv:** https://arxiv.org/abs/2412.20138  
**License:** Apache-2.0  

## Purpose

Gate any OptionScope **skill** or code PR inspired by TradingAgents so multi-agent LLM research never becomes auto-execution.

## UI

Command Center → **Playbook** → **TradingAgents skill PR form**  
Local storage key: `optionscope.playbook.tradingagents_skill_pr`

## Grok skill

`.grok/skills/tradingagents-skill-pr/SKILL.md` — invoke with TradingAgents / skill PR review.

## Policy

`src/knowledge/tradingAgentsPolicy.ts`

## Pull vs reject

See `TRADINGAGENTS_PULL` / `TRADINGAGENTS_REJECT` in that module.

## PR body

After saving the form, use **Copy PR markdown** (or `formatTradingAgentsSkillPRMarkdown`) as the GitHub PR description template.
