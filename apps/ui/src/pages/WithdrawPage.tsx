import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  bankDisplayName,
  formatDigitsForLocale,
  getBankById,
  maskCardNumber,
  maskSheba,
  OTHER_BANK,
  parseUsdAmountInput,
} from "@mega-wallet/core";
import { api, apiOptional } from "../lib/api";
import { useApiErrorHandler } from "../lib/use-api-error";
import { humanPhase } from "../lib/phase";
import { AddDestinationSheet, type WithdrawContact } from "../components/AddDestinationSheet";
import { BankAvatar } from "../components/BankChips";
import {
  DestinationKindToggle,
  type DestinationKind,
} from "../components/DestinationKindToggle";
import { Icon } from "../components/Icon";
import { PrimaryButton } from "../components/PrimaryButton";
import { SelectDestinationSheet } from "../components/SelectDestinationSheet";
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

function contactKind(c: WithdrawContact): DestinationKind {
  if (c.kind === "card" || c.kind === "sheba") return c.kind;
  return c.cardNumber ? "card" : "sheba";
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

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

  const filteredContacts = contacts.filter((c) => contactKind(c) === kind);

  useEffect(() => {
    if (selected && contactKind(selected) !== kind) {
      setSelected(null);
    }
  }, [kind, selected]);

  function onAmountChange(raw: string) {
    const p = parseUsdAmountInput(raw);
    if (raw === "" || raw === "." || (p && /^\d*\.?\d{0,2}$/.test(p.text))) {
      setAmountText(raw === "" ? "" : p?.text ?? amountText);
    } else if (/^[\d۰-۹٠-٩.,٬٫\s-]*$/.test(raw)) {
      const retry = parseUsdAmountInput(raw);
      if (retry) setAmountText(retry.text);
    }
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

  const displayAmount = formatDigitsForLocale(amountText || "", lang);
  const bank = selected ? getBankById(selected.bankId) ?? OTHER_BANK : null;

  return (
    <div className="px-container-margin py-lg flex flex-col gap-lg w-full">
      <SurfaceCard className="p-md space-y-md">
        <div className="flex items-center justify-between gap-md">
          <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="wdAmount">
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
        <div className="flex items-baseline gap-xs">
          <span className="font-display-md text-display-md text-primary/70">$</span>
          <input
            id="wdAmount"
            inputMode="decimal"
            className="w-full bg-transparent outline-none font-numeric-xl text-numeric-xl text-primary border-0 p-0"
            value={displayAmount}
            onChange={(e) => onAmountChange(e.target.value)}
            onBlur={() => setAmountTouched(true)}
            aria-label={t("withdrawAmount")}
          />
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

      <SurfaceCard className="p-md space-y-md">
        <DestinationKindToggle
          value={kind}
          onChange={setKind}
          shebaLabel={t("shebaTab")}
          cardLabel={t("cardTab")}
        />

        {selected && contactKind(selected) === kind ? (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="w-full flex items-center gap-md p-md rounded-lg border border-outline-variant bg-surface-container-low text-start hover:bg-surface-container active:scale-[0.99]"
          >
            <BankAvatar bank={bank} />
            <div className="min-w-0 flex-1">
              <p className="font-body-md text-body-md font-semibold text-on-background m-0 truncate">
                {bank ? bankDisplayName(bank, lang) : t("selectAccount")}
              </p>
              <p className="font-label-md text-label-md text-outline m-0 truncate">{selected.name}</p>
              <p className="font-mono text-sm text-on-surface-variant m-0 truncate">
                {kind === "sheba"
                  ? formatDigitsForLocale(maskSheba(selected.sheba ?? ""), lang)
                  : formatDigitsForLocale(maskCardNumber(selected.cardNumber ?? ""), lang)}
              </p>
            </div>
            <Icon name="expand_more" className="text-outline" />
          </button>
        ) : (
          <div className="flex flex-col gap-sm items-stretch py-sm">
            <p className="font-body-md text-body-md text-on-surface-variant m-0 text-center">
              {t("pickDestination")}
            </p>
            <div className="flex flex-col gap-sm">
              {filteredContacts.length > 0 && (
                <PrimaryButton variant="surface" onClick={() => setPickerOpen(true)}>
                  {t("selectAccount")}
                </PrimaryButton>
              )}
              <PrimaryButton onClick={() => setAddOpen(true)}>+ {t("addAccount")}</PrimaryButton>
            </div>
          </div>
        )}
      </SurfaceCard>

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

      <SelectDestinationSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        kind={kind}
        contacts={contacts}
        selectedId={selected?.id ?? null}
        onSelect={setSelected}
        onAdd={() => {
          setPickerOpen(false);
          setAddOpen(true);
        }}
      />
      <AddDestinationSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        kind={kind}
        onSaved={(c) => {
          setSelected(c);
          if (!c.id.startsWith("temp-")) {
            setContacts((prev) => [c, ...prev.filter((x) => x.id !== c.id)]);
          }
        }}
      />
    </div>
  );
}
