import {
  applyCommission,
  voteRates,
  type FxOraclePort,
  type FxOverrideStore,
  type FxQuote,
  type FxRate,
  type FxSourceSample,
  type TargetRateProvider,
} from "@mega-wallet/core";

export interface AggregatingFxOracleOptions {
  commissionBps?: number;
  maxDeviationBps?: number;
  minSources?: number;
  minRate?: number;
  maxRate?: number;
  cacheTtlMs?: number;
  negativeCacheTtlMs?: number;
  fetchTimeoutMs?: number;
  overrideStore?: FxOverrideStore | null;
  pair?: string;
}

const DEFAULTS = {
  commissionBps: 100,
  maxDeviationBps: 200,
  minSources: 2,
  minRate: 100_000,
  maxRate: 20_000_000,
  cacheTtlMs: 15_000,
  negativeCacheTtlMs: 5_000,
  fetchTimeoutMs: 3_000,
  pair: "USDT/IRR",
} as const;

type CacheEntry =
  | { kind: "ok"; quote: FxQuote; expiresAt: number }
  | { kind: "miss"; expiresAt: number };

export class AggregatingFxOracle implements FxOraclePort {
  private readonly commissionBps: number;
  private readonly maxDeviationBps: number;
  private readonly minSources: number;
  private readonly minRate: number;
  private readonly maxRate: number;
  private readonly cacheTtlMs: number;
  private readonly negativeCacheTtlMs: number;
  private readonly fetchTimeoutMs: number;
  private readonly overrideStore: FxOverrideStore | null;
  private readonly pair: string;
  private cache: CacheEntry | null = null;

  constructor(
    private readonly providers: TargetRateProvider[],
    opts: AggregatingFxOracleOptions = {},
  ) {
    this.commissionBps = opts.commissionBps ?? DEFAULTS.commissionBps;
    this.maxDeviationBps = opts.maxDeviationBps ?? DEFAULTS.maxDeviationBps;
    this.minSources = opts.minSources ?? DEFAULTS.minSources;
    this.minRate = opts.minRate ?? DEFAULTS.minRate;
    this.maxRate = opts.maxRate ?? DEFAULTS.maxRate;
    this.cacheTtlMs = opts.cacheTtlMs ?? DEFAULTS.cacheTtlMs;
    this.negativeCacheTtlMs = opts.negativeCacheTtlMs ?? DEFAULTS.negativeCacheTtlMs;
    this.fetchTimeoutMs = opts.fetchTimeoutMs ?? DEFAULTS.fetchTimeoutMs;
    this.overrideStore = opts.overrideStore ?? null;
    this.pair = opts.pair ?? DEFAULTS.pair;
  }

  invalidateCache(): void {
    this.cache = null;
  }

  async getRate(base: string, quote: string): Promise<FxRate | null> {
    const q = await this.getQuote(base, quote);
    if (!q) return null;
    return {
      base: q.base,
      quote: q.quote,
      rate: q.customerRate,
      source: q.source,
      fetchedAt: q.fetchedAt,
    };
  }

  async getQuote(base: string, quote: string): Promise<FxQuote | null> {
    if (base !== "USDT" || quote !== "IRR") return null;

    const override = await this.readLiveOverride();
    if (override) {
      return this.fromMid({
        midRate: override.midRate,
        source: "operator",
        sources: [],
        overrideExpiresAt: override.expiresAt,
        fetchedAt: new Date(),
      });
    }

    const now = Date.now();
    if (this.cache && this.cache.expiresAt > now) {
      if (this.cache.kind === "ok") return this.cache.quote;
      return null;
    }
    this.cache = null;

    const samples = await this.fetchSamples();
    const numeric = samples.map((s) => s.rate).filter((r): r is number => r !== null);
    const voted = voteRates(numeric, {
      minSources: this.minSources,
      maxDeviationBps: this.maxDeviationBps,
      minRate: this.minRate,
      maxRate: this.maxRate,
    });

    if (!voted) {
      this.cache = { kind: "miss", expiresAt: now + this.negativeCacheTtlMs };
      return null;
    }

    const acceptedSet = new Set(voted.accepted);
    // Mark each sample: accepted if its rate is in the accepted multiset (by value match once).
    const remaining = [...voted.accepted];
    const sources: FxSourceSample[] = samples.map((s) => {
      if (s.rate === null) return { name: s.name, rate: null, accepted: false };
      const idx = remaining.indexOf(s.rate);
      if (idx >= 0) {
        remaining.splice(idx, 1);
        return { name: s.name, rate: s.rate, accepted: true };
      }
      return { name: s.name, rate: s.rate, accepted: false };
    });
    void acceptedSet;

    const fxQuote = this.fromMid({
      midRate: voted.midRate,
      source: "aggregated",
      sources,
      overrideExpiresAt: null,
      fetchedAt: new Date(),
    });
    this.cache = { kind: "ok", quote: fxQuote, expiresAt: now + this.cacheTtlMs };
    return fxQuote;
  }

