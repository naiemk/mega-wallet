import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";

interface Quote {
  id: string;
  sourceCurrency: string;
  destCurrency: string;
  usdcOutMinor: number;
  destOutMinor: number;
  paymentMethod: string;
  provider: string;
  countdownSeconds: number;
  paymentMethods: Array<{ id: string; name: string }>;
}

interface Transfer {
  id: string;
  phase: string;
  depositPayUrl?: string | null;
  recipientName?: string | null;
  withdrawStatus?: string | null;
}

function stepState(phase: string, step: "deposit" | "recipient" | "withdraw") {
  const deposited = ["deposited", "recipient_set", "withdraw_initiated", "withdraw_executed", "need_attention"].includes(
    phase,
  );
  const recipient = ["recipient_set", "withdraw_initiated", "withdraw_executed", "need_attention"].includes(phase);
  if (step === "deposit") {
    if (deposited) return "complete";
    if (phase === "depositing") return "active";
    return "pending";
  }
  if (step === "recipient") {
    if (recipient) return "complete";
    if (deposited) return "active";
    return "pending";
  }
  if (phase === "withdraw_executed") return "complete";
  if (phase === "withdraw_cancelled") return "cancelled";
  if (phase === "need_attention") return "attention";
  if (phase === "withdraw_initiated") return "active";
  return deposited && recipient ? "pending" : "pending";
}

function StepBadge({ state, label }: { state: string; label: string }) {
  const colors: Record<string, string> = {
    complete: "bg-emerald-500/20 text-emerald-300",
    active: "bg-amber-500/20 text-amber-300",
    attention: "bg-red-500/20 text-red-300",
    cancelled: "bg-slate-500/20 text-slate-400",
    pending: "bg-white/5 text-slate-500",
  };
  return (
    <div className={`rounded-xl px-3 py-2 text-xs ${colors[state] ?? colors.pending}`}>
      {label}
    </div>
  );
}

export function ExchangePage() {
  const { t } = useTranslation();
  const [amount, setAmount] = useState("100");
  const [sourceCurrency, setSourceCurrency] = useState("EUR");
  const [destCurrency, setDestCurrency] = useState("IRR");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [recipientSheba, setRecipientSheba] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    void api<{ transfer: Transfer | null }>("/api/transfers/active")
      .then((r) => setTransfer(r.transfer))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!quote) return;
    setCountdown(quote.countdownSeconds);
    const timer = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [quote]);

  async function loadQuote() {
    setError("");
    try {
      const q = await api<Quote>(
        `/api/quotes?sourceCurrency=${sourceCurrency}&destCurrency=${destCurrency}&amount=${amount}&paymentMethod=${paymentMethod}`,
      );
      setQuote(q);
      if (!paymentMethod) setPaymentMethod(q.paymentMethod);
    } catch (e) {
      setError(String(e));
    }
  }

  async function start() {
    if (!quote) return;
    setError("");
    try {
      const result = await api<{ transferId: string; deposit: { payUrl: string } }>("/api/transfers", {
        method: "POST",
        body: JSON.stringify({ quoteId: quote.id }),
      });
      setTransfer({ id: result.transferId, phase: "depositing", depositPayUrl: result.deposit.payUrl });
    } catch (e) {
      setError(String(e));
    }
  }

  async function saveRecipient() {
    if (!transfer) return;
    setError("");
    try {
      await api(`/api/transfers/${transfer.id}/recipient`, {
        method: "POST",
        body: JSON.stringify({ name: recipientName, sheba: recipientSheba }),
      });
      setTransfer({ ...transfer, phase: "withdraw_initiated", withdrawStatus: "initiated" });
    } catch (e) {
      setError(String(e));
    }
  }

  const phase = transfer?.phase ?? "quote_issued";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <StepBadge state={stepState(phase, "deposit")} label={t("steps.deposit")} />
        <StepBadge state={stepState(phase, "recipient")} label={t("steps.recipient")} />
        <StepBadge state={stepState(phase, "withdraw")} label={t("steps.withdraw")} />
      </div>

      {!transfer && (
        <div className="card space-y-3">
          <p className="text-sm text-slate-400">{t("send")}</p>
          <label className="block text-sm">{t("youSend")}</label>
          <div className="flex gap-2">
            <input className="input" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
            <select className="input max-w-[96px]" value={sourceCurrency} onChange={(e) => setSourceCurrency(e.target.value)}>
              <option>EUR</option>
              <option>USD</option>
              <option>GBP</option>
            </select>
          </div>
          <label className="block text-sm">{t("theyGet")}</label>
          <select className="input" value={destCurrency} onChange={(e) => setDestCurrency(e.target.value)}>
            <option value="IRR">IRR</option>
          </select>
          {quote && (
            <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              {quote.paymentMethods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          )}
          <button className="btn-primary" onClick={loadQuote}>
            {t("getQuote")}
          </button>
        </div>
      )}

      {quote && !transfer && (
        <div className="card space-y-2 text-sm">
          <p>
            USD in wallet: <strong>${(quote.usdcOutMinor / 100).toFixed(2)}</strong>
          </p>
          <p>
            They receive: <strong>{quote.destOutMinor.toLocaleString()} {quote.destCurrency}</strong>
          </p>
          <p className="text-slate-400">Provider: {quote.provider}</p>
          <p className="text-amber-300">
            Quote valid: {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
          </p>
          <button className="btn-primary" onClick={start}>
            {t("startTransfer")}
          </button>
        </div>
      )}

      {transfer && (
        <div className="card space-y-3 text-sm">
          {transfer.depositPayUrl && phase === "depositing" && (
            <a className="text-emerald-300 underline" href={transfer.depositPayUrl} target="_blank" rel="noreferrer">
              {t("deposit")}
            </a>
          )}
          {(phase === "deposited" || phase === "recipient_set") && !transfer.recipientName && (
            <>
              <input className="input" placeholder={t("name")} value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
              <input className="input" placeholder="Sheba IBAN" value={recipientSheba} onChange={(e) => setRecipientSheba(e.target.value)} />
              <button className="btn-primary" onClick={saveRecipient}>
                {t("steps.recipient")}
              </button>
            </>
          )}
          {phase === "withdraw_initiated" && (
            <p className="text-amber-300">Withdrawal initiated — operator will complete payout.</p>
          )}
          {phase === "withdraw_executed" && (
            <p className="text-emerald-300">Transfer complete.</p>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
