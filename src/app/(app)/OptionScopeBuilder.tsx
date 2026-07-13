// @ts-nocheck — embedded working-demo component (its own inline JS engine).
// The typed, unit-tested engine lives in src/domain/*; rewiring this UI to
// call it is tracked as follow-up. Kept as-is here to wire the page live.
"use client";
import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, ReferenceLine, ReferenceDot, ResponsiveContainer, Tooltip, BarChart, Bar, Cell } from "recharts";
import { dataClient } from "@/data/client";
import MarketContextPanel from "@/components/MarketContextPanel";
import BrainRecommendPanel from "@/components/BrainRecommendPanel";
import { OrderChecklistCard } from "@/components/OrderChecklistCard";
import { pickPreferredExpiration } from "@/brain";
import { buildChecklist } from "@/lib/orderChecklist";
import { addJournalPlan } from "@/lib/localJournal";

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
      const chainSrc = status.chainSource || status.id || "demo";
      const quoteSrc = status.quoteSource || q.quote.meta.source || status.id;
      setLive({
        chain: rows,
        expiry: useExp,
        source: chainSrc,
        quoteSource: quoteSrc,
        freshness: q.quote.meta.freshness,
        fallback: !!status.usingDemoFallback,
        note: status.lastError
          ? `Options via backup (${chainSrc}). Primary: ${status.lastError}`
          : null,
      });
      if (status.usingDemoFallback) {
        setLoadErr(
          `Live equity OK (${quoteSrc}) · option board from ${chainSrc} (primary options feed unavailable — synthetic marks around live spot).`
        );
      } else {
        setLoadErr("");
      }
    } catch (e) {
      setLive(null);
      setLoadErr((e && e.message) || "Failed to load live data");
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

  // Domain-shaped legs for Robinhood checklist
  const domainLegs = useMemo(() => {
    return legs.map((l) => {
      if (l.kind === "stk") {
        return {
          assetType: "stock",
          side: l.side,
          shares: l.shares,
          entryPrice: l.entry,
          feesTotal: l.fees || 0,
          quoteTimestamp: null,
        };
      }
      return {
        assetType: "option",
        side: l.side,
        optionType: l.type,
        contracts: l.qty,
        strike: l.strike,
        expiration: expiry || new Date(Date.now() + dte * 864e5).toISOString().slice(0, 10),
        premiumPerShare: l.prem,
        multiplier: 100,
        impliedVol: sigma,
        exerciseStyle: "american",
        feesTotal: l.fees || 0,
        quoteTimestamp: null,
      };
    });
  }, [legs, expiry, dte, sigma]);

  const checklist = useMemo(() => {
    const sym = (ticker.trim() || "DEMO").toUpperCase().split(":").pop();
    const perShare = net / 100;
    return buildChecklist({
      underlying: sym,
      strategyName: TEMPLATES[tpl]?.name || tpl,
      legs: domainLegs,
      netCashFlow: net,
      perShareNet: perShare,
      maxLoss: ex.maxLoss,
      collateral: null,
      breakEvens: be,
      quoteTimestamp: live?.freshness ? new Date().toISOString() : null,
      plannedProfitTarget: typeof ex.maxProfit === "number" ? ex.maxProfit * 0.5 : null,
      plannedLossLimit: typeof ex.maxLoss === "number" ? Math.abs(ex.maxLoss) : null,
    });
  }, [ticker, tpl, domainLegs, net, ex, be, live]);


  const dataBadge = live
    ? `${live.fallback ? "HYBRID" : "LIVE"} · quote ${live.quoteSource || live.source} · chain ${live.source} · ${live.freshness} · exp ${live.expiry}`
    : "DEMO · load a ticker for listed contracts";

  return (
    <div className="zone-cockpit flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="os-kicker">Trade Lab</div>
          <h1 className="text-2xl font-medium tracking-tight m-0">Builder + brain cockpit</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1 m-0">
            Analyze · Explain · Load · Checklist. Model estimates only. No auto-trade.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className={`os-badge ${live && !live.fallback ? "os-badge-ok" : live?.fallback ? "os-badge-warn" : ""}`}>
            {live ? (live.fallback ? "HYBRID CHAIN" : "LIVE CHAIN") : "DEMO"}
          </span>
          <span className="os-badge os-badge-accent">MODEL EST.</span>
          {brainNote && <span className="os-badge os-badge-warn">BRAIN LOCK</span>}
        </div>
      </header>

      {/* Dual rail: analysis | brain */}
      <div className="lab-layout">
        {/* LEFT RAIL */}
        <div className="flex flex-col gap-3 min-w-0">
          {/* Controls panel */}
          <section className="os-panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <span className="text-sm font-medium">Structure &amp; market</span>
              <span className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                <i className="ti ti-antenna" aria-hidden />
                {dataBadge}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 items-center mb-3">
              <input
                className="os-input w-36"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") loadLive(""); }}
                placeholder="Ticker e.g. AAPL"
                aria-label="Ticker"
              />
              <button
                type="button"
                className="os-btn os-btn-primary"
                onClick={() => loadLive("")}
                disabled={loading || !ticker.trim()}
              >
                {loading ? "Loading…" : "Load live chain"}
              </button>
              {expiries.length > 0 && (
                <select
                  className="os-input w-auto"
                  value={expiry}
                  onChange={(e) => { setExpiry(e.target.value); loadLive(e.target.value); }}
                  aria-label="Expiration"
                >
                  {expiries.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              )}
              {live && (
                <button type="button" className="os-btn" onClick={() => { setLive(null); setLoadErr(""); setBrainLegs(null); setBrainNote(""); }}>
                  Use demo
                </button>
              )}
              {loadErr && (
                <span
                  className={`text-xs ${live?.fallback ? "text-[var(--text-warning)]" : "text-[var(--text-danger)]"}`}
                >
                  {loadErr}
                </span>
              )}
            </div>

            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
              <label className="os-label">
                Strategy
                <select className="os-input mt-1" value={tpl} onChange={(e) => { setTpl(e.target.value); setBrainLegs(null); setBrainNote(""); }}>
                  {Object.entries(TEMPLATES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
                </select>
              </label>
              <label className="os-label">
                Spot ${spot}
                <input className="w-full mt-2" type="range" min="50" max="700" step="5" value={spot} onChange={(e) => setSpot(+e.target.value)} />
              </label>
              <label className="os-label">
                IV {(sigma * 100).toFixed(0)}%
                <input className="w-full mt-2" type="range" min="0.05" max="1.2" step="0.01" value={sigma} onChange={(e) => setSigma(+e.target.value)} />
              </label>
              <label className="os-label">
                DTE {dte}
                <input className="w-full mt-2" type="range" min="1" max="180" step="1" value={dte} onChange={(e) => setDte(+e.target.value)} />
              </label>
            </div>

            {brainNote && (
              <div className="os-well mt-3 px-3 py-2 text-xs text-[var(--text-secondary)] flex flex-wrap items-center justify-between gap-2">
                <span>Brain structure locked: <strong className="text-[var(--text-primary)]">{brainNote}</strong></span>
                <button type="button" className="os-btn text-xs py-1" onClick={() => { setBrainLegs(null); setBrainNote(""); }}>
                  Clear lock
                </button>
              </div>
            )}
          </section>

          {/* Legs table */}
          <section className="os-panel p-4">
            <div className="text-sm font-medium mb-2">Legs</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ fontVariantNumeric: "tabular-nums" }}>
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wide text-[var(--text-muted)] border-b" style={{ borderColor: "var(--border)" }}>
                    <th className="py-2 pr-2 font-medium">Type</th>
                    <th className="py-2 pr-2 font-medium">Side</th>
                    <th className="py-2 pr-2 font-medium">Strike / entry</th>
                    <th className="py-2 pr-2 font-medium">Qty</th>
                    <th className="py-2 font-medium">Mark</th>
                  </tr>
                </thead>
                <tbody>
                  {legs.map((l, i) => (
                    <tr key={i} className="border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                      <td className="py-2 pr-2">{l.kind === "opt" ? l.type : "stock"}</td>
                      <td className="py-2 pr-2">{l.side}</td>
                      <td className="py-2 pr-2 font-mono text-xs">{l.kind === "opt" ? `$${l.strike}` : `$${l.entry}`}</td>
                      <td className="py-2 pr-2">{l.kind === "opt" ? l.qty : l.shares}</td>
                      <td className="py-2 font-mono text-xs">{l.kind === "opt" ? `$${Number(l.prem).toFixed(2)}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {blocked && (
            <div className="os-panel p-3" style={{ background: "var(--bg-danger)", borderColor: "var(--border-danger)" }}>
              <span className="text-sm text-[var(--text-danger)] flex gap-2 items-center">
                <i className="ti ti-alert-triangle" aria-hidden />
                Undefined-risk position blocked in companion mode.
              </span>
            </div>
          )}

          {/* Metrics strip */}
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}>
            <div className="os-metric">
              <div className="os-metric-label">{net < 0 ? "Net debit" : "Net credit"}</div>
              <div className="os-metric-value">{usd(Math.abs(net))}</div>
            </div>
            <div className="os-metric">
              <div className="os-metric-label">Max profit</div>
              <div className="os-metric-value text-[var(--text-success)]">{ex.maxProfit === "unlimited" ? "Unlimited" : usd(ex.maxProfit)}</div>
            </div>
            <div className="os-metric">
              <div className="os-metric-label">Max loss</div>
              <div className="os-metric-value text-[var(--text-danger)]">{ex.maxLoss === "undefined" ? "Undefined" : usd(ex.maxLoss)}</div>
            </div>
            <div className="os-metric">
              <div className="os-metric-label">Break-even(s)</div>
              <div className="os-metric-value text-base">{be.length ? be.map((x) => "$" + x).join(", ") : "—"}</div>
            </div>
          </div>

          {/* Payoff */}
          <section className="os-panel p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Expiration payoff</span>
              <span className="os-badge text-[10px]">ENGINE</span>
            </div>
            <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface-1)", height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                  <XAxis dataKey="x" tick={{ fontSize: 11, fill: "var(--text-muted)" }} tickFormatter={(v) => "$" + v} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} tickFormatter={(v) => (v < 0 ? "-$" : "$") + Math.abs(v)} width={54} />
                  <Tooltip formatter={(v) => usd(v)} labelFormatter={(v) => "Price $" + v} contentStyle={{ fontSize: 12, borderRadius: 8, border: "0.5px solid var(--border)", background: "var(--surface-2)" }} />
                  <ReferenceLine y={0} stroke="var(--border-strong)" />
                  <ReferenceLine x={round5(spot)} stroke="var(--text-accent)" strokeDasharray="4 3" />
                  {be.map((b) => <ReferenceDot key={b} x={b} y={0} r={4} fill="var(--text-warning)" stroke="none" />)}
                  <Line type="monotone" dataKey="pl" stroke="var(--text-success)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-2 m-0">Green = P/L at expiration. Blue dash = spot. Amber = break-evens.</p>
          </section>

          {/* Probability */}
          <section className="os-panel p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <span className="text-sm font-medium">Probability &amp; expected value</span>
              <div className="flex gap-1.5">
                <button type="button" className={`os-btn text-xs py-1 ${driftMode === "rn" ? "os-btn-primary" : ""}`} onClick={() => setDriftMode("rn")}>Market-implied</button>
                <button type="button" className={`os-btn text-xs py-1 ${driftMode === "user" ? "os-btn-primary" : ""}`} onClick={() => setDriftMode("user")}>User assumption</button>
              </div>
            </div>
            {driftMode === "user" && (
              <label className="os-label mb-3 block">
                Expected annual return: {(userDrift * 100).toFixed(0)}%
                <input className="w-full mt-1" type="range" min="-0.3" max="0.5" step="0.01" value={userDrift} onChange={(e) => setUserDrift(+e.target.value)} />
              </label>
            )}
            <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))" }}>
              <div className="os-metric">
                <div className="os-metric-label">Model PoP</div>
                <div className="os-metric-value text-[var(--text-success)]">{pct1(mc.pp)}</div>
                <div className="text-[10px] text-[var(--text-muted)]">estimate</div>
              </div>
              <div className="os-metric">
                <div className="os-metric-label">Model P(loss)</div>
                <div className="os-metric-value text-[var(--text-danger)]">{pct1(mc.pl)}</div>
              </div>
              <div className="os-metric">
                <div className="os-metric-label">Model EV</div>
                <div className={`os-metric-value ${mc.ev >= 0 ? "text-[var(--text-success)]" : "text-[var(--text-danger)]"}`}>{usd(mc.ev)}</div>
              </div>
              <div className="os-metric">
                <div className="os-metric-label">Median</div>
                <div className="os-metric-value">{usd(mc.median)}</div>
              </div>
            </div>
            <div className="os-well px-3 py-2 text-xs text-[var(--text-secondary)] mb-3">
              95% CI on model PoP: <strong className="text-[var(--text-primary)]">{pct1(mc.ci[0])} – {pct1(mc.ci[1])}</strong>
              {" · "}5th {usd(mc.p5)} · 95th {usd(mc.p95)} · {sims.toLocaleString()} sims
            </div>
            <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface-1)", height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mc.hist} margin={{ top: 4, right: 8, bottom: 0, left: 4 }}>
                  <XAxis dataKey="x" tick={{ fontSize: 10, fill: "var(--text-muted)" }} tickFormatter={(v) => "$" + Math.round(v)} />
                  <YAxis hide />
                  <ReferenceLine x={0} stroke="var(--border-strong)" />
                  <Tooltip formatter={(v) => v + " sims"} labelFormatter={(v) => "≈ " + usd(v)} contentStyle={{ fontSize: 12, borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--border)" }} />
                  <Bar dataKey="count">
                    {mc.hist.map((d, i) => <Cell key={i} fill={d.x >= 0 ? "var(--text-success)" : "var(--text-danger)"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Model assumptions */}
          <section className="os-panel p-4">
            <div className="text-sm font-medium mb-3">Model assumptions</div>
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
              <label className="os-label">Rate {(rate * 100).toFixed(1)}%
                <input className="w-full mt-1" type="range" min="0" max="0.1" step="0.001" value={rate} onChange={(e) => setRate(+e.target.value)} />
              </label>
              <label className="os-label">Div yield {(divYield * 100).toFixed(1)}%
                <input className="w-full mt-1" type="range" min="0" max="0.06" step="0.001" value={divYield} onChange={(e) => setDivYield(+e.target.value)} />
              </label>
              <label className="os-label">Sims {sims.toLocaleString()}
                <input className="w-full mt-1" type="range" min="1000" max="50000" step="1000" value={sims} onChange={(e) => setSims(+e.target.value)} />
              </label>
              <label className="os-label">Seed
                <input className="os-input mt-1" type="number" value={seed} onChange={(e) => setSeed(+e.target.value || 0)} />
              </label>
            </div>
          </section>
        </div>

        {/* RIGHT RAIL — sticky brain */}
        <aside className="lab-brain-rail flex flex-col gap-3 min-w-0">
          <div className="lab-brain-sticky flex flex-col gap-3">
            <div className="os-panel p-3">
              <div className="os-kicker mb-1">Brain rail</div>
              <p className="text-xs text-[var(--text-secondary)] m-0">
                Load a live chain to rank structures under empire policy. Click Load in builder to lock legs.
              </p>
            </div>
            {ticker.trim() ? (
              <>
                {live && <MarketContextPanel symbol={ticker} />}
                <BrainRecommendPanel
                  symbol={ticker}
                  preferredExpiration={expiry || undefined}
                  onSelectStrategy={(payload) => {
                    const id = typeof payload === "string" ? payload : payload.strategyId;
                    if (TEMPLATES[id]) setTpl(id);
                    else setLoadErr(`No template for "${id}" — legs applied if present.`);
                    const dLegs = typeof payload === "object" ? payload.legs : null;
                    if (dLegs && dLegs.length) {
                      const mapped = dLegs.map((l) => {
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
              </>
            ) : (
              <div className="os-panel p-6 text-sm text-[var(--text-muted)]">
                Enter a ticker and load the live chain to activate market context + trading brain.
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Full-width checklist climax */}
      {!blocked && (
        <OrderChecklistCard
          checklist={checklist}
          onSave={() => {
            const sym = (ticker.trim() || "DEMO").toUpperCase().split(":").pop();
            addJournalPlan({
              underlying: sym,
              strategy: tpl,
              title: `${TEMPLATES[tpl]?.name || tpl} ${sym}`,
              thesis: brainNote || "From Trade Lab checklist",
              legsNote: brainNote || legs.map((l) => (l.kind === "opt" ? `${l.side} ${l.type} ${l.strike}` : `stock ${l.shares}`)).join("; "),
              plannedMaxLoss: typeof ex.maxLoss === "number" ? Math.abs(ex.maxLoss) : null,
              plannedContracts: 1,
              forecastPoP: mc.pp,
              forecastEV: mc.ev,
              checklistText: null,
            });
            alert("Saved plan to Journal. Mark opened/closed after your broker fill.");
          }}
        />
      )}

      <div className="os-panel p-3" style={{ background: "var(--bg-warning)", borderColor: "var(--border-warning)" }}>
        <p className="text-xs text-[var(--text-warning)] m-0 leading-relaxed">
          <strong>Options involve significant risk.</strong> Probabilities are model estimates under stated assumptions, not guarantees.
          This app never places orders. Educational companion only — not investment advice.
        </p>
      </div>
    </div>
  );
}
