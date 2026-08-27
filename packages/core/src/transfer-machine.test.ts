import { describe, expect, it } from "vitest";
import {
  canTransition,
  deriveTransferState,
  inferTransferKind,
  isActiveTransferPhase,
  stepLabels,
  transitionTransfer,
  walletDepositInvoiceTitle,
} from "../src/transfer-machine.js";

describe("transfer-machine", () => {
  it("allows valid transitions", () => {
    expect(canTransition("quote_issued", "depositing")).toBe(true);
    expect(canTransition("deposited", "withdraw_initiated")).toBe(false);
    expect(canTransition("not_a_phase" as never, "depositing")).toBe(false);
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

  it("allows wallet deposit depositing to completed", () => {
    expect(canTransition("depositing", "completed")).toBe(true);
    expect(transitionTransfer("depositing", "completed")).toBe("completed");
    expect(canTransition("deposited", "completed")).toBe(true);
  });

  it("marks active transfer phases", () => {
    expect(isActiveTransferPhase("depositing")).toBe(true);
    expect(isActiveTransferPhase("need_attention")).toBe(true);
    expect(isActiveTransferPhase("completed")).toBe(false);
    expect(isActiveTransferPhase("quote_issued")).toBe(false);
  });

  it("infers kind and invoice title", () => {
    expect(inferTransferKind("wallet")).toBe("wallet_deposit");
    expect(inferTransferKind("wallet-withdraw")).toBe("wallet_withdraw");
    expect(inferTransferKind("abc")).toBe("remittance");
    expect(inferTransferKind(null, "wallet_deposit")).toBe("wallet_deposit");
    expect(inferTransferKind("wallet", "remittance")).toBe("remittance");
    expect(inferTransferKind("x", "wallet_withdraw")).toBe("wallet_withdraw");
    expect(walletDepositInvoiceTitle("en")).toMatch(/Deposit USD/);
    expect(walletDepositInvoiceTitle("fa")).toBe("واریز دلار به کیف پول");
    expect(walletDepositInvoiceTitle("ar")).toBe("إيداع دولار في المحفظة");
    expect(walletDepositInvoiceTitle()).toMatch(/Deposit USD/);
  });
});
