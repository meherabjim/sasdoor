import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { bad, idParam, ok, onlySent, parse, zBool } from "../lib/http";

const r = Router();
const pub = <T extends { passwordHash?: string }>(u: T) => { const { passwordHash, ...rest } = u; void passwordHash; return rest; };

r.get("/", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const list = await prisma.user.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {},
    include: { customer: { include: { _count: { select: { estimates: true } } } } }, orderBy: { createdAt: "desc" },
  });
  res.json(ok(list.map(pub)));
});

r.put("/:id", async (req, res) => {
  const id = idParam(req);
  const b = onlySent(parse(z.object({
    name: z.string().trim().min(2), email: z.string().trim().email().nullable(), phone: z.string().trim().regex(/^01\d{9}$/, "phone 01XXXXXXXXX").nullable(),
    address: z.string().trim().nullable(), active: zBool,
  }).partial(), req.body), req.body);
  const u = await prisma.user.findUniqueOrThrow({ where: { id } });
  if (u.id === req.user!.id && b.active === false) throw bad("You cannot deactivate your own account");
  const data = await prisma.$transaction(async (tx) => {
    const up = await tx.user.update({ where: { id }, data: { ...b, email: b.email === undefined ? undefined : b.email?.toLowerCase() ?? null } });
    await tx.customer.updateMany({ where: { userId: id }, data: { name: up.name, ...(up.phone ? { phone: up.phone } : {}), address: up.address } });
    return up;
  });
  res.json(ok(pub(data), "User updated"));
});

r.post("/:id/reset-password", async (req, res) => {
  const { newPassword } = parse(z.object({ newPassword: z.string().min(6, "at least 6 characters") }), req.body);
  await prisma.user.update({ where: { id: idParam(req) }, data: { passwordHash: await bcrypt.hash(newPassword, 10) } });
  res.json(ok(null, "New password set"));
});

export default r;
