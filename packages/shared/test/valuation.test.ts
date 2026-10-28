import { describe, expect, it } from "vitest";
import { estimateDailyProfileViews, estimatedCpmUsdc, maxPricePerDayMicro } from "../src/valuation";
import { buildTransferRequestUrl } from "../src/solana-pay";

const base = { followers: 50_000, avgImpressions: 20_000, engagementRate: 0.02, verified: false };

describe("valuation", () => {
  it("estimates views from the stronger signal", () => {
    expect(estimateDailyProfileViews(base)).toBe(200); // max(100, 200)
    expect(estimateDailyProfileViews({ ...base, verified: true })).toBe(220);
  });
  it("uses an admin-reported value when present", () => {
    expect(estimateDailyProfileViews({ ...base, reportedProfileVisitsPerDay: 1234 })).toBe(1234);
  });
  it("caps price by CPM with a floor", () => {
    expect(maxPricePerDayMicro(base)).toBe(5_000_000); // 200 views → $5
    expect(maxPricePerDayMicro({ followers: 10, avgImpressions: 0, engagementRate: 0, verified: false })).toBe(1_000_000);
  });
  it("penalizes low engagement and rewards high", () => {
    const low = estimateDailyProfileViews({ ...base, engagementRate: 0.001 });
    const high = estimateDailyProfileViews({ ...base, engagementRate: 0.2 });
    expect(low).toBe(150);
    expect(high).toBe(300);
  });
  it("computes CPM", () => {
    expect(estimatedCpmUsdc(5_000_000, 200)).toBe(25);
    expect(estimatedCpmUsdc(5_000_000, 0)).toBeNull();
  });
});

describe("solana pay", () => {
  it("builds a transfer request URL", () => {
    const url = buildTransferRequestUrl({
      recipient: "Escrow111",
      amountMicro: 12_500_000,
      splToken: "Mint111",
      reference: "Ref111",
      label: "AdSpaces",
      memo: "adspaces:abc",
    });
    expect(url).toBe("solana:Escrow111?amount=12.5&spl-token=Mint111&reference=Ref111&label=AdSpaces&memo=adspaces%3Aabc");
  });
});
