import { extractLatinDigits, normalizeDigits } from "./digits.js";
import { detectBankFromCard } from "./iran-banks.js";

const CARD_LENGTH = 16;

/** Strip to Latin digits only (max 16). */
export function normalizeCardNumber(input: string): string {
  return extractLatinDigits(input).slice(0, CARD_LENGTH);
}

function luhnOk(digits: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function hasZeroBlock(digits: string): boolean {
  return /^0{10}$/.test(digits.slice(1, 11)) || /^0{6}$/.test(digits.slice(10, 16));
}

/** Obvious non-Iranian brand prefixes (Visa / Amex). */
export function isNonIranianCardBrand(digits: string): boolean {
  if (digits.startsWith("4")) return true;
  if (digits.startsWith("34") || digits.startsWith("37")) return true;
  return false;
}

export function isValidIranCard(input: string): boolean {
  const digits = normalizeCardNumber(input);
  if (digits.length !== CARD_LENGTH) return false;
  if (!/^\d{16}$/.test(digits)) return false;
  if (hasZeroBlock(digits)) return false;
  if (isNonIranianCardBrand(digits)) return false;
  return luhnOk(digits);
}

export function formatCardGrouped(digits: string): string {
  const d = normalizeCardNumber(digits);
  const parts: string[] = [];
  for (let i = 0; i < d.length; i += 4) parts.push(d.slice(i, i + 4));
  return parts.join(" ");
}

export function maskCardNumber(digits: string): string {
  const d = normalizeCardNumber(digits);
  if (d.length < 8) return d;
  return `${d.slice(0, 4)} **** **** ${d.slice(-4)}`;
}

export interface CardRecipient {
  name: string;
  cardNumber: string;
  bankId: string | null;
}

export function parseCardRecipient(name: string, card: string): CardRecipient {
  const normalized = normalizeCardNumber(card);
  if (!name.trim()) throw new Error("Recipient name required");
  if (!isValidIranCard(normalized)) throw new Error("Invalid card number");
  const bank = detectBankFromCard(normalized);
  return {
    name: name.trim(),
    cardNumber: normalized,
    bankId: bank?.id ?? "other",
  };
}

/** Normalize amount-like strings that may contain Eastern digits (re-export helper surface). */
export function normalizeNumericInput(input: string): string {
  return normalizeDigits(input);
}
