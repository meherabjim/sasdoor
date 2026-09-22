import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { env } from "../config/env";
import { bad, ok } from "../lib/http";
import { sanitizeSvg } from "../lib/svgSanitize";

const dir = path.resolve(env.uploadDir);
fs.mkdirSync(dir, { recursive: true });
const allowed = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif"]);

const upload = multer({
  storage: multer.diskStorage({
    destination: dir,
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, allowed.has(path.extname(file.originalname).toLowerCase())),
});

const r = Router();
r.post("/", upload.single("file"), (req, res) => {
  if (!req.file) throw bad("Upload an image (png, jpg, webp, svg) up to 5MB");

  // An SVG is a document: it can carry <script> and event handlers, and /uploads is
  // served straight off disk. Clean it before it ever sits there.
  if (path.extname(req.file.filename).toLowerCase() === ".svg") {
    const full = path.join(dir, req.file.filename);
    const clean = sanitizeSvg(fs.readFileSync(full, "utf8"));
    if (!clean) { fs.unlinkSync(full); throw bad("This SVG could not be read as a drawing"); }
    fs.writeFileSync(full, clean, "utf8");
  }

  res.status(201).json(ok({ url: `${env.publicUrl}/uploads/${req.file.filename}` }, "Uploaded"));
});
export default r;
