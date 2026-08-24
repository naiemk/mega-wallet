import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

const langs = [
  { code: "en", flag: "🇺🇸" },
  { code: "fa", flag: "🇮🇷" },
  { code: "ar", flag: "🇸🇦" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  const rtl = i18n.language === "fa" || i18n.language === "ar";

  return (
    <div dir={rtl ? "rtl" : "ltr"} className="mx-auto min-h-dvh max-w-md px-4 pb-24 pt-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold tracking-tight">{t("appName")}</h1>
        <select
          className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-sm"
          value={i18n.language}
          onChange={(e) => {
            i18n.changeLanguage(e.target.value);
            localStorage.setItem("mw-lang", e.target.value);
            document.documentElement.lang = e.target.value;
            document.documentElement.dir = e.target.value === "fa" || e.target.value === "ar" ? "rtl" : "ltr";
          }}
        >
          {langs.map((l) => (
            <option key={l.code} value={l.code}>
              {l.flag} {l.code.toUpperCase()}
            </option>
          ))}
        </select>
      </header>
      {children}
      <nav className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md justify-around border-t border-white/10 bg-slate-950/95 px-2 py-3 backdrop-blur">
        <Tab to="/" label={t("exchange")} />
        <Tab to="/wallet" label={t("wallet")} />
        <Tab to="/history" label={t("history")} />
        <Tab to="/account" label={t("account")} />
      </nav>
    </div>
  );
}

function Tab({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-lg px-3 py-1 text-xs ${isActive ? "bg-emerald-500/20 text-emerald-300" : "text-slate-400"}`
      }
    >
      {label}
    </NavLink>
  );
}
