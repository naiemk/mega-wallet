import type { NavigateFunction } from "react-router-dom";
import { consumeReturnTo, passkeyEnrollPath } from "./auth-redirect";
import { rememberWallet } from "./auth-storage";

export type SignInMethod = "passkey" | "emailOtp" | "google" | "apple" | "telegram";

export function webAuthnAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.PublicKeyCredential !== "undefined";
}

export function isOperatorRole(role: string | null | undefined): boolean {
  return role === "operator" || role === "admin";
}

export function finishLoginNavigate(
  navigate: NavigateFunction,
  opts: {
    method: SignInMethod;
    search?: string;
    user?: { email?: string | null; name?: string | null };
  },
) {
  if (opts.user?.email) {
    rememberWallet({ email: opts.user.email, name: opts.user.name });
  }
  const next = consumeReturnTo(opts.search) || "/";
  if (opts.method === "passkey" || !webAuthnAvailable()) {
    navigate(next, { replace: true });
    return;
  }
  navigate(passkeyEnrollPath(next), { replace: true });
}

export function socialCallbackUrl(search: string): string {
  const next = consumeReturnTo(search) || "/";
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${passkeyEnrollPath(next)}`;
}
