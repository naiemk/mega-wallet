import { describe, expect, it } from "vitest";
import {
  dedupeEvents,
  foldLedger,
  rebuildBalanceFromEvents,
  type LedgerEvent,
} from "../src/ledger.js";

const e = (
  type: LedgerEvent["type"],
  amount: number,
  userId = "u1",
  eventId?: string,
): LedgerEvent => ({
  eventId: eventId ?? crypto.randomUUID(),
  type,
  userId,
  amountUsdCents: amount,
  createdAt: new Date(),
});

describe("ledger", () => {
  it("folds deposit and withdraw", () => {
    const balance = foldLedger([
      e("deposit_credited", 1000),
      e("withdraw_reserved", 400),
      e("withdraw_executed", 400),
    ]);
    expect(balance).toEqual({ availableUsdCents: 600, reservedUsdCents: 0 });
  });

  it("rejects over-reserve", () => {
    expect(() => foldLedger([e("deposit_credited", 100), e("withdraw_reserved", 200)])).toThrow();
  });

  it("rebuilds per user", () => {
    const events = [e("deposit_credited", 500, "u1"), e("deposit_credited", 300, "u2")];
    expect(rebuildBalanceFromEvents(events, "u1").availableUsdCents).toBe(500);
  });

  it("dedupes by eventId", () => {
    const id = "evt-1";
    const events = [e("deposit_credited", 100, "u1", id), e("deposit_credited", 100, "u1", id)];
    expect(dedupeEvents(events)).toHaveLength(1);
  });

  it("handles release and fees", () => {
    const balance = foldLedger([
      e("deposit_credited", 1000),
      e("withdraw_reserved", 400),
      e("withdraw_released", 400),
      e("fee_taken", 50),
      e("affiliate_bonus", 25),
    ]);
    expect(balance).toEqual({ availableUsdCents: 975, reservedUsdCents: 0 });
  });
});
