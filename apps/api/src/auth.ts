import { betterAuth, type BetterAuthOptions } from "better-auth";
import Database from "better-sqlite3";
import { passkey } from "@better-auth/passkey";
import { getMigrations } from "better-auth/db/migration";
import type { AppConfig } from "./config.js";

export function buildAuthOptions(config: AppConfig): BetterAuthOptions {
  const db = new Database(config.databaseUrl.replace("file:", "") || config.databaseUrl);
  return {
    database: db,
    secret: config.betterAuthSecret,
    baseURL: config.betterAuthUrl,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [
      passkey({
        rpID: new URL(config.betterAuthUrl).hostname,
        rpName: "Mega Wallet",
      }),
    ],
    user: {
      additionalFields: {
        role: { type: "string", defaultValue: "user", input: false },
        preferredLanguage: { type: "string", defaultValue: "en" },
        preferredPaymentMethod: { type: "string", required: false },
        lastSuccessfulPaymentMethod: { type: "string", required: false },
        lastAttemptedPaymentMethod: { type: "string", required: false },
        inviteCode: { type: "string", required: false },
        referredByUserId: { type: "string", required: false },
        affiliateEarnedUsdCents: { type: "number", defaultValue: 0, input: false },
      },
    },
  };
}

export function createAuth(config: AppConfig) {
  return betterAuth(buildAuthOptions(config));
}

export async function runAuthMigrations(config: AppConfig) {
  const options = buildAuthOptions(config);
  const { runMigrations } = await getMigrations(options);
  await runMigrations();
}

export type Auth = ReturnType<typeof createAuth>;
