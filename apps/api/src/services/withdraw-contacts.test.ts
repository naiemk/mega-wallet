import { describe, expect, it } from "vitest";
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
import { TransferService } from "./transfers.js";
import { users } from "../db/schema.js";

function luhnCheckDigit(partial15: string): string {
  let sum = 0;
  let alt = true;
  for (let i = partial15.length - 1; i >= 0; i--) {
    let n = partial15.charCodeAt(i) - 48;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return String((10 - (sum % 10)) % 10);
}

const MELLI_PARTIAL = "603799000000000";
const VALID_CARD = MELLI_PARTIAL + luhnCheckDigit(MELLI_PARTIAL);
const VALID_IBAN = "IR820540102680020817909002";

describe("wallet withdraw contacts", () => {
  async function setup() {
    const dbPath = join(tmpdir(), `mw-wd-${randomUUID()}.db`);
    const logPath = join(tmpdir(), `mw-wd-${randomUUID()}.jsonl`);
    const db = createDb(dbPath);
    initSchema(db);
    const userId = "user-wd";
    await db.insert(users).values({
      id: userId,
      email: "wd@example.com",
      name: "WD",
      createdAt: new Date(),
    });
    const config = {
      ...loadConfig(),
      fakeRamps: true,
      authEmailMode: "console" as const,
      operatorSettlementEmail: "",
      resendApiKey: "",
      resendFrom: "test@example.com",
      publicApiUrl: "http://localhost:8080",
    };
    const fakeOnRamp = new FakeOnRampAdapter();
    const fakeOffRamp = new FakeOffRampAdapter();
    const offRamps = new OffRampRegistry(
      new ShebaOffRampAdapter(),
      fakeOffRamp as unknown as import("../adapters/offramp/onramper-sell.js").OnramperSellOffRampAdapter,
      fakeOffRamp,
    );
    const fx = new AggregatingFxOracle([
      new StaticFxProvider("nobitex", 500000),
      new StaticFxProvider("wallex", 501000),
    ]);
    const ledger = new LedgerService(db, new JsonlEventLog(logPath), config);
    const transfers = new TransferService(db, fakeOnRamp, offRamps, ledger, fx, fakeOnRamp, config);
    await ledger.appendEvent({
      type: "deposit_credited",
      userId,
      amountUsdCents: 10_000,
      transferId: "seed",
    });
    return { transfers, userId, ledger };
  }

  it("saves sheba and card contacts and withdraws both", async () => {
    const { transfers, userId } = await setup();

    const shebaContact = await transfers.saveContact(userId, {
      name: "Ada",
      kind: "sheba",
      sheba: VALID_IBAN,
    });
    expect(shebaContact.kind).toBe("sheba");
    expect(shebaContact.sheba).toBe(VALID_IBAN);

    const cardContact = await transfers.saveContact(userId, {
      name: "Ada",
      kind: "card",
      cardNumber: VALID_CARD,
    });
    expect(cardContact.kind).toBe("card");
    expect(cardContact.cardNumber).toBe(VALID_CARD);
    expect(cardContact.bankId).toBe("melli");

    const list = await transfers.listContacts(userId);
    expect(list.length).toBe(2);

    const wdSheba = await transfers.startWalletWithdrawal(userId, 1000, {
      name: "Ada",
      kind: "sheba",
      sheba: VALID_IBAN,
    });
    expect(wdSheba.transferId).toBeTruthy();
    const row1 = await transfers.getTransfer(wdSheba.transferId);
    expect(row1?.recipientSheba).toBe(VALID_IBAN);

    const wdCard = await transfers.startWalletWithdrawal(userId, 1000, {
      name: "Ada",
      kind: "card",
      cardNumber: VALID_CARD,
      saveContact: true,
    });
    const row2 = await transfers.getTransfer(wdCard.transferId);
    expect(row2?.recipientCard).toBe(VALID_CARD);
    expect(row2?.recipientBankId).toBe("melli");
  });

  it("accepts Farsi digits in sheba contact", async () => {
    const { transfers, userId } = await setup();
    const persian = VALID_IBAN.replace(/[0-9]/g, (d) =>
      String.fromCodePoint(0x06f0 + Number(d)),
    );
    const c = await transfers.saveContact(userId, {
      name: "Ali",
      sheba: persian,
    });
    expect(c.sheba).toBe(VALID_IBAN);
  });
});
