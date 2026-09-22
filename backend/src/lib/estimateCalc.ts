import { n, r2, r3, Num } from "./money";

type Priced = { costSingle: Num; costDouble: Num; sellSingle: Num; sellDouble: Num };
export type CalcInput = {
  doorType: "SINGLE" | "DOUBLE"; heightFt: number; widthFt: number; thicknessInch?: number;
  withFrame: boolean; withFitting: boolean; withDelivery: boolean;
};
export type CalcData = {
  settings: {
    doorThicknessInch: Num; frameWidthInch: Num; frameThicknessInch: Num; wastagePercent: Num;
    minHeightFt: Num; maxHeightFt: Num; singleMinWidthFt: Num; singleMaxWidthFt: Num;
    doubleMinWidthFt: Num; doubleMaxWidthFt: Num; bigDoorSqftPerLeaf: Num; bigDoorExtraPercent: Num;
  };
  wood: { name: string; activeCostPerCft: Num; sellingPricePerCft: Num };
  doorColor?: (Priced & { nameEn: string } & Crew) | null;
  design?: (Priced & { nameEn: string; labourCostSingle: Num; labourCostDouble: Num; labourSellSingle: Num; labourSellDouble: Num } & Crew) | null;
  designColor?: (Priced & { nameEn: string } & Crew) | null;
  labour: (Priced & { nameEn: string; category: string } & Crew)[];
};
/** Set once on the price list, shown on the estimate. It never touches a price. */
export type Crew = { workersSingle?: number; workersDouble?: number; daysSingle?: number; daysDouble?: number };
export type CrewLine = { name: string; workers: number; days: number };

export type Line = { type: "WOOD" | "DOOR_COLOR" | "DESIGN" | "DESIGN_COLOR" | "LABOUR"; name: string; quantity: number; unitCost: number; unitSell: number; cost: number; sell: number;
  /** The plan for this job. 0 on wood and colour - those are not jobs anybody does. */
  workers: number; days: number };

const pick = (p: Priced, double: boolean) => ({ cost: n(double ? p.costDouble : p.costSingle), sell: n(double ? p.sellDouble : p.sellSingle) });

export function calculateEstimate(input: CalcInput, d: CalcData) {
  const s = d.settings;
  const double = input.doorType === "DOUBLE";
  const [minW, maxW] = double ? [n(s.doubleMinWidthFt), n(s.doubleMaxWidthFt)] : [n(s.singleMinWidthFt), n(s.singleMaxWidthFt)];
  if (input.heightFt < n(s.minHeightFt) || input.heightFt > n(s.maxHeightFt))
    throw Object.assign(new Error(`Height ${n(s.minHeightFt)}–${n(s.maxHeightFt)} ft`), { status: 400 });
  if (input.widthFt < minW || input.widthFt > maxW)
    throw Object.assign(new Error(`Width ${minW}–${maxW} ft`), { status: 400 });

  const thickness = input.thicknessInch ?? n(s.doorThicknessInch);
  const doorCft = input.heightFt * input.widthFt * (thickness / 12);
  const frameCft = input.withFrame ? (2 * input.heightFt + input.widthFt) * (n(s.frameWidthInch) / 12) * (n(s.frameThicknessInch) / 12) : 0;
  const totalCft = r2((doorCft + frameCft) * (1 + n(s.wastagePercent) / 100));

  const leafSqft = input.heightFt * (input.widthFt / (double ? 2 : 1));
  const bigFactor = leafSqft > n(s.bigDoorSqftPerLeaf) ? 1 + n(s.bigDoorExtraPercent) / 100 : 1;

  /**
   * How many workers this job needs, and for how many days.
   *
   * Deliberately kept out of the money: it is read off the price list as-is and only
   * displayed, so nothing here can move a quote. A large door does not multiply it
   * either - 20% more price does not mean 20% more people.
   */
  const crewOf = (c: Crew): { workers: number; days: number } => ({
    workers: Number((double ? c.workersDouble : c.workersSingle) ?? 0) || 0,
    days: Number((double ? c.daysDouble : c.daysSingle) ?? 0) || 0,
  });
  const NOBODY = { workers: 0, days: 0 };

  const lines: Line[] = [];
  const add = (type: Line["type"], name: string, unitCost: number, unitSell: number, quantity = 1, crew = NOBODY) =>
    lines.push({ type, name, quantity, unitCost: r2(unitCost), unitSell: r2(unitSell), cost: r2(unitCost * quantity), sell: r2(unitSell * quantity), ...crew });

  add("WOOD", `${d.wood.name} (${totalCft} CFT)`, n(d.wood.activeCostPerCft), n(d.wood.sellingPricePerCft), totalCft);
  if (d.doorColor) { const p = pick(d.doorColor, double); add("DOOR_COLOR", `Door color: ${d.doorColor.nameEn}`, p.cost, p.sell, 1, crewOf(d.doorColor)); }
  if (d.design) {
    const p = pick(d.design, double);
    add("DESIGN", `Carving: ${d.design.nameEn}${bigFactor > 1 ? " (large door)" : ""}`, p.cost * bigFactor, p.sell * bigFactor);
    const lc = n(double ? d.design.labourCostDouble : d.design.labourCostSingle);
    const ls = n(double ? d.design.labourSellDouble : d.design.labourSellSingle);
    // The carving's crew belongs to the carving *labour* line: that is the one that is a
    // job somebody does, while the line above it is the price of the pattern itself.
    add("LABOUR", `Carving labour: ${d.design.nameEn}`, lc * bigFactor, ls * bigFactor, 1, crewOf(d.design));
  }
  if (d.design && d.designColor) { const p = pick(d.designColor, double); add("DESIGN_COLOR", `Carving color: ${d.designColor.nameEn}`, p.cost, p.sell, 1, crewOf(d.designColor)); }
  for (const l of d.labour) {
    if (l.category === "FRAME" && !input.withFrame) continue;
    if (l.category === "FITTING" && !input.withFitting) continue;
    if (l.category === "DELIVERY" && !input.withDelivery) continue;
    const p = pick(l, double);
    add("LABOUR", l.nameEn, p.cost, p.sell, 1, crewOf(l));
  }
  const totalCost = r2(lines.reduce((a, l) => a + l.cost, 0));
  const totalSell = r2(lines.reduce((a, l) => a + l.sell, 0));

  // The same plan, read straight back off the lines rather than worked out a second time:
  // one list cannot drift from the other if there is only one list.
  const crew: CrewLine[] = lines
    .filter((l) => l.workers || l.days)
    .map((l) => ({ name: l.name, workers: l.workers, days: l.days }));
  // People work side by side, so the headcount adds up while the calendar does not:
  // the job is as long as its longest task, not the sum of them.
  const crewTotal = { workers: crew.reduce((a, c) => a + c.workers, 0), days: crew.reduce((a, c) => Math.max(a, c.days), 0) };

  return {
    doorCft: r3(doorCft), frameCft: r3(frameCft), totalCft, thicknessInch: thickness,
    bigDoor: bigFactor > 1, lines, totalCost, totalSell, profit: r2(totalSell - totalCost),
    crew, crewTotal,
  };
}
