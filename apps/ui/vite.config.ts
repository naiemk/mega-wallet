import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { brandingPlugin } from "./src/lib/branding";
import { tcEmbedProxyPlugin } from "./src/lib/tc-embed-proxy";

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const rootEnv = loadEnv(mode, `${process.cwd()}/../..`, "");
  const tcUrl =
    env.TRUSTLESS_COMMERCE_URL ||
    rootEnv.TRUSTLESS_COMMERCE_URL ||
    process.env.TRUSTLESS_COMMERCE_URL ||
    "https://testnet.trustless-commerce.com";
  const embedPort = Number(env.TC_EMBED_PROXY_PORT || rootEnv.TC_EMBED_PROXY_PORT || 5174);
  // Prefer runtime hostname in the browser; only set a bake-time override via env.
  const embedOrigin = env.VITE_TC_EMBED_ORIGIN || rootEnv.VITE_TC_EMBED_ORIGIN || "";

  return {
    plugins: [
      react(),
      tailwindcss(),
      brandingPlugin(),
      ...(command === "serve" ? [tcEmbedProxyPlugin({ target: tcUrl, port: embedPort })] : []),
    ],
    define: {
      __TC_EMBED_ORIGIN__: JSON.stringify(embedOrigin),
      "import.meta.env.VITE_TC_EMBED_PORT": JSON.stringify(String(embedPort)),
    },
    server: {
      port: 5173,
      strictPort: true,
      host: true,
      proxy: {
        "/api": {
          target: "http://127.0.0.1:8080",
          changeOrigin: true,
        },
      },
    },
  };
});
