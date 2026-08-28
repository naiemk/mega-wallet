import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { DepositCheckoutShell } from "../components/DepositCheckoutShell";
import { useTransferWizard } from "../lib/transfer-wizard";
import { isDepositTerminal, useDepositTransfer } from "../lib/useDepositTransfer";

export function TransferDepositPayPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { draft } = useTransferWizard();
  const { transfer, error, checking, checkNow } = useDepositTransfer(
    draft.transferId ?? undefined,
    "transfer",
  );

  useEffect(() => {
    if (!draft.transferId) {
      navigate("/transfer/deposit", { replace: true });
    }
  }, [draft.transferId, navigate]);

  useEffect(() => {
    if (!draft.transferId || !transfer) return;
    if (isDepositTerminal(transfer.phase, "transfer")) {
      navigate("/transfer/status", { replace: true });
    }
  }, [draft.transferId, transfer, navigate]);

  const payUrl = draft.depositPayUrl ?? transfer?.depositPayUrl;

  if (!payUrl) {
    return (
      <div className="px-container-margin py-lg">
        <p className="font-body-md text-body-md text-on-surface-variant m-0">{t("loading")}</p>
      </div>
    );
  }

  return (
    <>
      {error && (
        <p className="px-container-margin pt-md text-error font-body-md text-body-md m-0">{error}</p>
      )}
      <DepositCheckoutShell payUrl={payUrl} onCheckStatus={() => void checkNow()} checking={checking} />
    </>
  );
}
