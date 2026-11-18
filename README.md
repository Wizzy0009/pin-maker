# Pin Maker (Netlify)

* `public/index.html` is the editor you open in the browser.
* `netlify/functions/render-pin.mjs` is the API your Make scenario calls. It draws the pin and returns a public image URL.
* `netlify/functions/pin.mjs` serves the saved images at `/pins/<id>.png`.
* `public/pin-engine.js` is the drawing code. The editor and the API both use it, so a pin looks the same in both.

## Deploy (about 10 minutes)

1. Put this whole folder in a GitHub repo (Netlify needs to run `npm install`, so drag-and-drop will not work).
2. Netlify > Add new site > Import from Git > pick the repo. Leave the settings alone; `netlify.toml` has them.
3. (Recommended) Site settings > Environment variables > add `PIN_API_KEY` with any long random text. Without it, anyone who finds the URL can make pins on your account.
4. Deploy. Open `https://YOUR-SITE.netlify.app/.netlify/functions/render-pin` in a browser. You should see a JSON list of the templates. Check that `fontsMissingOnServer` is `[]`. If the address 404s, use `/api/render-pin` instead (same function).

## Call it

POST JSON to `https://YOUR-SITE.netlify.app/.netlify/functions/render-pin`

```json
{
  "title": "A Simple Class 10|Study Guide|For|CBSE Maths|Preparation",
  "description": "",
  "imageUrl": "https://example.com/photo.jpg",
  "template": 15,
  "highlight": "Class 10 CBSE Maths"
}
```

Answer:

```json
{ "success": true, "url": "https://YOUR-SITE.netlify.app/pins/3f9c....png", "cached": false }
```

* `template` is the number shown under each design in the editor (1 to 15), or its name such as `"study-guide-box"`.
* Text tricks: `|` starts a new line, `**word**` is bold, `*word*` is italic.
* Optional extras: `highlight`, `highlight2`, `subHighlight`, `badge`, `button`, `imageUrls` (a list, for the collage design), `output` (`"url"` default, `"png"` returns the image itself, `"base64"`), `force: true` (draw again even if this exact pin already exists).
* `options` can change any setting from the editor (colours, fonts, box line, border, bold/italic, on/off switches). The easiest way: design the pin in the editor, open "Use this design with Make / the API", copy the JSON, and replace the title, description and imageUrl.
* Sending the same input twice returns the same URL, so a retry in Make never makes duplicates.
* Errors come back as `{ "success": false, "error": "..." }` with a normal HTTP status (400 bad input, 401 wrong key, 422 photo could not be downloaded).

## In Make

1. Add the **HTTP > Make a request** module. URL: the address above. Method: POST. Body type: Raw. Content type: JSON. Request content: the JSON above, with your title, description and image URL mapped from earlier modules.
2. If you set `PIN_API_KEY`, add the header `x-api-key` with the same value.
3. Turn on "Parse response". In the Pinterest "Create a Pin" module, map the image URL to `url` from this module.

## Things to know

* Photos must be public links (JPG, PNG, WebP or GIF, up to 15 MB). Netlify functions stop after about 10 seconds by default; a normal pin takes 1 to 3.
* Pins are kept in Netlify Blobs (included with your site). Nothing else to set up.
* Fonts are downloaded from Google Fonts during the Netlify build (`scripts/prepare-fonts.mjs`). If that ever fails, drop the `.ttf` files into `netlify/functions/fonts/` (named like `Poppins.ttf`, `Bebas Neue.ttf`) and commit them.
