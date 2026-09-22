import type { SourceType } from "@prisma/client";
import type { Tx } from "../config/prisma";
import { n, r2, r3, sellFrom } from "./money";
import { BatchLite, planConsume, planPurchase, promote, replayCost } from "./stockPlan";
import { logPrice } from "./priceHistory";
import { bad } from "./http";

const lite = (b: { id: number; remainingCft: unknown; currentCost: unknown; status: string; receivedAt: Date }): BatchLite => ({
  id: b.id, remainingCft: n(b.remainingCft as never), currentCost: n(b.currentCost as never),
  status: b.status as BatchLite["status"], receivedAt: b.receivedAt,
});

async function setActiveCost(tx: Tx, stockId: number, activeCost: number, note: string) {
  const stock = await tx.woodStock.findUniqueOrThrow({ where: { id: stockId }, include: { woodType: true } });

  /**
   * A price typed in by hand used to be thrown away: it was turned into a profit
   * percentage, and the next consignment applied that percentage to the new cost. The
   * shop's 520 became 832 on its own.
   *
   * With `sellLocked` the typed price is kept as a real number. It only moves when the
   * cost climbs past it - selling below cost would be worse than overriding the shop.
   */
  const locked = stock.sellLocked;
  const typed = n(stock.sellingPricePerCft);
  const derived = sellFrom(activeCost, n(stock.profitPercent));
  const sell = locked ? (typed >= activeCost ? typed : derived) : derived;
  const stillLocked = locked && typed >= activeCost;

  await logPrice(tx, "WOOD_STOCK", stock.id, `${stock.woodType.nameEn} (${stock.source})`,
    { cost: stock.activeCostPerCft, sell: stock.sellingPricePerCft }, { cost: activeCost, sell },
    locked && !stillLocked ? `${note} (cost passed your price, so it was raised)` : note);

  return tx.woodStock.update({ where: { id: stockId }, data: { activeCostPerCft: activeCost, sellingPricePerCft: sell, sellLocked: stillLocked } });
}

/** Add a purchase into stock following the price-up / price-down rule. */
export async function addPurchaseToStock(tx: Tx, p: {
  purchaseId: number; woodTypeId: number; source: SourceType; country: string; cft: number; costPerCft: number; receivedAt: Date; defaultProfit: number;
}) {
  const stock = await tx.woodStock.upsert({
    where: { woodTypeId_source: { woodTypeId: p.woodTypeId, source: p.source } },
    update: {},
    create: { woodTypeId: p.woodTypeId, source: p.source, profitPercent: p.defaultProfit },
  });
  const batches = (await tx.stockBatch.findMany({ where: { woodStockId: stock.id, status: { not: "DONE" } } })).map(lite);
  const plan = planPurchase(batches, n(stock.activeCostPerCft), p.costPerCft);
  for (const u of plan.reprice) await tx.stockBatch.update({ where: { id: u.id }, data: { currentCost: u.currentCost, status: "ACTIVE" } });
  await tx.stockBatch.create({
    data: {
      woodStockId: stock.id, purchaseId: p.purchaseId, country: p.country, quantityCft: p.cft, remainingCft: p.cft,
      originalCost: p.costPerCft, currentCost: p.costPerCft, status: plan.newStatus, receivedAt: p.receivedAt,
    },
  });
  await setActiveCost(tx, stock.id, plan.activeCost, plan.newStatus === "ACTIVE" ? "New purchase (same or higher price)" : "New purchase (lower price, waiting)");
  return { stockId: stock.id, batchStatus: plan.newStatus };
}

/** Remove an untouched purchase batch from stock. */
export async function removePurchaseFromStock(tx: Tx, purchaseId: number) {
  const batch = await tx.stockBatch.findUnique({ where: { purchaseId } });
  if (!batch) return;
  if (n(batch.remainingCft) !== n(batch.quantityCft)) throw bad("Wood from this purchase is already used in an order, so it cannot be deleted");
  await tx.stockBatch.delete({ where: { id: batch.id } });
  const left = await tx.stockBatch.findMany({ where: { woodStockId: batch.woodStockId, status: { not: "DONE" } } });

  // Undo the price this consignment pushed onto the others: replay the rule over the
  // batches still here, from their own original costs, in arrival order.
  const cost = replayCost(left.map((b) => ({ originalCost: n(b.originalCost), receivedAt: b.receivedAt })));
  for (const b of left) {
    const at = Math.min(n(b.currentCost), Math.max(n(b.originalCost), cost));
    await tx.stockBatch.update({
      where: { id: b.id },
      data: { currentCost: at, status: n(b.originalCost) >= cost ? "ACTIVE" : b.status },
    });
  }

  const rest = (await tx.stockBatch.findMany({ where: { woodStockId: batch.woodStockId, status: { not: "DONE" } } })).map(lite);
  const pr = promote(rest, cost);
  for (const c of pr.changes) await tx.stockBatch.update({ where: { id: c.id }, data: { status: "ACTIVE" } });
  await setActiveCost(tx, batch.woodStockId, pr.activeCost || cost, "Purchase deleted");
}

/** Take wood for a confirmed estimate. */
export async function consumeForEstimate(tx: Tx, estimateId: number, stockId: number, cft: number) {
  const batches = (await tx.stockBatch.findMany({ where: { woodStockId: stockId, status: { not: "DONE" } } })).map(lite);
  const plan = planConsume(batches, cft);
  for (const u of plan.updates) await tx.stockBatch.update({ where: { id: u.id }, data: { remainingCft: u.remainingCft, status: u.status } });
  for (const t of plan.takes) {
    const b = await tx.stockBatch.findUniqueOrThrow({ where: { id: t.batchId } });
    await tx.stockUsage.create({ data: { estimateId, batchId: t.batchId, cft: t.cft, originalCost: b.originalCost } });
  }
  await setActiveCost(tx, stockId, plan.activeCost, "Wood deducted on order confirmation");
  return plan.takes;
}

/** Give wood back when a confirmed estimate is cancelled. */
export async function returnForEstimate(tx: Tx, estimateId: number) {
  const usages = await tx.stockUsage.findMany({ where: { estimateId, returned: false }, include: { batch: true } });
  if (!usages.length) return;
  const stockId = usages[0].batch.woodStockId;
  for (const u of usages) {
    // Decimal(12,3) in the schema, and r3() everywhere else - rounding to 2 here lost
    // the third decimal every time an order was cancelled.
    const left = r3(n(u.batch.remainingCft) + n(u.cft));
    const stock = await tx.woodStock.findUniqueOrThrow({ where: { id: stockId } });
    const status = n(u.batch.currentCost) >= n(stock.activeCostPerCft) || n(stock.activeCostPerCft) === 0 ? "ACTIVE" : "WAITING";
    await tx.stockBatch.update({ where: { id: u.batchId }, data: { remainingCft: left, status } });
    await tx.stockUsage.update({ where: { id: u.id }, data: { returned: true } });
  }
  const rest = (await tx.stockBatch.findMany({ where: { woodStockId: stockId, status: { not: "DONE" } } })).map(lite);
  const before = n((await tx.woodStock.findUniqueOrThrow({ where: { id: stockId } })).activeCostPerCft);
  const pr = promote(rest, before);
  for (const c of pr.changes) await tx.stockBatch.update({ where: { id: c.id }, data: { status: "ACTIVE" } });
  await setActiveCost(tx, stockId, pr.activeCost, "Order cancelled, wood returned");
}

export const stockAvailable = (batches: { remainingCft: unknown; status: string }[]) =>
  r2(batches.filter((b) => b.status !== "DONE").reduce((s, b) => s + n(b.remainingCft as never), 0));
