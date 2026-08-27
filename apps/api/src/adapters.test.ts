import { describe, expect, it, vi, afterEach } from "vitest";
import { FakeOnRampAdapter } from "../src/adapters/fake/on-ramp.js";
import { ShebaOffRampAdapter } from "../src/adapters/offramp/sheba.js";
import { OnramperSellOffRampAdapter } from "../src/adapters/offramp/onramper-sell.js";
import { OffRampRegistry } from "../src/adapters/offramp/registry.js";
import { TrustlessCommerceAdapter } from "../src/adapters/trustless-commerce/index.js";
import { JsonlEventLog } from "../src/adapters/event-log/jsonl.js";
import { DualEventLog } from "../src/adapters/event-log/dual.js";
import { AggregatingFxOracle, StaticFxProvider } from "../src/adapters/fx/index.js";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

describe("adapters", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

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

  it("TC adapter maps quote + fiat invoice create for testnet", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/public/onramp-methods")) {
        return new Response(
          JSON.stringify({
            methods: [{ id: "creditcard", name: "Credit Card" }],
          }),
          { status: 200 },
        );
      }
      if (url.includes("/api/public/onramp-quote")) {
        return new Response(
          JSON.stringify({
            cryptoAmount: "47.59",
            fiatAmount: "50",
            paymentMethod: "creditcard",
            quotes: [
              {
                provider: "guardarian",
                paymentMethod: "creditcard",
                fiatAmount: "50",
                cryptoAmount: "47.59",
                fees: { transactionFee: 2.4 },
                recommendations: ["Recommended"],
              },
            ],
            recommended: {
              provider: "guardarian",
              paymentMethod: "creditcard",
              cryptoAmount: "47.59",
            },
          }),
          { status: 200 },
        );
      }
      if (url.endsWith("/api/invoices") && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as Record<string, unknown>;
        expect(body.chains).toEqual(["11155111", "nile"]);
        expect(body.paymentMode).toBe("fiat");
        expect(body.displayFiat).toBe("USD");
        expect(body.displayAmount).toBe("50.00");
        expect(body.quotePaymentMethod).toBe("creditcard");
        expect(body.quoteProvider).toBe("guardarian");
        expect(body.chainId).toBe("11155111");
        return new Response(
          JSON.stringify({
            invoice: {
              id: "0xabc",
              invoiceAddress: "0xpay",
              status: "awaiting_payment",
            },
            payLink: "/pay?id=0xabc",
          }),
          { status: 201 },
        );
      }
      if (url.includes("/api/invoices/0xabc")) {
        return new Response(
          JSON.stringify({ invoice: { id: "0xabc", status: "paid" }, payLink: "/pay?id=0xabc" }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ error: "unexpected" }), { status: 500 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new TrustlessCommerceAdapter({
      baseUrl: "https://testnet.trustless-commerce.com",
      operatorWallets: {
        ethereum: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        base: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        tron: "TFVVt2ZhXCr1HXrKND2Qxmoj7zrKWd4BZt",
      },
      fakeRamps: false,
      slippageBps: 100,
      callbackBaseUrl: "http://localhost:8080",
    });

    const methods = await adapter.listPaymentMethods({
      sourceCurrency: "USD",
      destCurrency: "usdc",
      country: "US",
      type: "buy",
    });
    expect(methods[0]?.id).toBe("creditcard");

    const quotes = await adapter.quote({
      sourceCurrency: "USD",
      destCurrency: "usdc",
      amountMinor: 5000,
      paymentMethod: "creditcard",
      country: "US",
    });
    expect(quotes[0]?.usdcOutMinor).toBe(4759);
    expect(quotes[0]?.provider).toBe("guardarian");
    expect(quotes[0]?.feeMinor).toBe(240);

    const session = await adapter.startDeposit({
      quoteId: "q1",
      userId: "u1",
      amountUsdCents: 4759,
      clientInvoiceId: "mw-test-1",
      paymentMode: "fiat",
      fiatCurrency: "USD",
      displayAmount: "50.00",
      paymentMethod: "creditcard",
      provider: "guardarian",
      country: "us",
    });
    expect(session.externalId).toBe("0xabc");
    expect(session.payUrl).toBe(
      "https://testnet.trustless-commerce.com/pay?id=0xabc&header=none",
    );

    const status = await adapter.getDepositStatus("0xabc");
    expect(status.status).toBe("paid");
  });

  it("parses flat TC invoice GET (status at top level, including swept/expired)", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/invoices/0xswept")) {
        return new Response(
          JSON.stringify({
            id: "0xswept",
            status: "swept",
            lang: "fa",
            clientInvoiceId: "mw-wallet-1",
          }),
          { status: 200 },
        );
      }
      if (url.includes("/api/invoices/0xexpired")) {
        return new Response(JSON.stringify({ id: "0xexpired", status: "expired" }), {
          status: 200,
        });
      }
      return new Response(JSON.stringify({ error: "unexpected" }), { status: 500 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new TrustlessCommerceAdapter({
      baseUrl: "https://testnet.trustless-commerce.com",
      operatorWallets: {
        ethereum: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        base: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        tron: "TFVVt2ZhXCr1HXrKND2Qxmoj7zrKWd4BZt",
      },
      fakeRamps: false,
    });

    expect((await adapter.getDepositStatus("0xswept")).status).toBe("paid");
    expect((await adapter.getDepositStatus("0xexpired")).status).toBe("expired");
  });

  it("sheba off-ramp quotes IRR via FX oracle", async () => {
    const fx = new AggregatingFxOracle([
      new StaticFxProvider("a", 500000),
      new StaticFxProvider("b", 501000),
    ]);
    const adapter = new ShebaOffRampAdapter(fx);
    const quotes = await adapter.quote({
      destCurrency: "IRR",
      usdcInMinor: 1000,
      country: "IR",
    });
    expect(quotes[0]?.provider).toBe("sheba-irr");
    expect(quotes[0]?.destOutMinor).toBeGreaterThan(0);
  });

  it("sheba off-ramp returns empty when FX unavailable", async () => {
    const fx = new AggregatingFxOracle([new StaticFxProvider("a", null)]);
    const adapter = new ShebaOffRampAdapter(fx);
    const quotes = await adapter.quote({
      destCurrency: "IRR",
      usdcInMinor: 1000,
      country: "IR",
    });
    expect(quotes).toEqual([]);
  });

  it("off-ramp registry resolves by currency", () => {
    const registry = new OffRampRegistry(
      new ShebaOffRampAdapter(),
      new OnramperSellOffRampAdapter({ apiKey: "test" }),
    );
    expect(registry.resolve("IRR")).toBeDefined();
  });

  it("aggregates FX rates with commission on customer rate", async () => {
    const fx = new AggregatingFxOracle(
      [new StaticFxProvider("a", 500000), new StaticFxProvider("b", 501000)],
      { commissionBps: 100 },
    );
    const rate = await fx.getRate("USDT", "IRR");
    expect(rate?.rate).toBe(Math.floor(500500 * 0.99));
    const quote = await fx.getQuote("USDT", "IRR");
    expect(quote?.midRate).toBe(500500);
    expect(quote?.customerRate).toBe(rate?.rate);
    expect(quote?.source).toBe("aggregated");
  });

  it("rejects FX outlier beyond deviation band", async () => {
    const fx = new AggregatingFxOracle(
      [
        new StaticFxProvider("a", 1_050_000),
        new StaticFxProvider("b", 1_051_000),
        new StaticFxProvider("c", 1_200_000),
      ],
      { commissionBps: 0, maxDeviationBps: 200 },
    );
    const quote = await fx.getQuote("USDT", "IRR");
    expect(quote?.midRate).toBe(1_050_500);
    expect(quote?.sources.find((s) => s.name === "c")?.accepted).toBe(false);
  });

  it("returns null when FX sources disagree past quorum", async () => {
    const fx = new AggregatingFxOracle(
      [new StaticFxProvider("a", 1_000_000), new StaticFxProvider("b", 1_100_000)],
      { maxDeviationBps: 200, minSources: 2 },
    );
    expect(await fx.getQuote("USDT", "IRR")).toBeNull();
  });

  it("caches successful FX quote within TTL", async () => {
    let fetches = 0;
    const provider = {
      name: "counting",
      async fetchUsdtIrr() {
        fetches += 1;
        return 500_000;
      },
    };
    const fx = new AggregatingFxOracle([provider, { ...provider, name: "b" }], {
      cacheTtlMs: 60_000,
      commissionBps: 0,
    });
    await fx.getQuote("USDT", "IRR");
    await fx.getQuote("USDT", "IRR");
    expect(fetches).toBe(2); // one per provider, once
  });

  it("negative cache does not serve a rate after failed vote", async () => {
    const fx = new AggregatingFxOracle(
      [new StaticFxProvider("a", null), new StaticFxProvider("b", null)],
      { negativeCacheTtlMs: 60_000 },
    );
    expect(await fx.getQuote("USDT", "IRR")).toBeNull();
    expect(await fx.getQuote("USDT", "IRR")).toBeNull();
  });

  it("operator override wins over feeds until expiry", async () => {
    const store = {
      row: null as null | {
        pair: string;
        midRate: number;
        expiresAt: Date;
        setByUserId: string;
        createdAt: Date;
      },
      async get(pair: string) {
        return this.row?.pair === pair ? this.row : null;
      },
      async set(record: NonNullable<typeof this.row>) {
        this.row = record;
      },
      async clear() {
        this.row = null;
      },
    };
    const fx = new AggregatingFxOracle(
      [new StaticFxProvider("a", 500000), new StaticFxProvider("b", 501000)],
      { commissionBps: 100, overrideStore: store },
    );
    await store.set({
      pair: "USDT/IRR",
      midRate: 2_000_000,
      expiresAt: new Date(Date.now() + 3600_000),
      setByUserId: "op1",
      createdAt: new Date(),
    });
    const quote = await fx.getQuote("USDT", "IRR");
    expect(quote?.source).toBe("operator");
    expect(quote?.midRate).toBe(2_000_000);
    expect(quote?.customerRate).toBe(Math.floor(2_000_000 * 0.99));

    await store.clear();
    fx.invalidateCache();
    const live = await fx.getQuote("USDT", "IRR");
    expect(live?.source).toBe("aggregated");
    expect(live?.midRate).toBe(500500);
  });

  it("expired operator override is ignored", async () => {
    const store = {
      async get() {
        return {
          pair: "USDT/IRR",
          midRate: 2_000_000,
          expiresAt: new Date(Date.now() - 1000),
          setByUserId: "op1",
          createdAt: new Date(),
        };
      },
      async set() {},
      async clear() {},
    };
    const fx = new AggregatingFxOracle(
      [new StaticFxProvider("a", 500000), new StaticFxProvider("b", 501000)],
      { commissionBps: 0, overrideStore: store },
    );
    const quote = await fx.getQuote("USDT", "IRR");
    expect(quote?.source).toBe("aggregated");
    expect(quote?.midRate).toBe(500500);
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
