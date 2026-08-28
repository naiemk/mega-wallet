import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import branding from "virtual:branding";
import { apiOptional } from "../lib/api";
import { translateApiError } from "../lib/api-error";
import { consumeReturnTo } from "../lib/auth-redirect";
import { webAuthnAvailable } from "../lib/auth-login";
import {
  hasLocalPasskeyForIdentity,
  persistEnrolledPasskey,
  rememberWallet,
} from "../lib/auth-storage";
import { authClient } from "../lib/auth-client";
import { PrimaryButton } from "../components/PrimaryButton";
import { SurfaceCard } from "../components/SurfaceCard";

export function PasskeyEnrollPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const supportsPasskey = webAuthnAvailable();

  function goNext() {
    const next = consumeReturnTo(location.search) || "/";
    navigate(next, { replace: true });
  }

  useEffect(() => {
    void apiOptional<{ user?: { name?: string | null; email?: string | null } }>("/api/me").then(
      (me) => {
        if (!me?.user) {
          navigate(`/login${location.search}`, { replace: true });
          return;
        }
        const email = me.user.email ?? "";
        setUserEmail(email);
        setDisplayName(me.user.name || email || branding.name);
        if (email) {
          rememberWallet({ email, name: me.user.name });
        }
        if (!supportsPasskey) {
          goNext();
          return;
        }
        if (email && hasLocalPasskeyForIdentity(email)) {
          goNext();
        }
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createPasskey() {
    setMessage("");
    setBusy(true);
    try {
      const { data, error } = await authClient.passkey.addPasskey({
        name: displayName.split("@")[0] || branding.name,
      });
      if (error || !data) throw new Error(error?.message ?? t("passkeyFailed"));
      persistEnrolledPasskey(data, { email: userEmail, name: displayName });
      goNext();
    } catch (e) {
      setMessage(translateApiError(e, t));
    } finally {
      setBusy(false);
    }
  }

  if (!supportsPasskey) {
    return null;
  }

  return (
    <div className="px-container-margin py-lg flex flex-col gap-lg max-w-md mx-auto w-full min-h-full justify-center">
      <SurfaceCard className="p-md flex flex-col gap-md">
        <p className="font-body-md text-body-md text-on-surface m-0">{t("passkeyEnrollHint")}</p>
        {message && (
          <p className="font-body-md text-body-md m-0 text-error" role="alert">
            {message}
          </p>
        )}
        <PrimaryButton disabled={busy} onClick={() => void createPasskey()}>
          {t("createPasskey")}
        </PrimaryButton>
        <button
          type="button"
          className="font-label-md text-label-md text-on-surface-variant underline self-start"
          disabled={busy}
          onClick={goNext}
        >
          {t("skipForNow")}
        </button>
      </SurfaceCard>
    </div>
  );
}
