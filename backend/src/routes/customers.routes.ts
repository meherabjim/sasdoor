import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { bad, idParam, ok, onlySent, parse } from "../lib/http";
import { n, r2 } from "../lib/money";

const r = Router();
const totals = (es: { grandTotal: unknown; paidAmount: unknown; status: string }[]) => {
  const live = es.filter((e) => e.status !== "CANCELLED");
  const total = r2(live.reduce((s, e) => s + n(e.grandTotal as never), 0)), paid = r2(live.reduce((s, e) => s + n(e.paidAmount as never), 0));
  return { orders: live.length, total, paid, due: r2(total - paid) };
};

r.get("/", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const list = await prisma.customer.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {},
    include: { estimates: { select: { grandTotal: true, paidAmount: true, status: true } } }, orderBy: { updatedAt: "desc" },
  });
  // flag the ones where somebody registered with this phone but is not linked yet
  const unlinked = list.filter((c) => !c.userId).map((c) => c.phone);
  const waiting = unlinked.length ? await prisma.user.findMany({ where: { phone: { in: unlinked } }, select: { phone: true } }) : [];
  const waitingSet = new Set(waiting.map((u) => u.phone));
  res.json(ok(list.map(({ estimates, ...c }) => ({ ...c, ...totals(estimates), accountWaiting: !c.userId && waitingSet.has(c.phone) }))));
});
r.get("/:id", async (req, res) => {
  const c = await prisma.customer.findUniqueOrThrow({ where: { id: idParam(req) }, include: { estimates: { include: { payments: true }, orderBy: { createdAt: "desc" } }, bookVisitRequest: true } });
  res.json(ok({ ...c, ...totals(c.estimates) }));
});
const body = z.object({ name: z.string().trim().min(2), phone: z.string().trim().regex(/^01\d{9}$/, "phone 01XXXXXXXXX"), address: z.string().trim().nullish(), note: z.string().trim().nullish() });
r.post("/", async (req, res) => res.status(201).json(ok(await prisma.customer.create({ data: parse(body, req.body) }), "Customer added")));
r.put("/:id", async (req, res) => res.json(ok(await prisma.customer.update({ where: { id: idParam(req) }, data: onlySent(parse(body.partial(), req.body), req.body) }), "Customer updated")));

/**
 * Hand a customer's order history to the account registered on the same phone.
 * Deliberately a manual step: registration cannot verify a phone number, so this is
 * the shop confirming "yes, this really is them".
 */
r.patch("/:id/link-account", async (req, res) => {
  const c = await prisma.customer.findUniqueOrThrow({ where: { id: idParam(req) } });
  if (c.userId) throw bad("This customer is already linked to an account");
  const u = await prisma.user.findUnique({ where: { phone: c.phone } });
  if (!u) throw bad("Nobody has registered with this phone number yet");
  const already = await prisma.customer.findUnique({ where: { userId: u.id } });
  if (already) throw bad(`That account is already linked to ${already.name}`);
  res.json(ok(await prisma.customer.update({ where: { id: c.id }, data: { userId: u.id } }), "Orders linked to the customer's account"));
});

export default r;
