import path from "path";
import fs from "fs";
import crypto from "crypto";
import { env } from "../config/env";
import { bad } from "./http";

/**
 * The photo a customer traced their carving from.
 *
 * The traced drawing is what goes on the door, but it is only the tracer's reading of the
 * photo. The shop has to price the carving and a carver has to cut it, and both need the
 * real thing to look at. So the photo travels with the request and lands next to the
 * drawing on the admin's screens, with its own download.
 *
 * It arrives inside the order request itself (a data URL), not through an upload endpoint
 * of its own: the website has no business letting anonymous visitors store files, and this
 * way a photo is only ever written when a real request comes with it. The browser shrinks
 * it first, so it is a few hundred KB, not a 12 MP original.
 */

const dir = path.resolve(env.uploadDir);
const MAX = 3 * 1024 * 1024;

/** File signatures, so a photo is judged by what it is and not by what it says it is. */
const KINDS: { ext: string; test: (b: Buffer) => boolean }[] = [
  { ext: ".jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: ".png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: ".webp", test: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
];

/** Write the photo into uploads/ and return its public URL. Throws a 400 on anything that is not a picture. */
export function saveCustomerPhoto(dataUrl: string): string {
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl);
  if (!m) throw bad("The carving photo could not be read");
  const buf = Buffer.from(m[2], "base64");
  if (!buf.length || buf.length > MAX) throw bad("The carving photo is too large");
  const kind = KINDS.find((k) => k.test(buf));
  if (!kind) throw bad("The carving photo is not a JPG, PNG or WebP picture");
  fs.mkdirSync(dir, { recursive: true });
  const name = `photo-${Date.now()}-${crypto.randomBytes(4).toString("hex")}${kind.ext}`;
  fs.writeFileSync(path.join(dir, name), buf);
  return `${env.publicUrl}/uploads/${name}`;
}

/**
 * Remove a saved photo again - the request it came with failed, or the estimate was
 * deleted. Only ever touches a file this module wrote: a URL that does not point at a
 * `photo-…` file in our own uploads folder is left alone.
 */
export function removeCustomerPhoto(url: string | null | undefined) {
  if (!url) return;
  const prefix = `${env.publicUrl}/uploads/`;
  if (!url.startsWith(prefix)) return;
  const name = url.slice(prefix.length);
  if (!/^photo-[\w-]+\.(jpg|png|webp)$/.test(name)) return;
  fs.promises.unlink(path.join(dir, name)).catch(() => {});
}
