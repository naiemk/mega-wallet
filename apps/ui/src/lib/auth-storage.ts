const EMAIL_KEY = "mw-auth-email";
const PASSKEY_KEY = "mw-auth-passkey";

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
