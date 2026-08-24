import { Hono } from "hono";
import { cors } from "hono/cors";
import { eq } from "drizzle-orm";
import { generateInviteCode } from "@mega-wallet/core";
import type { AppContext } from "./context.js";
import { users } from "./db/schema.js";

export function createApp(ctx: AppContext) {
  const app = new Hono();

  app.use(
    "*",
    cors({
      origin: ctx.config.publicUiUrl,
      credentials: true,
    }),
  );

  app.get("/api/health", (c) => c.json({ ok: true }));
  app.get("/api/ready", (c) => c.json({ ok: true, db: true }));

  app.on(["POST", "GET"], "/api/auth/*", (c) => ctx.auth.handler(c.req.raw));

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
  });

  app.post("/api/transfers", async (c) => {
    const session = await getSession(c, ctx);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const body = await c.req.json<{ quoteId: string }>();
    const result = await ctx.transfers.startTransfer(session.user.id, body.quoteId);
    return c.json(result);
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
    const transfer = await ctx.transfers.getActiveTransfer(session.user.id);
    if (transfer?.id !== c.req.param("id")) {
      const { transfers } = await import("./db/schema.js");
      const { eq: eqOp } = await import("drizzle-orm");
      const [row] = await ctx.db
        .select()
        .from(transfers)
        .where(eqOp(transfers.id, c.req.param("id")))
        .limit(1);
      if (!row || row.userId !== session.user.id) return c.json({ error: "Not found" }, 404);
      return c.json({ transfer: row });
    }
    return c.json({ transfer });
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
    return c.json({ balance, displayUsd: (balance.availableUsdCents / 100).toFixed(2) });
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
    const body = await c.req.json<{ amountUsdCents: number }>();
    const result = await ctx.transfers.startWalletDeposit(session.user.id, body.amountUsdCents);
    return c.json(result);
  });

  app.post("/api/withdrawals", async (c) => {
    const session = await getSession(c, ctx);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const body = await c.req.json<{ amountUsdCents: number; name: string; sheba: string }>();
    const result = await ctx.transfers.startWalletWithdrawal(
      session.user.id,
      body.amountUsdCents,
      body.name,
      body.sheba,
    );
    return c.json(result);
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

  return app;
}

async function getSession(c: { req: { raw: Request } }, ctx: AppContext) {
  const session = await ctx.auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) return null;
  await syncUserProfile(ctx, session.user.id, session.user.email, session.user.name);
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
) {
  const [existing] = await ctx.db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (existing) return;

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
    emailVerified: bootstrapRole === "admin",
    inviteCode: generateInviteCode(userId),
    referredByUserId,
    createdAt: new Date(),
  });
}
