"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { api, tk } from "@/lib/erp";
import { Badge, Button, ErrorBox, Field, Input, Loading, Modal, PageHeader, Select, Table, Td, Toggle, useAction, useLoad } from "@/components/erp/ui";

const USE = { DOOR: "Door", FRAME: "Frame", BOTH: "Both" } as Record<string, string>;

export default function WoodTypesPage() {
  const [src, setSrc] = useState("");
  const { data, loading, error, reload } = useLoad<any[]>(`/api/admin/wood-types${src ? `?source=${src}` : ""}`);
  const [edit, setEdit] = useState<any | null>(null);
  const { busy, run } = useAction();
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const b = { nameEn: edit.nameEn, nameBn: edit.nameBn, source: edit.source, use: edit.use, marketPricePerCft: Number(edit.marketPricePerCft), active: edit.active,
      countries: edit.source === "LOCAL" ? ["Bangladesh"] : String(edit.countriesText).split(",").map((c: string) => c.trim()).filter(Boolean) };
    if (await run(() => (edit.id ? api.put(`/api/admin/wood-types/${edit.id}`, b) : api.post("/api/admin/wood-types", b)))) { setEdit(null); reload(); }
  };
  return (
    <>
      <PageHeader title="Wood Types" sub="Wood list and market prices. Purchase entries select from this list." actions={<Button onClick={() => setEdit({ nameEn: "", nameBn: "", source: "LOCAL", use: "BOTH", marketPricePerCft: "", active: true, countriesText: "" })}><Plus className="h-4 w-4" />New wood</Button>} />
      <div className="mb-4 flex gap-2">{[["", "All"], ["LOCAL", "Local"], ["FOREIGN", "Foreign"]].map(([k, l]) => <Button key={k} size="sm" variant={src === k ? "primary" : "ghost"} onClick={() => setSrc(k)}>{l}</Button>)}</div>
      {error ? <ErrorBox text={error} retry={reload} /> : loading ? <Loading /> : (
        <Table head={["Wood", "Type", "Country", "Used for", "Market price/CFT", "Status", ""]} empty={!data?.length}>
          {data?.map((w) => (
            <tr key={w.id} className={w.active ? "" : "opacity-50"}>
              <Td className="font-semibold">{w.nameEn}</Td>
              <Td><Badge tone={w.source === "LOCAL" ? "green" : "violet"}>{w.source === "LOCAL" ? "Local" : "Foreign"}</Badge></Td>
              <Td className="max-w-[220px] text-xs text-[#7a6a5d]">{w.countries.join(", ")}</Td><Td>{USE[w.use]}</Td>
              <Td className="font-mono">{tk(w.marketPricePerCft)}</Td><Td>{w.active ? <Badge tone="green">Active</Badge> : <Badge>Inactive</Badge>}</Td>
              <Td><Button size="sm" variant="ghost" onClick={() => setEdit({ ...w, countriesText: w.countries.join(", ") })}><Pencil className="h-3.5 w-3.5" />Edit</Button></Td>
            </tr>
          ))}
        </Table>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Edit wood" : "New wood"}>
        {edit && (
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name (English)"><Input id="wt-en" required value={edit.nameEn} onChange={(e) => setEdit({ ...edit, nameEn: e.target.value })} /></Field>
              <Field label="Name (Bangla)"><Input id="wt-bn" required value={edit.nameBn} onChange={(e) => setEdit({ ...edit, nameBn: e.target.value })} /></Field>
              <Field label="Type"><Select id="wt-src" value={edit.source} onChange={(e) => setEdit({ ...edit, source: e.target.value })}><option value="LOCAL">Local</option><option value="FOREIGN">Foreign</option></Select></Field>
              <Field label="Used for"><Select id="wt-use" value={edit.use} onChange={(e) => setEdit({ ...edit, use: e.target.value })}>{Object.entries(USE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
            </div>
            {edit.source === "FOREIGN" && <Field label="Country" hint="Separate with commas: Ghana, Nigeria"><Input id="wt-c" required value={edit.countriesText} onChange={(e) => setEdit({ ...edit, countriesText: e.target.value })} /></Field>}
            <Field label="Market price / CFT"><Input id="wt-p" type="number" min={0} required value={edit.marketPricePerCft} onChange={(e) => setEdit({ ...edit, marketPricePerCft: e.target.value })} /></Field>
            <Toggle checked={edit.active} onChange={(v) => setEdit({ ...edit, active: v })} label="Active (shown in purchase entry)" />
            <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button busy={busy}>Save</Button></div>
          </form>
        )}
      </Modal>
    </>
  );
}
