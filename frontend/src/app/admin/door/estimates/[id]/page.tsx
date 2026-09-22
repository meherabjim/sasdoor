"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { ArrowLeft, Printer, Trash2, Pencil, DoorOpen } from "lucide-react";
import { api, fmtDate, fmtNum, ftin, METHODS, num, STATUS, tk } from "@/lib/erp";
import { Badge, Button, Card, ErrorBox, Field, Input, Loading, Modal, PageHeader, Stat, Table, Td, Textarea, useAction, useConfirm, useLoad } from "@/components/erp/ui";
import { DoorPreview, toneOf, useDesignSvg } from "@/components/erp/DoorPreview";
import { PaymentModal } from "@/components/erp/PaymentModal";
import { WorkSheet } from "@/components/erp/WorkSheet";

const NEXT: Record<string, [string, string] | undefined> = {
  NEW: ["CONFIRMED", "Confirm (deduct wood from stock)"], CONFIRMED: ["IN_PRODUCTION", "Start production"], IN_PRODUCTION: ["READY", "Ready"], READY: ["DELIVERED", "Mark delivered"], DELIVERED: ["COMPLETED", "Used up"],
};

export default function EstimateDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: e, loading, error, reload } = useLoad<any>(`/api/admin/estimates/${id}`);
  const { data: settings } = useLoad<any>("/api/admin/settings");
  const { data: workers } = useLoad<any[]>("/api/admin/workers");
  /**
   * Two ways a door can carry a drawing rather than one of the fifteen built-in styles.
   * `customDesignSvg` is one the customer traced into this estimate on the website, and it
   * travels with the estimate. `designSvgUrl` is one that was traced into the shop gallery,
   * so the estimate only names it and the drawing has to be fetched. Miss the second and
   * the door prints plain - on the order page, on the invoice, everywhere.
   */
  const galleryCarving = useDesignSvg(e?.customDesignSvg ? null : e?.designSvgUrl ?? null);
  const { busy, run } = useAction();
  const confirm = useConfirm();
  const [pay, setPay] = useState(false);
  const [info, setInfo] = useState<any | null>(null);
  const printed = useRef(false);
  useEffect(() => {
    if (e && settings && !printed.current && new URLSearchParams(window.location.search).get("print") === "1") {
      printed.current = true; window.history.replaceState(null, "", window.location.pathname); setTimeout(() => window.print(), 400);
    }
  }, [e, settings]);

  if (error) return <ErrorBox text={error} retry={reload} />;
  if (loading || !e) return <Loading />;

  const next = NEXT[e.status];
  const setStatus = async (s: string, ask?: string) => {
    if (ask && !(await confirm({ title: "Are you sure?", message: ask, danger: s === "CANCELLED", confirmText: s === "CANCELLED" ? "Cancel the order" : "Yes" }))) return;
    if (await run(() => api.patch(`/api/admin/estimates/${id}/status`, { status: s }))) reload();
  };
  const doorHex = e.doorColorCode ?? "#B07A45";
  const orn = e.designColorCode && e.designColorName !== "Tone-on-tone" ? e.designColorCode : toneOf(doorHex);

  return (
    <>
      <div className="print:hidden">
        <Link href="/admin/door/orders" className="mb-3 inline-flex items-center gap-1.5 text-sm text-[#7a6a5d] hover:text-[#1f1712]"><ArrowLeft className="h-4 w-4" />Orders</Link>
        <PageHeader title={e.estimateNo} sub={`${fmtDate(e.createdAt)} · ${e.source === "WEBSITE" ? "From website" : "Admin"}`}
          actions={<>
            <Button variant="ghost" onClick={() => window.print()}><Printer className="h-4 w-4" />Print</Button>
            {e.status !== "CANCELLED" && <Button variant="ghost" onClick={() => setInfo({ name: e.customer.name, phone: e.customer.phone, address: e.customer.address ?? "", note: e.note ?? "", discount: String(num(e.discount)) })}><Pencil className="h-4 w-4" />Edit</Button>}
            {e.status === "NEW" && <Link href={`/admin/door/designer?edit=${e.id}`}><Button variant="ghost"><DoorOpen className="h-4 w-4" />Change door</Button></Link>}
            {e.status !== "CANCELLED" && e.status !== "COMPLETED" && <Button variant="danger" busy={busy} onClick={() => setStatus("CANCELLED", "Cancel this estimate? Wood already taken will return to stock.")}>Cancel</Button>}
            {next && <Button busy={busy} onClick={() => setStatus(next[0], next[0] === "CONFIRMED" ? "Confirming will deduct wood from stock. Continue?" : undefined)}>{next[1]}</Button>}
          </>} />

        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          <Stat label="Status" value={<Badge tone={STATUS[e.status]?.tone}>{STATUS[e.status]?.label}</Badge>} />
          <Stat label="Total" value={tk(e.grandTotal)} />
          <Stat label="Paid" value={tk(e.paidAmount)} tone="good" />
          <Stat label="Due" value={tk(e.due)} tone={e.due > 0 ? "bad" : "good"} />
          <Stat label="Profit" value={`${tk(e.profit)}`} tone="good" />
        </div>

        <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          <Card title="Door">
            <div className="rounded-lg bg-[#efeae3] p-3"><DoorPreview type={e.doorType} heightFt={num(e.heightFt)} widthFt={num(e.widthFt)} doorHex={doorHex} designKey={e.customDesignSvg || galleryCarving ? null : e.designKey} designSvg={e.customDesignSvg ?? galleryCarving} ornHex={orn} className="w-full" /></div>
            <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              {[["Type", e.doorType === "DOUBLE" ? "Double" : "Single"], ["Size", `${ftin(e.heightFt)} × ${ftin(e.widthFt)}`], ["Wood", e.woodName], ["CFT", fmtNum(e.totalCft)], ["Door color", e.doorColorName ?? "—"], ["Carving", e.designName ?? "Plain"], ["Carving color", e.designName ? e.designColorName ?? "—" : "—"], ["Frame / Fitting", `${e.withFrame ? "Yes" : "No"} / ${e.withFitting ? "Yes" : "No"}`]].map(([k, v]) => (
                <div key={k}><dt className="text-xs text-[#9a8b7e]">{k}</dt><dd className="font-medium text-[#1f1712]">{v}</dd></div>
              ))}
            </dl>
          </Card>

          <div className="space-y-5">
            <Card title="Customer"><div className="text-sm"><div className="font-semibold">{e.customer.name}</div><div>{e.customer.phone}</div><div className="text-[#7a6a5d]">{e.customer.address}</div>{e.note && <p className="mt-2 rounded-lg bg-[#faf7f3] p-2 text-[#4a3d33]">{e.note}</p>}</div></Card>
            <Table head={["Item", "Cost", "Price", "Profit"]}>
              {e.lines.map((l: any) => (
                <tr key={l.id}><Td>{l.name}</Td><Td className="font-mono text-[#7a6a5d]">{tk(l.cost)}</Td><Td className="font-mono">{tk(l.sell)}</Td><Td className="font-mono text-emerald-700">{tk(num(l.sell) - num(l.cost))}</Td></tr>
              ))}
              {num(e.discount) > 0 && <tr><Td>Discount</Td><Td /><Td className="font-mono text-red-600">−{tk(e.discount)}</Td><Td /></tr>}
              <tr className="bg-[#faf7f3] font-semibold"><Td>Total</Td><Td className="font-mono">{tk(e.totalCost)}</Td><Td className="font-mono">{tk(e.grandTotal)}</Td><Td className="font-mono text-emerald-700">{tk(e.profit)}</Td></tr>
            </Table>
            {num(e.woodOriginalCost) > 0 && <p className="text-xs text-[#7a6a5d]">Original cost of wood taken from stock: {tk(e.woodOriginalCost)}</p>}

            <WorkSheet steps={e.steps ?? []} work={e.work ?? { total: 0, done: 0, workers: 0, days: 0 }}
              workers={workers ?? []} locked={e.status === "NEW" || e.status === "QUOTED" || e.status === "CANCELLED"}
              onChange={reload} />

            <Card title="Payment" actions={e.status !== "CANCELLED" && e.due > 0 && <Button size="sm" onClick={() => setPay(true)}>+ Payment</Button>}>
              {e.payments.length === 0 ? <p className="text-sm text-[#9a8b7e]">No payments yet</p> : (
                <ul className="divide-y divide-[#f1ebe3] text-sm">
                  {e.payments.map((p: any) => (
                    <li key={p.id} className="flex items-center justify-between py-2.5">
                      <span>{fmtDate(p.paidAt)} · {METHODS.find(([k]) => k === p.method)?.[1]}{p.note ? ` · ${p.note}` : ""}</span>
                      <span className="flex items-center gap-3 font-mono font-semibold">{tk(p.amount)}
                        <button aria-label="Payment delete" className="text-[#b3a597] hover:text-red-600" onClick={async () => { if (await confirm({ title: "Delete this payment?", message: "The amount comes off the account and the due goes back up.", danger: true, confirmText: "Delete" }) && await run(() => api.del(`/api/admin/estimates/payments/${p.id}`))) reload(); }}><Trash2 className="h-4 w-4" /></button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </div>

      <PaymentModal open={pay} onClose={() => setPay(false)} due={e.due} path={`/api/admin/estimates/${id}/payments`} onDone={() => { setPay(false); reload(); }} />
      <Modal open={!!info} onClose={() => setInfo(null)} title="Customer, note and discount">
        {info && (
          <form className="space-y-4" onSubmit={async (ev) => { ev.preventDefault(); if (await run(() => api.patch(`/api/admin/estimates/${id}/info`, { customer: { name: info.name, phone: info.phone, address: info.address || null }, note: info.note || null, discount: num(info.discount) }))) { setInfo(null); reload(); } }}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name"><Input id="ei-name" required value={info.name} onChange={(x) => setInfo({ ...info, name: x.target.value })} /></Field>
              <Field label="Phone"><Input id="ei-phone" required pattern="01[0-9]{9}" value={info.phone} onChange={(x) => setInfo({ ...info, phone: x.target.value })} /></Field>
            </div>
            <Field label="Address"><Input id="ei-addr" value={info.address} onChange={(x) => setInfo({ ...info, address: x.target.value })} /></Field>
            <Field label="Note"><Textarea id="ei-note" rows={2} value={info.note} onChange={(x) => setInfo({ ...info, note: x.target.value })} /></Field>
            <Field label="Discount" hint={`Total price ${tk(num(e.totalSell) - num(info.discount))}`}><Input id="ei-disc" type="number" min={0} value={info.discount} onChange={(x) => setInfo({ ...info, discount: x.target.value })} /></Field>
            <p className="text-xs text-[#9a8b7e]">To change size, wood or carving use "Change door" (only for New estimates).</p>
            <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setInfo(null)}>Cancel</Button><Button busy={busy}>Save</Button></div>
          </form>
        )}
      </Modal>
      <Invoice e={e} settings={settings} doorHex={doorHex} orn={orn} carvingSvg={galleryCarving} />
    </>
  );
}

function Invoice({ e, settings, doorHex, orn, carvingSvg }: { e: any; settings: any; doorHex: string; orn: string;
  /** A gallery carving's drawing, already fetched by the page above. The printed sheet is
   *  what the customer keeps, so it must show the door they actually bought. */
  carvingSvg: string | null }) {
  const labour = e.lines.filter((l: any) => l.type === "LABOUR");
  const items = e.lines.filter((l: any) => l.type !== "LABOUR");
  const sum = (ls: any[]) => ls.reduce((a, l) => a + num(l.sell), 0);
  const row = (l: any) => <tr key={l.id} className="border-b border-gray-200"><td className="py-1.5">{l.name}</td><td className="py-1.5 text-right">{tk(l.sell)}</td></tr>;
  return (
    <div className="hidden bg-white text-[12.5px] text-black print:block">
      <style>{`@page{size:A4;margin:12mm}`}</style>
      <div className="flex items-start justify-between border-b-2 border-black pb-3">
        <div><div className="text-2xl font-bold tracking-wide">{settings?.companyName ?? "SAS DOOR"}</div><div>{settings?.companyAddress}</div><div>{settings?.companyPhone}</div></div>
        <div className="text-right"><div className="text-lg font-bold">ESTIMATE / INVOICE</div><div className="font-mono">{e.estimateNo}</div><div>{fmtDate(e.createdAt)}</div><div>Status: {STATUS[e.status]?.label}</div></div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-4">
        <div><div className="text-[11px] uppercase text-gray-500">Customer</div><div className="font-bold">{e.customer.name}</div><div>{e.customer.phone}</div><div>{e.customer.address}</div></div>
        <div className="text-right"><div className="text-[11px] uppercase text-gray-500">Door</div><div>{e.doorType === "DOUBLE" ? "Double" : "Single"} · {ftin(e.heightFt)} × {ftin(e.widthFt)} · {fmtNum(e.totalCft)} CFT</div><div>{e.woodName}</div><div>{e.doorColorName ?? ""}{e.designName ? ` · ${e.designName} (${e.designColorName ?? ""})` : " · Plain"}</div><div>Frame {e.withFrame ? "yes" : "no"} · Fitting {e.withFitting ? "yes" : "no"}</div></div>
      </div>
      <div className="mt-4 grid grid-cols-[190px_1fr] gap-6">
        <div className="rounded border border-gray-300 p-2"><DoorPreview type={e.doorType} heightFt={num(e.heightFt)} widthFt={num(e.widthFt)} doorHex={doorHex} designKey={e.customDesignSvg || carvingSvg ? null : e.designKey} designSvg={e.customDesignSvg ?? carvingSvg} ornHex={orn} className="w-full" /></div>
        <div>
          <table className="w-full border-collapse">
            <thead><tr className="border-b border-black text-left"><th className="py-1">Material</th><th className="py-1 text-right">Price</th></tr></thead>
            <tbody>{items.map(row)}<tr className="font-semibold"><td className="py-1.5">Materials total</td><td className="text-right">{tk(sum(items))}</td></tr></tbody>
          </table>
          <table className="mt-3 w-full border-collapse">
            <thead><tr className="border-b border-black text-left"><th className="py-1">Labour</th><th className="py-1 text-right">Price</th></tr></thead>
            {/* One figure, not the shop's working split. This sheet leaves the building in the
                customer's hand: what is useful to them is what the work costs, and what the
                split invites is an argument about a number they cannot change piece by piece.
                The screen above keeps every line, with the crew on each. */}
            <tbody><tr className="font-semibold"><td className="py-1.5">All labour, together</td><td className="text-right">{tk(sum(labour))}</td></tr></tbody>
          </table>
          <table className="mt-3 w-full border-collapse text-[13.5px]">
            <tbody>
              {num(e.discount) > 0 && <tr><td className="py-1">Discount</td><td className="text-right">−{tk(e.discount)}</td></tr>}
              <tr className="border-t-2 border-black text-base font-bold"><td className="pt-2">Total price</td><td className="pt-2 text-right">{tk(e.grandTotal)}</td></tr>
              <tr><td className="py-1">Paid</td><td className="text-right">{tk(e.paidAmount)}</td></tr>
              <tr className="font-bold"><td>Due</td><td className="text-right">{tk(e.due)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      {e.payments.length > 0 && (
        <div className="mt-4"><div className="text-[11px] uppercase text-gray-500">Payment</div>
          {e.payments.map((p: any) => <div key={p.id} className="flex justify-between border-b border-gray-200 py-1"><span>{fmtDate(p.paidAt)} · {METHODS.find(([k]) => k === p.method)?.[1]}{p.note ? ` · ${p.note}` : ""}</span><span>{tk(p.amount)}</span></div>)}
        </div>
      )}
      {e.note && <p className="mt-3"><b>Note:</b> {e.note}</p>}
      <div className="mt-14 flex justify-between"><span className="border-t border-black px-8 pt-1">Customer signature</span><span className="border-t border-black px-8 pt-1">{settings?.companyName ?? "SAS DOOR"}</span></div>
    </div>
  );
}
