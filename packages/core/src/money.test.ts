import { describe, expect, it } from "vitest";
import {
  aggregateRates,
  applyCommission,
  applySlippage,
  irrFromToman,
  irrToToman,
  median,
  usdFromDecimal,
  usdToDecimal,
  voteRates,
  withinSlippage,
} from "../src/money.js";

describe("money", () => {
  it("converts USD decimal to cents", () => {
    expect(usdFromDecimal("10.50")).toBe(1050);
    expect(usdFromDecimal(10.5)).toBe(1050);
    expect(usdToDecimal(1050)).toBe("10.50");
  });

  it("rejects invalid USD", () => {
    expect(() => usdFromDecimal("-1")).toThrow();
  });

  it("converts toman/rial", () => {
    expect(irrFromToman(1000)).toBe(10000);
    expect(irrToToman(10000)).toBe(1000);
    expect(() => irrFromToman(-1)).toThrow();
  });

  it("applies slippage", () => {
    expect(applySlippage(10000, 100, "min")).toBe(9900);
    expect(applySlippage(10000, 100, "max")).toBe(10100);
  });

  it("checks within slippage", () => {
    expect(withinSlippage(9950, 10000, 100)).toBe(true);
    expect(withinSlippage(9800, 10000, 100)).toBe(false);
  });

  it("computes median", () => {
    expect(median([1, 3, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(3);
    expect(median([])).toBeNull();
  });

  it("aggregates rates with minimum sources", () => {
    expect(aggregateRates([100, 102, 101])).toBe(101);
    expect(aggregateRates([100])).toBeNull();
  });

  it("votes 3-of-3 happy path", () => {
    const result = voteRates([1_050_000, 1_051_000, 1_049_000]);
    expect(result?.midRate).toBe(1_050_000);
    expect(result?.accepted).toHaveLength(3);
    expect(result?.rejected).toHaveLength(0);
  });

  it("discards one outlier and keeps quorum", () => {
    const result = voteRates([1_050_000, 1_051_000, 1_200_000], { maxDeviationBps: 200 });
    expect(result?.midRate).toBe(1_050_500);
    expect(result?.accepted).toHaveLength(2);
    expect(result?.rejected).toContain(1_200_000);
  });

  it("returns null when two-way disagreement leaves no quorum", () => {
    expect(voteRates([1_000_000, 1_100_000], { maxDeviationBps: 200, minSources: 2 })).toBeNull();
  });

  it("discards 10x unit-error rates via sanity band", () => {
    const result = voteRates([1_050_000, 1_051_000, 105_000], {
      minRate: 100_000,
      maxRate: 20_000_000,
      maxDeviationBps: 200,
    });
    // 105_000 is in band but far from median → rejected as deviation
    expect(result?.accepted).toHaveLength(2);
    expect(result?.rejected).toContain(105_000);
  });

  it("discards rates outside absolute sanity band", () => {
    const result = voteRates([1_050_000, 1_051_000, 50_000], {
      minRate: 100_000,
      maxRate: 20_000_000,
    });
    expect(result?.accepted).toHaveLength(2);
    expect(result?.rejected).toContain(50_000);
  });

  it("fails when fewer than minSources remain", () => {
    expect(voteRates([1_050_000], { minSources: 2 })).toBeNull();
    expect(voteRates([], { minSources: 2 })).toBeNull();
  });

  it("applies commission reducing customer rate", () => {
    expect(applyCommission(1_000_000, 100)).toBe(990_000);
    expect(applyCommission(1_050_000, 100)).toBe(1_039_500);
    expect(applyCommission(100, 0)).toBe(100);
    expect(applyCommission(0, 100)).toBe(0);
    expect(applyCommission(-5, 100)).toBe(0);
    expect(applyCommission(Number.NaN, 100)).toBe(0);
    expect(applyCommission(1_000_000, -50)).toBe(1_000_000);
  });
});
