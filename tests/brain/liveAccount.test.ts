import { describe, it, expect } from "vitest";
import { mapLiveToAccountState, demoAsLiveClient } from "@/brain/liveAccount";

describe("mapLiveToAccountState", () => {
  it("maps Alpaca paper equity into brain AccountState", () => {
    const a = mapLiveToAccountState({
      source: "alpaca",
      mode: "paper",
      status: "ACTIVE",
      equity: 100_000,
      cash: 95_000,
      buyingPower: 190_000,
      sharesHeld: { AAPL: 100 },
      openRiskDollars: 500,
      openCampaigns: 1,
      dailyRealizedPL: -50,
    });
    expect(a.equity).toBe(100_000);
    expect(a.cash).toBe(95_000);
    expect(a.optionsFloat).toBeGreaterThan(0);
    expect(a.optionsFloat).toBeLessThanOrEqual(a.cash);
    expect(a.sharesHeld?.AAPL).toBe(100);
    expect(a.openRiskDollars).toBe(500);
    expect(a.dailyRealizedPL).toBe(-50);
    expect(a.approvalProfile).toBe("level3_spreads");
  });

  it("demo fallback is seed $500 (not $25k fantasy)", () => {
    const d = demoAsLiveClient();
    expect(d.source).toBe("demo");
    expect(d.equity).toBe(500);
    expect(d.equity).toBeLessThan(5_000);
    const a = mapLiveToAccountState(d);
    expect(a.equity).toBe(d.equity);
  });
});
