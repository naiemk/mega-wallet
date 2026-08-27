import { useTranslation } from "react-i18next";
import { withTcCheckoutParams } from "../lib/tc-pay-url";

function canEmbedCheckout(payUrl: string): boolean {
  try {
    const host = new URL(payUrl).hostname;
    // Real TC hosts only — fake pay URLs must not render a broken iframe
    return (
      host.includes("trustless-commerce") ||
      host.includes("trustlesscommerce") ||
      host.endsWith("localhost") ||
      host === "127.0.0.1"
    );
  } catch {
    return false;
  }
}

/**
 * Hosted TC checkout embed.
 * Uses header=none so TC chrome is hidden. Nested Onramper widgets need
 * payment / publickey / clipboard permissions — avoid restrictive sandbox.
 */
export function TcPayEmbed({
  payUrl,
  className = "",
  minHeight = 720,
}: {
  payUrl: string;
  className?: string;
  minHeight?: number;
}) {
  const { t, i18n } = useTranslation();
  if (!canEmbedCheckout(payUrl)) return null;

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
