import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { translateApiError } from "../lib/api-error";
import { formatMoney, formatRate, humanizeId } from "../lib/format";
import { acceptUsdAmountChange, displayNumeric } from "../lib/numeric-input";
import { useTransferWizard } from "../lib/transfer-wizard";
import { CurrencySelect, IconCircle } from "../components/IconCircle";
import { Icon } from "../components/Icon";
import { PrimaryButton } from "../components/PrimaryButton";
import { SurfaceCard } from "../components/SurfaceCard";

interface Quote {
  id: string;
  sourceCurrency: string;
  destCurrency: string;
  sourceAmountMinor: number;
  usdcOutMinor: number;
  destOutMinor: number;
  paymentMethod: string;
  provider: string;
  countdownSeconds: number;
  paymentMethods: Array<{ id: string; name: string }>;
  rankedQuotes?: Array<{ feeMinor?: number }>;
  feeMinor?: number;
}

export function TransferQuotePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { draft, setDraft } = useTransferWizard();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!quote) return;
    setCountdown(quote.countdownSeconds);
    const timer = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [quote]);

  useEffect(() => {
    const handle = setTimeout(() => void loadQuote(), 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.amount, draft.sourceCurrency, draft.destCurrency, draft.paymentMethod]);

  async function loadQuote() {
    const n = Number(draft.amount);
    if (!Number.isFinite(n) || n <= 0) {
      setQuote(null);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const methodQ = draft.paymentMethod ? `&paymentMethod=${draft.paymentMethod}` : "";
      const q = await api<Quote>(
        `/api/quotes?sourceCurrency=${draft.sourceCurrency}&destCurrency=${draft.destCurrency}&amount=${n}${methodQ}`,
      );
      setQuote(q);
      const feeMinor = q.feeMinor ?? q.rankedQuotes?.[0]?.feeMinor ?? 0;
      setDraft({
        quoteId: q.id,
        usdcOutMinor: q.usdcOutMinor,
        destOutMinor: q.destOutMinor,
        sourceAmountMinor: q.sourceAmountMinor,
        feeMinor,
        provider: q.provider,
        paymentMethod: q.paymentMethod,
        countdownSeconds: q.countdownSeconds,
      });
    } catch (e) {
      setQuote(null);
      setDraft({ quoteId: null });
      setError(translateApiError(e, t));
    } finally {
      setLoading(false);
    }
  }

  const sourceMinor = quote?.sourceAmountMinor ?? Math.round(Number(draft.amount || 0) * 100);
  const feeMinor = draft.feeMinor || quote?.feeMinor || quote?.rankedQuotes?.[0]?.feeMinor;
  const rate =
    sourceMinor > 0 && quote
      ? quote.destCurrency === "IRR"
        ? quote.destOutMinor / (quote.usdcOutMinor / 100)
        : quote.destOutMinor / sourceMinor
      : 0;
  const mins = Math.floor(countdown / 60);
  const secs = String(countdown % 60).padStart(2, "0");

  return (
    <div className="max-w-xl mx-auto px-container-margin pt-sm">
      <SurfaceCard className="mb-lg">
        <div className="p-md space-y-md">
          <div>
            <label className="block font-label-md text-label-md text-on-surface-variant mb-xs">
              {t("youSend")}
            </label>
            <div className="flex items-center justify-between rounded-lg border border-outline-variant focus-within:border-primary focus-within:border-2 bg-surface-container-low px-md py-sm gap-sm">
              <input
                className="bg-transparent border-none p-0 font-numeric-xl text-numeric-xl text-primary w-2/3 outline-none min-w-0"
                inputMode="decimal"
                value={displayNumeric(draft.amount, i18n.language)}
                onChange={(e) => {
                  const next = acceptUsdAmountChange(e.target.value, draft.amount);
                  if (next === null) return;
                  setDraft({ amount: next, quoteId: null });
                  setQuote(null);
                }}
              />
              <div className="relative">
                <CurrencySelect code={draft.sourceCurrency} />
                <select
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  value={draft.sourceCurrency}
                  onChange={(e) => {
                    setDraft({ sourceCurrency: e.target.value, quoteId: null, paymentMethod: "" });
                    setQuote(null);
                  }}
                  aria-label={t("youSend")}
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>
          </div>

          <div className="my-md ms-sm ps-sm border-s-2 border-surface-variant space-y-sm">
            {feeMinor != null && feeMinor > 0 && (
              <div className="flex items-start justify-between font-body-md text-body-md text-on-surface-variant">
                <div className="flex items-center gap-xs">
                  <Icon name="horizontal_rule" className="text-[16px]! text-outline" />
                  <span>{t("fee")}</span>
                </div>
                <span className="text-on-background font-medium">
                  − {formatMoney(feeMinor, draft.sourceCurrency, i18n.language)}
                </span>
              </div>
            )}
            <div className="flex items-start justify-between font-body-md text-body-md text-on-surface-variant">
              <div className="flex items-center gap-xs">
                <Icon name="horizontal_rule" className="text-[16px]! text-outline" />
                <span>{t("settlesUsd")}</span>
              </div>
              <span className="text-on-background font-medium">
                {quote ? formatMoney(quote.usdcOutMinor, "USD", i18n.language) : loading ? "…" : "—"}
              </span>
            </div>
            {quote && rate > 0 && (
              <div className="flex items-start justify-between font-body-md text-body-md">
                <div className="flex items-center gap-xs text-primary-container font-medium">
                  <span aria-hidden>×</span>
                  <span>{formatRate(rate, quote.destCurrency === "IRR" ? 0 : 4)}</span>
                </div>
                <span className="text-primary-container font-medium">
                  {t("guaranteedRate")} ({mins}:{secs})
                </span>
              </div>
            )}
            {loading && (
              <p className="font-label-md text-label-md text-outline">{t("quoteRefreshing")}</p>
            )}
          </div>

          <div>
            <label className="block font-label-md text-label-md text-on-surface-variant mb-xs">
              {t("theyGet")}
            </label>
            <div className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-low px-md py-sm gap-sm min-h-[3.5rem]">
              <p
                className={`m-0 min-w-0 flex-1 text-primary font-bold tracking-tight ${
                  quote && quote.destCurrency === "IRR"
                    ? "text-[22px] leading-7"
                    : "font-numeric-xl text-numeric-xl"
                }`}
              >
                {quote
                  ? formatMoney(quote.destOutMinor, quote.destCurrency, i18n.language)
                  : "—"}
              </p>
              <CurrencySelect code={draft.destCurrency} />
            </div>
          </div>

          {quote?.paymentMethods?.length ? (
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-xs">
                {t("paymentMethod")}
              </label>
              <div className="relative rounded-lg border border-outline-variant bg-surface-container-low">
                <select
                  className="w-full h-12 px-md rounded-lg bg-transparent font-body-md text-body-md appearance-none outline-none"
                  value={draft.paymentMethod || quote.paymentMethod}
                  onChange={(e) => setDraft({ paymentMethod: e.target.value, quoteId: null })}
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

          {quote?.provider ? (
            <p className="font-label-md text-label-md text-outline">
              {t("provider")}: {humanizeId(quote.provider)}
            </p>
          ) : null}
        </div>
      </SurfaceCard>

      <div className="flex items-center gap-md bg-surface-container-highest rounded-lg p-md mb-lg border border-surface-variant">
        <IconCircle tone="success">
          <Icon name="bolt" />
        </IconCircle>
        <div>
          <h3 className="font-body-md text-body-md font-medium text-primary">{t("arriveFast")}</h3>
          <p className="font-body-md text-body-md text-on-surface-variant">{t("arriveFastHint")}</p>
        </div>
      </div>

      {error && <p className="text-error font-body-md text-body-md mb-md">{error}</p>}

      <div className="mt-xl pb-lg">
        <PrimaryButton
          onClick={() => navigate("/transfer/recipient")}
          disabled={!quote || loading}
        >
          {t("continue")}
        </PrimaryButton>
      </div>
    </div>
  );
}
