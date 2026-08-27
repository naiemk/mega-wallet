import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { translateApiError } from "../lib/api-error";
import { humanPhase } from "../lib/phase";
import { Icon } from "../components/Icon";
import { PrimaryButton } from "../components/PrimaryButton";
import { SurfaceCard } from "../components/SurfaceCard";
import { TcPayEmbed } from "../components/TcPayEmbed";

interface TransferDetail {
  id: string;
  kind?: string;
  quoteId: string;
  phase: string;
  usdAmountCents: number;
  destAmountMinor: number;
  depositPayUrl?: string | null;
  recipientName?: string | null;
  recipientSheba?: string | null;
  recipientCard?: string | null;
  sourceCurrency?: string | null;
  paymentMode?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

function kindOf(tx: TransferDetail) {
  if (tx.kind) return tx.kind;
  if (tx.quoteId === "wallet") return "wallet_deposit";
  if (tx.quoteId === "wallet-withdraw") return "wallet_withdraw";
  return "remittance";
}

export function HistoryDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [transfer, setTransfer] = useState<TransferDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function load() {
      if (cancelled || !id) return;
      try {
        const d = await api<{ transfer: TransferDetail }>(`/api/transfers/${id}`);
        if (cancelled) return;
        setTransfer(d.transfer);
        setError("");
        if (d.transfer.phase !== "depositing" && timer) {
          clearInterval(timer);
          timer = undefined;
        }
      } catch (e) {
        if (!cancelled) setError(translateApiError(e, t));
      }
    }

    void load();
    timer = setInterval(() => void load(), 2500);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [id, t]);

  if (error) {
    return (
      <div className="px-container-margin py-lg">
        <p className="text-error">{error}</p>
        <PrimaryButton variant="surface" className="mt-md" onClick={() => navigate("/history")}>
          {t("history")}
        </PrimaryButton>
      </div>
    );
  }

  if (!transfer) {
    return <p className="px-container-margin py-lg text-on-surface-variant">{t("loading")}</p>;
  }

  const kind = kindOf(transfer);
  const kindLabel =
    kind === "wallet_deposit"
      ? t("kindDeposit")
      : kind === "wallet_withdraw"
        ? t("kindWithdraw")
        : t("kindTransfer");

  return (
    <div className="max-w-xl mx-auto px-container-margin py-lg flex flex-col gap-lg">
      <SurfaceCard className="p-md space-y-md">
        <div className="flex items-center gap-md">
          <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-primary">
            <Icon
              name={
                kind === "wallet_deposit"
                  ? "south_west"
                  : kind === "wallet_withdraw"
                    ? "north_east"
                    : "swap_horiz"
              }
              filled
            />
          </div>
          <div>
            <p className="font-label-md text-label-md text-outline uppercase">{kindLabel}</p>
            <p className="font-display-md text-display-md text-primary m-0">
              ${(transfer.usdAmountCents / 100).toFixed(2)}
            </p>
          </div>
        </div>

        <div className="border-t border-surface-container pt-md space-y-sm">
          <Row label={t("status")} value={humanPhase(transfer.phase, t)} />
          {transfer.sourceCurrency && <Row label={t("currency")} value={transfer.sourceCurrency} />}
          {transfer.paymentMode && (
            <Row
              label={t("depositType")}
              value={
                transfer.paymentMode === "fiat"
                  ? t("depositTypeFiat")
                  : transfer.paymentMode === "crypto"
                    ? t("depositTypeCrypto")
                    : t("depositTypeAny")
              }
            />
          )}
          {transfer.recipientName && <Row label={t("recipientName")} value={transfer.recipientName} />}
          {transfer.recipientSheba && (
            <Row label={t("shebaIban")} value={transfer.recipientSheba} mono />
          )}
          {transfer.recipientCard && (
            <Row label={t("cardNumber")} value={transfer.recipientCard} mono />
          )}
          {transfer.createdAt && (
            <Row label={t("created")} value={new Date(transfer.createdAt).toLocaleString()} />
          )}
          {transfer.updatedAt && (
            <Row label={t("updated")} value={new Date(transfer.updatedAt).toLocaleString()} />
          )}
        </div>
      </SurfaceCard>

      {transfer.depositPayUrl && transfer.phase === "depositing" && (
        <section className="flex flex-col gap-sm">
          <TcPayEmbed payUrl={transfer.depositPayUrl} />
        </section>
      )}

      <div className="flex flex-col gap-sm">
        {kind === "wallet_deposit" && (
          <Link to={`/deposit/${transfer.id}`} className="font-body-md text-body-md text-primary underline">
            {t("reopenDepositLink")}
          </Link>
        )}
        {kind === "wallet_withdraw" && (
          <Link to={`/withdraw/${transfer.id}`} className="font-body-md text-body-md text-primary underline">
            {t("viewWithdraw")}
          </Link>
        )}
        {kind === "remittance" && (
          <Link to="/transfer/status" className="font-body-md text-body-md text-primary underline">
            {t("viewActiveTransfer")}
          </Link>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-md">
      <span className="font-label-md text-label-md text-outline shrink-0">{label}</span>
      <span className={`font-body-md text-body-md text-end break-all ${mono ? "font-mono text-sm" : ""}`}>
        {value}
      </span>
    </div>
  );
}
