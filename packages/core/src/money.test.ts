import { describe, expect, it } from "vitest";
import {
  aggregateRates,
  applySlippage,
  irrFromToman,
  irrToToman,
  median,
  usdFromDecimal,
  usdToDecimal,
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
});
