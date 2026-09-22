/**
 * Photo -> carving.
 *
 * The whole point of this file: a carved door is not ink on paper. The carving and
 * the wood around it are the same colour and the same wood; what separates them is
 * depth - one side of every groove catches the light, the other sits in shadow.
 * So a plain global threshold finds nothing. The signal is the *local gradient*.
 *
 * Pipeline
 *   1. warp      - drag the four corners, straighten the leaf into a rectangle
 *   2. flatten   - divide by a heavily blurred copy, killing "bright on one side"
 *   3. relief    - Sobel magnitude (photo mode only); ink-on-paper skips this
 *   4. threshold - local mean + deviation, not one number for the whole picture
 *   5. clean     - close the broken strokes, drop specks (wood grain, JPEG noise)
 *   6. handle    - drop the door handle: edge zone AND not left-right symmetric
 *   7. trace     - ImageTracer, every path forced to currentColor
 *
 * Everything here is plain canvas maths. opencv.js would be 6-8 MB for the three
 * operations we actually use, which is not worth it inside an admin panel.
 */

import { sanitizeSvg } from "./sanitizeSvg";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ImageTracer = require("./vendor/imagetracer.js");

export type Pt = { x: number; y: number };
export type PhotoKind = "DOOR" | "FLAT";

export type ExtractOptions = {
  kind: PhotoKind;
  /** How much detail survives the threshold. Higher = more strokes, more noise. 0..1 */
  detail: number;
  /** Specks smaller than this share of the image area are dropped. 0..1 */
  minSpeck: number;
  /** Curve smoothing handed to the tracer. 0..1 */
  smooth: number;
  /** Dark design on a light background, or the other way round. */
  invert: boolean;
  /** Try to find and drop the door handle. Only sensible on DOOR photos. */
  dropHandle: boolean;
  /**
   * Drop the long straight slivers a photographed door leaves behind - the edge of the
   * panel, the shadow line down the stile, the frame beside it. Only sensible on DOOR
   * photos, and only ever removes a stroke that is long in one direction and hairline
   * in the other, so the rectangles a carving is framed with are kept.
   */
  dropLines: boolean;
};

export const DEFAULTS: ExtractOptions = { kind: "DOOR", detail: 0.5, minSpeck: 0.0004, smooth: 0.5, invert: false, dropHandle: true, dropLines: true };

/** Longest side of the working image. Big enough for fine carving, small enough to stay instant. */
const WORK = 900;

// ---------------------------------------------------------------- 1. perspective

/**
 * Solve the 8 coefficients that map the unit rectangle onto the quad the admin drew.
 * Plain Gaussian elimination on an 8x8 - no library needed for one small system.
 */
function homography(from: Pt[], to: Pt[]): number[] {
  const A: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = from[i], { x: X, y: Y } = to[i];
    A.push([x, y, 1, 0, 0, 0, -x * X, -y * X, X]);
    A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y, Y]);
  }
  for (let col = 0; col < 8; col++) {
    let piv = col;
    for (let r = col + 1; r < 8; r++) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
    [A[col], A[piv]] = [A[piv], A[col]];
    const p = A[col][col] || 1e-12;
    for (let c = col; c <= 8; c++) A[col][c] /= p;
    for (let r = 0; r < 8; r++) {
      if (r === col) continue;
      const f = A[r][col];
      if (!f) continue;
      for (let c = col; c <= 8; c++) A[r][c] -= f * A[col][c];
    }
  }
  return A.map((r) => r[8]);
}

/** Straighten the quad the admin drew into a clean outW x outH rectangle. */
export function warp(src: ImageData, corners: Pt[], outW: number, outH: number): ImageData {
  // rectangle -> quad, so each output pixel can look up where it came from
  const h = homography([{ x: 0, y: 0 }, { x: outW, y: 0 }, { x: outW, y: outH }, { x: 0, y: outH }], corners);
  const [a, b, c, d, e, f, g, i] = h;
  const out = new ImageData(outW, outH);
  const S = src.data, O = out.data, sw = src.width, sh = src.height;

  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const w = g * x + i * y + 1;
      const sx = (a * x + b * y + c) / w, sy = (d * x + e * y + f) / w;
      const o = (y * outW + x) * 4;
      if (sx < 0 || sy < 0 || sx > sw - 1 || sy > sh - 1) { O[o] = O[o + 1] = O[o + 2] = 255; O[o + 3] = 255; continue; }
      // bilinear, so the straightened picture does not look chewed
      const x0 = sx | 0, y0 = sy | 0, x1 = Math.min(x0 + 1, sw - 1), y1 = Math.min(y0 + 1, sh - 1);
      const fx = sx - x0, fy = sy - y0;
      for (let ch = 0; ch < 3; ch++) {
        const p00 = S[(y0 * sw + x0) * 4 + ch], p10 = S[(y0 * sw + x1) * 4 + ch];
        const p01 = S[(y1 * sw + x0) * 4 + ch], p11 = S[(y1 * sw + x1) * 4 + ch];
        O[o + ch] = (p00 * (1 - fx) + p10 * fx) * (1 - fy) + (p01 * (1 - fx) + p11 * fx) * fy;
      }
      O[o + 3] = 255;
    }
  }
  return out;
}

