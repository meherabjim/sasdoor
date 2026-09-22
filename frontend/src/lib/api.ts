const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message); this.name = "ApiError"; this.status = status; this.data = data;
  }
}

/** Guard so a page firing several calls at once does not redirect several times. */
let redirecting = false;

function handleExpiredSession(endpoint: string) {
  if (typeof window === "undefined" || redirecting) return;
  // Logging in with a wrong password is a 401 too; that is not an expired session.
  if (endpoint.startsWith("/api/auth/login") || endpoint.startsWith("/api/auth/register")) return;
  if (!localStorage.getItem("accessToken")) return;

  redirecting = true;
  localStorage.removeItem("accessToken");
  localStorage.removeItem("user");
  const here = window.location.pathname + window.location.search;
  const back = here.startsWith("/login") ? "" : `?next=${encodeURIComponent(here)}`;
  window.location.href = `/login${back}`;
}

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
  const contentType = response.headers.get("content-type") || "";
  const data: unknown = contentType.includes("application/json") ? await response.json().catch(() => null) : await response.text().catch(() => "");
  if (!response.ok) {
    // An expired token used to surface as an error toast on every single call, with no
    // way back: nothing cleared it and nothing sent the person to the login page.
    if (response.status === 401) handleExpiredSession(endpoint);
    const obj = data && typeof data === "object" ? data as Record<string, unknown> : null;
    const message = String(obj?.message || obj?.error || `Request failed (${response.status})`);
    throw new ApiError(message, response.status, data);
  }
  return data as T;
}
