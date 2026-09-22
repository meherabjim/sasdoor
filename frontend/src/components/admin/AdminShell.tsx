"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, DoorOpen, Calculator, Users, SlidersHorizontal, Trees, Truck, PackagePlus,
  History, Boxes, Palette, Sparkles, HardHat, Wallet, Globe, CircleUser, LogOut, ExternalLink, ChevronDown, Menu, X,
  Inbox, ShoppingBag, TrendingUp,
} from "lucide-react";
import { isAdminRole, useAuth } from "@/context/AuthContext";
import { ConfirmProvider, ToastProvider, useLoad } from "@/components/erp/ui";

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

/**
 * Orders, customer requests and customers are not inside a group.
 *
 * Everything in a group is a place you go to set something up - prices, wood, suppliers.
 * These three are the opposite: they are the shop's actual business, and they change by
 * themselves while nobody is looking. So they sit on their own, at the level of the
 * Dashboard, one click from any page - and the number of untouched requests is visible
 * without opening anything.
 */
const MAIN: Item[] = [
  { href: "/admin/door/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/door/requests", label: "Customer Requests", icon: Inbox },
  { href: "/admin/door/customers", label: "Customers", icon: Users },
  // Its own screen, and never a panel on a screen you use in front of a customer.
  { href: "/admin/door/profit", label: "Profit", icon: TrendingUp },
];

