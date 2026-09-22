import { Router } from "express";
import { z } from "zod";
import { prisma, Tx } from "../config/prisma";
import { ok, parse, zPercent } from "../lib/http";

const r = Router();
/**
 * The one settings row, created on first read.
 *
 * Takes the caller's transaction when there is one. It must: this is an upsert, so it is a
 * write, and a write on the global client from inside an interactive transaction asks the
 * pool for a second connection while the first is still held. Enough orders at once and
 * every connection is held by a transaction waiting for a connection.
 */
export const getSettings = (db: Tx = prisma) => db.setting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

r.get("/", async (_req, res) => res.json(ok(await getSettings())));

r.put("/", async (req, res) => {
  const num = z.coerce.number().positive();
  const b = parse(z.object({
    doorThicknessInch: num, frameWidthInch: num, frameThicknessInch: num, wastagePercent: zPercent,
    minHeightFt: num, maxHeightFt: num, singleMinWidthFt: num, singleMaxWidthFt: num, doubleMinWidthFt: num, doubleMaxWidthFt: num,
    bigDoorSqftPerLeaf: num, bigDoorExtraPercent: zPercent,
    profitWoodPercent: zPercent, profitColorPercent: zPercent, profitDesignPercent: zPercent, profitLabourPercent: zPercent,
    companyName: z.string().trim().min(1), companyPhone: z.string().trim().nullish(), companyAddress: z.string().trim().nullish(), companyLogo: z.string().trim().nullish(),
  }).partial().refine((v) => v.minHeightFt === undefined || v.maxHeightFt === undefined || v.minHeightFt < v.maxHeightFt, "min height must be less than max height"), req.body);
  await getSettings();
  res.json(ok(await prisma.setting.update({ where: { id: 1 }, data: b }), "Settings saved"));
});

export default r;
