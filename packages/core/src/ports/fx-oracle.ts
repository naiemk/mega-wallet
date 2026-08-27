export interface FxRate {
  base: string;
  quote: string;
  rate: number;
  source: string;
  fetchedAt: Date;
}

export interface FxSourceSample {
  name: string;
  rate: number | null;
  accepted: boolean;
}

export interface FxQuote {
  base: string;
  quote: string;
  midRate: number;
  customerRate: number;
  commissionBps: number;
  source: "aggregated" | "operator";
  sources: FxSourceSample[];
  overrideExpiresAt: Date | null;
  fetchedAt: Date;
}

export interface FxOraclePort {
  getRate(base: string, quote: string): Promise<FxRate | null>;
  getQuote(base: string, quote: string): Promise<FxQuote | null>;
  invalidateCache?(): void;
}

export interface TargetRateProvider {
  readonly name: string;
  fetchUsdtIrr(): Promise<number | null>;
}

export interface FxOverrideRecord {
  pair: string;
  midRate: number;
  expiresAt: Date;
  setByUserId: string;
  createdAt: Date;
}

export interface FxOverrideStore {
  get(pair: string): Promise<FxOverrideRecord | null>;
  set(record: FxOverrideRecord): Promise<void>;
  clear(pair: string): Promise<void>;
}
