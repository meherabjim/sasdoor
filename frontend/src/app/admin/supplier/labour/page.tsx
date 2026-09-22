"use client";

import { PriceList } from "@/components/erp/PriceList";

const CAT: [string, string][] = [["DOOR", "Door making (always)"], ["POLISH", "Polish (always)"], ["FRAME", "Frame (when ticked)"], ["FITTING", "Fitting (when ticked)"], ["DELIVERY", "Delivery (when ticked)"], ["OTHER", "Other"]];

export default function LabourPage() {
  return (
    <PriceList title="Labour Price" sub="What you pay workers (cost) and charge customers (price) for each job. Carving labour is in Design Price." path="/api/admin/labour" withCrew canDelete
      extras={[{ key: "nameEn", label: "Job (English)", required: true }, { key: "nameBn", label: "Job (Bangla)", required: true }, { key: "category", label: "When it applies", type: "select", options: CAT }]}
      newItem={() => ({ nameEn: "", nameBn: "", category: "OTHER", costSingle: "", costDouble: "", sellSingle: "", sellDouble: "", workersSingle: "", workersDouble: "", daysSingle: "", daysDouble: "" })}
      columnsExtra={{ head: "When", cell: (x) => <span className="text-xs text-[#7a6a5d]">{CAT.find(([k]) => k === x.category)?.[1]}</span> }}
      renderName={(x) => <div className="font-semibold">{x.nameEn}</div>} />
  );
}
