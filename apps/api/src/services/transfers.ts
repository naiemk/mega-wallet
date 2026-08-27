import { ulid } from "ulid";
import { and, desc, eq, or } from "drizzle-orm";
import type { FxOraclePort, OnRampPort } from "@mega-wallet/core";
import {
  inferTransferKind,
  parseCardRecipient,
  parseShebaRecipient,
  transitionTransfer,
  walletDepositInvoiceTitle,
} from "@mega-wallet/core";
import type { AppDb } from "../db/client.js";
import { quotes, transfers, users, withdrawContacts } from "../db/schema.js";
import type { LedgerService } from "./ledger.js";
import type { FakeOnRampAdapter } from "../adapters/fake/on-ramp.js";
import type { OffRampRegistry } from "../adapters/offramp/registry.js";
import type { AppConfig } from "../config.js";
import { sendOperatorEmail } from "../auth-otp.js";

type TransferRow = typeof transfers.$inferSelect;

export class TransferService {
  constructor(
    private readonly db: AppDb,
    private readonly onRamp: OnRampPort,
    private readonly offRamps: OffRampRegistry,
    private readonly ledger: LedgerService,
    private readonly fx: FxOraclePort,
    private readonly fakeOnRamp?: FakeOnRampAdapter,
    private readonly config?: Pick<
      AppConfig,
      | "publicApiUrl"
      | "slippageBps"
      | "authEmailMode"
      | "resendApiKey"
      | "resendFrom"
      | "operatorSettlementEmail"
    >,
  ) {}

  async getTransfer(id: string) {
    const [row] = await this.db.select().from(transfers).where(eq(transfers.id, id)).limit(1);
    return row ?? null;
  }

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

  async startTransfer(
    userId: string,
    quoteId: string,
    language?: string,
    recipientInput?: { name: string; sheba: string },
  ) {
    const [quote] = await this.db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
    if (!quote) throw new Error("Quote not found");
    if (quote.status !== "active" || quote.expiresAt < new Date()) {
      throw new Error("Quote expired");
    }

    const recipient = recipientInput
      ? parseShebaRecipient(recipientInput.name, recipientInput.sheba)
      : null;

    const [profile] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    const lang = language ?? profile?.preferredLanguage ?? undefined;

    const transferId = ulid();
    const clientInvoiceId = `mw-${transferId}`;
    const displayAmount = (quote.sourceAmountMinor / 100).toFixed(2);
    const deposit = await this.onRamp.startDeposit({
      quoteId,
      userId,
      amountUsdCents: quote.usdcOutMinor,
      clientInvoiceId,
      paymentMode: "fiat",
      fiatCurrency: quote.sourceCurrency,
      displayAmount,
      paymentMethod: quote.paymentMethod,
      provider: quote.provider,
      country: "us",
      slippageBps: quote.slippageBps ?? this.config?.slippageBps,
      lang,
      callbackUrl: this.config?.publicApiUrl
        ? `${this.config.publicApiUrl.replace(/\/$/, "")}/api/webhooks/trustless-commerce`
        : undefined,
    });

    const now = new Date();
    await this.db.insert(transfers).values({
      id: transferId,
      userId,
      quoteId,
      kind: "remittance",
      phase: "depositing",
      depositExternalId: deposit.externalId,
      depositPayUrl: deposit.payUrl,
      sourceCurrency: quote.sourceCurrency,
      paymentMode: "fiat",
      usdAmountCents: quote.usdcOutMinor,
      destAmountMinor: quote.destOutMinor,
      recipientName: recipient?.name ?? null,
      recipientSheba: recipient?.sheba ?? null,
      createdAt: now,
      updatedAt: now,
    });

    await this.db.update(quotes).set({ status: "consumed" }).where(eq(quotes.id, quoteId));

    if (quote.paymentMethod) {
      await this.db
        .update(users)
        .set({ lastAttemptedPaymentMethod: quote.paymentMethod })
        .where(eq(users.id, userId));
    }

    return { transferId, deposit, reused: false as const, kind: "remittance" as const };
  }

  async pollDeposit(transferId: string) {
    const [row] = await this.db.select().from(transfers).where(eq(transfers.id, transferId)).limit(1);
    if (!row?.depositExternalId) return null;

    const status = await this.onRamp.getDepositStatus(row.depositExternalId);
    if (status.status === "paid" || status.status === "paid_partial") {
      await this.creditDepositIfNeeded(row);
    }
    return status;
  }

