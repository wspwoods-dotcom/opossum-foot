/* Opossum Foot — service worker
 * Caches the app shell so the app opens and works offline.
 * Map tiles are cached opportunistically (bounded) as the user views them.
 * No user data ever passes through here — sets/catches live in
 * localStorage/IndexedDB on the device only.
 */
var SHELL_CACHE = 'opossum-foot-shell-v2';
var TILE_CACHE = 'opossum-foot-tiles-v1';
var MAX_TILES = 400;

var SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/season-data.js',
  './manifest.json',
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
  './assets/species/bobcat.png'
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
      return cache.addAll(SHELL);
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== SHELL_CACHE && k !== TILE_CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
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

  /* app shell: network-first, cache fallback.
   * Online loads always fetch the newest code; the cache is only a fallback
   * for offline use. This ends stale-code lock-in: no more manual cache bumps. */
  if (url.indexOf(self.location.origin) === 0 || url.indexOf('file:') === 0) {
    event.respondWith(
      fetch(req).then(function (res) {
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
