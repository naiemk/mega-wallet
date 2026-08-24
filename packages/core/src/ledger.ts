export type LedgerEventType =
  | "deposit_credited"
  | "withdraw_reserved"
  | "withdraw_executed"
  | "withdraw_released"
  | "fee_taken"
  | "affiliate_bonus";

export interface LedgerEvent {
  eventId: string;
  type: LedgerEventType;
  userId: string;
  amountUsdCents: number;
  transferId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface BalanceSnapshot {
  availableUsdCents: number;
  reservedUsdCents: number;
}

export function foldLedger(events: readonly LedgerEvent[]): BalanceSnapshot {
  let available = 0;
  let reserved = 0;

  for (const e of events) {
    switch (e.type) {
      case "deposit_credited":
      case "affiliate_bonus":
        available += e.amountUsdCents;
        break;
      case "withdraw_reserved":
        if (available < e.amountUsdCents) {
          throw new Error("Insufficient balance");
        }
        available -= e.amountUsdCents;
        reserved += e.amountUsdCents;
        break;
      case "withdraw_executed":
        reserved -= e.amountUsdCents;
        break;
      case "withdraw_released":
        reserved -= e.amountUsdCents;
        available += e.amountUsdCents;
        break;
      case "fee_taken":
        available -= e.amountUsdCents;
        break;
    }
  }

  return { availableUsdCents: available, reservedUsdCents: reserved };
}

export function rebuildBalanceFromEvents(
  events: readonly LedgerEvent[],
  userId: string,
): BalanceSnapshot {
  const userEvents = events.filter((e) => e.userId === userId);
  return foldLedger(userEvents);
}

export function dedupeEvents(events: readonly LedgerEvent[]): LedgerEvent[] {
  const seen = new Set<string>();
  const result: LedgerEvent[] = [];
  for (const e of events) {
    if (seen.has(e.eventId)) continue;
    seen.add(e.eventId);
    result.push(e);
  }
  return result.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}
