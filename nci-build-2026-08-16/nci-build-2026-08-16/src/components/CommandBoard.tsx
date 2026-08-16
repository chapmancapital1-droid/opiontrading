"use client";

/**
 * NERDCOMMAND Command Board
 * ---------------------------------------------------------------------------
 * The five whiteboard cards, rebuilt as live panels:
 *   1. Strategy Map      — 11 strategies, 4 postures, execution eligibility
 *   2. Pair -> Pare      — scale-out ladder, computed from a real entry
 *   3. Chart Trends      — the three regimes the brain conditions on
 *   4. Volatility        — price orbiting value; greed above, fear below
 *   5. Delta Ladder      — moneyness zones with live delta placement
 *
 * Panels 1, 3 and 5 write to the shared posture state so the board reads as
 * one decision, not five decorations.
 */

import { useMemo, useState } from "react";

/* ========================================================================== */
/* Types + catalog                                                            */
/* ========================================================================== */

type Posture = "directional" | "bidirectional" | "protective" | "nondirectional";
type Trend = "bullish" | "bearish" | "consolidation";

type BoardStrategy = {
  n: number;
  name: string;
  posture: Posture;
  /** Plain-language job of the trade. */
  job: string;
  /** Risk shape — drives the companion-mode gate. */
  risk: "defined" | "undefined" | "stock";
  /** Can the Robinhood agentic MCP place this today? (long single-leg only) */
  agentic: boolean;
  /** Which chart regimes this fits. */
  fits: Trend[];
};

const STRATEGIES: BoardStrategy[] = [
  { n: 1, name: "Buy Call", posture: "directional", job: "Pay for the right to buy. Up move.", risk: "defined", agentic: true, fits: ["bullish"] },
  { n: 2, name: "Sell Put", posture: "directional", job: "Get paid to accept a duty to buy.", risk: "undefined", agentic: false, fits: ["bullish", "consolidation"] },
  { n: 3, name: "Buy Put", posture: "directional", job: "Pay for the right to sell. Down move.", risk: "defined", agentic: true, fits: ["bearish"] },
  { n: 4, name: "Sell Call", posture: "directional", job: "Get paid to accept a duty to sell.", risk: "undefined", agentic: false, fits: ["bearish", "consolidation"] },
  { n: 5, name: "Straddle", posture: "bidirectional", job: "Pay for movement either way.", risk: "defined", agentic: false, fits: ["consolidation"] },
  { n: 6, name: "Protective Put", posture: "protective", job: "Insurance on shares you own.", risk: "stock", agentic: false, fits: ["bullish", "consolidation"] },
  { n: 7, name: "P-Put Variation", posture: "protective", job: "Cheaper insurance, partial cover.", risk: "stock", agentic: false, fits: ["bullish", "consolidation"] },
  { n: 8, name: "Collar Trade", posture: "protective", job: "Sell upside to fund downside cover.", risk: "stock", agentic: false, fits: ["consolidation"] },
  { n: 9, name: "Buy / Hold", posture: "protective", job: "Own the shares. No option leg.", risk: "stock", agentic: false, fits: ["bullish"] },
  { n: 10, name: "Credit Spread", posture: "nondirectional", job: "Collect premium inside a capped risk.", risk: "defined", agentic: false, fits: ["consolidation", "bullish", "bearish"] },
  { n: 11, name: "Iron Condor", posture: "nondirectional", job: "Collect premium while price stays boxed.", risk: "defined", agentic: false, fits: ["consolidation"] },
];

const POSTURES: { id: Posture; label: string; hue: string; note: string }[] = [
  { id: "directional", label: "Directional", hue: "var(--text-primary)", note: "You have an opinion on which way." },
  { id: "bidirectional", label: "Bi-directional", hue: "var(--text-accent)", note: "You expect a move, not a direction." },
  { id: "protective", label: "Protective", hue: "var(--text-danger)", note: "You already own something worth defending." },
  { id: "nondirectional", label: "Non-directional", hue: "var(--text-success)", note: "You get paid when nothing happens." },
];

