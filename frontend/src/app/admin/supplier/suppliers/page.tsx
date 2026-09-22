"use client";

import { useState } from "react";
import { Plus, Pencil, BookOpen, Wallet } from "lucide-react";
import { api, tk } from "@/lib/erp";
import { countryOptions } from "@/lib/countries";
import { Badge, Button, ErrorBox, Field, Input, Loading, Modal, PageHeader, Select, Table, Td, Toggle, useAction, useLoad } from "@/components/erp/ui";
import { SupplierLedger } from "@/components/erp/SupplierLedger";
import { PaymentModal } from "@/components/erp/PaymentModal";

/**
 * `kind` is what the shop calls the supplier; `source` is what the stock is keyed by.
 *
 * Own manufacture sits in the same LOCAL stock pool as a local supplier, but it is not
 * a supplier in the money sense: our own mill cannot be owed and cannot owe, so it has
 * no due, no advance and nothing to pay. What it keeps is a production record.
 */
const KINDS = [
  ["LOCAL", "Local", "green"],
  ["INTERNATIONAL", "International", "violet"],
  ["OWN", "Own manufacture", "amber"],
] as const;

type Kind = (typeof KINDS)[number][0];

type Row = {
  id: number; companyName: string; phone?: string | null; address?: string | null;
  kind?: Kind; source?: "LOCAL" | "FOREIGN"; country: string; active: boolean;
  totalPurchase: number; totalPaid: number; due: number; payable?: number; advance?: number;
};
/** The edit form. `advanceAmount` is the money being handed over now, not the running balance. */
type Edit = {
  id?: number; companyName: string; phone: string; address: string;
  kind: Kind; country: string; active: boolean; advanceAmount: string; advanceMethod: string;
};

/** Older rows were written before `kind` existed, so fall back to `source`. */
const kindOf = (s: Pick<Row, "kind" | "source">): Kind => s.kind ?? (s.source === "FOREIGN" ? "INTERNATIONAL" : "LOCAL");
const labelOf = (k: Kind) => KINDS.find((x) => x[0] === k)![1];
const toneOf = (k: Kind) => KINDS.find((x) => x[0] === k)![2];

