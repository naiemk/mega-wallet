import { sql } from "drizzle-orm";
import type { AppDb } from "./client.js";

function tryAlter(db: AppDb, statement: string) {
  try {
    db.run(sql.raw(statement));
  } catch {
    // Column already exists on legacy DBs
  }
}

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
      kind TEXT NOT NULL DEFAULT 'remittance',
      phase TEXT NOT NULL,
      deposit_external_id TEXT,
      deposit_pay_url TEXT,
      recipient_name TEXT,
      recipient_sheba TEXT,
      withdraw_external_id TEXT,
      withdraw_status TEXT,
      operator_comment TEXT,
      evidence_path TEXT,
      source_currency TEXT,
      payment_mode TEXT,
      usd_amount_cents INTEGER NOT NULL,
      dest_amount_minor INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  tryAlter(db, "ALTER TABLE transfers ADD COLUMN kind TEXT NOT NULL DEFAULT 'remittance'");
  tryAlter(db, "ALTER TABLE transfers ADD COLUMN source_currency TEXT");
  tryAlter(db, "ALTER TABLE transfers ADD COLUMN payment_mode TEXT");
  db.run(
    sql`UPDATE transfers SET kind = 'wallet_deposit' WHERE quote_id = 'wallet' AND kind = 'remittance'`,
  );
  db.run(
    sql`UPDATE transfers SET kind = 'wallet_withdraw' WHERE quote_id = 'wallet-withdraw' AND kind = 'remittance'`,
  );
  db.run(sql`
    CREATE TABLE IF NOT EXISTS withdraw_contacts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      sheba TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);
  db.run(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS withdraw_contacts_user_sheba
    ON withdraw_contacts (user_id, sheba)
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
