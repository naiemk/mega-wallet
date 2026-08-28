import { useTranslation } from "react-i18next";
import { APP_LANGUAGES, applyLanguage } from "../lib/language";
import { SurfaceCard } from "../components/SurfaceCard";

export function LanguagePage() {
  const { t, i18n } = useTranslation();

  function setLanguage(lang: string) {
    void i18n.changeLanguage(lang);
    applyLanguage(lang);
  }

  return (
    <div className="px-container-margin py-lg flex flex-col gap-md">
      <p className="font-body-md text-body-md text-on-surface-variant m-0">{t("languageHint")}</p>
      <SurfaceCard>
        {APP_LANGUAGES.map((lang, i) => {
          const active = i18n.language === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => setLanguage(lang.code)}
              className={`w-full flex items-center gap-md p-md text-start hover:bg-surface-container-low active:bg-surface-container transition-colors ${
                i < APP_LANGUAGES.length - 1 ? "border-b border-outline-variant/30" : ""
              }`}
              aria-pressed={active}
            >
              <span className="text-2xl leading-none" aria-hidden>
                {lang.flag}
              </span>
              <span className="flex-1 font-body-lg text-body-lg text-primary">{lang.label}</span>
              {active && (
                <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" aria-hidden />
              )}
            </button>
          );
        })}
      </SurfaceCard>
    </div>
  );
}
