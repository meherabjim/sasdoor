"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, History as HistoryIcon } from "lucide-react";
import { api, fmtDate, fmtNum, num, tk } from "@/lib/erp";
import { Badge, Button, ErrorBox, Field, Input, Loading, Modal, PageHeader, Select, Table, Td, Toggle, useAction, useConfirm, useLoad } from "@/components/erp/ui";

/**
 * "How many people, how many days". Set once here, shown on every estimate for the
 * workshop. It never takes part in a price - the money blocks above are untouched.
 */
export function CrewBlock({ v, set }: { v: Record<string, unknown>; set: (p: Record<string, unknown>) => void }) {
  const box = (name: string, label: string) => (
    <Field key={name} label={label}>
      <Input id={`pl-crew-${name}`} type="number" min={0} step="1" value={(v[name] as string) ?? ""} onChange={(e) => set({ [name]: e.target.value })} />
    </Field>
  );
  return (
    <fieldset className="rounded-lg border border-[#efe8df] p-4">
      <legend className="px-1 text-sm font-semibold text-[#1f1712]">Workers and days</legend>
      <p className="mb-3 text-xs text-[#9a8b7e]">
        Set once here and it is copied onto every estimate made afterwards, where it becomes a
        job on the work sheet that somebody is put on. Leave it at 0 and it is not a job at
        all. It never affects a price, and the customer is never shown it.
      </p>
      <div className="grid gap-3 sm:grid-cols-4">
        {box("workersSingle", "Workers · Single")}{box("workersDouble", "Workers · Double")}
        {box("daysSingle", "Days · Single")}{box("daysDouble", "Days · Double")}
      </div>
    </fieldset>
  );
}

export type Extra = { key: string; label: string; type?: "text" | "color" | "select"; options?: [string, string][]; required?: boolean; hint?: string;
  /** Hide (and stop sending) this field for rows it does not apply to - an uploaded carving has no style to pick. */
  when?: (row: { origin?: string }) => boolean };

/**
 * Cost and price, single and double. prefix "" or "labour".
 *
 * There used to be a Profit % box between them, and the selling price was worked out from
 * it. Two things were wrong with that. The shop does not price a carving by marking a cost
 * up - it knows what the job is worth and says so - and a margin typed on screen is the one
 * number that must never be readable over the admin's shoulder. So the shop types what it
 * pays and what it charges, and the profit falls out of the two on its own.
 */
export function PriceBlock({ v, set, prefix, title, sellOnly }: { v: any; set: (p: any) => void; prefix: "" | "labour"; title: string;
  /** Drop the cost boxes. Used where a customer may be standing at the admin's shoulder. */
  sellOnly?: boolean }) {
  const k = (n: string) => (prefix ? `${prefix}${n[0].toUpperCase()}${n.slice(1)}` : n);
  const inp = (name: string, label: string) => (
    <Field label={label}><Input id={`pl-${prefix}-${name}`} type="number" step="0.01" min={0} value={v[k(name)] ?? ""} onChange={(e) => set({ [k(name)]: e.target.value })} /></Field>
  );
  return (
    <fieldset className="rounded-lg border border-[#efe8df] p-4">
      <legend className="px-1 text-sm font-semibold text-[#1f1712]">{title}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {!sellOnly && <>{inp("costSingle", "Cost · Single")}{inp("costDouble", "Cost · Double")}</>}
        {inp("sellSingle", "Price · Single")}{inp("sellDouble", "Price · Double")}
      </div>
      <p className="mt-2 text-xs text-[#9a8b7e]">
        {sellOnly ? "What the customer pays. The shop's own cost is set later in Price Settings." : "Cost is what it costs the shop. Price is what the customer pays — type it, nothing is worked out for you."}
      </p>
    </fieldset>
  );
}

