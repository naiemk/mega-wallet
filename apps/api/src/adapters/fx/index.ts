import { aggregateRates, type TargetRateProvider } from "@mega-wallet/core";
import type { FxOraclePort, FxRate } from "@mega-wallet/core";

export class AggregatingFxOracle implements FxOraclePort {
  constructor(private readonly providers: TargetRateProvider[]) {}

  async getRate(base: string, quote: string): Promise<FxRate | null> {
    if (base !== "USDT" || quote !== "IRR") return null;
    const rates = await Promise.all(this.providers.map((p) => p.fetchUsdtIrr()));
    const aggregated = aggregateRates(rates.filter((r): r is number => r !== null));
    if (aggregated === null) return null;
    return {
      base,
      quote,
      rate: aggregated,
      source: "aggregated",
      fetchedAt: new Date(),
    };
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
      const res = await fetch("https://api.nobitex.ir/market/stats?srcCurrency=usdt&dstCurrency=rls");
      if (!res.ok) return null;
      const data = (await res.json()) as { stats?: { "usdt-rls"?: { latest?: string } } };
      const latest = data.stats?.["usdt-rls"]?.latest;
      if (!latest) return null;
      return Math.round(Number(latest) / 10);
    } catch {
      return null;
    }
  }
}

export class WallexFxProvider implements TargetRateProvider {
  readonly name = "wallex";

  async fetchUsdtIrr(): Promise<number | null> {
    try {
      const res = await fetch("https://api.wallex.ir/hector/web/v1/markets");
      if (!res.ok) return null;
      const data = (await res.json()) as { result?: { markets?: Array<{ symbol: string; stats?: { lastPrice?: string } }> } };
      const market = data.result?.markets?.find((m) => m.symbol === "USDTTMN");
      const price = market?.stats?.lastPrice;
      return price ? Math.round(Number(price) * 10) : null;
    } catch {
      return null;
    }
  }
}

export class BitpinFxProvider implements TargetRateProvider {
  readonly name = "bitpin";

  async fetchUsdtIrr(): Promise<number | null> {
    try {
      const res = await fetch("https://api.bitpin.org/api/v1/mkt/markets/");
      if (!res.ok) return null;
      const data = (await res.json()) as Array<{ code?: string; price?: string }>;
      const market = data.find((m) => m.code === "USDT_IRT");
      return market?.price ? Math.round(Number(market.price) * 10) : null;
    } catch {
      return null;
    }
  }
}
