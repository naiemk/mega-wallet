/** Map transfer machine / withdraw statuses to short human labels. */
export function humanPhase(phase: string, t: (key: string) => string): string {
  const map: Record<string, string> = {
    depositing: t("phaseDepositing"),
    deposited: t("phaseDeposited"),
    completed: t("phaseCompleted"),
    recipient_set: t("phaseRecipientSet"),
    withdraw_initiated: t("phaseWithdrawInitiated"),
    withdraw_executed: t("phaseWithdrawExecuted"),
    withdraw_cancelled: t("phaseWithdrawCancelled"),
    need_attention: t("phaseNeedAttention"),
  };
  return map[phase] ?? phase.replace(/_/g, " ");
}
