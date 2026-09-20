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
var APP_VERSION = 'beta 0.1 · build 2026-09-20v';

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
    if (typeof this.data.weatherOn !== 'boolean') this.data.weatherOn = false;
    if (typeof this.data.voiceOn !== 'boolean') this.data.voiceOn = true;
    if (typeof this.data.licensesOn !== 'boolean') this.data.licensesOn = true;
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

/* Species silhouette icons (assets/species/<slug>.png). Keyed by common_name
 * so any state sharing the name gets the icon; unknown names render no icon. */
var SPECIES_ICONS = {
  'American badger': 'badger',
  'Virginia opossum': 'opossum',
  'Striped skunk': 'striped-skunk',
  'Red fox': 'red-fox',
  'Gray fox': 'gray-fox',
  'American mink': 'mink',
  'Muskrat': 'muskrat',
  'Weasel': 'weasel',
  'Groundhog (woodchuck)': 'groundhog',
  'Raccoon': 'raccoon',
  'American beaver': 'beaver',
  'Coyote': 'coyote',
  'Gray (timber) wolf': 'wolf',
  'Spotted skunk (civet cat)': 'spotted-skunk',
  'North American river otter': 'otter',
  'Bobcat': 'bobcat'
};
function speciesIcon(name, cls) {
  var slug = SPECIES_ICONS[name];
  if (!slug) return '';
  return '<img class="' + (cls || 'sp-icon') + '" src="assets/species/' + slug + '.png" alt="" onerror="this.style.display=\'none\'">';
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
    $('cb-state').textContent = 'Tap the crosshair to locate';
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

/* ---- weather (Open-Meteo, keyless, US units) ---- */
function weatherCodeText(c) {
  c = c * 1;
  if (c === 0) return 'Clear';
  if (c <= 3) return 'Partly cloudy';
  if (c <= 48) return 'Fog';
  if (c <= 57) return 'Drizzle';
  if (c <= 67) return 'Rain';
  if (c <= 77) return 'Snow';
  if (c <= 82) return 'Showers';
  if (c <= 86) return 'Snow showers';
  return 'Thunderstorm';
}
function windCompass(deg) {
  var dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}
function weatherText(w) {
  if (!w) return '—';
  var t = Math.round(w.temp) + '°F · ' + windCompass(w.windDir) + ' ' + Math.round(w.windSpeed) + ' mph';
  if (w.precip > 0) t += ' · ' + w.precip.toFixed(2) + ' in precip';
  return weatherCodeText(w.code) + ' · ' + t;
}
function fetchWeather(lat, lng, cb) {
  if (!Store.data.weatherOn || lat == null || lng == null) { cb(null); return; }
  var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat.toFixed(4) + '&longitude=' + lng.toFixed(4) +
    '&current=temperature_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m' +
    '&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto';
  var done = false;
  function finish(w) { if (!done) { done = true; cb(w); } }
  try {
    fetch(url).then(function (r) { return r.json(); }).then(function (j) {
      var c = j && j.current;
      if (!c) { finish(null); return; }
      finish({ temp: c.temperature_2m, precip: c.precipitation, code: c.weather_code,
        windSpeed: c.wind_speed_10m, windDir: c.wind_direction_10m, at: c.time });
    }).catch(function () { finish(null); });
  } catch (e) { finish(null); }
  setTimeout(function () { finish(null); }, 8000); /* never hang a save on weather */
}

/* ---- feature toggles ---- */
function applyFeatureToggles() {
  var vOn = Store.data.voiceOn !== false;
  ['btn-voice-setnotes', 'voice-setnotes-preview', 'btn-voice-lognotes', 'voice-lognotes-preview',
   'btn-sd-memo', 'sd-memos-head', 'sd-memos'].forEach(function (id) {
    var el = $(id);
    if (el) el.style.display = vOn ? '' : 'none';
  });
  var lOn = Store.data.licensesOn !== false;
  var tab = document.querySelector('#tabbar button[data-tab="licenses"]');
  if (tab) tab.style.display = lOn ? '' : 'none';
  if (!lOn && $('pane-licenses') && $('pane-licenses').classList.contains('active')) switchTab('map');
}

/* ================= 6. MAP ================= */
var map = null, markersLayer = null, gpsMarker = null, gpsCircle = null, dropPinMode = false;
var lastFix = null;

/* State bounding boxes [south, west, north, east] — map opens on the picked trapping state. */
var STATE_BOUNDS = {
  AL: [30.2, -88.5, 35.0, -84.9], AK: [51.2, -179.9, 71.4, -129.9], AZ: [31.3, -114.8, 37.0, -109.0],
  AR: [33.0, -94.6, 36.5, -89.6], CA: [32.5, -124.4, 42.0, -114.1], CO: [37.0, -109.1, 41.0, -102.0],
  CT: [40.98, -73.73, 42.05, -71.79], DE: [38.45, -75.79, 39.84, -75.05], FL: [24.5, -87.6, 31.0, -80.0],
  GA: [30.36, -85.6, 35.0, -80.84], HI: [18.9, -160.3, 22.3, -154.8], ID: [42.0, -117.24, 49.0, -111.04],
  IL: [36.97, -91.51, 42.51, -87.5], IN: [37.77, -88.1, 41.76, -84.78], IA: [40.38, -96.64, 43.5, -90.14],
  KS: [37.0, -102.05, 40.0, -94.62], KY: [36.5, -89.57, 38.77, -81.97], LA: [28.93, -94.04, 33.02, -88.82],
  ME: [42.97, -71.08, 47.46, -66.95], MD: [37.92, -79.49, 39.72, -75.05], MA: [41.19, -73.44, 42.89, -69.93],
  MI: [41.7, -90.42, 48.3, -82.12], MN: [43.5, -97.24, 49.35, -89.5], MS: [30.19, -91.65, 35.0, -88.1],
  MO: [35.99, -95.77, 40.61, -89.1], MT: [44.36, -116.05, 49.0, -104.04], NE: [40.0, -104.05, 43.0, -95.31],
  NV: [35.0, -120.0, 42.0, -114.04], NH: [42.7, -72.56, 45.31, -70.71], NJ: [38.93, -75.56, 41.36, -73.9],
  NM: [31.78, -109.05, 37.0, -103.0], NY: [40.5, -79.77, 45.02, -71.85], NC: [33.84, -84.32, 36.59, -75.46],
  ND: [45.94, -104.05, 49.0, -96.55], OH: [38.4, -84.82, 41.98, -80.52], OK: [33.62, -103.0, 37.0, -94.43],
  OR: [42.0, -124.57, 46.29, -116.46], PA: [39.72, -80.52, 42.27, -74.69], RI: [41.15, -71.86, 42.02, -71.12],
  SC: [32.04, -83.35, 35.22, -78.54], SD: [42.48, -104.06, 45.94, -96.45], TN: [34.98, -90.31, 36.68, -81.65],
  TX: [25.84, -106.43, 36.5, -93.51], UT: [37.0, -114.05, 41.0, -109.04], VT: [42.73, -73.44, 45.02, -71.46],
  VA: [36.54, -83.68, 39.46, -75.24], WA: [45.54, -124.74, 49.0, -116.92], WV: [37.2, -82.64, 40.64, -77.72],
  WI: [42.5, -92.89, 47.08, -86.8], WY: [41.0, -111.06, 45.0, -104.05]
};

function fitMapToState() {
  if (!map || typeof L === 'undefined') return;
  var b = STATE_BOUNDS[Store.data.state];
  if (b) map.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: [16, 16] });
}

