import { AUTH_BASE_URL } from "./auth-client";

export async function apiFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${AUTH_BASE_URL}${path}`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(response.status === 404 ? "Not found" : "Unable to load data");
  }
  return response.json() as Promise<T>;
}
