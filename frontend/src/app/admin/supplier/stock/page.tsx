"use client";

import { useState } from "react";
import { Pencil, Layers } from "lucide-react";
import { api, fmtDate, fmtNum, num, tk } from "@/lib/erp";
import { Badge, Button, ErrorBox, Field, Input, Loading, Modal, PageHeader, Stat, Table, Td, useAction, useLoad } from "@/components/erp/ui";

export default function StockPage() {
  const { data, loading, error, reload } = useLoad<any[]>("/api/admin/stock");
  const [edit, setEdit] = useState<any | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const { busy, run } = useAction();
  const value = (data ?? []).reduce((a, s) => a + s.availableCft * num(s.activeCostPerCft), 0);

  const cost = num(edit?.activeCostPerCft);
  const sellFromPct = cost * (1 + num(edit?.profitPercent) / 100);
  return (
    <>
      <PageHeader title="Wood Stock Summary" sub="Wood in stock (CFT), cost, profit % and selling price." />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3"><Stat label="Wood types" value={(data ?? []).filter((s) => s.availableCft > 0).length} /><Stat label="Total CFT" value={fmtNum((data ?? []).reduce((a, s) => a + s.availableCft, 0))} /><Stat label="Stock value (cost)" value={tk(value)} /></div>
      {error ? <ErrorBox text={error} retry={reload} /> : loading ? <Loading /> : (
        <Table head={["Wood", "Type", "Available CFT", "Cost/CFT", "Profit", "Price/CFT", "Waiting", ""]} empty={!data?.length}>
          {data?.map((s) => (
            <tr key={s.id}>
              <Td><div className="font-semibold">{s.woodType.nameEn}</div><div className="text-xs text-[#9a8b7e]">{s.woodType.nameBn}</div></Td>
              <Td><Badge tone={s.source === "LOCAL" ? "green" : "violet"}>{s.source === "LOCAL" ? "Local" : "Foreign"}</Badge></Td>
              <Td className={`font-mono font-semibold ${s.availableCft <= 0 ? "text-red-600" : s.availableCft < 20 ? "text-amber-700" : ""}`}>{fmtNum(s.availableCft)}</Td>
              <Td className="font-mono">{tk(s.activeCostPerCft)}</Td><Td className="font-mono">{fmtNum(s.profitPercent)}%</Td>
              <Td className="font-mono font-semibold text-[#8a5a1f]">{tk(s.sellingPricePerCft)}</Td>
              <Td>{s.waitingBatches ? <Badge tone="amber">{s.waitingBatches} batch</Badge> : "—"}</Td>
              <Td><div className="flex gap-1.5"><Button size="sm" variant="ghost" onClick={() => setDetailId(s.id)}><Layers className="h-3.5 w-3.5" />Batch</Button><Button size="sm" variant="ghost" onClick={() => setEdit({ ...s, profitPercent: String(num(s.profitPercent)), sell: String(num(s.sellingPricePerCft)), mode: "pct" })}><Pencil className="h-3.5 w-3.5" />Edit</Button></div></Td>
            </tr>
          ))}
        </Table>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit ? `${edit.woodType.nameEn}: selling price` : ""}>
        {edit && (
          <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); const b = edit.mode === "pct" ? { profitPercent: num(edit.profitPercent) } : { sellingPricePerCft: num(edit.sell) }; if (await run(() => api.put(`/api/admin/stock/${edit.id}`, b))) { setEdit(null); reload(); } }}>
            <p className="rounded-lg bg-[#faf7f3] px-3 py-2 text-sm">Cost / CFT (all costs): <b className="font-mono">{tk(cost)}</b></p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Profit %"><Input id="st-pct" type="number" step="0.01" min={0} value={edit.profitPercent} onChange={(e) => setEdit({ ...edit, mode: "pct", profitPercent: e.target.value, sell: String(Math.round(cost * (1 + num(e.target.value) / 100))) })} /></Field>
              <Field label="Selling price / CFT"><Input id="st-sell" type="number" min={0} value={edit.sell} onChange={(e) => setEdit({ ...edit, mode: "sell", sell: e.target.value, profitPercent: cost ? String(Math.round(((num(e.target.value) - cost) / cost) * 10000) / 100) : "0" })} /></Field>
            </div>
            <p className="text-sm text-[#7a6a5d]">New price in Door Designer: <b className="font-mono text-[#1f1712]">{tk(edit.mode === "pct" ? sellFromPct : num(edit.sell))}</b>/CFT</p>
            <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button busy={busy}>Save</Button></div>
          </form>
        )}
      </Modal>
      <BatchModal id={detailId} onClose={() => setDetailId(null)} />
    </>
  );
}

function BatchModal({ id, onClose }: { id: number | null; onClose: () => void }) {
  const { data, loading } = useLoad<any>(id ? `/api/admin/stock/${id}` : null);
  const ST = { ACTIVE: ["green", "Active"], WAITING: ["amber", "Waiting"], DONE: ["gray", "Used up"] } as Record<string, [any, string]>;
  return (
    <Modal open={!!id} onClose={onClose} title={data ? `${data.woodType.nameEn} (${data.source === "LOCAL" ? "Local" : "Foreign"})` : "Batch"} wide>
      {loading || !data ? <Loading /> : (
        <div className="space-y-5">
          <Table head={["Purchase date", "Supplier", "Country", "CFT", "Due", "Original cost", "Current cost", "Status"]} empty={!data.batches.length}>
            {data.batches.map((b: any) => (
              <tr key={b.id}><Td>{fmtDate(b.receivedAt)}</Td><Td>{b.purchase?.isOpeningStock ? "Opening Stock" : b.purchase?.supplier?.companyName ?? "—"}</Td><Td>{b.country}</Td>
                <Td className="font-mono">{fmtNum(b.quantityCft)}</Td><Td className="font-mono">{fmtNum(b.remainingCft)}</Td><Td className="font-mono">{tk(b.originalCost)}</Td><Td className="font-mono">{tk(b.currentCost)}</Td>
                <Td><Badge tone={ST[b.status][0]}>{ST[b.status][1]}</Badge></Td></tr>
            ))}
          </Table>
          <div>
            <h4 className="mb-2 text-sm font-semibold">Price history</h4>
            <Table head={["Date", "Cost", "Price", "Reason"]} empty={!data.history.length}>
              {data.history.map((h: any) => <tr key={h.id}><Td>{fmtDate(h.changedAt)}</Td><Td className="font-mono">{tk(h.oldCost)} → {tk(h.newCost)}</Td><Td className="font-mono">{tk(h.oldSell)} → {tk(h.newSell)}</Td><Td className="text-xs">{h.note}</Td></tr>)}
            </Table>
          </div>
        </div>
      )}
    </Modal>
  );
}