// ---------------------------------------------------------------- 2. grey + flatten

const gray = (img: ImageData): Float32Array => {
  const g = new Float32Array(img.width * img.height), D = img.data;
  for (let p = 0, q = 0; q < g.length; p += 4, q++) g[q] = 0.299 * D[p] + 0.587 * D[p + 1] + 0.114 * D[p + 2];
  return g;
};

/** Summed-area table, so a box blur costs the same whatever its radius. */
function integral(src: Float32Array, w: number, h: number): Float64Array {
  const I = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      row += src[y * w + x];
      I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + row;
    }
  }
  return I;
}

const boxAt = (I: Float64Array, w: number, h: number, x: number, y: number, r: number) => {
  const x0 = Math.max(0, x - r), y0 = Math.max(0, y - r), x1 = Math.min(w, x + r + 1), y1 = Math.min(h, y + r + 1);
  const s = I[y1 * (w + 1) + x1] - I[y0 * (w + 1) + x1] - I[y1 * (w + 1) + x0] + I[y0 * (w + 1) + x0];
  return { sum: s, n: (x1 - x0) * (y1 - y0) };
};

/**
 * Divide by a very blurred copy of itself. Whatever varies slowly - the lamp on one
 * side, the shadow of the frame - divides out; the fine shading of a groove stays.
 */
function flatten(g: Float32Array, w: number, h: number): Float32Array {
  const r = Math.max(8, Math.round(Math.min(w, h) / 8));
  const I = integral(g, w, h);
  const out = new Float32Array(g.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const { sum, n } = boxAt(I, w, h, x, y, r);
      const bg = sum / n || 1;
      out[y * w + x] = Math.max(0, Math.min(255, (g[y * w + x] / bg) * 128));
    }
  }
  return out;
}

// ---------------------------------------------------------------- 3. relief

/** Sobel magnitude: responds on both sides of a groove, so the light direction does not matter. */
function sobel(g: Float32Array, w: number, h: number): Float32Array {
  const out = new Float32Array(g.length);
  let max = 1;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const tl = g[i - w - 1], t = g[i - w], tr = g[i - w + 1];
      const l = g[i - 1], rr = g[i + 1];
      const bl = g[i + w - 1], bb = g[i + w], br = g[i + w + 1];
      const gx = tl + 2 * l + bl - tr - 2 * rr - br;
      const gy = tl + 2 * t + tr - bl - 2 * bb - br;
      const m = Math.sqrt(gx * gx + gy * gy);
      out[i] = m;
      if (m > max) max = m;
    }
  }
  for (let i = 0; i < out.length; i++) out[i] = (out[i] / max) * 255;
  return out;
}

/** Tiny box blur. One pixel of it is enough to stop wood grain firing the Sobel. */
function blur(g: Float32Array, w: number, h: number, r: number): Float32Array {
  if (r <= 0) return g;
  const I = integral(g, w, h);
  const out = new Float32Array(g.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const { sum, n } = boxAt(I, w, h, x, y, r);
    out[y * w + x] = sum / n;
  }
  return out;
}

/**
 * The absolute floor the mask is held to, on top of the local threshold.
 *
 * A local threshold on its own has one bad habit: where there is no carving at all,
 * the local mean and deviation are both tiny, so the bar drops to nothing and plain
 * wood grain walks straight through it.
 *
 * A fixed percentile is the wrong cure, because it keeps the same share of the picture
 * whatever is in it: on a photo where the carving covers a tenth of the door, the other
 * nine tenths of the quota get filled with grain. Otsu asks the picture instead - the
 * gradient of a carved door really is two populations, flat wood and groove edges - and
 * `strength` then leans the answer one way or the other.
 */
