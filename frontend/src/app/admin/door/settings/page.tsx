"use client";

import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { api, fmtNum, num } from "@/lib/erp";
import { Button, Card, ErrorBox, Field, Input, Loading, PageHeader, useAction, useLoad } from "@/components/erp/ui";

type F = [key: string, label: string, hint: string];
const GROUPS: { title: string; about: string; fields: F[] }[] = [
  { title: "1. Wood calculation", about: "These values decide how much wood (CFT) a door needs in the Designer.", fields: [
    ["doorThicknessInch", "Door thickness (inch)", "Thicker door = more wood"],
    ["wastagePercent", "Wastage %", "Wood lost while cutting is added"],
    ["frameWidthInch", "Frame width (inch)", "Used when \"With frame\" is ticked"],
    ["frameThicknessInch", "Frame thickness (inch)", "Used when \"With frame\" is ticked"],
  ] },
  { title: "2. Size limits (feet)", about: "The Designer rejects sizes outside these limits.", fields: [
    ["minHeightFt", "Minimum height", ""], ["maxHeightFt", "Maximum height", ""],
    ["singleMinWidthFt", "Single door: min width", ""], ["singleMaxWidthFt", "Single door: max width", ""],
    ["doubleMinWidthFt", "Double door: min width", "Total width of both leaves"], ["doubleMaxWidthFt", "Double door: max width", "Total width of both leaves"],
  ] },
  { title: "3. Large door surcharge", about: "Large doors need more carving work, so an extra % is added to carving price and labour.", fields: [
    ["bigDoorSqftPerLeaf", "Leaf area above (sq ft) counts as large", "Height × width of one leaf"],
    ["bigDoorExtraPercent", "Extra % for large doors", ""],
  ] },
  { title: "4. Default profit % for new items", about: "Applied automatically when you add new wood, colors, carvings or labour. You can change each item later. Existing prices do not change.", fields: [
    ["profitWoodPercent", "Wood (stock)", ""], ["profitColorPercent", "Color", ""], ["profitDesignPercent", "Carving", ""], ["profitLabourPercent", "Labour", ""],
  ] },
];

export default function SettingsPage() {
  const { data, loading, error, reload } = useLoad<any>("/api/admin/settings");
  const [f, setF] = useState<Record<string, string>>({});
  const { busy, run } = useAction();
  useEffect(() => { if (data) setF(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v == null ? "" : String(v)]))); }, [data]);
  if (error) return <ErrorBox text={error} retry={reload} />;
  if (loading || !data) return <Loading />;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: Record<string, unknown> = {};
    GROUPS.flatMap((g) => g.fields).forEach(([k]) => (body[k] = Number(f[k])));
    ["companyName", "companyPhone", "companyAddress"].forEach((k) => (body[k] = f[k] || (k === "companyName" ? "SAS DOOR" : null)));
    if (await run(() => api.put("/api/admin/settings", body))) reload();
  };
  // live example: single 7' x 3' with chowkath
  const door = 7 * 3 * (num(f.doorThicknessInch) / 12), frame = (2 * 7 + 3) * (num(f.frameWidthInch) / 12) * (num(f.frameThicknessInch) / 12);
  const total = (door + frame) * (1 + num(f.wastagePercent) / 100);

  return (
    <form onSubmit={save}>
      <PageHeader title="Price Settings" sub="Rules for wood and size. Wood, color, carving and labour prices are in Supplier Management." actions={<Button busy={busy}>Save</Button>} />
      <div className="mb-5 flex gap-3 rounded-xl border border-[#ead9bd] bg-[#fbf5ea] p-4 text-sm text-[#4a3d33]">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#a0712a]" />
        <div>
          <b>Example (with current values):</b> Single door 7&apos; × 3&apos; with frame →
          door {fmtNum(door)} CFT + frame {fmtNum(frame)} CFT + {fmtNum(f.wastagePercent, 1)}% wastage = <b className="font-mono">{fmtNum(total)} CFT</b> of wood.
          This is multiplied by the stock selling price per CFT to get the wood price.
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {GROUPS.map((g) => (
          <Card key={g.title} title={g.title}>
            <p className="mb-4 text-sm text-[#7a6a5d]">{g.about}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {g.fields.map(([k, l, h]) => (
                <Field key={k} label={l} hint={h || undefined}>
                  <Input id={`st-${k}`} type="number" step="0.01" min={0} required value={f[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
                </Field>
              ))}
            </div>
          </Card>
        ))}
        <Card title="5. Company (shown on prints)">
          <div className="grid gap-3">
            <Field label="Name"><Input id="st-cn" value={f.companyName ?? ""} onChange={(e) => setF({ ...f, companyName: e.target.value })} /></Field>
            <Field label="Phone"><Input id="st-cp" value={f.companyPhone ?? ""} onChange={(e) => setF({ ...f, companyPhone: e.target.value })} /></Field>
            <Field label="Address"><Input id="st-ca" value={f.companyAddress ?? ""} onChange={(e) => setF({ ...f, companyAddress: e.target.value })} /></Field>
          </div>
        </Card>
      </div>
    </form>
  );
}
