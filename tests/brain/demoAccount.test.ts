import { describe, it, expect } from "vitest";
import {
  demoAccount,
  seedAccount,
  DEFAULT_SEED_ACCOUNT,
  DEFAULT_DEMO_ACCOUNT,
} from "@/brain/demoAccount";
import { demoAsLiveClient } from "@/brain/liveAccount";
import { resolvePersonalAccountState } from "@/brain/resolveAccount";
import { DEFAULT_PERSONAL_ACCOUNT } from "@/lib/personalAccount";

describe("seed / demo account fixtures (W1-B01)", () => {
  it("DEFAULT_SEED_ACCOUNT is $500 cash empty shares — not $25k fantasy", () => {
    expect(DEFAULT_SEED_ACCOUNT.equity).toBe(500);
    expect(DEFAULT_SEED_ACCOUNT.cash).toBe(500);
    expect(DEFAULT_SEED_ACCOUNT.growthMode).toBe("income_preservation");
    expect(Object.keys(DEFAULT_SEED_ACCOUNT.sharesHeld ?? {})).toHaveLength(0);
  });

  it("demoAccount() defaults to seed $500 (not DEFAULT_DEMO_ACCOUNT)", () => {
    const a = demoAccount();
    expect(a.equity).toBe(500);
    expect(a.growthMode).toBe("income_preservation");
    expect(a.equity).not.toBe(DEFAULT_DEMO_ACCOUNT.equity);
  });

  it("seedAccount(500) forces income_preservation via empire phase", () => {
    const a = seedAccount(500);
    expect(a.equity).toBe(500);
    expect(a.cash).toBe(500);
    expect(a.growthMode).toBe("income_preservation");
  });

  it("legacy DEFAULT_DEMO_ACCOUNT remains $25k for explicit sandbox/tests only", () => {
    expect(DEFAULT_DEMO_ACCOUNT.equity).toBe(25_000);
    expect(DEFAULT_DEMO_ACCOUNT.growthMode).toBe("balanced");
  });

  it("demoAsLiveClient uses seed $500 not $25k", () => {
    const d = demoAsLiveClient();
    expect(d.source).toBe("demo");
    expect(d.equity).toBe(500);
    expect(d.note).toMatch(/seed/i);
  });
});

describe("resolvePersonalAccountState (W1-B01 / B04)", () => {
  it("defaults to manual seed $500 with empty shares", () => {
    const a = resolvePersonalAccountState({});
    expect(a.equity).toBe(500);
    expect(a.cash).toBe(500);
    expect(a.growthMode).toBe("income_preservation");
    expect(a.sharesHeld?.AAPL).toBeUndefined();
  });

  it("manual_seed uses profile equity and never $25k", () => {
    const a = resolvePersonalAccountState({
      profile: { ...DEFAULT_PERSONAL_ACCOUNT, manualEquity: 1000, manualCash: 900 },
    });
    expect(a.equity).toBe(1000);
    expect(a.cash).toBe(900);
    expect(a.equity).not.toBe(25_000);
  });

  it("robinhood_paste merges sharesHeld from import bridge", () => {
    const a = resolvePersonalAccountState({
      profile: {
        ...DEFAULT_PERSONAL_ACCOUNT,
        equitySource: "robinhood_paste",
        manualEquity: 500,
        manualCash: 500,
      },
      rhSharesHeld: { AAPL: 100 },
    });
    expect(a.equity).toBe(500);
    expect(a.sharesHeld?.AAPL).toBe(100);
  });

  it("alpaca_paper maps live when source is alpaca", () => {
    const a = resolvePersonalAccountState({
      profile: {
        ...DEFAULT_PERSONAL_ACCOUNT,
        equitySource: "alpaca_paper",
      },
      live: {
        source: "alpaca",
        equity: 12_000,
        cash: 10_000,
        sharesHeld: { MSFT: 50 },
        openRiskDollars: 100,
        openCampaigns: 1,
        dailyRealizedPL: 0,
      },
    });
    expect(a.equity).toBe(12_000);
    expect(a.sharesHeld?.MSFT).toBe(50);
  });

  it("alpaca_paper falls back to seed when live feed missing", () => {
    const a = resolvePersonalAccountState({
      profile: {
        ...DEFAULT_PERSONAL_ACCOUNT,
        equitySource: "alpaca_paper",
        manualEquity: 500,
      },
      live: { source: "demo", equity: 500, cash: 500, sharesHeld: {}, openRiskDollars: 0, openCampaigns: 0, dailyRealizedPL: 0 },
    });
    expect(a.equity).toBe(500);
  });
});
