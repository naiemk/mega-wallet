import { ulid } from "ulid";
import { eq } from "drizzle-orm";
import {
  computeAffiliateBonus,
  dedupeEvents,
  rebuildBalanceFromEvents,
  type LedgerEvent,
  type LedgerEventType,
} from "@mega-wallet/core";
import type { EventLogPort } from "@mega-wallet/core";
import type { AppDb } from "../db/client.js";
import { ledgerEvents, users } from "../db/schema.js";
import type { AppConfig } from "../config.js";

export class LedgerService {
  constructor(
    private readonly db: AppDb,
    private readonly eventLog: EventLogPort,
    private readonly config: AppConfig,
  ) {}

  async appendEvent(input: {
    type: LedgerEventType;
    userId: string;
    amountUsdCents: number;
    transferId?: string;
    metadata?: Record<string, unknown>;
    eventId?: string;
  }): Promise<LedgerEvent> {
    const event: LedgerEvent = {
      eventId: input.eventId ?? ulid(),
      type: input.type,
      userId: input.userId,
      amountUsdCents: input.amountUsdCents,
      transferId: input.transferId,
      metadata: input.metadata,
      createdAt: new Date(),
    };

    try {
      await this.db.insert(ledgerEvents).values({
        eventId: event.eventId,
        type: event.type,
        userId: event.userId,
        amountUsdCents: event.amountUsdCents,
        transferId: event.transferId ?? null,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
        createdAt: event.createdAt,
      });
    } catch (err) {
      const msg = String(err);
      if (msg.includes("UNIQUE constraint failed")) {
        return event;
      }
      throw err;
    }

    await this.eventLog.append(event);

    if (input.type === "fee_taken" && input.metadata?.referrerUserId) {
      await this.creditAffiliate(String(input.metadata.referrerUserId), input.amountUsdCents);
    }

    return event;
  }

  private async creditAffiliate(referrerUserId: string, feeUsdCents: number) {
    const [referrer] = await this.db.select().from(users).where(eq(users.id, referrerUserId)).limit(1);
    if (!referrer) return;

    const bonus = computeAffiliateBonus(feeUsdCents, {
      bonusBps: this.config.affiliateBonusBps,
      maxBonusUsdCents: this.config.affiliateMaxBonusUsdCents,
    }, referrer.affiliateEarnedUsdCents);

    if (bonus <= 0) return;

    await this.appendEvent({
      type: "affiliate_bonus",
      userId: referrerUserId,
      amountUsdCents: bonus,
    });

    await this.db
      .update(users)
      .set({ affiliateEarnedUsdCents: referrer.affiliateEarnedUsdCents + bonus })
      .where(eq(users.id, referrerUserId));
  }

  async getBalance(userId: string) {
    const rows = await this.db.select().from(ledgerEvents).where(eq(ledgerEvents.userId, userId));
    const events: LedgerEvent[] = rows.map((r) => ({
      eventId: r.eventId,
      type: r.type as LedgerEventType,
      userId: r.userId,
      amountUsdCents: r.amountUsdCents,
      transferId: r.transferId ?? undefined,
      metadata: r.metadata ? JSON.parse(r.metadata) : undefined,
      createdAt: r.createdAt,
    }));
    return rebuildBalanceFromEvents(events, userId);
  }

  async rebuildFromEventLog() {
    const all = dedupeEvents(await this.eventLog.listAll());
    for (const event of all) {
      await this.appendEvent({ ...event, eventId: event.eventId });
    }
    return all.length;
  }
}
