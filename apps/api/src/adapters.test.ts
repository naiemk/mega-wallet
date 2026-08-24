import { describe, expect, it } from "vitest";
import { FakeOnRampAdapter } from "../src/adapters/fake/on-ramp.js";
import { ShebaOffRampAdapter } from "../src/adapters/offramp/sheba.js";
import { OnramperSellOffRampAdapter } from "../src/adapters/offramp/onramper-sell.js";
import { OffRampRegistry } from "../src/adapters/offramp/registry.js";
import { JsonlEventLog } from "../src/adapters/event-log/jsonl.js";
import { DualEventLog } from "../src/adapters/event-log/dual.js";
import { AggregatingFxOracle, StaticFxProvider } from "../src/adapters/fx/index.js";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

describe("adapters", () => {
  it("fake on-ramp lists methods and quotes", async () => {
    const adapter = new FakeOnRampAdapter();
    const methods = await adapter.listPaymentMethods({
      sourceCurrency: "EUR",
      destCurrency: "usdc",
      country: "US",
      type: "buy",
    });
    expect(methods.length).toBeGreaterThan(0);
    const quotes = await adapter.quote({
      sourceCurrency: "EUR",
      destCurrency: "usdc",
      amountMinor: 10000,
      paymentMethod: "creditcard",
      country: "US",
    });
    expect(quotes[0]?.usdcOutMinor).toBeGreaterThan(0);
  });

  it("sheba off-ramp quotes IRR", async () => {
    const adapter = new ShebaOffRampAdapter();
    const quotes = await adapter.quote({
      destCurrency: "IRR",
      usdcInMinor: 1000,
      country: "IR",
    });
    expect(quotes[0]?.provider).toBe("sheba-irr");
  });

  it("off-ramp registry resolves by currency", () => {
    const registry = new OffRampRegistry(
      new ShebaOffRampAdapter(),
      new OnramperSellOffRampAdapter({ apiKey: "test" }),
    );
    expect(registry.resolve("IRR")).toBeDefined();
  });

  it("aggregates FX rates", async () => {
    const fx = new AggregatingFxOracle([
      new StaticFxProvider("a", 500000),
      new StaticFxProvider("b", 501000),
    ]);
    const rate = await fx.getRate("USDT", "IRR");
    expect(rate?.rate).toBeGreaterThan(0);
  });

  it("dual event log writes jsonl", async () => {
    const path = join(tmpdir(), `mw-${randomUUID()}.jsonl`);
    const log = new DualEventLog(new JsonlEventLog(path));
    await log.append({
      eventId: "e1",
      type: "deposit_credited",
      userId: "u1",
      amountUsdCents: 100,
      createdAt: new Date(),
    });
    const all = await log.listAll();
    expect(all).toHaveLength(1);
  });
});