function otsuFloor(g: Float32Array, strength: number): number {
  const hist = new Uint32Array(256);
  for (let i = 0; i < g.length; i++) hist[Math.max(0, Math.min(255, g[i] | 0))]++;
  const total = g.length;
  let sum = 0;
  for (let v = 0; v < 256; v++) sum += v * hist[v];

  let sumB = 0, wB = 0, best = 0, bestVar = -1;
  for (let v = 0; v < 256; v++) {
    wB += hist[v];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += v * hist[v];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > bestVar) { bestVar = between; best = v; }
  }
  // strength 0..1 -> 1.45x..0.55x of Otsu's answer: lower bar, more of the faint detail
  return Math.max(4, best * (1.45 - strength * 0.9));
}

// ---------------------------------------------------------------- 4. threshold

/**
 * Local threshold. One number for the whole picture cannot work when the light and
 * the contrast both drift across it, so each pixel is judged against its own
 * neighbourhood: mean plus a share of the local deviation.
 */
function localThreshold(g: Float32Array, w: number, h: number, detail: number, above: boolean, floor: number | null): Uint8Array {
  const r = Math.max(6, Math.round(Math.min(w, h) / 24));
  const I = integral(g, w, h);
  const sq = new Float32Array(g.length);
  for (let i = 0; i < g.length; i++) sq[i] = g[i] * g[i];
  const I2 = integral(sq, w, h);

  // detail 0..1 -> k 0.9..-0.1: higher detail means a lower bar, so fainter strokes survive
  const k = 0.9 - detail;
  const bin = new Uint8Array(g.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const { sum, n } = boxAt(I, w, h, x, y, r);
      const { sum: s2 } = boxAt(I2, w, h, x, y, r);
      const mean = sum / n;
      const std = Math.sqrt(Math.max(0, s2 / n - mean * mean));
      const t = mean + k * std;
      const v = g[y * w + x];
      const local = above ? v > t : v < t;
      bin[y * w + x] = local && (floor === null || (above ? v >= floor : v <= floor)) ? 1 : 0;
    }
  }
  return bin;
}

// ---------------------------------------------------------------- 5. clean

function dilate(bin: Uint8Array, w: number, h: number, r: number): Uint8Array {
  if (r <= 0) return bin;
  const out = new Uint8Array(bin.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let on = 0;
    for (let dy = -r; dy <= r && !on; dy++) for (let dx = -r; dx <= r; dx++) {
      const yy = y + dy, xx = x + dx;
      if (yy < 0 || xx < 0 || yy >= h || xx >= w) continue;
      if (bin[yy * w + xx]) { on = 1; break; }
    }
    out[y * w + x] = on;
  }
  return out;
}

function erode(bin: Uint8Array, w: number, h: number, r: number): Uint8Array {
  if (r <= 0) return bin;
  const out = new Uint8Array(bin.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let on = 1;
    for (let dy = -r; dy <= r && on; dy++) for (let dx = -r; dx <= r; dx++) {
      const yy = y + dy, xx = x + dx;
      if (yy < 0 || xx < 0 || yy >= h || xx >= w || !bin[yy * w + xx]) { on = 0; break; }
    }
    out[y * w + x] = on;
  }
  return out;
}

/** Close = dilate then erode: joins strokes the threshold broke, without fattening them. */
const close = (bin: Uint8Array, w: number, h: number, r = 1) => erode(dilate(bin, w, h, r), w, h, r);

type Blob = { pixels: number[]; area: number; minX: number; maxX: number; minY: number; maxY: number; cx: number; cy: number };

/** Connected components, 8-neighbour, iterative so a big carving cannot blow the stack. */
function blobs(bin: Uint8Array, w: number, h: number): Blob[] {
  const seen = new Uint8Array(bin.length), out: Blob[] = [];
  const stack: number[] = [];
  for (let start = 0; start < bin.length; start++) {
    if (!bin[start] || seen[start]) continue;
    stack.length = 0; stack.push(start); seen[start] = 1;
    const pixels: number[] = [];
    let minX = w, maxX = 0, minY = h, maxY = 0, sx = 0, sy = 0;
    while (stack.length) {
      const i = stack.pop()!;
      pixels.push(i);
      const x = i % w, y = (i / w) | 0;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      sx += x; sy += y;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const yy = y + dy, xx = x + dx;
        if (yy < 0 || xx < 0 || yy >= h || xx >= w) continue;
        const j = yy * w + xx;
        if (bin[j] && !seen[j]) { seen[j] = 1; stack.push(j); }
      }
    }
    out.push({ pixels, area: pixels.length, minX, maxX, minY, maxY, cx: sx / pixels.length, cy: sy / pixels.length });
  }
  return out;
}

