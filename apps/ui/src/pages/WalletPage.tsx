import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiOptional } from "../lib/api";
import { humanPhase } from "../lib/phase";
import { CurrencyPill } from "../components/CurrencyPill";
import { Icon } from "../components/Icon";
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

export function WalletPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [balance, setBalance] = useState("0.00");
  const [reserved, setReserved] = useState("0.00");
  const [transfers, setTransfers] = useState<HistoryItem[]>([]);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    const w = await apiOptional<{ displayUsd: string; reservedUsd?: string }>("/api/wallet");
    setBalance(w?.displayUsd ?? "0.00");
    setReserved(w?.reservedUsd ?? "0.00");
    const h = await apiOptional<{ transfers: HistoryItem[] }>("/api/history");
    setTransfers((h?.transfers ?? []).slice(0, 5));
  }

  const hasReserved = reserved !== "0.00";

  return (
    <div className="px-container-margin py-lg flex flex-col gap-lg max-w-xl mx-auto w-full">
      <section className="bg-primary rounded-xl p-lg text-on-primary shadow-[0_4px_16px_rgba(0,10,30,0.15)] flex flex-col gap-md relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle at 100% 0%, #8df7c1 0%, transparent 60%)" }}
        />
        <div className="z-10">
          <p className="font-label-md text-label-md text-on-primary/80 uppercase tracking-widest">
            {hasReserved ? t("availableBalance") : t("totalBalance")}
          </p>
          <div className="flex items-baseline gap-xs mt-sm">
            <span className="font-display-md text-display-md text-on-primary/80">$</span>
            <span className="font-numeric-xl text-numeric-xl tracking-tight">{balance}</span>
          </div>
          {hasReserved && (
            <p className="font-label-md text-label-md text-on-primary/70 mt-xs">
              {t("pendingReserved")}: ${reserved}
            </p>
          )}
        </div>
        <div className="grid grid-cols-3 gap-sm z-10 mt-sm">
          <button
            type="button"
            onClick={() => navigate("/deposit")}
            className="bg-surface text-primary rounded-lg py-sm px-xs flex flex-col items-center justify-center gap-xs font-label-md text-label-md hover:bg-surface-container-low transition-colors active:scale-95 shadow-sm min-h-16"
          >
            <Icon name="add_card" filled className="text-[22px]!" />
            <span className="text-center leading-tight">{t("deposit")}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/withdraw")}
            className="bg-primary-container text-on-primary-container border border-on-primary-container/20 rounded-lg py-sm px-xs flex flex-col items-center justify-center gap-xs font-label-md text-label-md hover:bg-surface-tint hover:text-white transition-colors active:scale-95 shadow-sm min-h-16"
          >
            <Icon name="arrow_upward" className="text-[22px]!" />
            <span className="text-center leading-tight">{t("withdraw")}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/transfer")}
            className="bg-surface/15 text-on-primary border border-on-primary/25 rounded-lg py-sm px-xs flex flex-col items-center justify-center gap-xs font-label-md text-label-md hover:bg-surface/25 transition-colors active:scale-95 shadow-sm min-h-16"
          >
            <Icon name="swap_horiz" filled className="text-[22px]!" />
            <span className="text-center leading-tight">{t("transfer")}</span>
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-sm">
        <h2 className="font-display-md-mobile text-display-md-mobile font-bold text-on-background">
          {t("assets")}
        </h2>
        <div className="flex gap-sm overflow-x-auto hide-scrollbar pb-xs">
          <CurrencyPill code="USD" label={t("usdWallet")} active />
        </div>
      </section>

      <section className="flex flex-col gap-sm flex-1">
        <div className="flex justify-between items-end mb-xs">
          <h2 className="font-display-md-mobile text-display-md-mobile font-bold text-on-background">
            {t("recentActivity")}
          </h2>
          <Link to="/history" className="font-label-md text-label-md text-primary hover:underline">
            {t("seeAll")}
          </Link>
        </div>
        <SurfaceCard>
          {transfers.length === 0 ? (
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
            transfers.map((tx, i) => {
              const inbound = isInbound(tx);
              const kind = kindOf(tx);
              const title =
                kind === "wallet_deposit"
                  ? t("kindDeposit")
                  : kind === "wallet_withdraw"
                    ? t("kindWithdraw")
                    : tx.recipientName || t("kindTransfer");
              return (
                <TransactionRow
                  key={tx.id}
                  title={title}
                  subtitle={`${humanPhase(tx.phase, t)} • ${new Date(tx.updatedAt).toLocaleDateString()}`}
                  amount={`${inbound ? "+" : "-"}$${(tx.usdAmountCents / 100).toFixed(2)}`}
                  positive={inbound}
                  icon={inbound ? "south_west" : "north_east"}
                  iconTone={inbound ? "success" : "neutral"}
                  border={i < transfers.length - 1}
                  onClick={() => navigate(`/history/${tx.id}`)}
                />
              );
            })
          )}
        </SurfaceCard>
      </section>
    </div>
  );
}
