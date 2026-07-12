"use client";
import { useState } from "react";
import type { OrderChecklist } from "@/lib/orderChecklist";
import { checklistToText } from "@/lib/orderChecklist";

export function OrderChecklistCard({ checklist, onSave }: { checklist: OrderChecklist; onSave?: () => void }) {
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(checklistToText(checklist));
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-5 print:border-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-medium">Robinhood order checklist</h3>
        <span className="text-xs text-[var(--text-muted)]">{checklist.contracts}× {checklist.strategyName}</span>
      </div>

      <dl className="text-sm space-y-1">
        <Row k="Underlying" v={checklist.underlying} />
        {checklist.expiration && <Row k="Expiration" v={checklist.expiration} />}
      </dl>

      <ol className="my-3 border-y border-[var(--border)] py-3 text-sm space-y-1">
        {checklist.legs.map((l, i) => (
          <li key={i} className="flex justify-between">
            <span>{l.action} {l.strike != null ? `$${l.strike} ${l.optionType}` : l.optionType}</span>
            <span className="text-[var(--text-secondary)]">× {l.quantity}</span>
          </li>
        ))}
      </ol>

      <dl className="text-sm space-y-1">
        <Row k={checklist.netLimitLabel} v={`$${checklist.estTotal} total`} />
        <Row k="Max modeled loss" v={checklist.maxModeledLoss === "undefined" ? "UNDEFINED" : `$${checklist.maxModeledLoss}`} danger={checklist.maxModeledLoss === "undefined"} />
        {checklist.estCollateral != null && <Row k="Est. collateral" v={`$${checklist.estCollateral}`} />}
        {checklist.breakEvens.length > 0 && <Row k="Break-even(s)" v={checklist.breakEvens.map((b) => `$${b}`).join(", ")} />}
        {checklist.quoteTimestamp && <Row k="Quote time" v={checklist.quoteTimestamp} />}
        {checklist.plannedProfitTarget != null && <Row k="Profit target" v={`$${checklist.plannedProfitTarget}`} />}
        {checklist.plannedLossLimit != null && <Row k="Loss limit" v={`$${checklist.plannedLossLimit}`} />}
        {checklist.plannedExitDate && <Row k="Planned exit" v={checklist.plannedExitDate} />}
      </dl>

      <label className="flex items-center gap-2 mt-3 text-sm">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
        {checklist.reviewConfirmedLabel}
      </label>

      <div className="flex gap-2 mt-4 print:hidden">
        <button onClick={copy} className="text-sm border border-[var(--border-strong)] rounded-lg px-3 py-1.5">{copied ? "Copied" : "Copy"}</button>
        <button onClick={() => window.print()} className="text-sm border border-[var(--border-strong)] rounded-lg px-3 py-1.5">Print / PDF</button>
        {onSave && <button onClick={onSave} disabled={!confirmed} className="text-sm border border-[var(--border-strong)] rounded-lg px-3 py-1.5 disabled:opacity-50">Save to journal</button>}
      </div>

      <p className="text-xs text-[var(--text-muted)] mt-3">
        Estimates only. A limit order is not guaranteed to fill. Not investment advice. Not affiliated with or endorsed by Robinhood.
      </p>
    </div>
  );
}
function Row({ k, v, danger }: { k: string; v: string; danger?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-[var(--text-secondary)]">{k}</dt>
      <dd className={danger ? "text-[var(--text-danger)] font-medium" : ""}>{v}</dd>
    </div>
  );
}
