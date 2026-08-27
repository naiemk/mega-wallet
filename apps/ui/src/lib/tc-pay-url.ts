/** Map mega-wallet i18n language to Trustless Commerce locale tags. */
export function tcLocale(language: string | undefined | null): string {
  const raw = (language ?? "en").trim().toLowerCase();
  if (raw.startsWith("fa")) return "fa";
  if (raw.startsWith("ar")) return "ar";
  if (raw.startsWith("en")) return "en";
  const base = raw.split("-")[0] || "en";
  return base;
}

export type TcCheckoutMode = "embed" | "standalone";

/**
 * Augment a TC `/pay` URL with language and chrome.
 * Embed mode uses `header=none` (no TC header/footer) for iframe hosting.
 */
export function withTcCheckoutParams(
  payUrl: string,
  opts: { language?: string | null; mode?: TcCheckoutMode },
): string {
  if (!payUrl) return payUrl;
  try {
    const url = new URL(payUrl, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    url.searchParams.set("lang", tcLocale(opts.language));
    if (opts.mode === "embed") {
      url.searchParams.set("header", "none");
    } else {
      // Standalone new-tab: keep light TC chrome (override embed header=none from API)
      url.searchParams.set("header", "minimal");
    }
    return url.toString();
  } catch {
    const sep = payUrl.includes("?") ? "&" : "?";
    const lang = `lang=${encodeURIComponent(tcLocale(opts.language))}`;
    const header = opts.mode === "embed" ? "&header=none" : "&header=minimal";
    return `${payUrl}${sep}${lang}${header}`;
  }
}
