import { describe, expect, it } from "vitest";
import { FakeOnRampAdapter } from "../src/adapters/fake/on-ramp.js";
import { JsonlEventLog } from "../src/adapters/event-log/jsonl.js";
import { isAllowedOrigin, loadConfig } from "../src/config.js";
import { createDb } from "../src/db/client.js";
import { initSchema } from "../src/db/init-schema.js";
import { LedgerService } from "../src/services/ledger.js";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

describe("api ledger idempotency", () => {
  it("dedupes duplicate deposit credit events", async () => {
    const dbPath = join(tmpdir(), `mw-${randomUUID()}.db`);
    const logPath = join(tmpdir(), `mw-${randomUUID()}.jsonl`);
    const db = createDb(dbPath);
    initSchema(db);
    const config = loadConfig();
    const ledger = new LedgerService(db, new JsonlEventLog(logPath), config);
    const eventId = "fixed-event-id";

    await ledger.appendEvent({
      eventId,
      type: "deposit_credited",
      userId: "u1",
      amountUsdCents: 1000,
    });
    await ledger.appendEvent({
      eventId,
      type: "deposit_credited",
      userId: "u1",
      amountUsdCents: 1000,
    });

    const balance = await ledger.getBalance("u1");
    expect(balance.availableUsdCents).toBe(1000);
  });
});

describe("allowed origins", () => {
  it("accepts localhost forwarded ports", () => {
    expect(isAllowedOrigin("http://localhost:61988", "http://localhost:5173")).toBe(true);
    expect(isAllowedOrigin("http://127.0.0.1:5173", "http://localhost:5173")).toBe(true);
    expect(isAllowedOrigin("http://localhost:5173", "http://localhost:5173")).toBe(true);
    expect(isAllowedOrigin("https://evil.example", "http://localhost:5173")).toBe(false);
  });
});

describe("passwordless auth options", () => {
  it(
    "enables email OTP and passkey, disables password",
    async () => {
      const { buildAuthOptions } = await import("../src/auth.js");
      const config = {
        ...loadConfig(),
        authEmailMode: "console" as const,
        databaseUrl: join(tmpdir(), `mw-auth-${randomUUID()}.db`),
      };
      const options = buildAuthOptions(config);
      expect(options.emailAndPassword?.enabled).toBe(false);
      const pluginIds = (options.plugins ?? []).map((p) => (p as { id?: string }).id);
      expect(pluginIds).toContain("email-otp");
      expect(pluginIds).toContain("passkey");
    },
    15_000,
  );

  it("reports public auth providers without OAuth secrets", async () => {
    const { authProvidersPublic } = await import("../src/auth.js");
    const config = {
      ...loadConfig(),
      googleClientId: "",
      googleClientSecret: "",
      appleClientId: "",
      appleClientSecret: "",
      telegramOidcClientId: "",
      telegramOidcClientSecret: "",
    };
    expect(authProvidersPublic(config)).toEqual({
      google: false,
      apple: false,
      telegram: false,
      passkey: true,
      emailOtp: true,
    });
  });

  it("enables telegram when OIDC credentials are configured", async () => {
    const { authProvidersPublic, buildAuthOptions } = await import("../src/auth.js");
    const config = {
      ...loadConfig(),
      telegramOidcClientId: "tg-client",
      telegramOidcClientSecret: "tg-secret",
      databaseUrl: join(tmpdir(), `mw-auth-${randomUUID()}.db`),
    };
    expect(authProvidersPublic(config).telegram).toBe(true);
    const options = buildAuthOptions(config);
    const pluginIds = (options.plugins ?? []).map((p) => (p as { id?: string }).id);
    expect(pluginIds).toContain("generic-oauth");
  });

  it("uses dynamic base URL and trusted proxy headers for forwarded UI ports", async () => {
    const { buildAuthBaseURL, buildAuthOptions } = await import("../src/auth.js");
    const config = {
      ...loadConfig(),
      publicUiUrl: "http://localhost:5173",
      betterAuthUrl: "http://localhost:8080",
      publicApiUrl: "http://localhost:8080",
      databaseUrl: join(tmpdir(), `mw-auth-${randomUUID()}.db`),
    };
    expect(buildAuthBaseURL(config)).toEqual({
      allowedHosts: ["localhost", "127.0.0.1"],
      fallback: "http://localhost:8080",
      protocol: "auto",
    });
    const options = buildAuthOptions(config);
    expect(options.advanced?.trustedProxyHeaders).toBe(true);
  });
});

describe("fake on-ramp", () => {
  it("creates deposit session", async () => {
    const adapter = new FakeOnRampAdapter();
    const session = await adapter.startDeposit({
      quoteId: "q1",
      userId: "u1",
      amountUsdCents: 500,
      clientInvoiceId: "inv-1",
    });
    expect(session.status).toBe("awaiting_payment");
    adapter.markPaid(session.externalId);
    const updated = await adapter.getDepositStatus(session.externalId);
    expect(updated.status).toBe("paid");
  });
});
