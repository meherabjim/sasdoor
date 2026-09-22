"use client";

import { useState } from "react";
import { api, METHODS, num, tk } from "@/lib/erp";
import { Button, Field, Input, Modal, Select, useAction } from "@/components/erp/ui";

/**
 * Add a payment.
 *
 * For a customer estimate the amount is capped at what is still due.
 * For a supplier (`allowAdvance`) there is no cap: paying more than the due — or paying
 * when nothing is due — leaves money parked with the supplier, which the ledger shows
 * as an advance and the next purchase eats into automatically.
 */
export function PaymentModal({ open, onClose, due, path, onDone, allowLc, allowAdvance }: {
  open: boolean; onClose: () => void; due: number; path: string; onDone: () => void; allowLc?: boolean; allowAdvance?: boolean;
}) {
  const [p, setP] = useState({ amount: "", method: "CASH", paidAt: new Date().toISOString().slice(0, 10), note: "" });
  const { busy, run } = useAction();

  const amount = num(p.amount);
  const after = due - amount;                 // > 0 still owed, < 0 parked with the supplier
  // Only the title uses this. Whether the row is filed as a payment or an advance is the
  // server's call, because it turns on what the account stood at when it arrives - and
  // paying 80,000 against a 50,000 due is a payment that leaves change, not an advance.
  const isAdvance = allowAdvance && due <= 0;

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const body = { ...p, amount, note: p.note || null };
    if (await run(() => api.post(path, body))) { setP({ ...p, amount: "", note: "" }); onDone(); }
  };

  return (
    <Modal open={open} onClose={onClose} title={isAdvance ? "Advance payment" : "Add payment"}>
      <form className="space-y-4" onSubmit={submit}>
        <p className="rounded-lg bg-[#faf7f3] px-3 py-2 text-sm">
          {due >= 0
            ? <>Due: <b className="font-mono">{tk(due)}</b></>
            : <>Advance already with this supplier: <b className="font-mono text-sky-700">{tk(-due)}</b></>}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Amount" hint={allowAdvance ? "More than the due is kept as an advance" : undefined}>
            <Input id="p-amt" type="number" min={1} max={allowAdvance ? undefined : due > 0 ? due : undefined} required value={p.amount} onChange={(e) => setP({ ...p, amount: e.target.value })} />
          </Field>
          <Field label="Method"><Select id="p-met" value={p.method} onChange={(e) => setP({ ...p, method: e.target.value })}>{METHODS.filter(([k]) => allowLc || k !== "LC").map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
          <Field label="Date"><Input id="p-date" type="date" value={p.paidAt} onChange={(e) => setP({ ...p, paidAt: e.target.value })} /></Field>
          <Field label="Note"><Input id="p-note" value={p.note} onChange={(e) => setP({ ...p, note: e.target.value })} /></Field>
        </div>
        {allowAdvance && amount > 0 && (
          <p className={`rounded-lg px-3 py-2 text-sm ${after > 0 ? "bg-red-50 text-red-700" : after < 0 ? "bg-sky-50 text-sky-800" : "bg-emerald-50 text-emerald-800"}`}>
            {after > 0 && <>After this, still due: <b className="font-mono">{tk(after)}</b></>}
            {after === 0 && <>After this the account is clear.</>}
            {after < 0 && <>After this, advance with this supplier: <b className="font-mono">{tk(-after)}</b></>}
          </p>
        )}
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button busy={busy}>Save</Button></div>
      </form>
    </Modal>
  );
}
