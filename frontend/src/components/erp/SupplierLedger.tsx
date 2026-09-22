"use client";

import { useState } from "react";
import { fmtDate, tk } from "@/lib/erp";
import { Badge, Button, Loading, Modal, Table, Td, useLoad } from "@/components/erp/ui";
import { PaymentModal } from "@/components/erp/PaymentModal";

const ROW_LABEL: Record<string, string> = {
  PURCHASE: "Cost",
  PAID_ON_PURCHASE: "Paid at purchase",
  PAYMENT: "Payment",
  ADVANCE: "Advance",
};

export function SupplierLedger({ supplierId, onClose, onChanged }: { supplierId: number | null; onClose: () => void; onChanged?: () => void }) {
  const { data, loading, reload } = useLoad<any>(supplierId ? `/api/admin/suppliers/${supplierId}/ledger` : null);
  const [pay, setPay] = useState(false);
  // due is signed: positive = we owe them, negative = they hold our money
  const due = data?.due ?? 0;
  const advance = data?.advance ?? Math.max(0, -due);
  const payable = data?.payable ?? Math.max(0, due);

  return (
    <Modal open={!!supplierId} onClose={onClose} title={data ? `${data.supplier.companyName}: ledger` : "Ledger"} wide>
      {loading || !data ? <Loading /> : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#faf7f3] px-4 py-3">
            <span className="text-sm">
              {advance > 0 ? (
                <>Advance with this supplier: <b className="font-mono text-lg text-sky-700">{tk(advance)}</b>
                  <span className="ml-2 text-xs text-[#7a6a5d]">(they owe us wood)</span></>
              ) : (
                <>Total due: <b className={`font-mono text-lg ${payable > 0 ? "text-red-600" : "text-emerald-700"}`}>{tk(payable)}</b></>
              )}
            </span>
            {/* Always available: paying when nothing is due simply becomes an advance. */}
            <Button size="sm" onClick={() => setPay(true)}>{payable > 0 ? "+ Payment" : "+ Advance"}</Button>
          </div>
          <Table head={["Date", "Type", "Ref", "Details", "Purchase (+)", "Payment (−)", "Balance"]} empty={!data.ledger.length}>
            {data.ledger.map((r: any, i: number) => (
              <tr key={i}>
                <Td>{fmtDate(r.date)}</Td>
                <Td>{r.type === "ADVANCE" ? <Badge tone="blue">Advance</Badge> : ROW_LABEL[r.type] ?? r.type}</Td>
                <Td>{r.ref}</Td><Td>{r.detail}</Td>
                <Td className="font-mono">{r.debit ? tk(r.debit) : ""}</Td>
                <Td className="font-mono text-emerald-700">{r.credit ? tk(r.credit) : ""}</Td>
                <Td className={`font-mono font-semibold ${r.balance < 0 ? "text-sky-700" : ""}`}>
                  {r.balance < 0 ? `${tk(-r.balance)} adv.` : tk(r.balance)}
                </Td>
              </tr>
            ))}
          </Table>
        </div>
      )}
      <PaymentModal open={pay} onClose={() => setPay(false)} due={due} path={`/api/admin/suppliers/${supplierId}/payments`} allowLc allowAdvance
        onDone={() => { setPay(false); reload(); onChanged?.(); }} />
    </Modal>
  );
}
