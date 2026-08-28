import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import branding from "virtual:branding";
import { apiOptional } from "../lib/api";
import { translateApiError } from "../lib/api-error";
import { authClient } from "../lib/auth-client";
import { rememberPasskeyEnrolled, persistEnrolledPasskey } from "../lib/auth-storage";
import { Icon } from "../components/Icon";
import { PrimaryButton } from "../components/PrimaryButton";
import { SurfaceCard } from "../components/SurfaceCard";

interface PasskeyRow {
  id: string;
  name?: string | null;
  createdAt?: string | Date | null;
  deviceType?: string | null;
  backedUp?: boolean | null;
}

function webAuthnAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.PublicKeyCredential !== "undefined";
}

function formatCreated(value: string | Date | null | undefined, locale: string): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(locale);
}

export function PasskeysPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [passkeys, setPasskeys] = useState<PasskeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [justAdded, setJustAdded] = useState(false);
  const [supportsPasskey, setSupportsPasskey] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const loadPasskeys = useCallback(async () => {
    const { data, error: fetchError } = await authClient.$fetch<PasskeyRow[]>(
      "/passkey/list-user-passkeys",
      { method: "GET" },
    );
    if (fetchError) {
      throw new Error(fetchError.message ?? t("passkeyFailed"));
    }
    setPasskeys(Array.isArray(data) ? data : []);
  }, [t]);

  useEffect(() => {
    setSupportsPasskey(webAuthnAvailable());
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const me = await apiOptional<{ user?: { name?: string | null; email?: string | null } }>(
          "/api/me",
        );
        if (!me?.user) {
          navigate("/login?next=/account/passkeys", { replace: true });
          return;
        }
        setDisplayName(me.user.name || me.user.email || branding.name);
        setUserEmail(me.user.email || "");
        await loadPasskeys();
      } catch (e) {
        setError(translateApiError(e, t));
      } finally {
        setLoading(false);
      }
    })();
  }, [loadPasskeys, navigate, t]);

  async function addPasskey() {
    setError("");
    setJustAdded(false);
    setBusy(true);
    try {
      const { data, error: enrollError } = await authClient.passkey.addPasskey({
        name: displayName.split("@")[0] || branding.name,
      });
      if (enrollError || !data) {
        throw new Error(enrollError?.message ?? t("passkeyFailed"));
      }
      rememberPasskeyEnrolled();
      persistEnrolledPasskey(data, { email: userEmail, name: displayName });
      setJustAdded(true);
      await loadPasskeys();
    } catch (e) {
      setError(translateApiError(e, t));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="px-container-margin py-lg max-w-md mx-auto w-full">
        <p className="font-body-md text-body-md text-on-surface-variant">{t("loading")}</p>
      </div>
    );
  }

  const empty = passkeys.length === 0;

  return (
    <div className="px-container-margin py-lg flex flex-col gap-lg max-w-md mx-auto w-full">
      {justAdded && (
        <SurfaceCard className="p-md flex items-center gap-md bg-secondary-container border border-secondary/30">
          <div className="w-12 h-12 rounded-full bg-secondary text-on-secondary flex items-center justify-center shrink-0">
            <Icon name="check" filled className="text-[28px]!" />
          </div>
          <div>
            <p className="font-body-lg text-body-lg text-on-secondary-container m-0">{t("passkeyAdded")}</p>
            <p className="font-body-md text-body-md text-on-secondary-container/80 m-0">
              {t("passkeyAddedHint")}
            </p>
          </div>
        </SurfaceCard>
      )}

      {!supportsPasskey ? (
        <SurfaceCard className="p-md">
          <p className="font-body-md text-body-md text-on-surface-variant m-0">
            {t("passkeyUnavailable")}
          </p>
        </SurfaceCard>
      ) : empty ? (
        <SurfaceCard className="p-md flex flex-col gap-md">
          <div className="flex flex-col items-center text-center gap-sm py-md">
            <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-primary">
              <Icon name="fingerprint" className="text-[32px]!" />
            </div>
            <h2 className="font-display-md-mobile text-display-md-mobile text-primary m-0">
              {t("passkeys")}
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant m-0">
              {t("passkeysEmpty")}
            </p>
          </div>
          <PrimaryButton disabled={busy} onClick={() => void addPasskey()}>
            {busy ? "…" : t("createPasskey")}
          </PrimaryButton>
        </SurfaceCard>
      ) : (
        <>
          <section className="flex flex-col gap-sm">
            <h2 className="font-label-md text-label-md text-outline uppercase tracking-wider ps-xs m-0">
              {t("passkeys")}
            </h2>
            <SurfaceCard>
              {passkeys.map((pk, i) => (
                <div
                  key={pk.id}
                  className={`flex items-center gap-md p-md ${
                    i < passkeys.length - 1 ? "border-b border-outline-variant/30" : ""
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
                    <Icon name="fingerprint" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-body-lg text-body-lg text-primary m-0 truncate">
                      {pk.name?.trim() || t("passkeyDefaultName")}
                    </p>
                    {pk.createdAt && (
                      <p className="font-body-md text-body-md text-on-surface-variant m-0 truncate">
                        {formatCreated(pk.createdAt, i18n.language)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </SurfaceCard>
          </section>

          <PrimaryButton disabled={busy} onClick={() => void addPasskey()} variant="surface">
            {busy ? "…" : t("addAnotherPasskey")}
          </PrimaryButton>
        </>
      )}

      {error && <p className="font-body-md text-body-md text-error m-0">{error}</p>}
    </div>
  );
}
