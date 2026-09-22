"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/context/LanguageContext";
import { apiRequest } from "@/lib/api";
import { DoorPreview, designSvgSettled, toneOf, useDesignSvg } from "@/components/erp/DoorPreview";

export const num = (v: unknown) => Number(v ?? 0) || 0;
export const tk = (v: unknown) => `৳${Math.round(num(v)).toLocaleString("en-IN")}`;
export const date = (v: string) => new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export const STATUS: Record<string, [string, string, string]> = {
  NEW: ["Request received", "রিকোয়েস্ট পেয়েছি", "bg-sky-50 text-sky-700"],
  // The shop has worked out the real price for a carving this customer traced themselves.
  QUOTED: ["Final price ready", "চূড়ান্ত দাম এসেছে", "bg-amber-50 text-amber-800"],
  CONFIRMED: ["Confirmed", "কনফার্ম", "bg-violet-50 text-violet-700"],
  IN_PRODUCTION: ["Being made", "তৈরি হচ্ছে", "bg-amber-50 text-amber-800"], READY: ["Ready", "রেডি", "bg-amber-50 text-amber-800"],
  DELIVERED: ["Delivered", "ডেলিভারি হয়েছে", "bg-emerald-50 text-emerald-700"], COMPLETED: ["Completed", "সম্পন্ন", "bg-emerald-50 text-emerald-700"], CANCELLED: ["Cancelled", "বাতিল", "bg-red-50 text-red-700"],
};

export const ORDERED = ["CONFIRMED", "IN_PRODUCTION", "READY", "DELIVERED", "COMPLETED"];

/** One call, one shape, used by both screens in the account. */
export const useMyEstimates = () => {
  const [list, setList] = useState<any[] | null>(null);
  const [err, setErr] = useState("");
  const load = () => {
    apiRequest<{ data: any[] }>("/api/public/my/estimates")
      .then((r) => setList(r.data))
      .catch((e) => { setErr(e instanceof Error ? e.message : "Error"); setList([]); });
  };
  useEffect(load, []);
  return { list, err, setErr, load };
};

export const totalsOf = (list: any[] | null) =>
  (list ?? []).filter((e) => e.status !== "CANCELLED")
    .reduce((a, e) => ({ total: a.total + num(e.grandTotal), paid: a.paid + num(e.paidAmount), due: a.due + num(e.due) }), { total: 0, paid: 0, due: 0 });

/**
 * The customer's door, drawn properly.
 *
 * A component of its own because the drawing sometimes has to be fetched, and a hook
 * cannot be called inside a .map(). Two kinds of carving are not one of the fifteen
 * built-in styles: one the customer traced into this estimate (it travels with it), and
 * one traced into the shop's gallery (the estimate only names it). Miss either and the
 * customer is shown a plain door they did not order.
 */
export function OrderDoor({ e, dims = false, className = "w-full" }: { e: any; dims?: boolean; className?: string }) {
  const gallery = useDesignSvg(e.customDesignSvg ? null : e.designSvgUrl ?? null);
  const doorHex = e.doorColorCode ?? "#B07A45";
  const orn = e.designColorCode && e.designColorName !== "Tone-on-tone" ? e.designColorCode : toneOf(doorHex);
  const svg = e.customDesignSvg ?? gallery;
  return (
    <DoorPreview type={e.doorType} heightFt={num(e.heightFt)} widthFt={num(e.widthFt)} doorHex={doorHex}
      designKey={svg ? null : e.designKey} designSvg={svg} ornHex={orn} dims={dims} className={className} />
  );
}

/**
 * Every door this customer has asked for, and everything there is to say about each one.
 *
 * All of it in one place on purpose. A customer looking at their door wants the door, the
 * price, where the work has got to and the buttons that do something about it together -
 * not spread across a summary here and a detail page there.
 */
