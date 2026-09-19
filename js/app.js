/* Opossum Foot — beta PWA
 * Local-first trapping notebook. No accounts, no cloud, no analytics.
 * - Sets / logs / settings  -> localStorage (JSON)
 * - License photos / voice memos -> IndexedDB (blobs)
 * - Season data -> embedded js/season-data.js (works from file:// too)
 */
'use strict';

/* ================= 1. STATE LIST ================= */
/* code -> file mapping; data itself lives in window.OPOSSUM_FOOT_SEASON_DATA */
var STATES = [
  { code: "AL", name: "Alabama", file: "alabama-2026-27.json", provisional: false },
  { code: "AK", name: "Alaska", file: "alaska-2026-27.json", provisional: false },
  { code: "AZ", name: "Arizona", file: "arizona-2026-27.json", provisional: false },
  { code: "AR", name: "Arkansas", file: "arkansas-2026-27.json", provisional: false },
  { code: "CA", name: "California", file: "california-2026-27.json", provisional: false },
  { code: "CO", name: "Colorado", file: "colorado-2026-27.json", provisional: false },
  { code: "CT", name: "Connecticut", file: "connecticut-2026-27.json", provisional: true },
  { code: "DE", name: "Delaware", file: "delaware-2026-27.json", provisional: false },
  { code: "FL", name: "Florida", file: "florida-2026-27.json", provisional: false },
  { code: "GA", name: "Georgia", file: "georgia-2026-27.json", provisional: false },
  { code: "HI", name: "Hawaii", file: "hawaii-2026-27.json", provisional: false },
  { code: "ID", name: "Idaho", file: "idaho-2026-27.json", provisional: false },
  { code: "IL", name: "Illinois", file: "illinois-2026-27.json", provisional: false },
  { code: "IN", name: "Indiana", file: "indiana-2026-27.json", provisional: false },
  { code: "IA", name: "Iowa", file: "iowa-2026-27.json", provisional: false },
  { code: "KS", name: "Kansas", file: "kansas-2026-27.json", provisional: false },
  { code: "KY", name: "Kentucky", file: "kentucky-2026-27.json", provisional: false },
  { code: "LA", name: "Louisiana", file: "louisiana-2026-27.json", provisional: false },
  { code: "ME", name: "Maine", file: "maine-2026-27.json", provisional: false },
  { code: "MD", name: "Maryland", file: "maryland-2026-27.json", provisional: false },
  { code: "MA", name: "Massachusetts", file: "massachusetts-2026-27.json", provisional: false },
  { code: "MI", name: "Michigan", file: "michigan-2026-27.json", provisional: false },
  { code: "MN", name: "Minnesota", file: "minnesota-2026-27.json", provisional: false },
  { code: "MS", name: "Mississippi", file: "mississippi-2026-27.json", provisional: true },
  { code: "MO", name: "Missouri", file: "missouri-2026-27.json", provisional: false },
  { code: "MT", name: "Montana", file: "montana-2026-27.json", provisional: false },
  { code: "NE", name: "Nebraska", file: "nebraska-2026-27.json", provisional: false },
  { code: "NV", name: "Nevada", file: "nevada-2026-27.json", provisional: false },
  { code: "NH", name: "New Hampshire", file: "new-hampshire-2026-27.json", provisional: false },
  { code: "NJ", name: "New Jersey", file: "new-jersey-2026-27.json", provisional: false },
  { code: "NM", name: "New Mexico", file: "new-mexico-2026-27.json", provisional: false },
  { code: "NY", name: "New York", file: "new-york-2026-27.json", provisional: false },
  { code: "NC", name: "North Carolina", file: "north-carolina-2026-27.json", provisional: true },
  { code: "ND", name: "North Dakota", file: "north-dakota-2026-27.json", provisional: false },
  { code: "OH", name: "Ohio", file: "ohio-2026-27.json", provisional: false },
  { code: "OK", name: "Oklahoma", file: "oklahoma-2026-27.json", provisional: false },
  { code: "OR", name: "Oregon", file: "oregon-2026-27.json", provisional: false },
  { code: "PA", name: "Pennsylvania", file: "pennsylvania-2026-27.json", provisional: false },
  { code: "RI", name: "Rhode Island", file: "rhode-island-2026-27.json", provisional: false },
  { code: "SC", name: "South Carolina", file: "south-carolina-2026-27.json", provisional: false },
  { code: "SD", name: "South Dakota", file: "south-dakota-2026-27.json", provisional: false },
  { code: "TN", name: "Tennessee", file: "tennessee-2026-27.json", provisional: false },
  { code: "TX", name: "Texas", file: "texas-2026-27.json", provisional: false },
  { code: "UT", name: "Utah", file: "utah-2026-27.json", provisional: false },
  { code: "VT", name: "Vermont", file: "vermont-2026-27.json", provisional: true },
  { code: "VA", name: "Virginia", file: "virginia-2026-27.json", provisional: false },
  { code: "WA", name: "Washington", file: "washington-2026-27.json", provisional: false },
  { code: "WV", name: "West Virginia", file: "west-virginia-2026-27.json", provisional: false },
  { code: "WI", name: "Wisconsin", file: "wisconsin-2026-27.json", provisional: false },
  { code: "WY", name: "Wyoming", file: "wyoming-2026-27.json", provisional: false }
];
var REMINDER_LINE = 'Reminder only — always verify with your state agency.';
var APP_VERSION = 'beta 0.1 · build 2026-09-19g';

/* ================= 2. STORAGE ================= */
var LS_KEY = 'opossumfoot.v1';

var Store = {
  data: null,
  load: function () {
    try { this.data = JSON.parse(localStorage.getItem(LS_KEY)); } catch (e) { this.data = null; }
    if (!this.data || typeof this.data !== 'object') {
      this.data = { onboarded: false, state: null, sets: [], logs: [] };
    }
    if (!Array.isArray(this.data.sets)) this.data.sets = [];
    if (!Array.isArray(this.data.logs)) this.data.logs = [];
  },
  save: function () {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(this.data));
    } catch (e) {
      toast('Storage is full — export a CSV backup, then erase old data.');
    }
  }
};

var IDB = {
  db: null,
  open: function () {
    var self = this;
    return new Promise(function (resolve) {
      if (!('indexedDB' in window)) { resolve(false); return; }
      var req = indexedDB.open('opossumfoot', 1);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('memos')) db.createObjectStore('memos', { keyPath: 'id' });
      };
      req.onsuccess = function (e) { self.db = e.target.result; resolve(true); };
      req.onerror = function () { resolve(false); }; // photos/memos just won't work; app continues
    });
  },
  put: function (store, obj) {
    var self = this;
    return new Promise(function (resolve, reject) {
      if (!self.db) { reject(new Error('no idb')); return; }
      var t = self.db.transaction(store, 'readwrite');
      t.objectStore(store).put(obj);
      t.oncomplete = function () { resolve(); };
      t.onerror = function (e) { reject(e); };
    });
  },
  all: function (store) {
    var self = this;
    return new Promise(function (resolve) {
      if (!self.db) { resolve([]); return; }
      var t = self.db.transaction(store, 'readonly');
      var r = t.objectStore(store).getAll();
      t.oncomplete = function () { resolve(r.result || []); };
      t.onerror = function () { resolve([]); };
    });
  },
  del: function (store, id) {
    var self = this;
    return new Promise(function (resolve) {
      if (!self.db) { resolve(); return; }
      var t = self.db.transaction(store, 'readwrite');
      t.objectStore(store).delete(id);
      t.oncomplete = function () { resolve(); };
      t.onerror = function () { resolve(); };
    });
  },
  clear: function (store) {
    var self = this;
    return new Promise(function (resolve) {
      if (!self.db) { resolve(); return; }
      var t = self.db.transaction(store, 'readwrite');
      t.objectStore(store).clear();
      t.oncomplete = function () { resolve(); };
      t.onerror = function () { resolve(); };
    });
  }
};

