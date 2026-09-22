"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import en from "@/messages/en.json";
import bn from "@/messages/bn.json";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

export default function UserDashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { language } = useLanguage();
  const { hydrated, isAuthenticated, logout } = useAuth();
  const t = language === "en" ? en.account : bn.account;

  useEffect(() => {
    if (hydrated && !isAuthenticated) router.replace("/login");
  }, [hydrated, isAuthenticated, router]);

  if (!hydrated) {
    return <div className="flex min-h-[55vh] items-center justify-center bg-[#f7f0e8] text-[#6d5442]">{t.loading}</div>;
  }
  if (!isAuthenticated) return null;

  // Orders have a door of their own. The dashboard answers "how am I doing" in three
  // numbers and the shop's latest word; everything about a particular door - what it is
  // made of, what it cost, where the work has got to, the copy to keep - is a lot to read
  // and belongs behind its own name, not stacked under a welcome message.
  const links = [
    [t.dashboard, "/dashboard"],
    [t.orders, "/dashboard/orders"],
    [t.profile, "/dashboard/profile"],
  ];

  return (
    <div className="min-h-[70vh] bg-[#f7f0e8] px-4 py-8">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="h-fit rounded-xl bg-[#4b2d20] p-4 text-white">
          <h2 className="mb-5 text-xl font-semibold">{t.myAccount}</h2>
          <nav className="grid gap-2">
            {links.map(([label, href]) => (
              <Link key={href} href={href} className={pathname === href ? "rounded-lg bg-white px-3 py-2 text-sm font-semibold text-[#4b2d20]" : "rounded-lg px-3 py-2 text-sm hover:bg-white/10"}>
                {label}
              </Link>
            ))}
          </nav>
          <button type="button" onClick={() => { logout(); router.push("/login"); }} className="mt-8 w-full rounded-lg border border-white/30 px-3 py-2 text-sm hover:bg-white/10">
            {t.logout}
          </button>
        </aside>
        <section className="rounded-xl border border-[#e3c8a7] bg-white p-5 shadow-sm sm:p-7">{children}</section>
      </div>
    </div>
  );
}
