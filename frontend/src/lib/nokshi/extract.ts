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
 *   3. carving   - photo mode only, two readings of the same photo combined:
 *                  - shadow: the recesses of a carving sit darker than the wood around
 *                    them; this is what makes dense, deep carving legible
 *                  - relief: Sobel with the wood-grain direction damped, hysteresis,
 *                    slits filled; this is what knows grain from a carved edge
 *                  a shadow is kept only where a carved edge is close by, so grain
 *                  streaks (dark, but with no sharp edge) drop out
 *   4. threshold - ink mode: local mean + deviation, not one number for the whole picture
 *   5. clean     - drop specks (wood grain, JPEG noise); optionally keep only what is
 *                  mirrored left-right; then the admin's eraser strokes
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
  /** Dark design on a light background, or the other way round. Ink (FLAT) mode only. */
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
  /**
   * Keep only what has a mirror twin across the centre line. Almost every carved door is
   * the same on the left and the right; wood grain, glare and JPEG noise never are. So on
   * a symmetric door this throws away most of the noise in one step.
   */
  symmetric: boolean;
  /** Eraser strokes, painted over the mask preview. Applied last, before tracing. */
  erase: EraseDot[];
  /**
   * Extra stroke thickness in photo mode, 0..3 pixels of the working image. The traced
   * lines of a photo come out finer than the built-in carvings; one pixel more makes them
   * read on the door, and a busy carving looks cleaner with none.
   */
  weight: number;
};

/**
 * One dab of the eraser, in the coordinates of the straightened picture: x and y run 0..1
 * across its width and height, r is a share of its width. Relative, so the same strokes
 * still land in the right place whatever size the photo is worked at.
 */
export type EraseDot = { x: number; y: number; r: number };

export const DEFAULTS: ExtractOptions = {
  kind: "DOOR", detail: 0.5, minSpeck: 0.0004, smooth: 0.5, invert: false,
  dropHandle: true, dropLines: true, symmetric: false, erase: [], weight: 1,
};

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

/** Box blur. A small one removes far more wood grain than carving before the Sobel. */
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

/**
 * Square dilation, done as a row pass then a column pass with a running count, so it costs
 * the same whatever the radius. The symmetry check and the slit filler both use radii big
 * enough that the plain nested loop became the slowest thing in the file.
 */
function dilate(bin: Uint8Array, w: number, h: number, r: number): Uint8Array {
  if (r <= 0) return bin;
  const tmp = new Uint8Array(bin.length), out = new Uint8Array(bin.length);
  for (let y = 0; y < h; y++) {
    const o = y * w;
    let c = 0;
    for (let x = 0; x <= Math.min(r, w - 1); x++) c += bin[o + x];
    for (let x = 0; x < w; x++) {
      tmp[o + x] = c > 0 ? 1 : 0;
      const add = x + r + 1, drop = x - r;
      if (add < w) c += bin[o + add];
      if (drop >= 0) c -= bin[o + drop];
    }
  }
  for (let x = 0; x < w; x++) {
    let c = 0;
    for (let y = 0; y <= Math.min(r, h - 1); y++) c += tmp[y * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = c > 0 ? 1 : 0;
      const add = y + r + 1, drop = y - r;
      if (add < h) c += tmp[add * w + x];
      if (drop >= 0) c -= tmp[drop * w + x];
    }
  }
  return out;
}

/** Square erosion: what survives is what has no background within r. Outside the picture counts as background. */
function erode(bin: Uint8Array, w: number, h: number, r: number): Uint8Array {
  if (r <= 0) return bin;
  // erode(A) = not dilate(not A), with the border treated as background
  const inv = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) inv[i] = bin[i] ? 0 : 1;
  const grown = dilate(inv, w, h, r);
  const out = new Uint8Array(bin.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    out[i] = grown[i] || x < r || y < r || x >= w - r || y >= h - r ? 0 : 1;
  }
  return out;
}

/** Close = dilate then erode: joins strokes the threshold broke, without fattening them. */
const close = (bin: Uint8Array, w: number, h: number, r = 1) => erode(dilate(bin, w, h, r), w, h, r);

