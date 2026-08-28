import { Hono } from "hono";
import { cors } from "hono/cors";
import { eq } from "drizzle-orm";
import { generateInviteCode } from "@mega-wallet/core";
import type { AppContext } from "./context.js";
import { isAllowedOrigin } from "./config.js";
import { readLastOtp } from "./auth-otp.js";
import { passkeyRpFromOrigin, passkeyRpStore } from "./passkey-rp.js";
import { users } from "./db/schema.js";

export function createApp(ctx: AppContext) {
  const app = new Hono();

  app.use(
    "*",
    cors({
      origin: (origin) => (isAllowedOrigin(origin, ctx.config.publicUiUrl) ? origin : ctx.config.publicUiUrl),
      credentials: true,
    }),
  );

  app.get("/api/health", (c) => c.json({ ok: true, fakeRamps: ctx.config.fakeRamps }));
  app.get("/api/ready", (c) => c.json({ ok: true, db: true, fakeRamps: ctx.config.fakeRamps }));

  app.on(["POST", "GET"], "/api/auth/*", async (c) => {
    // WebAuthn verify needs an Origin. Some proxies omit it on POST; fall back to Referer.
    const raw = c.req.raw;
    const headers = new Headers(raw.headers);
    if (!headers.get("origin")) {
      const referer = headers.get("referer");
      if (referer) {
        try {
          headers.set("origin", new URL(referer).origin);
        } catch {
          /* ignore invalid referer */
        }
      }
    }

    let request: Request = raw;
    let credId = "";
    const isPasskeyVerify =
      c.req.method === "POST" && c.req.path.endsWith("/passkey/verify-authentication");

    if (isPasskeyVerify || headers.get("origin") !== raw.headers.get("origin")) {
      const bodyBuf =
        c.req.method !== "GET" && c.req.method !== "HEAD" ? await raw.arrayBuffer() : null;
      if (bodyBuf && isPasskeyVerify) {
        try {
          const parsed = JSON.parse(new TextDecoder().decode(bodyBuf)) as {
            response?: { id?: string };
          };
          credId = parsed.response?.id ?? "";
        } catch {
          /* ignore */
        }
      }
      const init: RequestInit = { method: raw.method, headers };
      if (bodyBuf) {
        init.body = bodyBuf;
        (init as RequestInit & { duplex: string }).duplex = "half";
      }
      request = new Request(raw.url, init);
    }

    const response = await passkeyRpStore.run(
      passkeyRpFromOrigin(request.headers.get("origin"), ctx.config.publicUiUrl),
      () => ctx.auth.handler(request),
    );
    if (c.req.path.includes("/passkey/") && response.status >= 400) {
      const detail = await response.clone().text().catch(() => "");
      console.warn(
        `[passkey] ${c.req.method} ${c.req.path} → ${response.status} origin=${request.headers.get("origin") ?? ""} challengeCookie=${request.headers.get("cookie")?.includes("better-auth-passkey") ? "yes" : "no"} credId=${credId || "?"} ${detail.slice(0, 240)}`,
      );
    }
    return response;
  });

  app.use("/api/*", async (c, next) => {
    if (c.req.path === "/api/health" || c.req.path === "/api/ready") return next();
    if (c.req.path.startsWith("/api/auth")) return next();
    if (c.req.path.startsWith("/api/internal")) return next();
    await next();
  });

  app.get("/api/quotes", async (c) => {
    const session = await ctx.auth.api.getSession({ headers: c.req.raw.headers });
    const sourceCurrency = c.req.query("sourceCurrency") ?? "EUR";
    const destCurrency = c.req.query("destCurrency") ?? "IRR";
    const amount = Number(c.req.query("amount") ?? 100);
    const paymentMethod = c.req.query("paymentMethod") ?? undefined;
    const country = c.req.query("country") ?? "US";

    let userPrefs = { lastSuccessful: null as string | null, lastAttempted: null as string | null };
    if (session?.user?.id) {
      const [u] = await ctx.db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
      if (u) {
        userPrefs = {
          lastSuccessful: u.lastSuccessfulPaymentMethod,
          lastAttempted: u.lastAttemptedPaymentMethod,
        };
      }
    }

    try {
      const quote = await ctx.quotes.createQuote({
        sourceCurrency,
        destCurrency,
        sourceAmountMinor: Math.round(amount * 100),
        paymentMethod,
        country,
        userId: session?.user?.id,
        lastSuccessfulPaymentMethod: userPrefs.lastSuccessful,
        lastAttemptedPaymentMethod: userPrefs.lastAttempted,
      });
      return c.json(quote);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Quote failed";
      if (/Rate unavailable/i.test(message)) return c.json({ error: message }, 503);
      return c.json({ error: message }, 400);
    }
  });

  app.get("/api/rates", async (c) => {
    const quote = await ctx.fx.getQuote("USDT", "IRR");
    if (!quote) return c.json({ error: "Rate unavailable" }, 503);
    return c.json({
      pair: "USDT/IRR",
      midRate: quote.midRate,
      customerRate: quote.customerRate,
      commissionBps: quote.commissionBps,
      source: quote.source,
      sources: quote.sources,
      overrideExpiresAt: quote.overrideExpiresAt?.toISOString() ?? null,
      fetchedAt: quote.fetchedAt.toISOString(),
    });
  });

  app.post("/api/transfers", async (c) => {
    const session = await getSession(c, ctx);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const body = await c.req.json<{
      quoteId: string;
      language?: string;
      recipient?: {
        name: string;
        kind?: "sheba" | "card";
        sheba?: string;
        cardNumber?: string;
        bankId?: string | null;
        saveContact?: boolean;
      };
    }>();
    try {
      const [profile] = await ctx.db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
      const result = await ctx.transfers.startTransfer(
        session.user.id,
        body.quoteId,
        body.language ?? profile?.preferredLanguage ?? undefined,
        body.recipient,
      );
      return c.json(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Transfer failed";
      const status =
        /expired|not found|allowed|Sheba|card|recipient/i.test(message) ? 409 : 400;
      return c.json({ error: message }, status);
    }
  });

  app.get("/api/transfers/active", async (c) => {
    const session = await getSession(c, ctx);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const transfer = await ctx.transfers.getActiveTransfer(session.user.id);
    return c.json({ transfer });
  });

  app.get("/api/transfers/:id", async (c) => {
    const session = await getSession(c, ctx);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const id = c.req.param("id");
    let row = await ctx.transfers.getTransfer(id);
    if (!row || row.userId !== session.user.id) return c.json({ error: "Not found" }, 404);
    if (row.phase === "depositing") {
      await ctx.transfers.pollDeposit(row.id);
      row = (await ctx.transfers.getTransfer(id)) ?? row;
    }
    return c.json({ transfer: row });
  });

  app.post("/api/transfers/:id/recipient", async (c) => {
    const session = await getSession(c, ctx);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const body = await c.req.json<{ name: string; sheba: string }>();
    const result = await ctx.transfers.setRecipient(
      c.req.param("id"),
      session.user.id,
      body.name,
      body.sheba,
    );
    return c.json(result);
  });

  app.get("/api/wallet", async (c) => {
    const session = await getSession(c, ctx);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const balance = await ctx.ledger.getBalance(session.user.id);
    return c.json({
      balance,
      displayUsd: (balance.availableUsdCents / 100).toFixed(2),
      reservedUsd: (balance.reservedUsdCents / 100).toFixed(2),
      availableUsdCents: balance.availableUsdCents,
      reservedUsdCents: balance.reservedUsdCents,
    });
  });

  app.get("/api/fx/usdt-irr", async (c) => {
    const rate = await ctx.fx.getRate("USDT", "IRR");
    if (!rate) return c.json({ rate: null });
    return c.json({
      rate: rate.rate,
      source: rate.source,
      fetchedAt: rate.fetchedAt,
    });
  });

  app.get("/api/history", async (c) => {
    const session = await getSession(c, ctx);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const { ledgerEvents, transfers: transfersTable } = await import("./db/schema.js");
    const { eq: eqOp, desc: descOp } = await import("drizzle-orm");
    const events = await ctx.db
      .select()
      .from(ledgerEvents)
      .where(eqOp(ledgerEvents.userId, session.user.id))
      .orderBy(descOp(ledgerEvents.createdAt));
    const txs = await ctx.db
      .select()
      .from(transfersTable)
      .where(eqOp(transfersTable.userId, session.user.id))
      .orderBy(descOp(transfersTable.updatedAt));
    return c.json({ events, transfers: txs });
  });

  app.get("/api/me", async (c) => {
    const session = await getSession(c, ctx);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const [user] = await ctx.db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
    return c.json({
      user: session.user,
      profile: user,
      affiliateLink: user?.inviteCode
        ? `${ctx.config.publicUiUrl}/invite?ref=${user.inviteCode}`
        : null,
      affiliateEarnedUsdCents: user?.affiliateEarnedUsdCents ?? 0,
    });
  });

  app.post("/api/me/language", async (c) => {
    const session = await getSession(c, ctx);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const body = await c.req.json<{ language: string }>();
    await ctx.db
      .update(users)
      .set({ preferredLanguage: body.language })
      .where(eq(users.id, session.user.id));
    return c.json({ ok: true });
  });

  app.post("/api/me/referral", async (c) => {
    const session = await getSession(c, ctx);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const body = await c.req.json<{ code: string }>();
    const [user] = await ctx.db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
    if (user?.referredByUserId) return c.json({ error: "Already referred" }, 400);
    const [referrer] = await ctx.db
      .select()
      .from(users)
      .where(eq(users.inviteCode, body.code))
      .limit(1);
    if (!referrer || referrer.id === session.user.id) {
      return c.json({ error: "Invalid referral code" }, 400);
    }
    await ctx.db
      .update(users)
      .set({ referredByUserId: referrer.id })
      .where(eq(users.id, session.user.id));
    return c.json({ ok: true });
  });

  app.post("/api/deposits", async (c) => {
    const session = await getSession(c, ctx);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const body = await c.req.json<{
      amountUsdCents?: number;
      amountMinor?: number;
      sourceCurrency?: string;
      paymentMode?: "crypto" | "fiat" | "crypto_or_fiat";
      paymentMethod?: string;
      provider?: string;
      language?: string;
    }>();
    try {
      const [profile] = await ctx.db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
      const sourceCurrency = body.sourceCurrency ?? "USD";
      const sourceAmountMinor =
        body.amountMinor ??
        body.amountUsdCents ??
        undefined;
      if (sourceAmountMinor == null) {
        return c.json({ error: "amountUsdCents or amountMinor required" }, 400);
      }

      let usd = body.amountUsdCents;
      let provider = body.provider;
      let paymentMethod = body.paymentMethod;

      // Prefer a live TC quote for settlement USDC; invoice create still quotes if this fails.
      if (body.paymentMode !== "crypto") {
        try {
          const q = await ctx.quotes.createQuote({
            sourceCurrency,
            destCurrency: "USD",
            sourceAmountMinor,
            paymentMethod: body.paymentMethod,
            country: "US",
            userId: session.user.id,
            lastSuccessfulPaymentMethod: profile?.lastSuccessfulPaymentMethod,
            lastAttemptedPaymentMethod: profile?.lastAttemptedPaymentMethod,
          });
          usd = q.usdcOutMinor;
          provider = provider ?? q.provider;
          paymentMethod = paymentMethod ?? q.paymentMethod;
        } catch {
          // TC public quote is flaky; start deposit with fiat amount and let invoice create quote.
          if (usd == null && sourceCurrency.toUpperCase() === "USD") {
            usd = sourceAmountMinor;
          }
          paymentMethod = paymentMethod ?? "creditcard";
        }
      } else if (usd == null) {
        usd = sourceAmountMinor;
      }

      if (usd == null) {
        // Non-USD without a quote: use source amount as provisional USDC; TC invoice revises price.
        usd = sourceAmountMinor;
        paymentMethod = paymentMethod ?? "creditcard";
      }

      const result = await ctx.transfers.startWalletDeposit(session.user.id, {
        amountUsdCents: usd,
        sourceAmountMinor,
        sourceCurrency,
        paymentMode: body.paymentMode ?? "fiat",
        paymentMethod,
        provider,
        language: body.language ?? profile?.preferredLanguage ?? "en",
      });
      return c.json(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Deposit failed";
      const status = /Invalid amount/i.test(message) ? 409 : 400;
      return c.json({ error: message }, status);
    }
  });

  app.get("/api/deposits/:id", async (c) => {
    const session = await getSession(c, ctx);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const row = await ctx.transfers.getTransfer(c.req.param("id"));
    if (!row || row.userId !== session.user.id) return c.json({ error: "Not found" }, 404);
    if (row.kind !== "wallet_deposit" && row.quoteId !== "wallet") {
      return c.json({ error: "Not a wallet deposit" }, 400);
    }
    // Refresh status if still depositing
    if (row.phase === "depositing") {
      await ctx.transfers.pollDeposit(row.id);
    }
    const fresh = await ctx.transfers.getTransfer(row.id);
    return c.json({ transfer: fresh });
  });

  app.post("/api/withdrawals", async (c) => {
    const session = await getSession(c, ctx);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const body = await c.req.json<{
      amountUsdCents: number;
      name?: string;
      kind?: "sheba" | "card";
      sheba?: string;
      cardNumber?: string;
      bankId?: string;
      contactId?: string;
      saveContact?: boolean;
    }>();
    try {
      let name = body.name ?? "";
      let kind = body.kind ?? "sheba";
      let sheba = body.sheba ?? "";
      let cardNumber = body.cardNumber ?? "";
      let bankId = body.bankId ?? null;
      if (body.contactId) {
        const contacts = await ctx.transfers.listContacts(session.user.id);
        const contact = contacts.find((x) => x.id === body.contactId);
        if (!contact) return c.json({ error: "Contact not found" }, 404);
        name = contact.name;
        kind = (contact.kind as "sheba" | "card") || (contact.cardNumber ? "card" : "sheba");
        sheba = contact.sheba ?? "";
        cardNumber = contact.cardNumber ?? "";
        bankId = contact.bankId ?? null;
      }
      const result = await ctx.transfers.startWalletWithdrawal(session.user.id, body.amountUsdCents, {
        name,
        kind,
        sheba,
        cardNumber,
        bankId,
        saveContact: body.saveContact,
      });
      return c.json(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Withdraw failed";
      if (/Rate unavailable/i.test(message)) return c.json({ error: message }, 503);
      const status = /Insufficient/i.test(message) ? 409 : 400;
      return c.json({ error: message }, status);
    }
  });

  app.get("/api/withdrawals/:id", async (c) => {
    const session = await getSession(c, ctx);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const row = await ctx.transfers.getTransfer(c.req.param("id"));
    if (!row || row.userId !== session.user.id) return c.json({ error: "Not found" }, 404);
    if (row.kind !== "wallet_withdraw" && row.quoteId !== "wallet-withdraw") {
      return c.json({ error: "Not a wallet withdrawal" }, 400);
    }
    return c.json({ transfer: row });
  });

  app.post("/api/withdrawals/:id/cancel", async (c) => {
    const session = await getSession(c, ctx);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    try {
      const result = await ctx.transfers.cancelWithdrawal(c.req.param("id"), session.user.id);
      return c.json(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Cancel failed";
      return c.json({ error: message }, 400);
    }
  });

  app.get("/api/contacts", async (c) => {
    const session = await getSession(c, ctx);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const contacts = await ctx.transfers.listContacts(session.user.id);
    return c.json({ contacts });
  });

  app.post("/api/contacts", async (c) => {
    const session = await getSession(c, ctx);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const body = await c.req.json<{
      name: string;
      kind?: "sheba" | "card";
      sheba?: string;
      cardNumber?: string;
      bankId?: string;
    }>();
    try {
      const contact = await ctx.transfers.saveContact(session.user.id, body);
      return c.json({ contact });
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : "Invalid contact" }, 400);
    }
  });

  app.delete("/api/contacts/:id", async (c) => {
    const session = await getSession(c, ctx);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    try {
      await ctx.transfers.deleteContact(session.user.id, c.req.param("id"));
      return c.json({ ok: true });
    } catch (e) {
      return c.json({ error: e instanceof Error ? e.message : "Not found" }, 404);
    }
  });

  app.post("/api/webhooks/trustless-commerce", async (c) => {
    const secret = ctx.config.trustlessCommerceWebhookSecret;
    if (secret) {
      const header = c.req.header("x-webhook-secret") ?? c.req.header("authorization")?.replace(/^Bearer\s+/i, "");
      if (header !== secret) return c.json({ error: "Unauthorized" }, 401);
    }
    const body = await c.req.json<{
      invoiceId?: string;
      id?: string;
      clientInvoiceId?: string;
      status?: string;
      type?: string;
      invoice?: { id?: string; status?: string; clientInvoiceId?: string };
    }>();
    const refs = [
      body.invoice?.id,
      body.invoiceId,
      body.id,
      body.clientInvoiceId,
      body.invoice?.clientInvoiceId,
    ].filter((x): x is string => Boolean(x));
    const status = body.invoice?.status ?? body.status ?? "";
    if (refs.length === 0) return c.json({ error: "Missing invoice id" }, 400);
    if (status && !/paid|swept/i.test(status)) {
      return c.json({ ok: true, ignored: true });
    }
    let updated = null;
    for (const ref of refs) {
      updated = await ctx.transfers.handleDepositWebhook(ref);
      if (updated) break;
    }
    return c.json({ ok: true, transferId: updated?.id ?? null });
  });

  /**
   * Legacy browser return URL (older invoices still point here).
   * Forward to the UI return page; the UI settles via POST webhook.
   */
  app.get("/api/webhooks/trustless-commerce", async (c) => {
    const ui = ctx.config.publicUiUrl.replace(/\/$/, "");
    const url = new URL(c.req.url);
    return c.redirect(`${ui}/payment/return${url.search}`, 302);
  });

  app.get("/api/admin/users", async (c) => {
    const denied = await requireAdmin(c, ctx);
    if (denied) return denied;
    const rows = await ctx.db.select().from(users).orderBy(users.createdAt);
    return c.json({ users: rows });
  });

  app.post("/api/admin/users/:id/role", async (c) => {
    const denied = await requireAdmin(c, ctx);
    if (denied) return denied;
    const body = await c.req.json<{ role: "user" | "operator" | "admin" }>();
    await ctx.db.update(users).set({ role: body.role }).where(eq(users.id, c.req.param("id")));
    return c.json({ ok: true });
  });

  app.get("/api/operator/requests", async (c) => {
    const denied = await requireOperator(c, ctx);
    if (denied) return denied;
    const status = c.req.query("status");
    const search = c.req.query("search");
    const rows = await ctx.transfers.listOperator({ status, search });
    return c.json({ requests: rows });
  });

  app.get("/api/operator/dashboard", async (c) => {
    const denied = await requireOperator(c, ctx);
    if (denied) return denied;
    const rows = await ctx.transfers.listOperator({});
    const deposited = rows.filter((r) =>
      ["deposited", "recipient_set", "withdraw_initiated", "withdraw_executed", "need_attention"].includes(
        r.phase,
      ),
    ).length;
    const unsettled = rows.filter((r) =>
      ["withdraw_initiated", "need_attention"].includes(r.phase),
    ).length;
    const volume = rows.reduce((sum, r) => sum + r.usdAmountCents, 0);
    return c.json({ totals: { count: rows.length, deposited, unsettled, volumeUsdCents: volume } });
  });

  app.post("/api/operator/requests/:id/received", async (c) => {
    const denied = await requireOperator(c, ctx);
    if (denied) return denied;
    const body = await c.req.parseBody();
    const comment = typeof body.comment === "string" ? body.comment : undefined;
    await ctx.transfers.operatorMarkReceived(c.req.param("id"), comment);
    return c.json({ ok: true });
  });

  app.get("/api/operator/fx-rate", async (c) => {
    const denied = await requireOperator(c, ctx);
    if (denied) return denied;
    const { DbFxOverrideStore } = await import("./adapters/fx/override-store.js");
    const store = new DbFxOverrideStore(ctx.db);
    const override = await store.get("USDT/IRR");
    const liveOverride =
      override && override.expiresAt.getTime() > Date.now()
        ? {
            midRate: override.midRate,
            expiresAt: override.expiresAt.toISOString(),
            setByUserId: override.setByUserId,
            createdAt: override.createdAt.toISOString(),
          }
        : null;
    const quote = await ctx.fx.getQuote("USDT", "IRR");
    return c.json({
      quote: quote
        ? {
            pair: "USDT/IRR",
            midRate: quote.midRate,
            customerRate: quote.customerRate,
            commissionBps: quote.commissionBps,
            source: quote.source,
            sources: quote.sources,
            overrideExpiresAt: quote.overrideExpiresAt?.toISOString() ?? null,
            fetchedAt: quote.fetchedAt.toISOString(),
          }
        : null,
      override: liveOverride,
      rateUnavailable: !quote,
    });
  });

  app.put("/api/operator/fx-rate", async (c) => {
    const denied = await requireOperator(c, ctx);
    if (denied) return denied;
    const session = await getSession(c, ctx);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const body = await c.req.json<{ midRate?: number; ttlHours?: number }>();
    const midRate = Number(body.midRate);
    const ttlHours = Number(body.ttlHours);
    if (!Number.isFinite(midRate) || midRate < ctx.config.fxMinRate || midRate > ctx.config.fxMaxRate) {
      return c.json(
        { error: `midRate must be between ${ctx.config.fxMinRate} and ${ctx.config.fxMaxRate}` },
        400,
      );
    }
    if (!Number.isFinite(ttlHours) || ttlHours < 1 || ttlHours > 72) {
      return c.json({ error: "ttlHours must be between 1 and 72" }, 400);
    }
    const { DbFxOverrideStore } = await import("./adapters/fx/override-store.js");
    const store = new DbFxOverrideStore(ctx.db);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);
    await store.set({
      pair: "USDT/IRR",
      midRate: Math.round(midRate),
      expiresAt,
      setByUserId: session.user.id,
      createdAt: now,
    });
    ctx.fx.invalidateCache?.();
    return c.json({
      ok: true,
      override: {
        midRate: Math.round(midRate),
        expiresAt: expiresAt.toISOString(),
        setByUserId: session.user.id,
        ttlHours,
      },
    });
  });

  app.delete("/api/operator/fx-rate", async (c) => {
    const denied = await requireOperator(c, ctx);
    if (denied) return denied;
    const { DbFxOverrideStore } = await import("./adapters/fx/override-store.js");
    const store = new DbFxOverrideStore(ctx.db);
    await store.clear("USDT/IRR");
    ctx.fx.invalidateCache?.();
    return c.json({ ok: true });
  });

  app.post("/api/internal/jobs/poll-deposits", async (c) => {
    const token = c.req.header("x-worker-token");
    if (token !== ctx.config.internalWorkerToken) return c.json({ error: "Unauthorized" }, 401);

    const { transfers: transfersTable } = await import("./db/schema.js");
    const { eq: eqOp } = await import("drizzle-orm");
    const rows = await ctx.db
      .select()
      .from(transfersTable)
      .where(eqOp(transfersTable.phase, "depositing"));

    for (const row of rows) {
      await ctx.transfers.pollDeposit(row.id);
    }
    return c.json({ polled: rows.length });
  });

  app.post("/api/dev/simulate-deposit/:transferId", async (c) => {
    if (!ctx.config.fakeRamps) return c.json({ error: "Not available" }, 403);
    ctx.transfers.simulateDepositPaid(c.req.param("transferId"));
    await ctx.transfers.pollDeposit(c.req.param("transferId"));
    return c.json({ ok: true });
  });

  app.get("/api/dev/last-otp", async (c) => {
    if (ctx.config.authEmailMode !== "console") return c.json({ error: "Not available" }, 403);
    const email = c.req.query("email");
    if (!email) return c.json({ error: "email required" }, 400);
    const record = readLastOtp(ctx.config, email);
    if (!record) return c.json({ error: "No OTP found" }, 404);
    return c.json(record);
  });

  return app;
}

async function getSession(c: { req: { raw: Request } }, ctx: AppContext) {
  const session = await ctx.auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) return null;
  await syncUserProfile(
    ctx,
    session.user.id,
    session.user.email,
    session.user.name,
    undefined,
    Boolean(session.user.emailVerified),
  );
  return session;
}

