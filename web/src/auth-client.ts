import { createAuthClient } from "better-auth/react";

const localServer = `${location.protocol}//${location.hostname}:8787`;
export const AUTH_BASE_URL = import.meta.env.VITE_AUTH_URL ?? (
  location.port === "5173" ? localServer : location.origin
);

export const authClient = createAuthClient({
  baseURL: AUTH_BASE_URL,
  fetchOptions: { credentials: "include" },
});
