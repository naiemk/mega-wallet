import { describe, expect, it, vi } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { FakeOnRampAdapter } from "../adapters/fake/on-ramp.js";
import { FakeOffRampAdapter } from "../adapters/fake/off-ramp.js";
import { OffRampRegistry } from "../adapters/offramp/registry.js";
import { ShebaOffRampAdapter } from "../adapters/offramp/sheba.js";
import { AggregatingFxOracle, StaticFxProvider } from "../adapters/fx/index.js";
import { JsonlEventLog } from "../adapters/event-log/jsonl.js";
import { loadConfig } from "../config.js";
import { createDb } from "../db/client.js";
import { initSchema } from "../db/init-schema.js";
import { LedgerService } from "./ledger.js";
import { QuoteService } from "./quotes.js";
import { TransferService } from "./transfers.js";
import { users } from "../db/schema.js";

describe("remittance recipient-first flow", () => {
  it("stores recipient on start and advances to withdraw_initiated on credit", async () => {
    const dbPath = join(tmpdir(), `mw-tr-${randomUUID()}.db`);
    const logPath = join(tmpdir(), `mw-tr-${randomUUID()}.jsonl`);
    const db = createDb(dbPath);
    initSchema(db);

    const userId = "user-1";
    await db.insert(users).values({
      id: userId,
      email: "u1@example.com",
      name: "U1",
      createdAt: new Date(),
    });

    const config = {
      ...loadConfig(),
      fakeRamps: true,
      authEmailMode: "console" as const,
      operatorSettlementEmail: "ops@example.com",
      resendApiKey: "",
      resendFrom: "test@example.com",
      publicApiUrl: "http://localhost:8080",
    };

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const fakeOnRamp = new FakeOnRampAdapter();
    const fakeOffRamp = new FakeOffRampAdapter();
    const fx = new AggregatingFxOracle([
      new StaticFxProvider("nobitex", 500000),
      new StaticFxProvider("wallex", 501000),
      new StaticFxProvider("bitpin", 499000),
    ]);
    const offRamps = new OffRampRegistry(
      new ShebaOffRampAdapter(fx),
      fakeOffRamp as unknown as import("../adapters/offramp/onramper-sell.js").OnramperSellOffRampAdapter,
      fakeOffRamp,
    );
    const ledger = new LedgerService(db, new JsonlEventLog(logPath), config);
    const quotes = new QuoteService(db, fakeOnRamp, fx, config);
    const transfers = new TransferService(db, fakeOnRamp, offRamps, ledger, fx, fakeOnRamp, config);

    const quote = await quotes.createQuote({
      sourceCurrency: "USD",
      destCurrency: "IRR",
      sourceAmountMinor: 10000,
      userId,
    });

    const started = await transfers.startTransfer(userId, quote.id, "en", {
      name: "Ada Lovelace",
      sheba: "IR820540102680020817909002",
    });

    const depositing = await transfers.getTransfer(started.transferId);
    expect(depositing?.phase).toBe("depositing");
    expect(depositing?.recipientName).toBe("Ada Lovelace");
    expect(depositing?.recipientSheba).toMatch(/^IR/);

    await transfers.simulateDepositPaid(started.transferId);
    await transfers.pollDeposit(started.transferId);

    const settled = await transfers.getTransfer(started.transferId);
    expect(settled?.phase).toBe("withdraw_initiated");
    expect(settled?.withdrawStatus).toBe("initiated");

    const balance = await ledger.getBalance(userId);
    expect(balance.availableUsdCents).toBe(0);
    expect(balance.reservedUsdCents).toBeGreaterThan(0);

    expect(logSpy.mock.calls.some((c) => String(c[0]).includes("operator-email"))).toBe(true);
    logSpy.mockRestore();
  });

  it("resolves deposit refs from TC invoice_id and client_invoice_id", async () => {
    const dbPath = join(tmpdir(), `mw-tr-${randomUUID()}.db`);
    const logPath = join(tmpdir(), `mw-tr-${randomUUID()}.jsonl`);
    const db = createDb(dbPath);
    initSchema(db);

    const userId = "user-dep-1";
    await db.insert(users).values({
      id: userId,
      email: "dep@example.com",
      name: "Dep",
      createdAt: new Date(),
    });

    const config = {
      ...loadConfig(),
      fakeRamps: true,
      authEmailMode: "console" as const,
      publicApiUrl: "http://localhost:8080",
      publicUiUrl: "http://localhost:5173",
    };

    const fakeOnRamp = new FakeOnRampAdapter();
    const fakeOffRamp = new FakeOffRampAdapter();
    const fx = new AggregatingFxOracle([new StaticFxProvider("nobitex", 500000)]);
    const offRamps = new OffRampRegistry(
      new ShebaOffRampAdapter(fx),
      fakeOffRamp as unknown as import("../adapters/offramp/onramper-sell.js").OnramperSellOffRampAdapter,
      fakeOffRamp,
    );
    const ledger = new LedgerService(db, new JsonlEventLog(logPath), config);
    const transfers = new TransferService(db, fakeOnRamp, offRamps, ledger, fx, fakeOnRamp, config);

    const started = await transfers.startWalletDeposit(userId, {
      amountUsdCents: 2500,
      sourceCurrency: "USD",
      paymentMode: "fiat",
    });

    const row = await transfers.getTransfer(started.transferId);
    expect(row?.depositExternalId).toBeTruthy();

    const byExternal = await transfers.findTransferByDepositRef(row!.depositExternalId!);
    expect(byExternal?.id).toBe(started.transferId);

    const byClient = await transfers.findTransferByDepositRef(`mw-wallet-${started.transferId}`);
    expect(byClient?.id).toBe(started.transferId);

    await transfers.simulateDepositPaid(started.transferId);
    await transfers.handleDepositWebhook(`mw-wallet-${started.transferId}`);
    const settled = await transfers.getTransfer(started.transferId);
    expect(settled?.phase).toBe("completed");
  });
});
