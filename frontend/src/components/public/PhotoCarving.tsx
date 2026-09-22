"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DoorPreview } from "@/components/erp/DoorPreview";
import { DEFAULTS, ExtractOptions, Pt, extractDesign, fileToImageData } from "@/lib/nokshi/extract";

/**
 * "I saw a door I liked" - the customer's own photo, on their own door.
 *
 * This is the admin's tracing tool with everything the customer has no business seeing
 * taken off it. No price, no margin, no gallery, no name: the shop's money lives on the
 * other side of the login. What is left is the part a customer actually wants - point at
 * a photo, pull four corners around the carving, and watch it appear on the door they
 * have been building.
 *
 * The tracing runs entirely in this browser. Nothing is uploaded until they send the
 * request, and what is sent then is the finished drawing, not the photograph - a picture
 * of somebody's front door is not ours to keep.
 */

export type TracedCarving = { svg: string; shapes: number; coverage: number };

const LABELS = ["top-left", "top-right", "bottom-right", "bottom-left"];
const START: Pt[] = [{ x: 0.12, y: 0.06 }, { x: 0.88, y: 0.06 }, { x: 0.88, y: 0.94 }, { x: 0.12, y: 0.94 }];

export function PhotoCarving({ open, onClose, onUse, door, t }: {
  open: boolean;
  onClose: () => void;
  onUse: (c: TracedCarving) => void;
  door: { type: "SINGLE" | "DOUBLE"; heightFt: number; widthFt: number; doorHex: string; ornHex: string };
  t: Record<string, string>;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [src, setSrc] = useState<ImageData | null>(null);
  const [preview, setPreview] = useState("");
  const [corners, setCorners] = useState<Pt[]>(START);
  const [opts, setOpts] = useState<ExtractOptions>(DEFAULTS);
  const [svg, setSvg] = useState("");
  const [shapes, setShapes] = useState(0);
  const [coverage, setCoverage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [tuning, setTuning] = useState(false);

  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<number | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  // The dialog stays mounted, so a second photo must not open on the first one's result.
  useEffect(() => {
    if (!open) return;
    setStep(1); setSrc(null); setSvg(""); setShapes(0); setCoverage(0);
    setErr(""); setOpts(DEFAULTS); setCorners(START); setTuning(false); setPreview("");
  }, [open]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setErr("");
    try {
      setSrc(await fileToImageData(file));
      setSvg(""); setShapes(0); setCoverage(0);
      setPreview((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(file); });
      setStep(2);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  };

  const moveCorner = (e: React.PointerEvent) => {
    const i = drag.current, box = boxRef.current;
    if (i === null || !box) return;
    const r = box.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    setCorners((c) => c.map((p, k) => (k === i ? { x, y } : p)));
  };

  const run = useCallback(async () => {
    if (!src) return;
    setBusy(true); setErr("");
    await new Promise((r) => setTimeout(r, 30));
    try {
      const px = corners.map((p) => ({ x: p.x * src.width, y: p.y * src.height }));
      const out = extractDesign(src, px, opts);
      setSvg(out.svg); setShapes(out.paths); setCoverage(out.coverage);
      if (!out.svg) setErr(t.photoNothing);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  }, [src, corners, opts, t.photoNothing]);

  useEffect(() => {
    if (step !== 3) return;
    const id = setTimeout(run, 250);
    return () => clearTimeout(id);
  }, [step, opts, run]);

  if (!open) return null;

  const btn = "rounded-md px-5 py-2.5 font-semibold transition disabled:opacity-50";
  const slider = (k: "detail" | "minSpeck" | "smooth", label: string, min: number, max: number, stp: number) => (
    <label key={k} className="block">
      <span className="mb-1 block text-xs font-medium text-[#6d5442]">{label}</span>
      <input type="range" min={min} max={max} step={stp} value={opts[k]}
        onChange={(e) => setOpts((o) => ({ ...o, [k]: Number(e.target.value) }))} className="w-full accent-[#9b5528]" />
    </label>
  );

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-8" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={t.photoTitle} onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-3xl rounded-xl bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold text-[#2f241d]">{t.photoTitle}</h3>
            <p className="mt-1 text-sm text-[#6d5442]">{t.photoSub}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md border border-[#d9be9b] px-3 py-1.5 text-sm">✕</button>
        </div>

        <ol className="mb-5 flex gap-2 text-xs">
          {[t.photoStep1, t.photoStep2, t.photoStep3].map((label, i) => (
            <li key={label} className={`flex-1 rounded-md px-3 py-2 text-center font-medium ${step === i + 1 ? "bg-[#46281b] text-white" : step > i + 1 ? "bg-[#f0e2cf] text-[#8a6f5a]" : "bg-[#faf3ea] text-[#b9a793]"}`}>
              {i + 1}. {label}
            </li>
          ))}
        </ol>

        {err && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

        {/* ---------- 1. the photo ---------- */}
        {step === 1 && (
          <div>
            <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-[#d9be9b] bg-[#faf3ea] px-6 py-12 text-center hover:border-[#9b5528]">
              <span className="text-3xl">🖼️</span>
              <span className="text-sm font-semibold text-[#2f241d]">{t.photoPick}</span>
              <span className="text-xs text-[#8a6f5a]">JPG, PNG, WebP</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
            </label>
            <p className="mt-4 rounded-md bg-[#faf3ea] px-3 py-2.5 text-xs leading-5 text-[#6d5442]">{t.photoTip}</p>
          </div>
        )}

        {/* ---------- 2. the corners ---------- */}
        {step === 2 && preview && (
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_230px]">
            <div ref={boxRef} className="relative touch-none select-none overflow-hidden rounded-lg bg-[#efeae3]"
              onPointerMove={moveCorner} onPointerUp={() => (drag.current = null)} onPointerLeave={() => (drag.current = null)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" className="block max-h-[48vh] w-full object-contain" draggable={false} />
              <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <polygon points={corners.map((p) => `${p.x * 100},${p.y * 100}`).join(" ")} fill="rgba(155,85,40,.16)" stroke="#9b5528" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
              </svg>
              {corners.map((p, i) => (
                <button key={i} type="button" aria-label={LABELS[i]}
                  onPointerDown={(e) => { drag.current = i; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); }}
                  className="absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#9b5528] shadow ring-1 ring-black/20"
                  style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }} />
              ))}
            </div>
            <div className="space-y-4">
              <div>
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#a15e2b]">{t.photoWhat}</span>
                <div className="grid grid-cols-2 overflow-hidden rounded-md border border-[#d9be9b]">
                  {([["DOOR", t.photoWhole], ["FLAT", t.photoPattern]] as const).map(([k, lb]) => (
                    <button key={k} type="button" aria-pressed={opts.kind === k}
                      onClick={() => setOpts((o) => ({ ...o, kind: k, dropHandle: k === "DOOR", dropLines: k === "DOOR" }))}
                      className={`py-2.5 text-sm font-medium ${opts.kind === k ? "bg-[#46281b] text-white" : "bg-white hover:bg-[#faf3ea]"}`}>{lb}</button>
                  ))}
                </div>
              </div>
              <p className="rounded-md bg-[#faf3ea] px-3 py-2.5 text-xs leading-5 text-[#6d5442]">{t.photoCorners}</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setStep(1)} className={`${btn} border border-[#d9be9b]`}>{t.photoBack}</button>
                <button type="button" onClick={() => setStep(3)} className={`${btn} flex-1 bg-[#9b5528] text-white`}>{t.photoRead}</button>
              </div>
            </div>
          </div>
        )}

        {/* ---------- 3. on the door ---------- */}
        {step === 3 && (
          <div>
            <div className="relative flex min-h-[320px] items-center justify-center rounded-lg bg-[#f5e8d7] p-4">
              {busy && <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/70 text-sm text-[#6d5442]">{t.photoReading}</div>}
              <DoorPreview type={door.type} heightFt={door.heightFt} widthFt={door.widthFt} doorHex={door.doorHex}
                designKey={null} designSvg={svg || null} ornHex={door.ornHex} dims={false} className="max-h-[48vh] w-full" />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${shapes ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                {shapes ? `${shapes} ${t.photoShapes}` : t.photoNone}
              </span>
              <button type="button" onClick={() => setTuning((v) => !v)} className="rounded-md px-2 py-1 text-xs text-[#6d5442] hover:bg-[#faf3ea]">{t.photoAdjust}</button>
              <button type="button" onClick={() => setStep(2)} className="rounded-md px-2 py-1 text-xs text-[#6d5442] hover:bg-[#faf3ea]">{t.photoRedo}</button>
            </div>

            {tuning && (
              <div className="mt-3 grid gap-3 rounded-lg border border-[#f0e2cf] p-3 sm:grid-cols-3">
                {slider("detail", t.photoDetail, 0, 1, 0.05)}
                {slider("minSpeck", t.photoSpecks, 0, 0.004, 0.0002)}
                {slider("smooth", t.photoSmooth, 0, 1, 0.05)}
              </div>
            )}

            <p className="mt-4 rounded-md bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">{t.photoNotFinal}</p>

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={onClose} className={`${btn} border border-[#d9be9b]`}>{t.photoCancel}</button>
              <button type="button" disabled={!svg || busy}
                onClick={() => onUse({ svg, shapes, coverage })}
                className={`${btn} bg-[#9b5528] text-white`}>{t.photoUse}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
