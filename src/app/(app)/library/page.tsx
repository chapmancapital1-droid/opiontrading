"use client";

import { useMemo, useState } from "react";
import inventoryNewdump from "@/knowledge/catalog/newdump_inventory.json";
import inventoryBooklib from "@/knowledge/catalog/booklibrary_inventory.json";
import inventoryDump2 from "@/knowledge/catalog/dump2_inventory.json";
import inventoryDump3 from "@/knowledge/catalog/dump3_inventory.json";
import { AI_COPILOT_CHARTER, NEWDUMP_LIBRARY_META, NEWDUMP_RULES } from "@/knowledge/newdumpRules";
import { BOOKLIBRARY_META, BOOKLIBRARY_RULES } from "@/knowledge/bookLibraryRules";
import {
  DUMP2_META,
  DUMP2_QUANT_WORKFLOW,
  DUMP2_RULES,
  DUMP2_SARGENT_TOOLING,
  DUMP2_KNEUSEL_MATH,
  DUMP2_SENTIMENT_HYGIENE,
} from "@/knowledge/dump2Rules";
import {
  DUMP3_META,
  DUMP3_CHESS_SCIENCE,
  DUMP3_BEAR_HYGIENE,
  DUMP3_RULES,
} from "@/knowledge/dump3Rules";
import {
  NCI_GODMODE_META,
  NCI_GODMODE_RISK_CHARTER,
  NCI_GODMODE_ALREADY_IN_OPTIONSCOPE,
} from "@/knowledge/nciGodModeRules";
import { STRATEGY_RULES } from "@/knowledge/strategyRules";
import { SALIBA_RULES } from "@/knowledge/salibaPlaybook";
import { SalibaPlaybookPanel } from "@/components/SalibaPlaybookPanel";

type InvRow = { title: string; path: string; mb: number; tag: string };

const rowsNewdump = inventoryNewdump as InvRow[];
const rowsBooklib = inventoryBooklib as InvRow[];
const rowsDump2 = inventoryDump2 as InvRow[];
const rowsDump3 = inventoryDump3 as InvRow[];

