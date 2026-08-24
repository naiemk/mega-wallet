import { createDb } from "../db/client.js";
import { initSchema } from "../db/init-schema.js";
import { loadConfig } from "../config.js";
import { JsonlEventLog } from "../adapters/event-log/jsonl.js";
import { LedgerService } from "../services/ledger.js";

const config = loadConfig();
const db = createDb(config.databaseUrl);
initSchema(db);
const ledger = new LedgerService(db, new JsonlEventLog(config.eventLogPath), config);

const count = await ledger.rebuildFromEventLog();
console.log(`Rebuilt ${count} events from event log`);
