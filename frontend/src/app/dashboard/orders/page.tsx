"use client";

import { useLanguage } from "@/context/LanguageContext";
import { MyOrders } from "@/components/dashboard/MyOrders";

/**
 * Every door this customer has asked for.
 *
 * Its own screen rather than a block on the dashboard, because this is the page they come
 * back to: what they ordered, what it costs, how far along it is, and the buttons that
 * answer the shop - accept the price, call it off, keep a copy.
 */
export default function MyOrdersPage() {
  const { language } = useLanguage();
  const L = (e: string, b: string) => (language === "en" ? e : b);
  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a15e2b]">{L("My account", "আমার অ্যাকাউন্ট")}</p>
      <h1 className="mt-2 text-3xl font-semibold">{L("My door orders", "আমার দরজার অর্ডার")}</h1>
      <p className="mt-2 text-sm leading-6 text-[#6d5442]">
        {L("Every door you have asked us for, with its price, how far along it is, and your copy to keep.",
           "আপনার চাওয়া প্রতিটা দরজা — দাম, কাজ কতদূর এগিয়েছে, আর আপনার নিজের কপি।")}
      </p>
      <MyOrders />
    </>
  );
}
