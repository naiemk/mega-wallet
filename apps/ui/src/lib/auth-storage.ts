const EMAIL_KEY = "mw-auth-email";
const PASSKEY_KEY = "mw-auth-passkey";
const WALLETS_KEY = "mw-auth-wallets";
const PASSKEYS_KEY = "mw-auth-passkeys";
const MAX_SAVED = 5;

export type IdentityKind = "email" | "telegram";

/** @deprecated Legacy wallet list — use SavedPasskey */
export interface SavedWallet {
  email: string;
  name?: string;
  lastUsedAt: string;
}

export interface SavedPasskey {
  credentialId?: string;
  name: string;
  identityLabel: string;
  identityKind: IdentityKind;
  transports?: string[];
  lastUsedAt: string;
  /** Legacy row migrated from SavedWallet (discoverable auth fallback). */
  legacy?: boolean;
}

export function identityKindFromEmail(email: string): IdentityKind {
  return email.endsWith("@telegram.user") ? "telegram" : "email";
}

export function getSavedAuthEmail(): string {
  try {
    return localStorage.getItem(EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

export function getSavedPasskeyHint(): boolean {
  try {
    return localStorage.getItem(PASSKEY_KEY) === "1";
  } catch {
    return false;
  }
}

export function rememberAuthEmail(email: string) {
  try {
    localStorage.setItem(EMAIL_KEY, email.trim().toLowerCase());
  } catch {
    /* ignore quota / private mode */
  }
}

export function rememberPasskeyEnrolled() {
  try {
    localStorage.setItem(PASSKEY_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearPasskeyHint() {
  try {
    localStorage.removeItem(PASSKEY_KEY);
  } catch {
    /* ignore */
  }
}

function readPasskeyStore(): SavedPasskey[] {
  try {
    const raw = localStorage.getItem(PASSKEYS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedPasskey[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p) =>
        typeof p.name === "string" &&
        typeof p.identityLabel === "string" &&
        (p.identityKind === "email" || p.identityKind === "telegram"),
    );
  } catch {
    return [];
  }
}

function writePasskeyStore(entries: SavedPasskey[]) {
  try {
    localStorage.setItem(PASSKEYS_KEY, JSON.stringify(entries.slice(0, MAX_SAVED)));
  } catch {
    /* ignore */
  }
}

function migrateLegacyWallets(): SavedPasskey[] {
  try {
    const raw = localStorage.getItem(WALLETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedWallet[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((w) => typeof w.email === "string" && w.email.includes("@"))
      .map((w) => ({
        name: w.name || w.email,
        identityLabel: w.email,
        identityKind: identityKindFromEmail(w.email),
        lastUsedAt: w.lastUsedAt || new Date().toISOString(),
        legacy: true,
      }));
  } catch {
    return [];
  }
}

/** Saved passkeys on this device (new store + legacy wallet migration). */
export function getSavedPasskeys(): SavedPasskey[] {
  const stored = readPasskeyStore();
  if (stored.length > 0) {
    return [...stored].sort(
      (a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime(),
    );
  }
  return migrateLegacyWallets().sort(
    (a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime(),
  );
}

/** True when this device has enrolled a passkey before (returning user). */
export function canUsePasskeyLogin(): boolean {
  return getSavedPasskeys().length > 0 || getSavedPasskeyHint();
}

export function rememberPasskey(entry: {
  credentialId: string;
  name?: string | null;
  identityLabel: string;
  identityKind: IdentityKind;
  transports?: string[];
}) {
  const credentialId = entry.credentialId.trim();
  const identityLabel = entry.identityLabel.trim();
  if (!credentialId || !identityLabel) return;

  rememberPasskeyEnrolled();
  if (entry.identityKind === "email") {
    rememberAuthEmail(identityLabel);
  }

  const now = new Date().toISOString();
  const name = entry.name?.trim() || identityLabel;
  const existing = readPasskeyStore().filter((p) => p.credentialId !== credentialId);
  existing.unshift({
    credentialId,
    name,
    identityLabel,
    identityKind: entry.identityKind,
    transports: entry.transports,
    lastUsedAt: now,
  });
  writePasskeyStore(existing);
}

export function touchPasskey(credentialId: string) {
  const id = credentialId.trim();
  if (!id) return;
  const store = readPasskeyStore();
  const idx = store.findIndex((p) => p.credentialId === id);
  if (idx < 0) return;
  const now = new Date().toISOString();
  const [row] = store.splice(idx, 1);
  store.unshift({ ...row, lastUsedAt: now });
  writePasskeyStore(store);
}

export function hasLocalPasskeyForIdentity(identityLabel: string): boolean {
  const label = identityLabel.trim().toLowerCase();
  return getSavedPasskeys().some(
    (p) => !p.legacy && p.credentialId && p.identityLabel.trim().toLowerCase() === label,
  );
}

export function persistEnrolledPasskey(
  passkey: {
    credentialID?: string;
    name?: string | null;
    transports?: string | null;
  },
  user: { email?: string | null; name?: string | null },
) {
  const credentialId = passkey.credentialID?.trim();
  const identityLabel = user.email?.trim();
  if (!credentialId || !identityLabel) return;
  rememberPasskey({
    credentialId,
    name: passkey.name ?? user.name,
    identityLabel,
    identityKind: identityKindFromEmail(identityLabel),
    transports: passkey.transports?.split(",").filter(Boolean),
  });
}

/** @deprecated Use getSavedPasskeys */
export function getSavedWallets(): SavedWallet[] {
  return getSavedPasskeys()
    .filter((p) => p.identityKind === "email")
    .map((p) => ({
      email: p.identityLabel,
      name: p.name !== p.identityLabel ? p.name : undefined,
      lastUsedAt: p.lastUsedAt,
    }));
}

export function rememberWallet(user: { email: string; name?: string | null }) {
  const email = user.email.trim().toLowerCase();
  if (!email) return;
  rememberAuthEmail(email);
  try {
    const now = new Date().toISOString();
    const name = user.name?.trim() || undefined;
    const legacy: SavedWallet[] = JSON.parse(localStorage.getItem(WALLETS_KEY) ?? "[]");
    const existing = (Array.isArray(legacy) ? legacy : []).filter((w) => w.email !== email);
    existing.unshift({ email, name, lastUsedAt: now });
    localStorage.setItem(WALLETS_KEY, JSON.stringify(existing.slice(0, MAX_SAVED)));
  } catch {
    /* ignore */
  }
}
