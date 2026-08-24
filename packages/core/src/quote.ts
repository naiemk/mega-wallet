import { withinSlippage, type IrrRials, type UsdCents } from "./money.js";

export type QuoteStatus = "active" | "expired" | "consumed";

export interface QuoteSnapshot {
  id: string;
  sourceCurrency: string;
  destCurrency: string;
  sourceAmountMinor: number;
  usdcOutMinor: UsdCents;
  destOutMinor: IrrRials | number;
  paymentMethod: string;
  provider: string;
  slippageBps: number;
  expiresAt: Date;
  status: QuoteStatus;
}

export interface QuoteRefreshInput {
  usdcOutMinor: UsdCents;
  destOutMinor: number;
}

export function isQuoteExpired(quote: QuoteSnapshot, now = new Date()): boolean {
  return now >= quote.expiresAt || quote.status === "expired";
}

export function isQuoteStillValid(
  quote: QuoteSnapshot,
  refresh: QuoteRefreshInput,
  now = new Date(),
): boolean {
  if (isQuoteExpired(quote, now)) return false;
  if (quote.status === "consumed") return false;
  const usdcOk = withinSlippage(refresh.usdcOutMinor, quote.usdcOutMinor, quote.slippageBps);
  const destOk = withinSlippage(refresh.destOutMinor, quote.destOutMinor, quote.slippageBps);
  return usdcOk && destOk;
}

export function defaultQuoteExpiryHours(): number {
  return 2;
}

export function quoteExpiresAt(from = new Date(), hours = defaultQuoteExpiryHours()): Date {
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}

export function selectProvider(
  rankedProviders: Array<{ id: string; labels?: string[] }>,
  preferredMethod?: string | null,
): string | null {
  if (rankedProviders.length === 0) return null;
  const recommended = rankedProviders.find((p) => p.labels?.includes("Recommended"));
  if (preferredMethod) {
    const pref = rankedProviders.find((p) => p.id === preferredMethod);
    if (pref) return pref.id;
  }
  return recommended?.id ?? rankedProviders[0]!.id;
}

export function paymentMethodPreference(
  lastSuccessful?: string | null,
  lastAttempted?: string | null,
): string | null {
  return lastSuccessful ?? lastAttempted ?? null;
}
