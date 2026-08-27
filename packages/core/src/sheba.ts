import { extractLatinDigits, normalizeDigits } from "./digits.js";
import { detectBankFromSheba } from "./iran-banks.js";

const SHEBA_LENGTH = 26;

export function normalizeSheba(input: string): string {
  let n = normalizeDigits(input).replace(/\s/g, "").toUpperCase();
  // Digits-only paste (24) → prepend IR
  const digitsOnly = extractLatinDigits(n);
  if (!n.startsWith("IR") && /^\d{24}$/.test(digitsOnly)) {
    n = `IR${digitsOnly}`;
  } else if (n.startsWith("IR")) {
    n = `IR${extractLatinDigits(n.slice(2)).slice(0, 24)}`;
  } else {
    // Strip non IR prefixes; only Iranian Sheba is accepted
    const body = extractLatinDigits(n).slice(0, 24);
    if (body.length) n = `IR${body}`;
  }
  return n;
}

export function isValidSheba(iban: string): boolean {
  const n = normalizeSheba(iban);
  if (!n.startsWith("IR") || n.length !== SHEBA_LENGTH) return false;
  const digits = n.slice(2);
  if (!/^\d{24}$/.test(digits)) return false;
  return mod97Check(n);
}

function mod97Check(iban: string): boolean {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let numeric = "";
  for (const ch of rearranged) {
    if (ch >= "A" && ch <= "Z") {
      numeric += String(ch.charCodeAt(0) - 55);
    } else {
      numeric += ch;
    }
  }
  let remainder = 0;
  for (let i = 0; i < numeric.length; i += 7) {
    const block = String(remainder) + numeric.slice(i, i + 7);
    remainder = parseInt(block, 10) % 97;
  }
  return remainder === 1;
}

export function formatShebaGrouped(sheba: string): string {
  const n = normalizeSheba(sheba);
  if (!n.startsWith("IR")) return n;
  const body = n.slice(2);
  const parts: string[] = ["IR"];
  for (let i = 0; i < body.length; i += 4) parts.push(body.slice(i, i + 4));
  return parts.join(" ");
}

export function maskSheba(sheba: string): string {
  const n = normalizeSheba(sheba);
  if (n.length < 10) return n;
  return `${n.slice(0, 4)}…${n.slice(-6)}`;
}

export interface ShebaRecipient {
  name: string;
  sheba: string;
  bankId: string | null;
}

export function parseShebaRecipient(name: string, sheba: string): ShebaRecipient {
  const normalized = normalizeSheba(sheba);
  if (!name.trim()) throw new Error("Recipient name required");
  if (!isValidSheba(normalized)) throw new Error("Invalid Sheba IBAN");
  const bank = detectBankFromSheba(normalized);
  return {
    name: name.trim(),
    sheba: normalized,
    bankId: bank?.id ?? "other",
  };
}
