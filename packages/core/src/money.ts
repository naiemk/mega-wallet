/** USD amounts in cents (integer). */
export type UsdCents = number;

/** IRR amounts in rials (integer). */
export type IrrRials = number;

export function usdFromDecimal(amount: string | number): UsdCents {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (!Number.isFinite(n) || n < 0) throw new Error("Invalid USD amount");
  return Math.round(n * 100);
}

export function usdToDecimal(cents: UsdCents): string {
  return (cents / 100).toFixed(2);
}

export function irrFromToman(toman: number): IrrRials {
  if (!Number.isFinite(toman) || toman < 0) throw new Error("Invalid toman");
  return Math.round(toman * 10);
}

export function irrToToman(rials: IrrRials): number {
  return rials / 10;
}

export function applySlippage(amount: number, slippageBps: number, direction: "min" | "max"): number {
  const factor = slippageBps / 10_000;
  if (direction === "min") return Math.floor(amount * (1 - factor));
  return Math.ceil(amount * (1 + factor));
}

export function withinSlippage(actual: number, expected: number, slippageBps: number): boolean {
  const min = applySlippage(expected, slippageBps, "min");
  const max = applySlippage(expected, slippageBps, "max");
  return actual >= min && actual <= max;
}

export function median(values: number[]): number | null {
  const sorted = [...values].filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
  }
  return sorted[mid]!;
}

export function aggregateRates(rates: number[], minSources = 2): number | null {
  const valid = rates.filter((r) => Number.isFinite(r) && r > 0);
  if (valid.length < minSources) return null;
  return median(valid);
}
