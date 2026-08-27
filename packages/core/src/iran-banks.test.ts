import { describe, expect, it } from "vitest";
import {
  bankDisplayName,
  detectBankFromCard,
  detectBankFromSheba,
  getBankById,
  OTHER_BANK,
  shebaBankCode,
} from "../src/iran-banks.js";

describe("iran-banks", () => {
  it("resolves banks by id including other and missing", () => {
    expect(getBankById(null)).toBeNull();
    expect(getBankById(undefined)).toBeNull();
    expect(getBankById("")).toBeNull();
    expect(getBankById("other")).toEqual(OTHER_BANK);
    expect(getBankById("melli")?.id).toBe("melli");
    expect(getBankById("no-such-bank")).toBeNull();
  });

  it("picks display name by language", () => {
    const bank = getBankById("melli")!;
    expect(bankDisplayName(bank, "fa")).toBe(bank.fa);
    expect(bankDisplayName(bank, "ar")).toBe(bank.ar);
    expect(bankDisplayName(bank, "en")).toBe(bank.en);
    expect(bankDisplayName(bank, "de")).toBe(bank.en);
  });

  it("extracts sheba bank code and detects bank", () => {
    expect(shebaBankCode("IR12")).toBeNull();
    expect(shebaBankCode("DE89370400440532013000")).toBeNull();
    expect(shebaBankCode("IR820540102680020817909002")).toBe("054");
    expect(detectBankFromSheba("IR12")).toBeNull();
    expect(detectBankFromSheba("IR820540102680020817909002")?.id).toBe("parsian");
    expect(detectBankFromSheba("IR829990102680020817909002")).toBeNull();
  });

  it("detects card BIN with longest match and rejects short input", () => {
    expect(detectBankFromCard("123")).toBeNull();
    expect(detectBankFromCard("6037990000000000")?.id).toBe("melli");
  });
});
