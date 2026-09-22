import { Router } from "express";
import { z } from "zod";
import type { PriceItemType } from "@prisma/client";
import { prisma } from "../config/prisma";
import { bad, idParam, ok, onlySent, parse, zBool, zMoney, zPercent } from "../lib/http";
import { resolvePrice } from "../lib/money";
import { logPrice } from "../lib/priceHistory";
import { getSettings } from "./settings.routes";

/** Shared price fields: cost + profit% → sell, or manual sell → profit% */
const priceFields = { costSingle: zMoney, costDouble: zMoney, profitPercent: zPercent.optional(), sellSingle: zMoney.optional(), sellDouble: zMoney.optional() };
const pricedOnly = (o: Record<string, unknown>) => ({
  costSingle: Number(o.costSingle), costDouble: Number(o.costDouble), profitPercent: Number(o.profitPercent),
  sellSingle: o.sellSingle === undefined ? undefined : Number(o.sellSingle), sellDouble: o.sellDouble === undefined ? undefined : Number(o.sellDouble),
});

async function history(itemType: PriceItemType | PriceItemType[], itemId: number) {
  return prisma.priceHistory.findMany({ where: { itemType: Array.isArray(itemType) ? { in: itemType } : itemType, itemId }, orderBy: { changedAt: "desc" }, take: 50 });
}

