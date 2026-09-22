"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, METHODS, num, tk } from "@/lib/erp";
import { countryOptions } from "@/lib/countries";
import { Badge, Button, Card, ErrorBox, Field, Input, Loading, PageHeader, Select, Textarea, Toggle, useAction, useLoad } from "@/components/erp/ui";
import { MeasureBox, MeasureState, blankMeasure, measureCft, measureRaw } from "@/components/erp/MeasureBox";

const today = () => new Date().toISOString().slice(0, 10);
const blank = { isOpeningStock: false, supplierId: "", woodTypeId: "", country: "", invoiceNo: "", lcNo: "", purchaseDate: today(), pricePerCft: "", transportCost: "", otherCost: "", paidAmount: "", paymentMethod: "CASH", note: "" };

export default function PurchasePage() {
  const router = useRouter();
  const sup = useLoad<any[]>("/api/admin/suppliers");
  const woods = useLoad<any[]>("/api/admin/wood-types?active=true");
  const [f, setF] = useState(blank);
  // quantity has its own shape now: a mode plus whatever that mode needs
  const [meas, setMeas] = useState<MeasureState>(blankMeasure);
  const [preview, setPreview] = useState<any>(null);
  const [parkExtra, setParkExtra] = useState(false);
  const { busy, run } = useAction();
  const set = (p: Partial<typeof blank>) => setF((x) => ({ ...x, ...p }));

  const supplier = sup.data?.find((s) => String(s.id) === f.supplierId);
  // The source is no longer a field on this form: the supplier decides it, and for
  // Opening Stock (no supplier) every active wood type is offered.
  const source: "LOCAL" | "FOREIGN" = supplier?.source ?? "LOCAL";
  const woodList = (woods.data ?? []).filter((w) => (supplier ? w.source === supplier.source : true));
  const wood = woods.data?.find((w) => String(w.id) === f.woodTypeId);
  // The wood type is what the backend actually stores as the purchase source.
  const isForeign = wood ? wood.source === "FOREIGN" : source === "FOREIGN";
  const needSupplier = !f.isOpeningStock && !f.supplierId;
  /**
   * Wood out of our own mill is produced, not bought. The cost is just as real - the
   * log, the sawing, the machine, carrying it to the yard - and it still has to reach
   * the stock so the door price comes out right. What it is not is a debt: there is no
   * invoice to settle and no one outside the business to pay. So this form keeps the
   * costs and drops everything about money owed.
   */
  const own = supplier?.kind === "OWN";
  const advance = own ? 0 : num(supplier?.advance);
  const qty = measureCft(meas);
  const countryGroups = useMemo(() => countryOptions(wood?.countries ?? []), [wood]);
  const m = useMemo(() => {
    const woodCost = qty * num(f.pricePerCft), total = woodCost + num(f.transportCost) + num(f.otherCost);
    return { woodCost, total, perCft: qty ? total / qty : 0, due: total - num(f.paidAmount) };
  }, [f, qty]);
  const overpaid = own ? 0 : Math.max(0, num(f.paidAmount) - m.total);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!f.woodTypeId || !qty || !num(f.pricePerCft)) { setPreview(null); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      api.post("/api/admin/purchases/preview", body()).then((r) => setPreview(r.data)).catch(() => setPreview(null));
    }, 350);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.woodTypeId, qty, f.pricePerCft, f.transportCost, f.otherCost, f.paidAmount]);

  const body = () => ({
    isOpeningStock: f.isOpeningStock, supplierId: f.isOpeningStock ? (f.supplierId ? Number(f.supplierId) : null) : Number(f.supplierId), woodTypeId: Number(f.woodTypeId),
    // Imported wood travels on an LC, local wood on an invoice — send only the one that applies.
    country: isForeign ? f.country || undefined : "Bangladesh", invoiceNo: isForeign ? null : f.invoiceNo || null, lcNo: isForeign ? f.lcNo || null : null, purchaseDate: f.purchaseDate,
    quantityCft: qty, measureMode: meas.mode, measureRaw: measureRaw(meas),
    pricePerCft: num(f.pricePerCft), transportCost: num(f.transportCost), otherCost: num(f.otherCost),
    // Own production is settled the moment it is entered, so the server books it paid in full.
    paidAmount: own ? 0 : num(f.paidAmount),
    extraAsAdvance: own ? false : parkExtra,
    paymentMethod: !own && num(f.paidAmount) > 0 ? f.paymentMethod : null, note: f.note || null,
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (overpaid > 0 && !parkExtra) return;
    if (await run(() => api.post("/api/admin/purchases", body()))) {
      setF({ ...blank, purchaseDate: f.purchaseDate }); setMeas(blankMeasure()); setParkExtra(false); router.refresh();
    }
  };

  if (sup.error || woods.error) return <ErrorBox text={sup.error || woods.error} />;
  if (sup.loading || woods.loading) return <Loading />;

  return (
    <>
      <PageHeader title={own ? "Own Manufacture Entry" : "Wood Purchase Entry"}
        sub={own
          ? "Wood sawn in your own mill. Enter what it cost to produce — it goes into stock the same way, but nothing is owed to anyone."
          : "Add purchased wood or existing shop stock (Opening Stock). Stock updates automatically."} />
      <form onSubmit={submit} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Card title={own ? "1. Where it came from" : "1. Supplier"}>
            <div className="mb-4 rounded-lg bg-[#faf7f3] p-3"><Toggle checked={f.isOpeningStock} onChange={(v) => set({ isOpeningStock: v })} label="Opening Stock: wood already in the shop (no supplier needed)" /></div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={f.isOpeningStock ? "Supplier (optional)" : own ? "Mill" : "Supplier"}
                hint={supplier ? (own ? "Your own mill — produced, not bought" : supplier.source === "LOCAL" ? "Local supplier" : `Imported from ${supplier.country}`) : undefined}>
                <Select id="pu-sup" required={!f.isOpeningStock} value={f.supplierId}
                  onChange={(e) => {
                    const s = sup.data?.find((x) => String(x.id) === e.target.value);
                    // changing supplier can change the source, so any wood picked for the old source is cleared
                    const keepWood = !s || !wood || wood.source === s.source;
                    set({ supplierId: e.target.value, woodTypeId: keepWood ? f.woodTypeId : "", country: keepWood ? f.country : "" });
                  }}>
                  <option value="">Select supplier</option>{sup.data?.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.companyName} ({s.kind === "OWN" ? "Own manufacture" : s.source === "LOCAL" ? "Local" : s.country})</option>)}
                </Select>
              </Field>
              {advance > 0 && (
                <div className="self-end rounded-lg bg-sky-50 px-3 py-2.5 text-sm text-sky-900">
                  Advance already with this supplier: <b className="font-mono">{tk(advance)}</b>
                  <div className="text-xs text-sky-700">This purchase will be set against it automatically.</div>
                </div>
              )}
              {own && (
                <div className="self-end rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
                  This is your own production, so there is <b>nothing to pay and no due</b>.
                  <div className="text-xs text-amber-800">The cost below is what it took to make, and that is what the wood enters stock at.</div>
                </div>
              )}
            </div>
          </Card>
          <Card title={own ? "2. Wood, date and lot" : "2. Wood, date and documents"}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Wood" hint={needSupplier ? "Select a supplier first" : undefined}>
                <Select id="pu-wood" required disabled={needSupplier} value={f.woodTypeId}
                  onChange={(e) => {
                    const w = woods.data?.find((x) => String(x.id) === e.target.value);
                    set({ woodTypeId: e.target.value, pricePerCft: w ? String(num(w.marketPricePerCft)) : "", country: w?.source === "FOREIGN" ? w.countries[0] ?? "" : "" });
                  }}>
                  <option value="">{needSupplier ? "Select a supplier first" : "Select wood"}</option>
                  {woodList.map((w) => <option key={w.id} value={w.id}>{w.nameEn}{supplier ? "" : w.source === "FOREIGN" ? " (imported)" : " (local)"}</option>)}
                </Select>
              </Field>

              {isForeign ? (
                <Field label="Country" hint="Where the wood was imported from">
                  <Select id="pu-country" required value={f.country} onChange={(e) => set({ country: e.target.value })}>
                    <option value="">Select country</option>
                    {countryGroups.map((g) => (
                      <optgroup key={g.label} label={g.label}>
                        {g.items.map((c) => <option key={`${g.label}-${c}`} value={c}>{c}</option>)}
                      </optgroup>
                    ))}
                  </Select>
                </Field>
              ) : (
                <Field label="Country"><Input id="pu-country-l" value="Bangladesh" disabled /></Field>
              )}

              <Field label="Date"><Input id="pu-date" type="date" required value={f.purchaseDate} onChange={(e) => set({ purchaseDate: e.target.value })} /></Field>

              {/* Imported wood comes on an LC, local wood on an invoice — never both.
                  Own production has neither: what identifies it is the lot it was sawn in,
                  so the same box is simply relabelled rather than left sitting there empty. */}
              {isForeign
                ? <Field label="LC No" hint="Imported wood travels on an LC"><Input id="pu-lc" value={f.lcNo} onChange={(e) => set({ lcNo: e.target.value })} /></Field>
                : <Field label={own ? "Lot / batch no" : "Invoice No"} hint={own ? "Your own reference for this sawing" : undefined}><Input id="pu-inv" value={f.invoiceNo} onChange={(e) => set({ invoiceNo: e.target.value })} /></Field>}
            </div>
          </Card>
          <Card title={own ? "3. Quantity and what it cost to make" : "3. Quantity, price and payment"}>
            {/* CFT is what gets stored; these buttons only change how it is measured */}
            <MeasureBox value={meas} onChange={setMeas} />
            {/* Produced wood has the same three cost boxes, read the way a mill reads them:
                what the log cost, what it cost to get it here, and what the sawing cost. Add
                them up and divide by the CFT and you have the cost the stock carries - which
                is the whole reason the boxes are here in the first place. */}
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={own ? "Log cost / CFT" : "Price / CFT"} hint={own ? "What the raw log cost you, per CFT" : wood ? `Market price ${tk(wood.marketPricePerCft)}` : undefined}><Input id="pu-p" type="number" step="0.01" min={0.01} required value={f.pricePerCft} onChange={(e) => set({ pricePerCft: e.target.value })} /></Field>
              <Field label={own ? "Carrying cost" : "Transport cost"} hint={own ? "Bringing the log in and the sawn wood to the yard" : undefined}><Input id="pu-t" type="number" min={0} value={f.transportCost} onChange={(e) => set({ transportCost: e.target.value })} /></Field>
              <Field label={own ? "Sawing, labour & machine" : "Other cost"} hint={own ? "Mill labour, fuel or power, blades and upkeep" : undefined}><Input id="pu-o" type="number" min={0} value={f.otherCost} onChange={(e) => set({ otherCost: e.target.value })} /></Field>
              {/* Nothing leaves the business here, so there is nothing to pay and no method to pick. */}
              {!own && <Field label="Paid now" hint={advance > 0 ? "Advance already paid is handled in the ledger, not here" : undefined}><Input id="pu-paid" type="number" min={0} value={f.paidAmount} onChange={(e) => set({ paidAmount: e.target.value })} /></Field>}
              {!own && <Field label="Payment method"><Select id="pu-met" value={f.paymentMethod} onChange={(e) => set({ paymentMethod: e.target.value })}>{METHODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>}
            </div>
            <Field label="Note" className="mt-4"><Textarea id="pu-note" rows={2} value={f.note} onChange={(e) => set({ note: e.target.value })} /></Field>
          </Card>
        </div>

        <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <Card title="Summary">
            <dl className="space-y-2.5 text-sm [font-variant-numeric:tabular-nums]">
              <div className="flex justify-between"><dt className="text-[#7a6a5d]">Quantity</dt><dd className="font-mono font-semibold">{qty} CFT</dd></div>
              {(own
                ? [["Log cost", m.woodCost], ["Sawing & carrying", num(f.transportCost) + num(f.otherCost)]] as [string, number][]
                : [["Wood cost", m.woodCost], ["Total cost", m.total], ["Cost / CFT (all costs)", m.perCft], ["Paid", num(f.paidAmount)]] as [string, number][]
              ).map(([l, v]) => (
                <div key={String(l)} className="flex justify-between"><dt className="text-[#7a6a5d]">{l}</dt><dd className="font-mono font-semibold">{tk(v)}</dd></div>
              ))}
              {own ? (
                <>
                  <div className="flex justify-between border-t border-[#efe8df] pt-2.5"><dt className="font-semibold">Production cost</dt><dd className="font-mono text-lg font-semibold">{tk(m.total)}</dd></div>
                  <div className="flex justify-between"><dt className="text-[#7a6a5d]">Cost / CFT (all costs)</dt><dd className="font-mono font-semibold">{tk(m.perCft)}</dd></div>
                  <p className="pt-1 text-xs text-[#7a6a5d]">Nothing is owed — this is your own wood. The cost above is what the stock carries.</p>
                </>
              ) : (
                <div className="flex justify-between border-t border-[#efe8df] pt-2.5"><dt className="font-semibold">Due</dt><dd className={`font-mono text-lg font-semibold ${m.due > 0 ? "text-red-600" : "text-emerald-700"}`}>{tk(m.due)}</dd></div>
              )}
            </dl>
            {overpaid > 0 && m.total > 0 && (
              <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
                <p><b className="font-mono">{tk(overpaid)}</b>  over. A consignment line cannot hold more than it is worth.</p>
                {f.supplierId ? (
                  <label className="mt-2 flex items-start gap-2">
                    <input type="checkbox" className="mt-0.5" checked={parkExtra} onChange={(e) => setParkExtra(e.target.checked)} />
                    <span>Keep the extra with this supplier as an <b>advance</b></span>
                  </label>
                ) : <p className="mt-1">Pick a supplier and the extra can be kept as an advance.</p>}
              </div>
            )}
            {advance > 0 && m.total > 0 && (
              <p className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-900">
                After saving, this supplier&apos;s advance of <b className="font-mono">{tk(advance)}</b> covers{" "}
                {m.due <= advance ? <>the whole due.</> : <>part of it; <b className="font-mono">{tk(m.due - advance)}</b> will remain due.</>}
              </p>
            )}
          </Card>
          {preview && (
            <Card title="Stock effect">
              <div className="space-y-2 text-sm">
                <Badge tone={preview.batchStatus === "ACTIVE" ? "green" : "amber"}>{preview.batchStatus === "ACTIVE" ? "Sells now" : "Waiting"}</Badge>
                <p className="text-[#4a3d33]">{preview.batchStatus === "ACTIVE" ? "Same or higher cost, so all remaining stock now sells at this price." : "Lower cost, so this wood is used after the older, dearer stock runs out."}</p>
                <div className="flex justify-between"><span className="text-[#7a6a5d]">Selling price / CFT ({preview.profitPercent}%)</span><b className="font-mono">{tk(preview.sellingPricePerCft)}</b></div>
              </div>
            </Card>
          )}
          <Button busy={busy} disabled={!qty || (overpaid > 0 && !parkExtra)} className="w-full py-3">{own ? "Save Production Entry" : "Save Purchase"}</Button>
        </div>
      </form>
    </>
  );
}