function initMap() {
  if (map) { setTimeout(function () { map.invalidateSize(); }, 100); return; }
  if (typeof L === 'undefined') {
    $('map').innerHTML = '<div class="empty"><div class="big">🗺</div>The map library could not load.<br>Check your connection and reopen.</div>';
    return;
  }
  map = L.map('map', { zoomControl: true, attributionControl: true, maxZoom: 22 }).setView([39.5, -98.35], 4);
  var street = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 22, maxNativeZoom: 19, attribution: '© Esri, HERE, Garmin, © OpenStreetMap contributors' });
  var satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 22, maxNativeZoom: 19, attribution: 'Imagery © Esri' });
  var topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    { maxZoom: 22, maxNativeZoom: 17, attribution: '© OpenTopoMap © OpenStreetMap contributors' });
  /* Esri reference overlays: roads + place labels, drawn over imagery/topo */
  var esriRef = function (svc) {
    return L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/' + svc + '/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 22, maxNativeZoom: 19, attribution: '© Esri' });
  };
  var roads = esriRef('Reference/World_Transportation');
  var labels = esriRef('Reference/World_Boundaries_and_Places');
  var streetL = L.layerGroup([street]);
  var satL = L.layerGroup([satellite, labels, roads]);
  var topoL = L.layerGroup([topo, roads]);
  satL.addTo(map);
  L.control.layers({ 'Street': streetL, 'Satellite': satL, 'Topo': topoL }, null, { position: 'topright' }).addTo(map);
  markersLayer = L.layerGroup().addTo(map);

  map.on('click', function (e) {
    if (dropPinMode) {
      startPlacePin(e.latlng);
    }
  });
  refreshMarkers();
  fitMapToState();
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
  if (on) cancelPlacePin();
  $('pin-hint').classList.toggle('show', on);
  $('btn-drop-pin').classList.toggle('active-mode', on);
}

