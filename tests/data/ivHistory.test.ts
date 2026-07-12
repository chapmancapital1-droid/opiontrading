import { describe, it, expect } from "vitest";
import {
  upsertSnapshot,
  pruneHistory,
  computeIvRank,
  computeIvPercentile,
  summarizeIvHistory,
  toDateKey,
  type IvSnapshot,
} from "@/data/ivHistory";

function series(vals: number[]): IvSnapshot[] {
  return vals.map((atmIv, i) => ({ date: `2026-01-${String(i + 1).padStart(2, "0")}`, atmIv }));
}

describe("toDateKey", () => {
  it("passes through YYYY-MM-DD", () => {
    expect(toDateKey("2026-07-11")).toBe("2026-07-11");
  });
  it("normalizes an ISO timestamp to a day key", () => {
    expect(toDateKey("2026-07-11T15:30:00.000Z")).toBe("2026-07-11");
  });
});

describe("upsertSnapshot", () => {
  it("appends and keeps chronological order", () => {
    let h: IvSnapshot[] = [];
    h = upsertSnapshot(h, { date: "2026-01-03", atmIv: 0.3 });
    h = upsertSnapshot(h, { date: "2026-01-01", atmIv: 0.2 });
    h = upsertSnapshot(h, { date: "2026-01-02", atmIv: 0.25 });
    expect(h.map((x) => x.date)).toEqual(["2026-01-01", "2026-01-02", "2026-01-03"]);
  });

  it("upserts same-day writes (last write wins, no duplicate)", () => {
    let h: IvSnapshot[] = [{ date: "2026-01-01", atmIv: 0.2 }];
    h = upsertSnapshot(h, { date: "2026-01-01", atmIv: 0.4, spot: 100 });
    expect(h).toHaveLength(1);
    expect(h[0]).toEqual({ date: "2026-01-01", atmIv: 0.4, spot: 100 });
  });

  it("omits spot when not provided (exactOptionalPropertyTypes-safe)", () => {
    const h = upsertSnapshot([], { date: "2026-01-01", atmIv: 0.2 });
    expect("spot" in h[0]!).toBe(false);
  });
});

describe("pruneHistory", () => {
  it("keeps the most recent N", () => {
    const h = series([0.1, 0.2, 0.3, 0.4, 0.5]);
    const pruned = pruneHistory(h, 3);
    expect(pruned.map((x) => x.atmIv)).toEqual([0.3, 0.4, 0.5]);
  });
});

describe("computeIvRank", () => {
  it("returns 1 when current is the window high", () => {
    expect(computeIvRank([0.1, 0.2, 0.3], 0.3)).toBe(1);
  });
  it("returns 0 when current is the window low", () => {
    expect(computeIvRank([0.1, 0.2, 0.3], 0.1)).toBe(0);
  });
  it("returns 0.5 at the window midpoint", () => {
    expect(computeIvRank([0.2, 0.4], 0.3)).toBeCloseTo(0.5, 10);
  });
  it("clamps values outside the historical range", () => {
    expect(computeIvRank([0.2, 0.4], 0.5)).toBe(1);
    expect(computeIvRank([0.2, 0.4], 0.1)).toBe(0);
  });
  it("returns null for a flat series (no usable range)", () => {
    expect(computeIvRank([0.3, 0.3, 0.3], 0.3)).toBeNull();
  });
  it("returns null with fewer than two points", () => {
    expect(computeIvRank([0.3], 0.3)).toBeNull();
  });
});

describe("computeIvPercentile", () => {
  it("counts days at or below current", () => {
    expect(computeIvPercentile([0.1, 0.2, 0.3, 0.4], 0.3)).toBe(0.75);
  });
  it("is 1 at or above the max", () => {
    expect(computeIvPercentile([0.1, 0.2, 0.3], 0.3)).toBe(1);
  });
  it("returns null when empty", () => {
    expect(computeIvPercentile([], 0.3)).toBeNull();
  });
});

describe("summarizeIvHistory", () => {
  it("summarizes min/max/current/rank/percentile", () => {
    const s = summarizeIvHistory(series([0.2, 0.4, 0.3]));
    expect(s).not.toBeNull();
    expect(s!.count).toBe(3);
    expect(s!.min).toBe(0.2);
    expect(s!.max).toBe(0.4);
    expect(s!.current).toBe(0.3); // last snapshot
    expect(s!.ivRank).toBeCloseTo(0.5, 10);
  });
  it("falls back to percentile for ivRank on a flat series", () => {
    const s = summarizeIvHistory(series([0.3, 0.3]));
    expect(s!.ivRank).toBe(s!.ivPercentile);
  });
  it("returns null for empty history", () => {
    expect(summarizeIvHistory([])).toBeNull();
  });
});