/**
 * Symmetry, applied to the edge strength before anything is thresholded: each pixel keeps
 * the weaker of itself and its mirror twin (the twin's strongest neighbour within `t`, to
 * forgive corners dragged a little off). A real groove is strong on both sides of a
 * symmetric door, so it passes; grain and noise are strong on one side only, so they drop
 * below the bar before they can join anything.
 */
function mirrorMin(m: Float32Array, w: number, h: number, t: number): Float32Array {
  const out = new Float32Array(m.length);
  for (let y = 0; y < h; y++) {
    const o = y * w;
    for (let x = 0; x < w; x++) {
      const mx = w - 1 - x;
      let best = 0;
      for (let dx = -t; dx <= t; dx++) {
        const xx = mx + dx;
        if (xx < 0 || xx >= w) continue;
        for (let dy = -t; dy <= t; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= h) continue;
          const v = m[yy * w + xx];
          if (v > best) best = v;
        }
      }
      out[o + x] = Math.min(m[o + x], best);
    }
  }
  return out;
}

/**
 * Keep what has a twin on the other side of the centre line. The twin is looked for
 * within a small tolerance, because the corners are dragged by hand and the photo is never
 * quite square-on: a carving that is symmetric on the wood is a few pixels off in the photo.
 */
function keepSymmetric(bin: Uint8Array, w: number, h: number): Uint8Array {
  const mir = new Uint8Array(bin.length);
  for (let y = 0; y < h; y++) {
    const o = y * w;
    for (let x = 0; x < w; x++) mir[o + x] = bin[o + w - 1 - x];
  }
  const near = dilate(mir, w, h, Math.max(2, Math.round(w * 0.012)));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin[i] & near[i];
  return out;
}

/** Clear the eraser's dabs out of the mask; with the mirror on, each dab clears its twin too. */
function applyErase(bin: Uint8Array, w: number, h: number, dots: EraseDot[], mirror: boolean): Uint8Array {
  if (!dots.length) return bin;
  const out = bin.slice();
  const dab = (cx: number, cy: number, r: number) => {
    const r2 = r * r;
    for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(h - 1, Math.ceil(cy + r)); y++)
      for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(w - 1, Math.ceil(cx + r)); x++)
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r2) out[y * w + x] = 0;
  };
  for (const d of dots) {
    const r = Math.max(1, d.r * w);
    dab(d.x * w, d.y * h, r);
    if (mirror) dab((1 - d.x) * w, d.y * h, r);
  }
  return out;
}

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
    pathomit: 8,              // outlines shorter than this are noise, not carving
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

// ---------------------------------------------------------------- relief mask (photo mode)

/**
 * Hysteresis, the Canny way: a pixel is kept if it is strong, or if it is merely
 * "fair" but joined to something strong. A groove fades in and out along its length as
 * it turns towards and away from the light; one threshold breaks it into dashes, this
 * keeps the whole curve while still refusing grain that never gets strong anywhere.
 */
function hysteresis(m: Float32Array, w: number, h: number, lo: Float32Array, hi: Float32Array): Uint8Array {
  const out = new Uint8Array(m.length);
  const stack: number[] = [];
  for (let i = 0; i < m.length; i++) {
    if (m[i] < hi[i] || out[i]) continue;
    out[i] = 1; stack.push(i);
    while (stack.length) {
      const j = stack.pop()!;
      const x = j % w, y = (j / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const yy = y + dy, xx = x + dx;
        if (yy < 0 || xx < 0 || yy >= h || xx >= w) continue;
        const k = yy * w + xx;
        if (!out[k] && m[k] >= lo[k]) { out[k] = 1; stack.push(k); }
      }
    }
  }
  return out;
}

/**
 * Fill the small enclosed gaps of a mask. Sobel fires on both banks of a groove, so a
 * stroke arrives as two threads with a slit between them, and a small rosette arrives as
 * a ring. Any background pocket that does not reach the border and is smaller than
 * `maxArea` is filled; the big open spaces of the panel are left alone.
 */
