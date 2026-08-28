import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatMoney, shortRef } from "../lib/format";
import { useDepositTransfer } from "../lib/useDepositTransfer";
import { Icon } from "../components/Icon";
import { PrimaryButton } from "../components/PrimaryButton";
import { DepositCardActionBar } from "../components/DepositCardActionBar";
import { SurfaceCard } from "../components/SurfaceCard";

export function WalletDepositStatusPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { transfer, error, done, expired, awaiting } = useDepositTransfer(id, "wallet");

  const title = done ? t("depositComplete") : expired ? t("depositExpired") : t("depositAwaiting");
  const hint = done
    ? t("depositCompleteHint")
    : expired
      ? t("depositExpiredHint")
      : awaiting
        ? t("depositReviewHint")
        : t("depositAwaitingHint");
  const icon = done ? "check_circle" : expired ? "timer_off" : "hourglass_top";

  return (
    <div className="max-w-xl mx-auto px-container-margin py-lg flex flex-col gap-lg min-h-[calc(100dvh-3.5rem)] pb-lg">
      <SurfaceCard className="text-center">
        {awaiting && (
          <p className="font-label-md text-label-md text-on-surface-variant m-0 px-md pt-md">
            {t("depositReviewTitle")}
          </p>
        )}
        <div className="p-md space-y-sm">
          <div
            className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center ${
              done
                ? "bg-secondary-container text-on-secondary-container"
                : expired
                  ? "bg-error-container text-on-error-container"
                  : "bg-surface-container text-primary"
            }`}
          >
            <Icon name={icon} filled={done || expired} />
          </div>
          <h2 className="font-display-md-mobile text-display-md-mobile text-primary m-0">{title}</h2>
          <p className="font-body-md text-body-md text-on-surface-variant m-0">{hint}</p>
          {transfer && (
            <>
              <p className="font-numeric-xl text-numeric-xl text-primary m-0">
                {formatMoney(transfer.usdAmountCents, "USD", i18n.language)}
              </p>
              <p className="font-label-md text-label-md text-outline m-0">
                {t("refLabel")}: {shortRef(transfer.id)}
                {transfer.sourceCurrency ? ` · ${transfer.sourceCurrency}` : ""}
                {transfer.paymentMode ? ` · ${transfer.paymentMode}` : ""}
              </p>
            </>
          )}
        </div>
      </SurfaceCard>

      {error && <p className="text-error font-body-md text-body-md">{error}</p>}

      <div className="mt-auto space-y-sm">
        {awaiting && transfer?.depositPayUrl && (
          <DepositCardActionBar
            continueLabel={t("continueToPayment")}
            cancelLabel={t("cancelDeposit")}
            onContinue={() => navigate(`/deposit/${id}/pay`)}
            onCancel={() => navigate("/")}
          />
        )}
        {expired && (
          <PrimaryButton onClick={() => navigate("/deposit")}>
            <Icon name="add" />
            {t("startNewDeposit")}
          </PrimaryButton>
        )}
        {!awaiting && (
          <PrimaryButton variant="surface" onClick={() => navigate("/")}>
            <Icon name="account_balance_wallet" />
            {t("backToWallet")}
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}
