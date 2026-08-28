import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { DepositCheckoutShell } from "../components/DepositCheckoutShell";
import { isDepositTerminal, useDepositTransfer } from "../lib/useDepositTransfer";

export function WalletDepositPayPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { transfer, error, checking, checkNow } = useDepositTransfer(id, "wallet");

  useEffect(() => {
    if (!id || !transfer) return;
    if (isDepositTerminal(transfer.phase, "wallet")) {
      navigate(`/deposit/${id}`, { replace: true });
    }
  }, [id, transfer, navigate]);

  if (!transfer?.depositPayUrl) {
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
      <DepositCheckoutShell
        payUrl={transfer.depositPayUrl}
        onCheckStatus={() => void checkNow()}
        checking={checking}
      />
    </>
  );
}
