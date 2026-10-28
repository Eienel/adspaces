import { describe, expect, it } from "vitest";
import { bookingTotal, computeFee, splitPayment } from "../src/fees";
import { microToUsdc, usdcToMicro } from "../src/money";

describe("money", () => {
  it("parses and formats USDC", () => {
    expect(usdcToMicro("12.5")).toBe(12_500_000);
    expect(usdcToMicro("0.000001")).toBe(1);
    expect(usdcToMicro(25)).toBe(25_000_000);
    expect(microToUsdc(12_500_000)).toBe("12.50");
    expect(microToUsdc(1)).toBe("0.000001");
    expect(microToUsdc(123_456_789)).toBe("123.456789");
  });
  it("rejects bad input", () => {
    expect(() => usdcToMicro("-1")).toThrow();
    expect(() => usdcToMicro("1.1234567")).toThrow();
    expect(() => usdcToMicro("abc")).toThrow();
  });
});

describe("fees", () => {
  it("floors the fee in the seller's favor", () => {
    expect(computeFee(1_000_000, 1000)).toBe(100_000);
    expect(computeFee(999, 1000)).toBe(99);
    expect(splitPayment(999, 1000)).toEqual({ fee: 99, payout: 900 });
  });
  it("fee + payout always equals amount", () => {
    for (const amt of [0, 1, 7, 12_345_678, 9_007_199_254_740_991]) {
      for (const bps of [0, 1, 250, 1000, 10_000]) {
        const { fee, payout } = splitPayment(amt, bps);
        expect(fee + payout).toBe(amt);
        expect(fee).toBeGreaterThanOrEqual(0);
      }
    }
  });
  it("validates bps and days", () => {
    expect(() => computeFee(1, 10_001)).toThrow();
    expect(() => bookingTotal(1, 0)).toThrow();
    expect(bookingTotal(5_000_000, 7)).toBe(35_000_000);
  });
});
