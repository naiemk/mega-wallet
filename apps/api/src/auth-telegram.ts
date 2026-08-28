import { decodeJwt } from "jose";
import type { GenericOAuthUserInfo } from "better-auth/plugins";

/** Telegram OIDC has no userinfo endpoint; profile claims are only in id_token (no email). */
export function telegramProfileFromTokens(tokens: {
  idToken?: string | null;
  accessToken?: string;
}): GenericOAuthUserInfo | null {
  if (!tokens.idToken) return null;
  try {
    const decoded = decodeJwt(tokens.idToken) as Record<string, unknown>;
    const sub = String(decoded.sub ?? "");
    if (!sub) return null;
    return {
      ...decoded,
      sub,
      id: sub,
      emailVerified: false,
      name: typeof decoded.name === "string" ? decoded.name : undefined,
      picture: typeof decoded.picture === "string" ? decoded.picture : undefined,
      preferred_username:
        typeof decoded.preferred_username === "string" ? decoded.preferred_username : undefined,
    };
  } catch {
    return null;
  }
}

export function mapTelegramProfileToUser(profile: GenericOAuthUserInfo) {
  const sub = String(profile.sub ?? profile.id ?? "");
  const name =
    (typeof profile.name === "string" && profile.name) ||
    (typeof profile.preferred_username === "string" && profile.preferred_username) ||
    undefined;
  return {
    name,
    email: sub ? `${sub}@telegram.user` : undefined,
  };
}
