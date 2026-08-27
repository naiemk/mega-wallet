import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { translateApiError } from "../lib/api-error";
import { formatMoney, shortRef } from "../lib/format";
import { withTcCheckoutParams } from "../lib/tc-pay-url";
import { Icon } from "../components/Icon";
import { PrimaryButton } from "../components/PrimaryButton";
import { SurfaceCard } from "../components/SurfaceCard";
import { TcPayEmbed } from "../components/TcPayEmbed";

interface DepositTransfer {
  id: string;
  phase: string;
  usdAmountCents: number;
  depositPayUrl?: string | null;
  sourceCurrency?: string | null;
  paymentMode?: string | null;
  updatedAt?: string;
}

export function WalletDepositStatusPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [transfer, setTransfer] = useState<DepositTransfer | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    void refresh();
    const timer = setInterval(() => void refresh(), 4000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function refresh() {
    if (!id) return;
    try {
      const data = await api<{ transfer: DepositTransfer }>(`/api/deposits/${id}`);
      setTransfer(data.transfer);
      setError("");
    } catch (e) {
      setError(translateApiError(e, t));
    }
  }

  const done = transfer?.phase === "completed" || transfer?.phase === "deposited";
  const payUrl = transfer?.depositPayUrl;

  function openStandalone() {
    if (!payUrl) return;
    window.open(
      withTcCheckoutParams(payUrl, { language: i18n.language, mode: "standalone" }),
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <div className="max-w-xl mx-auto px-container-margin py-lg flex flex-col gap-lg min-h-[calc(100dvh-3.5rem)] pb-28">
      <SurfaceCard className="p-md text-center space-y-sm">
        <div
          className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center ${
            done ? "bg-secondary-container text-on-secondary-container" : "bg-surface-container text-primary"
          }`}
        >
          <Icon name={done ? "check_circle" : "hourglass_top"} filled={done} />
        </div>
        <h2 className="font-display-md-mobile text-display-md-mobile text-primary m-0">
          {done ? t("depositComplete") : t("depositAwaiting")}
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant m-0">
          {done ? t("depositCompleteHint") : t("depositAwaitingHint")}
        </p>
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
      </SurfaceCard>

      {payUrl && !done && (
        <section className="flex flex-col gap-sm">
          <TcPayEmbed payUrl={payUrl} minHeight={680} />
          <PrimaryButton onClick={openStandalone}>{t("openPayment")}</PrimaryButton>
          <button
            type="button"
            onClick={openStandalone}
            className="font-label-md text-label-md text-primary underline self-center bg-transparent border-0 cursor-pointer p-0"
          >
            {t("openPaymentNewTab")}
          </button>
        </section>
      )}

      {error && <p className="text-error font-body-md text-body-md">{error}</p>}

      <div className="mt-auto space-y-sm">
        <PrimaryButton variant="surface" onClick={() => navigate("/")}>
          <Icon name="account_balance_wallet" />
          {t("backToWallet")}
        </PrimaryButton>
      </div>
    </div>
  );
}
