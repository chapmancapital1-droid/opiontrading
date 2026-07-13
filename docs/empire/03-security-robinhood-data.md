# Security Architecture — Robinhood Account Data Import

**Classification:** Michael Chapman personal use only (single-operator machine)  
**Status:** APPROVED design for Phase 1 (manual export / CSV / paste)  
**Date:** 2026-07-12 | **Author:** Security Architect  
**Related:** [`00-PERSONAL-COMPANION-BRIEF.md`](./00-PERSONAL-COMPANION-BRIEF.md), [`db/schema.sql`](../../db/schema.sql), [`.env.example`](../../.env.example)

**Verdict:** Secure personal import design — **approved** for local companion use when implementers follow the hard rules below. Not approved for multi-tenant SaaS without a separate threat model, encryption, and legal review.

---

## 1. Threat model

### System under review
OptionScope personal companion on Michael’s machine needs to **see Robinhood history** (what was done) and surface **process “fix list” insights** — without auto-trading and without holding Robinhood credentials.

### Assets
| Asset | Sensitivity | Notes |
|-------|-------------|--------|
| Broker order/fill history | **High** | Positions, symbols, sizes, timestamps, P/L |
| Account equity / cash | **High** | Size ladder context ($500 → $5k → $25k) |
| Journal forecasts vs actuals | Medium–High | Existing `trades` / `cash_events` |
| Market API keys (Polygon/Alpaca) | **Critical** | Server-only; never `NEXT_PUBLIC_` |
| Supabase service role key | **Critical** | Bypass RLS; server-only |
| Robinhood password / MFA / session | **Out of scope — never store** | Not an OptionScope asset |

### Trust boundaries
| Boundary | From | To | Controls (personal phase) |
|----------|------|----|---------------------------|
| Operator → RH web/app | Michael | Robinhood | Official app only; password never enters OptionScope |
| RH export file → OptionScope | User-chosen CSV/paste | Import UI / parser | File type allowlist, size cap, no macros, client-side parse first |
| OptionScope → DB | App | Supabase (or local-only later) | RLS `auth.uid() = user_id`; no service role on client |
| OptionScope → disk | Process | Machine filesystem | No RH password files; temp upload wipe; optional encrypt-at-rest for import blobs |
| OptionScope → network | Browser/server | Third parties | No unofficial RH reverse-engineered APIs; no shipping raw export to random LLMs |

### STRIDE (personal RH import)

| Threat | Component | Risk | Attack scenario | Mitigation |
|--------|-----------|------|-----------------|------------|
| **Spoofing** | Fake “RH login” UI in app | **Critical** | Phishing form harvests RH password / MFA | **Never implement RH password fields.** UI copy: “Export from Robinhood → import file/paste here.” No deep links that look like RH login. |
| **Spoofing** | Unofficial RH API / “unofficial SDK” | **Critical** | Token theft, ToS violation, account lock, malware-laced libs | **Forbidden.** No reverse-engineered login, no third-party RH auth wrappers. |
| **Tampering** | CSV / paste payload | High | Malicious CSV (formula injection, oversized rows, path-like fields) | Parse as **data only**; never `eval`; strip `=`/`+`/`-`/`@` leading cells when exporting back to spreadsheets; max rows/bytes; schema validation |
| **Tampering** | Imported fills mapped to wrong journal trade | Med | Bad join pollutes calibration | Immutable import batch id; human confirm mapping; never overwrite `forecast` (existing journal rule) |
| **Repudiation** | “I didn’t take that trade” | Low–Med | Self-audit only on personal machine | Store import batch + source hash + row counts; link to journal with `source = 'robinhood_export'` |
| **Info disclosure** | Logs / errors / client bundles | High | Export rows or keys in console, Sentry, LLM prompts | Redact account numbers; never log full CSV; no market keys in client; sanitize errors |
| **Info disclosure** | Supabase / cloud backup | High | Shared project or mis-set RLS exposes rows | Personal project only; RLS on; no public tables; review service role usage |
| **DoS** | Huge export paste | Med | Browser hang / OOM | Hard caps (e.g. 5 MB / 50k rows); chunked parse; reject oversized |
| **Elevation** | Mass assignment on import API | High | Client sets `user_id` / escalates | Server sets `user_id` from session only; reject client-supplied owner fields |
| **Supply chain** | “robinhood-node” / scraper packages | **Critical** | Credential abuse, malware | Dependency allowlist: **no RH unofficial packages.** Prefer first-party CSV parser (papaparse or built-in) |
| **Local disk** | Leftover exports / `.env` | High | Stolen laptop / backup sync of secrets + brokerage history | `.env` never committed; exports outside cloud-synced folders or encrypt; wipe temp after import; OS disk encryption (BitLocker) assumed |