/* ================= 3. HELPERS ================= */
function $(id) { return document.getElementById(id); }

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function uid(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function todayISO() {
  var d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}
function pad(n) { return (n < 10 ? '0' : '') + n; }

function fmtDate(iso) {
  if (!iso) return '';
  var p = iso.split('-');
  if (p.length !== 3) return iso;
  var d = new Date(p[0] * 1, p[1] * 1 - 1, p[2] * 1);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/* Fur season runs fall -> spring: Aug+ belongs to the season starting that year. */
function seasonYearOf(iso) {
  var p = (iso || todayISO()).split('-');
  var y = p[0] * 1, m = p[1] * 1;
  if (m >= 8) return y + '-' + String(y + 1).slice(2);
  return (y - 1) + '-' + String(y).slice(2);
}

var toastTimer = null;
function toast(msg) {
  var t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.classList.remove('show'); }, 3200);
}

/* bottom sheets */
function openSheet(id) {
  closeSheets();
  $(id).classList.add('show');
  $('scrim').classList.add('show');
}
function closeSheets() {
  var sheets = document.querySelectorAll('.sheet.show');
  for (var i = 0; i < sheets.length; i++) sheets[i].classList.remove('show');
  $('scrim').classList.remove('show');
  /* never leave a stray recording running behind a closed sheet */
  try { Voice.stop(); } catch (e) { /* noop */ }
  try { Memo.stop(); } catch (e) { /* noop */ }
}

/* modal */
function showModal(html) {
  $('modal-card').innerHTML = html;
  $('modal').classList.add('show');
}
function closeModal() { $('modal').classList.remove('show'); }
function confirmModal(title, body, okLabel, onOk) {
  showModal(
    '<h3>' + esc(title) + '</h3><p>' + body + '</p>' +
    '<div class="btn-row"><button class="btn-secondary" id="m-cancel" type="button">Cancel</button>' +
    '<button class="btn-danger" id="m-ok" type="button">' + esc(okLabel) + '</button></div>'
  );
  $('m-cancel').onclick = closeModal;
  $('m-ok').onclick = function () { closeModal(); onOk(); };
}

