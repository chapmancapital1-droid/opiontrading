// @ts-nocheck — embedded working-demo component (its own inline JS engine).
// The typed, unit-tested engine lives in src/domain/*; rewiring this UI to
// call it is tracked as follow-up. Kept as-is here to wire the page live.
"use client";
import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, ReferenceLine, ReferenceDot, ResponsiveContainer, Tooltip, BarChart, Bar, Cell } from "recharts";
import { dataClient } from "@/data/client";
import MarketContextPanel from "@/components/MarketContextPanel";
import BrainRecommendPanel from "@/components/BrainRecommendPanel";
import { pickPreferredExpiration } from "@/brain";

/* ============================================================================
   OptionScope — Strategy Builder + Analysis Results (working demo)
   This React component embeds simplified but faithful versions of the engine
   from Messages 1-3 so you can click through a real analysis. In the Next.js
   repo these call the tested modules in src/domain/* instead of local copies.
   ============================================================================ */

// ---- engine (mirrors src/domain/payoff.ts + montecarlo.ts, JS form) ----
const optEntry = (l) => (l.side === "long" ? -1 : 1) * l.prem * l.qty * 100 - l.fees;
const stkEntry = (l) => (l.side === "long" ? -1 : 1) * l.entry * l.shares - l.fees;
const optExpiry = (l, s) => {
  const intr = l.type === "call" ? Math.max(s - l.strike, 0) : Math.max(l.strike - s, 0);
  return (l.side === "long" ? 1 : -1) * intr * l.qty * 100;
};
const stkExpiry = (l, s) => (l.side === "long" ? 1 : -1) * s * l.shares;
function plAt(legs, s) {
  let t = 0;
  for (const l of legs) t += l.kind === "opt" ? optEntry(l) + optExpiry(l, s) : stkEntry(l) + stkExpiry(l, s);
  return t;
}
function netCash(legs) {
  return legs.reduce((t, l) => t + (l.kind === "opt" ? optEntry(l) : stkEntry(l)), 0);
}
function tailSlopes(legs) {
  let lower = 0, upper = 0;
  for (const l of legs) {
    if (l.kind === "stk") { const s = (l.side === "long" ? 1 : -1) * l.shares; lower += s; upper += s; }
    else { const sz = l.qty * 100, d = l.side === "long" ? 1 : -1; if (l.type === "call") upper += d * sz; else lower += d * -1 * sz; }
  }
  return { lower, upper };
}
function bps(legs) { return [...new Set(legs.map((l) => (l.kind === "opt" ? l.strike : l.entry)))].sort((a, b) => a - b); }
function bisect(f, a, b) { let lo = a, hi = b, fl = f(lo); for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2, fm = f(m); if (fm === 0 || (hi - lo) / 2 < 1e-9) return m; if (Math.sign(fm) === Math.sign(fl)) { lo = m; fl = fm; } else hi = m; } return (lo + hi) / 2; }
function breakEvens(legs) {
  const b = bps(legs); if (!b.length) return [];
  const lo0 = Math.min(...b), hi0 = Math.max(...b), { lower, upper } = tailSlopes(legs);
  const probe = Math.max(Math.abs(plAt(legs, lo0)), Math.abs(plAt(legs, hi0)), 1);
  const ru = upper !== 0 ? probe / Math.abs(upper) + 5 : 0, rd = lower !== 0 ? probe / Math.abs(lower) + 5 : 0;
  const span = Math.max(hi0 - lo0, 1), start = Math.max(0, lo0 - rd - span), end = hi0 + ru + span;
  const grid = []; for (let i = 0; i <= 800; i++) grid.push(start + ((end - start) * i) / 800);
  const f = (x) => plAt(legs, x), roots = [];
  for (let i = 1; i < grid.length; i++) { const y0 = f(grid[i - 1]), y1 = f(grid[i]); if (y0 === 0) roots.push(grid[i - 1]); else if (Math.sign(y0) !== Math.sign(y1)) roots.push(bisect(f, grid[i - 1], grid[i])); }
  const out = []; for (const r of roots.sort((a, b) => a - b)) if (!out.some((v) => Math.abs(v - r) < 0.01)) out.push(Number(r.toFixed(2)));
  return out;
}
function extrema(legs) {
  const { upper } = tailSlopes(legs), b = bps(legs);
  const pts = new Set([0, ...b, (b.length ? Math.max(...b) : 100) * 3 + 100]);
  let mx = -Infinity, mn = Infinity;
  for (const x of pts) { const y = plAt(legs, x); if (y > mx) mx = y; if (y < mn) mn = y; }
  return { maxProfit: upper > 0 ? "unlimited" : Number(mx.toFixed(2)), maxLoss: upper < 0 ? "undefined" : Number(mn.toFixed(2)), unlimitedUp: upper > 0, unlimitedDown: upper < 0 };
}
// seeded RNG + normal
function mulberry32(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function makeNormal(u) { let sp = null; return () => { if (sp !== null) { const v = sp; sp = null; return v; } let x, y, s; do { x = u() * 2 - 1; y = u() * 2 - 1; s = x * x + y * y; } while (s === 0 || s >= 1); const m = Math.sqrt((-2 * Math.log(s)) / s); sp = y * m; return x * m; }; }
function monteCarlo(legs, spot, t, sigma, r, q, driftMode, userDrift, sims, seed) {
  const u = mulberry32(seed), norm = makeNormal(u);
  const mu = driftMode === "rn" ? r - q : userDrift;
  const drift = (mu - 0.5 * sigma * sigma) * t, vol = sigma * Math.sqrt(t);
  const pls = new Float64Array(sims); let win = 0, loss = 0, sum = 0;
  for (let i = 0; i < sims; i++) { const sT = spot * Math.exp(drift + vol * norm()); const pl = plAt(legs, sT); pls[i] = pl; sum += pl; if (pl > 0) win++; else if (pl < 0) loss++; }
  const pp = win / sims, pl2 = loss / sims, ev = sum / sims;
  const sorted = Array.from(pls).sort((a, b) => a - b);
  const pct = (qq) => { const idx = (sorted.length - 1) * qq, lo = Math.floor(idx), hi = Math.ceil(idx); return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo); };
  const se = Math.sqrt((pp * (1 - pp)) / sims);
  const lo = pct(0.01), hi = pct(0.99), width = (hi - lo) / 30 || 1;
  const hist = Array.from({ length: 30 }, (_, k) => ({ x: lo + k * width + width / 2, count: 0 }));
  for (const v of pls) { let idx = Math.floor((v - lo) / width); idx = Math.max(0, Math.min(29, idx)); hist[idx].count++; }
  return { pp, pl: pl2, ev, median: pct(0.5), p5: pct(0.05), p95: pct(0.95), se, ci: [Math.max(0, pp - 1.96 * se), Math.min(1, pp + 1.96 * se)], hist, muUsed: mu };
}

