"use client";

import { useEffect, useState } from "react";
import { ImagePlus, Loader2, RotateCcw, SlidersHorizontal } from "lucide-react";
import { api, errMsg, num, uploadFile } from "@/lib/erp";
import { Badge, Button, Field, Input, Modal, Toggle, useToast } from "@/components/erp/ui";
import { CrewBlock, PriceBlock } from "@/components/erp/PriceList";
import { DoorPreview, ornColor, primeDesignSvg } from "@/components/erp/DoorPreview";
import { MaskEditor } from "@/components/nokshi/MaskEditor";
import type { PhotoKind } from "@/lib/nokshi/extract";
import { usePhotoTrace } from "@/lib/nokshi/usePhotoTrace";

/**
 * Customer brings a photo, admin turns it into a carving.
 *
 * Three screens in one modal: pick the picture, drag the four corners around the leaf,
 * then look at the result and price it. The tracing happens entirely in this browser -
 * nothing is sent anywhere until the admin presses save.
 */

/** Only the origin is read back: it is what the "Customer carving N" count is taken from. */
type Design = { origin?: string };

type Props = {
  open: boolean;
  onClose: () => void;
  door: { type: "SINGLE" | "DOUBLE"; heightFt: number; widthFt: number; doorHex: string; designColor?: { colorCode: string; isToneOnTone: boolean } | null };
  onSaved: (design: { id: number; key: string; nameEn: string; svgUrl: string }) => void;
  /**
   * Where the finished carving lands.
   *
   * From the designer it is PRIVATE: the customer standing there has a photo, and that
   * carving belongs to their estimate until the shop decides it is worth keeping. From
   * the price list the intent is the opposite - you went there to build the gallery - so
   * it goes straight in as LIBRARY, ready for the next customer.
   */
  visibility?: "PRIVATE" | "LIBRARY";
};

const LABELS = ["top-left", "top-right", "bottom-right", "bottom-left"];

/** An empty carving, before the photo and the shop have filled it in. */
const BLANK = {
  nameEn: "", nameBn: "", noteEn: "From a customer photo",
  costSingle: "", costDouble: "", sellSingle: "", sellDouble: "",
  labourCostSingle: "", labourCostDouble: "", labourSellSingle: "", labourSellDouble: "",
  workersSingle: "", workersDouble: "", daysSingle: "", daysDouble: "",
};

/**
 * Adding a carving from a photo and typing one into the New form are the same job, so this
 * asks for the same things - the same name, note, price, labour and crew boxes, the very
 * widgets the New form uses. The only difference is where the drawing comes from: there you
 * pick one of the fifteen styles, here the photo is the style. Once it is saved there is
 * nothing to tell the two apart.
 *
 * Prices are typed in, never worked out. An earlier version guessed a figure from the
 * gallery and showed the margin behind it; both were wrong for this screen. The shop prices
 * its own carvings, and a margin is the shop's business and belongs nowhere a customer
 * might be standing.
 */
