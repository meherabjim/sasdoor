import en from "@/messages/en.json";
import bn from "@/messages/bn.json";
import { SITE_ASSETS, ORIGINAL_SRC } from "@/lib/siteAssets";

export type ContentItem = { page: string; section: string; key: string; textEn: string | null; textBn: string | null; image: string | null; visible: boolean };

/** page values used in SiteContent */
export const CT = { TEXT: "text", IMAGE: "image", SECTION: "section", PORTFOLIO: "portfolio" } as const;

// keep pristine copies so overrides can be removed without reload
const DEFAULT_EN = JSON.parse(JSON.stringify(en));
const DEFAULT_BN = JSON.parse(JSON.stringify(bn));
export const defaultMessages = { en: DEFAULT_EN as typeof en, bn: DEFAULT_BN as typeof bn };

function setPath(obj: any, path: string, value: string) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) { if (cur == null) return; cur = cur[parts[i]]; }
  if (cur != null && typeof cur[parts[parts.length - 1]] === "string") cur[parts[parts.length - 1]] = value;
}
function restore(target: any, source: any) {
  for (const k of Object.keys(source)) {
    if (source[k] && typeof source[k] === "object") restore(target[k], source[k]);
    else target[k] = source[k];
  }
}

/** Apply admin overrides onto the shared message objects and image objects */
export function applyContent(items: ContentItem[]) {
  restore(en, DEFAULT_EN); restore(bn, DEFAULT_BN);
  Object.entries(SITE_ASSETS).forEach(([k, v]) => (v.img.src = ORIGINAL_SRC[k]));
  for (const it of items) {
    if (it.page === CT.TEXT) {
      if (it.textEn) setPath(en, it.key, it.textEn);
      if (it.textBn) setPath(bn, it.key, it.textBn);
    } else if (it.page === CT.IMAGE && it.image && SITE_ASSETS[it.key]) {
      SITE_ASSETS[it.key].img.src = it.image;
    }
  }
}

export const hiddenSections = (items: ContentItem[]) => new Set(items.filter((i) => i.page === CT.SECTION && !i.visible).map((i) => i.key));

export type PortfolioProject = { titleEn: string; titleBn: string; subtitleEn: string; subtitleBn: string; image: string };
export function portfolioProjects(items: ContentItem[]): PortfolioProject[] | null {
  const row = items.find((i) => i.page === CT.PORTFOLIO && i.key === "projects");
  if (!row?.textEn) return null;
  try { return JSON.parse(row.textEn); } catch { return null; }
}