/* ========================================================================== */
/* Small shared primitives                                                    */
/* ========================================================================== */

function Panel({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-xl)",
        padding: "var(--space-5)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.16em",
          color: "var(--text-muted)",
          marginBottom: 4,
        }}
      >
        {eyebrow}
      </div>
      <h2
        style={{
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: "0.06em",
          color: "var(--text-primary)",
          marginBottom: "var(--space-4)",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  suffix?: string;
}) {
  return (
    <label style={{ display: "block" }}>
      <span
        style={{
          display: "block",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.12em",
          color: "var(--text-muted)",
          marginBottom: 4,
        }}
      >
        {label}
        {suffix ? ` ${suffix}` : ""}
      </span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: "100%",
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          color: "var(--text-primary)",
          padding: "8px 10px",
          fontFamily: "var(--font-mono)",
          fontSize: 14,
          fontWeight: 600,
        }}
      />
    </label>
  );
}

const money = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });

/* ========================================================================== */
/* 1. Strategy Map                                                            */
/* ========================================================================== */

function StrategyMap({
  trend,
  companionMode,
  selected,
  onSelect,
}: {
  trend: Trend;
  companionMode: boolean;
  selected: number | null;
  onSelect: (n: number | null) => void;
}) {
  return (
    <Panel eyebrow="BOARD 01" title="STRATEGY MAP — ELEVEN WAYS TO TAKE A POSITION">
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: "var(--space-4)", lineHeight: 1.6 }}>
        Grouped by what you&apos;re actually claiming about the market. Rows that match the{" "}
        <b style={{ color: "var(--text-primary)" }}>{trend}</b> regime are lit. Companion mode blocks
        undefined risk.
      </p>

      <div style={{ display: "grid", gap: "var(--space-4)" }}>
        {POSTURES.map((p) => (
          <div key={p.id}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.14em",
                color: p.hue,
                marginBottom: 6,
                display: "flex",
                gap: 10,
                alignItems: "baseline",
                flexWrap: "wrap",
              }}
            >
              <span>{p.label.toUpperCase()}</span>
              <span style={{ color: "var(--text-muted)", letterSpacing: 0, fontSize: 11 }}>{p.note}</span>
            </div>

            <div style={{ display: "grid", gap: 4 }}>
              {STRATEGIES.filter((s) => s.posture === p.id).map((s) => {
                const fitsTrend = s.fits.includes(trend);
                const blocked = companionMode && s.risk === "undefined";
                const isSel = selected === s.n;
                return (
                  <button
                    key={s.n}
                    onClick={() => onSelect(isSel ? null : s.n)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "26px 1fr auto",
                      gap: 10,
                      alignItems: "center",
                      textAlign: "left",
                      width: "100%",
                      padding: "9px 11px",
                      borderRadius: "var(--radius-md)",
                      cursor: "pointer",
                      background: isSel ? "var(--bg-accent)" : fitsTrend ? "var(--surface-2)" : "transparent",
                      border: `1px solid ${isSel ? "var(--border-accent)" : "var(--border)"}`,
                      opacity: blocked ? 0.45 : fitsTrend ? 1 : 0.62,
                      color: "var(--text-primary)",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 12,
                        color: "var(--text-muted)",
                        fontWeight: 600,
                      }}
                    >
                      {s.n}.
                    </span>
                    <span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</span>
                      <span
                        style={{
                          display: "block",
                          fontSize: 11,
                          color: "var(--text-muted)",
                          marginTop: 2,
                          lineHeight: 1.45,
                        }}
                      >
                        {s.job}
                      </span>
                    </span>
                    <span style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                      {blocked && <Tag tone="danger">GATED</Tag>}
                      {s.agentic && <Tag tone="success">AGENT</Tag>}
                      {s.risk === "defined" && !blocked && <Tag tone="muted">DEFINED</Tag>}
                      {s.risk === "stock" && <Tag tone="muted">SHARES</Tag>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p
        style={{
          marginTop: "var(--space-4)",
          fontSize: 11,
          color: "var(--text-muted)",
          lineHeight: 1.6,
          borderTop: "1px solid var(--border)",
          paddingTop: "var(--space-3)",
        }}
      >
        <b style={{ color: "var(--text-success)" }}>AGENT</b> = the Robinhood agentic MCP can place it
        today (long single-leg only). Everything else stays on the manual checklist path.
      </p>
    </Panel>
  );
}

function Tag({ children, tone }: { children: React.ReactNode; tone: "success" | "danger" | "muted" }) {
  const map = {
    success: { bg: "var(--bg-success)", fg: "var(--text-success)", bd: "var(--border-success)" },
    danger: { bg: "var(--bg-danger)", fg: "var(--text-danger)", bd: "var(--border-danger)" },
    muted: { bg: "var(--surface-3)", fg: "var(--text-muted)", bd: "var(--border)" },
  }[tone];
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        letterSpacing: "0.1em",
        padding: "3px 6px",
        borderRadius: 4,
        background: map.bg,
        color: map.fg,
        border: `1px solid ${map.bd}`,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

/* ========================================================================== */
/* 2. Pair -> Pare                                                            */
/* ========================================================================== */

type Rung = {
  label: string;
  contracts: number;
  trigger: string;
  priceAt: number;
  proceeds: number;
  tone: "success" | "danger" | "accent";
};

function PairToPare() {
  const [contracts, setContracts] = useState(4);
  const [premium, setPremium] = useState(2.5);

  const plan = useMemo(() => {
    const cost = contracts * premium * 100;
    // The board's ladder: enter 4, pare 2 at +150%, pare 1 at +100%, trail the last.
    const pare2 = Math.max(1, Math.round(contracts * 0.5));
    const pare1 = Math.max(1, Math.round(contracts * 0.25));
    const runner = Math.max(0, contracts - pare2 - pare1);

    const at150 = premium * 2.5;
    const at100 = premium * 2.0;

    const rungs: Rung[] = [
      {
        label: "Pare 2",
        contracts: pare2,
        trigger: "+150% on premium",
        priceAt: at150,
        proceeds: pare2 * at150 * 100,
        tone: "success",
      },
      {
        label: "Pare 1",
        contracts: pare1,
        trigger: "+100% on premium",
        priceAt: at100,
        proceeds: pare1 * at100 * 100,
        tone: "success",
      },
      {
        label: "Runner",
        contracts: runner,
        trigger: "Trailing stop — let it work",
        priceAt: 0,
        proceeds: 0,
        tone: "accent",
      },
    ];

    const bookedEarly = rungs.reduce((sum, r) => sum + r.proceeds, 0);
    const stopPrice = premium * 0.5;
    const maxLoss = cost * 0.5;
    // Capital is off the table once booked proceeds cover the whole entry.
    const riskFreeAfterPares = bookedEarly >= cost;

    return { cost, rungs, bookedEarly, stopPrice, maxLoss, riskFreeAfterPares, runner };
  }, [contracts, premium]);

  return (
    <Panel eyebrow="BOARD 02" title={`"PAIR" TO "PARE" — THE EXIT LADDER`}>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: "var(--space-4)", lineHeight: 1.6 }}>
        You enter as a pair and leave in pieces. Winners get sold in rungs so a reversal can&apos;t take
        back the whole trade; the last contract runs on a trailing stop.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
        <Field label="CONTRACTS IN" value={contracts} onChange={(n) => setContracts(Math.max(1, n))} />
        <Field label="ENTRY PREMIUM" value={premium} onChange={(n) => setPremium(Math.max(0.01, n))} step={0.05} />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "10px 12px",
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          marginBottom: "var(--space-4)",
          fontFamily: "var(--font-mono)",
          fontSize: 13,
        }}
      >
        <span style={{ color: "var(--text-muted)" }}>TOTAL AT RISK</span>
        <b style={{ color: "var(--text-primary)" }}>{money(plan.cost)}</b>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {plan.rungs.map((r) => (
          <div
            key={r.label}
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              gap: 12,
              alignItems: "center",
              padding: "11px 13px",
              background: "var(--surface-2)",
              borderLeft: `3px solid ${
                r.tone === "success" ? "var(--text-success)" : "var(--text-accent)"
              }`,
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 18,
                fontWeight: 700,
                color: "var(--text-primary)",
                minWidth: 24,
              }}
            >
              {r.contracts}
            </span>
            <span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{r.label}</span>
              <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                {r.trigger}
              </span>
            </span>
            <span style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12 }}>
              {r.priceAt > 0 ? (
                <>
                  <b style={{ color: "var(--text-success)" }}>{money(r.proceeds)}</b>
                  <span style={{ display: "block", color: "var(--text-muted)", fontSize: 11, marginTop: 2 }}>
                    @ {money(r.priceAt)}
                  </span>
                </>
              ) : (
                <span style={{ color: "var(--text-muted)" }}>open</span>
              )}
            </span>
          </div>
        ))}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            gap: 12,
            alignItems: "center",
            padding: "11px 13px",
            background: "var(--bg-danger)",
            borderLeft: "3px solid var(--text-danger)",
            border: "1px solid var(--border-danger)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 18,
              fontWeight: 700,
              color: "var(--text-danger)",
              minWidth: 24,
            }}
          >
            {contracts}
          </span>
          <span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Stop-loss</span>
            <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              −50% on premium — the whole position closes
            </span>
          </span>
          <span style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12 }}>
            <b style={{ color: "var(--text-danger)" }}>−{money(plan.maxLoss)}</b>
            <span style={{ display: "block", color: "var(--text-muted)", fontSize: 11, marginTop: 2 }}>
              @ {money(plan.stopPrice)}
            </span>
          </span>
        </div>
      </div>

      <p
        style={{
          marginTop: "var(--space-4)",
          fontSize: 12,
          lineHeight: 1.65,
          color: plan.riskFreeAfterPares ? "var(--text-success)" : "var(--text-warning)",
          background: plan.riskFreeAfterPares ? "var(--bg-success)" : "var(--bg-warning)",
          border: `1px solid ${plan.riskFreeAfterPares ? "var(--border-success)" : "var(--border-warning)"}`,
          borderRadius: "var(--radius-md)",
          padding: "10px 12px",
        }}
      >
        {plan.riskFreeAfterPares ? (
          <>
            Both pares book {money(plan.bookedEarly)} against a {money(plan.cost)} entry — the original
            capital is back before the runner is decided. The runner is playing with house money.
          </>
        ) : (
          <>
            Both pares book {money(plan.bookedEarly)} against a {money(plan.cost)} entry — that&apos;s{" "}
            {money(plan.cost - plan.bookedEarly)} still exposed when the runner is left open. Size up the
            entry or take the second rung earlier if you want capital fully recovered first.
          </>
        )}
      </p>
    </Panel>
  );
}

