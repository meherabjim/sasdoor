import type { PriceItemType } from "@prisma/client";
import type { Tx } from "../config/prisma";
import { n, Num } from "./money";

/** Save a price-history row only when cost or sell actually changed. */
export async function logPrice(
  tx: Tx, itemType: PriceItemType, itemId: number, itemName: string,
  old: { cost?: Num; sell?: Num }, next: { cost?: Num; sell?: Num }, note?: string,
) {
  const changed = n(old.cost) !== n(next.cost) || n(old.sell) !== n(next.sell);
  if (!changed) return;
  await tx.priceHistory.create({
    data: {
      itemType, itemId, itemName, note,
      oldCost: old.cost === undefined ? null : n(old.cost), newCost: next.cost === undefined ? null : n(next.cost),
      oldSell: old.sell === undefined ? null : n(old.sell), newSell: next.sell === undefined ? null : n(next.sell),
    },
  });
}
