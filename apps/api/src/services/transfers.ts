import { ulid } from "ulid";
import { and, desc, eq, or } from "drizzle-orm";
import {
  parseShebaRecipient,
  transitionTransfer,
  type OnRampPort,
} from "@mega-wallet/core";
import type { AppDb } from "../db/client.js";
import { quotes, transfers, users } from "../db/schema.js";
import type { LedgerService } from "./ledger.js";
import type { FakeOnRampAdapter } from "../adapters/fake/on-ramp.js";
import type { OffRampRegistry } from "../adapters/offramp/registry.js";

export class TransferService {
  constructor(
    private readonly db: AppDb,
    private readonly onRamp: OnRampPort,
    private readonly offRamps: OffRampRegistry,
    private readonly ledger: LedgerService,
    private readonly fakeOnRamp?: FakeOnRampAdapter,
  ) {}

  async getActiveTransfer(userId: string) {
    const [row] = await this.db
      .select()
      .from(transfers)
      .where(
        and(
          eq(transfers.userId, userId),
          or(
            eq(transfers.phase, "depositing"),
            eq(transfers.phase, "deposited"),
            eq(transfers.phase, "recipient_set"),
            eq(transfers.phase, "withdraw_initiated"),
            eq(transfers.phase, "need_attention"),
          ),
        ),
      )
      .orderBy(desc(transfers.updatedAt))
      .limit(1);
    return row ?? null;
  }

  async startTransfer(userId: string, quoteId: string) {
    const active = await this.getActiveTransfer(userId);
    if (active) throw new Error("Only one active transfer allowed");

    const [quote] = await this.db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
    if (!quote) throw new Error("Quote not found");
    if (quote.status !== "active" || quote.expiresAt < new Date()) {
      throw new Error("Quote expired");
    }

    const transferId = ulid();
    const clientInvoiceId = `mw-${transferId}`;
    const deposit = await this.onRamp.startDeposit({
      quoteId,
      userId,
      amountUsdCents: quote.usdcOutMinor,
      clientInvoiceId,
      paymentMode: "crypto_or_fiat",
    });

    const now = new Date();
    await this.db.insert(transfers).values({
      id: transferId,
      userId,
      quoteId,
      phase: "depositing",
      depositExternalId: deposit.externalId,
      depositPayUrl: deposit.payUrl,
      usdAmountCents: quote.usdcOutMinor,
      destAmountMinor: quote.destOutMinor,
      createdAt: now,
      updatedAt: now,
    });

    await this.db.update(quotes).set({ status: "consumed" }).where(eq(quotes.id, quoteId));

    return { transferId, deposit };
  }

  async pollDeposit(transferId: string) {
    const [row] = await this.db.select().from(transfers).where(eq(transfers.id, transferId)).limit(1);
    if (!row?.depositExternalId) return null;

    const status = await this.onRamp.getDepositStatus(row.depositExternalId);
    if (status.status === "paid" || status.status === "paid_partial") {
      if (row.phase === "depositing") {
        const nextPhase = transitionTransfer("depositing", "deposited");
        await this.db
          .update(transfers)
          .set({ phase: nextPhase, updatedAt: new Date() })
          .where(eq(transfers.id, transferId));

        await this.ledger.appendEvent({
          type: "deposit_credited",
          userId: row.userId,
          amountUsdCents: row.usdAmountCents,
          transferId,
        });

        const [user] = await this.db.select().from(users).where(eq(users.id, row.userId)).limit(1);
        if (user) {
          await this.db
            .update(users)
            .set({ lastSuccessfulPaymentMethod: user.lastAttemptedPaymentMethod ?? user.preferredPaymentMethod })
            .where(eq(users.id, row.userId));
        }
      }
    }
    return status;
  }

  async setRecipient(transferId: string, userId: string, name: string, sheba: string) {
    const [row] = await this.db.select().from(transfers).where(eq(transfers.id, transferId)).limit(1);
    if (!row || row.userId !== userId) throw new Error("Transfer not found");
    if (row.phase !== "deposited") throw new Error("Deposit not complete");

    const recipient = parseShebaRecipient(name, sheba);
    const nextPhase = transitionTransfer("deposited", "recipient_set");

    await this.db
      .update(transfers)
      .set({
        phase: nextPhase,
        recipientName: recipient.name,
        recipientSheba: recipient.sheba,
        updatedAt: new Date(),
      })
      .where(eq(transfers.id, transferId));

    const payout = await this.offRamps.resolve("IRR").startPayout({
      transferId,
      usdcInMinor: row.usdAmountCents,
      recipient: { name: recipient.name, sheba: recipient.sheba },
      method: "sheba-irr",
    });

    const withdrawPhase = transitionTransfer("recipient_set", "withdraw_initiated");
    await this.db
      .update(transfers)
      .set({
        phase: withdrawPhase,
        withdrawExternalId: payout.externalId,
        withdrawStatus: "initiated",
        updatedAt: new Date(),
      })
      .where(eq(transfers.id, transferId));

    await this.ledger.appendEvent({
      type: "withdraw_reserved",
      userId,
      amountUsdCents: row.usdAmountCents,
      transferId,
    });

    return payout;
  }

