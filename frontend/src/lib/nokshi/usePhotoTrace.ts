"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULTS, EraseDot, ExtractOptions, PhotoKind, Pt, extractDesign, fileToImageData } from "./extract";

/**
 * Everything the photo -> carving screens share: the picture, the four corners, the
 * options, the eraser, and running the tracer.
 *
 * Two screens use it - the admin's (DesignUploadModal) and the customer's (PhotoCarving) -
 * and they used to carry a copy each, so every fix had to be made twice and the two
 * drifted apart. They differ only in what is around the tracer (prices, names, colours,
 * wording), never in how the tracing works, so that part lives here once.
 */

export const START_CORNERS: Pt[] = [{ x: 0.12, y: 0.06 }, { x: 0.88, y: 0.06 }, { x: 0.88, y: 0.94 }, { x: 0.12, y: 0.94 }];

export function usePhotoTrace(open: boolean, nothingMsg: string) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [src, setSrc] = useState<ImageData | null>(null);
  /** The picture as the customer chose it - the customer screen sends it on with the request. */
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [corners, setCorners] = useState<Pt[]>(START_CORNERS);
  const [opts, setOpts] = useState<ExtractOptions>(DEFAULTS);
  const [svg, setSvg] = useState("");
  const [paths, setPaths] = useState(0);
  const [coverage, setCoverage] = useState(0);
  const [density, setDensity] = useState(0);
  const [mask, setMask] = useState<ImageData | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const drag = useRef<number | null>(null);

  // The dialog stays mounted between openings, so without this the second photo would
  // open on the first one's result. Done while rendering rather than in an effect, the
  // way React recommends for "reset when a prop changes": no extra render, no flash of
  // the old carving.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setStep(1); setSrc(null); setFile(null); setSvg(""); setPaths(0); setCoverage(0); setDensity(0); setMask(null);
      setErr(""); setOpts(DEFAULTS); setCorners(START_CORNERS);
      setPreview("");            // the effect below revokes the old object URL as it goes
    }
  }

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setErr("");
    try {
      const data = await fileToImageData(file);
      setSrc(data);
      setFile(file);
      setSvg(""); setPaths(0); setCoverage(0); setDensity(0); setMask(null);
      setOpts((o) => ({ ...o, erase: [] }));
      setPreview((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(file); });
      setStep(2);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  };

  /** Pointer handlers for the corner dots. Spread `cornerBox` on the box that holds the photo. */
  const startDrag = (i: number) => (e: React.PointerEvent) => {
    drag.current = i;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const cornerBox = {
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const i = drag.current;
      if (i === null) return;
      const r = e.currentTarget.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      setCorners((c) => c.map((p, k) => (k === i ? { x, y } : p)));
      // Eraser dabs are placed on the straightened picture; move a corner and that picture
      // moves under them, so they would land on the wrong spots. They go with the corners.
      setOpts((o) => (o.erase.length ? { ...o, erase: [] } : o));
    },
    onPointerUp: () => { drag.current = null; },
    onPointerLeave: () => { drag.current = null; },
  };

  const setKind = (k: PhotoKind) => setOpts((o) => ({ ...o, kind: k, dropHandle: k === "DOOR", dropLines: k === "DOOR" }));
  const setErase = (erase: EraseDot[]) => setOpts((o) => ({ ...o, erase }));
  /** Back to the defaults, but keep what the photo is of: that was chosen on the corners screen. */
  const resetOpts = () => setOpts((o) => ({ ...DEFAULTS, kind: o.kind, dropHandle: o.kind === "DOOR", dropLines: o.kind === "DOOR" }));

  const run = useCallback(async () => {
    if (!src) return;
    setBusy(true); setErr("");
    await new Promise((r) => setTimeout(r, 30));   // let the spinner paint first
    try {
      const px = corners.map((p) => ({ x: p.x * src.width, y: p.y * src.height }));
      const out = extractDesign(src, px, opts);
      setSvg(out.svg); setPaths(out.paths); setCoverage(out.coverage); setDensity(out.density); setMask(out.preview);
      if (!out.svg) setErr(nothingMsg);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  }, [src, corners, opts, nothingMsg]);

  useEffect(() => {
    if (step !== 3) return;
    const t = setTimeout(run, 250);
    return () => clearTimeout(t);
  }, [step, run]);

  return {
    step, setStep, file, preview, corners, startDrag, cornerBox,
    opts, setOpts, setKind, setErase, resetOpts,
    svg, paths, coverage, density, mask, busy, err, setErr, pick,
  };
}
