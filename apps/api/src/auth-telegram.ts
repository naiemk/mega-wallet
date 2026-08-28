import { decodeJwt } from "jose";
import type { OAuth2Tokens } from "@better-auth/core/oauth2";

export type TelegramOidcProfile = {
  sub: string;
  id: string;
  name?: string;
  picture?: string;
  preferred_username?: string;
  [key: string]: unknown;
};

/** Telegram OIDC has no userinfo endpoint; profile claims are only in id_token (no email). */
export function telegramProfileFromTokens(tokens: OAuth2Tokens): TelegramOidcProfile | null {
  if (!tokens.idToken) return null;
  try {
    const decoded = decodeJwt(tokens.idToken) as Record<string, unknown>;
    const sub = String(decoded.sub ?? "");
    if (!sub) return null;
    return {
      ...decoded,
      sub,
      id: sub,
      name: typeof decoded.name === "string" ? decoded.name : undefined,
      picture: typeof decoded.picture === "string" ? decoded.picture : undefined,
      preferred_username:
        typeof decoded.preferred_username === "string" ? decoded.preferred_username : undefined,
    };
  } catch {
    return null;
  }
}

export function mapTelegramProfileToUser(profile: TelegramOidcProfile) {
  const name = profile.name || profile.preferred_username || undefined;
  return {
    name,
    email: `${profile.sub}@telegram.user`,
  };
}
