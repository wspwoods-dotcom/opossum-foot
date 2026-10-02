/* Opossum Foot — service worker
 * Caches the app shell so the app opens and works offline.
 * Map tiles are cached opportunistically (bounded) as the user views them.
 * No user data ever passes through here — sets/catches live in
 * localStorage/IndexedDB on the device only.
 */
var SHELL_CACHE = 'opossum-foot-shell-v61';
var TILE_CACHE = 'opossum-foot-tiles-v1';
var MAX_TILES = 400;

var SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/guide-content.js',
  './js/season-data.js',
  './manifest.json',
  './version.txt',
  './assets/logo.png',
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
  './assets/sponsors/awesome-opossum.webp'
];

var TILE_HOSTS = [
  'basemaps.cartocdn.com',
  'server.arcgisonline.com',
  'tile.opentopomap.org'
];

function isTileRequest(url) {
  return TILE_HOSTS.some(function (h) { return url.indexOf(h) !== -1; });
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
        if (k !== SHELL_CACHE && k !== TILE_CACHE) return caches.delete(k);
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
      }
    });
  });
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = req.url;

  /* tiles: cache-first, then network, bounded cache */
  if (isTileRequest(url)) {
    event.respondWith(
      caches.open(TILE_CACHE).then(function (cache) {
        return cache.match(req).then(function (hit) {
          if (hit) return hit;
          return fetch(req).then(function (res) {
            if (res && res.ok) {
              cache.put(req, res.clone());
              trimTiles();
            }
            return res;
          }).catch(function () { return hit; });
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
  /* CDN libraries (Leaflet) and geocoding APIs: network only, no caching of user-adjacent data */
});