export function PriceList({ title, sub, path, extras, filterTabs, withLabour, withCrew, renderName, newItem, columnsExtra, extraActions, canDelete, formExtra, reloadKey = 0 }: {
  title: string; sub: string; path: string; extras: Extra[]; filterTabs?: { key: string; label: string; match: (x: any) => boolean }[];
  withLabour?: boolean;
  /** Show the workers/days block. Design and Labour price lists use it. */
  withCrew?: boolean; renderName: (x: any) => React.ReactNode; newItem: () => any; columnsExtra?: { head: string; cell: (x: any) => React.ReactNode };
  /**
   * Extra buttons beside "New" - plain nodes, not a render callback. Whatever they open
   * belongs on the page itself, not inside this header: a dialog rendered here would be
   * torn down and rebuilt every time the list re-renders, and a half-filled form would go
   * with it. The Design Price page keeps its photo dialog at page level and refreshes the
   * list with `reloadKey`.
   */
  extraActions?: React.ReactNode;
  /** Bump this and the list re-fetches. For rows created outside this form. */
  reloadKey?: number;
  /** Show a delete button on each row. The server decides whether it can really go. */
  canDelete?: boolean;
  /**
   * Something extra inside the New form, above the price blocks. Design Price uses it to
   * offer a photo: adding a carving from a picture and typing one in are the same job, so
   * they belong on the same form rather than behind two different buttons.
   * It is given the row being edited, and a way to close the form.
   */
  formExtra?: (row: any, close: () => void) => React.ReactNode;
}) {
  const { data, loading, error, reload } = useLoad<any[]>(reloadKey ? `${path}${path.includes("?") ? "&" : "?"}k=${reloadKey}` : path);
  const [tab, setTab] = useState(filterTabs?.[0]?.key ?? "");
  const [edit, setEdit] = useState<any | null>(null);
  const [hist, setHist] = useState<number | null>(null);
  const { busy, run } = useAction();
  const confirm = useConfirm();
  const rows = (data ?? []).filter((x) => !filterTabs || filterTabs.find((t) => t.key === tab)!.match(x));
  const setE = (p: any) => setEdit((e: any) => ({ ...e, ...p }));

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const b: Record<string, unknown> = { active: edit.active };
    extras.filter((x) => !x.when || x.when(edit)).forEach((x) => (b[x.key] = edit[x.key] === "" ? null : edit[x.key]));
    // Cost and price both go up every time. The server reads the profit % off the pair,
    // which is why there is no profit box on the form any more.
    const price = (pre: "" | "labour") => {
      const k = (n: string) => (pre ? `${pre}${n[0].toUpperCase()}${n.slice(1)}` : n);
      b[k("costSingle")] = num(edit[k("costSingle")]); b[k("costDouble")] = num(edit[k("costDouble")]);
      b[k("sellSingle")] = num(edit[k("sellSingle")]); b[k("sellDouble")] = num(edit[k("sellDouble")]);
    };
    price(""); if (withLabour) price("labour");
    if (withCrew) for (const k of ["workersSingle", "workersDouble", "daysSingle", "daysDouble"]) b[k] = num(edit[k]);
    if (await run(() => (edit.id ? api.put(`${path}/${edit.id}`, b) : api.post(path, b)))) { setEdit(null); reload(); }
  };

  return (
    <>
      <PageHeader title={title} sub={sub} actions={<>
        {extraActions}
        <Button onClick={() => setEdit({ ...newItem(), active: true })}><Plus className="h-4 w-4" />New</Button>
      </>} />
      {filterTabs && <div className="mb-4 flex gap-2">{filterTabs.map((t) => <Button key={t.key} size="sm" variant={tab === t.key ? "primary" : "ghost"} onClick={() => setTab(t.key)}>{t.label}</Button>)}</div>}
      {error ? <ErrorBox text={error} retry={reload} /> : loading ? <Loading /> : (
        <Table head={["Name", ...(columnsExtra ? [columnsExtra.head] : []), "Cost S / D", "Profit", "Price S / D", ...(withLabour ? ["Carving labour (price) S / D"] : []), "Status", ""]} empty={!rows.length}>
          {rows.map((x) => (
            <tr key={x.id} className={x.active ? "" : "opacity-50"}>
              <Td>{renderName(x)}</Td>
              {columnsExtra && <Td>{columnsExtra.cell(x)}</Td>}
              <Td className="font-mono text-[#7a6a5d]">{tk(x.costSingle)} / {tk(x.costDouble)}</Td>
              <Td className="font-mono">{fmtNum(x.profitPercent)}%</Td>
              <Td className="font-mono font-semibold">{tk(x.sellSingle)} / {tk(x.sellDouble)}</Td>
              {withLabour && <Td className="font-mono">{tk(x.labourSellSingle)} / {tk(x.labourSellDouble)}</Td>}
              <Td>{x.active ? <Badge tone="green">Active</Badge> : <Badge>Inactive</Badge>}</Td>
              <Td><div className="flex gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => setEdit({ ...x })}><Pencil className="h-3.5 w-3.5" />Edit</Button>
                <Button size="sm" variant="ghost" aria-label="History" onClick={() => setHist(x.id)}><HistoryIcon className="h-3.5 w-3.5" /></Button>
                {canDelete && (
                  <Button size="sm" variant="danger" aria-label="Delete" title="Delete"
                    onClick={async () => {
                      const yes = await confirm({
                        title: `Delete “${x.nameEn}”?`,
                        message: "It stops being offered on new estimates. Estimates already made keep their own copy of the name and the figure, so nothing you have agreed changes.",
                        danger: true, confirmText: "Delete",
                      });
                      if (yes && await run(() => api.del(`${path}/${x.id}`))) reload();
                    }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div></Td>
            </tr>
          ))}
        </Table>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Edit" : "New"} wide>
        {edit && (
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {extras.filter((x) => !x.when || x.when(edit)).map((x) => (
                <Field key={x.key} label={x.label} hint={x.hint}>
                  {x.type === "select" ? (
                    <Select id={`pl-${x.key}`} value={edit[x.key] ?? ""} onChange={(e) => setE({ [x.key]: e.target.value })}>{x.options!.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
                  ) : x.type === "color" ? (
                    <div className="flex gap-2"><input aria-label={x.label} type="color" value={edit[x.key] || "#000000"} onChange={(e) => setE({ [x.key]: e.target.value })} className="h-10 w-12 rounded border border-[#e0d6ca]" /><Input id={`pl-${x.key}`} value={edit[x.key] ?? ""} onChange={(e) => setE({ [x.key]: e.target.value })} /></div>
                  ) : (
                    <Input id={`pl-${x.key}`} required={x.required} value={edit[x.key] ?? ""} onChange={(e) => setE({ [x.key]: e.target.value })} />
                  )}
                </Field>
              ))}
            </div>
            {formExtra?.(edit, () => setEdit(null))}
            <PriceBlock v={edit} set={setE} prefix="" title="Price" />
            {withLabour && <PriceBlock v={edit} set={setE} prefix="labour" title="Carving labour" />}
            {withCrew && <CrewBlock v={edit} set={setE} />}
            <Toggle checked={!!edit.active} onChange={(v) => setE({ active: v })} label="Active (shown in Designer)" />
            <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button busy={busy}>Save</Button></div>
          </form>
        )}
      </Modal>
      <HistoryModal path={hist ? `${path}/${hist}/history` : null} onClose={() => setHist(null)} />
    </>
  );
}

function HistoryModal({ path, onClose }: { path: string | null; onClose: () => void }) {
  const { data, loading } = useLoad<any[]>(path);
  return (
    <Modal open={!!path} onClose={onClose} title="Price history" wide>
      {loading ? <Loading /> : (
        <Table head={["Date", "Cost", "Price", "Note"]} empty={!data?.length}>
          {data?.map((h) => <tr key={h.id}><Td>{fmtDate(h.changedAt)}</Td><Td className="font-mono">{tk(h.oldCost)} → {tk(h.newCost)}</Td><Td className="font-mono">{tk(h.oldSell)} → {tk(h.newSell)}</Td><Td className="text-xs">{h.note}</Td></tr>)}
        </Table>
      )}
    </Modal>
  );
}
