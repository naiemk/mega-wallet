import type { OffRampPort, OffRampQuote, PayoutSession } from "@mega-wallet/core";

export interface OnramperSellConfig {
  apiKey: string;
  baseUrl?: string;
}

export class OnramperSellOffRampAdapter implements OffRampPort {
  private readonly baseUrl: string;

  constructor(private readonly config: OnramperSellConfig) {
    this.baseUrl = config.baseUrl ?? "https://api.onramper.com";
  }

  async quote(input: {
    destCurrency: string;
    usdcInMinor: number;
    country: string;
    paymentMethod?: string;
  }): Promise<OffRampQuote[]> {
    const amount = input.usdcInMinor / 100;
    const params = new URLSearchParams({
      source: "usdc",
      destination: input.destCurrency.toLowerCase(),
      amount: String(amount),
      country: input.country,
      type: "sell",
    });
    if (input.paymentMethod) params.set("paymentMethod", input.paymentMethod);

    const res = await fetch(
      `${this.baseUrl}/quotes/usdc/${input.destCurrency.toLowerCase()}?${params}`,
      { headers: { Authorization: this.config.apiKey } },
    );
    if (!res.ok) return [];

    const data = (await res.json()) as {
      message?: Array<{ provider?: string; outAmount?: number; fee?: number }>;
    };
    const rows = data.message ?? [];
    return rows.map((row) => ({
      provider: row.provider ?? "onramper-sell",
      destCurrency: input.destCurrency,
      usdcInMinor: input.usdcInMinor,
      destOutMinor: Math.round((row.outAmount ?? amount) * 100),
      feeMinor: row.fee ? Math.round(row.fee * 100) : undefined,
    }));
  }

  async startPayout(input: {
    transferId: string;
    usdcInMinor: number;
    recipient: Record<string, string>;
    method: string;
  }): Promise<PayoutSession> {
    return {
      externalId: `onramper-sell-${input.transferId}`,
      status: "initiated",
      payoutUrl: `https://onramper.com/sell/${input.transferId}`,
    };
  }

  async getPayoutStatus(externalId: string): Promise<PayoutSession> {
    return { externalId, status: "initiated" };
  }
}
