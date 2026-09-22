import type { Request } from "express";
import { z, ZodTypeAny } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const bad = (msg: string) => new HttpError(400, msg);
export const notFound = (what = "Data") => new HttpError(404, `${what} not found`);

export const ok = <T>(data: T, message?: string) => ({ success: true, message, data });

export function parse<S extends ZodTypeAny>(schema: S, value: unknown): z.infer<S> {
  const r = schema.safeParse(value);
  if (!r.success) {
    const i = r.error.issues[0];
    throw new HttpError(400, `${i.path.join(".") || "input"}: ${i.message}`);
  }
  return r.data;
}

export const idParam = (req: Request, key = "id") => {
  const id = Number(req.params[key]);
  if (!Number.isInteger(id) || id <= 0) throw bad("Invalid id");
  return id;
};

/** For PUT/PATCH: keep only the keys the client actually sent (so zod defaults never overwrite data) */
export function onlySent<T extends Record<string, unknown>>(parsed: T, body: unknown): Partial<T> {
  const sent = body && typeof body === "object" ? Object.keys(body as object) : [];
  return Object.fromEntries(Object.entries(parsed).filter(([k]) => sent.includes(k))) as Partial<T>;
}

// common zod pieces
export const zMoney = z.coerce.number().min(0, "cannot be negative");
export const zPercent = z.coerce.number().min(0, "cannot be negative").max(1000);
export const zBool = z.union([z.boolean(), z.enum(["true", "false"]).transform((v) => v === "true")]);
