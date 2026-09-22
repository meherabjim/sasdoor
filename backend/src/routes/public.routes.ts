import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { bad, ok, parse } from "../lib/http";
import { n, r2 } from "../lib/money";
import { optionalAuth, requireAuth } from "../middleware/auth";
import { consumeForEstimate } from "../lib/stockService";
import { assignWork } from "../lib/assignWork";
import { MSG, notify, sendSms } from "../lib/notify";
import { createEstimate, customCarving, doorInput, quote, withCustomCarving } from "./estimates.routes";
import { getSettings } from "./settings.routes";

const r = Router();

/** Everything the Door Designer needs. Only SELL prices are exposed here. */
r.get("/designer", async (_req, res) => {
  const [s, stocks, colors, designs] = await Promise.all([
    getSettings(),
    prisma.woodStock.findMany({ where: { woodType: { active: true } }, include: { woodType: true, batches: { where: { status: { not: "DONE" } } } } }),
    prisma.color.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    // A customer's photo stays private to its own estimate until the owner adds it to the gallery.
    prisma.doorDesign.findMany({ where: { active: true, visibility: "LIBRARY" }, orderBy: { sortOrder: "asc" } }),
  ]);
  res.json(ok({
    settings: {
      doorThicknessInch: s.doorThicknessInch, frameWidthInch: s.frameWidthInch, frameThicknessInch: s.frameThicknessInch, wastagePercent: s.wastagePercent,
      minHeightFt: s.minHeightFt, maxHeightFt: s.maxHeightFt, singleMinWidthFt: s.singleMinWidthFt, singleMaxWidthFt: s.singleMaxWidthFt,
      doubleMinWidthFt: s.doubleMinWidthFt, doubleMaxWidthFt: s.doubleMaxWidthFt,
    },
    woods: stocks
      .map((st) => ({ id: st.id, nameEn: st.woodType.nameEn, nameBn: st.woodType.nameBn, source: st.source, sellingPricePerCft: st.sellingPricePerCft, availableCft: r2(st.batches.reduce((a, b) => a + n(b.remainingCft), 0)) }))
      .filter((w) => w.availableCft > 0),
    colors: colors.map((c) => ({ id: c.id, type: c.type, nameEn: c.nameEn, nameBn: c.nameBn, colorCode: c.colorCode, isToneOnTone: c.isToneOnTone, suggestions: c.suggestions, sellSingle: c.sellSingle, sellDouble: c.sellDouble })),
    designs: designs.map((d) => ({ id: d.id, key: d.key, nameEn: d.nameEn, nameBn: d.nameBn, noteEn: d.noteEn, noteBn: d.noteBn, svgUrl: d.svgUrl, allowDouble: d.allowDouble, sellSingle: r2(n(d.sellSingle) + n(d.labourSellSingle)), sellDouble: r2(n(d.sellDouble) + n(d.labourSellDouble)) })),
  }));
});

/**
 * Public quote: sell side only.
 *
 * Cost, margin and what the shop pays its carvers are never in this response. The customer
 * sees the price of each thing and the total, and nothing about how it was arrived at.
 *
 * A carving the customer traced from their own photo is priced here too, from the shop's
 * own gallery, and comes back flagged `estimated` - the website leans on that flag to say
 * out loud that this one figure is not final.
 */
r.post("/quote", async (req, res) => {
  const b = parse(doorInput.extend({ custom: customCarving.nullish() }), req.body);
  const q = await quote(prisma, b);
  let estimated = false;
  if (b.custom && !b.designId) {
    const out = await withCustomCarving(prisma, q.calc, b.custom, b.doorType === "DOUBLE", (b.custom.name ?? "").trim() || "Your carving");
    estimated = out.est.total > 0;
  }
  res.json(ok({
    doorCft: q.calc.doorCft, frameCft: q.calc.frameCft, totalCft: q.calc.totalCft, bigDoor: q.calc.bigDoor, enoughStock: q.enoughStock,
    // Materials one by one, labour as one figure - the same split the customer's own page
    // and the printed sheet use. See customerLines below for why.
    lines: [
      ...q.calc.lines.filter((l) => l.type !== "LABOUR").map((l) => ({ type: l.type, name: l.name, sell: l.sell, estimated: l.name.endsWith("(estimate)") })),
      ...(() => {
        const work = q.calc.lines.filter((l) => l.type === "LABOUR");
        const sell = r2(work.reduce((a, l) => a + n(l.sell), 0));
        return sell > 0 ? [{ type: "LABOUR", name: "Labour (all work)", sell, estimated: work.some((l) => l.name.endsWith("(estimate)")) }] : [];
      })(),
    ],
    total: q.calc.totalSell,
    /** True when one line on this quote is an estimate the shop has not confirmed. */
    estimated,
  }));
});

