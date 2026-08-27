import type { FxOraclePort, OffRampPort, OffRampQuote, PayoutSession } from "@mega-wallet/core";

/** Operator-manual Sheba payout — status updated by operator dashboard. */
export class ShebaOffRampAdapter implements OffRampPort {
  private payouts = new Map<string, PayoutSession>();

  constructor(private readonly fx?: FxOraclePort) {}

  async quote(input: {
    destCurrency: string;
    usdcInMinor: number;
    country: string;
    paymentMethod?: string;
  }): Promise<OffRampQuote[]> {
    if (input.destCurrency !== "IRR") return [];
    const rate = this.fx ? await this.fx.getRate("USDT", "IRR") : null;
    if (!rate) return [];
    return [
      {
        provider: "sheba-irr",
        destCurrency: "IRR",
        usdcInMinor: input.usdcInMinor,
        destOutMinor: Math.round((input.usdcInMinor / 100) * rate.rate),
      },
    ];
  }

  async startPayout(input: {
    transferId: string;
    usdcInMinor: number;
    recipient: Record<string, string>;
    method: string;
  }): Promise<PayoutSession> {
    const session: PayoutSession = {
      externalId: `sheba-${input.transferId}`,
      status: "initiated",
    };
    this.payouts.set(session.externalId, session);
    return session;
  }

  async getPayoutStatus(externalId: string): Promise<PayoutSession> {
    return this.payouts.get(externalId) ?? { externalId, status: "initiated" };
  }

  markExecuted(externalId: string) {
    const s = this.payouts.get(externalId);
    if (s) s.status = "executed";
  }
}
