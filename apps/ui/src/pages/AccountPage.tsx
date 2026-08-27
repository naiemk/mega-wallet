import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, apiOptional } from "../lib/api";
import { translateApiError } from "../lib/api-error";
import { consumeReturnTo } from "../lib/auth-redirect";
import { authClient } from "../lib/auth-client";
import { completePasskeySignIn } from "../lib/passkey-auth";
import {
  getSavedAuthEmail,
  getSavedPasskeyHint,
  rememberAuthEmail,
} from "../lib/auth-storage";
import { FloatingField } from "../components/FloatingField";
import { Icon } from "../components/Icon";
import { PrimaryButton } from "../components/PrimaryButton";
import { SettingsRow } from "../components/SettingsRow";
import { SurfaceCard } from "../components/SurfaceCard";

interface Me {
  user?: { name?: string | null; email?: string | null; emailVerified?: boolean | null };
  profile?: { emailVerified?: boolean | null };
  affiliateLink?: string;
  affiliateEarnedUsdCents?: number;
}

type AuthStep = "credentials" | "otp" | "enroll-passkey";

const LANG_LABELS: Record<string, string> = {
  en: "English",
  fa: "فارسی",
  ar: "العربية",
};

function webAuthnAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.PublicKeyCredential !== "undefined";
}