### Explicit non-goals (this phase)
- No broker OAuth until official, documented Robinhood (or intermediate broker) API is productized for this use case and re-reviewed.
- No multi-tenant isolation redesign (single operator).
- No auto-order placement from imported data.

---

## 2. APPROVED path (hard rules)

### ALLOWED
1. **Official Robinhood export** — account statements / activity / tax / position CSV as Robinhood provides to the account holder.
2. **Manual CSV upload** into OptionScope (file picker) after user downloads from RH.
3. **Manual paste** of tabular activity (user copies from RH UI or spreadsheet) into a dedicated import field.
4. **Manual journal entry** — existing Trade Lab / checklist → journal flow (no broker credentials).
5. **Screenshots as attachments** (optional) — stored as binary attachments under existing `attachments` + RLS; no OCR of passwords.

### FORBIDDEN
| Action | Why |
|--------|-----|
| Any UI field labeled password / MFA / PIN for Robinhood | Credential phishing surface; ToS/account risk |
| Unofficial RH APIs, reverse-engineered clients, session-cookie scrapers | Credential theft, ban risk, malware, legal |
| Storing RH password, refresh tokens, or device cookies in `.env`, DB, or localStorage | Secrets outside app control |
| Auto-login “sync” buttons that open RH and capture credentials | Same as phishing |
| Shipping raw export files to third-party SaaS LLMs without redaction | PII / financial history leak |
| Executing formulas / scripts from CSV cells | Classic spreadsheet malware path |
| Client-side `SUPABASE_SERVICE_ROLE_KEY` or market keys with `NEXT_PUBLIC_` | Existing empire rule; still applies |

### UX security copy (implementers)
- Title: **“Import Robinhood export”** (not “Connect Robinhood”).
- Steps: (1) In Robinhood, download activity/positions export. (2) Select file or paste rows here. (3) Review mapped trades. (4) Confirm import.
- Explicit line: **OptionScope never asks for your Robinhood password.**
- Disclaim: Not affiliated with Robinhood. Educational companion only. Not investment advice.

### Password phishing defense (product)
- Grep CI / review checklist: reject PRs that add `robinhoodPassword`, `rh_password`, `broker_password`, unofficial SDK deps.
- No iframe of login.robinhood.com inside the app.
- Prefer **local parse** of CSV in the browser or a **server route that never persists raw file longer than the request** (see §3).

---

## 3. Data classification & local storage rules

### Classification
| Class | Examples | Handling |
|-------|----------|----------|
| **C0 Public** | Strategy education, model docs | Normal |
| **C1 Internal** | Forecast assumptions, UI prefs | RLS / owner only |
| **C2 Financial history** | Orders, positions, closed P/L, cash events from RH | Owner-only; minimize retention of raw files; no public URLs |
| **C3 Secrets** | API keys, service role, webhook secrets | Server env only; never in import payloads |

Robinhood import rows are **C2**. Treat like tax docs: useful for process, harmful if leaked.

### Storage rules (personal phase)

1. **Prefer structured rows over raw files**  
   - Persist normalized tables (`rh_import_batches`, `rh_orders`, `rh_positions_snapshots`, links into `trades`).  
   - Do **not** keep the original CSV in Supabase Storage long-term unless encrypted and access-audited. Default: **discard raw after successful parse**.

2. **If temporary disk is used**  
   - Write under OS temp dir with restrictive ACL.  
   - Delete on success/failure.  
   - Never put exports in repo path (`opiontrading/`), git, or public `Downloads` folder that auto-syncs without encryption.

3. **Database**  
   - All import tables: `user_id` + RLS (`auth.uid() = user_id`).  
   - No service-role client in browser.  
   - Journal rule preserved: **never overwrite `forecast`** on linked trades (`journalRepo.updateTrade` already strips `forecast`).

4. **Secrets on this machine**  
   - `.env` matches [`.env.example`](../../.env.example): market keys + `SUPABASE_SERVICE_ROLE_KEY` server-only.  
   - Import feature introduces **no new broker secrets**.  
   - Do not log request bodies that contain full activity history.

5. **Backups & sync**  
   - Personal Supabase project only until multi-tenant redesign.  
   - Cloud sync of project folders: exclude `.env` and any `**/imports/raw/**`.

