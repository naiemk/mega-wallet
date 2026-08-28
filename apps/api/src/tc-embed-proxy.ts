import type { Context } from "hono";

/** Public mount path (under gateway `/api/` → mega-wallet-api). */
export const TC_EMBED_PREFIX = "/api/tc-embed";

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
  "host",
]);

function stripFramingHeaders(headers: Headers): Headers {
  const out = new Headers();
  headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower)) return;
    if (lower === "x-frame-options") return;
    if (lower === "content-security-policy") {
      const cleaned = value
        .split(";")
        .map((d) => d.trim())
        .filter((d) => d && !/^frame-ancestors\b/i.test(d))
        .join("; ");
      if (cleaned) out.set(key, cleaned);
      return;
    }
    out.set(key, value);
  });
  return out;
}

/**
 * Allow same-origin iframe embedding even when the edge gateway adds
 * `X-Frame-Options: DENY` — modern browsers honor CSP frame-ancestors over XFO.
 */
export function applyEmbedFramePolicy(headers: Headers): void {
  headers.delete("x-frame-options");
  const existing = headers.get("content-security-policy");
  const base = existing
    ? existing
        .split(";")
        .map((d) => d.trim())
        .filter((d) => d && !/^frame-ancestors\b/i.test(d))
        .join("; ")
    : "";
  headers.set(
    "content-security-policy",
    base ? `${base}; frame-ancestors 'self'` : "frame-ancestors 'self'",
  );
}

function contentTypeOf(headers: Headers): string {
  return headers.get("content-type") ?? "";
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
 * Pin TC's baked-empty API base to the real TC origin so framed checkout
 * never calls mega-wallet `/api` or a wrong local TC host.
 */
export function rewriteTcApiBase(body: string, tcOrigin: string): string {
  return body.replace(
    /function d\(\)\{return``\.replace\(\/\\\/\$\/,``\)\?\?``\}/,
    `function d(){return${JSON.stringify(tcOrigin)}.replace(/\\/$/,"")??""}`,
  );
}

/** Rewrite root-absolute TC assets/routes onto the embed prefix + fix SPA pathname. */
export function rewriteTcEmbedBody(body: string, type: string, tcOrigin: string, prefix: string): string {
  let out = rewriteTcApiBase(body, tcOrigin);
  if (type.includes("html")) {
    out = out.replace(/\b(src|href)=(["'])\/(?!\/)/gi, `$1=$2${prefix}/`);
    const boot = `<script>(function(){var p=${JSON.stringify(prefix)};if(location.pathname.indexOf(p)===0){history.replaceState(null,"",(location.pathname.slice(p.length)||"/")+location.search+location.hash);}})();</script>`;
    if (out.includes("</head>")) out = out.replace("</head>", `${boot}</head>`);
    else out = boot + out;
  }
  if (type.includes("javascript") || type.includes("ecmascript") || type.includes("html")) {
    out = out.replace(/(["'`])\/assets\//g, `$1${prefix}/assets/`);
    out = out.replace(/(["'`])\/images\//g, `$1${prefix}/images/`);
    out = out.replace(/(["'`])\/favicon/g, `$1${prefix}/favicon`);
    out = out.replace(/(["'`])\/logo\.png/g, `$1${prefix}/logo.png`);
  }
  if (type.includes("css")) {
    out = out.replace(/url\(\//g, `url(${prefix}/`);
  }
  return out;
}

function upstreamPathFromRequest(pathname: string, search: string): string {
  const prefix = TC_EMBED_PREFIX;
  let path = pathname;
  if (path === prefix) path = "/";
  else if (path.startsWith(prefix + "/")) path = path.slice(prefix.length) || "/";
  else path = "/";
  return `${path}${search}`;
}

/**
 * Reverse-proxy Trustless Commerce checkout for iframe embedding.
 * Strips framing headers and rewrites the SPA onto `/api/tc-embed`.
 */
export async function handleTcEmbedProxy(c: Context, tcBaseUrl: string): Promise<Response> {
  const tcOrigin = tcBaseUrl.replace(/\/$/, "");
  const url = new URL(c.req.url);
  const upstreamPath = upstreamPathFromRequest(url.pathname, url.search);
  const target = `${tcOrigin}${upstreamPath}`;

  const headers = new Headers();
  c.req.raw.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower)) return;
    if (lower === "origin" || lower === "referer") return;
    headers.set(key, value);
  });
  headers.set("host", new URL(tcOrigin).host);
  headers.set("origin", tcOrigin);
  headers.delete("accept-encoding");

  const method = c.req.method.toUpperCase();
  const init: RequestInit = { method, headers, redirect: "manual" };
  if (method !== "GET" && method !== "HEAD") {
    init.body = await c.req.arrayBuffer();
    (init as RequestInit & { duplex?: string }).duplex = "half";
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, init);
  } catch (e) {
    const message = e instanceof Error ? e.message : "proxy failed";
    return new Response(`TC embed proxy error: ${message}`, {
      status: 502,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const type = contentTypeOf(upstream.headers);
  const outHeaders = stripFramingHeaders(upstream.headers);
  applyEmbedFramePolicy(outHeaders);

  if (!shouldRewrite(type)) {
    return new Response(upstream.body, { status: upstream.status, headers: outHeaders });
  }

  const raw = await upstream.text();
  const rewritten = rewriteTcEmbedBody(raw, type, tcOrigin, TC_EMBED_PREFIX);
  outHeaders.delete("content-length");
  return new Response(rewritten, { status: upstream.status, headers: outHeaders });
}
