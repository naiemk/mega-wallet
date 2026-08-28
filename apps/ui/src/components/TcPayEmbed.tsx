import { useTranslation } from "react-i18next";
import { withTcCheckoutParams, withTcEmbedProxy } from "../lib/tc-pay-url";
import { Icon } from "./Icon";
import { PrimaryButton } from "./PrimaryButton";

function openCheckout(payUrl: string, language: string) {
  const href = withTcCheckoutParams(payUrl, { language, mode: "standalone" });
  window.open(href, "_blank", "noopener,noreferrer");
}

/**
 * Hosted TC checkout in an iframe via same-origin `/api/tc-embed` proxy
 * (strips TC X-Frame-Options; works locally and on the deployed app).
 * Keeps a new-tab fallback.
 */
export function TcPayEmbed({
  payUrl,
  className = "",
  minHeight = 720,
}: {
  payUrl: string;
  className?: string;
  minHeight?: number;
  /** @deprecated Auto-open disabled; ignored. */
  autoOpen?: boolean;
}) {
  const { t, i18n } = useTranslation();

  const embedSrc = withTcEmbedProxy(
    withTcCheckoutParams(payUrl, { language: i18n.language, mode: "embed" }),
  );
  const standaloneHref = withTcCheckoutParams(payUrl, {
    language: i18n.language,
    mode: "standalone",
  });

  return (
    <div className={`flex flex-col gap-sm ${className}`}>
      <div className="rounded-xl overflow-hidden border border-outline-variant bg-surface-container-lowest shadow-[0_2px_8px_rgba(11,28,48,0.08)]">
        <iframe
          src={embedSrc}
          title={t("openPayment")}
          className="w-full border-0 block bg-surface"
          style={{ minHeight }}
          allow="payment *; publickey-credentials-get *; clipboard-write *"
          referrerPolicy="strict-origin-when-cross-origin"
          loading="eager"
          // Block top-navigation so a framed checkout cannot escape the wallet UI
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads allow-top-navigation-by-user-activation"
        />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-sm">
        <PrimaryButton variant="surface" onClick={() => openCheckout(payUrl, i18n.language)}>
          {t("openPaymentNewTab")}
          <Icon name="open_in_new" />
        </PrimaryButton>
        <a
          href={standaloneHref}
          target="_blank"
          rel="noopener noreferrer"
          className="font-label-md text-label-md text-primary underline"
        >
          {t("openPayment")}
        </a>
      </div>
    </div>
  );
}
