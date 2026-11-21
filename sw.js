/* Opossum Foot — service worker
 * Caches the app shell so the app opens and works offline.
 * Map tiles are cached opportunistically (bounded) as the user views them.
 * No user data ever passes through here — sets/catches live in
 * localStorage/IndexedDB on the device only.
 */
var SHELL_CACHE = 'opossum-foot-shell-v192';
var TILE_CACHE = 'opossum-foot-tiles-v1';
var TILE_META_CACHE = 'opossum-foot-tile-meta-v1';
var MAX_TILES = 2000;
/* Q10 / gy (2026-11-18): Mapbox's terms allow caching its tiles on an
   end user's device for at most 30 days. Mapbox tiles therefore carry a
   fetch timestamp (kept in the meta cache, keyed by the tile request)
   and are never served past this age — an expired entry is deleted and
   refetched, never served stale. The cap is scoped to the Mapbox host
   only; the other hosts keep the standing cache-first behavior, bounded
   by the tile count alone. */
var MAPBOX_TILE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

var SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/catalog.js',
  './js/glyphs.js',
  './js/markers.js',
  './js/tracking.js',
  './js/citydb.js',
  './js/zipdb.js',
  './js/guide-content.js',
  './js/season-data.js',
  './js/gap-data.js',
  './manifest.json',
  './version.txt',
  './assets/logo-primary.png',
  './assets/icon-mark.png',
  './assets/pin-track.svg',
  './assets/pin-track-ol.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png',
  './assets/favicon.png',
  './assets/species/badger.png',
  './assets/species/opossum.png',
  './assets/species/striped-skunk.png',
  './assets/species/red-fox.png',
  './assets/species/gray-fox.png',
  './assets/species/mink.png',
  './assets/species/muskrat.png',
  './assets/species/weasel.png',
  './assets/species/groundhog.png',
  './assets/species/raccoon.png',
  './assets/species/beaver.png',
  './assets/species/coyote.png',
  './assets/species/wolf.png',
  './assets/species/spotted-skunk.png',
  './assets/species/otter.png',
  './assets/species/bobcat.png',
  './assets/icons/compass.png',
  './assets/icons/logbook.png',
  './assets/icons/barchart.png',
  './assets/icons/idcard.png',
  './assets/icons/gear.png',
  './assets/icons/crosshair.png',
  './assets/icons/mappin.png',
  './assets/icons/plus.png',
  './assets/icons/check.png',
  './assets/icons/x.png',
  './assets/sponsors/pine-hollow.png',
  './assets/sponsors/kansas-trapline.png',
  './vendor/leaflet/leaflet.js',
  './vendor/leaflet/leaflet.css',
  './vendor/leaflet/images/layers.png',
  './vendor/leaflet/images/layers-2x.png',
  './vendor/leaflet/images/marker-icon.png',
  './vendor/leaflet/images/marker-icon-2x.png',
  './vendor/leaflet/images/marker-shadow.png'
];

var TILE_HOSTS = [
  'api.mapbox.com',
  'basemap.nationalmap.gov'
];

function isTileRequest(url) {
  return TILE_HOSTS.some(function (h) { return url.indexOf(h) !== -1; });
}

function isMapboxTile(url) {
  return url.indexOf('api.mapbox.com') !== -1;
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(function (cache) {
      /* 2026-10-01: fetch with cache:'reload' — a plain cache.addAll can
         precache STALE bytes from the browser HTTP cache (observed: new JS
         active while old CSS still applied on iOS). Every build's files
         must be byte-fresh under the new cache name. */
      return Promise.all(SHELL.map(function (u) {
        return fetch(u, { cache: 'reload' }).then(function (res) {
          if (res && res.ok) return cache.put(u, res);
        });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== SHELL_CACHE && k !== TILE_CACHE && k !== TILE_META_CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); }).then(function () {
      /* A new build just took charge while pages may still show the old one.
         Tell open pages so the app can offer a one-tap reload (never force
         one — the user might be mid-log). */
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (wins) {
        wins.forEach(function (w) { w.postMessage({ type: 'OF_NEW_VERSION' }); });
      });
    })
  );
});

