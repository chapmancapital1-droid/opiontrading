import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OptionScope — empire trading companion",
  description:
    "Personal options strategy lab and trading companion. Educational analysis only — not investment advice. No auto-trade.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
