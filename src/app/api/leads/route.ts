/**
 * NerdCommand lead capture API
 * POST — register free user (email unlock)
 * GET  — export leads (requires NERDCOMMAND_LEADS_KEY header/query)
 *
 * Stored under .data/leads.jsonl (gitignored). Educational product CRM seed.
 */

import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { createHash, randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), ".data");
const LEADS_FILE = path.join(DATA_DIR, "leads.jsonl");
const SUMMARY_FILE = path.join(DATA_DIR, "leads_summary.json");

type Body = {
  name?: string;
  email?: string;
  role?: string;
  experience?: string;
  capitalBand?: string;
  source?: string;
  marketingOptIn?: boolean;
  termsAccepted?: boolean;
  company?: string;
};

function validEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 200;
}

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function appendLead(line: string) {
  await ensureDataDir();
  await fs.appendFile(LEADS_FILE, line.endsWith("\n") ? line : line + "\n", "utf8");
}

async function updateSummary(email: string) {
  await ensureDataDir();
  let summary: {
    totalLeads: number;
    marketingOptIns: number;
    lastAt: string | null;
    byRole: Record<string, number>;
    emailsHashSample: string[];
  } = {
    totalLeads: 0,
    marketingOptIns: 0,
    lastAt: null,
    byRole: {},
    emailsHashSample: [],
  };
  try {
    summary = JSON.parse(await fs.readFile(SUMMARY_FILE, "utf8"));
  } catch {
    /* fresh */
  }
  // recount from file for honesty
  try {
    const raw = await fs.readFile(LEADS_FILE, "utf8");
    const lines = raw.split("\n").filter(Boolean);
    summary.totalLeads = lines.length;
    summary.marketingOptIns = 0;
    summary.byRole = {};
    for (const line of lines) {
      try {
        const o = JSON.parse(line) as {
          marketingOptIn?: boolean;
          role?: string;
        };
        if (o.marketingOptIn) summary.marketingOptIns++;
        const r = o.role || "other";
        summary.byRole[r] = (summary.byRole[r] ?? 0) + 1;
      } catch {
        /* skip */
      }
    }
  } catch {
    summary.totalLeads += 1;
  }
  summary.lastAt = new Date().toISOString();
  const hash = createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 12);
  summary.emailsHashSample = [hash, ...(summary.emailsHashSample ?? [])].slice(0, 20);
  await fs.writeFile(SUMMARY_FILE, JSON.stringify(summary, null, 2) + "\n", "utf8");
  return summary;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim().slice(0, 120);
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 200);
  const role = String(body.role ?? "other").slice(0, 40);
  const experience = String(body.experience ?? "none").slice(0, 40);
  const capitalBand = String(body.capitalBand ?? "prefer_not").slice(0, 40);
  const source = String(body.source ?? "github_free").slice(0, 80);
  const company = String(body.company ?? "").trim().slice(0, 120);
  const marketingOptIn = Boolean(body.marketingOptIn);
  const termsAccepted = Boolean(body.termsAccepted);

  if (!name || name.length < 2) {
    return NextResponse.json({ ok: false, error: "name_required" }, { status: 400 });
  }
  if (!validEmail(email)) {
    return NextResponse.json({ ok: false, error: "email_invalid" }, { status: 400 });
  }
  if (!termsAccepted) {
    return NextResponse.json({ ok: false, error: "terms_required" }, { status: 400 });
  }

  const id = randomUUID();
  const at = new Date().toISOString();
  const record = {
    id,
    at,
    product: "optionscope",
    companyBrand: "nerdcommand",
    name,
    email,
    role,
    experience,
    capitalBand,
    source,
    company: company || null,
    marketingOptIn,
    termsAccepted: true,
    privacyVersion: "NC-LEAD-1.0",
    ua: (request.headers.get("user-agent") ?? "").slice(0, 240),
  };

  try {
    await appendLead(JSON.stringify(record));
    const summary = await updateSummary(email);
    return NextResponse.json({
      ok: true,
      id,
      unlockedAt: at,
      message: "Welcome to NerdCommand free desk access.",
      summary: {
        totalLeads: summary.totalLeads,
        // never return other users' emails
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "write_failed",
      },
      { status: 500 },
    );
  }
}

/** Export for company ops — set NERDCOMMAND_LEADS_KEY in .env.local */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const key =
    request.headers.get("x-nerdcommand-leads-key") ??
    url.searchParams.get("key") ??
    "";
  const expected = process.env.NERDCOMMAND_LEADS_KEY ?? "";
  if (!expected || key !== expected) {
    // Safe public summary only (no PII)
    try {
      const summary = JSON.parse(await fs.readFile(SUMMARY_FILE, "utf8")) as {
        totalLeads: number;
        marketingOptIns: number;
        lastAt: string | null;
        byRole: Record<string, number>;
      };
      return NextResponse.json({
        ok: true,
        public: true,
        totalLeads: summary.totalLeads ?? 0,
        marketingOptIns: summary.marketingOptIns ?? 0,
        lastAt: summary.lastAt,
        byRole: summary.byRole ?? {},
        hint: "Set NERDCOMMAND_LEADS_KEY and pass x-nerdcommand-leads-key for full export",
      });
    } catch {
      return NextResponse.json({
        ok: true,
        public: true,
        totalLeads: 0,
        hint: "No leads yet",
      });
    }
  }

  try {
    await ensureDataDir();
    const raw = await fs.readFile(LEADS_FILE, "utf8").catch(() => "");
    const leads = raw
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    return NextResponse.json({
      ok: true,
      public: false,
      count: leads.length,
      leads,
      path: ".data/leads.jsonl",
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "read_failed" },
      { status: 500 },
    );
  }
}
