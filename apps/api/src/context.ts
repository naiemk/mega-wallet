import type { Auth } from "./auth.js";
import type { AppDb } from "./db/client.js";
import type { AppConfig } from "./config.js";
import type { QuoteService } from "./services/quotes.js";
import type { TransferService } from "./services/transfers.js";
import type { LedgerService } from "./services/ledger.js";
import type { FxOraclePort } from "@mega-wallet/core";

export interface AppContext {
  config: AppConfig;
  db: AppDb;
  auth: Auth;
  quotes: QuoteService;
  transfers: TransferService;
  ledger: LedgerService;
  fx: FxOraclePort;
}