const GROUPS: { key: string; label: string; icon: Item["icon"]; items: Item[] }[] = [
  { key: "door", label: "Door Estimate", icon: DoorOpen, items: [
    { href: "/admin/door/designer", label: "Design & Estimate", icon: Calculator },
    // Setting up who can be put on a job. The work itself is on the order, not here.
    { href: "/admin/door/workers", label: "Workers", icon: HardHat },
    { href: "/admin/door/settings", label: "Price Settings", icon: SlidersHorizontal },
  ] },
  { key: "supplier", label: "Supplier Management", icon: Truck, items: [
    { href: "/admin/supplier/purchase", label: "Wood Purchase Entry", icon: PackagePlus },
    { href: "/admin/supplier/suppliers", label: "Suppliers", icon: Truck },
    { href: "/admin/supplier/wood-types", label: "Wood Types", icon: Trees },
    { href: "/admin/supplier/history", label: "Purchase History", icon: History },
    { href: "/admin/supplier/stock", label: "Wood Stock Summary", icon: Boxes },
    { href: "/admin/supplier/colors", label: "Color Price", icon: Palette },
    { href: "/admin/supplier/designs", label: "Design Price", icon: Sparkles },
    { href: "/admin/supplier/labour", label: "Labour Price", icon: HardHat },
    { href: "/admin/supplier/due", label: "Supplier Due & Payment", icon: Wallet },
  ] },
  { key: "website", label: "Website Management", icon: Globe, items: [
    { href: "/admin/website", label: "Website Content", icon: Globe },
  ] },
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const activeGroup = GROUPS.find((g) => g.items.some((i) => pathname.startsWith(i.href)))?.key;
  const [open, setOpen] = useState<Record<string, boolean>>({ door: true, supplier: true, website: false });
  useEffect(() => { if (activeGroup) setOpen((o) => ({ ...o, [activeGroup]: true })); }, [activeGroup]);
  // Requests the customers sent in from the website that nobody has touched yet. The count
  // sits on the link so it is visible from every page, not only from the one it belongs to.
  //
  // It must ask the question the Requests screen asks, or the badge nags about rows that
  // screen does not show: a website door with a carving out of your own gallery is an
  // ordinary estimate, not a request - there is nothing for you to decide about it. What
  // belongs here is a carving the customer drew, still waiting on your price. Once you have
  // priced it the ball is in their court, so it stops counting.
  const web = useLoad<{ id: number }[]>("/api/admin/estimates?scope=requests&status=NEW");
  const waiting = web.data?.length ?? 0;
  /**
   * And the other thing that arrives while nobody is looking: a door somebody ordered off
   * the website out of your gallery. Nothing about it needs deciding - the customer already
   * said yes - but no wood moves and no work goes out until you confirm it, so it is worth a
   * number on the link rather than a discovery three days later.
   */
  const fresh = useLoad<{ id: number }[]>("/api/admin/estimates?scope=orders&source=WEBSITE&status=NEW");
  const unopened = fresh.data?.length ?? 0;
  // The sidebar is never remounted, so without this the badge would show the count from
  // whenever the tab was opened - still nagging about requests that were dealt with an
  // hour ago. Re-counted on every page change, which is when it could have changed.
  const reloadWeb = web.reload, reloadFresh = fresh.reload;
  useEffect(() => { reloadWeb(); reloadFresh(); }, [pathname, reloadWeb, reloadFresh]);

  const link = (href: string, label: string, Icon: Item["icon"], exact = false, indent = true, badge = 0) => {
    const active = exact ? pathname === href : pathname.startsWith(href);
    return (
      <Link key={href} href={href} onClick={onNavigate}
        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] transition ${indent ? "pl-9" : ""} ${active ? "bg-[#c8963e] font-semibold text-[#1f1712]" : "text-[#d8cabb] hover:bg-white/5 hover:text-white"}`}>
        <Icon className="h-4 w-4 shrink-0" /><span className="flex-1">{label}</span>
        {badge > 0 && <span className={`rounded-full px-1.5 text-[11px] font-semibold ${active ? "bg-[#1f1712] text-[#e2b35c]" : "bg-[#c8963e] text-[#1f1712]"}`}>{badge}</span>}
      </Link>
    );
  };

  return (
    <div className="flex h-full flex-col bg-[#1f1712] text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="text-lg font-bold tracking-wide text-[#e2b35c]">SAS DOOR</div>
        <div className="text-xs text-[#a8988a]">Door & Wood ERP</div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {link("/admin", "Dashboard", LayoutDashboard, true, false)}
        {GROUPS.map((g) => (
          <div key={g.key} className="pt-2">
            <button onClick={() => setOpen((o) => ({ ...o, [g.key]: !o[g.key] }))} aria-expanded={!!open[g.key]}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-semibold uppercase tracking-wide text-[#f1e6d8] hover:bg-white/5">
              <g.icon className="h-4 w-4" /><span className="flex-1">{g.label}</span>
              <ChevronDown className={`h-4 w-4 transition ${open[g.key] ? "rotate-180" : ""}`} />
            </button>
            {open[g.key] && <div className="mt-1 space-y-0.5">{g.items.map((i) => link(i.href, i.label, i.icon))}</div>}
            {/* The live lists sit here, under the setting-up groups and at the same level
                as the Dashboard - not tucked inside one of them. */}
            {g.key === "supplier" && (
              <div className="mt-3 space-y-0.5 border-t border-white/10 pt-3">
                {MAIN.map((i) => link(i.href, i.label, i.icon, false, false, i.href === "/admin/door/requests" ? waiting : i.href === "/admin/door/orders" ? unopened : 0))}
              </div>
            )}
          </div>
        ))}
      </nav>
      <div className="space-y-1 border-t border-white/10 px-3 py-3">
        {link("/admin/profile", user?.name ? String(user.name) : "My Profile", CircleUser, false, false)}
        <Link href="/" target="_blank" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] text-[#d8cabb] hover:bg-white/5"><ExternalLink className="h-4 w-4" />View Website</Link>
        <button onClick={() => { logout(); router.replace("/login"); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] text-[#d8cabb] hover:bg-white/5"><LogOut className="h-4 w-4" />Logout</button>
      </div>
    </div>
  );
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { hydrated, isAuthenticated, role } = useAuth();
  const [mobile, setMobile] = useState(false);
  const allowed = isAuthenticated && isAdminRole(role);

  useEffect(() => {
    if (hydrated && !allowed) router.replace("/login");
  }, [hydrated, allowed, router]);

  if (!hydrated || !allowed) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f6f3ee] text-sm text-[#7a6a5d]">Checking…</div>;
  }

  return (
    <ToastProvider><ConfirmProvider>
      <div className="min-h-screen bg-[#f6f3ee]">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block print:hidden"><Sidebar /></aside>
        {mobile && (
          <div className="fixed inset-0 z-50 lg:hidden print:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobile(false)} />
            <aside className="absolute inset-y-0 left-0 w-72"><Sidebar onNavigate={() => setMobile(false)} /></aside>
            <button onClick={() => setMobile(false)} className="absolute left-[296px] top-4 rounded-md bg-white p-1.5" aria-label="Close menu"><X className="h-5 w-5" /></button>
          </div>
        )}
        <div className="lg:pl-64 print:pl-0">
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[#e8e0d6] bg-white/90 px-4 py-3 backdrop-blur lg:hidden print:hidden">
            <button onClick={() => setMobile(true)} aria-label="Menu" className="rounded-md p-1.5 hover:bg-[#f3ece3]"><Menu className="h-5 w-5" /></button>
            <span className="font-bold text-[#1f1712]">SAS DOOR</span>
          </header>
          <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 print:p-0">{children}</main>
        </div>
      </div>
    </ConfirmProvider></ToastProvider>
  );
}
