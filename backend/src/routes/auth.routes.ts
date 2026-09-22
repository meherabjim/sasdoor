import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { HttpError, ok, parse } from "../lib/http";
import { requireAuth, signToken } from "../middleware/auth";

const r = Router();
const publicUser = (u: { id: number; name: string; email: string | null; phone: string | null; role: string; address: string | null }) =>
  ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, address: u.address });

r.post("/register", async (req, res) => {
  const b = parse(z.object({
    name: z.string().trim().min(2, "name is required"),
    phone: z.string().trim().regex(/^01\d{9}$/, "phone must be 01XXXXXXXXX"),
    email: z.string().trim().email().optional().or(z.literal("").transform(() => undefined)),
    password: z.string().min(6, "password must be at least 6 characters"),
    address: z.string().trim().optional(),
  }), req.body);
  /**
   * Linking a new account to an existing customer record is an account takeover if
   * that record already has history: the phone is never verified here (the OTP screens
   * are a demo), so anyone who knows a customer's number could register with it and
   * read their orders, prices and dues through /my/estimates.
   *
   * So: a phone with no history links straight away, and a phone that already has
   * estimates is left alone for the shop to link by hand from the Customers page.
   * The account is still created either way - only the history stays behind.
   */
  // Hashing is ~200ms of pure JS. Done before the transaction opens, so it is not spent
  // holding a database connection while other registrations queue behind it.
  const passwordHash = await bcrypt.hash(b.password, 10);
  const { user, linked } = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({ data: { name: b.name, phone: b.phone, email: b.email, address: b.address, passwordHash } });
    const existing = await tx.customer.findUnique({ where: { phone: b.phone }, include: { _count: { select: { estimates: true } } } });

    if (!existing) {
      await tx.customer.create({ data: { name: b.name, phone: b.phone, address: b.address, userId: u.id } });
      return { user: u, linked: true };
    }
    // never overwrite what the shop typed in; only fill the blank link
    if (!existing.userId && existing._count.estimates === 0) {
      await tx.customer.update({ where: { id: existing.id }, data: { userId: u.id } });
      return { user: u, linked: true };
    }
    return { user: u, linked: false };
  });

  res.status(201).json(ok(
    { token: signToken({ id: user.id, role: user.role, name: user.name }), user: publicUser(user), ordersLinked: linked },
    linked ? "Registered" : "Registered. Your earlier orders will appear once the shop confirms this number.",
  ));
});

r.post("/login", async (req, res) => {
  const b = parse(z.object({ login: z.string().trim().min(3), password: z.string().min(1) }),
    { login: req.body?.login ?? req.body?.email ?? req.body?.phone, password: req.body?.password });
  const user = await prisma.user.findFirst({ where: { OR: [{ email: b.login.toLowerCase() }, { phone: b.login }] } });
  if (!user || !user.active || !(await bcrypt.compare(b.password, user.passwordHash)))
    throw new HttpError(401, "Wrong email/phone or password");
  res.json(ok({ token: signToken({ id: user.id, role: user.role, name: user.name }), user: publicUser(user) }, "Logged in"));
});

r.get("/me", requireAuth, async (req, res) => {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  res.json(ok(publicUser(u)));
});

r.patch("/me", requireAuth, async (req, res) => {
  const b = parse(z.object({ name: z.string().trim().min(2).optional(), address: z.string().trim().optional() }), req.body);
  const u = await prisma.user.update({ where: { id: req.user!.id }, data: b });
  if (u.phone) await prisma.customer.updateMany({ where: { userId: u.id }, data: { name: u.name, address: u.address } });
  res.json(ok(publicUser(u), "Profile updated"));
});

r.post("/change-password", requireAuth, async (req, res) => {
  const b = parse(z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(6, "new password must be at least 6 characters") }), req.body);
  const u = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  if (!(await bcrypt.compare(b.currentPassword, u.passwordHash))) throw new HttpError(400, "Current password is incorrect");
  await prisma.user.update({ where: { id: u.id }, data: { passwordHash: await bcrypt.hash(b.newPassword, 10) } });
  res.json(ok(null, "Password changed"));
});

export default r;