export default function SuppliersPage() {
  const { data, loading, error, reload } = useLoad<Row[]>("/api/admin/suppliers");
  const [edit, setEdit] = useState<Edit | null>(null);
  const [ledger, setLedger] = useState<number | null>(null);
  const [payTo, setPayTo] = useState<Row | null>(null);
  const { busy, run } = useAction();

  const countryGroups = countryOptions([]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    const kind: Kind = edit.kind;
    const b: Record<string, unknown> = {
      companyName: edit.companyName, phone: edit.phone || null, address: edit.address || null,
      kind,
      // Own manufacture and Local both sit in the LOCAL stock pool; only International differs.
      country: kind === "INTERNATIONAL" ? edit.country : "Bangladesh",
      active: edit.active,
    };
    // money handed over while creating the supplier, so there is no second trip
    if (!edit.id && Number(edit.advanceAmount) > 0) { b.advance = Number(edit.advanceAmount); b.advanceMethod = edit.advanceMethod || "CASH"; }
    if (await run(() => (edit.id ? api.put(`/api/admin/suppliers/${edit.id}`, b) : api.post("/api/admin/suppliers", b)))) { setEdit(null); reload(); }
  };

  const blank: Edit = { companyName: "", phone: "", address: "", kind: "LOCAL", country: "Bangladesh", active: true, advanceAmount: "", advanceMethod: "CASH" };

  return (
    <>
      <PageHeader title="Suppliers" sub="Wood suppliers, purchases, dues and advances."
        actions={<Button onClick={() => setEdit({ ...blank })}><Plus className="h-4 w-4" />New supplier</Button>} />

      {error ? <ErrorBox text={error} retry={reload} /> : loading ? <Loading /> : (
        <Table head={["Supplier", "Phone", "Type", "Country", "Total purchase", "Paid", "Due / Advance", ""]} empty={!data?.length}>
          {data?.map((s) => {
            const k = kindOf(s);
            return (
              <tr key={s.id} className={s.active ? "" : "opacity-50"}>
                <Td className="font-semibold">{s.companyName}</Td><Td>{s.phone ?? "—"}</Td>
                <Td><Badge tone={toneOf(k)}>{labelOf(k)}</Badge></Td><Td>{s.country}</Td>
                <Td className="font-mono">{tk(s.totalPurchase)}</Td><Td className="font-mono">{tk(s.totalPaid)}</Td>
                {/* due is signed: negative means we paid ahead, so never show it as a settled account */}
                <Td className={`font-mono ${k === "OWN" ? "text-[#9a8b7e]" : s.due > 0 ? "text-red-600" : s.due < 0 ? "text-sky-700" : "text-emerald-700"}`}>
                  {k === "OWN" ? <span className="text-xs">own production</span> : s.due < 0 ? `${tk(-s.due)} adv.` : tk(s.due)}
                </Td>
                <Td>
                  <div className="flex gap-1.5">
                    {/* advance belongs to the supplier, not to any one consignment, so it lives here.
                        There is no Pay for our own mill: nothing leaves the business, so nothing is owed. */}
                    {k !== "OWN" && <Button size="sm" variant="ghost" onClick={() => setPayTo(s)}><Wallet className="h-3.5 w-3.5" />{s.due > 0 ? "Pay" : "Advance"}</Button>}
                    <Button size="sm" variant="ghost" onClick={() => setLedger(s.id)}><BookOpen className="h-3.5 w-3.5" />{k === "OWN" ? "Production" : "Ledger"}</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEdit({ id: s.id, companyName: s.companyName, phone: s.phone ?? "", address: s.address ?? "", kind: kindOf(s), country: s.country, active: s.active, advanceAmount: "", advanceMethod: "CASH" })}><Pencil className="h-3.5 w-3.5" /></Button>
                  </div>
                </Td>
              </tr>
            );
          })}
        </Table>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Edit supplier" : "New supplier"}>
        {edit && (
          <form onSubmit={save} className="space-y-4">
            <Field label="Supplier name"><Input id="sp-name" required value={edit.companyName} onChange={(e) => setEdit({ ...edit, companyName: e.target.value })} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Phone"><Input id="sp-phone" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></Field>
              <Field label="Type" hint={edit.kind === "OWN" ? "Your own mill: wood is produced, so there is no due and nothing to pay" : undefined}>
                <Select id="sp-kind" value={edit.kind} onChange={(e) => setEdit({ ...edit, kind: e.target.value as Kind, country: e.target.value === "INTERNATIONAL" ? (edit.country === "Bangladesh" ? "" : edit.country) : "Bangladesh", advanceAmount: e.target.value === "OWN" ? "" : edit.advanceAmount })}>
                  {KINDS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                </Select>
              </Field>
            </div>

            {edit.kind === "INTERNATIONAL" ? (
              <Field label="Country" hint="Where the wood is imported from">
                <Select id="sp-country" required value={edit.country} onChange={(e) => setEdit({ ...edit, country: e.target.value })}>
                  <option value="">Select country</option>
                  {countryGroups.map((g) => (
                    <optgroup key={g.label} label={g.label}>
                      {g.items.map((c) => <option key={`${g.label}-${c}`} value={c}>{c}</option>)}
                    </optgroup>
                  ))}
                </Select>
              </Field>
            ) : (
              <Field label="Country"><Input id="sp-country-l" value="Bangladesh" disabled /></Field>
            )}

            <Field label="Address"><Input id="sp-addr" value={edit.address} onChange={(e) => setEdit({ ...edit, address: e.target.value })} /></Field>

            {/* Nothing is handed to our own mill, so the advance box is not offered for it. */}
            {!edit.id && edit.kind !== "OWN" && (
              <div className="rounded-lg bg-sky-50 p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Advance paid now (optional)" hint="Money handed over before any wood arrives">
                    <Input id="sp-adv" type="number" min={0} value={edit.advanceAmount} onChange={(e) => setEdit({ ...edit, advanceAmount: e.target.value })} />
                  </Field>
                  <Field label="Method">
                    <Select id="sp-advm" value={edit.advanceMethod} onChange={(e) => setEdit({ ...edit, advanceMethod: e.target.value })}>
                      {[["CASH", "Cash"], ["BKASH", "bKash"], ["NAGAD", "Nagad"], ["BANK", "Bank"], ["LC", "LC"], ["OTHER", "Other"]].map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </Select>
                  </Field>
                </div>
              </div>
            )}

            <Toggle checked={edit.active} onChange={(v) => setEdit({ ...edit, active: v })} label="Active" />
            <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button busy={busy}>Save</Button></div>
          </form>
        )}
      </Modal>

      <PaymentModal open={!!payTo} onClose={() => setPayTo(null)} due={payTo?.due ?? 0} allowLc allowAdvance
        path={`/api/admin/suppliers/${payTo?.id}/payments`} onDone={() => { setPayTo(null); reload(); }} />

      <SupplierLedger supplierId={ledger} onClose={() => setLedger(null)} onChanged={reload} />
    </>
  );
}
