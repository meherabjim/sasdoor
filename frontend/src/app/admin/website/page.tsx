"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Save, RotateCcw, Upload, Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff } from "lucide-react";
import { api, errMsg, fmtDate } from "@/lib/erp";
import { Badge, Button, Card, ErrorBox, Loading, PageHeader, Select, Table, Td, Toggle, useAction, useToast } from "@/components/erp/ui";
import { defaultMessages, CT, type ContentItem } from "@/lib/siteContent";
import { SITE_ASSETS, ORIGINAL_SRC } from "@/lib/siteAssets";


type Tab = { key: string; label: string; sections: { key: string; label: string }[]; visibility?: { id: string; label: string }[]; extra?: "projects" | "visits" | "images" };
const TABS: Tab[] = [
  { key: "home", label: "Home", sections: [{ key: "hero", label: "Hero (top section)" }, { key: "highlights", label: "Highlights" }, { key: "process", label: "Process steps" }, { key: "portfolioPreview", label: "Portfolio preview" }, { key: "cta", label: "Call to action (bottom)" }],
    visibility: [{ id: "home.hero", label: "Hero" }, { id: "home.highlights", label: "Highlights" }, { id: "home.process", label: "Process" }, { id: "home.portfolio", label: "Portfolio preview" }, { id: "home.cta", label: "Call to action" }] },
  { key: "about", label: "About", sections: [{ key: "about", label: "About page" }] },
  { key: "portfolio", label: "Portfolio", sections: [{ key: "portfolioHero", label: "Portfolio hero" }, { key: "portfolioProjects", label: "Projects and gallery headings" }], extra: "projects" },
  { key: "safety", label: "Safety & Security", sections: [{ key: "safetySecurity", label: "Safety & Security page" }] },
  { key: "tech", label: "Technicalities", sections: [{ key: "technicalities", label: "Technicalities page" }],
    visibility: [{ id: "technicalities.hero", label: "Hero" }, { id: "technicalities.details", label: "Details" }, { id: "technicalities.cta", label: "Call to action" }] },
  { key: "custom", label: "Customizations", sections: [{ key: "customizations", label: "Customizations page" }],
    visibility: [{ id: "customizations.hero", label: "Hero" }, { id: "customizations.options", label: "Options" }, { id: "customizations.cta", label: "Call to action" }] },
  { key: "visit", label: "Book Visit", sections: [{ key: "bookVisit", label: "Book Visit page" }], extra: "visits",
    visibility: [{ id: "bookVisit.hero", label: "Hero" }, { id: "bookVisit.steps", label: "Steps" }, { id: "bookVisit.details", label: "Form and details" }] },
  { key: "design", label: "Door Design page", sections: [{ key: "designer", label: "Customer Door Designer" }] },
  { key: "nav", label: "Navbar & Footer", sections: [{ key: "navbar", label: "Navbar menu" }, { key: "footer", label: "Footer" }] },
  { key: "images", label: "Images", sections: [], extra: "images" },
];

type Row = { path: string; en: string; bn: string };
function flatten(en: any, bn: any, prefix: string, out: Row[]) {
  if (typeof en === "string") { out.push({ path: prefix, en, bn: typeof bn === "string" ? bn : "" }); return; }
  if (en && typeof en === "object") for (const k of Object.keys(en)) flatten(en[k], bn?.[k], prefix ? `${prefix}.${k}` : k, out);
}
const pretty = (p: string) => p.split(".").slice(1).map((x) => (/^\d+$/.test(x) ? `#${Number(x) + 1}` : x.replace(/([A-Z])/g, " $1").toLowerCase())).join(" › ") || p;

export default function WebsitePage() {
  const [tab, setTab] = useState("home");
  const [items, setItems] = useState<ContentItem[] | null>(null);
  const [err, setErr] = useState("");
  const load = () => api.get<ContentItem[]>("/api/admin/content").then(setItems).catch((e) => setErr(errMsg(e)));
  useEffect(() => { load(); }, []);
  const t = TABS.find((x) => x.key === tab)!;

  return (
    <>
      <PageHeader title="Website Management" sub="All website text (English and Bangla), images and section visibility. Refresh the website after saving to see changes." />
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((x) => <Button key={x.key} size="sm" variant={tab === x.key ? "primary" : "ghost"} onClick={() => setTab(x.key)}>{x.label}</Button>)}
      </div>
      {err ? <ErrorBox text={err} retry={load} /> : !items ? <Loading /> : (
        <div className="space-y-5">
          {t.visibility && <VisibilityCard list={t.visibility} items={items} onSaved={load} />}
          {t.extra === "images" && <ImagesCard items={items} onSaved={load} />}
          {t.extra === "projects" && <ProjectsCard items={items} onSaved={load} />}
          {t.sections.map((s) => <TextCard key={`${tab}-${s.key}`} section={s.key} label={s.label} items={items} onSaved={load} />)}
          {t.extra === "visits" && <VisitsCard />}
        </div>
      )}
    </>
  );
}

