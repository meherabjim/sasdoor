"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Estimates and orders are one list now. Old links and bookmarks land on it. */
export default function EstimatesRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/door/orders"); }, [router]);
  return null;
}