/** Website "Order korte chai" (logged in or guest) */
r.post("/orders", optionalAuth, async (req, res) => {
  const b = parse(doorInput.extend({
    customer: z.object({ name: z.string().trim().min(2), phone: z.string().trim().regex(/^01\d{9}$/, "phone 01XXXXXXXXX"), address: z.string().trim().nullish() }),
    note: z.string().trim().max(1000).nullish(),
    advance: z.coerce.number().min(0).optional(),
    paymentMethod: z.enum(["BKASH", "NAGAD", "BANK", "CASH"]).optional(),
    trxId: z.string().trim().max(60).nullish(),
    /** A carving traced from the customer's own photo, if they used one. */
    custom: customCarving.nullish(),
  }), req.body);
  // Online payments are not verified here: they are written into the note so the admin can check and add the payment.
  const { advance, paymentMethod, trxId, custom, ...order } = b;
  const payNote = advance && advance > 0 ? `Customer reports payment: ${advance} taka via ${paymentMethod ?? "CASH"}${trxId ? ` (TrxID ${trxId})` : ""}. Please verify and add it in Payments.` : null;
  /**
   * The shop owner using their own website is not a customer.
   *
   * The review step exists for one reason: a carving nobody has priced, ordered by someone
   * who cannot price it. The owner can. When they sit with a customer and build the door on
   * the public site - which is the version with no cost on screen, so it is the one to turn
   * towards a customer - there is nobody to wait for. So the request skips the review and is
   * an ordinary estimate they can price and confirm from the panel straight away.
   */
  const byAdmin = req.user?.role === "SUPER_ADMIN";
  const e = await createEstimate({
    ...order,
    custom: custom ?? null,
    skipReview: byAdmin,
    note: [order.note, payNote].filter(Boolean).join("\n") || null,
    source: "WEBSITE", userId: req.user?.id,
  });
  res.status(201).json(ok(
    { estimateNo: e.estimateNo, total: e.grandTotal, needsQuote: e.needsQuote },
    e.needsQuote
      ? "Request sent. Your carving has never been priced before, so we will check it and send you the final price."
      : "Your request has been sent. We will contact you soon.",
  ));
});

r.post("/book-visit", optionalAuth, async (req, res) => {
  const b = parse(z.object({ name: z.string().trim().min(2), phone: z.string().trim().regex(/^01\d{9}$/, "phone 01XXXXXXXXX"), address: z.string().trim().nullish(), preferredDate: z.coerce.date().nullish(), note: z.string().trim().max(1000).nullish() }), req.body);
  const customer = await prisma.customer.upsert({ where: { phone: b.phone }, update: {}, create: { name: b.name, phone: b.phone, address: b.address } });
  res.status(201).json(ok(await prisma.bookVisitRequest.create({ data: { ...b, customerId: customer.id } }), "Visit request sent"));
});

/** Website text, images, hidden sections, portfolio (public) */
r.get("/content", async (req, res) => {
  const items = await prisma.siteContent.findMany({ where: req.query.page ? { page: String(req.query.page) } : {}, orderBy: { sortOrder: "asc" } });
  res.json(ok(items));
});

/**
 * The price list as the customer is shown it: every material on its own line, and all the
 * labour on one.
 *
 * Wood, the door colour, the carving, the carving colour - a customer can look at each of
 * those, see what it is, and decide they want a cheaper wood or no carving. That is a real
 * choice and the price beside it helps them make it. Labour is not like that. The shop's
 * working split - so much for the carving hand, so much for making, so much for polish -
 * is how the SHOP prices a door, and handing it over invites an argument about each piece
 * ("why is polishing that much?") over a number the customer cannot change anyway: they
 * cannot buy a door with the polishing left out. So it goes out as one figure, which is
 * the one thing about it they can actually weigh.
 *
 * Nothing is hidden and nothing is moved: every taka is still in the total, and the shop's
 * own screen keeps the full split, line by line, with the crew on each.
 */
