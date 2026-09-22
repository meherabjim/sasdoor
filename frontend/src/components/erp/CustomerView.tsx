"use client";

import { useEffect } from "react";
import { X, ShoppingBag } from "lucide-react";
import { ftin, num, tk } from "@/lib/erp";
import { DoorPreview } from "@/components/erp/DoorPreview";

/**
 * The screen you turn towards the customer.
 *
 * A shopkeeper building a door while the customer watches is holding two screens at once:
 * their own, which has cost, margin, stock and the whole supplier menu on it, and the one
 * the customer should be looking at. Toggling a "hide cost" switch is not enough - what
 * gives the game away is everything around it. A customer who reads "In stock 12 CFT" or
 * "Wood Purchase Entry" in the sidebar learns something about the shop's position, and a
 * customer watching a price box being typed learns the price was decided just now.
 *
 * So this covers the lot. Nothing on this screen is derived from cost, profit, stock or
 * anything else the shop keeps to itself: it shows the door, what it is made of, what each
 * part costs the customer, and the total. That is the whole list of what a customer should
 * see, and there is nothing here that is not on it.
 */
export function CustomerView({ open, onClose, onOrder, door, quote, shopName }: {
  open: boolean;
  onClose: () => void;
  onOrder?: () => void;
  door: {
    type: "SINGLE" | "DOUBLE"; heightFt: number; widthFt: number; doorHex: string;
    designKey?: string | null; designSvg?: string | null; ornHex: string;
    woodName?: string; doorColorName?: string; designName?: string; designColorName?: string;
    withFrame?: boolean; withFitting?: boolean;
  };
  /** Selling side only. `cost` and `profit` are deliberately not part of this type. */
  quote: { lines: { name: string; sell: number }[]; total: number } | null;
  shopName?: string;
}) {
  // Escape closes it, because the one moment you need it gone is the moment the customer
  // steps away and you go back to what you were doing.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);

  if (!open) return null;

  const spec: [string, string][] = [
    ["Door", `${door.type === "DOUBLE" ? "Double" : "Single"}  ·  ${ftin(door.heightFt)} × ${ftin(door.widthFt)}`],
    ...(door.woodName ? [["Wood", door.woodName] as [string, string]] : []),
    ...(door.doorColorName ? [["Colour", door.doorColorName] as [string, string]] : []),
    ...(door.designName ? [["Carving", door.designName] as [string, string]] : []),
    ...(door.designColorName && door.designName ? [["Carving colour", door.designColorName] as [string, string]] : []),
    ["Frame", door.withFrame ? "Included" : "Not included"],
    ["Fitting", door.withFitting ? "Included" : "Not included"],
  ];

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#f6efe7] text-[#2f241d]">
      <div className="mx-auto max-w-6xl px-5 py-6 lg:px-8 lg:py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-bold tracking-tight text-[#46281b]">{shopName ?? "SAS DOOR"}</div>
            <p className="text-sm text-[#8a6f5a]">Your door, and what it comes to</p>
          </div>
          <button type="button" onClick={onClose}
            className="flex items-center gap-1.5 rounded-md border border-[#d9be9b] bg-white px-3 py-2 text-sm text-[#6d5442] hover:bg-[#faf3ea]">
            <X className="h-4 w-4" />Back to my panel
          </button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-[#e3c8a7] bg-[linear-gradient(135deg,#f5e8d7_0%,#efe0c7_100%)] p-6">
            <DoorPreview type={door.type} heightFt={door.heightFt} widthFt={door.widthFt} doorHex={door.doorHex}
              designKey={door.designSvg ? null : door.designKey ?? null} designSvg={door.designSvg ?? null}
              ornHex={door.ornHex} dims={false} className="max-h-[62vh] w-full" />
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-[#e3c8a7] bg-white p-5">
              <table className="w-full text-sm">
                <tbody>
                  {spec.map(([k, v]) => (
                    <tr key={k} className="border-b border-[#f5ead9] last:border-0">
                      <td className="py-2 pr-4 align-top text-[#8a6f5a]">{k}</td>
                      <td className="py-2 font-medium">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-2xl bg-[#46281b] p-5 text-white">
              {quote ? (
                <>
                  <ul className="space-y-2 text-sm">
                    {quote.lines.map((l, i) => (
                      <li key={i} className="flex items-start justify-between gap-3">
                        <span className="text-white/80">{l.name.replace(/ \(estimate\)$/, "")}</span>
                        <span className="font-mono [font-variant-numeric:tabular-nums]">{tk(l.sell)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 border-t border-white/15 pt-4">
                    <div className="text-xs uppercase tracking-wide text-[#c9b9a8]">Total price</div>
                    <div className="mt-1 font-mono text-4xl font-semibold text-[#e2b35c] [font-variant-numeric:tabular-nums]">{tk(quote.total)}</div>
                  </div>
                  {onOrder && (
                    <button type="button" onClick={onOrder}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#e2b35c] py-3 text-sm font-semibold text-[#1f1712] transition hover:bg-[#ecc57a]">
                      <ShoppingBag className="h-4 w-4" />This one, please
                    </button>
                  )}
                </>
              ) : (
                <p className="text-sm text-white/70">Pick a size and a wood to see the price.</p>
              )}
            </div>

            <p className="text-xs leading-5 text-[#8a6f5a]">
              Measurements are confirmed on site. Prices include the frame and fitting only where
              shown above.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * What a customer may be shown, and nothing else. Keeps the sell side and drops the rest -
 * and puts all the labour on one line, the way the customer's own page and the printed
 * sheet do, so "Show the customer" shows what they will really get.
 */
export const customerLines = (lines: { type?: string; name: string; sell: number }[] | undefined) => {
  const all = lines ?? [];
  const out = all.filter((l) => l.type !== "LABOUR").map((l) => ({ name: l.name, sell: num(l.sell) }));
  const work = all.filter((l) => l.type === "LABOUR").reduce((a, l) => a + num(l.sell), 0);
  if (work > 0) out.push({ name: "Labour (all work)", sell: Math.round(work * 100) / 100 });
  return out;
};
