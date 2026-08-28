import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, apiOptional } from "../lib/api";
import { translateApiError } from "../lib/api-error";
import { isOperatorRole, webAuthnAvailable } from "../lib/auth-login";
import { authClient } from "../lib/auth-client";
import { Icon } from "../components/Icon";
import { SettingsRow } from "../components/SettingsRow";
import { SurfaceCard } from "../components/SurfaceCard";

interface Me {
  user?: { name?: string | null; email?: string | null; emailVerified?: boolean | null };
  profile?: { emailVerified?: boolean | null; role?: string | null };
  affiliateLink?: string;
  affiliateEarnedUsdCents?: number;
}

const LANG_LABELS: Record<string, string> = {
  en: "English",
  fa: "فارسی",
  ar: "العربية",
};

export function AccountPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Me | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [supportsPasskey, setSupportsPasskey] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSupportsPasskey(webAuthnAvailable());
    void apiOptional<Me>("/api/me")
      .then((me) => {
        if (!me?.user) {
          navigate("/login?next=/account", { replace: true });
          return;
        }
        setProfile(me);
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  async function signOut() {
    setMessage("");
    setBusy(true);
    try {
      await authClient.signOut();
      setProfile(null);
      setMessage(t("signedOut"));
      navigate("/login", { replace: true });
    } catch (e) {
      setMessage(translateApiError(e, t));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <p className="px-container-margin py-lg text-on-surface-variant font-body-md text-body-md">
        {t("loading")}
      </p>
    );
  }

  if (!profile?.user) {
    return null;
  }

  const displayName = profile.user.name || t("guest");
  const displayEmail = profile.user.email || "";
  const isVerified = Boolean(profile.user.emailVerified || profile.profile?.emailVerified);
  const isOperator = isOperatorRole(profile.profile?.role);
  const initials = (displayName || "U")
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="px-container-margin py-lg flex flex-col gap-lg max-w-md mx-auto w-full">
      <SurfaceCard className="p-md flex items-center gap-md">
        <div className="w-16 h-16 rounded-full bg-primary text-on-primary flex items-center justify-center font-display-md text-display-md shrink-0">
          {initials}
        </div>
        <div className="flex flex-col min-w-0">
          <h2 className="font-display-md-mobile text-display-md-mobile text-primary m-0 truncate">
            {displayName}
          </h2>
          {displayEmail && (
            <p className="font-body-md text-body-md text-on-surface-variant m-0 truncate">
              {displayEmail}
            </p>
          )}
          {isVerified && (
            <div className="mt-xs inline-flex items-center gap-xs bg-surface-container-low px-2 py-1 rounded-full w-fit">
              <Icon name="verified_user" filled className="text-[14px]! text-secondary" />
              <span className="font-label-md text-label-md text-secondary">{t("verified")}</span>
            </div>
          )}
        </div>
      </SurfaceCard>

      <section className="flex flex-col gap-sm">
        <h3 className="font-label-md text-label-md text-outline uppercase tracking-wider ps-xs">
          {t("security")}
        </h3>
        <SurfaceCard>
          <SettingsRow
            icon="account_balance"
            title={t("bankAccounts")}
            subtitle={t("shebaTab") + " / " + t("cardTab")}
            onClick={() => navigate("/account/banks")}
          />
          {supportsPasskey && (
            <SettingsRow
              icon="fingerprint"
              title={t("passkeys")}
              subtitle={t("passkeysManageHint")}
              onClick={() => navigate("/account/passkeys")}
            />
          )}
          <SettingsRow
            icon="logout"
            title={t("signOut")}
            subtitle={displayEmail}
            onClick={() => void signOut()}
            border={false}
          />
        </SurfaceCard>
      </section>

      <section className="flex flex-col gap-sm">
        <h3 className="font-label-md text-label-md text-outline uppercase tracking-wider ps-xs">
          {t("invite")}
        </h3>
        <SurfaceCard>
          <div className="p-md">
            <p className="font-body-md text-body-md text-on-surface-variant">
              {t("affiliateEarned")}: ${((profile.affiliateEarnedUsdCents ?? 0) / 100).toFixed(2)}
            </p>
            {profile.affiliateLink && (
              <p className="font-body-md text-body-md text-primary break-all mt-sm">
                {profile.affiliateLink}
              </p>
            )}
            <Link
              to="/invite"
              className="inline-block mt-md font-label-md text-label-md text-primary underline"
            >
              {t("invite")}
            </Link>
          </div>
        </SurfaceCard>
      </section>

      <section className="flex flex-col gap-sm">
        <h3 className="font-label-md text-label-md text-outline uppercase tracking-wider ps-xs">
          {t("preferences")}
        </h3>
        <SurfaceCard>
          <SettingsRow
            icon="language"
            title={t("language")}
            subtitle={LANG_LABELS[i18n.language] ?? i18n.language}
            onClick={() => navigate("/account/language")}
            border={false}
          />
        </SurfaceCard>
      </section>

      <section className="flex flex-col gap-sm">
        <h3 className="font-label-md text-label-md text-outline uppercase tracking-wider ps-xs">
          {t("more")}
        </h3>
        <SurfaceCard>
          {isOperator && (
            <SettingsRow
              icon="admin_panel_settings"
              title={t("operator")}
              subtitle={t("operatorHint")}
              onClick={() => navigate("/operator")}
            />
          )}
          <SettingsRow
            icon="group_add"
            title={t("invite")}
            subtitle={t("inviteHint")}
            onClick={() => navigate("/invite")}
            border={isOperator}
          />
        </SurfaceCard>
      </section>

      {message && <p className="font-body-md text-body-md text-secondary">{message}</p>}
    </div>
  );
}
