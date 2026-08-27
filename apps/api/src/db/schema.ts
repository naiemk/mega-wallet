import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role", { enum: ["user", "operator", "admin"] }).notNull().default("user"),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  preferredLanguage: text("preferred_language").default("en"),
  preferredPaymentMethod: text("preferred_payment_method"),
  lastSuccessfulPaymentMethod: text("last_successful_payment_method"),
  lastAttemptedPaymentMethod: text("last_attempted_payment_method"),
  inviteCode: text("invite_code").unique(),
  referredByUserId: text("referred_by_user_id"),
  affiliateEarnedUsdCents: integer("affiliate_earned_usd_cents").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const quotes = sqliteTable("quotes", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  sourceCurrency: text("source_currency").notNull(),
  destCurrency: text("dest_currency").notNull(),
  sourceAmountMinor: integer("source_amount_minor").notNull(),
  usdcOutMinor: integer("usdc_out_minor").notNull(),
  destOutMinor: integer("dest_out_minor").notNull(),
  paymentMethod: text("payment_method").notNull(),
  provider: text("provider").notNull(),
  slippageBps: integer("slippage_bps").notNull().default(100),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  status: text("status").notNull().default("active"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const transfers = sqliteTable("transfers", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  quoteId: text("quote_id").notNull(),
  kind: text("kind", { enum: ["remittance", "wallet_deposit", "wallet_withdraw"] })
    .notNull()
    .default("remittance"),
  phase: text("phase").notNull(),
  depositExternalId: text("deposit_external_id"),
  depositPayUrl: text("deposit_pay_url"),
  recipientName: text("recipient_name"),
  recipientSheba: text("recipient_sheba"),
  recipientCard: text("recipient_card"),
  recipientBankId: text("recipient_bank_id"),
  withdrawExternalId: text("withdraw_external_id"),
  withdrawStatus: text("withdraw_status"),
  operatorComment: text("operator_comment"),
  evidencePath: text("evidence_path"),
  sourceCurrency: text("source_currency"),
  paymentMode: text("payment_mode"),
  usdAmountCents: integer("usd_amount_cents").notNull(),
  destAmountMinor: integer("dest_amount_minor").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const withdrawContacts = sqliteTable("withdraw_contacts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["sheba", "card"] })
    .notNull()
    .default("sheba"),
  sheba: text("sheba"),
  cardNumber: text("card_number"),
  bankId: text("bank_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const ledgerEvents = sqliteTable("ledger_events", {
  eventId: text("event_id").primaryKey(),
  type: text("type").notNull(),
  userId: text("user_id").notNull(),
  amountUsdCents: integer("amount_usd_cents").notNull(),
  transferId: text("transfer_id"),
  metadata: text("metadata"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
});

/** Operator-set mid-market FX override (one row per pair). */
export const fxOverrides = sqliteTable("fx_overrides", {
  pair: text("pair").primaryKey(),
  midRate: integer("mid_rate").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  setByUserId: text("set_by_user_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});
