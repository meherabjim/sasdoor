/**
 * SAS DOOR seed: Super Admin + default price lists.
 * Safe to run again: existing rows are NOT overwritten (admin edits stay).
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const r2 = (v: number) => Math.round(v * 100) / 100;
const price = (costSingle: number, costDouble: number, profitPercent: number) => ({
  costSingle, costDouble, profitPercent, sellSingle: r2(costSingle * (1 + profitPercent / 100)), sellDouble: r2(costDouble * (1 + profitPercent / 100)),
});

const LOCAL_WOODS: [string, string, "DOOR" | "FRAME" | "BOTH", number][] = [
  ["Teak (Deshi)", "সেগুন (দেশি)", "BOTH", 5500], ["Gamari", "গামারি", "DOOR", 2800], ["Mahogany", "মেহগনি", "BOTH", 3500],
  ["Garjan", "গর্জন", "FRAME", 2500], ["Sal", "শাল", "FRAME", 3000], ["Chapalish", "চাপালিশ", "DOOR", 2800],
  ["Jarul", "জারুল", "DOOR", 2500], ["Koroi", "কড়ই", "DOOR", 2000], ["Jackfruit", "কাঁঠাল", "DOOR", 3000],
  ["Mango", "আম", "DOOR", 1200], ["Acacia", "আকাশমনি", "DOOR", 1800], ["Chikrassy", "চিকরাশি", "DOOR", 3200],
  ["Telsur", "তেলসুর", "BOTH", 2800], ["Sundri", "সুন্দরী", "FRAME", 3000],
];
const FOREIGN_WOODS: [string, string, string[], "DOOR" | "FRAME" | "BOTH", number][] = [
  ["Burma Teak", "বার্মা টিক", ["Myanmar"], "BOTH", 9000],
  ["African Teak", "আফ্রিকান টিক", ["Ghana", "Nigeria", "Benin", "Togo", "Ivory Coast", "Tanzania"], "BOTH", 6500],
  ["Latin American Teak", "ল্যাটিন আমেরিকান টিক", ["Brazil", "Ecuador", "Costa Rica", "Panama"], "DOOR", 6000],
  ["Meranti", "মেরান্টি", ["Malaysia", "Indonesia"], "DOOR", 3800], ["Keruing", "কেরুইং", ["Malaysia", "Indonesia"], "FRAME", 3200],
  ["Kapur", "কাপুর", ["Malaysia", "Indonesia"], "FRAME", 3500], ["Balau / Bangkirai", "বালাউ", ["Malaysia", "Indonesia"], "FRAME", 4000],
  ["Merbau", "মেরবাউ", ["Indonesia", "Papua New Guinea"], "DOOR", 5500], ["Sapele", "সাপেলি", ["Cameroon", "Congo", "Ghana"], "DOOR", 4500],
  ["Iroko", "ইরোকো", ["Nigeria", "Ghana", "Cameroon"], "BOTH", 5000], ["Oak", "ওক", ["USA", "Europe"], "DOOR", 7000],
  ["Ash", "অ্যাশ", ["USA", "Europe"], "DOOR", 6000], ["Beech", "বিচ", ["Europe"], "DOOR", 5500],
  ["Walnut", "ওয়ালনাট", ["USA"], "DOOR", 9500], ["Pine", "পাইন", ["New Zealand", "Chile"], "DOOR", 2500],
];
const DOOR_COLORS: [string, string, string, number, number, string[]][] = [
  ["Natural Teak", "ন্যাচারাল টিক", "#B07A45", 1500, 2800, ["Tone-on-tone", "Gold", "Walnut"]],
  ["Honey Oak", "হানি ওক", "#C89A5E", 2000, 3600, ["Walnut", "Tone-on-tone", "Black"]],
  ["Walnut", "ওয়ালনাট", "#6E4A2E", 2000, 3600, ["Gold", "Antique Brass", "Tone-on-tone"]],
  ["Dark Walnut", "ডার্ক ওয়ালনাট", "#4A3021", 2200, 4000, ["Gold", "Antique Brass", "Tone-on-tone"]],
  ["Mahogany Red", "মেহগনি রেড", "#7A2E22", 2200, 4000, ["Gold", "Tone-on-tone", "Antique Brass"]],
  ["Espresso", "এসপ্রেসো", "#3A2A22", 2500, 4500, ["Gold", "Silver", "Tone-on-tone"]],
  ["Matte Black", "ম্যাট ব্ল্যাক", "#252525", 2500, 4500, ["Gold", "Silver", "Antique Brass"]],
  ["Pure White", "পিওর হোয়াইট", "#EEECE7", 3000, 5500, ["Gold", "Walnut", "Black"]],
  ["Ivory", "আইভরি", "#E4D9C2", 3000, 5500, ["Antique Brass", "Walnut", "Tone-on-tone"]],
  ["Stone Grey", "স্টোন গ্রে", "#8F9290", 3000, 5500, ["Silver", "Black", "White"]],
];
const DESIGN_COLORS: [string, string, string, number, number, boolean][] = [
  ["Tone-on-tone", "টোন-অন-টোন", "#000000", 0, 0, true], ["Gold", "গোল্ড", "#C9A34E", 2500, 4500, false],
  ["Antique Brass", "অ্যান্টিক ব্রাস", "#9B7B3F", 2000, 3600, false], ["Silver", "সিলভার", "#C3C6C8", 2000, 3600, false],
  ["Black", "কালো", "#1D1B19", 1000, 1800, false], ["White", "সাদা", "#F4F2EE", 1000, 1800, false], ["Walnut", "ওয়ালনাট", "#5C3B24", 800, 1500, false],
];
// key, nameEn, nameBn, note, costS, costD, labourS, labourD, allowDouble
/** key, name, bangla, note, cost single, cost double, labour single, labour double, allows double,
 *  men+days single, men+days double. The crew is what the carving hand actually takes - it is
 *  never part of a price, it is what the work sheet hands out and what tells you the shop is full. */
