import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiOptional } from "../lib/api";
import { humanPhase } from "../lib/phase";
import { CurrencyPill } from "../components/CurrencyPill";
import { SurfaceCard } from "../components/SurfaceCard";
import { TransactionRow } from "../components/TransactionRow";

interface HistoryItem {
  id: string;
  kind?: string;
  quoteId?: string;
  phase: string;
  usdAmountCents: number;
  updatedAt: string;
  recipientName?: string | null;
}

function kindOf(tx: HistoryItem) {
  if (tx.kind) return tx.kind;
  if (tx.quoteId === "wallet") return "wallet_deposit";
  if (tx.quoteId === "wallet-withdraw") return "wallet_withdraw";
  return "remittance";
}

function isInbound(tx: HistoryItem) {
  const kind = kindOf(tx);
  if (kind === "wallet_deposit") return true;
  return false;
}

export function HistoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [transfers, setTransfers] = useState<HistoryItem[]>([]);
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");

  useEffect(() => {
    void apiOptional<{ transfers: HistoryItem[] }>("/api/history").then((d) =>
      setTransfers(d?.transfers ?? []),
    );
  }, []);

  const filtered = transfers.filter((tx) => {
    if (filter === "all") return true;
    return filter === "in" ? isInbound(tx) : !isInbound(tx);
  });

  const trulyEmpty = transfers.length === 0;

  return (
    <div className="px-container-margin py-lg flex flex-col gap-lg max-w-xl mx-auto w-full">
      <div className="flex gap-sm overflow-x-auto hide-scrollbar">
        <CurrencyPill code="ALL" label={t("all")} active={filter === "all"} onClick={() => setFilter("all")} />
        <CurrencyPill
          code="IN"
          label={t("incoming")}
          active={filter === "in"}
          onClick={() => setFilter("in")}
        />
        <CurrencyPill
          code="OUT"
          label={t("outgoing")}
          active={filter === "out"}
          onClick={() => setFilter("out")}
        />
      </div>

      <SurfaceCard>
        {filtered.length === 0 ? (
          trulyEmpty && filter === "all" ? (
            <div className="p-md flex flex-col gap-sm">
              <p className="font-body-md text-body-md text-on-surface-variant m-0">{t("noTransfers")}</p>
              <p className="font-label-md text-label-md text-outline m-0">{t("emptyHistoryHint")}</p>
              <div className="flex flex-wrap gap-md mt-xs">
                <Link to="/deposit" className="font-label-md text-label-md text-primary hover:underline">
                  {t("deposit")}
                </Link>
                <Link to="/transfer" className="font-label-md text-label-md text-primary hover:underline">
                  {t("transfer")}
                </Link>
              </div>
            </div>
          ) : (
            <p className="p-md font-body-md text-body-md text-on-surface-variant">{t("noMatchingActivity")}</p>
          )
        ) : (
          filtered.map((tx, i) => {
            const inbound = isInbound(tx);
            const kind = kindOf(tx);
            const title =
              kind === "wallet_deposit"
                ? t("kindDeposit")
                : kind === "wallet_withdraw"
                  ? t("kindWithdraw")
                  : tx.recipientName || t("transfer");
            return (
              <TransactionRow
                key={tx.id}
                title={title}
                subtitle={`${humanPhase(tx.phase, t)} • ${new Date(tx.updatedAt).toLocaleDateString()}`}
                amount={`${inbound ? "+" : "-"}$${(tx.usdAmountCents / 100).toFixed(2)}`}
                positive={inbound}
                icon={inbound ? "south_west" : "north_east"}
                iconTone={inbound ? "success" : "neutral"}
                border={i < filtered.length - 1}
                onClick={() => navigate(`/history/${tx.id}`)}
              />
            );
          })
        )}
      </SurfaceCard>
    </div>
  );
}
