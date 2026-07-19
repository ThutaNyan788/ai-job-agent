import { createAuthClient } from "better-auth/react";

// In development Vite proxies /api to the backend. Keeping browser
// requests same-origin avoids localhost/IPv6 conflicts and cookie/CORS issues.
export const AUTH_BASE_URL = import.meta.env.VITE_AUTH_URL ?? location.origin;

export const authClient = createAuthClient({
  baseURL: AUTH_BASE_URL,
  fetchOptions: { credentials: "include" },
});