const paint = (parts: Blob[], len: number) => {
  const out = new Uint8Array(len);
  for (const b of parts) for (const i of b.pixels) out[i] = 1;
  return out;
};

// ---------------------------------------------------------------- 6. the handle

/**
 * A door handle sits on one edge, around half height, and has no mirror twin -
 * carving almost always does. Both conditions must hold before anything is dropped,
 * because symmetry alone would eat an asymmetric carving.
 */
function dropHandle(parts: Blob[], w: number, h: number, all: Uint8Array): Blob[] {
  return parts.filter((b) => {
    const inEdge = b.cx > w * 0.80 || b.cx < w * 0.20;
    const midHeight = b.cy > h * 0.30 && b.cy < h * 0.70;
    if (!inEdge || !midHeight) return true;

    // does the same shape exist mirrored on the other side?
    let hit = 0;
    for (const i of b.pixels) {
      const x = i % w, y = (i / w) | 0;
      const mx = w - 1 - x;
      if (all[y * w + mx]) hit++;
    }
    const symmetric = hit / b.area > 0.30;
    return symmetric;
  });
}

// ---------------------------------------------------------------- 6b. straight edges

/**
 * A photographed door brings its own straightedges with it: the seam down the stile,
 * the lip of a panel, the frame just outside the corners the admin marked. They trace
 * as one long hairline each and land on the leaf as a stray line beside the carving.
 *
 * The test is deliberately narrow. A stroke is only dropped when it runs most of the
 * way across the picture in one direction *and* stays hairline in the other. That second
 * condition is what protects the carving: the rectangle a carving is framed with is long
 * in both directions, and a diagonal or a curve spreads its bounding box just as wide, so
 * neither can ever be caught. Only something genuinely ruled straight can be.
 *
 * The density floor is low on purpose. In photo mode the mask comes from Sobel, which
 * fires on *both* banks of a groove, so a single scored line arrives as two parallel
 * threads with a gap down the middle - barely half its own box filled. Scattered grain
 * inside the same narrow column never reaches even that.
 */
function dropEdgeLines(parts: Blob[], w: number, h: number): Blob[] {
  const hair = Math.max(3, Math.round(Math.min(w, h) * 0.02));
  return parts.filter((b) => {
    const bw = b.maxX - b.minX + 1, bh = b.maxY - b.minY + 1;
    const longways = bh >= h * 0.55 && bw <= hair;   // a vertical hairline
    const across = bw >= w * 0.55 && bh <= hair;     // a horizontal one
    if (!longways && !across) return true;
    return b.area / (bw * bh) < 0.3;                 // too sparse to be a ruled line
  });
}

// ---------------------------------------------------------------- 7. trace

/** The rectangle the ink actually occupies, with a little breathing room. */
function inkBox(bin: Uint8Array, w: number, h: number) {
  let minX = w, maxX = -1, minY = h, maxY = -1;
  for (let i = 0; i < bin.length; i++) {
    if (!bin[i]) continue;
    const x = i % w, y = (i / w) | 0;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  if (maxX < 0) return { x: 0, y: 0, w, h, empty: true };
  const pad = Math.round(Math.max(w, h) * 0.02);
  const x = Math.max(0, minX - pad), y = Math.max(0, minY - pad);
  return { x, y, w: Math.min(w, maxX + pad) - x, h: Math.min(h, maxY + pad) - y, empty: false };
}

/** Binary mask -> SVG, every path forced to currentColor so the renderer can recolour it. */
function trace(bin: Uint8Array, w: number, h: number, smooth: number, box: { x: number; y: number; w: number; h: number }): string {
  const img = new ImageData(w, h);
  const D = img.data;
  for (let i = 0; i < bin.length; i++) {
    const v = bin[i] ? 0 : 255;
    D[i * 4] = D[i * 4 + 1] = D[i * 4 + 2] = v;
    D[i * 4 + 3] = 255;
  }

  const raw: string = ImageTracer.imagedataToSVG(img, {
    numberofcolors: 2,
    colorsampling: 0,
    pal: [{ r: 0, g: 0, b: 0, a: 255 }, { r: 255, g: 255, b: 255, a: 255 }],
    ltres: 1,
    qtres: 0.4 + smooth * 1.6,
    pathomit: 4,
    rightangleenhance: false,
    strokewidth: 0,
    linefilter: true,
    blurradius: 0,
    scale: 1,
  });

  // keep only the black shapes; the white ones are the background
  const kept: string[] = [];
  const pathRe = /<path[^>]*\/?>/g;
  let m: RegExpExecArray | null;
  while ((m = pathRe.exec(raw))) {
    const tag = m[0];
    const fill = /fill\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1] ?? "";
    const rgb = /rgb\((\d+),(\d+),(\d+)\)/i.exec(fill);
    if (!rgb) continue;
    if (Number(rgb[1]) > 128) continue;            // white-ish: background
    const d = /\sd\s*=\s*["']([^"']*)["']/i.exec(tag)?.[1];
    if (!d || d.length < 12) continue;
    kept.push(`<path d="${d}" fill="currentColor"/>`);
  }
  if (!kept.length) return "";
  // The viewBox is the ink, not the photo. Without this the carving keeps the empty
  // border of the original picture around it and lands tiny in the middle of the door,
  // instead of filling the leaf the way the built-in carvings do.
  return sanitizeSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x} ${box.y} ${box.w} ${box.h}">${kept.join("")}</svg>`);
}

