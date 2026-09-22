import { r2, r3 } from "./money";

export type BatchLite = {
  id: number; remainingCft: number; currentCost: number;
  status: "ACTIVE" | "WAITING" | "DONE"; receivedAt: Date;
};

/**
 * Stock price rule for a new purchase:
 *  - no stock left, or new cost >= current active cost  -> every remaining batch is repriced
 *    to the new cost and becomes ACTIVE; new batch ACTIVE.
 *  - new cost < active cost -> new batch WAITING (older, dearer stock is sold first).
 */
export function planPurchase(batches: BatchLite[], activeCost: number, newCost: number) {
  const remaining = batches.filter((b) => b.status !== "DONE" && b.remainingCft > 0);
  if (remaining.length === 0 || newCost >= activeCost) {
    return {
      newStatus: "ACTIVE" as const,
      reprice: remaining.map((b) => ({ id: b.id, currentCost: newCost, status: "ACTIVE" as const })),
      activeCost: newCost,
    };
  }
  return { newStatus: "WAITING" as const, reprice: [], activeCost };
}

/** Next batch to sell from: ACTIVE first (oldest), then WAITING with the highest cost (oldest on tie). */
export function sellOrder(batches: BatchLite[]) {
  const live = batches.filter((b) => b.status !== "DONE" && b.remainingCft > 0);
  const active = live.filter((b) => b.status === "ACTIVE").sort((a, b) => +a.receivedAt - +b.receivedAt);
  const waiting = live
    .filter((b) => b.status === "WAITING")
    .sort((a, b) => b.currentCost - a.currentCost || +a.receivedAt - +b.receivedAt);
  return [...active, ...waiting];
}

/**
 * Take `cft` from stock. Returns per-batch deductions, batch updates and the new active cost.
 * Throws when stock is not enough.
 */
export function planConsume(batches: BatchLite[], cft: number) {
  const order = sellOrder(batches);
  const available = r3(order.reduce((s, b) => s + b.remainingCft, 0));
  if (available + 1e-9 < cft) {
    throw Object.assign(new Error(`Only ${available} CFT in stock, ${cft} CFT needed`), { status: 400 });
  }
  let need = cft;
  const takes: { batchId: number; cft: number }[] = [];
  const updates = new Map<number, { remainingCft: number; status: BatchLite["status"] }>();
  for (const b of order) {
    if (need <= 1e-9) break;
    const take = r3(Math.min(b.remainingCft, need));
    need = r3(need - take);
    const left = r3(b.remainingCft - take);
    takes.push({ batchId: b.id, cft: take });
    updates.set(b.id, { remainingCft: left, status: left <= 0 ? "DONE" : "ACTIVE" });
  }
  // after consuming, make sure there is an ACTIVE batch if anything is left
  const after = batches.map((b) => ({ ...b, ...(updates.get(b.id) ?? {}) }));
  const promoted = promote(after);
  promoted.changes.forEach((c) => updates.set(c.id, { remainingCft: after.find((b) => b.id === c.id)!.remainingCft, status: "ACTIVE" }));
  return { takes, updates: [...updates.entries()].map(([id, u]) => ({ id, ...u })), activeCost: promoted.activeCost };
}

/** If no ACTIVE batch has stock, promote the next WAITING one. Returns changes + active cost (0 = empty). */
export function promote(batches: BatchLite[], currentActiveCost?: number) {
  const live = batches.filter((b) => b.status !== "DONE" && b.remainingCft > 0);
  const active = live.filter((b) => b.status === "ACTIVE");
  if (active.length) {
    // Never let this raise the price. ACTIVE batches all carry the same cost after a
    // reprice, but a cancelled order hands wood back to an older, dearer batch, and
    // taking the maximum would quietly push the selling price up for no reason.
    const highest = r2(Math.max(...active.map((b) => b.currentCost)));
    const cost = currentActiveCost === undefined ? highest : r2(Math.min(highest, currentActiveCost));
    return { changes: [] as { id: number }[], activeCost: cost };
  }
  const next = sellOrder(live)[0];
  if (!next) return { changes: [], activeCost: 0 };
  return { changes: [{ id: next.id }], activeCost: next.currentCost };
}

/**
 * Work out what the price should be after a purchase is deleted.
 *
 * Deleting a consignment used to leave its effect behind: a dearer consignment reprices
 * every remaining batch upward, and removing it did not undo that. The wood left, the
 * raised price stayed. Every batch keeps its own `originalCost`, so the honest answer is
 * to replay the rule over what is still there, in the order it arrived.
 */
export function replayCost(batches: { originalCost: number; receivedAt: Date }[]): number {
  const order = [...batches].sort((a, b) => +a.receivedAt - +b.receivedAt);
  let active = 0;
  for (const b of order) active = b.originalCost >= active ? b.originalCost : active;
  return r2(active);
}