function fillHoles(bin: Uint8Array, w: number, h: number, maxArea: number, thin: number, tiny = 0): Uint8Array {
  const out = bin.slice();
  // a background pixel is "roomy" if a (2*thin+1) square around it is all background;
  // a pocket with no roomy pixel at all is a slit between two banks, not a real opening
  const roomy = erode(Uint8Array.from(bin, (v) => (v ? 0 : 1)), w, h, thin);
  const seen = new Uint8Array(bin.length);
  const stack: number[] = [], pocket: number[] = [];
  for (let s = 0; s < bin.length; s++) {
    if (bin[s] || seen[s]) continue;
    stack.length = 0; pocket.length = 0;
    stack.push(s); seen[s] = 1;
    let border = false, open = false;
    while (stack.length) {
      const i = stack.pop()!;
      if (roomy[i]) open = true;
      if (pocket.length <= maxArea) pocket.push(i);
      const x = i % w, y = (i / w) | 0;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) border = true;
      if (x > 0 && !bin[i - 1] && !seen[i - 1]) { seen[i - 1] = 1; stack.push(i - 1); }
      if (x < w - 1 && !bin[i + 1] && !seen[i + 1]) { seen[i + 1] = 1; stack.push(i + 1); }
      if (y > 0 && !bin[i - w] && !seen[i - w]) { seen[i - w] = 1; stack.push(i - w); }
      if (y < h - 1 && !bin[i + w] && !seen[i + w]) { seen[i + w] = 1; stack.push(i + w); }
    }
    // pinholes are always filled: on a noisy photo they are what makes a stroke look fuzzy
    const fill = !border && pocket.length <= maxArea && (!open || pocket.length <= tiny);
    if (fill) for (const i of pocket) out[i] = 1;
  }
  return out;
}

/** The value below which share `p` of the samples fall (sampled, so it stays cheap). */
function percentile(a: Float32Array, p: number): number {
  const step = Math.max(1, Math.floor(a.length / 40000));
  const s: number[] = [];
  for (let i = 0; i < a.length; i += step) s.push(a[i]);
  s.sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))];
}

/**
 * Sobel magnitude with the wood grain damped.
 *
 * Grain runs one way across the whole leaf, so its edges all share one gradient
 * direction; carving turns through every direction. The structure tensor summed over the
 * picture finds that shared direction and how dominant it is (coherence), and the part of
 * each gradient pointing that way is shrunk in proportion. A carved line that happens to
 * run with the grain is damped too, but a groove is far sharper than a grain streak, so
 * it still clears the bar Otsu sets afterwards.
 */
function grainAwareGradient(g: Float32Array, w: number, h: number): Float32Array {
  const n = g.length;
  const gx = new Float32Array(n), gy = new Float32Array(n);
  let jxx = 0, jyy = 0, jxy = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const tl = g[i - w - 1], t = g[i - w], tr = g[i - w + 1];
      const l = g[i - 1], rr = g[i + 1];
      const bl = g[i + w - 1], bb = g[i + w], br = g[i + w + 1];
      const X = tl + 2 * l + bl - tr - 2 * rr - br;
      const Y = tl + 2 * t + tr - bl - 2 * bb - br;
      gx[i] = X; gy[i] = Y;
      jxx += X * X; jyy += Y * Y; jxy += X * Y;
    }
  }
  const tr = jxx + jyy || 1;
  const coherence = Math.sqrt((jxx - jyy) ** 2 + 4 * jxy * jxy) / tr;
  const theta = 0.5 * Math.atan2(2 * jxy, jxx - jyy);
  const ux = Math.cos(theta), uy = Math.sin(theta);
  // no clear grain (a painted door, a drawing) -> leave the gradient alone
  const damp = Math.min(0.75, Math.max(0, (coherence - 0.1) * 1.5));

  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const along = gx[i] * ux + gy[i] * uy;
    const across = -gx[i] * uy + gy[i] * ux;
    const a = along * (1 - damp);
    out[i] = Math.sqrt(a * a + across * across);
  }
  // Scale by a high percentile, not the maximum: one hard edge (the door frame, a white
  // wall beside it) would otherwise squash every groove into the bottom few grey levels
  // and leave Otsu nothing to separate.
  const ref = percentile(out, 0.99) || 1;
  for (let i = 0; i < n; i++) out[i] = Math.min(255, (out[i] / ref) * 255);
  return out;
}

