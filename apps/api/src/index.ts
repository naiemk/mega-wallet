import { serve } from "@hono/node-server";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createAuth, runAuthMigrations } from "./auth.js";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createDb } from "./db/client.js";
import { initSchema } from "./db/init-schema.js";
import { FakeOnRampAdapter } from "./adapters/fake/on-ramp.js";
import { FakeOffRampAdapter } from "./adapters/fake/off-ramp.js";
import { TrustlessCommerceAdapter } from "./adapters/trustless-commerce/index.js";
import {
  AggregatingFxOracle,
  BitpinFxProvider,
  NobitexFxProvider,
  StaticFxProvider,
  WallexFxProvider,
} from "./adapters/fx/index.js";
import { DbFxOverrideStore } from "./adapters/fx/override-store.js";
import { createEventLog } from "./adapters/event-log/dual.js";
import { ShebaOffRampAdapter } from "./adapters/offramp/sheba.js";
import { OnramperSellOffRampAdapter } from "./adapters/offramp/onramper-sell.js";
import { OffRampRegistry } from "./adapters/offramp/registry.js";
import { QuoteService } from "./services/quotes.js";
import { TransferService } from "./services/transfers.js";
import { LedgerService } from "./services/ledger.js";

const config = loadConfig();
mkdirSync(dirname(config.databaseUrl), { recursive: true });
mkdirSync(dirname(config.eventLogPath), { recursive: true });

const db = createDb(config.databaseUrl);
initSchema(db);
await runAuthMigrations(config);

const fakeOnRamp = new FakeOnRampAdapter();
const fakeOffRamp = new FakeOffRampAdapter();
const tcAdapter = new TrustlessCommerceAdapter({
  baseUrl: config.trustlessCommerceUrl,
  operatorWallets: {
    ethereum: config.operatorWallets.ethereum,
    base: config.operatorWallets.base,
    tron: config.operatorWallets.tron,
  },
  callbackBaseUrl: config.publicApiUrl,
  slippageBps: config.slippageBps,
  fakeRamps: config.fakeRamps,
});

/** TC owns quotes + invoices when real; Onramper is not called directly. */
const onRamp = config.fakeRamps ? fakeOnRamp : tcAdapter;

const fxOverrideStore = new DbFxOverrideStore(db);
const fxOpts = {
  commissionBps: config.fxCommissionBps,
  maxDeviationBps: config.fxMaxDeviationBps,
  minSources: config.fxMinSources,
  minRate: config.fxMinRate,
  maxRate: config.fxMaxRate,
  cacheTtlMs: config.fxCacheTtlMs,
  negativeCacheTtlMs: config.fxNegativeCacheMs,
  overrideStore: fxOverrideStore,
};

const fx = config.fakeRamps
  ? new AggregatingFxOracle(
      [
        new StaticFxProvider("nobitex", 2_002_000),
        new StaticFxProvider("wallex", 2_003_000),
        new StaticFxProvider("bitpin", 2_001_000),
      ],
      fxOpts,
    )
  : new AggregatingFxOracle(
      [new NobitexFxProvider(), new WallexFxProvider(), new BitpinFxProvider()],
      fxOpts,
    );

const shebaOffRamp = new ShebaOffRampAdapter(fx);
const onramperSellOffRamp = new OnramperSellOffRampAdapter({ apiKey: config.onramperApiKey });
const offRampRegistry = new OffRampRegistry(
  shebaOffRamp,
  onramperSellOffRamp,
  config.fakeRamps ? fakeOffRamp : undefined,
);
const eventLog = createEventLog(config.eventLogPath, config.s3EventLogBucket
  ? {
      bucket: config.s3EventLogBucket,
      key: config.s3EventLogKey,
      endpoint: config.s3EventLogEndpoint || undefined,
    }
  : undefined);

const auth = createAuth(config);
const ledger = new LedgerService(db, eventLog, config);
const quotes = new QuoteService(db, onRamp, fx, config);
const transfers = new TransferService(
  db,
  onRamp,
  offRampRegistry,
  ledger,
  fx,
  config.fakeRamps ? fakeOnRamp : undefined,
  {
    publicApiUrl: config.publicApiUrl,
    slippageBps: config.slippageBps,
    authEmailMode: config.authEmailMode,
    resendApiKey: config.resendApiKey,
    resendFrom: config.resendFrom,
    operatorSettlementEmail: config.operatorSettlementEmail,
  },
);

const app = createApp({ config, db, auth, quotes, transfers, ledger, fx });

serve({ fetch: app.fetch, port: config.port }, () => {
  console.log(`Mega Wallet API listening on :${config.port}`);
});

export { app };
