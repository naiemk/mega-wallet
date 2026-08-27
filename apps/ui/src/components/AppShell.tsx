import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BrandLogo } from "./BrandLogo";
import { Icon } from "./Icon";

const TAB_PATHS = ["/", "/transfer", "/history", "/account"];

function titleForPath(pathname: string, t: (k: string) => string): string {
  if (pathname === "/" || pathname === "/wallet") return t("wallet");
  if (pathname.startsWith("/deposit/") && pathname !== "/deposit") return t("deposit");
  if (pathname === "/deposit") return t("deposit");
  if (pathname.startsWith("/withdraw/") && pathname !== "/withdraw") return t("withdraw");
  if (pathname === "/withdraw") return t("withdraw");
  if (pathname.startsWith("/transfer/recipient")) return t("recipient");
  if (pathname.startsWith("/transfer/deposit")) return t("stepDeposit");
  if (pathname.startsWith("/transfer/status")) return t("status");
  if (pathname.startsWith("/transfer")) return t("transfer");
  if (pathname.startsWith("/history/")) return t("transaction");
  if (pathname.startsWith("/history")) return t("history");
  if (pathname.startsWith("/account/passkeys")) return t("passkeys");
  if (pathname.startsWith("/account")) return t("account");
  if (pathname.startsWith("/operator")) return t("operator");
  if (pathname.startsWith("/invite")) return t("invite");
  return t("wallet");
}

function isRootTab(pathname: string) {
  return TAB_PATHS.includes(pathname) || pathname === "/wallet";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const rtl = i18n.language === "fa" || i18n.language === "ar";
  const showBack = !isRootTab(location.pathname);
  const showWordmark = isRootTab(location.pathname);
  const hideNav =
    location.pathname.startsWith("/transfer/recipient") ||
    location.pathname.startsWith("/transfer/deposit") ||
    location.pathname.startsWith("/transfer/status") ||
    /^\/deposit\/[^/]+$/.test(location.pathname) ||
    /^\/withdraw\/[^/]+$/.test(location.pathname) ||
    /^\/history\/[^/]+$/.test(location.pathname);

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      className="min-h-dvh bg-surface-dim md:bg-[linear-gradient(160deg,#dce9ff_0%,#f8f9ff_45%,#e8fff4_100%)] md:flex md:justify-center md:items-stretch"
    >
      <div className="app-frame w-full max-w-[430px] min-h-dvh mx-auto bg-background text-on-background flex flex-col font-body-md md:shadow-[0_0_0_1px_rgba(11,28,48,0.06),0_24px_64px_rgba(11,28,48,0.14)] md:relative overflow-x-hidden">
        <header className="w-full sticky top-0 bg-surface/95 backdrop-blur-sm border-b border-outline-variant/20 flex items-center justify-between px-container-margin h-14 z-40 shrink-0">
          {showBack ? (
            <button
              type="button"
              className="w-10 h-10 -ms-2 flex items-center justify-center text-primary hover:opacity-80 active:scale-95 rounded-full"
              onClick={() => navigate(-1)}
              aria-label="Back"
            >
              <Icon name={rtl ? "arrow_forward" : "arrow_back"} />
            </button>
          ) : (
            <div className="w-10" />
          )}

          {showWordmark ? (
            <h1 className="absolute inset-x-0 mx-auto w-fit flex items-center justify-center m-0">
              <button
                type="button"
                className="flex items-center justify-center px-2 py-1 rounded-lg hover:bg-surface-container-low/80 active:scale-[0.99] transition-all"
                onClick={() => navigate("/")}
                aria-label={t("appName")}
              >
                <BrandLogo variant="full" />
              </button>
            </h1>
          ) : (
            <h1 className="font-display-md-mobile text-display-md-mobile font-bold text-primary m-0">
              {titleForPath(location.pathname, t)}
            </h1>
          )}

          {showBack ? (
            <button
              type="button"
              className="w-10 h-10 -me-2 flex items-center justify-center rounded-full hover:bg-surface-container-low active:scale-95 transition-colors"
              onClick={() => navigate("/")}
              aria-label={t("appName")}
            >
              <BrandLogo variant="mark" className="opacity-90" />
            </button>
          ) : (
            <div className="w-10" />
          )}
        </header>

        <main className={`flex-1 min-h-0 ${hideNav ? "pb-lg" : "pb-20"}`}>{children}</main>

        {!hideNav && (
          <nav className="sticky bottom-0 z-50 mt-auto bg-surface-container-lowest shadow-[0_-2px_8px_rgba(11,28,48,0.1)] h-16 flex justify-around items-center shrink-0">
            <Tab to="/" icon="account_balance_wallet" label={t("wallet")} end />
            <Tab to="/transfer" icon="swap_horiz" label={t("transfer")} />
            <Tab to="/history" icon="history" label={t("history")} />
            <Tab to="/account" icon="person" label={t("account")} />
          </nav>
        )}
      </div>
    </div>
  );
}

function Tab({
  to,
  icon,
  label,
  end,
}: {
  to: string;
  icon: string;
  label: string;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          "flex flex-col items-center justify-center w-full h-full font-label-md text-label-md transition-colors active:scale-90",
          isActive ? "text-primary font-bold" : "text-on-surface-variant",
        ].join(" ")
      }
    >
      {({ isActive }) => (
        <>
          <Icon name={icon} filled={isActive} className="mb-1" />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
}
