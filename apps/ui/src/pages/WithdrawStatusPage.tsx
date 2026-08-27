import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { translateApiError } from "../lib/api-error";
import { Icon } from "../components/Icon";
import { PrimaryButton } from "../components/PrimaryButton";
import { SurfaceCard } from "../components/SurfaceCard";

interface WithdrawTransfer {
  id: string;
  phase: string;
  usdAmountCents: number;
  recipientName?: string | null;
  recipientSheba?: string | null;
  withdrawStatus?: string | null;
}

export function WithdrawStatusPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [transfer, setTransfer] = useState<WithdrawTransfer | null>(null);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!id) return;
    void refresh();
    const timer = setInterval(() => void refresh(), 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function refresh() {
    if (!id) return;
    try {
      const data = await api<{ transfer: WithdrawTransfer }>(`/api/withdrawals/${id}`);
      setTransfer(data.transfer);
    } catch (e) {
      setError(translateApiError(e, t));
    }
  }

  async function cancel() {
    if (!id) return;
    setCancelling(true);
    setError("");
    try {
      await api(`/api/withdrawals/${id}/cancel`, { method: "POST" });
      await refresh();
    } catch (e) {
      setError(translateApiError(e, t));
    } finally {
      setCancelling(false);
    }
  }

  const phase = transfer?.phase ?? "withdraw_initiated";
  const pending = phase === "withdraw_initiated" || phase === "need_attention";
  const done = phase === "withdraw_executed";
  const cancelled = phase === "withdraw_cancelled";

  return (
    <div className="max-w-xl mx-auto px-container-margin py-lg flex flex-col gap-lg min-h-[calc(100dvh-3.5rem)]">
      <SurfaceCard className="p-md space-y-md">
        <div className="flex items-center gap-md">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              done
                ? "bg-secondary-container text-on-secondary-container"
                : cancelled
                  ? "bg-error-container text-on-error-container"
                  : "bg-surface-container text-primary"
            }`}
          >
            <Icon name={done ? "check_circle" : cancelled ? "cancel" : "pending"} filled />
          </div>
          <div>
            <h2 className="font-display-md-mobile text-display-md-mobile text-primary m-0">
              {done ? t("withdrawComplete") : cancelled ? t("withdrawCancelled") : t("withdrawPending")}
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {done ? t("withdrawCompleteHint") : cancelled ? t("withdrawCancelledHint") : t("withdrawPendingHint")}
            </p>
          </div>
        </div>

        {transfer && (
          <div className="border-t border-surface-container pt-md space-y-sm">
            <Row label={t("amount")} value={`$${(transfer.usdAmountCents / 100).toFixed(2)}`} />
            <Row label={t("recipientName")} value={transfer.recipientName ?? "—"} />
            <Row label={t("shebaIban")} value={transfer.recipientSheba ?? "—"} mono />
            <Row label={t("status")} value={phase} />
          </div>
        )}
      </SurfaceCard>

      {error && <p className="text-error font-body-md text-body-md">{error}</p>}

      <div className="mt-auto space-y-sm">
        {pending && (
          <PrimaryButton variant="danger" onClick={cancel} disabled={cancelling}>
            {cancelling ? "…" : t("cancelWithdraw")}
          </PrimaryButton>
        )}
        <PrimaryButton variant="surface" onClick={() => navigate("/")}>
          {t("backToWallet")}
        </PrimaryButton>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-md">
      <span className="font-label-md text-label-md text-outline shrink-0">{label}</span>
      <span
        className={`font-body-md text-body-md text-on-background text-end break-all ${
          mono ? "font-mono text-sm" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