  /** Credit ledger once when invoice is paid (poll or webhook). */
  async creditDepositIfNeeded(row: TransferRow) {
    if (row.phase !== "depositing") return row;

    const kind = inferTransferKind(row.quoteId, row.kind);
    const nextPhase =
      kind === "wallet_deposit"
        ? transitionTransfer("depositing", "completed")
        : transitionTransfer("depositing", "deposited");

    await this.db
      .update(transfers)
      .set({ phase: nextPhase, updatedAt: new Date() })
      .where(eq(transfers.id, row.id));

    await this.ledger.appendEvent({
      type: "deposit_credited",
      userId: row.userId,
      amountUsdCents: row.usdAmountCents,
      transferId: row.id,
    });

    const [user] = await this.db.select().from(users).where(eq(users.id, row.userId)).limit(1);
    if (user) {
      await this.db
        .update(users)
        .set({
          lastSuccessfulPaymentMethod:
            user.lastAttemptedPaymentMethod ?? user.preferredPaymentMethod,
        })
        .where(eq(users.id, row.userId));
    }

    const [updated] = await this.db.select().from(transfers).where(eq(transfers.id, row.id)).limit(1);
    const credited = updated ?? { ...row, phase: nextPhase };

    if (
      kind === "remittance" &&
      credited.phase === "deposited" &&
      credited.recipientName &&
      credited.recipientSheba
    ) {
      return this.initiateRecipientPayout(credited);
    }

    return credited;
  }

  async handleDepositWebhook(externalId: string) {
    const [row] = await this.db
      .select()
      .from(transfers)
      .where(eq(transfers.depositExternalId, externalId))
      .limit(1);
    if (!row) {
      const byId = await this.db.select().from(transfers).orderBy(desc(transfers.updatedAt));
      const match = byId.find(
        (t) =>
          t.depositExternalId === externalId ||
          t.id === externalId.replace(/^mw-(wallet-)?/, "") ||
          `mw-${t.id}` === externalId ||
          `mw-wallet-${t.id}` === externalId,
      );
      if (!match) return null;
      return this.creditDepositIfNeeded(match);
    }
    return this.creditDepositIfNeeded(row);
  }

