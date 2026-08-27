/** Format minor units (cents / IRR rials) for display. */
export function formatMoney(
  minor: number,
  currency: string,
  locale = "en",
): string {
  const code = currency.toUpperCase();
  const isZeroDecimal = code === "IRR" || code === "JPY" || code === "KRW";
  const major = isZeroDecimal ? minor : minor / 100;
  // Intl IRR is unreliable across engines; format explicitly for remittance UX
  if (code === "IRR") {
    return `IRR ${Math.round(major).toLocaleString(locale, { maximumFractionDigits: 0 })}`;
  }
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code === "USDT" || code === "USDC" ? "USD" : code,
      maximumFractionDigits: isZeroDecimal ? 0 : 2,
      minimumFractionDigits: isZeroDecimal ? 0 : 2,
    }).format(major);
  } catch {
    return `${major.toLocaleString(locale, {
      maximumFractionDigits: isZeroDecimal ? 0 : 2,
      minimumFractionDigits: isZeroDecimal ? 0 : 2,
    })} ${code}`;
  }
}

export function formatRate(rate: number, digits = 4): string {
  if (!Number.isFinite(rate) || rate <= 0) return "—";
  if (rate >= 1000) return rate.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return rate.toFixed(digits);
}

/** Title-case provider/method slugs: "guardarian" → "Guardarian", "creditcard" → "Credit Card". */
export function humanizeId(id: string | null | undefined): string {
  if (!id) return "—";
  const known: Record<string, string> = {
    creditcard: "Credit Card",
    debitcard: "Debit Card",
    applepay: "Apple Pay",
    googlepay: "Google Pay",
    banktransfer: "Bank Transfer",
    revolutpay: "Revolut Pay",
    paypal: "PayPal",
  };
  const key = id.toLowerCase();
  if (known[key]) return known[key];
  return id
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function shortRef(id: string | null | undefined): string {
  if (!id) return "—";
  return id.length > 10 ? `${id.slice(0, 4)}…${id.slice(-4)}` : id;
}
