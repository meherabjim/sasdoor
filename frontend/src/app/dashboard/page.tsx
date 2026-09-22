"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { apiRequest } from "@/lib/api";
import { OrderDoor, STATUS, date, num, tk, totalsOf, useMyEstimates } from "@/components/dashboard/MyOrders";

/**
 * The customer's front page.
 *
 * It answers two questions and gets out of the way: where do I stand, and has the shop
 * said anything. The doors themselves - prices, progress, the buttons that answer the shop
 * - are behind "My Door Orders", where there is room for them. What is left here is a
 * reminder of what is on the go, with a way through to it.
 */
export default function DashboardPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const L = (e: string, b: string) => (language === "en" ? e : b);
  const { list, err } = useMyEstimates();
  const [visits, setVisits] = useState<any[]>([]);
  /** What the shop has told this customer — the same messages a text was made from. */
  const [news, setNews] = useState<any[]>([]);

  useEffect(() => {
    apiRequest<{ data: any[] }>("/api/public/my/visits").then((r) => setVisits(r.data)).catch(() => {});
    apiRequest<{ data: any[] }>("/api/public/my/notifications").then((r) => {
      setNews(r.data);
      // Seen is seen. Marked read once they are on screen, so the dot does not nag for ever.
      if (r.data.some((x) => !x.readAt)) apiRequest("/api/public/my/notifications/read", { method: "POST" }).catch(() => {});
    }).catch(() => {});
  }, []);

  const totals = totalsOf(list);
  const live = (list ?? []).filter((e) => e.status !== "CANCELLED" && e.status !== "COMPLETED");
  /** Something is waiting on them, not on us — worth saying on the front page. */
  const waiting = (list ?? []).filter((e) => e.status === "QUOTED").length;

  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a15e2b]">{L("My account", "আমার অ্যাকাউন্ট")}</p>
      <h1 className="mt-2 text-3xl font-semibold">{L("Welcome", "স্বাগতম")}, {String(user?.name ?? "")}</h1>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[[L("Total", "মোট"), totals.total, "text-[#2f241d]"], [L("Paid", "দিয়েছেন"), totals.paid, "text-emerald-700"], [L("Due", "বাকি"), totals.due, totals.due > 0 ? "text-red-600" : "text-emerald-700"]].map(([l, v, c]) => (
          <div key={String(l)} className="rounded-lg border border-[#e3c8a7] bg-[#fffaf4] p-4"><div className="text-xs uppercase tracking-wide text-[#8a6f5a]">{l}</div><div className={`mt-1 text-2xl font-semibold [font-variant-numeric:tabular-nums] ${c}`}>{tk(v)}</div></div>
        ))}
      </div>
      {err && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}

      {/* A price they have not answered yet is the one thing on this page that needs them
          to do something, so it says so plainly and points at the button. */}
      {waiting > 0 && (
        <div className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <b>{waiting === 1 ? L("Your final price is ready.", "আপনার চূড়ান্ত দাম এসেছে।") : L("Final prices are ready.", "চূড়ান্ত দাম এসেছে।")}</b>{" "}
          <Link href="/dashboard/orders" className="font-semibold underline underline-offset-2">
            {L("Open My Door Orders to accept or cancel.", "অর্ডার করতে বা বাতিল করতে My Door Orders খুলুন।")}
          </Link>
        </div>
      )}

      {/* What the shop has told them. The same words a text message was made from, kept
          here too — so a phone that missed the SMS, or a shop with no gateway at all,
          still leaves the customer knowing what happened. */}
      {news.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold">{L("Updates", "আপডেট")}</h2>
          <ul className="mt-3 divide-y divide-[#f0e2cf] rounded-xl border border-[#e3c8a7]">
            {news.slice(0, 6).map((x) => (
              <li key={x.id} className="flex gap-3 p-3.5">
                <span aria-hidden className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${x.readAt ? "bg-[#dcc9b0]" : "bg-[#9b5528]"}`} />
                <div className="min-w-0">
                  <div className="font-semibold text-[#2f241d]">{L(x.titleEn, x.titleBn)}{x.estimateNo ? <span className="ml-2 text-xs font-normal text-[#8a6f5a]">{x.estimateNo}</span> : null}</div>
                  <p className="mt-0.5 text-sm leading-6 text-[#6d5442]">{L(x.bodyEn, x.bodyBn)}</p>
                  <div className="mt-0.5 text-xs text-[#a08b76]">{date(x.createdAt)}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{L("My doors & orders", "আমার দরজা ও অর্ডার")}</h2>
        <Link href="/dashboard/orders" className="rounded-md bg-[#9b5528] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#82461f]">
          {L("My Door Orders", "আমার দরজার অর্ডার")}
        </Link>
      </div>

      {list === null ? <p className="mt-4 text-sm text-[#8a6f5a]">{L("Loading...", "লোড হচ্ছে...")}</p> : list.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-[#d9be9b] p-8 text-center text-[#6d5442]">
          {L("No orders yet.", "এখনো কোনো অর্ডার নেই।")} <Link href="/design" className="font-semibold text-[#9b5528] underline">{L("Design your door", "দরজা ডিজাইন করুন")}</Link>
        </div>
      ) : (
        // A glance, not the whole thing: the door, its number, where it stands. Everything
        // you can do about it is one tap away, on the page built for it.
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {(live.length ? live : list).slice(0, 4).map((e) => {
            const st = STATUS[e.status] ?? STATUS.NEW;
            return (
              <li key={e.id}>
                <Link href="/dashboard/orders" className="flex items-center gap-3 rounded-xl border border-[#e3c8a7] p-3 transition hover:bg-[#fffaf4]">
                  <span className="w-14 shrink-0 rounded-md bg-[#f5e8d7] p-1.5"><OrderDoor e={e} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{e.estimateNo}</span>
                    <span className="block truncate text-xs text-[#8a6f5a]">{e.doorType === "DOUBLE" ? L("Double", "ডাবল") : L("Single", "সিঙ্গেল")} · {num(e.heightFt)}&apos; × {num(e.widthFt)}&apos; · {e.woodName}</span>
                    <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${st[2]}`}>{language === "en" ? st[0] : st[1]}</span>
                  </span>
                  <span className="shrink-0 text-right text-sm font-semibold [font-variant-numeric:tabular-nums]">{tk(e.grandTotal)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {visits.length > 0 && (
        <>
          <h2 className="mt-8 text-xl font-semibold">{L("Visit requests", "ভিজিট রিকোয়েস্ট")}</h2>
          <ul className="mt-3 divide-y divide-[#f0e2cf] rounded-xl border border-[#e3c8a7] text-sm">
            {visits.map((v) => <li key={v.id} className="flex justify-between gap-3 p-3"><span>{date(v.createdAt)}{v.preferredDate ? ` → ${date(v.preferredDate)}` : ""}</span><span className="font-semibold">{v.status}</span></li>)}
          </ul>
        </>
      )}
    </>
  );
}
