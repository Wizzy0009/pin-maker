/* POST /.netlify/functions/render-pin   (also reachable as /api/render-pin)
   Body (JSON):
     title        required  text on the pin (| = new line, **bold**, *italic*)
     description  optional  subtitle text
     imageUrl     optional  public URL of the photo (imageUrls: [..] for collage designs)
     template     optional  1-15 or a name such as "study-guide-box" (default 1)
   More optional fields: highlight, highlight2, subHighlight, badge, button, options{},
   output ("url" | "png" | "base64"), force (true = re-render even if cached).
   Answer: { success, url, ... }  where url is a public .png link. */
import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import { getStore } from "@netlify/blobs";
import { createHash } from "node:crypto";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PinEngine from "../../public/pin-engine.js";

const RENDER_VERSION = "1"; // bump to make every cached pin render again
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type, x-api-key, authorization",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj, null, 2), { status, headers: { "content-type": "application/json", ...CORS } });
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }

/* ---------- fonts (downloaded at build time by scripts/prepare-fonts.mjs) ---------- */
let fontInfo = null;
function loadFonts() {
  if (fontInfo) return fontInfo;
  const here = path.dirname(fileURLToPath(import.meta.url));
  const root = process.env.LAMBDA_TASK_ROOT || process.cwd();
  const dir = [
    path.join(root, "netlify/functions/fonts"), path.join(process.cwd(), "netlify/functions/fonts"),
    path.join(root, "fonts"), path.join(here, "fonts"), path.join(here, "../fonts"),
  ].find((d) => existsSync(d));
  const loaded = [];
  if (dir) for (const f of readdirSync(dir)) {
    if (!/\.(ttf|otf)$/i.test(f)) continue;
    try { if (GlobalFonts.registerFromPath(path.join(dir, f), f.replace(/\.(ttf|otf)$/i, ""))) loaded.push(f.replace(/\.(ttf|otf)$/i, "")); } catch { /* skip */ }
  }
  fontInfo = { loaded, missing: PinEngine.FONTS.filter((f) => !loaded.includes(f)) };
  return fontInfo;
}

