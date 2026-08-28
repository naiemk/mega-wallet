import { describe, expect, it } from "vitest";
import { mapTelegramProfileToUser, telegramProfileFromTokens } from "../src/auth-telegram.js";

function fakeIdToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.`;
}

describe("telegramProfileFromTokens", () => {
  it("reads profile from id_token without email (Telegram has no userinfo endpoint)", () => {
    const profile = telegramProfileFromTokens({
      accessToken: "at",
      idToken: fakeIdToken({
        sub: "123456789",
        name: "Alice",
        preferred_username: "alice",
        picture: "https://example.com/a.jpg",
      }),
    });
    expect(profile).toMatchObject({
      sub: "123456789",
      id: "123456789",
      name: "Alice",
      preferred_username: "alice",
      picture: "https://example.com/a.jpg",
    });
    expect(profile?.email).toBeUndefined();
  });

  it("maps synthetic email from telegram sub", () => {
    expect(
      mapTelegramProfileToUser({
        sub: "999",
        id: "999",
        preferred_username: "bob",
      }),
    ).toEqual({
      name: "bob",
      email: "999@telegram.user",
    });
  });
});