  private fromMid(input: {
    midRate: number;
    source: "aggregated" | "operator";
    sources: FxSourceSample[];
    overrideExpiresAt: Date | null;
    fetchedAt: Date;
  }): FxQuote {
    return {
      base: "USDT",
      quote: "IRR",
      midRate: input.midRate,
      customerRate: applyCommission(input.midRate, this.commissionBps),
      commissionBps: this.commissionBps,
      source: input.source,
      sources: input.sources,
      overrideExpiresAt: input.overrideExpiresAt,
      fetchedAt: input.fetchedAt,
    };
  }

  private async readLiveOverride(): Promise<{ midRate: number; expiresAt: Date } | null> {
    if (!this.overrideStore) return null;
    const row = await this.overrideStore.get(this.pair);
    if (!row) return null;
    if (row.expiresAt.getTime() <= Date.now()) return null;
    return { midRate: row.midRate, expiresAt: row.expiresAt };
  }

  private async fetchSamples(): Promise<Array<{ name: string; rate: number | null }>> {
    return Promise.all(
      this.providers.map(async (p) => ({
        name: p.name,
        rate: await withTimeout(p.fetchUsdtIrr(), this.fetchTimeoutMs),
      })),
    );
  }
}

async function withTimeout(promise: Promise<number | null>, ms: number): Promise<number | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export class StaticFxProvider implements TargetRateProvider {
  constructor(
    readonly name: string,
    private readonly rate: number | null,
  ) {}

  async fetchUsdtIrr(): Promise<number | null> {
    return this.rate;
  }
}

export class NobitexFxProvider implements TargetRateProvider {
  readonly name = "nobitex";

  async fetchUsdtIrr(): Promise<number | null> {
    try {
      // Nobitex usdt-rls quotes in rials (not toman).
      const res = await fetch(
        "https://apiv2.nobitex.ir/market/stats?srcCurrency=usdt&dstCurrency=rls",
      );
      if (!res.ok) return null;
      const data = (await res.json()) as { stats?: { "usdt-rls"?: { latest?: string } } };
      const latest = data.stats?.["usdt-rls"]?.latest;
      if (!latest) return null;
      const rials = Math.round(Number(latest));
      return Number.isFinite(rials) && rials > 0 ? rials : null;
    } catch {
      return null;
    }
  }
}

export class WallexFxProvider implements TargetRateProvider {
  readonly name = "wallex";

  async fetchUsdtIrr(): Promise<number | null> {
    try {
      // USDTTMN lastPrice is in toman → convert to rials.
      const res = await fetch("https://api.wallex.ir/v1/markets");
      if (!res.ok) return null;
      const data = (await res.json()) as {
        result?: { symbols?: Record<string, { stats?: { lastPrice?: string } }> };
      };
      const price = data.result?.symbols?.USDTTMN?.stats?.lastPrice;
      if (!price) return null;
      const rials = Math.round(Number(price) * 10);
      return Number.isFinite(rials) && rials > 0 ? rials : null;
    } catch {
      return null;
    }
  }
}

export class BitpinFxProvider implements TargetRateProvider {
  readonly name = "bitpin";

  async fetchUsdtIrr(): Promise<number | null> {
    try {
      // Tickers quote USDT_IRT in toman → convert to rials.
      const res = await fetch("https://api.bitpin.org/api/v1/mkt/tickers/");
      if (!res.ok) return null;
      const data = (await res.json()) as Array<{ symbol?: string; price?: string }>;
      const market = data.find((m) => m.symbol === "USDT_IRT");
      if (!market?.price) return null;
      const rials = Math.round(Number(market.price) * 10);
      return Number.isFinite(rials) && rials > 0 ? rials : null;
    } catch {
      return null;
    }
  }
}
