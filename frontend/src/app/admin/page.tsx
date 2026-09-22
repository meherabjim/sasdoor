"use client";

import Link from "next/link";
import { Calculator, PackagePlus, Boxes, ShoppingBag } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const QUICK = [
  { href: "/admin/door/designer", label: "Design & Estimate", note: "Build a door, quote it", icon: Calculator },
  { href: "/admin/door/orders", label: "Orders", note: "Orders, payments, dues", icon: ShoppingBag },
  { href: "/admin/supplier/purchase", label: "Wood Purchase Entry", note: "Add wood purchases", icon: PackagePlus },
  { href: "/admin/supplier/stock", label: "Wood Stock", note: "Stock and selling prices", icon: Boxes },
];

export default function AdminHome() {
  const { user } = useAuth();
  return (
    <div className="py-6">
      <p className="text-sm text-[#7a6a5d]">Dashboard</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#1f1712]">Welcome, {String(user?.name ?? "Admin")}</h1>
      <p className="mt-2 max-w-xl text-[#7a6a5d]">Reports and charts will appear here later. Start from the shortcuts below.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {QUICK.map((q) => (
          <Link key={q.href} href={q.href} className="group rounded-xl border border-[#e8e0d6] bg-white p-5 transition hover:border-[#c8963e] hover:shadow-sm">
            <q.icon className="h-6 w-6 text-[#a0712a]" />
            <div className="mt-4 font-semibold text-[#1f1712]">{q.label}</div>
            <div className="text-sm text-[#7a6a5d]">{q.note}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
