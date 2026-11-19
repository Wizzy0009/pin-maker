/* GET /pins/<id>.png  -> serves a pin that render-pin saved. This is the public image URL. */
import { getStore } from "@netlify/blobs";

export default async (req) => {
  const m = new URL(req.url).pathname.match(/^\/pins\/([a-f0-9]{16,64})(?:\.png)?$/i);
  if (!m) return new Response("Not found", { status: 404 });
  let data = null;
  try { data = await getStore("pins").get(`${m[1].toLowerCase()}.png`, { type: "arrayBuffer" }); } catch { /* treated as not found */ }
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(data, {
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=31536000, immutable",
      "access-control-allow-origin": "*",
    },
  });
};

export const config = { path: "/pins/*" };
