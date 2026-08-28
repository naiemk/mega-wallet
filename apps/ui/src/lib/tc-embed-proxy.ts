import type { Plugin, Connect } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import http from "node:http";
import https from "node:https";
import { URL } from "node:url";

/** Same-origin path prefix so the iframe does not need a second forwarded port. */
export const TC_EMBED_PREFIX = "/__tc";

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

function contentType(headers: http.IncomingHttpHeaders): string {
  const raw = headers["content-type"];
  return (Array.isArray(raw) ? raw[0] : raw) ?? "";
}

/**
 * TC's SPA uses root-absolute `/api` and `/assets`. When we host it under `/__tc`,
 * rewrite those so fetches stay on the embed prefix (and do not hit mega-wallet `/api`).
 */
function rewriteEmbedBody(body: string, type: string): string {
  let out = body;
  if (type.includes("html")) {
    out = out
      .replace(/(src|href)=["']\/(?!\/|__tc\/)/g, `$1="${TC_EMBED_PREFIX}/`)
      .replace(/(src|href)=["']\/(?!\/|__tc\/)/g, `$1='${TC_EMBED_PREFIX}/`);
  }
  if (type.includes("javascript") || type.includes("ecmascript") || type.includes("html")) {
    // VITE_API_BASE is baked empty: function d(){return``...} → prefix API root.
    out = out.replace(
      /function d\(\)\{return``\.replace\(\/\\\/\$\/,``\)\?\?``\}/,
      `function d(){return\`${TC_EMBED_PREFIX}\`.replace(/\\/$/,\`\`)\?\?\`\`}`,
    );
    out = out.replace(
      /function d\(\)\{return""\.replace\(\/\\\/\$\/,""\)\?\?""\}/,
      `function d(){return"${TC_EMBED_PREFIX}".replace(/\\/$/,"")??""}`,
    );
    // Asset URLs referenced from JS
    out = out.replace(/(["'`])\/assets\//g, `$1${TC_EMBED_PREFIX}/assets/`);
    out = out.replace(/(["'`])\/images\//g, `$1${TC_EMBED_PREFIX}/images/`);
    out = out.replace(/(["'`])\/favicon/g, `$1${TC_EMBED_PREFIX}/favicon`);
    out = out.replace(/(["'`])\/logo\.png/g, `$1${TC_EMBED_PREFIX}/logo.png`);
  }
  if (type.includes("css")) {
    out = out.replace(/url\(\//g, `url(${TC_EMBED_PREFIX}/`);
  }
  return out;
}

function shouldRewrite(type: string): boolean {
  return (
    type.includes("html") ||
    type.includes("javascript") ||
    type.includes("ecmascript") ||
    type.includes("css")
  );
}

/**
 * Dev-only reverse proxy so TC `/pay` can be framed on the Vite origin.
 * Mounted at `/__tc/*` — no extra port / Cursor port-forward required.
 * TC sends `X-Frame-Options: DENY`; this proxy strips framing headers.
 */
export function tcEmbedProxyPlugin(opts?: { target?: string }): Plugin {
  const targetBase = (
    opts?.target ??
    process.env.TRUSTLESS_COMMERCE_URL ??
    "https://testnet.trustless-commerce.com"
  ).replace(/\/$/, "");

  return {
    name: "tc-embed-proxy",
    configureServer(server) {
      const target = new URL(targetBase);
      const client = target.protocol === "http:" ? http : https;
      const prefix = TC_EMBED_PREFIX;

      const middleware: Connect.NextHandleFunction = (req, res, next) => {
        const rawUrl = req.url ?? "/";
        if (!rawUrl.startsWith(prefix + "/") && rawUrl !== prefix) {
          next();
          return;
        }

        const upstreamPath = rawUrl === prefix ? "/" : rawUrl.slice(prefix.length) || "/";
        proxyRequest(client, target, upstreamPath, req, res);
      };

      // Before Vite's own /api proxy and SPA fallback.
      server.middlewares.use(middleware);
      console.info(`[tc-embed-proxy] framing ${targetBase} at ${prefix}/* (same origin as UI)`);
    },
  };
}

function proxyRequest(
  client: typeof http | typeof https,
  target: URL,
  upstreamPath: string,
  req: IncomingMessage,
  res: ServerResponse,
) {
  const headers: http.OutgoingHttpHeaders = { ...req.headers, host: target.host };
  delete headers["accept-encoding"];
  // Avoid leaking the Vite host as Origin to TC in ways that confuse caches.
  if (typeof headers.origin === "string") {
    headers.origin = target.origin;
  }
  if (typeof headers.referer === "string") {
    try {
      const ref = new URL(headers.referer);
      headers.referer = `${target.origin}${ref.pathname}${ref.search}`;
    } catch {
      /* keep */
    }
  }

  const upstream = client.request(
    {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || (target.protocol === "http:" ? 80 : 443),
      path: upstreamPath,
      method: req.method,
      headers,
      servername: target.hostname,
    },
    (up) => {
      const type = contentType(up.headers);
      const outHeaders = stripFramingHeaders(up.headers);

      if (!shouldRewrite(type)) {
        res.writeHead(up.statusCode ?? 502, outHeaders);
        up.pipe(res);
        return;
      }

      const chunks: Buffer[] = [];
      up.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      up.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        const rewritten = rewriteEmbedBody(raw, type);
        const buf = Buffer.from(rewritten, "utf8");
        outHeaders["content-length"] = buf.length;
        res.writeHead(up.statusCode ?? 502, outHeaders);
        res.end(buf);
      });
      up.on("error", (err) => {
        if (!res.headersSent) {
          res.writeHead(502, { "content-type": "text/plain" });
        }
        res.end(`TC embed proxy error: ${err.message}`);
      });
    },
  );

  upstream.on("error", (err) => {
    if (!res.headersSent) {
      res.writeHead(502, { "content-type": "text/plain" });
    }
    res.end(`TC embed proxy error: ${err.message}`);
  });

  req.pipe(upstream);
}
