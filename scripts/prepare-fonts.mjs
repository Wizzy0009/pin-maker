/* Runs on every Netlify build (npm run build).
   Downloads the TTF files for the 16 pin fonts into netlify/functions/fonts/ so the
   serverless function can draw with exactly the same fonts as the editor.
   Fonts that already exist are skipped, so you may also commit that folder. */
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";

const { W } = createRequire(import.meta.url)("../public/pin-engine.js");
const out = path.resolve("netlify/functions/fonts");
await fs.mkdir(out, { recursive: true });

const UAS = [
  "",
  "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1",
  "curl/8.5.0",
];
const exists = (f) => fs.access(f).then(() => true, () => false);
const failed = [];

for (const [family, weight] of Object.entries(W)) {
  const file = path.join(out, `${family}.ttf`);
  if (await exists(file)) { console.log(`✓ ${family} (already there)`); continue; }
  const cssUrl = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}`;
  let done = false;
  for (const ua of UAS) {
    try {
      const res = await fetch(cssUrl, { headers: ua ? { "User-Agent": ua } : {} });
      const m = (await res.text()).match(/url\((https:[^)]+?\.(?:ttf|otf))\)/i);
      if (!m) continue;
      const font = await fetch(m[1]);
      if (!font.ok) continue;
      await fs.writeFile(file, Buffer.from(await font.arrayBuffer()));
      console.log(`↓ ${family}`);
      done = true;
      break;
    } catch (e) { /* try the next user agent */ }
  }
  if (!done) failed.push(family);
}

if (failed.length) {
  console.warn(`\n⚠ Could not download: ${failed.join(", ")}.\n  The function will still work but will draw those fonts with a fallback.\n  Fix: put <Font Name>.ttf files in netlify/functions/fonts/ and commit them.`);
}
