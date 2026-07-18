/**
 * Local-only pre/post trade playbook forms (Command Center).
 * Never leaves the browser — personal process discipline.
 *
 * Also: TradingAgents skill PR intake form — gate multi-agent LLM
 * research (TauricResearch/TradingAgents) before any empire pull.
 */

export type PreTradePlan = {
  id: string;
  createdAt: string;
  symbol: string;
  strategyId: string;
  thesis: string;
  ivRegime: string;
  maxLoss: number;
  maxProfit: number | null;
  breakEvens: string;
  dte: number;
  exitPlan: string;
  eventClear: boolean;
  sizeContracts: number;
};

export type PostTradeReview = {
  id: string;
  createdAt: string;
  symbol: string;
  strategyId: string;
  realizedPL: number;
  heldDays: number | null;
  forecastPoP: number | null;
  whatWorked: string;
  whatFailed: string;
  ruleToKeep: string;
};

/** Intake form for skills PRs inspired by github.com/TauricResearch/TradingAgents */
export type TradingAgentsSkillPR = {
  id: string;
  createdAt: string;
  /** Skill or PR title */
  skillName: string;
  /** Upstream ref: commit, tag, or branch */
  upstreamRef: string;
  symbol: string;
  analysisDate: string;
  /** Which TA roles this skill mirrors */
  rolesUsed: string[];
  llmProvider: string;
  llmModel: string;
  /** Research-only | soft-bias | reject-auto-exec */
  empireMode: "research_only" | "soft_bias" | "blocked_auto_exec";
  /** TA decision / rating text (paste) */
  agentDecision: string;
  /** Bull researcher summary */
  bullCase: string;
  /** Bear researcher summary */
  bearCase: string;
  /** Risk team note */
  riskNote: string;
  /** Maps to OptionScope strategyId if any */
  proposedStrategyId: string;
  /** Empire hard gates checklist */
  definedRiskOnly: boolean;
  noAutoBroker: boolean;
  noInventedMarks: boolean;
  humanFillRequired: boolean;
  journalLogged: boolean;
  nciOrContextOk: boolean;
  /** Final PR recommendation */
  prDecision: "approve_skill" | "request_changes" | "reject";
  prRationale: string;
  filesTouched: string;
};

const PRE_KEY = "optionscope.playbook.pretrade";
const POST_KEY = "optionscope.playbook.posttrade";
const TA_SKILL_KEY = "optionscope.playbook.tradingagents_skill_pr";
const VT_SKILL_KEY = "optionscope.playbook.vibetrading_skill_pr";

export const TRADINGAGENTS_ROLES = [
  "fundamentals_analyst",
  "sentiment_analyst",
  "news_analyst",
  "technical_analyst",
  "bull_researcher",
  "bear_researcher",
  "trader",
  "risk_management",
  "portfolio_manager",
] as const;

function readList<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeList<T>(key: string, items: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(items.slice(0, 50)));
}

export function listPreTradePlans(): PreTradePlan[] {
  return readList<PreTradePlan>(PRE_KEY);
}

