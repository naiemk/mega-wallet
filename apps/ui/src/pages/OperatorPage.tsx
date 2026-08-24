import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";

export function OperatorPage() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<Array<{ id: string; recipientName?: string | null; phase: string }>>([]);
  const [dashboard, setDashboard] = useState<{ count: number; unsettled: number; volumeUsdCents: number } | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      const r = await api<{ requests: typeof requests }>("/api/operator/requests");
      const d = await api<{ totals: typeof dashboard }>("/api/operator/dashboard");
      setRequests(r.requests);
      setDashboard(d.totals);
    } catch {
      setRequests([]);
    }
  }

  async function markReceived(id: string) {
    await api(`/api/operator/requests/${id}/received`, {
      method: "POST",
      body: JSON.stringify({ comment: "Confirmed" }),
      headers: { "Content-Type": "application/json" },
    });
    await load();
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t("operator")}</h2>
      {dashboard && (
        <div className="card grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <p className="text-slate-400">Total</p>
            <p className="text-lg font-bold">{dashboard.count}</p>
          </div>
          <div>
            <p className="text-slate-400">Unsettled</p>
            <p className="text-lg font-bold">{dashboard.unsettled}</p>
          </div>
          <div>
            <p className="text-slate-400">Volume</p>
            <p className="text-lg font-bold">${(dashboard.volumeUsdCents / 100).toFixed(0)}</p>
          </div>
        </div>
      )}
      {requests.map((r) => (
        <div key={r.id} className="card text-sm">
          <p>{r.recipientName ?? "—"}</p>
          <p className="text-slate-400">{r.phase}</p>
          {r.phase === "withdraw_initiated" && (
            <button className="btn-primary mt-2" onClick={() => markReceived(r.id)}>
              Mark received
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