/* ---------- download the photo ---------- */
async function fetchImage(raw) {
  let u;
  try { u = new URL(raw); } catch { throw new HttpError(400, `imageUrl is not a valid URL: ${String(raw).slice(0, 80)}`); }
  const h = u.hostname.toLowerCase();
  if (!/^https?:$/.test(u.protocol) || h === "localhost" || h.endsWith(".local") || h.startsWith("[") ||
      /^(0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h))
    throw new HttpError(400, "imageUrl must be a public http(s) address");
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 12000);
  let res;
  try { res = await fetch(u, { signal: ctrl.signal, redirect: "follow", headers: { "user-agent": "PinMaker/1.0", accept: "image/*" } }); }
  catch { throw new HttpError(422, "Could not download imageUrl (timed out or unreachable)"); }
  finally { clearTimeout(timer); }
  if (!res.ok) throw new HttpError(422, `Could not download imageUrl (HTTP ${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 15e6) throw new HttpError(422, "imageUrl is larger than 15 MB");
  return decode(buf);
}
async function decode(buf) {
  try { return await loadImage(buf); } catch { throw new HttpError(422, "The image could not be read (use JPG, PNG, WebP or GIF)"); }
}

const templateList = () => PinEngine.TPL.map((t, i) => ({ number: i + 1, id: t.id, name: t.name }));

export default async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    if (req.method === "GET") {
      const { missing } = loadFonts();
      return json({
        service: "render-pin",
        usage: "POST JSON { title, description, imageUrl, template } -> { url }",
        templates: templateList(),
        fonts: PinEngine.FONTS,
        fontsMissingOnServer: missing,
        options: Object.fromEntries(Object.entries(PinEngine.BASE).map(([k, v]) => [k, { default: v, ...(PinEngine.RANGE[k] ? { range: PinEngine.RANGE[k] } : {}), ...(PinEngine.OPTS[k] ? { values: PinEngine.OPTS[k] } : {}) }])),
      });
    }
    if (req.method !== "POST") return json({ success: false, error: "Use POST" }, 405);

    const apiKey = process.env.PIN_API_KEY;
    if (apiKey) {
      const got = req.headers.get("x-api-key") || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
      if (got !== apiKey) return json({ success: false, error: "Unauthorized: send your key in the x-api-key header" }, 401);
    }

    let body;
    try { body = await req.json(); } catch { return json({ success: false, error: "Body must be valid JSON" }, 400); }
    if (!body || typeof body !== "object") return json({ success: false, error: "Body must be a JSON object" }, 400);

    if (typeof body.title !== "string" || !body.title.trim()) return json({ success: false, error: '"title" is required (text)' }, 400);
    const ti = PinEngine.resolveTemplate(body.template ?? 1);
    if (ti < 0) return json({ success: false, error: `Unknown template "${body.template}"`, templates: templateList() }, 400);

    const content = { title: body.title.trim().slice(0, 300), sub: body.description == null ? "" : String(body.description).slice(0, 600) };
    for (const [from, to] of [["highlight", "hl"], ["highlight2", "hl2"], ["subHighlight", "shl"], ["badge", "badge"], ["button", "btn"]])
      if (body[from] != null) content[to] = String(body[from]).slice(0, 300);
    const { s, bad } = PinEngine.build(ti, content, body.options);

    const urls = [body.imageUrl, ...(Array.isArray(body.imageUrls) ? body.imageUrls : [])].filter((x) => typeof x === "string" && x.trim()).slice(0, 4);
    const output = body.output === "png" || body.output === "base64" ? body.output : "url";

    /* same input -> same file name, so retries from Make never create duplicates */
    const id = createHash("sha1").update(JSON.stringify({ RENDER_VERSION, ti, s, urls, b64: body.imageBase64 ? String(body.imageBase64).length : 0 })).digest("hex").slice(0, 24);
    const base = (process.env.PUBLIC_BASE_URL || new URL(req.url).origin).replace(/\/$/, "");
    const info = { success: true, url: `${base}/pins/${id}.png`, id, template: { number: ti + 1, name: PinEngine.TPL[ti].name }, width: 1000, height: 1500 };
    const warnings = bad.length ? [`Ignored invalid option(s): ${bad.join(", ")}`] : [];

    let store = null;
    if (output === "url") {
      try { store = getStore("pins"); } catch (e) { throw new HttpError(500, "Netlify Blobs is not available for this site: " + e.message); }
      if (!body.force && (await store.getMetadata(`${id}.png`))) return json({ ...info, cached: true, ...(warnings.length && { warnings }) });
    }

    const fonts = loadFonts();
    const images = [];
    for (const u of urls) images.push(await fetchImage(u));
    if (typeof body.imageBase64 === "string" && body.imageBase64) images.unshift(await decode(Buffer.from(body.imageBase64.replace(/^data:[^,]+,/, ""), "base64")));

    const canvas = createCanvas(1000, 1500);
    PinEngine.draw(canvas.getContext("2d"), s, images, 1, ti);
    const png = canvas.toBuffer("image/png");

    if (fonts.missing.length) warnings.push(`Fonts not installed on the server (fallback used): ${fonts.missing.join(", ")}`);
    if (output === "png") return new Response(png, { status: 200, headers: { "content-type": "image/png", "cache-control": "no-store", ...CORS } });

    await store.set(`${id}.png`, png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength), { metadata: { template: ti + 1, createdAt: new Date().toISOString() } });
    return json({ ...info, cached: false, ...(output === "base64" && { base64: png.toString("base64") }), ...(warnings.length && { warnings }) });
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status === 500) console.error("render-pin failed:", e);
    return json({ success: false, error: e.message || "Unexpected error" }, status);
  }
};

export const config = { path: "/api/render-pin" };
