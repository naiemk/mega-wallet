import { ulid } from "ulid";
import {
  paymentMethodPreference,
  quoteExpiresAt,
  selectProvider,
  type OnRampPort,
} from "@mega-wallet/core";
import type { FxOraclePort } from "@mega-wallet/core";
import type { AppDb } from "../db/client.js";
import { quotes } from "../db/schema.js";
import type { AppConfig } from "../config.js";

export class QuoteService {
  constructor(
    private readonly db: AppDb,
    private readonly onRamp: OnRampPort,
    private readonly fx: FxOraclePort,
    private readonly config: AppConfig,
  ) {}

  async createQuote(input: {
    sourceCurrency: string;
    destCurrency: string;
    sourceAmountMinor: number;
    paymentMethod?: string;
    country?: string;
    userId?: string;
    lastSuccessfulPaymentMethod?: string | null;
    lastAttemptedPaymentMethod?: string | null;
  }) {
    const country = (input.country ?? "US").toUpperCase();
    const methods = await this.onRamp.listPaymentMethods({
      sourceCurrency: input.sourceCurrency,
      destCurrency: "usdc",
      country,
      type: "buy",
    });

    const preferred = paymentMethodPreference(
      input.lastSuccessfulPaymentMethod,
      input.lastAttemptedPaymentMethod,
    );
    const paymentMethod =
      input.paymentMethod ??
      selectProvider(methods.map((m) => ({ id: m.id, labels: m.labels })), preferred) ??
      methods[0]?.id ??
      "creditcard";

    const ranked = await this.onRamp.quote({
      sourceCurrency: input.sourceCurrency,
      destCurrency: "usdc",
      amountMinor: input.sourceAmountMinor,
      paymentMethod,
      country,
      userId: input.userId,
    });

    const best = selectProvider(
      ranked.map((q) => ({ id: q.provider, labels: q.labels })),
      preferred,
    );
    const selected = ranked.find((q) => q.provider === best) ?? ranked[0];
    if (!selected) throw new Error("No quotes available");

    let destOutMinor = selected.usdcOutMinor;
    if (input.destCurrency === "IRR") {
      const rate = await this.fx.getRate("USDT", "IRR");
      if (!rate) throw new Error("Rate unavailable");
      destOutMinor = Math.round((selected.usdcOutMinor / 100) * rate.rate);
    }

    const id = ulid();
    const expiresAt = quoteExpiresAt(new Date(), this.config.quoteTtlHours);
    const row = {
      id,
      userId: input.userId ?? null,
      sourceCurrency: input.sourceCurrency,
      destCurrency: input.destCurrency,
      sourceAmountMinor: input.sourceAmountMinor,
      usdcOutMinor: selected.usdcOutMinor,
      destOutMinor,
      paymentMethod: selected.paymentMethod,
      provider: selected.provider,
      slippageBps: this.config.slippageBps,
      expiresAt,
      status: "active",
      createdAt: new Date(),
    };

    await this.db.insert(quotes).values(row);

    return {
      ...row,
      feeMinor: selected.feeMinor,
      rankedQuotes: ranked,
      paymentMethods: methods,
      countdownSeconds: Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
    };
  }
}
