"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import en from "@/messages/en.json";
import bn from "@/messages/bn.json";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/api";
import { DesignThumb, DoorPreview, DoorThumb, ornColor, useDesignSvg } from "@/components/erp/DoorPreview";
import { PhotoCarving, TracedCarving } from "@/components/public/PhotoCarving";

type Wrap<T> = { data: T; message?: string };
type Wood = { id: number; nameEn: string; nameBn: string; source: string; sellingPricePerCft: string; availableCft: number };
type Color = { id: number; type: "DOOR" | "DESIGN"; nameEn: string; nameBn: string; colorCode: string; isToneOnTone: boolean; sellSingle: string; sellDouble: string; suggestions: string[] };
/** `svgUrl` is set on a carving that came from a photo. Everything else about it is the
 *  same as one of the fifteen, and it is meant to behave the same everywhere. */
type Design = { id: number; key: string; nameEn: string; nameBn: string; allowDouble: boolean; sellSingle: string; sellDouble: string; svgUrl?: string | null };
type Quote = { totalCft: number; total: number; estimated?: boolean; lines: { type: string; name: string; sell: number; estimated?: boolean }[] };

const num = (v: unknown) => Number(v ?? 0) || 0;
const tk = (v: unknown) => `৳${Math.round(num(v)).toLocaleString("en-IN")}`;

