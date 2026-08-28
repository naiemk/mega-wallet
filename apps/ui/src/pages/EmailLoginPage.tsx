import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { apiOptional } from "../lib/api";
import { translateApiError } from "../lib/api-error";
import { consumeReturnTo } from "../lib/auth-redirect";
import { finishLoginNavigate } from "../lib/auth-login";
import { getSavedAuthEmail, rememberAuthEmail } from "../lib/auth-storage";
import { authClient } from "../lib/auth-client";
import { acceptIntegerDigits, displayNumeric } from "../lib/numeric-input";
import { FloatingField } from "../components/FloatingField";
import { PrimaryButton } from "../components/PrimaryButton";
import { SurfaceCard } from "../components/SurfaceCard";

type Step = "credentials" | "otp";

export function EmailLoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = getSavedAuthEmail();
    if (saved) setEmail(saved);
    void apiOptional<{ user?: { email?: string | null; name?: string | null } }>("/api/me").then(
      (me) => {
        if (me?.user) {
          navigate(consumeReturnTo(location.search) || "/", { replace: true });
        }
      },
    );
  }, [location.search, navigate]);

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
      const session = await authClient.getSession();
      finishLoginNavigate(navigate, {
        method: "emailOtp",
        search: location.search,
        user: session.data?.user ?? { email },
      });
    } catch (e) {
      setMessage(translateApiError(e, t));
    } finally {
      setBusy(false);
    }
  }

  const successMessage = message === t("otpSent");

  return (
    <div className="px-container-margin py-lg flex flex-col gap-lg max-w-md mx-auto w-full">
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
                  successMessage
                    ? "bg-secondary-container text-on-secondary-container"
                    : "bg-error-container text-on-error-container"
                }`}
                role="alert"
              >
                {message}
              </p>
            )}
            <PrimaryButton disabled={busy} onClick={() => void sendOtp()}>
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
              value={displayNumeric(otp, i18n.language)}
              onChange={(e) => setOtp(acceptIntegerDigits(e.target.value, 8))}
            />
            {message && !successMessage && (
              <p className="font-body-md text-body-md m-0 text-error" role="alert">
                {message}
              </p>
            )}
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

        <Link
          to={`/login${location.search || ""}`}
          className="font-label-md text-label-md text-on-surface-variant underline self-start"
        >
          {t("backToLoginOptions")}
        </Link>
      </SurfaceCard>
    </div>
  );
}
