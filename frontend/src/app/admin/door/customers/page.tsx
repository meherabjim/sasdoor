"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, Search, Pencil, KeyRound, Link2 } from "lucide-react";
import { api, fmtDate, tk } from "@/lib/erp";
import { Badge, Button, ErrorBox, Field, Input, Loading, Modal, PageHeader, Table, Td, Textarea, Toggle, useAction, useLoad } from "@/components/erp/ui";

/**
 * One page for one person.
 *
 * There used to be two: "Customers" (people the shop had sold a door to) and "User
 * Accounts" (people who had registered on the website). They were never two kinds of
 * person - they were two halves of the same one, and a customer who both walked into the
 * shop and registered online appeared on both screens with no sign that they were the same
 * man. So the two lists are merged here and matched up: one row per person, their orders on
 * one side and their website login on the other.
 *
 * The shop's own account is not in this list. There is one admin - the super admin - and it
 * is reached from your own name at the foot of the sidebar, not from a list of customers.
 */

type Customer = { id: number; name: string; phone: string; address: string | null; note: string | null; userId: number | null; accountWaiting?: boolean; orders: number; total: string; paid: string; due: string };
type User = { id: number; name: string; phone: string | null; email: string | null; address: string | null; role: string; active: boolean; createdAt: string };
type Row = { key: string; name: string; phone: string; email: string | null; address: string | null; joined: string | null; customer?: Customer; user?: User; waiting: boolean };

/** Customer rows and account rows, matched by the link the shop made, or failing that by phone. */
function merge(customers: Customer[], users: User[]): Row[] {
  const byId = new Map(users.map((u) => [u.id, u]));
  const byPhone = new Map(users.filter((u) => u.phone).map((u) => [u.phone as string, u]));
  const taken = new Set<number>();

  const rows: Row[] = customers.map((c) => {
    // A linked account is certain. An unlinked one that shares the phone is only a
    // candidate, so it is shown as something to confirm rather than treated as joined.
    const u = c.userId ? byId.get(c.userId) : undefined;
    if (u) taken.add(u.id);
    const maybe = !u && c.phone ? byPhone.get(c.phone) : undefined;
    return {
      key: `c${c.id}`, name: c.name, phone: c.phone, email: u?.email ?? null,
      address: c.address, joined: u?.createdAt ?? null, customer: c, user: u,
      waiting: !!c.accountWaiting || !!maybe,
    };
  });

  // Registered on the website, never ordered anything: still a person the shop has.
  for (const u of users) {
    if (taken.has(u.id) || rows.some((r) => r.phone && r.phone === u.phone)) continue;
    rows.push({ key: `u${u.id}`, name: u.name, phone: u.phone ?? "", email: u.email, address: u.address, joined: u.createdAt, user: u, waiting: false });
  }
  return rows;
}