const DESIGNS: [string, string, string, string, number, number, number, number, boolean, [number, number], [number, number]][] = [
  ["royal", "Royal Arch Scroll", "রয়্যাল আর্চ স্ক্রল", "Heavy carving", 12000, 22000, 6000, 11000, true, [2, 6], [3, 10]],
  ["classic", "Classic Raised Panel", "ক্লাসিক রেইজড প্যানেল", "Raised panels", 5000, 9000, 3000, 5500, true, [1, 3], [2, 5]],
  ["medallion", "Floral Center Medallion", "ফুলেল মেডালিয়ন", "Centre flower", 8000, 15000, 4500, 8000, true, [2, 4], [2, 7]],
  ["vine", "Vine Border", "লতা-পাতা বর্ডার", "Vine border", 7000, 13000, 4000, 7500, true, [1, 4], [2, 6]],
  ["twin", "Twin Panel Scroll", "টুইন প্যানেল স্ক্রল", "Two arched panels", 9000, 17000, 5000, 9000, true, [2, 5], [3, 8]],
  ["lotus", "Lotus Crown", "পদ্ম মুকুট", "Lotus on top", 8000, 15000, 4500, 8000, true, [2, 4], [2, 7]],
  ["shapla", "Shapla Panel", "শাপলা প্যানেল", "Water lily panels", 7500, 14000, 4000, 7500, true, [1, 4], [2, 6]],
  ["peacock", "Peacock Royal", "ময়ূর রয়্যাল", "Peacock, premium", 15000, 28000, 8000, 15000, true, [3, 8], [4, 13]],
  ["tree", "Tree of Life", "জীবন বৃক্ষ", "Tree with flowers", 10000, 19000, 5500, 10000, true, [2, 5], [3, 9]],
  ["kalka", "Kalka Nokshi", "কল্কা নকশি", "Paisley motif", 8500, 16000, 4500, 8500, true, [2, 4], [2, 7]],
  ["pyramid", "Pyramid Block", "পিরামিড ব্লক", "Pyramid blocks", 6500, 12000, 3500, 6500, true, [1, 3], [2, 6]],
  ["mandala", "Mandala Center", "মান্ডালা", "Centre mandala", 9000, 17000, 5000, 9000, true, [2, 5], [3, 8]],
  ["islamic", "Islamic Geometric", "ইসলামিক জ্যামিতিক", "8-point star", 8000, 15000, 4500, 8000, true, [2, 4], [2, 7]],
  ["modern", "Modern Line + Flower", "মডার্ন লাইন + ফুল", "Light, modern", 4500, 8500, 2500, 4500, true, [1, 3], [2, 4]],
  ["simple", "Simple Frame", "সিম্পল ফ্রেম", "Budget", 3000, 5500, 1500, 3000, true, [1, 2], [1, 3]],
];
/** name, bangla, category, cost single, cost double, active, men+days single, men+days double */
const LABOUR: [string, string, "DOOR" | "POLISH" | "FRAME" | "FITTING" | "DELIVERY", number, number, boolean, [number, number], [number, number]][] = [
  ["Door making", "দরজা বানানো", "DOOR", 15000, 22000, true, [2, 4], [3, 6]],
  ["Polish / colour work", "পলিশ / রং এর কাজ", "POLISH", 2000, 3500, true, [1, 2], [2, 3]],
  ["Chowkath (frame) making", "চৌকাঠ বানানো", "FRAME", 3000, 4000, true, [1, 2], [2, 3]],
  ["Fitting (hinge, lock)", "ফিটিং (কব্জা, লক)", "FITTING", 1500, 2500, true, [1, 1], [1, 1]],
  ["Delivery", "ডেলিভারি", "DELIVERY", 1000, 1500, false, [2, 1], [2, 1]],
];

