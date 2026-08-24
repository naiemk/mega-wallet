export interface ReferralConfig {
  bonusBps: number;
  maxBonusUsdCents: number;
}

export function computeAffiliateBonus(
  feeUsdCents: number,
  config: ReferralConfig,
  alreadyEarnedUsdCents: number,
): number {
  if (feeUsdCents <= 0) return 0;
  const raw = Math.floor((feeUsdCents * config.bonusBps) / 10_000);
  const remaining = Math.max(0, config.maxBonusUsdCents - alreadyEarnedUsdCents);
  return Math.min(raw, remaining);
}

export function generateInviteCode(userId: string): string {
  const base = userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base || "MW"}-${suffix}`;
}

export function affiliateLink(baseUrl: string, code: string): string {
  const url = new URL(baseUrl);
  url.pathname = "/invite";
  url.searchParams.set("ref", code);
  return url.toString();
}