const usd = (n) => (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 2 });
const pct1 = (f) => (f * 100).toFixed(1) + "%";

// ---- strategy templates (must cover every brain strategyId for "Load in builder") ----
const TEMPLATES = {
  bull_call_debit: { name: "Bull call debit spread", legs: (S) => [
    { kind: "opt", side: "long", type: "call", qty: 1, strike: round5(S), prem: 6.2, fees: 0 },
    { kind: "opt", side: "short", type: "call", qty: 1, strike: round5(S) + 10, prem: 3.1, fees: 0 },
  ]},
  bear_put_debit: { name: "Bear put debit spread", legs: (S) => [
    { kind: "opt", side: "long", type: "put", qty: 1, strike: round5(S), prem: 6.0, fees: 0 },
    { kind: "opt", side: "short", type: "put", qty: 1, strike: round5(S) - 10, prem: 3.0, fees: 0 },
  ]},
  bull_put_credit: { name: "Bull put credit spread", legs: (S) => [
    { kind: "opt", side: "short", type: "put", qty: 1, strike: round5(S) - 5, prem: 1.8, fees: 0 },
    { kind: "opt", side: "long", type: "put", qty: 1, strike: round5(S) - 15, prem: 0.6, fees: 0 },
  ]},
  bear_call_credit: { name: "Bear call credit spread", legs: (S) => [
    { kind: "opt", side: "short", type: "call", qty: 1, strike: round5(S) + 5, prem: 1.7, fees: 0 },
    { kind: "opt", side: "long", type: "call", qty: 1, strike: round5(S) + 15, prem: 0.55, fees: 0 },
  ]},
  covered_call: { name: "Covered call", legs: (S) => [
    { kind: "stk", side: "long", shares: 100, entry: round5(S), fees: 0 },
    { kind: "opt", side: "short", type: "call", qty: 1, strike: round5(S) + 5, prem: 2.5, fees: 0 },
  ]},
  cash_secured_put: { name: "Cash-secured put", legs: (S) => [
    { kind: "opt", side: "short", type: "put", qty: 1, strike: round5(S) - 5, prem: 2.0, fees: 0 },
  ]},
  long_straddle: { name: "Long straddle", legs: (S) => [
    { kind: "opt", side: "long", type: "call", qty: 1, strike: round5(S), prem: 4.0, fees: 0 },
    { kind: "opt", side: "long", type: "put", qty: 1, strike: round5(S), prem: 3.5, fees: 0 },
  ]},
  iron_condor: { name: "Iron condor", legs: (S) => [
    { kind: "opt", side: "long", type: "put", qty: 1, strike: round5(S) - 15, prem: 0.5, fees: 0 },
    { kind: "opt", side: "short", type: "put", qty: 1, strike: round5(S) - 10, prem: 1.2, fees: 0 },
    { kind: "opt", side: "short", type: "call", qty: 1, strike: round5(S) + 10, prem: 1.1, fees: 0 },
    { kind: "opt", side: "long", type: "call", qty: 1, strike: round5(S) + 15, prem: 0.4, fees: 0 },
  ]},
  long_call: { name: "Long call", legs: (S) => [
    { kind: "opt", side: "long", type: "call", qty: 1, strike: round5(S), prem: 5.0, fees: 0 },
  ]},
  long_put: { name: "Long put", legs: (S) => [
    { kind: "opt", side: "long", type: "put", qty: 1, strike: round5(S), prem: 4.8, fees: 0 },
  ]},
};
function round5(x) { return Math.round(x / 5) * 5; }

