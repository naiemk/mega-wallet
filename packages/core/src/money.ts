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

export interface VoteRatesOptions {
  minSources?: number;
  maxDeviationBps?: number;
  minRate?: number;
  maxRate?: number;
}

export interface VoteRatesResult {
  midRate: number;
  accepted: number[];
  rejected: number[];
}

/**
 * Vote on USDT→IRR rates: sanity band → median → drop large deviations → quorum.
 * Returns null when fewer than minSources samples remain after filtering.
 */
export function voteRates(
  rates: number[],
  opts: VoteRatesOptions = {},
): VoteRatesResult | null {
  const minSources = opts.minSources ?? 2;
  const maxDeviationBps = opts.maxDeviationBps ?? 200;
  const minRate = opts.minRate ?? 100_000;
  const maxRate = opts.maxRate ?? 20_000_000;

  const inBand = rates.filter(
    (r) => Number.isFinite(r) && r > 0 && r >= minRate && r <= maxRate,
  );
  const outOfBand = rates.filter(
    (r) => Number.isFinite(r) && r > 0 && (r < minRate || r > maxRate),
  );

  if (inBand.length === 0) return null;

  const provisional = median(inBand);
  if (provisional === null) return null;

  const accepted: number[] = [];
  const rejected: number[] = [...outOfBand];
  for (const r of inBand) {
    const deviationBps = Math.abs(r - provisional) / provisional * 10_000;
    if (deviationBps <= maxDeviationBps) accepted.push(r);
    else rejected.push(r);
  }

  if (accepted.length < minSources) return null;
  const midRate = median(accepted);
  if (midRate === null) return null;
  return { midRate, accepted, rejected };
}

/** Backward-compatible median aggregate (no sanity band / deviation filter). */
export function aggregateRates(rates: number[], minSources = 2): number | null {
  const result = voteRates(rates, {
    minSources,
    maxDeviationBps: Number.POSITIVE_INFINITY,
    minRate: Number.NEGATIVE_INFINITY,
    maxRate: Number.POSITIVE_INFINITY,
  });
  return result?.midRate ?? null;
}

/** Reduce mid-market rate by commission (user sells stables → fewer rials). */
export function applyCommission(rate: number, commissionBps: number): number {
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  const bps = Math.max(0, commissionBps);
  return Math.floor(rate * (1 - bps / 10_000));
}
