import { describe, expect, it } from "vitest";
import {
  affiliateLink,
  computeAffiliateBonus,
  generateInviteCode,
} from "../src/referral.js";

describe("referral", () => {
  it("computes capped bonus", () => {
    const cfg = { bonusBps: 500, maxBonusUsdCents: 1000 };
    expect(computeAffiliateBonus(10000, cfg, 0)).toBe(500);
    expect(computeAffiliateBonus(10000, cfg, 800)).toBe(200);
    expect(computeAffiliateBonus(10000, cfg, 1000)).toBe(0);
    expect(computeAffiliateBonus(0, cfg, 0)).toBe(0);
  });

  it("generates invite code and link", () => {
    const code = generateInviteCode("user-abc");
    expect(code).toMatch(/^USERABC-/);
    expect(generateInviteCode("---")).toMatch(/^MW-/);
    expect(affiliateLink("https://wallet.example.com", code)).toContain("ref=");
  });
});
