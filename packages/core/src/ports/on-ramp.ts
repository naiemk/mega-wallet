export interface PaymentMethod {
  id: string;
  name: string;
  labels?: string[];
}

export interface OnRampQuote {
  provider: string;
  paymentMethod: string;
  sourceCurrency: string;
  sourceAmountMinor: number;
  usdcOutMinor: number;
  feeMinor?: number;
  labels?: string[];
}

export interface DepositSession {
  externalId: string;
  payUrl: string;
  invoiceAddress?: string;
  status: "awaiting_payment" | "paid" | "paid_partial" | "failed" | "expired";
}

export interface OnRampPort {
  listPaymentMethods(input: {
    sourceCurrency: string;
    destCurrency: string;
    country: string;
    type: "buy" | "sell";
  }): Promise<PaymentMethod[]>;

  quote(input: {
    sourceCurrency: string;
    destCurrency: string;
    amountMinor: number;
    paymentMethod: string;
    country: string;
    userId?: string;
  }): Promise<OnRampQuote[]>;

  startDeposit(input: {
    quoteId: string;
    userId: string;
    amountUsdCents: number;
    clientInvoiceId: string;
    paymentMode?: "crypto" | "crypto_or_fiat" | "fiat";
    fiatCurrency?: string;
  }): Promise<DepositSession>;

  getDepositStatus(externalId: string): Promise<DepositSession>;
}
