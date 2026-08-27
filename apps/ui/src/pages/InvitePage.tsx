import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiOptional } from "../lib/api";
import { Icon } from "../components/Icon";
import { PrimaryButton } from "../components/PrimaryButton";
import { SurfaceCard } from "../components/SurfaceCard";

export function InvitePage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const ref = params.get("ref");
  const [earned, setEarned] = useState(0);
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void apiOptional<{ affiliateLink?: string; affiliateEarnedUsdCents?: number }>("/api/me").then(
      (me) => {
        if (me?.affiliateLink) setLink(me.affiliateLink);
        if (me?.affiliateEarnedUsdCents != null) setEarned(me.affiliateEarnedUsdCents);
      },
    );
  }, []);

  async function copyLink() {
    const text = link || (ref ? `${window.location.origin}/invite?ref=${ref}` : "");
    if (!text) return;
    await navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="px-container-margin py-lg flex flex-col gap-lg max-w-md mx-auto">
      <section className="bg-primary rounded-xl p-lg text-on-primary shadow-[0_4px_16px_rgba(0,10,30,0.15)]">
        <p className="font-label-md text-label-md text-on-primary/80 uppercase tracking-widest">
          {t("affiliateEarned")}
        </p>
        <div className="flex items-baseline gap-xs mt-sm">
          <span className="font-display-md text-display-md text-on-primary/80">$</span>
          <span className="font-numeric-xl text-numeric-xl tracking-tight">
            {(earned / 100).toFixed(2)}
          </span>
        </div>
      </section>

      <SurfaceCard className="p-md">
        {ref ? (
          <p className="font-body-md text-body-md text-on-surface">
            {t("inviteWelcome", { code: ref })}
          </p>
        ) : (
          <p className="font-body-md text-body-md text-on-surface-variant">{t("inviteShare")}</p>
        )}
        {(link || ref) && (
          <div className="mt-md flex items-center justify-between gap-md p-md rounded-lg bg-surface-container-low border border-surface-variant">
            <p className="font-body-md text-body-md text-primary break-all min-w-0">
              {link || `${window.location.origin}/invite?ref=${ref}`}
            </p>
            <button
              type="button"
              className="shrink-0 text-primary"
              onClick={copyLink}
              aria-label={t("copy")}
            >
              <Icon name="content_copy" />
            </button>
          </div>
        )}
        <div className="mt-md">
          <PrimaryButton onClick={copyLink} disabled={!link && !ref}>
            <Icon name="share" />
            {copied ? t("copied") : t("copyLink")}
          </PrimaryButton>
        </div>
      </SurfaceCard>
    </div>
  );
}