const customerLines = (lines: { type: string; name: string; sell: unknown }[]) => {
  const out = lines.filter((l) => l.type !== "LABOUR").map((l) => ({ name: l.name, nameBn: null as string | null, sell: l.sell }));
  const work = r2(lines.filter((l) => l.type === "LABOUR").reduce((a, l) => a + n(l.sell), 0));
  if (work > 0) out.push({ name: "Labour (all work)", nameBn: "মিস্ত্রি খরচ (সব মিলিয়ে)", sell: work });
  return out;
};

/** Logged-in customer: own estimates (sell side only, read-only) */
r.get("/my/estimates", requireAuth, async (req, res) => {
  const c = await prisma.customer.findUnique({ where: { userId: req.user!.id } });
  if (!c) return res.json(ok([]));
  const list = await prisma.estimate.findMany({ where: { customerId: c.id }, include: { lines: { orderBy: { sortOrder: "asc" } }, payments: true }, orderBy: { createdAt: "desc" } });
  res.json(ok(list.map((e) => ({
    id: e.id, estimateNo: e.estimateNo, status: e.status, createdAt: e.createdAt, doorType: e.doorType, heightFt: e.heightFt, widthFt: e.widthFt,
    woodName: e.woodName, doorColorName: e.doorColorName, doorColorCode: e.doorColorCode, designKey: e.designKey, designName: e.designName, designSvgUrl: e.designSvgUrl, designColorName: e.designColorName, designColorCode: e.designColorCode,
    // the carving they traced themselves, so their own page can draw the door they designed
    customDesignSvg: e.customDesignSvg, customDesignName: e.customDesignName,
    needsQuote: e.needsQuote, quotedAt: e.quotedAt,
    withFrame: e.withFrame, withFitting: e.withFitting, withDelivery: e.withDelivery, totalCft: e.totalCft,
    lines: customerLines(e.lines), discount: e.discount, grandTotal: e.grandTotal, paidAmount: e.paidAmount,
    due: r2(n(e.grandTotal) - n(e.paidAmount)), payments: e.payments.map((p) => ({ amount: p.amount, method: p.method, paidAt: p.paidAt })),
    /**
     * How their door is coming along - and deliberately nothing more.
     *
     * The shop's own screen shows how many men each job takes and which of them is on it.
     * None of that is here. A customer who is told "3 men, 4 days" has been handed the
     * shop's cost structure and an invitation to argue about it, and has been promised a
     * headcount the shop may have to change on the day. What they actually want to know is
     * where their door has got to, so that is what they get: the job, and whether it is
     * waiting, being done, or finished. No names, no numbers, no dates that were guesses.
     */
    steps: e.status === "CONFIRMED" || e.status === "IN_PRODUCTION" || e.status === "READY" || e.status === "DELIVERED" || e.status === "COMPLETED"
      ? e.lines.filter((l) => l.type === "LABOUR")
        .map((l) => ({ job: l.name.replace(/^Carving labour: /, "Carving: "), state: l.doneAt ? "DONE" : l.startedAt ? "DOING" : "TODO", doneAt: l.doneAt }))
      : [],
  }))));
});
/**
 * What the shop has told this customer, newest first.
 *
 * The same rows a text message was made from, so a customer whose phone missed the SMS -
 * or a shop with no gateway at all - still has the message. Reading them marks them read.
 */
r.get("/my/notifications", requireAuth, async (req, res) => {
  const c = await prisma.customer.findUnique({ where: { userId: req.user!.id } });
  if (!c) return res.json(ok([]));
  const list = await prisma.notification.findMany({ where: { customerId: c.id }, orderBy: { id: "desc" }, take: 50, include: { estimate: { select: { estimateNo: true } } } });
  res.json(ok(list.map((x) => ({
    id: x.id, titleEn: x.titleEn, titleBn: x.titleBn, bodyEn: x.bodyEn, bodyBn: x.bodyBn,
    estimateNo: x.estimate?.estimateNo ?? null, createdAt: x.createdAt, readAt: x.readAt,
  }))));
});

r.post("/my/notifications/read", requireAuth, async (req, res) => {
  const c = await prisma.customer.findUnique({ where: { userId: req.user!.id } });
  if (c) await prisma.notification.updateMany({ where: { customerId: c.id, readAt: null }, data: { readAt: new Date() } });
  res.json(ok(null));
});

