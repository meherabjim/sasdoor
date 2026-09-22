import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { bad, idParam, ok, onlySent, parse, zBool, zMoney } from "../lib/http";
import { n, r2 } from "../lib/money";

const r = Router();

/**
 * `kind` is what the menu shows; `source` is what the stock is keyed by.
 *   LOCAL         -> source LOCAL,   Bangladesh
 *   INTERNATIONAL -> source FOREIGN, country picked on the form
 *   OWN           -> source LOCAL,   Bangladesh   (our own factory)
 *
 * OWN stays on the LOCAL source on purpose: WoodStock is unique on
 * (woodTypeId, source), so a third source would split "our teak" and
 * "bought teak" into two stocks with two prices.
 */
const KIND_SOURCE = { LOCAL: "LOCAL", INTERNATIONAL: "FOREIGN", OWN: "LOCAL" } as const;

const body = z.object({
  companyName: z.string().trim().min(2), phone: z.string().trim().nullish(), address: z.string().trim().nullish(),
  kind: z.enum(["LOCAL", "INTERNATIONAL", "OWN"]).optional(),
  source: z.enum(["LOCAL", "FOREIGN"]).optional(),
  country: z.string().trim().default("Bangladesh"), active: zBool.default(true),
  /** optional: money handed over while creating the supplier */
  advance: zMoney.optional(),
  advanceMethod: z.enum(["CASH", "BANK", "BKASH", "NAGAD", "LC", "OTHER"]).optional(),
});

/** Fill in whatever the caller left out, so old clients that only send `source` keep working. */
function withKind<T extends { kind?: "LOCAL" | "INTERNATIONAL" | "OWN"; source?: "LOCAL" | "FOREIGN"; country?: string }>(b: T) {
  const kind = b.kind ?? (b.source === "FOREIGN" ? "INTERNATIONAL" : b.source === "LOCAL" ? "LOCAL" : undefined);
  if (!kind) return b;
  const source = KIND_SOURCE[kind];
  const country = kind === "INTERNATIONAL" ? (b.country ?? "Bangladesh") : "Bangladesh";
  return { ...b, kind, source, country };
}

/**
 * One running account per supplier.
 *   balance = total purchases - total paid
 *   balance > 0 -> we owe the supplier  (due)
 *   balance < 0 -> the supplier owes us wood (advance)
 * `due` stays signed so old callers keep working; `payable` and `advance` are the
 * two never-negative numbers the screens should add up, because one supplier's
 * advance must never cancel out another supplier's due.
 */
export type SupplierBalance = { totalPurchase: number; totalPaid: number; due: number; payable: number; advance: number; own: boolean };

export const BLANK_BALANCE: SupplierBalance = { totalPurchase: 0, totalPaid: 0, due: 0, payable: 0, advance: 0, own: false };

async function balances() {
  const [buy, pay, kinds] = await Promise.all([
    prisma.woodPurchase.groupBy({ by: ["supplierId"], _sum: { totalCost: true, paidAmount: true } }),
    prisma.supplierPayment.groupBy({ by: ["supplierId"], _sum: { amount: true } }),
    prisma.supplier.findMany({ select: { id: true, kind: true } }),
  ]);
  const ownIds = new Set(kinds.filter((k) => k.kind === "OWN").map((k) => k.id));
  const map = new Map<number, SupplierBalance>();
  const blank = (): SupplierBalance => ({ ...BLANK_BALANCE });
  buy.forEach((b) => { if (b.supplierId) map.set(b.supplierId, { ...blank(), totalPurchase: n(b._sum.totalCost), totalPaid: n(b._sum.paidAmount) }); });
  pay.forEach((p) => { const m = map.get(p.supplierId) ?? blank(); m.totalPaid += n(p._sum.amount); map.set(p.supplierId, m); });
  // Every supplier gets a row, so a brand new one - exactly the one you hand an advance
  // to before the first consignment - is never missing from the screens.
  kinds.forEach((k) => { if (!map.has(k.id)) map.set(k.id, blank()); });
  map.forEach((m, id) => {
    m.totalPurchase = r2(m.totalPurchase);
    m.totalPaid = r2(m.totalPaid);
    m.own = ownIds.has(id);
    // Our own mill is not a creditor. Its wood is produced, not bought, so the cost of
    // it is a production cost the moment it is entered - there is nobody left to pay and
    // nobody to hold an advance for us. Leaving it in would grow a due that can never
    // be cleared, and quietly inflate "total due" on the dues page for ever.
    if (m.own) { m.due = 0; m.payable = 0; m.advance = 0; return; }
    m.due = r2(m.totalPurchase - m.totalPaid);
    m.payable = Math.max(0, m.due);
    m.advance = Math.max(0, -m.due);
  });
  return map;
}

/** Balance for one supplier, used by the purchase form to show money already parked with them. */
export async function supplierBalance(supplierId: number): Promise<SupplierBalance> {
  return (await balances()).get(supplierId) ?? { ...BLANK_BALANCE };
}

