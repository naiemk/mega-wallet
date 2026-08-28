import { SignJWT, importPKCS8 } from "jose";

/** Apple Sign In client secret JWT (valid ~6 months; regenerate on API startup). */
export async function generateAppleClientSecret(opts: {
  clientId: string;
  teamId: string;
  keyId: string;
  privateKeyPem: string;
}): Promise<string> {
  const key = await importPKCS8(opts.privateKeyPem.replace(/\\n/g, "\n"), "ES256");
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: opts.keyId })
    .setIssuer(opts.teamId)
    .setIssuedAt(now)
    .setExpirationTime(now + 86400 * 180)
    .setAudience("https://appleid.apple.com")
    .setSubject(opts.clientId)
    .sign(key);
}
