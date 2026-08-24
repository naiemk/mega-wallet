import { sql } from "drizzle-orm";
import type { AppDb } from "./client.js";

export function initSchema(db: AppDb) {
  db.run(sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      email_verified INTEGER NOT NULL DEFAULT 0,
      preferred_language TEXT DEFAULT 'en',
      preferred_payment_method TEXT,
      last_successful_payment_method TEXT,
      last_attempted_payment_method TEXT,
      invite_code TEXT UNIQUE,
      referred_by_user_id TEXT,
      affiliate_earned_usd_cents INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    )
  `);
  db.run(sql`
    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      source_currency TEXT NOT NULL,
      dest_currency TEXT NOT NULL,
      source_amount_minor INTEGER NOT NULL,
      usdc_out_minor INTEGER NOT NULL,
      dest_out_minor INTEGER NOT NULL,
      payment_method TEXT NOT NULL,
      provider TEXT NOT NULL,
      slippage_bps INTEGER NOT NULL DEFAULT 100,
      expires_at INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL
    )
  `);
  db.run(sql`
    CREATE TABLE IF NOT EXISTS transfers (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      quote_id TEXT NOT NULL,
      phase TEXT NOT NULL,
      deposit_external_id TEXT,
      deposit_pay_url TEXT,
      recipient_name TEXT,
      recipient_sheba TEXT,
      withdraw_external_id TEXT,
      withdraw_status TEXT,
      operator_comment TEXT,
      evidence_path TEXT,
      usd_amount_cents INTEGER NOT NULL,
      dest_amount_minor INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  db.run(sql`
    CREATE TABLE IF NOT EXISTS ledger_events (
      event_id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      user_id TEXT NOT NULL,
      amount_usd_cents INTEGER NOT NULL,
      transfer_id TEXT,
      metadata TEXT,
      created_at INTEGER NOT NULL
    )
  `);
}