/* Draggable placement pin: GPS gets you close, your finger dials it in. */
var placeMarker = null;
function placeIcon() {
  return L.divIcon({
    className: '',
    html: '<div class="pin pin-place"></div>',
    iconSize: [36, 36], iconAnchor: [18, 18]
  });
}
function startPlacePin(latlng) {
  if (!map) return;
  setDropPinMode(false);
  cancelPlacePin();
  placeMarker = L.marker(latlng, { draggable: true, icon: placeIcon() }).addTo(map);
  map.panTo(latlng);
  $('place-bar').classList.add('show');
}
function cancelPlacePin() {
  if (placeMarker && map) { try { map.removeLayer(placeMarker); } catch (e) {} placeMarker = null; }
  var bar = $('place-bar'); if (bar) bar.classList.remove('show');
}

var locateWatch = null, locateTimer = null, locateLastToast = 0;
var locateState = 'idle'; /* idle | acquiring | following */
var followLastPan = 0;

function stopLocateWatch() {
  if (locateWatch !== null) { try { navigator.geolocation.clearWatch(locateWatch); } catch (e) {} locateWatch = null; }
  if (locateTimer) { clearTimeout(locateTimer); locateTimer = null; }
}

/* Dragging the map breaks follow mode — the user has taken the wheel. */
function hookFollowDrag() {
  if (map && !map._followDragHooked) {
    map._followDragHooked = true;
    map.on('dragstart', function () { if (locateState === 'following') stopFollow(true); });
  }
}

function stopFollow(silent) {
  stopLocateWatch();
  locateState = 'idle';
  var b = $('btn-locate'); if (b) b.classList.remove('active-mode');
  if (lastFix) lastFix.at = 0; /* next tap takes a fresh fix, not follow */
  if (!silent) toast('Follow off.');
}

