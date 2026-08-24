export type TransferPhase =
  | "quote_issued"
  | "depositing"
  | "deposited"
  | "recipient_set"
  | "withdraw_initiated"
  | "withdraw_executed"
  | "withdraw_cancelled"
  | "need_attention"
  | "quote_expired";

export type WithdrawStatus =
  | "initiated"
  | "executed"
  | "cancelled"
  | "need_attention";

export interface TransferState {
  phase: TransferPhase;
  depositComplete: boolean;
  recipientSet: boolean;
  withdrawStatus: WithdrawStatus | null;
}

export const TRANSFER_TRANSITIONS: Record<
  TransferPhase,
  readonly TransferPhase[]
> = {
  quote_issued: ["depositing", "quote_expired"],
  depositing: ["deposited", "quote_expired", "withdraw_cancelled"],
  deposited: ["recipient_set"],
  recipient_set: ["withdraw_initiated"],
  withdraw_initiated: ["withdraw_executed", "withdraw_cancelled", "need_attention"],
  need_attention: ["withdraw_initiated", "withdraw_cancelled"],
  withdraw_executed: [],
  withdraw_cancelled: [],
  quote_expired: [],
};

export function canTransition(from: TransferPhase, to: TransferPhase): boolean {
  return TRANSFER_TRANSITIONS[from]?.includes(to) ?? false;
}

export function transitionTransfer(
  current: TransferPhase,
  next: TransferPhase,
): TransferPhase {
  if (!canTransition(current, next)) {
    throw new Error(`Invalid transition: ${current} -> ${next}`);
  }
  return next;
}

export function deriveTransferState(phase: TransferPhase): TransferState {
  const depositComplete = [
    "deposited",
    "recipient_set",
    "withdraw_initiated",
    "withdraw_executed",
    "need_attention",
  ].includes(phase);

  const recipientSet = [
    "recipient_set",
    "withdraw_initiated",
    "withdraw_executed",
    "need_attention",
  ].includes(phase);

  let withdrawStatus: WithdrawStatus | null = null;
  if (phase === "withdraw_initiated") withdrawStatus = "initiated";
  if (phase === "withdraw_executed") withdrawStatus = "executed";
  if (phase === "withdraw_cancelled") withdrawStatus = "cancelled";
  if (phase === "need_attention") withdrawStatus = "need_attention";

  return { phase, depositComplete, recipientSet, withdrawStatus };
}

export function stepLabels(phase: TransferPhase): {
  deposit: "pending" | "in_progress" | "complete";
  recipient: "pending" | "in_progress" | "complete";
  withdraw: "pending" | "in_progress" | "complete" | "cancelled" | "attention";
} {
  const s = deriveTransferState(phase);
  return {
    deposit: s.depositComplete
      ? "complete"
      : phase === "depositing"
        ? "in_progress"
        : "pending",
    recipient: s.recipientSet ? "complete" : s.depositComplete ? "in_progress" : "pending",
    withdraw:
      phase === "withdraw_executed"
        ? "complete"
        : phase === "withdraw_cancelled"
          ? "cancelled"
          : phase === "need_attention"
            ? "attention"
            : phase === "withdraw_initiated"
              ? "in_progress"
              : "pending",
  };
}
