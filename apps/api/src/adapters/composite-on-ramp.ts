import type { OnRampPort } from "@mega-wallet/core";
import type { OnramperAdapter } from "./onramper/index.js";
import type { TrustlessCommerceAdapter } from "./trustless-commerce/index.js";

/** Onramper for quotes/methods; Trustless Commerce for invoice deposits. */
export class CompositeOnRampAdapter implements OnRampPort {
  constructor(
    private readonly quotes: OnramperAdapter | OnRampPort,
    private readonly deposits: TrustlessCommerceAdapter | OnRampPort,
  ) {}

  listPaymentMethods = (...args: Parameters<OnRampPort["listPaymentMethods"]>) =>
    this.quotes.listPaymentMethods(...args);

  quote = (...args: Parameters<OnRampPort["quote"]>) => this.quotes.quote(...args);

  startDeposit = (...args: Parameters<OnRampPort["startDeposit"]>) =>
    this.deposits.startDeposit(...args);

  getDepositStatus = (...args: Parameters<OnRampPort["getDepositStatus"]>) =>
    this.deposits.getDepositStatus(...args);
}
