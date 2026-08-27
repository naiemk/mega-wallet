import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface AppConfig {
  port: number;
  databaseUrl: string;
  fakeRamps: boolean;
  trustlessCommerceUrl: string;
  trustlessCommerceWebhookSecret: string;
  publicApiUrl: string;
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
  authEmailMode: "console" | "resend";
  resendApiKey: string;
  resendFrom: string;
}

function resolveAuthEmailMode(fakeRamps: boolean): "console" | "resend" {
  const mode = process.env.AUTH_EMAIL_MODE?.trim().toLowerCase();
  if (mode === "console") return "console";
  if (mode === "resend") return "resend";
  if (process.env.RESEND_API_KEY) return "resend";
  if (fakeRamps) return "console";
  return "console";
}

function loadDotEnv() {
  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "../.env"),
    resolve(process.cwd(), "../../.env"),
  ];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

loadDotEnv();

export function loadConfig(): AppConfig {
  return {
    port: Number(process.env.PORT ?? 8080),
    databaseUrl: process.env.DATABASE_URL ?? "./data/mega-wallet.db",
    fakeRamps: process.env.FAKE_RAMPS === "1",
    trustlessCommerceUrl:
      process.env.TRUSTLESS_COMMERCE_URL ?? "https://testnet.trustless-commerce.com",
    trustlessCommerceWebhookSecret: process.env.TRUSTLESS_COMMERCE_WEBHOOK_SECRET ?? "",
    publicApiUrl: process.env.PUBLIC_API_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:8080",
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
    authEmailMode: resolveAuthEmailMode(process.env.FAKE_RAMPS === "1"),
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    resendFrom: process.env.RESEND_FROM ?? "Mega Wallet <onboarding@resend.dev>",
  };
}

/** Allow configured UI origin plus localhost/127.0.0.1 (Cursor/VS Code forwarded ports). */
export function isAllowedOrigin(origin: string | undefined, publicUiUrl: string): origin is string {
  if (!origin) return false;
  if (origin === publicUiUrl) return true;
  try {
    const url = new URL(origin);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    );
  } catch {
    return false;
  }
}
