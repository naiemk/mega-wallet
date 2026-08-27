import { eq } from "drizzle-orm";
import type { FxOverrideRecord, FxOverrideStore } from "@mega-wallet/core";
import type { AppDb } from "../../db/client.js";
import { fxOverrides } from "../../db/schema.js";

export class DbFxOverrideStore implements FxOverrideStore {
  constructor(private readonly db: AppDb) {}

  async get(pair: string): Promise<FxOverrideRecord | null> {
    const [row] = await this.db.select().from(fxOverrides).where(eq(fxOverrides.pair, pair)).limit(1);
    if (!row) return null;
    return {
      pair: row.pair,
      midRate: row.midRate,
      expiresAt: row.expiresAt,
      setByUserId: row.setByUserId,
      createdAt: row.createdAt,
    };
  }

  async set(record: FxOverrideRecord): Promise<void> {
    await this.db
      .insert(fxOverrides)
      .values({
        pair: record.pair,
        midRate: record.midRate,
        expiresAt: record.expiresAt,
        setByUserId: record.setByUserId,
        createdAt: record.createdAt,
      })
      .onConflictDoUpdate({
        target: fxOverrides.pair,
        set: {
          midRate: record.midRate,
          expiresAt: record.expiresAt,
          setByUserId: record.setByUserId,
          createdAt: record.createdAt,
        },
      });
  }

  async clear(pair: string): Promise<void> {
    await this.db.delete(fxOverrides).where(eq(fxOverrides.pair, pair));
  }
}
