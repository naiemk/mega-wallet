import { AsyncLocalStorage } from "node:async_hooks";

/** Per-request WebAuthn rpID hostname (for logging / future dynamic use). */
export const passkeyRpStore = new AsyncLocalStorage<string>();

export function passkeyRpFromOrigin(
  origin: string | null | undefined,
  publicUiUrl: string,
): string {
  const fallback = new URL(publicUiUrl).hostname;
  if (!origin) return fallback;
  try {
    const host = new URL(origin).hostname;
    if (host === "localhost" || host === "127.0.0.1") return host;
    if (host === fallback) return host;
    return fallback;
  } catch {
    return fallback;
  }
}
