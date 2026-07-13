import { describe, it, expect } from "vitest";
import { parseRhPaste } from "@/lib/rhImport";

describe("parseRhPaste", () => {
  it("parses simple CSV with header", () => {
    const csv = `Symbol,Side,Quantity,Price,Date
AAPL,buy,1,3.50,2026-07-01
MSFT,sell,2,1.20,2026-07-02`;
    const r = parseRhPaste(csv);
    expect(r.rows.length).toBe(2);
    expect(r.rows[0]!.symbol).toBe("AAPL");
    expect(r.rows[0]!.qty).toBe(1);
    expect(r.summary).toMatch(/2/);
  });

  it("rejects empty", () => {
    const r = parseRhPaste("   ");
    expect(r.rows.length).toBe(0);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("includes process hints and never asks for password", () => {
    const r = parseRhPaste("BOT 1 SPY call");
    expect(r.processHints.some((h) => /password/i.test(h))).toBe(true);
  });
});
