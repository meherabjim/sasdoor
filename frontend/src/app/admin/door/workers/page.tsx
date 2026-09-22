"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, Pencil, Trash2, HardHat } from "lucide-react";
import { api } from "@/lib/erp";
import { Badge, Button, ErrorBox, Field, Input, Loading, Modal, PageHeader, Select, Table, Td, Textarea, Toggle, useAction, useConfirm, useLoad } from "@/components/erp/ui";

/**
 * The people in the workshop, and what each of them has on right now.
 *
 * The work itself is on the order — that is where you go to say who is doing what. This
 * list is the same rows read from the other end: not "who is on this door" but "what is
 * Rahim on", which is the question you ask when deciding who takes the next one.
 */

const SKILLS: [string, string][] = [
  ["DOOR", "Door making"], ["POLISH", "Polish / colour"], ["FRAME", "Chowkath (frame)"],
  ["FITTING", "Fitting"], ["DELIVERY", "Delivery"], ["OTHER", "Anything"],
];
const skillName = (k: string) => SKILLS.find(([s]) => s === k)?.[1] ?? k;

export default function WorkersPage() {
  const { data, loading, error, reload } = useLoad<any[]>("/api/admin/workers");
  const [edit, setEdit] = useState<any | null>(null);
  const { busy, run } = useAction();
  const confirm = useConfirm();

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const body = { name: edit.name, phone: edit.phone || null, skill: edit.skill, note: edit.note || null, active: edit.active };
    if (await run(() => (edit.id ? api.put(`/api/admin/workers/${edit.id}`, body) : api.post("/api/admin/workers", body)))) { setEdit(null); reload(); }
  };

  return (
    <>
      <PageHeader title="Workers" sub="Who works in the shop, and what each of them has on at the moment."
        actions={<Button onClick={() => setEdit({ name: "", phone: "", skill: "OTHER", note: "", active: true })}><Plus className="h-4 w-4" />New worker</Button>} />

      {error ? <ErrorBox text={error} retry={reload} /> : loading ? <Loading /> : (
        <Table head={["Name", "Does", "Phone", "On right now", "Finished", ""]} empty={!data?.length}>
          {data?.map((w) => (
            <tr key={w.id} className={w.active ? "" : "opacity-50"}>
              <Td>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{w.name}</span>
                  {!w.active && <Badge>Not on the list</Badge>}
                </div>
                {w.note ? <div className="text-xs text-[#9a8b7e]">{w.note}</div> : null}
              </Td>
              <Td><span className="text-sm text-[#7a6a5d]">{skillName(w.skill)}</span></Td>
              <Td>{w.phone ?? "—"}</Td>
              <Td>
                {w.openCount === 0 ? <span className="text-sm text-[#9a8b7e]">Free</span> : (
                  <ul className="space-y-1">
                    {w.open.map((o: any) => (
                      <li key={o.lineId} className="text-sm">
                        <Link href={`/admin/door/estimates/${o.estimateId}`} className="font-medium text-[#8a5a1f] hover:underline">{o.estimateNo}</Link>
                        <span className="text-[#7a6a5d]"> · {o.job}</span>
                        <span className="text-xs text-[#9a8b7e]"> ({o.customer})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Td>
              <Td><span className="font-mono text-sm">{w.doneCount}</span></Td>
              <Td><div className="flex justify-end gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => setEdit({ ...w, phone: w.phone ?? "", note: w.note ?? "" })}><Pencil className="h-3.5 w-3.5" />Edit</Button>
                <Button size="sm" variant="danger" aria-label="Remove" title="Remove"
                  onClick={async () => {
                    const yes = await confirm({
                      title: `Remove ${w.name}?`,
                      message: "If his name is already on a job he is taken off the list instead of deleted, so the doors he built still say who built them.",
                      danger: true, confirmText: "Remove",
                    });
                    if (yes && await run(() => api.del(`/api/admin/workers/${w.id}`))) reload();
                  }}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div></Td>
            </tr>
          ))}
        </Table>
      )}

      <p className="mt-3 flex items-start gap-2 rounded-lg bg-[#faf7f3] px-3 py-2.5 text-xs text-[#7a6a5d]">
        <HardHat className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Put somebody on a job from the order itself — open an order and use its <b>Work sheet</b>.
          How many men each job takes is set once in <b>Price Settings → Labour Price</b> and
          <b> Design Price</b>, and every estimate made afterwards carries it.
        </span>
      </p>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Edit worker" : "New worker"}>
        {edit && (
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name"><Input id="wk-name" required value={edit.name} onChange={(x) => setEdit({ ...edit, name: x.target.value })} /></Field>
              <Field label="Phone"><Input id="wk-phone" pattern="01[0-9]{9}" value={edit.phone} onChange={(x) => setEdit({ ...edit, phone: x.target.value })} /></Field>
            </div>
            <Field label="What he does" hint="Only for finding the right man quickly — it does not stop you putting him on anything">
              <Select id="wk-skill" value={edit.skill} onChange={(x) => setEdit({ ...edit, skill: x.target.value })}>
                {SKILLS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </Select>
            </Field>
            <Field label="Note"><Textarea id="wk-note" rows={2} value={edit.note} onChange={(x) => setEdit({ ...edit, note: x.target.value })} /></Field>
            <Toggle checked={!!edit.active} onChange={(v) => setEdit({ ...edit, active: v })} label="Still works here (shown in the job dropdowns)" />
            <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button busy={busy}>Save</Button></div>
          </form>
        )}
      </Modal>
    </>
  );
}
