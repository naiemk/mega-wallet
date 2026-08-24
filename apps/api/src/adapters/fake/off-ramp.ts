import type { OffRampPort, OffRampQuote, PayoutSession } from "@mega-wallet/core";

export class FakeOffRampAdapter implements OffRampPort {
  private payouts = new Map<string, PayoutSession>();

  async quote(input: {
    destCurrency: string;
    usdcInMinor: number;
    country: string;
    paymentMethod?: string;
  }): Promise<OffRampQuote[]> {
    const rate = input.destCurrency === "IRR" ? 50000 : 1;
    return [
      {
        provider: input.destCurrency === "IRR" ? "sheba-irr" : "onramper-sell",
        destCurrency: input.destCurrency,
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
      externalId: `payout-${input.transferId}`,
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