/* Draw the GPS dot/circle for a fix. On the final fix, also zoom + county. */
function drawFix(fix, final) {
  lastFix = { lat: fix.lat, lng: fix.lng, acc: fix.acc, at: Date.now() };
  if (map) {
    if (gpsMarker) gpsMarker.setLatLng([fix.lat, fix.lng]);
    else gpsMarker = L.marker([fix.lat, fix.lng],
      { icon: L.divIcon({ className: '', html: '<div class="gps-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }), interactive: false }).addTo(map);
    if (gpsCircle) gpsCircle.setLatLng([fix.lat, fix.lng]).setRadius(Math.max(fix.acc, 1));
    else gpsCircle = L.circle([fix.lat, fix.lng],
      { radius: Math.max(fix.acc, 1), color: '#2f8ff0', weight: 1, opacity: 0.6, fillColor: '#2f8ff0', fillOpacity: 0.15, interactive: false }).addTo(map);
    if (final) {
      /* tighter zoom on a good fix, wider view when the fix is coarse */
      var zl = fix.acc <= 10 ? 20 : fix.acc <= 25 ? 19 : fix.acc <= 60 ? 18 : fix.acc <= 150 ? 17 : 16;
      map.flyTo([fix.lat, fix.lng], zl, { duration: 1 });
    }
  }
  if (final) {
    toast((fix.acc > 50
      ? 'Coarse fix (±' + fix.acc + ' m) — step into the open, or check Precise Location for Safari.'
      : 'Located (±' + fix.acc + ' m).') + ' Tap the crosshair again to follow.');
    reverseGeocode(fix.lat, fix.lng).then(function (info) {
      setCountyBanner(info);
      checkStateMismatch(info);
      if (!info.county) toast('Located — county lookup failed. You are responsible for knowing your county.');
    });
  }
}

/* One fresh fix from the follow-mode watch: move the dot, glide the map. */
function onFollowFix(pos) {
  var c = pos.coords || {};
  if (typeof c.latitude !== 'number' || typeof c.longitude !== 'number') return;
  var ageMs = Date.now() - (pos.timestamp || 0);
  if (ageMs > 30000 || ageMs < 0) return; /* stale cached fix — ignore it */
  var acc = (typeof c.accuracy === 'number' && isFinite(c.accuracy)) ? Math.round(c.accuracy) : 9999;
  drawFix({ lat: c.latitude, lng: c.longitude, acc: acc }, false);
  var now = Date.now();
  if (map && now - followLastPan > 1500) { followLastPan = now; map.panTo([c.latitude, c.longitude], { animate: true }); }
}

/* Field-grade locate: watch the GPS for up to 20 seconds, throw away stale
   cached fixes (a phone will happily hand back the last fix from somewhere
   you used to be), and settle on the most accurate fresh fix. */
function startAcquire() {
  locateState = 'acquiring';
  var best = null, finished = false;
  toast('Acquiring GPS… hold still a moment.');
  locateLastToast = Date.now();
  hookFollowDrag();

  function consider(pos) {
    var c = pos.coords || {};
    if (typeof c.latitude !== 'number' || typeof c.longitude !== 'number') return;
    var ageMs = Date.now() - (pos.timestamp || 0);
    if (ageMs > 30000 || ageMs < 0) return; /* stale cached fix — ignore it */
    var acc = (typeof c.accuracy === 'number' && isFinite(c.accuracy)) ? Math.round(c.accuracy) : 9999;
    if (!best || acc < best.acc) {
      best = { lat: c.latitude, lng: c.longitude, acc: acc };
      drawFix(best, false);
      var now = Date.now();
      if (now - locateLastToast > 2000) {
        locateLastToast = now;
        toast('Acquiring GPS… ±' + acc + ' m' + (acc > 50 ? ' — still settling' : ''));
      }
    }
  }

  function finish() {
    if (finished) return;
    finished = true;
    stopLocateWatch();
    locateState = 'idle';
    if (!best) { toast('No fresh GPS fix — move into open sky and try again.'); return; }
    drawFix(best, true);
  }

  locateTimer = setTimeout(finish, 20000);
  try {
    locateWatch = navigator.geolocation.watchPosition(function (pos) {
      consider(pos);
      if (best && best.acc <= 8) finish(); /* good enough — stop early */
    }, function () {
      if (!best && !finished) {
        finished = true; stopLocateWatch(); locateState = 'idle';
        toast('Could not get a GPS fix. Check location permission.');
      }
    }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
  } catch (e) { finish(); }
}

/* ◎ button: tap to locate, tap again to follow, tap again to stop.
   Dragging the map also stops follow. */
function locateMe() {
  if (!('geolocation' in navigator)) { toast('This device has no GPS.'); return; }
  if (locateState === 'following') { stopFollow(); return; }
  if (locateState === 'acquiring') {
    stopLocateWatch(); locateState = 'idle'; toast('Cancelled.'); return;
  }
  if (lastFix && (Date.now() - (lastFix.at || 0) < 120000)) {
    hookFollowDrag();
    locateState = 'following';
    var b = $('btn-locate'); if (b) b.classList.add('active-mode');
    followLastPan = 0;
    stopLocateWatch();
    toast('Following you — tap the crosshair again to stop.');
    try {
      locateWatch = navigator.geolocation.watchPosition(onFollowFix, function () {
        if (locateState === 'following') { stopFollow(true); toast('Lost GPS signal.'); }
      }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
    } catch (e) { stopFollow(true); }
    return;
  }
  startAcquire();
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
  $('sf-settype').value = s ? (s.setType || 'Dirt hole') : 'Dirt hole';
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
    s.setType = $('sf-settype').value;
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
      setType: $('sf-settype').value,
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
    /* weather lookup in background */
    fetchWeather(ns.lat, ns.lng, function (w) {
      if (!w) return;
      ns.weather = w; Store.save();
      if (typeof detailSetId !== 'undefined' && detailSetId === ns.id) openSetDetail(ns.id);
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
    '<dt>Set type</dt><dd>' + esc(s.setType || '—') + '</dd>' +
    '<dt>Bait</dt><dd>' + esc(s.bait || '—') + '</dd>' +
    '<dt>Lure</dt><dd>' + esc(s.lure || '—') + '</dd>' +
    '<dt>Date set</dt><dd>' + esc(fmtDate(s.dateSet)) + '</dd>' +
    '<dt>Location</dt><dd>' + s.lat.toFixed(5) + ', ' + s.lng.toFixed(5) + '</dd>' +
    '<dt>Weather</dt><dd>' + esc(weatherText(s.weather)) + '</dd>' +
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
    (s.setType ? ' · ' + esc(s.setType) : '') +
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
      '" data-sp="' + esc(sp.common_name) + '">' + speciesIcon(sp.common_name) +
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
    setType: s ? (s.setType || '') : '',
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
  /* weather snapshot in background */
  if (s) fetchWeather(s.lat, s.lng, function (w) {
    if (!w) return;
    log.weather = w; Store.save();
  });
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
    return '<button type="button" class="species-row" data-sp="' + esc(sp.common_name) + '">' + speciesIcon(sp.common_name) +
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
  var html = '<div style="display:flex;align-items:center;gap:12px">' + speciesIcon(name, 'sp-icon-lg') + '<h3 style="margin:0">' + esc(sp.common_name) + '</h3></div>';
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
      img.onclick = function () { openLicenseDetail(p); };
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
      if (p.link) {
        var badge = document.createElement('span');
        badge.className = 'lic-link';
        badge.textContent = '🔗 site linked';
        item.appendChild(badge);
      }
      grid.appendChild(item);
    });
  });
}

/* Tap a license photo: view it, open its linked site, or attach/change the link. */
function openLicenseDetail(p) {
  var link = p.link || '';
  var html = '<img src="' + licURLs[p.id] + '" style="width:100%;border-radius:8px" alt="License photo">';
  if (link) {
    html += '<a class="btn-primary" style="display:block;text-align:center;margin-top:10px;text-decoration:none" href="' +
      esc(link) + '" target="_blank" rel="noopener">Open license site ↗</a>';
  }
  html += '<label class="field" for="m-lic-link" style="margin-top:12px">Link to license site (e.g. DNR)</label>' +
    '<input id="m-lic-link" type="url" inputmode="url" placeholder="https://…" value="' + esc(link) + '" autocomplete="off">' +
    '<div class="btn-row" style="margin-top:10px"><button class="btn-secondary" id="m-lic-save" type="button">Save link</button>' +
    '<button class="btn-secondary" id="m-close" type="button">Close</button></div>';
  showModal(html);
  $('m-close').onclick = closeModal;
  $('m-lic-save').onclick = function () {
    var v = $('m-lic-link').value.trim();
    if (v && !/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(v)) v = 'https://' + v;
    p.link = v;
    IDB.put('photos', p).then(function () {
      closeModal(); renderLicenses();
      toast(v ? 'License link saved.' : 'License link removed.');
    });
  };
}

/* ================= 12. CSV EXPORT / ERASE ================= */
function exportCatches() {
  if (!Store.data.logs.length) { toast('No catches to export yet.'); return; }
  var rows = [['Date', 'Season', 'Set', 'Species', 'Count', 'Disposition', 'Set type', 'Trap type', 'Weather', 'Bait', 'Lure', 'County', 'Latitude', 'Longitude', 'Notes']];
  Store.data.logs.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }).forEach(function (l) {
    rows.push([l.date, l.seasonYear || seasonYearOf(l.date), l.setName, l.species, l.count,
      dispLabel(l.disposition), l.setType, l.trapType, weatherText(l.weather), l.bait, l.lure, l.county, l.lat, l.lng, l.notes]);
  });
  downloadCSV('opossum-foot-catches-' + todayISO() + '.csv', rows);
  toast('Catches CSV downloaded.');
}
function exportSets() {
  if (!Store.data.sets.length) { toast('No sets to export yet.'); return; }
  var rows = [['Name', 'Latitude', 'Longitude', 'County', 'Set type', 'Trap type', 'Weather', 'Bait', 'Lure', 'Status', 'Date set', 'Notes']];
  Store.data.sets.forEach(function (s) {
    rows.push([s.name, s.lat, s.lng, s.county, s.setType, s.trapType, weatherText(s.weather), s.bait, s.lure, s.status, s.dateSet, s.notes]);
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
  $('settings-weather').checked = !!Store.data.weatherOn;
  $('settings-weather').onchange = function () {
    Store.data.weatherOn = this.checked;
    Store.save();
    toast(this.checked ? 'Weather auto-record is on.' : 'Weather auto-record is off.');
  };
  $('settings-voice').checked = Store.data.voiceOn !== false;
  $('settings-voice').onchange = function () {
    Store.data.voiceOn = this.checked;
    Store.save(); applyFeatureToggles();
    toast(this.checked ? 'Voice entry is on.' : 'Voice entry is off.');
  };
  $('settings-licenses').checked = Store.data.licensesOn !== false;
  $('settings-licenses').onchange = function () {
    Store.data.licensesOn = this.checked;
    Store.save(); applyFeatureToggles();
    toast(this.checked ? 'License wallet is on.' : 'License wallet is off.');
  };
  $('btn-features-reset').onclick = function () {
    Store.data.weatherOn = false; Store.data.voiceOn = true; Store.data.licensesOn = true;
    Store.save();
    $('settings-weather').checked = false; $('settings-voice').checked = true; $('settings-licenses').checked = true;
    applyFeatureToggles();
    toast('Features reset to defaults.');
  };
  applyFeatureToggles();
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
      toast('No GPS fix yet — tap the crosshair first, or drop a pin.');
      return;
    }
    startPlacePin({ lat: lastFix.lat, lng: lastFix.lng });
  };
  $('btn-place-ok').onclick = function () {
    if (!placeMarker) return;
    var ll = placeMarker.getLatLng();
    cancelPlacePin();
    openSetForm({ lat: ll.lat, lng: ll.lng });
  };
  $('btn-place-cancel').onclick = cancelPlacePin;
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
  $('settings-state').onchange = function () {
    var code = this.value;
    if (!code || code === Store.data.state) return;
    Store.data.state = code;
    Store.save();
    renderSeasons('');
    fitMapToState();
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
      /* when an updated worker takes over, reload once so the fresh code runs */
      var reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (!reloaded) { reloaded = true; window.location.reload(); }
      });
    });
  }
}

document.addEventListener('DOMContentLoaded', boot);
