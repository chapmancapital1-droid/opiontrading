/* ============================================================================
   OPTIONSCOPE — MESSAGE 5 of N
   Database (Postgres/Supabase) + auth + journal persistence.

   Principles (from your spec):
   - Demo mode needs NO account. Auth is required ONLY to save a journal.
   - Row-Level Security: a user can never read or write another user's rows.
   - Store the FULL forecast at entry (assumptions, probability distribution,
     seed) so later calibration compares prediction vs. outcome honestly.
   - Roll/wheel modeled as separate cash events; realized loss never hidden.

   Split each section into the path in its banner: ===== FILE: path =====
   ============================================================================ */


/* ============================================================================
   ===== FILE: db/schema.sql =====
   Run in the Supabase SQL editor (or via migration). Enables RLS on every
   user-owned table. auth.users is managed by Supabase Auth.
   ============================================================================ */

/*
-- ---------- extensions ----------
create extension if not exists "uuid-ossp";

-- ---------- enums ----------
create type strategy_kind as enum (
  'long_call','long_put','covered_call','cash_secured_put',
  'bull_call_debit','bear_put_debit','bull_put_credit','bear_call_credit',
  'long_straddle','long_strangle','iron_condor','iron_butterfly',
  'call_butterfly','put_butterfly','custom_same_expiration'
);

create type lifecycle_state as enum (
  'planned','opened','adjusted','closed','expired','exercised','assigned'
);

create type exit_reason as enum (
  'target_hit','stop_hit','time_exit','expired_worthless','expired_itm',
  'assigned','exercised','manual','other'
);

create type cash_event_kind as enum (
  'premium_in','premium_out','stock_buy','stock_sell','fee','dividend'
);

-- ---------- profiles (1:1 with auth.users) ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  approval_profile text not null default 'level2_basic',
  account_size numeric(14,2),
  max_risk_pct numeric(5,2),        -- e.g. 2.00 = 2%
  default_seed integer not null default 12345,
  default_simulations integer not null default 20000,
  theme text not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- trades (one row per journaled strategy/campaign) ----------
create table public.trades (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  underlying text not null,
  strategy strategy_kind not null,
  title text,
  state lifecycle_state not null default 'planned',

  -- Legs stored as normalized JSON (validated app-side against Leg[] type).
  legs jsonb not null,

  -- Forecast captured at ENTRY (never overwritten; the honesty anchor).
  forecast jsonb not null,          -- { probProfit, probLoss, expectedPL, median,
                                    --   p5, p95, maxProfit, maxLoss, breakEvens,
                                    --   assumptions:{ model, sigma, r, q, drift,
                                    --   driftMode, simulations, seed, ci95Prob },
                                    --   quoteMeta:{...} }

  -- Plan
  planned_entry_price numeric(14,4),
  planned_profit_target numeric(14,2),
  planned_loss_limit numeric(14,2),
  planned_exit_date date,
  assignment_willing boolean not null default false,
  thesis text,

  -- Actuals (filled as the trade progresses)
  actual_entry_price numeric(14,4),
  actual_exit_price numeric(14,4),
  realized_pl numeric(14,2),
  exit_reason exit_reason,
  opened_at timestamptz,
  closed_at timestamptz,

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trades_user_idx on public.trades(user_id);
create index trades_state_idx on public.trades(user_id, state);
create index trades_strategy_idx on public.trades(user_id, strategy);

-- ---------- cash_events (roll/wheel ledger; audit trail) ----------
create table public.cash_events (
  id uuid primary key default uuid_generate_v4(),
  trade_id uuid not null references public.trades(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  seq integer not null,             -- ordering within a campaign
  label text not null,
  kind cash_event_kind not null,
  amount numeric(14,2) not null,    -- + inflow / - outflow
  occurred_at timestamptz not null default now(),
  meta jsonb
);
create index cash_events_trade_idx on public.cash_events(trade_id, seq);

-- ---------- attachments (screenshots/notes; store path in Supabase Storage) ----------
create table public.attachments (
  id uuid primary key default uuid_generate_v4(),
  trade_id uuid not null references public.trades(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now()
);

-- ---------- saved_analyses (unsaved-to-journal scratch analyses) ----------
create table public.saved_analyses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  underlying text not null,
  strategy strategy_kind not null,
  payload jsonb not null,           -- full builder state for reload
  created_at timestamptz not null default now()
);
create index saved_analyses_user_idx on public.saved_analyses(user_id);

-- ---------- updated_at trigger ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger trg_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger trg_trades_touch before update on public.trades
  for each row execute function public.touch_updated_at();

-- ---------- auto-create profile on signup ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================ ROW LEVEL SECURITY ============================
alter table public.profiles       enable row level security;
alter table public.trades         enable row level security;
alter table public.cash_events    enable row level security;
alter table public.attachments    enable row level security;
alter table public.saved_analyses enable row level security;

-- profiles: owner-only
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- trades: owner-only for all verbs
create policy "trades_all_own" on public.trades
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- cash_events: owner-only (user_id denormalized for a simple policy)
create policy "cash_events_all_own" on public.cash_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- attachments: owner-only
create policy "attachments_all_own" on public.attachments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- saved_analyses: owner-only
create policy "saved_analyses_all_own" on public.saved_analyses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- storage bucket for attachments (run once) ----------
-- insert into storage.buckets (id, name, public) values ('trade-attachments','trade-attachments', false);
-- create policy "att_read_own" on storage.objects for select
--   using (bucket_id = 'trade-attachments' and owner = auth.uid());
-- create policy "att_write_own" on storage.objects for insert
--   with check (bucket_id = 'trade-attachments' and owner = auth.uid());
*/


