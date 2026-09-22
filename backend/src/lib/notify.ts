import type { Tx } from "../config/prisma";

/**
 * Telling a customer something about their own door.
 *
 * Two things happen, and only one of them can fail. A row is written, which is what their
 * page reads - that always works, and it is the notification as far as this shop is
 * concerned. Then, if and only if an SMS gateway is configured, a text is attempted on top.
 *
 * A failed text must never lose an order. Everything here is caught: the send happens after
 * the transaction has committed, and a failure is written back onto the row as `smsError`
 * rather than thrown, so the customer still sees the message on their page and the shop can
 * see that the text did not go.
 *
 * There is no gateway built in, because there is no one to build in: every Bangladeshi SMS
 * provider has its own URL and its own parameter names. Point SMS_URL at yours and the rest
 * is one line of .env - see the template at the bottom of this file.
 */

export type Message = { titleEn: string; titleBn: string; bodyEn: string; bodyBn: string };

/** Whatever your provider calls things, spelled out in .env rather than in this file. */
const gateway = () => {
  const url = (process.env.SMS_URL ?? "").trim();
  if (!url) return null;
  return {
    url,
    method: (process.env.SMS_METHOD ?? "GET").toUpperCase() === "POST" ? "POST" : "GET",
    toParam: process.env.SMS_TO_PARAM ?? "to",
    textParam: process.env.SMS_TEXT_PARAM ?? "message",
    /** e.g. api_key=xxxxx&senderid=SASDOOR — copied straight from your provider's docs. */
    extra: process.env.SMS_EXTRA ?? "",
  };
};

/** True when a text will actually be attempted. The admin screen says so out loud. */
export const smsConfigured = () => !!gateway();

/**
 * Write the message. Returns the row id so the caller can send the text afterwards.
 * Runs inside the caller's transaction: if the order fails to save, so does the message.
 */
export async function notify(tx: Tx, customerId: number, estimateId: number | null, m: Message) {
  const row = await tx.notification.create({ data: { customerId, estimateId, ...m } });
  return row.id;
}

/**
 * Try the text message, after the transaction has committed.
 *
 * Never throws. A shop with no gateway configured simply has in-app messages, which is a
 * perfectly good place to be - and the row already says everything the text would have.
 */
export async function sendSms(db: Tx, notificationId: number, phone: string | null | undefined, text: string) {
  const g = gateway();
  if (!g || !phone) return;
  try {
    const params = new URLSearchParams(g.extra);
    params.set(g.toParam, phone);
    params.set(g.textParam, text);
    const res = g.method === "POST"
      ? await fetch(g.url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params.toString() })
      : await fetch(`${g.url}${g.url.includes("?") ? "&" : "?"}${params.toString()}`);
    if (!res.ok) throw new Error(`gateway said ${res.status}`);
    await db.notification.update({ where: { id: notificationId }, data: { smsSentAt: new Date(), smsError: null } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Written down, not thrown. The door is sold either way.
    await db.notification.update({ where: { id: notificationId }, data: { smsError: msg.slice(0, 300) } }).catch(() => {});
  }
}

/** The things the shop actually tells a customer. Written once, in both languages. */
export const MSG = {
  quoted: (no: string, total: string): Message => ({
    titleEn: "Your final price is ready", titleBn: "আপনার চূড়ান্ত দাম এসেছে",
    bodyEn: `SAS DOOR: we have priced the carving on ${no}. Total ${total}. Open your account to accept and place the order.`,
    bodyBn: `SAS DOOR: ${no} এর নকশার দাম বসানো হয়েছে। মোট ${total}। অ্যাকাউন্টে গিয়ে অর্ডার করুন।`,
  }),
  confirmed: (no: string): Message => ({
    titleEn: "Order confirmed", titleBn: "অর্ডার কনফার্ম",
    bodyEn: `SAS DOOR: your order ${no} is confirmed and the work has been given out. You can follow it in your account.`,
    bodyBn: `SAS DOOR: আপনার অর্ডার ${no} কনফার্ম হয়েছে, কাজ ভাগ করে দেওয়া হয়েছে। অ্যাকাউন্টে অগ্রগতি দেখতে পারবেন।`,
  }),
  jobDone: (no: string, job: string, jobBn: string): Message => ({
    titleEn: `${job} finished`, titleBn: `${jobBn} শেষ`,
    bodyEn: `SAS DOOR: ${job} on your door ${no} is finished.`,
    bodyBn: `SAS DOOR: আপনার দরজা ${no} এর ${jobBn} শেষ হয়েছে।`,
  }),
  ready: (no: string): Message => ({
    titleEn: "Your door is ready", titleBn: "আপনার দরজা রেডি",
    bodyEn: `SAS DOOR: your door ${no} is ready. We will contact you about delivery.`,
    bodyBn: `SAS DOOR: আপনার দরজা ${no} রেডি হয়ে গেছে। ডেলিভারির জন্য আমরা যোগাযোগ করব।`,
  }),
  delivered: (no: string): Message => ({
    titleEn: "Delivered", titleBn: "ডেলিভারি হয়েছে",
    bodyEn: `SAS DOOR: your door ${no} has been delivered. Thank you.`,
    bodyBn: `SAS DOOR: আপনার দরজা ${no} ডেলিভারি হয়েছে। ধন্যবাদ।`,
  }),
};

/* --- .env, when you have a gateway -------------------------------------------------
   SMS_URL=https://api.yourprovider.com/sendsms
   SMS_METHOD=GET
   SMS_TO_PARAM=to
   SMS_TEXT_PARAM=message
   SMS_EXTRA=api_key=YOURKEY&senderid=SASDOOR
   Leave SMS_URL out and nothing is sent; the messages still reach the customer's page.
------------------------------------------------------------------------------------ */
