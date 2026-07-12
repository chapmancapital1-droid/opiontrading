import Link from "next/link";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "ti-layout-dashboard" },
  { href: "/builder", label: "Strategy builder", icon: "ti-tools" },
  { href: "/compare", label: "Compare", icon: "ti-columns" },
  { href: "/saved", label: "Saved trades", icon: "ti-bookmark" },
  { href: "/journal", label: "Trade journal", icon: "ti-notebook" },
  { href: "/settings", label: "Settings", icon: "ti-settings" },
  { href: "/education", label: "Education & risk", icon: "ti-shield" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <nav className="md:w-56 border-r border-[var(--border)] p-3 shrink-0">
        <div className="font-medium text-lg px-2 py-3">OptionScope</div>
        <ul className="space-y-1">
          {NAV.map((n) => (
            <li key={n.href}>
              <Link href={n.href} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm hover:bg-[var(--surface-1)]">
                <i className={`ti ${n.icon}`} aria-hidden /> {n.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main className="flex-1 p-4 md:p-6 max-w-4xl">
        {children}
        <footer className="mt-10 text-xs text-[var(--text-muted)] border-t border-[var(--border)] pt-4">
          Educational tool. Not investment advice. Not affiliated with or endorsed by Robinhood.{" "}
          <a className="underline" href="https://www.theocc.com/company-information/documents-and-archives/options-disclosure-document" target="_blank" rel="noreferrer">
            Characteristics and Risks of Standardized Options
          </a>
        </footer>
      </main>
    </div>
  );
}
