import { betterAuth, type BetterAuthOptions } from "better-auth";
import Database from "better-sqlite3";
import { passkey } from "@better-auth/passkey";
import { emailOTP, genericOAuth } from "better-auth/plugins";
import { getMigrations } from "better-auth/db/migration";
import type { AppConfig } from "./config.js";
import { isAllowedOrigin } from "./config.js";
import { passkeyRpId, sendOtpEmail } from "./auth-otp.js";
import { mapTelegramProfileToUser, telegramProfileFromTokens } from "./auth-telegram.js";

export function authProvidersPublic(config: AppConfig) {
  return {
    google: Boolean(config.googleClientId && config.googleClientSecret),
    apple: Boolean(config.appleClientId && config.appleClientSecret),
    telegram: Boolean(config.telegramOidcClientId && config.telegramOidcClientSecret),
    passkey: true,
    emailOtp: true,
  };
}

/** Resolve OAuth/base URLs from the UI origin when proxied (Cursor/docker forwarded ports). */
export function buildAuthBaseURL(config: AppConfig): NonNullable<BetterAuthOptions["baseURL"]> {
  const hosts = new Set<string>(["localhost", "127.0.0.1"]);
  for (const raw of [config.publicUiUrl, config.betterAuthUrl, config.publicApiUrl]) {
    try {
      hosts.add(new URL(raw).hostname);
    } catch {
      /* ignore invalid URL */
    }
  }
  return {
    allowedHosts: [...hosts],
    fallback: config.betterAuthUrl,
    protocol: "auto",
  };
}

function buildSocialProviders(config: AppConfig): BetterAuthOptions["socialProviders"] {
  const providers: NonNullable<BetterAuthOptions["socialProviders"]> = {};
  if (config.googleClientId && config.googleClientSecret) {
    providers.google = {
      clientId: config.googleClientId,
      clientSecret: config.googleClientSecret,
      prompt: "select_account",
    };
  }
  if (config.appleClientId && config.appleClientSecret) {
    providers.apple = {
      clientId: config.appleClientId,
      clientSecret: config.appleClientSecret,
      ...(config.appleAppBundleIdentifier
        ? { appBundleIdentifier: config.appleAppBundleIdentifier }
        : {}),
    };
  }
  return Object.keys(providers).length > 0 ? providers : undefined;
}

function buildGenericOAuthPlugins(config: AppConfig) {
  if (!config.telegramOidcClientId || !config.telegramOidcClientSecret) {
    return [];
  }
  return [
    genericOAuth({
      config: [
        {
          providerId: "telegram",
          clientId: config.telegramOidcClientId,
          clientSecret: config.telegramOidcClientSecret,
          discoveryUrl: "https://oauth.telegram.org/.well-known/openid-configuration",
          pkce: true,
          scopes: ["openid", "profile"],
          getUserInfo: async (tokens) => telegramProfileFromTokens(tokens),
          mapProfileToUser: (profile) => mapTelegramProfileToUser(profile),
        },
      ],
    }),
  ];
}

export function buildAuthOptions(config: AppConfig): BetterAuthOptions {
  const db = new Database(config.databaseUrl.replace("file:", "") || config.databaseUrl);
  const hasApple = Boolean(config.appleClientId && config.appleClientSecret);
  return {
    database: db,
    secret: config.betterAuthSecret,
    baseURL: buildAuthBaseURL(config),
    advanced: {
      trustedProxyHeaders: true,
    },
    trustedOrigins: (request) => {
      const origin = request?.headers.get("origin") ?? "";
      const allowed = isAllowedOrigin(origin, config.publicUiUrl)
        ? [origin, config.publicUiUrl]
        : [config.publicUiUrl];
      if (hasApple) allowed.push("https://appleid.apple.com");
      return allowed;
    },
    emailAndPassword: {
      enabled: false,
    },
    socialProviders: buildSocialProviders(config),
    plugins: [
      emailOTP({
        async sendVerificationOTP({ email, otp, type }) {
          await sendOtpEmail(config, { email, otp, type });
        },
      }),
      passkey({
        rpID: passkeyRpId(config.publicUiUrl),
        rpName: "Mega Wallet",
        origin: null,
      }),
      ...buildGenericOAuthPlugins(config),
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
