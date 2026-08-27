import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { translateApiError } from "../lib/api-error";
import { formatMoney, humanizeId } from "../lib/format";
import { CurrencySelect } from "../components/IconCircle";
import { Icon } from "../components/Icon";
import { PrimaryButton } from "../components/PrimaryButton";
import { SurfaceCard } from "../components/SurfaceCard";

interface QuoteResult {
  usdcOutMinor: number;
  paymentMethod: string;
  provider: string;
  paymentMethods?: Array<{ id: string; name: string }>;
  rankedQuotes?: Array<{ feeMinor?: number }>;
}

export function WalletDepositPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [amount, setAmount] = useState("100");
  const [currency, setCurrency] = useState("USD");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handle = setTimeout(() => void refreshEstimate(), 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, currency, paymentMethod]);

  async function refreshEstimate() {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setQuote(null);
      return;
    }
    setQuoting(true);
    setError("");
    try {
      const methodQ = paymentMethod ? `&paymentMethod=${paymentMethod}` : "";
      const q = await api<QuoteResult>(
        `/api/quotes?sourceCurrency=${currency}&destCurrency=USD&amount=${n}${methodQ}`,
      );
      setQuote(q);
      if (!paymentMethod && q.paymentMethod) setPaymentMethod(q.paymentMethod);
    } catch (e) {
      setQuote(null);
      setError(translateApiError(e, t) || t("quoteFailed"));
    } finally {
      setQuoting(false);
    }
  }

  async function startDeposit() {
    setError("");
    setLoading(true);
    try {
      const amountMinor = Math.round(Number(amount) * 100);
      const result = await api<{ transferId: string }>("/api/deposits", {
        method: "POST",
        body: JSON.stringify({
          amountMinor,
          amountUsdCents: quote?.usdcOutMinor,
          sourceCurrency: currency,
          paymentMode: "fiat",
          paymentMethod: paymentMethod || quote?.paymentMethod,
          provider: quote?.provider,
          language: i18n.language,
        }),
      });
      navigate(`/deposit/${result.transferId}`);
    } catch (e) {
      setError(translateApiError(e, t));
    } finally {
      setLoading(false);
    }
  }

  const sourceMinor = Math.round(Number(amount || 0) * 100);
  const creditMinor = quote?.usdcOutMinor ?? null;

  return (
    <div className="max-w-xl mx-auto px-container-margin py-lg flex flex-col gap-lg">
      <div>
        <h2 className="font-display-md-mobile text-display-md-mobile text-on-background m-0">
          {t("deposit")}
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant mt-xs mb-0">
          {t("depositIntro")}
        </p>
      </div>

      <SurfaceCard className="p-md space-y-md">
        <div>
          <label className="block font-label-md text-label-md text-on-surface-variant mb-xs">
            {t("youPay")}
          </label>
          <div className="flex items-center justify-between rounded-lg border border-outline-variant focus-within:border-primary focus-within:border-2 bg-surface-container-low px-md py-sm gap-sm">
            <input
              className="bg-transparent border-none p-0 font-numeric-xl text-numeric-xl text-primary w-2/3 outline-none min-w-0"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-label={t("depositAmount")}
            />
            <div className="relative">
              <CurrencySelect code={currency} />
              <select
                className="absolute inset-0 opacity-0 cursor-pointer"
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value);
                  setPaymentMethod("");
                }}
                aria-label={t("currency")}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-surface-container-highest p-md flex items-center justify-between">
          <div>
            <p className="font-label-md text-label-md text-on-surface-variant">{t("walletCredits")}</p>
            <p className="font-display-md text-display-md text-primary m-0">
              {quoting || creditMinor == null
                ? "…"
                : formatMoney(creditMinor, "USD", i18n.language)}
            </p>
            {quote?.provider && (
              <p className="font-label-md text-label-md text-outline mt-xs mb-0">
                {humanizeId(quote.provider)}
                {sourceMinor > 0 && currency !== "USD"
                  ? ` · ${formatMoney(sourceMinor, currency, i18n.language)}`
                  : null}
              </p>
            )}
          </div>
          <Icon name="account_balance_wallet" className="text-primary" />
        </div>

        {quote?.paymentMethods?.length ? (
          <div>
            <label className="block font-label-md text-label-md text-on-surface-variant mb-xs">
              {t("paymentMethod")}
            </label>
            <div className="relative rounded-lg border border-outline-variant bg-surface-container-low">
              <select
                className="w-full h-12 px-md rounded-lg bg-transparent font-body-md text-body-md appearance-none outline-none"
                value={paymentMethod || quote.paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {quote.paymentMethods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name || humanizeId(m.id)}
                  </option>
                ))}
              </select>
              <Icon
                name="expand_more"
                className="pointer-events-none absolute end-md top-1/2 -translate-y-1/2 text-outline"
              />
            </div>
          </div>
        ) : null}
      </SurfaceCard>

      {error && <p className="text-error font-body-md text-body-md">{error}</p>}

      <PrimaryButton
        onClick={startDeposit}
        disabled={loading || quoting || !quote || !amount || Number(amount) <= 0}
      >
        {loading ? "…" : t("continueToPayment")}
      </PrimaryButton>
    </div>
  );
}
