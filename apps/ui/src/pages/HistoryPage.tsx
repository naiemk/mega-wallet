import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";

export function HistoryPage() {
  const { t } = useTranslation();
  const [transfers, setTransfers] = useState<Array<{ id: string; phase: string; usdAmountCents: number; updatedAt: string }>>([]);

  useEffect(() => {
    void api<{ transfers: typeof transfers }>("/api/history").then((d) => setTransfers(d.transfers ?? []));
  }, []);

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">{t("history")}</h2>
      {transfers.length === 0 && <p className="text-sm text-slate-400">No transfers yet</p>}
      {transfers.map((tx) => (
        <div key={tx.id} className="card text-sm">
          <p>${(tx.usdAmountCents / 100).toFixed(2)}</p>
          <p className="text-slate-400">{tx.phase}</p>
        </div>
      ))}
    </div>
  );
}
