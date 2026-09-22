import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { idParam, ok, onlySent, parse, zBool } from "../lib/http";

/**
 * The people in the workshop.
 *
 * Not logins - carpenters do not sign in to anything. This is the shop's own list of who it
 * can put on a job, and it exists so that "who is doing this door" has an answer that is a
 * name rather than a number.
 *
 * There is no second screen for the work itself. The work belongs to the order, and the
 * order already has a page; a separate workshop dashboard would only be the same rows
 * arranged differently, and two places showing the same thing is two places to keep in
 * step. What this list adds is the other direction - open it and every man says what he
 * has on right now, which is what you need when deciding who takes the next door.
 */
const r = Router();

const SKILLS = ["DOOR", "POLISH", "FRAME", "FITTING", "DELIVERY", "OTHER"] as const;
const body = z.object({
  name: z.string().trim().min(2, "name is too short"),
  phone: z.string().trim().regex(/^01\d{9}$/, "phone 01XXXXXXXXX").nullish(),
  skill: z.enum(SKILLS).default("OTHER"),
  note: z.string().trim().nullish(),
  active: zBool.default(true),
});

r.get("/", async (_req, res) => {
  const list = await prisma.worker.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      lines: {
        where: { estimate: { status: { notIn: ["CANCELLED", "COMPLETED"] } } },
        include: { estimate: { select: { id: true, estimateNo: true, status: true, customer: { select: { name: true } } } } },
        orderBy: { id: "desc" },
      },
    },
  });
  res.json(ok(list.map(({ lines, ...w }) => {
    const open = lines.filter((l) => !l.doneAt);
    return {
      ...w,
      open: open.map((l) => ({
        lineId: l.id, job: l.name, workers: l.workers, days: l.days, startedAt: l.startedAt,
        estimateId: l.estimate.id, estimateNo: l.estimate.estimateNo,
        customer: l.estimate.customer.name, status: l.estimate.status,
      })),
      openCount: open.length,
      doneCount: lines.length - open.length,
    };
  })));
});

r.post("/", async (req, res) => {
  res.status(201).json(ok(await prisma.worker.create({ data: parse(body, req.body) }), "Worker added"));
});

r.put("/:id", async (req, res) => {
  const b = onlySent(parse(body.partial(), req.body), req.body);
  res.json(ok(await prisma.worker.update({ where: { id: idParam(req) }, data: b }), "Worker updated"));
});

/**
 * Remove a worker.
 *
 * One who has never been put on a job goes for good. One who has built doors does not: his
 * name is on those orders and that is a record of who did the work. He is made inactive
 * instead, which takes him off every dropdown without rewriting the past.
 */
r.delete("/:id", async (req, res) => {
  const id = idParam(req);
  const used = await prisma.estimateLine.count({ where: { workerId: id } });
  if (used) {
    await prisma.worker.update({ where: { id }, data: { active: false } });
    return res.json(ok({ removed: false, used }, `On ${used} job${used > 1 ? "s" : ""} already, so he was made inactive instead of removed`));
  }
  await prisma.worker.delete({ where: { id } });
  res.json(ok({ removed: true, used: 0 }, "Worker removed"));
});

export default r;