/**
 * The customer accepts the price the shop sent back, and it becomes an order.
 *
 * This is the only place a customer may move their own estimate, and it moves exactly one
 * step: a quote they have been sent becomes an order. They cannot price it, cannot reopen
 * it, and cannot touch anyone else's - the estimate is looked up through their own customer
 * record, so an id belonging to somebody else simply is not found.
 */
r.post("/my/estimates/:id/accept", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const c = await prisma.customer.findUnique({ where: { userId: req.user!.id } });
  if (!c) throw bad("No estimates found for this account");
  const e = await prisma.estimate.findFirst({ where: { id, customerId: c.id } });
  if (!e) throw bad("Estimate not found");
  if (e.status === "CONFIRMED" || e.status === "IN_PRODUCTION" || e.status === "READY" || e.status === "DELIVERED" || e.status === "COMPLETED")
    return res.json(ok({ id: e.id, status: e.status }, "This is already an order"));
  if (e.status === "CANCELLED") throw bad("This request was cancelled");
  if (e.status !== "QUOTED") throw bad("The shop has not sent you a final price for this one yet");
  // Belt and braces: QUOTED should already mean priced, but the wood leaves stock here, so
  // this asks the question itself rather than trusting a status somebody else wrote.
  if (e.needsQuote) throw bad("The shop has not sent you a final price for this one yet");

  /**
   * This is the ordinary way a website door becomes an order, so everything confirming does
   * has to happen here too - not only on the admin's own Confirm button. The work is handed
   * out and the customer is told, exactly as if the shop had pressed it.
   */
  let noteId = 0;
  const out = await prisma.$transaction(async (tx) => {
    /**
     * The status was read before this transaction opened, so two taps on a slow phone could
     * both have seen QUOTED and both be here - and both would take the wood. The claim is
     * made first, conditionally: whoever's update actually changes a row owns the order,
     * and the other one finds nothing to change and backs out having taken nothing.
     */
    const claimed = await tx.estimate.updateMany({
      where: { id: e.id, status: "QUOTED" },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    });
    if (!claimed.count) return null;
    await consumeForEstimate(tx, e.id, e.woodStockId, n(e.totalCft));
    await assignWork(tx, e.id);
    noteId = await notify(tx, e.customerId, e.id, MSG.confirmed(e.estimateNo));
    return tx.estimate.findUniqueOrThrow({ where: { id: e.id } });
  });
  if (!out) return res.json(ok({ id: e.id, status: "CONFIRMED" }, "This is already an order"));
  await sendSms(prisma, noteId, c.phone, MSG.confirmed(out.estimateNo).bodyBn);
  res.json(ok({ id: out.id, estimateNo: out.estimateNo, status: out.status }, "Order placed. We will contact you shortly."));
});

/**
 * The customer says no to the price.
 *
 * The other half of accept, and it has to exist: a price you can only agree to is not a
 * price, it is a bill. Nothing has left stock at this point - the request simply ends, and
 * the shop sees it as cancelled rather than sitting in the list for ever waiting on
 * somebody who decided weeks ago.
 *
 * Only their own, only one that is still waiting. An order that is already being made
 * cannot be called off here; that is a conversation with the shop, not a button.
 */
r.post("/my/estimates/:id/decline", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const c = await prisma.customer.findUnique({ where: { userId: req.user!.id } });
  if (!c) throw bad("No estimates found for this account");
  const e = await prisma.estimate.findFirst({ where: { id, customerId: c.id } });
  if (!e) throw bad("Estimate not found");
  if (e.status === "CANCELLED") return res.json(ok({ id: e.id, status: e.status }, "This was already cancelled"));
  if (e.status !== "NEW" && e.status !== "QUOTED")
    throw bad("This is already an order. Please call the shop to change it.");

  const done = await prisma.estimate.updateMany({ where: { id: e.id, status: { in: ["NEW", "QUOTED"] } }, data: { status: "CANCELLED" } });
  if (!done.count) return res.json(ok({ id: e.id, status: "CANCELLED" }, "This was already cancelled"));
  res.json(ok({ id: e.id, status: "CANCELLED" }, "Cancelled. Design another door whenever you like."));
});

r.get("/my/visits", requireAuth, async (req, res) => {
  const c = await prisma.customer.findUnique({ where: { userId: req.user!.id } });
  res.json(ok(c ? await prisma.bookVisitRequest.findMany({ where: { customerId: c.id }, orderBy: { createdAt: "desc" } }) : []));
});

export default r;
