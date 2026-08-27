import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiOptional } from "../lib/api";
import { formatMoney } from "../lib/format";
import { humanPhase } from "../lib/phase";
import { useTransferWizard } from "../lib/transfer-wizard";
import { Icon } from "../components/Icon";
import { IconCircle } from "../components/IconCircle";
import { PrimaryButton } from "../components/PrimaryButton";
import { Stepper } from "../components/Stepper";
import { SurfaceCard } from "../components/SurfaceCard";

interface Transfer {
  id: string;
  phase: string;
  usdAmountCents: number;
  destAmountMinor: number;
  recipientName?: string | null;
  withdrawStatus?: string | null;
  updatedAt?: string;
}

function timelineIndex(phase: string): number {
  if (phase === "withdraw_executed") return 3;
  if (["withdraw_initiated", "need_attention", "recipient_set"].includes(phase)) return 2;
  if (phase === "deposited") return 1;
  return 0;
}

export function StatusPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { draft, reset } = useTransferWizard();
  const [transfer, setTransfer] = useState<Transfer | null>(null);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 5000);
    return () => clearInterval(timer);
  }, []);

  async function refresh() {
    const a = await apiOptional<{ transfer: Transfer | null }>("/api/transfers/active");
    if (a?.transfer) {
      setTransfer(a.transfer);
      return;
    }
    const h = await apiOptional<{ transfers: Transfer[] }>("/api/history");
    const found =
      h?.transfers?.find((x) => x.id === draft.transferId) ?? h?.transfers?.[0] ?? null;
    setTransfer(found);
  }

  const phase = transfer?.phase ?? "depositing";
  const idx = timelineIndex(phase);
  const items = [
    { title: t("statusCreated"), done: idx >= 0 },
    { title: t("statusDeposited"), done: idx >= 1 },
    { title: t("statusSending"), done: idx >= 2, active: idx === 2 },
    { title: t("statusArrival"), done: idx >= 3 },
  ];

  return (
    <div className="px-container-margin py-lg flex flex-col gap-lg pb-28">
      <Stepper steps={[t("recipient"), t("stepDeposit"), t("status")]} activeIndex={2} />

      <SurfaceCard className="p-md">
        <div className="relative ms-6 border-s-2 border-surface-variant ps-md space-y-lg py-sm">
          {items.map((item) => (
            <div
              key={item.title}
              className={`relative flex flex-col gap-xs ${item.done || item.active ? "" : "opacity-50"}`}
            >
              <div
                className={`absolute -start-6 top-1 w-3 h-3 rounded-full shadow-[0_0_0_4px_#f8f9ff] ${
                  item.done ? "bg-secondary" : item.active ? "bg-primary" : "bg-outline-variant"
                }`}
              />
              <span
                className={`font-body-md text-body-md font-semibold ${
                  item.done || item.active ? "text-primary" : "text-on-surface-variant"
                }`}
              >
                {item.title}
              </span>
              {item.active && (
                <span className="font-label-md text-label-md text-outline">{t("statusSendingHint")}</span>
              )}
            </div>
          ))}
        </div>
      </SurfaceCard>

      <div className="bg-surface-container-low rounded-lg p-md flex items-center justify-between border border-surface-variant">
        <div className="flex items-center gap-sm">
          <IconCircle>
            <Icon name="person" />
          </IconCircle>
          <div className="flex flex-col">
            <span className="font-body-md text-body-md font-semibold text-primary">
              {transfer?.recipientName || draft.recipientName || "—"}
            </span>
            <span className="font-label-md text-label-md text-on-surface-variant">
              {draft.destCurrency} · {humanPhase(phase, t)}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-body-md text-body-md font-bold text-primary">
            {formatMoney(transfer?.destAmountMinor ?? draft.destOutMinor, draft.destCurrency, i18n.language)}
          </span>
          <span className="font-label-md text-label-md text-outline">
            -${((transfer?.usdAmountCents ?? draft.usdcOutMinor) / 100).toFixed(2)}
          </span>
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-surface-container-lowest p-container-margin shadow-[0_-4px_12px_rgba(11,28,48,0.05)] z-20 max-w-xl mx-auto">
        <PrimaryButton
          onClick={() => {
            reset();
            navigate("/");
          }}
        >
          <Icon name="account_balance_wallet" className="text-sm!" />
          {t("backToWallet")}
        </PrimaryButton>
      </div>
    </div>
  );
}
