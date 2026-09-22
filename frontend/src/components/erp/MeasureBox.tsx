"use client";

import { Plus, Trash2 } from "lucide-react";
import { fmtNum, num } from "@/lib/erp";
import { MODES, MeasureMode, Row, blankRow, cbmToCft, rowCft, rowsCft, usesRows } from "@/lib/measure";
import { Field, Input } from "@/components/erp/ui";

/**
 * How the quantity gets typed in.
 *
 * In the trade "ফুট" and "সিএফটি" are the same word for the same thing, so there is
 * no separate foot mode - what changes here is only how the measurement is taken.
 * Whatever the admin picks, what leaves this component is CFT, because the stock and
 * the whole pricing engine are CFT-based and that is not worth breaking.
 *
 * One consignment brings pieces of many sizes, so the three measured modes get a small
 * line-item table rather than a single box.
 *
 * There is no weight mode: the trade sells by CFT, and a CFT derived from weight moves
 * with how damp the wood is, which is not a basis to price a consignment on.
 */
export type MeasureState = { mode: MeasureMode; rows: Row[]; cft: string; cbm: string };

export const blankMeasure = (): MeasureState => ({ mode: "FT_IN", rows: [blankRow()], cft: "", cbm: "" });

/** The one number the rest of the form cares about. */
export function measureCft(m: MeasureState): number {
  if (usesRows(m.mode)) return rowsCft(m.mode, m.rows);
  return num(m.cft);
}

/** What gets stored alongside the CFT, so "where did 28.5 come from" stays answerable. */
export function measureRaw(m: MeasureState) {
  if (usesRows(m.mode)) return { mode: m.mode, rows: m.rows.filter((r) => rowCft(m.mode, r) > 0) };
  return { mode: m.mode, cft: num(m.cft), cbm: num(m.cbm) || undefined };
}

const COLS: Record<string, { key: keyof Row; label: string; step?: string }[]> = {
  FT_IN: [
    { key: "pieces", label: "Pieces" },
    { key: "lengthFt", label: "Length (ft)" },
    { key: "lengthIn", label: "+ inches" },
    { key: "width", label: "Width (in)", step: "0.25" },
    { key: "thickness", label: "Thickness (in)", step: "0.25" },
  ],
  INCH: [
    { key: "pieces", label: "Pieces" },
    { key: "lengthFt", label: "Length (in)" },
    { key: "width", label: "Width (in)", step: "0.25" },
    { key: "thickness", label: "Thickness (in)", step: "0.25" },
  ],
  GIRTH: [
    { key: "pieces", label: "Pieces" },
    { key: "girth", label: "Girth (in)", step: "0.25" },
    { key: "lengthFt", label: "Length (ft)" },
  ],
};

export function MeasureBox({ value, onChange }: {
  value: MeasureState; onChange: (m: MeasureState) => void;
}) {
  const m = value;
  const set = (p: Partial<MeasureState>) => onChange({ ...m, ...p });
  const total = measureCft(m);
  const cols = COLS[m.mode] ?? [];

  const setRow = (i: number, p: Partial<Row>) => set({ rows: m.rows.map((r, k) => (k === i ? { ...r, ...p } : r)) });

  return (
    <div className="mb-5 rounded-xl border border-[#efe8df] bg-[#faf7f3] p-4">
      <div className="mb-3 flex flex-wrap gap-1.5">
        {MODES.map((x) => (
          <button key={x.key} type="button" onClick={() => set({ mode: x.key })} aria-pressed={m.mode === x.key} title={x.hint}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${m.mode === x.key ? "bg-[#1f1712] text-white" : "border border-[#e0d6ca] bg-white text-[#1f1712] hover:border-[#c8963e]"}`}>
            {x.label}
          </button>
        ))}
      </div>
      <p className="mb-3 text-xs text-[#9a8b7e]">{MODES.find((x) => x.key === m.mode)?.hint}</p>

      {/* ---- measured modes: a row per size in the consignment ---- */}
      {usesRows(m.mode) && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-[#7a6a5d]">
                {cols.map((c) => <th key={String(c.key)} className="pb-1.5 pr-2 font-semibold">{c.label}</th>)}
                <th className="pb-1.5 pr-2 text-right font-semibold">CFT</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {m.rows.map((r, i) => (
                <tr key={i}>
                  {cols.map((c) => (
                    <td key={String(c.key)} className="pb-2 pr-2">
                      <Input id={`mr-${i}-${String(c.key)}`} type="number" min={0} step={c.step ?? "1"} value={r[c.key]}
                        onChange={(e) => setRow(i, { [c.key]: e.target.value } as Partial<Row>)} className="py-1.5" />
                    </td>
                  ))}
                  <td className="pb-2 pr-2 text-right font-mono text-[#1f1712]">{fmtNum(rowCft(m.mode, r), 3)}</td>
                  <td className="pb-2">
                    {m.rows.length > 1 && (
                      <button type="button" aria-label="Remove row" onClick={() => set({ rows: m.rows.filter((_, k) => k !== i) })}
                        className="rounded-md p-1.5 text-[#a4756b] hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={() => set({ rows: [...m.rows, blankRow()] })}
            className="mt-1 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-[#a0712a] hover:bg-[#f3ece3]">
            <Plus className="h-3.5 w-3.5" />Another size
          </button>
        </div>
      )}

      {/* ---- straight CFT, with a CBM box for imported invoices ---- */}
      {m.mode === "CFT" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Total CFT">
            <Input id="mq-cft" type="number" step="0.001" min={0} value={m.cft} onChange={(e) => set({ cft: e.target.value, cbm: "" })} />
          </Field>
          <Field label="or CBM" hint="An imported invoice often comes in CBM">
            <Input id="mq-cbm" type="number" step="0.001" min={0} value={m.cbm}
              onChange={(e) => set({ cbm: e.target.value, cft: e.target.value ? String(cbmToCft(num(e.target.value))) : "" })} />
          </Field>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-[#efe8df] pt-3">
        <span className="text-sm font-semibold text-[#1f1712]">Total quantity</span>
        <span className="font-mono text-lg font-semibold text-[#1f1712]">{fmtNum(total, 3)} CFT</span>
      </div>
    </div>
  );
}
