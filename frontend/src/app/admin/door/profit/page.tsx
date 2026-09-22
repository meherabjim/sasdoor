"use client";

import Link from "next/link";
import { useState } from "react";
import { fmtDate, num, STATUS, tk } from "@/lib/erp";
import { Badge, Button, ErrorBox, Field, Input, Loading, PageHeader, Table, Td, useLoad } from "@/components/erp/ui";

/**
 * What you actually made.
 *
 * A screen of its own, and that is the point of it. Design & Estimate is used with the
 * customer beside you, so nothing on it says what a door cost you or what you put on top.
 * That number still has to live somewhere - a shop that cannot see its own margin is
 * guessing - so it lives here, on a page you open by yourself, with nothing on it a
 * customer has any reason to be looking at.
 *
 * Only real orders are counted. An estimate nobody said yes to is not profit, it is a
 * conversation, and adding it in would flatter every month with doors that were never made.
 * A cancelled one is not here either.
 */
const ORDERED = ["CONFIRMED", "IN_PRODUCTION", "READY", "DELIVERED", "COMPLETED"];

/**
 * A date as the yyyy-mm-dd an <input type="date"> wants, in the SHOP'S day.
 *
 * Not toISOString(): that converts to UTC first, and Bangladesh is six hours ahead of it, so
 * any time before six in the morning it would hand back yesterday - and "this month" opened
 * at 5am on the 1st would start in the month before.
 */
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const monthStart = () => { const d = new Date(); return iso(new Date(d.getFullYear(), d.getMonth(), 1)); };

export default function ProfitPage() {
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(iso(new Date()));
  const [range, setRange] = useState({ from: monthStart(), to: iso(new Date()) });

  // `to` is a date, and an order made at 3pm is still made that day, so the day is taken
  // whole - without this an order placed this afternoon vanishes from a range ending today.
  const qs = new URLSearchParams({ scope: "orders", from: range.from, to: `${range.to}T23:59:59` });
  const { data, loading, error, reload } = useLoad<any[]>(`/api/admin/estimates?${qs.toString()}`);

  const rows = (data ?? []).filter((e) => ORDERED.includes(e.status));
  const sum = rows.reduce((a, e) => ({
    sell: a.sell + num(e.grandTotal),
    cost: a.cost + num(e.totalCost),
    paid: a.paid + num(e.paidAmount),
    due: a.due + num(e.due),
  }), { sell: 0, cost: 0, paid: 0, due: 0 });
  const profit = sum.sell - sum.cost;
  const margin = sum.sell ? Math.round((profit / sum.sell) * 100) : 0;

  const preset = (label: string, f: string, t: string) => (
    <Button key={label} size="sm" variant="ghost" onClick={() => { setFrom(f); setTo(t); setRange({ from: f, to: t }); }}>{label}</Button>
  );
  const today = new Date();
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

  return (
    <>
      <PageHeader title="Profit" sub="What the orders in this period sold for, what they cost you, and what is left. Only doors the customer said yes to — an estimate nobody accepted is not profit." />

      <form onSubmit={(ev) => { ev.preventDefault(); setRange({ from, to }); }} className="mb-5 flex flex-wrap items-end gap-3">
        <Field label="From"><Input id="p-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="To"><Input id="p-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        <Button>Show</Button>
        <div className="flex flex-wrap gap-1.5">
          {preset("This month", monthStart(), iso(today))}
          {preset("Last month", iso(lastMonth), iso(new Date(today.getFullYear(), today.getMonth(), 0)))}
          {preset("This year", iso(new Date(today.getFullYear(), 0, 1)), iso(today))}
        </div>
      </form>

      {error ? <ErrorBox text={error} retry={reload} /> : loading ? <Loading /> : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {([
              ["Sold for", tk(sum.sell), "text-[#1f1712]", `${rows.length} ${rows.length === 1 ? "order" : "orders"}`],
              ["Cost you", tk(sum.cost), "text-[#7a6a5d]", "wood, colour, carving, labour"],
              ["Profit", tk(profit), profit >= 0 ? "text-emerald-700" : "text-red-600", `${margin}% of the price`],
              ["Still owed", tk(sum.due), sum.due > 0 ? "text-red-600" : "text-emerald-700", `${tk(sum.paid)} collected`],
            ] as [string, string, string, string][]).map(([label, value, tone, note]) => (
              <div key={label} className="rounded-xl border border-[#e8e0d6] bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#7a6a5d]">{label}</div>
                <div className={`mt-1 font-mono text-2xl font-semibold [font-variant-numeric:tabular-nums] ${tone}`}>{value}</div>
                <div className="mt-1 text-xs text-[#9a8b7e]">{note}</div>
              </div>
            ))}
          </div>

          {/* Profit is money in hand only once it is paid for, so the two sit side by side
              rather than one page apart: a good month on paper with everything still owed
              is a fact worth seeing in the same glance. */}
          {sum.due > 0 && (
            <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
              {tk(sum.due)} of this has not been collected yet{sum.due > profit && profit > 0 ? ` — more than the ${tk(profit)} profit on it, so the margin here is still on paper` : ""}.
              {" "}Open an order to record a payment.
            </p>
          )}

          <Table head={["Estimate", "Date", "Customer", "Door", "Sold for", "Cost", "Profit", "Margin", "Status"]} empty={!rows.length}>
            {rows.map((e) => {
              const p = num(e.grandTotal) - num(e.totalCost);
              const m = num(e.grandTotal) ? Math.round((p / num(e.grandTotal)) * 100) : 0;
              return (
                <tr key={e.id} className="hover:bg-[#faf7f3]">
                  <Td><Link href={`/admin/door/estimates/${e.id}`} className="font-semibold text-[#8a5a1f] hover:underline">{e.estimateNo}</Link></Td>
                  <Td>{fmtDate(e.createdAt)}</Td>
                  <Td><div className="font-medium">{e.customer.name}</div><div className="text-xs text-[#9a8b7e]">{e.customer.phone}</div></Td>
                  <Td><div>{e.doorType === "DOUBLE" ? "Double" : "Single"}</div><div className="text-xs text-[#9a8b7e]">{e.woodName}{e.designName ? ` · ${e.designName}` : ""}</div></Td>
                  <Td className="font-mono">{tk(e.grandTotal)}</Td>
                  <Td className="font-mono text-[#7a6a5d]">{tk(e.totalCost)}</Td>
                  <Td className={`font-mono font-semibold ${p >= 0 ? "text-emerald-700" : "text-red-600"}`}>{tk(p)}</Td>
                  <Td className="font-mono text-[#7a6a5d]">{m}%</Td>
                  <Td><Badge tone={STATUS[e.status]?.tone}>{STATUS[e.status]?.label}</Badge></Td>
                </tr>
              );
            })}
          </Table>

          {!rows.length && (
            <p className="mt-3 rounded-lg bg-[#faf7f3] px-3 py-2.5 text-sm text-[#7a6a5d]">
              No orders in this period. Widen the dates above, or confirm an order first — a door
              only counts here once the customer has said yes to it.
            </p>
          )}

          <p className="mt-4 text-xs leading-5 text-[#9a8b7e]">
            Cost is what the door itself took: the wood at the price you actually bought it for,
            plus colour, carving and labour at your cost rates. Running the shop — rent, power,
            the van — is not in it, so the real profit for a month is a little under this.
            {" "}Nothing on this page is ever shown to a customer.
          </p>
        </>
      )}
    </>
  );
}
