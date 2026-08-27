/** Auth redirect helpers — send guests to Account, then resume the prior route. */

const NEXT_KEY = "mw-auth-next";

export function isUnauthorizedError(error: unknown): boolean {
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status?: number }).status;
    if (status === 401) return true;
  }
  const msg = String(error instanceof Error ? error.message : error);
  return /unauthorized/i.test(msg);
}

export function loginPath(returnTo?: string): string {
  const next =
    returnTo ??
    (typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : "/");
  const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (safe.startsWith("/account")) return "/account";
  return `/account?next=${encodeURIComponent(safe)}`;
}

export function rememberReturnTo(path: string) {
  try {
    if (path.startsWith("/") && !path.startsWith("/account")) {
      sessionStorage.setItem(NEXT_KEY, path);
    }
  } catch {
    /* ignore */
  }
}

export function consumeReturnTo(search?: string): string | null {
  try {
    const params = new URLSearchParams(search ?? window.location.search);
    const fromQuery = params.get("next");
    if (fromQuery?.startsWith("/") && !fromQuery.startsWith("//") && !fromQuery.startsWith("/account")) {
      sessionStorage.removeItem(NEXT_KEY);
      return fromQuery;
    }
    const stored = sessionStorage.getItem(NEXT_KEY);
    sessionStorage.removeItem(NEXT_KEY);
    if (stored?.startsWith("/") && !stored.startsWith("//") && !stored.startsWith("/account")) {
      return stored;
    }
  } catch {
    /* ignore */
  }
  return null;
}
