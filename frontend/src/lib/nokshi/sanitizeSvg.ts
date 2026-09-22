/**
 * SVG sanitiser for the browser.
 *
 * The backend cleans every uploaded .svg before it is stored, and this is the second
 * pass: the renderer drops carving markup straight into `dangerouslySetInnerHTML`,
 * so anything that reaches it has to be safe on its own, whatever it came from.
 *
 * Allowlist, not blocklist. Only the tags our tracer and renderer produce survive.
 */

const TAGS = new Set([
  "svg", "g", "defs", "symbol", "use", "title", "desc",
  "path", "rect", "circle", "ellipse", "line", "polyline", "polygon",
  "clippath", "mask", "lineargradient", "radialgradient", "stop",
]);

const ATTRS = new Set([
  "d", "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry",
  "width", "height", "points", "transform", "viewbox", "preserveaspectratio",
  "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin",
  "stroke-dasharray", "stroke-opacity", "fill-opacity", "fill-rule", "opacity",
  "clip-path", "clip-rule", "mask", "offset", "stop-color", "stop-opacity",
  "gradientunits", "gradienttransform", "spreadmethod",
  "id", "class", "xmlns", "version", "role", "aria-label", "aria-hidden",
]);

/** Shapes that never have children. Always emitted self-closed, so the HTML parser
 *  cannot nest the next path inside the previous one. */
const VOID_TAGS = new Set(["path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "use", "stop"]);

const CANON_TAG: Record<string, string> = {
  clippath: "clipPath", lineargradient: "linearGradient", radialgradient: "radialGradient",
  textpath: "textPath", foreignobject: "foreignObject",
};
const CANON_ATTR: Record<string, string> = {
  viewbox: "viewBox", preserveaspectratio: "preserveAspectRatio",
  gradientunits: "gradientUnits", gradienttransform: "gradientTransform",
  spreadmethod: "spreadMethod", clippathunits: "clipPathUnits", maskunits: "maskUnits",
};

// SVG is case-sensitive: viewBox, clipPath and friends stop working if flattened.
const DROP_SUBTREE = /<\s*(script|style|foreignObject|image|animate|animateTransform|animateMotion|set|iframe|object|embed|audio|video|handler)\b[\s\S]*?<\s*\/\s*\1\s*>/gi;
const DROP_SELF = /<\s*(script|style|foreignObject|image|animate|animateTransform|animateMotion|set|iframe|object|embed)[^>]*\/?>/gi;

const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Cleaned SVG, or "" when the text cannot be read as one. */
export function sanitizeSvg(input: string): string {
  let s = String(input ?? "");
  if (!s || s.length > 4_000_000) return "";

  s = s.replace(/<!--[\s\S]*?-->/g, "").replace(/<!DOCTYPE[\s\S]*?>/gi, "").replace(/<\?[\s\S]*?\?>/g, "");
  s = s.replace(DROP_SUBTREE, "").replace(DROP_SELF, "");

  s = s.replace(/<\s*(\/?)([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)(\/?)\s*>/g, (_m, close, rawName, rawAttrs, selfClose) => {
    const name = String(rawName).toLowerCase().replace(/^svg:/, "");
    if (!TAGS.has(name)) return "";
    const outName = CANON_TAG[name] ?? name;
    if (close) return VOID_TAGS.has(name) ? "" : `</${outName}>`;

    const kept: string[] = [];
    const attrRe = /([a-zA-Z_:][-\w:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
    let a: RegExpExecArray | null;
    const attrText = String(rawAttrs).replace(/\/\s*$/, "");
    while ((a = attrRe.exec(attrText))) {
      const key = a[1].toLowerCase();
      const value = a[3] ?? a[4] ?? a[5] ?? "";
      if (key.startsWith("on")) continue;
      if (key === "xlink:href" || key === "href") {
        if (/^#[\w:-]+$/.test(value.trim())) kept.push(`href="${esc(value.trim())}"`);
        continue;
      }
      if (!ATTRS.has(key)) continue;
      if (/(javascript|data|vbscript)\s*:/i.test(value)) continue;
      if (/url\s*\(\s*['"]?\s*(?!#)/i.test(value)) continue;
      if (/expression\s*\(/i.test(value)) continue;
      kept.push(`${CANON_ATTR[key] ?? key}="${esc(value)}"`);
    }
    const shut = VOID_TAGS.has(name) || selfClose ? "/" : "";
    return `<${outName}${kept.length ? " " + kept.join(" ") : ""}${shut}>`;
  });

  s = s.trim();
  return /^<svg[\s>]/i.test(s) && /<\/svg>\s*$/i.test(s) ? s : "";
}
