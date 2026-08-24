import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";

export function WalletPage() {
  const { t } = useTranslation();
  const [balance, setBalance] = useState("0.00");
  const [active, setActive] = useState<{ id: string; phase: string; depositPayUrl?: string | null } | null>(null);
  const [depositAmount, setDepositAmount] = useState("50");
  const [withdrawAmount, setWithdrawAmount] = useState("25");
  const [name, setName] = useState("");
  const [sheba, setSheba] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    try {
      const w = await api<{ displayUsd: string }>("/api/wallet");
      setBalance(w.displayUsd);
      const a = await api<{ transfer: typeof active }>("/api/transfers/active");
      setActive(a.transfer);
    } catch {
      setBalance("0.00");
    }
  }

  async function deposit() {
    setMessage("");
    try {
      const cents = Math.round(parseFloat(depositAmount) * 100);
      const result = await api<{ transferId: string; deposit: { payUrl: string } }>("/api/deposits", {
        method: "POST",
        body: JSON.stringify({ amountUsdCents: cents }),
      });
      setMessage(`Deposit started — open payment link`);
      setActive({ id: result.transferId, phase: "depositing", depositPayUrl: result.deposit.payUrl });
    } catch (e) {
      setMessage(String(e));
    }
  }

  async function withdraw() {
    setMessage("");
    try {
      const cents = Math.round(parseFloat(withdrawAmount) * 100);
      await api("/api/withdrawals", {
        method: "POST",
        body: JSON.stringify({ amountUsdCents: cents, name, sheba }),
      });
      setMessage("Withdrawal initiated");
      await refresh();
    } catch (e) {
      setMessage(String(e));
    }
  }

  async function setRecipient() {
    if (!active) return;
    setMessage("");
    try {
      await api(`/api/transfers/${active.id}/recipient`, {
        method: "POST",
        body: JSON.stringify({ name, sheba }),
      });
      setMessage("Recipient saved");
      await refresh();
    } catch (e) {
      setMessage(String(e));
    }
  }

  return (
    <div className="space-y-4">
      <div className="card text-center">
        <p className="text-sm text-slate-400">{t("balance")}</p>
        <p className="text-4xl font-bold">${balance}</p>
      </div>

      <div className="card space-y-2">
        <p className="text-sm font-medium">{t("deposit")}</p>
        <input className="input" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} inputMode="decimal" />
        <button className="btn-primary" onClick={deposit}>
          {t("deposit")}
        </button>
      </div>

      <div className="card space-y-2">
        <p className="text-sm font-medium">{t("withdraw")}</p>
        <input className="input" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} inputMode="decimal" />
        <input className="input" placeholder={t("name")} value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" placeholder="Sheba IBAN" value={sheba} onChange={(e) => setSheba(e.target.value)} />
        <button className="btn-primary" onClick={withdraw}>
          {t("withdraw")}
        </button>
      </div>

      {active && (
        <div className="card space-y-2 text-sm">
          <p>Active transfer: {active.phase}</p>
          {active.depositPayUrl && (
            <a className="text-emerald-300 underline" href={active.depositPayUrl}>
              {t("deposit")}
            </a>
          )}
          {active.phase === "deposited" && (
            <button className="btn-primary" onClick={setRecipient}>
              Save recipient
            </button>
          )}
        </div>
      )}

      {message && <p className="text-sm text-emerald-300">{message}</p>}
    </div>
  );
}
