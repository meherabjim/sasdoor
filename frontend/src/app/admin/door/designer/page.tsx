"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Save, TriangleAlert, ShoppingBag, ImagePlus, Library, Trash2 } from "lucide-react";
import { api, errMsg, fmtNum, num, tk, METHODS } from "@/lib/erp";
import { Badge, Button, Card, ErrorBox, Field, Input, Loading, Modal, PageHeader, Select, Textarea, Toggle, useAction, useConfirm } from "@/components/erp/ui";
import { DesignThumb, DoorPreview, lum, ornColor, useDesignSvg } from "@/components/erp/DoorPreview";
import { DesignUploadModal } from "@/components/erp/DesignUploadModal";
import { CustomerView, customerLines } from "@/components/erp/CustomerView";

type Stock = { id: number; source: string; availableCft: number; sellingPricePerCft: string; activeCostPerCft: string; woodType: { nameEn: string; nameBn: string; active: boolean } };
type Color = { id: number; type: "DOOR" | "DESIGN"; nameEn: string; colorCode: string; isToneOnTone: boolean; active: boolean; suggestions: string[]; sellSingle: string; sellDouble: string };
type Design = { id: number; key: string; nameEn: string; noteEn?: string; allowDouble: boolean; active: boolean; sellSingle: string; sellDouble: string; labourSellSingle: string; labourSellDouble: string; svgUrl?: string | null; origin?: "BUILTIN" | "UPLOADED"; visibility?: "PRIVATE" | "LIBRARY" };
type CrewLine = { name: string; workers: number; days: number };
type Quote = { doorCft: number; frameCft: number; totalCft: number; bigDoor: boolean; enoughStock: boolean; availableCft: number; lines: { type: string; name: string; cost: number; sell: number }[]; totalCost: number; totalSell: number; profit: number; crew?: CrewLine[]; crewTotal?: { workers: number; days: number } };

const PRESETS: Record<"SINGLE" | "DOUBLE", [number, number][]> = { SINGLE: [[6, 2.5], [7, 3], [8, 4]], DOUBLE: [[7, 5], [8, 6], [9, 7]] };

