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
  phase: text("phase").notNull(),
  depositExternalId: text("deposit_external_id"),
  depositPayUrl: text("deposit_pay_url"),
  recipientName: text("recipient_name"),
  recipientSheba: text("recipient_sheba"),
  withdrawExternalId: text("withdraw_external_id"),
  withdrawStatus: text("withdraw_status"),
  operatorComment: text("operator_comment"),
  evidencePath: text("evidence_path"),
  usdAmountCents: integer("usd_amount_cents").notNull(),
  destAmountMinor: integer("dest_amount_minor").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
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
