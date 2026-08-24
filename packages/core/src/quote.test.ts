import { describe, expect, it, vi, afterEach } from "vitest";
import {
  isQuoteExpired,
  isQuoteStillValid,
  paymentMethodPreference,
  quoteExpiresAt,
  selectProvider,
  type QuoteSnapshot,
} from "../src/quote.js";

const NOW = new Date("2026-08-24T12:00:00Z");

const baseQuote = (): QuoteSnapshot => ({
  id: "q1",
  sourceCurrency: "EUR",
  destCurrency: "IRR",
  sourceAmountMinor: 10000,
  usdcOutMinor: 1050,
  destOutMinor: 50000000,
  paymentMethod: "creditcard",
  provider: "moonpay",
  slippageBps: 100,
  expiresAt: quoteExpiresAt(NOW),
  status: "active",
});

describe("quote", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("detects expiry", () => {
    const q = baseQuote();
    expect(isQuoteExpired(q, NOW)).toBe(false);
    expect(isQuoteExpired(q, new Date("2026-08-25T00:00:00Z"))).toBe(true);
    expect(isQuoteExpired({ ...q, status: "expired" }, NOW)).toBe(true);
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(isQuoteExpired(q)).toBe(false);
  });

  it("validates slippage on refresh", () => {
    const q = baseQuote();
    expect(
      isQuoteStillValid(q, { usdcOutMinor: 1040, destOutMinor: 49900000 }, NOW),
    ).toBe(true);
    expect(
      isQuoteStillValid(q, { usdcOutMinor: 900, destOutMinor: 49900000 }, NOW),
    ).toBe(false);
    expect(
      isQuoteStillValid(q, { usdcOutMinor: 1040, destOutMinor: 49900000 }, new Date("2026-08-25T00:00:00Z")),
    ).toBe(false);
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(isQuoteStillValid(q, { usdcOutMinor: 1040, destOutMinor: 49900000 })).toBe(true);
  });

  it("selects recommended provider", () => {
    const providers = [
      { id: "a", labels: [] },
      { id: "b", labels: ["Recommended"] },
    ];
    expect(selectProvider(providers)).toBe("b");
    expect(selectProvider(providers, "a")).toBe("a");
  });

  it("prefers last successful payment method", () => {
    expect(paymentMethodPreference("revolut", "paypal")).toBe("revolut");
    expect(paymentMethodPreference(null, "paypal")).toBe("paypal");
    expect(paymentMethodPreference(null, null)).toBeNull();
  });

  it("handles consumed quotes and empty providers", () => {
    const q = { ...baseQuote(), status: "consumed" as const };
    expect(isQuoteStillValid(q, { usdcOutMinor: 1050, destOutMinor: 50000000 }, NOW)).toBe(false);
    expect(selectProvider([])).toBeNull();
    expect(selectProvider([{ id: "a" }, { id: "b", labels: ["Recommended"] }], "missing")).toBe("b");
    expect(selectProvider([{ id: "only" }])).toBe("only");
  });
});