/* ========================================================================== */
/* 3. Chart Trends                                                            */
/* ========================================================================== */

const TREND_ART: Record<Trend, { path: string; chan: string; color: string; read: string }> = {
  bullish: {
    path: "M8 96 C 34 88, 44 62, 66 58 S 96 40, 118 30 S 150 18, 172 8",
    chan: "M8 112 L172 24 M8 80 L172 -8",
    color: "var(--text-success)",
    read: "Higher highs, higher lows. Buyers keep paying up.",
  },
  bearish: {
    path: "M8 8 C 34 16, 44 42, 66 46 S 96 64, 118 74 S 150 86, 172 96",
    chan: "M8 -8 L172 80 M8 24 L172 112",
    color: "var(--text-danger)",
    read: "Lower highs, lower lows. Sellers keep hitting bids.",
  },
  consolidation: {
    path: "M8 52 C 30 30, 48 74, 70 52 S 108 30, 128 52 S 158 74, 172 52",
    chan: "M8 26 L172 26 M8 78 L172 78",
    color: "var(--text-warning)",
    read: "Bounded range. Neither side is winning — premium sellers get paid.",
  },
};

function ChartTrends({ trend, onTrend }: { trend: Trend; onTrend: (t: Trend) => void }) {
  return (
    <Panel eyebrow="BOARD 03" title="CHART TRENDS — NAME THE REGIME FIRST">
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: "var(--space-4)", lineHeight: 1.6 }}>
        Every strategy on Board 01 is a bet about which of these three you&apos;re in. Pick wrong here and
        the rest of the board is arithmetic on a bad premise.
      </p>

      <div style={{ display: "grid", gap: "var(--space-3)" }}>
        {(Object.keys(TREND_ART) as Trend[]).map((t) => {
          const art = TREND_ART[t];
          const on = trend === t;
          return (
            <button
              key={t}
              onClick={() => onTrend(t)}
              style={{
                display: "grid",
                gridTemplateColumns: "180px 1fr",
                gap: "var(--space-4)",
                alignItems: "center",
                textAlign: "left",
                padding: "var(--space-3)",
                background: on ? "var(--surface-2)" : "transparent",
                border: `1px solid ${on ? art.color : "var(--border)"}`,
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                opacity: on ? 1 : 0.6,
              }}
            >
              <svg viewBox="0 0 180 104" style={{ width: "100%", height: 68, overflow: "visible" }}>
                <path d={art.chan} stroke="var(--border-strong)" strokeWidth="2" fill="none" />
                <path d={art.path} stroke={art.color} strokeWidth="3" fill="none" strokeLinecap="round" />
              </svg>
              <span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: on ? art.color : "var(--text-primary)",
                  }}
                >
                  {t.toUpperCase()}
                </span>
                <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.5 }}>
                  {art.read}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