function downloadCSV(filename, rows) {
  var csv = rows.map(function (r) {
    return r.map(function (c) {
      var s = String(c == null ? '' : c);
      return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(',');
  }).join('\r\n');
  var blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 3000);
}

/* ================= 4. SEASON DATA ================= */
function stateData() {
  var code = Store.data.state;
  if (!code) return null;
  var all = window.OPOSSUM_FOOT_SEASON_DATA || {};
  return all[code] || null;
}
function stateEntry(code) {
  for (var i = 0; i < STATES.length; i++) if (STATES[i].code === code) return STATES[i];
  return null;
}
function parseISODate(s) {
  var p = s.split('-');
  return new Date(p[0] * 1, p[1] * 1 - 1, p[2] * 1);
}

/* Returns { inSeason, badge, badgeClass, label, limits, seasonNote }.
   NEVER blocks logging — the app warns, it does not forbid. */
function speciesSeasonInfo(sp, refDate) {
  var today = refDate ? parseISODate(refDate) : new Date();
  today.setHours(0, 0, 0, 0);
  var res = { inSeason: false, badge: 'Out of season', badgeClass: 'outseason', limits: null, seasonNote: '' };
  var status = sp.season_status;
  if (status === 'closed') {
    res.badge = 'Closed season'; res.badgeClass = 'closed';
    res.seasonNote = sp.notes || 'Closed season.';
    return res;
  }
  if (status === 'continuous') {
    res.inSeason = true; res.badge = 'Year-round'; res.badgeClass = 'yearround';
    var s0 = (sp.seasons || [])[0];
    if (s0 && s0.bag_limits) res.limits = s0.bag_limits;
    return res;
  }
  /* status === 'open': check today's date against season ranges */
  var matched = null;
  (sp.seasons || []).forEach(function (s) {
    if (matched) return;
    if (s.continuous_open) { matched = s; return; }
    if (s.open_date && s.close_date) {
      var o = parseISODate(s.open_date), c = parseISODate(s.close_date);
      if (today >= o && today <= c) matched = s;
    }
  });
  if (matched) {
    res.inSeason = true; res.badge = 'In season'; res.badgeClass = 'inseason';
    res.limits = matched.bag_limits || null;
    res.seasonNote = matched.notes || '';
  } else {
    res.badge = 'Out of season'; res.badgeClass = 'outseason';
    res.seasonNote = 'Not in an open date range today.';
  }
  return res;
}

function findSpecies(name) {
  var d = stateData();
  if (!d) return null;
  for (var i = 0; i < d.species.length; i++) {
    if (d.species[i].common_name === name) return d.species[i];
  }
  return null;
}

/* Human-readable catch disposition. 'kept' = harvested/dead, 'kept-alive' =
   held live, 'released' = let go. Logs saved before any disposition existed
   are treated as 'kept'. */
function dispLabel(d) {
  if (d === 'released') return 'Released';
  if (d === 'kept-alive') return 'Kept alive';
  return 'Kept';
}

function dispBadge(d) {
  if (d === 'released') return ' <span class="badge released">released</span>';
  if (d === 'kept-alive') return ' <span class="badge alive">kept alive</span>';
  return '';
}

/* total KEPT count logged for a species in a season year.
   Released animals never count toward bag limits; kept and kept-alive do
   (an animal held alive is still in possession).
   Logs saved before the disposition field existed have no disposition
   and are treated as kept (backward compatible). */
function speciesSeasonTotal(name, seasonYear) {
  var n = 0;
  Store.data.logs.forEach(function (l) {
    if (l.species === name && seasonYearOf(l.date) === seasonYear && l.disposition !== 'released') n += (l.count * 1 || 0);
  });
  return n;
}

function limitText(limits) {
  if (!limits) return '';
  var parts = [];
  if (limits.season_bag) parts.push('season bag ' + limits.season_bag);
  if (limits.daily_bag) parts.push('daily bag ' + limits.daily_bag);
  if (limits.possession_limit) parts.push('possession ' + limits.possession_limit);
  var t = parts.join(' · ');
  if (limits.limit_notes) t += (t ? ' — ' : '') + limits.limit_notes;
  return t;
}

/* ================= 5. REVERSE GEOCODING (county + state) ================= */
/* Free, keyless, CORS-enabled. BigDataCloud first, Nominatim fallback. */
var geoCache = {};
function reverseGeocode(lat, lng) {
  var key = lat.toFixed(3) + ',' + lng.toFixed(3);
  if (geoCache[key]) return Promise.resolve(geoCache[key]);
  var url = 'https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=' +
    encodeURIComponent(lat) + '&longitude=' + encodeURIComponent(lng) + '&localityLanguage=en';
  return fetch(url).then(function (r) { return r.json(); }).then(function (j) {
    var info = parseBigDataCloud(j);
    geoCache[key] = info;
    return info;
  }).catch(function () {
    return nominatimFallback(lat, lng).then(function (info) {
      geoCache[key] = info;
      return info;
    });
  });
}

/* Retry county lookup for sets saved while offline, once we're back online. */
var backfillRunning = false;
function backfillCounties() {
  if (backfillRunning || !navigator.onLine || !Store.data) return;
  var missing = Store.data.sets.filter(function (s) { return !s.county && s.lat != null && s.lng != null; });
  if (!missing.length) return;
  backfillRunning = true;
  var i = 0;
  (function next() {
    if (i >= missing.length) { backfillRunning = false; return; }
    var s = missing[i++];
    try {
      reverseGeocode(s.lat, s.lng).then(function (info) {
        if (info && info.county) { s.county = info.county; Store.save(); }
        setTimeout(next, 800);
      }, function () { setTimeout(next, 800); });
    } catch (e) { setTimeout(next, 800); }
  })();
}
function parseBigDataCloud(j) {
  var county = null, stateName = j.principalSubdivision || null, stateCode = null;
  if (j.principalSubdivisionCode) {
    var parts = String(j.principalSubdivisionCode).split('-');
    stateCode = parts[parts.length - 1];
  }
  try {
    var admins = ((j.localityInfo || {}).administrative) || [];
    var i;
    for (i = 0; i < admins.length; i++) if (admins[i].adminLevel === 6) { county = admins[i].name; break; }
    if (!county) for (i = 0; i < admins.length; i++) if (admins[i].adminLevel === 4) { county = admins[i].name; break; }
  } catch (e) { /* keep nulls */ }
  return { county: county, stateName: stateName, stateCode: stateCode };
}
function nominatimFallback(lat, lng) {
  var url = 'https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=' +
    encodeURIComponent(lat) + '&lon=' + encodeURIComponent(lng);
  return fetch(url, { headers: { 'Accept': 'application/json' } }).then(function (r) { return r.json(); }).then(function (j) {
    var a = j.address || {};
    var county = a.county || null;
    if (county) county = county.replace(/\s+County$/i, '');
    return { county: county, stateName: a.state || null, stateCode: null };
  }).catch(function () {
    return { county: null, stateName: null, stateCode: null };
  });
}

function setCountyBanner(info) {
  var banner = $('county-banner');
  if (info && info.county) {
    banner.classList.remove('unknown');
    $('cb-county').textContent = info.county + ' County';
    $('cb-state').textContent = info.stateName ? info.stateName.toUpperCase() : '';
  } else {
    banner.classList.add('unknown');
    $('cb-county').textContent = 'County unknown';
    $('cb-state').textContent = 'Tap ◎ to locate';
  }
}

/* Warn when the GPS fix is in a different state than the trapping state. */
function checkStateMismatch(info) {
  var bar = $('state-alert');
  if (info && info.stateCode && Store.data.state && info.stateCode !== Store.data.state) {
    var here = null, sel = stateEntry(Store.data.state);
    for (var i = 0; i < STATES.length; i++) if (STATES[i].code === info.stateCode) here = STATES[i];
    $('state-alert-text').textContent =
      'You appear to be in ' + (here ? here.name : info.stateCode) +
      ', but your trapping state is ' + (sel ? sel.name : Store.data.state) + '.';
    bar.classList.add('show');
  } else {
    bar.classList.remove('show');
  }
}

/* ================= 6. MAP ================= */
var map = null, markersLayer = null, gpsMarker = null, gpsCircle = null, dropPinMode = false;
var lastFix = null;

function initMap() {
  if (map) { setTimeout(function () { map.invalidateSize(); }, 100); return; }
  if (typeof L === 'undefined') {
    $('map').innerHTML = '<div class="empty"><div class="big">🗺</div>The map library could not load.<br>Check your connection and reopen.</div>';
    return;
  }
  map = L.map('map', { zoomControl: true, attributionControl: true, maxZoom: 22 }).setView([39.5, -98.35], 4);
  var street = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    { maxZoom: 22, maxNativeZoom: 20, attribution: '© OpenStreetMap contributors © CARTO' });
  var satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 22, maxNativeZoom: 19, attribution: 'Imagery © Esri' });
  var topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    { maxZoom: 22, maxNativeZoom: 17, attribution: '© OpenTopoMap © OpenStreetMap contributors' });
  satellite.addTo(map);
  L.control.layers({ 'Street': street, 'Satellite': satellite, 'Topo': topo }, null, { position: 'topright' }).addTo(map);
  markersLayer = L.layerGroup().addTo(map);

  map.on('click', function (e) {
    if (dropPinMode) {
      setDropPinMode(false);
      openSetForm({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });
  refreshMarkers();
}

function setIcon(set) {
  return L.divIcon({
    className: '',
    html: '<div class="pin pin-' + esc(set.status || 'active') + '"></div>',
    iconSize: [30, 30], iconAnchor: [15, 15]
  });
}

function refreshMarkers() {
  if (!map || !markersLayer) return;
  markersLayer.clearLayers();
  Store.data.sets.forEach(function (s) {
    var m = L.marker([s.lat, s.lng], { icon: setIcon(s), title: s.name });
    m.on('click', function () { openSetDetail(s.id); });
    m._setId = s.id;
    markersLayer.addLayer(m);
  });
}

function setDropPinMode(on) {
  dropPinMode = on;
  $('pin-hint').classList.toggle('show', on);
  $('btn-drop-pin').classList.toggle('active-mode', on);
}

function locateMe() {
  if (!('geolocation' in navigator)) { toast('This device has no GPS.'); return; }
  toast('Getting your location…');
  navigator.geolocation.getCurrentPosition(function (pos) {
    var acc = Math.round(pos.coords.accuracy || 0);
    lastFix = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: acc };
    if (map) {
      /* tighter zoom on a good fix, wider view when the fix is coarse */
      var zl = acc <= 10 ? 20 : acc <= 25 ? 19 : acc <= 60 ? 18 : acc <= 150 ? 17 : 16;
      map.flyTo([lastFix.lat, lastFix.lng], zl, { duration: 1 });
      if (gpsMarker) gpsMarker.setLatLng([lastFix.lat, lastFix.lng]);
      else gpsMarker = L.marker([lastFix.lat, lastFix.lng],
        { icon: L.divIcon({ className: '', html: '<div class="gps-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), interactive: false }).addTo(map);
      if (gpsCircle) gpsCircle.setLatLng([lastFix.lat, lastFix.lng]).setRadius(Math.max(acc, 1));
      else gpsCircle = L.circle([lastFix.lat, lastFix.lng],
        { radius: Math.max(acc, 1), color: '#2f8ff0', weight: 1, opacity: 0.6, fillColor: '#2f8ff0', fillOpacity: 0.15, interactive: false }).addTo(map);
    }
    toast(acc > 50
      ? 'Coarse fix (±' + acc + ' m) — step outside, or check Precise Location for Safari.'
      : 'Located (±' + acc + ' m).');
    reverseGeocode(lastFix.lat, lastFix.lng).then(function (info) {
      setCountyBanner(info);
      checkStateMismatch(info);
      if (!info.county) toast('Located — county lookup failed. You are responsible for knowing your county.');
    });
  }, function () {
    toast('Could not get a GPS fix. Check location permission.');
  }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
}

/* ================= 7. SETS ================= */
var editingSetId = null, pendingCoords = null;

function openSetForm(coords, setId) {
  editingSetId = setId || null;
  pendingCoords = coords || null;
  var s = setId ? getSet(setId) : null;
  $('setform-title').textContent = s ? 'Edit set' : 'New set';
  $('sf-name').value = s ? s.name : '';
  $('sf-name').placeholder = s ? '' : 'e.g. Set ' + (Store.data.sets.length + 1);
  $('sf-type').value = s ? s.trapType : 'Foothold';
  $('sf-bait').value = s ? (s.bait || '') : '';
  $('sf-lure').value = s ? (s.lure || '') : '';
  $('sf-status').value = s ? s.status : 'active';
  $('sf-date').value = s ? s.dateSet : todayISO();
  $('sf-notes').value = s ? (s.notes || '') : '';
  $('voice-setnotes-preview').classList.remove('show');
  $('voice-setnotes-preview').innerHTML = '';
  var c = s ? { lat: s.lat, lng: s.lng } : coords;
  $('setform-coords').textContent = c ? (c.lat.toFixed(5) + ', ' + c.lng.toFixed(5)) : '';
  openSheet('sheet-setform');
}

function getSet(id) {
  for (var i = 0; i < Store.data.sets.length; i++) if (Store.data.sets[i].id === id) return Store.data.sets[i];
  return null;
}

function saveSetForm() {
  var name = $('sf-name').value.trim() || ('Set ' + (Store.data.sets.length + 1));
  if (editingSetId) {
    var s = getSet(editingSetId);
    if (!s) { closeSheets(); return; }
    s.name = name;
    s.trapType = $('sf-type').value;
    s.bait = $('sf-bait').value.trim();
    s.lure = $('sf-lure').value.trim();
    s.status = $('sf-status').value;
    s.dateSet = $('sf-date').value || todayISO();
    s.notes = $('sf-notes').value.trim();
    Store.save(); refreshMarkers();
    closeSheets(); openSetDetail(s.id);
    toast('Set updated.');
  } else {
    if (!pendingCoords) { toast('No location for this set.'); return; }
    var ns = {
      id: uid('s'), name: name,
      lat: pendingCoords.lat, lng: pendingCoords.lng, county: null,
      trapType: $('sf-type').value,
      bait: $('sf-bait').value.trim(), lure: $('sf-lure').value.trim(),
      status: $('sf-status').value,
      dateSet: $('sf-date').value || todayISO(),
      notes: $('sf-notes').value.trim(),
      createdAt: Date.now()
    };
    Store.data.sets.push(ns);
    Store.save(); refreshMarkers(); closeSheets();
    toast('Set saved.');
    /* county lookup in background */
    reverseGeocode(ns.lat, ns.lng).then(function (info) {
      if (info.county) { ns.county = info.county; Store.save(); }
    });
    if (map) map.flyTo([ns.lat, ns.lng], Math.max(map.getZoom(), 14), { duration: 0.8 });
  }
}

var detailSetId = null;
function openSetDetail(id) {
  var s = getSet(id);
  if (!s) return;
  detailSetId = id;
  $('sd-name').textContent = s.name;
  $('sd-badges').innerHTML =
    '<span class="badge status-' + esc(s.status) + '">' + esc(s.status) + '</span> ' +
    (s.county ? '<span class="badge yearround">' + esc(s.county) + ' Co.</span>' : '');
  $('sd-fields').innerHTML =
    '<dt>Trap</dt><dd>' + esc(s.trapType) + '</dd>' +
    '<dt>Bait</dt><dd>' + esc(s.bait || '—') + '</dd>' +
    '<dt>Lure</dt><dd>' + esc(s.lure || '—') + '</dd>' +
    '<dt>Date set</dt><dd>' + esc(fmtDate(s.dateSet)) + '</dd>' +
    '<dt>Location</dt><dd>' + s.lat.toFixed(5) + ', ' + s.lng.toFixed(5) + '</dd>' +
    (s.notes ? '<dt>Notes</dt><dd>' + esc(s.notes) + '</dd>' : '');
  renderSetLogs(s);
  renderMemos(s.id);
  $('btn-sd-memo').innerHTML = '🎤 Record memo';
  openSheet('sheet-setdetail');
}

function renderSetLogs(s) {
  var logs = Store.data.logs.filter(function (l) { return l.setId === s.id; })
    .sort(function (a, b) { return b.date < a.date ? -1 : 1; });
  if (!logs.length) { $('sd-logs').innerHTML = '<p class="dim">No catches logged at this set yet.</p>'; return; }
  $('sd-logs').innerHTML = logs.map(function (l) {
    return '<div class="log-row"><div class="lr-top"><span class="lr-species">' + esc(l.species) +
      '</span><span class="lr-count">×' + esc(l.count) + '</span>' +
      dispBadge(l.disposition) + '</div>' +
      '<div class="dim">' + esc(fmtDate(l.date)) + (l.notes ? ' · ' + esc(l.notes) : '') + '</div></div>';
  }).join('');
}

function deleteSet(id) {
  var s = getSet(id);
  if (!s) return;
  var nLogs = Store.data.logs.filter(function (l) { return l.setId === id; }).length;
  confirmModal('Delete this set?',
    '“' + esc(s.name) + '” and its pin will be removed.' +
    (nLogs ? ' Its ' + nLogs + ' catch log' + (nLogs > 1 ? 's' : '') + ' stay in History.' : '') +
    ' This cannot be undone.',
    'Delete', function () {
      Store.data.sets = Store.data.sets.filter(function (x) { return x.id !== id; });
      Store.data.logs.forEach(function (l) { if (l.setId === id) l.setDeleted = true; });
      Store.save(); refreshMarkers(); closeSheets();
      toast('Set deleted.');
    });
}

/* ================= 8. CATCH LOGGING ================= */
var logSetId = null, logSpecies = null, logCount = 1, logDisposition = null;

function openLogSheet(setId) {
  var s = getSet(setId);
  if (!s) return;
  logSetId = setId; logSpecies = null; logCount = 1; logDisposition = null;
  $('log-setline').innerHTML = '<strong>' + esc(s.name) + '</strong>' +
    (s.trapType ? ' · ' + esc(s.trapType) : '') +
    ((s.bait || s.lure) ? ' · ' + esc([s.bait, s.lure].filter(Boolean).join(' / ')) : '');
  $('log-count').textContent = '1';
  var dispBtns = document.querySelectorAll('#log-disposition button');
  for (var d = 0; d < dispBtns.length; d++) dispBtns[d].classList.remove('selected');
  $('log-date').value = todayISO();
  $('log-notes').value = '';
  $('log-species-search').value = '';
  $('log-warnings').innerHTML = '';
  $('voice-lognotes-preview').classList.remove('show');
  $('voice-lognotes-preview').innerHTML = '';
  renderSpeciesList('');
  openSheet('sheet-log');
}

function renderSpeciesList(filter) {
  var d = stateData();
  var box = $('log-species-list');
  if (!d) { box.innerHTML = '<p class="dim">No season data loaded.</p>'; return; }
  var q = (filter || '').toLowerCase();
  var list = d.species.filter(function (sp) {
    return !q || sp.common_name.toLowerCase().indexOf(q) !== -1 ||
      (sp.scientific_name || '').toLowerCase().indexOf(q) !== -1;
  });
  if (!list.length) { box.innerHTML = '<p class="dim">No species match.</p>'; return; }
  box.innerHTML = list.map(function (sp) {
    var info = speciesSeasonInfo(sp);
    return '<button type="button" class="species-row' + (logSpecies === sp.common_name ? ' selected' : '') +
      '" data-sp="' + esc(sp.common_name) + '">' +
      '<span class="sp-name">' + esc(sp.common_name) +
      (sp.scientific_name ? '<span class="sci">' + esc(sp.scientific_name) + '</span>' : '') + '</span>' +
      '<span class="badge ' + info.badgeClass + '">' + info.badge + '</span></button>';
  }).join('');
  var btns = box.querySelectorAll('.species-row');
  for (var i = 0; i < btns.length; i++) {
    btns[i].onclick = function () {
      logSpecies = this.getAttribute('data-sp');
      renderSpeciesList($('log-species-search').value);
      renderLogWarnings();
    };
  }
}

/* Warnings inform — they never block saving. */
function renderLogWarnings() {
  var box = $('log-warnings');
  box.innerHTML = '';
  if (!logSpecies) return;
  var sp = findSpecies(logSpecies);
  if (!sp) return;
  var info = speciesSeasonInfo(sp);
  var d = stateData();
  var html = '';
  if (!info.inSeason) {
    html += '<div class="warnbox' + (sp.season_status === 'closed' ? ' red' : '') + '">' +
      '<div class="wb-title">⚠ ' + esc(sp.common_name) + ' — ' + esc(info.badge) + '.</div>' +
      'You can still log this catch. ' + esc(REMINDER_LINE) + '</div>';
  }
  var lt = limitText(info.limits);
  if (lt) {
    var sy = seasonYearOf($('log-date').value || todayISO());
    /* Bag limits count kept animals only — kept and kept-alive count, released doesn't. */
    var keptTotal = speciesSeasonTotal(logSpecies, sy);
    var add = (logDisposition === 'released') ? 0 : logCount;
    var total = keptTotal + add;
    var over = info.limits.season_bag && total >= info.limits.season_bag;
    html += '<div class="warnbox' + (over ? ' red' : '') + '">' +
      '<div class="wb-title">Bag limit reminder</div>' +
      esc(d.state_name) + ' data lists: ' + esc(lt) + '. ' +
      'Kept ' + esc(logSpecies) + ' this season (' + esc(sy) + '): <strong>' + keptTotal + '</strong>' +
      (logDisposition === 'released'
        ? '. This entry is marked released, so it does not count toward the limit.'
        : ' — with this entry you would be at <strong>' + total + '</strong>.') +
      '<div class="reminder-tag">' + esc(REMINDER_LINE) + '</div></div>';
  }
  box.innerHTML = html;
}

function saveLog() {
  if (!logSpecies) { toast('Pick a species first.'); return; }
  if (!logDisposition) { toast('Kept, kept alive, or released — pick one before saving.'); return; }
  var s = getSet(logSetId);
  var date = $('log-date').value || todayISO();
  var log = {
    id: uid('l'), setId: logSetId,
    setName: s ? s.name : '(deleted set)',
    species: logSpecies, count: logCount * 1 || 1,
    disposition: logDisposition,
    date: date, seasonYear: seasonYearOf(date),
    bait: s ? (s.bait || '') : '', lure: s ? (s.lure || '') : '',
    trapType: s ? (s.trapType || '') : '',
    county: s ? (s.county || '') : '',
    lat: s ? s.lat : null, lng: s ? s.lng : null,
    notes: $('log-notes').value.trim(),
    createdAt: Date.now()
  };
  Store.data.logs.push(log);
  Store.save();
  closeSheets();
  renderHistory(); renderTotals();
  toast('Logged ' + log.count + ' ' + logSpecies + ' (' + dispLabel(logDisposition) + ')' + (s ? ' at ' + s.name : '') + '.');
}

/* ================= 9. VOICE ================= */
/* --- transcribe-first speech recognition --- */
var Voice = {
  rec: null, listening: false,
  supported: function () {
    return ('SpeechRecognition' in window) || ('webkitSpeechRecognition' in window);
  },
  start: function (previewEl, onUse) {
    var self = this;
    if (!this.supported()) { toast('Voice entry is not supported in this browser.'); return; }
    if (this.listening) { this.stop(); return; }
    var Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    var rec = new Ctor();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = true;
    var finalText = '';
    previewEl.classList.add('show');
    previewEl.innerHTML = '<div><span class="rec-indicator"></span><strong>Listening… tap again to stop.</strong></div><div class="vp-text dim" style="margin-top:8px"></div>';
    var textEl = previewEl.querySelector('.vp-text');
    rec.onresult = function (e) {
      var interim = '';
      for (var i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript + ' ';
        else interim += e.results[i][0].transcript;
      }
      textEl.textContent = (finalText + interim).trim() || '…';
    };
    rec.onerror = function () {
      self.listening = false;
      previewEl.innerHTML = '<div class="dim">Voice entry needs a connection and microphone permission. Type instead — nothing was lost.</div>';
    };
    rec.onend = function () {
      self.listening = false;
      var t = finalText.trim();
      if (t) {
        previewEl.innerHTML = '<div><strong>Heard:</strong></div><div style="margin:8px 0">“' + esc(t) + '”</div>' +
          '<div class="btn-row"><button class="btn-small btn-secondary" id="vp-use" type="button">Use this text</button>' +
          '<button class="btn-small btn-ghost" id="vp-drop" type="button">Discard</button></div>';
        $('vp-use').onclick = function () { onUse(t); previewEl.classList.remove('show'); previewEl.innerHTML = ''; };
        $('vp-drop').onclick = function () { previewEl.classList.remove('show'); previewEl.innerHTML = ''; };
      } else if (self.listening === false && !previewEl.querySelector('#vp-use')) {
        previewEl.innerHTML = '<div class="dim">Did not catch anything. Try again or type instead.</div>';
      }
    };
    try {
      rec.start();
      this.rec = rec; this.listening = true;
    } catch (e) {
      previewEl.innerHTML = '<div class="dim">Could not start voice entry.</div>';
    }
  },
  stop: function () {
    this.listening = false;
    try { if (this.rec) this.rec.stop(); } catch (e) { /* noop */ }
  }
};

/* --- voice memos via MediaRecorder, stored as blobs in IndexedDB --- */
var Memo = {
  recorder: null, chunks: [], recording: false, targetSetId: null,
  pickMime: function () {
    if (!('MediaRecorder' in window)) return '';
    var cands = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'];
    for (var i = 0; i < cands.length; i++) {
      try { if (MediaRecorder.isTypeSupported(cands[i])) return cands[i]; } catch (e) { /* noop */ }
    }
    return '';
  },
  supported: function () { return 'MediaRecorder' in window && !!navigator.mediaDevices; },
  toggle: function (setId, btn) {
    var self = this;
    if (this.recording) { this.stop(btn); return; }
    if (!this.supported()) { toast('Voice memos are not supported in this browser.'); return; }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      self.chunks = [];
      var mime = self.pickMime();
      var rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      self._mime = rec.mimeType || mime || '';
      rec.ondataavailable = function (e) { if (e.data && e.data.size) self.chunks.push(e.data); };
      rec.onstop = function () {
        stream.getTracks().forEach(function (t) { t.stop(); });
        var blob = new Blob(self.chunks, { type: self._mime || 'audio/mp4' });
        if (!blob.size) { toast('Empty recording — nothing saved.'); return; }
        IDB.put('memos', {
          id: uid('m'), setId: self.targetSetId, mime: blob.type,
          blob: blob, createdAt: Date.now()
        }).then(function () {
          renderMemos(self.targetSetId);
          toast('Voice memo saved.');
        }).catch(function () { toast('Could not save the memo.'); });
      };
      rec.start();
      self.recorder = rec; self.recording = true; self.targetSetId = setId;
      btn.innerHTML = '<span class="rec-indicator"></span>Stop recording';
    }).catch(function () {
      toast('Microphone permission was denied.');
    });
  },
  stop: function (btn) {
    this.recording = false;
    try { if (this.recorder) this.recorder.stop(); } catch (e) { /* noop */ }
    if (btn) btn.textContent = '🎤 Record memo';
  }
};

var memoURLs = {};
function renderMemos(setId) {
  var box = $('sd-memos');
  IDB.all('memos').then(function (all) {
    var memos = all.filter(function (m) { return m.setId === setId; })
      .sort(function (a, b) { return a.createdAt - b.createdAt; });
    if (!memos.length) { box.innerHTML = '<p class="dim">No memos yet.</p>'; return; }
    box.innerHTML = '';
    memos.forEach(function (m) {
      var row = document.createElement('div');
      row.className = 'memo-row';
      var audio = document.createElement('audio');
      audio.controls = true;
      audio.preload = 'metadata';
      if (!memoURLs[m.id]) memoURLs[m.id] = URL.createObjectURL(m.blob);
      audio.src = memoURLs[m.id];
      var when = document.createElement('span');
      when.className = 'dim';
      when.textContent = new Date(m.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      var del = document.createElement('button');
      del.className = 'btn-small btn-danger';
      del.type = 'button';
      del.textContent = 'Delete';
      del.onclick = function () {
        confirmModal('Delete this memo?', 'The recording will be removed from this phone.', 'Delete', function () {
          IDB.del('memos', m.id).then(function () {
            if (memoURLs[m.id]) { URL.revokeObjectURL(memoURLs[m.id]); delete memoURLs[m.id]; }
            renderMemos(setId);
          });
        });
      };
      row.appendChild(audio); row.appendChild(when); row.appendChild(del);
      box.appendChild(row);
    });
  });
}

/* ================= 10. HISTORY / TOTALS / SEASONS ================= */
function renderHistory() {
  var box = $('history-list');
  var logs = Store.data.logs.slice().sort(function (a, b) {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return b.createdAt - a.createdAt;
  });
  if (!logs.length) {
    box.innerHTML = '<div class="empty"><div class="big">📒</div>No catches logged yet.<br>Tap a set pin on the map to log your first catch.</div>';
    return;
  }
  var html = '', lastSY = null;
  logs.forEach(function (l) {
    var sy = l.seasonYear || seasonYearOf(l.date);
    if (sy !== lastSY) { html += '<div class="season-group-head">Season ' + esc(sy) + '</div>'; lastSY = sy; }
    html += '<div class="log-row"><div class="lr-top"><span class="lr-species">' + esc(l.species) +
      '</span><span class="lr-count">×' + esc(l.count) + '</span>' +
      dispBadge(l.disposition) + '</div>' +
      '<div class="dim">' + esc(fmtDate(l.date)) + ' · ' + esc(l.setName || '') +
      ((l.bait || l.lure) ? ' · ' + esc([l.bait, l.lure].filter(Boolean).join(' / ')) : '') +
      (l.notes ? '<br>' + esc(l.notes) : '') + '</div></div>';
  });
  box.innerHTML = html;
}

function renderTotals() {
  var box = $('totals-body');
  var logs = Store.data.logs;
  if (!logs.length) {
    box.innerHTML = '<div class="empty"><div class="big">📊</div>Nothing to total yet.</div>';
    return;
  }
  var years = {};
  logs.forEach(function (l) { years[l.seasonYear || seasonYearOf(l.date)] = true; });
  var yearList = Object.keys(years).sort().reverse();
  var sy = yearList[0];
  $('totals-sub').textContent = 'Season ' + sy + ' · ' + logs.length + ' log entries all-time.';
  var bySpecies = {}, bySite = {};
  logs.forEach(function (l) {
    var y = l.seasonYear || seasonYearOf(l.date);
    if (y !== sy) return;
    var c = l.count * 1 || 0, d = l.disposition || 'kept';
    bySpecies[l.species] = bySpecies[l.species] || { kept: 0, alive: 0, released: 0 };
    bySite[l.setName || '(deleted set)'] = bySite[l.setName || '(deleted set)'] || { kept: 0, alive: 0, released: 0 };
    var bucket = (d === 'released') ? 'released' : (d === 'kept-alive' ? 'alive' : 'kept');
    bySpecies[l.species][bucket] += c; bySite[l.setName || '(deleted set)'][bucket] += c;
  });
  function rows(obj) {
    function tot(o) { return o.kept + o.alive + o.released; }
    return Object.keys(obj).sort(function (a, b) { return tot(obj[b]) - tot(obj[a]); }).map(function (k) {
      return '<div class="rowline"><span>' + esc(k) +
        (obj[k].alive ? '<span class="dim"> · ' + obj[k].alive + ' kept alive</span>' : '') +
        (obj[k].released ? '<span class="dim"> · ' + obj[k].released + ' released</span>' : '') +
        '</span><span class="big-num">' + obj[k].kept + '</span></div>';
    }).join('');
  }
  box.innerHTML =
    '<div class="card"><h3>By species</h3>' + rows(bySpecies) + '</div>' +
    '<div class="card"><h3>By site</h3>' + rows(bySite) + '</div>';
}

function renderSeasons(filter) {
  var d = stateData();
  var entry = stateEntry(Store.data.state);
  if (!d) {
    $('seasons-list').innerHTML = '<p class="dim">No season data loaded.</p>';
    return;
  }
  $('seasons-title').textContent = 'Season reminders — ' + d.state_name;
  $('seasons-sub').textContent = d.season_year + ' season year' + (entry && entry.provisional ? ' · data provisional' : '');
  $('seasons-disclaimer').innerHTML = '<div class="wb-title">⚠ ' + esc(REMINDER_LINE) + '</div>' + esc(d.disclaimer || '');
  var q = (filter || '').toLowerCase();
  var list = d.species.filter(function (sp) {
    return !q || sp.common_name.toLowerCase().indexOf(q) !== -1;
  });
  $('seasons-list').innerHTML = list.map(function (sp) {
    var info = speciesSeasonInfo(sp);
    return '<button type="button" class="species-row" data-sp="' + esc(sp.common_name) + '">' +
      '<span class="sp-name">' + esc(sp.common_name) +
      (sp.scientific_name ? '<span class="sci">' + esc(sp.scientific_name) + '</span>' : '') + '</span>' +
      '<span class="badge ' + info.badgeClass + '">' + info.badge + '</span></button>';
  }).join('');
  var btns = $('seasons-list').querySelectorAll('.species-row');
  for (var i = 0; i < btns.length; i++) {
    btns[i].onclick = function () { showSpeciesDetail(this.getAttribute('data-sp')); };
  }
}

function showSpeciesDetail(name) {
  var sp = findSpecies(name);
  if (!sp) return;
  var info = speciesSeasonInfo(sp);
  var d = stateData();
  var html = '<h3>' + esc(sp.common_name) + '</h3>';
  if (sp.scientific_name) html += '<p class="dim" style="font-style:italic;margin-top:-8px">' + esc(sp.scientific_name) + '</p>';
  html += '<p><span class="badge ' + info.badgeClass + '">' + info.badge + '</span></p>';
  (sp.seasons || []).forEach(function (s) {
    html += '<div class="card" style="margin:10px 0"><div class="dim">';
    if (s.continuous_open) html += 'Open continuously.';
    else if (s.open_date && s.close_date) html += esc(fmtDate(s.open_date)) + ' → ' + esc(fmtDate(s.close_date));
    else html += 'Dates not listed.';
    html += '</div>';
    var lt = limitText(s.bag_limits);
    if (lt) html += '<div style="margin-top:6px"><strong>Limits:</strong> ' + esc(lt) + '</div>';
    if (s.notes) html += '<div class="dim" style="margin-top:6px">' + esc(s.notes) + '</div>';
    html += '</div>';
  });
  if ((sp.permit_requirements || []).length) {
    html += '<p><strong>Permits:</strong> ' + esc(sp.permit_requirements.join('; ')) + '</p>';
  }
  if (sp.notes) html += '<p class="dim">' + esc(sp.notes) + '</p>';
  html += '<p class="reminder-tag">' + esc(REMINDER_LINE) + ' ' + esc(d.disclaimer || '') + '</p>';
  html += '<button class="btn-secondary" id="m-close" type="button" style="width:100%;margin-top:10px">Close</button>';
  showModal(html);
  $('m-close').onclick = closeModal;
}

/* ================= 11. LICENSES ================= */
var licURLs = {};
function renderLicenses() {
  var grid = $('license-grid');
  IDB.all('photos').then(function (all) {
    all.sort(function (a, b) { return b.createdAt - a.createdAt; });
    grid.innerHTML = '';
    if (!all.length) {
      grid.innerHTML = '<p class="dim" style="grid-column:1/-1">No license photos yet. They stay on this phone only.</p>';
      return;
    }
    all.forEach(function (p) {
      var item = document.createElement('div');
      item.className = 'lic-item';
      var img = document.createElement('img');
      if (!licURLs[p.id]) licURLs[p.id] = URL.createObjectURL(p.blob);
      img.src = licURLs[p.id];
      img.alt = 'License photo';
      img.onclick = function () {
        showModal('<img src="' + licURLs[p.id] + '" style="width:100%;border-radius:8px" alt="License photo">' +
          '<button class="btn-secondary" id="m-close" type="button" style="width:100%;margin-top:10px">Close</button>');
        $('m-close').onclick = closeModal;
      };
      var del = document.createElement('button');
      del.type = 'button'; del.textContent = '×'; del.setAttribute('aria-label', 'Delete photo');
      del.onclick = function (e) {
        e.stopPropagation();
        confirmModal('Delete this photo?', 'It will be removed from this phone.', 'Delete', function () {
          IDB.del('photos', p.id).then(function () {
            if (licURLs[p.id]) { URL.revokeObjectURL(licURLs[p.id]); delete licURLs[p.id]; }
            renderLicenses();
          });
        });
      };
      item.appendChild(img); item.appendChild(del);
      grid.appendChild(item);
    });
  });
}

/* ================= 12. CSV EXPORT / ERASE ================= */
function exportCatches() {
  if (!Store.data.logs.length) { toast('No catches to export yet.'); return; }
  var rows = [['Date', 'Season', 'Set', 'Species', 'Count', 'Disposition', 'Trap type', 'Bait', 'Lure', 'County', 'Latitude', 'Longitude', 'Notes']];
  Store.data.logs.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }).forEach(function (l) {
    rows.push([l.date, l.seasonYear || seasonYearOf(l.date), l.setName, l.species, l.count,
      dispLabel(l.disposition), l.trapType, l.bait, l.lure, l.county, l.lat, l.lng, l.notes]);
  });
  downloadCSV('opossum-foot-catches-' + todayISO() + '.csv', rows);
  toast('Catches CSV downloaded.');
}
function exportSets() {
  if (!Store.data.sets.length) { toast('No sets to export yet.'); return; }
  var rows = [['Name', 'Latitude', 'Longitude', 'County', 'Trap type', 'Bait', 'Lure', 'Status', 'Date set', 'Notes']];
  Store.data.sets.forEach(function (s) {
    rows.push([s.name, s.lat, s.lng, s.county, s.trapType, s.bait, s.lure, s.status, s.dateSet, s.notes]);
  });
  downloadCSV('opossum-foot-sets-' + todayISO() + '.csv', rows);
  toast('Sets CSV downloaded.');
}
function eraseAll() {
  confirmModal('Erase everything?',
    'All sets, catches, license photos, and voice memos on <strong>this phone</strong> will be permanently deleted. Export a CSV first if you want a backup.',
    'Erase everything', function () {
      confirmModal('Last chance.',
        'There is no undo and no cloud copy. Really erase all Opossum Foot data on this phone?',
        'Yes, erase it', function () {
          try { localStorage.removeItem(LS_KEY); } catch (e) { /* noop */ }
          IDB.clear('photos').then(function () { return IDB.clear('memos'); }).then(function () {
            location.reload();
          });
        });
    });
}

/* ================= 13. TABS / NAV ================= */
function switchTab(name) {
  var tabs = document.querySelectorAll('#tabbar button');
  for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle('active', tabs[i].getAttribute('data-tab') === name);
  var panes = document.querySelectorAll('.pane');
  for (var j = 0; j < panes.length; j++) panes[j].classList.remove('active');
  $('pane-' + name).classList.add('active');
  if (name === 'map') initMap();
  if (name === 'history') renderHistory();
  if (name === 'totals') renderTotals();
  if (name === 'seasons') renderSeasons($('seasons-search').value);
  if (name === 'licenses') renderLicenses();
}

/* ================= 14. ONBOARDING ================= */
function buildStateSelect(sel, current) {
  sel.innerHTML = '<option value="">— Choose a state —</option>' + STATES.map(function (s) {
    return '<option value="' + s.code + '"' + (s.code === current ? ' selected' : '') + '>' + esc(s.name) + '</option>';
  }).join('');
}

function showView(id) {
  var views = document.querySelectorAll('.view');
  for (var i = 0; i < views.length; i++) views[i].classList.remove('active');
  $(id).classList.add('active');
}

function enterMain() {
  showView('view-main');
  switchTab('map');
  renderHistory(); renderTotals(); renderSeasons(''); renderLicenses();
  buildStateSelect($('settings-state'), Store.data.state);
}

function gpsPreselect() {
  var btn = $('btn-gps-state'), out = $('gps-state-result');
  if (!('geolocation' in navigator)) { out.textContent = 'This device has no GPS — pick your state below.'; return; }
  btn.disabled = true;
  out.textContent = 'Getting your location…';
  navigator.geolocation.getCurrentPosition(function (pos) {
    btn.disabled = false;
    reverseGeocode(pos.coords.latitude, pos.coords.longitude).then(function (info) {
      var match = null;
      if (info.stateCode) {
        for (var i = 0; i < STATES.length; i++) if (STATES[i].code === info.stateCode) match = STATES[i];
      }
      if (match) {
        $('onboard-state').value = match.code;
        out.textContent = 'Looks like you\u2019re in ' + match.name + ' — confirm below.';
      } else {
        out.textContent = 'Could not tell the state from your location — pick it below.';
      }
    });
  }, function () {
    btn.disabled = false;
    out.textContent = 'Location unavailable — pick your state below.';
  }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
}

/* ================= 15. WIRING ================= */
function wireUp() {
  /* splash -> next */
  $('btn-gps-state').onclick = gpsPreselect;
  $('btn-start').onclick = function () {
    var code = $('onboard-state').value;
    if (!code) { toast('Pick your trapping state first.'); return; }
    Store.data.state = code;
    Store.data.onboarded = true;
    Store.save();
    enterMain();
  };

  /* tabs */
  var tabs = document.querySelectorAll('#tabbar button');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].onclick = (function (t) { return function () { switchTab(t.getAttribute('data-tab')); }; })(tabs[i]);
  }

  /* map buttons */
  $('btn-locate').onclick = locateMe;
  var bs = $('build-stamp'); if (bs) bs.textContent = APP_VERSION;
  $('btn-drop-pin').onclick = function () { setDropPinMode(!dropPinMode); };
  $('btn-add-gps').onclick = function () {
    if (!lastFix) {
      toast('No GPS fix yet — tap ◎ first, or drop a pin.');
      return;
    }
    openSetForm({ lat: lastFix.lat, lng: lastFix.lng });
  };
  $('btn-switch-state').onclick = function () {
    switchTab('settings');
    toast('Change your trapping state below.');
  };

  /* set form */
  $('btn-save-set').onclick = saveSetForm;
  $('btn-voice-setnotes').onclick = function () {
    var ta = $('sf-notes');
    Voice.start($('voice-setnotes-preview'), function (t) {
      ta.value = (ta.value ? ta.value.replace(/\s+$/, '') + ' ' : '') + t;
    });
  };

  /* set detail */
  $('btn-sd-log').onclick = function () { openLogSheet(detailSetId); };
  $('btn-sd-edit').onclick = function () { openSetForm(null, detailSetId); };
  $('btn-sd-delete').onclick = function () { deleteSet(detailSetId); };
  $('btn-sd-memo').onclick = function () { Memo.toggle(detailSetId, $('btn-sd-memo')); };

  /* log sheet */
  $('log-species-search').oninput = function () { renderSpeciesList(this.value); };
  var dispBtns = document.querySelectorAll('#log-disposition button');
  for (var db = 0; db < dispBtns.length; db++) {
    dispBtns[db].onclick = (function (b) {
      return function () {
        logDisposition = b.getAttribute('data-disp');
        for (var k = 0; k < dispBtns.length; k++) dispBtns[k].classList.toggle('selected', dispBtns[k] === b);
        renderLogWarnings();
      };
    })(dispBtns[db]);
  }
  $('log-count-minus').onclick = function () { if (logCount > 1) { logCount--; $('log-count').textContent = logCount; renderLogWarnings(); } };
  $('log-count-plus').onclick = function () { if (logCount < 99) { logCount++; $('log-count').textContent = logCount; renderLogWarnings(); } };
  $('log-date').onchange = renderLogWarnings;
  $('btn-save-log').onclick = saveLog;
  $('btn-voice-lognotes').onclick = function () {
    var ta = $('log-notes');
    Voice.start($('voice-lognotes-preview'), function (t) {
      ta.value = (ta.value ? ta.value.replace(/\s+$/, '') + ' ' : '') + t;
    });
  };

  /* seasons search */
  $('seasons-search').oninput = function () { renderSeasons(this.value); };

  /* licenses */
  $('btn-add-license').onclick = function () { $('license-input').click(); };
  $('license-input').onchange = function () {
    var files = this.files;
    if (!files || !files.length) return;
    var done = 0;
    for (var i = 0; i < files.length; i++) {
      (function (f) {
        IDB.put('photos', { id: uid('p'), name: f.name, blob: f, createdAt: Date.now() })
          .then(function () { done++; if (done === files.length) { renderLicenses(); toast('License photo saved on this phone.'); } })
          .catch(function () { toast('Could not save that photo.'); });
      })(files[i]);
    }
    this.value = '';
  };

  /* settings */
  $('btn-change-state').onclick = function () {
    var code = $('settings-state').value;
    if (!code || code === Store.data.state) return;
    Store.data.state = code;
    Store.save();
    renderSeasons('');
    var e = stateEntry(code);
    toast('Trapping state is now ' + (e ? e.name : code) + '.');
  };
  $('btn-export-catches').onclick = exportCatches;
  $('btn-export-sets').onclick = exportSets;
  $('btn-erase').onclick = eraseAll;

  /* sheets + modal */
  $('scrim').onclick = function () { Voice.stop(); closeSheets(); };
  var xs = document.querySelectorAll('.sheet-x');
  for (var k = 0; k < xs.length; k++) xs[k].onclick = function () { Voice.stop(); closeSheets(); };
  $('modal').onclick = function (e) { if (e.target === $('modal')) closeModal(); };

  /* offline banner + county backfill when service returns */
  function net() { $('offline-banner').classList.toggle('show', !navigator.onLine); }
  window.addEventListener('online', function () { net(); backfillCounties(); });
  window.addEventListener('offline', net);
  net();
  backfillCounties();
}

/* ================= 16. BOOT ================= */
function boot() {
  Store.load();
  buildStateSelect($('onboard-state'), Store.data.state);
  wireUp();
  IDB.open().then(function () {
    $('splash-status').textContent = 'Ready.';
    setTimeout(function () {
      if (Store.data.onboarded && Store.data.state && stateData()) enterMain();
      else showView('view-onboard');
    }, 700);
  });
  /* service worker: http(s) only — skipped on file:// */
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* offline still works without it */ });
    });
  }
}

document.addEventListener('DOMContentLoaded', boot);
