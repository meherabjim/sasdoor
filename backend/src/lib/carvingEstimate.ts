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
 * The number is not invented. The tracing tells us how much work the carving is, and the
 * shop's own gallery tells us what work like that costs here. Place one on the other and
 * the answer is always a figure this shop has actually charged: never above the dearest
 * carving it sells, never below the cheapest. The same placing gives the carving labour and
 * the crew - how many men, how many days - from what the gallery's carvings take.
 *
 * The measurements come from the browser, because that is where the tracing happens, but
 * the money never does. A price posted from a browser is a price a customer can edit; every
 * figure below is read out of the shop's own rows on the server. And it is only ever the
 * starting point: the admin sees it filled in on Review & price and changes what is wrong.
 */

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const between = (v: number, lo: number, hi: number) => (hi > lo ? clamp01((v - lo) / (hi - lo)) : 0);

/**
 * How much work this carving is, 0 to 1, from two things the tracer measures:
 *
 *  - shapes: how many separate outlines the carver's hand has to follow. Counted on a log
 *    scale, because the step from 30 to 60 shapes is a real jump in work and the step from
 *    300 to 330 is not.
 *  - density: how much of the carving's own area is actually cut away, 0..1.
 *
 * The bounds were read off traced photos of real carved doors (the shop's samples and
 * photographed doors from Wikimedia Commons): a plain grooved leaf traces to about 40
 * shapes at 13% density, a dense floral panel to 180+ shapes at 35%, lace-like work to
 * 300+ at 47%.
 *
 * Older pages sent no density; for those the shape count decides alone.
 */
export const workScore = (shapes: number, density?: number | null) => {
  const s = between(Math.log(Math.max(1, shapes)), Math.log(30), Math.log(300));
  if (density == null || !(density > 0)) return s;
  return clamp01(s * 0.5 + between(density, 0.1, 0.45) * 0.5);
};

/** Put a score on a list of the shop's own figures: lowest at 0, median at 0.5, highest at 1. */
export function onGalleryScale(score: number, xs: number[]): number {
  const v = xs.filter((x) => x > 0).sort((a, b) => a - b);
  if (!v.length) return 0;
  const lo = v[0], hi = v[v.length - 1], mid = v[Math.floor(v.length / 2)];
  return score <= 0.5 ? lo + (mid - lo) * (score * 2) : mid + (hi - mid) * ((score - 0.5) * 2);
}

export type CarvingEstimate = {
  carving: number; labour: number; total: number;
  /** The crew the gallery's carvings of this much work take, for the work sheet. */
  workers: number; days: number;
  /** How many priced carvings the figures were read from, and where this one sits (0..1). */
  basedOn: number; score: number;
};

/**
 * The estimated selling price and crew of a traced carving, for one leaf type.
 *
 * Compared against every carving the shop offers: the built-in styles and any carving it
 * has added to its gallery (a customer's private one is not a price the shop has set for
 * everybody, so it does not count). Returns zeros when nothing is priced yet - the website
 * then says so rather than showing a number it cannot stand behind.
 */
export async function estimateCarving(db: Tx, shapes: number, density: number | null | undefined, doubleDoor: boolean): Promise<CarvingEstimate> {
  const lib = await db.doorDesign.findMany({
    where: { active: true, OR: [{ origin: "BUILTIN" }, { visibility: "LIBRARY" }], ...(doubleDoor ? { allowDouble: true } : {}) },
  });
  const score = workScore(shapes, density);
  const none = { carving: 0, labour: 0, total: 0, workers: 0, days: 0, basedOn: 0, score };
  if (!lib.length) return none;
  const scale = (xs: number[]) => onGalleryScale(score, xs);
  const carving = Math.round(scale(lib.map((d) => n(doubleDoor ? d.sellDouble : d.sellSingle))));
  if (!carving) return none;
  const labour = Math.round(scale(lib.map((d) => n(doubleDoor ? d.labourSellDouble : d.labourSellSingle))));
  // A crew is whole people and whole days, and a carving takes at least one of each.
  const workers = Math.max(1, Math.round(scale(lib.map((d) => (doubleDoor ? d.workersDouble : d.workersSingle))) || 1));
  const days = Math.max(1, Math.round(scale(lib.map((d) => (doubleDoor ? d.daysDouble : d.daysSingle))) || 1));
  return { carving, labour, total: r2(carving + labour), workers, days, basedOn: lib.length, score };
}
