import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { HttpError } from "../lib/http";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ success: false, message: `${req.method} ${req.path} not found` });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) return res.status(err.status).json({ success: false, message: err.message });
  const status = (err as { status?: number })?.status;
  if (status && status < 500) return res.status(status).json({ success: false, message: (err as Error).message });
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") return res.status(409).json({ success: false, message: "This name or number already exists" });
    if (err.code === "P2025") return res.status(404).json({ success: false, message: "Record not found" });
    if (err.code === "P2003") return res.status(409).json({ success: false, message: "Linked to other records, cannot delete" });
  }
  console.error(err);
  res.status(500).json({ success: false, message: "Server error" });
}
