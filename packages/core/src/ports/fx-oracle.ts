export interface FxRate {
  base: string;
  quote: string;
  rate: number;
  source: string;
  fetchedAt: Date;
}

export interface FxOraclePort {
  getRate(base: string, quote: string): Promise<FxRate | null>;
}

export interface TargetRateProvider {
  readonly name: string;
  fetchUsdtIrr(): Promise<number | null>;
}
