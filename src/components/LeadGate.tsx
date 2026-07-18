"use client";

/**
 * NerdCommand free unlock gate — collect lead data before desk access.
 * Company CRM seed: name, email, role, consent → POST /api/leads
 */

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  isValidEmail,
  readStoredLead,
  writeStoredLead,
  type LeadRole,
  type StoredLead,
} from "@/lib/leadCapture";

const ROLES: { id: LeadRole; label: string }[] = [
  { id: "beginner_trader", label: "Beginner options trader" },
  { id: "student", label: "Student / learner" },
  { id: "coach_creator", label: "Coach / content creator" },
  { id: "developer", label: "Developer / builder" },
  { id: "other", label: "Other" },
];

export default function LeadGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [lead, setLead] = useState<StoredLead | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<LeadRole>("beginner_trader");
  const [experience, setExperience] = useState<"none" | "some" | "active">("none");
  const [capitalBand, setCapitalBand] = useState<
    "under_500" | "500_5k" | "5k_25k" | "25k_plus" | "prefer_not"
  >("prefer_not");
  const [marketingOptIn, setMarketingOptIn] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const existing = readStoredLead();
    if (existing) {
      setLead(existing);
      setUnlocked(true);
    }
    setReady(true);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2) {
      setError("Please enter your name.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Please enter a valid email.");
      return;
    }
    if (!termsAccepted) {
      setError("Accept the educational terms to unlock free access.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          experience,
          capitalBand,
          source: "github_free",
          marketingOptIn,
          termsAccepted: true,
          company: "NerdCommand",
        }),
      });
      const j = (await res.json()) as {
        ok?: boolean;
        id?: string;
        unlockedAt?: string;
        error?: string;
      };
      if (!res.ok || !j.ok || !j.id) {
        throw new Error(j.error || "registration_failed");
      }
      const stored: StoredLead = {
        id: j.id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        experience,
        capitalBand,
        source: "github_free",
        marketingOptIn,
        termsAccepted: true,
        unlockedAt: j.unlockedAt ?? new Date().toISOString(),
        product: "optionscope",
        companyBrand: "nerdcommand",
      };
      writeStoredLead(stored);
      setLead(stored);
      setUnlocked(true);
    } catch (err) {
      // Offline / write fail: still unlock locally if terms ok (don't block learning)
      // but try to keep company capture — show error first
      const msg = err instanceof Error ? err.message : "Could not register";
      // Allow local unlock with generated id so user isn't bricked offline
      if (msg.includes("Failed to fetch") || msg.includes("Network")) {
        const stored: StoredLead = {
          id: `local_${Date.now()}`,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          experience,
          capitalBand,
          source: "github_free_offline",
          marketingOptIn,
          termsAccepted: true,
          unlockedAt: new Date().toISOString(),
          product: "optionscope",
          companyBrand: "nerdcommand",
        };
        writeStoredLead(stored);
        setLead(stored);
        setUnlocked(true);
        setError("Registered offline on this device. Re-open online once to sync to NerdCommand.");
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-1)] text-[var(--text-muted)] text-sm">
        Loading NerdCommand desk…
      </div>
    );
  }

  if (unlocked) {
    return (
      <>
        {children}
        {lead && (
          <div className="sr-only" aria-hidden>
            Registered: {lead.email}
          </div>
        )}
      </>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--surface-1)" }}
    >
      <div
        className="w-full max-w-lg rounded-2xl border p-6 md:p-8 shadow-xl"
        style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="os-scope-mark" aria-hidden />
          <span className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
            NerdCommand · Free GitHub access
          </span>
        </div>
        <h1 className="text-2xl font-medium m-0 tracking-tight">Unlock OptionScope</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-2 mb-0 leading-relaxed">
          Free educational options desk from GitHub. Enter your details so NerdCommand can support
          free users, send training (if you opt in), and grow as a software company.{" "}
          <strong className="text-[var(--text-primary)]">No broker password. No auto-trade.</strong>
        </p>

        <form className="mt-5 flex flex-col gap-3" onSubmit={onSubmit}>
          <label className="text-xs text-[var(--text-muted)]">
            Full name *
            <input
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)]"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
              placeholder="Your name"
            />
          </label>
          <label className="text-xs text-[var(--text-muted)]">
            Email *
            <input
              type="email"
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              placeholder="you@email.com"
            />
          </label>
          <label className="text-xs text-[var(--text-muted)]">
            I am a…
            <select
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as LeadRole)}
            >
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-[var(--text-muted)]">
              Options experience
              <select
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm"
                value={experience}
                onChange={(e) =>
                  setExperience(e.target.value as "none" | "some" | "active")
                }
              >
                <option value="none">None / new</option>
                <option value="some">Some</option>
                <option value="active">Active trader</option>
              </select>
            </label>
            <label className="text-xs text-[var(--text-muted)]">
              Capital band
              <select
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm"
                value={capitalBand}
                onChange={(e) =>
                  setCapitalBand(
                    e.target.value as
                      | "under_500"
                      | "500_5k"
                      | "5k_25k"
                      | "25k_plus"
                      | "prefer_not",
                  )
                }
              >
                <option value="prefer_not">Prefer not to say</option>
                <option value="under_500">Under $500</option>
                <option value="500_5k">$500–$5k</option>
                <option value="5k_25k">$5k–$25k</option>
                <option value="25k_plus">$25k+</option>
              </select>
            </label>
          </div>

          <label className="flex items-start gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
            />
            <span>
              I understand this is <strong>educational software only</strong>, not investment advice,
              options involve risk of loss, and OptionScope does not place trades. *
            </span>
          </label>
          <label className="flex items-start gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={marketingOptIn}
              onChange={(e) => setMarketingOptIn(e.target.checked)}
            />
            <span>
              NerdCommand may email me free training, product updates, and curriculum notes. I can
              opt out later.
            </span>
          </label>

          {error && (
            <p className="text-xs text-amber-400 m-0" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="os-btn os-btn-primary w-full mt-1 py-2.5 text-sm font-medium disabled:opacity-60"
          >
            {submitting ? "Unlocking…" : "Unlock free desk access"}
          </button>
        </form>

        <p className="text-[10px] text-[var(--text-muted)] mt-4 mb-0 leading-relaxed">
          Data stored for NerdCommand company ops: name, email, role, experience band, opt-in flags,
          timestamp. Local unlock token on this device. Server log:{" "}
          <code>.data/leads.jsonl</code> (not committed to Git). Privacy version NC-LEAD-1.0. See ·
          Trust · Own.
        </p>
      </div>
    </div>
  );
}
