# Opossum Foot — beta PWA

Local-first trapping notebook. No accounts, no cloud, no analytics.
All user data stays on the trapper's phone (localStorage + IndexedDB).

## Deploy (any free static host)

This is a plain static site — no build step. Upload the **contents** of this
folder (index.html, css/, js/, assets/, data/, manifest.json, sw.js) to:

- **GitHub Pages:** repo Settings → Pages → deploy from branch, put these files
  at the repo root (or in `docs/`).
- **Netlify:** drag-and-drop this folder into Netlify Drop, or connect a repo.
- **Cloudflare Pages:** upload as a Pages project (no build command needed).

Then open the hosted URL on a phone → Add to Home Screen to install.

`file://` also works for testing (service worker is skipped there, which is
expected — offline app-shell caching needs http/https).

## What's inside

- `index.html` — all screens: splash, state picker, map, history, totals,
  seasons, license wallet, settings; bottom sheets for sets / catch logging.
- `css/styles.css` — mobile-first, big touch targets, field-readable theme.
- `js/app.js` — all logic (sets, logs, seasons, voice, CSV, PWA wiring).
- `js/season-data.js` — all 50 states' 2026–27 season data embedded as a plain
  script tag so the app works from `file://` with zero fetch/CORS issues.
  (Only the user's selected state is used at runtime.)
- `data/*.json` — the 50 source season-data files (schema v1.1); the embedded
  JS is generated from these.
- `assets/` — opossum-foot logo + generated PWA icons (192/512/180/32).
- `manifest.json`, `sw.js` — installability + offline app-shell/tile caching.

## Runtime network use (only these)

- Map tiles: cartocdn.com, arcgisonline.com, opentopomap.org
- Leaflet CDN: unpkg.com
- County/state reverse-geocode (free, keyless): api.bigdatacloud.net,
  fallback nominatim.openstreetmap.org

No user data is ever sent anywhere.
