import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OptionScope — options strategy calculator",
  description:
    "Educational options strategy calculator and trading companion. Analysis only — not investment advice.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