function TextCard({ section, label, items, onSaved }: { section: string; label: string; items: ContentItem[]; onSaved: () => void }) {
  const rows = useMemo(() => { const out: Row[] = []; flatten((defaultMessages.en as any)[section], (defaultMessages.bn as any)[section], section, out); return out; }, [section]);
  const over = useMemo(() => new Map(items.filter((i) => i.page === CT.TEXT && i.section === section).map((i) => [i.key, i])), [items, section]);
  const [val, setVal] = useState<Record<string, { en: string; bn: string }>>({});
  const [open, setOpen] = useState(section === "hero" || section === "about" || section === "navbar");
  const { busy, run } = useAction();
  useEffect(() => { setVal(Object.fromEntries(rows.map((r) => [r.path, { en: over.get(r.path)?.textEn ?? r.en, bn: over.get(r.path)?.textBn ?? r.bn }]))); }, [rows, over]);
  const dirty = rows.filter((r) => { const v = val[r.path]; if (!v) return false; const o = over.get(r.path); return v.en !== (o?.textEn ?? r.en) || v.bn !== (o?.textBn ?? r.bn); });
  const changedCount = rows.filter((r) => over.has(r.path)).length;

  const save = async () => {
    const payload = dirty.map((r) => ({ page: CT.TEXT, section, key: r.path, textEn: val[r.path].en === r.en ? null : val[r.path].en, textBn: val[r.path].bn === r.bn ? null : val[r.path].bn, visible: true }));
    if (await run(() => api.put("/api/admin/content", { items: payload }), "Text saved")) onSaved();
  };
  const area = "w-full rounded-lg border border-[#e0d6ca] bg-white px-3 py-2 text-sm leading-relaxed outline-none focus:border-[#c8963e] focus:ring-2 focus:ring-[#c8963e]/20";
  return (
    <Card title={label} actions={<div className="flex items-center gap-2">
      {changedCount > 0 && <Badge tone="amber">{changedCount} changed</Badge>}
      <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)}>{open ? "Close" : `Open (${rows.length})`}</Button>
      {dirty.length > 0 && <Button size="sm" busy={busy} onClick={save}><Save className="h-3.5 w-3.5" />Save ({dirty.length})</Button>}
    </div>}>
      {!open ? <p className="text-sm text-[#9a8b7e]">{rows.length} text fields. Click &quot;Open&quot; to edit.</p> : (
        <div className="divide-y divide-[#f1ebe3]">
          {rows.map((r) => {
            const v = val[r.path] ?? { en: r.en, bn: r.bn };
            const rows2 = Math.min(6, Math.max(1, Math.ceil(Math.max(v.en.length, v.bn.length) / 60)));
            const changed = over.has(r.path);
            return (
              <div key={r.path} className="grid gap-2 py-3 md:grid-cols-[180px_1fr_1fr]">
                <div className="flex items-start justify-between gap-2 text-xs font-medium text-[#7a6a5d] md:block">
                  <span className="capitalize">{pretty(r.path)}</span>
                  {changed && <button type="button" onClick={() => setVal({ ...val, [r.path]: { en: r.en, bn: r.bn } })} className="mt-1 flex items-center gap-1 text-[#a0712a] hover:underline"><RotateCcw className="h-3 w-3" />Reset</button>}
                </div>
                <label className="block"><span className="sr-only">English</span><textarea id={`tx-${r.path}-en`} rows={rows2} className={area} value={v.en} onChange={(e) => setVal({ ...val, [r.path]: { ...v, en: e.target.value } })} placeholder="English" /></label>
                <label className="block"><span className="sr-only">Bangla</span><textarea id={`tx-${r.path}-bn`} rows={rows2} className={area} value={v.bn} onChange={(e) => setVal({ ...val, [r.path]: { ...v, bn: e.target.value } })} placeholder="Bangla text" /></label>
              </div>
            );
          })}
          {dirty.length > 0 && <div className="sticky bottom-3 flex justify-end pt-3"><Button busy={busy} onClick={save}><Save className="h-4 w-4" />{dirty.length} changes: save</Button></div>}
        </div>
      )}
    </Card>
  );
}

