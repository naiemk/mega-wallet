import type { LedgerEvent } from "../ledger.js";

export interface EventLogPort {
  append(event: LedgerEvent): Promise<void>;
  listAll(): Promise<LedgerEvent[]>;
  listSince(since: Date): Promise<LedgerEvent[]>;
}
