import { describe, expect, it } from "vitest";
import {
  digitsToPersian,
  extractLatinDigits,
  formatDigitsForLocale,
  normalizeDigits,
  parseUsdAmountInput,
} from "../src/digits.js";

describe("digits", () => {
  it("normalizes Persian and Arabic-Indic digits", () => {
    expect(normalizeDigits("۱۲۳۴")).toBe("1234");
    expect(normalizeDigits("١٢٣٤")).toBe("1234");
    expect(normalizeDigits("۱٬۲۳۴٫۵۶")).toBe("1234.56");
    expect(extractLatinDigits("IR۸۲۰۵-۴۰۱۰")).toBe("82054010");
  });

  it("formats for locale", () => {
    expect(formatDigitsForLocale("6219", "fa")).toBe(digitsToPersian("6219"));
    expect(formatDigitsForLocale("6219", "en")).toBe("6219");
    expect(formatDigitsForLocale("6219", "ar")).toMatch(/^[٠-٩]+$/);
  });

  it("parses USD amounts with Eastern digits", () => {
    expect(parseUsdAmountInput("۵۰")).toEqual({ value: 50, text: "50" });
    expect(parseUsdAmountInput("10.5")).toEqual({ value: 10.5, text: "10.5" });
    expect(parseUsdAmountInput(".5")).toEqual({ value: 0.5, text: ".5" });
    expect(parseUsdAmountInput("abc")).toBeNull();
    expect(parseUsdAmountInput("")).toBeNull();
    expect(parseUsdAmountInput("   ")).toBeNull();
    expect(parseUsdAmountInput("10.555")).toBeNull();
    // Overflow → Infinity after Number()
    expect(parseUsdAmountInput("9".repeat(400))).toBeNull();
  });
});
