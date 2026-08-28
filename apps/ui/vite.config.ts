import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { brandingPlugin } from "./src/lib/branding";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const rootEnv = loadEnv(mode, `${process.cwd()}/../..`, "");
  // Keep env load so TRUSTLESS_COMMERCE_URL stays available to other tooling if needed.
  void (env.TRUSTLESS_COMMERCE_URL || rootEnv.TRUSTLESS_COMMERCE_URL);

  return {
    plugins: [react(), tailwindcss(), brandingPlugin()],
    server: {
      port: 5173,
      strictPort: true,
      host: true,
      proxy: {
        "/api": {
          target: "http://127.0.0.1:8080",
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq, req) => {
              const host = req.headers.host;
              if (host) {
                proxyReq.setHeader("x-forwarded-host", host);
                const proto = req.socket && "encrypted" in req.socket && req.socket.encrypted ? "https" : "http";
                proxyReq.setHeader("x-forwarded-proto", proto);
              }
            });
          },
        },
      },
    },
  };
});
