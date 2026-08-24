import { describe, expect, it } from "vitest";
import { FakeOnRampAdapter } from "../src/adapters/fake/on-ramp.js";
import { JsonlEventLog } from "../src/adapters/event-log/jsonl.js";
import { loadConfig } from "../src/config.js";
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
