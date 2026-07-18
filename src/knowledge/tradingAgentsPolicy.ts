/**
 * Policy for TauricResearch/TradingAgents
 * https://github.com/TauricResearch/TradingAgents
 *
 * Multi-agent LLM financial research framework (LangGraph):
 * analysts → bull/bear researchers → trader → risk → portfolio manager.
 *
 * Empire stance: research sibling + optional soft bias — NOT auto-broker.
 */

export const TRADINGAGENTS_META = {
  repo: "https://github.com/TauricResearch/TradingAgents",
  git: "https://github.com/TauricResearch/TradingAgents.git",
  arxiv: "https://arxiv.org/abs/2412.20138",
  license: "Apache-2.0",
  language: "Python",
  framework: "LangGraph multi-agent LLM trading research",
  disclaimer: "Research only — not financial advice; non-deterministic LLM outputs",
} as const;

/** Map TradingAgents roles → OptionScope surfaces */
export const TRADINGAGENTS_ROLE_MAP = [
  {
    ta: "Fundamentals Analyst",
    empire: "Optional research note / education — not strike selection",
  },
  {
    ta: "Sentiment Analyst",
    empire: "Soft newsBias / MarketContext.newsSentiment cousin",
  },
  {
    ta: "News Analyst",
    empire: "MarketContext events + news panel",
  },
  {
    ta: "Technical Analyst",
    empire: "NCI TA + TV chart — prefer NCI snapshot over free-form TA prose",
  },
  {
    ta: "Bull / Bear Researchers",
    empire: "Explain panel thesis/risks (narrative only)",
  },
  {
    ta: "Trader Agent",
    empire: "BrainRecommend ranking input (soft) — never place order",
  },
  {
    ta: "Risk Management",
    empire: "Must defer to riskGates + empirePolicy (hard)",
  },
  {
    ta: "Portfolio Manager",
    empire: "Human approval = RH checklist — PM agent cannot approve fills",
  },
] as const;

export const TRADINGAGENTS_PULL = [
  "Role separation: analyst / debate / risk / decision labels for explain UX",
  "Bull vs bear structured debate before directional options",
  "Persistent decision log idea → journal reflection (already local)",
  "Checkpoint resume idea → long research runs offline only",
  "Grounded data contract mindset: verify prices/marks (OptionScope chain)",
] as const;

export const TRADINGAGENTS_REJECT = [
  "pip install TradingAgents as OptionScope runtime dependency",
  "LangGraph auto-execution into Robinhood",
  "LLM-invented strikes, premiums, or Greeks",
  "Non-deterministic agent votes replacing deterministic selector",
  "Python-only path as production brain (empire brain is TypeScript)",
] as const;

export const TRADINGAGENTS_SKILL_PR_GATES = [
  "definedRiskOnly — skill never recommends naked undefined risk for seed",
  "noAutoBroker — no RH credentials, no unofficial API, no auto place",
  "noInventedMarks — chain/quote engine owns numbers",
  "humanFillRequired — checklist remains last mile",
  "journalLogged — decisions enter journal for calibration",
  "nciOrContextOk — soft TA must not contradict hard MarketContext/NCI gates without note",
] as const;
