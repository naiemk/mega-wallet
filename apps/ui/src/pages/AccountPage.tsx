import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, authSignIn, authSignUp } from "../lib/api";

export function AccountPage() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [profile, setProfile] = useState<{ affiliateLink?: string; affiliateEarnedUsdCents?: number } | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void api<{ affiliateLink?: string; affiliateEarnedUsdCents?: number }>("/api/me")
      .then(setProfile)
      .catch(() => setProfile(null));
  }, []);

  async function submit() {
    setMessage("");
    try {
      if (mode === "signup") await authSignUp(email, password, name);
      else await authSignIn(email, password);
      const me = await api<typeof profile>("/api/me");
      setProfile(me);
      setMessage("Signed in");
    } catch (e) {
      setMessage(String(e));
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t("account")}</h2>
      {!profile?.affiliateLink ? (
        <div className="card space-y-2">
          <div className="flex gap-2 text-sm">
            <button className={mode === "login" ? "text-emerald-300" : "text-slate-400"} onClick={() => setMode("login")}>
              {t("login")}
            </button>
            <button className={mode === "signup" ? "text-emerald-300" : "text-slate-400"} onClick={() => setMode("signup")}>
              {t("signup")}
            </button>
          </div>
          {mode === "signup" && (
            <input className="input" placeholder={t("name")} value={name} onChange={(e) => setName(e.target.value)} />
          )}
          <input className="input" placeholder={t("email")} value={email} onChange={(e) => setEmail(e.target.value)} />
          <input
            className="input"
            type="password"
            placeholder={t("password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="btn-primary" onClick={submit}>
            {mode === "signup" ? t("signup") : t("login")}
          </button>
        </div>
      ) : (
        <div className="card space-y-2 text-sm">
          <p>
            {t("affiliateEarned")}: ${((profile.affiliateEarnedUsdCents ?? 0) / 100).toFixed(2)}
          </p>
          <p className="break-all text-slate-300">{profile.affiliateLink}</p>
        </div>
      )}
      {message && <p className="text-sm text-emerald-300">{message}</p>}
    </div>
  );
}
