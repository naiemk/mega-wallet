/** Auth redirect helpers — send guests to login, then resume the prior route. */

const NEXT_KEY = "mw-auth-next";

function isLoginPath(path: string): boolean {
  return path === "/login" || path.startsWith("/login/");
}

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
  if (isLoginPath(safe)) return "/login";
  return `/login?next=${encodeURIComponent(safe)}`;
}

export function rememberReturnTo(path: string) {
  try {
    if (path.startsWith("/") && !isLoginPath(path)) {
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
    if (
      fromQuery?.startsWith("/") &&
      !fromQuery.startsWith("//") &&
      !isLoginPath(fromQuery)
    ) {
      sessionStorage.removeItem(NEXT_KEY);
      return fromQuery;
    }
    const stored = sessionStorage.getItem(NEXT_KEY);
    sessionStorage.removeItem(NEXT_KEY);
    if (stored?.startsWith("/") && !stored.startsWith("//") && !isLoginPath(stored)) {
      return stored;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function passkeyEnrollPath(returnTo: string): string {
  const safe = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
  return `/login/passkey?next=${encodeURIComponent(safe)}`;
}
