import { describe, expect, it } from "vitest";
import { isValidSheba, normalizeSheba, parseShebaRecipient } from "../src/sheba.js";

// Valid Iranian test IBAN (mod97 verified)
const VALID_IBAN = "IR820540102680020817909002";

describe("sheba", () => {
  it("validates known test IBAN", () => {
    expect(normalizeSheba(` ${VALID_IBAN.toLowerCase()} `)).toBe(VALID_IBAN);
    expect(isValidSheba(VALID_IBAN)).toBe(true);
  });

  it("rejects invalid", () => {
    expect(isValidSheba("IR123")).toBe(false);
    expect(isValidSheba("IR82054010268002081790900X")).toBe(false);
    expect(() => parseShebaRecipient("", "IR123")).toThrow();
    expect(() => parseShebaRecipient("Ali", "IR123")).toThrow("Invalid Sheba IBAN");
  });

  it("parses recipient", () => {
    const r = parseShebaRecipient("Ali", VALID_IBAN);
    expect(r.name).toBe("Ali");
  });
});