/**
 * A few carpenters to start with, so a confirmed order has somebody to hand the work to.
 * Rename them to your own men on the Workers screen - the point is the skills, which is
 * what the automatic hand-out matches on.
 */
const WORKERS: [string, "DOOR" | "POLISH" | "FRAME" | "FITTING" | "DELIVERY" | "OTHER", string][] = [
  ["Mistri 1", "DOOR", "Door making"],
  ["Mistri 2", "DOOR", "Door making"],
  ["Rong Mistri", "POLISH", "Polish and colour"],
  ["Chowkath Mistri", "FRAME", "Frames"],
  ["Nokshi Mistri", "OTHER", "Carving, and anything else"],
];

async function main() {
  const s = await prisma.setting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  const P = { wood: Number(s.profitWoodPercent), color: Number(s.profitColorPercent), design: Number(s.profitDesignPercent), labour: Number(s.profitLabourPercent) };

  // Super Admin
  const email = (process.env.SUPER_ADMIN_EMAIL ?? "").toLowerCase();
  const pass = process.env.SUPER_ADMIN_PASSWORD ?? "";
  if (!email || pass.length < 8) throw new Error("Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD (at least 8 characters) in .env");
  const exists = await prisma.user.findUnique({ where: { email } });
  if (!exists) await prisma.user.create({ data: { email, name: process.env.SUPER_ADMIN_NAME ?? "Super Admin", role: "SUPER_ADMIN", passwordHash: await bcrypt.hash(pass, 10) } });

  let i = 0;
  for (const [nameEn, nameBn, use, market] of LOCAL_WOODS)
    await prisma.woodType.upsert({ where: { nameEn_source: { nameEn, source: "LOCAL" } }, update: {}, create: { nameEn, nameBn, source: "LOCAL", countries: ["Bangladesh"], use, marketPricePerCft: market, sortOrder: i++ } });
  i = 0;
  for (const [nameEn, nameBn, countries, use, market] of FOREIGN_WOODS)
    await prisma.woodType.upsert({ where: { nameEn_source: { nameEn, source: "FOREIGN" } }, update: {}, create: { nameEn, nameBn, source: "FOREIGN", countries, use, marketPricePerCft: market, sortOrder: i++ } });

  i = 0;
  for (const [nameEn, nameBn, colorCode, cs, cd, suggestions] of DOOR_COLORS)
    await prisma.color.upsert({ where: { type_nameEn: { type: "DOOR", nameEn } }, update: {}, create: { type: "DOOR", nameEn, nameBn, colorCode, suggestions, sortOrder: i++, ...price(cs, cd, P.color) } });
  i = 0;
  for (const [nameEn, nameBn, colorCode, cs, cd, tone] of DESIGN_COLORS)
    await prisma.color.upsert({ where: { type_nameEn: { type: "DESIGN", nameEn } }, update: {}, create: { type: "DESIGN", nameEn, nameBn, colorCode, isToneOnTone: tone, sortOrder: i++, ...price(cs, cd, P.color) } });

  i = 0;
  for (const [key, nameEn, nameBn, noteEn, cs, cd, ls, ld, allowDouble, single, dbl] of DESIGNS) {
    const l = price(ls, ld, P.labour);
    const crew = { workersSingle: single[0], daysSingle: single[1], workersDouble: dbl[0], daysDouble: dbl[1] };
    await prisma.doorDesign.upsert({
      where: { key }, update: {},
      create: { key, nameEn, nameBn, noteEn, allowDouble, sortOrder: i++, ...price(cs, cd, P.design), ...crew,
        labourCostSingle: l.costSingle, labourCostDouble: l.costDouble, labourProfitPercent: l.profitPercent, labourSellSingle: l.sellSingle, labourSellDouble: l.sellDouble },
    });
    // Your prices are yours - `update: {}` above never touches them. The crew is different:
    // it only arrived in the price list later, so a shop that seeded before then has carvings
    // sitting at nobody. Filling in a zero is not overwriting a decision, and a number you
    // have set yourself is left exactly as it is.
    await prisma.doorDesign.updateMany({ where: { key, workersSingle: 0, workersDouble: 0 }, data: crew });
  }

  i = 0;
  for (const [nameEn, nameBn, category, cs, cd, active, single, dbl] of LABOUR) {
    const found = await prisma.labourRate.findFirst({ where: { category, nameEn } });
    const crew = { workersSingle: single[0], daysSingle: single[1], workersDouble: dbl[0], daysDouble: dbl[1] };
    if (!found) await prisma.labourRate.create({ data: { nameEn, nameBn, category, active, sortOrder: i, ...price(cs, cd, P.labour), ...crew } });
    // Same as the carvings above: top up a rate that has nobody on it, leave your own numbers alone.
    else if (!found.workersSingle && !found.workersDouble) await prisma.labourRate.update({ where: { id: found.id }, data: crew });
    i++;
  }

  /**
   * Orders that were priced before the price list knew about crews.
   *
   * The men and days are copied onto a line the day the estimate is made, so an order made
   * back then is frozen at nobody - it shows "0 men" on the Orders screen for ever and hands
   * out no work. This walks those lines and fills them from the price list, matching by the
   * name the line was given. Only a line still sitting at zero is touched: a number you typed
   * yourself, or one the shop decided when pricing a customer's own carving, is a decision and
   * stays. Wood and colour lines are left alone - nobody is assigned to a plank, and a colour
   * is only a job when you gave it a crew of its own.
   */
  const rates = await prisma.labourRate.findMany();
  const carvings = await prisma.doorDesign.findMany();
  const plan = new Map<string, [number, number, number, number]>();
  for (const r of rates) plan.set(r.nameEn, [r.workersSingle, r.daysSingle, r.workersDouble, r.daysDouble]);
  for (const d of carvings) plan.set(`Carving labour: ${d.nameEn}`, [d.workersSingle, d.daysSingle, d.workersDouble, d.daysDouble]);

  const flat = await prisma.estimateLine.findMany({
    where: { type: "LABOUR", workers: 0, days: 0 },
    select: { id: true, name: true, estimate: { select: { doorType: true } } },
  });
  let filled = 0;
  for (const l of flat) {
    const p = plan.get(l.name);
    if (!p) continue;
    const [ws, ds, wd, dd] = p;
    const double = l.estimate.doorType === "DOUBLE";
    const workers = double ? wd : ws, days = double ? dd : ds;
    if (!workers && !days) continue;
    await prisma.estimateLine.update({ where: { id: l.id }, data: { workers, days } });
    filled++;
  }
  if (filled) console.log(`Filled the crew on ${filled} job line(s) priced before the price list had one.`);

  for (const [name, skill, note] of WORKERS) {
    const found = await prisma.worker.findFirst({ where: { name } });
    if (!found) await prisma.worker.create({ data: { name, skill, note } });
  }
  console.log(`Seed done: ${LOCAL_WOODS.length + FOREIGN_WOODS.length} woods, ${DOOR_COLORS.length + DESIGN_COLORS.length} colors, ${DESIGNS.length} carvings, ${LABOUR.length} labour rates, ${WORKERS.length} workers. Super Admin: ${email}`);
  void P.wood;
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
