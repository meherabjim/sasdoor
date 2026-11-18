"use client";

import { useState } from "react";
import { Download, ExternalLink } from "lucide-react";

/**
 * The photo the customer traced their carving from, shown under the traced drawing.
 *
 * The drawing on the door is only the tracer's reading of that photo. To price the carving
 * the shop has to see the real one, and the carver has to cut from it - so it sits right
 * here, opens full size in a new tab, and downloads on its own as a file.
 *
 * The download goes through fetch rather than a plain <a download>: the photo is served by
 * the backend, a different origin, and browsers ignore `download` across origins - the
 * link would just open the picture instead of saving it.
 */
export function CustomerPhoto({ url, fileName, className = "" }: { url?: string | null; fileName: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!url) return null;

  const download = async () => {
    setBusy(true); setFailed(false);
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(String(r.status));
      const blob = await r.blob();
      const ext = (url.split(".").pop() || "jpg").toLowerCase();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${fileName}.${ext}`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch { setFailed(true); } finally { setBusy(false); }
  };

  return (
    <div className={`print:hidden ${className}`}>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[#7a6a5d]">Customer&apos;s original photo</div>
      <a href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border border-[#e8e0d6] bg-[#efeae3]" title="Open full size">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="The photo the customer sent" className="mx-auto max-h-72 w-auto object-contain" />
      </a>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={download} disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md bg-[#1f1712] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
          <Download className="h-3.5 w-3.5" />{busy ? "Downloading…" : "Download photo"}
        </button>
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-[#e0d6ca] px-3 py-1.5 text-xs text-[#4a3d33] hover:bg-[#faf7f3]">
          <ExternalLink className="h-3.5 w-3.5" />Open full size
        </a>
      </div>
      {failed && <p className="mt-1.5 text-xs text-red-700">The download did not work. Use “Open full size” and save it from there.</p>}
    </div>
  );
}