/**
 * Photo of a carved door -> mask of its grooves.
 *
 *  - blur first, harder than ink mode: wood grain is fine, high-frequency texture, the
 *    bevel of a groove is a few pixels wide, so a small blur removes much more grain than
 *    carving
 *  - Sobel magnitude, so the light direction does not matter
 *  - hysteresis between two bars Otsu picks from the picture itself
 *  - close the slit between the two banks, then fill the small pockets left, so every
 *    groove is one solid stroke instead of two broken threads
 */
function reliefMask(g: Float32Array, w: number, h: number, detail: number, symmetric: boolean): Uint8Array {
  const scale = Math.min(w, h) / 450;
  const br = Math.max(1, Math.round(1.5 * scale));
  let m = grainAwareGradient(blur(blur(g, w, h, br), w, h, br), w, h);
  if (symmetric) m = mirrorMin(m, w, h, Math.max(1, Math.round(w * 0.008)));
  const g0 = otsuFloor(m, detail) * 1.15;
  // Both bars are also held relative to the neighbourhood. On a deeply carved door the
  // gradient is high almost everywhere, so a single global bar lets whole panels through
  // as one black slab; asking each pixel to beat its own surroundings keeps the gaps
  // between leaves open there, while on a sparse design the local mean is near zero and
  // the global bar is what decides.
  const r = Math.max(6, Math.round(Math.min(w, h) / 30));
  const I = integral(m, w, h);
  const sq = new Float32Array(m.length);
  for (let i = 0; i < m.length; i++) sq[i] = m[i] * m[i];
  const I2 = integral(sq, w, h);
  const k = 0.6 - detail * 0.6;
  // The global bar itself is also scaled per region. One photo often holds carving of two
  // depths - a deep top panel and a shallow bottom one, or light falling off down the
  // door - and one bar for both either loses the shallow half or, with Detail raised to
  // catch it, floods the deep half. So each region's bar follows how strong the edges are
  // in that region (a window about a fifth of the door), against the photo as a whole.
  // Clamped, so a plain stretch of wood is never asked for less than a quarter of the bar.
  const R = Math.max(r * 2, Math.round(Math.min(w, h) / 5));
  let total = 0;
  for (let i = 0; i < m.length; i++) total += m[i];
  const globalMean = total / m.length || 1;
  const hi = new Float32Array(m.length), lo = new Float32Array(m.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const { sum, n } = boxAt(I, w, h, x, y, r);
    const { sum: s2 } = boxAt(I2, w, h, x, y, r);
    const mean = sum / n, std = Math.sqrt(Math.max(0, s2 / n - mean * mean));
    const big = boxAt(I, w, h, x, y, R);
    const gain = Math.min(1.15, Math.max(0.25, Math.pow(big.sum / big.n / globalMean, 0.85)));
    const floor = g0 * gain;
    const i = y * w + x;
    hi[i] = Math.max(floor, mean + k * std);
    lo[i] = Math.max(floor * 0.6, mean * (1.4 - detail * 0.8));
  }
  let bin = hysteresis(m, w, h, lo, hi);
  const cr = Math.max(1, Math.round(1.5 * scale));
  bin = close(bin, w, h, cr);
  bin = fillHoles(bin, w, h, Math.round(w * h * 0.0015), Math.max(2, Math.round(2.5 * scale)), Math.round(w * h * 0.00006));
  // No opening (erode-then-dilate) here on purpose: it does shed crumbs on a noisy photo,
  // but it also deletes every groove under three pixels wide, which on a shallow carving
  // is most of the design. Noise is handled by the mirror option and the eraser instead.
  return bin;
}

/**
 * The shadow reading: every pixel clearly darker than its neighbourhood. In a carving the
 * recesses - the background cut away between leaves, the holes of a jali, the bottom of
 * a groove - sit in shadow, and the raised work catches the light. On deep, dense carving
 * this is the only signal that stays readable: there, nearly every pixel is an "edge", so
 * the relief reading turns into a crumbly slab, but the shadows still trace the pattern.
 *
 * On its own it also takes in every dark grain streak, which is why carvingMask below
 * only keeps the shadows that sit next to a real carved edge.
 */
