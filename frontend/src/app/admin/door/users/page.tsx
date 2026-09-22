"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Accounts and customers are one list now. Old links and bookmarks land on it. */
export default function UsersRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/door/customers"); }, [router]);
  return null;
}
