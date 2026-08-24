export interface OffRampQuote {
  provider: string;
  destCurrency: string;
  usdcInMinor: number;
  destOutMinor: number;
  feeMinor?: number;
}

export interface PayoutSession {
  externalId: string;
  status: "initiated" | "executed" | "cancelled" | "need_attention";
  payoutUrl?: string;
}

export interface OffRampPort {
  quote(input: {
    destCurrency: string;
    usdcInMinor: number;
    country: string;
    paymentMethod?: string;
  }): Promise<OffRampQuote[]>;

  startPayout(input: {
    transferId: string;
    usdcInMinor: number;
    recipient: Record<string, string>;
    method: string;
  }): Promise<PayoutSession>;

  getPayoutStatus(externalId: string): Promise<PayoutSession>;
}
