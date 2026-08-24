import type { OffRampPort } from "@mega-wallet/core";
import { FakeOffRampAdapter } from "../fake/off-ramp.js";
import { ShebaOffRampAdapter } from "./sheba.js";
import { OnramperSellOffRampAdapter } from "./onramper-sell.js";

export type OffRampMethodId = "sheba-irr" | "onramper-sell";

export class OffRampRegistry {
  private readonly adapters: Record<OffRampMethodId, OffRampPort>;

  constructor(
    sheba: ShebaOffRampAdapter,
    onramperSell: OnramperSellOffRampAdapter,
    fake?: FakeOffRampAdapter,
  ) {
    this.adapters = {
      "sheba-irr": fake ?? sheba,
      "onramper-sell": fake ?? onramperSell,
    };
  }

  get(method: OffRampMethodId): OffRampPort {
    return this.adapters[method];
  }

  resolve(destCurrency: string): OffRampPort {
    return destCurrency === "IRR" ? this.adapters["sheba-irr"] : this.adapters["onramper-sell"];
  }
}
