import { describe, expect, it } from "vitest";
import {
  computeStrikeProbability,
  probabilityFinishAbove,
  probabilityOfTouch,
  scoreLevel,
} from "@/domain/strikeProbability";

describe("strikeProbability", () => {
  it("ATM finish above is near 50%", () => {
    const p = probabilityFinishAbove({
      spot: 100,
      strike: 100,
      tYears: 30 / 365,
      sigma: 0.3,
      r: 0.05,
      q: 0,
    });
    expect(p).toBeGreaterThan(0.4);
    expect(p).toBeLessThan(0.6);
  });

  it("deep OTM call finish above is low", () => {
    const p = probabilityFinishAbove({
      spot: 100,
      strike: 150,
      tYears: 30 / 365,
      sigma: 0.25,
    });
    expect(p).toBeLessThan(0.1);
  });

  it("touch ATM is ~100%", () => {
    const t = probabilityOfTouch({
      spot: 100,
      strike: 100,
      tYears: 0.1,
      sigma: 0.3,
    });
    expect(t).toBe(1);
  });

  it("nearby strike has higher touch than far strike", () => {
    const near = probabilityOfTouch({
      spot: 100,
      strike: 105,
      tYears: 45 / 365,
      sigma: 0.35,
    });
    const far = probabilityOfTouch({
      spot: 100,
      strike: 140,
      tYears: 45 / 365,
      sigma: 0.35,
    });
    expect(near).toBeGreaterThan(far);
  });

  it("score levels map green/red", () => {
    expect(scoreLevel(0.8).tone).toBe("green");
    expect(scoreLevel(0.1).tone).toBe("red");
    expect(scoreLevel(0.45).tone).toBe("amber");
  });

  it("computeStrikeProbability returns full payload", () => {
    const r = computeStrikeProbability({
      spot: 200,
      strike: 190,
      tYears: 21 / 365,
      sigma: 0.4,
    });
    expect(r.direction).toBe("down");
    expect(r.hitScore).toBeGreaterThan(0);
    expect(r.hitScore).toBeLessThanOrEqual(1);
    expect(r.levelLabel.length).toBeGreaterThan(3);
  });
});