async function requireOperator(c: { req: { raw: Request }; json: (b: unknown, s: number) => Response }, ctx: AppContext) {
  const session = await getSession(c, ctx);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const [user] = await ctx.db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
  if (!user || (user.role !== "operator" && user.role !== "admin")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  if (user.role === "operator" && !user.emailVerified) {
    return c.json({ error: "Operator email must be verified" }, 403);
  }
  return null;
}

async function requireAdmin(c: { req: { raw: Request }; json: (b: unknown, s: number) => Response }, ctx: AppContext) {
  const session = await getSession(c, ctx);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const [user] = await ctx.db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
  if (!user || user.role !== "admin") {
    return c.json({ error: "Forbidden" }, 403);
  }
  return null;
}

async function syncUserProfile(
  ctx: AppContext,
  userId: string,
  email: string,
  name: string,
  referredByCode?: string | null,
  emailVerified = false,
) {
  const [existing] = await ctx.db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (existing) {
    if (emailVerified && !existing.emailVerified) {
      await ctx.db.update(users).set({ emailVerified: true }).where(eq(users.id, userId));
    }
    return;
  }

  let referredByUserId: string | null = null;
  if (referredByCode) {
    const [referrer] = await ctx.db
      .select()
      .from(users)
      .where(eq(users.inviteCode, referredByCode))
      .limit(1);
    referredByUserId = referrer?.id ?? null;
  }

  const bootstrapRole =
    email === ctx.config.bootstrapAdminEmail ? ("admin" as const) : ("user" as const);

  await ctx.db.insert(users).values({
    id: userId,
    email,
    name: name || email.split("@")[0] || "User",
    role: bootstrapRole,
    emailVerified: bootstrapRole === "admin" || emailVerified,
    inviteCode: generateInviteCode(userId),
    referredByUserId,
    createdAt: new Date(),
  });
}
