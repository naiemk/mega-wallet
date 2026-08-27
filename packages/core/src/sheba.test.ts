import { describe, expect, it } from "vitest";
import { isValidSheba, normalizeSheba, parseShebaRecipient, formatShebaGrouped } from "../src/sheba.js";
import { detectBankFromSheba } from "../src/iran-banks.js";

// Valid Iranian test IBAN (mod97 verified)
const VALID_IBAN = "IR820540102680020817909002";

describe("sheba", () => {
  it("validates known test IBAN", () => {
    expect(normalizeSheba(` ${VALID_IBAN.toLowerCase()} `)).toBe(VALID_IBAN);
    expect(isValidSheba(VALID_IBAN)).toBe(true);
  });

  it("accepts digits-only and Eastern digits", () => {
    expect(normalizeSheba(VALID_IBAN.slice(2))).toBe(VALID_IBAN);
    const persianBody = VALID_IBAN.slice(2).replace(/[0-9]/g, (d) =>
      String.fromCodePoint(0x06f0 + Number(d)),
    );
    expect(isValidSheba(persianBody)).toBe(true);
    expect(isValidSheba(`IR${persianBody}`)).toBe(true);
  });

  it("rejects invalid", () => {
    expect(isValidSheba("IR123")).toBe(false);
    expect(isValidSheba("IR82054010268002081790900X")).toBe(false);
    expect(() => parseShebaRecipient("", "IR123")).toThrow();
    expect(() => parseShebaRecipient("Ali", "IR123")).toThrow("Invalid Sheba IBAN");
  });

  it("parses recipient and detects bank", () => {
    const r = parseShebaRecipient("Ali", VALID_IBAN);
    expect(r.name).toBe("Ali");
    expect(r.sheba).toBe(VALID_IBAN);
    // 054 = Parsian
    expect(detectBankFromSheba(VALID_IBAN)?.id).toBe("parsian");
    expect(formatShebaGrouped(VALID_IBAN)).toContain("IR");
  });
});
