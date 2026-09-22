import type { Tx } from "../config/prisma";

/**
 * Hand the jobs out when an order is confirmed.
 *
 * A shopkeeper confirming a door should not then have to open a dropdown four times to say
 * the obvious - the polisher polishes. So each job goes to somebody who does that kind of
 * work, and the shop changes it afterwards if it wants to. Nothing here is final: every
 * line stays editable on the work sheet.
 *
 * Two rules, and they are the whole thing:
 *
 *  - Match the skill. A polish line goes to a polisher. Only if nobody has that skill does
 *    it fall to somebody marked "Anything" - never to whoever happens to be first in the
 *    list, because that is worse than leaving it blank.
 *  - Then the least busy of them, counting every unfinished job they already hold across
 *    all orders. Two doors confirmed the same morning do not both land on one man.
 *
 * A line somebody has already been put on by hand is never touched.
 */

/** The categories are on the labour rates, not on the estimate line, so match by name. */
async function categoryByName(tx: Tx) {
  const rates = await tx.labourRate.findMany({ select: { nameEn: true, category: true } });
  const map = new Map(rates.map((r) => [r.nameEn, r.category as string]));
  return (lineName: string) => {
    // "Carving labour: Royal Arch" is the carver's job, and carving is nobody's category,
    // so it goes to whoever the shop marked as doing anything.
    if (lineName.startsWith("Carving labour:")) return "OTHER";
    return map.get(lineName) ?? "OTHER";
  };
}

export async function assignWork(tx: Tx, estimateId: number) {
  const [lines, workers] = await Promise.all([
    tx.estimateLine.findMany({ where: { estimateId, type: "LABOUR", workerId: null }, orderBy: { sortOrder: "asc" } }),
    tx.worker.findMany({ where: { active: true }, select: { id: true, skill: true } }),
  ]);
  if (!lines.length || !workers.length) return 0;

  // How much each man is already holding, everywhere. Counted once, then kept up to date
  // as this order is handed out, so the second door making job does not go to the same man.
  const busy = new Map<number, number>(workers.map((w) => [w.id, 0]));
  const open = await tx.estimateLine.groupBy({
    by: ["workerId"],
    where: { workerId: { not: null }, doneAt: null, estimate: { status: { in: ["CONFIRMED", "IN_PRODUCTION", "READY"] } } },
    _count: { _all: true },
  });
  for (const row of open) if (row.workerId !== null && busy.has(row.workerId)) busy.set(row.workerId, row._count._all);

  const catOf = await categoryByName(tx);
  let given = 0;
  for (const l of lines) {
    const cat = catOf(l.name);
    const skilled = workers.filter((w) => w.skill === cat);
    const pool = skilled.length ? skilled : workers.filter((w) => w.skill === "OTHER");
    if (!pool.length) continue;                       // nobody does this; leave it blank
    const pick = pool.reduce((a, b) => ((busy.get(a.id) ?? 0) <= (busy.get(b.id) ?? 0) ? a : b));
    await tx.estimateLine.update({ where: { id: l.id }, data: { workerId: pick.id } });
    busy.set(pick.id, (busy.get(pick.id) ?? 0) + 1);
    given++;
  }
  return given;
}

/**
 * The door has gone out, so the men on it are free.
 *
 * Anything still unfinished is marked finished, because a door cannot be delivered with
 * work outstanding - and leaving those lines open would keep their carpenters looking busy
 * for ever on a job that is over.
 */
export async function releaseWork(tx: Tx, estimateId: number) {
  const now = new Date();
  const { count } = await tx.estimateLine.updateMany({
    where: { estimateId, type: "LABOUR", doneAt: null },
    data: { doneAt: now },
  });
  // Something finished without ever being marked started would have no start time at all.
  await tx.estimateLine.updateMany({ where: { estimateId, type: "LABOUR", startedAt: null }, data: { startedAt: now } });
  return count;
}
