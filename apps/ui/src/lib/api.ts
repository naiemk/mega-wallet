/** Same-origin so Cursor/VS Code port forwarding works; Vite proxies /api to the API. */
const API_BASE = "";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function errorMessage(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const rec = body as Record<string, unknown>;
    if (typeof rec.message === "string" && rec.message) return rec.message;
    if (typeof rec.error === "string" && rec.error) return rec.error;
  }
  if (status === 401) return "Unauthorized";
  if (status === 403) return "Forbidden";
  return `Request failed: ${status}`;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new Error("Cannot reach API");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(errorMessage(err, res.status), res.status);
  }
  return res.json() as Promise<T>;
}

export async function apiOptional<T>(path: string): Promise<T | null> {
  const res = await fetch(`${API_BASE}${path}`, { credentials: "include" });
  // Auth / role gates are expected for guest & non-operator users
  if (res.status === 401 || res.status === 403) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(errorMessage(err, res.status), res.status);
  }
  return res.json() as Promise<T>;
}