function VisibilityCard({ list, items, onSaved }: { list: { id: string; label: string }[]; items: ContentItem[]; onSaved: () => void }) {
  const { run } = useAction();
  const hidden = new Set(items.filter((i) => i.page === CT.SECTION && !i.visible).map((i) => i.key));
  const toggle = async (id: string, show: boolean) => {
    if (await run(() => api.put("/api/admin/content", { items: [{ page: CT.SECTION, section: id.split(".")[0], key: id, visible: show }] }), show ? "Section shown" : "Section hidden")) onSaved();
  };
  return (
    <Card title="Show / hide sections">
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        {list.map((s) => <div key={s.id} className="flex items-center gap-2">{hidden.has(s.id) ? <EyeOff className="h-4 w-4 text-[#b3a597]" /> : <Eye className="h-4 w-4 text-emerald-700" />}<Toggle checked={!hidden.has(s.id)} onChange={(v) => toggle(s.id, v)} label={s.label} /></div>)}
      </div>
    </Card>
  );
}

async function uploadFile(file: File): Promise<string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  const fd = new FormData(); fd.append("file", file);
  const r = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"}/api/admin/upload`, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(j?.message || "Upload failed");
  return j.data.url as string;
}

function ImagesCard({ items, onSaved }: { items: ContentItem[]; onSaved: () => void }) {
  const toast = useToast();
  const [busyKey, setBusyKey] = useState("");
  const over = new Map(items.filter((i) => i.page === CT.IMAGE && i.image).map((i) => [i.key, i.image as string]));
  const setImg = async (key: string, image: string | null) => {
    await api.put("/api/admin/content", { items: [{ page: CT.IMAGE, section: "assets", key, image, visible: true }] });
    onSaved();
  };
  const pick = async (key: string, file?: File) => {
    if (!file) return;
    setBusyKey(key);
    try { await setImg(key, await uploadFile(file)); toast("Image replaced"); } catch (e) { toast(errMsg(e), true); } finally { setBusyKey(""); }
  };
  return (
    <Card title="Website images" actions={<span className="text-xs text-[#7a6a5d]">PNG/JPG/WebP, up to 5MB</span>}>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {Object.entries(SITE_ASSETS).map(([key, a]) => {
          const cur = over.get(key) ?? ORIGINAL_SRC[key];
          return (
            <div key={key} className="flex flex-col gap-2 rounded-lg border border-[#e8e0d6] p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cur} alt={key} className="aspect-[3/4] w-full rounded bg-[#f3ece3] object-contain" />
              <div className="flex flex-wrap gap-1">{a.usedIn.map((u) => <Badge key={u}>{u}</Badge>)}{over.has(key) && <Badge tone="amber">Changed</Badge>}</div>
              <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-md bg-[#f3ece3] py-1.5 text-xs font-medium hover:bg-[#eadfd1]">
                <Upload className="h-3.5 w-3.5" />{busyKey === key ? "Uploading…" : "Replace image"}
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => pick(key, e.target.files?.[0])} />
              </label>
              {over.has(key) && <button type="button" onClick={() => setImg(key, null)} className="text-xs text-[#a0712a] hover:underline">Reset image</button>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

type Project = { titleEn: string; titleBn: string; subtitleEn: string; subtitleBn: string; image: string };
const DEFAULT_PROJECTS: { titleEn: string; titleBn: string; subtitleEn: string; subtitleBn: string; asset: string }[] = [{"titleEn": "Classic Elegance", "titleBn": "", "subtitleEn": "Timeless appeal \u2022 Superior craftsmanship", "subtitleBn": "", "asset": "door/full-design/design7.png"}, {"titleEn": "Contemporary Appeal", "titleBn": "", "subtitleEn": "Modern look \u2022 High-quality materials", "subtitleBn": "", "asset": "door/full-design/design8.png"}, {"titleEn": "Luxury Living", "titleBn": "", "subtitleEn": "Premium finishes \u2022 Exceptional quality", "subtitleBn": "", "asset": "door/full-design/design9.png"}, {"titleEn": "Architectural Harmony", "titleBn": "", "subtitleEn": "Designed to complement the space", "subtitleBn": "", "asset": "door/full-design/design10.png"}, {"titleEn": "Unique Character", "titleBn": "", "subtitleEn": "Distinctive style \u2022 Personalized touch", "subtitleBn": "", "asset": "door/full-design/design11.png"}, {"titleEn": "Innovative Design", "titleBn": "", "subtitleEn": "Cutting-edge solutions \u2022 Modern aesthetics", "subtitleBn": "", "asset": "door/full-design/design12.png"}, {"titleEn": "Sustainable Choice", "titleBn": "", "subtitleEn": "Eco-friendly materials \u2022 Environmentally responsible", "subtitleBn": "", "asset": "door/full-design/design13.png"}, {"titleEn": "Custom Craftsmanship", "titleBn": "", "subtitleEn": "Tailored to your specific needs", "subtitleBn": "", "asset": "door/full-design/design14.png"}, {"titleEn": "Dual Design Statement", "titleBn": "", "subtitleEn": "Two-tone finish \u2022 Striking visual impact", "subtitleBn": "", "asset": "door/full-design/dual-design1.png"}, {"titleEn": "Secure Modern Entry", "titleBn": "", "subtitleEn": "Advanced security features \u2022 Contemporary style", "subtitleBn": "", "asset": "door/full-design/dual-design2.png"}, {"titleEn": "Premium Finish Showcase", "titleBn": "", "subtitleEn": "High-end materials \u2022 Exceptional attention to detail", "subtitleBn": "", "asset": "door/full-design/dual-design3.png"}, {"titleEn": "Modern Entry Statement", "titleBn": "", "subtitleEn": "Oak veneer \u2022 Matte black detail", "subtitleBn": "", "asset": "door/full-design/design1.png"}, {"titleEn": "Warm Contemporary Finish", "titleBn": "", "subtitleEn": "Textured wood \u2022 Soft bronze accents", "subtitleBn": "", "asset": "door/full-design/design2.png"}, {"titleEn": "Secure Heritage Style", "titleBn": "", "subtitleEn": "Solid panels \u2022 Premium locking system", "subtitleBn": "", "asset": "door/full-design/design3.png"}, {"titleEn": "Minimalist Luxury Look", "titleBn": "", "subtitleEn": "Clean lines \u2022 Fine hardware selection", "subtitleBn": "", "asset": "door/full-design/design4.png"}, {"titleEn": "Elegant Simplicity", "titleBn": "", "subtitleEn": "Timeless design \u2022 Refined details", "subtitleBn": "", "asset": "door/full-design/design5.png"}, {"titleEn": "Modern Minimalist", "titleBn": "", "subtitleEn": "Clean aesthetic \u2022 Functional design", "subtitleBn": "", "asset": "door/full-design/design6.png"}];

function ProjectsCard({ items, onSaved }: { items: ContentItem[]; onSaved: () => void }) {
  const row = items.find((i) => i.page === CT.PORTFOLIO && i.key === "projects");
  const initial = (): Project[] => { try { if (row?.textEn) return JSON.parse(row.textEn); } catch { /* fall back */ } return DEFAULT_PROJECTS.map((p) => ({ titleEn: p.titleEn, titleBn: p.titleBn, subtitleEn: p.subtitleEn, subtitleBn: p.subtitleBn, image: SITE_ASSETS[p.asset]?.img.src ?? "" })); };
  const [list, setList] = useState<Project[]>(initial);
  const [dirty, setDirty] = useState(false);
  const { busy, run } = useAction();
  const toast = useToast();
  const fileRef = useRef<Record<number, HTMLInputElement | null>>({});
  const upd = (i: number, p: Partial<Project>) => { setList((l) => l.map((x, k) => (k === i ? { ...x, ...p } : x))); setDirty(true); };
  const move = (i: number, d: number) => { setList((l) => { const n = [...l]; const j = i + d; if (j < 0 || j >= n.length) return l; [n[i], n[j]] = [n[j], n[i]]; return n; }); setDirty(true); };
  const save = async () => { if (await run(() => api.put("/api/admin/content", { items: [{ page: CT.PORTFOLIO, section: "portfolio", key: "projects", textEn: JSON.stringify(list), visible: true }] }), "Projects saved")) { setDirty(false); onSaved(); } };
  const inp = "w-full rounded-md border border-[#e0d6ca] px-2.5 py-1.5 text-sm outline-none focus:border-[#c8963e]";
  return (
    <Card title={`Portfolio projects (${list.length})`} actions={<div className="flex gap-2">
      <Button size="sm" variant="ghost" onClick={() => { setList((l) => [{ titleEn: "", titleBn: "", subtitleEn: "", subtitleBn: "", image: "" }, ...l]); setDirty(true); }}><Plus className="h-3.5 w-3.5" />New project</Button>
      {dirty && <Button size="sm" busy={busy} onClick={save}><Save className="h-3.5 w-3.5" />Save</Button>}
    </div>}>
      {!row && <p className="mb-4 rounded-lg bg-[#faf7f3] p-3 text-sm text-[#7a6a5d]">The website currently shows the original {DEFAULT_PROJECTS.length} projects. Edit and save to publish your own list.</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((p, i) => (
          <div key={i} className="flex gap-3 rounded-lg border border-[#e8e0d6] p-3">
            <div className="w-24 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.image ? <img src={p.image} alt="" className="aspect-[3/4] w-full rounded bg-[#f3ece3] object-contain" /> : <div className="flex aspect-[3/4] items-center justify-center rounded bg-[#f3ece3] text-xs text-[#9a8b7e]">No image</div>}
              <button type="button" onClick={() => fileRef.current[i]?.click()} className="mt-1.5 w-full rounded bg-[#f3ece3] py-1 text-xs hover:bg-[#eadfd1]">Images</button>
              <input ref={(el) => { fileRef.current[i] = el; }} type="file" accept="image/*" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { upd(i, { image: await uploadFile(f) }); } catch (x) { toast(errMsg(x), true); } }} />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <input aria-label="Title English" className={inp} placeholder="Title (English)" value={p.titleEn} onChange={(e) => upd(i, { titleEn: e.target.value })} />
              <input aria-label="Title Bangla" className={inp} placeholder="Title (Bangla)" value={p.titleBn} onChange={(e) => upd(i, { titleBn: e.target.value })} />
              <input aria-label="Subtitle English" className={inp} placeholder="Subtitle (English)" value={p.subtitleEn} onChange={(e) => upd(i, { subtitleEn: e.target.value })} />
              <input aria-label="Subtitle Bangla" className={inp} placeholder="Subtitle (Bangla)" value={p.subtitleBn} onChange={(e) => upd(i, { subtitleBn: e.target.value })} />
              <div className="flex gap-1 pt-1">
                <Button type="button" size="sm" variant="ghost" aria-label="Move up" onClick={() => move(i, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
                <Button type="button" size="sm" variant="ghost" aria-label="Move down" onClick={() => move(i, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
                <Button type="button" size="sm" variant="danger" aria-label="Delete" onClick={() => { setList((l) => l.filter((_, k) => k !== i)); setDirty(true); }}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

const VISIT_STATUS: [string, string][] = [["NEW", "New"], ["CONTACTED", "Contacted"], ["DONE", "Visited"], ["CANCELLED", "Cancel"]];
function VisitsCard() {
  const [list, setList] = useState<any[] | null>(null);
  const { run } = useAction();
  const load = () => api.get<any[]>("/api/admin/visits").then(setList).catch(() => setList([]));
  useEffect(() => { load(); }, []);

  return (
    <Card title="Visit requests">
      {!list ? <Loading /> : (
        <Table head={["Date", "Name", "Phone", "Preferred date", "Note", "Status"]} empty={!list.length}>
          {list.map((v) => (
            <tr key={v.id}><Td>{fmtDate(v.createdAt)}</Td><Td className="font-semibold">{v.name}</Td><Td>{v.phone}</Td><Td>{v.preferredDate ? fmtDate(v.preferredDate) : "—"}</Td>
              <Td className="max-w-[280px] whitespace-pre-line text-xs">{v.note ?? "—"}</Td>
              <Td><Select id={`vs-${v.id}`} className="w-auto py-1.5" value={v.status} onChange={async (e) => { if (await run(() => api.patch(`/api/admin/visits/${v.id}`, { status: e.target.value }))) load(); }}>{VISIT_STATUS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Td></tr>
          ))}
        </Table>
      )}
    </Card>
  );
}