function shadowMask(g: Float32Array, w: number, h: number, detail: number): Uint8Array {
  const scale = Math.min(w, h) / 450;
  const br = Math.max(1, Math.round(1.2 * scale));
  const s = blur(blur(g, w, h, br), w, h, br);          // JPEG noise and fine grain out first
  const r = Math.max(6, Math.round(Math.min(w, h) / 16)); // about the size of one motif
  const I = integral(s, w, h);
  const sq = new Float32Array(s.length);
  for (let i = 0; i < s.length; i++) sq[i] = s[i] * s[i];
  const I2 = integral(sq, w, h);
  // detail 0..1 -> how far below the local mean a pixel must be: 0.9..-0.1 deviations
  const k = 0.9 - detail;
  const out = new Uint8Array(s.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const { sum, n } = boxAt(I, w, h, x, y, r);
    const { sum: s2 } = boxAt(I2, w, h, x, y, r);
    const mean = sum / n, std = Math.sqrt(Math.max(0, s2 / n - mean * mean));
    const i = y * w + x;
    // std > 1.5: a perfectly flat patch has no carving in it, whatever its noise says.
    // Kept low on purpose - a shallow panel or one in poor light is still carving.
    out[i] = s[i] < mean - k * std && std > 1.5 ? 1 : 0;
  }
  return out;
}

/**
 * Photo of a carved door -> mask of the carving.
 *
 * Shadow AND near a carved edge. Each reading covers the other's blind spot: the relief
 * reading knows a carved edge from a grain streak (the grain direction is damped, and a
 * streak has no sharp edge), and the shadow reading draws the pattern where the relief
 * reading is a slab. Tested on photographed doors from Commons - jali, dense floral
 * panels, geometric panels, a relief scene - and on the shop's own grainy samples.
 */
function carvingMask(g: Float32Array, w: number, h: number, opts: ExtractOptions): Uint8Array {
  const scale = Math.min(w, h) / 450;
  const shadow = shadowMask(g, w, h, opts.detail);
  const relief = reliefMask(g, w, h, opts.detail, !!opts.symmetric);
  const near = dilate(relief, w, h, Math.max(1, Math.round(3 * scale)));
  let out: Uint8Array = new Uint8Array(shadow.length);
  for (let i = 0; i < out.length; i++) out[i] = shadow[i] & near[i];
  const weight = Math.max(0, Math.min(3, Math.round(opts.weight ?? 1)));
  if (weight) out = dilate(out, w, h, weight);
  return out;
}

// ---------------------------------------------------------------- orchestrator

/**
 * `density` is the share of the carving's own area that is actually cut, 0..1: how much of
 * the leaf the carver's chisel has to cover. Together with `paths` it is what the website
 * estimates a never-priced carving from (backend lib/carvingEstimate.ts).
 */
export type ExtractResult = { svg: string; preview: ImageData; paths: number; coverage: number; density: number };

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

  const g = flatten(gray(flatImg), w, h);
  // A photographed carving is read through its shading; a drawn design is read directly.
  let bin = opts.kind === "DOOR"
    ? carvingMask(g, w, h, opts)
    : close(localThreshold(g, w, h, opts.detail, opts.invert, null), w, h, 1);

  if (opts.symmetric) bin = keepSymmetric(bin, w, h);
  bin = applyErase(bin, w, h, opts.erase ?? [], !!opts.symmetric);

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
  // "Shapes" counts every outline, holes included, not every <path>. Photo mode joins a
  // groove's broken pieces into one connected stroke, so a whole carved panel can come out
  // as one or two <path> elements - and the website prices a customer's carving from this
  // number (backend lib/carvingEstimate.ts). Each M starts one outline: a rosette, a ring,
  // the gap between two leaves. That tracks how much the carver actually has to cut.
  const paths = (svg.match(/M\s*-?\d/g) || []).length;
  let ink = 0;
  for (let i = 0; i < bin.length; i++) ink += bin[i];
  // measured inside the carving's own box, so loose corners do not dilute it
  const density = box.empty ? 0 : ink / Math.max(1, box.w * box.h);
  return { svg, preview, paths, coverage, density };
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