// ---------------------------------------------------------------- orchestrator

export type ExtractResult = { svg: string; preview: ImageData; paths: number; coverage: number };

/**
 * Run the whole thing. `corners` are in the coordinates of `source`; pass the four
 * corners of the picture itself to skip the straightening step.
 */
export function extractDesign(source: ImageData, corners: Pt[], opts: ExtractOptions): ExtractResult {
  // work at a sane size: fine carving needs detail, but a 12 MP phone photo is waste
  const quadW = Math.hypot(corners[1].x - corners[0].x, corners[1].y - corners[0].y);
  const quadH = Math.hypot(corners[3].x - corners[0].x, corners[3].y - corners[0].y);
  const ratio = quadH > 0 ? quadW / quadH : 0.5;
  const outH = WORK, outW = Math.max(64, Math.round(WORK * ratio));

  const flatImg = warp(source, corners, outW, outH);
  const w = flatImg.width, h = flatImg.height;

  let g = flatten(gray(flatImg), w, h);
  // A photographed carving is read through its shading; a drawn design is read directly.
  if (opts.kind === "DOOR") g = sobel(blur(g, w, h, 1), w, h);

  const above = opts.kind === "DOOR" ? !opts.invert : opts.invert;
  // Photo mode also gets an absolute floor: without it plain grain fills the mask.
  const floor = opts.kind === "DOOR" ? otsuFloor(g, opts.detail) : null;
  let bin = localThreshold(g, w, h, opts.detail, above, floor);
  bin = close(bin, w, h, 1);

  const minArea = Math.max(8, Math.round(w * h * opts.minSpeck));
  let parts = blobs(bin, w, h).filter((b) => b.area >= minArea);
  if (opts.kind === "DOOR" && opts.dropHandle) parts = dropHandle(parts, w, h, paint(parts, bin.length));
  if (opts.kind === "DOOR" && opts.dropLines !== false) parts = dropEdgeLines(parts, w, h);
  bin = paint(parts, bin.length);

  // preview: the mask drawn back over a pale board, so the admin sees what was kept
  const preview = new ImageData(w, h);
  for (let i = 0; i < bin.length; i++) {
    const on = bin[i];
    preview.data[i * 4] = on ? 31 : 239;
    preview.data[i * 4 + 1] = on ? 23 : 234;
    preview.data[i * 4 + 2] = on ? 18 : 227;
    preview.data[i * 4 + 3] = 255;
  }

  const box = inkBox(bin, w, h);
  const svg = box.empty ? "" : trace(bin, w, h, opts.smooth, box);
  // how much of the straightened photo the carving actually covers - a very low number
  // usually means the four corners were drawn too wide
  const coverage = box.empty ? 0 : (box.w * box.h) / (w * h);
  return { svg, preview, paths: (svg.match(/<path/g) || []).length, coverage };
}

/** Read a File into ImageData, downscaled so the pipeline stays quick. */
export async function fileToImageData(file: File, max = 1400): Promise<ImageData> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const el = new Image();
      el.onload = () => res(el);
      el.onerror = () => rej(new Error("That image could not be read"));
      el.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale)), h = Math.max(1, Math.round(img.height * scale));
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const ctx = cv.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h);
  } finally {
    URL.revokeObjectURL(url);
  }
}