export function MyOrders() {
  const { language } = useLanguage();
  const L = (e: string, b: string) => (language === "en" ? e : b);
  const { list, err, setErr, load } = useMyEstimates();
  const [busy, setBusy] = useState(0);
  const [sheet, setSheet] = useState<any | null>(null);

  /** Accept the price the shop sent back. This is the moment it becomes a real order. */
  const accept = async (id: number) => {
    setBusy(id); setErr("");
    try {
      await apiRequest(`/api/public/my/estimates/${id}/accept`, { method: "POST" });
      load();
    } catch (e) { setErr(e instanceof Error ? e.message : "Error"); } finally { setBusy(0); }
  };

  /**
   * Say no.
   *
   * The other half of accepting, and it has to be on screen: a price you can only agree to
   * is not a price. Nothing has been made and nothing has been taken from stock, so this
   * simply ends the request - and the shop stops waiting on somebody who decided weeks ago.
   */
  const decline = async (id: number) => {
    if (!window.confirm(L("Cancel this request? Nothing has been made yet, and you can design another door any time.",
                          "এই রিকোয়েস্টটা বাতিল করবেন? এখনো কিছু বানানো হয়নি, যেকোনো সময় আবার দরজা ডিজাইন করতে পারবেন।"))) return;
    setBusy(id); setErr("");
    try {
      await apiRequest(`/api/public/my/estimates/${id}/decline`, { method: "POST" });
      load();
    } catch (e) { setErr(e instanceof Error ? e.message : "Error"); } finally { setBusy(0); }
  };

  return (
    <>
      {err && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      {list === null ? <p className="mt-4 text-sm text-[#8a6f5a]">{L("Loading...", "লোড হচ্ছে...")}</p> : list.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-[#d9be9b] p-8 text-center text-[#6d5442]">
          {L("No orders yet.", "এখনো কোনো অর্ডার নেই।")} <Link href="/design" className="font-semibold text-[#9b5528] underline">{L("Design your door", "দরজা ডিজাইন করুন")}</Link>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {list.map((e) => {
            const st = STATUS[e.status] ?? STATUS.NEW;
            return (
              <article key={e.id} className="grid gap-5 rounded-xl border border-[#e3c8a7] p-4 sm:grid-cols-[140px_1fr]">
                <div className="rounded-md bg-[#f5e8d7] p-2"><OrderDoor e={e} /></div>
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div><span className="font-semibold">{e.estimateNo}</span> <span className="text-sm text-[#8a6f5a]">· {date(e.createdAt)}</span></div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${st[2]}`}>{language === "en" ? st[0] : st[1]}</span>
                  </div>
                  <p className="mt-1 text-sm text-[#6d5442]">{e.doorType === "DOUBLE" ? L("Double", "ডাবল") : L("Single", "সিঙ্গেল")} · {num(e.heightFt)}&apos; × {num(e.widthFt)}&apos; · {e.woodName}{e.doorColorName ? ` · ${e.doorColorName}` : ""}{e.designName ? ` · ${e.designName}` : ""}</p>
                  <details className="mt-2 text-sm">
                    <summary className="cursor-pointer text-[#9b5528]">{L("Price details", "দামের বিস্তারিত")}</summary>
                    <ul className="mt-2 space-y-1">{e.lines.map((l: any, i: number) => <li key={i} className="flex justify-between gap-3"><span>{language === "en" ? l.name : l.nameBn ?? l.name}</span><span>{tk(l.sell)}</span></li>)}{num(e.discount) > 0 && <li className="flex justify-between"><span>{L("Discount", "ছাড়")}</span><span>−{tk(e.discount)}</span></li>}</ul>
                    {e.payments.length > 0 && <ul className="mt-2 space-y-1 border-t border-[#f0e2cf] pt-2">{e.payments.map((p: any, i: number) => <li key={i} className="flex justify-between"><span>{date(p.paidAt)} · {p.method}</span><span className="text-emerald-700">{tk(p.amount)}</span></li>)}</ul>}
                  </details>
                  {/* Two states worth saying out loud, because the number beside them means
                      different things: one is a guess we have admitted to, the other is the
                      price we will hold to. */}
                  {e.needsQuote && e.status === "NEW" && (
                    <p className="mt-3 rounded-md bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-900">
                      {L("We are working out the final price for your own carving. Everything else here is our fixed rate.",
                         "আপনার নিজের নকশাটার চূড়ান্ত দাম আমরা বের করছি। এখানে বাকি সবই আমাদের বাঁধা দাম।")}
                    </p>
                  )}
                  {e.status === "NEW" && (
                    <button type="button" disabled={busy === e.id} onClick={() => decline(e.id)}
                      className="mt-2 text-sm font-semibold text-[#9b5528] underline underline-offset-2 disabled:opacity-60">
                      {L("Cancel this request", "রিকোয়েস্টটা বাতিল করুন")}
                    </button>
                  )}
                  {e.status === "QUOTED" && (
                    <div className="mt-3 rounded-md bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
                      <p className="font-semibold">{L("This is the final price.", "এটাই চূড়ান্ত দাম।")}</p>
                      <p className="mt-0.5 text-xs leading-5">
                        {L("We have checked your carving and priced it. Place the order when you are ready.",
                           "আপনার নকশাটা দেখে দাম বসানো হয়েছে। প্রস্তুত হলে অর্ডার করে ফেলুন।")}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button type="button" disabled={busy === e.id} onClick={() => accept(e.id)}
                          className="rounded-md bg-[#9b5528] px-5 py-2 font-semibold text-white transition hover:bg-[#82461f] disabled:opacity-60">
                          {busy === e.id ? L("Placing…", "হচ্ছে…") : L("Place the order", "অর্ডার করুন")}
                        </button>
                        <button type="button" disabled={busy === e.id} onClick={() => decline(e.id)}
                          className="rounded-md border border-[#d9be9b] px-5 py-2 font-semibold text-[#8a6f5a] transition hover:bg-[#faf3ea] disabled:opacity-60">
                          {L("No thanks, cancel", "না, বাতিল করুন")}
                        </button>
                      </div>
                    </div>
                  )}
                  {/* How their door is coming along.
                      The job and where it has got to — and nothing else. How many men it
                      takes and which of them is on it is the shop's business: telling a
                      customer "3 men, 4 days" hands them the shop's cost structure and
                      promises a headcount that may have to change on the day. What they
                      asked is "where is my door", so that is what this answers. */}
                  {e.steps?.length > 0 && (
                    <div className="mt-3 rounded-md border border-[#f0e2cf] p-3">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#8a6f5a]">{L("Work on your door", "আপনার দরজার কাজ")}</div>
                      <ol className="space-y-2">
                        {e.steps.map((s: any, i: number) => (
                          <li key={i} className="flex items-center gap-2.5 text-sm">
                            <span aria-hidden className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                              s.state === "DONE" ? "bg-emerald-600 text-white" : s.state === "DOING" ? "bg-amber-400 text-[#4a3000]" : "bg-[#eadfd1] text-[#8a6f5a]"}`}>
                              {s.state === "DONE" ? "✓" : i + 1}
                            </span>
                            <span className={s.state === "DONE" ? "text-[#6d5442] line-through decoration-[#c9b9a8]" : "text-[#4a3d33]"}>{s.job}</span>
                            <span className="ml-auto whitespace-nowrap text-xs text-[#8a6f5a]">
                              {s.state === "DONE" ? L("Finished", "হয়ে গেছে") : s.state === "DOING" ? L("Being done now", "এখন হচ্ছে") : L("Waiting", "বাকি")}
                            </span>
                          </li>
                        ))}
                      </ol>
                      <p className="mt-2 text-xs text-[#8a6f5a]">
                        {L("Updated by the workshop as each job is finished.", "প্রতিটা কাজ শেষ হলে কারখানা থেকে আপডেট হয়।")}
                      </p>
                    </div>
                  )}

                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm [font-variant-numeric:tabular-nums]">
                    <div className="rounded-md bg-[#faf3ea] p-2"><div className="text-xs text-[#8a6f5a]">{L("Total", "মোট")}</div><b>{tk(e.grandTotal)}</b></div>
                    <div className="rounded-md bg-[#faf3ea] p-2"><div className="text-xs text-[#8a6f5a]">{L("Paid", "দিয়েছেন")}</div><b className="text-emerald-700">{tk(e.paidAmount)}</b></div>
                    <div className="rounded-md bg-[#faf3ea] p-2"><div className="text-xs text-[#8a6f5a]">{L("Due", "বাকি")}</div><b className={num(e.due) > 0 ? "text-red-600" : "text-emerald-700"}>{tk(e.due)}</b></div>
                  </div>
                  {/* Once it is an order there is something worth keeping, so there is a copy
                      to keep. The browser's own print dialog saves it as a PDF. */}
                  {ORDERED.includes(e.status) && (
                    <button type="button" onClick={() => setSheet(e)}
                      className="mt-3 rounded-md border border-[#d9be9b] px-4 py-2 text-sm font-semibold text-[#9b5528] transition hover:bg-[#faf3ea]">
                      {L("Download / print my order (PDF)", "আমার অর্ডার ডাউনলোড / প্রিন্ট (PDF)")}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {sheet && <OrderSheet key={sheet.id} e={sheet} language={language} onClose={() => setSheet(null)} />}
    </>
  );
}

/**
 * The customer's own copy of their order.
 *
 * It is the browser's print dialog rather than a file built on the server: "Save as PDF"
 * is in that dialog on every machine they are likely to be using, it costs the server
 * nothing, and what comes out is the door drawn properly rather than a flattened picture
 * of it. Cost and margin are not on this sheet - it shows what was agreed, and nothing
 * about how the shop got there.
 */
export function OrderSheet({ e, language, onClose }: { e: any; language: string; onClose: () => void }) {
  const L = (en: string, bn: string) => (language === "en" ? en : bn);
  /**
   * The drawing has to be in the page before the dialog opens.
   *
   * A gallery carving is fetched, not embedded, so a fixed wait was a race the printer
   * sometimes won - and the customer's copy came out with an empty door on it. This waits
   * for the drawing to settle instead of guessing at a number of milliseconds.
   */
  const galleryUrl = e.customDesignSvg ? null : e.designSvgUrl ?? null;
  useDesignSvg(galleryUrl);
  const drawn = designSvgSettled(galleryUrl);

  /**
   * Rendered straight onto <body>, not where it sits in the tree.
   *
   * Printing one box out of a page means taking it out of the flow and putting it at the
   * top of the paper, and "the top" is only the top if nothing above it is positioned. Down
   * inside the account page it would be measured from whichever ancestor happens to be
   * positioned, and the sheet would print an inch or a page late. On <body> there is
   * nothing above it to be measured from.
   */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Both, and in this order: the portal has to be in the document and the door has to be
  // drawn in it. Gating on only one of them is how you get a dialog over an empty page.
  const ready = mounted && drawn;
  useEffect(() => {
    if (!ready) return;
    const id = setTimeout(() => window.print(), 250);
    return () => clearTimeout(id);
  }, [ready]);

  if (!mounted) return null;

  return createPortal(
    <div id="order-sheet-wrap" className="fixed inset-0 z-[95] overflow-y-auto bg-black/50 p-4" onMouseDown={onClose}>
      {/*
        Printing one thing out of a page that contains a whole screen.

        Everything that is not this sheet is taken OUT of the page, not merely hidden. Hiding
        it was the obvious thing and it was wrong: a hidden box still occupies its space, so
        the paper got one page of order followed by five blank ones - the height of the whole
        account screen standing behind it - with the odd stubborn box showing through. Removed
        from the flow, the document is exactly as tall as the sheet, which is one page.

        This works because the sheet is portalled to be a direct child of <body>, so "every
        child of body except this one" names the rest of the site exactly.
      */}
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm }
          html, body {
            background: #fff !important; height: auto !important; min-height: 0 !important;
            margin: 0 !important; padding: 0 !important; overflow: visible !important;
          }
          body > * { display: none !important }
          body > #order-sheet-wrap {
            display: block !important; position: static !important; inset: auto !important;
            width: auto !important; height: auto !important; overflow: visible !important;
            background: none !important; padding: 0 !important; margin: 0 !important;
          }
          #order-sheet {
            max-width: none !important; margin: 0 !important; padding: 0 !important; border-radius: 0 !important;
            box-shadow: none !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
          }
          /* Keep a table or a block from being split across two sheets of paper. */
          #order-sheet table, #order-sheet tr, #order-sheet img, #order-sheet svg { break-inside: avoid; page-break-inside: avoid }
        }
      `}</style>
      <div id="order-sheet" onMouseDown={(ev) => ev.stopPropagation()} className="mx-auto max-w-[720px] rounded-xl bg-white p-6 text-[#2f241d]">
        <div className="flex items-start justify-between gap-4 border-b border-[#e3c8a7] pb-4">
          <div>
            <div className="text-lg font-bold tracking-tight">SAS DOOR</div>
            <div className="text-xs text-[#8a6f5a]">{L("Order confirmation", "অর্ডার কনফার্মেশন")}</div>
          </div>
          <div className="text-right text-sm">
            <div className="font-semibold">{e.estimateNo}</div>
            <div className="text-xs text-[#8a6f5a]">{date(e.createdAt)}</div>
          </div>
        </div>

        <div className="mt-4 grid gap-5 sm:grid-cols-[150px_1fr]">
          <div className="rounded-md bg-[#f5e8d7] p-2"><OrderDoor e={e} /></div>
          <div className="text-sm">
            <table className="w-full">
              <tbody>
                {([
                  [L("Door", "দরজা"), `${e.doorType === "DOUBLE" ? L("Double", "ডাবল") : L("Single", "সিঙ্গেল")} · ${num(e.heightFt)}' × ${num(e.widthFt)}'`],
                  [L("Wood", "কাঠ"), e.woodName],
                  [L("Door colour", "দরজার রং"), e.doorColorName ?? "—"],
                  [L("Carving", "নকশা"), e.customDesignName ?? e.designName ?? "—"],
                  [L("Carving colour", "নকশার রং"), e.designColorName ?? "—"],
                  [L("Frame", "চৌকাঠ"), e.withFrame ? L("Yes", "হ্যাঁ") : L("No", "না")],
                  [L("Fitting", "ফিটিং"), e.withFitting ? L("Yes", "হ্যাঁ") : L("No", "না")],
                ] as [string, string][]).map(([k, v]) => (
                  <tr key={k}><td className="py-1 pr-3 align-top text-[#8a6f5a]">{k}</td><td className="py-1 font-medium">{v}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <table className="mt-5 w-full text-sm">
          <thead><tr className="border-y border-[#e3c8a7] text-left text-xs uppercase tracking-wide text-[#8a6f5a]"><th className="py-2">{L("Item", "বিবরণ")}</th><th className="py-2 text-right">{L("Amount", "টাকা")}</th></tr></thead>
          <tbody>
            {e.lines.map((l: any, i: number) => (
              <tr key={i} className="border-b border-[#f0e2cf]"><td className="py-1.5">{language === "en" ? l.name : l.nameBn ?? l.name}</td><td className="py-1.5 text-right [font-variant-numeric:tabular-nums]">{tk(l.sell)}</td></tr>
            ))}
            {num(e.discount) > 0 && <tr className="border-b border-[#f0e2cf]"><td className="py-1.5">{L("Discount", "ছাড়")}</td><td className="py-1.5 text-right">−{tk(e.discount)}</td></tr>}
            <tr className="font-semibold"><td className="py-2">{L("Total", "মোট")}</td><td className="py-2 text-right [font-variant-numeric:tabular-nums]">{tk(e.grandTotal)}</td></tr>
            <tr><td className="py-1 text-[#8a6f5a]">{L("Paid", "দিয়েছেন")}</td><td className="py-1 text-right text-emerald-700 [font-variant-numeric:tabular-nums]">{tk(e.paidAmount)}</td></tr>
            <tr className="font-semibold"><td className="py-1">{L("Due", "বাকি")}</td><td className="py-1 text-right [font-variant-numeric:tabular-nums]">{tk(e.due)}</td></tr>
          </tbody>
        </table>

        <p className="mt-5 border-t border-[#e3c8a7] pt-3 text-xs leading-5 text-[#8a6f5a]">
          {L("Thank you for your order. We will contact you about delivery. Measurements are confirmed on site.",
             "অর্ডারের জন্য ধন্যবাদ। ডেলিভারি নিয়ে আমরা যোগাযোগ করব। মাপ সাইটে গিয়ে চূড়ান্ত করা হবে।")}
        </p>

        <div className="mt-5 flex justify-end gap-2 print:hidden">
          <button type="button" onClick={onClose} className="rounded-md border border-[#d9be9b] px-5 py-2.5">{L("Close", "বন্ধ")}</button>
          <button type="button" onClick={() => window.print()} className="rounded-md bg-[#9b5528] px-6 py-2.5 font-semibold text-white">{L("Print / Save as PDF", "প্রিন্ট / PDF")}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
