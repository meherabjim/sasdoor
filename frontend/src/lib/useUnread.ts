"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { isAdminRole, useAuth } from "@/context/AuthContext";

/**
 * The customer's unread counts - the small numbers on "Dashboard" in the site header and on
 * the links in their account, like the count on a messages app. Shared by every badge, so
 * reading the messages on one screen clears the number on all of them at once.
 *
 * Refreshed when the page changes, every minute while the tab is open (an update from the
 * shop should appear without a reload), and straight away when something is marked read.
 */

export type Unread = { updates: number; orders: number; attention: number };
const NONE: Unread = { updates: 0, orders: 0, attention: 0 };
const CHANGED = "sas:unread-changed";

export function useUnread(): Unread {
  const { hydrated, isAuthenticated, role } = useAuth();
  const pathname = usePathname();
  // The shop's own login is not a customer: it has no messages, so it never asks.
  const customer = hydrated && isAuthenticated && !isAdminRole(role);
  const [counts, setCounts] = useState<Unread>(NONE);

  const load = useCallback(() => {
    if (!customer) return;
    apiRequest<{ data: Unread }>("/api/public/my/unread").then((r) => setCounts(r.data)).catch(() => {});
  }, [customer]);

  useEffect(() => { load(); }, [load, pathname]);
  useEffect(() => {
    if (!customer) return;
    const id = window.setInterval(load, 60_000);
    window.addEventListener(CHANGED, load);
    return () => { window.clearInterval(id); window.removeEventListener(CHANGED, load); };
  }, [customer, load]);

  return customer ? counts : NONE;
}

/** Mark every message read, then tell every badge on the page to count again. */
export async function markAllRead() {
  try {
    await apiRequest("/api/public/my/notifications/read", { method: "POST" });
  } finally {
    window.dispatchEvent(new Event(CHANGED));
  }
}

/** A small count bubble. Nothing at all when there is nothing new. */
export function badgeText(n: number) {
  return n > 9 ? "9+" : String(n);
}
