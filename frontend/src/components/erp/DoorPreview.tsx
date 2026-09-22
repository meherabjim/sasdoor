"use client";

import { useEffect, useMemo, useState } from "react";
import { sanitizeSvg } from "@/lib/nokshi/sanitizeSvg";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const N = require("@/lib/nokshi/render.js");

export const toneOf: (hex: string) => string = N.toneOf;
export const lum: (hex: string) => number = N.lum;

/** Resolve nokshi color: tone-on-tone uses a shade of the door color */
export const ornColor = (doorHex: string, designColor?: { colorCode: string; isToneOnTone: boolean } | null) =>
  !designColor || designColor.isToneOnTone ? toneOf(doorHex) : designColor.colorCode;

/**
 * An uploaded carving lives as an .svg on the backend, so it has to be fetched before
 * it can be drawn. One module-level cache keeps the gallery from re-fetching the same
 * file for every tile, and the text is sanitised on arrival: the renderer drops it
 * straight into the DOM, so nothing unchecked may reach it - not even from our own API.
 */
const svgCache = new Map<string, string>();

export function useDesignSvg(url?: string | null): string | null {
  // What the cache already holds is worked out during render, not in the effect;
  // the effect only exists to fetch what is missing.
  const cached = url ? svgCache.get(url) : undefined;
  const [fetched, setFetched] = useState<{ url: string; svg: string } | null>(null);

  useEffect(() => {
    if (!url || cached !== undefined) return;
    let alive = true;
    fetch(url)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error("not found"))))
      .then((t) => sanitizeSvg(t))
      .catch(() => "")                       // a missing drawing just renders a plain leaf
      .then((clean) => {
        svgCache.set(url, clean);
        if (alive) setFetched({ url, svg: clean });
      });
    return () => { alive = false; };
  }, [url, cached]);

  if (!url) return null;
  if (cached !== undefined) return cached || null;
  return fetched?.url === url ? fetched.svg || null : null;
}

/**
 * Has this drawing finished loading - arrived, or failed for good?
 *
 * useDesignSvg returns null both while a carving is still on its way and when there is no
 * carving at all, which is exactly right for drawing (a plain door either way) and exactly
 * wrong for printing: fire the print dialog a moment too early and the customer's copy comes
 * out with a blank door on it. Anything waiting on the drawing asks this first.
 */
export const designSvgSettled = (url?: string | null) => !url || svgCache.has(url);

/** Drop a freshly traced carving into the cache, so the preview shows it before it is saved. */
export const primeDesignSvg = (url: string, svg: string) => svgCache.set(url, sanitizeSvg(svg));

type Fit = { scale?: number; dx?: number; dy?: number } | null;

export function DoorPreview({ type, heightFt, widthFt, doorHex, designKey, designSvg, fit, ornHex, dims = true, className = "" }: {
  type: "SINGLE" | "DOUBLE"; heightFt: number; widthFt: number; doorHex: string;
  designKey?: string | null; designSvg?: string | null; fit?: Fit; ornHex: string; dims?: boolean; className?: string;
}) {
  const out = useMemo(
    () => N.renderDoor({ type, heightFt, widthFt, doorHex, designKey, designSvg: designSvg ?? null, fit: fit ?? null, ornHex, dims }),
    [type, heightFt, widthFt, doorHex, designKey, designSvg, fit, ornHex, dims],
  );
  return <svg viewBox={out.viewBox} className={className} role="img" aria-label="Door preview" dangerouslySetInnerHTML={{ __html: out.svg }} />;
}

export function DoorThumb({ designKey, designSvg, doorHex, ornHex, className = "" }: {
  designKey?: string | null; designSvg?: string | null; doorHex: string; ornHex: string; className?: string;
}) {
  const out = useMemo(() => N.renderThumb(designKey, doorHex, ornHex, designSvg ?? null), [designKey, designSvg, doorHex, ornHex]);
  return <svg viewBox={out.viewBox} className={className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: out.svg }} />;
}

/** Gallery tile: fetches its own drawing when the carving is an uploaded one. */
export function DesignThumb({ design, doorHex, ornHex, className = "" }: {
  design: { key?: string | null; svgUrl?: string | null; origin?: string } | null;
  doorHex: string; ornHex: string; className?: string;
}) {
  const svg = useDesignSvg(design?.origin === "UPLOADED" ? design?.svgUrl : null);
  return <DoorThumb designKey={design?.key ?? null} designSvg={svg} doorHex={doorHex} ornHex={ornHex} className={className} />;
}
