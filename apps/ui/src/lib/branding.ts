import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import type { Plugin } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

export type BrandingI18n = {
  name?: string;
  subtitle?: string;
};

export type Branding = {
  name: string;
  shortName: string;
  domain: string;
  subtitle: string;
  logo: {
    mark: string;
    wordmark: string;
    favicon: string;
    markPng?: string;
  };
  i18n?: Record<string, BrandingI18n>;
};

export function brandingYamlPath(): string {
  const candidates = [
    resolve(__dirname, "../../../branding.yaml"), // apps/ui/src/lib → repo root
    resolve(process.cwd(), "branding.yaml"),
    resolve(process.cwd(), "../../branding.yaml"), // apps/ui cwd → repo root
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  throw new Error("branding.yaml not found");
}

export function loadBranding(): Branding {
  const raw = readFileSync(brandingYamlPath(), "utf8");
  const data = parseYaml(raw) as Branding;
  if (!data?.name || !data?.subtitle || !data?.logo?.mark) {
    throw new Error("branding.yaml missing required fields (name, subtitle, logo.mark)");
  }
  return {
    ...data,
    shortName: data.shortName || data.name,
    domain: data.domain || "",
  };
}

/** Vite plugin: virtual:branding module + index.html title/favicon from branding.yaml */
export function brandingPlugin(): Plugin {
  const virtualId = "virtual:branding";
  const resolvedVirtualId = "\0" + virtualId;
  let brandingPath = "";

  return {
    name: "mega-wallet-branding",
    configResolved() {
      brandingPath = brandingYamlPath();
    },
    configureServer(server) {
      if (brandingPath) server.watcher.add(brandingPath);
    },
    resolveId(id) {
      if (id === virtualId) return resolvedVirtualId;
    },
    load(id) {
      if (id === resolvedVirtualId) {
        const branding = loadBranding();
        return `export default ${JSON.stringify(branding, null, 2)};\n`;
      }
    },
    transformIndexHtml(html) {
      const branding = loadBranding();
      return html
        .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(branding.name)}</title>`)
        .replace(
          /<meta name="viewport"[^>]*>/,
          `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />`,
        )
        .replace(
          /<link rel="icon"[^>]*>/,
          `<link rel="icon" type="image/svg+xml" href="${branding.logo.favicon}" />`,
        );
    },
    handleHotUpdate({ file, server }) {
      if (file === brandingPath) {
        const mod = server.moduleGraph.getModuleById(resolvedVirtualId);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: "full-reload" });
      }
    },
  };
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