export default function CustomersPage() {
  const [q, setQ] = useState(""); const [query, setQuery] = useState("");
  const cs = useLoad<Customer[]>(`/api/admin/customers?q=${encodeURIComponent(query)}`);
  const us = useLoad<User[]>(`/api/admin/users?q=${encodeURIComponent(query)}`);
  const [edit, setEdit] = useState<any | null>(null);
  const [pw, setPw] = useState<{ id: number; name: string; password: string } | null>(null);
  const { busy, run } = useAction();

  const loading = cs.loading || us.loading;
  const error = cs.error || us.error;
  const reload = () => { cs.reload(); us.reload(); };
  const rows = merge(cs.data ?? [], (us.data ?? []).filter((u) => u.role !== "SUPER_ADMIN"));

  /**
   * Saving.
   *
   * Where there is a login, the account is the record that counts: the server copies the
   * name, phone and address from it down onto the customer, so writing the customer as well
   * would only race it. The note lives on the customer alone, so that goes separately.
   */
  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const c = edit.customer as Customer | undefined, u = edit.user as User | undefined;
    const okd = await run(async () => {
      if (u) {
        await api.put(`/api/admin/users/${u.id}`, { name: edit.name, phone: edit.phone || null, email: edit.email || null, address: edit.address || null, active: edit.active });
        if (c) return api.put(`/api/admin/customers/${c.id}`, { note: edit.note || null });
        return { message: "Saved" };
      }
      const body = { name: edit.name, phone: edit.phone, address: edit.address || null, note: edit.note || null };
      return c ? api.put(`/api/admin/customers/${c.id}`, body) : api.post("/api/admin/customers", body);
    });
    if (okd) { setEdit(null); reload(); }
  };

  const openEdit = (r?: Row) => setEdit({
    name: r?.name ?? "", phone: r?.phone ?? "", email: r?.email ?? "", address: r?.address ?? "",
    note: r?.customer?.note ?? "", active: r?.user ? r.user.active : true,
    customer: r?.customer, user: r?.user,
  });

  return (
    <>
      <PageHeader title="Customers" sub="Everyone who has bought a door or registered on the website — their orders, their dues, and their login if they have one."
        actions={<Button onClick={() => openEdit()}><Plus className="h-4 w-4" />New customer</Button>} />

      <form onSubmit={(e) => { e.preventDefault(); setQuery(q); }} className="mb-4 flex gap-2">
        <div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-[#9a8b7e]" /><Input id="c-q" className="pl-9" placeholder="Name, phone or email" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Button variant="ghost">Search</Button>
      </form>

      {error ? <ErrorBox text={error} retry={reload} /> : loading ? <Loading /> : (
        <Table head={["Name", "Phone", "Website login", "Orders", "Total", "Paid", "Due", ""]} empty={!rows.length}>
          {rows.map((r) => (
            <tr key={r.key} className={`hover:bg-[#faf7f3] ${r.user && !r.user.active ? "opacity-50" : ""}`}>
              <Td>
                {r.customer
                  ? <Link className="font-semibold text-[#8a5a1f] hover:underline" href={`/admin/door/orders?q=${encodeURIComponent(r.phone)}`}>{r.name}</Link>
                  : <span className="font-semibold">{r.name}</span>}
                {r.address ? <div className="max-w-[240px] truncate text-xs text-[#9a8b7e]">{r.address}</div> : null}
              </Td>
              <Td>{r.phone || "—"}</Td>
              <Td>
                {r.user ? (
                  <div>
                    {r.user.active ? <Badge tone="green">Can log in</Badge> : <Badge tone="red">Blocked</Badge>}
                    <div className="text-xs text-[#9a8b7e]">{r.email ?? "no email"}{r.joined ? ` · since ${fmtDate(r.joined)}` : ""}</div>
                  </div>
                ) : r.waiting ? (
                  <Button size="sm" variant="ghost" busy={busy}
                    onClick={async () => { if (await run(() => api.patch(`/api/admin/customers/${r.customer!.id}/link-account`, {}))) reload(); }}>
                    <Link2 className="h-3.5 w-3.5" />Link their account
                  </Button>
                ) : <span className="text-[#9a8b7e]">—</span>}
              </Td>
              <Td>{r.customer?.orders ?? 0}</Td>
              <Td className="font-mono">{tk(r.customer?.total ?? 0)}</Td>
              <Td className="font-mono">{tk(r.customer?.paid ?? 0)}</Td>
              <Td className={`font-mono ${Number(r.customer?.due ?? 0) > 0 ? "text-red-600" : "text-emerald-700"}`}>{tk(r.customer?.due ?? 0)}</Td>
              <Td><div className="flex justify-end gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" />Edit</Button>
                {r.user && <Button size="sm" variant="ghost" aria-label="Set a new password" title="Set a new password" onClick={() => setPw({ id: r.user!.id, name: r.name, password: "" })}><KeyRound className="h-3.5 w-3.5" /></Button>}
              </div></Td>
            </tr>
          ))}
        </Table>
      )}

      <p className="mt-3 rounded-lg bg-[#faf7f3] px-3 py-2.5 text-xs text-[#7a6a5d]">
        Someone who registers on the website with a phone number you already have is not joined
        up automatically — a website cannot prove a phone number is theirs. <b>Link their account</b>
        is you saying it really is the same person, and it hands them their order history.
        Your own shop account is not on this list; it is under your name at the foot of the sidebar.
      </p>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.customer || edit?.user ? "Edit customer" : "New customer"}>
        {edit && (
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name"><Input id="c-name" required value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
              <Field label="Phone"><Input id="c-phone" required={!edit.user} pattern="01[0-9]{9}" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></Field>
            </div>
            {edit.user && <Field label="Email"><Input id="c-email" type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></Field>}
            <Field label="Address"><Input id="c-addr" value={edit.address} onChange={(e) => setEdit({ ...edit, address: e.target.value })} /></Field>
            {(!edit.user || edit.customer) && <Field label="Note"><Textarea id="c-note" rows={2} value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} /></Field>}
            {edit.user && <Toggle checked={edit.active} onChange={(v) => setEdit({ ...edit, active: v })} label="Can log in to the website" />}
            <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button busy={busy}>Save</Button></div>
          </form>
        )}
      </Modal>

      <Modal open={!!pw} onClose={() => setPw(null)} title={`${pw?.name ?? ""}: new password`}>
        {pw && (
          <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); if (await run(() => api.post(`/api/admin/users/${pw.id}/reset-password`, { newPassword: pw.password }))) setPw(null); }}>
            <Field label="New password" hint="Tell the customer this password — they can change it themselves afterwards"><Input id="c-pw" required minLength={6} value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} /></Field>
            <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setPw(null)}>Cancel</Button><Button busy={busy}>Set</Button></div>
          </form>
        )}
      </Modal>
    </>
  );
}
