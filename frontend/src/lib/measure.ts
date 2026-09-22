/**
 * Turning what the shop actually measures into CFT.
 *
 * In the Bangladeshi timber trade "ফুট" and "সিএফটি" mean the same thing - cubic feet.
 * So there is no separate foot mode; what changes between modes is only *how the
 * measurement is taken*, never the unit that gets stored. Storage is always CFT,
 * because the whole stock and pricing engine is CFT-based.
 *
 * Sawn timber   : length in feet, width and thickness in inches  -> ÷ 144
 *                 all three in inches                            -> ÷ 1728
 * Round log     : girth in inches, length in feet                -> ÷ 2304
 *                 (the quarter-girth / Hoppus rule: girth²·L/16 with feet, and
 *                  16 × 144 = 2304 once the girth is in inches. It reads low on
 *                  purpose - the corners are lost when a round log is sawn.)
 * Imported CBM  : × 35.3147
 *
 * There is no weight mode. Timber here is sold by CFT, never by the kilo, and a CFT
 * worked back from weight is a guess anyway - damp wood weighs 20-30% more than the
 * same wood dry, so the same consignment would price differently depending on the
 * weather it travelled in.
 */

export type MeasureMode = "CFT" | "FT_IN" | "INCH" | "GIRTH";

export const CBM_TO_CFT = 35.3147;

export const MODES: { key: MeasureMode; label: string; hint: string }[] = [
  { key: "FT_IN", label: "Feet + inches", hint: "Length in feet, width and thickness in inches" },
  { key: "INCH", label: "All inches", hint: "All three measurements in inches" },
  { key: "GIRTH", label: "Round log", hint: "Girth in inches, length in feet" },
  { key: "CFT", label: "CFT", hint: "Total cubic feet, typed straight in" },
];

/** One line of the entry table. Blank boxes read as 0 so a half-typed row just gives 0 CFT. */
export type Row = {
  pieces: string;
  lengthFt: string;   // FT_IN, GIRTH
  lengthIn: string;   // FT_IN only: the inches part of the length
  width: string;      // inches
  thickness: string;  // inches
  girth: string;      // inches, GIRTH only
};

export const blankRow = (): Row => ({ pieces: "1", lengthFt: "", lengthIn: "", width: "", thickness: "", girth: "" });

const num = (v: unknown) => Number(v ?? 0) || 0;

/** 3 decimals everywhere: the column is Decimal(12,3), and 10-15 pieces round badly at 2. */
export const r3 = (v: number) => Math.round((v + Number.EPSILON) * 1000) / 1000;

/** CFT for one row, under the given mode. */
export function rowCft(mode: MeasureMode, row: Row): number {
  const pieces = Math.max(0, num(row.pieces));
  if (!pieces) return 0;

  if (mode === "FT_IN") {
    const len = num(row.lengthFt) + num(row.lengthIn) / 12;
    return r3((pieces * len * num(row.width) * num(row.thickness)) / 144);
  }
  if (mode === "INCH") {
    return r3((pieces * num(row.lengthFt) * num(row.width) * num(row.thickness)) / 1728);
  }
  if (mode === "GIRTH") {
    const g = num(row.girth);
    return r3((pieces * g * g * num(row.lengthFt)) / 2304);
  }
  return 0;
}

export const rowsCft = (mode: MeasureMode, rows: Row[]) => r3(rows.reduce((a, x) => a + rowCft(mode, x), 0));

export const cbmToCft = (cbm: number) => r3(num(cbm) * CBM_TO_CFT);

/** Human label for one row, for the table and for the saved raw entry. */
export function rowLabel(mode: MeasureMode, row: Row): string {
  const p = `${num(row.pieces) || 1} pcs`;
  if (mode === "FT_IN") {
    const ft = num(row.lengthFt), inch = num(row.lengthIn);
    return `${p} · ${ft}′${inch ? ` ${inch}″` : ""} × ${num(row.width)}″ × ${num(row.thickness)}″`;
  }
  if (mode === "INCH") return `${p} · ${num(row.lengthFt)}″ × ${num(row.width)}″ × ${num(row.thickness)}″`;
  if (mode === "GIRTH") return `${p} · girth ${num(row.girth)}″ × length ${num(row.lengthFt)}′`;
  return p;
}

export const usesRows = (mode: MeasureMode) => mode === "FT_IN" || mode === "INCH" || mode === "GIRTH";
