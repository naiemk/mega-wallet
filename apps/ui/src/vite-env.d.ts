/// <reference types="vite/client" />

declare const __TC_EMBED_ORIGIN__: string;

declare module "virtual:branding" {
  import type { Branding } from "./lib/branding";
  const branding: Branding;
  export default branding;
}