export default function PublicDesigner() {
  const { language } = useLanguage();
  const t = language === "en" ? en.designer : bn.designer;
  const nm = (x: { nameEn: string; nameBn: string }) => (language === "en" ? x.nameEn : x.nameBn || x.nameEn);
  const { user, isAuthenticated } = useAuth();

  const [data, setData] = useState<{ settings: Record<string, string>; woods: Wood[]; colors: Color[]; designs: Design[] } | null>(null);
  const [err, setErr] = useState("");
  const [f, setF] = useState({ doorType: "SINGLE" as "SINGLE" | "DOUBLE", heightFt: 7, widthFt: 3, woodStockId: 0, doorColorId: 0, designId: 0, designColorId: 0, withFrame: true, withFitting: false });
  const [quote, setQuote] = useState<Quote | null>(null);
  const [open, setOpen] = useState(false);
  // A carving the customer traced from their own photo. It has no id, because it is not
  // one of the shop's carvings - it travels with the quote and with the request instead.
  const [custom, setCustom] = useState<TracedCarving | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));

  useEffect(() => {
    apiRequest<Wrap<any>>("/api/public/designer").then((r) => {
      setData(r.data);
      const doorC = r.data.colors.filter((c: Color) => c.type === "DOOR"), desC = r.data.colors.filter((c: Color) => c.type === "DESIGN");
      setF((x) => ({ ...x, woodStockId: r.data.woods[0]?.id ?? 0, doorColorId: doorC[0]?.id ?? 0, designColorId: desC[0]?.id ?? 0 }));
    }).catch((e) => setErr(e instanceof Error ? e.message : "Error"));
  }, []);

  const s = data?.settings ?? {};
  const limW = f.doorType === "SINGLE" ? [num(s.singleMinWidthFt) || 2, num(s.singleMaxWidthFt) || 4.5] : [num(s.doubleMinWidthFt) || 4, num(s.doubleMaxWidthFt) || 8];
  const limH = [num(s.minHeightFt) || 5, num(s.maxHeightFt) || 10];
  const sizeOk = f.heightFt >= limH[0] && f.heightFt <= limH[1] && f.widthFt >= limW[0] && f.widthFt <= limW[1];
  const doorColors = useMemo(() => data?.colors.filter((c) => c.type === "DOOR") ?? [], [data]);
  const designColors = useMemo(() => data?.colors.filter((c) => c.type === "DESIGN") ?? [], [data]);
  const doorColor = doorColors.find((c) => c.id === f.doorColorId);
  const designColor = designColors.find((c) => c.id === f.designColorId);
  const design = data?.designs.find((d) => d.id === f.designId);
  // A carving from a photo is stored as a drawing rather than one of the fifteen built-in
  // keys, so the drawing has to be fetched before the door can show it. Without this the
  // customer picked a carving off the gallery and watched a blank door appear.
  const designSvg = useDesignSvg(design?.svgUrl ?? null);
  const doorHex = doorColor?.colorCode ?? "#B07A45";
  const orn = ornColor(doorHex, designColor);
  // Picking a gallery carving and using your own are the same slot: only one can be on
  // the door, so choosing either clears the other.
  const hasCarving = !!f.designId || !!custom;
  const payload = {
    ...f,
    doorColorId: f.doorColorId || null,
    designId: f.designId || null,
    designColorId: hasCarving ? f.designColorId || null : null,
    withDelivery: false,
    custom: custom ? { svg: custom.svg, shapes: custom.shapes, coverage: custom.coverage, name: t.photoChosen } : null,
  };

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!data || !f.woodStockId || !sizeOk) { setQuote(null); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      apiRequest<Wrap<Quote>>("/api/public/quote", { method: "POST", body: JSON.stringify(payload) }).then((r) => setQuote(r.data)).catch(() => setQuote(null));
    }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f, data, sizeOk, custom]);

  const chip = "rounded-full border border-[#d9be9b] px-3 py-1 text-xs hover:border-[#9b5528]";
  const label = "mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-[#a15e2b]";

  return (
    <div className="bg-[#f6efe7] px-4 py-10 text-[#2f241d] lg:py-14">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a15e2b]">{t.badge}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{t.title}</h1>
        <p className="mt-3 max-w-2xl text-[#6d5442]">{t.description}</p>

        {err && <p className="mt-6 rounded-md bg-red-50 p-4 text-red-700">{err}</p>}
        {data && data.woods.length === 0 && <p className="mt-6 rounded-md bg-amber-50 p-4 text-amber-900">{t.noStock}</p>}

        {data && (
          <div className="mt-8 grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)_320px]">
            <div className="space-y-6 rounded-xl border border-[#e3c8a7] bg-white p-5">
              <div>
                <span className={label}>{t.type}</span>
                <div className="grid grid-cols-2 overflow-hidden rounded-md border border-[#d9be9b]">
                  {(["SINGLE", "DOUBLE"] as const).map((ty) => (
                    <button key={ty} type="button" aria-pressed={f.doorType === ty} onClick={() => set({ doorType: ty, widthFt: ty === "SINGLE" ? 3 : 5, designId: ty === "DOUBLE" && design && !design.allowDouble ? 0 : f.designId })}
                      className={`py-2.5 text-sm font-semibold ${f.doorType === ty ? "bg-[#46281b] text-white" : "bg-white hover:bg-[#faf3ea]"}`}>{ty === "SINGLE" ? t.single : t.double}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">{t.height}<input id="pd-h" type="number" step={0.25} min={limH[0]} max={limH[1]} value={f.heightFt} onChange={(e) => set({ heightFt: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-[#d9be9b] px-3 py-2.5 outline-none focus:border-[#9b5528]" /></label>
                <label className="text-sm">{t.width}<input id="pd-w" type="number" step={0.25} min={limW[0]} max={limW[1]} value={f.widthFt} onChange={(e) => set({ widthFt: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-[#d9be9b] px-3 py-2.5 outline-none focus:border-[#9b5528]" /></label>
              </div>
              <div className="flex flex-wrap gap-2">{(f.doorType === "SINGLE" ? [[6, 2.5], [7, 3], [8, 4]] : [[7, 5], [8, 6], [9, 7]]).map(([h, w]) => <button key={`${h}${w}`} type="button" className={chip} onClick={() => set({ heightFt: h, widthFt: w })}>{h}&apos; × {w}&apos;</button>)}</div>
              {!sizeOk && <p className="text-xs text-red-600">{limH[0]}–{limH[1]} ft × {limW[0]}–{limW[1]} ft</p>}
              <label className="block text-sm">{t.wood}
                <select id="pd-wood" value={f.woodStockId} onChange={(e) => set({ woodStockId: Number(e.target.value) })} className="mt-1 w-full rounded-md border border-[#d9be9b] bg-white px-3 py-2.5 outline-none focus:border-[#9b5528]">
                  {data.woods.map((w) => <option key={w.id} value={w.id}>{nm(w)} · {tk(w.sellingPricePerCft)}/CFT</option>)}
                </select>
              </label>
              <div>
                <span className={label}>{t.doorColor}: <span className="normal-case tracking-normal text-[#2f241d]">{doorColor && nm(doorColor)}</span></span>
                <div className="flex flex-wrap gap-2">{doorColors.map((c) => <button key={c.id} type="button" title={nm(c)} aria-label={nm(c)} aria-pressed={c.id === f.doorColorId} onClick={() => set({ doorColorId: c.id })} className={`h-8 w-8 rounded-full border-2 border-white ring-1 ${c.id === f.doorColorId ? "ring-2 ring-[#9b5528]" : "ring-[#d9be9b]"}`} style={{ background: c.colorCode }} />)}</div>
              </div>
              <div>
                <span className={label}>{t.carvingColor}: <span className="normal-case tracking-normal text-[#2f241d]">{designColor && nm(designColor)}</span></span>
                <div className="flex flex-wrap gap-2">{designColors.map((c) => <button key={c.id} type="button" title={nm(c)} aria-label={nm(c)} aria-pressed={c.id === f.designColorId} onClick={() => set({ designColorId: c.id })} className={`relative h-8 w-8 rounded-full border-2 border-white ring-1 ${c.id === f.designColorId ? "ring-2 ring-[#9b5528]" : "ring-[#d9be9b]"}`} style={{ background: c.isToneOnTone ? `conic-gradient(${doorHex} 0 50%, ${ornColor(doorHex, c)} 0 100%)` : c.colorCode }}>{doorColor?.suggestions.includes(c.nameEn) && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#e58d28]" />}</button>)}</div>
              </div>
              <div className="space-y-2 border-t border-[#f0e2cf] pt-4 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" checked={f.withFrame} onChange={(e) => set({ withFrame: e.target.checked })} className="h-4 w-4 accent-[#9b5528]" />{t.withFrame}</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={f.withFitting} onChange={(e) => set({ withFitting: e.target.checked })} className="h-4 w-4 accent-[#9b5528]" />{t.withFitting}</label>
              </div>
            </div>

            <div className="flex min-h-[460px] items-center justify-center rounded-xl border border-[#e3c8a7] bg-[linear-gradient(135deg,#f5e8d7_0%,#efe0c7_100%)] p-5">
              <DoorPreview type={f.doorType} heightFt={sizeOk ? f.heightFt : 7} widthFt={sizeOk ? f.widthFt : f.doorType === "SINGLE" ? 3 : 5} doorHex={doorHex}
                designKey={custom || designSvg ? null : design?.key} designSvg={custom?.svg ?? designSvg} ornHex={orn} className="max-h-[580px] w-full" />
            </div>

            <div className="h-fit space-y-4 rounded-xl bg-[#46281b] p-5 text-white lg:sticky lg:top-6">
              <p className="text-xs uppercase tracking-[0.2em] text-[#f5c07a]">{t.price}</p>
              <p className="text-4xl font-semibold text-[#f5c07a] [font-variant-numeric:tabular-nums]">{quote ? tk(quote.total) : "—"}</p>
              {quote && <p className="text-sm text-white/70">{t.cft}: {quote.totalCft} CFT</p>}
              {quote && (
                <ul className="space-y-1.5 border-t border-white/15 pt-3 text-sm">
                  {quote.lines.map((l, i) => (
                    <li key={i} className="flex justify-between gap-3">
                      <span className="text-white/80">
                        {l.name.replace(/ \(estimate\)$/, "")}
                        {l.estimated && <span className="ml-1.5 rounded-full bg-[#f5c07a]/25 px-1.5 py-0.5 text-[10px] font-semibold text-[#f5c07a]">{t.estimatedLine}</span>}
                      </span>
                      <span className="[font-variant-numeric:tabular-nums]">{tk(l.sell)}</span>
                    </li>
                  ))}
                </ul>
              )}
              {/* One line being an estimate changes what this whole panel means, so it is said
                  here rather than hidden in small print: everything else is a fixed rate. */}
              {quote?.estimated && <p className="rounded-md bg-[#f5c07a]/15 px-3 py-2 text-xs leading-5 text-[#f5c07a]">{t.estimatedNote}</p>}
              <button type="button" disabled={!quote} onClick={() => setOpen(true)} className="w-full rounded-md bg-[#e58d28] py-3 font-semibold text-white transition hover:bg-[#cf7a1c] disabled:opacity-50">{quote?.estimated ? t.askFinal : t.order}</button>
              <p className="text-xs text-white/60">{t.disclaimer}</p>
            </div>
          </div>
        )}

        {data && (
          <div className="mt-10">
            <h2 className="mb-4 text-2xl font-semibold">{t.carving}</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-8">
              {/* The customer's own photo sits first, beside the shop's carvings, because it
                  is the same choice: which carving goes on this door. */}
              <button type="button" aria-pressed={!!custom} onClick={() => setPhotoOpen(true)}
                className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed bg-[#fffdf8] p-2 text-center transition hover:-translate-y-0.5 ${custom ? "border-[#9b5528] ring-2 ring-[#9b5528]/25" : "border-[#d9be9b] hover:border-[#9b5528]"}`}>
                {custom
                  ? <DoorThumb designKey={null} designSvg={custom.svg} doorHex={doorHex} ornHex={orn} className="aspect-[3/5] w-full rounded bg-[#f6e8d7]" />
                  : <span className="flex aspect-[3/5] w-full items-center justify-center rounded bg-[#f6e8d7] text-3xl">🖼️</span>}
                <span className="text-sm font-semibold leading-tight">{custom ? t.photoChosen : t.photoTile}</span>
                <span className="text-xs text-[#a15e2b]">{custom ? t.photoChange : t.photoTileSub}</span>
              </button>
              {custom && (
                <button type="button" onClick={() => setCustom(null)}
                  className="flex flex-col items-center justify-center gap-2 rounded-md border border-[#e7d3bc] bg-[#fffdf8] p-2 text-center text-sm text-[#a15e2b] transition hover:-translate-y-0.5 hover:border-[#9b5528]">
                  <span className="text-2xl">✕</span>{t.photoRemove}
                </button>
              )}
              {[{ id: 0, key: "plain", nameEn: t.plain, nameBn: t.plain, allowDouble: true, sellSingle: "0", sellDouble: "0" }, ...data.designs].filter((d) => f.doorType === "SINGLE" || d.allowDouble).map((d) => (
                <button key={d.id} type="button" aria-pressed={!custom && f.designId === d.id} onClick={() => { setCustom(null); set({ designId: d.id }); }}
                  className={`flex flex-col gap-1.5 rounded-md border bg-[#fffdf8] p-2 text-left transition hover:-translate-y-0.5 ${!custom && f.designId === d.id ? "border-[#9b5528] ring-2 ring-[#9b5528]/25" : "border-[#e7d3bc]"}`}>
                  <DesignThumb design={d.id ? { key: d.key, svgUrl: d.svgUrl, origin: d.svgUrl ? "UPLOADED" : "BUILTIN" } : null} doorHex={doorHex} ornHex={orn} className="aspect-[3/5] w-full rounded bg-[#f6e8d7]" />
                  <span className="text-sm font-semibold leading-tight">{nm(d)}</span>
                  <span className="text-xs text-[#a15e2b]">{d.id ? `+${tk(f.doorType === "DOUBLE" ? d.sellDouble : d.sellSingle)}` : "৳0"}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <PhotoCarving open={photoOpen} onClose={() => setPhotoOpen(false)} t={t as unknown as Record<string, string>}
        door={{ type: f.doorType, heightFt: sizeOk ? f.heightFt : 7, widthFt: sizeOk ? f.widthFt : f.doorType === "SINGLE" ? 3 : 5, doorHex, ornHex: orn }}
        onUse={(c) => { setCustom(c); set({ designId: 0 }); setPhotoOpen(false); }} />
      {open && quote && <OrderDialog t={t} payload={payload} quote={quote} preview={{ type: f.doorType, heightFt: f.heightFt, widthFt: f.widthFt, doorHex, designKey: custom || designSvg ? null : design?.key, designSvg: custom?.svg ?? designSvg, ornHex: orn }} defaults={{ name: String(user?.name ?? ""), phone: String(user?.phone ?? ""), address: String(user?.address ?? "") }} loggedIn={isAuthenticated} onClose={() => setOpen(false)} />}
    </div>
  );
}

function OrderDialog({ t, payload, quote, preview, defaults, onClose }: { t: typeof en.designer; payload: object; quote: Quote; preview: any; defaults: { name: string; phone: string; address: string }; loggedIn: boolean; onClose: () => void }) {
  const [c, setC] = useState({ ...defaults, note: "", advance: "", paymentMethod: "CASH", trxId: "" });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [needsQuote, setNeedsQuote] = useState(false);
  const [err, setErr] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSending(true); setErr("");
    try {
      const r = await apiRequest<Wrap<{ estimateNo: string; needsQuote?: boolean }>>("/api/public/orders", { method: "POST", body: JSON.stringify({ ...payload, customer: { name: c.name, phone: c.phone, address: c.address || null }, note: c.note || null, advance: c.paymentMethod === "CASH" ? 0 : num(c.advance), paymentMethod: c.paymentMethod, trxId: c.trxId || null }) });
      setNeedsQuote(!!r.data.needsQuote); setDone(r.data.estimateNo);
    } catch (x) { setErr(x instanceof Error ? x.message : "Error"); } finally { setSending(false); }
  };
  const inp = "mt-1 w-full rounded-md border border-[#d9be9b] px-3 py-2.5 outline-none focus:border-[#9b5528]";
  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-10" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={t.orderTitle} onMouseDown={(e) => e.stopPropagation()} className="grid w-full max-w-3xl overflow-hidden rounded-xl bg-white md:grid-cols-[260px_1fr]">
        <div className="bg-[#f5e8d7] p-4"><DoorPreview {...preview} dims={false} className="mx-auto max-h-[320px] w-full" /><p className="mt-3 text-center text-2xl font-semibold text-[#46281b]">{tk(quote.total)}</p></div>
        {done ? (
          <div className="flex flex-col justify-center gap-3 p-8">
            <p className="text-2xl font-semibold text-[#46281b]">{t.success}: {done}</p>
            <p className="text-[#6d5442]">{needsQuote ? t.successQuote : t.successNote}</p>
            <button onClick={onClose} className="mt-3 w-fit rounded-md bg-[#46281b] px-6 py-2.5 text-white">OK</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 p-6">
            <h3 className="text-xl font-semibold">{t.orderTitle}</h3>
            <label className="block text-sm">{t.name}<input id="po-name" required minLength={2} value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} className={inp} /></label>
            <label className="block text-sm">{t.phone}<input id="po-phone" required pattern="01[0-9]{9}" placeholder="01XXXXXXXXX" value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} className={inp} /></label>
            <label className="block text-sm">{t.address}<input id="po-addr" value={c.address} onChange={(e) => setC({ ...c, address: e.target.value })} className={inp} /></label>
            <label className="block text-sm">{t.note}<textarea id="po-note" rows={3} value={c.note} onChange={(e) => setC({ ...c, note: e.target.value })} className={inp} /></label>
            <fieldset className="space-y-3 rounded-md border border-[#e7d3bc] p-3">
              <legend className="px-1 text-sm font-semibold">{t.payment}</legend>
              <p className="text-xs leading-5 text-[#6d5442]">{t.payInfo}</p>
              <label className="block text-sm">{t.method}
                <select id="po-met" value={c.paymentMethod} onChange={(e) => setC({ ...c, paymentMethod: e.target.value })} className={inp}>
                  <option value="CASH">{t.cashOnVisit}</option><option value="BKASH">bKash</option><option value="NAGAD">Nagad</option><option value="BANK">Bank</option>
                </select>
              </label>
              {c.paymentMethod !== "CASH" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm">{t.payNow}<input id="po-adv" type="number" min={0} max={quote.total} value={c.advance} onChange={(e) => setC({ ...c, advance: e.target.value })} className={inp} /></label>
                  <label className="block text-sm">{t.trxId}<input id="po-trx" required={num(c.advance) > 0} value={c.trxId} onChange={(e) => setC({ ...c, trxId: e.target.value })} className={inp} /></label>
                </div>
              )}
              <div className="grid grid-cols-3 overflow-hidden rounded-md border border-[#e7d3bc] text-center text-sm [font-variant-numeric:tabular-nums]">
                <div className="p-2"><div className="text-xs text-[#8a6f5a]">{t.total}</div><b>{tk(quote.total)}</b></div>
                <div className="border-x border-[#e7d3bc] p-2"><div className="text-xs text-[#8a6f5a]">{t.payNow}</div><b className="text-emerald-700">{tk(c.paymentMethod === "CASH" ? 0 : num(c.advance))}</b></div>
                <div className="bg-[#46281b] p-2 text-white"><div className="text-xs text-white/70">{t.due}</div><b className="text-[#f5c07a]">{tk(quote.total - (c.paymentMethod === "CASH" ? 0 : num(c.advance)))}</b></div>
              </div>
            </fieldset>
            {err && <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{err}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="rounded-md border border-[#d9be9b] px-5 py-2.5">✕</button>
              <button disabled={sending} className="rounded-md bg-[#9b5528] px-6 py-2.5 font-semibold text-white disabled:opacity-60">{sending ? t.sending : t.submit}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
