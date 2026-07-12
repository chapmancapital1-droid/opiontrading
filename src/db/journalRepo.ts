import type {
  TradeRow, CashEventRow, StrategyKind, LifecycleState,
  ExitReason, ForecastSnapshot, CashEventKind,
} from "./types";
import type { Leg } from "@/domain/types";

// The concrete SupabaseClient type is injected so this file has no hard dep
// during tests. In app code, pass createClient()/createServerSupabase().
type DB = {
  from: (t: string) => any;
  auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> };
};

export interface NewTradeInput {
  underlying: string;
  strategy: StrategyKind;
  title?: string;
  legs: Leg[];
  forecast: ForecastSnapshot;
  planned_entry_price?: number;
  planned_profit_target?: number;
  planned_loss_limit?: number;
  planned_exit_date?: string;
  assignment_willing?: boolean;
  thesis?: string;
}

export function makeJournalRepo(db: DB) {
  async function currentUserId(): Promise<string> {
    const { data } = await db.auth.getUser();
    if (!data.user) throw new Error("Not signed in. Sign in to save to your journal.");
    return data.user.id;
  }

  return {
    async createTrade(input: NewTradeInput): Promise<TradeRow> {
      const user_id = await currentUserId();
      const { data, error } = await db
        .from("trades")
        .insert({ ...input, user_id, state: "planned" as LifecycleState })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as TradeRow;
    },

    async listTrades(filter?: { state?: LifecycleState; strategy?: StrategyKind }): Promise<TradeRow[]> {
      let q = db.from("trades").select("*").order("created_at", { ascending: false });
      if (filter?.state) q = q.eq("state", filter.state);
      if (filter?.strategy) q = q.eq("strategy", filter.strategy);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as TradeRow[];
    },

    async getTrade(id: string): Promise<TradeRow | null> {
      const { data, error } = await db.from("trades").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? null) as TradeRow | null;
    },

    async updateTrade(id: string, patch: Partial<TradeRow>): Promise<TradeRow> {
      // Guard: never allow the forecast snapshot to be overwritten.
      const { forecast, id: _ignore, user_id: _u, created_at: _c, ...safe } = patch;
      const { data, error } = await db.from("trades").update(safe).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data as TradeRow;
    },

    /** Transition lifecycle state with the actuals that belong to it. */
    async transition(
      id: string,
      state: LifecycleState,
      actuals?: {
        actual_entry_price?: number;
        actual_exit_price?: number;
        realized_pl?: number;
        exit_reason?: ExitReason;
        opened_at?: string;
        closed_at?: string;
        notes?: string;
      }
    ): Promise<TradeRow> {
      const { data, error } = await db
        .from("trades")
        .update({ state, ...actuals })
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as TradeRow;
    },

    /** Append a cash event (roll/wheel/dividend). seq auto-increments per trade. */
    async addCashEvent(
      trade_id: string,
      e: { label: string; kind: CashEventKind; amount: number; occurred_at?: string; meta?: Record<string, unknown> }
    ): Promise<CashEventRow> {
      const user_id = await currentUserId();
      const { data: existing } = await db
        .from("cash_events").select("seq").eq("trade_id", trade_id)
        .order("seq", { ascending: false }).limit(1);
      const seq = (existing?.[0]?.seq ?? 0) + 1;
      const { data, error } = await db
        .from("cash_events")
        .insert({ trade_id, user_id, seq, ...e })
        .select().single();
      if (error) throw new Error(error.message);
      return data as CashEventRow;
    },

    async listCashEvents(trade_id: string): Promise<CashEventRow[]> {
      const { data, error } = await db
        .from("cash_events").select("*").eq("trade_id", trade_id)
        .order("seq", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as CashEventRow[];
    },

    async deleteTrade(id: string): Promise<void> {
      const { error } = await db.from("trades").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
  };
}
