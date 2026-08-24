import type { OnRampPort, DepositSession } from "@mega-wallet/core";
import { FakeOnRampAdapter } from "../fake/on-ramp.js";

export interface TrustlessCommerceConfig {
  baseUrl: string;
  operatorWallets: { base: string; tron: string };
}

export class TrustlessCommerceAdapter implements OnRampPort {
  private fake = new FakeOnRampAdapter();

  constructor(private readonly config: TrustlessCommerceConfig) {}

  listPaymentMethods = (...args: Parameters<OnRampPort["listPaymentMethods"]>) =>
    this.fake.listPaymentMethods(...args);

  quote = (...args: Parameters<OnRampPort["quote"]>) => this.fake.quote(...args);

  async startDeposit(input: {
    quoteId: string;
    userId: string;
    amountUsdCents: number;
    clientInvoiceId: string;
    paymentMode?: "crypto" | "crypto_or_fiat" | "fiat";
    fiatCurrency?: string;
  }): Promise<DepositSession> {
    if (process.env.FAKE_RAMPS === "1") {
      return this.fake.startDeposit(input);
    }

    const price = (input.amountUsdCents / 100).toFixed(2);
    const body = {
      price,
      to: [this.config.operatorWallets.base, this.config.operatorWallets.tron],
      chains: ["8453", "nile"],
      tokens: ["USDC", "USDT"],
      clientInvoiceId: input.clientInvoiceId,
      chainId: "8453",
      token: "USDC",
      selectedTo: this.config.operatorWallets.base,
      title: "Mega Wallet deposit",
      allowPartial: false,
      paymentMode: input.paymentMode ?? "crypto_or_fiat",
    };

    const res = await fetch(`${this.config.baseUrl}/api/invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": input.clientInvoiceId },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`TC invoice create failed: ${res.status}`);
    }

    const data = (await res.json()) as {
      invoice?: { id?: string; invoiceAddress?: string };
      payLink?: string;
    };

    return {
      externalId: data.invoice?.id ?? input.clientInvoiceId,
      payUrl: data.payLink ?? `${this.config.baseUrl}/pay?id=${data.invoice?.id}`,
      invoiceAddress: data.invoice?.invoiceAddress,
      status: "awaiting_payment",
    };
  }

  async getDepositStatus(externalId: string): Promise<DepositSession> {
    if (process.env.FAKE_RAMPS === "1") {
      return this.fake.getDepositStatus(externalId);
    }

    const res = await fetch(`${this.config.baseUrl}/api/invoices/${externalId}`);
    if (!res.ok) {
      return { externalId, payUrl: "", status: "failed" };
    }

    const data = (await res.json()) as { invoice?: { status?: string }; payLink?: string };
    const statusMap: Record<string, DepositSession["status"]> = {
      awaiting_payment: "awaiting_payment",
      paid: "paid",
      paid_partial: "paid_partial",
      swept: "paid",
    };
    const raw = data.invoice?.status ?? "awaiting_payment";
    return {
      externalId,
      payUrl: data.payLink ?? "",
      status: statusMap[raw] ?? "awaiting_payment",
    };
  }
}