export default function DesignerPage() {
  const router = useRouter();
  const [ref, setRef] = useState<{ stock: Stock[]; colors: Color[]; designs: Design[]; settings: Record<string, string> } | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [f, setF] = useState({ doorType: "SINGLE" as "SINGLE" | "DOUBLE", heightFt: 7, widthFt: 3, woodStockId: 0, doorColorId: 0, designId: 0, designColorId: 0, withFrame: true, withFitting: false, withDelivery: false });
  const [quote, setQuote] = useState<Quote | null>(null);
  const [qErr, setQErr] = useState("");
  const [saveOpen, setSaveOpen] = useState<false | "ESTIMATE" | "ORDER">(false);
  const [editEst, setEditEst] = useState<any | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  // The screen turned towards the customer. Everything the shop keeps to itself - cost,
  // margin, stock, the supplier menu - is off it, so it can be shown without a second thought.
  const [customerView, setCustomerView] = useState(false);
  const { run } = useAction();
  const confirm = useConfirm();
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));

  useEffect(() => {
    // The gallery is the LIBRARY list. A carving made from a customer photo stays
    // PRIVATE to its estimate, and `include` pulls that one row back in when editing it.
    const editId = new URLSearchParams(window.location.search).get("edit");
    Promise.all([api.get<Stock[]>("/api/admin/stock"), api.get<Color[]>("/api/admin/colors"), api.get<Design[]>("/api/admin/designs?visibility=LIBRARY"), api.get("/api/admin/settings")])
      .then(([stock, colors, designs, settings]) => {
        const s = stock.filter((x) => x.availableCft > 0 && x.woodType.active);
        const c = colors.filter((x) => x.active), d = designs.filter((x) => x.active);
        setRef({ stock: s, colors: c, designs: d, settings });
        setF((x) => ({ ...x, woodStockId: s[0]?.id ?? 0, doorColorId: c.find((k) => k.type === "DOOR")?.id ?? 0, designColorId: c.find((k) => k.type === "DESIGN")?.id ?? 0 }));
        if (editId) api.get(`/api/admin/estimates/${editId}`).then((e: any) => {
          if (e.status !== "NEW") return;
          setEditEst(e);
          setF({ doorType: e.doorType, heightFt: num(e.heightFt), widthFt: num(e.widthFt), woodStockId: e.woodStockId, doorColorId: e.doorColorId ?? 0, designId: e.designId ?? 0, designColorId: e.designColorId ?? (c.find((k) => k.type === "DESIGN")?.id ?? 0), withFrame: e.withFrame, withFitting: e.withFitting, withDelivery: e.withDelivery });
          if (!s.some((x) => x.id === e.woodStockId)) setRef((r) => r && ({ ...r, stock: [...r.stock, stock.find((x) => x.id === e.woodStockId)!].filter(Boolean) }));
          // the estimate's own private carving, so the tile and preview still work
          if (e.designId && !d.some((x) => x.id === e.designId)) {
            api.get<Design[]>(`/api/admin/designs?visibility=LIBRARY&include=${e.designId}`)
              .then((all) => setRef((r) => r && ({ ...r, designs: all.filter((x) => x.active) })))
              .catch(() => {});
          }
        }).catch(() => {});
      }).catch((e) => setLoadErr(errMsg(e)));
  }, []);

  const doorColors = ref?.colors.filter((c) => c.type === "DOOR") ?? [];
  const designColors = ref?.colors.filter((c) => c.type === "DESIGN") ?? [];
  const doorColor = doorColors.find((c) => c.id === f.doorColorId);
  const designColor = designColors.find((c) => c.id === f.designColorId);
  const design = ref?.designs.find((d) => d.id === f.designId);
  const designSvg = useDesignSvg(design?.origin === "UPLOADED" ? design?.svgUrl : null);
  const doorHex = doorColor?.colorCode ?? "#B07A45";
  const orn = ornColor(doorHex, designColor);
  const lowContrast = !!design && !!designColor && !designColor.isToneOnTone && Math.abs(lum(doorHex) - lum(orn)) < 0.1;
  const limits = useMemo(() => {
    const s = ref?.settings ?? {};
    return f.doorType === "SINGLE" ? { h: [num(s.minHeightFt) || 5, num(s.maxHeightFt) || 10], w: [num(s.singleMinWidthFt) || 2, num(s.singleMaxWidthFt) || 4.5] } : { h: [num(s.minHeightFt) || 5, num(s.maxHeightFt) || 10], w: [num(s.doubleMinWidthFt) || 4, num(s.doubleMaxWidthFt) || 8] };
  }, [ref, f.doorType]);
  const sizeOk = f.heightFt >= limits.h[0] && f.heightFt <= limits.h[1] && f.widthFt >= limits.w[0] && f.widthFt <= limits.w[1];

  // live quote (server = single source of truth for prices)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!ref || !f.woodStockId || !sizeOk) { setQuote(null); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const r = await api.post<Quote>("/api/admin/estimates/quote", { ...f, doorColorId: f.doorColorId || null, designId: f.designId || null, designColorId: f.designId ? f.designColorId || null : null });
        setQuote(r.data); setQErr("");
      } catch (e) { setQErr(errMsg(e)); }
    }, 250);
  }, [f, ref, sizeOk]);

  if (loadErr) return <ErrorBox text={loadErr} />;
  if (!ref) return <Loading />;

  const suggested = doorColor?.suggestions ?? [];
  /** Throw away a carving that came from a photo. The server keeps it if an estimate names it. */
  const removeDesign = async (d: Design) => {
    const yes = await confirm({
      title: `Delete “${d.nameEn}”?`,
      message: "It stops being offered here and on the website. Estimates already made keep their own copy of the carving, so nothing you have agreed changes.",
      danger: true, confirmText: "Delete",
    });
    if (!yes) return;
    if (!(await run(() => api.del(`/api/admin/designs/${d.id}`)))) return;
    setRef((r) => r && ({ ...r, designs: r.designs.filter((x) => x.id !== d.id) }));
    if (f.designId === d.id) set({ designId: 0 });
  };

  /** Move a customer's carving into the gallery so it can be shown to the next customer. */
  const promote = async (d: Design) => {
    if (!(await run(() => api.patch(`/api/admin/designs/${d.id}/visibility`, { visibility: "LIBRARY" })))) return;
    setRef((r) => r && ({ ...r, designs: r.designs.map((x) => (x.id === d.id ? { ...x, visibility: "LIBRARY" as const } : x)) }));
  };
  const price = (a: string, b: string) => num(f.doorType === "DOUBLE" ? b : a);

  return (
    <>
      {/* Two buttons, because there are only two things to do from here: turn the screen
          round, or write the door down. Orders, customer requests and the estimate list
          have their own places in the sidebar now. */}
      <PageHeader title={editEst ? `Edit estimate: ${editEst.estimateNo}` : "Design & Estimate"} sub="Build the door with the customer, then save it as an estimate or straight as an order."
        actions={<>
          <Button variant="soft" onClick={() => setCustomerView(true)} disabled={!quote}><Eye className="h-4 w-4" />Show the customer</Button>
          <Button variant="ghost" onClick={() => setSaveOpen("ESTIMATE")} disabled={!quote}><Save className="h-4 w-4" />{editEst ? "Update estimate" : "Save estimate"}</Button>
        </>} />

      {ref.stock.length === 0 && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          No wood in stock. First add wood from <button className="font-semibold underline" onClick={() => router.push("/admin/supplier/purchase")}>Wood Purchase Entry</button> (or Opening Stock).
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)_330px]">
        {/* CONFIG */}
        <Card title="Configuration">
          <div className="space-y-5">
            <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-[#e0d6ca]">
              {(["SINGLE", "DOUBLE"] as const).map((t) => (
                <button key={t} onClick={() => set({ doorType: t, widthFt: t === "SINGLE" ? 3 : 5, designId: t === "DOUBLE" && design && !design.allowDouble ? 0 : f.designId })} aria-pressed={f.doorType === t}
                  className={`py-2.5 text-sm font-medium ${f.doorType === t ? "bg-[#1f1712] text-white" : "bg-white text-[#1f1712] hover:bg-[#faf7f3]"}`}>{t === "SINGLE" ? "Single" : "Double"}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Height (ft)"><Input id="d-h" type="number" step={0.25} min={limits.h[0]} max={limits.h[1]} value={f.heightFt} onChange={(e) => set({ heightFt: Number(e.target.value) })} /></Field>
              <Field label="Width (ft)"><Input id="d-w" type="number" step={0.25} min={limits.w[0]} max={limits.w[1]} value={f.widthFt} onChange={(e) => set({ widthFt: Number(e.target.value) })} /></Field>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS[f.doorType].map(([h, w]) => (
                <button key={`${h}-${w}`} onClick={() => set({ heightFt: h, widthFt: w })} className="rounded-full border border-[#e0d6ca] px-2.5 py-1 font-mono text-xs hover:border-[#c8963e]">{h}&apos;×{w}&apos;</button>
              ))}
            </div>
            {!sizeOk && <p className="text-xs text-red-600">Height {limits.h[0]}–{limits.h[1]} ft, width {limits.w[0]}–{limits.w[1]} ft.</p>}

            <Field label="Wood (in stock)">
              <Select id="d-wood" value={f.woodStockId} onChange={(e) => set({ woodStockId: Number(e.target.value) })}>
                {ref.stock.map((s) => <option key={s.id} value={s.id}>{s.woodType.nameEn} · {s.source === "LOCAL" ? "Local" : "Foreign"} · {tk(s.sellingPricePerCft)}/CFT · {fmtNum(s.availableCft, 1)} CFT</option>)}
              </Select>
            </Field>

            <div>
              <div className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wide text-[#7a6a5d]"><span>Door color</span><span className="normal-case text-[#1f1712]">{doorColor?.nameEn}</span></div>
              <div className="flex flex-wrap gap-2">
                {doorColors.map((c) => (
                  <button key={c.id} title={`${c.nameEn} · ${tk(price(c.sellSingle, c.sellDouble))}`} aria-label={c.nameEn} aria-pressed={c.id === f.doorColorId} onClick={() => set({ doorColorId: c.id })}
                    className={`h-8 w-8 rounded-full border-2 border-white ring-1 ${c.id === f.doorColorId ? "ring-2 ring-[#c8963e]" : "ring-[#ddd3c7]"}`} style={{ background: c.colorCode }} />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wide text-[#7a6a5d]"><span>Carving color</span><span className="normal-case text-[#1f1712]">{designColor?.nameEn}</span></div>
              <div className="flex flex-wrap gap-2">
                {designColors.map((c) => (
                  <button key={c.id} title={`${c.nameEn} · ${tk(price(c.sellSingle, c.sellDouble))}`} aria-label={c.nameEn} aria-pressed={c.id === f.designColorId} onClick={() => set({ designColorId: c.id })}
                    className={`relative h-8 w-8 rounded-full border-2 border-white ring-1 ${c.id === f.designColorId ? "ring-2 ring-[#c8963e]" : "ring-[#ddd3c7]"}`}
                    style={{ background: c.isToneOnTone ? `conic-gradient(${doorHex} 0 50%, ${ornColor(doorHex, c)} 0 100%)` : c.colorCode }}>
                    {suggested.includes(c.nameEn) && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#c8963e]" />}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-[#9a8b7e]">Dot = goes well with this door color.</p>
              {lowContrast && <p className="mt-2 flex gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900"><TriangleAlert className="h-4 w-4 shrink-0" />Door and carving colors are very close; the carving will be hard to see.</p>}
            </div>

            <div className="space-y-2.5 border-t border-[#efe8df] pt-4">
              <Toggle checked={f.withFrame} onChange={(v) => set({ withFrame: v })} label="With frame" />
              <Toggle checked={f.withFitting} onChange={(v) => set({ withFitting: v })} label="With fitting" />
              <Toggle checked={f.withDelivery} onChange={(v) => set({ withDelivery: v })} label="With delivery" />
            </div>
          </div>
        </Card>

        {/* PREVIEW */}
        <Card className="overflow-hidden" title="Live Preview" actions={design ? <Badge tone="amber">{design.nameEn}</Badge> : <Badge>Plain</Badge>}>
          <div className="flex min-h-[460px] items-center justify-center rounded-lg bg-[#efeae3] p-4">
            <DoorPreview type={f.doorType} heightFt={sizeOk ? f.heightFt : 7} widthFt={sizeOk ? f.widthFt : f.doorType === "SINGLE" ? 3 : 5} doorHex={doorHex} designKey={design?.key} designSvg={designSvg} ornHex={orn} className="max-h-[560px] w-full" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 font-mono text-sm sm:grid-cols-4">
            {[["Door", quote?.doorCft], ["Frame", quote?.frameCft], ["Total (with wastage)", quote?.totalCft], ["In stock", quote?.availableCft]].map(([l, v]) => (
              <div key={String(l)} className="rounded-lg bg-[#faf7f3] px-3 py-2"><div className="font-sans text-[11px] uppercase tracking-wide text-[#7a6a5d]">{l}</div><div className="text-[15px] font-semibold text-[#1f1712]">{v === undefined ? "—" : `${fmtNum(v)} CFT`}</div></div>
            ))}
          </div>
          {quote && !quote.enoughStock && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Not enough wood in stock. You can save the estimate, but buy wood before confirming.</p>}
        </Card>

        {/* PRICE */}
        {/*
          Not one figure on this panel is a cost or a margin, and that is the whole design.

          This screen is used with the customer standing next to you - it says so at the top,
          "Build the door with the customer" - and on a screen like that there is no safe way
          to show what you paid. A switch to hide it is no protection: it protects you exactly
          on the days you remember to flick it, and the day you forget is the day it matters.
          So the numbers are not here at all. What you paid and what you made is on Profit, a
          screen you open on your own.

          The breakdown below is a share of the PRICE - what the customer is paying for, in
          percentages - which is the thing that actually helps a customer choose a cheaper wood
          or drop the carving, and tells them nothing about your margin.
        */}
        <Card title="Price Summary">
          {qErr && <ErrorBox text={qErr} />}
          {!quote && !qErr && <p className="text-sm text-[#9a8b7e]">Enter size and wood…</p>}
          {quote && (
            <div className="space-y-4">
              <ul className="space-y-2.5 text-sm">
                {quote.lines.map((l, i) => (
                  <li key={i} className="flex items-start justify-between gap-3">
                    <span className="text-[#4a3d33]">{l.name}</span>
                    <span className="text-right font-mono font-semibold text-[#1f1712] [font-variant-numeric:tabular-nums]">{tk(l.sell)}</span>
                  </li>
                ))}
              </ul>
              <CostChart lines={quote.lines} total={quote.totalSell} />
                {!!quote.crew?.length && <CrewPanel crew={quote.crew} total={quote.crewTotal} />}
              {quote.bigDoor && <Badge tone="amber">Large door: carving +%</Badge>}
              <div className="rounded-xl bg-[#1f1712] p-4 text-white">
                <div className="text-xs uppercase tracking-wide text-[#c9b9a8]">Total price</div>
                <div className="mt-1 font-mono text-3xl font-semibold text-[#e2b35c]">{tk(quote.totalSell)}</div>
                {editEst ? (
                  <button onClick={() => setSaveOpen("ESTIMATE")} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#e2b35c] py-3 text-sm font-semibold text-[#1f1712] hover:bg-[#ecc57a]"><Save className="h-4 w-4" />Update estimate</button>
                ) : (
                  <div className="mt-4 grid gap-2">
                    <button onClick={() => setSaveOpen("ESTIMATE")} className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/25 py-2.5 text-sm font-semibold text-white hover:bg-white/10"><Save className="h-4 w-4" />Save as estimate</button>
                    <button onClick={() => setSaveOpen("ORDER")} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#e2b35c] py-3 text-sm font-semibold text-[#1f1712] hover:bg-[#ecc57a]"><ShoppingBag className="h-4 w-4" />Customer likes it: Order now</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* DESIGNS */}
      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-[#1f1712]">Choose a carving</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-8">
          {/* customer walks in with a photo of a door they like */}
          <button onClick={() => setUploadOpen(true)}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#e0d6ca] bg-[#faf7f3] p-2 text-center transition hover:border-[#c8963e]">
            <ImagePlus className="h-7 w-7 text-[#c8963e]" />
            <span className="text-[13px] font-semibold leading-tight text-[#1f1712]">Customer's photo</span>
            <span className="text-[11px] leading-tight text-[#9a8b7e]">Carving from a picture</span>
          </button>

          {[{ id: 0, key: "plain", nameEn: "Plain", noteEn: "No carving", allowDouble: true, sellSingle: "0", sellDouble: "0", labourSellSingle: "0", labourSellDouble: "0" } as Design, ...ref.designs]
            .filter((d) => f.doorType === "SINGLE" || d.allowDouble)
            .map((d) => (
              <div key={d.id} className={`group relative flex flex-col gap-1.5 rounded-xl border bg-white p-2 text-left transition hover:border-[#c8963e] ${f.designId === d.id ? "border-[#c8963e] ring-2 ring-[#c8963e]/30" : "border-[#e8e0d6]"}`}>
                <button onClick={() => set({ designId: d.id })} aria-pressed={f.designId === d.id} className="flex flex-col gap-1.5 text-left">
                  <DesignThumb design={d.id ? d : null} doorHex={doorHex} ornHex={orn} className="aspect-[3/5] w-full rounded-md bg-[#efeae3]" />
                  <span className="text-[13px] font-semibold leading-tight text-[#1f1712]">{d.nameEn}</span>
                  <span className="font-mono text-xs text-[#a0712a]">{d.id ? `+${tk(price(d.sellSingle, d.sellDouble) + price(d.labourSellSingle, d.labourSellDouble))}` : "৳0"}</span>
                </button>
                {d.visibility === "PRIVATE" && (
                  <button title="Add to my carving gallery" onClick={() => promote(d)}
                    className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-md bg-sky-600 px-1.5 py-1 text-[10px] font-semibold text-white hover:bg-sky-700">
                    <Library className="h-3 w-3" />Keep
                  </button>
                )}
                {/* Any carving can be thrown away from here - the ones that came from a photo
                    and the ones that were here from the start. This is where you are standing
                    when you decide the shop no longer offers it. A carving already named on an
                    estimate is hidden rather than deleted, so that paperwork still reads right;
                    the server decides which of the two happens. */}
                <button title="Delete this carving" aria-label={`Delete ${d.nameEn}`} onClick={() => removeDesign(d)}
                  className="absolute left-1.5 top-1.5 rounded-md bg-white/90 p-1 text-red-600 opacity-0 shadow-sm transition group-hover:opacity-100 focus:opacity-100 hover:bg-red-50">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
        </div>
      </div>

      <CustomerView
        open={customerView}
        onClose={() => setCustomerView(false)}
        onOrder={() => { setCustomerView(false); setSaveOpen("ORDER"); }}
        shopName={ref.settings?.companyName}
        door={{
          type: f.doorType, heightFt: sizeOk ? f.heightFt : 7, widthFt: sizeOk ? f.widthFt : f.doorType === "SINGLE" ? 3 : 5,
          doorHex, designKey: design?.key ?? null, designSvg, ornHex: orn,
          woodName: ref.stock.find((x) => x.id === f.woodStockId)?.woodType.nameEn,
          doorColorName: doorColor?.nameEn, designName: design?.nameEn, designColorName: designColor?.nameEn,
          withFrame: f.withFrame, withFitting: f.withFitting,
        }}
        quote={quote ? { lines: customerLines(quote.lines), total: quote.totalSell } : null}
      />

      <DesignUploadModal open={uploadOpen} onClose={() => setUploadOpen(false)}
        door={{ type: f.doorType, heightFt: sizeOk ? f.heightFt : 7, widthFt: sizeOk ? f.widthFt : f.doorType === "SINGLE" ? 3 : 5, doorHex, designColor }}
        onSaved={(d) => {
          // straight into the gallery and selected, so the price lands in the quote at once;
          // the row is refreshed from the API right after, which fills in the real prices
          const fresh: Design = {
            id: d.id, key: d.key, nameEn: d.nameEn, svgUrl: d.svgUrl, origin: "UPLOADED", visibility: "PRIVATE",
            allowDouble: true, active: true, sellSingle: "0", sellDouble: "0", labourSellSingle: "0", labourSellDouble: "0",
          };
          setRef((r) => r && ({ ...r, designs: [fresh, ...r.designs] }));
          set({ designId: d.id });
          api.get<Design[]>(`/api/admin/designs?visibility=LIBRARY&include=${d.id}`)
            .then((all) => setRef((r) => r && ({ ...r, designs: all.filter((x) => x.active) })))
            .catch(() => {});
        }} />

      <OrderModal key={String(saveOpen)} open={!!saveOpen} mode={saveOpen || "ESTIMATE"} onClose={() => setSaveOpen(false)} edit={editEst}
        payload={{ ...f, doorColorId: f.doorColorId || null, designId: f.designId || null, designColorId: f.designId ? f.designColorId || null : null }}
        quote={quote} preview={{ type: f.doorType, heightFt: f.heightFt, widthFt: f.widthFt, doorHex, designKey: design?.key, designSvg, ornHex: orn }}
        summary={[["Door", `${f.doorType === "DOUBLE" ? "Double" : "Single"} ${f.heightFt}' × ${f.widthFt}'`], ["Wood", ref.stock.find((x) => x.id === f.woodStockId)?.woodType.nameEn ?? "—"], ["Door color", doorColor?.nameEn ?? "—"], ["Carving", design ? `${design.nameEn} · ${designColor?.nameEn ?? ""}` : "Plain"]]}
        /* Saved or ordered, you land on the thing you just made: the full estimate, with
           the door, every line, what was paid and what is due. Nothing is left to go and
           look for. */
        onSaved={(id, print) => { setSaveOpen(false); router.push(`/admin/door/estimates/${id}${print ? "?print=1" : ""}`); }} />
    </>
  );
}

const GROUPS: { key: string; label: string; color: string; match: (l: { type: string; name: string }) => boolean }[] = [
  { key: "wood", label: "Wood", color: "#8a5a2b", match: (l) => l.type === "WOOD" },
  { key: "design", label: "Carving", color: "#c8963e", match: (l) => l.type === "DESIGN" || l.type === "DESIGN_COLOR" },
  { key: "color", label: "Door color", color: "#5f7d6e", match: (l) => l.type === "DOOR_COLOR" },
  { key: "labour", label: "Labour", color: "#3b4a6b", match: (l) => l.type === "LABOUR" },
];

/**
 * How many people this door needs, and for how long. Read straight off the price list -
 * nothing here is calculated, and none of it reaches the customer's invoice.
 */
function CrewPanel({ crew, total }: { crew: CrewLine[]; total?: { workers: number; days: number } }) {
  return (
    <div className="rounded-lg border border-[#efe8df] p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#7a6a5d]">Workers needed</div>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-[11px] uppercase text-[#9a8b7e]"><th className="font-semibold">Job</th><th className="pr-1 text-right font-semibold">Workers</th><th className="text-right font-semibold">Days</th></tr></thead>
        <tbody>
          {crew.map((c) => (
            <tr key={c.name}><td className="py-0.5 text-[#4a3d33]">{c.name}</td><td className="py-0.5 pr-1 text-right font-mono">{c.workers || "—"}</td><td className="py-0.5 text-right font-mono">{c.days || "—"}</td></tr>
          ))}
          {total && (
            <tr className="border-t border-[#efe8df] font-semibold">
              <td className="pt-1">Total</td><td className="pt-1 pr-1 text-right font-mono">{total.workers} </td><td className="pt-1 text-right font-mono">~{total.days}</td>
            </tr>
          )}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-[#9a8b7e]">Workers add up, days do not: people work side by side, so the longest job sets the time. Never shown on the customer invoice.</p>
    </div>
  );
}

/** Price share by item group: stacked bar + legend */
function CostChart({ lines, total }: { lines: { type: string; name: string; sell: number }[]; total: number }) {
  const parts = GROUPS.map((g) => ({ ...g, value: lines.filter(g.match).reduce((a, l) => a + l.sell, 0) })).filter((p) => p.value > 0);
  if (!total) return null;
  return (
    <div className="rounded-lg border border-[#efe8df] p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#7a6a5d]">Price breakdown</div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-[#efe8df]" role="img" aria-label="Price breakdown">
        {parts.map((p) => <div key={p.key} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} title={`${p.label} ${tk(p.value)}`} />)}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: p.color }} />
            <span className="text-[#4a3d33]">{p.label}</span>
            <span className="ml-auto font-mono text-[#1f1712]">{Math.round((p.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OrderModal({ open, mode, onClose, payload, quote, preview, summary, edit, onSaved }: {
  open: boolean; mode: "ESTIMATE" | "ORDER"; onClose: () => void; payload: object; quote: Quote | null; edit: any | null;
  preview: { type: "SINGLE" | "DOUBLE"; heightFt: number; widthFt: number; doorHex: string; designKey?: string; designSvg?: string | null; ornHex: string };
  summary: [string, string][]; onSaved: (id: number, print: boolean) => void;
}) {
  const [c, setC] = useState({ name: "", phone: "", address: "", note: "", discount: "", advance: "", advanceMethod: "CASH" });
  const [print, setPrint] = useState(mode === "ORDER");
  const isOrder = mode === "ORDER" && !edit;
  const { busy, run } = useAction();
  useEffect(() => {
    if (edit) setC((x) => ({ ...x, name: edit.customer.name, phone: edit.customer.phone, address: edit.customer.address ?? "", note: edit.note ?? "", discount: String(num(edit.discount) || "") }));
  }, [edit]);
  const total = quote?.totalSell ?? 0;
  const grand = total - num(c.discount);
  const paidBefore = edit ? num(edit.paidAmount) : 0;
  const due = grand - paidBefore - (isOrder ? num(c.advance) : 0);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const customer = { name: c.name, phone: c.phone, address: c.address || null };
    const r = edit
      ? await run(() => api.put<{ id: number }>(`/api/admin/estimates/${edit.id}`, { ...payload, customer, note: c.note || null, discount: num(c.discount) }))
      : await run(async () => {
          const res = await api.post<{ id: number }>("/api/admin/estimates", { ...payload, customer, note: c.note || null, discount: num(c.discount), advance: isOrder ? num(c.advance) : 0, advanceMethod: c.advanceMethod });
          if (isOrder) await api.patch(`/api/admin/estimates/${res.data.id}/status`, { status: "CONFIRMED" });
          return res;
        }, isOrder ? "Order confirmed. Wood deducted from stock" : "Estimate saved");
    if (r) onSaved(r.data.id, print);
  };
  return (
    <Modal open={open} onClose={onClose} title={edit ? "Update estimate" : isOrder ? "Customer order" : "Save estimate"} wide>
      <form onSubmit={submit} className="grid gap-6 md:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-lg bg-[#efeae3] p-3"><DoorPreview {...preview} dims={false} className="mx-auto max-h-[300px] w-full" /></div>
          <dl className="space-y-1.5 text-sm">{summary.map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="text-[#7a6a5d]">{k}</dt><dd className="text-right font-medium">{v}</dd></div>)}</dl>
          {quote && (
            <ul className="space-y-1 border-t border-[#efe8df] pt-3 text-xs">
              {quote.lines.map((l, i) => <li key={i} className="flex justify-between gap-2"><span className="text-[#4a3d33]">{l.name}</span><span className="font-mono">{tk(l.sell)}</span></li>)}
            </ul>
          )}
        </div>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Customer name"><Input id="s-name" required value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} /></Field>
            <Field label="Phone"><Input id="s-phone" required inputMode="numeric" pattern="01[0-9]{9}" placeholder="01XXXXXXXXX" value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} /></Field>
          </div>
          <Field label="Address"><Input id="s-addr" value={c.address} onChange={(e) => setC({ ...c, address: e.target.value })} /></Field>
          <Field label="Note (delivery date, special requests)"><Textarea id="s-note" rows={2} value={c.note} onChange={(e) => setC({ ...c, note: e.target.value })} /></Field>
          <div className={`grid gap-3 ${isOrder ? "sm:grid-cols-3" : "sm:grid-cols-1"}`}>
            <Field label="Discount"><Input id="s-disc" type="number" min={0} value={c.discount} onChange={(e) => setC({ ...c, discount: e.target.value })} /></Field>
            {isOrder && <Field label="Paid now (advance)"><Input id="s-adv" type="number" min={0} max={grand > 0 ? grand : undefined} value={c.advance} onChange={(e) => setC({ ...c, advance: e.target.value })} /></Field>}
            {isOrder && <Field label="Method"><Select id="s-met" value={c.advanceMethod} onChange={(e) => setC({ ...c, advanceMethod: e.target.value })}>{METHODS.filter(([k]) => k !== "LC").map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>}
          </div>
          <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-[#e8e0d6] text-center [font-variant-numeric:tabular-nums]">
            <div className="p-3"><div className="text-xs text-[#7a6a5d]">Total price</div><div className="font-mono text-lg font-semibold">{tk(grand)}</div></div>
            <div className="border-x border-[#e8e0d6] p-3"><div className="text-xs text-[#7a6a5d]">{isOrder ? "Paid now" : "Paid"}</div><div className="font-mono text-lg font-semibold text-emerald-700">{tk(paidBefore + (isOrder ? num(c.advance) : 0))}</div></div>
            <div className="bg-[#1f1712] p-3 text-white"><div className="text-xs text-[#c9b9a8]">Due</div><div className="font-mono text-lg font-semibold text-[#e2b35c]">{tk(due)}</div></div>
          </div>
          {due < 0 && <p className="text-sm text-red-600">Advance is more than the total price.</p>}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={print} onChange={(e) => setPrint(e.target.checked)} className="h-4 w-4 accent-[#c8963e]" />Print after saving (with picture, prices and labour)</label>
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button busy={busy} disabled={due < 0}>{edit ? "Update" : isOrder ? "Confirm order" : "Save estimate"}</Button></div>
        </div>
      </form>
    </Modal>
  );
}
