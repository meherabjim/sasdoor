"use client";

import { useState } from "react";
import { tk } from "@/lib/erp";
import { Badge, Button, ErrorBox, Loading, PageHeader, Stat, Table, Td, useLoad } from "@/components/erp/ui";
import { SupplierLedger } from "@/components/erp/SupplierLedger";

export default function DuePage() {
  const { data, loading, error, reload } = useLoad<any[]>("/api/admin/suppliers");
  const [ledger, setLedger] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Show anyone we have money with in either direction: a supplier paid in advance has
  // no purchases yet, so filtering on totalPurchase used to hide them completely.
  // "Show all" goes one further: a brand new supplier has no history at all, and an
  // advance is exactly the thing you hand over before the first consignment.
  // Own manufacture never appears here. Our own mill cannot be owed money and cannot
  // hold ours, so a production entry has no place on a dues page - it would only add a
  // line that always reads zero, or worse, a due nobody can ever pay off.
  const rows = (data ?? [])
    .filter((s) => !s.own && (s.kind ?? "") !== "OWN")
    .filter((s) => showAll ? s.active !== false : (s.totalPurchase > 0 || s.totalPaid > 0))
    .sort((a, b) => b.due - a.due);

  // Never add the two together: one supplier's advance must not cancel another's due.
  const totalPayable = rows.reduce((a, s) => a + (s.payable ?? Math.max(0, s.due)), 0);
  const totalAdvance = rows.reduce((a, s) => a + (s.advance ?? Math.max(0, -s.due)), 0);

  return (
    <>
      <PageHeader title="Supplier Due & Payment" sub="Amount owed to each supplier, advances paid ahead, payments and ledger."
        actions={<Button size="sm" variant={showAll ? "primary" : "ghost"} onClick={() => setShowAll((v) => !v)}>Show all suppliers</Button>} />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total due" value={tk(totalPayable)} tone={totalPayable > 0 ? "bad" : "good"} />
        <Stat label="Total advance" value={tk(totalAdvance)} />
        <Stat label="Suppliers with dues" value={rows.filter((r) => r.due > 0).length} />
        <Stat label="Suppliers holding advance" value={rows.filter((r) => r.due < 0).length} />
      </div>
      {error ? <ErrorBox text={error} retry={reload} /> : loading ? <Loading /> : (
        <Table head={["Supplier", "Total purchase", "Paid", "Due", "Advance", ""]} empty={!rows.length}>
          {rows.map((s) => {
            const payable = s.payable ?? Math.max(0, s.due);
            const advance = s.advance ?? Math.max(0, -s.due);
            return (
              <tr key={s.id}>
                <Td className="font-semibold">{s.companyName}</Td>
                <Td className="font-mono">{tk(s.totalPurchase)}</Td>
                <Td className="font-mono">{tk(s.totalPaid)}</Td>
                <Td className={`font-mono font-semibold ${payable > 0 ? "text-red-600" : "text-emerald-700"}`}>{tk(payable)}</Td>
                <Td>{advance > 0 ? <span className="font-mono font-semibold text-sky-700">{tk(advance)}</span> : "—"}</Td>
                <Td>
                  <Button size="sm" variant={payable > 0 ? "primary" : "ghost"} onClick={() => setLedger(s.id)}>
                    {payable > 0 ? "Pay / Ledger" : advance > 0 ? "Ledger" : "+ Advance"}
                  </Button>
                </Td>
              </tr>
            );
          })}
        </Table>
      )}
      {totalAdvance > 0 && (
        <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[#7a6a5d]">
          <Badge tone="blue">Advance</Badge>
          Money already handed over. It is not an expense yet — the next purchase from that supplier eats into it automatically.
        </p>
      )}
      <SupplierLedger supplierId={ledger} onClose={() => setLedger(null)} onChanged={reload} />
    </>
  );
}