6. **LLM / brain features**  
   - Safe: aggregate process metrics (win rate by strategy, average hold time, % of trades with stop set).  
   - Unsafe without consent/redaction: full order CSV paste into external model APIs. Prefer local summarization of **derived stats**, not raw exports.

7. **Device baseline (personal)**  
   - Full-disk encryption on.  
   - Browser not shared with untrusted profiles for this app.  
   - Screen lock when away.

---

## 4. Schema sketch for import

Align with existing journal (`trades`, `cash_events`, RLS) without forcing every RH fill into a full `ForecastSnapshot` (imports often lack pre-trade model data).

### Design principles
- **Import is provenance**, journal is **opinionated campaign**.  
- RH rows can exist without a forecast; linking to a journal trade is optional.  
- Idempotent re-import via content hash + broker activity id when available.  
- Immutable batch record for audit.

### Proposed tables (SQL sketch)

```sql
-- ---------- import provenance ----------
create type rh_import_source as enum (
  'csv_upload', 'manual_paste', 'manual_entry'
);

create type rh_row_kind as enum (
  'order', 'fill', 'position', 'closed_trade', 'cash', 'unknown'
);

create table public.rh_import_batches (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source rh_import_source not null,
  filename text,                    -- original name only; no full path required
  content_sha256 text not null,     -- idempotency / re-import detect
  row_count integer not null default 0,
  bytes integer not null default 0,
  parser_version text not null,     -- e.g. 'rh-csv-v1'
  notes text,
  imported_at timestamptz not null default now(),
  raw_discarded boolean not null default true
);
create index rh_batches_user_idx on public.rh_import_batches(user_id, imported_at desc);

-- ---------- positions snapshot (point-in-time open book) ----------
create table public.rh_positions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  batch_id uuid not null references public.rh_import_batches(id) on delete cascade,
  as_of date,
  symbol text not null,             -- underlying or OCC-like option symbol
  instrument_type text,             -- 'equity' | 'option' | 'unknown'
  side text,                        -- long/short if known
  quantity numeric(18,6),
  average_cost numeric(18,6),
  market_value numeric(18,2),
  unrealized_pl numeric(18,2),
  meta jsonb,                       -- extra RH columns preserved safely as JSON
  created_at timestamptz not null default now()
);
create index rh_positions_user_idx on public.rh_positions(user_id, symbol);

-- ---------- orders / fills (activity ledger) ----------
create table public.rh_orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  batch_id uuid not null references public.rh_import_batches(id) on delete cascade,
  external_id text,                 -- RH activity id if present
  activity_date timestamptz,
  symbol text,
  description text,                 -- free text from export (truncate length)
  side text,                        -- buy/sell
  quantity numeric(18,6),
  price numeric(18,6),
  amount numeric(18,2),             -- signed cash effect when known
  fees numeric(18,2),
  state text,                       -- filled/cancelled/partial if present
  instrument_type text,
  option_expiry date,
  option_strike numeric(18,4),
  option_right text,                -- call/put
  raw jsonb,                        -- normalized column map; no secrets
  created_at timestamptz not null default now(),
  unique (user_id, external_id)     -- when external_id not null; enforce in app if partial
);
create index rh_orders_user_date_idx on public.rh_orders(user_id, activity_date desc);
create index rh_orders_symbol_idx on public.rh_orders(user_id, symbol);

-- ---------- closed trades / realized P/L (aggregated view material) ----------
-- Prefer deriving from fills; store explicit closed rows when export provides them.
create table public.rh_closed_trades (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  batch_id uuid not null references public.rh_import_batches(id) on delete cascade,
  symbol text not null,
  strategy_guess text,              -- optional heuristic label; not financial advice
  opened_at timestamptz,
  closed_at timestamptz,
  quantity numeric(18,6),
  entry_price numeric(18,6),
  exit_price numeric(18,6),
  realized_pl numeric(18,2),
  fees numeric(18,2),
  notes text,
  linked_trade_id uuid references public.trades(id) on delete set null,
  created_at timestamptz not null default now()
);
create index rh_closed_user_idx on public.rh_closed_trades(user_id, closed_at desc);

-- Optional bridge: mark journal trades that originated from import
alter table public.trades
  add column if not exists import_batch_id uuid references public.rh_import_batches(id) on delete set null;
alter table public.trades
  add column if not exists import_source text;  -- 'robinhood_export' | null

-- RLS (mirror existing pattern)
alter table public.rh_import_batches enable row level security;
alter table public.rh_positions enable row level security;
alter table public.rh_orders enable row level security;
alter table public.rh_closed_trades enable row level security;

create policy "rh_batches_own" on public.rh_import_batches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "rh_positions_own" on public.rh_positions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "rh_orders_own" on public.rh_orders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "rh_closed_own" on public.rh_closed_trades
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### Mapping to existing journal
| RH concept | OptionScope target |
|------------|--------------------|
| Open option/stock position | `rh_positions` (+ optional manual `trades` with `state = opened`) |
| Fills / activity | `rh_orders` |
| Realized P/L closed leg | `rh_closed_trades.realized_pl` → optional `trades.realized_pl` + `state` |
| Premium / fee cash | `cash_events` when linked campaign exists |
| Pre-trade model forecast | **Not invented** — leave null / create planned journal trade only if user builds one |

### App-layer types (sketch)

```ts
// Align naming with src/db/types.ts when implementing
export type RhImportSource = "csv_upload" | "manual_paste" | "manual_entry";

