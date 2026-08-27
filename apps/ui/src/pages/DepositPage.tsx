import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { useApiErrorHandler } from "../lib/use-api-error";
import { formatMoney, humanizeId, shortRef } from "../lib/format";
import { useTransferWizard } from "../lib/transfer-wizard";
import { Icon } from "../components/Icon";
import { PrimaryButton } from "../components/PrimaryButton";
import { Stepper } from "../components/Stepper";
import { SurfaceCard } from "../components/SurfaceCard";
import { TcPayEmbed } from "../components/TcPayEmbed";

const SETTLED_PHASES = new Set([
  "deposited",
  "recipient_set",
  "withdraw_initiated",
  "need_attention",
  "withdraw_executed",
]);

export function DepositPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const handleApiError = useApiErrorHandler();
  const { draft, setDraft } = useTransferWizard();
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [fakeRamps, setFakeRamps] = useState(false);
  const [statusHint, setStatusHint] = useState("");
  const [pullY, setPullY] = useState(0);
  const startedRef = useRef(false);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    void api<{ fakeRamps?: boolean }>("/api/health")
      .then((h) => setFakeRamps(!!h.fakeRamps))
      .catch(() => setFakeRamps(false));
  }, []);

  useEffect(() => {
    if (!draft.quoteId) {
      navigate("/transfer");
      return;
    }
    if (!draft.recipientName || !draft.recipientSheba) {
      navigate("/transfer/recipient");
      return;
    }
    if (draft.transferId || startedRef.current) return;
    startedRef.current = true;
    void startTransfer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!draft.transferId) return;
    const timer = setInterval(() => void pollAndAdvance(true), 4000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.transferId]);

  async function startTransfer() {
    if (!draft.quoteId || starting) return;
    setStarting(true);
    setError("");
    try {
      const result = await api<{ transferId: string; deposit: { payUrl: string } }>("/api/transfers", {
        method: "POST",
        body: JSON.stringify({
          quoteId: draft.quoteId,
          language: i18n.language,
          recipient: { name: draft.recipientName, sheba: draft.recipientSheba },
        }),
      });
      setDraft({
        transferId: result.transferId,
        depositPayUrl: result.deposit.payUrl,
      });
    } catch (e) {
      handleApiError(e, setError);
      startedRef.current = false;
    } finally {
      setStarting(false);
    }
  }

  async function pollAndAdvance(silent = false): Promise<boolean> {
    if (!draft.transferId) return false;
    if (!silent) {
      setChecking(true);
      setError("");
      setStatusHint("");
    }
    try {
      const row = await api<{ transfer: { id: string; phase: string } }>(
        `/api/transfers/${draft.transferId}`,
      );
      if (SETTLED_PHASES.has(row.transfer.phase)) {
        navigate("/transfer/status");
        return true;
      }
      if (!silent) setStatusHint(t("waitingForPayment"));
      return false;
    } catch (e) {
      if (!silent) handleApiError(e, setError);
      return false;
    } finally {
      if (!silent) setChecking(false);
    }
  }

  async function refreshStatus() {
    const done = await pollAndAdvance(false);
    if (done || !fakeRamps || !draft.transferId) return;
    try {
      await api(`/api/dev/simulate-deposit/${draft.transferId}`, { method: "POST" });
      await pollAndAdvance(true);
      navigate("/transfer/status");
    } catch (e) {
      handleApiError(e, setError);
    }
  }

  function onTouchStart(e: React.TouchEvent) {
    if (window.scrollY <= 0) touchStartY.current = e.touches[0]?.clientY ?? null;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (touchStartY.current == null) return;
    const dy = (e.touches[0]?.clientY ?? 0) - touchStartY.current;
    if (dy > 0) setPullY(Math.min(dy, 96));
  }

  function onTouchEnd() {
    if (pullY > 64) void pollAndAdvance(false);
    touchStartY.current = null;
    setPullY(0);
  }

  const payMinor =
    draft.sourceAmountMinor || Math.round(Number(draft.amount || 0) * 100);
  const rows = [
    {
      label: t("recipientReceives"),
      value: formatMoney(draft.destOutMinor, draft.destCurrency, i18n.language),
      copy: false,
    },
    {
      label: t("settlesAsUsd"),
      value: formatMoney(draft.usdcOutMinor, "USD", i18n.language),
      copy: false,
    },
    {
      label: t("paymentMethod"),
      value: humanizeId(draft.paymentMethod),
      copy: false,
    },
    {
      label: t("provider"),
      value: humanizeId(draft.provider),
      copy: false,
    },
    {
      label: t("recipientName"),
      value: draft.recipientName || "—",
      copy: true,
    },
  ];

  return (
    <div
      className="px-container-margin py-lg flex flex-col gap-lg min-h-[calc(100dvh-3.5rem)] w-full pb-4"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {pullY > 8 && (
        <p className="font-label-md text-label-md text-outline text-center m-0">
          {pullY > 64 ? t("releaseToRefresh") : t("pullToRefresh")}
        </p>
      )}

      <Stepper steps={[t("recipient"), t("stepDeposit"), t("status")]} activeIndex={1} />

      <section className="bg-primary rounded-xl p-md shadow-lg flex flex-col items-center justify-center gap-xs relative overflow-hidden text-center">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -me-16 -mt-16 pointer-events-none" />
        <p className="font-body-md text-body-md text-on-primary/80 m-0">{t("totalToPay")}</p>
        <h2 className="font-numeric-xl text-numeric-xl text-on-primary m-0">
          {formatMoney(payMinor, draft.sourceCurrency, i18n.language)}
        </h2>
        {draft.transferId && (
          <div className="bg-white/10 rounded-full px-sm py-xs mt-sm flex items-center gap-xs">
            <Icon name="receipt_long" className="text-[14px]! text-secondary-fixed" />
            <p className="font-label-md text-label-md text-on-primary m-0">
              {t("refLabel")}: {shortRef(draft.transferId)}
            </p>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-sm">
        <h2 className="font-display-md-mobile text-display-md-mobile font-bold text-on-background m-0">
          {t("depositFunds")}
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant m-0">{t("depositHint")}</p>
        {starting && (
          <p className="font-body-md text-body-md text-on-surface-variant">{t("startingTransfer")}</p>
        )}
        <SurfaceCard>
          {rows.map((row, i) => (
            <div
              key={row.label}
              className={`flex items-center justify-between p-md ${
                i < rows.length - 1 ? "border-b border-surface-container" : ""
              } ${row.copy ? "cursor-pointer hover:bg-surface-container-low" : ""}`}
              onClick={() => {
                if (row.copy) void navigator.clipboard?.writeText(row.value);
              }}
            >
              <div>
                <p className="font-label-md text-label-md text-outline m-0">{row.label}</p>
                <p className="font-body-lg text-body-lg text-on-background break-all m-0">{row.value}</p>
              </div>
              {row.copy ? (
                <Icon name="content_copy" className="text-primary opacity-60" />
              ) : null}
            </div>
          ))}
        </SurfaceCard>
      </section>

      {draft.depositPayUrl && (
        <section className="flex flex-col gap-sm">
          <TcPayEmbed payUrl={draft.depositPayUrl} />
        </section>
      )}

      {error && <p className="text-error font-body-md text-body-md">{error}</p>}
      {statusHint && !error && (
        <p className="font-body-md text-body-md text-on-surface-variant text-center">{statusHint}</p>
      )}

      <div className="app-dock">
        <PrimaryButton
          variant="surface"
          onClick={() => void refreshStatus()}
          disabled={starting || checking || !draft.transferId}
        >
          {checking ? t("checkingStatus") : t("refreshStatus")}
          <Icon name="refresh" />
        </PrimaryButton>
      </div>
    </div>
  );
}
