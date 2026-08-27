import { describe, expect, it } from "vitest";
import {
  formatCardGrouped,
  isNonIranianCardBrand,
  isValidIranCard,
  maskCardNumber,
  normalizeCardNumber,
  normalizeNumericInput,
  parseCardRecipient,
} from "../src/iran-card.js";
import { detectBankFromCard } from "../src/iran-banks.js";

// Known Luhn-valid Iranian-looking test PAN (Melli BIN 603799)
// Generated: 603799 + account + Luhn check
function luhnCheckDigit(partial15: string): string {
  let sum = 0;
  let alt = true;
  for (let i = partial15.length - 1; i >= 0; i--) {
    let n = partial15.charCodeAt(i) - 48;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return String((10 - (sum % 10)) % 10);
}

const MELLI_PARTIAL = "603799000000000";
const VALID_MELLI = MELLI_PARTIAL + luhnCheckDigit(MELLI_PARTIAL);

describe("iran-card", () => {
  it("normalizes Eastern digits and grouping", () => {
    expect(normalizeCardNumber("۶۰۳۷ ۹۹۰۰ ۰۰۰۱ ۲۳۴۵".slice(0, 20))).toMatch(/^\d+$/);
    expect(normalizeCardNumber("6037-9900-0000-000" + luhnCheckDigit("603799000000000")).length).toBe(
      16,
    );
  });

  it("validates Luhn and rejects zero blocks / Visa / Amex", () => {
    expect(isValidIranCard(VALID_MELLI)).toBe(true);
    expect(isValidIranCard("0000000000000000")).toBe(false);
    expect(isValidIranCard("1234567890000000")).toBe(false); // trailing zero block
    expect(isNonIranianCardBrand("4111111111111111")).toBe(true);
    expect(isNonIranianCardBrand("341111111111111")).toBe(true);
    expect(isNonIranianCardBrand("371111111111111")).toBe(true);
    expect(isValidIranCard("4111111111111111")).toBe(false);
  });

  it("accepts Persian digit paste for valid card", () => {
    const persian = VALID_MELLI.replace(/[0-9]/g, (d) =>
      String.fromCodePoint(0x06f0 + Number(d)),
    );
    expect(isValidIranCard(persian)).toBe(true);
  });

  it("detects bank from BIN", () => {
    expect(detectBankFromCard(VALID_MELLI)?.id).toBe("melli");
  });

  it("formats and parses recipient", () => {
    expect(formatCardGrouped(VALID_MELLI)).toMatch(/^\d{4} \d{4} \d{4} \d{4}$/);
    const r = parseCardRecipient("Ali", VALID_MELLI);
    expect(r.cardNumber).toBe(VALID_MELLI);
    expect(r.bankId).toBe("melli");
  });

  it("masks short cards as-is and long cards with stars", () => {
    expect(maskCardNumber("1234")).toBe("1234");
    expect(maskCardNumber(VALID_MELLI)).toBe(
      `${VALID_MELLI.slice(0, 4)} **** **** ${VALID_MELLI.slice(-4)}`,
    );
  });

  it("normalizes numeric input via Eastern digits", () => {
    expect(normalizeNumericInput("۱۲۳")).toBe("123");
  });

  it("rejects empty recipient name", () => {
    expect(() => parseCardRecipient("  ", VALID_MELLI)).toThrow("Recipient name required");
  });

  it("rejects invalid card and maps unknown BIN to other", () => {
    expect(() => parseCardRecipient("Ali", "1234")).toThrow("Invalid card number");
    // Luhn-valid PAN with BIN outside the Iran bank table
    const unknown = "9999991234567893";
    expect(isValidIranCard(unknown)).toBe(true);
    expect(detectBankFromCard(unknown)).toBeNull();
    expect(parseCardRecipient("Ali", unknown).bankId).toBe("other");
  });
});