/* ========================================================================== */
/* 4. Volatility                                                              */
/* ========================================================================== */

function VolatilityBoard() {
  const [amplitude, setAmplitude] = useState(30);

  const wave = useMemo(() => {
    const pts: string[] = [];
    for (let x = 0; x <= 320; x += 4) {
      // Value drifts down-left to up-right; price oscillates around it.
      const value = 120 - (x / 320) * 80;
      const y = value - Math.sin((x / 320) * Math.PI * 3.1) * amplitude;
      pts.push(`${x},${y.toFixed(1)}`);
    }
    return `M${pts.join(" L")}`;
  }, [amplitude]);

  return (
    <Panel eyebrow="BOARD 04" title="VOLATILITY — PRICE ORBITS VALUE">
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: "var(--space-4)", lineHeight: 1.6 }}>
        Value is the straight line. Price is the wave. The distance between them is emotion — and
        premium is priced off the size of the swing, not the direction of the line.
      </p>

      <svg viewBox="0 0 320 150" style={{ width: "100%", height: 190, overflow: "visible" }}>
        <text x="6" y="14" fill="var(--text-success)" fontSize="11" fontWeight="700" letterSpacing="1.4">
          GREED
        </text>
        <text x="6" y="146" fill="var(--text-danger)" fontSize="11" fontWeight="700" letterSpacing="1.4">
          FEAR
        </text>
        <line x1="0" y1="120" x2="320" y2="40" stroke="var(--text-primary)" strokeWidth="2.5" />
        <path d={wave} stroke="var(--text-accent)" strokeWidth="3" fill="none" strokeLinecap="round" />
        <text x="238" y="34" fill="var(--text-primary)" fontSize="10" letterSpacing="1.2">
          VALUE
        </text>
        <text x="60" y="26" fill="var(--text-accent)" fontSize="10" letterSpacing="1.2">
          PRICE
        </text>
      </svg>

      <div style={{ marginTop: "var(--space-3)" }}>
        <span
          style={{
            display: "block",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.12em",
            color: "var(--text-muted)",
            marginBottom: 6,
          }}
        >
          SWING SIZE — {amplitude < 18 ? "COMPRESSED" : amplitude < 38 ? "NORMAL" : "EXPANDED"}
        </span>
        <input
          type="range"
          min={6}
          max={54}
          value={amplitude}
          onChange={(e) => setAmplitude(Number(e.target.value))}
          style={{ width: "100%", accentColor: "var(--brand-bright)" }}
        />
      </div>

      <p
        style={{
          marginTop: "var(--space-3)",
          fontSize: 12,
          color: "var(--text-muted)",
          lineHeight: 1.65,
          borderTop: "1px solid var(--border)",
          paddingTop: "var(--space-3)",
        }}
      >
        {amplitude < 18
          ? "Compressed: options are cheap. Buying premium costs less, and a breakout pays. This is a buyer's regime."
          : amplitude < 38
            ? "Normal: no volatility edge either way. Let direction and liquidity decide the trade."
            : "Expanded: options are expensive. Sellers are paid well — but the same swing that funds the premium is what can run you over."}
      </p>
    </Panel>
  );
}

