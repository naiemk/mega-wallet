import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { brandingPlugin } from "./src/lib/branding";
import { TC_EMBED_PREFIX, tcEmbedProxyPlugin } from "./src/lib/tc-embed-proxy";

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const rootEnv = loadEnv(mode, `${process.cwd()}/../..`, "");
  const tcUrl =
    env.TRUSTLESS_COMMERCE_URL ||
    rootEnv.TRUSTLESS_COMMERCE_URL ||
    process.env.TRUSTLESS_COMMERCE_URL ||
    "https://testnet.trustless-commerce.com";
  const embedPrefix = env.VITE_TC_EMBED_PREFIX || rootEnv.VITE_TC_EMBED_PREFIX || TC_EMBED_PREFIX;

  return {
    plugins: [
      react(),
      tailwindcss(),
      brandingPlugin(),
      ...(command === "serve" ? [tcEmbedProxyPlugin({ target: tcUrl })] : []),
    ],
    define: {
      __TC_EMBED_PREFIX__: JSON.stringify(command === "serve" ? embedPrefix : ""),
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
