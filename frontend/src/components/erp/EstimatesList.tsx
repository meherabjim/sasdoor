"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, ShoppingBag, Gavel, Trash2 } from "lucide-react";
import { api, fmtDate, ftin, METHODS, num, STATUS, tk } from "@/lib/erp";
import { Badge, Button, ErrorBox, Field, Input, Loading, Modal, Select, Table, Td, Toggle, useAction, useConfirm, useLoad } from "@/components/erp/ui";
import { DoorPreview, ornColor } from "@/components/erp/DoorPreview";

/**
 * The list of doors. Used twice: whole on Orders, and narrowed to `source="WEBSITE"` on
 * Customer Requests.
 *
 * There is no tab row and no second "estimates" list. A door you quoted this morning and a
 * door the customer paid for last week are one record at two points in its life, so they
 * live in one list; the status column, and the filter above it, say where each has got to.
 */
export function EstimatesList({ reloadKey = 0, initialSource = "", initialQuery = "", scope = "" }: { reloadKey?: number; initialSource?: string;
  /** Pre-fill the search. Customers link here by phone to see one person's doors. */
  initialQuery?: string;
  /**
   * "orders" — doors the customer has committed to. "requests" — doors with a carving of
   * the customer's own that is still waiting on the shop. Empty shows everything.
   * Picking a status by name always overrides it, which is how you go looking.
   */
  scope?: "" | "orders" | "requests" }) {
  const [q, setQ] = useState(initialQuery); const [status, setStatus] = useState(""); const [query, setQuery] = useState(initialQuery);
  const source = initialSource;
  const params = new URLSearchParams({ q: query, status, source, scope });
  const { data, loading, error, reload } = useLoad<any[]>(`/api/admin/estimates?${params.toString()}&k=${reloadKey}`);
  const [conv, setConv] = useState<any | null>(null);
  const [review, setReview] = useState<any | null>(null);
  const confirm = useConfirm();
  const { busy, run } = useAction();

  /**
   * Take a row off the books for good.
   *
   * Not the same button as Cancel, and deliberately not dressed like it. Cancel is what you
   * press when a real order fell through: the row stays, the number stays used, and next
   * year you can still see what happened. This is for rows that should never have existed -
   * a test order, a double entry, one typed against the wrong customer - where leaving a
   * tombstone on the screen is worse than the mistake. Wood goes back to stock either way.
   */
  const del = async (e: any) => {
    const paid = num(e.paidAmount) > 0;
    const yes = await confirm({
      title: `Delete ${e.estimateNo}?`,
      message: `${e.customer.name}, ${tk(e.grandTotal)}. This removes it completely — it will not appear in any list or total again, and that cannot be undone. Any wood it took goes back to stock.`
        + (paid ? ` ${tk(e.paidAmount)} has been paid on this one; deleting it takes that payment with it. If the money was really received, cancel it instead.` : "")
        + " To keep a record that this door was called off, use Cancel on the order page instead.",
      danger: true, confirmText: "Delete for good",
    });
    if (yes && await run(() => api.del(`/api/admin/estimates/${e.id}`))) reload();
  };
  /** Once the customer has said yes, the door is being made and progress is worth showing. */
  const ORDERED = ["CONFIRMED", "IN_PRODUCTION", "READY", "DELIVERED", "COMPLETED"];
  return (
    <>
      <form onSubmit={(e) => { e.preventDefault(); setQuery(q); }} className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-[#9a8b7e]" /><Input id="e-q" className="pl-9" placeholder="Estimate no, name or phone" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Select id="e-status" className="w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
        <Button variant="ghost">Search</Button>
      </form>
      {error ? <ErrorBox text={error} retry={reload} /> : loading ? <Loading /> : (
        <Table head={["Estimate", "Date", "Customer", "Door", "Work", "Total", "Paid", "Due", "Status", ""]} empty={!data?.length}>
          {data?.map((e) => (
            <tr key={e.id} className="hover:bg-[#faf7f3]">
              <Td>
                <Link href={`/admin/door/estimates/${e.id}`} className="font-semibold text-[#8a5a1f] hover:underline">{e.estimateNo}</Link>
                {e.source === "WEBSITE" && <span className="ml-2"><Badge tone="blue">Website</Badge></span>}
                {e.needsQuote && <span className="ml-2"><Badge tone="amber">Needs a price</Badge></span>}
              </Td>
              <Td>{fmtDate(e.createdAt)}</Td>
              <Td><div className="font-medium">{e.customer.name}</div><div className="text-xs text-[#9a8b7e]">{e.customer.phone}</div></Td>
              <Td><div>{e.doorType === "DOUBLE" ? "Double" : "Single"} {ftin(e.heightFt)}×{ftin(e.widthFt)}</div><div className="text-xs text-[#9a8b7e]">{e.woodName}{e.designName ? ` · ${e.designName}` : ""}</div></Td>
              {/* How many men it takes, and how much of it is behind you. Only once it is a
                  real order — on an estimate nobody is making anything yet. */}
              <Td>
                {ORDERED.includes(e.status) && e.work?.total ? (
                  <div className="whitespace-nowrap text-sm">
                    <span className="font-medium">{e.work.done}/{e.work.total}</span>
                    <span className="text-xs text-[#9a8b7e]"> done · {e.work.workers} {e.work.workers === 1 ? "man" : "men"}</span>
                  </div>
                ) : e.work?.workers ? (
                  <span className="whitespace-nowrap text-xs text-[#9a8b7e]">{e.work.workers} {e.work.workers === 1 ? "man" : "men"} · {e.work.days}d</span>
                ) : <span className="text-[#9a8b7e]">—</span>}
              </Td>
              <Td className="font-mono">{tk(e.grandTotal)}</Td>
              <Td className="font-mono">{tk(e.paidAmount)}</Td>
              <Td className={`font-mono ${e.due > 0 ? "text-red-600" : "text-emerald-700"}`}>{tk(e.due)}</Td>
              <Td><Badge tone={STATUS[e.status]?.tone}>{STATUS[e.status]?.label}</Badge></Td>
              <Td>
                <div className="flex justify-end gap-1.5">
                  {/* A carving the customer traced has never been priced by anyone, and the
                      figure on screen is one this software guessed. Until the shop sends a
                      real price it cannot become an order — so Review comes first and Make
                      order is not offered beside it. Once priced, it can still be re-priced
                      from the order page if the customer haggles. */}
                  {e.needsQuote
                    ? <Button className="whitespace-nowrap" onClick={() => setReview(e)}><Gavel className="h-4 w-4" />Review &amp; price</Button>
                    : (e.status === "NEW" || e.status === "QUOTED") && <Button className="whitespace-nowrap" onClick={() => setConv(e)}><ShoppingBag className="h-4 w-4" />Make order</Button>}
                  <Button size="sm" variant="danger" aria-label={`Delete ${e.estimateNo}`} title="Delete" busy={busy} onClick={() => del(e)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      )}
      {scope === "requests" && !loading && !data?.length && !status && (
        <p className="mt-3 rounded-lg bg-[#faf7f3] px-3 py-2.5 text-sm text-[#7a6a5d]">
          Nothing waiting. This list only fills when a customer sends in a door with a carving
          of their own — one picked out of your gallery already has a price and goes straight
          to <b>Orders</b>.
        </p>
      )}
      {scope === "orders" && !loading && !data?.length && !status && !query && (
        <p className="mt-3 rounded-lg bg-[#faf7f3] px-3 py-2.5 text-sm text-[#7a6a5d]">
          No orders yet. An estimate becomes an order when the customer says yes — here with
          <b> Make order</b>, or from their own page on the website. To find an estimate that
          is not an order yet, pick its status above.
        </p>
      )}
      {scope === "requests" && (data ?? []).some((e) => e.needsQuote) && (
        <p className="mt-3 rounded-lg bg-sky-50 px-3 py-2.5 text-sm text-sky-900">
          The ones marked <b>Needs a price</b> carry a carving nobody has priced. Press
          <b> Review &amp; price</b>: the real figure goes to the customer&apos;s own page (and by
          text, if an SMS gateway is set up), and it becomes an order when they accept it.
        </p>
      )}
      {/* Mounted only while open, and keyed by the estimate.
          Returning null from inside a dialog hides it but does not unmount it, so the
          advance typed for one order, and the carving price typed for one customer, would
          still be sitting in the boxes when the next one is opened - and pressing Confirm
          would record money nobody paid. Unmounting is what actually clears them. */}
      {conv && <ConvertModal key={`c${conv.id}`} est={conv} onClose={() => setConv(null)} onDone={() => { setConv(null); reload(); }} />}
      {review && <ReviewModal key={`r${review.id}`} est={review} onClose={() => setReview(null)} onDone={() => { setReview(null); reload(); }} />}
    </>
  );
}

function ConvertModal({ est, onClose, onDone }: { est: any | null; onClose: () => void; onDone: () => void }) {
  const [p, setP] = useState({ amount: "", method: "CASH" });
  const { busy, run } = useAction();
  const router = useRouter();
  if (!est) return null;
  const due = num(est.grandTotal) - num(est.paidAmount) - num(p.amount);
  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const ok = await run(async () => {
      const r = await api.patch(`/api/admin/estimates/${est.id}/status`, { status: "CONFIRMED" });
      if (num(p.amount) > 0) await api.post(`/api/admin/estimates/${est.id}/payments`, { amount: num(p.amount), method: p.method, note: "Advance on order" });
      return r;
    }, "Order confirmed");
    // Straight on to the order itself. An order that has just been placed is the one thing
    // everybody asks about next - what was agreed, what was paid, what is still due - so
    // the answer is put on screen rather than left behind a row in a list.
    if (ok) { setP({ amount: "", method: "CASH" }); onDone(); router.push(`/admin/door/estimates/${est.id}`); }
  };
  return (
    <Modal open onClose={onClose} title={`Make order: ${est.estimateNo}`}>
      <form className="space-y-4" onSubmit={submit}>
        <p className="text-sm text-[#4a3d33]">{est.customer.name} ({est.customer.phone}) liked this design. Confirming deducts wood from stock.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Paid now (advance)"><Input id="c-amt" type="number" min={0} max={num(est.grandTotal) - num(est.paidAmount)} value={p.amount} onChange={(e) => setP({ ...p, amount: e.target.value })} /></Field>
          <Field label="Method"><Select id="c-met" value={p.method} onChange={(e) => setP({ ...p, method: e.target.value })}>{METHODS.filter(([k]) => k !== "LC").map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
        </div>
        <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-[#e8e0d6] text-center">
          <div className="p-3"><div className="text-xs text-[#7a6a5d]">Total</div><div className="font-mono font-semibold">{tk(est.grandTotal)}</div></div>
          <div className="border-x border-[#e8e0d6] p-3"><div className="text-xs text-[#7a6a5d]">Paid</div><div className="font-mono font-semibold text-emerald-700">{tk(num(est.paidAmount) + num(p.amount))}</div></div>
          <div className="bg-[#1f1712] p-3 text-white"><div className="text-xs text-[#c9b9a8]">Due</div><div className="font-mono font-semibold text-[#e2b35c]">{tk(due)}</div></div>
        </div>
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button><Button busy={busy} disabled={due < 0}>Confirm order</Button></div>
      </form>
    </Modal>
  );
}


/**
 * The review: the shop looks at a carving the customer traced from their own photo, and
 * puts a real price on it.
 *
 * Only the carving is in question. Wood, colour, frame, fitting and labour were priced off
 * the shop's own rates the moment the request arrived - those are settled, and this screen
 * shows them as settled so nobody re-negotiates a rate that was never in doubt. What is not
 * settled is the one thing nobody has ever quoted: this carving, on this door.
 */
function ReviewModal({ est, onClose, onDone }: { est: any | null; onClose: () => void; onDone: () => void }) {
  const [p, setP] = useState({ carving: "", labour: "", workers: "", days: "", note: "", keep: false });
  const { busy, run } = useAction();
  const full = useLoad<any>(est ? `/api/admin/estimates/${est.id}` : null);
  if (!est) return null;

  const e = full.data;
  // The two lines the website estimated, and everything that was already settled.
  const lines: any[] = e?.lines ?? [];
  const estimated = lines.filter((l) => l.name.endsWith("(estimate)"));
  const settled = lines.filter((l) => !l.name.endsWith("(estimate)"));
  const settledTotal = settled.reduce((a, l) => a + num(l.sell), 0);
  const carving = num(p.carving), labour = num(p.labour);
  const newTotal = settledTotal + carving + labour;
  const guessed = estimated.reduce((a, l) => a + num(l.sell), 0);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const okd = await run(() => api.post(`/api/admin/estimates/${est.id}/quote`, {
      carving, labour, workers: num(p.workers), days: num(p.days), note: p.note || null, keepInGallery: p.keep,
    }));
    if (okd) { setP({ carving: "", labour: "", workers: "", days: "", note: "", keep: false }); onDone(); }
  };

  return (
    <Modal open onClose={onClose} title={`Review & price: ${est.estimateNo}`} wide>
      {full.error ? <ErrorBox text={full.error} retry={full.reload} /> : full.loading || !e || e.id !== est.id ? <Loading /> : (
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            {/* What the customer actually designed, drawn the same way the Designer draws it. */}
            <div className="rounded-lg bg-[#efeae3] p-3">
              <DoorPreview type={e.doorType} heightFt={num(e.heightFt)} widthFt={num(e.widthFt)}
                doorHex={e.doorColorCode || "#B07A45"} designKey={e.designKey ?? null}
                designSvg={e.customDesignSvg ?? null}
                ornHex={ornColor(e.doorColorCode || "#B07A45", e.designColorCode ? { colorCode: e.designColorCode, isToneOnTone: false } : null)}
                dims={false} className="max-h-[260px] w-full" />
              <p className="mt-2 text-center text-xs text-[#7a6a5d]">{e.customDesignName ?? "Customer's carving"}</p>
            </div>

            <div className="space-y-3">
              <div className="rounded-lg bg-[#faf7f3] px-3 py-2.5 text-sm">
                <div className="font-semibold text-[#1f1712]">{e.customer.name} · {e.customer.phone}</div>
                <div className="text-[#7a6a5d]">{e.doorType === "DOUBLE" ? "Double" : "Single"} {ftin(e.heightFt)}×{ftin(e.widthFt)} · {e.woodName}</div>
                {e.note && <div className="mt-1 whitespace-pre-line text-xs text-[#7a6a5d]">{e.note}</div>}
              </div>

              <div className="rounded-lg border border-[#efe8df]">
                <div className="border-b border-[#efe8df] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[#7a6a5d]">Already settled — your own rates</div>
                <div className="max-h-40 overflow-y-auto px-3 py-2 text-sm">
                  {settled.map((l, i) => (
                    <div key={i} className="flex justify-between py-0.5"><span className="text-[#4a3d33]">{l.name}</span><span className="font-mono">{tk(l.sell)}</span></div>
                  ))}
                  <div className="mt-1 flex justify-between border-t border-[#efe8df] pt-1.5 font-semibold"><span>Subtotal</span><span className="font-mono">{tk(settledTotal)}</span></div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Carving price" hint={guessed ? `The website estimated ${tk(guessed)} for both lines` : undefined}>
                  <Input id="rv-carving" type="number" min={0} required value={p.carving} onChange={(ev) => setP({ ...p, carving: ev.target.value })} />
                </Field>
                <Field label="Carving labour">
                  <Input id="rv-labour" type="number" min={0} value={p.labour} onChange={(ev) => setP({ ...p, labour: ev.target.value })} />
                </Field>
              </div>

              {/* A gallery carving brings its crew from the price list. This one has never
                  been seen before, so the only person who can say how many men it takes is
                  the one looking at it now. The customer is never shown either number. */}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Workers needed" hint="For your work sheet — the customer never sees this">
                  <Input id="rv-workers" type="number" min={0} value={p.workers} onChange={(ev) => setP({ ...p, workers: ev.target.value })} />
                </Field>
                <Field label="Days">
                  <Input id="rv-days" type="number" min={0} value={p.days} onChange={(ev) => setP({ ...p, days: ev.target.value })} />
                </Field>
              </div>

              <Field label="Message to the customer (optional)">
                <Input id="rv-note" placeholder="e.g. this carving needs 3 extra days" value={p.note} onChange={(ev) => setP({ ...p, note: ev.target.value })} />
              </Field>

              <Toggle checked={p.keep} onChange={(v) => setP({ ...p, keep: v })} label="Also keep this carving in my gallery, at this price" />

              <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-[#e8e0d6] text-center">
                <div className="p-3"><div className="text-xs text-[#7a6a5d]">Settled</div><div className="font-mono font-semibold">{tk(settledTotal)}</div></div>
                <div className="border-x border-[#e8e0d6] p-3"><div className="text-xs text-[#7a6a5d]">Carving</div><div className="font-mono font-semibold">{tk(carving + labour)}</div></div>
                <div className="bg-[#1f1712] p-3 text-white"><div className="text-xs text-[#c9b9a8]">Final total</div><div className="font-mono font-semibold text-[#e2b35c]">{tk(newTotal)}</div></div>
              </div>
            </div>
          </div>

          <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-900">
            Sending this puts the final price on the customer&apos;s own page. Nothing leaves stock
            until they accept it and it becomes an order.
          </p>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button busy={busy} disabled={!(carving > 0)}>Send the final price</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