export function savePreTradePlan(plan: Omit<PreTradePlan, "id" | "createdAt">): PreTradePlan {
  const row: PreTradePlan = {
    ...plan,
    id: `pre_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  writeList(PRE_KEY, [row, ...listPreTradePlans()]);
  return row;
}

export function listPostTradeReviews(): PostTradeReview[] {
  return readList<PostTradeReview>(POST_KEY);
}

export function savePostTradeReview(
  rev: Omit<PostTradeReview, "id" | "createdAt">
): PostTradeReview {
  const row: PostTradeReview = {
    ...rev,
    id: `post_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  writeList(POST_KEY, [row, ...listPostTradeReviews()]);
  return row;
}

export function listTradingAgentsSkillPRs(): TradingAgentsSkillPR[] {
  return readList<TradingAgentsSkillPR>(TA_SKILL_KEY);
}

export function saveTradingAgentsSkillPR(
  pr: Omit<TradingAgentsSkillPR, "id" | "createdAt">
): TradingAgentsSkillPR {
  const row: TradingAgentsSkillPR = {
    ...pr,
    id: `ta_skill_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  writeList(TA_SKILL_KEY, [row, ...listTradingAgentsSkillPRs()]);
  return row;
}

/** Markdown body for a GitHub skill PR description (copy-paste). */
export function formatTradingAgentsSkillPRMarkdown(pr: TradingAgentsSkillPR): string {
  const gates = [
    pr.definedRiskOnly && "defined-risk only",
    pr.noAutoBroker && "no auto-broker",
    pr.noInventedMarks && "no invented marks",
    pr.humanFillRequired && "human fill required",
    pr.journalLogged && "journal logged",
    pr.nciOrContextOk && "NCI/context OK",
  ]
    .filter(Boolean)
    .join(", ");

  return `## TradingAgents skill PR — OptionScope empire gate

**Skill:** \`${pr.skillName}\`
**Upstream:** [TauricResearch/TradingAgents](https://github.com/TauricResearch/TradingAgents) @ \`${pr.upstreamRef}\`
**Ticker / date:** \`${pr.symbol}\` · \`${pr.analysisDate}\`
**LLM:** ${pr.llmProvider} / ${pr.llmModel}
**Empire mode:** \`${pr.empireMode}\`
**Decision:** **${pr.prDecision}**

### Roles mirrored
${pr.rolesUsed.map((r) => `- ${r}`).join("\n") || "- (none)"}

### Agent decision (paste)
${pr.agentDecision || "_empty_"}

### Bull case
${pr.bullCase || "_empty_"}

### Bear case
${pr.bearCase || "_empty_"}

### Risk note
${pr.riskNote || "_empty_"}

### Proposed OptionScope strategy
\`${pr.proposedStrategyId || "none"}\`

### Empire gates checked
${gates || "_none checked_"}

### Rationale
${pr.prRationale || "_empty_"}

### Files touched
\`\`\`
${pr.filesTouched || "(list paths)"}
\`\`\`

### Hard rules (do not merge if violated)
- Research / soft-bias only — **never** auto-execute RH orders from LLM agents
- All strikes/marks must come from OptionScope chain engine, not agent prose
- Multi-agent debate is narrative input; selector + riskGates remain deterministic
`;
}

/** Intake form for skills PRs inspired by github.com/VibeTradingLabs/vibetrading */
export type VibeTradingSkillPR = {
  id: string;
  createdAt: string;
  skillName: string;
  upstreamRef: string;
  /** NL prompt used to generate strategy */
  nlPrompt: string;
  asset: string;
  interval: string;
  templateUsed: string;
  llmProvider: string;
  llmModel: string;
  empireMode: "research_only" | "backtest_offline" | "blocked_live_deploy";
  validationStatus: "valid" | "warnings" | "errors" | "not_run";
  validationNotes: string;
  backtestSharpe: number | null;
  backtestMaxDd: number | null;
  backtestWinRate: number | null;
  backtestNotes: string;
  cryptoOnlyResearch: boolean;
  noWalletKeys: boolean;
  validateBeforeRun: boolean;
  noEmpireLiveDeploy: boolean;
  definedRiskNote: boolean;
  humanFillRequired: boolean;
  prDecision: "approve_skill" | "request_changes" | "reject";
  prRationale: string;
  filesTouched: string;
};

export const VIBETRADING_TEMPLATES = [
  "none_custom_nl",
  "momentum",
  "mean_reversion",
  "grid",
  "dca",
  "multi_momentum",
] as const;

export function listVibeTradingSkillPRs(): VibeTradingSkillPR[] {
  return readList<VibeTradingSkillPR>(VT_SKILL_KEY);
}

export function saveVibeTradingSkillPR(
  pr: Omit<VibeTradingSkillPR, "id" | "createdAt">
): VibeTradingSkillPR {
  const row: VibeTradingSkillPR = {
    ...pr,
    id: `vt_skill_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  writeList(VT_SKILL_KEY, [row, ...listVibeTradingSkillPRs()]);
  return row;
}

export function formatVibeTradingSkillPRMarkdown(pr: VibeTradingSkillPR): string {
  const gates = [
    pr.cryptoOnlyResearch && "crypto research only",
    pr.noWalletKeys && "no wallet keys",
    pr.validateBeforeRun && "validate before run",
    pr.noEmpireLiveDeploy && "no empire live deploy",
    pr.definedRiskNote && "defined-risk note if options map",
    pr.humanFillRequired && "human fill required",
  ]
    .filter(Boolean)
    .join(", ");

  return `## VibeTrading skill PR — OptionScope empire gate

**Skill:** \`${pr.skillName}\`
**Upstream:** [VibeTradingLabs/vibetrading](https://github.com/VibeTradingLabs/vibetrading) @ \`${pr.upstreamRef}\`
**Asset / interval:** \`${pr.asset}\` · \`${pr.interval}\`
**Template:** \`${pr.templateUsed}\`
**LLM:** ${pr.llmProvider} / ${pr.llmModel}
**Empire mode:** \`${pr.empireMode}\`
**Validation:** \`${pr.validationStatus}\`
**Decision:** **${pr.prDecision}**

### NL prompt
${pr.nlPrompt || "_empty_"}

### Backtest (if any)
- Sharpe: ${pr.backtestSharpe ?? "n/a"}
- Max DD: ${pr.backtestMaxDd ?? "n/a"}
- Win rate: ${pr.backtestWinRate ?? "n/a"}
- Notes: ${pr.backtestNotes || "_empty_"}

### Validation notes
${pr.validationNotes || "_empty_"}

### Empire gates
${gates || "_none checked_"}

### Rationale
${pr.prRationale || "_empty_"}

### Files touched
\`\`\`
${pr.filesTouched || "(list paths)"}
\`\`\`

### Hard rules (do not merge if violated)
- **Crypto research / offline backtest only** — never wire Hyperliquid/Paradex private keys into OptionScope
- LLM-generated strategy code is **not** an RH options order
- Live \`vibetrading.live.start\` is **blocked** for empire companion
- If borrowing process ideas (validate, metrics), map only to defined-risk equity options + human fill
`;
}