/* ========================================================================== */
/* 5. Delta Ladder                                                            */
/* ========================================================================== */

const DELTA_ZONES = [
  { top: 1.0, bottom: 0.8, key: "DEEP ITM", body: "Moves nearly dollar-for-dollar with the stock. Expensive, behaves like shares.", tone: "var(--text-success)" },
  { top: 0.8, bottom: 0.5, key: "ITM", body: "Real intrinsic value. Higher cost, higher odds of finishing in the money.", tone: "var(--text-success)" },
  { top: 0.5, bottom: 0.3, key: "ATM", body: "The coin flip. Most time value, fastest theta burn, biggest gamma.", tone: "var(--text-accent)" },
  { top: 0.3, bottom: 0.0, key: "OTM", body: "Cheap lottery zone. Low odds. Most beginner losses live here.", tone: "var(--text-danger)" },
];

function DeltaLadder() {
  const [delta, setDelta] = useState(0.45);

  const FAR_OTM = {
    key: "OTM",
    body: "Cheap lottery zone. Low odds. Most beginner losses live here.",
    tone: "var(--text-danger)",
  };
  const zone = DELTA_ZONES.find((z) => delta <= z.top && delta > z.bottom) ?? FAR_OTM;
  const pct = Math.round(delta * 100);

  return (
    <Panel eyebrow="BOARD 05" title="DELTA — MONEYNESS AS ONE NUMBER">
      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: "var(--space-4)", lineHeight: 1.6 }}>
        Delta does two jobs at once: how much the option moves per $1 of stock, and a rough read on the
        odds it finishes in the money. Read the ladder top-down.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "58px 1fr", gap: "var(--space-4)" }}>
        {/* rail */}
        <div style={{ position: "relative", height: 260 }}>
          <div
            style={{
              position: "absolute",
              left: 22,
              top: 0,
              bottom: 0,
              width: 3,
              background: "var(--border-strong)",
              borderRadius: 2,
            }}
          />
          {[1.0, 0.8, 0.5, 0.3, 0].map((v) => (
            <div
              key={v}
              style={{
                position: "absolute",
                top: `${(1 - v) * 100}%`,
                left: 0,
                transform: "translateY(-50%)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--text-muted)",
                  width: 20,
                  textAlign: "right",
                }}
              >
                {v.toFixed(1)}
              </span>
              <span style={{ width: 10, height: 2, background: "var(--border-strong)" }} />
            </div>
          ))}
          {/* live marker */}
          <div
            style={{
              position: "absolute",
              top: `${(1 - delta) * 100}%`,
              left: 14,
              transform: "translateY(-50%)",
              width: 19,
              height: 19,
              borderRadius: "50%",
              background: zone.tone,
              border: "3px solid var(--surface-1)",
              boxShadow: "0 0 0 2px " + zone.tone,
            }}
          />
        </div>

        {/* zones */}
        <div style={{ display: "grid", gap: 5 }}>
          {DELTA_ZONES.map((z) => {
            const on = z.key === zone.key;
            return (
              <div
                key={z.key}
                style={{
                  padding: "10px 12px",
                  borderRadius: "var(--radius-md)",
                  background: on ? "var(--surface-2)" : "transparent",
                  border: `1px solid ${on ? z.tone : "var(--border)"}`,
                  opacity: on ? 1 : 0.55,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.12em",
                    color: z.tone,
                    fontWeight: 600,
                  }}
                >
                  {z.key} · {z.bottom.toFixed(1)}–{z.top.toFixed(1)}
                </span>
                <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)", marginTop: 3, lineHeight: 1.5 }}>
                  {z.body}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: "var(--space-4)" }}>
        <span
          style={{
            display: "block",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.12em",
            color: "var(--text-muted)",
            marginBottom: 6,
          }}
        >
          CONTRACT DELTA — {delta.toFixed(2)}
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={pct}
          onChange={(e) => setDelta(Number(e.target.value) / 100)}
          style={{ width: "100%", accentColor: "var(--brand-bright)" }}
        />
      </div>

      <p
        style={{
          marginTop: "var(--space-3)",
          fontSize: 12,
          color: "var(--text-secondary)",
          lineHeight: 1.65,
          borderTop: "1px solid var(--border)",
          paddingTop: "var(--space-3)",
        }}
      >
        At <b style={{ color: "var(--text-primary)" }}>{delta.toFixed(2)}</b> delta the option gains about{" "}
        <b style={{ color: "var(--text-primary)" }}>{money(delta)}</b> per $1 the stock moves your way, and
        roughly <b style={{ color: "var(--text-primary)" }}>{pct}%</b> of paths finish in the money. Delta
        is a model estimate, not a guarantee — it drifts as price, time and volatility change.
      </p>
    </Panel>
  );
}

