import {
  startAuthentication,
  WebAuthnError,
  type AuthenticatorTransportFuture,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { authClient } from "./auth-client";
import {
  identityKindFromEmail,
  rememberAuthEmail,
  rememberPasskey,
  rememberPasskeyEnrolled,
  touchPasskey,
} from "./auth-storage";

type PasskeyErr = { message?: string; code?: string } | null | undefined;

export function passkeyErrorMessage(error: PasskeyErr, fallback: string): string {
  if (!error) return fallback;
  if (typeof error.message === "string" && error.message.trim()) return error.message;
  if (typeof error.code === "string" && error.code.trim()) return error.code;
  return fallback;
}

type PasskeySignInData = {
  user?: { email?: string | null } | null;
  session?: unknown;
};

function authBase(): string {
  if (typeof window === "undefined") return "/api/auth";
  return `${window.location.origin}/api/auth`;
}

async function readError(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as PasskeyErr | { error?: string } | null;
  if (body && typeof body === "object") {
    if ("message" in body && typeof body.message === "string" && body.message.trim()) {
      return body.message;
    }
    if ("code" in body && typeof body.code === "string" && body.code.trim()) {
      return body.code;
    }
    if ("error" in body && typeof body.error === "string" && body.error.trim()) {
      return body.error;
    }
  }
  return `Passkey failed (${res.status})`;
}

/**
 * Complete WebAuthn passkey sign-in via native fetch (reliable cookies) and
 * confirm a session exists. When credentialId is set, scopes WebAuthn to that passkey.
 */
export async function completePasskeySignIn(opts?: {
  credentialId?: string;
  transports?: string[];
  fallbackEmail?: string;
}): Promise<{ email: string }> {
  const base = authBase();

  const optionsRes = await fetch(`${base}/passkey/generate-authenticate-options`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!optionsRes.ok) {
    throw new Error(await readError(optionsRes));
  }
  const optionsJSON = (await optionsRes.json()) as PublicKeyCredentialRequestOptionsJSON;

  const credentialId = opts?.credentialId?.trim();
  if (credentialId) {
    const transports = opts?.transports?.filter(Boolean) as AuthenticatorTransportFuture[] | undefined;
    optionsJSON.allowCredentials = [
      {
        id: credentialId,
        type: "public-key",
        ...(transports?.length ? { transports } : {}),
      },
    ];
  }

  let assertion: Awaited<ReturnType<typeof startAuthentication>>;
  try {
    assertion = await startAuthentication({ optionsJSON });
  } catch (err) {
    if (err instanceof WebAuthnError) {
      throw new Error(err.message || err.code || "Passkey failed");
    }
    if (err instanceof DOMException && err.name === "NotAllowedError") {
      throw new Error("Auth cancelled");
    }
    throw err instanceof Error ? err : new Error("Passkey failed");
  }

  const { clientExtensionResults: _ext, ...responseBody } = assertion;
  const verifyRes = await fetch(`${base}/passkey/verify-authentication`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ response: responseBody }),
  });
  if (!verifyRes.ok) {
    throw new Error(await readError(verifyRes));
  }

  const data = (await verifyRes.json()) as PasskeySignInData;
  let email = typeof data?.user?.email === "string" ? data.user.email : "";

  if (!data?.user && !data?.session) {
    const session = await authClient.getSession();
    if (!session.data?.user) {
      throw new Error("Passkey failed");
    }
    email = session.data.user.email ?? "";
  } else if (!email) {
    const session = await authClient.getSession();
    email = session.data?.user?.email ?? "";
    if (!session.data?.user) {
      throw new Error("Passkey failed");
    }
  }

  rememberPasskeyEnrolled();
  if (credentialId) {
    touchPasskey(credentialId);
  } else if (responseBody.id) {
    const session = await authClient.getSession();
    const identityLabel = email || opts?.fallbackEmail?.trim() || session.data?.user?.email || "";
    if (identityLabel) {
      rememberPasskey({
        credentialId: responseBody.id,
        name: session.data?.user?.name ?? identityLabel,
        identityLabel,
        identityKind: identityKindFromEmail(identityLabel),
      });
    }
  }
  const toStore = email || opts?.fallbackEmail?.trim() || "";
  if (toStore) rememberAuthEmail(toStore);
  return { email: toStore };
}
