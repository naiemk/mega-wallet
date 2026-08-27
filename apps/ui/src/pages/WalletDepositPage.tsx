import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../lib/api";
import { translateApiError } from "../lib/api-error";
import { useApiErrorHandler } from "../lib/use-api-error";
import { formatMoney, humanizeId } from "../lib/format";
import { acceptUsdAmountChange, displayNumeric } from "../lib/numeric-input";
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

function parseAmountLimit(message: string): { min?: number; max?: number; fiat?: string } | null {
  const between = message.match(
    /between\s+([A-Z]{3})\s+([\d.]+)\s+and\s+[A-Z]{3}\s+([\d.]+)/i,
  );
  if (between) {
    return { fiat: between[1]?.toUpperCase(), min: Number(between[2]), max: Number(between[3]) };
  }
  if (/onramp_limit|LimitMismatch|minAmount/i.test(message)) {
    return {};
  }
  return null;
}

export function WalletDepositPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const handleApiError = useApiErrorHandler();
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
      setError(n === 0 || amount === "" ? "" : t("amountTooLow"));
      return;
    }
    setQuoting(true);
    try {
      const methodQ = paymentMethod ? `&paymentMethod=${paymentMethod}` : "";
      const q = await api<QuoteResult>(
        `/api/quotes?sourceCurrency=${currency}&destCurrency=USD&amount=${n}${methodQ}`,
      );
      setQuote(q);
      setError("");
      if (!paymentMethod && q.paymentMethod) setPaymentMethod(q.paymentMethod);
    } catch (e) {
      setQuote(null);
      const raw = e instanceof ApiError || e instanceof Error ? e.message : String(e);
      const limit = parseAmountLimit(raw);
      if (limit) {
        if (limit.min != null && limit.max != null && limit.fiat) {
          setError(
            t("depositAmountOutOfRange", {
              min: formatMoney(Math.round(limit.min * 100), limit.fiat, i18n.language),
              max: formatMoney(Math.round(limit.max * 100), limit.fiat, i18n.language),
            }),
          );
        } else {
          setError(translateApiError(e, t));
        }
      } else {
        // Non-limit quote failures: keep provisional USD estimate path disabled until quote works
        setError(translateApiError(e, t));
      }
    } finally {
      setQuoting(false);
    }
  }

  async function startDeposit() {
    if (!quote) return;
    setError("");
    setLoading(true);
    try {
      const amountMinor = Math.round(Number(amount) * 100);
      const result = await api<{ transferId: string }>("/api/deposits", {
        method: "POST",
        body: JSON.stringify({
          amountMinor,
          amountUsdCents: quote.usdcOutMinor,
          sourceCurrency: currency,
          paymentMode: "fiat",
          paymentMethod: paymentMethod || quote.paymentMethod,
          provider: quote.provider,
          language: i18n.language,
        }),
      });
      navigate(`/deposit/${result.transferId}`);
    } catch (e) {
      handleApiError(e, setError);
    } finally {
      setLoading(false);
    }
  }

  const sourceMinor = Math.round(Number(amount || 0) * 100);
  const creditMinor = quote?.usdcOutMinor ?? null;
  const canDeposit =
    !loading && !quoting && !!quote && Number.isFinite(Number(amount)) && Number(amount) > 0;

  return (
    <div className="px-container-margin py-lg flex flex-col gap-lg max-w-md mx-auto w-full">
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
              value={displayNumeric(amount, i18n.language)}
              onChange={(e) => {
                const next = acceptUsdAmountChange(e.target.value, amount);
                if (next !== null) setAmount(next);
              }}
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
              {quoting && creditMinor == null
                ? "…"
                : creditMinor == null
                  ? "—"
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

      {error && <p className="text-error font-body-md text-body-md m-0">{error}</p>}

      <PrimaryButton onClick={() => void startDeposit()} disabled={!canDeposit}>
        {loading || quoting ? "…" : t("continueToPayment")}
      </PrimaryButton>
    </div>
  );
}
