export interface AppConfig {
  port: number;
  databaseUrl: string;
  fakeRamps: boolean;
  trustlessCommerceUrl: string;
  onramperApiKey: string;
  onramperSigningKey: string;
  operatorWallets: { ethereum: string; base: string; tron: string };
  quoteTtlHours: number;
  slippageBps: number;
  affiliateBonusBps: number;
  affiliateMaxBonusUsdCents: number;
  internalWorkerToken: string;
  eventLogPath: string;
  s3EventLogBucket: string;
  s3EventLogKey: string;
  s3EventLogEndpoint: string;
  bootstrapAdminEmail: string;
  betterAuthSecret: string;
  betterAuthUrl: string;
  publicUiUrl: string;
}

export function loadConfig(): AppConfig {
  return {
    port: Number(process.env.PORT ?? 8080),
    databaseUrl: process.env.DATABASE_URL ?? "./data/mega-wallet.db",
    fakeRamps: process.env.FAKE_RAMPS === "1",
    trustlessCommerceUrl: process.env.TRUSTLESS_COMMERCE_URL ?? "http://localhost:8080",
    onramperApiKey: process.env.ONRAMPER_API_KEY ?? "",
    onramperSigningKey: process.env.ONRAMPER_SIGNING_KEY ?? "",
    operatorWallets: {
      ethereum: process.env.OPERATOR_WALLET_ETHEREUM ?? "0x0000000000000000000000000000000000000001",
      base: process.env.OPERATOR_WALLET_BASE ?? "0x0000000000000000000000000000000000000002",
      tron: process.env.OPERATOR_WALLET_TRON ?? "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb",
    },
    quoteTtlHours: Number(process.env.QUOTE_TTL_HOURS ?? 2),
    slippageBps: Number(process.env.SLIPPAGE_BPS ?? 100),
    affiliateBonusBps: Number(process.env.AFFILIATE_BONUS_BPS ?? 500),
    affiliateMaxBonusUsdCents: Number(process.env.AFFILIATE_MAX_BONUS_USD_CENTS ?? 5000),
    internalWorkerToken: process.env.INTERNAL_WORKER_TOKEN ?? "dev-worker-token",
    eventLogPath: process.env.EVENT_LOG_PATH ?? "./data/events.jsonl",
    s3EventLogBucket: process.env.S3_EVENT_LOG_BUCKET ?? "",
    s3EventLogKey: process.env.S3_EVENT_LOG_KEY ?? "mega-wallet/events.jsonl",
    s3EventLogEndpoint: process.env.S3_EVENT_LOG_ENDPOINT ?? "",
    bootstrapAdminEmail: process.env.BOOTSTRAP_ADMIN_EMAIL ?? "admin@example.com",
    betterAuthSecret: process.env.BETTER_AUTH_SECRET ?? "dev-secret-change-me-in-production-min-32-chars",
    betterAuthUrl: process.env.BETTER_AUTH_URL ?? "http://localhost:8080",
    publicUiUrl: process.env.PUBLIC_UI_URL ?? "http://localhost:5173",
  };
}