function trimTiles() {
  caches.open(TILE_CACHE).then(function (cache) {
    cache.keys().then(function (keys) {
      if (keys.length > MAX_TILES) {
        /* delete oldest first (cache.keys() returns in insertion order) */
        var extra = keys.slice(0, keys.length - MAX_TILES);
        extra.forEach(function (k) { cache.delete(k); });
        /* gy: an evicted tile takes its Mapbox timestamp with it. */
        caches.open(TILE_META_CACHE).then(function (meta) {
          extra.forEach(function (k) { meta.delete(k); });
        });
      }
    });
  });
}

/* The Mapbox referrer story, in full. The token's URL restriction is
   registered with the full app path and Mapbox prefix-matches the
   request's Referer against it — but browsers send only the bare
   ORIGIN as the Referer for cross-origin tile images under the
   default referrer policy, so the phone's tile requests were refused
   (403) and the aerial painted black (gy field report, Tanner's
   phone: labels and pins over a black field). Verified against
   Mapbox's live door: full-path Referer → 200 image/jpeg,
   origin-only → 403, none → 403.
   hf (2026-11-18) had this worker fetch Mapbox tiles itself,
   constructing each fetch with an explicit referrer. That passed the
   Chromium bench (200s, real pixels) and FAILED in the field —
   Tanner's iPhone, 2026-11-18 22:17 and again 2026-11-19 06:52,
   still black: WebKit's handling of referrer/referrerPolicy on
   worker-constructed fetches does not match Chromium's. The
   constructed fetch is therefore removed from the chain.
   hg (2026-11-19): the PAGE's own tile requests carry the full
   referer — index.html sets the document policy (<meta
   name="referrer" content="unsafe-url">) and the Mapbox layer in
   js/app.js carries the element-level policy — and this worker is a
   pure pass-through: fetch(req) preserves the page request's
   referrer exactly as the browser computed it.
   hg FAILED in the field too (Tanner's iPhone, 2026-11-19 07:16 —
   the third black field report). Two hypotheses survive, and both
   point the same way: either the new workers never actually took
   control on his installed PWA (iOS update stickiness — the app
   now pokes registration.update() on foregrounding, see js/app.js),
   or WebKit's service worker rewrites or drops the Referer on
   fetch(req) even in "pass-through" — a long-standing class of
   WebKit bugs in which SW-intercepted requests lose the page's
   referrer. Under the second, ANY interception of Mapbox tiles is
   poison in WebKit, whatever the page policy says.
   hh (2026-11-19): Mapbox tiles bypass this worker ENTIRELY. The
   fetch handler below returns without respondWith for
   api.mapbox.com, so the browser makes the request natively,
   carrying the page's referrer (hg's meta + layer policy, which
   stay). The worker does not touch these requests at all.
   Consequence, stated plainly: bypassed tiles live in the browser
   HTTP cache, outside the 30-day TTL machinery below (which now
   governs the remaining hosts; its Mapbox stamping code stands for
   entries cached by gy–hg but is unreachable for new tiles).
   Retention of a bypassed tile is governed by Mapbox's own
   response header — verified against the live door 2026-11-19:
   "Cache-Control: max-age=43200,s-maxage=43200", i.e. 12 hours,
   well inside Mapbox's 30-day caching terms.
   hi (2026-11-19): the cause is CONVICTED, and it is not in this
   file or in the page. Served exactly as production and read at
   the wire under Playwright's WebKit (hidden_files/hi-check.py),
   EVERY client path sends only the bare ORIGIN as the Referer
   for cross-origin Mapbox requests — tile <img> (IDL property or
   content attribute), plain <img> under the meta, page fetch
   with an explicit full-URL referrer, and worker-constructed
   fetch with an explicit referrer (hf's mechanism) — and Mapbox
   answers 403 to each, while Chromium sends the full URL and
   answers 200 through the same relay. WebKit trims the
   cross-origin Referer to the origin no matter what the page
   declares, so NO client-side mechanism can present the full
   app path this token's restriction demands; a page-context
   fetch layer was measured (explicit referrer, trimmed just the
   same) and deliberately NOT built. The remaining cure sits on
   the token itself (Mapbox console: admit the bare origin the
   browsers actually send). Until then the bypass above stands —
   it is correct in every engine that honors the page's policy —
   and the tile machinery for the other hosts is unchanged.
   hi amendment (2026-11-19, later): the cure LANDED. The token's
   restriction now admits the bare origin (console change, Tanner,
   2026-11-19 ~09:07 CT — verified at the source with the origin
   Referer and on his phone: the map paints). In the same build,
   Esri leaves the app entirely on Tanner's order: World_Imagery,
   World_Street_Map and the Reference overlays are gone from
   js/app.js, replaced by satellite-streets-v12 (aerial, labels
   baked in), streets-v12 and outdoors-v12 on this same token —
   all api.mapbox.com, so all ride the bypass above. Accordingly
   the Esri host, the OpenTopoMap host and the long-dead CARTO
   host leave TILE_HOSTS below (their names are deliberately not
   written here — the shipped files carry zero references to
   them now); the USGS host (NAIP) stays and keeps this cache. */

