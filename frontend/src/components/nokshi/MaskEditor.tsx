"use client";

import { useEffect, useRef, useState } from "react";
import type { EraseDot } from "@/lib/nokshi/extract";

/**
 * The black-and-white mask the tracer actually read, with an eraser on top.
 *
 * Whatever the tracer gets wrong on a difficult photo - a patch of grain, a reflection,
 * the hinge - shows up here as a dark blob, and a finger rubs it out. The strokes are
 * handed back as relative dots and the tracer runs again with them, so the door preview
 * beside it updates on its own. With the mirror option on, every dab also clears its twin
 * on the other side, the same way the mirror keeps only twinned shapes.
 */

export type MaskLabels = { title: string; hint: string; brush: string; undo: string; clear: string };

export function MaskEditor({ mask, erase, onErase, mirror, accent, labels, className = "" }: {
  mask: ImageData | null;
  erase: EraseDot[];
  onErase: (dots: EraseDot[]) => void;
  mirror: boolean;
  accent: string;
  labels: MaskLabels;
  className?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState(0.025);                 // brush radius, share of the width
  const stroke = useRef<EraseDot[] | null>(null);
  // where each committed stroke ended in `erase`, so Undo takes back a whole stroke
  const ends = useRef<number[]>([]);

  // Draw the mask, then the dabs of the stroke in progress on top of it. The committed
  // dabs are already gone from the mask itself, because the tracer applied them.
  const paint = () => {
    const cv = canvas.current;
    if (!cv || !mask) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(mask, 0, 0);
    const live = stroke.current;
    if (!live?.length) return;
    ctx.fillStyle = "rgba(220, 38, 38, 0.45)";
    for (const d of live) {
      const r = d.r * cv.width;
      ctx.beginPath(); ctx.arc(d.x * cv.width, d.y * cv.height, r, 0, Math.PI * 2); ctx.fill();
      if (mirror) { ctx.beginPath(); ctx.arc((1 - d.x) * cv.width, d.y * cv.height, r, 0, Math.PI * 2); ctx.fill(); }
    }
  };

  useEffect(() => {
    const cv = canvas.current;
    if (!cv || !mask) return;
    if (cv.width !== mask.width || cv.height !== mask.height) { cv.width = mask.width; cv.height = mask.height; }
    paint();
  });

  // the parent can clear the eraser (new photo, corners moved): forget strokes past its end
  const trim = () => {
    while (ends.current.length && ends.current[ends.current.length - 1] > erase.length) ends.current.pop();
  };

  const at = (e: React.PointerEvent<HTMLCanvasElement>): EraseDot => {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
      r: size,
    };
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    stroke.current = [at(e)];
    paint();
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const s = stroke.current;
    if (!s) return;
    const p = at(e), last = s[s.length - 1];
    // fill the gap a fast drag leaves between two pointer events, so the line is unbroken
    const gap = Math.hypot(p.x - last.x, p.y - last.y), step = size * 0.6;
    for (let k = 1, n = Math.ceil(gap / step); k <= n; k++) {
      const t = k / n;
      s.push({ x: last.x + (p.x - last.x) * t, y: last.y + (p.y - last.y) * t, r: size });
    }
    paint();
  };
  const up = () => {
    const s = stroke.current;
    stroke.current = null;
    if (!s?.length) return;
    trim();
    const next = [...erase, ...s];
    ends.current.push(next.length);
    onErase(next);
  };

  const undo = () => {
    trim();
    ends.current.pop();
    onErase(erase.slice(0, ends.current.length ? ends.current[ends.current.length - 1] : 0));
  };

  return (
    <div className={className}>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: accent }}>{labels.title}</div>
      <div className="flex justify-center rounded-lg bg-[#efeae3] p-2">
        {mask
          ? <canvas ref={canvas} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
              className="max-h-[48vh] max-w-full touch-none rounded" style={{ cursor: "crosshair" }} />
          : <div className="flex h-40 items-center text-xs text-[#9a8b7e]">…</div>}
      </div>
      <p className="mt-1.5 text-xs text-[#7a6a5d]">{labels.hint}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-[#7a6a5d]">
          {labels.brush}
          <input type="range" min={0.008} max={0.07} step={0.002} value={size}
            onChange={(e) => setSize(Number(e.target.value))} className="w-28" style={{ accentColor: accent }} />
        </label>
        <button type="button" disabled={!erase.length} onClick={undo}
          className="rounded-md border border-[#e0d6ca] px-2.5 py-1 text-xs disabled:opacity-40">{labels.undo}</button>
        <button type="button" disabled={!erase.length} onClick={() => { ends.current = []; onErase([]); }}
          className="rounded-md border border-[#e0d6ca] px-2.5 py-1 text-xs disabled:opacity-40">{labels.clear}</button>
      </div>
    </div>
  );
}
