import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import type { Prisma } from "@prisma/client";
import { idParam, ok, onlySent, parse, zBool, zMoney } from "../lib/http";
import { logPrice } from "../lib/priceHistory";

const r = Router();
const body = z.object({
  nameEn: z.string().trim().min(2), nameBn: z.string().trim().min(1), source: z.enum(["LOCAL", "FOREIGN"]),
  countries: z.array(z.string().trim().min(1)).default([]), use: z.enum(["DOOR", "FRAME", "BOTH"]).default("BOTH"),
  marketPricePerCft: zMoney.default(0), active: zBool.default(true), sortOrder: z.coerce.number().int().default(0),
  /**
   * kg per CFT. The weight entry mode it existed for has been removed, so nothing sends
   * this any more; it stays accepted (and the column stays) so old rows keep their value.
   */
  densityKgPerCft: z.coerce.number().positive().nullish(),
});

r.get("/", async (req, res) => {
  const where: Prisma.WoodTypeWhereInput = {};
  if (req.query.source) where.source = String(req.query.source) as "LOCAL";
  if (req.query.active !== undefined) where.active = req.query.active === "true";
  res.json(ok(await prisma.woodType.findMany({ where, orderBy: [{ source: "asc" }, { sortOrder: "asc" }, { nameEn: "asc" }] })));
});

r.post("/", async (req, res) => {
  const b = parse(body, req.body);
  res.status(201).json(ok(await prisma.woodType.create({ data: b }), "Wood added"));
});

r.put("/:id", async (req, res) => {
  const id = idParam(req);
  const b = onlySent(parse(body.partial(), req.body), req.body);
  const data = await prisma.$transaction(async (tx) => {
    const old = await tx.woodType.findUniqueOrThrow({ where: { id } });
    const up = await tx.woodType.update({ where: { id }, data: b });
    if (b.marketPricePerCft !== undefined) await logPrice(tx, "WOOD_MARKET", id, up.nameEn, { cost: old.marketPricePerCft }, { cost: up.marketPricePerCft }, "Market price");
    return up;
  });
  res.json(ok(data, "Wood updated"));
});

r.delete("/:id", async (req, res) => {
  const id = idParam(req);
  const used = await prisma.woodPurchase.count({ where: { woodTypeId: id } });
  if (used) { await prisma.woodType.update({ where: { id }, data: { active: false } }); return res.json(ok(null, "Has purchases, so it was marked inactive")); }
  await prisma.woodType.delete({ where: { id } });
  res.json(ok(null, "Deleted"));
});

export default r;