/* gy: the tile fetch, shared by the cache-miss and expired paths.
   A fresh Mapbox tile is timestamped in the meta cache as it lands
   (the 30-day cap above). The fetch itself is a plain pass-through
   of the page's request (hg). hh: this function is unreachable for
   Mapbox — the fetch handler bypasses those requests before this
   branch (see the note above) — so its Mapbox stamping stands only
   for entries cached by gy–hg; the other hosts flow through here
   exactly as before. */
function fetchTile(cache, req, url) {
  return fetch(req).then(function (res) {
    if (res && res.ok) {
      cache.put(req, res.clone());
      if (isMapboxTile(url)) {
        caches.open(TILE_META_CACHE).then(function (meta) {
          meta.put(req, new Response(String(Date.now())));
        });
      }
      trimTiles();
    }
    return res;
  }).catch(function () { return undefined; });
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = req.url;

  /* hh: Mapbox tiles bypass this worker ENTIRELY — return without
     respondWith and the browser makes the request natively, with
     the page's own referrer (see the long note above fetchTile).
     The worker must not touch these requests at all. */
  if (isMapboxTile(url)) return;

  /* tiles: cache-first, then network, bounded cache. (Mapbox never
     reaches this branch under hh — see the bypass above; the
     30-day-cap path below stands for the remaining hosts and for
     entries cached by gy–hg.) */
  if (isTileRequest(url)) {
    event.respondWith(
      caches.open(TILE_CACHE).then(function (cache) {
        return cache.match(req).then(function (hit) {
          if (!hit) return fetchTile(cache, req, url);
          if (!isMapboxTile(url)) return hit;
          return caches.open(TILE_META_CACHE).then(function (meta) {
            return meta.match(req).then(function (stamp) {
              return (stamp ? stamp.text() : Promise.resolve('')).then(function (ts) {
                if (ts && (Date.now() - (+ts)) < MAPBOX_TILE_TTL_MS) return hit;
                /* expired (or never stamped): delete and refetch —
                   stale Mapbox tiles are never served. */
                cache.delete(req);
                meta.delete(req);
                return fetchTile(cache, req, url);
              });
            });
          });
        });
      })
    );
    return;
  }

  /* app shell: network-first with forced revalidation, cache fallback.
   * GitHub Pages sends Cache-Control: max-age=600 — a plain fetch() would
   * serve the PREVIOUS build from the browser HTTP cache on any load within
   * 10 minutes of the last one (this bit Tanner repeatedly on 2026-10-01:
   * new JS active while old markup/CSS still rendered). no-cache revalidates
   * every load (fast 304 when unchanged); the cache is only for offline use. */
  if (url.indexOf(self.location.origin) === 0 || url.indexOf('file:') === 0) {
    event.respondWith(
      fetch(new Request(req, { cache: 'no-cache' })).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(SHELL_CACHE).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          if (hit) return hit;
          /* offline and not cached: serve the app shell for navigations */
          if (req.mode === 'navigate') return caches.match('./index.html');
          throw new Error('offline and not cached: ' + url);
        });
      })
    );
  }
  /* Geocoding APIs: network only, no caching of user-adjacent data (Leaflet is bundled locally since Q227). */
});