export function AccountPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [step, setStep] = useState<AuthStep>("credentials");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [profile, setProfile] = useState<Me | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const [passkeyHint, setPasskeyHint] = useState(false);
  const [supportsPasskey, setSupportsPasskey] = useState(true);

  function goAfterAuth() {
    const next = consumeReturnTo(location.search);
    if (next) {
      navigate(next, { replace: true });
      return true;
    }
    return false;
  }

  useEffect(() => {
    const saved = getSavedAuthEmail();
    if (saved) setEmail(saved);
    setPasskeyHint(getSavedPasskeyHint());
    setSupportsPasskey(webAuthnAvailable());
    void apiOptional<Me>("/api/me").then((me) => {
      setProfile(me);
      if (me?.user) goAfterAuth();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function finishPasskeySignIn() {
    setMessage("");
    setBusy(true);
    try {
      const { email: signedEmail } = await completePasskeySignIn({
        fallbackEmail: email,
      });
      setPasskeyHint(true);
      if (signedEmail) setEmail(signedEmail);
      try {
        await refreshProfile();
      } catch {
        // Session cookie may lag behind verify response — read via auth client.
        const session = await authClient.getSession();
        if (!session.data?.user) throw new Error(t("passkeyFailed"));
        setProfile({
          user: session.data.user,
          profile: { emailVerified: session.data.user.emailVerified },
        });
      }
      setMessage(t("signedIn"));
      setStep("credentials");
      goAfterAuth();
    } catch (e) {
      console.error("[passkey] sign-in failed", e);
      setMessage(translateApiError(e, t));
    } finally {
      setBusy(false);
    }
  }

  function setLanguage(lang: string) {
    void i18n.changeLanguage(lang);
    localStorage.setItem("mw-lang", lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "fa" || lang === "ar" ? "rtl" : "ltr";
    setShowLang(false);
  }

  async function refreshProfile() {
    const me = await api<Me>("/api/me");
    setProfile(me);
    return me;
  }

  async function sendOtp() {
    setMessage("");
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setMessage(t("emailRequired"));
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setMessage(t("nameRequired"));
      return;
    }
    setBusy(true);
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email: trimmed,
        type: "sign-in",
      });
      if (error) throw new Error(error.message ?? t("otpSendFailed"));
      setEmail(trimmed);
      setStep("otp");
      setMessage(t("otpSent"));
    } catch (e) {
      setMessage(translateApiError(e, t));
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    setMessage("");
    const code = otp.trim();
    if (code.length < 6) {
      setMessage(t("otpInvalid"));
      return;
    }
    setBusy(true);
    try {
      const { error } = await authClient.signIn.emailOtp({
        email: email.trim().toLowerCase(),
        otp: code,
        name: name.trim() || undefined,
      });
      if (error) throw new Error(error.message ?? t("otpInvalid"));
      rememberAuthEmail(email);
      await refreshProfile();
      setMessage(t("signedIn"));
      if (supportsPasskey && !passkeyHint) {
        setStep("enroll-passkey");
      } else {
        setStep("credentials");
        setOtp("");
        goAfterAuth();
      }
    } catch (e) {
      setMessage(translateApiError(e, t));
    } finally {
      setBusy(false);
    }
  }

  async function signInWithPasskey() {
    await finishPasskeySignIn();
  }

  async function signOut() {
    setMessage("");
    setBusy(true);
    try {
      await authClient.signOut();
      setProfile(null);
      setStep("credentials");
      setOtp("");
      setMessage(t("signedOut"));
    } catch (e) {
      setMessage(translateApiError(e, t));
    } finally {
      setBusy(false);
    }
  }

  const displayName = profile?.user?.name || t("guest");
  const displayEmail = profile?.user?.email || "";
  const isVerified = Boolean(profile?.user?.emailVerified || profile?.profile?.emailVerified);
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
          {profile?.user && isVerified && (
            <div className="mt-xs inline-flex items-center gap-xs bg-surface-container-low px-2 py-1 rounded-full w-fit">
              <Icon name="verified_user" filled className="text-[14px]! text-secondary" />
              <span className="font-label-md text-label-md text-secondary">{t("verified")}</span>
            </div>
          )}
        </div>
      </SurfaceCard>

      {!profile?.user ? (
        <SurfaceCard className="p-md flex flex-col gap-md">
          {step === "credentials" && (
            <>
              <div className="flex gap-md">
                <button
                  type="button"
                  className={`font-label-md text-label-md ${mode === "login" ? "text-primary" : "text-on-surface-variant"}`}
                  onClick={() => setMode("login")}
                >
                  {t("login")}
                </button>
                <button
                  type="button"
                  className={`font-label-md text-label-md ${mode === "signup" ? "text-primary" : "text-on-surface-variant"}`}
                  onClick={() => setMode("signup")}
                >
                  {t("signup")}
                </button>
              </div>
              {mode === "signup" && (
                <FloatingField
                  id="name"
                  label={t("name")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              )}
              <FloatingField
                id="email"
                label={t("email")}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              {message && (
                <p
                  className={`font-body-md text-body-md m-0 rounded-lg px-md py-sm ${
                    message === t("signedIn") || message === t("otpSent")
                      ? "bg-secondary-container text-on-secondary-container"
                      : "bg-error-container text-on-error-container"
                  }`}
                  role="alert"
                >
                  {message}
                </p>
              )}
              {mode === "login" && supportsPasskey && (
                <PrimaryButton disabled={busy} onClick={() => void signInWithPasskey()}>
                  {busy ? "…" : t("continueWithPasskey")}
                </PrimaryButton>
              )}
              <PrimaryButton
                disabled={busy}
                onClick={() => void sendOtp()}
                variant={mode === "login" && supportsPasskey ? "surface" : "primary"}
              >
                {t("emailMeCode")}
              </PrimaryButton>
            </>
          )}

          {step === "otp" && (
            <>
              <p className="font-body-md text-body-md text-on-surface-variant m-0">
                {t("otpHint", { email })}
              </p>
              <FloatingField
                id="otp"
                label={t("otpCode")}
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
              />
              <PrimaryButton disabled={busy} onClick={() => void verifyOtp()}>
                {t("verifyCode")}
              </PrimaryButton>
              <button
                type="button"
                className="font-label-md text-label-md text-on-surface-variant underline self-start"
                disabled={busy}
                onClick={() => {
                  setStep("credentials");
                  setOtp("");
                  setMessage("");
                }}
              >
                {t("back")}
              </button>
            </>
          )}
        </SurfaceCard>
      ) : (
        <>
          {step === "enroll-passkey" && supportsPasskey && (
            <SurfaceCard className="p-md flex flex-col gap-md">
              <p className="font-body-md text-body-md text-on-surface m-0">{t("passkeyEnrollHint")}</p>
              <PrimaryButton
                disabled={busy}
                onClick={() => {
                  setStep("credentials");
                  setOtp("");
                  navigate("/account/passkeys");
                }}
              >
                {t("createPasskey")}
              </PrimaryButton>
              <button
                type="button"
                className="font-label-md text-label-md text-on-surface-variant underline self-start"
                disabled={busy}
                onClick={() => {
                  setStep("credentials");
                  setOtp("");
                  setMessage(t("passkeySkipped"));
                  goAfterAuth();
                }}
              >
                {t("skipForNow")}
              </button>
            </SurfaceCard>
          )}
          {step === "enroll-passkey" && !supportsPasskey && (
            <SurfaceCard className="p-md flex flex-col gap-md">
              <p className="font-body-md text-body-md text-on-surface-variant m-0">
                {t("passkeyUnavailable")}
              </p>
              <PrimaryButton
                onClick={() => {
                  setStep("credentials");
                  goAfterAuth();
                }}
              >
                {t("continue")}
              </PrimaryButton>
            </SurfaceCard>
          )}

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
                  {t("affiliateEarned")}: $
                  {((profile.affiliateEarnedUsdCents ?? 0) / 100).toFixed(2)}
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
        </>
      )}

      <section className="flex flex-col gap-sm">
        <h3 className="font-label-md text-label-md text-outline uppercase tracking-wider ps-xs">
          {t("preferences")}
        </h3>
        <SurfaceCard>
          <SettingsRow
            icon="language"
            title={t("language")}
            subtitle={LANG_LABELS[i18n.language] ?? i18n.language}
            onClick={() => setShowLang((v) => !v)}
            border={false}
            trailing={
              <select
                aria-label={t("language")}
                className="font-body-md text-body-md text-on-surface-variant bg-transparent border-0 outline-none"
                value={i18n.language}
                onChange={(e) => setLanguage(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="en">English</option>
                <option value="fa">فارسی</option>
                <option value="ar">العربية</option>
              </select>
            }
          />
          {showLang && (
            <div className="px-md pb-md flex gap-sm">
              {(["en", "fa", "ar"] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  className={`px-3 py-1 rounded-full font-label-md text-label-md ${
                    i18n.language === lang
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container text-on-surface"
                  }`}
                  onClick={() => setLanguage(lang)}
                >
                  {LANG_LABELS[lang]}
                </button>
              ))}
            </div>
          )}
        </SurfaceCard>
      </section>

      <section className="flex flex-col gap-sm">
        <h3 className="font-label-md text-label-md text-outline uppercase tracking-wider ps-xs">
          {t("more")}
        </h3>
        <SurfaceCard>
          <SettingsRow
            icon="admin_panel_settings"
            title={t("operator")}
            subtitle={t("operatorHint")}
            onClick={() => navigate("/operator")}
          />
          <SettingsRow
            icon="group_add"
            title={t("invite")}
            subtitle={t("inviteHint")}
            onClick={() => navigate("/invite")}
            border={false}
          />
        </SurfaceCard>
      </section>

      {message && <p className="font-body-md text-body-md text-secondary">{message}</p>}
    </div>
  );
}
