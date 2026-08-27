import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatDigitsForLocale, irrToToman } from "@mega-wallet/core";
import { api, apiOptional } from "../lib/api";
import { translateApiError } from "../lib/api-error";
import { FloatingField } from "../components/FloatingField";
import { Icon } from "../components/Icon";
import { PrimaryButton } from "../components/PrimaryButton";
import { SurfaceCard } from "../components/SurfaceCard";
import { TransactionRow } from "../components/TransactionRow";

interface FxQuotePayload {
  midRate: number;
  customerRate: number;
  commissionBps: number;
  source: "aggregated" | "operator";
  overrideExpiresAt: string | null;
  fetchedAt: string;
}

interface OperatorFxResponse {
  quote: FxQuotePayload | null;
  override: {
    midRate: number;
    expiresAt: string;
    setByUserId: string;
    createdAt: string;
  } | null;
  rateUnavailable: boolean;
}

export function OperatorPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [requests, setRequests] = useState<
    Array<{ id: string; recipientName?: string | null; phase: string; usdAmountCents?: number }>
  >([]);
  const [dashboard, setDashboard] = useState<{
    count: number;
    unsettled: number;
    volumeUsdCents: number;
  } | null>(null);
  const [fx, setFx] = useState<OperatorFxResponse | null>(null);
  const [midRateText, setMidRateText] = useState("");
  const [ttlHoursText, setTtlHoursText] = useState("6");
  const [fxBusy, setFxBusy] = useState(false);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState("");
  const [fxMessage, setFxMessage] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setError("");
    setDenied(false);
    try {
      const r = await apiOptional<{ requests: typeof requests }>("/api/operator/requests");
      const d = await apiOptional<{ totals: typeof dashboard }>("/api/operator/dashboard");
      const f = await apiOptional<OperatorFxResponse>("/api/operator/fx-rate");
      if (!r || !d) {
        setDenied(true);
        setRequests([]);
        setDashboard(null);
        setFx(null);
        return;
      }
      setRequests(r.requests);
      setDashboard(d.totals);
      setFx(f);
      if (f?.override) {
        setMidRateText(String(f.override.midRate));
      } else if (f?.quote) {
        setMidRateText(String(f.quote.midRate));
      }
    } catch (e) {
      setRequests([]);
      setError(translateApiError(e, t));
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

  async function setOverride() {
    setFxMessage("");
    setFxBusy(true);
    try {
      const midRate = Math.round(Number(midRateText));
      const ttlHours = Math.round(Number(ttlHoursText));
      await api("/api/operator/fx-rate", {
        method: "PUT",
        body: JSON.stringify({ midRate, ttlHours }),
      });
      setFxMessage(t("fxOverrideSet"));
      await load();
    } catch (e) {
      setFxMessage(translateApiError(e, t));
    } finally {
      setFxBusy(false);
    }
  }

  async function clearOverride() {
    setFxMessage("");
    setFxBusy(true);
    try {
      await api("/api/operator/fx-rate", { method: "DELETE" });
      setFxMessage(t("fxOverrideCleared"));
      await load();
    } catch (e) {
      setFxMessage(translateApiError(e, t));
    } finally {
      setFxBusy(false);
    }
  }

  const overrideRemaining =
    fx?.override?.expiresAt != null
      ? Math.max(0, Math.floor((new Date(fx.override.expiresAt).getTime() - Date.now()) / 3_600_000))
      : null;

  return (
    <div className="px-container-margin py-lg flex flex-col gap-lg max-w-xl mx-auto w-full">
      <section className="bg-primary rounded-xl p-lg text-on-primary shadow-[0_4px_16px_rgba(0,10,30,0.15)]">
        <p className="font-label-md text-label-md text-on-primary/80 uppercase tracking-widest">
          {t("operator")}
        </p>
        {dashboard ? (
          <div className="grid grid-cols-3 gap-md mt-md">
            <div>
              <p className="font-label-md text-label-md text-on-primary/70">{t("total")}</p>
              <p className="font-display-md text-display-md">{dashboard.count}</p>
            </div>
            <div>
              <p className="font-label-md text-label-md text-on-primary/70">{t("unsettled")}</p>
              <p className="font-display-md text-display-md">{dashboard.unsettled}</p>
            </div>
            <div>
              <p className="font-label-md text-label-md text-on-primary/70">{t("volume")}</p>
              <p className="font-display-md text-display-md">
                ${(dashboard.volumeUsdCents / 100).toFixed(0)}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-md font-body-md text-body-md text-on-primary/80">
            {denied ? t("operatorDenied") : t("operatorEmpty")}
          </p>
        )}
      </section>

      {error && <p className="font-body-md text-body-md text-error">{error}</p>}

      {!denied && (
        <SurfaceCard className="p-md space-y-md">
          <div>
            <p className="font-label-md text-label-md text-outline uppercase tracking-wider m-0">
              {t("fxRateTitle")}
            </p>
            {fx?.rateUnavailable && !fx.override && (
              <p className="mt-sm font-body-md text-body-md text-error m-0">{t("fxRateBlocked")}</p>
            )}
            {fx?.quote && (
              <div className="mt-sm space-y-xs">
                <p className="font-body-md text-body-md text-on-background m-0">
                  {t("fxSource")}:{" "}
                  {fx.quote.source === "operator" ? t("fxSourceOperator") : t("fxSourceLive")}
                </p>
                <p className="font-body-md text-body-md text-on-surface-variant m-0">
                  {t("fxMidRate")}:{" "}
                  {formatDigitsForLocale(fx.quote.midRate.toLocaleString("en-US"), lang)} IRR
                  {" · "}
                  {formatDigitsForLocale(
                    Math.round(irrToToman(fx.quote.midRate)).toLocaleString("en-US"),
                    lang,
                  )}{" "}
                  {t("toman")}
                </p>
                <p className="font-body-md text-body-md text-on-surface-variant m-0">
                  {t("fxCustomerRate")}:{" "}
                  {formatDigitsForLocale(fx.quote.customerRate.toLocaleString("en-US"), lang)} IRR
                </p>
                {fx.override && overrideRemaining != null && (
                  <p className="font-label-md text-label-md text-primary m-0">
                    {t("fxOverrideRemaining", { hours: overrideRemaining })}
                  </p>
                )}
              </div>
            )}
          </div>

          <FloatingField
            id="fxMidRate"
            label={t("fxMidRateInput")}
            value={midRateText}
            onChange={(e) => setMidRateText(e.target.value)}
            inputMode="numeric"
          />
          {midRateText && Number.isFinite(Number(midRateText)) && (
            <p className="font-label-md text-label-md text-outline m-0 -mt-sm">
              ≈{" "}
              {formatDigitsForLocale(
                Math.round(irrToToman(Number(midRateText))).toLocaleString("en-US"),
                lang,
              )}{" "}
              {t("toman")} / USDT
            </p>
          )}
          <FloatingField
            id="fxTtlHours"
            label={t("fxTtlHours")}
            value={ttlHoursText}
            onChange={(e) => setTtlHoursText(e.target.value)}
            inputMode="numeric"
          />

          <div className="flex flex-col gap-sm">
            <PrimaryButton onClick={() => void setOverride()} disabled={fxBusy}>
              <Icon name="edit" />
              {t("fxSetOverride")}
            </PrimaryButton>
            {fx?.override && (
              <PrimaryButton variant="surface" onClick={() => void clearOverride()} disabled={fxBusy}>
                {t("fxClearOverride")}
              </PrimaryButton>
            )}
          </div>
          {fxMessage && (
            <p className="font-label-md text-label-md text-on-surface-variant m-0">{fxMessage}</p>
          )}
        </SurfaceCard>
      )}

      {!denied && (
        <SurfaceCard>
          {requests.length === 0 ? (
            <p className="p-md font-body-md text-body-md text-on-surface-variant">{t("noRequests")}</p>
          ) : (
            requests.map((r, i) => (
              <div key={r.id}>
                <TransactionRow
                  title={r.recipientName ?? "—"}
                  subtitle={r.phase}
                  amount={
                    r.usdAmountCents != null
                      ? `$${(r.usdAmountCents / 100).toFixed(2)}`
                      : "—"
                  }
                  icon="account_balance"
                  border={i < requests.length - 1 && r.phase !== "withdraw_initiated"}
                />
                {r.phase === "withdraw_initiated" && (
                  <div className="px-md pb-md">
                    <PrimaryButton onClick={() => markReceived(r.id)}>
                      <Icon name="check_circle" />
                      {t("markReceived")}
                    </PrimaryButton>
                  </div>
                )}
              </div>
            ))
          )}
        </SurfaceCard>
      )}
    </div>
  );
}