r.get("/", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const list = await prisma.supplier.findMany({
    where: q ? { OR: [{ companyName: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {},
    orderBy: { companyName: "asc" },
  });
  const bal = await balances();
  res.json(ok(list.map((s) => ({ ...s, ...(bal.get(s.id) ?? { ...BLANK_BALANCE }) }))));
});

r.post("/", async (req, res) => {
  const { advance, advanceMethod, ...rest } = withKind(parse(body, req.body));
  if (advance && advance > 0 && rest.kind === "OWN") throw bad("Own manufacture has no advance - there is nobody outside the business to hand it to");
  const supplier = await prisma.supplier.create({ data: rest });
  // "I added Karim Timber and handed him 2 lakh today" - record it without a second trip.
  if (advance && advance > 0) {
    await prisma.supplierPayment.create({
      data: { supplierId: supplier.id, amount: advance, type: "ADVANCE", method: advanceMethod ?? "CASH", note: "Advance at supplier entry" },
    });
  }
  res.status(201).json(ok(supplier, advance && advance > 0 ? `Supplier added, advance ${Math.round(advance)} recorded` : "Supplier added"));
});

r.put("/:id", async (req, res) => {
  const sent = onlySent(parse(body.partial(), req.body), req.body);
  const { advance: _a, advanceMethod: _m, ...rest } = withKind(sent);
  res.json(ok(await prisma.supplier.update({ where: { id: idParam(req) }, data: rest }), "Supplier updated"));
});

r.delete("/:id", async (req, res) => {
  const id = idParam(req);
  const used = await prisma.woodPurchase.count({ where: { supplierId: id } }) + await prisma.supplierPayment.count({ where: { supplierId: id } });
  if (used) { await prisma.supplier.update({ where: { id }, data: { active: false } }); return res.json(ok(null, "Has purchases or payments, so it was marked inactive")); }
  await prisma.supplier.delete({ where: { id } });
  res.json(ok(null, "Deleted"));
});

/** Ledger: purchases (+) and payments (-) with running balance */
r.get("/:id/ledger", async (req, res) => {
  const id = idParam(req);
  const [supplier, purchases, payments] = await Promise.all([
    prisma.supplier.findUniqueOrThrow({ where: { id } }),
    prisma.woodPurchase.findMany({ where: { supplierId: id }, include: { woodType: true } }),
    prisma.supplierPayment.findMany({ where: { supplierId: id } }),
  ]);
  const rows = [
    ...purchases.map((p) => ({ date: p.purchaseDate, type: "PURCHASE", ref: p.invoiceNo ?? `#${p.id}`, detail: `${p.woodType.nameEn} ${n(p.quantityCft)} CFT`, debit: n(p.totalCost), credit: 0 })),
    ...purchases.filter((p) => n(p.paidAmount) > 0).map((p) => ({ date: p.purchaseDate, type: "PAID_ON_PURCHASE", ref: p.invoiceNo ?? `#${p.id}`, detail: "Paid at purchase", debit: 0, credit: n(p.paidAmount) })),
    ...payments.map((p) => ({ date: p.paidAt, type: p.type, ref: `P-${p.id}`, detail: p.note ?? p.method, debit: 0, credit: n(p.amount) })),
  ].sort((a, b) => +new Date(a.date) - +new Date(b.date));
  let bal = 0;
  const ledger = rows.map((x) => ({ ...x, balance: (bal = r2(bal + x.debit - x.credit)) }));
  // Our own mill keeps a production record, not an account: there is no one to pay and
  // no one holding our money, so the three money figures are flat zero for it.
  const own = supplier.kind === "OWN";
  // bal < 0 means we have paid ahead: the supplier owes us wood.
  res.json(ok({
    supplier, ledger, own,
    due: own ? 0 : bal,
    payable: own ? 0 : Math.max(0, bal),
    advance: own ? 0 : Math.max(0, -bal),
  }));
});

/**
 * Money handed to a supplier.
 *
 * The caller does not get to say whether this is a payment or an advance, because the
 * caller cannot know: it depends entirely on what the account stood at a moment ago.
 * Nothing owed and you hand money over -> that is an advance. Something owed -> it is a
 * payment, even when it overshoots and leaves money parked. Letting the screen decide
 * meant paying 80,000 against a 50,000 due was filed, and shown in the ledger, as an
 * "Advance 80,000" - which is not what happened to any of it.
 *
 * The label never moves the maths either way: the running balance is purchases minus
 * everything paid, whatever each row is called. This only makes the ledger truthful.
 */
r.post("/:id/payments", async (req, res) => {
  const b = parse(z.object({
    amount: zMoney.positive("amount is required"),
    method: z.enum(["CASH", "BANK", "BKASH", "NAGAD", "LC", "OTHER"]).default("CASH"),
    paidAt: z.coerce.date().optional(),
    note: z.string().trim().nullish(),
  }), req.body);
  const supplierId = idParam(req);
  const supplier = await prisma.supplier.findUniqueOrThrow({ where: { id: supplierId } });
  if (supplier.kind === "OWN") throw bad("This is your own manufacture, so there is nobody to pay. Enter the production cost on the wood entry instead.");

  const before = await supplierBalance(supplierId);
  const type = before.payable > 0 ? "PAYMENT" : "ADVANCE";
  const payment = await prisma.supplierPayment.create({ data: { ...b, type, supplierId } });

  const after = await supplierBalance(supplierId);
  const message = after.advance > 0
    ? `Saved. Advance with this supplier is now ${Math.round(after.advance)}`
    : after.payable > 0
      ? `Saved. Still due: ${Math.round(after.payable)}`
      : "Saved. This account is now clear";
  res.status(201).json(ok(payment, message));
});
r.delete("/payments/:id", async (req, res) => { await prisma.supplierPayment.delete({ where: { id: idParam(req) } }); res.json(ok(null, "Payment deleted")); });

export default r;
