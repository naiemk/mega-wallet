import type { OnRampPort, OnRampQuote, PaymentMethod } from "@mega-wallet/core";

export interface OnramperConfig {
  apiKey: string;
  signingKey?: string;
  baseUrl?: string;
}

interface OnramperPaymentType {
  paymentTypeId?: string;
  id?: string;
  name?: string;
  labels?: string[];
}

interface OnramperQuoteRow {
  provider?: string;
  paymentMethod?: string;
  sourceCurrency?: string;
  inAmount?: number;
  outAmount?: number;
  fee?: number;
  labels?: string[];
}

export class OnramperAdapter implements Pick<OnRampPort, "listPaymentMethods" | "quote"> {
  private readonly baseUrl: string;

  constructor(private readonly config: OnramperConfig) {
    this.baseUrl = config.baseUrl ?? "https://api.onramper.com";
  }

  private headers(): Record<string, string> {
    return {
      Authorization: this.config.apiKey,
      "Content-Type": "application/json",
    };
  }

  async listPaymentMethods(input: {
    sourceCurrency: string;
    destCurrency: string;
    country: string;
    type: "buy" | "sell";
  }): Promise<PaymentMethod[]> {
    const params = new URLSearchParams({
      source: input.sourceCurrency.toLowerCase(),
      destination: input.destCurrency.toLowerCase(),
      country: input.country,
      type: input.type,
    });
    const res = await fetch(`${this.baseUrl}/supported/payment-types?${params}`, {
      headers: this.headers(),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { message?: OnramperPaymentType[] } | OnramperPaymentType[];
    const rows = Array.isArray(data) ? data : (data.message ?? []);
    return rows.map((row) => ({
      id: row.paymentTypeId ?? row.id ?? "unknown",
      name: row.name ?? row.paymentTypeId ?? "Payment",
      labels: row.labels,
    }));
  }

  async quote(input: {
    sourceCurrency: string;
    destCurrency: string;
    amountMinor: number;
    paymentMethod: string;
    country: string;
    userId?: string;
  }): Promise<OnRampQuote[]> {
    const amount = input.amountMinor / 100;
    const params = new URLSearchParams({
      source: input.sourceCurrency.toLowerCase(),
      destination: input.destCurrency.toLowerCase(),
      amount: String(amount),
      paymentMethod: input.paymentMethod,
      country: input.country,
    });
    if (input.userId) params.set("walletAddress", input.userId);

    const res = await fetch(`${this.baseUrl}/quotes/${input.sourceCurrency.toLowerCase()}/${input.destCurrency.toLowerCase()}?${params}`, {
      headers: this.headers(),
    });
    if (!res.ok) return [];

    const data = (await res.json()) as { message?: OnramperQuoteRow[] } | OnramperQuoteRow[];
    const rows = Array.isArray(data) ? data : (data.message ?? []);
    return rows.map((row) => ({
      provider: row.provider ?? "onramper",
      paymentMethod: row.paymentMethod ?? input.paymentMethod,
      sourceCurrency: row.sourceCurrency ?? input.sourceCurrency,
      sourceAmountMinor: Math.round((row.inAmount ?? amount) * 100),
      usdcOutMinor: Math.round((row.outAmount ?? amount) * 100),
      feeMinor: row.fee ? Math.round(row.fee * 100) : undefined,
      labels: row.labels,
    }));
  }
}
