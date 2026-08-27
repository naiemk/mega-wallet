/** Persian (Farsi) digits U+06F0–U+06F9 */
const PERSIAN_ZERO = 0x06f0;
/** Arabic-Indic digits U+0660–U+0669 */
const ARABIC_ZERO = 0x0660;
const LATIN_ZERO = 0x0030;

/**
 * Normalize Persian / Arabic-Indic digits to Latin ASCII, convert Arabic
 * decimal separators, and strip grouping punctuation commonly pasted in.
 */
export function normalizeDigits(input: string): string {
  let out = "";
  for (const ch of input) {
    const code = ch.codePointAt(0)!;
    if (code >= PERSIAN_ZERO && code <= PERSIAN_ZERO + 9) {
      out += String.fromCodePoint(LATIN_ZERO + (code - PERSIAN_ZERO));
      continue;
    }
    if (code >= ARABIC_ZERO && code <= ARABIC_ZERO + 9) {
      out += String.fromCodePoint(LATIN_ZERO + (code - ARABIC_ZERO));
      continue;
    }
    if (ch === "٫") {
      out += ".";
      continue;
    }
    if (ch === "٬" || ch === "," || ch === " " || ch === "-" || ch === "_" || ch === "\u200f" || ch === "\u200e") {
      continue;
    }
    out += ch;
  }
  return out;
}

export type DigitLocale = "en" | "fa" | "ar";

/** Format a Latin-digit string for display in the given locale. Non-digits pass through. */
export function formatDigitsForLocale(latin: string, lang: DigitLocale | string): string {
  if (lang === "fa") return digitsToPersian(latin);
  if (lang === "ar") return digitsToArabicIndic(latin);
  return latin;
}

export function digitsToPersian(latin: string): string {
  return latin.replace(/[0-9]/g, (d) =>
    String.fromCodePoint(PERSIAN_ZERO + (d.codePointAt(0)! - LATIN_ZERO)),
  );
}

export function digitsToArabicIndic(latin: string): string {
  return latin.replace(/[0-9]/g, (d) =>
    String.fromCodePoint(ARABIC_ZERO + (d.codePointAt(0)! - LATIN_ZERO)),
  );
}

/** Keep only Latin digits from a (possibly Eastern) input string. */
export function extractLatinDigits(input: string): string {
  return normalizeDigits(input).replace(/\D/g, "");
}

/**
 * Parse a USD amount from mixed-script input.
 * Returns null if empty/invalid; otherwise { value, text } with at most 2 fraction digits.
 */
export function parseUsdAmountInput(input: string): { value: number; text: string } | null {
  const n = normalizeDigits(input).trim();
  if (!n) return null;
  if (!/^\d+(\.\d{0,2})?$/.test(n) && !/^\.\d{1,2}$/.test(n)) return null;
  const value = Number(n);
  // Regex already rejects negatives; still guard overflow / NaN.
  if (!Number.isFinite(value)) return null;
  return { value, text: n };
}
