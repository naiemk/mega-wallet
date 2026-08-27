import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { withTcCheckoutParams } from "../lib/tc-pay-url";
import { Icon } from "./Icon";
import { PrimaryButton } from "./PrimaryButton";

/**
 * Real TC edge currently sends `X-Frame-Options: DENY` on `/pay`, so Chrome
 * shows "refused to connect" for cross-origin iframes (pool / local → testnet).
 * Only same-machine fake checkout hosts are safe to embed.
 */
function canEmbedCheckout(payUrl: string): boolean {
  try {
    const host = new URL(payUrl).hostname;
    if (host.includes("trustless-commerce") || host.includes("trustlesscommerce")) {
      return false;
    }
    return host.endsWith("localhost") || host === "127.0.0.1";
  } catch {
    return false;
  }
}

function openCheckout(payUrl: string, language: string) {
  const href = withTcCheckoutParams(payUrl, { language, mode: "standalone" });
  window.open(href, "_blank", "noopener,noreferrer");
}

/**
 * Hosted TC checkout: embed when allowed, otherwise launch in a new tab.
 */
export function TcPayEmbed({
  payUrl,
  className = "",
  minHeight = 720,
  autoOpen = false,
}: {
  payUrl: string;
  className?: string;
  minHeight?: number;
  /** Open standalone checkout once when embed is not available. Default off — open only on click. */
  autoOpen?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const openedKey = useRef<string | null>(null);

  const embeddable = canEmbedCheckout(payUrl);
  const standaloneHref = withTcCheckoutParams(payUrl, {
    language: i18n.language,
    mode: "standalone",
  });

  useEffect(() => {
    if (!autoOpen || embeddable || !payUrl) return;
    if (openedKey.current === payUrl) return;
    openedKey.current = payUrl;
    openCheckout(payUrl, i18n.language);
  }, [autoOpen, embeddable, payUrl, i18n.language]);

  if (embeddable) {
    const src = withTcCheckoutParams(payUrl, { language: i18n.language, mode: "embed" });
    return (
      <div
        className={`rounded-xl overflow-hidden border border-outline-variant bg-surface-container-lowest shadow-[0_2px_8px_rgba(11,28,48,0.08)] ${className}`}
      >
        <iframe
          src={src}
          title={t("openPayment")}
          className="w-full border-0 block bg-surface"
          style={{ minHeight }}
          allow="payment *; publickey-credentials-get *; clipboard-write *"
          referrerPolicy="strict-origin-when-cross-origin"
          loading="eager"
        />
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-outline-variant bg-surface-container-lowest p-md flex flex-col gap-md shadow-[0_2px_8px_rgba(11,28,48,0.08)] ${className}`}
    >
      <div className="flex items-start gap-md">
        <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
          <Icon name="open_in_new" />
        </div>
        <div className="min-w-0">
          <p className="font-body-lg text-body-lg text-on-background m-0">{t("openPayment")}</p>
          <p className="font-body-md text-body-md text-on-surface-variant m-0 mt-xs">
            {t("checkoutOpensExternally")}
          </p>
        </div>
      </div>
      <PrimaryButton onClick={() => openCheckout(payUrl, i18n.language)}>
        {t("openPayment")}
        <Icon name="open_in_new" />
      </PrimaryButton>
      <a
        href={standaloneHref}
        target="_blank"
        rel="noopener noreferrer"
        className="font-label-md text-label-md text-primary underline self-center"
      >
        {t("openPaymentNewTab")}
      </a>
    </div>
  );
}
