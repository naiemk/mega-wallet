import type {
  DepositSession,
  OnRampPort,
  OnRampQuote,
  PaymentMethod,
} from "@mega-wallet/core";

export class FakeOnRampAdapter implements OnRampPort {
  private sessions = new Map<string, DepositSession>();

  async listPaymentMethods(_input: {
    sourceCurrency: string;
    destCurrency: string;
    country: string;
    type: "buy" | "sell";
  }): Promise<PaymentMethod[]> {
    return [
      { id: "creditcard", name: "Credit Card", labels: ["Recommended"] },
      { id: "revolut", name: "Revolut" },
      { id: "paypal", name: "PayPal" },
    ];
  }

  async quote(input: {
    sourceCurrency: string;
    destCurrency: string;
    amountMinor: number;
    paymentMethod: string;
    country: string;
    userId?: string;
  }): Promise<OnRampQuote[]> {
    const usdcOut = Math.round(input.amountMinor * 1.05);
    return [
      {
        provider: "fake-moonpay",
        paymentMethod: input.paymentMethod,
        sourceCurrency: input.sourceCurrency,
        sourceAmountMinor: input.amountMinor,
        usdcOutMinor: usdcOut,
        labels: ["Recommended"],
      },
    ];
  }

  async startDeposit(input: {
    quoteId: string;
    userId: string;
    amountUsdCents: number;
    clientInvoiceId: string;
    paymentMode?: "crypto" | "crypto_or_fiat" | "fiat";
    fiatCurrency?: string;
  }): Promise<DepositSession> {
    const externalId = `fake-inv-${input.clientInvoiceId}`;
    const session: DepositSession = {
      externalId,
      payUrl: `https://pay.fake/${externalId}`,
      invoiceAddress: "0xfake1234567890",
      status: "awaiting_payment",
    };
    this.sessions.set(externalId, session);
    return session;
  }

  async getDepositStatus(externalId: string): Promise<DepositSession> {
    return (
      this.sessions.get(externalId) ?? {
        externalId,
        payUrl: "",
        status: "failed",
      }
    );
  }

  markPaid(externalId: string) {
    const s = this.sessions.get(externalId);
    if (s) s.status = "paid";
  }
}
