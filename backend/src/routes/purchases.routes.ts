import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { bad, idParam, ok, onlySent, parse, zBool, zMoney } from "../lib/http";
import { n, r2 } from "../lib/money";
import { addPurchaseToStock, removePurchaseFromStock } from "../lib/stockService";
import { getSettings } from "./settings.routes";

const r = Router();
const body = z.object({
  supplierId: z.coerce.number().int().positive().nullish(),
  isOpeningStock: zBool.default(false),
  woodTypeId: z.coerce.number().int().positive(),
  country: z.string().trim().min(2).optional(),
  invoiceNo: z.string().trim().nullish(), lcNo: z.string().trim().nullish(),
  purchaseDate: z.coerce.date().optional(),
  quantityCft: z.coerce.number().positive("Quantity (CFT) is required"),
  /**
   * How the quantity was typed in, and the raw rows behind it. Storage stays CFT.
   * KG is gone from the form - the trade sells by CFT and a weight-derived CFT moves
   * with how damp the wood is - so it is no longer accepted here. The database enum
   * keeps the value so entries made before still read back.
   */
  measureMode: z.enum(["CFT", "FT_IN", "INCH", "GIRTH"]).default("CFT"),
  measureRaw: z.any().optional(),
  /** Paid more than this consignment is worth? Park the difference with the supplier instead of refusing. */
  extraAsAdvance: zBool.default(false),
  pricePerCft: z.coerce.number().positive("price is required"),
  transportCost: zMoney.default(0), otherCost: zMoney.default(0), paidAmount: zMoney.default(0),
  paymentMethod: z.enum(["CASH", "BANK", "BKASH", "NAGAD", "LC", "OTHER"]).nullish(),
  note: z.string().trim().nullish(),
});

/** Live summary (same maths the form shows) */
export const purchaseMath = (q: number, price: number, transport: number, other: number, paid: number) => {
  const woodCost = r2(q * price), totalCost = r2(woodCost + transport + other);
  return { woodCost, totalCost, costPerCft: r2(totalCost / q), due: r2(totalCost - paid) };
};

r.get("/", async (req, res) => {
  const where: Prisma.WoodPurchaseWhereInput = {};
  if (req.query.supplierId) where.supplierId = Number(req.query.supplierId);
  if (req.query.woodTypeId) where.woodTypeId = Number(req.query.woodTypeId);
  if (req.query.source) where.source = String(req.query.source) as "LOCAL";
  if (req.query.from || req.query.to) where.purchaseDate = { ...(req.query.from ? { gte: new Date(String(req.query.from)) } : {}), ...(req.query.to ? { lte: new Date(String(req.query.to)) } : {}) };
  const list = await prisma.woodPurchase.findMany({ where, include: { supplier: true, woodType: true, batch: true }, orderBy: { purchaseDate: "desc" } });
  res.json(ok(list.map((p) => ({ ...p, due: r2(n(p.totalCost) - n(p.paidAmount)), usedCft: p.batch ? r2(n(p.batch.quantityCft) - n(p.batch.remainingCft)) : 0 }))));
});

r.get("/:id", async (req, res) => res.json(ok(await prisma.woodPurchase.findUniqueOrThrow({ where: { id: idParam(req) }, include: { supplier: true, woodType: true, batch: true } }))));

/** Preview: which batch status a new purchase would get */
r.post("/preview", async (req, res) => {
  const b = parse(body, req.body);
  const wood = await prisma.woodType.findUniqueOrThrow({ where: { id: b.woodTypeId } });
  const m = purchaseMath(b.quantityCft, b.pricePerCft, b.transportCost, b.otherCost, b.paidAmount);
  const stock = await prisma.woodStock.findUnique({ where: { woodTypeId_source: { woodTypeId: wood.id, source: wood.source } }, include: { batches: { where: { status: { not: "DONE" } } } } });
  const hasStock = !!stock?.batches.some((x) => n(x.remainingCft) > 0);
  const profit = stock ? n(stock.profitPercent) : n((await getSettings()).profitWoodPercent);
  const batchStatus = !hasStock || m.costPerCft >= n(stock!.activeCostPerCft) ? "ACTIVE" : "WAITING";
  const activeCost = batchStatus === "ACTIVE" ? m.costPerCft : n(stock!.activeCostPerCft);
  res.json(ok({ ...m, batchStatus, profitPercent: profit, sellingPricePerCft: r2(activeCost * (1 + profit / 100)) }));
});

