"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

/**
 * Two small things the customer's account was missing.
 *
 * Where is my door: every order shows the whole road it travels - asked, priced, ordered,
 * being made, ready, delivered - with the step it is on lit up. The status pill alone said
 * "Confirmed" and left them to guess what comes next and how far that is.
 *
 * And who do I ask: the shop's phone, as a Call button and a WhatsApp button with the
 * order number already typed in, so a question about a door reaches the person who can
 * answer it. Both disappear while the shop has no phone in Price Settings.
 */

type L = (en: string, bn: string) => string;

/** The road, in order. "Priced" is only on it for a carving the customer drew themselves. */
const ROAD: { key: string; en: string; bn: string; at: string[] }[] = [
  { key: "asked", en: "Request sent", bn: "রিকোয়েস্ট পাঠানো", at: ["NEW"] },
  { key: "priced", en: "Final price", bn: "চূড়ান্ত দাম", at: ["QUOTED"] },
  { key: "ordered", en: "Order confirmed", bn: "অর্ডার কনফার্ম", at: ["CONFIRMED"] },
  { key: "making", en: "Being made", bn: "তৈরি হচ্ছে", at: ["IN_PRODUCTION"] },
  { key: "ready", en: "Ready", bn: "রেডি", at: ["READY"] },
  { key: "delivered", en: "Delivered", bn: "ডেলিভারি", at: ["DELIVERED", "COMPLETED"] },
];

export function OrderJourney({ status, ownCarving, L }: { status: string; ownCarving: boolean; L: L }) {
  if (status === "CANCELLED") return null;
  const road = ROAD.filter((s) => ownCarving || s.key !== "priced");
  const here = Math.max(0, road.findIndex((s) => s.at.includes(status)));
  return (
    <ol className="mt-3 flex items-start" aria-label={L("Where your door is", "আপনার দরজা কোথায় আছে")}>
      {road.map((s, i) => {
        const done = i < here || (i === here && (status === "DELIVERED" || status === "COMPLETED"));
        const now = i === here && !done;
        return (
          <li key={s.key} className="relative flex flex-1 flex-col items-center text-center" aria-current={now ? "step" : undefined}>
            {i > 0 && <span aria-hidden className={`absolute right-1/2 top-2.5 h-0.5 w-full ${i <= here ? "bg-[#9b5528]" : "bg-[#eadfd1]"}`} />}
            <span aria-hidden className={`relative z-10 grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${
              done ? "bg-[#9b5528] text-white" : now ? "bg-white text-[#9b5528] ring-2 ring-[#9b5528]" : "bg-[#eadfd1] text-[#a08b76]"}`}>
              {done ? "✓" : i + 1}
            </span>
            <span className={`mt-1 px-0.5 text-[11px] leading-tight ${now ? "font-semibold text-[#2f241d]" : done ? "text-[#6d5442]" : "text-[#a08b76]"}`}>{L(s.en, s.bn)}</span>
          </li>
        );
      })}
    </ol>
  );
}

export type Shop = { name: string; phone: string | null; address: string | null };

/** The shop's contact details, asked once per page. */
export function useShop(): Shop | null {
  const [shop, setShop] = useState<Shop | null>(null);
  useEffect(() => {
    apiRequest<{ data: Shop }>("/api/public/shop").then((r) => setShop(r.data)).catch(() => {});
  }, []);
  return shop;
}

/** 01XXXXXXXXX (or +880…) as WhatsApp wants it: country code, digits only. */
const waNumber = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  return d.startsWith("880") ? d : d.startsWith("0") ? `88${d}` : d;
};

/** Call and WhatsApp buttons. `about` puts an order number into the WhatsApp message. */
export function ContactShop({ shop, about, L, compact = false }: { shop: Shop | null; about?: string; L: L; compact?: boolean }) {
  if (!shop?.phone) return null;
  const text = about ? L(`Hello, I have a question about my door ${about}.`, `আসসালামু আলাইকুম, আমার দরজা ${about} নিয়ে একটা প্রশ্ন ছিল।`) : "";
  const wa = `https://wa.me/${waNumber(shop.phone)}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
  const btn = compact
    ? "rounded-md border border-[#d9be9b] px-3 py-1.5 text-xs font-semibold text-[#9b5528] hover:bg-[#faf3ea]"
    : "rounded-md border border-[#d9be9b] bg-white px-4 py-2 text-sm font-semibold text-[#9b5528] hover:bg-[#faf3ea]";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a href={`tel:${shop.phone}`} className={btn}>📞 {L("Call", "কল করুন")}</a>
      <a href={wa} target="_blank" rel="noopener noreferrer" className={btn}>💬 WhatsApp</a>
    </div>
  );
}
