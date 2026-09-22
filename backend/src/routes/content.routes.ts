import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { idParam, ok, parse, zBool } from "../lib/http";

/** Admin: website content (text EN/BN, image, show/hide) per page/section/key */
export const contentAdmin = Router();
const item = z.object({
  page: z.string().trim().min(1), section: z.string().trim().min(1), key: z.string().trim().min(1),
  textEn: z.string().nullish(), textBn: z.string().nullish(), image: z.string().nullish(), visible: zBool.default(true), sortOrder: z.coerce.number().int().default(0),
});
contentAdmin.get("/", async (req, res) => res.json(ok(await prisma.siteContent.findMany({ where: req.query.page ? { page: String(req.query.page) } : {}, orderBy: [{ page: "asc" }, { section: "asc" }, { sortOrder: "asc" }] }))));
/** Save many items at once (upsert by page+section+key) */
contentAdmin.put("/", async (req, res) => {
  const items = parse(z.array(item).min(1), req.body?.items ?? req.body);
  const saved = await prisma.$transaction(items.map((i) => prisma.siteContent.upsert({ where: { page_section_key: { page: i.page, section: i.section, key: i.key } }, update: i, create: i })));
  res.json(ok(saved, "Website content saved"));
});
contentAdmin.delete("/:id", async (req, res) => { await prisma.siteContent.delete({ where: { id: idParam(req) } }); res.json(ok(null, "Deleted")); });

/** Admin: book visit requests */
export const visitsAdmin = Router();
visitsAdmin.get("/", async (_req, res) => res.json(ok(await prisma.bookVisitRequest.findMany({ orderBy: { createdAt: "desc" } }))));
visitsAdmin.patch("/:id", async (req, res) => {
  const b = parse(z.object({ status: z.enum(["NEW", "CONTACTED", "DONE", "CANCELLED"]) }), req.body);
  res.json(ok(await prisma.bookVisitRequest.update({ where: { id: idParam(req) }, data: b }), "Status updated"));
});
