"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

const PRIMARY_NAV = [
  { href: "/dashboard", label: "Command", icon: "ti-layout-dashboard", short: "Cmd" },
  { href: "/builder", label: "Trade Lab", icon: "ti-tools", short: "Lab" },
  { href: "/compare", label: "Compare", icon: "ti-columns", short: "Cmp" },
  { href: "/saved", label: "Saved", icon: "ti-bookmark", short: "Saved" },
  { href: "/journal", label: "Journal", icon: "ti-notebook", short: "Jrnl" },
];

const SECONDARY_NAV = [
  { href: "/settings", label: "Settings", icon: "ti-settings" },
  { href: "/education", label: "Education", icon: "ti-shield" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/dashboard";
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("optionscope.theme")) as
      | "dark"
      | "light"
      | null;
    const t = stored === "light" || stored === "dark" ? stored : "dark";
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("optionscope.theme", next);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[var(--surface-1)]">
      {/* Desktop sidebar */}
      <nav
        className="os-shell-nav hidden md:flex md:w-56 flex-col shrink-0 border-r p-3"
        style={{
          borderColor: "var(--border)",
          background: "var(--surface-2)",
          minHeight: "100vh",
        }}
      >
        <div className="flex items-center gap-2.5 px-2 py-3">
          <span className="os-scope-mark" aria-hidden />
          <div>
            <div className="font-medium text-[17px] tracking-tight leading-tight">OptionScope</div>
            <div className="text-[10px] text-[var(--text-muted)]">Empire companion</div>
          </div>
        </div>

        <ul className="space-y-0.5 mt-1 flex-1">
          {PRIMARY_NAV.map((n) => {
            const active = isActive(pathname, n.href);
            return (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className={`os-nav-item ${active ? "os-nav-item-active" : ""}`}
                >
                  <i className={`ti ${n.icon} text-base opacity-90`} aria-hidden />
                  {n.label}
                </Link>
              </li>
            );
          })}
          <li className="pt-3 mt-2 border-t" style={{ borderColor: "var(--border)" }}>
            <div className="px-2.5 py-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              More
            </div>
          </li>
          {SECONDARY_NAV.map((n) => {
            const active = isActive(pathname, n.href);
            return (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className={`os-nav-item ${active ? "os-nav-item-active" : ""}`}
                >
                  <i className={`ti ${n.icon} text-base opacity-90`} aria-hidden />
                  {n.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-auto pt-3 border-t px-1" style={{ borderColor: "var(--border)" }}>
          <button type="button" onClick={toggleTheme} className="os-btn w-full text-xs mb-2">
            <i className={`ti ${theme === "dark" ? "ti-sun" : "ti-moon"}`} aria-hidden />
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <p className="text-[10px] text-[var(--text-muted)] px-1 leading-snug">
            See · Trust · Own
            <br />
            No auto-trade · educational
          </p>
        </div>
      </nav>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 pb-[calc(56px+env(safe-area-inset-bottom,0px))] md:pb-0">
        {/* Mobile top bar */}
        <header
          className="md:hidden sticky top-0 z-30 flex items-center justify-between gap-2 px-3 py-2.5 border-b"
          style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <span className="os-scope-mark" aria-hidden />
            <span className="font-medium text-sm">OptionScope</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="os-badge os-badge-accent text-[10px]">PERSONAL</span>
            <button type="button" onClick={toggleTheme} className="os-btn px-2 py-1" aria-label="Toggle theme">
              <i className={`ti ${theme === "dark" ? "ti-sun" : "ti-moon"}`} />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 w-full zone-cockpit max-w-[1440px] mx-auto">
          {children}
          <footer
            className="mt-10 text-xs text-[var(--text-muted)] border-t pt-4 pb-2"
            style={{ borderColor: "var(--border)" }}
          >
            Educational companion for personal process. Not investment advice. No auto-trade. See ·
            Trust · Own.{" "}
            <a
              className="underline"
              href="https://www.theocc.com/company-information/documents-and-archives/options-disclosure-document"
              target="_blank"
              rel="noreferrer"
            >
              OCC options disclosure
            </a>
          </footer>
        </main>
      </div>

      {/* Mobile tab bar */}
      <nav className="os-tabbar md:hidden" aria-label="Primary">
        {PRIMARY_NAV.map((n) => {
          const active = isActive(pathname, n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`os-tab ${active ? "os-tab-active" : ""}`}
              onClick={() => setMoreOpen(false)}
            >
              <i className={`ti ${n.icon}`} aria-hidden />
              {n.short}
            </Link>
          );
        })}
        <button
          type="button"
          className={`os-tab ${moreOpen || isActive(pathname, "/settings") || isActive(pathname, "/education") ? "os-tab-active" : ""}`}
          onClick={() => setMoreOpen((v) => !v)}
        >
          <i className="ti ti-dots" aria-hidden />
          More
        </button>
      </nav>

      {/* More sheet */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 border-0"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
          />
          <div
            className="relative rounded-t-2xl p-4 pb-8 border-t space-y-1"
            style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
          >
            <div className="os-kicker mb-2">More</div>
            {SECONDARY_NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="os-nav-item"
                onClick={() => setMoreOpen(false)}
              >
                <i className={`ti ${n.icon}`} aria-hidden />
                {n.label}
              </Link>
            ))}
            <button type="button" onClick={toggleTheme} className="os-btn w-full mt-2">
              Toggle theme
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