export default function OptionScopeBuilder() {
  const [tpl, setTpl] = useState("bull_call_debit");
  const [spot, setSpot] = useState(500);
  const [sigma, setSigma] = useState(0.30);
  const [dte, setDte] = useState(30);
  const [rate, setRate] = useState(0.045);
  const [divYield, setDivYield] = useState(0.005);
  const [driftMode, setDriftMode] = useState("rn");
  const [userDrift, setUserDrift] = useState(0.08);
  const [sims, setSims] = useState(20000);
  const [seed, setSeed] = useState(12345);

  // ---- Phase 2: live data. Load a real chain and analyze listed contracts. ----
  const [ticker, setTicker] = useState("");
  const [live, setLive] = useState(null);       // { chain:[{strike,type,mark,iv}], expiry, source, freshness }
  const [expiries, setExpiries] = useState([]);
  const [expiry, setExpiry] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState("");
  // Brain Phase 4.1/5: when user loads a recommendation, pin the exact legs scored by the engine
  const [brainLegs, setBrainLegs] = useState(null); // builder-format legs or null
  const [brainNote, setBrainNote] = useState("");

  async function loadLive(exp) {
    const t = ticker.trim().toUpperCase().split(":").pop();
    if (!t) return;
    setLoading(true); setLoadErr("");
    setBrainLegs(null); setBrainNote("");
    try {
      const q = await dataClient.quote(t);
      const spotVal = Number(q.quote.price.toFixed(2));
      setSpot(spotVal);
      let useExp = exp;
      if (!useExp) {
        const ex = await dataClient.expirations(t);
        const list = ex.expirations || [];
        setExpiries(list);
        const pick = pickPreferredExpiration(list, { minDte: 7, maxDte: 45 });
        useExp = pick?.expiration || list[0] || "";
        setExpiry(useExp);
      }
      if (!useExp) { setLive(null); setLoadErr("No listed expirations for " + t); return; }
      const { chain, status } = await dataClient.chain(t, useExp);
      const rows = chain.quotes.map((c) => ({ strike: c.contract.strike, type: c.contract.optionType, mark: c.mark, iv: c.impliedVol }));
      const withIv = rows.filter((r) => r.iv != null);
      if (withIv.length) {
        const atm = withIv.reduce((b, c) => Math.abs(c.strike - spotVal) < Math.abs(b.strike - spotVal) ? c : b);
        if (atm.iv) setSigma(Number(atm.iv.toFixed(4)));
      }
      setDte(Math.max(1, Math.round((new Date(useExp).getTime() - Date.now()) / 86400000)));
      setLive({ chain: rows, expiry: useExp, source: status.usingDemoFallback ? "demo" : status.id, freshness: q.quote.meta.freshness });
    } catch (e) {
      setLive(null); setLoadErr((e && e.message) || "Failed to load live data");
    } finally {
      setLoading(false);
    }
  }

  // Prefer brain-instantiated legs (exact engine structure); else template + live snap.
  const legs = useMemo(() => {
    if (brainLegs && brainLegs.length) return brainLegs;
    const base = TEMPLATES[tpl].legs(spot);
    if (!live || !live.chain || !live.chain.length) return base;
    return base.map((l) => {
      if (l.kind !== "opt") return l;
      const cands = live.chain.filter((c) => c.type === l.type && c.mark != null);
      if (!cands.length) return l;
      const near = cands.reduce((b, c) => Math.abs(c.strike - l.strike) < Math.abs(b.strike - l.strike) ? c : b);
      return { ...l, strike: near.strike, prem: near.mark };
    });
  }, [tpl, spot, live, brainLegs]);

  const analysis = useMemo(() => {
    const net = netCash(legs);
    const be = breakEvens(legs);
    const ex = extrema(legs);
    const mc = monteCarlo(legs, spot, dte / 365, sigma, rate, divYield, driftMode, userDrift, sims, seed);
    return { net, be, ex, mc };
  }, [legs, spot, sigma, dte, rate, divYield, driftMode, userDrift, sims, seed]);

  const chartData = useMemo(() => {
    const b = bps(legs); const lo = Math.max(0, Math.min(...b) * 0.85), hi = Math.max(...b) * 1.15;
    const out = []; for (let i = 0; i <= 60; i++) { const x = lo + ((hi - lo) * i) / 60; out.push({ x: Number(x.toFixed(2)), pl: Number(plAt(legs, x).toFixed(2)) }); }
    return out;
  }, [legs]);

  const { net, be, ex, mc } = analysis;
  const blocked = ex.unlimitedDown && !legs.some((l) => l.kind === "stk");

  const card = { background: "var(--surface-2)", border: "0.5px solid var(--border)", borderRadius: 12, padding: "1rem 1.25rem" };
  const metric = { background: "var(--surface-1)", borderRadius: 8, padding: "0.75rem 1rem" };
  const mlabel = { fontSize: 13, color: "var(--text-secondary)", margin: 0 };
  const mval = { fontSize: 22, fontWeight: 500, margin: "2px 0 0", color: "var(--text-primary)" };

  return (
    <div style={{ padding: "1rem 0", fontFamily: "var(--font-sans)", color: "var(--text-primary)", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <h2 className="sr-only">OptionScope strategy builder and analysis results</h2>

      {/* Controls */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 16, fontWeight: 500 }}>Strategy builder</span>
          <span style={{ fontSize: 12, color: live ? "var(--text-success)" : "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
            <i className="ti ti-clock" aria-hidden="true" />
            {live ? `Live · ${live.source} · ${live.freshness} · exp ${live.expiry}` : "Demo prices — load a symbol for live contracts"}
          </span>
        </div>

        {/* Live data loader (Phase 2) */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <input
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") loadLive(""); }}
            placeholder="Ticker e.g. AAPL"
            aria-label="Ticker"
            style={{ fontSize: 13, padding: "6px 10px", borderRadius: 8, border: "0.5px solid var(--border)", background: "var(--surface-1)", color: "var(--text-primary)", width: 140 }}
          />
          <button
            onClick={() => loadLive("")}
            disabled={loading || !ticker.trim()}
            style={{ fontSize: 13, padding: "6px 12px", borderRadius: 8, cursor: "pointer", border: "0.5px solid var(--border-accent)", background: "var(--bg-accent)", color: "var(--text-accent)", opacity: loading || !ticker.trim() ? 0.6 : 1 }}
          >
            {loading ? "Loading…" : "Load live chain"}
          </button>
          {expiries.length > 0 && (
            <select
              value={expiry}
              onChange={(e) => { setExpiry(e.target.value); loadLive(e.target.value); }}
              aria-label="Expiration"
              style={{ fontSize: 13, padding: "6px 10px", borderRadius: 8, border: "0.5px solid var(--border)", background: "var(--surface-1)", color: "var(--text-primary)" }}
            >
              {expiries.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          )}
          {live && <button onClick={() => { setLive(null); setLoadErr(""); }} style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, cursor: "pointer", border: "0.5px solid var(--border)", background: "transparent", color: "var(--text-secondary)" }}>Use demo</button>}
          {loadErr && <span style={{ fontSize: 12, color: "var(--text-danger)" }}>{loadErr}</span>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          <Field label="Strategy">
            <select value={tpl} onChange={(e) => setTpl(e.target.value)} style={{ width: "100%" }}>
              {Object.entries(TEMPLATES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
            </select>
          </Field>
          <Field label={`Underlying price: $${spot}`}><input type="range" min="50" max="700" step="5" value={spot} onChange={(e) => setSpot(+e.target.value)} style={{ width: "100%" }} /></Field>
          <Field label={`Implied vol: ${(sigma * 100).toFixed(0)}%`}><input type="range" min="0.05" max="1.2" step="0.01" value={sigma} onChange={(e) => setSigma(+e.target.value)} style={{ width: "100%" }} /></Field>
          <Field label={`Days to expiry: ${dte}`}><input type="range" min="1" max="180" step="1" value={dte} onChange={(e) => setDte(+e.target.value)} style={{ width: "100%" }} /></Field>
        </div>
      </div>

      {/* Phase 3: live quantitative market context for the loaded ticker */}
      {live && ticker.trim() && <MarketContextPanel symbol={ticker} />}

      {/* Phase 4.1: trading brain — selector + live-chain instantiation + engine PoP/EV */}
      {live && ticker.trim() && (
        <BrainRecommendPanel
          symbol={ticker}
          preferredExpiration={expiry || undefined}
          onSelectStrategy={(payload) => {
            const id = typeof payload === "string" ? payload : payload.strategyId;
            if (TEMPLATES[id]) setTpl(id);
            else setLoadErr(`No builder template for strategy "${id}" — structure still applied if legs provided.`);

            // Prefer exact engine legs when provided (domain → builder shape)
            const domainLegs = typeof payload === "object" ? payload.legs : null;
            if (domainLegs && domainLegs.length) {
              const mapped = domainLegs.map((l) => {
                if (l.assetType === "stock") {
                  return { kind: "stk", side: l.side, shares: l.shares, entry: l.entryPrice, fees: l.feesTotal || 0 };
                }
                return {
                  kind: "opt",
                  side: l.side,
                  type: l.optionType,
                  qty: l.contracts,
                  strike: l.strike,
                  prem: l.premiumPerShare,
                  fees: l.feesTotal || 0,
                };
              });
              setBrainLegs(mapped);
              setBrainNote(typeof payload === "object" ? (payload.legsNote || payload.name || id) : id);
              if (typeof payload === "object" && payload.expiration) {
                setExpiry(payload.expiration);
                setDte(Math.max(1, Math.round((new Date(payload.expiration).getTime() - Date.now()) / 86400000)));
              }
            } else {
              setBrainLegs(null);
              setBrainNote("");
            }
          }}
        />
      )}

      {brainNote && (
        <div style={{ ...card, fontSize: 13, color: "var(--text-secondary)" }}>
          Brain structure locked: <strong>{brainNote}</strong>
          {" · "}
          <button
            type="button"
            onClick={() => { setBrainLegs(null); setBrainNote(""); }}
            style={{ fontSize: 12, cursor: "pointer", border: "0.5px solid var(--border)", borderRadius: 6, padding: "2px 8px", background: "transparent", color: "var(--text-accent)" }}
          >
            Clear · use template snap
          </button>
        </div>
      )}

      {blocked && (
        <div style={{ ...card, background: "var(--bg-danger)", borderColor: "var(--border-danger)" }}>
          <span style={{ color: "var(--text-danger)", fontSize: 14, display: "flex", gap: 8, alignItems: "center" }}>
            <i className="ti ti-alert-triangle" aria-hidden="true" /> Undefined-risk position. Blocked in Robinhood companion mode — available only in the labeled educational sandbox.
          </span>
        </div>
      )}

      {/* Key metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <Metric label={net < 0 ? "Net debit" : "Net credit"} value={usd(Math.abs(net))} m={metric} l={mlabel} v={mval} />
        <Metric label="Max profit" value={ex.maxProfit === "unlimited" ? "Unlimited" : usd(ex.maxProfit)} m={metric} l={mlabel} v={{ ...mval, color: "var(--text-success)" }} />
        <Metric label="Max loss" value={ex.maxLoss === "undefined" ? "Undefined" : usd(ex.maxLoss)} m={metric} l={mlabel} v={{ ...mval, color: "var(--text-danger)" }} />
        <Metric label="Break-even(s)" value={be.length ? be.map((x) => "$" + x).join(", ") : "—"} m={metric} l={mlabel} v={{ ...mval, fontSize: 18 }} />
      </div>

      {/* Payoff chart */}
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Expiration payoff</div>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
              <XAxis dataKey="x" tick={{ fontSize: 11, fill: "var(--text-muted)" }} tickFormatter={(v) => "$" + v} />
              <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} tickFormatter={(v) => (v < 0 ? "-$" : "$") + Math.abs(v)} width={54} />
              <Tooltip formatter={(v) => usd(v)} labelFormatter={(v) => "Price $" + v} contentStyle={{ fontSize: 12, borderRadius: 8, border: "0.5px solid var(--border)" }} />
              <ReferenceLine y={0} stroke="var(--border-strong)" />
              <ReferenceLine x={round5(spot)} stroke="#378add" strokeDasharray="4 3" label={{ value: "spot", fontSize: 10, fill: "#378add" }} />
              {be.map((b) => <ReferenceDot key={b} x={b} y={0} r={4} fill="#eda100" stroke="none" />)}
              <Line type="monotone" dataKey="pl" stroke="#1d9e75" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
          Green line = P/L at expiration. Blue dash = current price. Amber dots = break-even(s).
        </div>
      </div>

      {/* Probability panel */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>Probability &amp; expected value</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setDriftMode("rn")} style={pill(driftMode === "rn")}>Market-implied</button>
            <button onClick={() => setDriftMode("user")} style={pill(driftMode === "user")}>User assumption</button>
          </div>
        </div>

        {driftMode === "user" && (
          <div style={{ marginBottom: 12 }}>
            <Field label={`Expected annual return: ${(userDrift * 100).toFixed(0)}%`}>
              <input type="range" min="-0.3" max="0.5" step="0.01" value={userDrift} onChange={(e) => setUserDrift(+e.target.value)} style={{ width: "100%" }} />
            </Field>
            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "4px 0 0" }}>Changing expected return materially changes the probability. This is your view, not a forecast.</p>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 12 }}>
          <Metric label="Prob. of profit" value={pct1(mc.pp)} m={metric} l={mlabel} v={{ ...mval, color: "var(--text-success)" }} />
          <Metric label="Prob. of loss" value={pct1(mc.pl)} m={metric} l={mlabel} v={{ ...mval, color: "var(--text-danger)" }} />
          <Metric label="Expected P/L" value={usd(mc.ev)} m={metric} l={mlabel} v={{ ...mval, color: mc.ev >= 0 ? "var(--text-success)" : "var(--text-danger)" }} />
          <Metric label="Median outcome" value={usd(mc.median)} m={metric} l={mlabel} v={mval} />
        </div>

        <div style={{ fontSize: 12, color: "var(--text-secondary)", background: "var(--surface-1)", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
          <i className="ti ti-target-arrow" aria-hidden="true" style={{ marginRight: 6 }} />
          95% confidence interval on prob. of profit: <strong>{pct1(mc.ci[0])} – {pct1(mc.ci[1])}</strong> (±{(mc.se * 196).toFixed(1)} pts) at {sims.toLocaleString()} sims, seed {seed}.
          <span style={{ display: "block", marginTop: 4, color: "var(--text-muted)" }}>5th pct: {usd(mc.p5)} · 95th pct: {usd(mc.p95)}. GBM, fixed volatility — real markets differ.</span>
        </div>

        <div style={{ width: "100%", height: 140 }}>
          <ResponsiveContainer>
            <BarChart data={mc.hist} margin={{ top: 4, right: 8, bottom: 0, left: 4 }}>
              <XAxis dataKey="x" tick={{ fontSize: 10, fill: "var(--text-muted)" }} tickFormatter={(v) => "$" + Math.round(v)} />
              <YAxis hide />
              <ReferenceLine x={0} stroke="var(--border-strong)" />
              <Tooltip formatter={(v) => v + " sims"} labelFormatter={(v) => "≈ " + usd(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="count">
                {mc.hist.map((d, i) => <Cell key={i} fill={d.x >= 0 ? "#1d9e75" : "#e24b4a"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Monte Carlo outcome distribution. Green = profit, red = loss.</div>
      </div>

      {/* Simulation controls */}
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Model assumptions</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          <Field label={`Risk-free rate: ${(rate * 100).toFixed(1)}%`}><input type="range" min="0" max="0.1" step="0.001" value={rate} onChange={(e) => setRate(+e.target.value)} style={{ width: "100%" }} /></Field>
          <Field label={`Dividend yield: ${(divYield * 100).toFixed(1)}%`}><input type="range" min="0" max="0.06" step="0.001" value={divYield} onChange={(e) => setDivYield(+e.target.value)} style={{ width: "100%" }} /></Field>
          <Field label={`Simulations: ${sims.toLocaleString()}`}><input type="range" min="1000" max="50000" step="1000" value={sims} onChange={(e) => setSims(+e.target.value)} style={{ width: "100%" }} /></Field>
          <Field label={`Seed: ${seed}`}><input type="number" value={seed} onChange={(e) => setSeed(+e.target.value || 0)} style={{ width: "100%" }} /></Field>
        </div>
      </div>

      {/* Persistent disclosure */}
      <div style={{ ...card, background: "var(--bg-warning)", borderColor: "var(--border-warning)" }}>
        <p style={{ fontSize: 12, color: "var(--text-warning)", margin: 0, lineHeight: 1.6 }}>
          <strong>Options involve significant risk.</strong> You can lose your full premium and, for some strategies, more. Probabilities are model estimates based on the assumptions shown, not guarantees. Volatility, liquidity, rates, and prices change. Simulated results are not actual results. This is not personalized investment, legal, or tax advice. Not affiliated with or endorsed by Robinhood.
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <div><label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>{label}</label>{children}</div>;
}
function Metric({ label, value, m, l, v }) {
  return <div style={m}><p style={l}>{label}</p><p style={v}>{value}</p></div>;
}
function pill(active) {
  return { fontSize: 12, padding: "4px 10px", borderRadius: 8, cursor: "pointer", border: active ? "0.5px solid var(--border-accent)" : "0.5px solid var(--border)", background: active ? "var(--bg-accent)" : "transparent", color: active ? "var(--text-accent)" : "var(--text-secondary)" };
}