export interface RhImportBatch {
  id: string;
  user_id: string;
  source: RhImportSource;
  filename: string | null;
  content_sha256: string;
  row_count: number;
  parser_version: string;
  imported_at: string;
  raw_discarded: boolean;
}

export interface RhOrderRow {
  id: string;
  batch_id: string;
  external_id: string | null;
  activity_date: string | null;
  symbol: string | null;
  side: string | null;
  quantity: number | null;
  price: number | null;
  amount: number | null;
  fees: number | null;
  option_expiry: string | null;
  option_strike: number | null;
  option_right: "call" | "put" | null;
  raw: Record<string, unknown> | null;
}
```

### Parser security requirements
- Max file size (recommend **5 MB** personal default; configurable).  
- Max rows (e.g. **50_000**).  
- UTF-8; reject binary / zip / xlsx macros (CSV/TSV/paste only in v1).  
- Column map versioned (`parser_version`); unknown columns → `raw` JSON with length caps.  
- No network calls during parse.  
- Idempotent: same `content_sha256` → show “already imported” instead of duplicating.

---

## 5. “Fix list” insights — safe vs dangerous

The companion must help Michael **see process failure modes**, not impersonate a licensed advisor or guarantee returns on a $500 → $25k ladder.

### SAFE (process / risk-hygiene metrics) — encourage
These are descriptive statistics over **his own** imported + journal data:

| Insight | Why safe |
|---------|----------|
| % of closed trades with documented thesis / checklist | Process completeness |
| % without planned stop or max loss | Risk process gap |
| Average hold vs planned exit date | Discipline / time-stop adherence |
| Win rate / expectancy **with sample-size warning** (existing `calibration.ts` Wilson intervals) | Honest uncertainty |
| Concentration: top symbol % of P/L or notional | Portfolio hygiene |
| Undefined-risk or naked short flags when strategy label implies it | Aligns with brief hard law on small accounts |
| Fees as % of gross P/L | Cost awareness |
| Re-entry after large loss within N days (tilt proxy) | Behavioral process |
| Missing journal link for large RH P/L swings | Data completeness |
| “Import stale: last batch older than X days” | Operational hygiene |

**Copy pattern:** “In your history, N of M closed trades lack a planned loss limit.” — not “You should buy/sell X.”

### DANGEROUS (advice overclaim) — forbid or heavily fence
| Insight / feature | Why dangerous | Safer alternative |
|-------------------|---------------|-------------------|
| “Buy this next” / auto pick list from RH history | Personalized investment advice | Manual Trade Lab + educational frames |
| “You’ll hit $25k by date Y” from past P/L | Forward performance claim | Capital ladder as **targets**, not forecasts |
| Guaranteed PoP from imported trades | Model abuse | Keep model PoP only with assumptions + estimate labels |
| “RH is wrong; move brokers” or ToS-violating automation | Legal / scope | Out of product scope |
| Silent rewriting of historical P/L to “fix” stats | Integrity | Immutable imports; corrections as new events |
| Margin / PDT / tax advice as certainty | Regulated domains | Link to education; “verify with official docs / CPA” |
| Claiming affiliation with Robinhood | Trademark / fraud | Existing README disclaimer |

### Presentation rules for fix list
1. Always attach **sample size** and confidence bounds where rates are shown (reuse journal calibration mindset).  
2. Label **estimates** vs **recorded history**.  
3. No auto-trade from insights.  
4. Prefer **questions and checklists** (“Did this trade have a defined max loss?”) over directives.  
5. Align with companion hard laws: educational, human executes, small-account defined-risk bias.

---

## 6. Checklist for implementers

### Product / UX
- [ ] Import entry point labeled **Import export / paste** — never “Login to Robinhood” or password form  
- [ ] On-screen statement: **never asks for Robinhood password**  
- [ ] Review-and-confirm step before DB write (show row counts, date range, symbols)  
- [ ] Idempotent re-import messaging  
- [ ] Disclaimers: not RH-affiliated; not investment advice; no auto-trade  

### Parser / API
- [ ] Accept **CSV / TSV / paste only** in v1 (no `.xlsm`, no arbitrary ZIP)  
- [ ] Enforce size + row caps; reject oversize with generic error  
- [ ] No formula evaluation; neutralize spreadsheet injection if re-exporting  
- [ ] Server sets `user_id` from auth only  
- [ ] Never persist raw file by default (`raw_discarded = true`)  
- [ ] Store `content_sha256` + `parser_version`  
- [ ] Truncate free-text description fields  

### Data / schema
- [ ] New tables under RLS owner policies matching `trades` pattern  
- [ ] Optional link `rh_closed_trades.linked_trade_id` → `trades`  
- [ ] Do **not** fabricate `ForecastSnapshot` for pure imports  
- [ ] Do **not** allow client patch of `forecast` on linked trades  
- [ ] Migration applied only on personal Supabase project until multi-tenant review  

### Secrets / deps / CI
- [ ] No new RH unofficial packages in `package.json`  
- [ ] No RH credentials in `.env.example` or docs samples  
- [ ] Grep gate: `robinhood.*password|rh_password|robinhood-node|robinhoodunofficial` fail CI  
- [ ] Keep `MARKET_DATA_*` / `SUPABASE_SERVICE_ROLE_KEY` server-only (existing rule)  
- [ ] Logs: no full CSV bodies; redact symbols optional for shared debug dumps  

### Insights / brain
- [ ] Fix list uses **process metrics** only (§5 safe list)  
- [ ] Rates show n + uncertainty; no performance guarantees  
- [ ] External LLM: send aggregates / redacted summaries only, not raw exports  
- [ ] No order placement hooks from import data  

### Personal ops (Michael)
- [ ] BitLocker (or equivalent) on  
- [ ] Export CSVs deleted or moved off cloud-sync after import  
- [ ] Single trusted browser profile for companion  
- [ ] Supabase dashboard access limited to owner  

### Verification tests (minimum)
- [ ] Upload without auth → 401  
- [ ] Upload as user A cannot read user B batches (RLS)  
- [ ] Oversized file rejected  
- [ ] CSV cell starting with `=CMD` stored as text, never executed  
- [ ] Duplicate SHA → no double insert  
- [ ] UI snapshot / e2e: no password input in import flow  
- [ ] `updateTrade` still cannot overwrite `forecast`  

---

## Verdict

| Question | Answer |
|----------|--------|
| Is there a secure path for the personal companion to see RH history? | **Yes** — official export / CSV / manual paste only |
| May the app request or store Robinhood passwords? | **No — never** |
| Unofficial RH APIs? | **No — forbidden** |
| Fit with existing journal + RLS? | **Yes** — import tables as provenance; optional link to `trades` / `cash_events` |
| Multi-tenant / public SaaS? | **Out of scope** — re-threat-model before any shared deployment |
| Fix-list product risk? | **Manageable** if limited to process metrics with sample honesty |

**Secure personal import design: APPROVED** for implementation under this document.  
Any broker OAuth, unofficial API, password field, or multi-tenant share of import tables is a **new design** and requires a new security review.

---

## Appendix A — Mapping to companion brief

| Brief requirement | Security stance |
|-------------------|-----------------|
| Robinhood account data in | Manual export path only |
| Flag what to fix | Process metrics (§5); no advice overclaim |
| Never steal RH password | Hard forbid + UX + CI |
| No unofficial reverse-engineered RH login | Hard forbid + dependency policy |
| Educational companion | Insights language + disclaimers |
| No auto-trade | Import never feeds order APIs |

## Appendix B — Future (not approved now)

If Robinhood (or a licensed intermediary) offers **official OAuth / API** suitable for read-only history:
1. New threat model (token storage, refresh, revocation, scopes).  
2. Secrets in OS keychain or server vault — not `localStorage`.  
3. Read-only scopes only; still no auto-trade.  
4. Re-run implementer checklist + pen-test of OAuth redirect.  

Until then, **CSV/paste remains the only approved path.**
