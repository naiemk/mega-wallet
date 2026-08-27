import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { translateApiError } from "../lib/api-error";

/**
 * TC checkout return target. Settles the invoice via the webhook API, then
 * routes to the deposit or history status page.
 */
export function PaymentReturnPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function settle() {
      const invoiceId = params.get("invoice_id") ?? params.get("invoiceId") ?? "";
      const clientInvoiceId =
        params.get("client_invoice_id") ?? params.get("clientInvoiceId") ?? "";
      const status = params.get("status") ?? "";
      const invoiceAddress =
        params.get("invoice_address") ?? params.get("invoiceAddress") ?? undefined;

      const destFromClientId = (id: string) => {
        if (clientInvoiceId.startsWith("mw-wallet-") || clientInvoiceId === "") {
          return `/deposit/${id}`;
        }
        if (clientInvoiceId.startsWith("mw-")) return `/history/${id}`;
        return `/deposit/${id}`;
      };

      try {
        const result = await api<{ ok: boolean; transferId: string | null }>(
          "/api/webhooks/trustless-commerce",
          {
            method: "POST",
            body: JSON.stringify({
              invoiceId: invoiceId || undefined,
              clientInvoiceId: clientInvoiceId || undefined,
              status: status || undefined,
              invoice: {
                id: invoiceId || undefined,
                clientInvoiceId: clientInvoiceId || undefined,
                status: status || undefined,
                invoiceAddress,
              },
            }),
          },
        );
        if (cancelled) return;
        if (result.transferId) {
          navigate(destFromClientId(result.transferId), { replace: true });
          return;
        }
        navigate("/", { replace: true });
      } catch (e) {
        if (cancelled) return;
        const fallbackId = clientInvoiceId.replace(/^mw-(wallet-)?/, "");
        if (fallbackId && fallbackId !== clientInvoiceId) {
          navigate(destFromClientId(fallbackId), { replace: true });
          return;
        }
        setError(translateApiError(e, t));
      }
    }

    void settle();
    return () => {
      cancelled = true;
    };
  }, [params, navigate, t]);

  if (error) {
    return (
      <div className="px-container-margin py-lg max-w-md mx-auto">
        <p className="text-error font-body-md text-body-md">{error}</p>
        <button
          type="button"
          className="mt-md font-label-md text-label-md text-primary underline bg-transparent border-0 p-0 cursor-pointer"
          onClick={() => navigate("/")}
        >
          {t("backToWallet")}
        </button>
      </div>
    );
  }

  return (
    <p className="px-container-margin py-lg text-on-surface-variant font-body-md text-body-md">
      {t("confirmingPayment")}
    </p>
  );
}
