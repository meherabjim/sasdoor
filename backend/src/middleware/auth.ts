import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { HttpError } from "../lib/http";

export type AuthUser = { id: number; role: "SUPER_ADMIN" | "USER"; name: string };
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express { interface Request { user?: AuthUser } }
}

export const signToken = (u: AuthUser) =>
  jwt.sign(u, env.jwtSecret, { expiresIn: env.jwtExpires as jwt.SignOptions["expiresIn"] });

function readUser(req: Request): AuthUser | undefined {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return undefined;
  try {
    const p = jwt.verify(h.slice(7), env.jwtSecret) as AuthUser;
    return { id: p.id, role: p.role, name: p.name };
  } catch {
    throw new HttpError(401, "Session expired, please log in again");
  }
}

export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  try { req.user = readUser(req); } catch { req.user = undefined; }
  next();
};
export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  req.user = readUser(req);
  if (!req.user) throw new HttpError(401, "Please log in");
  next();
};
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  requireAuth(req, res, () => {
    if (req.user!.role !== "SUPER_ADMIN") throw new HttpError(403, "Admins only");
    next();
  });
};