export function DesignUploadModal({ open, onClose, door, onSaved, visibility = "PRIVATE" }: Props) {
  const toast = useToast();
  const tr = usePhotoTrace(open, "Nothing came out of this photo. Open Adjust and raise the detail.");
  const { step, setStep, opts, setOpts, svg, paths, coverage, busy } = tr;
  const [tuning, setTuning] = useState(false);
  const [fit, setFit] = useState({ scale: 1, dy: 0 });
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const err = tr.err || saveErr;
  /** Everything the New form asks for, in the same shape it keeps it. */
  const [form, setForm] = useState<Record<string, string>>({ ...BLANK });
  const setF = (p: Record<string, string>) => setForm((x) => ({ ...x, ...p }));
  const [seq, setSeq] = useState(1);

  // The name is suggested rather than demanded: "Customer carving 1", "2", and so on. It is
  // an ordinary editable box, so anyone who has a better name for the carving types it.
  useEffect(() => {
    if (!open) return;
    api.get<Design[]>("/api/admin/designs")
      .then((all) => {
        const n = all.filter((x) => x.origin === "UPLOADED").length + 1;
        setSeq(n);
        setForm((x) => (x.nameEn || x.nameBn ? x : { ...x, nameEn: `Customer carving ${n}`, nameBn: `কাস্টমারের নকশা ${n}` }));
      })
      .catch(() => {});
  }, [open]);

  // The modal stays mounted between openings, so the second customer's photo must not
  // open with the first one's name, price or fit. The tracer part resets itself inside
  // usePhotoTrace; this is the rest. Done while rendering, the way React recommends for
  // "reset when a prop changes", instead of setState inside an effect.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) { setFit({ scale: 1, dy: 0 }); setForm({ ...BLANK }); setSaveErr(""); setTuning(false); }
  }

  const orn = ornColor(door.doorHex, door.designColor);
  const dbl = door.type === "DOUBLE";
  /**
   * PRIVATE means this was opened from the Designer, mid-estimate - which means a customer
   * is very likely standing beside the screen, because they are the one who brought the
   * photo. So the shop's cost and crew boxes stay off it. LIBRARY means Design Price, where
   * you are alone building the gallery, and the form is the New form in full.
   */
  const customerMayBeWatching = visibility === "PRIVATE";

  const save = async () => {
    if (!svg) return;
    setSaving(true); setSaveErr("");
    try {
      const f = new File([new Blob([svg], { type: "image/svg+xml" })], `nokshi-${Date.now()}.svg`, { type: "image/svg+xml" });
      const url = await uploadFile(f);
      primeDesignSvg(url, svg);
      // Exactly the body the New form sends, field for field - including the profit, which
      // neither form asks for: the server reads it off cost and price.
      const r = await api.post<{ id: number; key: string; nameEn: string; svgUrl: string }>("/api/admin/designs", {
        nameEn: form.nameEn.trim() || `Customer carving ${seq}`,
        nameBn: form.nameBn.trim() || `কাস্টমারের নকশা ${seq}`,
        noteEn: form.noteEn.trim() || null,
        svgUrl: url, origin: "UPLOADED", visibility, allowDouble: true, active: true,
        costSingle: num(form.costSingle), costDouble: num(form.costDouble),
        sellSingle: num(form.sellSingle), sellDouble: num(form.sellDouble),
        labourCostSingle: num(form.labourCostSingle), labourCostDouble: num(form.labourCostDouble),
        labourSellSingle: num(form.labourSellSingle), labourSellDouble: num(form.labourSellDouble),
        workersSingle: num(form.workersSingle), workersDouble: num(form.workersDouble),
        daysSingle: num(form.daysSingle), daysDouble: num(form.daysDouble),
      });
      toast(r.message || "Carving added");
      onSaved({ ...r.data, svgUrl: url });
      onClose();
    } catch (e) { setSaveErr(errMsg(e)); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Carving from a customer photo" wide>
      <ol className="mb-5 flex gap-2 text-xs">
        {["Pick a photo", "Mark the corners", "The carving"].map((s, i) => (
          <li key={s} className={`flex-1 rounded-lg px-3 py-2 text-center font-medium ${step === i + 1 ? "bg-[#1f1712] text-white" : step > i + 1 ? "bg-[#efe8df] text-[#7a6a5d]" : "bg-[#faf7f3] text-[#b3a597]"}`}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      {err && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

      {/* ---------------- 1. pick ---------------- */}
      {step === 1 && (
        <div>
          <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-[#e0d6ca] bg-[#faf7f3] px-6 py-12 text-center hover:border-[#c8963e]">
            <ImagePlus className="h-8 w-8 text-[#c8963e]" />
            <span className="text-sm font-semibold text-[#1f1712]">Photo of a door, or of a carving</span>
            <span className="text-xs text-[#7a6a5d]">JPG, PNG or WebP</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => tr.pick(e.target.files?.[0])} />
          </label>
          <div className="mt-4 rounded-lg bg-[#faf7f3] px-3 py-2.5 text-xs text-[#7a6a5d]">
            Light from the <b>side</b> works far better than a straight-on flash. A carving is read
            through the shadow in its grooves, and a flat front light leaves no shadow to read.
          </div>
        </div>
      )}

      {/* ---------------- 2. corners ---------------- */}
      {step === 2 && tr.preview && (
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_260px]">
          <div className="relative touch-none select-none overflow-hidden rounded-lg bg-[#efeae3]" {...tr.cornerBox}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={tr.preview} alt="" className="block max-h-[52vh] w-full object-contain" draggable={false} />
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polygon points={tr.corners.map((p) => `${p.x * 100},${p.y * 100}`).join(" ")} fill="rgba(200,150,62,.16)" stroke="#c8963e" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
            </svg>
            {tr.corners.map((p, i) => (
              <button key={i} aria-label={LABELS[i]} onPointerDown={tr.startDrag(i)}
                className="absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#c8963e] shadow ring-1 ring-black/20"
                style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }} />
            ))}
          </div>

          <div className="space-y-4">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#7a6a5d]">What is in the photo</div>
              <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-[#e0d6ca]">
                {([["DOOR", "A whole door"], ["FLAT", "Just the pattern"]] as [PhotoKind, string][]).map(([k, label]) => (
                  <button key={k} onClick={() => tr.setKind(k)} aria-pressed={opts.kind === k}
                    className={`py-2.5 text-sm font-medium ${opts.kind === k ? "bg-[#1f1712] text-white" : "bg-white hover:bg-[#faf7f3]"}`}>{label}</button>
                ))}
              </div>
              <p className="mt-2 text-xs text-[#9a8b7e]">
                {opts.kind === "DOOR" ? "Reads the shadow in the grooves and drops the handle." : "Treats it as dark ink on light paper."}
              </p>
            </div>
            <div>
              <Toggle checked={opts.symmetric} onChange={(v) => setOpts((o) => ({ ...o, symmetric: v }))} label="Same on left and right" />
              <p className="mt-1.5 text-xs text-[#9a8b7e]">
                For a symmetric carving: keeps only what appears on both sides, which drops most
                wood grain and glare. Leave it off if the design differs left to right.
              </p>
            </div>
            <p className="rounded-lg bg-[#faf7f3] px-3 py-2.5 text-xs text-[#7a6a5d]">
              Drag the four dots so they hold <b>the carved area only</b>. The tighter the box, the
              bigger and cleaner the carving comes out.
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" onClick={() => setStep(3)}>Read the carving</Button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- 3. the carving ---------------- */}
      {step === 3 && (
        <div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[#7a6a5d]">On the door</div>
              <div className="relative flex min-h-[340px] items-center justify-center rounded-lg bg-[#efeae3] p-4">
                {busy && <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-lg bg-white/70 text-sm text-[#7a6a5d]"><Loader2 className="h-5 w-5 animate-spin" />Reading…</div>}
                <DoorPreview type={door.type} heightFt={door.heightFt} widthFt={door.widthFt} doorHex={door.doorHex}
                  designKey={null} designSvg={svg || null} fit={fit} ornHex={orn} dims={false} className="max-h-[48vh] w-full" />
              </div>
            </div>
            <MaskEditor mask={tr.mask} erase={opts.erase} onErase={tr.setErase} mirror={opts.symmetric} accent="#7a6a5d"
              labels={{
                title: "What the photo gave",
                hint: "Rub out anything that is not carving: grain, glare, the hinge. The door updates by itself.",
                brush: "Brush", undo: "Undo", clear: "Clear eraser",
              }} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Badge tone={paths ? "green" : "red"}>{paths ? `${paths} shapes` : "nothing found"}</Badge>
            <button onClick={() => setTuning((v) => !v)} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[#7a6a5d] hover:bg-[#f3ece3]">
              <SlidersHorizontal className="h-3.5 w-3.5" />Adjust
            </button>
            <button onClick={() => setStep(2)} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[#7a6a5d] hover:bg-[#f3ece3]">
              <RotateCcw className="h-3.5 w-3.5" />Change corners
            </button>
            {dbl && <span className="text-xs text-[#9a8b7e]">The right leaf mirrors, same as every built-in carving.</span>}
          </div>

          {/* A tiny carving inside a huge box almost always means the corners were drawn
              around the whole photo instead of around the pattern. */}
          {!!svg && coverage > 0 && coverage < 0.04 && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
              The carving fills only {(coverage * 100).toFixed(0)}% of the area you marked. Go back and
              pull the corners in tighter, and it will come out sharper.
            </p>
          )}

          {tuning && (
            <div className="mt-3 grid gap-3 rounded-lg border border-[#efe8df] p-3 sm:grid-cols-2">
              {([["detail", "Detail", 0, 1, 0.05], ["minSpeck", "Drop specks", 0, 0.004, 0.0002], ["smooth", "Smoothing", 0, 1, 0.05], ["weight", "Line thickness", 0, 3, 1]] as const).map(([k, label, min, max, stp]) => (
                <label key={k} className="block">
                  <span className="mb-1 block text-xs font-medium text-[#7a6a5d]">{label}</span>
                  <input type="range" min={min} max={max} step={stp} value={opts[k]} onChange={(e) => setOpts((o) => ({ ...o, [k]: Number(e.target.value) }))} className="w-full accent-[#c8963e]" />
                </label>
              ))}
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[#7a6a5d]">Size on the door</span>
                <input type="range" min={0.4} max={1.2} step={0.02} value={fit.scale} onChange={(e) => setFit((f) => ({ ...f, scale: Number(e.target.value) }))} className="w-full accent-[#c8963e]" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[#7a6a5d]">Up / down</span>
                <input type="range" min={-0.25} max={0.25} step={0.01} value={fit.dy} onChange={(e) => setFit((f) => ({ ...f, dy: Number(e.target.value) }))} className="w-full accent-[#c8963e]" />
              </label>
              <div className="sm:col-span-2 flex flex-wrap gap-4">
                <Toggle checked={opts.symmetric} onChange={(v) => setOpts((o) => ({ ...o, symmetric: v }))} label="Same on left and right" />
                {opts.kind === "FLAT" && <Toggle checked={opts.invert} onChange={(v) => setOpts((o) => ({ ...o, invert: v }))} label="Invert" />}
                {opts.kind === "DOOR" && <Toggle checked={opts.dropHandle} onChange={(v) => setOpts((o) => ({ ...o, dropHandle: v }))} label="Drop the handle" />}
                {opts.kind === "DOOR" && <Toggle checked={opts.dropLines} onChange={(v) => setOpts((o) => ({ ...o, dropLines: v }))} label="Drop straight edges" />}
                <button type="button" onClick={() => { tr.resetOpts(); setFit({ scale: 1, dy: 0 }); }}
                  className="rounded-md px-2 py-1 text-xs text-[#7a6a5d] underline-offset-2 hover:bg-[#f3ece3] hover:underline">
                  Reset
                </button>
              </div>
            </div>
          )}

          {/* From Design Price this is the New form, box for box, using its very widgets -
              two ways into the list, one set of questions.

              From the Designer it is shorter on purpose: there is a customer next to the
              screen at that moment, so the shop's cost and the crew it will take are not
              put on it. Both are filled in afterwards in Design Price, where nobody is
              looking over your shoulder. */}
          {!!svg && (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name (English)"><Input id="nk-nameEn" value={form.nameEn} onChange={(e) => setF({ nameEn: e.target.value })} /></Field>
                <Field label="Name (Bangla)"><Input id="nk-nameBn" value={form.nameBn} onChange={(e) => setF({ nameBn: e.target.value })} /></Field>
                <div className="sm:col-span-2"><Field label="Short note"><Input id="nk-note" value={form.noteEn} onChange={(e) => setF({ noteEn: e.target.value })} /></Field></div>
              </div>
              <PriceBlock v={form} set={setF} prefix="" title="Price" sellOnly={customerMayBeWatching} />
              <PriceBlock v={form} set={setF} prefix="labour" title="Carving labour" sellOnly={customerMayBeWatching} />
              {!customerMayBeWatching && <CrewBlock v={form} set={setF as (p: Record<string, unknown>) => void} />}
            </div>
          )}

          <p className="mt-3 rounded-lg bg-[#faf7f3] px-3 py-2.5 text-xs text-[#7a6a5d]">
            {visibility === "LIBRARY"
              ? <>It goes straight into the carving gallery, so it shows up on the Designer beside the
                  built-in ones and any customer can be shown it. Tap it there and it lands on the door
                  with its price, exactly like the fifteen.</>
              : <>It joins the carving row and gets picked straight away, so the price lands in the Cost
                  Summary at once. Colour, name and price are changed exactly where you change them for
                  the built-in carvings — nothing special about this one.</>}
          </p>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button busy={saving} disabled={!svg || busy} onClick={save}>Place it on the door</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
