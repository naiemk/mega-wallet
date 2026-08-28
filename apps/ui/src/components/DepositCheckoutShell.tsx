import { useTranslation } from "react-i18next";
import { withTcCheckoutParams } from "../lib/tc-pay-url";
import { Icon } from "./Icon";
import { PrimaryButton } from "./PrimaryButton";
import { TcPayEmbed } from "./TcPayEmbed";

function openCheckout(payUrl: string, language: string) {
  const href = withTcCheckoutParams(payUrl, { language, mode: "standalone" });
  window.open(href, "_blank", "noopener,noreferrer");
}

export function DepositCheckoutShell({
  payUrl,
  onCheckStatus,
  checking = false,
}: {
  payUrl: string;
  onCheckStatus: () => void;
  checking?: boolean;
}) {
  const { t, i18n } = useTranslation();

  return (
    <div className="flex flex-col min-h-[calc(100dvh-3.5rem)]">
      <div className="shrink-0 px-container-margin py-sm flex flex-wrap items-center justify-center gap-sm border-b border-outline-variant/20 bg-surface/95">
        <PrimaryButton variant="surface" onClick={() => openCheckout(payUrl, i18n.language)}>
          {t("openPaymentNewTab")}
          <Icon name="open_in_new" />
        </PrimaryButton>
        <PrimaryButton variant="surface" onClick={() => void onCheckStatus()} disabled={checking}>
          <Icon name="refresh" />
          {checking ? t("checkingStatus") : t("checkPaymentStatus")}
        </PrimaryButton>
      </div>
      <div className="flex-1 min-h-0">
        <TcPayEmbed payUrl={payUrl} variant="fullscreen" />
      </div>
    </div>
  );
}
