import { describe, expect, it } from "vitest";
import {
  canTransition,
  deriveTransferState,
  stepLabels,
  transitionTransfer,
} from "../src/transfer-machine.js";

describe("transfer-machine", () => {
  it("allows valid transitions", () => {
    expect(canTransition("quote_issued", "depositing")).toBe(true);
    expect(canTransition("deposited", "withdraw_initiated")).toBe(false);
  });

  it("transitions", () => {
    expect(transitionTransfer("quote_issued", "depositing")).toBe("depositing");
    expect(() => transitionTransfer("quote_issued", "withdraw_executed")).toThrow();
  });

  it("derives state", () => {
    const s = deriveTransferState("withdraw_initiated");
    expect(s.depositComplete).toBe(true);
    expect(s.recipientSet).toBe(true);
    expect(s.withdrawStatus).toBe("initiated");
  });

  it("step labels", () => {
    expect(stepLabels("depositing").deposit).toBe("in_progress");
    expect(stepLabels("withdraw_executed").withdraw).toBe("complete");
    expect(stepLabels("need_attention").withdraw).toBe("attention");
    expect(stepLabels("withdraw_cancelled").withdraw).toBe("cancelled");
    expect(stepLabels("withdraw_initiated").withdraw).toBe("in_progress");
    expect(stepLabels("quote_issued").deposit).toBe("pending");
    expect(stepLabels("deposited").recipient).toBe("in_progress");
  });

  it("rejects unknown transition source", () => {
    expect(canTransition("withdraw_executed", "depositing")).toBe(false);
    expect(canTransition("invalid" as "quote_issued", "depositing")).toBe(false);
  });
});
