import branding from "virtual:branding";

export type { Branding } from "./lib/branding";
export { branding };
export default branding;

export function brandName(lang?: string): string {
  const code = (lang || "en").slice(0, 2);
  return branding.i18n?.[code]?.name || branding.name;
}

export function brandSubtitle(lang?: string): string {
  const code = (lang || "en").slice(0, 2);
  return branding.i18n?.[code]?.subtitle || branding.subtitle;
}
