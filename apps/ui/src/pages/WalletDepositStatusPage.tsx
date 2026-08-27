import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { translateApiError } from "../lib/api-error";
import { formatMoney, shortRef } from "../lib/format";
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
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function tick() {
      if (cancelled || !id) return;
      try {
        const data = await api<{ transfer: DepositTransfer }>(`/api/deposits/${id}`);
        if (cancelled) return;
        setTransfer(data.transfer);
        setError("");
        const terminal =
          data.transfer.phase === "completed" ||
          data.transfer.phase === "deposited" ||
          data.transfer.phase === "quote_expired";
        if (terminal && timer) {
          clearInterval(timer);
          timer = undefined;
        }
      } catch (e) {
        if (!cancelled) setError(translateApiError(e, t));
      }
    }

    void tick();
    timer = setInterval(() => void tick(), 2500);
    const onFocus = () => void tick();
    const onVis = () => {
      if (document.visibilityState === "visible") void tick();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [id, t]);

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

  async function checkNow() {
    setChecking(true);
    try {
      await refresh();
    } finally {
      setChecking(false);
    }
  }

  const done = transfer?.phase === "completed" || transfer?.phase === "deposited";
  const expired = transfer?.phase === "quote_expired";
  const awaiting = !done && !expired;
  const payUrl = transfer?.depositPayUrl;

  const title = done ? t("depositComplete") : expired ? t("depositExpired") : t("depositAwaiting");
  const hint = done
    ? t("depositCompleteHint")
    : expired
      ? t("depositExpiredHint")
      : t("depositAwaitingHint");
  const icon = done ? "check_circle" : expired ? "timer_off" : "hourglass_top";

  return (
    <div className="max-w-xl mx-auto px-container-margin py-lg flex flex-col gap-lg min-h-[calc(100dvh-3.5rem)] pb-28">
      <SurfaceCard className="p-md text-center space-y-sm">
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
      </SurfaceCard>

      {payUrl && awaiting && (
        <section className="flex flex-col gap-sm">
          <TcPayEmbed payUrl={payUrl} />
          <PrimaryButton variant="surface" onClick={() => void checkNow()} disabled={checking}>
            <Icon name="refresh" />
            {checking ? t("checkingStatus") : t("checkPaymentStatus")}
          </PrimaryButton>
        </section>
      )}

      {error && <p className="text-error font-body-md text-body-md">{error}</p>}

      <div className="mt-auto space-y-sm">
        {expired && (
          <PrimaryButton onClick={() => navigate("/deposit")}>
            <Icon name="add" />
            {t("startNewDeposit")}
          </PrimaryButton>
        )}
        <PrimaryButton variant="surface" onClick={() => navigate("/")}>
          <Icon name="account_balance_wallet" />
          {t("backToWallet")}
        </PrimaryButton>
      </div>
    </div>
  );
}
