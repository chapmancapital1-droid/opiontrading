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
