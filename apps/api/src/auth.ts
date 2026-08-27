import { betterAuth, type BetterAuthOptions } from "better-auth";
import Database from "better-sqlite3";
import { passkey } from "@better-auth/passkey";
import { emailOTP } from "better-auth/plugins";
import { getMigrations } from "better-auth/db/migration";
import type { AppConfig } from "./config.js";
import { isAllowedOrigin } from "./config.js";
import { passkeyRpId, sendOtpEmail } from "./auth-otp.js";

export function buildAuthOptions(config: AppConfig): BetterAuthOptions {
  const db = new Database(config.databaseUrl.replace("file:", "") || config.databaseUrl);
  return {
    database: db,
    secret: config.betterAuthSecret,
    baseURL: config.betterAuthUrl,
    trustedOrigins: (request) => {
      const origin = request?.headers.get("origin") ?? "";
      return isAllowedOrigin(origin, config.publicUiUrl) ? [origin, config.publicUiUrl] : [config.publicUiUrl];
    },
    emailAndPassword: {
      enabled: false,
    },
    plugins: [
      emailOTP({
        async sendVerificationOTP({ email, otp, type }) {
          await sendOtpEmail(config, { email, otp, type });
        },
      }),
      passkey({
        // Must match the browser hostname (use http://localhost — not 127.0.0.1).
        rpID: passkeyRpId(config.publicUiUrl),
        rpName: "Mega Wallet",
        // Do NOT pin origin to PUBLIC_UI_URL: Cursor/VS Code forwards use other
        // localhost ports. Leave unset so verify uses the request Origin header.
        origin: null,
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
