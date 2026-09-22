"use client";

import { useState } from "react";
import { Trash2, Pencil } from "lucide-react";
import { api, fmtDate, fmtNum, METHODS, num, tk } from "@/lib/erp";
import { Badge, Button, ErrorBox, Field, Input, Loading, Modal, PageHeader, Select, Stat, Table, Td, useAction, useConfirm, useLoad } from "@/components/erp/ui";

export default function HistoryPage() {
  const [flt, setFlt] = useState({ source: "", supplierId: "", from: "", to: "" });
  const qs = new URLSearchParams(Object.entries(flt).filter(([, v]) => v)).toString();
  const { data, loading, error, reload } = useLoad<any[]>(`/api/admin/purchases${qs ? `?${qs}` : ""}`);
  const sup = useLoad<any[]>("/api/admin/suppliers");
  const [pay, setPay] = useState<any | null>(null);
  const { busy, run } = useAction();
  const confirm = useConfirm();
  const total = (data ?? []).reduce((a, p) => ({ cft: a.cft + num(p.quantityCft), cost: a.cost + num(p.totalCost), due: a.due + p.due }), { cft: 0, cost: 0, due: 0 });

  return (
    <>
      <PageHeader title="Purchase History" sub="All wood purchases. Deleting also removes the wood from stock." />
      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Select id="h-src" value={flt.source} onChange={(e) => setFlt({ ...flt, source: e.target.value })}><option value="">Local + Foreign</option><option value="LOCAL">Local</option><option value="FOREIGN">Foreign</option></Select>
        <Select id="h-sup" value={flt.supplierId} onChange={(e) => setFlt({ ...flt, supplierId: e.target.value })}><option value="">All suppliers</option>{sup.data?.map((s) => <option key={s.id} value={s.id}>{s.companyName}</option>)}</Select>
        <Input id="h-from" type="date" value={flt.from} onChange={(e) => setFlt({ ...flt, from: e.target.value })} aria-label="From" />
        <Input id="h-to" type="date" value={flt.to} onChange={(e) => setFlt({ ...flt, to: e.target.value })} aria-label="To" />
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3"><Stat label="Total CFT" value={fmtNum(total.cft)} /><Stat label="Total cost" value={tk(total.cost)} /><Stat label="Total due" value={tk(total.due)} tone={total.due > 0 ? "bad" : "good"} /></div>
      {error ? <ErrorBox text={error} retry={reload} /> : loading ? <Loading /> : (
        <Table head={["Date", "Supplier", "Wood", "Invoice / LC", "CFT", "Cost/CFT", "Total", "Paid", "Due", "Stock", ""]} empty={!data?.length}>
          {data?.map((p) => (
            <tr key={p.id}>
              <Td>{fmtDate(p.purchaseDate)}</Td>
              <Td>{p.isOpeningStock ? <Badge tone="blue">Opening Stock</Badge> : p.supplier?.companyName}</Td>
              <Td><div className="font-medium">{p.woodType.nameEn}</div><div className="text-xs text-[#9a8b7e]">{p.source === "LOCAL" ? "Local" : p.country}</div></Td>
              <Td className="text-xs">{p.invoiceNo ?? "—"}{p.lcNo ? ` / ${p.lcNo}` : ""}</Td>
              <Td className="font-mono">{fmtNum(p.quantityCft)}</Td><Td className="font-mono">{tk(p.costPerCft)}</Td><Td className="font-mono">{tk(p.totalCost)}</Td>
              <Td className="font-mono">{tk(p.paidAmount)}</Td><Td className={`font-mono ${p.due > 0 ? "text-red-600" : "text-emerald-700"}`}>{tk(p.due)}</Td>
              <Td>{p.batch ? <Badge tone={p.batch.status === "ACTIVE" ? "green" : p.batch.status === "WAITING" ? "amber" : "gray"}>{p.batch.status === "ACTIVE" ? "Active" : p.batch.status === "WAITING" ? "Waiting" : "Used up"}</Badge> : "—"}{p.usedCft > 0 && <div className="text-xs text-[#9a8b7e]">{fmtNum(p.usedCft)} used</div>}</Td>
              <Td><div className="flex gap-1">
                <Button size="sm" variant="ghost" aria-label="Payment edit" onClick={() => setPay({ id: p.id, paidAmount: String(num(p.paidAmount)), paymentMethod: p.paymentMethod ?? "CASH", total: num(p.totalCost) })}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="danger" aria-label="Delete" disabled={p.usedCft > 0} onClick={async () => { if (await confirm({ title: "Delete this purchase?", message: "Its wood leaves the stock, and the price rise it caused is undone.", danger: true, confirmText: "Delete" }) && await run(() => api.del(`/api/admin/purchases/${p.id}`))) reload(); }}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div></Td>
            </tr>
          ))}
        </Table>
      )}
      <Modal open={!!pay} onClose={() => setPay(null)} title="Payment at purchase">
        {pay && (
          <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); if (await run(() => api.patch(`/api/admin/purchases/${pay.id}`, { paidAmount: num(pay.paidAmount), paymentMethod: pay.paymentMethod }))) { setPay(null); reload(); } }}>
            <p className="text-sm text-[#7a6a5d]">Total cost {tk(pay.total)}. Add later payments from the Supplier Due page.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Paid"><Input id="hp-paid" type="number" min={0} max={pay.total} value={pay.paidAmount} onChange={(e) => setPay({ ...pay, paidAmount: e.target.value })} /></Field>
              <Field label="Method"><Select id="hp-met" value={pay.paymentMethod} onChange={(e) => setPay({ ...pay, paymentMethod: e.target.value })}>{METHODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
            </div>
            <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setPay(null)}>Cancel</Button><Button busy={busy}>Save</Button></div>
          </form>
        )}
      </Modal>
    </>
  );
}
