import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatDigitsForLocale, parseUsdAmountInput } from "@mega-wallet/core";
import { api, apiOptional } from "../lib/api";
import { useApiErrorHandler } from "../lib/use-api-error";
import { humanPhase } from "../lib/phase";
import { acceptUsdAmountChange, displayNumeric } from "../lib/numeric-input";
import { type WithdrawContact } from "../components/AddDestinationSheet";
import {
  contactKind,
  DestinationPicker,
} from "../components/DestinationPicker";
import { type DestinationKind } from "../components/DestinationKindToggle";
import { CurrencySelect } from "../components/IconCircle";
import { Icon } from "../components/Icon";
import { PrimaryButton } from "../components/PrimaryButton";
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

export function WithdrawPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const handleApiError = useApiErrorHandler();
  const lang = i18n.language;

  const [amountText, setAmountText] = useState("50");
  const [kind, setKind] = useState<DestinationKind>("sheba");
  const [contacts, setContacts] = useState<WithdrawContact[]>([]);
  const [selected, setSelected] = useState<WithdrawContact | null>(null);
  const [available, setAvailable] = useState(0);
  const [irrRate, setIrrRate] = useState<number | null>(null);
  const [rateUnavailable, setRateUnavailable] = useState(false);
  const [recent, setRecent] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [amountTouched, setAmountTouched] = useState(false);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    const w = await apiOptional<{ availableUsdCents: number }>("/api/wallet");
    setAvailable(w?.availableUsdCents ?? 0);
    const c = await apiOptional<{ contacts: WithdrawContact[] }>("/api/contacts");
    setContacts(c?.contacts ?? []);
    try {
      const fx = await api<{ customerRate: number }>("/api/rates");
      setIrrRate(fx.customerRate);
      setRateUnavailable(false);
    } catch {
      setIrrRate(null);
      setRateUnavailable(true);
    }
    const h = await apiOptional<{ transfers: HistoryItem[] }>("/api/history");
    setRecent(
      (h?.transfers ?? [])
        .filter((tx) => tx.kind === "wallet_withdraw" || tx.quoteId === "wallet-withdraw")
        .slice(0, 5),
    );
  }

  const parsed = parseUsdAmountInput(amountText);
  const amountCents = parsed ? Math.round(parsed.value * 100) : 0;
  const amountValid = Boolean(parsed && parsed.value > 0 && amountCents <= available);
  const amountError =
    amountTouched && parsed && parsed.value <= 0
      ? t("amountTooLow")
      : amountTouched && parsed && amountCents > available
        ? t("amountTooHigh")
        : "";

  const irrEstimate = useMemo(() => {
    if (!parsed || !irrRate || parsed.value <= 0) return null;
    return Math.round(parsed.value * irrRate);
  }, [parsed, irrRate]);

  function onAmountChange(raw: string) {
    const next = acceptUsdAmountChange(raw, amountText);
    if (next !== null) setAmountText(next);
  }

  function withdrawAll() {
    setAmountText((available / 100).toFixed(2));
    setAmountTouched(true);
  }

  async function submit() {
    if (!amountValid || !selected || rateUnavailable || irrRate == null) {
      if (rateUnavailable || irrRate == null) setError(t("errRateUnavailable"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      const k = contactKind(selected);
      const isTemp = selected.id.startsWith("temp-");
      const result = await api<{ transferId: string }>("/api/withdrawals", {
        method: "POST",
        body: JSON.stringify({
          amountUsdCents: amountCents,
          name: selected.name,
          kind: k,
          sheba: selected.sheba ?? undefined,
          cardNumber: selected.cardNumber ?? undefined,
          bankId: selected.bankId ?? undefined,
          contactId: isTemp ? undefined : selected.id,
          saveContact: isTemp,
        }),
      });
      navigate(`/withdraw/${result.transferId}`);
    } catch (e) {
      handleApiError(e, setError);
    } finally {
      setLoading(false);
    }
  }

  const displayAmount = displayNumeric(amountText || "", lang);

  return (
    <div className="px-container-margin py-lg flex flex-col gap-lg w-full">
      <SurfaceCard className="p-md space-y-md">
        <div>
          <div className="flex items-center justify-between gap-md mb-xs">
            <label
              className="block font-label-md text-label-md text-on-surface-variant"
              htmlFor="wdAmount"
            >
              {t("withdrawAmount")}
            </label>
            <button
              type="button"
              onClick={withdrawAll}
              className="font-label-md text-label-md text-primary hover:underline shrink-0"
            >
              {t("withdrawAll")} ({formatDigitsForLocale((available / 100).toFixed(2), lang)})
            </button>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-outline-variant focus-within:border-primary focus-within:border-2 bg-surface-container-low px-md py-sm gap-sm">
            <input
              id="wdAmount"
              inputMode="decimal"
              className="bg-transparent border-none p-0 font-numeric-xl text-numeric-xl text-primary w-2/3 outline-none min-w-0"
              value={displayAmount}
              onChange={(e) => onAmountChange(e.target.value)}
              onBlur={() => setAmountTouched(true)}
              aria-label={t("withdrawAmount")}
            />
            <CurrencySelect code="USD" locked />
          </div>
        </div>
        <p className="font-label-md text-label-md text-outline m-0">
          {t("available")}: ${formatDigitsForLocale((available / 100).toFixed(2), lang)}
        </p>
        {irrEstimate != null && (
          <p className="font-label-md text-label-md text-on-surface-variant m-0">
            {t("approxIrr", {
              amount: formatDigitsForLocale(irrEstimate.toLocaleString("en-US"), lang),
            })}
          </p>
        )}
        {irrRate != null && (
          <p className="font-label-md text-label-md text-outline m-0">
            {t("irrCustomerRate", {
              rate: formatDigitsForLocale(irrRate.toLocaleString("en-US"), lang),
            })}
          </p>
        )}
        {rateUnavailable && (
          <p className="font-label-md text-label-md text-error m-0">{t("errRateUnavailable")}</p>
        )}
        {amountError && <p className="font-label-md text-label-md text-error m-0">{amountError}</p>}
      </SurfaceCard>

      <DestinationPicker
        kind={kind}
        onKindChange={setKind}
        selected={selected}
        onSelect={setSelected}
        contacts={contacts}
        setContacts={setContacts}
      />

      {error && <p className="text-error font-body-md text-body-md">{error}</p>}

      <PrimaryButton
        onClick={() => void submit()}
        disabled={
          loading ||
          !amountValid ||
          !selected ||
          contactKind(selected) !== kind ||
          rateUnavailable ||
          irrRate == null
        }
      >
        {loading ? "…" : t("confirmWithdraw")}
        <Icon name={i18n.language === "fa" || i18n.language === "ar" ? "arrow_back" : "arrow_forward"} />
      </PrimaryButton>

      {recent.length > 0 && (
        <section className="flex flex-col gap-sm">
          <h2 className="font-label-md text-label-md text-outline uppercase tracking-wider m-0">
            {t("recentWithdrawals")}
          </h2>
          <SurfaceCard>
            {recent.map((tx, i) => (
              <TransactionRow
                key={tx.id}
                title={tx.recipientName || t("kindWithdraw")}
                subtitle={`${humanPhase(tx.phase, t)} • ${new Date(tx.updatedAt).toLocaleDateString()}`}
                amount={`-$${formatDigitsForLocale((tx.usdAmountCents / 100).toFixed(2), lang)}`}
                icon="north_east"
                iconTone="neutral"
                border={i < recent.length - 1}
                onClick={() => navigate(`/history/${tx.id}`)}
              />
            ))}
          </SurfaceCard>
        </section>
      )}
    </div>
  );
}
