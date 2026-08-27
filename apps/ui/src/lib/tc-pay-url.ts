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

declare const __TC_EMBED_ORIGIN__: string | undefined;

/** Dev framing proxy origin (strips TC X-Frame-Options). Empty in production builds unless defined. */
export function tcEmbedOrigin(): string {
  try {
    if (typeof __TC_EMBED_ORIGIN__ === "string" && __TC_EMBED_ORIGIN__) return __TC_EMBED_ORIGIN__;
  } catch {
    /* not defined */
  }
  if (typeof import.meta !== "undefined") {
    const fromEnv = (import.meta as ImportMeta & { env?: Record<string, string> }).env
      ?.VITE_TC_EMBED_ORIGIN;
    if (fromEnv) return fromEnv;
  }
  return "";
}

/**
 * Point a TC pay URL at the local framing proxy so it can load in an iframe.
 * Standalone / new-tab keeps the real TC host.
 */
export function withTcEmbedProxy(payUrl: string): string {
  const origin = tcEmbedOrigin();
  if (!origin || !payUrl) return payUrl;
  try {
    const src = new URL(payUrl, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    if (!/trustless-commerce|trustlesscommerce/i.test(src.hostname)) return payUrl;
    const embed = new URL(origin);
    src.protocol = embed.protocol;
    src.host = embed.host;
    return src.toString();
  } catch {
    return payUrl;
  }
}

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
