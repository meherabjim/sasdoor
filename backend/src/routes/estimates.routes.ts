import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma, Tx } from "../config/prisma";
import { bad, HttpError, idParam, ok, parse, zBool, zMoney } from "../lib/http";
import { n, r2 } from "../lib/money";
import { calculateEstimate } from "../lib/estimateCalc";
import { estimateCarving } from "../lib/carvingEstimate";
import { sanitizeSvg } from "../lib/svgSanitize";
import { consumeForEstimate, returnForEstimate, stockAvailable } from "../lib/stockService";
import { assignWork, releaseWork } from "../lib/assignWork";
import { Message, MSG, notify, sendSms } from "../lib/notify";
import { getSettings } from "./settings.routes";

export const doorInput = z.object({
  doorType: z.enum(["SINGLE", "DOUBLE"]),
  heightFt: z.coerce.number().positive(), widthFt: z.coerce.number().positive(),
  thicknessInch: z.coerce.number().positive().optional(),
  withFrame: zBool.default(false), withFitting: zBool.default(false), withDelivery: zBool.default(false),
  woodStockId: z.coerce.number().int().positive(),
  doorColorId: z.coerce.number().int().positive().nullish(),
  designId: z.coerce.number().int().positive().nullish(),
  designColorId: z.coerce.number().int().positive().nullish(),
});
type DoorInput = z.infer<typeof doorInput>;

/**
 * A carving the customer traced from their own photo on the website.
 *
 * Only the drawing and the two measurements the tracer produced come across. No price:
 * that is worked out here, from the shop's own gallery, because a price arriving from a
 * browser is a price the customer could have typed.
 */
export const customCarving = z.object({
  svg: z.string().min(20).max(400_000),
  name: z.string().trim().max(60).nullish(),
  shapes: z.coerce.number().int().min(1).max(5000),
  coverage: z.coerce.number().min(0).max(1),
});
export type CustomCarving = z.infer<typeof customCarving>;

/**
 * Add the estimated carving to a calculation that has no carving of its own.
 *
 * It lands as the same two lines a gallery carving would - the carving and its labour -
 * so everything downstream (the totals, the estimate lines, the printed sheet, the review
 * screen) treats it exactly like any other, and nothing has to learn a special case.
 */
export async function withCustomCarving(db: Tx, calc: Awaited<ReturnType<typeof quote>>["calc"], c: CustomCarving, doubleDoor: boolean, name: string) {
  const est = await estimateCarving(db, c.shapes, c.coverage, doubleDoor);
  if (!est.total) return { calc, est };
  const add = (type: "DESIGN" | "LABOUR", label: string, sell: number) =>
    calc.lines.push({ type, name: label, quantity: 1, unitCost: 0, unitSell: r2(sell), cost: 0, sell: r2(sell), workers: 0, days: 0 });
  add("DESIGN", `Carving: ${name} (estimate)`, est.carving);
  add("LABOUR", `Carving labour: ${name} (estimate)`, est.labour);
  calc.totalSell = r2(calc.totalSell + est.total);
  return { calc, est };
}

