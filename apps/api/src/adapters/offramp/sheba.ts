import type { OffRampPort, OffRampQuote, PayoutSession } from "@mega-wallet/core";

/** Operator-manual Sheba payout — status updated by operator dashboard. */
export class ShebaOffRampAdapter implements OffRampPort {
  private payouts = new Map<string, PayoutSession>();

  async quote(input: {
    destCurrency: string;
    usdcInMinor: number;
    country: string;
    paymentMethod?: string;
  }): Promise<OffRampQuote[]> {
    if (input.destCurrency !== "IRR") return [];
    const rate = 50000;
    return [
      {
        provider: "sheba-irr",
        destCurrency: "IRR",
        usdcInMinor: input.usdcInMinor,
        destOutMinor: input.usdcInMinor * rate,
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
