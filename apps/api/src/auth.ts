import { betterAuth } from "better-auth";
import Database from "better-sqlite3";
import { passkey } from "@better-auth/passkey";
import type { AppConfig } from "./config.js";

export function createAuth(config: AppConfig) {
  const db = new Database(config.databaseUrl.replace("file:", "") || config.databaseUrl);
  return betterAuth({
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
  });
}

export type Auth = ReturnType<typeof createAuth>;