/* ========================================================================== */
/* Board shell                                                                */
/* ========================================================================== */

export default function CommandBoard() {
  const [trend, setTrend] = useState<Trend>("bullish");
  const [companionMode, setCompanionMode] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);

  const picked = STRATEGIES.find((s) => s.n === selected) ?? null;
  const eligible = STRATEGIES.filter(
    (s) => s.fits.includes(trend) && !(companionMode && s.risk === "undefined"),
  );

  return (
    <div style={{ display: "grid", gap: "var(--space-5)" }}>
      {/* Board header + shared state */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "var(--space-4)",
          flexWrap: "wrap",
          padding: "var(--space-4) var(--space-5)",
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.18em",
              color: "var(--text-muted)",
            }}
          >
            NERDCOMMAND · NCI TRADING
          </div>
          <h1 style={{ fontSize: 19, fontWeight: 700, letterSpacing: "0.04em", marginTop: 4 }}>
            COMMAND BOARD
          </h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            {eligible.length} of {STRATEGIES.length} strategies fit a {trend} read
            {companionMode ? " under companion gates" : ""}.
          </p>
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            fontSize: 12,
            color: "var(--text-secondary)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={companionMode}
            onChange={(e) => setCompanionMode(e.target.checked)}
            style={{ accentColor: "var(--brand-bright)", width: 16, height: 16 }}
          />
          Companion mode — block undefined risk
        </label>
      </div>

      {picked && (
        <div
          style={{
            padding: "var(--space-4) var(--space-5)",
            background: "var(--bg-accent)",
            border: "1px solid var(--border-accent)",
            borderRadius: "var(--radius-lg)",
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
            {picked.n}. {picked.name}
          </span>
          <span style={{ display: "block", fontSize: 12.5, color: "var(--text-secondary)", marginTop: 5, lineHeight: 1.6 }}>
            {picked.job} Fits {picked.fits.join(", ")}.{" "}
            {companionMode && picked.risk === "undefined"
              ? "Gated in companion mode — undefined risk."
              : picked.agentic
                ? "The agent can place this order."
                : "Manual checklist path."}
          </span>
        </div>
      )}

      <ChartTrends trend={trend} onTrend={setTrend} />
      <StrategyMap trend={trend} companionMode={companionMode} selected={selected} onSelect={setSelected} />

      <div
        style={{
          display: "grid",
          gap: "var(--space-5)",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        }}
      >
        <DeltaLadder />
        <VolatilityBoard />
      </div>

      <PairToPare />

      <p
        style={{
          fontSize: 11,
          color: "var(--text-muted)",
          textAlign: "center",
          lineHeight: 1.7,
          padding: "var(--space-4) 0",
        }}
      >
        NERDCOMMAND · GangsterNerds LLC — educational tooling. Model output, not investment advice.
        Every order is yours.
      </p>
    </div>
  );
}