  async operatorMarkReceived(transferId: string, comment?: string, evidencePath?: string) {
    const [row] = await this.db.select().from(transfers).where(eq(transfers.id, transferId)).limit(1);
    if (!row) throw new Error("Transfer not found");
    if (row.phase !== "withdraw_initiated" && row.phase !== "need_attention") {
      throw new Error("Invalid transfer state");
    }

    const nextPhase = transitionTransfer(row.phase as "withdraw_initiated", "withdraw_executed");
    await this.db
      .update(transfers)
      .set({
        phase: nextPhase,
        withdrawStatus: "executed",
        operatorComment: comment ?? null,
        evidencePath: evidencePath ?? null,
        updatedAt: new Date(),
      })
      .where(eq(transfers.id, transferId));

    await this.ledger.appendEvent({
      type: "withdraw_executed",
      userId: row.userId,
      amountUsdCents: row.usdAmountCents,
      transferId,
    });
  }

  async listOperator(filters: { status?: string; search?: string }) {
    let query = this.db.select().from(transfers).orderBy(desc(transfers.updatedAt));
    const rows = await query;
    return rows.filter((r) => {
      if (filters.status && r.withdrawStatus !== filters.status && r.phase !== filters.status) {
        return false;
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        return (
          r.recipientName?.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          r.userId.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }

  /** Test helper */
  async simulateDepositPaid(transferId: string) {
    if (!this.fakeOnRamp) return;
    const [row] = await this.db.select().from(transfers).where(eq(transfers.id, transferId)).limit(1);
    if (row?.depositExternalId) this.fakeOnRamp.markPaid(row.depositExternalId);
  }

  async startWalletDeposit(userId: string, amountUsdCents: number) {
    const active = await this.getActiveTransfer(userId);
    if (active) throw new Error("Only one active transfer allowed");

    const transferId = ulid();
    const clientInvoiceId = `mw-wallet-${transferId}`;
    const deposit = await this.onRamp.startDeposit({
      quoteId: "wallet",
      userId,
      amountUsdCents,
      clientInvoiceId,
      paymentMode: "crypto_or_fiat",
    });

    const now = new Date();
    await this.db.insert(transfers).values({
      id: transferId,
      userId,
      quoteId: "wallet",
      phase: "depositing",
      depositExternalId: deposit.externalId,
      depositPayUrl: deposit.payUrl,
      usdAmountCents: amountUsdCents,
      destAmountMinor: 0,
      createdAt: now,
      updatedAt: now,
    });

    return { transferId, deposit };
  }

  async startWalletWithdrawal(userId: string, amountUsdCents: number, name: string, sheba: string) {
    const active = await this.getActiveTransfer(userId);
    if (active) throw new Error("Only one active transfer allowed");

    const balance = await this.ledger.getBalance(userId);
    if (balance.availableUsdCents < amountUsdCents) throw new Error("Insufficient balance");

    const recipient = parseShebaRecipient(name, sheba);
    const transferId = ulid();
    const now = new Date();

    await this.db.insert(transfers).values({
      id: transferId,
      userId,
      quoteId: "wallet-withdraw",
      phase: "recipient_set",
      recipientName: recipient.name,
      recipientSheba: recipient.sheba,
      usdAmountCents: amountUsdCents,
      destAmountMinor: amountUsdCents * 50000,
      createdAt: now,
      updatedAt: now,
    });

    const payout = await this.offRamps.resolve("IRR").startPayout({
      transferId,
      usdcInMinor: amountUsdCents,
      recipient: { name: recipient.name, sheba: recipient.sheba },
      method: "sheba-irr",
    });

    const withdrawPhase = transitionTransfer("recipient_set", "withdraw_initiated");
    await this.db
      .update(transfers)
      .set({
        phase: withdrawPhase,
        withdrawExternalId: payout.externalId,
        withdrawStatus: "initiated",
        updatedAt: new Date(),
      })
      .where(eq(transfers.id, transferId));

    await this.ledger.appendEvent({
      type: "withdraw_reserved",
      userId,
      amountUsdCents,
      transferId,
    });

    return { transferId, payout };
  }
}