/** Load everything needed and calculate (used by quote, create, website order) */
export async function quote(db: Tx, i: DoorInput) {
  const [settings, stock, doorColor, design, designColor, labour] = await Promise.all([
    getSettings(db),
    db.woodStock.findUnique({ where: { id: i.woodStockId }, include: { woodType: true, batches: { where: { status: { not: "DONE" } } } } }),
    i.doorColorId ? db.color.findFirst({ where: { id: i.doorColorId, type: "DOOR", active: true } }) : null,
    i.designId ? db.doorDesign.findFirst({ where: { id: i.designId, active: true } }) : null,
    i.designColorId ? db.color.findFirst({ where: { id: i.designColorId, type: "DESIGN", active: true } }) : null,
    db.labourRate.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  if (!stock || !stock.woodType.active) throw bad("Wood not found");
  if (i.doorColorId && !doorColor) throw bad("Door color not found");
  if (i.designId && !design) throw bad("Carving not found");
  if (design && i.doorType === "DOUBLE" && !design.allowDouble) throw bad("This carving is not available for double doors");
  if (i.designColorId && !designColor) throw bad("Carving color not found");
  const woodName = `${stock.woodType.nameEn} (${stock.source === "LOCAL" ? "Local" : "Foreign"})`;
  const calc = calculateEstimate(i, { settings, wood: { name: woodName, activeCostPerCft: stock.activeCostPerCft, sellingPricePerCft: stock.sellingPricePerCft }, doorColor, design, designColor, labour });
  const available = stockAvailable(stock.batches);
  return { calc, stock, woodName, doorColor, design, designColor, available, enoughStock: available >= calc.totalCft };
}

/**
 * The next estimate number.
 *
 * Counting is not reserving: two orders arriving together both count 41 and both want
 * SAS-2026-0042. The column is unique, so the second one fails - which is correct, but it
 * is not the customer's fault, so the create is retried rather than shown to them.
 */
async function nextNo(tx: Tx, attempt = 0) {
  const y = new Date().getFullYear();
  const count = await tx.estimate.count({ where: { estimateNo: { startsWith: `SAS-${y}-` } } });
  return `SAS-${y}-${String(count + 1 + attempt).padStart(4, "0")}`;
}

/** Create estimate with locked lines; shared by admin and website order */
export async function createEstimate(i: DoorInput & { customer: { name: string; phone: string; address?: string | null }; note?: string | null; discount?: number; advance?: number; advanceMethod?: string; source: "ADMIN" | "WEBSITE"; userId?: number; custom?: CustomCarving | null;
  /** The owner made this themselves, so there is nobody to wait for a price from. */
  skipReview?: boolean }, attempt = 0): Promise<Awaited<ReturnType<typeof makeEstimate>>> {
  try {
    return await makeEstimate(i, attempt);
  } catch (err) {
    // Two orders in the same second both counted the same number. Only that.
    const clash = typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
    if (clash && attempt < 5) return createEstimate(i, attempt + 1);
    throw err;
  }
}

async function makeEstimate(i: Parameters<typeof createEstimate>[0], attempt: number) {
  {
  return prisma.$transaction(async (tx) => {
    const q = await quote(tx, i);
    // A carving of the customer's own: priced from the gallery here, and flagged so every
    // screen that shows this estimate knows the figure is not one the shop has agreed to.
    let customSvg: string | null = null, customName: string | null = null, needsQuote = false;
    if (i.custom && !i.designId) {
      const clean = sanitizeSvg(i.custom.svg);
      if (!clean) throw bad("That carving drawing could not be read");
      customName = (i.custom.name ?? "").trim() || "Your carving";
      const out = await withCustomCarving(tx, q.calc, i.custom, i.doorType === "DOUBLE", customName);
      if (out.est.total > 0) { customSvg = clean; needsQuote = !i.skipReview; }
      else customName = null;
    }
    const customer = await tx.customer.upsert({
      where: { phone: i.customer.phone },
      update: { name: i.customer.name, ...(i.customer.address ? { address: i.customer.address } : {}) },
      create: { name: i.customer.name, phone: i.customer.phone, address: i.customer.address, ...(i.source === "WEBSITE" && i.userId ? { userId: i.userId } : {}) },
    });
    const discount = r2(i.discount ?? 0);
    const grandTotal = r2(q.calc.totalSell - discount);
    if (grandTotal < 0) throw bad("Discount cannot be more than the total");
    const advance = r2(i.advance ?? 0);
    if (advance > grandTotal) throw bad("Advance cannot be more than the total");
    const e = await tx.estimate.create({
      data: {
        estimateNo: await nextNo(tx, attempt), customerId: customer.id, createdById: i.userId, source: i.source,
        doorType: i.doorType, heightFt: i.heightFt, widthFt: i.widthFt, thicknessInch: q.calc.thicknessInch,
        withFrame: i.withFrame, withFitting: i.withFitting, withDelivery: i.withDelivery,
        woodStockId: q.stock.id, woodName: q.woodName,
        doorColorId: q.doorColor?.id, doorColorName: q.doorColor?.nameEn, doorColorCode: q.doorColor?.colorCode,
        designId: q.design?.id, designKey: q.design?.key, designName: q.design?.nameEn, designSvgUrl: q.design?.svgUrl ?? null,
        designColorId: q.design ? q.designColor?.id : null, designColorName: q.design ? q.designColor?.nameEn : null, designColorCode: q.design ? q.designColor?.colorCode : null,
        doorCft: q.calc.doorCft, frameCft: q.calc.frameCft, totalCft: q.calc.totalCft,
        totalCost: q.calc.totalCost, totalSell: q.calc.totalSell, discount, grandTotal, paidAmount: advance, note: i.note,
        customDesignSvg: customSvg, customDesignName: customName, needsQuote,
        lines: { create: q.calc.lines.map((l, idx) => ({ ...l, sortOrder: idx })) },
        ...(advance > 0 ? { payments: { create: { amount: advance, method: (i.advanceMethod ?? "CASH") as "CASH", note: "Advance" } } } : {}),
      },
      include: { lines: true, customer: true, payments: true },
    });
    return e;
  });
  }
}

const r = Router();

r.post("/quote", async (req, res) => {
  const q = await quote(prisma, parse(doorInput, req.body));
  res.json(ok({ ...q.calc, woodName: q.woodName, availableCft: q.available, enoughStock: q.enoughStock }));
});

const createBody = doorInput.extend({
  customer: z.object({ name: z.string().trim().min(2), phone: z.string().trim().regex(/^01\d{9}$/, "phone 01XXXXXXXXX"), address: z.string().trim().nullish() }),
  note: z.string().trim().nullish(), discount: zMoney.default(0), advance: zMoney.default(0),
  advanceMethod: z.enum(["CASH", "BANK", "BKASH", "NAGAD", "OTHER"]).default("CASH"),
});
r.post("/", async (req, res) => {
  const b = parse(createBody, req.body);
  res.status(201).json(ok(await createEstimate({ ...b, source: "ADMIN", userId: req.user?.id }), "Estimate saved"));
});

r.get("/", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const where: Prisma.EstimateWhereInput = {};
  if (req.query.status) where.status = String(req.query.status) as "NEW";
  if (req.query.customerId) where.customerId = Number(req.query.customerId);
  // Requests the customer sent in from the website, so the shop can find them quickly
  if (req.query.source) where.source = String(req.query.source) as "WEBSITE";
  /**
   * The two screens are two questions, not two filters on one list.
   *
   * Orders: doors the customer has actually committed to - and that means what the CUSTOMER
   * did, not what the shop has got round to. Two things count. One is an estimate the shop
   * has confirmed and everything after it. The other is a door somebody chose on the website
   * out of the gallery and pressed Order on: nothing about it is waiting on a decision, the
   * customer has said yes in the plainest way there is, and it sits at NEW only because the
   * shop has not opened it yet. Leaving those out put them on no screen at all - not Orders,
   * because they were not confirmed, and not Requests, because there was nothing to price -
   * so a real order could arrive and be seen by nobody.
   *
   * An estimate the SHOP typed up is a different animal: that is the shop's own offer, and
   * nobody has said yes to it. Those stay out until you ask for a status by name.
   *
   * Requests: only what needs an answer. A door with a carving the customer traced
   * themselves, still waiting. One picked out of the gallery needs nothing from anybody
   * and belongs in Orders; one already made or delivered is finished business.
   */
  const ORDERED = ["CONFIRMED", "IN_PRODUCTION", "READY", "DELIVERED", "COMPLETED"] as const;
  /** A door the customer ordered off the website themselves, not yet opened by the shop. */
  const STRAIGHT_FROM_SITE = { source: "WEBSITE", customDesignSvg: null, status: "NEW" } as const;
  const scope = String(req.query.scope ?? "");
  /**
   * Two "any of these" questions in one query - which screen you are on, and what you typed
   * in the search box - so they go in as separate AND clauses. Written as two `OR` keys on
   * the same object, the second would quietly replace the first and the search box would
   * hand you back rows from screens you are not looking at.
   */
  const and: Prisma.EstimateWhereInput[] = [];
  if (scope === "orders" && !req.query.status) {
    and.push({ OR: [{ status: { in: [...ORDERED] } }, { ...STRAIGHT_FROM_SITE }] });
  }
  if (scope === "requests") {
    where.customDesignSvg = { not: null };
    if (!req.query.status) where.status = { in: ["NEW", "QUOTED"] };
  }
  if (q) and.push({ OR: [{ estimateNo: { contains: q, mode: "insensitive" } }, { customer: { name: { contains: q, mode: "insensitive" } } }, { customer: { phone: { contains: q } } }] });
  if (and.length) where.AND = and;
  if (req.query.from || req.query.to) where.createdAt = { ...(req.query.from ? { gte: new Date(String(req.query.from)) } : {}), ...(req.query.to ? { lte: new Date(String(req.query.to)) } : {}) };
  const list = await prisma.estimate.findMany({
    where,
    // Enough of the work sheet to put "3 of 5 done · 4 men" on a row, without dragging
    // every line of every estimate across for a list nobody has opened yet.
    include: { customer: true, lines: { where: WORK_WHERE, select: { workers: true, days: true, doneAt: true } } },
    orderBy: { createdAt: "desc" }, take: 500,
  });
  res.json(ok(list.map(({ lines, ...e }) => ({
    ...e,
    due: r2(n(e.grandTotal) - n(e.paidAmount)), profit: r2(n(e.grandTotal) - n(e.totalCost)),
    work: {
      total: lines.length, done: lines.filter((l) => l.doneAt).length,
      // Heads add up; days do not. People work side by side, so a door takes as long as
      // its longest job, not the sum of them.
      workers: lines.reduce((a, l) => a + l.workers, 0),
      days: lines.reduce((a, l) => Math.max(a, l.days), 0),
    },
  }))));
});

r.get("/:id", async (req, res) => {
  const e = await prisma.estimate.findUniqueOrThrow({
    where: { id: idParam(req) },
    include: {
      customer: true,
      lines: { orderBy: { sortOrder: "asc" }, include: { worker: { select: { id: true, name: true } } } },
      payments: { orderBy: { paidAt: "asc" } }, usages: { include: { batch: true } },
    },
  });
  const woodOriginalCost = e.usages.filter((u) => !u.returned).reduce((s, u) => s + n(u.cft) * n(u.originalCost), 0);
  const steps = e.lines.filter(isWork).map(stepOf);
  res.json(ok({
    ...e, due: r2(n(e.grandTotal) - n(e.paidAmount)), profit: r2(n(e.grandTotal) - n(e.totalCost)), woodOriginalCost: r2(woodOriginalCost),
    steps,
    work: {
      total: steps.length, done: steps.filter((s) => s.state === "DONE").length,
      workers: steps.reduce((a, s) => a + s.workers, 0),
      days: steps.reduce((a, s) => Math.max(a, s.days), 0),
    },
  }));
});

/** Recalculate an estimate while it is still NEW */
r.put("/:id", async (req, res) => {
  const id = idParam(req);
  const b = parse(doorInput.extend({ customer: createBody.shape.customer.optional(), note: z.string().trim().nullish(), discount: zMoney.optional() }), req.body);
  const data = await prisma.$transaction(async (tx) => {
    const old = await tx.estimate.findUniqueOrThrow({ where: { id } });
    if (!BEFORE_ORDER(old.status)) throw bad("Only estimates that are not yet an order can be edited");
    /**
     * Re-calculating rebuilds every line from the price list, and the price list has never
     * heard of this customer's own carving - so the figure the shop agreed for it would
     * quietly vanish from the total while the estimate still read QUOTED. Change the door
     * first, price the carving after.
     */
    if (old.customDesignSvg && old.status === "QUOTED") throw bad("This carving has already been priced. Re-price it with Review & price after changing the door.");
    const q = await quote(tx, b);
    const discount = r2(b.discount ?? n(old.discount));
    const grandTotal = r2(q.calc.totalSell - discount);
    if (grandTotal < n(old.paidAmount)) throw bad("New total is less than the amount already paid");
    await tx.estimateLine.deleteMany({ where: { estimateId: id } });
    if (b.customer) await tx.customer.update({ where: { id: old.customerId }, data: { name: b.customer.name, address: b.customer.address } });
    return tx.estimate.update({
      where: { id },
      data: {
        doorType: b.doorType, heightFt: b.heightFt, widthFt: b.widthFt, thicknessInch: q.calc.thicknessInch, withFrame: b.withFrame, withFitting: b.withFitting, withDelivery: b.withDelivery,
        woodStockId: q.stock.id, woodName: q.woodName,
        doorColorId: q.doorColor?.id ?? null, doorColorName: q.doorColor?.nameEn ?? null, doorColorCode: q.doorColor?.colorCode ?? null,
        designId: q.design?.id ?? null, designKey: q.design?.key ?? null, designName: q.design?.nameEn ?? null, designSvgUrl: q.design?.svgUrl ?? null,
        designColorId: q.design ? q.designColor?.id ?? null : null, designColorName: q.design ? q.designColor?.nameEn ?? null : null, designColorCode: q.design ? q.designColor?.colorCode ?? null : null,
        doorCft: q.calc.doorCft, frameCft: q.calc.frameCft, totalCft: q.calc.totalCft, totalCost: q.calc.totalCost, totalSell: q.calc.totalSell,
        discount, grandTotal, note: b.note ?? old.note, lines: { create: q.calc.lines.map((l, idx) => ({ ...l, sortOrder: idx })) },
      },
      include: { lines: true, customer: true, payments: true },
    });
  });
  res.json(ok(data, "Estimate updated"));
});

/** Customer info, note ar discount jekono shomoy edit (batil chara) */
r.patch("/:id/info", async (req, res) => {
  const id = idParam(req);
  const b = parse(z.object({
    customer: z.object({ name: z.string().trim().min(2), phone: z.string().trim().regex(/^01\d{9}$/, "phone 01XXXXXXXXX"), address: z.string().trim().nullish() }).optional(),
    note: z.string().trim().nullish(), discount: zMoney.optional(),
  }), req.body);
  const data = await prisma.$transaction(async (tx) => {
    const e = await tx.estimate.findUniqueOrThrow({ where: { id } });
    if (e.status === "CANCELLED") throw bad("A cancelled estimate cannot be edited");
    if (b.customer) await tx.customer.update({ where: { id: e.customerId }, data: { name: b.customer.name, phone: b.customer.phone, address: b.customer.address ?? null } });
    const discount = b.discount ?? n(e.discount);
    const grandTotal = r2(n(e.totalSell) - discount);
    if (grandTotal < n(e.paidAmount)) throw bad("After this discount the total would be less than the amount already paid");
    return tx.estimate.update({ where: { id }, data: { note: b.note === undefined ? e.note : b.note, discount, grandTotal } });
  });
  res.json(ok(data, "Estimate updated"));
});

// QUOTED sits between NEW and CONFIRMED: the shop has sent a real price and the customer
// has not accepted it yet. Stock is untouched until it becomes an order, exactly as NEW.
const FLOW = ["NEW", "QUOTED", "CONFIRMED", "IN_PRODUCTION", "READY", "DELIVERED", "COMPLETED"] as const;
const BEFORE_ORDER = (st: string) => st === "NEW" || st === "QUOTED";
/**
 * Messages are written inside the transaction and sent after it.
 *
 * Inside, so a message never exists for an order that failed to save. After, so a slow or
 * broken SMS gateway cannot hold a database transaction open or roll an order back.
 */
type Pending = { id: number; customerId: number; text: string };
/** Write the message now (inside the caller's transaction) and text it after. */
async function say(tx: Tx, pending: Pending[], customerId: number, estimateId: number, m: Message) {
  const id = await notify(tx, customerId, estimateId, m);
  pending.push({ id, customerId, text: m.bodyBn });
}
async function flush(pending: Pending[]) {
  for (const p of pending) {
    const c = await prisma.customer.findUnique({ where: { id: p.customerId }, select: { phone: true } });
    await sendSms(prisma, p.id, c?.phone, p.text);
  }
}

r.patch("/:id/status", async (req, res) => {
  const id = idParam(req);
  const { status } = parse(z.object({ status: z.enum(["NEW", "QUOTED", "CONFIRMED", "IN_PRODUCTION", "READY", "DELIVERED", "COMPLETED", "CANCELLED"]) }), req.body);
  const pending: Pending[] = [];
  const data = await prisma.$transaction(async (tx) => {
    const e = await tx.estimate.findUniqueOrThrow({ where: { id } });
    if (e.status === "CANCELLED") throw bad("A cancelled estimate cannot change status");
    if (e.status === status) return e;
    if (status === "CANCELLED") {
      if (!BEFORE_ORDER(e.status)) await returnForEstimate(tx, id);
      return tx.estimate.update({ where: { id }, data: { status } });
    }
    if (FLOW.indexOf(status as (typeof FLOW)[number]) < FLOW.indexOf(e.status as (typeof FLOW)[number])) throw bad("Status cannot move backwards");
    /**
     * QUOTED means "the shop has sent a real price", and the only thing that can make that
     * true is Review & price. Letting this route set it would mark an unpriced carving as
     * quoted while its figure was still the software's guess - and the customer's accept
     * button only looks at the status.
     */
    if (status === "QUOTED") throw bad("Use Review & price to send the customer a price");

    if (BEFORE_ORDER(e.status) && !BEFORE_ORDER(status)) {
      /**
       * A carving nobody has priced cannot be sold.
       *
       * The figure on such an estimate is one this software guessed off the gallery, and
       * the customer was told in as many words that it is not final. Turning it into an
       * order here would make that guess the agreed price behind the customer's back. So
       * the carving is priced first (Review & price), which sends the real figure to their
       * page, and it becomes an order when they accept it - or when they ring up and the
       * shop confirms it for them, which is this same call, one step later.
       */
      if (e.needsQuote) throw bad("Send the customer a price for their carving first — Review & price. It becomes an order once they accept it.");
      await consumeForEstimate(tx, id, e.woodStockId, n(e.totalCft));
      await tx.estimate.update({ where: { id }, data: { confirmedAt: new Date() } });
      // The jobs go out with the order, so a confirmed door is never sitting unassigned.
      await assignWork(tx, id);
      await say(tx, pending, e.customerId, id, MSG.confirmed(e.estimateNo));
    }

    /**
     * Whatever the door passed through on the way, what matters is where it has landed.
     * A walk-in paid for and carried out the same day jumps NEW straight to DELIVERED, and
     * that door is just as finished as one that crawled through every step - so this is
     * kept out of the branch above, which only handles the crossing into being an order.
     */
    if (status === "DELIVERED") {
      await releaseWork(tx, id);
      await say(tx, pending, e.customerId, id, MSG.delivered(e.estimateNo));
    } else if (status === "READY") {
      await say(tx, pending, e.customerId, id, MSG.ready(e.estimateNo));
    }
    return tx.estimate.update({ where: { id }, data: { status } });
  });
  await flush(pending);
  res.json(ok(data, status === "CONFIRMED" ? "Confirmed. Wood deducted from stock, and the work has been given out" : status === "CANCELLED" ? "Cancelled" : "Status updated"));
});

/**
 * The review: the shop puts a real price on a carving the customer traced themselves.
 *
 * Only the carving moves. Wood, colour, frame and labour were priced off the shop's own
 * rates the moment the request arrived and are not up for negotiation - which is the whole
 * reason this screen exists rather than a free-text "final total" box. The carving line and
 * its labour line are rewritten, the totals follow, and `needsQuote` clears, so every screen
 * stops calling the price an estimate.
 *
 * The customer is not charged for the shop thinking about it: nothing is deducted from
 * stock here. That happens only when the customer accepts and it becomes an order.
 */
r.post("/:id/quote", async (req, res) => {
  const id = idParam(req);
  const pending: Pending[] = [];
  const b = parse(z.object({
    carving: zMoney, labour: zMoney.default(0),
    /**
     * How many men the carving takes, and for how long.
     *
     * A gallery carving carries this from the price list, but one the customer traced has
     * never been seen before - the only person who can say is whoever is looking at it and
     * putting a price on it, which is what this screen is. So it is asked for here, beside
     * the money, and lands on the carving labour line like any other job's plan.
     */
    workers: z.coerce.number().int().min(0).max(99).default(0),
    days: z.coerce.number().int().min(0).max(365).default(0),
    note: z.string().trim().max(1000).nullish(),
    /** Tick to put this carving into the gallery, so the next customer can be shown it. */
    keepInGallery: zBool.default(false),
  }), req.body);

  const data = await prisma.$transaction(async (tx) => {
    const e = await tx.estimate.findUniqueOrThrow({ where: { id }, include: { lines: { orderBy: { sortOrder: "asc" } } } });
    if (!BEFORE_ORDER(e.status)) throw bad("This is already an order, so its price cannot be re-quoted");
    if (!e.customDesignSvg) throw bad("This estimate has no carving of the customer's own to price");

    const name = e.customDesignName ?? "Your carving";
    // Rewrite the two estimated lines in place; everything else on the sheet is untouched.
    const rest = e.lines.filter((l) => !l.name.endsWith("(estimate)"));
    // workers/days come across untouched: re-pricing the carving must not wipe the plan
    // (or the man already on the job) off door making, polish and the frame.
    const keep = rest.map((l, idx) => ({ type: l.type, name: l.name, quantity: l.quantity, unitCost: l.unitCost, unitSell: l.unitSell, cost: l.cost, sell: l.sell, sortOrder: idx,
      workers: l.workers, days: l.days, workerId: l.workerId, startedAt: l.startedAt, doneAt: l.doneAt }));
    const priced = [
      { type: "DESIGN" as const, name: `Carving: ${name}`, quantity: 1, unitCost: 0, unitSell: r2(b.carving), cost: 0, sell: r2(b.carving), sortOrder: keep.length },
      ...(b.labour > 0 || b.workers || b.days
        ? [{ type: "LABOUR" as const, name: `Carving labour: ${name}`, quantity: 1, unitCost: 0, unitSell: r2(b.labour), cost: 0, sell: r2(b.labour), sortOrder: keep.length + 1,
            workers: b.workers, days: b.days }]
        : []),
    ];
    const totalSell = r2([...keep, ...priced].reduce((a, l) => a + Number(l.sell), 0));
    const grandTotal = r2(totalSell - n(e.discount));
    if (grandTotal < n(e.paidAmount)) throw bad("The new total is less than what the customer has already paid");

    if (b.keepInGallery) {
      await tx.doorDesign.create({
        data: {
          key: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          nameEn: name, nameBn: name, noteEn: "From a customer photo",
          origin: "UPLOADED", visibility: "LIBRARY", allowDouble: true, active: true,
          costSingle: 0, costDouble: 0, profitPercent: 0, sellSingle: r2(b.carving), sellDouble: r2(b.carving),
          labourCostSingle: 0, labourCostDouble: 0, labourProfitPercent: 0, labourSellSingle: r2(b.labour), labourSellDouble: r2(b.labour),
        },
      });
    }

    await tx.estimateLine.deleteMany({ where: { estimateId: id } });
    const up = await tx.estimate.update({
      where: { id },
      data: {
        status: "QUOTED", quotedAt: new Date(), needsQuote: false,
        totalSell, grandTotal,
        note: b.note ? [e.note, b.note].filter(Boolean).join("\n") : e.note,
        lines: { create: [...keep, ...priced] },
      },
      include: { lines: { orderBy: { sortOrder: "asc" } }, customer: true },
    });
    // The whole point of the screen: the customer is told, on their page and by text.
    await say(tx, pending, e.customerId, id, MSG.quoted(e.estimateNo, `৳${Math.round(grandTotal).toLocaleString("en-IN")}`));
    return up;
  });
  await flush(pending);
  res.json(ok(data, "Final price sent to the customer"));
});

/* ---------------------------------------------------------------- the work sheet ----
 * Which job, how many men, who is on it, how far along.
 *
 * It lives on the order rather than on a workshop screen of its own, because that is where
 * the question is asked: you are looking at a door and you want to know where it has got
 * to. The plan - workers and days - was copied onto the line when the estimate was saved,
 * so changing a rate next month cannot rewrite what a door already being made was sold as.
 * None of this touches money: a late job does not change a price.
 */
export const stepOf = (l: { id: number; name: string; type: string; workers: number; days: number; startedAt: Date | null; doneAt: Date | null; worker?: { id: number; name: string } | null }) => ({
  lineId: l.id, job: l.name, workers: l.workers, days: l.days,
  workerId: l.worker?.id ?? null, workerName: l.worker?.name ?? null,
  startedAt: l.startedAt, doneAt: l.doneAt,
  state: l.doneAt ? "DONE" : l.startedAt ? "DOING" : "TODO",
});
/**
 * What counts as a job.
 *
 * Every LABOUR line is one. A colour line is one only when the shop gave that colour a
 * crew - a shop that prices its painting through the Labour rates leaves the colour at 0
 * men and gets no extra step, which is the old behaviour exactly.
 *
 * The DESIGN line is never a job: it is the price of the pattern itself, while the carving
 * *labour* line beside it is the work. Counting both would put a phantom step on the work
 * sheet and show the customer the same carving twice.
 */
export const isWork = (l: { type: string; workers?: number; days?: number }) =>
  l.type === "LABOUR" || ((l.type === "DOOR_COLOR" || l.type === "DESIGN_COLOR") && !!((l.workers ?? 0) || (l.days ?? 0)));

/** The same rule, as a Prisma filter. */
export const WORK_WHERE = {
  OR: [
    { type: "LABOUR" as const },
    { type: { in: ["DOOR_COLOR", "DESIGN_COLOR"] as const[] as ("DOOR_COLOR" | "DESIGN_COLOR")[] }, OR: [{ workers: { gt: 0 } }, { days: { gt: 0 } }] },
  ],
};

r.patch("/lines/:id", async (req, res) => {
  const id = idParam(req);
  const b = parse(z.object({
    workerId: z.coerce.number().int().positive().nullable().optional(),
    state: z.enum(["TODO", "DOING", "DONE"]).optional(),
  }), req.body);

  const line = await prisma.estimateLine.findUniqueOrThrow({ where: { id }, include: { estimate: { select: { status: true } } } });
  if (line.estimate.status === "CANCELLED") throw bad("This order is cancelled");
  if (!isWork(line)) throw bad("Only a job can be given to somebody");

  const data: { workerId?: number | null; startedAt?: Date | null; doneAt?: Date | null } = {};
  if (b.workerId !== undefined) {
    if (b.workerId !== null) {
      const w = await prisma.worker.findUnique({ where: { id: b.workerId } });
      if (!w) throw bad("No such worker");
      if (!w.active) throw bad(`${w.name} is not on the list any more`);
    }
    data.workerId = b.workerId;
  }
  // The three states are only the two timestamps, so they cannot contradict each other:
  // nothing is finished before it started, and nothing started is also not started.
  if (b.state === "TODO") { data.startedAt = null; data.doneAt = null; }
  if (b.state === "DOING") { data.startedAt = line.startedAt ?? new Date(); data.doneAt = null; }
  if (b.state === "DONE") { data.startedAt = line.startedAt ?? new Date(); data.doneAt = new Date(); }

  const up = await prisma.estimateLine.update({ where: { id }, data, include: { worker: { select: { id: true, name: true } } } });
  res.json(ok(stepOf(up), "Saved"));
});

r.post("/:id/payments", async (req, res) => {
  const id = idParam(req);
  const b = parse(z.object({ amount: zMoney.positive("amount is required"), method: z.enum(["CASH", "BANK", "BKASH", "NAGAD", "OTHER"]).default("CASH"), paidAt: z.coerce.date().optional(), note: z.string().trim().nullish() }), req.body);
  const data = await prisma.$transaction(async (tx) => {
    const e = await tx.estimate.findUniqueOrThrow({ where: { id } });
    if (e.status === "CANCELLED") throw bad("Cannot add payment to a cancelled estimate");
    const paid = r2(n(e.paidAmount) + b.amount);
    if (paid > n(e.grandTotal)) throw new HttpError(400, `Only ${r2(n(e.grandTotal) - n(e.paidAmount))} taka is due, cannot take more`);
    await tx.estimatePayment.create({ data: { ...b, estimateId: id } });
    return tx.estimate.update({ where: { id }, data: { paidAmount: paid } });
  });
  res.status(201).json(ok({ ...data, due: r2(n(data.grandTotal) - n(data.paidAmount)) }, "Payment added"));
});

/**
 * Remove an estimate or order from the books entirely.
 *
 * Cancelling and deleting answer two different questions. Cancelling says "this happened and
 * came to nothing" - the row stays, the number stays used, and next year you can still see
 * why. Deleting says "this should never have been here": a test row, a duplicate, an order
 * typed against the wrong customer. There is no honest way to fix those by leaving them on
 * the screen, so this takes them out.
 *
 * Whatever it took goes back first. Wood the order consumed returns to the batches it came
 * out of, at the cost it left at, so the stock figures do not quietly drift every time
 * somebody tidies up. Lines, payments and messages go with the row (the schema cascades
 * them); the money is gone because the order is gone, which is the point - if the customer
 * really paid, cancel it instead so the payment still has something to hang on.
 */
r.delete("/:id", async (req, res) => {
  const id = idParam(req);
  const e = await prisma.$transaction(async (tx) => {
    const found = await tx.estimate.findUniqueOrThrow({ where: { id } });
    await returnForEstimate(tx, id);
    await tx.estimate.delete({ where: { id } });
    return found;
  });
  res.json(ok({ id, estimateNo: e.estimateNo }, `${e.estimateNo} deleted. Any wood it took has gone back to stock.`));
});

r.delete("/payments/:id", async (req, res) => {
  const id = idParam(req);
  await prisma.$transaction(async (tx) => {
    const p = await tx.estimatePayment.delete({ where: { id } });
    const e = await tx.estimate.findUniqueOrThrow({ where: { id: p.estimateId } });
    await tx.estimate.update({ where: { id: e.id }, data: { paidAmount: r2(n(e.paidAmount) - n(p.amount)) } });
  });
  res.json(ok(null, "Payment deleted"));
});

export default r;