/* ============================================================================
   ===== FILE: src/db/types.ts =====
   TypeScript mirror of the schema for type-safe access.
   ============================================================================ */

import type { Leg } from "@/domain/types";

export type StrategyKind =
  | "long_call" | "long_put" | "covered_call" | "cash_secured_put"
  | "bull_call_debit" | "bear_put_debit" | "bull_put_credit" | "bear_call_credit"
  | "long_straddle" | "long_strangle" | "iron_condor" | "iron_butterfly"
  | "call_butterfly" | "put_butterfly" | "custom_same_expiration";

export type LifecycleState =
  | "planned" | "opened" | "adjusted" | "closed" | "expired" | "exercised" | "assigned";

export type ExitReason =
  | "target_hit" | "stop_hit" | "time_exit" | "expired_worthless" | "expired_itm"
  | "assigned" | "exercised" | "manual" | "other";

export type CashEventKind =
  | "premium_in" | "premium_out" | "stock_buy" | "stock_sell" | "fee" | "dividend";

/** The forecast snapshot captured at entry — never mutated afterward. */
export interface ForecastSnapshot {
  probProfit: number;
  probLoss: number;
  expectedPL: number;
  median: number;
  p5: number;
  p95: number;
  maxProfit: number | "unlimited";
  maxLoss: number | "undefined";
  breakEvens: number[];
  assumptions: {
    model: "black-scholes" | "binomial-crr" | "mixed";
    sigma: number;
    r: number;
    q: number;
    driftMode: "risk-neutral" | "user";
    driftUsed: number;
    simulations: number;
    seed: number;
    ci95Prob: [number, number];
  };
  quoteMeta: { source: string; timestamp: string; freshness: string };
}

