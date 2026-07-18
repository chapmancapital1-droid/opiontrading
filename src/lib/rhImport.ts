/**
 * Robinhood official export / paste parser — personal empire only.
 * Never accepts passwords. Best-effort CSV + free-text line parse.
 */

export interface RhImportRow {
  symbol: string;
  side: string;
  qty: number;
  price: number | null;
  amount: number | null;
  date: string | null;
  raw: string;
  kind: "order" | "position" | "unknown";
}

export interface RhImportResult {
  rows: RhImportRow[];
  errors: string[];
  summary: string;
  processHints: string[];
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      q = !q;
      continue;
    }
    if (c === "," && !q) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

/**
 * Parse RH-style activity CSV or simple paste:
 * SYMBOL,SIDE,QTY,PRICE,DATE
 * or free lines: "BOT 1 AAPL 190 Call 3.50"
 */
export function parseRhPaste(text: string): RhImportResult {
  const errors: string[] = [];
  const rows: RhImportRow[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  if (!lines.length) {
    return {
      rows: [],
      errors: ["Empty paste — export activity/positions from Robinhood and paste CSV or lines."],
      summary: "No rows",
      processHints: [],
    };
  }

  // Cap size (security)
  if (text.length > 500_000) {
    return {
      rows: [],
      errors: ["Paste too large (max 500KB). Split the export."],
      summary: "Rejected",
      processHints: [],
    };
  }

  const header = splitCsvLine(lines[0]!).map((h) => h.toLowerCase());
  const looksCsv =
    header.some((h) => h.includes("symbol") || h.includes("instrument")) ||
    header.includes("side") ||
    header.includes("quantity");

  if (looksCsv && lines.length > 1) {
    const idx = (names: string[]) => header.findIndex((h) => names.some((n) => h.includes(n)));
    const iSym = idx(["symbol", "instrument", "ticker"]);
    const iSide = idx(["side", "trans", "type"]);
    const iQty = idx(["quantity", "qty", "filled"]);
    const iPrice = idx(["price", "avg", "notional"]);
    const iDate = idx(["date", "time", "entered"]);
    for (let li = 1; li < lines.length; li++) {
      const cols = splitCsvLine(lines[li]!);
      const symbol = String(iSym >= 0 ? cols[iSym] ?? "" : cols[0] ?? "")
        .toUpperCase()
        .replace(/[^A-Z0-9.]/g, "");
      if (!symbol || symbol.length > 12) continue;
      const qty = Math.abs(Number(iQty >= 0 ? cols[iQty] : cols[2]) || 0);
      const priceRaw = iPrice >= 0 ? cols[iPrice] : cols[3];
      const price = priceRaw != null && priceRaw !== "" ? Number(String(priceRaw).replace(/[$,]/g, "")) : null;
      rows.push({
        symbol,
        side: String(iSide >= 0 ? cols[iSide] ?? "" : cols[1] ?? ""),
        qty: Number.isFinite(qty) ? qty : 0,
        price: price != null && Number.isFinite(price) ? price : null,
        amount: price != null && qty ? price * qty : null,
        date: iDate >= 0 ? cols[iDate] || null : null,
        raw: lines[li]!,
        kind: "order",
      });
    }
  } else {
    for (const line of lines) {
      const m = line.match(
        /\b([A-Z]{1,5})\b.*?\b(\d+(?:\.\d+)?)\b.*?(call|put|share)?/i
      );
      if (!m) {
        errors.push(`Unparsed line: ${line.slice(0, 80)}`);
        continue;
      }
      rows.push({
        symbol: m[1]!.toUpperCase(),
        side: /sell|sold|sld/i.test(line) ? "sell" : /buy|bot|bought/i.test(line) ? "buy" : "unknown",
        qty: Number(m[2]) || 0,
        price: null,
        amount: null,
        date: null,
        raw: line,
        kind: "unknown",
      });
    }
  }

  const processHints: string[] = [];
  if (rows.length && rows.every((r) => r.price == null)) {
    processHints.push("Prices missing — import still useful for symbols/frequency; add fills in journal.");
  }
  const buys = rows.filter((r) => /buy|bot/i.test(r.side)).length;
  const sells = rows.filter((r) => /sell|sld/i.test(r.side)).length;
  if (buys + sells > 0 && Math.abs(buys - sells) > buys) {
    processHints.push("Buy/sell imbalance in import — review open risk in Robinhood manually.");
  }
  processHints.push("Process check: did each fill have a prior OptionScope plan + checklist?");
  processHints.push("Never paste passwords. Official export/CSV only.");

  return {
    rows: rows.slice(0, 2000),
    errors: errors.slice(0, 20),
    summary: `Parsed ${rows.length} row(s)${errors.length ? `, ${errors.length} unparsed` : ""}.`,
    processHints,
  };
}

const RH_KEY = "optionscope.rhImport.v1";

/** Detect option-like activity lines (not equity share lots). */
function looksLikeOptionRow(row: RhImportRow): boolean {
  const blob = `${row.raw} ${row.side}`;
  // Explicit call/put without "shares" → option
  if (/\b(call|put|calls|puts)\b/i.test(blob) && !/\bshares?\b/i.test(blob)) return true;
  return false;
}

/**
 * Best-effort stock share inventory from import rows.
 * Skips pure option lines (call/put in raw). Buy/bot add; sell/sld subtract; floor 0.
 * Used for gates (e.g. covered-call share check) — not live broker truth / not equity.
 */
export function rowsToSharesHeld(rows: RhImportRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const sym = (r.symbol || "").toUpperCase().replace(/[^A-Z0-9.]/g, "");
    if (!sym) continue;
    if (looksLikeOptionRow(r)) continue;
    const q = Number(r.qty);
    if (!Number.isFinite(q) || q === 0) continue;
    const signed = /sell|sld|sold/i.test(r.side) ? -Math.abs(q) : Math.abs(q);
    out[sym] = (out[sym] ?? 0) + signed;
  }
  for (const k of Object.keys(out)) {
    if ((out[k] ?? 0) <= 0) delete out[k];
  }
  return out;
}

/** Alias matching handoff naming (deriveSharesHeld). */
export const deriveSharesHeld = rowsToSharesHeld;

/**
 * Rough open-risk proxy when price present: sum |qty * price|.
 * Best-effort only — not true max-loss modeling; never invents prices.
 */
export function estimateOpenRiskProxy(rows: RhImportRow[]): number {
  let sum = 0;
  for (const r of rows) {
    if (r.price == null || !Number.isFinite(r.price) || !Number.isFinite(r.qty)) continue;
    sum += Math.abs(r.qty * r.price);
  }
  return Number(sum.toFixed(2));
}

export function saveRhImport(result: RhImportResult & { importedAt: string; sourceNote: string }): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(RH_KEY, JSON.stringify(result));
}

export function loadRhImport(): (RhImportResult & { importedAt?: string; sourceNote?: string }) | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(RH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
