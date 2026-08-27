import {
  extractLatinDigits,
  formatDigitsForLocale,
  parseUsdAmountInput,
} from "@mega-wallet/core";

/**
 * Accept mixed-script decimal amount input (Latin / Persian / Arabic-Indic).
 * Returns Latin text to store, or null if the keystroke should be ignored.
 */
export function acceptUsdAmountChange(raw: string, previousLatin: string): string | null {
  if (raw === "" || raw === "." || raw === "٫") return raw === "٫" ? "." : raw;
  const parsed = parseUsdAmountInput(raw);
  if (parsed && /^\d*\.?\d{0,2}$/.test(parsed.text)) return parsed.text;
  // Allow intermediate Eastern-digit typing that normalizes cleanly
  if (/^[\d۰-۹٠-٩.,٬٫\s-]*$/.test(raw)) {
    const retry = parseUsdAmountInput(raw);
    return retry ? retry.text : null;
  }
  return previousLatin === raw ? previousLatin : null;
}

/** Integer-only field (OTP, hours, mid-rate). Stores Latin digits. */
export function acceptIntegerDigits(raw: string, maxLen?: number): string {
  const digits = extractLatinDigits(raw);
  return maxLen != null ? digits.slice(0, maxLen) : digits;
}

/** Display stored Latin digits/decimals in the active UI language. */
export function displayNumeric(latin: string, lang: string): string {
  return formatDigitsForLocale(latin, lang);
}
