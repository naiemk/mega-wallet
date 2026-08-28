import type { Plugin } from "vite";
import http from "node:http";
import https from "node:https";
import { URL } from "node:url";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "content-length",
  "content-encoding",
]);

function stripFramingHeaders(headers: http.IncomingHttpHeaders): http.OutgoingHttpHeaders {
  const out: http.OutgoingHttpHeaders = {};
  for (const [key, value] of Object.entries(headers)) {
    if (!value) continue;
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower)) continue;
    if (lower === "x-frame-options") continue;
    if (lower === "content-security-policy") {
      const raw = Array.isArray(value) ? value.join(";") : String(value);
      const cleaned = raw
        .split(";")
        .map((d) => d.trim())
        .filter((d) => d && !/^frame-ancestors\b/i.test(d))
        .join("; ");
      if (cleaned) out[key] = cleaned;
      continue;
    }
    out[key] = value;
  }
  return out;
}

/**
 * Dev-only reverse proxy so TC `/pay` can be framed.
 * Listens on 0.0.0.0 so Cursor/VS Code port forwarding can expose it to the browser.
 * TC sends `X-Frame-Options: DENY`; this origin strips framing headers.
 */
export function tcEmbedProxyPlugin(opts?: {
  target?: string;
  port?: number;
}): Plugin {
  const targetBase = (
    opts?.target ??
    process.env.TRUSTLESS_COMMERCE_URL ??
    "https://testnet.trustless-commerce.com"
  ).replace(/\/$/, "");
  const port = opts?.port ?? Number(process.env.TC_EMBED_PROXY_PORT ?? 5174);

  return {
    name: "tc-embed-proxy",
    configureServer(server) {
      const target = new URL(targetBase);
      const client = target.protocol === "http:" ? http : https;

      const proxyServer = http.createServer((req, res) => {
        const headers: http.OutgoingHttpHeaders = { ...req.headers, host: target.host };
        delete headers["accept-encoding"];

        const upstream = client.request(
          {
            protocol: target.protocol,
            hostname: target.hostname,
            port: target.port || (target.protocol === "http:" ? 80 : 443),
            path: req.url,
            method: req.method,
            headers,
            servername: target.hostname,
          },
          (up) => {
            res.writeHead(up.statusCode ?? 502, stripFramingHeaders(up.headers));
            up.pipe(res);
          },
        );

        upstream.on("error", (err) => {
          if (!res.headersSent) {
            res.writeHead(502, { "content-type": "text/plain" });
          }
          res.end(`TC embed proxy error: ${err.message}`);
        });

        req.pipe(upstream);
      });

      proxyServer.on("error", (err) => {
        console.warn(`[tc-embed-proxy] could not bind :${port}:`, err.message);
      });

      // 0.0.0.0 so forwarded ports (Cursor/Codespaces) reach the proxy from the browser.
      proxyServer.listen(port, "0.0.0.0", () => {
        console.info(`[tc-embed-proxy] framing proxy ${targetBase} → http://0.0.0.0:${port}`);
      });

      const close = () => {
        proxyServer.close();
      };
      process.once("exit", close);
      server.httpServer?.once("close", close);
    },
  };
}