// ---------------- COLORS ----------------
export const colors = Router();
const colorBody = z.object({
  type: z.enum(["DOOR", "DESIGN"]), nameEn: z.string().trim().min(2), nameBn: z.string().trim().min(1),
  colorCode: z.string().regex(/^#[0-9a-fA-F]{6}$/, "color code #RRGGBB"), isToneOnTone: zBool.default(false),
  suggestions: z.array(z.string()).default([]), active: zBool.default(true), sortOrder: z.coerce.number().int().default(0), ...priceFields,
  // Left at 0 a colour is material and no job appears on the work sheet. Fill it in and
  // the colour work becomes a step somebody is put on.
  workersSingle: z.coerce.number().int().min(0).default(0), workersDouble: z.coerce.number().int().min(0).default(0),
  daysSingle: z.coerce.number().int().min(0).default(0), daysDouble: z.coerce.number().int().min(0).default(0),
});
colors.get("/", async (req, res) => res.json(ok(await prisma.color.findMany({ where: req.query.type ? { type: String(req.query.type) as "DOOR" } : {}, orderBy: [{ type: "asc" }, { sortOrder: "asc" }] }))));
colors.get("/:id/history", async (req, res) => res.json(ok(await history("COLOR", idParam(req)))));
colors.post("/", async (req, res) => {
  const b = parse(colorBody, req.body);
  const profit = b.profitPercent ?? Number((await getSettings()).profitColorPercent);
  res.status(201).json(ok(await prisma.color.create({ data: { ...b, ...resolvePrice(pricedOnly({ ...b, profitPercent: profit })) } }), "Color added"));
});
colors.put("/:id", async (req, res) => {
  const id = idParam(req);
  const b = onlySent(parse(colorBody.partial(), req.body), req.body);
  const data = await prisma.$transaction(async (tx) => {
    const old = await tx.color.findUniqueOrThrow({ where: { id } });
    // The old sells come across too. resolvePrice only honours a typed price when it has
    // both of them, so leaving them out would quietly discard a single price sent on its
    // own and write back the marked-up figure instead.
    const merged = { costSingle: old.costSingle, costDouble: old.costDouble, profitPercent: old.profitPercent, sellSingle: old.sellSingle, sellDouble: old.sellDouble, ...b };
    const price = b.costSingle !== undefined || b.costDouble !== undefined || b.profitPercent !== undefined || b.sellSingle !== undefined || b.sellDouble !== undefined ? resolvePrice(pricedOnly(merged)) : {};
    const up = await tx.color.update({ where: { id }, data: { ...b, ...price } });
    await logPrice(tx, "COLOR", id, up.nameEn, { cost: old.costSingle, sell: old.sellSingle }, { cost: up.costSingle, sell: up.sellSingle }, "Single");
    return up;
  });
  res.json(ok(data, "Color updated"));
});
/**
 * Delete a colour - the same rule the carvings follow.
 *
 * One nobody has ever quoted goes for good: a colour typed in by mistake should not sit in
 * the list for ever with "inactive" beside it. One that appears on an estimate is retired
 * instead, because that estimate is a record of what was agreed and it names this colour.
 */
colors.delete("/:id", async (req, res) => {
  const id = idParam(req);
  const used = await prisma.estimate.count({ where: { OR: [{ doorColorId: id }, { designColorId: id }] } });
  if (used) {
    await prisma.color.update({ where: { id }, data: { active: false } });
    return res.json(ok({ removed: false, used }, `Used on ${used} estimate${used > 1 ? "s" : ""}, so it was hidden instead of deleted`));
  }
  await prisma.color.delete({ where: { id } });
  res.json(ok({ removed: true, used: 0 }, "Colour deleted"));
});

// ---------------- DESIGNS ----------------
export const designs = Router();
const designBody = z.object({
  // BUILTIN carvings use one of render.js's keys. UPLOADED ones get their own key,
  // so the list is no longer capped at the 15 keys the renderer ships with.
  key: z.string().trim().regex(/^[a-z0-9-]+$/, "key must be lowercase letters/numbers").optional(),
  nameEn: z.string().trim().min(2), nameBn: z.string().trim().min(1),
  noteEn: z.string().trim().nullish(), noteBn: z.string().trim().nullish(), svgUrl: z.string().trim().nullish(), allowDouble: zBool.default(true),
  origin: z.enum(["BUILTIN", "UPLOADED"]).optional(),
  visibility: z.enum(["PRIVATE", "LIBRARY"]).optional(),
  workersSingle: z.coerce.number().int().min(0).default(0), workersDouble: z.coerce.number().int().min(0).default(0),
  daysSingle: z.coerce.number().int().min(0).default(0), daysDouble: z.coerce.number().int().min(0).default(0),
  active: zBool.default(true), sortOrder: z.coerce.number().int().default(0), ...priceFields,
  labourCostSingle: zMoney, labourCostDouble: zMoney, labourProfitPercent: zPercent.optional(), labourSellSingle: zMoney.optional(), labourSellDouble: zMoney.optional(),
});

/** `custom-<time>-<rand>`: DoorDesign.key is unique, and a soft-deleted row keeps holding its key. */
const newKey = () => `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const labourOf = (o: Record<string, unknown>) => {
  const p = resolvePrice(pricedOnly({ costSingle: o.labourCostSingle, costDouble: o.labourCostDouble, profitPercent: o.labourProfitPercent, sellSingle: o.labourSellSingle, sellDouble: o.labourSellDouble }));
  return { labourCostSingle: p.costSingle, labourCostDouble: p.costDouble, labourProfitPercent: p.profitPercent, labourSellSingle: p.sellSingle, labourSellDouble: p.sellDouble };
};
/**
 * `?visibility=LIBRARY` for the gallery. `?include=12` adds one more row on top of
 * the filter, which is how a PRIVATE carving still shows on the estimate it belongs to.
 */
designs.get("/", async (req, res) => {
  const visibility = req.query.visibility ? (String(req.query.visibility) as "LIBRARY") : undefined;
  const include = Number(req.query.include) || 0;
  const rows = await prisma.doorDesign.findMany({
    where: visibility ? { OR: [{ visibility }, ...(include ? [{ id: include }] : [])] } : {},
    orderBy: [{ visibility: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
  });
  res.json(ok(rows));
});

/** Move an uploaded carving into the gallery (or back out of it). */
designs.patch("/:id/visibility", async (req, res) => {
  const { visibility } = parse(z.object({ visibility: z.enum(["PRIVATE", "LIBRARY"]) }), req.body);
  const d = await prisma.doorDesign.update({ where: { id: idParam(req) }, data: { visibility } });
  res.json(ok(d, visibility === "LIBRARY" ? "Added to your carving gallery" : "Removed from the gallery"));
});
designs.get("/:id/history", async (req, res) => res.json(ok(await history(["DESIGN", "DESIGN_LABOUR"], idParam(req)))));
designs.post("/", async (req, res) => {
  const b = parse(designBody, req.body);
  const origin = b.origin ?? (b.svgUrl ? "UPLOADED" : "BUILTIN");
  if (origin === "BUILTIN" && !b.key) throw bad("Pick a carving style");
  if (origin === "UPLOADED" && !b.svgUrl) throw bad("An uploaded carving needs its drawing");
  const s = await getSettings();
  const d = {
    ...b,
    key: b.key ?? newKey(),
    origin,
    visibility: b.visibility ?? (origin === "UPLOADED" ? "PRIVATE" as const : "LIBRARY" as const),
    profitPercent: b.profitPercent ?? Number(s.profitDesignPercent),
    labourProfitPercent: b.labourProfitPercent ?? Number(s.profitLabourPercent),
  };
  res.status(201).json(ok(await prisma.doorDesign.create({ data: { ...d, ...resolvePrice(pricedOnly(d)), ...labourOf(d) } }), "Carving added"));
});
designs.put("/:id", async (req, res) => {
  const id = idParam(req);
  const b = onlySent(parse(designBody.partial(), req.body), req.body);
  const data = await prisma.$transaction(async (tx) => {
    const old = await tx.doorDesign.findUniqueOrThrow({ where: { id } });
    const merged = { ...old, ...b } as Record<string, unknown>;
    if (b.sellSingle === undefined) { delete merged.sellSingle; delete merged.sellDouble; }
    if (b.labourSellSingle === undefined) { delete merged.labourSellSingle; delete merged.labourSellDouble; }
    const up = await tx.doorDesign.update({ where: { id }, data: { ...b, ...resolvePrice(pricedOnly(merged)), ...labourOf(merged) } });
    await logPrice(tx, "DESIGN", id, up.nameEn, { cost: old.costSingle, sell: old.sellSingle }, { cost: up.costSingle, sell: up.sellSingle }, "Single");
    await logPrice(tx, "DESIGN_LABOUR", id, up.nameEn, { cost: old.labourCostSingle, sell: old.labourSellSingle }, { cost: up.labourCostSingle, sell: up.labourSellSingle }, "Carving labour, Single");
    return up;
  });
  res.json(ok(data, "Carving updated"));
});
/**
 * Delete a carving.
 *
 * A carving that has never been quoted is removed outright - a photo that came out badly
 * should not sit in the list for ever with "inactive" beside it. One that appears on an
 * estimate cannot be: that estimate is a record of what was agreed, and it names this
 * carving, so the row is retired instead and the old paperwork still reads correctly.
 */
designs.delete("/:id", async (req, res) => {
  const id = idParam(req);
  const used = await prisma.estimate.count({ where: { designId: id } });
  if (used) {
    await prisma.doorDesign.update({ where: { id }, data: { active: false, visibility: "PRIVATE" } });
    return res.json(ok({ removed: false, used }, `Used on ${used} estimate${used > 1 ? "s" : ""}, so it was hidden instead of deleted`));
  }
  await prisma.doorDesign.delete({ where: { id } });
  res.json(ok({ removed: true, used: 0 }, "Carving deleted"));
});

// ---------------- LABOUR ----------------
export const labour = Router();
const labourBody = z.object({
  nameEn: z.string().trim().min(2), nameBn: z.string().trim().min(1), category: z.enum(["DOOR", "POLISH", "FRAME", "FITTING", "DELIVERY", "OTHER"]),
  active: zBool.default(true), sortOrder: z.coerce.number().int().default(0), ...priceFields,
  workersSingle: z.coerce.number().int().min(0).default(0), workersDouble: z.coerce.number().int().min(0).default(0),
  daysSingle: z.coerce.number().int().min(0).default(0), daysDouble: z.coerce.number().int().min(0).default(0),
});
labour.get("/", async (_req, res) => res.json(ok(await prisma.labourRate.findMany({ orderBy: { sortOrder: "asc" } }))));
labour.get("/:id/history", async (req, res) => res.json(ok(await history("LABOUR", idParam(req)))));
labour.post("/", async (req, res) => {
  const b = parse(labourBody, req.body);
  const profit = b.profitPercent ?? Number((await getSettings()).profitLabourPercent);
  res.status(201).json(ok(await prisma.labourRate.create({ data: { ...b, ...resolvePrice(pricedOnly({ ...b, profitPercent: profit })) } }), "Labour added"));
});
labour.put("/:id", async (req, res) => {
  const id = idParam(req);
  const b = onlySent(parse(labourBody.partial(), req.body), req.body);
  const data = await prisma.$transaction(async (tx) => {
    const old = await tx.labourRate.findUniqueOrThrow({ where: { id } });
    const merged = { costSingle: old.costSingle, costDouble: old.costDouble, profitPercent: old.profitPercent, sellSingle: old.sellSingle, sellDouble: old.sellDouble, ...b };
    const up = await tx.labourRate.update({ where: { id }, data: { ...b, ...resolvePrice(pricedOnly(merged)) } });
    await logPrice(tx, "LABOUR", id, up.nameEn, { cost: old.costSingle, sell: old.sellSingle }, { cost: up.costSingle, sell: up.sellSingle }, "Single");
    return up;
  });
  res.json(ok(data, "Labour updated"));
});
/**
 * Delete a labour rate. This one always goes.
 *
 * An estimate copies the wording and the figure of every labour line onto itself when it is
 * saved, and never looks the rate up again, so removing the rate changes nothing that was
 * already agreed - it only stops the job being offered on the next estimate.
 */
labour.delete("/:id", async (req, res) => {
  await prisma.labourRate.delete({ where: { id: idParam(req) } });
  res.json(ok({ removed: true, used: 0 }, "Labour rate deleted"));
});
