import { apiRequest, ApiError } from "@/lib/api";

type Wrap<T> = { success: boolean; message?: string; data: T };

/** Small API helper for the admin panel. Every call returns { data, message }. */
export const api = {
  get: async <T = any>(path: string) => (await apiRequest<Wrap<T>>(path)).data,
  post: <T = any>(path: string, body?: unknown) => apiRequest<Wrap<T>>(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
  put: <T = any>(path: string, body?: unknown) => apiRequest<Wrap<T>>(path, { method: "PUT", body: JSON.stringify(body ?? {}) }),
  patch: <T = any>(path: string, body?: unknown) => apiRequest<Wrap<T>>(path, { method: "PATCH", body: JSON.stringify(body ?? {}) }),
  del: <T = any>(path: string) => apiRequest<Wrap<T>>(path, { method: "DELETE" }),
};

/**
 * Multipart upload. It cannot go through `api` above: that helper sets a JSON
 * content type, and FormData has to set its own boundary.
 */
export async function uploadFile(file: File): Promise<string> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${base}/api/admin/upload`, { method: "POST", body: fd, headers: token ? { Authorization: `Bearer ${token}` } : undefined });
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new Error(j?.message || `Upload failed (${res.status})`);
  return j.data.url as string;
}

export const errMsg = (e: unknown) => (e instanceof ApiError || e instanceof Error ? e.message : "Something went wrong");
export const num = (v: unknown) => Number(v ?? 0) || 0;
export const tk = (v: unknown) => `৳${Math.round(num(v)).toLocaleString("en-IN")}`;
export const fmtNum = (v: unknown, d = 2) => num(v).toLocaleString("en-IN", { maximumFractionDigits: d });
export const fmtDate = (v: unknown) => (v ? new Date(String(v)).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—");
export const ftin = (v: unknown) => { const x = num(v); const ft = Math.floor(x + 1e-6); const inch = Math.round((x - ft) * 12); return inch === 12 ? `${ft + 1}'0"` : `${ft}'${inch}"`; };

export const STATUS: Record<string, { label: string; tone: "gray" | "blue" | "amber" | "violet" | "green" | "red" }> = {
  NEW: { label: "New", tone: "blue" },
  // The shop has sent a real price for a carving the customer traced themselves, and is
  // waiting for them to accept it. Nothing has left stock yet.
  QUOTED: { label: "Price sent", tone: "amber" },
  CONFIRMED: { label: "Confirmed", tone: "violet" },
  IN_PRODUCTION: { label: "In production", tone: "amber" },
  READY: { label: "Ready", tone: "amber" },
  DELIVERED: { label: "Delivered", tone: "green" },
  COMPLETED: { label: "Completed", tone: "green" },
  CANCELLED: { label: "Cancelled", tone: "red" },
};
export const METHODS = [["CASH", "Cash"], ["BKASH", "bKash"], ["NAGAD", "Nagad"], ["BANK", "Bank"], ["LC", "LC"], ["OTHER", "Other"]] as const;
