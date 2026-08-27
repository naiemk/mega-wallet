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

export interface StartDepositInput {
  quoteId: string;
  userId: string;
  amountUsdCents: number;
  clientInvoiceId: string;
  paymentMode?: "crypto" | "crypto_or_fiat" | "fiat";
  fiatCurrency?: string;
  title?: string;
  /** Fiat amount the customer pays (major units string, e.g. "50.00"). */
  displayAmount?: string;
  paymentMethod?: string;
  provider?: string;
  country?: string;
  slippageBps?: number;
  callbackUrl?: string;
  /** Checkout UI language (TC `lang`, e.g. en / fa / ar). */
  lang?: string;
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

  startDeposit(input: StartDepositInput): Promise<DepositSession>;

  getDepositStatus(externalId: string): Promise<DepositSession>;
}