  /** Start Sheba payout from deposited remittance that already has recipient fields. */
  private async initiateRecipientPayout(row: TransferRow) {
    if (row.phase !== "deposited") return row;
    if (!row.recipientName || !row.recipientSheba) return row;

    const recipient = parseShebaRecipient(row.recipientName, row.recipientSheba);
    const nextPhase = transitionTransfer("deposited", "recipient_set");

    await this.db
      .update(transfers)
      .set({
        phase: nextPhase,
        recipientName: recipient.name,
        recipientSheba: recipient.sheba,
        updatedAt: new Date(),
      })
      .where(eq(transfers.id, row.id));

    const payout = await this.offRamps.resolve("IRR").startPayout({
      transferId: row.id,
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
      .where(eq(transfers.id, row.id));

    await this.ledger.appendEvent({
      type: "withdraw_reserved",
      userId: row.userId,
      amountUsdCents: row.usdAmountCents,
      transferId: row.id,
    });

    void this.notifyOperatorSettlement({
      ...row,
      recipientName: recipient.name,
      recipientSheba: recipient.sheba,
    }).catch((err) => {
      console.error("[transfers] operator settlement email failed", err);
    });

    const [updated] = await this.db.select().from(transfers).where(eq(transfers.id, row.id)).limit(1);
    return updated ?? row;
  }

  private async notifyOperatorSettlement(row: TransferRow) {
    if (!this.config) return;
    await sendOperatorEmail(this.config, {
      transferId: row.id,
      userId: row.userId,
      usdAmountCents: row.usdAmountCents,
      destAmountMinor: row.destAmountMinor,
      recipientName: row.recipientName ?? "",
      recipientSheba: row.recipientSheba ?? undefined,
      recipientCard: row.recipientCard ?? undefined,
    });
  }

  async setRecipient(transferId: string, userId: string, name: string, sheba: string) {
    const [row] = await this.db.select().from(transfers).where(eq(transfers.id, transferId)).limit(1);
    if (!row || row.userId !== userId) throw new Error("Transfer not found");
    if (row.phase !== "deposited") throw new Error("Deposit not complete");
    if (inferTransferKind(row.quoteId, row.kind) !== "remittance") {
      throw new Error("Recipient only for remittance transfers");
    }

    const recipient = parseShebaRecipient(name, sheba);
    await this.db
      .update(transfers)
      .set({
        recipientName: recipient.name,
        recipientSheba: recipient.sheba,
        updatedAt: new Date(),
      })
      .where(eq(transfers.id, transferId));

    const [withRecipient] = await this.db
      .select()
      .from(transfers)
      .where(eq(transfers.id, transferId))
      .limit(1);
    if (!withRecipient) throw new Error("Transfer not found");

    const updated = await this.initiateRecipientPayout(withRecipient);
    return {
      externalId: updated.withdrawExternalId ?? "",
      status: updated.withdrawStatus ?? "initiated",
    };
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

  async cancelWithdrawal(transferId: string, userId: string) {
    const [row] = await this.db.select().from(transfers).where(eq(transfers.id, transferId)).limit(1);
    if (!row || row.userId !== userId) throw new Error("Transfer not found");
    if (row.phase !== "withdraw_initiated" && row.phase !== "need_attention") {
      throw new Error("Cannot cancel in current state");
    }

    const nextPhase = transitionTransfer(row.phase as "withdraw_initiated", "withdraw_cancelled");
    await this.db
      .update(transfers)
      .set({
        phase: nextPhase,
        withdrawStatus: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(transfers.id, transferId));

    await this.ledger.appendEvent({
      type: "withdraw_released",
      userId,
      amountUsdCents: row.usdAmountCents,
      transferId,
    });

    return { transferId, phase: nextPhase };
  }

  async listOperator(filters: { status?: string; search?: string }) {
    const rows = await this.db.select().from(transfers).orderBy(desc(transfers.updatedAt));
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

  async simulateDepositPaid(transferId: string) {
    if (!this.fakeOnRamp) return;
    const [row] = await this.db.select().from(transfers).where(eq(transfers.id, transferId)).limit(1);
    if (row?.depositExternalId) this.fakeOnRamp.markPaid(row.depositExternalId);
  }

  async startWalletDeposit(
    userId: string,
    input: {
      amountUsdCents: number;
      sourceCurrency?: string;
      sourceAmountMinor?: number;
      paymentMode?: "crypto" | "fiat" | "crypto_or_fiat";
      paymentMethod?: string;
      provider?: string;
      language?: string;
    },
  ) {
    const amountUsdCents = Math.round(input.amountUsdCents);
    if (!Number.isFinite(amountUsdCents) || amountUsdCents <= 0) {
      throw new Error("Invalid amount");
    }

    const paymentMode = input.paymentMode ?? "fiat";
    const sourceCurrency = input.sourceCurrency ?? "USD";
    const sourceAmountMinor = input.sourceAmountMinor ?? amountUsdCents;
    const transferId = ulid();
    const clientInvoiceId = `mw-wallet-${transferId}`;
    const title = walletDepositInvoiceTitle(input.language);
    const displayAmount = (sourceAmountMinor / 100).toFixed(2);

    const deposit = await this.onRamp.startDeposit({
      quoteId: "wallet",
      userId,
      amountUsdCents,
      clientInvoiceId,
      paymentMode,
      fiatCurrency: sourceCurrency,
      title,
      displayAmount,
      paymentMethod: input.paymentMethod,
      provider: input.provider,
      country: "us",
      slippageBps: this.config?.slippageBps,
      lang: input.language,
      callbackUrl: this.config?.publicApiUrl
        ? `${this.config.publicApiUrl.replace(/\/$/, "")}/api/webhooks/trustless-commerce`
        : undefined,
    });

    if (input.paymentMethod) {
      await this.db
        .update(users)
        .set({ lastAttemptedPaymentMethod: input.paymentMethod })
        .where(eq(users.id, userId));
    }

    const now = new Date();
    await this.db.insert(transfers).values({
      id: transferId,
      userId,
      quoteId: "wallet",
      kind: "wallet_deposit",
      phase: "depositing",
      depositExternalId: deposit.externalId,
      depositPayUrl: deposit.payUrl,
      sourceCurrency,
      paymentMode,
      usdAmountCents: amountUsdCents,
      destAmountMinor: 0,
      createdAt: now,
      updatedAt: now,
    });

    return {
      transferId,
      deposit,
      usdAmountCents: amountUsdCents,
      kind: "wallet_deposit" as const,
      reused: false as const,
    };
  }

  async startWalletWithdrawal(
    userId: string,
    amountUsdCents: number,
    input: {
      name: string;
      kind?: "sheba" | "card";
      sheba?: string;
      cardNumber?: string;
      bankId?: string | null;
      saveContact?: boolean;
    },
  ) {
    const balance = await this.ledger.getBalance(userId);
    if (balance.availableUsdCents < amountUsdCents) throw new Error("Insufficient balance");

    const kind = input.kind ?? (input.cardNumber ? "card" : "sheba");
    let recipientName = input.name;
    let recipientSheba: string | null = null;
    let recipientCard: string | null = null;
    let recipientBankId: string | null = input.bankId ?? null;
    let payoutRecipient: Record<string, string>;

    if (kind === "card") {
      const recipient = parseCardRecipient(input.name, input.cardNumber ?? "");
      recipientName = recipient.name;
      recipientCard = recipient.cardNumber;
      recipientBankId = recipient.bankId;
      payoutRecipient = {
        name: recipient.name,
        card: recipient.cardNumber,
        bankId: recipient.bankId ?? "other",
      };
    } else {
      const recipient = parseShebaRecipient(input.name, input.sheba ?? "");
      recipientName = recipient.name;
      recipientSheba = recipient.sheba;
      recipientBankId = recipient.bankId;
      payoutRecipient = { name: recipient.name, sheba: recipient.sheba };
    }

    const transferId = ulid();
    const now = new Date();

    const rate = await this.fx.getRate("USDT", "IRR");
    if (!rate) throw new Error("Rate unavailable");
    const destAmountMinor = Math.round((amountUsdCents / 100) * rate.rate);

    await this.db.insert(transfers).values({
      id: transferId,
      userId,
      quoteId: "wallet-withdraw",
      kind: "wallet_withdraw",
      phase: "recipient_set",
      recipientName,
      recipientSheba,
      recipientCard,
      recipientBankId,
      usdAmountCents: amountUsdCents,
      destAmountMinor,
      createdAt: now,
      updatedAt: now,
    });

    const payout = await this.offRamps.resolve("IRR").startPayout({
      transferId,
      usdcInMinor: amountUsdCents,
      recipient: payoutRecipient,
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

    if (input.saveContact) {
      await this.saveContact(userId, {
        name: recipientName,
        kind,
        sheba: recipientSheba ?? undefined,
        cardNumber: recipientCard ?? undefined,
        bankId: recipientBankId,
      });
    }

    return { transferId, payout, kind: "wallet_withdraw" as const };
  }

  async listContacts(userId: string) {
    return this.db
      .select()
      .from(withdrawContacts)
      .where(eq(withdrawContacts.userId, userId))
      .orderBy(desc(withdrawContacts.createdAt));
  }

  async saveContact(
    userId: string,
    input: {
      name: string;
      kind?: "sheba" | "card";
      sheba?: string;
      cardNumber?: string;
      bankId?: string | null;
    },
  ) {
    const kind = input.kind ?? (input.cardNumber ? "card" : "sheba");
    if (kind === "card") {
      const recipient = parseCardRecipient(input.name, input.cardNumber ?? "");
      const existing = await this.db
        .select()
        .from(withdrawContacts)
        .where(
          and(
            eq(withdrawContacts.userId, userId),
            eq(withdrawContacts.cardNumber, recipient.cardNumber),
          ),
        )
        .limit(1);
      if (existing[0]) {
        await this.db
          .update(withdrawContacts)
          .set({
            name: recipient.name,
            kind: "card",
            bankId: recipient.bankId,
          })
          .where(eq(withdrawContacts.id, existing[0].id));
        return { ...existing[0], name: recipient.name, kind: "card" as const, bankId: recipient.bankId };
      }
      const id = ulid();
      const row = {
        id,
        userId,
        name: recipient.name,
        kind: "card" as const,
        sheba: "",
        cardNumber: recipient.cardNumber,
        bankId: recipient.bankId,
        createdAt: new Date(),
      };
      await this.db.insert(withdrawContacts).values(row);
      return row;
    }

    const recipient = parseShebaRecipient(input.name, input.sheba ?? "");
    const existing = await this.db
      .select()
      .from(withdrawContacts)
      .where(and(eq(withdrawContacts.userId, userId), eq(withdrawContacts.sheba, recipient.sheba)))
      .limit(1);
    if (existing[0]) {
      await this.db
        .update(withdrawContacts)
        .set({
          name: recipient.name,
          kind: "sheba",
          bankId: recipient.bankId,
        })
        .where(eq(withdrawContacts.id, existing[0].id));
      return { ...existing[0], name: recipient.name, kind: "sheba" as const, bankId: recipient.bankId };
    }
    const id = ulid();
    const row = {
      id,
      userId,
      name: recipient.name,
      kind: "sheba" as const,
      sheba: recipient.sheba,
      cardNumber: null as string | null,
      bankId: recipient.bankId,
      createdAt: new Date(),
    };
    await this.db.insert(withdrawContacts).values(row);
    return row;
  }

  async deleteContact(userId: string, contactId: string) {
    const [row] = await this.db
      .select()
      .from(withdrawContacts)
      .where(and(eq(withdrawContacts.id, contactId), eq(withdrawContacts.userId, userId)))
      .limit(1);
    if (!row) throw new Error("Contact not found");
    await this.db.delete(withdrawContacts).where(eq(withdrawContacts.id, contactId));
    return { ok: true };
  }
}
