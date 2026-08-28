import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { flagForLanguage } from "../lib/language";
import { BrandLogo } from "./BrandLogo";
import { Icon } from "./Icon";

export function AuthLayout() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const rtl = i18n.language === "fa" || i18n.language === "ar";
  const showBack =
    location.pathname === "/login/email" || location.pathname === "/login/passkey";

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      className="h-dvh max-h-dvh overflow-hidden bg-surface-dim md:bg-[linear-gradient(160deg,#dce9ff_0%,#f8f9ff_45%,#e8fff4_100%)] md:flex md:justify-center md:items-stretch"
    >
      <div className="app-frame w-full max-w-[430px] h-dvh max-h-dvh mx-auto bg-background text-on-background flex flex-col font-body-md md:shadow-[0_0_0_1px_rgba(11,28,48,0.06),0_24px_64px_rgba(11,28,48,0.14)] md:relative overflow-hidden">
        <header className="w-full bg-surface/95 backdrop-blur-sm border-b border-outline-variant/20 flex items-center justify-between px-container-margin h-14 z-40 shrink-0">
          {showBack ? (
            <button
              type="button"
              className="w-10 h-10 -ms-2 flex items-center justify-center text-primary hover:opacity-80 active:scale-95 rounded-full"
              onClick={() => navigate("/login")}
              aria-label={t("back")}
            >
              <Icon name={rtl ? "arrow_forward" : "arrow_back"} />
            </button>
          ) : (
            <div className="w-10" />
          )}

          <h1 className="absolute inset-x-0 mx-auto w-fit flex items-center justify-center m-0">
            <BrandLogo variant="full" />
          </h1>

          <button
            type="button"
            className="w-10 h-10 -me-2 flex items-center justify-center rounded-full hover:bg-surface-container-low active:scale-95 transition-colors text-xl leading-none"
            onClick={() => navigate("/account/language")}
            aria-label={t("language")}
            title={t("language")}
          >
            <span aria-hidden>{flagForLanguage(i18n.language)}</span>
          </button>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain pb-lg">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
