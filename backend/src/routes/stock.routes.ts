import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { idParam, ok, parse, zPercent } from "../lib/http";
import { n, profitFrom, r2, sellFrom } from "../lib/money";
import { logPrice } from "../lib/priceHistory";
import { stockAvailable } from "../lib/stockService";

const r = Router();

const summarize = (s: { batches: { remainingCft: unknown; quantityCft: unknown; status: string }[] }) => ({
  totalCft: r2(s.batches.reduce((a, b) => a + n(b.quantityCft as never), 0)),
  availableCft: stockAvailable(s.batches),
  waitingBatches: s.batches.filter((b) => b.status === "WAITING" && n(b.remainingCft as never) > 0).length,
});

r.get("/", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const list = await prisma.woodStock.findMany({
    where: q ? { woodType: { OR: [{ nameEn: { contains: q, mode: "insensitive" } }, { nameBn: { contains: q } }] } } : {},
    include: { woodType: true, batches: true }, orderBy: { woodType: { nameEn: "asc" } },
  });
  res.json(ok(list.map(({ batches, ...s }) => ({ ...s, ...summarize({ batches }) }))));
});

r.get("/:id", async (req, res) => {
  const id = idParam(req);
  const s = await prisma.woodStock.findUniqueOrThrow({ where: { id }, include: { woodType: true, batches: { include: { purchase: { include: { supplier: true } } }, orderBy: { receivedAt: "asc" } } } });
  const history = await prisma.priceHistory.findMany({ where: { itemType: "WOOD_STOCK", itemId: id }, orderBy: { changedAt: "desc" }, take: 50 });
  res.json(ok({ ...s, ...summarize(s), history }));
});

/** Edit profit % or selling price (one of them) */
r.put("/:id", async (req, res) => {
  const id = idParam(req);
  const b = parse(z.object({ profitPercent: zPercent.optional(), sellingPricePerCft: z.coerce.number().positive().optional() })
    .refine((v) => v.profitPercent !== undefined || v.sellingPricePerCft !== undefined, "enter profit % or selling price"), req.body);
  const data = await prisma.$transaction(async (tx) => {
    const s = await tx.woodStock.findUniqueOrThrow({ where: { id }, include: { woodType: true } });
    const cost = n(s.activeCostPerCft);
    const byHand = b.sellingPricePerCft !== undefined;
    const profitPercent = byHand ? profitFrom(cost, b.sellingPricePerCft!) : b.profitPercent!;
    const sell = byHand ? r2(b.sellingPricePerCft!) : sellFrom(cost, profitPercent);
    // A typed price is held as a number (see setActiveCost); a typed percentage is not.
    await logPrice(tx, "WOOD_STOCK", id, `${s.woodType.nameEn} (${s.source})`, { cost, sell: s.sellingPricePerCft }, { cost, sell },
      byHand ? "Selling price set by hand" : `Profit ${n(s.profitPercent)}% → ${profitPercent}%`);
    return tx.woodStock.update({ where: { id }, data: { profitPercent, sellingPricePerCft: sell, sellLocked: byHand } });
  });
  res.json(ok(data, b.sellingPricePerCft !== undefined ? "Selling price saved. It will stay until cost goes above it." : "Selling price updated"));
});

export default r;
