import { describe, expect, it } from "vitest";
import { rewriteTcApiBase, rewriteTcEmbedBody, TC_EMBED_PREFIX } from "./tc-embed-proxy.js";

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
    expect(out).toContain(TC_EMBED_PREFIX);
  });
});
