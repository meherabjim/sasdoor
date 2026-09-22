import type { Tx } from "../config/prisma";
import { n, r2 } from "./money";

/**
 * What to charge for a carving nobody has ever priced.
 *
 * A customer arrives on the website with a photo of a door they like. The shop has never
 * seen that carving, so there is no price for it anywhere - and a website that answers
 * "ask us" to every such door is a website nobody finishes using. So it answers with a
 * number, and says plainly that it is an estimate until the shop confirms it.
 *
 * The number is not invented. The tracing already tells us how much work the carving is -
 * how many separate shapes were cut, and how much of the leaf they fill - and the shop's
 * own gallery tells us what work like that costs here. Place one on the other and the
 * answer is always a price this shop has actually charged: never above the dearest carving
 * it sells, never below the cheapest.
 *
 * The shape count and coverage come from the browser, because that is where the tracing
 * happens, but the money never does. A price posted from a browser is a price a customer
 * can edit; every figure below is read out of the shop's own rows on the server.
 */

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const between = (v: number, lo: number, hi: number) => (hi > lo ? clamp01((v - lo) / (hi - lo)) : 0);

/**
 * How much work this carving is, 0 to 1. Shape count carries the most weight because that
 * is what the carver's hand follows; coverage is the check on it, since many tiny shapes in
 * one corner is not the same job as the same count spread across the whole leaf.
 *
 * The bounds are read off real tracings: below eight shapes nothing reads as carved at all,
 * and past sixty the tracer is counting wood grain rather than pattern.
 */
export const workScore = (shapes: number, coverage: number) =>
  clamp01(between(shapes, 8, 60) * 0.6 + between(coverage, 0.15, 0.75) * 0.4);

/** Put a score on a list of the shop's own prices: cheapest at 0, median at 0.5, dearest at 1. */
export function onGalleryScale(score: number, xs: number[]): number {
  const v = xs.filter((x) => x > 0).sort((a, b) => a - b);
  if (!v.length) return 0;
  const lo = v[0], hi = v[v.length - 1], mid = v[Math.floor(v.length / 2)];
  return Math.round(score <= 0.5 ? lo + (mid - lo) * (score * 2) : mid + (hi - mid) * ((score - 0.5) * 2));
}

export type CarvingEstimate = { carving: number; labour: number; total: number; basedOn: number };

/**
 * The estimated selling price of a traced carving, for one leaf type.
 * Returns zeros when the gallery has nothing priced to compare against - the website then
 * says so rather than showing a number it cannot stand behind.
 */
export async function estimateCarving(db: Tx, shapes: number, coverage: number, doubleDoor: boolean): Promise<CarvingEstimate> {
  const lib = await db.doorDesign.findMany({ where: { active: true, origin: "BUILTIN" } });
  if (!lib.length) return { carving: 0, labour: 0, total: 0, basedOn: 0 };
  const score = workScore(shapes, coverage);
  const carving = onGalleryScale(score, lib.map((d) => n(doubleDoor ? d.sellDouble : d.sellSingle)));
  const labour = onGalleryScale(score, lib.map((d) => n(doubleDoor ? d.labourSellDouble : d.labourSellSingle)));
  return { carving, labour, total: r2(carving + labour), basedOn: lib.length };
}
