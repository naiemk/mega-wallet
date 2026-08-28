import { describe, expect, it } from "vitest";
import { applyEmbedFramePolicy, rewriteTcApiBase, rewriteTcEmbedBody, TC_EMBED_PREFIX } from "./tc-embed-proxy.js";

describe("tc-embed-proxy rewrites", () => {
  it("pins API base to absolute TC origin", () => {
    const src = "function d(){return``.replace(/\\/$/,``)??``}function f(e){return`${d()}${e}`}";
    const out = rewriteTcApiBase(src, "https://testnet.trustless-commerce.com");
    expect(out).toContain('return"https://testnet.trustless-commerce.com"');
    expect(out).not.toContain("return``");
  });

  it("prefixes HTML assets and injects pathname boot", () => {
    const html = `<html><head></head><body><script src="/assets/app.js"></script></body></html>`;
    const out = rewriteTcEmbedBody(
      html,
      "text/html",
      "https://testnet.trustless-commerce.com",
      TC_EMBED_PREFIX,
    );
    expect(out).toContain(`src="${TC_EMBED_PREFIX}/assets/app.js"`);
    expect(out).toContain("history.replaceState");
    expect(out).toContain('dataset.theme="light"');
    expect(out).toContain("#f8f9ff");
    expect(out).toContain(TC_EMBED_PREFIX);
  });

  it("sets frame-ancestors so embed works when gateway adds X-Frame-Options DENY", () => {
    const headers = new Headers({ "content-security-policy": "default-src 'self'" });
    applyEmbedFramePolicy(headers);
    expect(headers.get("content-security-policy")).toContain("frame-ancestors 'self'");
    expect(headers.get("x-frame-options")).toBeNull();
  });
});
