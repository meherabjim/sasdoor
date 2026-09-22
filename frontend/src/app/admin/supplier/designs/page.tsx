"use client";

import { useState } from "react";
import { ImagePlus } from "lucide-react";
import { PriceList } from "@/components/erp/PriceList";
import { DesignUploadModal } from "@/components/erp/DesignUploadModal";
import { DesignThumb, toneOf } from "@/components/erp/DoorPreview";
import { Badge, Button } from "@/components/erp/ui";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const KEYS: string[] = require("@/lib/nokshi/render.js").DESIGN_KEYS;

/**
 * Two kinds of carving live in this list, and they are meant to be hard to tell apart.
 *
 * BUILTIN ones are drawn by render.js and pick one of its 15 keys. The rest come from a
 * photo and carry their own traced drawing, which is why the list is no longer capped at
 * fifteen. Their style dropdown is hidden because there is nothing to choose - the drawing
 * is the style - and that is the only difference anywhere: same list, same prices, same
 * gallery, same behaviour on the Designer and on the public site.
 *
 * A photo can be traced from two places, because both are the same job. The button above
 * is for when that is what you came to do; the one inside the New form is for when you
 * started typing a carving in and remembered you have a picture of it.
 */

/** The door the preview is drawn on. Nothing is being quoted here, so a plain 7' x 3' is
 *  the right stand-in: it is the commonest single door, and only the preview depends on it. */
const SAMPLE_DOOR = { type: "SINGLE" as const, heightFt: 7, widthFt: 3, doorHex: "#B07A45", designColor: null };

export default function DesignsPage() {
  const [photo, setPhoto] = useState(false);
  // The list belongs to PriceList, and a carving traced from a photo is created outside its
  // form, so this is how the list is told to look again.
  const [listKey, setListKey] = useState(0);

  return (
    <>
    <PriceList title="Design Price" sub="Carving price and carving labour (Single / Double). Carvings traced from a photo sit here too, and behave the same."
      path="/api/admin/designs" withLabour withCrew canDelete reloadKey={listKey}
      extraActions={
        <Button variant="ghost" onClick={() => setPhoto(true)}>
          <ImagePlus className="h-4 w-4" />From a photo
        </Button>
      }
      formExtra={(row, close) => (row.id ? null : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-[#e0d6ca] bg-[#faf7f3] px-3 py-2.5">
          <p className="text-xs text-[#7a6a5d]">
            Have a photo of the carving instead? Trace it from the picture — it lands in this
            same list and works exactly like the built-in ones.
          </p>
          <Button type="button" size="sm" variant="ghost" onClick={() => { close(); setPhoto(true); }}>
            <ImagePlus className="h-3.5 w-3.5" />From a photo
          </Button>
        </div>
      ))}
      extras={[
        { key: "nameEn", label: "Name (English)", required: true }, { key: "nameBn", label: "Name (Bangla)", required: true },
        { key: "key", label: "Carving style", type: "select", options: KEYS.map((k) => [k, k] as [string, string]), when: (x) => x.origin !== "UPLOADED" },
        { key: "noteEn", label: "Short note" },
      ]}
      newItem={() => ({ key: KEYS[0], origin: "BUILTIN", visibility: "LIBRARY", nameEn: "", nameBn: "", noteEn: "", allowDouble: true, costSingle: "", costDouble: "", sellSingle: "", sellDouble: "", labourCostSingle: "", labourCostDouble: "", labourSellSingle: "", labourSellDouble: "", workersSingle: "", workersDouble: "", daysSingle: "", daysDouble: "" })}
      columnsExtra={{
        head: "Preview",
        cell: (x) => <DesignThumb design={x} doorHex="#B07A45" ornHex={toneOf("#B07A45")} className="h-16 w-10 rounded bg-[#efeae3]" />,
      }}
      renderName={(x) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{x.nameEn}</span>
            {x.origin === "UPLOADED" && <Badge tone="blue">From a photo</Badge>}
            {x.visibility === "PRIVATE" && <Badge tone="amber">Private to one estimate</Badge>}
          </div>
          {x.noteEn ? <div className="text-xs text-[#9a8b7e]">{x.noteEn}</div> : null}
        </div>
      )} />

      {/* At page level, not inside the header's button row: here it keeps whatever the
          admin has already traced and typed, however often the list behind it re-renders. */}
      <DesignUploadModal
        open={photo}
        onClose={() => setPhoto(false)}
        door={SAMPLE_DOOR}
        visibility="LIBRARY"
        onSaved={() => { setPhoto(false); setListKey((k) => k + 1); }}
      />
    </>
  );
}