r.post("/", async (req, res) => {
  const b = parse(body, req.body);
  if (!b.isOpeningStock && !b.supplierId) throw bad("Select a supplier (or tick Opening Stock)");
  const settings = await getSettings();
  const result = await prisma.$transaction(async (tx) => {
    const wood = await tx.woodType.findUniqueOrThrow({ where: { id: b.woodTypeId } });
    const supplier = b.supplierId ? await tx.supplier.findUniqueOrThrow({ where: { id: b.supplierId } }) : null;
    const country = b.country ?? (wood.source === "LOCAL" ? "Bangladesh" : wood.countries[0] ?? supplier?.country ?? "Unknown");
    const m = purchaseMath(b.quantityCft, b.pricePerCft, b.transportCost, b.otherCost, b.paidAmount);
    /**
     * Wood out of our own mill is produced, not bought. The cost is still real - the log,
     * the sawing, the machine, carrying it to the yard - and it still has to reach the
     * stock so the door price is right. What it is not is a debt: there is no invoice to
     * settle and no one to pay, so the entry is settled the moment it is made. Left as a
     * due it would sit on the supplier page for ever with no way to clear it.
     */
    const own = supplier?.kind === "OWN";
    // A consignment line can never hold more than it is worth. The extra is either
    // refused, or parked with the supplier as an advance - never hidden in this row.
    let paidHere = own ? m.totalCost : b.paidAmount, parked = 0;
    if (!own && b.paidAmount > m.totalCost) {
      if (!b.extraAsAdvance || !b.supplierId) throw bad("Paid cannot be more than the total cost");
      paidHere = m.totalCost;
      parked = r2(b.paidAmount - m.totalCost);
    }
    const date = b.purchaseDate ?? new Date();
    const p = await tx.woodPurchase.create({
      data: {
        supplierId: b.supplierId ?? null, woodTypeId: wood.id, source: wood.source, country, isOpeningStock: b.isOpeningStock,
        invoiceNo: b.invoiceNo, lcNo: b.lcNo, purchaseDate: date, quantityCft: b.quantityCft, pricePerCft: b.pricePerCft,
        woodCost: m.woodCost, transportCost: b.transportCost, otherCost: b.otherCost, totalCost: m.totalCost, costPerCft: m.costPerCft,
        measureMode: b.measureMode, measureRaw: b.measureRaw ?? undefined,
        paidAmount: paidHere, paymentMethod: b.paymentMethod, note: b.note,
      },
    });
    if (parked > 0) {
      await tx.supplierPayment.create({
        data: { supplierId: b.supplierId!, amount: parked, type: "ADVANCE", method: b.paymentMethod ?? "CASH", paidAt: date, note: `Extra paid on ${b.invoiceNo ?? b.lcNo ?? `purchase #${p.id}`}, kept as advance` },
      });
    }
    const stock = await addPurchaseToStock(tx, { purchaseId: p.id, woodTypeId: wood.id, source: wood.source, country, cft: b.quantityCft, costPerCft: m.costPerCft, receivedAt: date, defaultProfit: n(settings.profitWoodPercent) });
    return { purchase: p, ...stock, own, due: r2(m.totalCost - paidHere), parkedAsAdvance: parked };
  });
  const noun = result.own ? "Production entry saved" : "Purchase saved";
  const base = result.batchStatus === "ACTIVE" ? `${noun} and added to stock` : `${noun}. Lower cost, so it will be used after current stock runs out`;
  res.status(201).json(ok(result, result.parkedAsAdvance > 0 ? `${base}. ${Math.round(result.parkedAsAdvance)} kept as advance with this supplier` : base));
});

/** Only payment/notes can be edited after save (quantity/price change = delete + new entry) */
r.patch("/:id", async (req, res) => {
  const b = onlySent(parse(z.object({ paidAmount: zMoney.optional(), extraAsAdvance: zBool.default(false), paymentMethod: body.shape.paymentMethod, invoiceNo: body.shape.invoiceNo, lcNo: body.shape.lcNo, note: body.shape.note }), req.body), req.body);
  const id = idParam(req);
  const p = await prisma.woodPurchase.findUniqueOrThrow({ where: { id } });
  const { extraAsAdvance, ...data } = b;
  let parked = 0;
  if (data.paidAmount !== undefined && data.paidAmount > n(p.totalCost)) {
    // Same rule the create path follows, so editing a line cannot do what creating it could not.
    if (!extraAsAdvance || !p.supplierId) throw bad("Paid cannot be more than the total cost");
    parked = r2(data.paidAmount - n(p.totalCost));
    data.paidAmount = n(p.totalCost);
  }
  const out = await prisma.$transaction(async (tx) => {
    const up = await tx.woodPurchase.update({ where: { id }, data });
    if (parked > 0) {
      await tx.supplierPayment.create({
        data: { supplierId: p.supplierId!, amount: parked, type: "ADVANCE", method: data.paymentMethod ?? p.paymentMethod ?? "CASH", paidAt: p.purchaseDate, note: `Extra paid on ${p.invoiceNo ?? p.lcNo ?? `purchase #${p.id}`}, kept as advance` },
      });
    }
    return up;
  });
  res.json(ok(out, parked > 0 ? `Updated. ${Math.round(parked)} kept as advance with this supplier` : "Updated"));
});

/**
 * Deleting a consignment takes its wood back out of stock - and used to take the money
 * with it. The cost line and the paid line both vanished together, so a consignment the
 * shop had already handed 1,20,000 for left no trace of that cash anywhere: the supplier
 * simply showed 1,20,000 less paid, as though it had never changed hands.
 *
 * The entry can be wrong; the money that went out cannot be un-handed. So what was paid
 * on the line is turned into an advance sitting with that supplier, which is exactly what
 * it now is - money they hold against wood still to come. The next consignment from them
 * eats into it on its own.
 */
r.delete("/:id", async (req, res) => {
  const id = idParam(req);
  const kept = await prisma.$transaction(async (tx) => {
    const p = await tx.woodPurchase.findUniqueOrThrow({ where: { id }, include: { supplier: true } });
    const paid = n(p.paidAmount);
    // Our own mill has no account, so nothing is parked for it.
    const park = p.supplierId && p.supplier?.kind !== "OWN" ? r2(paid) : 0;
    await removePurchaseFromStock(tx, id);
    await tx.woodPurchase.delete({ where: { id } });
    if (park > 0) {
      await tx.supplierPayment.create({
        data: { supplierId: p.supplierId!, amount: park, type: "ADVANCE", method: p.paymentMethod ?? "CASH", paidAt: p.purchaseDate, note: `Deleted ${p.invoiceNo ?? p.lcNo ?? `purchase #${p.id}`}; the ${Math.round(park)} already paid is kept as advance` },
      });
    }
    return park;
  });
  res.json(ok(null, kept > 0
    ? `Purchase deleted and its wood removed from stock. The ${Math.round(kept)} already paid is now an advance with this supplier`
    : "Purchase deleted and its wood removed from stock"));
});

export default r;