export interface TradeRow {
  id: string;
  user_id: string;
  underlying: string;
  strategy: StrategyKind;
  title: string | null;
  state: LifecycleState;
  legs: Leg[];
  forecast: ForecastSnapshot;
  planned_entry_price: number | null;
  planned_profit_target: number | null;
  planned_loss_limit: number | null;
  planned_exit_date: string | null;
  assignment_willing: boolean;
  thesis: string | null;
  actual_entry_price: number | null;
  actual_exit_price: number | null;
  realized_pl: number | null;
  exit_reason: ExitReason | null;
  opened_at: string | null;
  closed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CashEventRow {
  id: string;
  trade_id: string;
  user_id: string;
  seq: number;
  label: string;
  kind: CashEventKind;
  amount: number;
  occurred_at: string;
  meta: Record<string, unknown> | null;
}


/* ============================================================================
   ===== FILE: src/db/supabaseClient.ts =====
   Browser client (anon key only). Safe for client bundles.
   ============================================================================ */

/*
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
*/


/* ============================================================================
   ===== FILE: src/db/supabaseServer.ts =====
   Server client — reads the session cookie so RLS runs as the signed-in user.
   The service-role key is NOT used here (RLS must apply). Reserve service-role
   for trusted admin jobs only, never in request handlers that serve users.
   ============================================================================ */

/*
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (all) => all.forEach(({ name, value, options }) => {
          try { cookieStore.set(name, value, options); } catch { }
        }),
      },
    }
  );
}
*/


/* ============================================================================
   ===== FILE: src/db/journalRepo.ts =====
   Persistence API used by the UI. Every method is scoped to the current user
   by RLS; we also pass user_id explicitly for cash_events/attachments.
   Works ONLY when signed in — demo mode never calls these.
   ============================================================================ */

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


/* ============================================================================
   ===== FILE: src/db/calibration.ts =====
   Journal dashboard math: win rate, avg P/L, EV vs realized, and probability
   CALIBRATION by bin. Includes explicit small-sample honesty (Wilson interval)
   so we never claim the model is "accurate" from a handful of trades.
   ============================================================================ */

import type { TradeRow } from "./types";

export interface Bin {
  label: string;
  lo: number; hi: number;
  predictedAvg: number;   // avg forecast PoP in this bin
  observedRate: number;   // fraction that actually profited
  n: number;
  wilsonLow: number;      // 95% Wilson lower bound on observed rate
  wilsonHigh: number;
}

export interface JournalStats {
  totalTrades: number;
  closedTrades: number;
  winRate: number | null;
  avgProfit: number | null;      // avg of positive realized P/L
  avgLoss: number | null;        // avg of negative realized P/L
  avgExpectedValueAtEntry: number | null;
  avgPredictedPoP: number | null;
  avgRealizedPL: number | null;
  byStrategy: { strategy: string; n: number; winRate: number | null; avgPL: number | null }[];
  byDTE: { bucket: string; n: number; winRate: number | null }[];
  calibration: Bin[];
  sampleWarning: string;
}

function wilson(p: number, n: number): [number, number] {
  if (n === 0) return [0, 1];
  const z = 1.96, z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return [Math.max(0, center - margin), Math.min(1, center + margin)];
}

const isWin = (t: TradeRow) => (t.realized_pl ?? 0) > 0;
const isClosed = (t: TradeRow) =>
  ["closed", "expired", "exercised", "assigned"].includes(t.state);

export function computeJournalStats(trades: TradeRow[]): JournalStats {
  const closed = trades.filter(isClosed).filter((t) => t.realized_pl != null);
  const wins = closed.filter(isWin);
  const losses = closed.filter((t) => (t.realized_pl ?? 0) < 0);

  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

  // by strategy
  const stratMap = new Map<string, TradeRow[]>();
  for (const t of closed) {
    const a = stratMap.get(t.strategy) ?? [];
    a.push(t); stratMap.set(t.strategy, a);
  }
  const byStrategy = [...stratMap.entries()].map(([strategy, ts]) => ({
    strategy, n: ts.length,
    winRate: ts.length ? ts.filter(isWin).length / ts.length : null,
    avgPL: avg(ts.map((t) => t.realized_pl!)),
  }));

  // by DTE bucket (uses planned_exit_date vs opened_at as a rough proxy)
  const dteBucket = (t: TradeRow): string => {
    if (!t.planned_exit_date || !t.opened_at) return "unknown";
    const d = Math.round(
      (new Date(t.planned_exit_date).getTime() - new Date(t.opened_at).getTime()) / 864e5
    );
    if (d <= 7) return "0–7";
    if (d <= 21) return "8–21";
    if (d <= 45) return "22–45";
    return "45+";
  };
  const dteMap = new Map<string, TradeRow[]>();
  for (const t of closed) {
    const b = dteBucket(t);
    const a = dteMap.get(b) ?? []; a.push(t); dteMap.set(b, a);
  }
  const byDTE = [...dteMap.entries()].map(([bucket, ts]) => ({
    bucket, n: ts.length,
    winRate: ts.length ? ts.filter(isWin).length / ts.length : null,
  }));

  // calibration bins: predicted PoP vs observed win frequency
  const edges = [0, 0.2, 0.4, 0.6, 0.8, 1.01];
  const calibration: Bin[] = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const lo = edges[i]!, hi = edges[i + 1]!;
    const inBin = closed.filter((t) => {
      const p = t.forecast.probProfit;
      return p >= lo && p < hi;
    });
    const observed = inBin.length ? inBin.filter(isWin).length / inBin.length : 0;
    const [wl, wh] = wilson(observed, inBin.length);
    calibration.push({
      label: `${Math.round(lo * 100)}–${Math.round(Math.min(hi, 1) * 100)}%`,
      lo, hi,
      predictedAvg: inBin.length ? avg(inBin.map((t) => t.forecast.probProfit))! : 0,
      observedRate: observed,
      n: inBin.length,
      wilsonLow: wl, wilsonHigh: wh,
    });
  }

  const sampleWarning =
    closed.length < 30
      ? `Only ${closed.length} closed trade(s). This is far too few to judge whether the probability model is accurate — treat all rates below as noisy.`
      : `${closed.length} closed trades. Calibration is still an estimate; wide Wilson intervals mean low confidence in that bin.`;

  return {
    totalTrades: trades.length,
    closedTrades: closed.length,
    winRate: closed.length ? wins.length / closed.length : null,
    avgProfit: avg(wins.map((t) => t.realized_pl!)),
    avgLoss: avg(losses.map((t) => t.realized_pl!)),
    avgExpectedValueAtEntry: avg(trades.map((t) => t.forecast.expectedPL)),
    avgPredictedPoP: avg(trades.map((t) => t.forecast.probProfit)),
    avgRealizedPL: avg(closed.map((t) => t.realized_pl!)),
    byStrategy, byDTE, calibration, sampleWarning,
  };
}


/* ============================================================================
   ===== FILE: src/app/api/auth/callback/route.ts =====
   OAuth/email-link callback that exchanges the code for a session.
   ============================================================================ */

/*
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/db/supabaseServer";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = await createServerSupabase();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL("/journal", req.url));
}
*/
