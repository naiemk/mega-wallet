import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";
import { passkeyClient } from "@better-auth/passkey/client";

/** Same-origin via Vite `/api` proxy (Cursor/VS Code port forwarding friendly). */
export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : "",
  basePath: "/api/auth",
  plugins: [emailOTPClient(), passkeyClient()],
});