export default function LibraryPage() {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string>("all");
  const [source, setSource] = useState<"all" | "newdump" | "booklibrary" | "dump2" | "dump3">("all");

  const rows = useMemo(() => {
    if (source === "newdump") return rowsNewdump;
    if (source === "booklibrary") return rowsBooklib;
    if (source === "dump2") return rowsDump2;
    if (source === "dump3") return rowsDump3;
    return [...rowsNewdump, ...rowsBooklib, ...rowsDump2, ...rowsDump3];
  }, [source]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (tag !== "all" && r.tag !== tag) return false;
      if (!qq) return true;
      return r.title.toLowerCase().includes(qq) || r.path.toLowerCase().includes(qq);
    });
  }, [q, tag, rows]);

  const tags = useMemo(() => {
    const s = new Set(rows.map((r) => r.tag));
    return ["all", ...[...s].sort()];
  }, [rows]);

  const activeRules =
    NEWDUMP_RULES.length +
    SALIBA_RULES.length +
    BOOKLIBRARY_RULES.length +
    DUMP2_RULES.length +
    DUMP3_RULES.length;
  const totalRules = STRATEGY_RULES.length;

  return (
    <div className="zone-cockpit flex flex-col gap-4 max-w-5xl">
      <header>
        <div className="os-kicker">Knowledge library</div>
        <h1 className="text-2xl font-medium tracking-tight m-0">Libraries → brain rules</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1 m-0">
          Local libraries:{" "}
          <code className="text-xs">{NEWDUMP_LIBRARY_META.root}</code> +{" "}
          <code className="text-xs">{BOOKLIBRARY_META.root}</code> +{" "}
          <code className="text-xs">{DUMP2_META.root}</code> +{" "}
          <code className="text-xs">{DUMP3_META.root}</code>. Primary spread book:{" "}
          <strong>Saliba 2009</strong> (E:\newdump). We store{" "}
          <strong>structured rules</strong>, not full book text. Focus: option profits with defined
          risk.
        </p>
      </header>

      <SalibaPlaybookPanel />

      <section className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
        <div className="os-metric">
          <div className="os-metric-label">Catalog titles</div>
          <div className="os-metric-value">{rows.length}</div>
        </div>
        <div className="os-metric">
          <div className="os-metric-label">Distilled rules</div>
          <div className="os-metric-value">{activeRules}</div>
        </div>
        <div className="os-metric">
          <div className="os-metric-label">Brain rules total</div>
          <div className="os-metric-value">{totalRules}</div>
        </div>
      </section>

      <section className="os-panel p-4">
        <h2 className="text-base font-medium m-0 mb-2">AI co-pilot charter</h2>
        <ul className="text-sm text-[var(--text-secondary)] m-0 pl-4 list-disc space-y-1">
          {AI_COPILOT_CHARTER.bullets.map((b) => (
            <li key={b.slice(0, 48)}>{b}</li>
          ))}
        </ul>
      </section>

      <section className="os-panel p-4">
        <h2 className="text-base font-medium m-0 mb-2">Dump2 quant workflow (mapped)</h2>
        <ol className="text-sm text-[var(--text-secondary)] m-0 pl-4 list-decimal space-y-1">
          {DUMP2_QUANT_WORKFLOW.map((s) => (
            <li key={s.step}>
              <strong className="text-[var(--text-primary)]">{s.name}</strong> — {s.optionScope}
            </li>
          ))}
        </ol>
        <ul className="text-xs text-[var(--text-muted)] m-0 mt-3 pl-4 list-disc space-y-0.5">
          {DUMP2_SENTIMENT_HYGIENE.map((h) => (
            <li key={h.slice(0, 40)}>{h}</li>
          ))}
        </ul>
        <h3 className="text-sm font-medium m-0 mt-4 mb-1">Sargent Python tooling (not trade rules)</h3>
        <ul className="text-xs text-[var(--text-muted)] m-0 pl-4 list-disc space-y-0.5">
          {DUMP2_SARGENT_TOOLING.map((h) => (
            <li key={h.slice(0, 48)}>{h}</li>
          ))}
        </ul>
        <h3 className="text-sm font-medium m-0 mt-4 mb-1">Kneusel math for programming (not trade rules)</h3>
        <ul className="text-xs text-[var(--text-muted)] m-0 pl-4 list-disc space-y-0.5">
          {DUMP2_KNEUSEL_MATH.map((h) => (
            <li key={h.slice(0, 48)}>{h}</li>
          ))}
        </ul>
      </section>

      <section className="os-panel p-4">
        <h2 className="text-base font-medium m-0 mb-2">DUMP3 complex systems science (not trade rules)</h2>
        <ul className="text-xs text-[var(--text-muted)] m-0 pl-4 list-disc space-y-0.5">
          {DUMP3_CHESS_SCIENCE.map((h) => (
            <li key={h.slice(0, 48)}>{h}</li>
          ))}
        </ul>
        <h3 className="text-sm font-medium m-0 mt-4 mb-1">Bear market process (Freeman EPUB)</h3>
        <ul className="text-xs text-[var(--text-muted)] m-0 pl-4 list-disc space-y-0.5">
          {DUMP3_BEAR_HYGIENE.map((h) => (
            <li key={h.slice(0, 48)}>{h}</li>
          ))}
        </ul>
      </section>

      <section className="os-panel p-4">
        <h2 className="text-base font-medium m-0 mb-2">NCI GodMode package (forex sibling — already linked)</h2>
        <p className="text-xs text-[var(--text-muted)] m-0 mb-2">
          Source: <code className="text-[10px]">{NCI_GODMODE_META.buildPackage}</code>
        </p>
        <h3 className="text-sm font-medium m-0 mb-1">Risk charter (map to empire %)</h3>
        <ul className="text-xs text-[var(--text-muted)] m-0 pl-4 list-disc space-y-0.5">
          {NCI_GODMODE_RISK_CHARTER.map((h) => (
            <li key={h.slice(0, 48)}>{h}</li>
          ))}
        </ul>
        <h3 className="text-sm font-medium m-0 mt-3 mb-1">Already in OptionScope</h3>
        <ul className="text-xs text-[var(--text-muted)] m-0 pl-4 list-disc space-y-0.5">
          {NCI_GODMODE_ALREADY_IN_OPTIONSCOPE.map((h) => (
            <li key={h.slice(0, 48)}>{h}</li>
          ))}
        </ul>
      </section>

      <section className="os-panel p-4">
        <h2 className="text-base font-medium m-0 mb-2">Active distilled strategy rules</h2>
        <div className="flex flex-col gap-2">
          {[...BOOKLIBRARY_RULES, ...DUMP2_RULES, ...DUMP3_RULES, ...NEWDUMP_RULES].map((r) => (
            <article
              key={r.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-3"
            >
              <div className="text-sm font-medium">{r.name}</div>
              <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                {r.strategyId} · priority {r.priority} · {r.portfolioRole.replace(/_/g, " ")}
              </div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">
                {r.entryRules.slice(0, 2).join(" · ")}
              </div>
              <div className="text-[10px] text-[var(--text-muted)] mt-1">Source: {r.bookSource}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="os-panel p-4 flex flex-col gap-3">
        <div className="flex flex-wrap gap-2 items-end">
          <label className="os-label flex-1 min-w-[160px]">
            Search titles
            <input
              className="os-input mt-1 w-full"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. money press, crow bar, volatility"
            />
          </label>
          <label className="os-label">
            Library
            <select
              className="os-input mt-1"
              value={source}
              onChange={(e) =>
                setSource(
                  e.target.value as "all" | "newdump" | "booklibrary" | "dump2" | "dump3"
                )
              }
            >
              <option value="all">All</option>
              <option value="booklibrary">L:\bookLibrary</option>
              <option value="newdump">L:\newdump</option>
              <option value="dump2">L:\dump2</option>
              <option value="dump3">L:\DUMP3</option>
            </select>
          </label>
          <label className="os-label">
            Tag
            <select className="os-input mt-1" value={tag} onChange={(e) => setTag(e.target.value)}>
              {tags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="text-xs text-[var(--text-muted)]">{filtered.length} titles</div>
        <div className="max-h-[420px] overflow-y-auto flex flex-col gap-1.5">
          {filtered.map((r) => (
            <div
              key={r.path}
              className="text-xs rounded-md border border-[var(--border)] px-2.5 py-2 bg-[var(--surface-1)]"
            >
              <div className="font-medium text-[var(--text-primary)]">{r.title}</div>
              <div className="text-[var(--text-muted)] mt-0.5 break-all">
                {r.tag} · {r.mb} MB
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-[var(--text-muted)] m-0">
          Paths are local inventory only. Full PDF text is not uploaded. Slow ingest continues via
          structured rules + optional re-run of catalog scripts.
        </p>
      </section>
    </div>
  );
}
