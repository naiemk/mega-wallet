/// <reference types="vite/client" />

declare module "virtual:branding" {
  import type { Branding } from "./lib/branding";
  const branding: Branding;
  export default branding;
}
