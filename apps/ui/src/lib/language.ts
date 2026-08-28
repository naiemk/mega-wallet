const LANGUAGES = [
  { code: "fa", label: "فارسی", flag: "🇮🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
] as const;

export type AppLanguageCode = (typeof LANGUAGES)[number]["code"];

export const APP_LANGUAGES = LANGUAGES;

export function applyLanguage(lang: string) {
  localStorage.setItem("mw-lang", lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "fa" || lang === "ar" ? "rtl" : "ltr";
}

export function flagForLanguage(language: string | undefined): string {
  const code = (language ?? "fa").split("-")[0];
  return LANGUAGES.find((l) => l.code === code)?.flag ?? "🇮🇷";
}
