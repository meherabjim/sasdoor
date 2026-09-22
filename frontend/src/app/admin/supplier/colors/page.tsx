"use client";

import { PriceList } from "@/components/erp/PriceList";

export default function ColorsPage() {
  return (
    <PriceList title="Color Price" sub="Cost and selling price per door, and how many people the colour work takes. Leave the people at 0 if you price painting through Labour Price instead — then no extra job appears on the work sheet." path="/api/admin/colors" canDelete withCrew
      filterTabs={[{ key: "DOOR", label: "Door color", match: (x) => x.type === "DOOR" }, { key: "DESIGN", label: "Carving color", match: (x) => x.type === "DESIGN" }]}
      extras={[
        { key: "type", label: "Type", type: "select", options: [["DOOR", "Door color"], ["DESIGN", "Carving color"]] },
        { key: "nameEn", label: "Name (English)", required: true }, { key: "nameBn", label: "Name (Bangla)", required: true },
        { key: "colorCode", label: "Color", type: "color" },
      ]}
      newItem={() => ({ type: "DOOR", nameEn: "", nameBn: "", colorCode: "#8a5a2b", costSingle: "", costDouble: "", sellSingle: "", sellDouble: "", workersSingle: "", workersDouble: "", daysSingle: "", daysDouble: "" })}
      renderName={(x) => (
        <div className="flex items-center gap-3">
          <span className="h-7 w-7 shrink-0 rounded-full border border-[#e0d6ca]" style={{ background: x.isToneOnTone ? "conic-gradient(#b07a45 0 50%, #85592f 0 100%)" : x.colorCode }} />
          <div><div className="font-semibold">{x.nameEn}</div><div className="text-xs text-[#9a8b7e]">{x.nameBn}{x.type === "DOOR" && x.suggestions?.length ? ` · matches: ${x.suggestions.join(", ")}` : ""}</div></div>
        </div>
      )} />
  );
}
