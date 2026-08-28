import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiOptional } from "../lib/api";
import { translateApiError } from "../lib/api-error";
import { finishLoginNavigate, socialCallbackUrl, webAuthnAvailable } from "../lib/auth-login";
import { consumeReturnTo } from "../lib/auth-redirect";
import {
  canUsePasskeyLogin,
  getSavedPasskeys,
  type SavedPasskey,
} from "../lib/auth-storage";
import { authClient } from "../lib/auth-client";
import { completePasskeySignIn } from "../lib/passkey-auth";
import { AuthDivider } from "../components/auth/AuthDivider";
import { BiometricSignInButton } from "../components/auth/BiometricSignInButton";
import { SavedPasskeyList } from "../components/auth/SavedPasskeyList";
import { SocialSignInButton } from "../components/auth/SocialSignInButton";
import { SurfaceCard } from "../components/SurfaceCard";

interface AuthProviders {
  google?: boolean;
  apple?: boolean;
  telegram?: boolean;
  passkey?: boolean;
  emailOtp?: boolean;
}

type SocialProvider = "google" | "apple" | "telegram";

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [providers, setProviders] = useState<AuthProviders>({ passkey: true, emailOtp: true });
  const [passkeys, setPasskeys] = useState<SavedPasskey[]>([]);
  const supportsPasskey = webAuthnAvailable();
  const returningPasskeyUser = supportsPasskey && canUsePasskeyLogin();

  useEffect(() => {
    setPasskeys(getSavedPasskeys());
    void apiOptional<{ user?: unknown }>("/api/me").then((me) => {
      if (me?.user) {
        navigate(consumeReturnTo(location.search) || "/", { replace: true });
      }
    });
    void fetch("/api/auth/providers")
      .then((r) => r.json())
      .then((p: AuthProviders) => setProviders((prev) => ({ ...prev, ...p })))
      .catch(() => {});
  }, [location.search, navigate]);

  async function finishPasskeyLogin(opts?: {
    credentialId?: string;
    transports?: string[];
    fallbackEmail?: string;
  }) {
    setMessage("");
    setBusy(true);
    try {
      const { email } = await completePasskeySignIn(opts);
      const session = await authClient.getSession();
      finishLoginNavigate(navigate, {
        method: "passkey",
        search: location.search,
        user: {
          email: email || session.data?.user?.email,
          name: session.data?.user?.name,
        },
      });
    } catch (e) {
      console.error("[passkey] sign-in failed", e);
      setMessage(translateApiError(e, t));
    } finally {
      setBusy(false);
    }
  }

  async function signInWithPasskey(passkey: SavedPasskey) {
    const fallbackEmail =
      passkey.identityKind === "email" ? passkey.identityLabel : undefined;
    await finishPasskeyLogin({
      credentialId: passkey.credentialId,
      transports: passkey.transports,
      fallbackEmail,
    });
  }

  async function signInWithDiscoverablePasskey() {
    await finishPasskeyLogin();
  }

  async function signInWithSocial(provider: SocialProvider) {
    setMessage("");
    setBusy(true);
    try {
      await authClient.signIn.social({
        provider,
        callbackURL: socialCallbackUrl(location.search),
      });
    } catch (e) {
      setMessage(translateApiError(e, t));
      setBusy(false);
    }
  }

  const emailLink = `/login/email${location.search || ""}`;
  const hasPasskeyList = passkeys.length > 0;
  const showDiscoverablePasskey = returningPasskeyUser && !hasPasskeyList;
  const hasIdentityOptions =
    providers.google || providers.apple || providers.telegram || providers.emailOtp !== false;

  return (
    <div className="px-container-margin py-lg flex flex-col gap-lg max-w-md mx-auto w-full min-h-full justify-center">
      <div className="text-center space-y-xs">
        <h2 className="font-display-md-mobile text-display-md-mobile text-primary m-0">
          {t("loginWelcome")}
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant m-0">
          {returningPasskeyUser ? t("loginSubtitleReturning") : t("loginSubtitle")}
        </p>
      </div>

      <SurfaceCard className="p-md flex flex-col gap-md">
        {returningPasskeyUser && hasPasskeyList && (
          <SavedPasskeyList
            passkeys={passkeys}
            busy={busy}
            title={t("savedPasskeys")}
            onSelect={(pk) => void signInWithPasskey(pk)}
          />
        )}

        {showDiscoverablePasskey && (
          <BiometricSignInButton
            busy={busy}
            label={t("loginWithPasskey")}
            onClick={() => void signInWithDiscoverablePasskey()}
          />
        )}

        {returningPasskeyUser && hasIdentityOptions && (
          <AuthDivider label={t("orContinueWith")} />
        )}

        {providers.google && (
          <SocialSignInButton
            provider="google"
            busy={busy}
            label={t("continueWithGoogle")}
            onClick={() => void signInWithSocial("google")}
          />
        )}
        {providers.telegram && (
          <SocialSignInButton
            provider="telegram"
            busy={busy}
            label={t("continueWithTelegram")}
            onClick={() => void signInWithSocial("telegram")}
          />
        )}
        {providers.apple && (
          <SocialSignInButton
            provider="apple"
            busy={busy}
            label={t("continueWithApple")}
            onClick={() => void signInWithSocial("apple")}
          />
        )}

        {message && (
          <p
            className="font-body-md text-body-md m-0 rounded-lg px-md py-sm bg-error-container text-on-error-container"
            role="alert"
          >
            {message}
          </p>
        )}

        <Link
          to={emailLink}
          className="font-label-md text-label-md text-primary underline text-center self-center"
        >
          {t("signInWithEmail")}
        </Link>
      </SurfaceCard>
    </div>
  );
}
