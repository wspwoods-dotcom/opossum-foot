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
var REMINDER_LINE = 'Reminder only — always verify with your state agency and local ordinances.';
var APP_VERSION = 'beta 0.1 · build 2026-10-07ck';
/* Demo mode (?demo=1): seeds fictional data on a FRESH install only, for
   screenshots and in-person demos. Never touches existing data. */
var DEMO = /[?&]demo=1\b/.test(location.search);
var DEMO_ACTIVE = false;

/* ================= 2. STORAGE ================= */
var LS_KEY = 'opossumfoot.v1';
/* Pre-trap-lines backup: the exact store shape before the lines migration ran. */
var BACKUP_KEY = 'opossumFootBackupPreLines';

var Store = {
  data: null,
  load: function () {
    try { this.data = JSON.parse(localStorage.getItem(LS_KEY)); } catch (e) { this.data = null; }
    if (!this.data || typeof this.data !== 'object') {
      this.data = { onboarded: false, state: null, sets: [], logs: [] };
    }
    migrateLines(this.data);
    normalizeAttractants(); /* Q26: old string bait/lure/urine -> arrays */
    migrateSetTypes(this.data); /* Q29: old set-type dropdown -> researched taxonomy */
    if (!Array.isArray(this.data.sets)) this.data.sets = [];
    if (!Array.isArray(this.data.logs)) this.data.logs = [];
    /* Q8: per-line trip log. Orphaned trips land on the first line. */
    if (!Array.isArray(this.data.trips)) this.data.trips = [];
    var tripLineId = (this.data.lines && this.data.lines[0] && this.data.lines[0].id) || null;
    var tripD = this.data;
    this.data.trips.forEach(function (t) {
      if (!t || typeof t !== 'object') return;
      if (!lineById(tripD, t.lineId)) t.lineId = tripLineId;
    });
    normalizeLandowners(this.data); /* Q52: landowner notebook records */
    normalizeHome(this.data); /* Q53: home ground */
    if (typeof this.data.weatherOn !== 'boolean') this.data.weatherOn = false;
    if (typeof this.data.voiceOn !== 'boolean') this.data.voiceOn = true;
    if (typeof this.data.windArrowsOn !== 'boolean') this.data.windArrowsOn = true; /* Q17: on by default */
    /* Q68: trap check clock — hours between required checks, default 24. */
    if (typeof this.data.checkIntervalHours !== 'number' || this.data.checkIntervalHours <= 0) this.data.checkIntervalHours = 24;
    if (typeof this.data.checkClockOn !== 'boolean') this.data.checkClockOn = true; /* alerts on by default */
    migrateCheckClock(this.data);
    /* Q104 (2026-10-01): Tanner — notes get no tap-to-fill suggestions;
       purge any remembered notes, including ones already deleted from sets. */
    if (this.data.savedEntries && this.data.savedEntries.setnotes) delete this.data.savedEntries.setnotes;
    /* #6 (2026-10-01): Tanner — same rule for catch-log notes: written fresh,
       never suggested. Purge remembered log notes too. */
    if (this.data.savedEntries && this.data.savedEntries.lognotes) delete this.data.savedEntries.lognotes;
    /* New-set field visibility toggles — all default on. */
    var sfDef = { traptype: true, settype: true, bait: true, lure: true, urine: true, visual: true, audio: true, other: true, notes: true };
    if (!this.data.setFields || typeof this.data.setFields !== 'object') this.data.setFields = {};
    for (var sfk in sfDef) if (typeof this.data.setFields[sfk] !== 'boolean') this.data.setFields[sfk] = true;
    /* Totals tab section toggles — all default on. */
    if (!this.data.totalsSections || typeof this.data.totalsSections !== 'object') this.data.totalsSections = {};
    var tsDef = ['species', 'set', 'disposition'], tss = this.data.totalsSections;
    for (var tsi = 0; tsi < tsDef.length; tsi++) if (typeof tss[tsDef[tsi]] !== 'boolean') tss[tsDef[tsi]] = true;
  },
  save: function () {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(this.data));
    } catch (e) {
      toast('Storage is full — export a CSV backup, then erase old data.');
    }
  }
};

/* ================= 2a. TRAP LINES =================
   Each line is a self-contained trapping context: { id, name, state }.
   Sets and logs carry lineId; the old global trapping state now lives on
   the active line. Migration is bulletproof: the exact pre-migration store
   is backed up to BACKUP_KEY first, then every set/log is assigned to a
   line that exists — no record is ever orphaned. Runs idempotently on
   every load. */
function lineById(d, id) {
  if (!d || !Array.isArray(d.lines)) return null;
  for (var i = 0; i < d.lines.length; i++) {
    if (d.lines[i] && d.lines[i].id === id) return d.lines[i];
  }
  return null;
}
function newLineId() {
  return 'line-' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
}
function migrateLines(d) {
  if (!d || typeof d !== 'object') return;
  if (!Array.isArray(d.lines)) {
    try { localStorage.setItem(BACKUP_KEY, JSON.stringify(d)); } catch (e) { /* backup is best-effort; migration still runs */ }
  }
  if (!Array.isArray(d.sets)) d.sets = [];
  if (!Array.isArray(d.logs)) d.logs = [];
  if (!Array.isArray(d.lines) || d.lines.length === 0) {
    d.lines = [{ id: 'line-1', name: 'Line 1', state: (typeof d.state === 'string' && d.state) ? d.state : null }];
  }
  /* Normalize: every line gets a unique id, a name, and a state slot. */
  var seen = {};
  d.lines.forEach(function (ln, i) {
    if (!ln || typeof ln !== 'object') { d.lines[i] = ln = {}; }
    if (typeof ln.id !== 'string' || !ln.id || seen[ln.id]) ln.id = (i === 0 ? 'line-1' : newLineId());
    seen[ln.id] = true;
    if (typeof ln.name !== 'string' || !ln.name) ln.name = 'Line ' + (i + 1);
    if (typeof ln.state !== 'string') ln.state = null;
    /* Q14: per-line tab visibility. First run seeds from the old global
       switches so nobody's layout changes; afterwards the line owns it. */
    if (!ln.tabs || typeof ln.tabs !== 'object') {
      ln.tabs = {
        history: true,
        scorecard: d.scorecardOn !== false,
        seasons: d.seasonsOn !== false,
        licenses: d.licensesOn !== false
      };
    } else {
      ['history', 'scorecard', 'seasons', 'licenses'].forEach(function (k) {
        if (typeof ln.tabs[k] !== 'boolean') ln.tabs[k] = true;
      });
    }
  });
  var firstId = d.lines[0].id;
  if (!lineById(d, d.activeLineId)) d.activeLineId = firstId;
  /* Assign every set/log to a line that exists. Untagged records and records
     pointing at a vanished line land on the first line — never orphaned. */
  d.sets.forEach(function (s) { if (!s || !lineById(d, s.lineId)) s.lineId = firstId; });
  d.logs.forEach(function (l) { if (!l || !lineById(d, l.lineId)) l.lineId = firstId; });
}
/* Active-line accessors — every view filters through these, so Map, History,
   Totals, Seasons, Licenses, and CSV export all follow the active line. */
function activeLine() {
  var d = Store.data;
  return lineById(d, d.activeLineId) || (d.lines && d.lines[0]) || null;
}
function activeLineId() { var l = activeLine(); return l ? l.id : null; }
function activeStateCode() { var l = activeLine(); return (l && l.state) || null; }
function activeSets() {
  var id = activeLineId(), out = [];
  Store.data.sets.forEach(function (s) { if (s.lineId === id) out.push(s); });
  return out;
}
function activeLogs() {
  var id = activeLineId(), out = [];
  Store.data.logs.forEach(function (l) { if (l.lineId === id) out.push(l); });
  return out;
}
/* Safe filename slug from the active line's name. */
function lineFileSlug() {
  var l = activeLine();
  var s = l ? String(l.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-') : '';
  s = s.replace(/^-+|-+$/g, '');
  return s || 'line';
}

/* ================= 2b. DEMO MODE (?demo=1) =================
   Seeds fictional data for screenshots / in-person demos. Only runs when the
   store is completely empty, so it can never overwrite real trap data. */
function seedDemoStore() {
  var now = Date.now();
  function S(id, name, lat, lng, trapType, setType, bait, lure, status, dateSet, notes, extra) {
    var s = {
      id: id, name: name, lat: lat, lng: lng, county: 'Prairie County',
      trapType: trapType, setType: setType, bait: toAttrArray(bait), lure: toAttrArray(lure), other: [],
      status: status, dateSet: dateSet, notes: notes || '', createdAt: now,
      lineId: 'line-1'
    };
    if (extra) for (var k in extra) s[k] = extra[k];
    return s;
  }
  var sets = [
    S('s-demo-01', 'Creek bend', 41.8800, -95.1500, '1.5 coil-spring', 'Dirt hole', 'Sweet corn', ['Raccoon gland lure', 'Cherry lure'], 'active', '2026-11-14', 'Good coon sign along the bank.'),
    S('s-demo-02', 'Fence corner', 41.8200, -95.3200, 'Dog-proof', 'Post set', 'Cat food', '', 'active', '2026-11-14', ''),
    S('s-demo-03', 'Culvert east', 41.7500, -95.1200, '220 body-grip', 'Trail set', '', 'Beaver castor', 'active', '2026-11-20', 'Fresh chew on the north side.'),
    S('s-demo-04', 'Timber edge', 41.6800, -95.4800, '1.75 coil-spring', 'Flat', '', 'Canine gland lure', 'active', '2026-11-15', 'Coyote scat on the field road.'),
    S('s-demo-05', 'Pond dam', 41.9100, -95.4000, '330 body-grip', 'Dam crossover', '', 'Beaver castor', 'sprung', '2026-11-16', 'Sprung empty — reset with fresh castor.'),
    S('s-demo-06', 'Brush pile', 41.6200, -95.2500, 'Live cage trap', 'Blind set', 'Sardines', '', 'active', '2026-11-21', ''),
    S('s-demo-07', 'Old barn', 41.7300, -95.5200, 'Dog-proof', 'Post set', 'Fish oil', 'Raccoon lure', 'pulled', '2026-11-10', 'Pulled — landowner request.', { datePulled: '2026-11-18' }),
    S('s-demo-08', 'Ditch crossing', 41.6600, -95.3300, '1.5 coil-spring', 'Trail set', '', '', 'active', '2026-11-15', '', { urine: ['Red fox urine'] }),
    S('s-demo-09', 'Walnut grove', 41.8400, -95.4700, 'Snare', 'Trail set', '', '', 'active', '2026-11-22', ''),
    S('s-demo-10', 'Pasture gate', 41.6000, -95.1800, 'Dog-proof', 'Bucket set', 'Honey bun', 'Cherry lure', 'sprung', '2026-11-12', '')
  ];
  function L(id, setId, species, count, disposition, date, notes) {
    var s = null;
    for (var i = 0; i < sets.length; i++) if (sets[i].id === setId) s = sets[i];
    return {
      id: id, setId: setId, setName: s ? s.name : '(deleted set)',
      species: species, count: count, disposition: disposition, date: date, seasonYear: '2026-27',
      bait: s ? toAttrArray(s.bait) : [], lure: s ? toAttrArray(s.lure) : [], urine: s ? toAttrArray(s.urine) : [], visual: s ? toAttrArray(s.visual) : [], audio: s ? toAttrArray(s.audio) : [], other: s ? toAttrArray(s.other) : [], trapType: s ? s.trapType : '',
      setType: s ? s.setType : '', county: s ? s.county : '',
      lat: s ? s.lat : null, lng: s ? s.lng : null,
      notes: notes || '', createdAt: now, lineId: 'line-1'
    };
  }
  var logs = [
    L('l-demo-01', 's-demo-01', 'Raccoon', 2, 'kept', '2026-11-16', 'Big boar, good fur.'),
    L('l-demo-02', 's-demo-04', 'Coyote', 1, 'kept', '2026-11-17', 'Caught at first light.'),
    L('l-demo-03', 's-demo-02', 'Opossum', 1, 'released', '2026-11-18', 'Young one — let it walk.'),
    L('l-demo-04', 's-demo-08', 'Red fox', 1, 'released', '2026-11-19', 'Released.'),
    L('l-demo-05', 's-demo-05', 'Beaver', 1, 'kept', '2026-11-20', 'Dam crossing set.'),
    L('l-demo-06', 's-demo-10', 'Striped skunk', 1, 'kept-alive', '2026-11-21', 'For essence collection.')
  ];
  Store.data = {
    onboarded: true, state: 'IA', weatherOn: false, voiceOn: true,
    setFields: { traptype: true, settype: true, bait: true, lure: true, urine: true, visual: true, audio: true, other: true, notes: true },
    lines: [{ id: 'line-1', name: 'Line 1', state: 'IA' }],
    activeLineId: 'line-1',
    sets: sets, logs: logs
  };
  Store.save();
}
function demoSilentWav(sec) {
  var sr = 8000, n = sr * sec, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  function ws(o, s) { for (var i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); }
  ws(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); ws(8, 'WAVE'); ws(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true);
  v.setUint16(34, 16, true); ws(36, 'data'); v.setUint32(40, n * 2, true);
  return new Blob([buf], { type: 'audio/wav' });
}
function seedDemoIDB() {
  var c = document.createElement('canvas'); c.width = 640; c.height = 400;
  var g = c.getContext('2d');
  g.fillStyle = '#1d2b1f'; g.fillRect(0, 0, 640, 400);
  g.strokeStyle = '#c9a227'; g.lineWidth = 10; g.strokeRect(14, 14, 612, 372);
  g.fillStyle = '#c9a227'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center';
  g.fillText('SAMPLE — NOT A REAL LICENSE', 320, 70);
  g.fillStyle = '#f2f2f2'; g.font = '28px sans-serif';
  g.fillText('Iowa Fur Harvester License', 320, 130);
  g.fillText('2026-2027 Season', 320, 170);
  g.font = '24px sans-serif'; g.textAlign = 'left';
  g.fillText('Name:  JOHN DOE', 60, 240);
  g.fillText('County:  Prairie (fictional)', 60, 285);
  g.fillText('Lic #:  SAMPLE-0000', 60, 330);
  c.toBlob(function (lic) {
    IDB.put('memos', {
      id: 'm-demo-01', setId: 's-demo-01', mime: 'audio/wav', blob: demoSilentWav(2),
      createdAt: Date.now(),
      transcript: 'Checked the creek bend sets this morning. Both DPs firing, reset the sprung one at the pasture gate.'
    }).catch(function () { /* noop */ });
    if (lic) IDB.put('photos', { id: 'p-demo-lic', name: 'sample-license.png', blob: lic, createdAt: Date.now() })
      .catch(function () { /* noop */ });
  }, 'image/png');
}

var IDB = {
  db: null,
  open: function () {    var self = this;
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
  get: function (store, id) {
    var self = this;
    return new Promise(function (resolve) {
      if (!self.db) { resolve(null); return; }
      var t = self.db.transaction(store, 'readonly');
      var r = t.objectStore(store).get(id);
      t.oncomplete = function () { resolve(r.result || null); };
      t.onerror = function () { resolve(null); };
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

/* Catch time-of-day (Tanner 2026-10-01): "HH:MM" 24-hour, defaulting to now. */
function nowHHMM() { var d = new Date(); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
function fmtTime(hhmm) {
  var m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(hhmm || '');
  if (!m) return '';
  var h = +m[1], ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12; if (h === 0) h = 12;
  return h + ':' + m[2] + ' ' + ap;
}
function todayISO() {
  var d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}
function pad(n) { return (n < 10 ? '0' : '') + n; }

/* Q51: weekday readout next to the auto-filled date boxes. Parse the
   YYYY-MM-DD with the local-time constructor — new Date('2026-09-29')
   parses as UTC midnight and can shift the weekday in US timezones. */
function weekdayOf(iso) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return '';
  return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('en-US', { weekday: 'long' });
}
function updateDateDOW(inputId, spanId) {
  /* Tanner 2026-10-01: the weekday sits on its own line below the date field,
     not in the label — so no trailing comma. */
  var w = weekdayOf($(inputId).value);
  $(spanId).textContent = w || '';
}

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
  /* Q40 (Tanner 2026-09-30): the trapping season year runs Sept 1 – Aug 31,
     so November-through-January stays in one bucket. */
  if (m >= 9) return y + '-' + String(y + 1).slice(2);
  return (y - 1) + '-' + String(y).slice(2);
}
/* Q40: the season label before a "YYYY-YY" label, e.g. "2026-27" -> "2025-26". */
function prevSeasonLabel(label) {
  var p = (label || '').split('-');
  var y1 = p[0] * 1;
  if (!y1 || p.length < 2) return '';
  return (y1 - 1) + '-' + String(y1).slice(2);
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
  /* Q100 (2026-10-01): Tanner — every sheet opens at the top, never
     mid-scroll from where it was last closed. */
  var body = $(id).querySelector('.sheet-body');
  if (body) body.scrollTop = 0;
}
function closeSheets() {
  var sheets = document.querySelectorAll('.sheet.show');
  var logWasOpen = !!document.getElementById('sheet-log').classList.contains('show');
  for (var i = 0; i < sheets.length; i++) sheets[i].classList.remove('show');
  $('scrim').classList.remove('show');
  /* never leave a stray recording running behind a closed sheet */
  try { Voice.stop(); } catch (e) { /* noop */ }
  try { Memo.stop(); } catch (e) { /* noop */ }
  /* Catch-memo finish: a closing log sheet means the catch wasn't saved
     (saveLog clears pendingLogMemos first), so any memos waiting for a
     catch are orphans — remove them from the phone. */
  if (logWasOpen) { logSheetLive = false; deletePendingLogMemos(); }
}

/* modal — dialogs close only via their buttons, never a backdrop tap (Q105). */
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
  var code = activeStateCode();
  if (!code) return null;
  var all = window.OPOSSUM_FOOT_SEASON_DATA || {};
  return all[code] || null;
}
/* "Domestic animal" (cats, dogs, etc.) is appended to every state's species
   list programmatically — never hand-edited into the 50 state records.
   It is NOT a regulated species: always loggable, exempt from season checks
   and bag limits. */
var DOMESTIC_ANIMAL = {
  common_name: 'Domestic animal',
  scientific_name: '',
  keywords: 'cat dog pet puppy kitten livestock',
  domestic: true,
  season_status: 'exempt',
  seasons: [],
  notes: 'Not a regulated game species — always loggable, no season or bag limit. Some states require trappers to report domestic-animal catches; check your state regulations.'
};
/* Per-state domestic-animal reminders, verified against official state docs.
   Only these six states have domestic-specific rules worth surfacing;
   every other state keeps the generic check-your-regulations line.
   Reminders only — never legal authority. */
var DOMESTIC_REMINDERS = {
  'MT': 'Montana: report any domestic animal caught to FWP within 24 hours; release uninjured animals before leaving the trap site. Dog captures go to the FWP regional office.',
  'GA': 'Georgia: carry a choke stick (or similar) while tending traps and use it to release domestic animals. Selling a trapped dog or cat\'s fur is illegal.',
  'HI': 'Hawaii (residential zones): check any trapped dog or cat for ID and report to county animal control immediately.',
  'NH': 'New Hampshire: an injury to a licensed dog at large must be reported to the town/city on its tag, and to the owner if known.',
  'MS': 'Mississippi (wild-hog cage traps): release all nontarget wild or domestic animals immediately upon detection.',
  'WV': 'West Virginia (wildlife damage-control agents in municipalities): release captured pets to the owner, at the capture site, or to county officials.'
};
/* Full domestic-animal notes line for the active state: base explainer plus
   the state-specific reminder when one exists, else the generic line. */
function domesticNotes() {
  var base = 'Domestic animals (cats, dogs, etc.) are not regulated game species — no season or bag limit applies. ';
  var r = DOMESTIC_REMINDERS[activeStateCode()];
  return base + (r || 'Some states require trappers to report domestic-animal catches; check your state regulations.');
}
function stateSpecies() {
  var d = stateData();
  if (!d) return [];
  return d.species.concat([DOMESTIC_ANIMAL]);
}
/* Alphabetical by common name for every species list in the app; the
   Domestic animal help row stays pinned last. */
function sortSpeciesAlpha(list) {
  return list.sort(function (a, b) {
    if (a.domestic && !b.domestic) return 1;
    if (b.domestic && !a.domestic) return -1;
    var an = (a.common_name || '').toLowerCase(), bn = (b.common_name || '').toLowerCase();
    return an < bn ? -1 : an > bn ? 1 : 0;
  });
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
  /* Domestic animal is not a regulated species — always loggable, never
     flagged out-of-season, never triggers a season reminder. */
  if (sp.domestic || sp.season_status === 'exempt') {
    return { inSeason: true, badge: 'Not regulated', badgeClass: 'yearround', limits: null,
      seasonNote: 'Domestic animals (cats, dogs, etc.) are not regulated game species — no season or bag limit applies. Some states require reporting a domestic-animal catch; check your state regulations.' };
  }
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
  var list = stateSpecies();
  for (var i = 0; i < list.length; i++) {
    if (list[i].common_name === name) return list[i];
  }
  return null;
}

/* Human-readable catch disposition. 'kept' = dispatched (killed), 'kept-alive' =
   held live, 'released' = let go, 'transported' = transported and released
   elsewhere. Logs saved before any disposition existed are treated as 'kept'. */
function dispLabel(d) {
  if (d === 'released') return 'Released';
  if (d === 'kept-alive') return 'Kept alive';
  if (d === 'transported') return 'Transported';
  if (d === 'discarded') return 'Discarded';
  if (d === 'none') return '—';
  return 'Dispatched';
}

function dispBadge(d) {
  var cls = d === 'released' ? 'released' : d === 'kept-alive' ? 'alive' : d === 'transported' ? 'transported' : d === 'discarded' ? 'discarded' : d === 'none' ? 'none' : 'kept';
  return ' <span class="badge ' + cls + '">' + esc(dispLabel(d)) + '</span>';
}

/* total KEPT count logged for a species in a season year.
   Released and transported/released animals never count toward bag limits;
   kept and kept-alive do (an animal held alive is still in possession).
   Logs saved before the disposition field existed have no disposition
   and are treated as kept (backward compatible). */
function speciesSeasonTotal(name, seasonYear) {
  var n = 0;
  activeLogs().forEach(function (l) {
    if (!l.otherType && l.species === name && seasonYearOf(l.date) === seasonYear && l.disposition !== 'released' && l.disposition !== 'transported') n += normCount(l);
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
    /* Q96: only cache hits — a failed lookup cached as null would make every
       retry return the stale null instantly instead of re-fetching. */
    if (info && info.county) geoCache[key] = info;
    return info;
  }).catch(function () {
    return nominatimFallback(lat, lng).then(function (info) {
      if (info && info.county) geoCache[key] = info;
      return info;
    });
  });
}

/* Retry county lookup for sets saved while offline, once we're back online. */
var backfillRunning = false;
function backfillCounties() {
  if (backfillRunning || !navigator.onLine || !Store.data) return;
  var missing = activeSets().filter(function (s) { return !s.county && s.lat != null && s.lng != null; });
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
    if (county) county = county.replace(/\s+County$/i, '');
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

/* Q96 (2026-10-01): the county lookup used to get exactly one shot — on the
   acquire-final fix. If that single fetch failed, the banner sat at COUNTY
   UNKNOWN for the whole outing with no recovery (tapping the crosshair again
   just centers/enters follow). Follow-mode fixes now retry it, throttled, and
   a failed lookup is no longer cached as null (see reverseGeocode). */
var lastCountyRetry = 0;
function maybeRetryCountyBanner(lat, lng) {
  var banner = $('county-banner');
  if (!banner || !banner.classList.contains('unknown')) return;
  if (typeof lat !== 'number' || typeof lng !== 'number') return;
  var now = Date.now();
  if (now - lastCountyRetry < 60000) return;
  lastCountyRetry = now;
  reverseGeocode(lat, lng).then(function (info) {
    if (info && info.county) {
      setCountyBanner(info);
      checkStateMismatch(info);
    }
  });
}

/* Warn when the GPS fix is in a different state than the trapping state. */
function checkStateMismatch(info) {
  lastStateInfo = info || null;
  var bar = $('state-alert');
  var tcode = activeStateCode();
  if (info && info.stateCode && tcode && info.stateCode !== tcode) {
    var here = null, sel = stateEntry(tcode);
    for (var i = 0; i < STATES.length; i++) if (STATES[i].code === info.stateCode) here = STATES[i];
    $('state-alert-text').textContent =
      'You appear to be in ' + (here ? here.name : info.stateCode) +
      ', but your trapping state is ' + (sel ? sel.name : tcode) + '.';
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

/* ---- weather (map chip + bottom sheet; Q9 folded the Weather tab here) ---- */
var weatherTabBusy = false;
/* Each weather source owns one stamp fragment; paintWeatherUpdated composes
   the sheet's updated line so the two parallel fetches can't clobber it. */
var wxOmStamp = '', wxNwsStamp = '';
function paintWeatherUpdated() {
  var el = $('weather-updated');
  if (!el) return;
  el.textContent = [wxOmStamp, wxNwsStamp].filter(Boolean).join(' · ');
}
/* The map chip shows temp + condition icon from the last good fetch. Given a
   current-conditions object, or reads the cached fetch when called bare. */
function updateWeatherChip(c) {
  var chip = $('weather-chip');
  if (!chip) return;
  if (!c) {
    var cache = Store.data.weatherTabCache;
    c = (cache && cache.payload && cache.payload.current) || null;
  }
  /* B16: condition over temperature, stacked — matches the chip's column layout. */
  chip.innerHTML = c
    ? '<span>' + weatherEmoji(c.weather_code) + '</span><span>' + Math.round(c.temperature_2m) + '°F</span>'
    : '<img class="wx-ic" src="assets/icons/weather.png" alt="Weather">';
}
function weatherEmoji(c) {
  c = c * 1;
  if (c === 0) return '☀️';
  if (c <= 3) return '⛅';
  if (c <= 48) return '🌫️';
  if (c <= 67) return '🌧️';
  if (c <= 77) return '❄️';
  if (c <= 82) return '🌦️';
  if (c <= 86) return '🌨️';
  return '⛈️';
}
function hourLabel(iso) {
  var h = parseInt(iso.slice(11, 13), 10);
  var ap = h >= 12 ? 'p' : 'a';
  h = h % 12; if (h === 0) h = 12;
  return h + ap;
}
function timeAgo(ts) {
  var m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + ' min ago';
  return Math.round(m / 60) + ' hr ago';
}
function getTabFix(cb) {
  if (typeof lastFix !== 'undefined' && lastFix && lastFix.lat != null) { cb(lastFix); return; }
  if (!navigator.geolocation) { cb(null); return; }
  var done = false;
  function fin(f) { if (!done) { done = true; cb(f); } }
  try {
    navigator.geolocation.getCurrentPosition(
      function (p) { fin({ lat: p.coords.latitude, lng: p.coords.longitude }); },
      function () { fin(null); },
      { timeout: 8000, maximumAge: 600000 });
  } catch (e) { fin(null); }
  setTimeout(function () { fin(null); }, 9000);
}
function paintWeather(j, staleNote) {
  var c = j.current, now = $('weather-now');
  if (!c) { now.innerHTML = '<p class="dim">No weather data.</p>'; return; }
  updateWeatherChip(c);
  var hi = (j.daily && j.daily.temperature_2m_max) ? Math.round(j.daily.temperature_2m_max[0]) : null;
  var lo = (j.daily && j.daily.temperature_2m_min) ? Math.round(j.daily.temperature_2m_min[0]) : null;
  var h = '<div class="wx-temp">' + weatherEmoji(c.weather_code) + ' ' + Math.round(c.temperature_2m) + '°F</div>' +
    '<div class="wx-cond">' + esc(weatherCodeText(c.weather_code)) + ' · feels like ' + Math.round(c.apparent_temperature) + '°F</div>' +
    '<div class="wx-meta">Wind ' + windCompass(c.wind_direction_10m) + ' ' + Math.round(c.wind_speed_10m) + ' mph' +
    ' · Humidity ' + c.relative_humidity_2m + '%' +
    (c.precipitation > 0 ? ' · ' + c.precipitation.toFixed(2) + ' in precip' : '') +
    (hi != null ? ' · High ' + hi + '° / Low ' + lo + '°' : '') + '</div>';
  now.innerHTML = h;
  var rows = '', times = j.hourly.time, idx = 0;
  for (var i = 0; i < times.length; i++) if (times[i] <= c.time) idx = i;
  for (var k = 1; k <= 12 && idx + k < times.length; k++) {
    var t = idx + k;
    rows += '<div class="wx-hour"><span>' + hourLabel(times[t]) + '</span><span>' + weatherEmoji(j.hourly.weather_code[t]) + '</span>' +
      '<span>' + Math.round(j.hourly.temperature_2m[t]) + '°F</span><span class="dim">' + j.hourly.precipitation_probability[t] + '% precip</span></div>';
  }
  $('weather-hourly').innerHTML = rows || '<p class="dim">No hourly data.</p>';
  wxOmStamp = staleNote || 'Updated just now · Open-Meteo';
  paintWeatherUpdated();
}
function showCachedWeather(msg) {
  var c = Store.data.weatherTabCache;
  if (c && c.payload && c.payload.current) {
    paintWeather(c.payload, msg + ' Showing last update from ' + timeAgo(c.at) + '.');
  } else {
    $('weather-now').innerHTML = '<p class="dim">' + esc(msg) + '</p>';
    $('weather-hourly').innerHTML = '';
    wxOmStamp = '';
    paintWeatherUpdated();
  }
}

/* ---- National Weather Service spot forecast (Q41) ----
   api.weather.gov is free with no key: points lookup -> grid forecast URLs.
   Outside the US the points lookup 404s and we fall back to the Open-Meteo
   sheet content. The map chip and auto-record stay on Open-Meteo; only the
   sheet gains the NWS 7-day, hourly, and alerts. */
function nwsIconCode(iconUrl) {
  var m = String(iconUrl || '').match(/\/(day|night)\/([^?\/]+)/);
  if (!m) return '';
  return m[1] + '/' + m[2].split(',')[0]; /* "night/bkn"; dual icons like "bkn,rain" -> first */
}
function nwsEmoji(code) {
  code = String(code || '');
  var night = code.indexOf('night/') === 0;
  var c = code.replace(/^(day|night)\//, '');
  if (c === 'skc') return night ? '🌙' : '☀️';
  if (c === 'few' || c === 'sct') return night ? '🌙' : '⛅';
  if (c === 'bkn' || c === 'ovc') return '☁️';
  if (/fog|haze|smoke|dust/.test(c)) return '🌫️';
  if (/tsra/.test(c)) return '⛈️';
  if (/snow|sleet|fzra|blizzard/.test(c)) return '❄️';
  if (/rain|showers|drizzle/.test(c)) return '🌧️';
  if (/tornado|funnel/.test(c)) return '🌪️';
  if (/wind/.test(c)) return '💨';
  if (/hot|cold/.test(c)) return '🌡️';
  return '🌤️';
}
function fetchNWS(lat, lng, cb) {
  var done = false, pending = 0;
  var out = { daily: null, hourly: null, alerts: [] };
  function finishOk() { if (!done) { done = true; cb(out.daily ? out : null); } }
  function get(url, ok) {
    try {
      fetch(url).then(function (resp) {
        if (!resp.ok) { ok(null); return; }
        resp.json().then(ok, function () { ok(null); });
      }, function () { ok(null); });
    } catch (e) { ok(null); }
  }
  function oneDone() { if (--pending <= 0) finishOk(); }
  get('https://api.weather.gov/points/' + lat.toFixed(4) + ',' + lng.toFixed(4), function (pj) {
    var props = pj && pj.properties;
    if (!props || !props.forecast) { finishOk(); return; } /* outside US / bad point */
    pending = 2 + (props.forecastHourly ? 1 : 0);
    get(props.forecast, function (fj) {
      var p = fj && fj.properties && fj.properties.periods;
      if (p && p.length) out.daily = p;
      oneDone();
    });
    if (props.forecastHourly) get(props.forecastHourly, function (hj) {
      var p = hj && hj.properties && hj.properties.periods;
      if (p && p.length) out.hourly = p.slice(0, 24);
      oneDone();
    });
    get('https://api.weather.gov/alerts/active?point=' + lat.toFixed(4) + ',' + lng.toFixed(4), function (aj) {
      var f = aj && aj.features;
      if (f && f.length) out.alerts = f.map(function (x) { return x.properties || {}; });
      oneDone();
    });
  });
  setTimeout(finishOk, 12000); /* never hang the sheet on weather */
}
function paintNWS(nws) {
  var aEl = $('weather-alerts'), dEl = $('weather-daily');
  if (!aEl || !dEl) return;
  if (!nws) {
    aEl.style.display = 'none'; aEl.innerHTML = '';
    dEl.innerHTML = '<p class="dim">National Weather Service forecast unavailable.</p>';
    return;
  }
  if (nws.alerts && nws.alerts.length) {
    var ah = '';
    nws.alerts.forEach(function (a) {
      ah += '<div class="wx-alert"><div><strong>⚠️ ' + esc(a.event || 'Weather alert') + '</strong></div>' +
        (a.headline ? '<div>' + esc(a.headline) + '</div>' : '') +
        (a.description ? '<details><summary>Details</summary><p>' + esc(a.description) + '</p></details>' : '') +
        '</div>';
    });
    aEl.innerHTML = ah;
    aEl.style.display = '';
  } else {
    aEl.style.display = 'none'; aEl.innerHTML = '';
  }
  var dh = '';
  (nws.daily || []).forEach(function (p) {
    dh += '<div class="wx-day"><div class="wx-day-top"><span><strong>' + esc(p.name || '') + '</strong></span>' +
      '<span>' + nwsEmoji(nwsIconCode(p.icon)) + ' ' + Math.round(p.temperature) + '°' + esc(p.temperatureUnit || 'F') + '</span></div>' +
      (p.shortForecast ? '<div class="dim">' + esc(p.shortForecast) + '</div>' : '') + '</div>';
  });
  dEl.innerHTML = dh || '<p class="dim">No forecast data.</p>';
}
/* Appends (or refreshes) the NWS freshness stamp on the sheet's updated line,
   preserving whatever Open-Meteo text is already there. */
function noteNwsUpdated(cached) {
  wxNwsStamp = (cached && Store.data.weatherNwsCache)
    ? 'NWS cached ' + timeAgo(Store.data.weatherNwsCache.at)
    : 'NWS just now';
  paintWeatherUpdated();
}
function showCachedNWS() {
  var c = Store.data.weatherNwsCache;
  if (c && c.payload && c.payload.daily) {
    paintNWS(c.payload);
    noteNwsUpdated(true);
  } else {
    var aEl = $('weather-alerts'), dEl = $('weather-daily');
    if (aEl) { aEl.style.display = 'none'; aEl.innerHTML = ''; }
    if (dEl) dEl.innerHTML = '<p class="dim">National Weather Service forecast unavailable.</p>';
  }
}
function renderWeatherTab() {
  if (weatherTabBusy) return;
  weatherTabBusy = true;
  $('weather-now').innerHTML = '<p class="dim">Loading weather…</p>';
  $('weather-hourly').innerHTML = '';
  wxOmStamp = ''; wxNwsStamp = '';
  paintWeatherUpdated();
  var dEl0 = $('weather-daily'); if (dEl0) dEl0.innerHTML = '<p class="dim">Loading…</p>';
  var aEl0 = $('weather-alerts'); if (aEl0) { aEl0.style.display = 'none'; aEl0.innerHTML = ''; }
  getTabFix(function (fix) {
    if (!fix) {
      weatherTabBusy = false;
      $('weather-loc').textContent = 'Location unavailable.';
      showCachedWeather('No location fix yet — open the Map tab and tap the crosshair, then come back.');
      showCachedNWS();
      return;
    }
    /* Q103 (2026-10-01): Tanner — no visible coordinates anywhere in the UI unless the Privacy toggle is on. */
    $('weather-loc').textContent = showCoords()
      ? 'Near ' + fix.lat.toFixed(3) + ', ' + fix.lng.toFixed(3)
      : 'Current conditions where you are.';
    /* National Weather Service spot forecast, in parallel with Open-Meteo. */
    fetchNWS(fix.lat, fix.lng, function (nws) {
      if (nws) {
        Store.data.weatherNwsCache = { at: Date.now(), payload: nws };
        try { Store.save(); } catch (e) {}
        paintNWS(nws);
        noteNwsUpdated(false);
      } else {
        showCachedNWS();
      }
    });
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + fix.lat.toFixed(4) + '&longitude=' + fix.lng.toFixed(4) +
      '&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,precipitation' +
      '&hourly=temperature_2m,precipitation_probability,weather_code' +
      '&daily=temperature_2m_max,temperature_2m_min' +
      '&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto&forecast_days=2';
    var done = false;
    function finish(j) {
      if (done) return; done = true;
      weatherTabBusy = false;
      if (j && j.current) {
        Store.data.weatherTabCache = { at: Date.now(), payload: j };
        Store.save();
        paintWeather(j, null);
      } else {
        showCachedWeather("Couldn't reach the weather service.");
      }
    }
    try {
      fetch(url).then(function (r) { return r.json(); }).then(finish).catch(function () { finish(null); });
    } catch (e) { finish(null); }
    setTimeout(function () { finish(null); }, 10000);
  });
}

/* ---- Q14/Q62: per-line tab visibility -------------------------------------------
   Map, Lines, Settings always show. History, Scorecard, Seasons, Licenses,
   Totals are toggleable per trap line — a nuisance line can run lean
   while the hobby line keeps the full bar. */
var TOGGLEABLE_TABS = ['history', 'scorecard', 'seasons', 'licenses', 'totals'];
var TAB_LABELS = { history: 'History tab', scorecard: 'Scorecard tab', seasons: 'Seasons tab', licenses: 'Paperwork tab', totals: 'Totals tab' };
function lineTabs() {
  var l = activeLine(), t = (l && l.tabs) || {}, out = {};
  TOGGLEABLE_TABS.forEach(function (k) { out[k] = t[k] !== false; });
  return out;
}
/* Q14: syncs the Settings Tabs switches to the active line. Top-level so
   refreshForLine() can re-render them on line switches. */
function renderTabToggles() {
  var l = activeLine(), t = lineTabs();
  var nameEl = $('tabs-line-name');
  if (nameEl) nameEl.textContent = l ? l.name : '';
  TOGGLEABLE_TABS.forEach(function (k) {
    var cb = $('settings-tab-' + k);
    if (cb) cb.checked = t[k];
  });
}
/* ---- feature toggles ---- */
function applyFeatureToggles() {
  var vOn = Store.data.voiceOn !== false;
  ['btn-voice-setnotes', 'voice-setnotes-preview', 'btn-voice-lognotes', 'voice-lognotes-preview',
   'btn-se-memo', 'se-memos-head', 'se-memos', 'setform-memos',
   'sd-memos-head', 'sd-memos',
   'sd-notes-head', 'sd-notes'].forEach(function (id) {
    var el = $(id);
    if (el) el.style.display = vOn ? '' : 'none';
  });
  var lt = lineTabs();
  TOGGLEABLE_TABS.forEach(function (k) {
    var tab = document.querySelector('#tabbar button[data-tab="' + k + '"]');
    if (tab) tab.style.display = lt[k] ? '' : 'none';
    if (!lt[k] && $('pane-' + k) && $('pane-' + k).classList.contains('active')) switchTab('map');
  });
  var wOn = !!Store.data.weatherOn;
  var wchip = $('weather-chip');
  if (wchip) wchip.style.display = wOn ? '' : 'none';
  if (!wOn && $('sheet-weather') && $('sheet-weather').classList.contains('show')) closeSheets();
  /* Q8: mileage toggle — hides the standalone mileage CSV export. The
     per-line Mileage buttons are gated in renderLines. */
  var mOn = Store.data.mileageOn !== false;
  var mexp = $('btn-export-mileage');
  if (mexp) mexp.style.display = mOn ? '' : 'none';
}

/* ---- new-set field toggles ---- */
var SET_FIELD_IDS = { traptype: 'setfield-traptype', trapdetail: 'setfield-trapdetail', settype: 'setfield-settype', bait: 'setfield-bait', lure: 'setfield-lure', urine: 'setfield-urine', visual: 'setfield-visual', audio: 'setfield-audio', other: 'setfield-other', notes: 'setfield-notes' };
function setFieldOn(key) { return !Store.data.setFields || Store.data.setFields[key] !== false; }
/* ---- Q26: attractants are lists --------------------------------------------
   bait / lure / urine / visual / audio / other each hold an ARRAY of values —
   one set can run two lures, a urine plus a visual cue, etc. Older stores kept
   plain strings; normalizeAttractants() migrates them on every load. */
var ATTRACTANT_KEYS = ['bait', 'lure', 'urine', 'visual', 'audio', 'other'];
/* Q30 (Tanner 2026-09-26): state bait-use restrictions, warned at set creation.
   VERIFIED entries only — states without a researched rule get no warning
   rather than a wrong one. Lure-side rules: none verified yet (research
   pending), so no lure warnings ship. Sources in the findings file. */
var BAIT_RULES = {
  IA: 'No leghold, bodygrip, or snare within 20 ft of exposed bait — meat, viscera, or any animal parts visible to soaring birds. Keep bait covered or concealed.',
  PA: 'Baiting a trap with meat, animal products, or facsimiles visible from the air is unlawful.',
  MN: 'No foothold within 20 ft of bait visible to soaring birds (any animal or animal parts, including fish). Rabbit or hare flesh may not be used as bait at all.',
  WI: 'No sight-exposed bait (feathers, flesh, fur, hide, entrails) within 25 ft of a trap, snare, or cable restraint — except enclosed trigger traps and cage traps.'
};
/* Q30: show/hide the bait-rule reminder under the New/Edit Set bait rows.
   Q97 (2026-10-01): Tanner — a slim collapsed row ("Bait rule — Iowa ›") instead
   of the full warnbox shoving the form; tap expands the rule in place. */
function updateBaitWarn() {
  var box = $('sf-bait-warn');
  var head = $('sf-bait-warn-head');
  if (!box) return;
  var code = (typeof activeStateCode === 'function') ? activeStateCode() : null;
  var rule = code && BAIT_RULES[code];
  var hasBait = collectAttrRows('bait').length > 0;
  if (!rule || !hasBait) {
    box.setAttribute('hidden', ''); box.innerHTML = '';
    if (head) { head.setAttribute('hidden', ''); head.classList.remove('open'); }
    return;
  }
  var stName = code;
  for (var i = 0; i < STATES.length; i++) if (STATES[i].code === code) { stName = STATES[i].name; break; }
  if (head) {
    head.innerHTML = '<span>Bait rule \u2014 ' + esc(stName) + '</span><span class="setsec-chev">\u203a</span>';
    head.removeAttribute('hidden');
    head.classList.remove('open');
    head.onclick = function () {
      var b = $('sf-bait-warn');
      var open = !b.hasAttribute('hidden');
      if (open) { b.setAttribute('hidden', ''); head.classList.remove('open'); }
      else {
        /* Q160 (2026-10-06): Tanner — refill from the live rule on every
           expand, so the box can never be shown with stale/empty content. */
        var c2 = (typeof activeStateCode === 'function') ? activeStateCode() : null;
        var r2 = c2 && BAIT_RULES[c2];
        if (r2) b.innerHTML = esc(r2) +
          '<div class="reminder-tag">Reminder only, not legal advice \u2014 check your state\u2019s current regulations.</div>';
        b.removeAttribute('hidden'); head.classList.add('open');
      }
    };
  }
  box.innerHTML = esc(rule) +
    '<div class="reminder-tag">Reminder only, not legal advice \u2014 check your state\u2019s current regulations.</div>';
  box.setAttribute('hidden', ''); /* starts collapsed; the head expands it */
}
function toAttrArray(v) {
  if (Array.isArray(v)) return v.map(function (x) { return String(x || '').trim(); }).filter(Boolean);
  var s = String(v || '').trim();
  return s ? [s] : [];
}
function joinAttr(v) { return toAttrArray(v).join(' | '); }
/* flattened display of all four attractant lists, e.g. for History rows */
function allAttrSummary(rec) {
  var out = [];
  ATTRACTANT_KEYS.forEach(function (k) { out = out.concat(toAttrArray(rec[k])); });
  return out.join(' / ');
}
function normalizeAttractants() {
  ['sets', 'logs'].forEach(function (ck) {
    (Store.data[ck] || []).forEach(function (r) {
      ATTRACTANT_KEYS.forEach(function (k) { r[k] = toAttrArray(r[k]); });
    });
  });
}
/* ---- Q11: saved attractant entries -------------------------------------
   Every value typed into bait / lure / urine / visual / audio / other is remembered; the
   next time the field is used, matching past entries appear as tap-to-fill
   suggestions. Urine and Other seed with popular values. */
var URINE_SEEDS = ['Fox urine', 'Coyote urine', 'Bobcat urine'];
var VISUAL_SEEDS = ['Feathers', 'Flagging tape', 'Foil strip'];
var AUDIO_SEEDS = ['Squeaker', 'Electronic caller', 'Mouth call'];
var OTHER_SEEDS = ['T-bone', 'Artificial eggs'];
function savedEntries(key) {
  var se = Store.data.savedEntries;
  if (!se || typeof se !== 'object') se = Store.data.savedEntries = {};
  if (!Array.isArray(se[key])) se[key] = (key === 'urine') ? URINE_SEEDS.slice() : (key === 'visual') ? VISUAL_SEEDS.slice() : (key === 'audio') ? AUDIO_SEEDS.slice() : (key === 'other' ? OTHER_SEEDS.slice() : []);
  return se[key];
}
function rememberOne(key, v) {
  var arr = savedEntries(key);
  var li = -1;
  for (var i = 0; i < arr.length; i++) {
    if (arr[i].toLowerCase() === v.toLowerCase()) { li = i; break; }
  }
  if (li !== -1) arr.splice(li, 1);
  arr.unshift(v);
  if (arr.length > 30) arr.length = 30;
}
/* Q79 (2026-10-01): Tanner — remove one user-typed entry from a field's
   suggestion list. Seeds stay; only what he typed can be deleted. */
function forgetEntry(key, v) {
  var arr = savedEntries(key);
  var vl = (v || '').toLowerCase();
  for (var i = 0; i < arr.length; i++) {
    if (arr[i].toLowerCase() === vl) { arr.splice(i, 1); break; }
  }
  Store.save();
}
/* Q79: the built-in seeds per field — these never get a delete button. */
function entrySeeds(key) {
  if (key === 'urine') return URINE_SEEDS;
  if (key === 'visual') return VISUAL_SEEDS;
  if (key === 'audio') return AUDIO_SEEDS;
  if (key === 'other') return OTHER_SEEDS;
  return [];
}
function isSeedEntry(key, v) {
  var seeds = entrySeeds(key), vl = (v || '').toLowerCase();
  for (var i = 0; i < seeds.length; i++) {
    if (seeds[i].toLowerCase() === vl) return true;
  }
  return false;
}
/* ================= Q55. "OTHER" TYPE-IN ON EVERY DROPDOWN =================
   Every data-entry dropdown on the set form grows an "Other…" option. Picking
   it reveals a "What is it?" box; whatever the trapper types is saved as the
   field's value AND remembered per trap line, so next time it's a plain
   option in that dropdown — never retyped. One mechanism everywhere: the
   trap-type "Other" (Q57-B), the snare "Other"s, and the set-type "Other"
   all route through it. */
var OTHER_VALUE = '__other'; /* the universal Other… option value */
function customOptionsFor(id) {
  /* Read path never creates Store.data: backfillCounties and friends use
     `!Store.data` to mean "not loaded yet", and that must keep working. */
  var d = Store.data;
  if (!d || typeof d !== 'object') return [];
  var co = d.customOptions;
  if (!co || typeof co !== 'object') co = d.customOptions = {};
  if (!Array.isArray(co[id])) co[id] = [];
  return co[id];
}
function rememberCustomOption(id, v) {
  v = (v || '').trim();
  if (!v) return;
  if (!Store.data || typeof Store.data !== 'object') Store.data = {};
  var arr = customOptionsFor(id), li = -1;
  for (var i = 0; i < arr.length; i++) {
    if (arr[i].toLowerCase() === v.toLowerCase()) { li = i; break; }
  }
  if (li !== -1) arr.splice(li, 1);
  arr.unshift(v);
  if (typeof Store.save === 'function') Store.save();
}
/* Base options + the trapper's remembered customs (deduped, customs last). */
function mergeCustomOptions(id, base) {
  var out = base.slice(), seen = {}, customs = customOptionsFor(id);
  for (var i = 0; i < out.length; i++) seen[out[i].toLowerCase()] = 1;
  for (var j = 0; j < customs.length; j++) {
    if (!seen[customs[j].toLowerCase()]) { out.push(customs[j]); seen[customs[j].toLowerCase()] = 1; }
  }
  return out;
}
function hasOtherOption(options) {
  for (var i = 0; i < options.length; i++) {
    if (options[i] === 'Other' || options[i] === OTHER_VALUE) return true;
  }
  return false;
}
/* The "What is it?" reveal row that sits under an Other-capable dropdown. */
function otherWrapHtml(id, placeholder) {
  return '<div class="other-wrap" id="' + id + '-otherwrap" hidden>' +
    '<label class="field" for="' + id + '-othertext">What is it?</label>' +
    '<input type="text" id="' + id + '-othertext" placeholder="' + esc(placeholder || 'Type it here') + '" autocomplete="off"></div>';
}
function toggleOtherWrap(sel) {
  if (!sel || !sel.id) return;
  var w = $(sel.id + '-otherwrap');
  if (w) w.hidden = !(sel.value === OTHER_VALUE || sel.value === 'Other');
}
/* Read a dropdown's value, resolving Other… → the typed text (remembered).
   Picked Other but typed nothing → blank, never the literal "Other". */
function selVal(id) {
  var sel = $(id);
  if (!sel) return '';
  var v = sel.value;
  if (v === OTHER_VALUE || v === 'Other') {
    var t = $(id + '-othertext');
    var typed = t ? t.value.trim() : '';
    if (typed) { rememberCustomOption(id, typed); return typed; }
    return '';
  }
  return v;
}
/* Q12: remember one typed value under a field kind — offered as a
   tap-to-fill suggestion next time that field is used. Scoped per field:
   lure history never pollutes the bait field. No seeds for non-attractant
   kinds; they learn purely from use. */
function rememberEntry(key, value) {
  var v = (value || '').trim();
  if (!v) return;
  rememberOne(key, v);
  Store.save();
}
function rememberAttractants(s) {
  var changed = false;
  ATTRACTANT_KEYS.forEach(function (k) {
    toAttrArray(s[k]).forEach(function (v) {
      rememberOne(k, v);
      changed = true;
    });
  });
  if (changed) Store.save();
}
/* Q67: sponsored products ride INSIDE the bait/lure suggestion menus —
   matching sponsors first with a Sponsored tag. Tapping the product name
   fills the row; the eye opens the sponsor bio without filling anything. */
/* Q69: the sponsor's logo (product badge) replaces the eye in the suggestion
   row; tapping it still opens the sponsor bio. No badge on file → the eye
   stays as the fallback so the info page is always one tap away. */
function sponsorSuggestRowHtml(sp) {
  var mark = sp.badge
    ? '<img class="sponsor-logo" src="' + esc(sp.badge) + '" alt="' + esc(sp.name) + ' logo">'
    : '&#128065;';
  return '<div class="suggest-sponsor">' +
    '<button type="button" class="suggest-fill" data-v="' + esc(sp.product) + '"><span class="suggest-name">' + esc(sp.product) + '</span> <span class="pill">Sponsored</span></button>' +
    '<button type="button" class="sponsor-eye" data-sp="' + esc(sp.id) + '" aria-label="About ' + esc(sp.name) + '">' + mark + '</button>' +
    '</div>';
}
function sponsorSuggests(key, q) {
  var out = [];
  for (var i = 0; i < SPONSORS.length; i++) {
    var sp = SPONSORS[i];
    if (sp.section !== key) continue;
    if (q && sp.product.toLowerCase().indexOf(q) === -1 && sp.name.toLowerCase().indexOf(q) === -1) continue;
    out.push(sp);
  }
  return out;
}
function attachSuggest(inputId, boxId, key) {
  var input = $(inputId), box = $(boxId);
  if (!input || !box || input._suggestWired) return;
  input._suggestWired = true;
  function fillFrom(btn) {
    input.value = btn.getAttribute('data-v');
    box.className = 'suggest'; box.innerHTML = '';
    input.focus();
    /* Q98 fix (2026-10-01): a programmatic fill fires no input event, so the
       "+ Add Another" button never appeared after tapping a suggestion.
       Dispatch it so the button (and the bait-rule check) update. */
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function render() {
    var q = input.value.trim().toLowerCase();
    var sps = sponsorSuggests(key, q);
    var items = savedEntries(key).filter(function (v) {
      var vl = v.toLowerCase();
      return vl !== q && (!q || vl.indexOf(q) !== -1);
    }).slice(0, 6);
    if (!sps.length && !items.length) { box.className = 'suggest'; box.innerHTML = ''; return; }
    var html = sps.map(sponsorSuggestRowHtml).join('') + items.map(function (v) {
      /* Q79 (2026-10-01): Tanner — user-typed entries get a × to remove them
         from the list; built-in seeds don't. */
      var del = isSeedEntry(key, v)
        ? ''
        : '<button type="button" class="suggest-del" data-v="' + esc(v) + '" aria-label="Remove from list">×</button>';
      return '<div class="suggest-row"><button type="button" class="suggest-item" data-v="' + esc(v) + '">' + esc(v) + '</button>' + del + '</div>';
    }).join('');
    box.innerHTML = html;
    box.className = 'suggest show';
    var btns = box.querySelectorAll('.suggest-item, .suggest-fill');
    for (var i = 0; i < btns.length; i++) {
      btns[i].onclick = function () { fillFrom(this); };
    }
    var dels = box.querySelectorAll('.suggest-del');
    for (var k = 0; k < dels.length; k++) {
      dels[k].onclick = function (e) {
        if (e && e.stopPropagation) e.stopPropagation();
        forgetEntry(key, this.getAttribute('data-v'));
        render();
      };
    }
    var eyes = box.querySelectorAll('.sponsor-eye');
    for (var j = 0; j < eyes.length; j++) {
      eyes[j].onclick = function (e) {
        if (e && e.stopPropagation) e.stopPropagation();
        openSponsorBio(this.getAttribute('data-sp'));
      };
    }
  }
  input.addEventListener('input', render);
  input.addEventListener('focus', render);
  input.addEventListener('blur', function () {
    setTimeout(function () { box.className = 'suggest'; }, 160);
  });
}
/* ---- Q26: stacked attractant rows on the set form ----------------------
   Each attractant field renders one row per value: text input with its own
   tap-to-fill suggestions, a × to drop the row, and an "add another"
   button under the stack. */
/* Q78 (2026-10-01): Tanner — examples live as hints above the field (see
   index.html), never inside the box and never in the suggestion list. The
   inputs carry no placeholder. */
var ATTR_MAX_ROWS = 6;
function attrRowCount(field) {
  var host = $('sf-' + field + '-rows');
  return host ? host.querySelectorAll('.attr-row').length : 0;
}
/* Q98 (2026-10-01): Tanner — the "+ Add Another X" button stays hidden until
   at least one row of that attractant actually has a value typed in. */
function updateAttrAdd(field) {
  var add = $('sf-' + field + '-add');
  if (!add) return;
  var host = $('sf-' + field + '-rows');
  var filled = false;
  if (host) {
    var inputs = host.querySelectorAll('.attr-row-input');
    for (var i = 0; i < inputs.length; i++) {
      if ((inputs[i].value || '').trim()) { filled = true; break; }
    }
  }
  if (filled) add.removeAttribute('hidden'); else add.setAttribute('hidden', '');
}
function renderAttrRows(field, values, minRows) {
  var host = $('sf-' + field + '-rows');
  if (!host) return;
  var vals = toAttrArray(values).slice(0, ATTR_MAX_ROWS);
  while (vals.length < Math.min(minRows || 1, ATTR_MAX_ROWS)) vals.push('');
  var showX = vals.length > 1; /* single rows look like the old full-width boxes */
  var html = '';
  for (var i = 0; i < vals.length; i++) {
    html += '<div class="attr-row">' +
      '<input type="text" class="attr-row-input" id="sf-' + field + '-row-' + i + '" data-attr="' + field + '"' +
      ' autocomplete="off" value="' + esc(vals[i]) + '">' +
      (showX ? '<button type="button" class="attr-row-x" data-attr="' + field + '" data-i="' + i + '" aria-label="Remove">×</button>' : '') +
      '</div><div class="suggest" id="sf-' + field + '-row-' + i + '-suggest"></div>';
  }
  host.innerHTML = html;
  for (var j = 0; j < vals.length; j++) {
    attachSuggest('sf-' + field + '-row-' + j, 'sf-' + field + '-row-' + j + '-suggest', field);
  }
  /* Q30: refresh the bait-rule warning whenever bait rows re-render. */
  if (field === 'bait' && typeof updateBaitWarn === 'function') updateBaitWarn();
  var xs = host.querySelectorAll('.attr-row-x');
  for (var k = 0; k < xs.length; k++) {
    xs[k].onclick = function () {
      var f = this.getAttribute('data-attr'), idx = +this.getAttribute('data-i');
      var cur = collectAttrRows(f);
      cur.splice(idx, 1);
      renderAttrRows(f, cur);
    };
  }
  var add = $('sf-' + field + '-add');
  if (add) add.onclick = function () {
    /* count real rows, not collected values — collectAttrRows drops empties,
       so counting it made the button a no-op on an untouched row */
    var n = attrRowCount(field);
    if (n >= ATTR_MAX_ROWS) { toast("That's plenty — six is the max."); return; }
    renderAttrRows(field, collectAttrRows(field), n + 1);
    var last = $('sf-' + field + '-row-' + n);
    if (last) last.focus();
  };
  updateAttrAdd(field); /* Q98: button visibility follows row contents */
}
/* ---- Q103 (2026-10-01): Tanner — GPS coordinates are hidden everywhere
   visible (screenshot-safe) unless Settings → Privacy → "Show GPS coordinates"
   is on. The tap-to-copy footers below only render when it's on. */
function showCoords() { return !!Store.data.showCoords; }
function fmtCoords(lat, lng) {
  return Number(lat).toFixed(5) + ', ' + Number(lng).toFixed(5);
}
function copyCoordsText(t) {
  function done() { toast('Coordinates copied'); }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(t).then(done, function () { copyCoordsFallback(t, done); });
  } else copyCoordsFallback(t, done);
}
function copyCoordsFallback(t, done) {
  var ta = document.createElement('textarea');
  ta.value = t;
  ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); done(); } catch (e) { toast('Copy failed — long-press to copy'); }
  document.body.removeChild(ta);
}
function wireCoordsBottom(id, text) {
  var el = $(id);
  if (!el) return;
  el.textContent = text;
  el.onclick = function () { copyCoordsText(text); };
}
/* Read the rows back: trimmed, empties dropped, dupes collapsed
   case-insensitively so "Fox urine" twice scores once. */
function collectAttrRows(field) {
  var host = $('sf-' + field + '-rows');
  var out = [], seen = {};
  if (!host) return out;
  var inputs = host.querySelectorAll('.attr-row-input');
  for (var i = 0; i < inputs.length; i++) {
    var v = (inputs[i].value || '').trim();
    if (!v) continue;
    var lk = v.toLowerCase();
    if (seen[lk]) continue;
    seen[lk] = true;
    out.push(v);
  }
  return out;
}
function applySetFieldToggles() {
  for (var key in SET_FIELD_IDS) {
    var el = $(SET_FIELD_IDS[key]);
    if (el) el.style.display = setFieldOn(key) ? '' : 'none';
  }
}

/* ---------- Trap subcategories (build bc) ----------
   Verified 2026-09-25 against current catalogs (F&T Fur Harvester's Trading
   Post, IronTrail Trapline, Fleming Traps + corroboration). Size ladders are
   what makers actually sell today; "Other / unsure" covers maker numbering
   quirks (e.g. Bridger #1.65, MB model numbers instead of # sizes). */
var TRAP_SUB = {
  'Foothold': {
    springs: ['Coil-spring', 'Longspring'],
    sizes: {
      'Coil-spring': ['#1', '#1.5', '#1.65', '#1.75', '#2', '#3', '#4'],
      'Longspring': ['#0', '#1', '#11', '#5']
    },
    otherSize: 'Other / unsure', model: true
  },
  'Bodygrip / Conibear': { sizes: ['110', '120', '160', '220', '280', '330'], otherSize: 'Other' },
  'Snare': { snare: true },
  'Cage live trap': {
    sizes: ['Small — up to 7"x7"x24"', 'Medium — 9"x9"x24" to 10"x12"x32"', 'Large — 12"x12" and up'],
    otherSize: 'Other', model: true
  },
  'Colony trap': { sizes: ['5"x5"x24"', '6"x6"', '7"x7"x24"', '7"x7"x36"', '8"x8"x36"'], otherSize: 'Other' },
  'Dog-proof': { model: true },
  'Other': { model: true }
};
var SNARE_DIAS = ['1/16"', '5/64"', '3/32"'];
var SNARE_LOCKS = ['Cam', 'Relaxing', 'Washer'];
var SNARE_LENS = ['30"', '48"', '60"', '84"'];

function selHtml(id, label, options, val) {
  /* Q55: the trapper's remembered customs ride with the base options, and
     every dropdown grows an Other… escape hatch (unless it has one). */
  var opts = mergeCustomOptions(id, options);
  if (!hasOtherOption(opts)) opts = opts.concat([OTHER_VALUE]);
  var h = '<label class="field" for="' + id + '">' + label + '</label>' +
    '<select id="' + id + '" data-has-other="1">';
  h += '<option value="">—</option>';
  for (var i = 0; i < opts.length; i++) {
    var ov = opts[i], ol = (ov === OTHER_VALUE) ? 'Other…' : ov;
    h += '<option value="' + esc(ov) + '"' + (val === ov ? ' selected' : '') + '>' + esc(ol) + '</option>';
  }
  return h + '</select>' + otherWrapHtml(id);
}
/* ---- Q39: manufacturer-first trap picker ----
   Flow: Manufacturer -> trap type -> size/model. Picking "Not sure / mixed
   brands" (value '') keeps today's full unfiltered lists and generic detail
   fields, so legacy sets and unsure trappers lose nothing. */
/* Gray out a select while it's showing its "e.g." hint (nothing picked yet). */
function paintSelectHint(sel) {
  if (!sel || !sel.classList) return;
  sel.classList.toggle('select-hint', !sel.value);
}
/* Populate the manufacturer select once (options live in trap-catalog.js). */
function renderMakerOptions() {
  var sel = $('sf-maker');
  if (!sel) return;
  var cur = sel.value; /* Q55: rebuild keeps the trapper's pick */
  var h = '<option value="">e.g. Bridger</option>';
  h += '<option value="__mixed">' + esc(MIXED_MAKER_LABEL) + '</option>';
  MAKER_ORDER.forEach(function (m) {
    var label = m + (TRAP_MAKERS[m].legacy ? ' (legacy)' : '');
    h += '<option value="' + esc(m) + '">' + esc(label) + '</option>';
  });
  /* Q55: the trapper's custom makers + the Other… escape hatch. */
  var seenMakers = {};
  MAKER_ORDER.forEach(function (m) { seenMakers[m.toLowerCase()] = 1; });
  customOptionsFor('sf-maker').forEach(function (m) {
    if (!seenMakers[m.toLowerCase()]) h += '<option value="' + esc(m) + '">' + esc(m) + '</option>';
  });
  h += '<option value="' + OTHER_VALUE + '">Other…</option>';
  sel.innerHTML = h;
  if (cur) sel.value = cur;
  sel.innerHTML = h;
  paintSelectHint(sel);
}
/* Type options for the picked maker. keepKey re-selects a picker type key
   when it exists in the new list. */
function renderTrapTypeOptions(maker, keepKey) {
  var sel = $('sf-type');
  var entry = maker && TRAP_MAKERS[maker];
  var keys = entry ? Object.keys(entry.types) : ALL_TRAP_TYPES.slice();
  /* Q57-B: the cascade keeps its "Other" escape hatch — the unfiltered list
     has one and no other dropdown loses options, so a picked maker must not
     strand the trapper without an out. Not stored in the catalog. */
  if (entry && keys.indexOf('Other') === -1) keys.push('Other');
  /* Q55: the trapper's custom types ride along so a remembered value reselects. */
  var seenTypes = {};
  keys.forEach(function (k) { seenTypes[k.toLowerCase()] = 1; });
  customOptionsFor('sf-type').forEach(function (t) {
    if (!seenTypes[t.toLowerCase()]) { keys.push(t); seenTypes[t.toLowerCase()] = 1; }
  });
  var cur = sel.value;
  var h = '<option value="">e.g. Foothold</option>';
  keys.forEach(function (k) { h += '<option value="' + esc(k) + '">' + esc(k) + '</option>'; });
  sel.innerHTML = h;
  if (keepKey && keys.indexOf(keepKey) >= 0) sel.value = keepKey;
  else if (keys.indexOf(cur) >= 0) sel.value = cur;
  paintSelectHint(sel);
}
/* Maker switched: try to keep the same stored trap type across the switch. */
function resolvedTrapType() {
  /* Q55: Other… resolves to the typed custom (remembered for reuse);
     blank Other → blank, never the literal "Other". */
  var sel = $('sf-type');
  var raw = sel ? sel.value : '';
  if (raw === 'Other' || raw === OTHER_VALUE) return { t: selVal('sf-type'), spring: '' };
  return resolveTrapType(raw);
}
function onMakerChange() {
  var maker = $('sf-maker') ? $('sf-maker').value : '';
  var before = resolvedTrapType();
  renderTrapTypeOptions(maker, '');
  if (maker && TRAP_MAKERS[maker]) {
    var types = TRAP_MAKERS[maker].types, found = '';
    for (var k in types) {
      var m = MAKER_TYPE_MAP[k];
      if (m && m.t === before.t && (!m.spring || !before.spring || m.spring === before.spring)) { found = k; break; }
    }
    if (found) $('sf-type').value = found;
  } else if (ALL_TRAP_TYPES.indexOf(before.t) >= 0) {
    $('sf-type').value = before.t;
  }
  paintSelectHint($('sf-maker'));
  renderTrapDetailFields();
}
/* Read the current dynamic trap-detail field values ('' when absent). */
function trapDetailValues() {
  var f = function (id) { var el = $(id); return el ? el.value : ''; };
  var modelSel = $('sf-trapmodel-select'), trapModel = '';
  if (modelSel) trapModel = modelSel.value === MODEL_CUSTOM ? f('sf-trapmodel').trim() : modelSel.value;
  else trapModel = f('sf-trapmodel').trim();
  var mv = trapModValues();
  return {
    /* Q55: Other-capable dropdowns resolve through selVal — typed customs
       save as the value and are remembered; blank Other saves as blank. */
    trapMaker: (function (m) { return m === '__mixed' ? '' : m; })(selVal('sf-maker')),
    trapSpring: selVal('sf-trapspring'), trapSize: selVal('sf-trapsize'),
    snareDia: selVal('sf-snaredia'), snareLock: selVal('sf-snarelock'), snareLen: selVal('sf-snarelen'),
    snarePurpose: selVal('sf-snarepurpose'),
    trapModel: trapModel, trapMods: mv.mods, panSize: mv.panSize, jawShape: mv.jawShape, jawClose: mv.jawClose
  };
}
/* Checked modification boxes + pan size + jaw shape from the mods section (raw values;
   top+bottom lamination is normalized to double-laminated at save time). */
function trapModValues() {
  var mods = [], panSize = '', jawShape = '', jawClose = '';
  if (document.querySelectorAll) {
    var boxes = document.querySelectorAll('.modchkbox');
    for (var i = 0; i < boxes.length; i++) if (boxes[i].checked) mods.push(boxes[i].value);
  }
  var pan = $('sf-pansize');
  /* Q55: resolves Other… → the typed custom (remembered), or '' when blank. */
  if (pan) { var psv = selVal('sf-pansize'); if (psv && psv !== 'Stock') panSize = psv; }
  var jaw = $('sf-jawshape');
  if (jaw) jawShape = selVal('sf-jawshape') || '';
  var jawc = $('sf-jawclose');
  if (jawc) jawClose = selVal('sf-jawclose') || '';
  return { mods: mods, panSize: panSize, jawShape: jawShape, jawClose: jawClose };
}
/* Optional Modifications section. `v` carries trapMods (array) + panSize + jawShape + jawClose.
   forceCheck lists custom mods to check immediately (just added). */
function renderModsHtml(t, v, forceCheck) {
  var pre = t === 'Foothold' ? FOOTHOLD_MODS : (t === 'Bodygrip / Conibear' ? BODYGRIP_MODS : []);
  var saved = v.trapMods || [];
  var checked = {};
  saved.forEach(function (m) {
    if (m === 'Double-laminated') { checked['Laminated top'] = 1; checked['Laminated bottom'] = 1; }
    else checked[m] = 1;
  });
  (forceCheck || []).forEach(function (m) { checked[m] = 1; });
  function box(val) {
    return '<label class="checkline modline"><input type="checkbox" class="modchkbox" value="' + esc(val) + '"' +
      (checked[val] ? ' checked' : '') + '> ' + esc(val) + '</label>';
  }
  var h = '<div class="mods-sect"><div class="mods-title">Modifications <span class="dim">— optional</span></div>' +
    '<div class="mods-hint">Work you did after buying the trap. Factory options are already in the model name above.</div>';
  if (t === 'Foothold') {
    /* Q55: pan size is an Other-capable dropdown like the rest. */
    var pv = v.panSize || 'Stock';
    var pans = mergeCustomOptions('sf-pansize', PAN_SIZES);
    if (!hasOtherOption(pans)) pans = pans.concat([OTHER_VALUE]);
    h += '<label class="field" for="sf-pansize">Pan size</label><select id="sf-pansize" data-has-other="1">';
    pans.forEach(function (p) {
      var pl = (p === OTHER_VALUE) ? 'Other…' : p;
      h += '<option value="' + esc(p) + '"' + (pv === p ? ' selected' : '') + '>' + esc(pl) + '</option>';
    });
    h += '</select>' + otherWrapHtml('sf-pansize');
    /* Q102 (2026-10-01): Tanner — round jaw vs square jaw, footholds only. */
    var jv = v.jawShape || '';
    h += '<label class="field" for="sf-jawshape">Jaw shape</label><select id="sf-jawshape">';
    h += '<option value="">Select…</option>';
    ['Round jaw', 'Square jaw'].forEach(function (j) {
      h += '<option value="' + j + '"' + (jv === j ? ' selected' : '') + '>' + j + '</option>';
    });
    h += '</select>';
    /* Tanner 2026-10-01 — jaw closure: offset vs closed, footholds only. */
    var jcv = v.jawClose || '';
    h += '<label class="field" for="sf-jawclose">Jaw closure</label><select id="sf-jawclose">';
    h += '<option value="">Select…</option>';
    ['Offset', 'Closed'].forEach(function (j) {
      h += '<option value="' + j + '"' + (jcv === j ? ' selected' : '') + '>' + j + '</option>';
    });
    h += '</select>';
  }
  h += '<div class="checkgrid">';
  pre.forEach(function (m) { h += box(m); });
  h += '</div>';
  var customs = getCustomMods().filter(function (c) { return pre.indexOf(c) < 0; });
  if (customs.length) {
    h += '<div class="mods-sub">Your Saved Mods</div><div class="checkgrid">';
    customs.forEach(function (m) { h += box(m); });
    h += '</div>';
  }
  h += '<div class="mod-addrow"><input type="text" id="sf-modcustom" placeholder="Add your own modification" autocomplete="off">' +
    '<button type="button" class="btn-ghost btn-small" id="sf-modadd">Add</button></div></div>';
  return h;
}
function bindModAdd() {
  var b = $('sf-modadd');
  if (!b) return;
  b.onclick = function () {
    var inp = $('sf-modcustom');
    var name = inp ? inp.value.trim() : '';
    if (!name) { toast('Type the modification first.'); return; }
    var added = addCustomMod(name);
    renderTrapDetailFields(null, [name]);
    if (!added) toast('Already in your mods list.');
  };
}
/* Render the subcategory inputs for the currently picked trap type. `saved`
   is a set (edit mode); otherwise current field values are preserved.
   forceCheck optionally checks just-added custom mods. */
function renderTrapDetailFields(saved, forceCheck) {
  var maker = $('sf-maker') ? $('sf-maker').value : '';
  var pickerType = $('sf-type').value;
  var rt = resolvedTrapType();
  var v = saved || trapDetailValues();
  var host = $('trapdetail-fields');
  var entry = maker && TRAP_MAKERS[maker];
  var models = (entry && entry.types[pickerType]) || null;
  var h = '';
  if (models) {
    /* Maker-filtered size/model list + an Other/custom escape hatch. */
    var mv = v.trapModel || '';
    var inList = models.indexOf(mv) >= 0;
    var selVal = mv ? (inList ? mv : MODEL_CUSTOM) : models[0];
    h += '<label class="field" for="sf-trapmodel-select">Size / model</label><select id="sf-trapmodel-select">';
    models.forEach(function (m) {
      h += '<option value="' + esc(m) + '"' + (selVal === m ? ' selected' : '') + '>' + esc(m) + '</option>';
    });
    h += '<option value="' + MODEL_CUSTOM + '"' + (selVal === MODEL_CUSTOM ? ' selected' : '') + '>Other / custom&hellip;</option></select>';
    var customText = inList ? '' : mv;
    h += '<div id="trapmodel-customwrap"' + (selVal === MODEL_CUSTOM ? '' : ' style="display:none"') + '>' +
      '<label class="field" for="sf-trapmodel">Custom size / model</label>' +
      '<input type="text" id="sf-trapmodel" placeholder="Describe it" autocomplete="off" value="' + esc(customText) + '">'
      + '<div class="suggest" id="sf-trapmodel-suggest"></div></div>';
  } else {
    /* Unfiltered path: today's generic detail fields for the trap type. */
    var cfg = TRAP_SUB[rt.t];
    if (cfg) {
      if (cfg.springs) {
        var spring = v.trapSpring || '';
        var ladder = cfg.sizes[spring] || [];
        var sizeVal = (ladder.indexOf(v.trapSize) >= 0 || v.trapSize === cfg.otherSize) ? v.trapSize : '';
        h += selHtml('sf-trapspring', 'Spring type', cfg.springs, spring);
        h += selHtml('sf-trapsize', 'Size', ladder.concat([cfg.otherSize]), sizeVal);
      } else if (cfg.sizes) {
        var sizeVal2 = (cfg.sizes.indexOf(v.trapSize) >= 0 || v.trapSize === cfg.otherSize) ? v.trapSize : '';
        h += selHtml('sf-trapsize', 'Size', cfg.sizes.concat([cfg.otherSize]), sizeVal2);
      }
      if (cfg.snare) {
        h += selHtml('sf-snaredia', 'Cable diameter', SNARE_DIAS.concat(['Other']), v.snareDia || '');
        h += selHtml('sf-snarelock', 'Lock type', SNARE_LOCKS.concat(['Other']), v.snareLock || '');
        h += selHtml('sf-snarelen', 'Cable length', SNARE_LENS.concat(['Other']), v.snareLen || '');
        /* Q56: kill vs live-hold. The setup decides, not the hardware. */
        h += selHtml('sf-snarepurpose', 'Snare purpose', ['Kill snare', 'Live-hold snare'], v.snarePurpose || '');
        h += '<div class="dim" style="text-align:center;margin:2px 0 6px">1/16&Prime; fox/bobcat &middot; 5/64&Prime; coyote &middot; 3/32&Prime; coyote/wolf &middot; live-hold = relaxing lock, swivels, breakaway</div>';
      }
      if (cfg.model) {
        h += '<label class="field" for="sf-trapmodel">Brand / model</label>' +
          '<input type="text" id="sf-trapmodel" placeholder="e.g. Bridger #1.75" autocomplete="off" value="' + esc(v.trapModel || '') + '">'
        + '<div class="suggest" id="sf-trapmodel-suggest"></div>';
      }
    }
  }
  h += renderModsHtml(rt.t, v, forceCheck);
  host.innerHTML = h;
  /* Q12: custom model text learns from use */
  if ($('sf-trapmodel')) attachSuggest('sf-trapmodel', 'sf-trapmodel-suggest', 'trapmodel');
  var msel = $('sf-trapmodel-select');
  if (msel) msel.onchange = function () {
    var w = $('trapmodel-customwrap');
    if (w) w.style.display = (msel.value === MODEL_CUSTOM) ? '' : 'none';
  };
  var springEl = $('sf-trapspring');
  if (springEl) springEl.onchange = function () { renderTrapDetailFields(); };
  bindModAdd();
}
/* One-line human summary of a set's trap details, for set detail + logs. */
function trapDetailSummary(s) {
  if (!s) return '';
  var parts = [];
  if (s.trapMaker) parts.push(s.trapMaker);
  if (s.trapType === 'Foothold') {
    if (s.trapSpring) parts.push(s.trapSpring);
    if (s.trapSize) parts.push(s.trapSize);
  } else if (s.trapType === 'Snare') {
    if (s.snarePurpose) parts.push(s.snarePurpose);
    if (s.snareDia) parts.push(s.snareDia + ' cable');
    if (s.snareLock) parts.push(s.snareLock + ' lock');
    if (s.snareLen) parts.push(s.snareLen);
  } else {
    if (s.trapSize) parts.push(s.trapSize);
  }
  if (s.trapModel) parts.push(s.trapModel);
  if (s.panSize) parts.push(s.panSize + ' pan');
  if (s.jawShape) parts.push(s.jawShape);
  if (s.jawClose) parts.push(s.jawClose + ' jaw');
  (s.trapMods || []).forEach(function (m) { parts.push(m); });
  return parts.join(' · ');
}
/* Clear detail fields that don't belong to the set's trap type, so a type
   switch can't leave stale values behind. */
function normalizeTrapDetail(s) {
  var t = s.trapType;
  if (t === 'Foothold') { s.snareDia = s.snareLock = s.snareLen = s.snarePurpose = ''; }
  else if (t === 'Snare') { s.trapSpring = s.trapSize = s.trapModel = ''; }
  else if (t === 'Bodygrip / Conibear' || t === 'Cage live trap' || t === 'Colony trap' || t === 'Bear trap') {
    s.trapSpring = s.snareDia = s.snareLock = s.snareLen = s.snarePurpose = '';
  } else { s.trapSpring = s.trapSize = s.snareDia = s.snareLock = s.snareLen = s.snarePurpose = ''; }
}

/* ================= 6. MAP ================= */
var map = null, markersLayer = null, gpsMarker = null, gpsCircle = null, dropPinMode = false;
var lastFix = null;
var lastStateInfo = null; /* last reverse-geocode result, so the state-mismatch
  alert can be re-checked after a trapping-state change (Tanner 2026-09-30) */

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
  var b = STATE_BOUNDS[activeStateCode()];
  if (b) map.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: [16, 16] });
}

function initMap() {
  if (map) { setTimeout(function () { map.invalidateSize(); }, 100); return; }
  if (typeof L === 'undefined') {
    $('map').innerHTML = '<div class="empty"><div class="big">🗺</div>The map library could not load.<br>Check your connection and reopen.</div>';
    return;
  }
  map = L.map('map', { zoomControl: false, attributionControl: true, maxZoom: 22 }).setView([39.5, -98.35], 4);
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
  /* Q74 (2026-10-01): Tanner — left-side stack is layers, zoom, weather, top
     to bottom. Leaflet stacks same-corner controls in add order. The weather
     chip joins as a real control so it rides the stack instead of floating. */
  /* Q148 (2026-10-06): Tanner — the stock L.control.layers tap toggle is
     unreliable on iOS Safari (its expand/collapse handshake can open-then-
     instantly-close, so taps appear to do nothing). Replaced with an explicit
     tap-to-cycle button: Satellite → Street → Topo → Satellite. One tap,
     one layer, no panel, no hover-dependent behavior. */
  /* Q155 (2026-10-06): Tanner — the tap-cycle button's text label is
     unreadable (truncated "SATE" behind the button). Drop the text entirely:
     the button becomes an icon that changes per active view — satellite
     glyph on Satellite, road-map glyph on Street, mountain/topo glyph on
     Topo. Tap-cycle behavior unchanged. */
  var baseLayers = [
    { name: 'Satellite', layer: satL, icon: '🛰️' },
    { name: 'Street', layer: streetL, icon: '🗺️' },
    { name: 'Topo', layer: topoL, icon: '⛰️' }
  ];
  var baseIdx = 0; /* satL is already on the map */
  var layerCtl = L.control({ position: 'bottomleft' });
  layerCtl.onAdd = function () {
    var el = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
    el.innerHTML = '<a class="leaflet-control-layers-toggle layer-cycle" href="#" role="button" title="Map style" aria-label="Change map style"></a>';
    var link = el.firstChild;
    L.DomEvent.disableClickPropagation(el);
    function paint() {
      link.textContent = baseLayers[baseIdx].icon;
      link.setAttribute('aria-label', 'Map style: ' + baseLayers[baseIdx].name + '. Tap to change.');
    }
    paint();
    L.DomEvent.on(link, 'click', function (e) {
      L.DomEvent.preventDefault(e);
      L.DomEvent.stopPropagation(e);
      map.removeLayer(baseLayers[baseIdx].layer);
      baseIdx = (baseIdx + 1) % baseLayers.length;
      map.addLayer(baseLayers[baseIdx].layer);
      paint();
    });
    return el;
  };
  layerCtl.addTo(map);
  L.control.zoom({ position: 'bottomleft' }).addTo(map);
  var wxCtl = L.control({ position: 'bottomleft' });
  wxCtl.onAdd = function () { return $('weather-chip'); };
  wxCtl.addTo(map);
  markersLayer = L.layerGroup().addTo(map);

  map.on('click', function (e) {
    if (homePickMode && homeMapLive) {
      placeHomePin(e.latlng);
    } else if (dropPinMode) {
      startPlacePin(e.latlng);
    }
  });
  map.on('zoomend', function () { refreshMarkers(); }); /* Q17: wind arrows are zoom-gated */
  refreshMarkers();
  fitMapHome(); /* Q53: home ground wins on launch, else trapping state */
  if (DEMO_ACTIVE) {
    /* frame the fictional trapline and blur the tiles for screenshots */
    map.fitBounds([[41.700, -95.400], [41.740, -95.360]], { padding: [30, 30] });
    var tp = document.querySelector('.leaflet-tile-pane');
    if (tp) tp.style.filter = 'blur(7px)';
  }
}

/* Q17: wind arrows on pins -------------------------------------------
   Arrows point DOWNWIND (where scent goes), from live Open-Meteo current
   wind per pin, throttled to one bulk refresh per 15 minutes. Offline or
   stale pins fall back to the wind snapshot saved at set creation. */
var windCache = {};
var windFetchAt = 0;
var WIND_STALE_MS = 15 * 60 * 1000;
var WIND_ZOOM_MIN = 14;
function windArrowsOn() { return Store.data.windArrowsOn !== false; }
function pinWind(set) {
  var c = windCache[set.id];
  if (c && typeof c.dir === 'number') return c;
  var w = set.weather;
  if (w && typeof w.windDir === 'number') return { dir: w.windDir, speed: w.windSpeed, at: w.at || 0, stale: true };
  return null;
}
function freshPinWind(set) {
  /* Q17 follow-up: the wind the trapper was looking at on the pin — fresh
     arrow cache only, so a logged catch records what they saw. */
  if (!windArrowsOn()) return null;
  var c = windCache[set.id];
  if (c && typeof c.dir === 'number' && Date.now() - c.at < WIND_STALE_MS) return c;
  return null;
}
function stampLogWeather(s, log) {
  if (!s) return;
  var seen = freshPinWind(s);
  fetchWeather(s.lat, s.lng, function (w) {
    if (!w) return;
    if (seen) { w.windSpeed = seen.speed; w.windDir = seen.dir; }
    log.weather = w; Store.save();
  });
}
function windArrowHtml(set) {
  if (!windArrowsOn()) return '';
  if (!map || map.getZoom() < WIND_ZOOM_MIN) return '';
  var w = pinWind(set);
  if (!w) return '';
  var downwind = Math.round((w.dir + 180) % 360);
  return '<div class="wind-arrow' + (w.stale ? ' stale' : '') + '" style="transform:rotate(' + downwind + 'deg)" aria-hidden="true"><i>&#9650;</i></div>';
}
function refreshPinWinds() {
  if (!windArrowsOn()) return;
  var now = Date.now();
  if (now - windFetchAt < WIND_STALE_MS) return;
  windFetchAt = now;
  var groups = {};
  activeSets().forEach(function (s) {
    if (typeof s.lat !== 'number' || typeof s.lng !== 'number') return;
    var cached = windCache[s.id];
    if (cached && now - cached.at < WIND_STALE_MS) return;
    var key = s.lat.toFixed(2) + ',' + s.lng.toFixed(2);
    (groups[key] = groups[key] || { lat: s.lat, lng: s.lng, ids: [] }).ids.push(s.id);
  });
  var keys = Object.keys(groups);
  if (!keys.length) return;
  var pending = keys.length, changed = false;
  keys.forEach(function (key) {
    var g = groups[key];
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + g.lat.toFixed(4) + '&longitude=' + g.lng.toFixed(4) +
      '&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=mph&timezone=auto';
    var done = false;
    function finish(w) {
      if (done) return; done = true;
      if (w) { g.ids.forEach(function (id) { windCache[id] = w; }); changed = true; }
      if (--pending === 0 && changed) refreshMarkers();
    }
    try {
      fetch(url).then(function (r) { return r.json(); }).then(function (j) {
        var c = j && j.current;
        finish(c ? { dir: c.wind_direction_10m, speed: c.wind_speed_10m, at: Date.now() } : null);
      }).catch(function () { finish(null); });
    } catch (e) { finish(null); }
    setTimeout(function () { finish(null); }, 8000);
  });
}

function setIcon(set) {
  /* Q68: an overdue check turns the pin red, whatever the status color was. */
  var pinCls = isCheckOverdue(set) ? 'pin-overdue' : 'pin-' + esc(normStatus(set.status));
  return L.divIcon({
    className: '',
    html: '<div class="pin ' + pinCls + '">' + windArrowHtml(set) + '</div>',
    iconSize: [30, 30], iconAnchor: [15, 15]
  });
}

function refreshMarkers() {
  if (!map || !markersLayer) return;
  markersLayer.clearLayers();
  activeSets().forEach(function (s) {
    if (!mapStatusFilter[normStatus(s.status)]) return;
    var m = L.marker([s.lat, s.lng], { icon: setIcon(s), title: s.name });
    /* B15: no opening set details mid-placement — finish the pin first. */
    m.on('click', function () { if (document.body.classList.contains('placing')) return; openSetOrStack(s.id); });
    m._setId = s.id;
    markersLayer.addLayer(m);
  });
  refreshPinWinds();
}

function setDropPinMode(on) {
  dropPinMode = on;
  if (on) { cancelPlacePin(); cancelHomePick(); } /* Q53: one picking mode at a time */
  $('pin-hint').classList.toggle('show', on);
  $('btn-drop-pin').classList.toggle('active-mode', on);
  /* B15-fix: the placement lock starts the moment placement is ARMED, not
     after the pin drops. The drop-pin button stays live so an armed
     placement can still be cancelled. */
  setPlacingLock(on);
}

/* Draggable placement pin: GPS gets you close, your finger dials it in. */
var placeMarker = null;
/* B15: pin placement locks the rest of the app until the pin is confirmed or
   cancelled — you finish this decision before doing anything else. */
function setPlacingLock(on) {
  document.body.classList.toggle('placing', !!on);
}
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
  setPlacingLock(true);
}
function cancelPlacePin() {
  if (placeMarker && map) { try { map.removeLayer(placeMarker); } catch (e) {} placeMarker = null; }
  var bar = $('place-bar'); if (bar) bar.classList.remove('show');
  setPlacingLock(false);
}

/* ================= Q53. HOME GROUND =================
   One home location PER TRAP LINE: the map opens on the active line's home
   on launch, and switching lines shows that line's home. A trapper can have
   home grounds in four different spots across the country on four lines.
   Asked exactly once per line — during first-run onboarding (attaches to
   the first line), once on the next launch for existing users (current
   line), and once when a new line is created. Normal pin dropping never
   asks about home. */
var HOME_ZOOM = 13; /* Q92 (2026-10-01): Tanner — tighter default, ~2-4 mile span matching his screenshot */
var homePickMode = false, homeMarker = null, homeMapLive = false;

function homeLatLng() {
  var l = activeLine(), h = l && l.home;
  if (h && isFinite(+h.lat) && isFinite(+h.lng)) return { lat: +h.lat, lng: +h.lng };
  return null;
}
/* Q107: the most recently created line that already has a home. When a brand-new
   line has no home of its own, the home picker starts here instead of the bare
   state center (Iowa's sits near Nevada — the town, which is why Tanner once
   landed clear over there). */
function lastKnownHome() {
  var lines = (Store.data && Store.data.lines) || [];
  for (var i = lines.length - 1; i >= 0; i--) {
    var h = lines[i] && lines[i].home;
    if (h && isFinite(+h.lat) && isFinite(+h.lng)) return { lat: +h.lat, lng: +h.lng };
  }
  return null;
}
function normalizeHome(d) {
  /* Migrate the short-lived global home (never released) onto the first line. */
  var gHome = null, gAsked = false;
  if (d.home && isFinite(+d.home.lat) && isFinite(+d.home.lng)) gHome = { lat: +d.home.lat, lng: +d.home.lng };
  if (d.homeAsked === true) gAsked = true;
  delete d.home; delete d.homeAsked;
  (d.lines || []).forEach(function (ln, i) {
    if (!ln || typeof ln !== 'object') return;
    if (!ln.home || !isFinite(+ln.home.lat) || !isFinite(+ln.home.lng)) ln.home = null;
    else ln.home = { lat: +ln.home.lat, lng: +ln.home.lng };
    if (typeof ln.homeAsked !== 'boolean') ln.homeAsked = false;
    if (i === 0 && gHome && !ln.home) ln.home = gHome;
    if (i === 0 && gAsked) ln.homeAsked = true;
  });
}
function fitMapHome() {
  if (!map || typeof L === 'undefined') return;
  /* 2026-09-29 (B13): the home/place bars change the map container's height,
     but Leaflet caches its size — a setView right after the bar shows/hides
     centers on the STALE size, so the point renders high (bar just hid) or
     low (bar just showed). Re-measure first. */
  map.invalidateSize();
  var h = homeLatLng();
  if (h) map.setView([h.lat, h.lng], HOME_ZOOM);
  else fitMapToState();
}
function saveHome(lat, lng) {
  var l = activeLine();
  if (!l) return;
  l.home = { lat: +lat, lng: +lng };
  l.homeAsked = true;
  Store.save();
  renderSettingsHome();
}
function homeIcon() {
  /* Tanner 2026-10-01: bigger home pin, app green — easy to see and drag. */
  return L.divIcon({ className: '', html: '<div class="pin pin-home">🏠</div>', iconSize: [52, 52], iconAnchor: [26, 26] });
}
function startHomePick() {
  if (!map) { toast('Open the map first.'); return; }
  var l0 = activeLine();
  if (l0) { l0.homeAsked = true; Store.save(); } /* asked once per line — Settings re-opens it */
  setDropPinMode(false); cancelPlacePin();
  homePickMode = true; homeMapLive = true;
  /* Tanner 2026-10-01: no A/B choice — the GPS button duplicated the previous
     screen. Straight to pin drop: tap the map, drag the pin, tap OK. */
  $('home-bar').classList.add('show');
  $('home-bar-prompt').textContent = 'Tap the map to drop your home pin, then drag it onto the exact spot.';
  $('btn-home-ok').hidden = true;
  setPlacingLock(true); /* B15: same modal lock as pin placement */
  /* B13: bar just changed the map height — re-measure before centering. */
  map.invalidateSize();
  /* Q107: new line borrows another line's home as the starting point.
     Borrowed home opens two zooms wider — familiar country, not a backyard.
     Math.min: a tighter view zooms out to the target, a wider view stays —
     the picker must never force a zoom-in. */
  var h = homeLatLng(), borrowed = false;
  if (!h) { h = lastKnownHome(); borrowed = true; }
  if (h) map.setView([h.lat, h.lng], Math.min(map.getZoom(), borrowed ? HOME_ZOOM - 2 : HOME_ZOOM));
}
function cancelHomePick() {
  homePickMode = false; homeMapLive = false;
  if (homeMarker && map) { try { map.removeLayer(homeMarker); } catch (e) {} homeMarker = null; }
  var bar = $('home-bar'); if (bar) bar.classList.remove('show');
  setPlacingLock(false);
}
function placeHomePin(latlng) {
  if (!map) return;
  if (homeMarker) { try { map.removeLayer(homeMarker); } catch (e) {} }
  homeMarker = L.marker(latlng, { draggable: true, icon: homeIcon() }).addTo(map);
  map.panTo(latlng);
  $('btn-home-ok').hidden = false;
}
function confirmHomePin() {
  if (!homeMarker) { toast('Drop the pin on your home ground first.'); return; }
  var ll = homeMarker.getLatLng();
  confirmModal('Is this where you want your home location?',
    'The map will open here every time you launch the app. You can change it anytime in Settings.',
    'Set home', function () {
      saveHome(ll.lat, ll.lng);
      cancelHomePick();
      fitMapHome();
      toast('Home ground set.');
    });
}
/* Shared "use my GPS" path for the onboarding card, the picker bar, and the
   one-time prompt. Calls done() after a successful save. */
function homeUseGps(done) {
  if (!('geolocation' in navigator)) { toast("This device has no GPS — choose on the map instead."); return; }
  toast('Getting your location…');
  navigator.geolocation.getCurrentPosition(function (pos) {
    saveHome(pos.coords.latitude, pos.coords.longitude);
    toast('Home ground set.');
    if (done) done();
  }, function () {
    toast('Location unavailable — choose on the map instead.');
  }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
}
function renderSettingsHome() {
  var el = $('settings-home-status');
  if (!el) return;
  el.textContent = homeLatLng() ? 'Set — the map opens here on launch.' : 'Not set — the map opens on your trapping state.';
}
/* Q53: per-line homes, keyed by line id, for the JSON backup. */
function homeByLineMap() {
  var out = {};
  (Store.data.lines || []).forEach(function (ln) {
    if (ln && ln.home && isFinite(+ln.home.lat) && isFinite(+ln.home.lng)) {
      out[ln.id] = { lat: +ln.home.lat, lng: +ln.home.lng };
    }
  });
  return out;
}
/* Q53: restore homes onto matching lines; a restored home counts as "asked". */
function applyImportedHomes(data) {
  if (!data || typeof data !== 'object') return;
  var homes = data.homes;
  if (homes && typeof homes === 'object') {
    Object.keys(homes).forEach(function (lid) {
      var hh = homes[lid], ln = lineById(Store.data, lid);
      if (ln && hh && isFinite(+hh.lat) && isFinite(+hh.lng)) {
        ln.home = { lat: +hh.lat, lng: +hh.lng };
        ln.homeAsked = true;
      }
    });
    return;
  }
  /* Legacy: the short-lived global home shape (never released). */
  if (data.home && isFinite(+data.home.lat) && isFinite(+data.home.lng)) {
    var al = activeLine();
    if (al) { al.home = { lat: +data.home.lat, lng: +data.home.lng }; al.homeAsked = true; }
  }
}

var locateWatch = null, locateTimer = null;
var locateState = 'idle'; /* idle | acquiring | following | paused */
var followLastPan = 0;
var followWatchdog = null, lastFollowFixAt = 0, staleDropCount = 0;

function stopLocateWatch() {
  if (locateWatch !== null) { try { navigator.geolocation.clearWatch(locateWatch); } catch (e) {} locateWatch = null; }
  if (locateTimer) { clearTimeout(locateTimer); locateTimer = null; }
}

function disarmFollowWatchdog() {
  if (followWatchdog) { clearTimeout(followWatchdog); followWatchdog = null; }
}

function startFollowWatch() {
  if (locateWatch !== null) { try { navigator.geolocation.clearWatch(locateWatch); } catch (e) {} locateWatch = null; }
  try {
    locateWatch = navigator.geolocation.watchPosition(onFollowFix, onFollowError,
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
  } catch (e) { /* watch failed — the watchdog will retry */ }
}

/* If no fresh fix arrives for ~40 s (iOS kills watchPosition after screen
   lock / backgrounding), tear down and restart the watch automatically. */
function armFollowWatchdog() {
  disarmFollowWatchdog();
  followWatchdog = setTimeout(function () {
    if (locateState === 'following' || locateState === 'paused') {
      restartFollowWatch(); /* silent self-heal: no toast — the nag annoyed Tanner */
    }
  }, 40000);
}

function restartFollowWatch(msg) {
  if (locateState !== 'following' && locateState !== 'paused') return;
  disarmFollowWatchdog();
  startFollowWatch();
  lastFollowFixAt = Date.now();
  armFollowWatchdog();
  if (msg) toast(msg);
}

/* Dragging the map pauses follow — the user has taken the wheel. The watch
   keeps running so the dot stays live; tap the crosshair to resume. */
function hookFollowDrag() {
  if (map && !map._followDragHooked) {
    map._followDragHooked = true;
    map.on('dragstart', function () { if (locateState === 'following') pauseFollow(); });
  }
}

function pauseFollow() {
  if (locateState !== 'following') return;
  locateState = 'paused';
  var b = $('btn-locate'); if (b) b.classList.add('paused-mode');
  /* BQ3: silent pause — no toast. The button's paused state shows it. */
}

/* Only called on location permission denial — there is no manual off. */
function stopFollow(silent) {
  disarmFollowWatchdog();
  stopLocateWatch();
  locateState = 'idle';
  var b = $('btn-locate'); if (b) b.classList.remove('active-mode', 'paused-mode');
  if (lastFix) lastFix.at = 0; /* next tap takes a fresh fix, not follow */
  if (!silent) toast('Follow off.');
}

/* Enter follow mode: one tap on the crosshair gets you here, and follow
   stays on from this point. */
function enterFollow() {
  hookFollowDrag();
  locateState = 'following';
  var b = $('btn-locate');
  if (b) { b.classList.add('active-mode'); b.classList.remove('paused-mode'); }
  followLastPan = 0; staleDropCount = 0;
  lastFollowFixAt = Date.now();
  startFollowWatch();
  armFollowWatchdog();
  if (map && lastFix && lastFix.lat != null) map.panTo([lastFix.lat, lastFix.lng], { animate: false });
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
      /* BQ2: one crosshair tap always ends zoomed tight (19) — no
         accuracy-based wide zoom that forces a second tap. */
      map.setView([fix.lat, fix.lng], 19, { animate: false });
    }
  }
  if (final) {
    /* Q70: the routine "Located" confirmation stays silent — follow-mode GPS
       shouldn't chatter. Only a coarse fix earns a word. */
    if (fix.acc > 50) toast('Coarse fix (±' + fix.acc + ' m) — step into the open, or check Precise Location for Safari.');
    reverseGeocode(fix.lat, fix.lng).then(function (info) {
      setCountyBanner(info);
      checkStateMismatch(info);
      if (!info.county) toast('Located — county lookup failed. You are responsible for knowing your county.');
    });
  }
}

/* One fresh fix from the follow-mode watch: move the dot on every fix, and
   recenter the map only once the dot drifts out of the inner view — no glide
   animation, so the map tracks instead of lagging behind. While paused
   (user dragged the map) the dot still updates but the map is left alone.
   Stale fixes are counted and announced instead of freezing silently.
   Transient GPS errors never kill follow; only a permission denial does. */
function onFollowFix(pos) {
  var c = pos.coords || {};
  if (typeof c.latitude !== 'number' || typeof c.longitude !== 'number') return;
  var ageMs = Date.now() - (pos.timestamp || 0);
  if (ageMs > 30000 || ageMs < 0) {
    /* stale cached fix — ignore it, but say so instead of freezing silently */
    staleDropCount++;
    if (staleDropCount === 3) toast('GPS fix is stale — showing last known position.');
    return;
  }
  staleDropCount = 0;
  lastFollowFixAt = Date.now();
  armFollowWatchdog();
  var acc = (typeof c.accuracy === 'number' && isFinite(c.accuracy)) ? Math.round(c.accuracy) : 9999;
  drawFix({ lat: c.latitude, lng: c.longitude, acc: acc }, false);
  maybeRetryCountyBanner(c.latitude, c.longitude); /* Q96: heal a missed county lookup */
  if (map && locateState === 'following') {
    var pt = map.latLngToContainerPoint([c.latitude, c.longitude]);
    var size = map.getSize();
    if (Math.abs(pt.x - size.x / 2) > size.x * 0.28 ||
        Math.abs(pt.y - size.y / 2) > size.y * 0.28) {
      map.panTo([c.latitude, c.longitude], { animate: false });
    }
  }
}
function onFollowError(err) {
  if (locateState !== 'following' && locateState !== 'paused') return;
  if (err && err.code === 1) {
    stopFollow(true);
    toast('Location permission denied — follow stopped.');
    return;
  }
  /* iOS fires transient timeouts under tree cover and in dips — ride them
     out silently (Q70: no routine GPS chatter); only a denial ends follow. */
}

/* Field-grade locate: watch the GPS for up to 45 seconds (a cold iPhone radio
   often needs 30-60 s for its first high-accuracy fix — 20 s was giving up
   early), throw away stale cached fixes, and settle on the most accurate
   fresh fix. Transient errors while the radio warms up are ignored; only a
   permission denial ends the attempt early. */
function startAcquire() {
  locateState = 'acquiring';
  var best = null, finished = false;
  /* Q70: acquire runs silent — the dot moves, no progress chatter.
     Denial and no-fix still speak up below. */
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
    }
  }

  function finish() {
    if (finished) return;
    finished = true;
    stopLocateWatch();
    if (!best) { locateState = 'idle'; toast('No fresh GPS fix — move into open sky and try again.'); return; }
    drawFix(best, true);
    enterFollow(); /* one tap = acquire + follow, automatically */
  }

  locateTimer = setTimeout(finish, 45000);
  try {
    locateWatch = navigator.geolocation.watchPosition(function (pos) {
      consider(pos);
      if (best && best.acc <= 8) finish(); /* good enough — stop early */
    }, function (err) {
      /* transient iOS timeouts while the radio warms up are normal — keep
       * waiting; only a permission denial ends the attempt early. */
      if (err && err.code === 1 && !best && !finished) {
        finished = true; stopLocateWatch(); locateState = 'idle';
        toast('Location permission denied. Allow it in Settings and try again.');
      }
    }, { enableHighAccuracy: true, timeout: 45000, maximumAge: 0 });
  } catch (e) { finish(); }
}

/* Crosshair tap centers on the fix AND zooms in when the view is wide —
   an explicit locate tap should put you on yourself, not just pan. */
/* B22: every crosshair tap ends zoomed in tight on the latest fix —
   no conditional half-zoom. Q70: tighter than 18 — the recenter puts you
   right on yourself at working zoom. */
function centerOnFix() {
  if (!map || !lastFix || lastFix.lat == null) return;
  map.setView([lastFix.lat, lastFix.lng], 19, { animate: false });
}

/* ◎ button: one tap acquires and follows — follow stays on from that point,
   there is no manual off. Dragging the map pauses; tap the crosshair to
   re-center and resume. */
function locateMe() {
  if (!('geolocation' in navigator)) { toast('This device has no GPS.'); return; }
  if (locateState === 'following') {
    centerOnFix();
    return;
  }
  if (locateState === 'paused') {
    locateState = 'following';
    var b = $('btn-locate'); if (b) b.classList.remove('paused-mode');
    centerOnFix();
    toast('Following you.');
    return;
  }
  if (locateState === 'acquiring') {
    stopLocateWatch(); locateState = 'idle'; toast('Cancelled.'); return;
  }
  if (lastFix && (Date.now() - (lastFix.at || 0) < 120000)) {
    centerOnFix();
    enterFollow();
    toast('Following you.');
    return;
  }
  startAcquire();
}

/* ================= 7. SETS ================= */
var editingSetId = null, pendingCoords = null, pendingSetPhotos = [], editSetPhotos = [];
var setMissingReason = null;

/* Q36: why a set went missing. Structured field on the set (set.missingReason);
   set.missingDetail holds the confiscation details prompt answer. */
var MISSING_REASONS = [
  { v: 'stolen', label: 'Stolen' },
  { v: 'mother-nature', label: 'Mother Nature' },
  { v: 'cant-locate', label: "Can't locate" },
  { v: 'removed', label: 'Removed' },
  { v: 'confiscated', label: 'Confiscated' }
];
function missingReasonLabel(v) {
  for (var i = 0; i < MISSING_REASONS.length; i++) if (MISSING_REASONS[i].v === v) return MISSING_REASONS[i].label;
  return '';
}
/* Set-form status buttons: highlight the button matching the hidden value. */
function syncStatusSeg() {
  var v = $('sf-status') ? $('sf-status').value : 'active';
  var btns = document.querySelectorAll('#sf-status-seg button');
  for (var i = 0; i < btns.length; i++) {
    btns[i].classList.toggle('selected', btns[i].getAttribute('data-st') === v);
  }
}
/* Wire the status buttons once: tap sets the hidden sf-status value,
   highlights the button, refreshes the missing-reason row. */
function wireStatusSeg() {
  var stBtns = document.querySelectorAll('#sf-status-seg button');
  for (var stb = 0; stb < stBtns.length; stb++) {
    stBtns[stb].onclick = (function (b) {
      return function () {
        $('sf-status').value = b.getAttribute('data-st');
        hideSetFormError();
        syncStatusSeg();
        renderMissingReasonRow();
      };
    })(stBtns[stb]);
  }
}
/* Q36: show/hide the "Why missing" row on the set form; the confiscation
   details box only appears when Confiscated is picked. */
function renderMissingReasonRow() {
  var wrap = $('setfield-missing');
  if (!wrap) return;
  var isMissing = $('sf-status').value === 'missing';
  wrap.hidden = !isMissing;
  if (!isMissing) return;
  var btns = document.querySelectorAll('#sf-missing-reason button');
  for (var i = 0; i < btns.length; i++) {
    btns[i].classList.toggle('selected', btns[i].getAttribute('data-mr') === setMissingReason);
  }
  $('sf-missing-detail-wrap').hidden = (setMissingReason !== 'confiscated');
}

/* Q33/Q32: sponsor package. Sponsors pay for enhanced presentation, never
   exclusivity — free-text entry stays open to everyone and the product list
   itself is never pay-to-play. Badge in the bait section; tap opens the bio. */
var SPONSORS = [
  { id: 'awesome-opossum', name: 'Awesome Opossum', product: 'Awesome Opossum raccoon bait',
    section: 'bait', badge: 'assets/sponsors/awesome-opossum.webp',
    brandLogo: 'assets/sponsors/awesome-opossum.webp', /* product and brand are one here; future sponsors can differ */
    bio: 'Awesome Opossum was developed as a raccoon bait with a sweet and musky scent. Originally it was effective on most nest predators, but ended up catching more opossums than anything.',
    url: 'https://opossumfoot.com', urlLabel: 'opossumfoot.com' }
];
function sponsorById(id) {
  for (var i = 0; i < SPONSORS.length; i++) if (SPONSORS[i].id === id) return SPONSORS[i];
  return null;
}
/* Scorecard sponsor chips: match a ranked attractant name to a sponsor's
   product (normalized). The chip never affects the rank — it only marks
   products whose maker sponsors the app. */
function sponsorForProduct(name) {
  var n = String(name == null ? '' : name).toLowerCase().trim();
  if (!n) return null;
  for (var i = 0; i < SPONSORS.length; i++) {
    var sp = SPONSORS[i];
    if (String(sp.product == null ? '' : sp.product).toLowerCase().trim() === n) return sp;
  }
  return null;
}
/* Q67: the old standalone sponsor badge row under the Bait field is gone —
   sponsors live inside the suggestion menus now (see sponsorSuggests). */
/* Q32: tap-for-bio — name, short bio, link to website/place of sale. */
function openSponsorBio(id) {
  var sp = sponsorById(id);
  if (!sp) return;
  var logo = sp.brandLogo || sp.badge; /* bio shows the brand logo; picker row shows the product badge */
  showModal('<div class="sponsor-bio">' +
    '<img class="sponsor-bio-badge" src="' + logo + '" alt="' + esc(sp.name) + ' logo">' +
    '<h3>' + esc(sp.name) + '</h3>' +
    '<p>' + esc(sp.bio) + '</p>' +
    '<div class="btn-row" style="justify-content:center"><a class="btn-small btn-secondary" href="' + sp.url +
    '" target="_blank" rel="noopener">Visit ' + esc(sp.urlLabel) + '</a></div>' +
    '<div class="btn-row" style="margin-top:10px;justify-content:center">' +
    '<button class="btn-primary" id="m-sp-use" type="button">Use this bait</button>' +
    '<button class="btn-secondary" id="m-close" type="button">Close</button></div></div>');
  $('m-close').onclick = closeModal;
  $('m-sp-use').onclick = function () { renderAttrRows('bait', [sp.name].concat(collectAttrRows('bait'))); closeModal(); };
}

function openSetForm(coords, setId) {
  editingSetId = setId || null;
  pendingCoords = coords || null;
  var s = setId ? getSet(setId) : null;
  /* Carry-forward: a new set starts as a copy of the last set on this line —
     same rig, next number. Name still gets the smart number; status/date stay fresh. */
  var tmpl = s ? null : lastSetOnLine();
  /* Q162 (2026-10-06): Tanner — a field toggled off in Settings carries
     nothing forward: the new set starts blank there even when the last set
     had a value. Edit mode is untouched (it shows the set's real data). */
  if (tmpl) tmpl = carryTemplate(tmpl);
  $('setform-title').textContent = s ? 'Edit Set' : 'New Set';
  $('sf-name').value = s ? s.name : nextSetName();
  $('sf-name').placeholder = s ? '' : 'e.g. Creek crossing';
  renderMakerOptions();
  $('sf-maker').value = s ? (s.trapMaker || '__mixed') : (tmpl ? (tmpl.trapMaker || '__mixed') : '');
  var pk = (s && s.trapMaker) ? pickerTypeFor(s.trapMaker, s.trapType, s.trapSpring, s.trapModel)
    : (s ? (s.trapType || '') : (tmpl ? pickerTypeFor(tmpl.trapMaker, tmpl.trapType, tmpl.trapSpring, tmpl.trapModel) : ''));
  renderTrapTypeOptions($('sf-maker').value, pk);
  paintSelectHint($('sf-maker'));
  $('sf-type').onchange = function () { renderTrapDetailFields(); paintSelectHint(this); };
  $('sf-maker').onchange = onMakerChange;
  renderTrapDetailFields(s || tmpl || null);
  renderSetTypeOptions(); /* Q29: rebuild taxonomy each open so legacy values reset */
  var stv = s ? (s.setType || 'Dirt hole') : (tmpl && tmpl.setType ? tmpl.setType : 'Dirt hole');
  if (stv === 'Other') {
    /* Q55: a legacy literal Other becomes the Other… escape hatch with the
       "What is it?" box revealed, ready to be typed for real. */
    $('sf-settype').value = OTHER_VALUE;
  } else {
    ensureSetTypeOption(stv); /* Q29: legacy values ("Drowning set", "Trail / blind set") ride along */
    $('sf-settype').value = stv;
  }
  /* Q55: reveal any "What is it?" boxes whose dropdown opened on Other. */
  ['sf-maker', 'sf-type', 'sf-settype', 'sf-trapspring', 'sf-trapsize', 'sf-snaredia',
   'sf-snarelock', 'sf-snarelen', 'sf-snarepurpose', 'sf-pansize'].forEach(function (id) {
    toggleOtherWrap($(id));
  });
  /* Q26: stacked attractant rows, one per value */
  renderAttrRows('bait', s ? s.bait : (tmpl ? tmpl.bait : []));
  renderAttrRows('lure', s ? s.lure : (tmpl ? tmpl.lure : []));
  renderAttrRows('urine', s ? s.urine : (tmpl ? tmpl.urine : []));
  renderAttrRows('visual', s ? s.visual : (tmpl ? tmpl.visual : []));
  renderAttrRows('audio', s ? s.audio : (tmpl ? tmpl.audio : []));
  renderAttrRows('other', s ? s.other : (tmpl ? tmpl.other : []));
  $('sf-status').value = s ? normStatus(s.status) : 'active';
  syncStatusSeg(); /* status buttons mirror the stored value */
  $('sf-date').value = s ? s.dateSet : todayISO();
  updateDateDOW('sf-date', 'sf-date-dow');
  /* Q36: preselect the stored missing reason when editing a Missing set */
  setMissingReason = (s && normStatus(s.status) === 'missing') ? (s.missingReason || null) : null;
  $('sf-missing-detail').value = (s && s.missingDetail) || '';
  var mps = $('sf-missing-photos'); if (mps) mps.innerHTML = '';
  renderMissingReasonRow();
  $('sf-notes').value = s ? (s.notes || '') : '';
  $('voice-setnotes-preview').classList.remove('show');
  $('voice-setnotes-preview').innerHTML = '';
  /* Q71: edit mode keeps full photo + memo control on the form itself —
     the read-only summary no longer carries the pickers. */
  pendingSetPhotos = [];
  editSetPhotos = [];
  var memoWrap = $('setform-memos');
  if (memoWrap) memoWrap.hidden = !editingSetId;
  var seBtn = $('btn-se-memo');
  if (seBtn) seBtn.innerHTML = MEMO_IDLE_HTML;
  if (editingSetId) {
    loadSetPhotos(editingSetId, function (sp) { editSetPhotos = sp; renderPendingSetPhotos(); refreshNotesBox('setform-notessec', 'sf-notes', 'se-memos', 'sf-photos'); /* Q99 */ });
    renderMemos(editingSetId, 'se-memos', true);
  }
  renderPendingSetPhotos();
  refreshNotesBox('setform-notessec', 'sf-notes', 'se-memos', 'sf-photos'); /* Q99 */
  var photoBlock = $('setform-photos');
  if (photoBlock) photoBlock.style.display = '';
  hideSetFormError();
  applySetFieldToggles();
  /* Q103: quiet coords at the bottom when the Privacy toggle is on — what the form will save */
  var fc = s ? { lat: s.lat, lng: s.lng } : pendingCoords;
  wireCoordsBottom('setform-coords-bottom', showCoords() &&
    (fc && isFinite(+fc.lat) && isFinite(+fc.lng)) ? fmtCoords(fc.lat, fc.lng) : '');
  openSheet('sheet-setform');
}

function getSet(id) {
  for (var i = 0; i < Store.data.sets.length; i++) if (Store.data.sets[i].id === id) return Store.data.sets[i];
  return null;
}

/* Inline validation message on the New/Edit set sheet. Set name, Status, and
   Date set are required — the save is blocked until all three have values. */
function showSetFormError(msg) {
  var el = $('setform-error');
  if (!el) { toast(msg); return; }
  el.textContent = msg;
  el.classList.add('show');
  el.scrollIntoView({ block: 'nearest' });
}
function hideSetFormError() {
  var el = $('setform-error');
  if (el) { el.textContent = ''; el.classList.remove('show'); }
}

/* Inline validation message on the Log-a-catch sheet. Entry type (Catch vs
   Other event) and disposition are both required. */
function showLogFormError(msg) {
  var el = $('logform-error');
  if (!el) { toast(msg); return; }
  el.textContent = msg;
  el.classList.add('show');
  el.scrollIntoView({ block: 'nearest' });
}
function hideLogFormError() {
  var el = $('logform-error');
  if (el) { el.textContent = ''; el.classList.remove('show'); }
}

/* Q162 (2026-10-06): Tanner — the carry-forward template for a NEW set, with
   every field the user toggled off in Settings blanked. A toggled-off field
   never inherits the last set's value, no matter what was entered there. */
function carryTemplate(t) {
  var c = {}, k;
  for (k in t) if (Object.prototype.hasOwnProperty.call(t, k)) c[k] = t[k];
  if (!setFieldOn('traptype')) { c.trapMaker = ''; c.trapType = ''; }
  if (!setFieldOn('trapdetail')) {
    c.trapSpring = ''; c.trapSize = ''; c.snareDia = ''; c.snareLock = '';
    c.snareLen = ''; c.snarePurpose = ''; c.trapModel = ''; c.trapMods = [];
    c.panSize = ''; c.jawShape = ''; c.jawClose = '';
  }
  if (!setFieldOn('settype')) c.setType = '';
  ['bait', 'lure', 'urine', 'visual', 'audio', 'other'].forEach(function (kk) {
    if (!setFieldOn(kk)) c[kk] = [];
  });
  return c;
}

/* Most recently created set on the active line (the carry-forward template). */
function lastSetOnLine() {
  var sets = activeSets().slice().sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
  return sets.length ? sets[0] : null;
}
/* Next set name: follow the most recently created set's stem on this line —
   "Trap 1" -> "Trap 2"; "Creek crossing" -> "Creek crossing 2". Custom names
   never disturb the counter; the number always follows what was last typed,
   so a speed line just keeps counting. */
function nextSetName() {
  var sets = activeSets().slice().sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
  for (var i = 0; i < sets.length; i++) {
    var nm = String(sets[i].name || '').trim();
    if (!nm) continue;
    var m = nm.match(/^(.*?)\s*(\d+)$/);
    if (m) {
      var stem = m[1].trim();
      return (stem ? stem : 'Trap') + ' ' + (parseInt(m[2], 10) + 1);
    }
    return nm + ' 2';
  }
  return 'Trap 1';
}
function saveSetForm() {
  var name = $('sf-name').value.trim();
  var status = $('sf-status').value;
  var dateSet = $('sf-date').value;
  if (!name) {
    if (editingSetId) { showSetFormError('Set name is required — give this set a name.'); return; }
    name = nextSetName(); /* speed lines: never block on the name, just number it */
  }
  if (!status) { showSetFormError('Status is required — pick one.'); return; }
  if (!dateSet) { showSetFormError('Date set is required — pick the date.'); return; }
  if (status === 'missing' && !setMissingReason) { showSetFormError('Pick why this set is missing.'); return; }
  hideSetFormError();
  var td = trapDetailValues();
  var rt = resolvedTrapType();
  if (editingSetId) {
    var s = getSet(editingSetId);
    if (!s) { closeSheets(); return; }
    s.name = name;
    rememberEntry('setname', name); /* Q12 */
    s.trapType = rt.t;
    s.trapMaker = td.trapMaker;
    s.trapSpring = td.trapSpring || rt.spring || ''; s.trapSize = td.trapSize;
    s.snareDia = td.snareDia; s.snareLock = td.snareLock; s.snareLen = td.snareLen;
    s.snarePurpose = td.snarePurpose;
    s.trapModel = td.trapModel;
    s.trapMods = normalizeMods(td.trapMods); s.panSize = td.panSize; s.jawShape = td.jawShape; s.jawClose = td.jawClose;
    normalizeTrapDetail(s);
    s.setType = selVal('sf-settype'); /* Q55: Other… resolves to the typed custom */
    /* Q26: stacked attractant rows -> arrays (deduped, empties dropped) */
    s.bait = collectAttrRows('bait');
    s.lure = collectAttrRows('lure');
    s.urine = collectAttrRows('urine');
    s.visual = collectAttrRows('visual');
    s.audio = collectAttrRows('audio');
    s.other = collectAttrRows('other');
    s.status = status;
    s.dateSet = dateSet;
    s.notes = $('sf-notes').value.trim();
    if (td.trapModel) rememberEntry('trapmodel', td.trapModel); /* Q12 */
    /* Q36: missing reason rides the status */
    s.missingReason = (status === 'missing') ? setMissingReason : null;
    s.missingDetail = (status === 'missing' && setMissingReason === 'confiscated') ? $('sf-missing-detail').value.trim() : null;
    if (s.missingDetail) rememberEntry('missingdetail', s.missingDetail); /* Q12 */
    if (s.status === 'pulled' && !s.datePulled) s.datePulled = todayISO();
    if (s.status !== 'pulled' && s.datePulled) delete s.datePulled;
    touchSet(s); /* Q68: any edit restarts the check clock */
    Store.save(); refreshMarkers();
    /* Q71: photos added on the Edit Set form (plain or citation) attach here. */
    pendingSetPhotos.forEach(function (ph) {
      IDB.put('photos', {
        id: uid('p'), setId: s.id, blob: ph.blob, mime: ph.blob.type || 'image/jpeg',
        lat: s.lat, lng: s.lng, createdAt: Date.now()
      }).catch(function () { /* noop */ });
    });
    pendingSetPhotos = [];
    closeSheets(); switchTab('map'); /* Q76 (2026-10-01): Tanner — saving an edit goes back to the map, not the set detail. */
    toast('Set updated.');
    /* B32: no backfill prompt — old catches keep what they had; only new
       catches inherit the set's current attractants. */
    rememberAttractants(s);
  } else {
    if (!pendingCoords) { toast('No location for this set.'); return; }
    var ns = {
      id: uid('s'), name: name,
      lat: pendingCoords.lat, lng: pendingCoords.lng, county: null,
      trapType: rt.t,
      trapMaker: td.trapMaker,
      trapSpring: td.trapSpring || rt.spring || '', trapSize: td.trapSize,
      snareDia: td.snareDia, snareLock: td.snareLock, snareLen: td.snareLen,
      snarePurpose: td.snarePurpose,
      trapModel: td.trapModel,
      trapMods: normalizeMods(td.trapMods), panSize: td.panSize, jawShape: td.jawShape, jawClose: td.jawClose,
      setType: selVal('sf-settype'), /* Q55: Other… resolves to the typed custom */
      /* Q26: stacked attractant rows -> arrays */
      bait: collectAttrRows('bait'), lure: collectAttrRows('lure'),
      urine: collectAttrRows('urine'), other: collectAttrRows('other'),
      status: status,
      dateSet: dateSet,
      notes: $('sf-notes').value.trim(),
      /* Q36: missing reason rides the status */
      missingReason: (status === 'missing') ? setMissingReason : null,
      missingDetail: (status === 'missing' && setMissingReason === 'confiscated') ? $('sf-missing-detail').value.trim() : null,
      createdAt: Date.now(),
      lastActivity: Date.now() /* Q68: check clock starts at creation */
    };
    normalizeTrapDetail(ns);
    if (ns.status === 'pulled') ns.datePulled = ns.dateSet;
    ns.lineId = activeLineId();
    Store.data.sets.push(ns);
    Store.save(); refreshMarkers(); closeSheets();
    rememberEntry('setname', ns.name); /* Q12 */
    if (ns.trapModel) rememberEntry('trapmodel', ns.trapModel); /* Q12 */
    if (ns.missingDetail) rememberEntry('missingdetail', ns.missingDetail); /* Q12 */
    rememberAttractants(ns);
    /* Q37: photos taken on the New Set form attach to the new set here. */
    pendingSetPhotos.forEach(function (ph) {
      IDB.put('photos', {
        id: uid('p'), setId: ns.id, blob: ph.blob, mime: ph.blob.type || 'image/jpeg',
        lat: ns.lat, lng: ns.lng, createdAt: Date.now()
      }).catch(function () { /* noop */ });
    });
    pendingSetPhotos = [];
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

/* Q71: the summary sheet is read-only — status changes, recovery, and the
   missing-reason picker all live on the Edit Set form now. */

/* Q140 (2026-10-01): Tanner — five pins on top of each other. Tapping a
   stack opens a menu listing every set at that spot (name, status, trap
   type); tapping a row opens that set's detail. Lone pins keep today's
   straight-to-detail behavior.
   Q140b (2026-10-01, Tanner's phone verdict): the menu must ONLY appear
   when pins are almost exactly on top of each other (~1 m). The 20 m
   duplicate tolerance showed the menu for merely-nearby pins — then you
   can't tell which of the three you tapped. Nearby-but-distinct sets now
   open straight to detail. */
var STACK_TOL_DEG = 0.00001;
function setsAtSpot(lat, lng) {
  return activeSets().filter(function (s) {
    if (!mapStatusFilter[normStatus(s.status)]) return false;
    return Math.abs(s.lat - lat) <= STACK_TOL_DEG && Math.abs(s.lng - lng) <= STACK_TOL_DEG;
  });
}
function openSetOrStack(id) {
  var s = getSet(id);
  if (!s) return;
  var stack = setsAtSpot(s.lat, s.lng);
  if (stack.length < 2) { openSetDetail(id); return; }
  stack.sort(function (a, b) { return a.name < b.name ? -1 : 1; });
  $('stack-title').textContent = stack.length + ' sets at this spot';
  $('stack-list').innerHTML = stack.map(function (x) {
    var st = normStatus(x.status);
    return '<button type="button" class="stack-row" data-stack-id="' + x.id + '">' +
      '<span class="stack-name">' + esc(x.name) + '</span>' +
      '<span class="badge status-' + esc(st) + '">' + esc(statusLabel(st)) + '</span>' +
      '<span class="dim">' + esc(x.trapType || '—') + '</span></button>';
  }).join('');
  openSheet('sheet-stackmenu');
}

function openSetDetail(id) {
  var s = getSet(id);
  if (!s) return;
  detailSetId = id;
  $('sd-name').textContent = s.name;
  /* Q103: quiet tap-to-copy coords at the bottom, only when the Privacy toggle is on */
  wireCoordsBottom('sd-coords-bottom', showCoords() ? fmtCoords(s.lat, s.lng) : '');
  var st = normStatus(s.status);
  /* Q103d: no county badge — the county rides on the Location row instead. */
  $('sd-badges').innerHTML =
    '<span class="badge status-' + esc(st) + '">' + esc(statusLabel(st)) + '</span>';
  /* Q71: status is display-only here — changes go through "Edit this set". */
  /* Q167 (2026-10-07): Tanner — the detail sheet only shows rows that were
     actually logged. A field left empty at creation (or emptied in Edit)
     gets no row at all, instead of a "—" placeholder eating screen space. */
  var sdHtml = '';
  function sdRow(label, val) {
    if (val) sdHtml += '<dt>' + esc(label) + '</dt><dd>' + esc(val) + '</dd>';
  }
  var sdTrapDet = trapDetailSummary(s);
  sdRow('Trap', (s.trapType || '') + (sdTrapDet ? ' · ' + sdTrapDet : ''));
  sdRow('Set type', s.setType || '');
  sdRow('Bait', joinAttr(s.bait));
  sdRow('Lure', joinAttr(s.lure));
  sdRow('Urine', joinAttr(s.urine));
  sdRow('Visual', joinAttr(s.visual));
  sdRow('Audio', joinAttr(s.audio));
  sdRow('Other Attractants', joinAttr(s.other));
  sdRow('Date set', fmtDate(s.dateSet));
  if (showCoords()) {
    sdRow('Location', (s.county ? s.county + ' Co. · ' : '') + s.lat.toFixed(5) + ', ' + s.lng.toFixed(5));
  }
  sdRow('Weather', s.weather ? weatherText(s.weather) : '');
  $('sd-fields').innerHTML = sdHtml;
  /* Q36: show the missing reason on the set detail sheet */
  if (st === 'missing' && s.missingReason) {
    $('sd-fields').innerHTML += '<dt>Missing reason</dt><dd>' + esc(missingReasonLabel(s.missingReason)) +
      (s.missingDetail ? ' — ' + esc(s.missingDetail) : '') + '</dd>';
  }
  /* Q68: check-clock line — due in / overdue by, red when overdue. Only
     active sets run the clock; sprung keeps its amber pin instead. Hidden
     entirely when the alert is toggled off. */
  var clockOn = !Store.data || Store.data.checkClockOn !== false;
  if (st === 'active' && clockOn) {
    var dueMs = checkDueInMs(s);
    var overdue = dueMs < 0;
    $('sd-fields').innerHTML += '<dt>Trap check</dt><dd' + (overdue ? ' class="check-overdue"' : '') + '>' +
      (overdue ? 'Overdue by ' + esc(fmtCheckDur(dueMs)) : 'Due in ' + esc(fmtCheckDur(dueMs))) + '</dd>';
  }
  /* Q68: the one-tap check-in only exists where a check rhythm exists. */
  $('btn-sd-emptycheck').hidden = (st !== 'active' || !clockOn);
  loadSetPhotos(s.id, function (setPhotos, byLog) {
    renderSetPhotos(setPhotos);
    renderSetLogs(s, byLog);
  });
  /* Q71: summary memos are playback-only — recording/deletion are in Edit. */
  renderMemos(s.id, 'sd-memos', false);
  $('sd-notes').value = s.notes || '';
  refreshNotesBox('setdetail-notessec', 'sd-notes', 'sd-memos', 'sd-photos'); /* Q99 */
  openSheet('sheet-setdetail');
}
function appendTranscriptToSetNotes(setId, tr) {
  var s = getSet(setId);
  if (!s || !tr) return;
  s.notes = (s.notes ? s.notes.replace(/\s+$/, '') + ' ' : '') + tr;
  touchSet(s); /* Q68 */
  Store.save();
  if (setId === detailSetId && $('sd-notes')) { $('sd-notes').value = s.notes; refreshNotesBox('setdetail-notessec', 'sd-notes', 'sd-memos', 'sd-photos'); /* Q99 */ }
}

function renderSetLogs(s, byLog) {
  var logs = Store.data.logs.filter(function (l) { return l.setId === s.id; })
    .sort(function (a, b) { return b.date < a.date ? -1 : 1; });
  if (!logs.length) { $('sd-logs').innerHTML = '<p class="dim">No catches logged at this set yet.</p>'; return; }
  $('sd-logs').innerHTML = logs.map(function (l) {
    var ph = ((byLog && byLog[l.id]) || []).map(function (p) {
      return '<img class="photo-thumb sm" data-ph="' + p.id + '" src="' + photoURL(p) + '" alt="Catch photo">';
    }).join('');
    return '<div class="log-row"><div class="lr-top"><span class="lr-species">' + esc(l.species) +
      '</span><span class="lr-count">×' + esc(normCount(l)) + '</span>' +
      dispBadge(l.disposition) +
      '<button type="button" class="log-del" data-del-log="' + l.id + '" aria-label="Delete this log entry">×</button></div>' +
      '<div class="dim">' + esc(fmtDate(l.date)) + (l.notes ? ' · ' + esc(l.notes) : '') + '</div>' +
      logMemoHtml(l) +
      (l.weather ? '<div class="dim">🌤 ' + esc(weatherText(l.weather)) + '</div>' : '') +
      (ph ? '<div class="log-photos">' + ph + '</div>' : '') + '</div>';
  }).join('');
  var imgs = $('sd-logs').querySelectorAll('img[data-ph]');
  for (var i = 0; i < imgs.length; i++) {
    imgs[i].onclick = function () {
      var p = photoById[this.getAttribute('data-ph')];
      /* Q71: view-only from the summary — photo changes go through Edit. */
      if (p) openPhotoViewer(p, null, true);
    };
  }
}

/* Q38: delete means gone everywhere. Deleting a set removes its pin, its
   catch logs (including History), its photos, and its voice memos —
   permanently, with a gone-forever warning. */
function deleteSet(id) {
  var s = getSet(id);
  if (!s) return;
  var logs = Store.data.logs.filter(function (l) { return l.setId === id; });
  function ask(nPhotos, nMemos) {
    var bits = ['“' + esc(s.name) + '” and its pin will be permanently deleted'];
    if (logs.length) bits.push('its ' + logs.length + ' catch log' + (logs.length > 1 ? 's' : '') + ' (removed from History too)');
    if (nPhotos) bits.push(nPhotos + ' photo' + (nPhotos > 1 ? 's' : ''));
    if (nMemos) bits.push(nMemos + ' voice memo' + (nMemos > 1 ? 's' : ''));
    confirmModal('Delete this set?',
      bits.join(', ') + '. This cannot be undone — deleted data is gone forever.',
      'Delete', function () {
        Store.data.sets = Store.data.sets.filter(function (x) { return x.id !== id; });
        Store.data.logs = Store.data.logs.filter(function (l) { return l.setId !== id; });
        IDB.all('photos').then(function (all) {
          all.forEach(function (p) {
            if (p.setId !== id) return;
            if (photoURLs[p.id]) { URL.revokeObjectURL(photoURLs[p.id]); delete photoURLs[p.id]; }
            delete photoById[p.id];
            IDB.del('photos', p.id);
          });
        }).catch(function () { /* noop */ });
        IDB.all('memos').then(function (all) {
          all.forEach(function (m) {
            if (m.setId !== id) return;
            if (memoURLs[m.id]) { URL.revokeObjectURL(memoURLs[m.id]); delete memoURLs[m.id]; }
            IDB.del('memos', m.id);
          });
        }).catch(function () { /* noop */ });
        Store.save(); refreshMarkers(); renderHistory(); renderTotals(); closeSheets();
        toast('Set deleted.');
      });
  }
  IDB.all('photos').then(function (all) {
    var nPhotos = all.filter(function (p) { return p.setId === id; }).length;
    return IDB.all('memos').then(function (memos) {
      ask(nPhotos, memos.filter(function (m) { return m.setId === id; }).length);
    });
  }).catch(function () { ask(0, 0); });
}

/* Q38: per-catch delete, from History or the set-detail log list.
   Removes the log entry everywhere plus its photos. Gone forever. */
function deleteLog(logId) {
  var l = null;
  for (var i = 0; i < Store.data.logs.length; i++) {
    if (Store.data.logs[i].id === logId) { l = Store.data.logs[i]; break; }
  }
  if (!l) return;
  var label = l.otherType
    ? (OTHER_LABELS[l.otherType] || 'Other event') + (l.species ? ' — ' + l.species : '')
    : (normCount(l) + ' × ' + (l.species || 'Unknown'));
  var s = l.setId ? getSet(l.setId) : null;
  var linkedMemoIds = logMemoIds(l);
  function ask(nPhotos, nMemos) {
    confirmModal('Delete this log entry?',
      '“' + esc(label) + '” (' + esc(fmtDate(l.date)) + ')' +
      ' will be permanently removed from History' + (s ? ' and from “' + esc(s.name) + '”' : '') +
      (nPhotos ? ', along with its ' + nPhotos + ' photo' + (nPhotos > 1 ? 's' : '') : '') +
      (nMemos ? ', along with its ' + nMemos + ' voice memo' + (nMemos > 1 ? 's' : '') : '') +
      '. This cannot be undone — deleted data is gone forever.',
      'Delete', function () {
        Store.data.logs = Store.data.logs.filter(function (x) { return x.id !== logId; });
        IDB.all('photos').then(function (all) {
          all.forEach(function (p) {
            if (p.logId !== logId) return;
            if (photoURLs[p.id]) { URL.revokeObjectURL(photoURLs[p.id]); delete photoURLs[p.id]; }
            delete photoById[p.id];
            IDB.del('photos', p.id);
          });
        }).catch(function () { /* noop */ });
        /* Q38: the catch's voice memos are gone everywhere too. */
        linkedMemoIds.forEach(function (mid) {
          if (memoURLs[mid]) { try { URL.revokeObjectURL(memoURLs[mid]); } catch (e) { /* noop */ } delete memoURLs[mid]; }
          IDB.del('memos', mid);
        });
        Store.save();
        renderHistory(); renderTotals();
        if (detailSetId && getSet(detailSetId)) {
          loadSetPhotos(detailSetId, function (sp, bl) { renderSetPhotos(sp); renderSetLogs(getSet(detailSetId), bl); });
        }
        toast('Log entry deleted.');
      });
  }
  IDB.all('photos').then(function (all) {
    ask(all.filter(function (p) { return p.logId === logId; }).length, linkedMemoIds.length);
  }).catch(function () { ask(0, linkedMemoIds.length); });
}

/* ================= 8. CATCH LOGGING ================= */
var logSetId = null, logSpecies = null, logCount = 1, logDisposition = 'kept', pendingLogPhotos = [], pendingLogMemos = [];
/* Catch-memo finish: true while the log sheet is open for an unsaved catch.
   A memo that finishes landing after the sheet closed is an orphan. */
var logSheetLive = false;

/* Catch-log "Other event" (build au): non-catch events recorded on a set.
   otherType is one of 'sprung' | 'non-native' | 'non-game' | 'domestic' |
   'fur' | 'animal-part' | 'empty' | 'other', null/absent for normal catches.
   'empty' (Q68) is the checked-it-nothing-happened check-in: no species, no
   count, no disposition — it exists to restart the check clock. Other
   events are events, not catches: they never change the set's trap status
   and are excluded from Totals and the bait/lure scorecard.
   Log-sheet entry state: logEventType defaults to 'catch' (Q20) and
   logDisposition defaults to 'kept' (Dispatched) — nine times out of ten
   that's what happens, and switching stays one tap away. logOtherType
   keeps its 'sprung' default. */
var logEventType = 'catch', logOtherType = 'sprung';
var OTHER_LABELS = { 'sprung': 'Sprung', 'non-native': 'Non-native animal', 'non-game': 'Non-target animal', 'domestic': 'Domestic animal', 'fur': 'Fur', 'animal-part': 'Animal part', 'empty': 'Empty — nothing changed', 'other': 'Other' };

/* Notes placeholder nudge: the catch-all 'Other' subtype gets a descriptive
   prompt; every other subtype keeps the plain default. Notes stay optional. */
var LOG_NOTES_PLACEHOLDER_DEFAULT = 'Optional…';
var LOG_NOTES_PLACEHOLDER_OTHER = 'Describe what happened…';
function updateLogNotesPlaceholder() {
  $('log-notes').placeholder = (logOtherType === 'other') ? LOG_NOTES_PLACEHOLDER_OTHER : LOG_NOTES_PLACEHOLDER_DEFAULT;
}

/* Catch-memo finish: memos recorded for a catch that never gets saved are
   orphans — remove them from the phone so they don't haunt the set's list. */
function deletePendingLogMemos() {
  pendingLogMemos.forEach(function (mid) {
    if (memoURLs[mid]) { try { URL.revokeObjectURL(memoURLs[mid]); } catch (e) { /* noop */ } delete memoURLs[mid]; }
    IDB.del('memos', mid).catch(function () { /* noop */ });
  });
  pendingLogMemos = [];
}
/* B11: has the trapper entered anything on the log sheet worth protecting?
   An untouched form closes silently; a half-entered catch asks first. */
function logFormDirty() {
  if (logSpecies || logCount !== 1) return true;
  /* 'none' is set programmatically when the row hides — only user picks count. */
  if (logDisposition !== 'kept' && logDisposition !== 'none') return true;
  if (pendingLogPhotos.length) return true;
  if (pendingLogMemos.length) return true; /* a recorded memo is linked on save */
  if (logEventType !== 'catch' || logOtherType !== 'sprung') return true;
  if (($('log-notes').value || '').trim()) return true;
  if (($('log-species-free').value || '').trim()) return true;
  if (($('log-date').value || '') !== todayISO()) return true;
  return false;
}
function openLogSheet(setId) {
  var s = getSet(setId);
  if (!s) return;
  logSetId = setId; logSpecies = null; logCount = 1; logDisposition = 'kept'; pendingLogPhotos = []; pendingLogMemos = [];
  logSheetLive = true;
  logEventType = 'catch'; logOtherType = 'sprung';
  renderPendingLogPhotos();
  $('log-setline').innerHTML = '<strong>' + esc(s.name) + '</strong>' +
    (s.setType ? ' · ' + esc(s.setType) : '') +
    (s.trapType ? ' · ' + esc(s.trapType) : '') +
    (function () { var a = allAttrSummary(s); return a ? ' · ' + esc(a) : ''; })();
  $('log-count').textContent = '1';
  var dispBtns = document.querySelectorAll('#log-disposition button');
  for (var d = 0; d < dispBtns.length; d++) dispBtns[d].classList.toggle('selected', dispBtns[d].getAttribute('data-disp') === 'kept');
  $('log-date').value = todayISO();
  updateDateDOW('log-date', 'log-date-dow');
  var lt = $('log-time'); if (lt) lt.value = nowHHMM(); /* always fresh: the time the animal was found, not last entry's */
  $('log-notes').value = '';
  setSectionOpen('logform-notessec', false); /* Q99: new catches start collapsed */
  $('log-species-search').value = '';
  $('log-species-free').value = '';
  $('log-othertype').value = 'sprung';
  updateLogNotesPlaceholder();
  setLogEventType('catch');
  hideLogFormError();
  $('log-warnings').innerHTML = '';
  $('voice-lognotes-preview').classList.remove('show');
  $('voice-lognotes-preview').innerHTML = '';
  renderSpeciesList('');
  openSheet('sheet-log');
}

/* Event-type toggle at the top of the Log-a-catch sheet. 'Catch' starts
   selected (Q20) — nearly every entry is a catch, so the trapper saves a
   tap; switching to Other event stays one tap away. "Other" reveals the
   subtype dropdown and swaps the species picker for optional free text.
   Disposition buttons stay visible in both modes. */
function setLogEventType(t) {
  logEventType = t;
  var evBtns = document.querySelectorAll('#log-eventtype button');
  for (var i = 0; i < evBtns.length; i++) evBtns[i].classList.toggle('selected', evBtns[i].getAttribute('data-ev') === t);
  var other = (t === 'other');
  $('log-species-catch').hidden = other;
  $('log-species-other').hidden = !other;
  $('log-other-row').hidden = !other;
  $('btn-save-log').textContent = other ? 'Save event' : 'Save catch';
  hideLogFormError();
  renderLogWarnings();
  updateLogDispositionRow();
  updateOtherSubtypeRows();
}

/* Q68: the "Empty — nothing changed" subtype is a pure check-in — no
   species, no count, no disposition. Just date, optional notes, Save. */
function updateOtherSubtypeRows() {
  var empty = (logEventType === 'other' && logOtherType === 'empty');
  if (logEventType === 'other') $('log-species-other').hidden = empty;
  var cr = $('log-count-row');
  if (cr) cr.hidden = empty;
  if (empty) { logSpecies = null; $('log-species-free').value = ''; }
}

/* Q24: the Disposition row adapts to the other-event subtype.
   - Catch, or Other + Non-target / Non-native / Domestic / Other: the
     standard four (Dispatched / Kept alive / Released / Transported).
   - Other + Animal part / Fur: Kept / Discarded only.
   - Other + Sprung: the row hides entirely — nothing was there, the event
     is about the trap, not an animal — and the log saves disposition 'none'.
   - Other + Empty (Q68): same as sprung — the sheet also drops the species
     and count rows, leaving date, notes, and Save: a pure check-in.
   When the visible set changes out from under the current pick, the pick
   resets to the first visible option. */
function updateLogDispositionRow() {
  var other = (logEventType === 'other');
  var sub = logOtherType;
  /* Q68: 'empty' hides the row like 'sprung' — nothing was there, the event
     is a check-in, not an animal. */
  var rowVisible = !other || (sub !== 'sprung' && sub !== 'empty');
  var limited = other && (sub === 'animal-part' || sub === 'fur');
  $('log-disposition-label').hidden = !rowVisible;
  $('log-disposition').hidden = !rowVisible;
  var btns = document.querySelectorAll('#log-disposition button'), i, v;
  for (i = 0; i < btns.length; i++) {
    v = btns[i].getAttribute('data-disp');
    btns[i].hidden = !rowVisible || (limited ? (v !== 'kept' && v !== 'discarded') : (v === 'discarded'));
  }
  if (!rowVisible) { logDisposition = 'none'; return; }
  var okPick = limited
    ? (logDisposition === 'kept' || logDisposition === 'discarded')
    : (logDisposition !== 'discarded' && logDisposition !== 'none');
  if (!okPick || !logDisposition) logDisposition = 'kept';
  for (i = 0; i < btns.length; i++) {
    btns[i].classList.toggle('selected', !btns[i].hidden && btns[i].getAttribute('data-disp') === logDisposition);
  }
}

function logDispositionRequired() {
  return !(logEventType === 'other' && (logOtherType === 'sprung' || logOtherType === 'empty'));
}

function renderPendingLogPhotos() {
  var box = $('log-photos');
  if (!box) return;
  box.innerHTML = '';
  pendingLogPhotos.forEach(function (ph, i) {
    var img = document.createElement('img');
    img.className = 'photo-thumb'; img.alt = 'Catch photo';
    img.src = URL.createObjectURL(ph.blob);
    img.title = 'Tap to enlarge';
    img.onclick = (function (idx) {
      return function () { openPendingPhotoViewer(idx); };
    })(i);
    box.appendChild(img);
  });
}
/* Viewer for a catch photo that hasn't been saved yet: tap enlarges,
   removal is an explicit choice inside the viewer. */
function openPendingPhotoViewer(idx) {
  var ph = pendingLogPhotos[idx];
  if (!ph) return;
  var url = URL.createObjectURL(ph.blob);
  showModal('<img src="' + url + '" style="width:100%;border-radius:8px" alt="Catch photo">' +
    '<div class="btn-row" style="margin-top:10px"><button class="btn-danger" id="m-ph-del" type="button">Remove</button>' +
    '<button class="btn-secondary" id="m-ph-save" type="button">Save Photo</button>' +
    '<button class="btn-secondary" id="m-close" type="button">Close</button></div>');
  $('m-close').onclick = function () { URL.revokeObjectURL(url); closeModal(); };
  $('m-ph-save').onclick = function () { sharePhotoFile(ph.blob, 'opossum-foot-photo'); };
  $('m-ph-del').onclick = function () {
    confirmModal('Remove this photo?', 'It will not be saved with this catch.', 'Remove', function () {
      URL.revokeObjectURL(url);
      pendingLogPhotos.splice(idx, 1);
      renderPendingLogPhotos();
    });
  };
}
/* Q37: same pending-photo pattern for the New Set form — thumbnails of
   photos taken before the set exists, attached to it on save. */
function renderPendingSetPhotos() {
  var box = $('sf-photos');
  if (!box) return;
  box.innerHTML = '';
  /* Q71: in edit mode the form carries the set's stored photos too, with
     delete — the summary sheet is view-only now. */
  if (editingSetId) {
    editSetPhotos.forEach(function (p) {
      var img = document.createElement('img');
      img.className = 'photo-thumb'; img.alt = 'Set photo';
      img.src = photoURL(p);
      img.title = 'Tap to enlarge';
      img.onclick = function () {
        openPhotoViewer(p, function () {
          editSetPhotos = editSetPhotos.filter(function (x) { return x.id !== p.id; });
          renderPendingSetPhotos();
        });
      };
      box.appendChild(img);
    });
  }
  pendingSetPhotos.forEach(function (ph, i) {
    if (ph.kind === 'confiscation') return; /* the confiscation wrap shows these */
    var img = document.createElement('img');
    img.className = 'photo-thumb'; img.alt = 'Set photo';
    img.src = URL.createObjectURL(ph.blob);
    img.title = 'Tap to enlarge';
    img.onclick = (function (idx) {
      return function () { openPendingSetPhotoViewer(idx); };
    })(i);
    box.appendChild(img);
  });
}
/* Q36: citation photos pending on the set form (kind 'confiscation'). They
   attach as set-level photos on save, same as the Q37 pending photos —
   take a photo or upload one (screenshot of the paperwork, etc.). */
function renderMissingPhotoStrip() {
  var box = $('sf-missing-photos');
  if (!box) return;
  box.innerHTML = '';
  pendingSetPhotos.forEach(function (ph, i) {
    if (ph.kind !== 'confiscation') return;
    var img = document.createElement('img');
    img.className = 'photo-thumb'; img.alt = 'Citation photo';
    img.src = URL.createObjectURL(ph.blob);
    img.title = 'Tap to enlarge';
    img.onclick = (function (idx) {
      return function () { openPendingSetPhotoViewer(idx); };
    })(i);
    box.appendChild(img);
  });
}
function openPendingSetPhotoViewer(idx) {
  var ph = pendingSetPhotos[idx];
  if (!ph) return;
  var url = URL.createObjectURL(ph.blob);
  showModal('<img src="' + url + '" style="width:100%;border-radius:8px" alt="Set photo">' +
    '<div class="btn-row" style="margin-top:10px"><button class="btn-danger" id="m-ph-del" type="button">Remove</button>' +
    '<button class="btn-secondary" id="m-ph-save" type="button">Save Photo</button>' +
    '<button class="btn-secondary" id="m-close" type="button">Close</button></div>');
  $('m-close').onclick = function () { URL.revokeObjectURL(url); closeModal(); };
  $('m-ph-save').onclick = function () { sharePhotoFile(ph.blob, 'opossum-foot-photo'); };
  $('m-ph-del').onclick = function () {
    confirmModal('Remove this photo?', 'It will not be saved with this set.', 'Remove', function () {
      URL.revokeObjectURL(url);
      pendingSetPhotos.splice(idx, 1);
      renderPendingSetPhotos();
      renderMissingPhotoStrip();
    });
  };
}
function renderSpeciesList(filter) {
  var d = stateData();
  var box = $('log-species-list');
  if (!d) { box.innerHTML = '<p class="dim">No season data loaded.</p>'; return; }
  var q = (filter || '').toLowerCase();
  var list = sortSpeciesAlpha(stateSpecies().filter(function (sp) {
    return !q || sp.common_name.toLowerCase().indexOf(q) !== -1 ||
      (sp.scientific_name || '').toLowerCase().indexOf(q) !== -1 ||
      (sp.keywords || '').toLowerCase().indexOf(q) !== -1;
  }));
  if (!list.length) { box.innerHTML = '<p class="dim">No species match.</p>'; return; }
  box.innerHTML = list.map(function (sp) {
    var info = speciesSeasonInfo(sp);
    /* domestic rows get the circular ? help icon in the species-icon slot (left) */
    var iconHtml = sp.domestic ? '<span class="sp-icon sp-help" data-help="1">?</span>' : speciesIcon(sp.common_name);
    return '<button type="button" class="species-row' + (logSpecies === sp.common_name ? ' selected' : '') +
      '" data-sp="' + esc(sp.common_name) + '">' + iconHtml +
      '<span class="sp-name">' + esc(sp.common_name) +
      (sp.scientific_name ? '<span class="sci">' + esc(sp.scientific_name) + '</span>' : '') + '</span>' +
      '<span class="badge ' + info.badgeClass + '">' + info.badge + '</span>' + '</button>';
  }).join('');
  var btns = box.querySelectorAll('.species-row');
  for (var i = 0; i < btns.length; i++) {
    btns[i].onclick = function (e) {
      var t = e && e.target;
      if (t && t.getAttribute && t.getAttribute('data-help')) {
        e.stopPropagation();
        showSpeciesDetail(this.getAttribute('data-sp'));
        return;
      }
      logSpecies = this.getAttribute('data-sp');
      renderSpeciesList($('log-species-search').value);
      renderLogWarnings();
    };
  }
}

/* County/city-level variation: species.county_notes, or any season zone with
   area_type 'counties'. Returns detail text, or '' when no county variation. */
function countyRuleText(sp) {
  if (sp.county_notes) return sp.county_notes;
  var names = [];
  (sp.seasons || []).forEach(function (s) {
    (s.zones || []).forEach(function (z) {
      if (z.area_type === 'counties' && z.zone_name && names.indexOf(z.zone_name) < 0) names.push(z.zone_name);
    });
  });
  if (!names.length) return '';
  return 'County-based zones apply: ' + names.join('; ') + '.';
}

/* Warnings inform — they never block saving. */
function renderLogWarnings() {
  var box = $('log-warnings');
  box.innerHTML = '';
  if (logEventType === 'other') return; /* bag limits don't apply to Other events */
  if (!logSpecies) return;
  var sp = findSpecies(logSpecies);
  if (!sp) return;
  var info = speciesSeasonInfo(sp);
  var d = stateData();
  var html = '';
  if (sp.domestic) {
    html += '<div class="warnbox"><div class="wb-title">Domestic animal.</div>' +
      esc(domesticNotes()) +
      '<div class="reminder-tag">' + esc(REMINDER_LINE) + '</div></div>';
  }
  var countyDetail = countyRuleText(sp);
  if (countyDetail) {
    html += '<div class="warnbox"><div class="wb-title"><img class="bi" src="assets/icons/mappin.png" alt=""> County/city rules apply to ' + esc(sp.common_name) +
      ' in ' + esc(d.state_name) + '.</div>' +
      esc(countyDetail) + ' Check your local ordinances.' +
      '<div class="reminder-tag">' + esc(REMINDER_LINE) + '</div></div>';
  }
  if (!info.inSeason) {
    html += '<div class="warnbox' + (sp.season_status === 'closed' ? ' red' : '') + '">' +
      '<div class="wb-title">⚠ ' + esc(sp.common_name) + ' — ' + esc(info.badge) + '.</div>' +
      'You can still log this catch. ' + esc(REMINDER_LINE) + '</div>';
  }
  var lt = limitText(info.limits);
  if (lt) {
    var sy = seasonYearOf($('log-date').value || todayISO());
    /* Bag limits count kept animals only — kept and kept-alive count;
       released and transported/released don't. */
    var keptTotal = speciesSeasonTotal(logSpecies, sy);
    var notCounted = (logDisposition === 'released' || logDisposition === 'transported');
    var add = notCounted ? 0 : logCount;
    var total = keptTotal + add;
    var over = info.limits.season_bag && total >= info.limits.season_bag;
    html += '<div class="warnbox' + (over ? ' red' : '') + '">' +
      '<div class="wb-title">Bag limit reminder</div>' +
      esc(d.state_name) + ' data lists: ' + esc(lt) + '. ' +
      'Dispatched ' + esc(logSpecies) + ' this season (' + esc(sy) + '): <strong>' + keptTotal + '</strong>' +
      (notCounted
        ? '. This entry is marked ' + esc(dispLabel(logDisposition).toLowerCase()) + ', so it does not count toward the limit.'
        : ' — with this entry you would be at <strong>' + total + '</strong>.') +
      '<div class="reminder-tag">' + esc(REMINDER_LINE) + '</div></div>';
  }
  box.innerHTML = html;
}

function saveLog() {
  if (!logEventType) { showLogFormError('Choose Catch or Other event.'); return; }
  /* Catch-memo finish: never save the catch while its memo is still
     recording or landing in storage — the link would be lost. */
  if (Memo.recording || Memo._saving) { showLogFormError('Finish the voice memo first, then save.'); return; }
  var isOther = (logEventType === 'other');
  var isEmpty = isOther && logOtherType === 'empty'; /* Q68: pure check-in */
  var species = isEmpty ? '' : (isOther ? $('log-species-free').value.trim() : logSpecies);
  if (!isOther && !species) { showLogFormError('Pick a species first.'); return; }
  if (logDispositionRequired() && !logDisposition) {
    var limited = (logEventType === 'other') && (logOtherType === 'animal-part' || logOtherType === 'fur');
    showLogFormError(limited ? 'Choose a disposition — Kept or Discarded.' : 'Choose a disposition — Dispatched, Kept alive, Released, or Transported.');
    return;
  }
  hideLogFormError();
  var s = getSet(logSetId);
  var date = $('log-date').value || todayISO();
  var log = {
    id: uid('l'), setId: logSetId,
    setName: s ? s.name : '(deleted set)',
    species: species || '',
    otherType: isOther ? logOtherType : null,
    count: isEmpty ? 0 : (logCount * 1 || 1),
    disposition: logDisposition,
    date: date, time: ($('log-time') && $('log-time').value) || '', seasonYear: seasonYearOf(date),
    bait: s ? toAttrArray(s.bait).slice() : [], lure: s ? toAttrArray(s.lure).slice() : [],
    urine: s ? toAttrArray(s.urine).slice() : [], visual: s ? toAttrArray(s.visual).slice() : [],
    audio: s ? toAttrArray(s.audio).slice() : [], other: s ? toAttrArray(s.other).slice() : [],
    trapType: s ? (s.trapType || '') : '',
    trapDetail: s ? trapDetailSummary(s) : '',
    trapCount: s ? (s.trapCount || 1) : 1,
    setType: s ? (s.setType || '') : '',
    county: s ? (s.county || '') : '',
    lat: s ? s.lat : null, lng: s ? s.lng : null,
    notes: $('log-notes').value.trim(),
    memoIds: pendingLogMemos.slice(),
    createdAt: Date.now()
  };
  log.lineId = activeLineId();
  Store.data.logs.push(log);
  touchSet(getSet(logSetId)); /* Q68: a logged catch, event, or empty check restarts the clock */
  /* #6 (2026-10-01): Tanner — catch-log notes are written fresh, never saved for reuse. */
  if (isOther && species) rememberEntry('otherspecies', species); /* Q12 */
  Store.save();
  pendingLogPhotos.forEach(function (ph) {
    IDB.put('photos', {
      id: uid('p'), setId: log.setId, logId: log.id, blob: ph.blob,
      mime: ph.blob.type || 'image/jpeg',
      lat: s ? s.lat : null, lng: s ? s.lng : null, createdAt: Date.now()
    }).catch(function () { /* noop */ });
  });
  pendingLogPhotos = [];
  pendingLogMemos = [];
  closeSheets();
  renderHistory(); renderTotals(); refreshMarkers(); /* Q75 (2026-10-01): Tanner — the pin repaints the moment the catch is logged, no tab switch needed. */
  toast(isOther
    ? 'Logged ' + (OTHER_LABELS[logOtherType] || 'Other event') + (species ? ' — ' + species : '') + (logDisposition && logDisposition !== 'none' ? ' (' + dispLabel(logDisposition) + ')' : '') + (s ? ' at ' + s.name : '') + '.'
    : 'Logged ' + log.count + ' ' + species + ' (' + dispLabel(logDisposition) + ')' + (s ? ' at ' + s.name : '') + '.');
  /* INVARIANT: saving a log — catch or Other event — NEVER changes the
     set's trap status. Status is manual-only: no s.status assignment
     exists in saveLog or any log code path. */
  /* weather snapshot in background */
  stampLogWeather(s, log);
}

/* Q68: one-tap check-in from the set detail sheet — "I was here, nothing
   changed." Tanner 2026-09-30: NO log entry — no History row, no export
   row. The absence of any log for the date already says nothing happened.
   Just restarts the check clock; the pin drops back to its status color.
   Status untouched. (The Log form's Other → "Empty" subtype still saves a
   deliberate log entry — that's the user's explicit record, unchanged.) */
function quickEmptyCheck() {
  var s = getSet(detailSetId);
  if (!s) return;
  if (normStatus(s.status) !== 'active') return; /* Q68: active sets only */
  touchSet(s);
  Store.save();
  refreshMarkers();
  closeSheets(); /* Tanner 2026-09-30: a no-change check-in exits the set
    immediately — nothing to look at, back to the map. */
  toast('Checked — nothing changed. Check clock restarted.');
}

/* ================= 9. VOICE ================= */
/* --- transcribe-first speech recognition --- */
/* B10: iOS gives an installed web app no working speech recognition (Apple
   reserves voice typing for the keyboard mic) — say so up front instead of
   failing silently behind a dead button. */
function isIOSPWA() {
  var ua = navigator.userAgent || '';
  var ios = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var standalone = (navigator.standalone === true) ||
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  return !!(ios && standalone);
}
var Voice = {
  rec: null, listening: false,
  supported: function () {
    return ('SpeechRecognition' in window) || ('webkitSpeechRecognition' in window);
  },
  start: function (previewEl, onUse) {
    var self = this;
    if (isIOSPWA()) {
      previewEl.classList.add('show');
      previewEl.innerHTML = '<div class="dim">Voice typing doesn\u2019t work inside the installed app on iPhones — tap the notes box, then the \uD83C\uDFA4 mic key on your keyboard to dictate. Or use Record memo below to save audio instead.</div>';
      return;
    }
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

/* --- scorecard helpers (build ah) --- */
function trapNights(s) {
  var start = new Date((s.dateSet || todayISO()) + 'T12:00:00').getTime();
  var end = s.datePulled ? new Date(s.datePulled + 'T12:00:00').getTime() : Date.now();
  if (isNaN(start)) start = Date.now();
  if (isNaN(end) || end < start) end = start;
  return Math.max(1, Math.round((end - start) / 86400000));
}

/* --- set & catch photos (stored as blobs in IndexedDB, same store as licenses) --- */
var photoURLs = {}, photoById = {};
function photoURL(p) {
  if (!photoURLs[p.id]) photoURLs[p.id] = URL.createObjectURL(p.blob);
  return photoURLs[p.id];
}
function downscalePhoto(file, cb) {
  var url = URL.createObjectURL(file);
  var img = new Image();
  img.onload = function () {
    try {
      var max = 1600, w = img.width, h = img.height;
      if (Math.max(w, h) > max) { var r = max / Math.max(w, h); w = Math.round(w * r); h = Math.round(h * r); }
      var c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      if (c.toBlob) c.toBlob(function (b) { cb(b || file); }, 'image/jpeg', 0.85);
      else cb(file);
    } catch (e) { URL.revokeObjectURL(url); cb(file); }
  };
  img.onerror = function () { URL.revokeObjectURL(url); cb(file); };
  img.src = url;
}
function loadSetPhotos(setId, cb) {
  IDB.all('photos').then(function (all) {
    var setPhotos = [], byLog = {};
    photoById = {};
    all.forEach(function (p) {
      if (p.setId !== setId) return;
      photoById[p.id] = p;
      if (p.logId) { (byLog[p.logId] = byLog[p.logId] || []).push(p); }
      else setPhotos.push(p);
    });
    setPhotos.sort(function (a, b) { return b.createdAt - a.createdAt; });
    cb(setPhotos, byLog);
  }).catch(function () { cb([], {}); });
}
function renderSetPhotos(list) {
  var box = $('sd-photos');
  if (!box) return;
  box.innerHTML = '';
  list.forEach(function (p) {
    var img = document.createElement('img');
    img.className = 'photo-thumb'; img.alt = 'Set photo'; img.src = photoURL(p);
    img.onclick = function () {
      /* Q71: view-only from the summary — photo changes go through Edit. */
      openPhotoViewer(p, null, true);
    };
    box.appendChild(img);
  });
}
/* Q28: "Save to camera roll" — a PWA can't write to the camera roll
   directly, so hand the photo to the OS share sheet (Web Share API with
   files) and the user taps Save Image there. Read-only: never mutates
   app data. Where the share sheet can't take files, fall back to opening
   the photo full-size in a new tab (long-press it there to save). */
function sharePhotoFile(blob, baseName) {
  if (!blob) return;
  var type = blob.type || 'image/jpeg';
  var ext = type.indexOf('png') !== -1 ? 'png' : (type.indexOf('webp') !== -1 ? 'webp' : 'jpg');
  var file = null;
  try { file = new File([blob], (baseName || 'opossum-foot-photo') + '.' + ext, { type: type }); } catch (e) { file = null; }
  var nav = (typeof navigator !== 'undefined') ? navigator : {};
  if (file && nav.canShare && nav.share) {
    var ok = false;
    try { ok = !!nav.canShare({ files: [file] }); } catch (e) { ok = false; }
    if (ok) {
      nav.share({ files: [file] }).catch(function (err) {
        if (!err || err.name !== 'AbortError') toast('Could not open the share sheet.');
      });
      return;
    }
  }
  var url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  toast('Opened full-size — long-press the photo and tap Save Image.');
}
/* Q71: ro = read-only (summary sheet) — no Delete button, just view + save. */
function openPhotoViewer(p, onDelete, ro) {
  var when = '';
  try { when = new Date(p.createdAt).toLocaleString(); } catch (e) { /* noop */ }
  showModal('<img src="' + photoURL(p) + '" style="width:100%;border-radius:8px" alt="Photo">' +
    (when ? '<div class="dim" style="margin-top:6px;text-align:center">' + esc(when) + '</div>' : '') +
    '<div class="btn-row" style="margin-top:10px">' +
    (ro ? '' : '<button class="btn-danger" id="m-ph-del" type="button">Delete</button>') +
    '<button class="btn-secondary" id="m-ph-save" type="button">Save Photo</button>' +
    '<button class="btn-secondary" id="m-close" type="button">Close</button></div>');
  $('m-close').onclick = closeModal;
  $('m-ph-save').onclick = function () { sharePhotoFile(p.blob, 'opossum-foot-photo'); };
  var delBtn = $('m-ph-del');
  if (delBtn) delBtn.onclick = function () {
    confirmModal('Delete this photo?', 'It will be removed from this phone.', 'Delete', function () {
      IDB.del('photos', p.id).then(function () {
        if (photoURLs[p.id]) { URL.revokeObjectURL(photoURLs[p.id]); delete photoURLs[p.id]; }
        delete photoById[p.id];
        closeModal();
        if (onDelete) onDelete();
        toast('Photo deleted.');
      });
    });
  };
}

/* --- voice memos via MediaRecorder, stored as blobs in IndexedDB --- */
var MEMO_IDLE_HTML = '<img class="bi" src="assets/icons/mic.png" alt="">Record memo';
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
  /* Log-a-catch attach: pass onSaved to learn the memo's id when it lands,
     so the caller can link it to the catch being logged. boxId/editable
     (Q71) say which memo list refreshes when the save lands. */
  toggle: function (setId, btn, onSaved, boxId, editable) {
    var self = this;
    if (this.recording) { this.stop(btn); return; }
    self._boxId = boxId || 'sd-memos';
    self._editable = editable !== false;
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
        /* A memo recorded for a catch belongs to the catch: its transcript
           stays on the memo card and never lands in the set's notes.
           Set-level memos keep the old notes-append behavior. */
        var forCatch = !!onSaved;
        if (!blob.size) { self._saving = false; toast('Empty recording — nothing saved.'); return; }
        var memoId = uid('m');
        var memoTranscript = (self._transcript || '').trim();
        IDB.put('memos', {
          id: memoId, setId: self.targetSetId, mime: blob.type,
          blob: blob, createdAt: Date.now(),
          transcript: memoTranscript
        }).then(function () {
          self._saving = false;
          if (!forCatch) appendTranscriptToSetNotes(self.targetSetId, memoTranscript);
          renderMemos(self.targetSetId, self._boxId, self._editable);
          toast(forCatch
            ? 'Voice memo saved — it will attach to this catch.'
            : (memoTranscript ? 'Voice memo saved — transcript added to notes.' : 'Voice memo saved.'));
          if (onSaved) { try { onSaved(memoId); } catch (e) { /* noop */ } }
        }).catch(function () { self._saving = false; toast('Could not save the memo.'); });
      };
      rec.start();
      self.recorder = rec; self.recording = true; self.targetSetId = setId;
      self._saving = !!onSaved; /* catch-memo: saveLog waits for the link */
      btn.innerHTML = '<span class="rec-indicator"></span>Stop recording';
      /* live transcription alongside the recording (needs a connection; the
         audio keeps recording regardless) */
      self._transcript = '';
      self._recog = null;
      if (Voice.supported()) {
        try {
          var RCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
          var rg = new RCtor();
          rg.lang = 'en-US'; rg.interimResults = false; rg.continuous = true;
          rg.onresult = function (ev) {
            for (var i = ev.resultIndex; i < ev.results.length; i++) {
              if (ev.results[i].isFinal) self._transcript += ev.results[i][0].transcript + ' ';
            }
          };
          rg.onerror = function () { self._recog = null; /* offline — audio keeps recording */ };
          rg.start();
          self._recog = rg;
        } catch (e) { self._recog = null; }
      }
    }).catch(function () {
      toast('Microphone permission was denied.');
    });
  },
  stop: function (btn) {
    var self = this;
    this.recording = false;
    if (btn) btn.innerHTML = MEMO_IDLE_HTML;
    /* let the transcription deliver its final words before the recorder stops */
    var done = false;
    function fin() {
      if (done) return; done = true;
      try { if (self.recorder) self.recorder.stop(); } catch (e) { /* noop */ }
    }
    var rg = this._recog; this._recog = null;
    if (rg) {
      rg.onend = fin;
      try { rg.stop(); } catch (e) { fin(); }
      setTimeout(fin, 2000);
    } else {
      fin();
    }
  }
};

var memoURLs = {};
/* Q71: boxId/editable let the summary sheet render playback-only while the
   Edit Set form gets recording parity. */
function renderMemos(setId, boxId, editable) {
  var box = $(boxId || 'sd-memos');
  if (!box) return;
  /* memo id -> the catch it was recorded for, so linked memos say which
     catch they're on */
  var memoLog = {};
  (Store.data.logs || []).forEach(function (l) {
    logMemoIds(l).forEach(function (mid) { memoLog[mid] = l; });
  });
  IDB.all('memos').then(function (all) {
    var memos = all.filter(function (m) { return m.setId === setId; })
      .sort(function (a, b) { return a.createdAt - b.createdAt; });
    if (!memos.length) { box.innerHTML = '<p class="dim">No memos yet.</p>'; return; }
    box.innerHTML = '';
    memos.forEach(function (m) {
      var wrap = document.createElement('div');
      wrap.className = 'memo-card';
      var linked = memoLog[m.id];
      if (linked) {
        var tag = document.createElement('div');
        tag.className = 'dim memo-catch-tag';
        tag.innerHTML = '<img class="bi" src="assets/icons/mic.png" alt="">On catch: ' + esc(linked.species || 'Unknown') + ' ×' + (linked.count || 1) +
          (linked.date ? ' · ' + esc(fmtDate(linked.date)) : '');
        wrap.appendChild(tag);
      }
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
      row.appendChild(audio); row.appendChild(when);
      if (editable) {
        var del = document.createElement('button');
        del.className = 'btn-small btn-danger';
        del.type = 'button';
        del.textContent = 'Delete';
        del.onclick = function () {
          confirmModal('Delete this memo?', 'The recording will be removed from this phone.', 'Delete', function () {
            IDB.del('memos', m.id).then(function () {
              if (memoURLs[m.id]) { URL.revokeObjectURL(memoURLs[m.id]); delete memoURLs[m.id]; }
              renderMemos(setId, boxId, editable);
            });
          });
        };
        row.appendChild(del);
      }
      wrap.appendChild(row);
      var tr = document.createElement('p');
      if (m.transcript) {
        tr.className = 'memo-transcript';
        tr.textContent = '\u201C' + m.transcript + '\u201D';
      } else {
        tr.className = 'memo-transcript dim';
        tr.textContent = '\uD83C\uDFA4 audio only \u2014 no transcript';
      }
      wrap.appendChild(tr);
      box.appendChild(wrap);
    });
    /* Q99: memos arriving late still decide the notes box's open state. */
    if (boxId === 'se-memos') refreshNotesBox('setform-notessec', 'sf-notes', 'se-memos', 'sf-photos');
    else if (boxId === 'sd-memos') refreshNotesBox('setdetail-notessec', 'sd-notes', 'sd-memos', 'sd-photos');
  });
}

/* Voice memos attached to a catch (log.memoIds). The mic-icon flag on a catch row
   notes that a memo was left; tapping it plays the recording right there.
   Audio elements are built lazily — one IDB fetch per memo, URLs cached. */
function logMemoIds(l) {
  return (l && l.memoIds && l.memoIds.slice()) || [];
}
function logMemoHtml(l) {
  var ids = logMemoIds(l);
  if (!ids.length) return '';
  var label = ids.length === 1 ? 'Memo' : ids.length + ' memos';
  return '<div class="log-memo"><button type="button" class="memo-play" data-memo-play="' +
    esc(ids.join(',')) + '"><img class="bi" src="assets/icons/mic.png" alt="">' + esc(label) + '</button>' +
    '<div class="log-memo-player" hidden></div></div>';
}
function toggleLogMemoPlayer(btn) {
  var wrap = btn.parentNode;
  var player = wrap ? wrap.querySelector('.log-memo-player') : null;
  if (!player) return;
  if (!player.hidden) { player.hidden = true; return; }
  if (player.getAttribute('data-loaded')) { player.hidden = false; return; }
  var ids = (btn.getAttribute('data-memo-play') || '').split(',').filter(Boolean);
  if (!ids.length) return;
  btn.disabled = true;
  var done = 0;
  ids.forEach(function (id) {
    IDB.get('memos', id).then(function (m) {
      done++;
      if (m && m.blob) {
        if (!memoURLs[m.id]) {
          try { memoURLs[m.id] = URL.createObjectURL(m.blob); } catch (e) { /* noop */ }
        }
        if (memoURLs[m.id]) {
          var audio = document.createElement('audio');
          audio.controls = true;
          audio.preload = 'metadata';
          audio.src = memoURLs[m.id];
          player.appendChild(audio);
        }
      }
      if (done === ids.length) {
        btn.disabled = false;
        player.setAttribute('data-loaded', '1');
        if (player.children.length) player.hidden = false;
        else toast('That memo is no longer on this phone.');
      }
    });
  });
}

/* ================= 10. HISTORY / TOTALS / SEASONS ================= */
var histUI = { q: '', disp: 'all', view: 'date', season: 'this', collapsed: {}, expanded: {}, spOpen: {}, ttOpen: {}, defaultsSet: false };
/* Q6: the old History report filters (date range + dimension chips) moved to
   Settings. This independent state drives the catches CSV export only —
   it shares the same criteria but never affects the History tab. */
var exportUI = { from: '', to: '', fSetType: [], fTrapType: [], fLure: [], fBait: [], fUrine: [], fOther: [], fStatus: [] };
var DOWS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
var MONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function dayLabel(iso) {
  var p = (iso || '').split('-');
  if (p.length !== 3) return iso || '';
  var d = new Date(p[0] * 1, p[1] * 1 - 1, p[2] * 1);
  return DOWS[d.getDay()] + ', ' + MONS[d.getMonth()] + ' ' + (p[2] * 1);
}
function dispOf(l) { return l.disposition || 'kept'; }
/* Q141 (2026-10-01): legacy genuine-catch logs predate the count field — a
   missing, zero, or invalid count on a catch normalizes to 1. True empty
   check-ins (otherType 'empty') stay 0. Read-time normalization: the stored
   logs are never rewritten, so every view (Totals, History, Scorecard, bag
   limits, CSV, backup) agrees. */
function normCount(l) {
  if (l.otherType === 'empty') return 0;
  var n = l.count * 1;
  return (n >= 1) ? n : 1;
}

/* ---------- Trap status (build ar; fourth value renamed Other -> Missing 2026-09-27) ----------
   The canonical status list: Active, Sprung, Pulled, Missing.
   Status is manual-only: it changes only when the user picks a new value
   (New/Edit set form, or the status control on the set-detail sheet at
   check time). Logging a catch or recording a Sprung event NEVER changes
   a set's status — no code path below may set s.status automatically. */
var STATUS_VALUES = ['active', 'sprung', 'pulled', 'missing'];
var STATUS_LABELS = { active: 'Active', sprung: 'Sprung', pulled: 'Pulled', missing: 'Missing' };
function statusLabel(v) { return STATUS_LABELS[normStatus(v)] || 'Missing'; }
/* Map any saved status value onto the canonical four. Legacy/unknown
   values are never dropped — they land in the closest bucket. */
function normStatus(v) {
  var s = (v === null || v === undefined) ? '' : String(v).toLowerCase().trim();
  if (s === 'active' || s === 'sprung' || s === 'pulled' || s === 'missing') return s;
  if (s === 'other') return 'missing'; /* 'Other' renamed to 'Missing' 2026-09-27 — same bucket */
  if (s === 'fresh') return 'active'; /* Fresh retired in build at — old Fresh sets read as Active */
  if (s === 'set' || s === 'live' || s === 'open' || s === 'working') return 'active';
  if (s === 'new' || s === 'just set' || s === 'just-set' || s === 'freshly set') return 'active';
  if (s === 'tripped' || s === 'fired' || s === 'sprung-empty' || s === 'sprung empty' || s === 'empty') return 'sprung';
  if (s === 'removed' || s === 'inactive' || s === 'closed' || s === 'retired' || s === 'gone') return 'pulled';
  if (s === '') return 'active'; /* pre-status sets defaulted to active */
  return 'missing'; /* unknown values land in the catch-all */
}
/* Map-view status filters: independent multi-select toggles. Several can be
   on at once; a set shows when its current status is toggled on. */
var mapStatusFilter = { active: true, sprung: true, pulled: true, missing: true };
/* Q145 — pin color schemes (Lydia's ask, Tanner approved 2026-10-02).
   Earthy is the default. Every scheme keeps the same hue→status mapping
   (greenish=Active, goldish=Sprung, grayish=Pulled, blueish=Missing) so the
   status language survives. Colors live in CSS vars; JS only flips
   body[data-pinscheme] and persists the choice in Store.data (rides backup). */
var PIN_SCHEMES = [
  { id: 'earthy', name: 'Earthy', colors: { active:'#7fa650', sprung:'#d19a2f', pulled:'#7d7663', missing:'#5b8dd9' } },
  { id: 'classic', name: 'Classic', colors: { active:'#4caf50', sprung:'#d19a2f', pulled:'#8a8a8a', missing:'#3b82f6' } },
  { id: 'bold', name: 'Bold', colors: { active:'#2ecc40', sprung:'#f5a623', pulled:'#a8a8a8', missing:'#2f7bff' } },
  { id: 'pastel', name: 'Pastel', colors: { active:'#a9d6a5', sprung:'#eacd7d', pulled:'#c9c9c9', missing:'#a9c6f2' } }
];
function pinSchemeById(id) {
  for (var i = 0; i < PIN_SCHEMES.length; i++) if (PIN_SCHEMES[i].id === id) return PIN_SCHEMES[i];
  return PIN_SCHEMES[0];
}
function pinSchemeId() {
  var id = Store.data && Store.data.pinScheme;
  return pinSchemeById(id).id;
}
function applyPinScheme(id) {
  id = pinSchemeById(id).id;
  document.body.setAttribute('data-pinscheme', id);
  if (Store.data) { Store.data.pinScheme = id; Store.save(); }
  renderPinSchemeList();
}
function renderPinSchemeList() {
  var host = $('pinscheme-list');
  if (!host) return;
  var cur = pinSchemeId();
  host.innerHTML = PIN_SCHEMES.map(function (s) {
    var dots = ['active', 'sprung', 'pulled', 'missing'].map(function (k) {
      return '<i style="background:' + s.colors[k] + '"></i>';
    }).join('');
    return '<button type="button" class="scheme-row" data-scheme="' + s.id + '" aria-pressed="' + (s.id === cur) + '">' +
      '<span>' + esc(s.name) + '</span><span class="scheme-dots">' + dots + '</span>' +
      (s.id === cur ? '<span class="scheme-check">✓</span>' : '') + '</button>';
  }).join('');
  var btns = host.querySelectorAll('button[data-scheme]');
  for (var i = 0; i < btns.length; i++) {
    btns[i].onclick = function () { applyPinScheme(this.getAttribute('data-scheme')); };
  }
}
function renderMapStatusFilters() {
  var host = $('map-status-filters');
  if (!host) return;
  host.innerHTML = STATUS_VALUES.map(function (v) {
    return '<button type="button" class="chip mst-' + v + (mapStatusFilter[v] ? ' on' : '') +
      '" data-mstatus="' + v + '" aria-pressed="' + (mapStatusFilter[v] ? 'true' : 'false') + '">' +
      esc(STATUS_LABELS[v]) + '</button>';
  }).join('');
  var btns = host.querySelectorAll('button[data-mstatus]');
  for (var i = 0; i < btns.length; i++) {
    btns[i].onclick = function () {
      var v = this.getAttribute('data-mstatus');
      mapStatusFilter[v] = !mapStatusFilter[v];
      renderMapStatusFilters();
      refreshMarkers();
      /* Q168 (2026-10-07): Tanner — if the route is up while he toggles, the
         route redraws live against the new filter instead of going stale. */
      if (typeof routeShownFor !== 'undefined' && routeShownFor &&
          typeof drawRouteEstimate === 'function') {
        var rl = routeShownFor;
        if (!drawRouteEstimate(rl)) toast('Not enough visible sets for a route.');
      }
    };
  }
}
function logStatus(l) {
  var s = l.setId ? getSet(l.setId) : null;
  return s ? normStatus(s.status) : '';
}
var DIM_DEFS = [
  { key: 'fSetType', field: 'setType', label: 'Set Type' },
  { key: 'fTrapType', field: 'trapType', label: 'Trap Type' },
  { key: 'fLure', field: 'lure', label: 'Lure' },
  { key: 'fBait', field: 'bait', label: 'Bait' },
  { key: 'fUrine', field: 'urine', label: 'Urine' },
  { key: 'fOther', field: 'other', label: 'Other Attractants' },
  { key: 'fStatus', field: '__status', label: 'Trap Status' }
];
function dimValue(l, def) {
  return def.field === '__status' ? logStatus(l) : (l[def.field] || '');
}
function dimLabel(def, v) {
  if (!v) return def.field === '__status' ? '(deleted set)' : '(none)';
  if (def.field === '__status') return STATUS_LABELS[v] || v;
  return v;
}
function dimValues(def) {
  var seen = {}, out = [];
  activeLogs().forEach(function (l) {
    /* Q26: attractant dims hold lists — flatten them into the value list */
    var vs = toAttrArray(dimValue(l, def));
    if (!vs.length) vs = [''];
    vs.forEach(function (v) { if (!seen[v]) { seen[v] = true; out.push(v); } });
  });
  out.sort(function (a, b) {
    var la = dimLabel(def, a).toLowerCase(), lb = dimLabel(def, b).toLowerCase();
    return la < lb ? -1 : (la > lb ? 1 : 0);
  });
  return out;
}
function dimPass(val, sel) {
  if (!sel || !sel.length) return true;
  /* Q26: a catch matches when ANY of its values is selected */
  var vals = toAttrArray(val);
  if (!vals.length) vals = [''];
  for (var i = 0; i < vals.length; i++) if (sel.indexOf(vals[i]) !== -1) return true;
  return false;
}
/* The History tab's own filter: search box + disposition chips only. The
   report filters (date range, dimensions) moved to Settings (exportUI) and
   drive the catches CSV export, not this list. */
function histFilteredLogs() {
  var f = histUI, q = f.q.toLowerCase();
  /* Q40: season scope — Sept 1 – Aug 31 season years (Tanner 2026-09-30).
     Logs with no usable date are never scope-filtered out. */
  var thisSY = seasonYearOf(todayISO()), lastSY = prevSeasonLabel(thisSY);
  return activeLogs().slice().sort(function (a, b) {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return b.createdAt - a.createdAt;
  }).filter(function (l) {
    /* Tanner 2026-09-30: 'empty' check-ins are the absence of an event — they
       stay in the data/exports but never show in History. */
    if (l.otherType === 'empty') return false;
    if (f.season === 'this' || f.season === 'last') {
      var sy = l.seasonYear || (l.date ? seasonYearOf(l.date) : '');
      if (sy && sy !== (f.season === 'this' ? thisSY : lastSY)) return false;
    }
    if (f.disp !== 'all' && dispOf(l) !== f.disp) return false;
    if (q) {
      var hay = ((l.species || '') + ' ' + (l.setName || '') + ' ' + (l.trapType || '') + ' ' + (l.notes || '') + ' ' +
        ATTRACTANT_KEYS.map(function (k) { return joinAttr(l[k]); }).join(' ')).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  });
}
function countExportFilters() {
  var f = exportUI, n = 0;
  if (f.from) n++;
  if (f.to) n++;
  n += f.fSetType.length + f.fTrapType.length + f.fLure.length + f.fBait.length + f.fUrine.length + f.fOther.length + f.fStatus.length;
  return n;
}
function exportFiltersActive() { return countExportFilters() > 0; }
/* The CSV export's filter: date range + dimensions from the independent
   Settings filter state. History's search/disposition never touch it. */
function exportFilteredLogs() {
  var f = exportUI;
  return activeLogs().slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }).filter(function (l) {
    if (f.from && l.date < f.from) return false;
    if (f.to && l.date > f.to) return false;
    for (var i = 0; i < DIM_DEFS.length; i++) {
      if (!dimPass(dimValue(l, DIM_DEFS[i]), f[DIM_DEFS[i].key])) return false;
    }
    return true;
  });
}
function renderExportDimChips() {
  var host = $('exp-dim-filters');
  if (!host) return;
  host.innerHTML = DIM_DEFS.map(function (def) {
    var vals = dimValues(def);
    if (!vals.length) return '';
    var sel = exportUI[def.key];
    return '<div class="dim-label">' + esc(def.label) + '</div>' +
      '<div class="chip-row">' + vals.map(function (v) {
        return '<button type="button" class="chip' + (sel.indexOf(v) !== -1 ? ' on' : '') +
          '" data-efdim="' + esc(def.key) + '" data-efval="' + esc(v) + '">' +
          esc(dimLabel(def, v)) + '</button>';
      }).join('') + '</div>';
  }).join('');
}
function renderExportFilterBar() {
  var n = countExportFilters();
  var cnt = $('exp-filters-count');
  if (cnt) cnt.textContent = n ? ' (' + n + ' filter' + (n === 1 ? '' : 's') + ')' : '';
  /* Q-report: live match count — the catches CSV exports exactly
     exportFilteredLogs(), so this number is what the download will contain. */
  var mc = $('exp-match-count');
  if (mc) {
    var total = activeLogs().length, match = exportFilteredLogs().length;
    if (!total) mc.textContent = 'No catches logged yet.';
    else if (!n) mc.textContent = total === 1 ? 'Your 1 catch will be in the report.' : 'All ' + total + ' catches will be in the report.';
    else if (!match) mc.textContent = 'No catches match these filters.';
    else mc.textContent = match === 1 ? '1 of ' + total + ' catches matches these filters.' : match + ' of ' + total + ' catches match these filters.';
  }
  var fr = $('exp-from'), to = $('exp-to');
  if (fr && fr.value !== exportUI.from) fr.value = exportUI.from;
  if (to && to.value !== exportUI.to) to.value = exportUI.to;
}
function clearExportFilters() {
  exportUI.from = ''; exportUI.to = '';
  exportUI.fSetType = []; exportUI.fTrapType = []; exportUI.fLure = []; exportUI.fBait = []; exportUI.fStatus = [];
}

function renderHistChips() {
  var dc = $('hist-disp-chips');
  var defs = [['all', 'All'], ['kept', 'Dispatched'], ['kept-alive', 'Kept alive'], ['released', 'Released'], ['transported', 'Transported'], ['discarded', 'Discarded']];
  dc.innerHTML = defs.map(function (d) {
    return '<button type="button" class="chip' + (histUI.disp === d[0] ? ' on' : '') + '" data-disp="' + d[0] + '">' + d[1] + '</button>';
  }).join('');
}

function renderHistSummary(logs) {
  var el = $('hist-summary');
  if (!logs.length) { el.innerHTML = ''; return; }
  var years = {};
  logs.forEach(function (l) { years[l.seasonYear || seasonYearOf(l.date)] = true; });
  var sy = Object.keys(years).sort().reverse()[0];
  var catches = 0, released = 0, sps = {};
  logs.forEach(function (l) {
    if (l.otherType) return; /* events are not catches */
    if ((l.seasonYear || seasonYearOf(l.date)) !== sy) return;
    var c = normCount(l);
    catches += c;
    if (dispOf(l) === 'released') released += c;
    if (l.species) sps[l.species] = true;
  });
  el.innerHTML = '<strong>Season ' + esc(sy) + '</strong><span class="dim"> · ' + catches +
    ' catch' + (catches === 1 ? '' : 'es') + ' · ' + Object.keys(sps).length +
    ' species · ' + released + ' released</span>';
}

/* One log entry row. showDate adds the day label (used in the By-species view).
   Other events show their subtype label (plus a badge when free-text
   species was entered) so they're distinguishable from catches. */
function logRowHtml(l, showDate) {
  var expanded = !!histUI.expanded[l.createdAt];
  var meta = (showDate ? esc(dayLabel(l.date) + (l.time ? ' · ' + fmtTime(l.time) : '')) : '') +
    ((l.setName || '') ? (showDate ? ' · ' : '') + esc(l.setName) : '') +
    (function () { var a = allAttrSummary(l); return a ? ' · ' + esc(a) : ''; })();
  var title;
  if (l.otherType) {
    var ol = OTHER_LABELS[l.otherType] || 'Other event';
    title = '<span class="lr-species">' + esc(l.species || ol) + '</span>' +
      (l.species ? ' <span class="badge other-ev">' + esc(ol) + '</span>' : '');
  } else {
    title = '<span class="lr-species">' + esc(l.species) + '</span>';
  }
  return '<div class="log-row' + (expanded ? ' expanded' : '') + '" data-log="' + l.createdAt + '">' +
    '<div class="lr-top">' + title +
    '<span class="lr-count">×' + esc(normCount(l)) + '</span>' +
    dispBadge(l.disposition) +
    '<button type="button" class="log-del" data-del-log="' + l.id + '" aria-label="Delete this log entry">×</button></div>' +
    (meta ? '<div class="dim">' + meta + '</div>' : '') +
    (l.notes ? '<div class="lr-notes">' + esc(l.notes) + '</div>' : '') +
    logMemoHtml(l) +
    (l.weather ? '<div class="dim">🌤 ' + esc(weatherText(l.weather)) + '</div>' : '') + '</div>';
}

function renderHistByDate(list) {
  var f = histUI;
  /* Q84 (2026-10-01): Tanner — every day group starts collapsed when History
     opens; nothing is open until he taps it. (Replaces the old 7-day rule.) */
  if (!f.defaultsSet) {
    var seenDays = {};
    list.forEach(function (l) {
      if (!l.date || seenDays[l.date]) return; seenDays[l.date] = true;
      f.collapsed[l.date] = true;
    });
    f.defaultsSet = true;
  }
  var html = '', lastSY = null, curDay = null;
  list.forEach(function (l) {
    var sy = l.seasonYear || seasonYearOf(l.date);
    if (sy !== lastSY) {
      if (curDay !== null) { html += '</div>'; curDay = null; }
      html += '<div class="season-group-head">Season ' + esc(sy) + '</div>';
      lastSY = sy;
    }
    if (l.date !== curDay) {
      if (curDay !== null) html += '</div>';
      var dayCatches = 0;
      list.forEach(function (m) { if (m.date === l.date && (m.seasonYear || seasonYearOf(m.date)) === sy) dayCatches += normCount(m); });
      var shut = !!f.collapsed[l.date];
      html += '<div class="day-group"><button type="button" class="day-head" data-day="' + esc(l.date) + '">' +
        esc(dayLabel(l.date)) + ' <span class="dim">· ' + dayCatches + ' catch' + (dayCatches === 1 ? '' : 'es') + '</span>' +
        '<span class="chev">' + (shut ? '▸' : '▾') + '</span></button>' +
        '<div class="day-body"' + (shut ? ' hidden' : '') + '>';
      curDay = l.date;
    }
    html += logRowHtml(l, false);
  });
  if (curDay !== null) html += '</div>';
  return html;
}

function renderHistBySpecies(list) {
  var f = histUI;
  var groups = {};
  list.forEach(function (l) {
    /* Other events group under their subtype label, not a species. */
    var sp = l.otherType ? (OTHER_LABELS[l.otherType] || 'Other event') : (l.species || 'Unknown');
    var g = groups[sp] || (groups[sp] = { logs: [], kept: 0, alive: 0, released: 0, transported: 0, total: 0 });
    var c = normCount(l);
    g.logs.push(l); g.total += c;
    var d = dispOf(l);
    if (d === 'released') g.released += c;
    else if (d === 'kept-alive') g.alive += c;
    else if (d === 'transported') g.transported += c;
    else g.kept += c;
  });
  var names = Object.keys(groups).sort(function (a, b) { return groups[b].total - groups[a].total; });
  var html = '';
  names.forEach(function (sp) {
    var g = groups[sp], open = !!f.spOpen[sp];
    var parts = [];
    if (g.kept) parts.push(g.kept + ' kept');
    if (g.alive) parts.push(g.alive + ' kept alive');
    if (g.released) parts.push(g.released + ' released');
    if (g.transported) parts.push(g.transported + ' transported/released');
    html += '<div class="sp-group"><button type="button" class="sp-head" data-sp="' + esc(sp) + '">' +
      '<span class="sp-name">' + esc(sp) + '</span>' +
      '<span class="sp-total">×' + g.total + '</span>' +
      '<span class="chev">' + (open ? '▾' : '▸') + '</span></button>' +
      '<div class="dim sp-sub">' + esc(parts.join(' · ') || 'no catches') + '</div>';
    if (open) {
      html += '<div class="sp-body">';
      g.logs.forEach(function (l) { html += logRowHtml(l, true); });
      html += '</div>';
    }
    html += '</div>';
  });
  return html;
}

/* Q16: History "By trap type" view — entries grouped under their trap type
   stamped at log time (Foothold, Snare, Dog-proof…). One set = one trap, so
   the type is unambiguous; labeled "By Trap Type" (not "By Trap") for that
   reason. Same collapsible group pattern as By Species. */
function renderHistByTrapType(list) {
  var f = histUI;
  var groups = {};
  list.forEach(function (l) {
    var tt = l.trapType || 'Unknown trap type';
    var g = groups[tt] || (groups[tt] = { logs: [], kept: 0, alive: 0, released: 0, transported: 0, total: 0 });
    var c = normCount(l);
    g.logs.push(l); g.total += c;
    var d = dispOf(l);
    if (d === 'released') g.released += c;
    else if (d === 'kept-alive') g.alive += c;
    else if (d === 'transported') g.transported += c;
    else g.kept += c;
  });
  var names = Object.keys(groups).sort(function (a, b) { return groups[b].total - groups[a].total; });
  var html = '';
  names.forEach(function (tt) {
    var g = groups[tt], open = !!f.ttOpen[tt];
    var parts = [];
    if (g.kept) parts.push(g.kept + ' kept');
    if (g.alive) parts.push(g.alive + ' kept alive');
    if (g.released) parts.push(g.released + ' released');
    if (g.transported) parts.push(g.transported + ' transported/released');
    html += '<div class="sp-group"><button type="button" class="sp-head tt-head" data-tt="' + esc(tt) + '">' +
      '<span class="sp-name">' + esc(tt) + '</span>' +
      '<span class="sp-total">×' + g.total + '</span>' +
      '<span class="chev">' + (open ? '▾' : '▸') + '</span></button>' +
      '<div class="dim sp-sub">' + esc(parts.join(' · ') || 'no catches') + '</div>';
    if (open) {
      html += '<div class="sp-body">';
      g.logs.forEach(function (l) { html += logRowHtml(l, true); });
      html += '</div>';
    }
    html += '</div>';
  });
  return html;
}

function renderHistory() {
  var box = $('history-list');
  var logs = activeLogs();
  renderHistChips();
  var seg = $('hist-view-seg');
  if (seg) {
    var btns = seg.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('selected', btns[i].getAttribute('data-view') === histUI.view);
    }
  }
  /* Q40: season scope segmented control. */
  var sseg = $('hist-season-seg');
  if (sseg) {
    var sbtns = sseg.querySelectorAll('button');
    for (var j = 0; j < sbtns.length; j++) {
      sbtns[j].classList.toggle('selected', sbtns[j].getAttribute('data-season') === histUI.season);
    }
  }
  if (!logs.length) {
    renderHistSummary([]);
    box.innerHTML = '<div class="empty"><div class="big"><img class="bi inv" src="assets/icons/logbook.png" alt=""></div>No catches logged yet.<br>Tap a set pin on the map to log your first catch.</div>';
    return;
  }
  var list = histFilteredLogs();
  renderHistSummary(list);
  if (!list.length) {
    box.innerHTML = '<div class="empty"><div class="big">🔍</div>No catches match those filters.</div>';
    return;
  }
  box.innerHTML = (histUI.view === 'species') ? renderHistBySpecies(list)
    : (histUI.view === 'traptype') ? renderHistByTrapType(list)
    : renderHistByDate(list);
}

/* ================= Q5. LURE SCORECARD TAB =================
   Its own bottom tab. Answers "what's actually producing?" from the lure /
   bait / urine (Q11) stamped on each catch at log time — changing a set's
   attractants mid-season never rewrites past catches. Unstamped catches sit
   in an "Unspecified" bucket below the rankings: honest numbers, never
   competing in them. */
var scoreUI = { season: 'this', by: 'lure', species: '', h2hA: '', h2hB: '' };
function prevSeasonYear(sy) {
  var y = parseInt((sy || '').split('-')[0], 10) || 0;
  return (y - 1) + '-' + String(y).slice(2);
}
function scoreSeasonMatch(l, seasonKey) {
  if (seasonKey === 'all') return true;
  var sy = l.seasonYear || seasonYearOf(l.date);
  var thisSY = seasonYearOf(todayISO());
  return sy === (seasonKey === 'this' ? thisSY : prevSeasonYear(thisSY));
}
/* Stamped-catch groups: [{ name, catches, nsets }]. Empty stamps go to the
   unspecified bucket, kept out of the rankings. */
function scorecardGroups(by, seasonKey, species) {
  var groups = {}, unspec = { catches: 0, _sets: {} };
  activeLogs().forEach(function (l) {
    if (l.otherType) return; /* Other events are events, not catches */
    if (!scoreSeasonMatch(l, seasonKey)) return;
    if (species && l.species !== species) return;
    var c = normCount(l);
    /* Q26: every distinct attractant value on the catch earns the full
       credit — no fractional splits. Dupes collapse case-insensitively so
       "Fox urine" twice scores once; "Fox urine" vs "fox urine" across
       catches share one group under the first-seen spelling. */
    var vals = [], seen = {};
    toAttrArray(l[by]).forEach(function (v) {
      var lk = v.toLowerCase();
      if (seen[lk]) return;
      seen[lk] = true; vals.push(v);
    });
    if (!vals.length) {
      unspec.catches += c;
      if (l.setId) unspec._sets[l.setId] = true;
      return;
    }
    vals.forEach(function (key) {
      var gk = key.toLowerCase();
      var g = groups[gk];
      if (!g) g = groups[gk] = { name: key, catches: 0, _sets: {} };
      g.catches += c;
      if (l.setId) g._sets[l.setId] = true;
    });
  });
  var rows = Object.keys(groups).map(function (k) {
    var g = groups[k];
    return { name: g.name, catches: g.catches, nsets: Object.keys(g._sets).length };
  });
  rows.sort(function (a, b) { return b.catches - a.catches || (a.name < b.name ? -1 : 1); });
  return { rows: rows, unspec: { catches: unspec.catches, nsets: Object.keys(unspec._sets).length } };
}
function renderScorecardTab() {
  var box = $('scorecard-body');
  if (!box) return;
  var u = scoreUI;
  var thisSY = seasonYearOf(todayISO());
  var seasonLabel = u.season === 'this' ? 'Season ' + thisSY
    : (u.season === 'last' ? 'Season ' + prevSeasonYear(thisSY) : 'All-time');
  /* species options from catches in the season window */
  var seen = {};
  activeLogs().forEach(function (l) {
    if (l.otherType || !l.species) return;
    if (scoreSeasonMatch(l, u.season)) seen[l.species] = true;
  });
  var speciesList = Object.keys(seen).sort();
  if (u.species && !seen[u.species]) u.species = '';
  var data = scorecardGroups(u.by, u.season, u.species);
  var names = data.rows.map(function (r) { return r.name; });
  if (u.h2hA && names.indexOf(u.h2hA) === -1) u.h2hA = '';
  if (u.h2hB && names.indexOf(u.h2hB) === -1) u.h2hB = '';
  function segBtns(id, attr, opts) {
    return '<div class="seg compact" id="' + id + '">' + opts.map(function (o) {
      return '<button type="button" data-' + attr + '="' + o[0] + '">' + o[1] + '</button>';
    }).join('') + '</div>';
  }
  var html = segBtns('sc-season-seg', 'season', [['this', 'This Season'], ['last', 'Last Season'], ['all', 'All-Time']]) +
    segBtns('sc-by-seg', 'by', [['lure', 'By Lure'], ['bait', 'By Bait'], ['urine', 'By Urine'], ['visual', 'By Visual'], ['audio', 'By Audio'], ['other', 'By Other']]) +
    '<label class="field" for="sc-species">Species</label>' +
    '<select id="sc-species"><option value="">All species</option>' +
    speciesList.map(function (sp) { return '<option value="' + esc(sp) + '"' + (u.species === sp ? ' selected' : '') + '>' + esc(sp) + '</option>'; }).join('') +
    '</select>';
  var total = 0;
  data.rows.forEach(function (r) { total += r.catches; });
  var noun = u.by;
  var PHRASE = { lure: 'lure', bait: 'bait', urine: 'urine', visual: 'visual attractants', audio: 'audio attractants', other: 'other attractants' };
  var phrase = PHRASE[noun] || noun;
  var nounCap = (noun === 'other') ? 'Other Attractants' : noun.charAt(0).toUpperCase() + noun.slice(1);
  if (!data.rows.length && !data.unspec.catches) {
    html += '<div class="empty"><div class="big">🎯</div>No catches logged' +
      (u.season === 'all' ? ' yet.' : ' for this filter yet.') + '<br>Log a catch and the scorecard fills in.</div>';
  } else {
    html += data.rows.map(function (g) {
      var sp = sponsorForProduct(g.name);
      var chip = (sp && sp.brandLogo)
        ? '<button type="button" class="sc-chip" data-sp="' + esc(sp.id) + '" aria-label="About ' + esc(sp.name) + '">' +
          '<img src="' + esc(sp.brandLogo) + '" alt="' + esc(sp.name) + ' logo"></button>'
        : '';
      return '<div class="sc-row">' + chip + '<span class="sc-name">' + esc(g.name) + '</span>' +
        '<span class="dim">' + g.nsets + ' set' + (g.nsets === 1 ? '' : 's') + '</span>' +
        '<span class="sc-rate"><strong>' + g.catches + '</strong> caught</span></div>';
    }).join('');
    html += '<p class="dim" style="margin-top:8px">A catch credits every ' + phrase + ' on the set — totals can exceed the catch count.</p>';
  }
  /* unspecified bucket: below the rankings, never competing in them */
  if (data.unspec.catches) {
    html += '<div class="card" style="margin-top:12px"><h3>Unspecified ' + nounCap + '</h3>' +
      '<p class="dim">' + data.unspec.catches + ' caught across ' + data.unspec.nsets + ' set' + (data.unspec.nsets === 1 ? '' : 's') +
      ' with no ' + phrase + ' recorded. Fill in the ' + phrase + ' on those sets and apply it to past catches to move them into the rankings.</p></div>';
  }
  /* head-to-head */
  var h2h = '';
  if (u.h2hA && u.h2hB && u.h2hA !== u.h2hB) {
    h2h = '<div style="display:flex;gap:10px;margin-top:10px">' + [u.h2hA, u.h2hB].map(function (nm) {
      var g = null;
      data.rows.forEach(function (r) { if (r.name === nm) g = r; });
      if (!g) return '';
      return '<div class="card" style="flex:1;margin:0"><h3>' + esc(nm) + '</h3>' +
        '<div class="big-num">' + g.catches + '</div><p class="dim">caught · ' + g.nsets + ' set' + (g.nsets === 1 ? '' : 's') + '</p></div>';
    }).join('') + '</div>';
  } else if (u.h2hA && u.h2hA === u.h2hB) {
    h2h = '<p class="dim" style="margin-top:10px">Pick two different ' + (u.by === 'lure' ? 'lures' : (u.by === 'bait' ? 'baits' : (u.by === 'urine' ? 'urines' : phrase))) + ' to compare.</p>';
  }
  function h2hOpts(sel) {
    return names.map(function (n) {
      return '<option value="' + esc(n) + '"' + (sel === n ? ' selected' : '') + '>' + esc(n) + '</option>';
    }).join('');
  }
  html += '<div class="card" style="margin-top:12px"><h3>Head-to-Head</h3>' +
    '<div class="btn-row"><div><label class="field" for="sc-h2h-a">First</label>' +
    '<select id="sc-h2h-a"><option value="">Pick one…</option>' + h2hOpts(u.h2hA) + '</select></div>' +
    '<div><label class="field" for="sc-h2h-b">Second</label>' +
    '<select id="sc-h2h-b"><option value="">Pick one…</option>' + h2hOpts(u.h2hB) + '</select></div></div>' +
    h2h + '</div>';
  html += '<div class="scorecard-honesty"><strong>Scorecard rankings are earned from real catch data \u2014 never bought.</strong></div>';
  box.innerHTML = html;
  var sub = $('scorecard-sub');
  box.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('.sc-chip') : null;
    if (b) openSponsorBio(b.getAttribute('data-sp'));
  });
  if (sub) sub.textContent = seasonLabel + ' · ' + total + ' caught' + (u.species ? ' · ' + u.species : '') + '.';
  function segWire(id, key, attr) {
    var seg = $(id);
    if (!seg) return;
    var btns = seg.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('selected', btns[i].getAttribute('data-' + attr) === u[key]);
      btns[i].onclick = (function (b) {
        return function () {
          u[key] = b.getAttribute('data-' + attr);
          u.h2hA = ''; u.h2hB = '';
          renderScorecardTab();
        };
      })(btns[i]);
    }
  }
  segWire('sc-season-seg', 'season', 'season');
  segWire('sc-by-seg', 'by', 'by');
  $('sc-species').onchange = function () { u.species = this.value; u.h2hA = ''; u.h2hB = ''; renderScorecardTab(); };
  $('sc-h2h-a').onchange = function () { u.h2hA = this.value; renderScorecardTab(); };
  $('sc-h2h-b').onchange = function () { u.h2hB = this.value; renderScorecardTab(); };
}
/* Q5: one-tap backfill — when a set's attractants are filled in from blank,
   offer to stamp them onto that set's past unstamped catches. Q26: values
   are arrays; the offer fires per field when the set's list is non-empty
   and past catches have empty lists for that field. */
/* B32: offerAttractantBackfill removed — editing a set's attractants never
   touches old catches. */

/* Q15: which By Set rows are expanded — session-only, resets on reload. */
var totalsExpanded = {};

function renderTotals() {
  var box = $('totals-body');
  var logs = activeLogs();
  if (!logs.length) {
    box.innerHTML = '<div class="empty"><div class="big"><img class="bi inv" src="assets/icons/barchart.png" alt=""></div>Nothing to total yet.</div>';
    return;
  }
  var years = {};
  logs.forEach(function (l) { years[l.seasonYear || seasonYearOf(l.date)] = true; });
  var yearList = Object.keys(years).sort().reverse();
  var sy = yearList[0];
  $('totals-sub').textContent = 'Season ' + sy + ' · ' + logs.length + ' log entries all-time.';
  var bySpecies = {}, bySet = {}, byDisp = { kept: 0, alive: 0, released: 0, transported: 0 };
  var byDispSp = { kept: {}, alive: {}, released: {}, transported: {} }; /* Q61: species caught under each disposition */
  logs.forEach(function (l) {
    if (l.otherType) return; /* Other events are events, not catches — excluded from Totals */
    var y = l.seasonYear || seasonYearOf(l.date);
    if (y !== sy) return;
    var c = normCount(l), d = l.disposition || 'kept';
    bySpecies[l.species] = bySpecies[l.species] || { kept: 0, alive: 0, released: 0, transported: 0 };
    bySet[l.setName || '(deleted set)'] = bySet[l.setName || '(deleted set)'] || { kept: 0, alive: 0, released: 0, transported: 0 };
    var bucket = (d === 'released') ? 'released' : (d === 'kept-alive' ? 'alive' : (d === 'transported' ? 'transported' : 'kept'));
    bySpecies[l.species][bucket] += c; bySet[l.setName || '(deleted set)'][bucket] += c; byDisp[bucket] += c;
    byDispSp[bucket][l.species] = (byDispSp[bucket][l.species] || 0) + c;
  });
  function rows(obj, withSetup) {
    /* 2026-10-01 (Tanner): the headline number is TOTAL caught — a released
       animal was still caught. Disposition breakdown hides behind the tap.
       Sorted by the total actually displayed, highest to lowest. */
    function tot(o) { return o.kept + o.alive + o.released + o.transported; }
    return Object.keys(obj).sort(function (a, b) { return tot(obj[b]) - tot(obj[a]); }).map(function (k) {
      var o = obj[k], sub = [];
      var setup = withSetup ? setSetup[k] : null;
      if (o.alive) sub.push(o.alive + ' kept alive');
      if (o.released) sub.push(o.released + ' released');
      if (o.transported) sub.push(o.transported + ' transported');
      /* Rows show the title (name + total caught) only. The
         disposition breakdown and (for sets) the setup fields hide behind a
         tap, so the tab reads clean. */
      var key = (withSetup ? 'set:' : 'sp:') + k;
      var hasDetail = sub.length > 0 || !!setup;
      var open = hasDetail && !!totalsExpanded[key];
      var html = '<div class="rowline' + (setup ? ' totals-setrow' : '') + '"' +
        (hasDetail ? ' data-totkey="' + esc(key) + '"' : '') + '>' +
        '<span>' + (hasDetail ? '<span class="tchev">' + (open ? '▾' : '▸') + '</span> ' : '') + esc(k) +
        '</span><span class="big-num">' + tot(o) + '</span></div>';
      if (hasDetail) {
        html += '<div class="totals-detail"' + (open ? '' : ' hidden') + '>' +
          (sub.length ? '<div class="dim">' + sub.join(' · ') + '</div>' : '') +
          (setup ? setupDetailHtml(setup) : '') + '</div>';
      }
      return html;
    }).join('');
  }
  /* Per-set setup details, collapsed behind a tap (see rows() above). Each
     setup field shows None when empty; Traps only appears past one trap. */
  var setSetup = {};
  activeSets().forEach(function (s) {
    if (setSetup[s.name]) return;
    var trapBit = s.trapType || '', td = trapDetailSummary(s);
    if (td) trapBit += (trapBit ? ' · ' : '') + td;
    setSetup[s.name] = {
      bait: toAttrArray(s.bait).join(' / '),
      lure: toAttrArray(s.lure).join(' / '),
      urine: toAttrArray(s.urine).join(' / '),
      other: toAttrArray(s.other).join(' / '),
      trap: trapBit,
      traps: (s.trapCount * 1) || 1,
      setType: s.setType || ''
    };
  });
  function setupDetailHtml(st) {
    var fields = [['Bait', st.bait], ['Lure', st.lure], ['Urine', st.urine],
      ['Other', st.other], ['Trap', st.trap], ['Set type', st.setType]];
    if (st.traps > 1) fields.push(['Traps', String(st.traps)]);
    return fields.map(function (f) {
      return '<div><span class="dim">' + f[0] + ':</span> ' + (f[1] ? esc(f[1]) : '<span class="dim">None</span>') + '</div>';
    }).join('');
  }
  box.innerHTML = totalsSectionChips() + totalsSectionCards();

  function totalsSectionChips() {
    var ts = totalsSections();
    var defs = [['species', 'Species'], ['set', 'Set'], ['disposition', 'Disposition']];
    return '<div class="chip-row" id="totals-sec-chips" style="margin-bottom:10px">' + defs.map(function (d) {
      return '<button type="button" class="chip' + (ts[d[0]] ? ' on' : '') + '" data-sec="' + d[0] + '">' + d[1] + '</button>';
    }).join('') + '</div>';
  }
  /* Tanner 2026-09-30: each of the three section cards collapses behind its
     own header — tap to open or fold at leisure. State persists on-device. */
  function totalsCollapsed() {
    var t = Store.data.totalsCollapsed;
    if (!t || typeof t !== 'object') { t = {}; Store.data.totalsCollapsed = t; }
    return t;
  }
  function totalsCardHead(key, title) {
    var closed = !!totalsCollapsed()[key];
    return '<button type="button" class="totals-card-head" data-tsec="' + key + '" aria-expanded="' + (!closed) + '">' +
      '<h3>' + title + '</h3><span class="tchev">' + (closed ? '▸' : '▾') + '</span></button>';
  }
  function totalsSectionCards() {
    var ts = totalsSections(), tc = totalsCollapsed(), cards = '';
    if (ts.species) cards += '<div class="card">' + totalsCardHead('species', 'By Species') + '<div class="totals-card-body"' + (tc.species ? ' hidden' : '') + '>' + rows(bySpecies, false) + '</div></div>';
    if (ts.set) cards += '<div class="card">' + totalsCardHead('set', 'By Set') + '<div class="totals-card-body"' + (tc.set ? ' hidden' : '') + '>' + rows(bySet, true) + '</div></div>';
    if (ts.disposition) {
      var names = [['kept', 'Dispatched'], ['alive', 'Kept alive'], ['released', 'Released'], ['transported', 'Transported']];
      /* Q86 (2026-10-01): Tanner — sort largest count first, it reads cleaner. */
      names.sort(function (a, b) { return (byDisp[b[0]] || 0) - (byDisp[a[0]] || 0); });
      /* Q61: each disposition row taps open to show what was caught under it. */
      cards += '<div class="card">' + totalsCardHead('disposition', 'By Disposition') + '<div class="totals-card-body"' + (tc.disposition ? ' hidden' : '') + '>' + names.map(function (n) {
        var b = n[0], sp = byDispSp[b];
        var keys = Object.keys(sp).sort(function (a, c) { return sp[c] - sp[a]; });
        var hasDetail = keys.length > 0;
        var dkey = 'disp:' + b;
        var dopen = hasDetail && !!totalsExpanded[dkey];
        var dhtml = '<div class="rowline"' + (hasDetail ? ' data-totkey="' + dkey + '"' : '') + '>' +
          '<span>' + (hasDetail ? '<span class="tchev">' + (dopen ? '▾' : '▸') + '</span> ' : '') + n[1] +
          '</span><span class="big-num">' + byDisp[b] + '</span></div>';
        if (hasDetail) {
          dhtml += '<div class="totals-detail"' + (dopen ? '' : ' hidden') + '>' + keys.map(function (s) {
            return '<div class="rowline"><span>' + esc(s) + '</span><span class="big-num">' + sp[s] + '</span></div>';
          }).join('') + '</div>';
        }
        return dhtml;
      }).join('') + '</div></div>';
    }
    if (!cards) cards = '<p class="dim" style="text-align:center">All sections hidden — tap a chip above to show one.</p>';
    return cards;
  }
}

/* Q22: Totals tab section toggles, persisted on-device. */
function totalsSections() {
  var t = Store.data.totalsSections;
  if (!t || typeof t !== 'object') t = {};
  if (typeof t.species !== 'boolean') t.species = true;
  if (typeof t.set !== 'boolean') t.set = true;
  if (typeof t.disposition !== 'boolean') t.disposition = true;
  Store.data.totalsSections = t;
  return t;
}

function renderSeasons(filter) {
  var d = stateData();
  var entry = stateEntry(activeStateCode());
  if (!d) {
    $('seasons-list').innerHTML = '<p class="dim">No season data loaded.</p>';
    return;
  }
  $('seasons-title').textContent = 'Season Reminders — ' + d.state_name;
  $('seasons-sub').textContent = d.season_year + ' season year' + (entry && entry.provisional ? ' · data provisional' : '');
  $('seasons-disclaimer').innerHTML = '<div class="wb-title">⚠ ' + esc(REMINDER_LINE) + '</div>' + esc(d.disclaimer || '');
  var rl = $('seasons-regs');
  if (d.regs_url) {
    rl.hidden = false;
    rl.href = d.regs_url;
    rl.innerHTML = 'Official ' + esc(d.state_name) + ' trapping regulations' +
      (d.regs_kind === 'page' ? ' <span class="dim">(agency site)</span>' : ' <span class="dim">(PDF)</span>');
  } else {
    rl.hidden = true;
    rl.removeAttribute('href');
  }
  renderSeasonsCompliance(d);
  var q = (filter || '').toLowerCase();
  var list = sortSpeciesAlpha(stateSpecies().filter(function (sp) {
    return !q || sp.common_name.toLowerCase().indexOf(q) !== -1;
  }));
  $('seasons-list').innerHTML = list.map(function (sp) {
    var info = speciesSeasonInfo(sp);
    return '<button type="button" class="species-row" data-sp="' + esc(sp.common_name) + '">' + speciesIcon(sp.common_name) +
      '<span class="sp-name">' + esc(sp.common_name) +
      (sp.scientific_name ? '<span class="sci">' + esc(sp.scientific_name) + '</span>' : '') + '</span>' +
      '<span class="badge ' + info.badgeClass + '">' + info.badge + '</span>' + '</button>';
  }).join('');
  var btns = $('seasons-list').querySelectorAll('.species-row');
  for (var i = 0; i < btns.length; i++) {
    btns[i].onclick = function (e) {
      var t = e && e.target;
      showSpeciesDetail(this.getAttribute('data-sp'));
    };
  }
}

/* Iowa proof 2026-09-30: Trap & Snare Rules card + game-warden link.
   Data-driven — only states carrying trap_snare_rules / warden_directory
   in their season data show anything. Tanner's call before other states. */
function renderSeasonsCompliance(d) {
  var wl = $('seasons-warden');
  var wd = d.warden_directory;
  if (wd && wd.url) {
    wl.hidden = false;
    wl.href = wd.url;
    /* Tanner 2026-09-30: plain label only — no emoji, no "(DNR — PDF)" suffix. */
    wl.innerHTML = esc(wd.label);
  } else {
    wl.hidden = true;
    wl.removeAttribute('href');
  }
  var box = $('seasons-rules');
  var r = d.trap_snare_rules;
  if (!r) { box.innerHTML = ''; box.hidden = true; return; }
  var h = '<div class="card setsec" id="rules-card">' + /* Q87 (2026-10-01): Tanner — closed by default, cleaner screen. */
    '<button type="button" class="setsec-head" id="rules-toggle"><span>' + esc(r.title) + '</span>' +
    '<span class="setsec-chev">›</span></button>' +
    '<div class="setsec-body" hidden><p class="dim">' + esc(r.intro) + '</p>';
  (r.sections || []).forEach(function (sec) {
    h += '<p class="rules-sec">' + esc(sec.heading) + '</p><ul class="rules-list">' +
      (sec.items || []).map(function (it) { return '<li>' + esc(it) + '</li>'; }).join('') + '</ul>';
  });
  h += '<p class="dim rules-src">Sources: ' + (r.sources || []).map(function (s) {
    return '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.label) + '</a>';
  }).join(' · ') + '<br>Updated ' + esc(r.updated) + '</p></div></div>';
  box.innerHTML = h;
  box.hidden = false;
  $('rules-toggle').onclick = function () {
    var card = $('rules-card');
    var body = card.querySelector('.setsec-body');
    var open = !body.hasAttribute('hidden');
    if (open) { body.setAttribute('hidden', ''); card.classList.remove('open'); }
    else { body.removeAttribute('hidden'); card.classList.add('open'); }
  };
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
  if (sp.domestic) html += '<p class="dim">' + esc(domesticNotes()) + '</p>';
  else if (sp.notes) html += '<p class="dim">' + esc(sp.notes) + '</p>';
  html += '<p class="reminder-tag">' + esc(REMINDER_LINE) + ' ' + esc(d.disclaimer || '') + '</p>';
  html += '<button class="btn-secondary" id="m-close" type="button" style="width:100%;margin-top:10px">Close</button>';
  showModal(html);
  $('m-close').onclick = closeModal;
}

/* ================= 11. LICENSES ================= */
var licURLs = {};
/* License wallet is per trap line. Photos saved before lines existed
       have no lineId and belong to the first line.
   Q52: landowner-notebook photos carry landownerId and never show here. */
function isLicenseWalletPhoto(p, lid, firstId) {
  if (!p || p.setId || p.logId || p.landownerId) return false;
  return (p.lineId || firstId) === lid;
}
function renderLicenses() {
  var grid = $('license-grid');
  IDB.all('photos').then(function (all) {
    var lid = activeLineId();
    var firstId = (Store.data.lines && Store.data.lines[0] && Store.data.lines[0].id) || null;
    all = all.filter(function (p) { return isLicenseWalletPhoto(p, lid, firstId); });
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
  var d = stateData();
  /* Official state license vendor is automatic — no typing needed.
     A per-photo custom link still overrides it when set. */
  var officialUrl = (!link && d && d.license_url) ? d.license_url : '';
  var btnUrl = link || officialUrl;
  var html = '<img src="' + licURLs[p.id] + '" style="width:100%;border-radius:8px" alt="License photo">';
  if (btnUrl) {
    /* Tanner 2026-10-01: title case on buttons and labels. */
    var btnLabel = link ? 'Open License Site ↗'
      : 'Official ' + esc(d.state_name) + ' License Site ↗';
    html += '<a class="btn-primary" style="display:block;text-align:center;margin-top:10px;text-decoration:none;border-radius:var(--radius)" href="' +
      esc(btnUrl) + '" target="_blank" rel="noopener">' + btnLabel + '</a>';
    if (!link && d.license_note) {
      html += '<p class="dim" style="margin-top:8px">' + esc(d.license_note) + '</p>';
    }
  }
  html += '<label class="field" for="m-lic-link" style="margin-top:12px">Custom Link (Optional — Overrides the Official Site Above)</label>' +
    '<input id="m-lic-link" type="url" inputmode="url" placeholder="https://…" value="' + esc(link) + '" autocomplete="off">' +
    '<div class="btn-row btn-compact" style="margin-top:10px"><button class="btn-secondary" id="m-lic-save" type="button">Save Link</button>' +
    '<button class="btn-secondary" id="m-ph-save" type="button">Save Photo</button>' +
    '<button class="btn-secondary" id="m-close" type="button">Close</button></div>';
  showModal(html);
  $('m-close').onclick = closeModal;
  $('m-ph-save').onclick = function () { sharePhotoFile(p.blob, 'opossum-foot-license'); };
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

/* ================= 11b. LANDOWNER NOTEBOOK (Q52) =================
   One card per landowner: name, phone numbers, notes, permission-slip
   photos, and a boundary (written note and/or uploaded map photo).
   Standalone — landowner records never link to sets or lines' sets/logs.
   Records live in Store.data.landowners (per trap line, like the license
   wallet; included in the JSON backup). Photos live in the IDB 'photos'
   store with landownerId + kind ('slip' | 'boundary') — excluded from the
   JSON backup, exactly like license photos. */
function newLandownerId() {
  return 'lo-' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
}
function normalizeLandowners(d) {
  if (!d || typeof d !== 'object') return;
  if (!Array.isArray(d.landowners)) d.landowners = [];
  var firstId = (d.lines && d.lines[0] && d.lines[0].id) || null;
  d.landowners.forEach(function (lo) {
    if (!lo || typeof lo !== 'object') return;
    if (typeof lo.id !== 'string' || !lo.id) lo.id = newLandownerId();
    if (!lineById(d, lo.lineId)) lo.lineId = firstId;
    if (typeof lo.name !== 'string') lo.name = '';
    if (typeof lo.phones !== 'string') lo.phones = '';
    if (typeof lo.notes !== 'string') lo.notes = '';
    if (typeof lo.boundaryNote !== 'string') lo.boundaryNote = '';
    if (typeof lo.createdAt !== 'number') lo.createdAt = Date.now();
  });
}
function activeLandowners() {
  var id = activeLineId(), out = [];
  (Store.data.landowners || []).forEach(function (lo) { if (lo && lo.lineId === id) out.push(lo); });
  out.sort(function (a, b) {
    var an = String(a.name).toLowerCase(), bn = String(b.name).toLowerCase();
    return an < bn ? -1 : (an > bn ? 1 : 0);
  });
  return out;
}
function landownerById(id) {
  var found = null;
  (Store.data.landowners || []).forEach(function (lo) { if (lo && lo.id === id) found = lo; });
  return found;
}
function landownerMatches(lo, q) {
  if (!q) return true;
  q = String(q).toLowerCase();
  var hay = (String(lo.name) + ' ' + String(lo.phones) + ' ' + String(lo.notes) + ' ' + String(lo.boundaryNote)).toLowerCase();
  return hay.indexOf(q) !== -1;
}
var loPhotoURLs = {};
function loPhotoURL(p) {
  if (!p || !p.blob) return '';
  if (p.id) {
    if (!loPhotoURLs[p.id]) loPhotoURLs[p.id] = URL.createObjectURL(p.blob);
    return loPhotoURLs[p.id];
  }
  /* Pending (not yet saved) photos have no id — cache the object URL on the
     object itself so fresh uploads render instead of a broken thumbnail. */
  if (!p._objURL) p._objURL = URL.createObjectURL(p.blob);
  return p._objURL;
}
/* Second modal layer, above the landowner form (Tanner 2026-09-30). The main
   showModal would wipe the form, so photo viewing and its delete confirm
   live up here instead. */
function showModal2(html) {
  $('modal2-card').innerHTML = html;
  $('modal2').classList.add('show');
}
function closeModal2() { $('modal2').classList.remove('show'); }
function confirmModal2(title, body, okLabel, onOk) {
  showModal2(
    '<h3>' + esc(title) + '</h3><p>' + body + '</p>' +
    '<div class="btn-row"><button class="btn-secondary" id="m2-cancel" type="button">Cancel</button>' +
    '<button class="btn-danger" id="m2-ok" type="button">' + esc(okLabel) + '</button></div>'
  );
  $('m2-cancel').onclick = closeModal2;
  $('m2-ok').onclick = function () { closeModal2(); onOk(); };
}
/* Full-size viewer for a landowner photo (permission slip or boundary map).
   Delete carries the usual gone-forever warning. */
function openLoPhotoViewer(p, title, onDel) {
  openPhotoViewerLayer2(p, title, loPhotoURL, onDel);
}
/* Layer-2 photo viewer for use inside another modal: the main showModal
   would wipe the form underneath, so viewing and its delete confirm live
   up here instead. urlFor(p) resolves the image src. */
function openPhotoViewerLayer2(p, title, urlFor, onDelete) {
  var src = urlFor(p);
  showModal2('<h3>' + esc(title) + '</h3>' +
    (src ? '<img src="' + src + '" style="width:100%;border-radius:8px" alt="' + esc(title) + '">' : '<p class="dim">Photo would not load.</p>') +
    '<div class="btn-row" style="margin-top:10px"><button class="btn-danger" id="m2-ph-del" type="button">Delete</button>' +
    '<button class="btn-secondary" id="m2-ph-save" type="button">Save Photo</button>' +
    '<button class="btn-secondary" id="m2-close" type="button">Close</button></div>');
  $('m2-close').onclick = closeModal2;
  $('m2-ph-save').onclick = function () { if (p && p.blob) sharePhotoFile(p.blob, 'opossum-foot-photo'); };
  $('m2-ph-del').onclick = function () {
    confirmModal2('Delete this photo?', 'It will be gone forever.', 'Delete', function () { onDelete(); });
  };
}
/* Q52: split the free-text phones field into individual dialable numbers. */
function landownerPhoneList(phones) {
  return String(phones || '').split(/[,;\n\/]+/).map(function (p) { return p.trim(); })
    .filter(function (p) { return /[0-9]/.test(p); });
}
function landownerPhoneDigits(p) {
  var plus = p.trim().charAt(0) === '+';
  return (plus ? '+' : '') + p.replace(/\D/g, '');
}
/* Tanner 2026-10-01: display US 10-digit numbers as (515) 555-5555. */
function formatPhoneDisplay(s) {
  var d = landownerPhoneDigits(String(s == null ? '' : s)).replace(/^\+1/, '');
  if (/^\d{10}$/.test(d)) {
    return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
  }
  return s;
}
function landownerPhoneHtml(lo) {
  var nums = landownerPhoneList(lo.phones);
  if (nums.length) {
    /* Tanner 2026-09-30: every number is one tap from a call or a text.
       Q158 (2026-10-06): Tanner — no delete X on the card; a number is
       removed by editing it out in the Edit screen. */
    return nums.map(function (n) {
      var d = landownerPhoneDigits(n);
      return '<div class="lo-phone"><span class="lo-phone-num">' + esc(formatPhoneDisplay(n)) + '</span>' +
        '<span class="lo-phone-btns"><a class="btn-small btn-primary" href="tel:' + esc(d) + '">Call</a>' +
        '<a class="btn-small btn-secondary" href="sms:' + esc(d) + '">Text</a></span></div>';
    }).join('');
  }
  if (lo.phones) return '<p style="margin:4px 0"><strong>' + esc(lo.phones) + '</strong></p>';
  return '';
}
function renderLandowners() {
  var list = $('landowner-list');
  if (!list) return;
  var q = ($('landowner-search') && $('landowner-search').value || '').trim();
  var all = activeLandowners().filter(function (lo) { return landownerMatches(lo, q); });
  IDB.all('photos').then(function (photos) {
    var byLo = {};
    photos.forEach(function (p) {
      if (p && p.landownerId) { (byLo[p.landownerId] = byLo[p.landownerId] || []).push(p); }
    });
    list.innerHTML = '';
    if (!all.length) {
      list.innerHTML = '<p class="dim" style="margin:8px 0">' +
        (q ? 'No landowners match that search.' : 'No landowners yet. Add the folks whose ground you trap.') + '</p>';
      return;
    }
    all.forEach(function (lo) { list.appendChild(landownerCard(lo, byLo[lo.id] || [])); });
  });
}
function landownerCard(lo, photos) {
  var card = document.createElement('div');
  card.className = 'card';
  var slips = photos.filter(function (p) { return p.kind === 'slip'; });
  var bounds = photos.filter(function (p) { return p.kind === 'boundary'; });
  var html = '<h3 style="text-align:left">' + esc(lo.name) + '</h3>';
  html += landownerPhoneHtml(lo);
  if (lo.notes) html += '<p class="dim lo-notes-box" style="margin:4px 0">' + esc(lo.notes) + '</p>';
  /* Q158 (2026-10-06): Tanner — slip and boundary photos viewable right on
     the card, like the license wallet: thumbnails, tap for full screen.
     No delete X anywhere on the card — photo and number removal happens
     in the Edit screen only. */
  var viewable = slips.concat(bounds);
  if (viewable.length) {
    html += '<div class="lic-grid" data-lo-photos></div>';
  } else if (lo.boundaryNote) {
    html += '<p class="dim" style="margin:4px 0">boundary on file</p>';
  }
  html += '<div class="btn-row"><button class="btn-secondary" data-lo-edit type="button">Edit</button>' +
    '<button class="btn-secondary" data-lo-del type="button">Delete</button></div>';
  card.innerHTML = html;
  var grid = card.querySelector('[data-lo-photos]');
  if (grid) {
    viewable.forEach(function (p) {
      var title = p.kind === 'slip' ? 'Permission slip' : 'Boundary map';
      var item = document.createElement('div');
      item.className = 'lic-item';
      var img = document.createElement('img');
      img.src = loPhotoURL(p); img.alt = title;
      img.onclick = function () { openLoPhotoCardViewer(p, title); };
      item.appendChild(img);
      grid.appendChild(item);
    });
  }
  card.querySelector('[data-lo-edit]').onclick = function () { openLandownerForm(lo.id); };
  card.querySelector('[data-lo-del]').onclick = function () { deleteLandowner(lo.id); };
  return card;
}
/* Q158 (2026-10-06): Tanner — view-only photo viewer for the landowner
   card. No Delete button here; removing a photo happens in the Edit
   screen. Mirrors the license-wallet viewer. */
function openLoPhotoCardViewer(p, title) {
  var src = loPhotoURL(p);
  showModal('<h3>' + esc(title) + '</h3>' +
    (src ? '<img src="' + src + '" style="width:100%;border-radius:8px" alt="' + esc(title) + '">' : '<p class="dim">Photo would not load.</p>') +
    '<div class="btn-row" style="margin-top:10px"><button class="btn-secondary" id="m-ph-save" type="button">Save Photo</button>' +
    '<button class="btn-secondary" id="m-close" type="button">Close</button></div>');
  $('m-close').onclick = closeModal;
  $('m-ph-save').onclick = function () { if (p && p.blob) sharePhotoFile(p.blob, 'opossum-foot-photo'); };
}
/* Add/edit form. New photos sit in pendingLoPhotos (Q37's pattern) and are
   flushed to IDB on save; existing photos delete straight away. */
var pendingLoPhotos = [];
var loFormId = null;
function openLandownerForm(id) {
  var lo = landownerById(id);
  var isNew = !lo;
  if (isNew) lo = { id: newLandownerId(), lineId: activeLineId(), name: '', phones: '', notes: '', boundaryNote: '', createdAt: Date.now() };
  loFormId = lo.id;
  pendingLoPhotos = [];
  showModal(
    '<h3>' + (isNew ? 'Add Landowner' : 'Edit Landowner') + '</h3>' +
    '<label class="field" for="lo-name">Name <span class="req">*</span></label>' +
    '<input id="lo-name" type="text" value="' + esc(lo.name) + '" placeholder="Who owns the ground">' +
    '<label class="field" for="lo-phones">Phone numbers</label>' +
    '<input id="lo-phones" type="tel" inputmode="numeric" value="' + esc(lo.phones) + '" placeholder="Digits only — separate multiple with commas">' +
    '<label class="field" for="lo-notes">Notes</label>' +
    '<textarea id="lo-notes" rows="3" placeholder="Gate code, where to park, areas to stay out of, who to call first…">' + esc(lo.notes) + '</textarea>' +
    '<label class="field" for="lo-boundary-note">Boundary — written note</label>' +
    '<textarea id="lo-boundary-note" rows="2" placeholder="North of the creek to the east fence…">' + esc(lo.boundaryNote) + '</textarea>' +
    '<p class="dim" style="margin:8px 0 4px">…or upload a map photo:</p>' +
    '<button class="btn-secondary" id="lo-boundary-btn" type="button"><img class="bi" src="assets/icons/camera.png" alt="">Upload boundary map</button>' +
    '<div class="lic-grid" id="lo-boundary-grid"></div>' +
    '<label class="field">Permission slips</label>' +
    '<button class="btn-secondary" id="lo-slip-btn" type="button"><img class="bi" src="assets/icons/camera.png" alt="">Add permission slip photo</button>' +
    '<div class="lic-grid" id="lo-slip-grid"></div>' +
    '<div class="btn-row" style="margin-top:14px"><button class="btn-secondary" id="m-cancel" type="button">Cancel</button>' +
    '<button class="btn-primary" id="lo-save" type="button">Save landowner</button></div>'
  );
  $('m-cancel').onclick = closeModal;
  /* Tanner 2026-09-30: phone field takes digits only (commas between
     numbers) — any notes belong in the Notes field. */
  var loPhonesInput = $('lo-phones');
  if (loPhonesInput) loPhonesInput.addEventListener('input', function () {
    var clean = this.value.replace(/[^0-9,]/g, '').replace(/,+/g, ',');
    if (clean !== this.value) this.value = clean;
  });
  $('lo-boundary-btn').onclick = function () { $('lo-boundary-input').click(); };
  $('lo-slip-btn').onclick = function () { $('lo-slip-input').click(); };
  $('lo-slip-input').onchange = function () { loTakePhotos(this.files, 'slip'); this.value = ''; };
  $('lo-boundary-input').onchange = function () { loTakePhotos(this.files, 'boundary'); this.value = ''; };
  $('lo-save').onclick = function () { saveLandownerForm(lo.id, isNew); };
  renderLoFormPhotos(lo.id);
}
function loTakePhotos(files, kind) {
  if (!files || !files.length) return;
  for (var i = 0; i < files.length; i++) pendingLoPhotos.push({ blob: files[i], name: files[i].name, kind: kind });
  renderLoFormPhotos(loFormId);
}
function loPhotoThumb(p, kind, onDel) {
  var item = document.createElement('div');
  item.className = 'lic-item';
  var img = document.createElement('img');
  img.src = loPhotoURL(p); img.alt = 'Landowner photo';
  /* Tanner 2026-09-30: tap opens the photo; the X asks before deleting. */
  var title = kind === 'slip' ? 'Permission slip' : 'Boundary map';
  img.onclick = function () { openLoPhotoViewer(p, title, onDel); };
  var del = document.createElement('button');
  del.type = 'button'; del.textContent = '×'; del.setAttribute('aria-label', 'Delete photo');
  del.onclick = function (e) {
    e.stopPropagation();
    confirmModal2('Delete this photo?', 'It will be gone forever.', 'Delete', onDel);
  };
  item.appendChild(img); item.appendChild(del);
  return item;
}
function renderLoFormPhotos(loId) {
  var slipGrid = $('lo-slip-grid'), bGrid = $('lo-boundary-grid');
  if (!slipGrid || !bGrid) return;
  IDB.all('photos').then(function (all) {
    var existing = all.filter(function (p) { return p && p.landownerId === loId; });
    var pend = pendingLoPhotos.slice();
    function fill(grid, kind) {
      grid.innerHTML = '';
      existing.filter(function (p) { return p.kind === kind; }).forEach(function (p) {
        grid.appendChild(loPhotoThumb(p, kind, function () {
          IDB.del('photos', p.id).then(function () {
            if (loPhotoURLs[p.id]) { URL.revokeObjectURL(loPhotoURLs[p.id]); delete loPhotoURLs[p.id]; }
            renderLoFormPhotos(loId);
          });
        }));
      });
      pend.filter(function (pp) { return pp.kind === kind; }).forEach(function (pp) {
        grid.appendChild(loPhotoThumb(pp, kind, function () {
          if (pp._objURL) { try { URL.revokeObjectURL(pp._objURL); } catch (e) { /* noop */ } }
          var ix = pendingLoPhotos.indexOf(pp);
          if (ix !== -1) pendingLoPhotos.splice(ix, 1);
          renderLoFormPhotos(loId);
        }));
      });
    }
    fill(slipGrid, 'slip');
    fill(bGrid, 'boundary');
  });
}
function saveLandownerForm(loId, isNew) {
  var name = $('lo-name').value.trim();
  if (!name) { toast('Give the landowner a name first.'); $('lo-name').focus(); return; }
  var rec = landownerById(loId);
  if (!rec) {
    rec = { id: loId, lineId: activeLineId(), createdAt: Date.now() };
    if (!Array.isArray(Store.data.landowners)) Store.data.landowners = [];
    Store.data.landowners.push(rec);
  }
  rec.name = name;
  /* Tanner 2026-09-30: digits (and commas) only — notes live in Notes. */
  rec.phones = $('lo-phones').value.replace(/[^0-9,]/g, '').replace(/,+/g, ',').replace(/^,|,$/g, '');
  rec.notes = $('lo-notes').value.trim();
  rec.boundaryNote = $('lo-boundary-note').value.trim();
  rec.updatedAt = Date.now();
  var pending = pendingLoPhotos.slice();
  pendingLoPhotos = [];
  var chain = Promise.resolve();
  pending.forEach(function (pp) {
    chain = chain.then(function () {
      return IDB.put('photos', {
        id: uid('p'), landownerId: loId, kind: pp.kind, name: pp.name,
        blob: pp.blob, lineId: activeLineId(), createdAt: Date.now()
      });
    });
  });
  chain.then(function () {
    Store.save(); closeModal(); renderLandowners();
    toast('Landowner saved on this phone.');
  }).catch(function () {
    Store.save(); closeModal(); renderLandowners();
    toast('Landowner saved — a photo did not make it.');
  });
}
function deleteLandowner(id) {
  var rec = landownerById(id);
  if (!rec) return;
  IDB.all('photos').then(function (all) {
    var n = all.filter(function (p) { return p && p.landownerId === id; }).length;
    confirmModal('Delete this landowner?',
      esc(rec.name) + ' and ' + (n ? n + ' photo' + (n === 1 ? '' : 's') : 'no photos') + ' will be gone forever.',
      'Delete',
      function () {
        Store.data.landowners = (Store.data.landowners || []).filter(function (x) { return x.id !== id; });
        var chain = Promise.resolve();
        all.forEach(function (p) {
          if (p && p.landownerId === id) chain = chain.then(function () { return IDB.del('photos', p.id); });
        });
        chain.then(function () { Store.save(); renderLandowners(); toast('Landowner deleted.'); });
      });
  });
}

/* ================= 12. CSV EXPORT / ERASE ================= */
function exportCoords() { return !!Store.data.exportCoords; } /* #5 (2026-10-01): Tanner — coordinates ride along in reports only when this is on. Default off. */
function exportCatches() {
  var total = activeLogs().length;
  if (!total) { toast('No catches to export yet.'); return; }
  /* The independent Settings report filters: the CSV exports exactly what
     they select, regardless of the History tab's quick filters. */
  var list = exportFilteredLogs();
  if (!list.length) { toast('No catches match the current filters.'); return; }
  var ec = exportCoords();
  var rows = [['Date', 'Time', 'Season', 'Set', 'Species', 'Count', 'Disposition', 'Set type', 'Trap type', 'Trap detail', 'Weather', 'Bait', 'Lure', 'Urine', 'Visual', 'Audio', 'Other Attractants', 'County'].concat(ec ? ['Latitude', 'Longitude'] : []).concat(['Notes'])];
  list.forEach(function (l) {
    /* Other events with no species entered show the subtype label in the
       Species column — no format change needed. */
    var spCol = (l.otherType && !l.species) ? (OTHER_LABELS[l.otherType] || 'Other event') : l.species;
    /* Trap detail: snapshot on the log, falling back to the set's current details for older logs. */
    var det = l.trapDetail || (function () { var s2 = l.setId ? getSet(l.setId) : null; return s2 ? trapDetailSummary(s2) : ''; })();
    rows.push([l.date, l.time || '', l.seasonYear || seasonYearOf(l.date), l.setName, spCol, normCount(l),
      dispLabel(l.disposition), l.setType, l.trapType, det, weatherText(l.weather), joinAttr(l.bait), joinAttr(l.lure), joinAttr(l.urine), joinAttr(l.visual), joinAttr(l.audio), joinAttr(l.other), l.county].concat(ec ? [l.lat, l.lng] : []).concat([l.notes]));
  });
  var filt = exportFiltersActive();
  downloadCSV('opossum-foot-catches-' + lineFileSlug() + '-' + todayISO() + (filt ? '-filtered' : '') + '.csv', rows);
  toast('Catches CSV downloaded (' + list.length + (list.length === total ? '' : ' of ' + total) + ').');
}
function exportSets() {
  if (!activeSets().length) { toast('No sets to export yet.'); return; }
  /* Q47: one set = one trap — the Trap count column is gone. Q26: Other
     Attractants column after Urine; lists join with ' | '. */
  var ec2 = exportCoords();
  var rows = [['Name'].concat(ec2 ? ['Latitude', 'Longitude'] : []).concat(['County', 'Set type', 'Trap type', 'Trap spring', 'Trap size', 'Snare diameter', 'Snare lock', 'Snare length', 'Snare purpose', 'Trap model', 'Weather', 'Bait', 'Lure', 'Urine', 'Visual', 'Audio', 'Other Attractants', 'Status', 'Date set', 'Notes', 'Trap maker', 'Pan size', 'Jaw shape', 'Jaw closure', 'Trap mods', 'Missing reason', 'Missing detail'])];
  activeSets().forEach(function (s) {
    rows.push([s.name].concat(ec2 ? [s.lat, s.lng] : []).concat([s.county, s.setType, s.trapType, (s.trapSpring || ''), (s.trapSize || ''), (s.snareDia || ''), (s.snareLock || ''), (s.snareLen || ''), (s.snarePurpose || ''), (s.trapModel || ''), weatherText(s.weather), joinAttr(s.bait), joinAttr(s.lure), joinAttr(s.urine), joinAttr(s.visual), joinAttr(s.audio), joinAttr(s.other), s.status, s.dateSet, s.notes, (s.trapMaker || ''), (s.panSize || ''), (s.jawShape || ''), (s.jawClose || ''), (s.trapMods || []).join(' | '), missingReasonLabel(s.missingReason || ''), (s.missingDetail || '')]));
  });
  downloadCSV('opossum-foot-sets-' + lineFileSlug() + '-' + todayISO() + '.csv', rows);
  toast('Sets CSV downloaded.');
}
/* Full backup: every set and catch/log on this phone, saved as one JSON
   file in the exact shape the "Import data (JSON)" button reads back.
   Restore path: reinstall the app, then Settings -> Backup -> Import data
   and pick this file. Merges with existing data; colliding ids get fresh
   ones. Note: license photos and voice memos live in a separate on-phone
   store and are NOT included in this file. */
/* Q53: home ground rides in the JSON backup. Factored out for testability. */
function buildBackupData() {
  return {
    app: 'opossum-foot',
    exportedAt: new Date().toISOString(),
    version: APP_VERSION,
    state: activeStateCode(),
    sets: Store.data.sets || [],
    logs: Store.data.logs || [],
    trips: Store.data.trips || [], /* Q8: the trip log rides along */
    homes: homeByLineMap() /* Q53: per-line home grounds */
  };
}
function exportFullBackup() {
  var sets = Store.data.sets || [], logs = Store.data.logs || [];
  if (!sets.length && !logs.length) { toast('No data to back up yet.'); return; }
  var data = buildBackupData();
  var blob = new Blob([JSON.stringify(data)], { type: 'application/json;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'opossum-foot-backup-' + lineFileSlug() + '-' + todayISO() + '.json';
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 3000);
  toast('Full backup downloaded (' + sets.length + ' sets, ' + logs.length + ' logs). Keep it somewhere safe — import it back with "Import data (JSON)" after a reinstall.');
}
/* Import a JSON file previously exported from Opossum Foot
   (or generated by the Trap Log migration): {app:'opossum-foot', sets:[], logs:[]}.
   Merges into existing data; colliding ids get fresh ones. */
function importDataFile(file) {
  var reader = new FileReader();
  reader.onload = function () {
    var data;
    try { data = JSON.parse(reader.result); }
    catch (e) { toast('That file is not valid JSON.'); return; }
    if (!data || !Array.isArray(data.sets) || !Array.isArray(data.logs)) {
      toast('Not an Opossum Foot import file.');
      return;
    }
    var haveSetIds = {}, haveLogIds = {};
    Store.data.sets.forEach(function (s) { haveSetIds[s.id] = true; });
    Store.data.logs.forEach(function (l) { haveLogIds[l.id] = true; });
    var nSets = 0, nLogs = 0;
    data.sets.forEach(function (s) {
      var c = {
        id: (s.id && !haveSetIds[s.id]) ? s.id : uid('s'),
        name: String(s.name || 'Set'),
        lat: +s.lat || 0, lng: +s.lng || 0,
        county: s.county || null,
        trapType: s.trapType || '', setType: s.setType || '',
        trapCount: (s.trapCount * 1) || 1,
        trapMaker: s.trapMaker || '',
        trapSpring: s.trapSpring || '', trapSize: s.trapSize || '',
        snareDia: s.snareDia || '', snareLock: s.snareLock || '', snareLen: s.snareLen || '',
        snarePurpose: s.snarePurpose || '',
        trapModel: s.trapModel || '',
        trapMods: Array.isArray(s.trapMods) ? s.trapMods.slice() : [],
        panSize: s.panSize || '',
        jawShape: s.jawShape || '',
        bait: toAttrArray(s.bait), lure: toAttrArray(s.lure), urine: toAttrArray(s.urine), visual: toAttrArray(s.visual), audio: toAttrArray(s.audio), other: toAttrArray(s.other),
        status: normStatus(s.status),
        dateSet: s.dateSet || todayISO(),
        notes: s.notes || '',
        lineId: activeLineId(),
        createdAt: s.createdAt || Date.now()
      };
      haveSetIds[c.id] = true;
      Store.data.sets.push(c); nSets++;
    });
    data.logs.forEach(function (l) {
      var date = l.date || todayISO();
      var c = {
        id: (l.id && !haveLogIds[l.id]) ? l.id : uid('l'),
        setId: l.setId || null,
        setName: l.setName || '(imported)',
        species: l.species || 'Unknown', count: normCount(l),
        otherType: l.otherType || null,
        disposition: l.disposition || 'kept',
        date: date, seasonYear: l.seasonYear || seasonYearOf(date),
        bait: toAttrArray(l.bait), lure: toAttrArray(l.lure), urine: toAttrArray(l.urine), visual: toAttrArray(l.visual), audio: toAttrArray(l.audio), other: toAttrArray(l.other),
        trapType: l.trapType || '', setType: l.setType || '',
        trapDetail: l.trapDetail || '', trapCount: (l.trapCount * 1) || 1,
        county: l.county || '',
        lat: (l.lat == null ? null : +l.lat), lng: (l.lng == null ? null : +l.lng),
        notes: l.notes || '',
        lineId: activeLineId(),
        createdAt: l.createdAt || Date.now()
      };
      haveLogIds[c.id] = true;
      Store.data.logs.push(c); nLogs++;
    });
    /* Q8: trips merge onto the active line, like sets and logs. */
    var nTrips = 0;
    if (Array.isArray(data.trips)) {
      if (!Array.isArray(Store.data.trips)) Store.data.trips = [];
      data.trips.forEach(function (t) {
        if (!t || typeof t !== 'object') return;
        Store.data.trips.push({
          id: uid('trip'), lineId: activeLineId(),
          date: /^\d{4}-\d{2}-\d{2}$/.test(t.date || '') ? t.date : todayISO(),
          startOdo: (isFinite(+t.startOdo) && +t.startOdo >= 0) ? +t.startOdo : 0,
          endOdo: (isFinite(+t.endOdo) && +t.endOdo >= 0) ? +t.endOdo : 0,
          notes: t.notes || '', createdAt: t.createdAt || Date.now()
        });
        nTrips++;
      });
    }
    var al = activeLine();
    if (al && !al.state && data.state) al.state = data.state;
    /* Q53: per-line homes restore onto matching lines — counts as "asked". */
    applyImportedHomes(data);
    if (!Store.data.onboarded && activeStateCode()) Store.data.onboarded = true;
    Store.save();
    refreshMarkers(); renderHistory(); renderTotals();
    toast('Imported ' + nSets + ' sets, ' + nLogs + ' logs' + (nTrips ? ' and ' + nTrips + ' trips' : '') + '.');
  };
  reader.readAsText(file);
}

/* ================= Q7. GOOGLE MAPS PIN IMPORT =================
   Reads pins the user exported themselves — Google My Maps (.kml) or Google
   Takeout saved places (GeoJSON, .geojson/.json). Parsed entirely on the
   phone, no server. Each pin becomes a set on the active line with everything
   but name + coordinates left unspecified; the user taps each set on the map
   and fills in trap type / set type / attractants from there. */

/* Duplicate tolerance: pins within ~20 m of an existing set count as the
   same spot. Expressed in degrees of latitude (longitude degrees are
   shorter; at trapping latitudes this is ~15 m east-west). */
var PIN_DUP_TOL_DEG = 0.0002;
function pinNearSet(pin, s) {
  if (!s || !isFinite(s.lat) || !isFinite(s.lng)) return false;
  return Math.abs(pin.lat - s.lat) <= PIN_DUP_TOL_DEG && Math.abs(pin.lng - s.lng) <= PIN_DUP_TOL_DEG;
}
function validPinCoord(lat, lng) {
  return isFinite(lat) && isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}
/* KML: one pin per <Placemark>. Name from <name> (CDATA-safe), coordinates
   from the first <coordinates> tuple (lon,lat[,alt] — KML order). Placemarks
   without a parseable point are skipped. */
function parseKmlPins(text) {
  var pins = [];
  var re = /<Placemark[\s>][\s\S]*?<\/Placemark>/gi, m;
  while ((m = re.exec(text))) {
    var block = m[0];
    var name = '';
    var nm = /<name[^>]*>([\s\S]*?)<\/name>/i.exec(block);
    if (nm) name = nm[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim();
    var cm = /<coordinates[^>]*>([\s\S]*?)<\/coordinates>/i.exec(block);
    if (!cm) continue;
    var tuples = cm[1].trim().split(/\s+/), found = null;
    for (var i = 0; i < tuples.length; i++) {
      var nums = tuples[i].split(',');
      var lng = parseFloat(nums[0]), lat = parseFloat(nums[1]);
      if (validPinCoord(lat, lng)) { found = { lat: lat, lng: lng }; break; }
    }
    if (found) pins.push({ name: name, lat: found.lat, lng: found.lng });
  }
  return pins;
}
/* GeoJSON: Point features only. Name from properties.name, then Name, then
   title (Takeout and My Maps vary). FeatureCollections and single Features
   both accepted. */
function parseGeoJsonPins(text) {
  var data = JSON.parse(text);
  var feats = Array.isArray(data.features) ? data.features
    : (data && data.type === 'Feature' ? [data] : []);
  var pins = [];
  feats.forEach(function (f) {
    if (!f || !f.geometry || f.geometry.type !== 'Point') return;
    var c = f.geometry.coordinates;
    if (!c || c.length < 2) return;
    var lng = +c[0], lat = +c[1];
    if (!validPinCoord(lat, lng)) return;
    var p = f.properties || {};
    var name = p.name != null ? p.name : (p.Name != null ? p.Name : (p.title != null ? p.title : ''));
    pins.push({ name: String(name).trim(), lat: lat, lng: lng });
  });
  return pins;
}
/* Pick the parser by file extension; sniff the content when the extension
   is unfamiliar (.json from Takeout is GeoJSON under the hood). */
function parsePinsFile(name, text) {
  var lower = String(name || '').toLowerCase();
  if (/\.kml$/i.test(lower)) return parseKmlPins(text);
  if (/\.geojson$/i.test(lower) || /\.json$/i.test(lower)) return parseGeoJsonPins(text);
  return /^\s*\{/.test(text) ? parseGeoJsonPins(text) : parseKmlPins(text);
}
function importPinsFile(file) {
  var reader = new FileReader();
  reader.onload = function () {
    var pins;
    try { pins = parsePinsFile(file.name, String(reader.result)); }
    catch (e) { toast('Could not read that pin file.'); return; }
    if (!pins || !pins.length) { toast('No pins found in that file.'); return; }
    runPinImport(pins);
  };
  reader.readAsText(file);
}
/* One set per pin on the active line. Trap type, set type, and every
   attractant list land "unspecified" ('' / []) so the Q5 scorecard buckets
   them honestly until the user fills them in from the set's map sheet. */
function addImportedSet(pin, lineId) {
  var s = {
    id: uid('s'),
    name: pin.name || 'Imported set',
    lat: pin.lat, lng: pin.lng,
    county: null,
    trapType: '', setType: '',
    trapMaker: '', trapSpring: '', trapSize: '',
    snareDia: '', snareLock: '', snareLen: '', snarePurpose: '',
    trapModel: '', trapMods: [], panSize: '', jawShape: '',
    bait: [], lure: [], urine: [], visual: [], audio: [], other: [],
    status: 'active', dateSet: todayISO(),
    notes: '', lineId: lineId, createdAt: Date.now()
  };
  Store.data.sets.push(s);
  return s;
}
/* Merge keeps the app's record (the richer one) and only takes the pin's
   name when the existing name is a placeholder. */
function mergePinIntoSet(pin, set) {
  var n = String(set.name || '').trim().toLowerCase();
  if ((!n || n === 'imported set') && pin.name) set.name = pin.name;
}
/* Duplicate dialog: three choices. "Delete incoming pin" is worded to be
   unmistakable that only the import is discarded — the app's data stays. */
function askPinDuplicate(pin, set, cb) {
  showModal(
    '<h3>Pin already here?</h3>' +
    '<p>&ldquo;' + esc(pin.name || 'Unnamed pin') + '&rdquo; lands on top of your existing set &ldquo;' + esc(set.name || 'Unnamed set') + '&rdquo;.</p>' +
    '<div class="btn-row">' +
    '<button class="btn-secondary" id="m-pin-skip" type="button">Skip</button>' +
    '<button class="btn-secondary" id="m-pin-merge" type="button">Merge</button>' +
    '<button class="btn-danger" id="m-pin-delete" type="button">Delete incoming pin</button>' +
    '</div>' +
    '<p class="dim" style="margin-bottom:0">Delete incoming pin throws away just this import &mdash; your app data is untouched.</p>'
  );
  $('m-pin-skip').onclick = function () { closeModal(); cb('skip'); };
  $('m-pin-merge').onclick = function () { closeModal(); cb('merge'); };
  $('m-pin-delete').onclick = function () { closeModal(); cb('delete'); };
}
function runPinImport(pins) {
  var lineId = activeLineId();
  if (!lineId) { toast('Add a trap line first.'); return; }
  var existing = activeSets().slice();
  var counts = { imported: 0, skipped: 0, merged: 0, deleted: 0 };
  var i = 0;
  function finish() {
    Store.save(); refreshMarkers(); renderHistory(); renderTotals();
    toast('Pin import: ' + counts.imported + ' imported, ' + counts.skipped + ' skipped, ' + counts.merged + ' merged, ' + counts.deleted + ' deleted.');
  }
  function next() {
    if (i >= pins.length) { finish(); return; }
    var pin = pins[i++];
    var dup = null;
    for (var j = 0; j < existing.length; j++) {
      if (pinNearSet(pin, existing[j])) { dup = existing[j]; break; }
    }
    if (!dup) {
      existing.push(addImportedSet(pin, lineId));
      counts.imported++;
      next();
      return;
    }
    askPinDuplicate(pin, dup, function (choice) {
      if (choice === 'merge') { mergePinIntoSet(pin, dup); counts.merged++; }
      else if (choice === 'delete') { counts.deleted++; }
      else { counts.skipped++; }
      next();
    });
  }
  next();
}
function eraseAll() {
  /* B29: math gate first (shared harder version) — then the typed confirmation. */
  mathGate(function () { eraseAllTyped(); });
}
function eraseAllTyped() {
  confirmModal('Erase everything?',
    'All sets, catches, license photos, and voice memos on <strong>this phone</strong> will be permanently deleted. Back up all data (JSON) first if you want to restore it later.',
    'Erase everything', function () {
      /* Q65: typed confirmation — DELETE EVERYTHING, not just DELETE.
         A kid tapping through the warnings can't get past this. The button
         stays dead until the full phrase is typed. */
      showModal(
        '<h3>Type DELETE EVERYTHING to erase everything</h3>' +
        '<p>There is no undo and no cloud copy. Type <strong>DELETE EVERYTHING</strong> in the box, then tap the button. Deleted data is gone forever.</p>' +
        '<input type="text" id="m-erase-type" placeholder="Type DELETE EVERYTHING here" autocomplete="off" autocapitalize="characters" style="width:100%;margin:8px 0">' +
        '<div class="btn-row"><button class="btn-secondary" id="m-cancel" type="button">Cancel</button>' +
        '<button class="btn-danger" id="m-erase-go" type="button" disabled>Erase everything</button></div>'
      );
      var einp = $('m-erase-type'), ego = $('m-erase-go');
      $('m-cancel').onclick = closeModal;
      einp.oninput = function () { ego.disabled = einp.value.trim().toUpperCase() !== 'DELETE EVERYTHING'; };
      ego.onclick = function () {
        closeModal();
        try { localStorage.removeItem(LS_KEY); } catch (e) { /* noop */ }
        IDB.clear('photos').then(function () { return IDB.clear('memos'); }).then(function () {
          location.reload();
        });
      };
      setTimeout(function () { try { einp.focus(); } catch (e) { /* noop */ } }, 150);
    });
}

/* Q82 (2026-10-01): Tanner — purge catch history by line and/or date range.
   Sets are never touched. Matching logs go away with their photos and voice
   memos, gone forever, same as a single-log delete. */
function purgeMatchList() {
  var lineId = $('purge-line') ? $('purge-line').value : '';
  var from = $('purge-from') ? $('purge-from').value : '';
  var to = $('purge-to') ? $('purge-to').value : '';
  return Store.data.logs.filter(function (l) {
    if (lineId && l.lineId !== lineId) return false;
    if (from && (l.date || '') < from) return false;
    if (to && (l.date || '') > to) return false;
    return true;
  });
}
function purgeCountText() {
  var n = purgeMatchList().length;
  return n ? n + ' catch record' + (n === 1 ? '' : 's') + ' match' + (n === 1 ? 'es' : '') + '.' : 'No catch records match.';
}
function refreshPurge() {
  var sel = $('purge-line');
  if (!sel) return;
  var cur = sel.value;
  sel.innerHTML = '<option value="">All lines</option>';
  (Store.data.lines || []).forEach(function (ln) {
    var n = (Store.data.sets || []).filter(function (s) { return s.lineId === ln.id; }).length;
    sel.innerHTML += '<option value="' + esc(ln.id) + '">' + esc(ln.name) + ' (' + n + ' sets)</option>';
  });
  if (cur) sel.value = cur;
  $('purge-count').textContent = purgeCountText();
}
function wirePurge() {
  refreshPurge();
  var upd = function () { $('purge-count').textContent = purgeCountText(); };
  $('purge-line').onchange = upd; $('purge-from').onchange = upd; $('purge-to').onchange = upd;
  $('btn-purge').onclick = purgeHistory;
}
function purgeHistory() {
  var list = purgeMatchList();
  if (!list.length) { toast('Nothing to purge — no catch records match.'); return; }
  /* Same kid-proof gate as Erase Everything: a quick math question first. */
  mathGate(function () { purgeHistoryGo(list); });
}
/* Tanner 2026-10-01: one shared harder math gate — two-digit add/subtract,
   simple multiply. A kid tapping through warnings can't get past arithmetic. */
function mathGate(onPass) {
  var qtype = Math.floor(Math.random() * 3), a, b, ans, qtext;
  if (qtype === 0) { /* two-digit addition */
    a = 11 + Math.floor(Math.random() * 89); /* 11..99 */
    b = 11 + Math.floor(Math.random() * 89);
    ans = String(a + b); qtext = a + ' + ' + b;
  } else if (qtype === 1) { /* two-digit subtraction, no negatives */
    a = 20 + Math.floor(Math.random() * 80); /* 20..99 */
    b = 11 + Math.floor(Math.random() * (a - 10)); /* 11..a-1 */
    ans = String(a - b); qtext = a + ' − ' + b;
  } else { /* single-digit multiplication */
    a = 3 + Math.floor(Math.random() * 10); /* 3..12 */
    b = 3 + Math.floor(Math.random() * 10);
    ans = String(a * b); qtext = a + ' × ' + b;
  }
  showModal(
    '<h3>Quick check</h3>' +
    '<p>Before anything destructive: what is <strong>' + qtext + '</strong>?</p>' +
    '<input type="text" id="m-math" inputmode="numeric" autocomplete="off" style="width:100%;margin:8px 0" placeholder="Your answer">' +
    '<div class="btn-row"><button class="btn-secondary" id="m-cancel" type="button">Cancel</button>' +
    '<button class="btn-danger" id="m-math-go" type="button" disabled>Continue</button></div>'
  );
  var minp = $('m-math'), mgo = $('m-math-go');
  $('m-cancel').onclick = closeModal;
  minp.oninput = function () { mgo.disabled = minp.value.trim() !== ans; };
  mgo.onclick = function () { closeModal(); onPass(); };
  setTimeout(function () { try { minp.focus(); } catch (e) { /* noop */ } }, 150);
}
function purgeHistoryGo(list) { purgeConfirm(list); }
function purgeConfirm(list) {
  var lineId = $('purge-line').value;
  var ln = lineId ? lineById(Store.data, lineId) : null;
  var from = $('purge-from').value, to = $('purge-to').value;
  var scope = (ln ? ' on "' + esc(ln.name) + '"' : ' on all lines') +
    (from || to ? ' (' + (from ? esc(fmtDate(from)) : 'any date') + ' → ' + (to ? esc(fmtDate(to)) : 'any date') + ')' : '');
  confirmModal('Purge ' + list.length + ' catch record' + (list.length === 1 ? '' : 's') + '?',
    'Every matching catch record' + scope + ' will be permanently deleted, along with its photos and voice memos. ' +
    'Your sets are not touched. This cannot be undone — deleted data is gone forever.',
    'Purge', function () {
      var ids = {};
      list.forEach(function (l) { ids[l.id] = true; });
      Store.data.logs = Store.data.logs.filter(function (l) { return !ids[l.id]; });
      IDB.all('photos').then(function (all) {
        all.forEach(function (p) {
          if (p && ids[p.logId]) {
            if (photoURLs[p.id]) { URL.revokeObjectURL(photoURLs[p.id]); delete photoURLs[p.id]; }
            delete photoById[p.id];
            IDB.del('photos', p.id);
          }
        });
      }).catch(function () { /* noop */ });
      list.forEach(function (l) {
        (logMemoIds(l) || []).forEach(function (mid) {
          if (memoURLs[mid]) { try { URL.revokeObjectURL(memoURLs[mid]); } catch (e) { /* noop */ } delete memoURLs[mid]; }
          IDB.del('memos', mid);
        });
      });
      Store.save();
      renderHistory(); renderTotals();
      $('purge-count').textContent = purgeCountText();
      toast('Purged ' + list.length + ' catch record' + (list.length === 1 ? '' : 's') + '.');
    });
}

/* ================= 13. TABS / NAV ================= */
function switchTab(name) {
  /* B15: while a pin is being placed the rest of the app is locked — the
     placement bar's own buttons are the only way out. */
  if (document.body.classList.contains('placing')) return;
  var tabs = document.querySelectorAll('#tabbar button');
  for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle('active', tabs[i].getAttribute('data-tab') === name);
  var panes = document.querySelectorAll('.pane');
  for (var j = 0; j < panes.length; j++) panes[j].classList.remove('active');
  $('pane-' + name).classList.add('active');
  /* Q100 (2026-10-01): Tanner — every tab opens at the top too. */
  var psc = $('pane-' + name).querySelector('.scroll');
  if (psc) psc.scrollTop = 0;
  if (name === 'map') { initMap(); updateWeatherChip(); refreshMarkers(); } /* Q17: marker wind refresh on open */
  if (name === 'history') renderHistory();
  if (name === 'settings') { renderExportDimChips(); renderExportFilterBar(); renderSettingsHome(); refreshPurge(); } /* Q53: home status */
  if (name === 'scorecard') renderScorecardTab();
  if (name === 'totals') renderTotals();
  if (name === 'seasons') renderSeasons($('seasons-search').value);
  if (name === 'licenses') { renderLicenses(); renderLandowners(); }
  if (name === 'lines') renderLines();
}

/* ================= 13b. TRAP LINES UI =================
   One line active at a time; every view follows it via the activeSets() /
   activeLogs() / activeStateCode() accessors. */
function refreshForLine() {
  clearRouteEstimate(); /* Q8: the route estimate belongs to the old line */
  /* history filters belong to the old line's data — reset so a stale
     species or date filter can't show a confusing empty report */
  histUI.q = ''; histUI.disp = 'all';
  clearExportFilters();
  histUI.collapsed = {}; histUI.expanded = {}; histUI.spOpen = {}; histUI.ttOpen = {}; histUI.defaultsSet = false;
  scoreUI.species = ''; scoreUI.h2hA = ''; scoreUI.h2hB = ''; /* per-line picks */
  var hs = $('history-search'); if (hs) hs.value = '';
  refreshMarkers();
  renderHistory();
  renderTotals();
  renderSeasons($('seasons-search') ? $('seasons-search').value : '');
  renderLicenses();
  renderLandowners();
  renderMapStatusFilters();
  buildStateSelect($('settings-state'), activeStateCode());
  renderSettingsLineName();
  renderTabToggles();
  applyFeatureToggles();
  renderLineBar();
  fitMapHome(); /* Q53: the new line's home wins, else its trapping state */
}
function renderSettingsLineName() {
  var el = $('settings-line-name');
  if (el) { var l = activeLine(); el.textContent = l ? l.name : ''; }
}
function renderLineBar() {
  var el = $('line-bar-name');
  if (el) { var l = activeLine(); el.textContent = l ? l.name : ''; }
}
function activateLine(id) {
  var d = Store.data;
  var ln = lineById(d, id);
  if (!ln || d.activeLineId === id) return;
  d.activeLineId = id;
  Store.save();
  refreshForLine();
  renderLines();
  toast('Active line: ' + ln.name + '.');
}
function renderLines() {
  var box = $('lines-list');
  if (!box) return;
  var d = Store.data;
  var lid = activeLineId();
  box.innerHTML = d.lines.map(function (ln) {
    var nSets = 0, nLogs = 0;
    d.sets.forEach(function (s) { if (s.lineId === ln.id) nSets++; });
    d.logs.forEach(function (l) { if (l.lineId === ln.id) nLogs++; });
    var st = stateEntry(ln.state);
    return '<div class="line-row' + (ln.id === lid ? ' active' : '') + '" data-line="' + esc(ln.id) + '">' +
      '<button type="button" class="line-main" data-act="switch">' +
      '<span class="line-name">' + esc(ln.name) + '</span>' +
      '<span class="dim">' + esc(st ? st.name : 'No state set') + ' · ' + nSets + ' set' + (nSets === 1 ? '' : 's') +
      ' · ' + nLogs + ' catch' + (nLogs === 1 ? '' : 'es') + '</span>' +
      (ln.id === lid ? '<span class="badge alive">Active</span>' : '') +
      '</button>' +
      '<button type="button" class="btn-small btn-secondary line-edit" data-act="mileage"' + (Store.data.mileageOn !== false ? '' : ' hidden') + '>Mileage</button>' +
      '<button type="button" class="btn-small btn-secondary line-edit" data-act="edit">Edit</button>' +
      '</div>';
  }).join('');
  var rows = box.querySelectorAll('.line-row');
  for (var i = 0; i < rows.length; i++) {
    (function (row) {
      var id = row.getAttribute('data-line');
      row.querySelector('[data-act="switch"]').onclick = function () { activateLine(id); };
      row.querySelector('[data-act="edit"]').onclick = function () { showLineEditModal(id); };
      row.querySelector('[data-act="mileage"]').onclick = function () { showMileageModal(id); };
    })(rows[i]);
  }
}
function showAddLineModal() {
  showModal(
    '<h3>New Trap Line</h3>' +
    '<label class="field" for="m-line-name">Line name</label>' +
    '<input type="text" id="m-line-name" maxlength="40" placeholder="e.g. River bottoms">' +
    '<div class="suggest" id="m-line-name-suggest"></div>' +
    '<label class="field" for="m-line-state" style="margin-top:10px">Trapping state</label>' +
    '<select id="m-line-state"></select>' +
    '<div class="btn-row" style="margin-top:14px"><button class="btn-secondary" id="m-cancel" type="button">Cancel</button>' +
    '<button class="btn-secondary" id="m-clone" type="button">Clone line</button>' +
    '<button class="btn-primary" id="m-ok" type="button">Add line</button></div>'
  );
  buildStateSelect($('m-line-state'), activeStateCode());
  /* Q12: line names learn from use */
  attachSuggest('m-line-name', 'm-line-name-suggest', 'linename');
  $('m-cancel').onclick = closeModal;
  $('m-clone').onclick = function () { showClonePicker(); };
  $('m-ok').onclick = function () {
    var name = $('m-line-name').value.trim();
    if (!name) { toast('Give the line a name.'); return; }
    var code = $('m-line-state').value;
    if (!code) { toast('Pick the trapping state for this line.'); return; }
    var ln = { id: newLineId(), name: name, state: code,
      tabs: { history: true, scorecard: true, seasons: true, licenses: true } };
    Store.data.lines.push(ln);
    rememberEntry('linename', name); /* Q12 */
    closeModal();
    activateLine(ln.id);
    maybePromptHomeOnce(); /* Q53: new line gets the home question once, skippable */
  };
  setTimeout(function () { var el = $('m-line-name'); if (el) el.focus(); }, 60);
}
/* Q83: pick which line to clone, from the Add-line flow. */
function showClonePicker() {
  var d = Store.data;
  var rows = d.lines.map(function (ln) {
    var nSets = 0;
    d.sets.forEach(function (s) { if (s.lineId === ln.id) nSets++; });
    var st = stateEntry(ln.state);
    return '<div class="line-row"><button type="button" class="line-main" data-id="' + esc(ln.id) + '">' +
      '<span class="line-name">' + esc(ln.name) + '</span>' +
      '<span class="dim">' + esc(st ? st.name : 'No state set') + ' \u00B7 ' + nSets + ' set' + (nSets === 1 ? '' : 's') + '</span>' +
      '</button></div>';
  }).join('');
  showModal(
    '<h3>Clone a line</h3>' +
    '<p>Pick the line to copy. Its set locations and trap setups carry over \u2014 no catches, no check history.</p>' +
    rows +
    '<div class="btn-row" style="margin-top:14px"><button class="btn-secondary" id="m-back" type="button">Back</button></div>'
  );
  $('m-back').onclick = function () { showAddLineModal(); };
  var btns = document.querySelectorAll('#modal-card .line-main[data-id]');
  for (var i = 0; i < btns.length; i++) {
    (function (b) {
      b.onclick = function () { closeModal(); cloneLine(b.getAttribute('data-id')); };
    })(btns[i]);
  }
}
function showLineEditModal(id) {
  var ln = lineById(Store.data, id);
  if (!ln) return;
  showModal(
    '<h3>Edit Trap Line</h3>' +
    '<label class="field" for="m-line-name">Line name</label>' +
    '<input type="text" id="m-line-name" maxlength="40" value="' + esc(ln.name) + '">' +
    '<div class="suggest" id="m-line-name-suggest"></div>' +
    '<label class="field" for="m-line-state" style="margin-top:10px">Trapping state</label>' +
    '<select id="m-line-state"></select>' +
    '<div class="btn-row" style="margin-top:14px"><button class="btn-secondary" id="m-cancel" type="button">Cancel</button>' +
    '<button class="btn-secondary" id="m-del" type="button">Delete</button>' +
    '<button class="btn-primary" id="m-ok" type="button">Save</button></div>'
  );
  buildStateSelect($('m-line-state'), ln.state);
  /* Q12: line names learn from use */
  attachSuggest('m-line-name', 'm-line-name-suggest', 'linename');
  $('m-cancel').onclick = closeModal;
  $('m-ok').onclick = function () {
    var name = $('m-line-name').value.trim();
    if (!name) { toast('Give the line a name.'); return; }
    var code = $('m-line-state').value;
    if (!code) { toast('Pick the trapping state for this line.'); return; }
    ln.name = name;
    ln.state = code;
    rememberEntry('linename', name); /* Q12 */
    Store.save();
    closeModal();
    renderLines();
    renderSettingsLineName();
    renderLineBar();
    if (id === Store.data.activeLineId) { renderSeasons($('seasons-search').value); fitMapHome(); } /* Q110: home wins on state change too */
    toast('Line saved.');
  };
  $('m-del').onclick = function () { closeModal(); deleteLine(id); };
}
function deleteLine(id) {
  var d = Store.data;
  var ln = lineById(d, id);
  if (!ln) return;
  if (d.lines.length <= 1) { toast('You need at least one trap line.'); return; }
  var nSets = 0, nLogs = 0, nTrips = 0;
  d.sets.forEach(function (s) { if (s.lineId === id) nSets++; });
  d.logs.forEach(function (l) { if (l.lineId === id) nLogs++; });
  (d.trips || []).forEach(function (t) { if (t && t.lineId === id) nTrips++; });
  /* Q154 (2026-10-06): Tanner's ruling — deleting a line deletes ALL of
     its data: sets, catch logs (History included), photos, voice memos,
     mileage trips, everything. One gone-forever warning; no empty-first. */
  var what = [];
  if (nSets) what.push(nSets + ' set' + (nSets === 1 ? '' : 's'));
  if (nLogs) what.push(nLogs + ' catch log' + (nLogs === 1 ? '' : 's') + ' (removed from History too)');
  if (nTrips) what.push(nTrips + ' mileage trip' + (nTrips === 1 ? '' : 's'));
  confirmModal('Delete \u201C' + esc(ln.name) + '\u201D?',
    (what.length
      ? 'This will permanently delete the line and <b>everything on it</b>: ' + what.join(', ') + ', plus their photos and voice memos.'
      : 'The empty line will be removed.') +
    ' This cannot be undone \u2014 deleted data is gone forever.',
    'Delete line', function () {
      var deadSetIds = {}, deadLogIds = {}, deadMemoIds = {};
      d.sets.forEach(function (x) { if (x.lineId === id) deadSetIds[x.id] = true; });
      d.logs.forEach(function (l) {
        if (l.lineId === id || deadSetIds[l.setId]) {
          deadLogIds[l.id] = true;
          (l.memoIds || []).forEach(function (mid) { deadMemoIds[mid] = true; });
        }
      });
      d.lines = d.lines.filter(function (x) { return x.id !== id; });
      d.sets = d.sets.filter(function (x) { return x.lineId !== id; });
      d.logs = d.logs.filter(function (l) { return !(l.lineId === id || deadSetIds[l.setId]); });
      /* Q8: a line's trips go with it. */
      d.trips = (d.trips || []).filter(function (t) { return !t || t.lineId !== id; });
      /* photos + voice memos on the line's sets/logs go too (Q38: gone everywhere) */
      IDB.all('photos').then(function (all) {
        all.forEach(function (ph) {
          if (!(deadSetIds[ph.setId] || deadLogIds[ph.logId])) return;
          if (photoURLs[ph.id]) { URL.revokeObjectURL(photoURLs[ph.id]); delete photoURLs[ph.id]; }
          delete photoById[ph.id];
          IDB.del('photos', ph.id);
        });
      }).catch(function () { /* noop */ });
      IDB.all('memos').then(function (all) {
        all.forEach(function (m) {
          if (!(deadSetIds[m.setId] || deadMemoIds[m.id])) return;
          if (memoURLs[m.id]) { URL.revokeObjectURL(memoURLs[m.id]); delete memoURLs[m.id]; }
          IDB.del('memos', m.id);
        });
      }).catch(function () { /* noop */ });
      if (d.activeLineId === id) d.activeLineId = d.lines[0].id;
      Store.save();
      refreshForLine();
      renderLines();
      toast('Line deleted.');
    });
}

/* Q83: clone a line — new season, old ground. The clone carries the line's
   settings, home, and every set's location + trap setup (deep-copied, fresh
   ids, status reset to active, check clock restarted). Catches, check history,
   photos, mileage trips, and landowners stay on the source line. */
function cloneLine(id) {
  var d = Store.data;
  var src = lineById(d, id);
  if (!src) return;
  var nSets = 0;
  d.sets.forEach(function (s) { if (s.lineId === id) nSets++; });
  /* Q83: the confirm doubles as the rename box — prefilled "<name> (copy)",
     editable — and spells out what crosses over and what stays behind. */
  showModal(
    '<h3>Clone \u201C' + esc(src.name) + '\u201D?</h3>' +
    '<label class="field" for="m-clone-name">Line name</label>' +
    '<input type="text" id="m-clone-name" maxlength="40" value="' + esc(src.name + ' (copy)') + '">' +
    '<p style="margin-top:10px">The new line gets this line\u2019s set locations and trap setups' +
    (nSets ? ' (' + nSets + ' set' + (nSets === 1 ? '' : 's') + ')' : '') +
    ' \u2014 no catches, no check history, no photos, and no bait or lure (that changes day to day). ' +
    'Sets come back active with a fresh check clock.</p>' +
    '<div class="btn-row"><button class="btn-secondary" id="m-cancel" type="button">Cancel</button>' +
    '<button class="btn-primary" id="m-ok" type="button">Clone line</button></div>'
  );
  setTimeout(function () { var el = $('m-clone-name'); if (el) el.focus(); }, 60);
  $('m-cancel').onclick = closeModal;
  $('m-ok').onclick = function () {
    var name = $('m-clone-name').value.trim() || (src.name + ' (copy)');
      var ln = {
        id: newLineId(), name: name, state: src.state,
        tabs: { history: true, scorecard: true, seasons: true, licenses: true }
      };
      d.lines.push(ln);
      d.sets.forEach(function (s) {
        if (s.lineId !== id) return;
        /* Q83: deliberate whitelist — set location + trap setup only. No catches,
           no check history, no photos, no memos, no weather, and no bait/lure/
           attractants (those change day to day, traps don't). */
        var c = {
          id: uid('s'), lineId: ln.id,
          name: s.name, lat: s.lat, lng: s.lng, county: s.county,
          setType: s.setType, trapType: s.trapType,
          trapSpring: s.trapSpring, trapSize: s.trapSize,
          trapModel: s.trapModel, trapMaker: s.trapMaker,
          snareDia: s.snareDia, snareLock: s.snareLock,
          snareLen: s.snareLen, snarePurpose: s.snarePurpose,
          panSize: s.panSize, jawShape: s.jawShape, jawClose: s.jawClose,
          trapMods: Array.isArray(s.trapMods) ? s.trapMods.slice() : [],
          notes: s.notes || '',
          bait: [], lure: [], urine: [], visual: [], audio: [], other: [],
          status: 'active', dateSet: todayISO(),
          missingReason: null, missingDetail: null,
          createdAt: Date.now(), lastActivity: Date.now() /* Q68: fresh check clock */
        };
        d.sets.push(c);
      });
      closeModal();
      rememberEntry('linename', ln.name); /* Q12 */
      Store.save();
      activateLine(ln.id);
      maybePromptHomeOnce(); /* Q53: cloned line gets the home question once, skippable */
      refreshForLine();
      renderLines();
      toast('Line cloned \u2014 ' + nSets + ' set' + (nSets === 1 ? '' : 's') + ' carried over.');
    };
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

/* Q49: collapsible Settings sections. Every section below the trapping-state
   card toggles independently; all start collapsed. */
function toggleSettingsSection(secId) {
  var sec = $(secId), body = $(secId + '-body'), head = $(secId + '-head');
  if (!sec || !body || !head) return false;
  var willOpen = !sec.classList.contains('open');
  if (willOpen) { sec.classList.add('open'); body.hidden = false; }
  else { sec.classList.remove('open'); body.hidden = true; }
  head.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
  return willOpen;
}
/* Q99 (2026-10-01): Tanner — the notes/memos/photos stack on the set form,
   log form, and set detail lives in one collapsible box. Collapsed when
   empty; auto-opens when there's content to show. */
function setSectionOpen(secId, open) {
  var sec = $(secId), body = $(secId + '-body'), head = $(secId + '-head');
  if (!sec || !body || !head) return;
  if (open) { sec.classList.add('open'); body.hidden = false; }
  else { sec.classList.remove('open'); body.hidden = true; }
  head.setAttribute('aria-expanded', open ? 'true' : 'false');
}
function refreshNotesBox(secId, notesId, memosId, photosId) {
  var nv = $(notesId);
  var hasNotes = !!(nv && (nv.value || '').trim());
  var mb = memosId && $(memosId);
  var hasMemos = !!(mb && mb.querySelector('.memo-card'));
  var pb = photosId && $(photosId);
  var hasPhotos = !!(pb && pb.querySelector('img'));
  setSectionOpen(secId, hasNotes || hasMemos || hasPhotos);
}

function enterMain() {
  showView('view-main');
  switchTab('map');
  renderHistory(); renderTotals(); renderSeasons(''); renderLicenses();
  renderMapStatusFilters();
  buildStateSelect($('settings-state'), activeStateCode());
  renderSettingsLineName();
  renderLineBar();
  $('settings-weather').checked = !!Store.data.weatherOn;
  $('settings-weather').onchange = function () {
    Store.data.weatherOn = this.checked;
    Store.save(); applyFeatureToggles();
    toast(this.checked ? 'Weather is on — map chip and auto-record.' : 'Weather is off.');
  };
  /* Q17: wind arrows on pins — global, default on. */
  $('settings-windarrows').checked = windArrowsOn();
  $('settings-windarrows').onchange = function () {
    Store.data.windArrowsOn = this.checked;
    Store.save(); refreshMarkers();
    toast(this.checked ? 'Wind arrows are on.' : 'Wind arrows are off.');
  };
  /* Q103: GPS coordinates stay hidden (screenshot-safe) unless this is on. Default off. */
  $('settings-showcoords').checked = !!Store.data.showCoords;
  $('settings-showcoords').onchange = function () {
    Store.data.showCoords = this.checked;
    Store.save();
    toast(this.checked ? 'GPS coordinates will show.' : 'GPS coordinates are hidden.');
  };
  /* #5 (2026-10-01): Tanner — coordinates ride along in CSV reports only when
     this is on. Default off, so a shared spreadsheet can't leak pin locations. */
  $('settings-exportcoords').checked = !!Store.data.exportCoords;
  $('settings-exportcoords').onchange = function () {
    Store.data.exportCoords = this.checked;
    Store.save();
    toast(this.checked ? 'Reports will include GPS coordinates.' : 'Reports leave GPS coordinates out.');
  };
  $('settings-voice').checked = Store.data.voiceOn !== false;
  $('settings-voice').onchange = function () {
    Store.data.voiceOn = this.checked;
    Store.save(); applyFeatureToggles();
    toast(this.checked ? 'Voice entry is on.' : 'Voice entry is off.');
  };
  /* Q8: mileage toggle — off hides the per-line Mileage buttons, clears any
     drawn route, and hides the mileage CSV export. Default on. */
  var milBox = $('settings-mileage');
  if (milBox) {
    milBox.checked = Store.data.mileageOn !== false;
    milBox.onchange = function () {
      Store.data.mileageOn = this.checked;
      if (!this.checked && typeof clearRouteEstimate === 'function') clearRouteEstimate();
      Store.save(); applyFeatureToggles(); renderLines();
      toast(this.checked ? 'Mileage tracking is on.' : 'Mileage tracking is off.');
    };
  }
  /* Q68: trap check interval — longer than 24h where the regs allow it. */
  var ciSel = $('settings-checkinterval');
  var ccBox = $('settings-checkclock');
  function renderCheckClock() {
    var on = !Store.data || Store.data.checkClockOn !== false;
    if (ccBox) ccBox.checked = on;
    if (ciSel) { ciSel.value = String(Store.data.checkIntervalHours || 24); ciSel.disabled = !on; }
    /* Q91 (2026-10-01): the interval sub-menu shows only while alerts are on. */
    var sub = $('checkalert-sub');
    if (sub) sub.hidden = !on;
  }
  renderCheckClock();
  if (ccBox) {
    ccBox.onchange = function () {
      /* Q77: flipping the alert back on restarts every check clock from now —
         the off period tracked nothing, so nothing can be overdue yet. */
      if (this.checked && Array.isArray(Store.data.sets)) {
        var now = Date.now();
        Store.data.sets.forEach(function (s) { s.lastActivity = now; });
      }
      Store.data.checkClockOn = this.checked;
      Store.save(); refreshMarkers(); renderCheckClock();
      toast(this.checked ? 'Trap check alerts are on.' : 'Trap check alerts are off.');
    };
  }
  if (ciSel) {
    ciSel.onchange = function () {
      /* Tanner 2026-09-30: free-entry hours, default 24 — replaces the old
         24/36/48/72 preset dropdown. */
      var h = Math.max(1, parseInt(this.value, 10) || 24);
      Store.data.checkIntervalHours = h;
      this.value = String(h);
      Store.save(); refreshMarkers();
      toast('Trap check interval: every ' + h + ' hours.');
    };
  }
  /* Q14: Tabs section — per-line tab visibility for the active line. */
  TOGGLEABLE_TABS.forEach(function (k) {
    var cb = $('settings-tab-' + k);
    if (!cb) return;
    cb.onchange = function () {
      var l = activeLine();
      if (!l) return;
      if (!l.tabs || typeof l.tabs !== 'object') l.tabs = {};
      l.tabs[k] = this.checked;
      Store.save(); applyFeatureToggles();
      toast(TAB_LABELS[k] + (this.checked ? ' is on for ' : ' is off for ') + l.name + '.');
    };
  });
  renderTabToggles();
  var sfKeys = ['traptype', 'trapdetail', 'settype', 'bait', 'lure', 'urine', 'visual', 'audio', 'other', 'notes'];
  sfKeys.forEach(function (key) {
    var cb = $('settings-sf-' + key);
    if (!cb) return;
    cb.checked = setFieldOn(key);
    cb.onchange = function () {
      Store.data.setFields[key] = this.checked;
      Store.save(); applySetFieldToggles();
    };
  });
  /* Trapper's guide + legal notices, baked into Settings. Content is
     generated from FOR-TRAPPERS.md / LEGAL-NOTICE.md (see tools/build-guide.js). */
/* Q88 (2026-10-01): Tanner — the Trapper's Guide opens with a table of
   contents: every section title listed, tap one to jump straight to it. */
function buildGuideTOC() {
  var body = $('guide-body');
  if (!body) return;
  var heads = body.querySelectorAll('h3');
  if (!heads.length) return;
  var toc = '<div class="guide-toc"><p class="guide-toc-title">In this guide</p>';
  for (var i = 0; i < heads.length; i++) {
    var id = 'guide-sec-' + i;
    heads[i].id = id;
    toc += '<button type="button" class="guide-toc-item" data-sec="' + id + '">' + heads[i].textContent + '</button>';
  }
  toc += '</div>';
  body.insertAdjacentHTML('afterbegin', toc);
  var items = body.querySelectorAll('.guide-toc-item');
  for (var j = 0; j < items.length; j++) {
    items[j].onclick = function () {
      var t = document.getElementById(this.getAttribute('data-sec'));
      if (t && t.scrollIntoView) t.scrollIntoView({ block: 'start', behavior: 'smooth' });
    };
  }
}
  $('btn-guide').onclick = function () {
    $('guide-title').textContent = "Trapper's guide";
    $('guide-body').innerHTML = window.OPOSSUM_FOOT_GUIDE_HTML || '<p class="dim">Guide not loaded.</p>';
    buildGuideTOC(); /* Q88 (2026-10-01): Tanner — tap-a-section table of contents. */
    openSheet('sheet-guide');
  };
  $('btn-legal').onclick = function () {
    $('guide-title').textContent = 'Legal notices';
    $('guide-body').innerHTML = window.OPOSSUM_FOOT_LEGAL_HTML || '<p class="dim">Notices not loaded.</p>';
    openSheet('sheet-guide');
  };
  $('btn-features-reset').onclick = function () {
    confirmModal('Reset features to defaults?',
      'This puts all the feature toggles back to their defaults. It will not delete any of your sets, catches, lines, photos, or memos — and you can tap everything back on again afterwards.',
      'Reset', function () {
    Store.data.weatherOn = false; Store.data.voiceOn = true; Store.data.windArrowsOn = true; /* Q17 */
    Store.data.mileageOn = true; /* Q8 */
    /* Q14/Q62: tab reset is per-line — restores all five toggleable tabs on the active line. */
    var l = activeLine();
    if (l) l.tabs = { history: true, scorecard: true, seasons: true, licenses: true, totals: true };
    Store.data.setFields = { traptype: true, trapdetail: true, settype: true, bait: true, lure: true, urine: true, visual: true, audio: true, other: true, notes: true };
    Store.save();
    $('settings-weather').checked = false; $('settings-voice').checked = true; $('settings-windarrows').checked = true;
    var mcb = $('settings-mileage'); if (mcb) mcb.checked = true;
    renderTabToggles();
    sfKeys.forEach(function (key) { var cb = $('settings-sf-' + key); if (cb) cb.checked = true; });
    applyFeatureToggles(); applySetFieldToggles();
    if (typeof renderLines === 'function') renderLines();
    toast('Features reset to defaults.');
      });
  };
  $('btn-weather-refresh').onclick = function () { renderWeatherTab(); };
  /* weather chip on the map: tap opens the sheet with full conditions */
  $('weather-chip').onclick = function () { openSheet('sheet-weather'); renderWeatherTab(); };
  applyFeatureToggles();
  /* Q53: existing users get the home question exactly once, on next launch. */
  maybePromptHomeOnce();
}
/* Q53: one-time home prompt for users who onboarded before home existed.
   Per line — sets home for the current line. */
function maybePromptHomeOnce() {
  var l = activeLine();
  if (!l || l.homeAsked || homePickMode) return false;
  l.homeAsked = true; Store.save();
  showModal(
    '<h3>Where\'s your home ground?</h3>' +
    '<p>The map can open right on your home ground every time — your county, your farms, right where you trap. Takes ten seconds.</p>' +
    '<div class="btn-row home-choices"><button class="btn-secondary" id="m-home-skip" type="button">Not now</button>' +
    '<button class="btn-secondary" id="m-home-map" type="button">Choose on map</button>' +
    '<button class="btn-primary" id="m-home-gps" type="button">Use my location</button></div>'
  );
  $('m-home-skip').onclick = closeModal;
  $('m-home-map').onclick = function () { closeModal(); switchTab('map'); startHomePick(); };
  $('m-home-gps').onclick = function () { closeModal(); homeUseGps(); };
  return true;
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

/* ================= Q29. SET-TYPE TAXONOMY =================
   Researched 2026-09-26 (goals files: set-types-research.md). The New Set
   form's Set Type dropdown now carries the full researched taxonomy,
   grouped Land / Water. Snare sets file under their terrain (no Snare
   group). "Trail" and "Blind" are separate entries; "Trench" and
   "Step-down" stay separate; "T-bone" and "Bean Duff" (exact spelling)
   included. There is deliberately NO "Drowning set" entry — it's a
   dispatch method, not a set type. Labels are short ("Flat", not
   "Flat set"). "Other" remains the escape hatch. */
var SET_TYPES = {
  /* Q81 (2026-10-01): Tanner — pick lists run A to Z. */
  Land: ['Bean Duff', 'Blind', 'Bucket', 'Carcass', 'Cubby', 'Dirt hole',
    'Flag', 'Flat', 'Hay', 'Leaning pole', 'Leaning tree', 'Leg snare',
    'Mound', 'Positive', 'Rub', 'Scent post', 'Staked hide', 'Step-down',
    'T-bone', 'Trail', 'Trail snare', 'Trash pile', 'Trench',
    'Under-fence snare', 'Urine post', 'Weasel box'],
  Water: ['Bank den', 'Bottom edge', 'Canal / channel', 'Culvert snare',
    'Dam break', 'Dam crossover', 'Den / culvert', 'Den-entrance snare',
    'Drain tile', 'Feed bed', 'Float', 'Latrine site', 'Obstruction',
    'Open water', 'Overhanging bank', 'Pocket', 'Pole (under-ice)', 'Runway',
    'Scent mound', 'Slide', 'Slide snare', 'Spring run', 'Top edge']
};
var SET_TYPE_OTHER = 'Other';
function allSetTypes() {
  return SET_TYPES.Land.concat(SET_TYPES.Water).concat([SET_TYPE_OTHER]);
}
function isKnownSetType(v) {
  return allSetTypes().indexOf(v) !== -1;
}
/* Old short dropdown -> researched taxonomy. Only unambiguous renames are
   migrated; values with no clean new home ("Drowning set",
   "Trail / blind set") are kept verbatim so old sets, exports, and backups
   never break. Idempotent — safe to run on every load. */
var SET_TYPE_MIGRATION = { 'Flat set': 'Flat', 'Pocket set': 'Pocket' };
function migrateSetTypes(d) {
  if (!d || typeof d !== 'object') return;
  ['sets', 'logs'].forEach(function (k) {
    if (!Array.isArray(d[k])) return;
    d[k].forEach(function (r) {
      if (r && typeof r.setType === 'string' && SET_TYPE_MIGRATION[r.setType]) {
        r.setType = SET_TYPE_MIGRATION[r.setType];
      }
    });
  });
}
/* ================= Q68. TRAP CHECK CLOCK =================
   Every set carries lastActivity (ms epoch) — the last time anything
   happened on it: created, edited, catch/event logged, notes touched.
   An *active* set whose clock runs past the check interval turns its map
   pin red. Sprung sets keep their amber pin (that already means "come
   reset me"). Pulled sets (no trap in the ground) and missing sets (a
   recovery job, not a check rhythm) are exempt. One-time backfill: sets
   predating the clock start from the newest of their creation and their
   latest log entry. Idempotent. */
function migrateCheckClock(d) {
  if (!d || typeof d !== 'object') return;
  if (!Array.isArray(d.sets)) return;
  var newestLog = {};
  if (Array.isArray(d.logs)) d.logs.forEach(function (l) {
    if (!l || !l.setId || typeof l.createdAt !== 'number') return;
    if (!newestLog[l.setId] || l.createdAt > newestLog[l.setId]) newestLog[l.setId] = l.createdAt;
  });
  d.sets.forEach(function (s) {
    if (!s || typeof s.lastActivity === 'number') return;
    var t = (typeof s.createdAt === 'number') ? s.createdAt : 0;
    if (newestLog[s.id] && newestLog[s.id] > t) t = newestLog[s.id];
    s.lastActivity = t;
  });
}
function checkIntervalMs() {
  var h = Store.data && Store.data.checkIntervalHours;
  return ((typeof h === 'number' && h > 0) ? h : 24) * 3600 * 1000;
}
function setLastActivity(s) {
  if (!s) return 0;
  if (typeof s.lastActivity === 'number') return s.lastActivity;
  return (typeof s.createdAt === 'number') ? s.createdAt : 0;
}
/* ms until the check is due; negative means overdue. */
function checkDueInMs(s) { return setLastActivity(s) + checkIntervalMs() - Date.now(); }
function isCheckOverdue(s) {
  if (!s) return false;
  /* Q77: the alert is the whole clock — off means no overdue, anywhere. */
  if (!Store.data || Store.data.checkClockOn === false) return false;
  if (normStatus(s.status) !== 'active') return false; /* Q68: red is for active sets only */
  return checkDueInMs(s) < 0;
}
/* "3h" / "2d 4h" / "25m" — for the set-detail check line. */
function fmtCheckDur(ms) {
  var a = Math.abs(ms), m = Math.round(a / 60000);
  if (m < 60) return m + 'm';
  var h = Math.floor(m / 60);
  if (h < 48) return h + 'h';
  return Math.floor(h / 24) + 'd ' + (h % 24) + 'h';
}
/* Q77 (Tanner 2026-10-01): the check clock is dead when the alert is off —
   nothing stamps activity, so turning it back on restarts every clock fresh
   instead of painting the map red with stale times. */
function touchSet(s) {
  if (!s) return;
  if (Store.data && Store.data.checkClockOn === false) return;
  s.lastActivity = Date.now();
}
function renderSetTypeOptions() {
  var sel = $('sf-settype');
  if (!sel) return;
  var html = '';
  ['Land', 'Water'].forEach(function (g) {
    html += '<optgroup label="' + g + '">';
    SET_TYPES[g].forEach(function (t) { html += '<option>' + esc(t) + '</option>'; });
    html += '</optgroup>';
  });
  /* Q55: the trapper's custom set types, then the Other… escape hatch. */
  var seenST = {};
  ['Land', 'Water'].forEach(function (g) { SET_TYPES[g].forEach(function (t) { seenST[t.toLowerCase()] = 1; }); });
  customOptionsFor('sf-settype').forEach(function (t) {
    if (!seenST[t.toLowerCase()]) { html += '<option>' + esc(t) + '</option>'; seenST[t.toLowerCase()] = 1; }
  });
  html += '<option value="' + OTHER_VALUE + '">Other…</option>';
  sel.innerHTML = html;
}
/* Legacy stored values with no taxonomy home ("Drowning set",
   "Trail / blind set") still open fine in the form: they ride along as a
   selected first option until the user picks a taxonomy value. */
function ensureSetTypeOption(v) {
  var sel = $('sf-settype');
  if (!sel || !v || isKnownSetType(v)) return;
  /* Q55: a remembered custom already rides in the rebuilt list — no dup. */
  var opts = sel.options || [];
  for (var i = 0; i < opts.length; i++) {
    if (opts[i].value === v || opts[i].text === v) { sel.value = v; return; }
  }
  var cur = sel.innerHTML || '';
  var tag = '<option selected>' + esc(v) + '</option>';
  if (cur.indexOf(tag) !== 0) sel.innerHTML = tag + cur;
}

/* ================= Q8. MILEAGE PER TRAP LINE =================
   Per-line trip log with manual odometer entries, plus a straight-line
   route estimate (haversine sum in check order) drawn on the map with
   directional arrows. No GPS tracking of any kind — the estimate is pure
   geometry from the set pins, labeled as an estimate everywhere it shows. */

/* --- pure data helpers --- */
function tripsForLine(lineId) {
  var out = [];
  (Store.data.trips || []).forEach(function (t) { if (t && t.lineId === lineId) out.push(t); });
  out.sort(function (a, b) {
    if (a.date < b.date) return -1;
    if (a.date > b.date) return 1;
    return (a.createdAt || 0) - (b.createdAt || 0);
  });
  return out;
}
function tripById(id) {
  var trips = Store.data.trips || [];
  for (var i = 0; i < trips.length; i++) if (trips[i] && trips[i].id === id) return trips[i];
  return null;
}
function tripMiles(t) {
  var s = parseFloat(t.startOdo), e = parseFloat(t.endOdo);
  if (!isFinite(s) || !isFinite(e)) return NaN;
  return e - s;
}
function fmtMiles(n) {
  if (!isFinite(n)) return '—';
  return (Math.round(n * 10) / 10) + ' mi';
}
/* Honest validation for the trip form: '' means OK, otherwise the message
   to show the user. */
function validateTrip(date, startOdo, endOdo) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return 'Pick a date for the trip.';
  var s = parseFloat(startOdo), e = parseFloat(endOdo);
  if (!isFinite(s) || s < 0) return 'Enter the starting odometer reading.';
  if (!isFinite(e) || e < 0) return 'Enter the ending odometer reading.';
  if (e < s) return 'The ending reading can\u2019t be lower than the starting reading.';
  return '';
}
function haversineMi(lat1, lon1, lat2, lon2) {
  var R = 3958.8, r = Math.PI / 180;
  var dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
}
function bearingDeg(lat1, lon1, lat2, lon2) {
  var r = Math.PI / 180, dLon = (lon2 - lon1) * r;
  var y = Math.sin(dLon) * Math.cos(lat2 * r);
  var x = Math.cos(lat1 * r) * Math.sin(lat2 * r) -
    Math.sin(lat1 * r) * Math.cos(lat2 * r) * Math.cos(dLon);
  return (Math.atan2(y, x) / r + 360) % 360;
}
/* Check order: a greedy nearest-unvisited walk starting at the earliest-made
   set — the order a trapper usually drives the line. Sets without usable
   coordinates are left out of the route entirely. */
function checkOrderSets(lineId) {
  var sets = Store.data.sets.filter(function (s) {
    /* Q164 (2026-10-07): Tanner — only sets visible under the current map
       status toggles count toward the route. The toggles double as mileage
       configurations (e.g. kill "pulled" and the estimate covers just the
       run you're actually making). */
    return s && s.lineId === lineId && isFinite(+s.lat) && isFinite(+s.lng) && (+s.lat !== 0 || +s.lng !== 0) &&
      (typeof mapStatusFilter === 'undefined' || mapStatusFilter[normStatus(s.status)]);
  });
  sets.sort(function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0); });
  var ordered = [], rest = sets.slice(), cur = rest.shift();
  while (cur) {
    ordered.push(cur);
    var bi = -1, bd = Infinity, i, d;
    for (i = 0; i < rest.length; i++) {
      d = haversineMi(+cur.lat, +cur.lng, +rest[i].lat, +rest[i].lng);
      if (d < bd) { bd = d; bi = i; }
    }
    cur = bi >= 0 ? rest.splice(bi, 1)[0] : null;
  }
  return ordered;
}
function routeEstimate(lineId) {
  var order = checkOrderSets(lineId), miles = 0, i;
  for (i = 1; i < order.length; i++) {
    miles += haversineMi(+order[i - 1].lat, +order[i - 1].lng, +order[i].lat, +order[i].lng);
  }
  return { miles: miles, order: order };
}
function lineTripTotal(lineId) {
  var total = 0;
  tripsForLine(lineId).forEach(function (t) {
    var m = tripMiles(t);
    if (isFinite(m)) total += m;
  });
  return total;
}

/* --- route estimate layer: polyline + directional arrowheads at segment
   midpoints. Lives in its own layer group so it never disturbs the pins. */
var routeLayer = null, routeShownFor = null;
function routeLayerGroup() {
  if (!map || typeof L === 'undefined') return null;
  if (!routeLayer) routeLayer = L.layerGroup().addTo(map);
  return routeLayer;
}
function clearRouteEstimate() {
  if (routeLayer) routeLayer.clearLayers();
  routeShownFor = null;
  /* Tanner 2026-10-01: leaving route mode unlocks the tab bar. */
  document.body.classList.remove('route-locked');
  var rb = $('route-back-chip');
  if (rb) rb.hidden = true;
}
/* The ➤ glyph points east; rotate so it points along the segment bearing. */
function drawRouteEstimate(lineId) {
  clearRouteEstimate();
  var g = routeLayerGroup();
  if (!g) return false;
  var est = routeEstimate(lineId);
  if (est.order.length < 2) return false;
  var latlngs = est.order.map(function (s) { return [+s.lat, +s.lng]; });
  L.polyline(latlngs, { color: '#e8b64c', weight: 3, dashArray: '8 6' }).addTo(g);
  for (var i = 1; i < latlngs.length; i++) {
    var a = latlngs[i - 1], b = latlngs[i];
    var rot = bearingDeg(a[0], a[1], b[0], b[1]) - 90;
    var icon = L.divIcon({
      className: '',
      html: '<div class="route-arrow" style="transform:rotate(' + rot.toFixed(1) + 'deg)">\u27a4</div>',
      iconSize: [22, 22], iconAnchor: [11, 11]
    });
    L.marker([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], { icon: icon, interactive: false, keyboard: false }).addTo(g);
  }
  routeShownFor = lineId;
  /* Tanner 2026-10-01: while the route is drawn, the app is in route mode —
     tab bar locked, map functions only. The "‹ Back to mileage" chip is the
     only way out. */
  document.body.classList.add('route-locked');
  var rb = $('route-back-chip');
  if (rb) rb.hidden = false;
  return true;
}

/* --- mileage modal (per line) --- */
function showMileageModal(lineId) {
  if (!lineById(Store.data, lineId)) return;
  renderMileageModal(lineId);
}
function renderMileageModal(lineId) {
  var ln = lineById(Store.data, lineId);
  if (!ln) return;
  var trips = tripsForLine(lineId);
  var total = lineTripTotal(lineId);
  var est = routeEstimate(lineId);
  var rows = trips.map(function (t) {
    return '<div class="line-row">' +
      '<button type="button" class="line-main" data-trip-edit="' + esc(t.id) + '">' +
      '<span class="line-name">' + esc(fmtDate(t.date)) + ' \u00b7 ' + esc(fmtMiles(tripMiles(t))) + '</span>' +
      '<span class="dim">' + esc(String(t.startOdo) + ' \u2192 ' + String(t.endOdo) + (t.notes ? ' \u00b7 ' + t.notes : '')) + '</span>' +
      '</button>' +
      '<button type="button" class="btn-small btn-secondary line-edit" data-trip-del="' + esc(t.id) + '">Delete</button>' +
      '</div>';
  }).join('');
  /* Q166 (2026-10-07): Tanner — no more "20-40% under" claim. The disclaimer
     just says the straight-line number is skewed and the odometer is the
     truth; when both exist we also show their average. */
  var avgLine = (total > 0 && est.miles > 0)
    ? '<br>Average of the two: <strong>' + esc(fmtMiles((total + est.miles) / 2)) + '</strong>'
    : '';
  showModal(
    '<h3>Mileage \u2014 ' + esc(ln.name) + '</h3>' +
    '<p class="dim" style="margin-top:0">Odometer total: <strong>' + esc(fmtMiles(total)) + '</strong><br>' +
    'Route estimate: <strong>' + esc(fmtMiles(est.miles)) + '</strong>' +
    ' <span class="dim">(straight-line \u2014 skewed vs road miles; trust your odometer)</span>' + avgLine + '</p>' +
    (rows || '<p class="dim">No trips logged yet.</p>') +
    '<div class="btn-row mbtns" style="margin-top:14px">' +
    '<button class="btn-primary" id="m-trip-add" type="button">+ Odometer</button>' +
    '<button class="btn-primary" id="m-trip-route" type="button">' +
    (routeShownFor === lineId ? 'Hide route' : 'Show route on map') + '</button></div>' +
    '<div class="btn-row mbtns" style="margin-top:10px"><button class="btn-primary" id="m-trip-close" type="button">Close</button></div>'
  );
  $('m-trip-add').onclick = function () { showTripModal(lineId, null); };
  $('m-trip-close').onclick = closeModal;
  $('m-trip-route').onclick = function () {
    if (routeShownFor === lineId) { clearRouteEstimate(); renderMileageModal(lineId); return; }
    closeModal();
    switchTab('map');
    if (drawRouteEstimate(lineId)) toast('Route estimate drawn \u2014 straight-line, not road miles.');
    else toast('Need at least two sets with locations to draw a route.');
  };
  var box = $('modal-card');
  var edits = box.querySelectorAll('[data-trip-edit]');
  for (var i = 0; i < edits.length; i++) {
    (function (el) {
      el.onclick = function () { showTripModal(lineId, el.getAttribute('data-trip-edit')); };
    })(edits[i]);
  }
  var dels = box.querySelectorAll('[data-trip-del]');
  for (var j = 0; j < dels.length; j++) {
    (function (el) {
      el.onclick = function () { deleteTrip(lineId, el.getAttribute('data-trip-del')); };
    })(dels[j]);
  }
}
function showTripModal(lineId, tripId) {
  var t = tripId ? tripById(tripId) : null;
  /* Q72 (2026-10-01): Tanner — start prefilled from the last trip's end. */
  var lastEnd = '';
  if (!t && Array.isArray(Store.data.trips)) {
    var lineTrips = Store.data.trips.filter(function (x) { return x.lineId === lineId; });
    if (lineTrips.length) {
      lineTrips.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
      if (isFinite(lineTrips[0].endOdo)) lastEnd = String(lineTrips[0].endOdo);
    }
  }
  /* Q72: optional odometer photos. Tanner 2026-10-01: manual entry is a full-width
     long bar under each label (the side-by-side row squeezed the input shut on
     phones); the camera button sits below the input; a live miles readout lets
     him calculate right there. Typed readings are required; a photo (or failed
     photo) never blocks saving. */
  var startPhoto = null, endPhoto = null;
  showModal(
    '<h3>' + (t ? 'Edit trip' : 'Log a trip') + '</h3>' +
    '<label class="field" for="m-trip-date">Date</label>' +
    '<input type="date" id="m-trip-date" value="' + esc(t ? t.date : todayISO()) + '">' +
    '<label class="field" for="m-trip-start">Starting odometer</label>' +
    '<input type="number" id="m-trip-start" inputmode="decimal" min="0" step="any" placeholder="e.g. 48210" value="' + esc(t ? t.startOdo : lastEnd) + '">' +
    '<div class="odo-photo-row"><button type="button" class="btn-secondary odo-photo-btn" id="m-start-photo">📷 Photo</button>' +
    '<span class="dim" id="m-start-photo-note"></span></div>' +
    '<label class="field" for="m-trip-end">Ending odometer</label>' +
    '<input type="number" id="m-trip-end" inputmode="decimal" min="0" step="any" placeholder="e.g. 48296" value="' + esc(t ? t.endOdo : '') + '">' +
    '<div class="odo-photo-row"><button type="button" class="btn-secondary odo-photo-btn" id="m-end-photo">📷 Photo</button>' +
    '<span class="dim" id="m-end-photo-note"></span></div>' +
    '<div class="odo-miles" id="m-trip-miles"></div>' +
    '<label class="field" for="m-trip-notes">Notes <span class="dim">(optional)</span></label>' +
    '<input type="text" id="m-trip-notes" maxlength="80" placeholder="e.g. River bottoms check" value="' + esc(t ? t.notes || '' : '') + '">' +
    '<input type="file" id="m-odo-photo-input" class="hidden-file" accept="image/*">' +
    '<div class="btn-row" style="margin-top:14px"><button class="btn-secondary" id="m-cancel" type="button">Cancel</button>' +
    '<button class="btn-primary" id="m-ok" type="button">' + (t ? 'Save' : 'Add trip') + '</button></div>'
  );
  /* Live miles readout — updates as he types. */
  function updateOdoMiles() {
    var s = parseFloat($('m-trip-start').value), e = parseFloat($('m-trip-end').value);
    var el = $('m-trip-miles');
    if (isFinite(s) && isFinite(e) && e >= s) {
      el.textContent = 'Trip miles: ' + (e - s).toFixed(1);
    } else {
      el.textContent = '';
    }
  }
  $('m-trip-start').oninput = updateOdoMiles;
  $('m-trip-end').oninput = updateOdoMiles;
  updateOdoMiles();
  /* Q72: wire the camera buttons — one hidden input, reused for both. */
  var photoTarget = null;
  $('m-start-photo').onclick = function () { photoTarget = 'start'; $('m-odo-photo-input').click(); };
  $('m-end-photo').onclick = function () { photoTarget = 'end'; $('m-odo-photo-input').click(); };
  $('m-odo-photo-input').onchange = function () {
    var f = this.files[0];
    this.value = '';
    if (!f || !photoTarget) return;
    var target = photoTarget;
    photoTarget = null;
    /* A failed photo never blocks anything — it just doesn't attach. */
    try {
      downscalePhoto(f, function (blob) {
        if (!blob) return;
        if (target === 'start') { startPhoto = blob; $('m-start-photo-note').textContent = 'Photo attached.'; }
        else { endPhoto = blob; $('m-end-photo-note').textContent = 'Photo attached.'; }
      });
    } catch (e) { /* noop — saving the trip matters, the photo doesn't */ }
  };
  $('m-cancel').onclick = function () { renderMileageModal(lineId); };
  $('m-ok').onclick = function () {
    var date = $('m-trip-date').value;
    var s = $('m-trip-start').value.trim(), e = $('m-trip-end').value.trim();
    var err = validateTrip(date, s, e);
    if (err) { toast(err); return; }
    var rec = t || { id: uid('trip'), lineId: lineId, createdAt: Date.now() };
    rec.date = date;
    rec.startOdo = parseFloat(s);
    rec.endOdo = parseFloat(e);
    rec.notes = $('m-trip-notes').value.trim();
    if (!t) {
      if (!Array.isArray(Store.data.trips)) Store.data.trips = [];
      Store.data.trips.push(rec);
    }
    Store.save();
    /* Q72: attach odometer photos if any — failures are swallowed, the trip is already saved. */
    if (startPhoto) IDB.put('photos', { id: uid('p'), tripId: rec.id, kind: 'odo-start', blob: startPhoto, mime: startPhoto.type || 'image/jpeg', createdAt: Date.now() }).catch(function () {});
    if (endPhoto) IDB.put('photos', { id: uid('p'), tripId: rec.id, kind: 'odo-end', blob: endPhoto, mime: endPhoto.type || 'image/jpeg', createdAt: Date.now() }).catch(function () {});
    renderMileageModal(lineId);
    toast(t ? 'Trip updated.' : 'Trip logged.');
  };
}
function deleteTrip(lineId, tripId) {
  confirmModal('Delete this trip?',
    'The trip record will be removed. This cannot be undone.',
    'Delete trip', function () {
      Store.data.trips = (Store.data.trips || []).filter(function (x) { return !x || x.id !== tripId; });
      Store.save();
      renderMileageModal(lineId);
    });
}

/* --- CSV export: one row per trip for the active line, then TOTAL and
   ROUTE ESTIMATE summary rows. --- */
function buildMileageRows(lineId) {
  var ln = lineById(Store.data, lineId);
  var lname = ln ? ln.name : '';
  var rows = [['Date', 'Line', 'Start odometer', 'End odometer', 'Miles', 'Notes']];
  tripsForLine(lineId).forEach(function (t) {
    rows.push([t.date, lname, t.startOdo, t.endOdo, Math.round(tripMiles(t) * 10) / 10, t.notes || '']);
  });
  rows.push(['TOTAL', lname, '', '', Math.round(lineTripTotal(lineId) * 10) / 10, '']);
  var est = routeEstimate(lineId);
  rows.push(['ROUTE ESTIMATE', lname, '', '', Math.round(est.miles * 10) / 10,
    'Straight-line estimate \u2014 skewed vs road miles; trust your odometer']);
  return rows;
}
function exportMileage() {
  var id = activeLineId();
  if (!tripsForLine(id).length) { toast('No trips logged on this line yet.'); return; }
  downloadCSV('opossum-foot-mileage-' + lineFileSlug() + '-' + todayISO() + '.csv', buildMileageRows(id));
  toast('Mileage CSV downloaded.');
}

/* ================= 15. WIRING ================= */
function wireUp() {
  renderSetTypeOptions(); /* Q29: populate the Set Type dropdown from the taxonomy */
  /* Q30: live bait-rule warning as the trapper types in the bait rows.
     Q98: the "+ Add Another X" button appears as soon as any row of that
     attractant has a value. */
  document.addEventListener('input', function (e) {
    if (!e.target || !e.target.closest) return;
    var inp = e.target.closest('.attr-row-input');
    if (inp && inp.getAttribute('data-attr')) updateAttrAdd(inp.getAttribute('data-attr'));
    if (e.target.closest('#sf-bait-rows') &&
        typeof updateBaitWarn === 'function') updateBaitWarn();
  });
  /* splash -> next */
  $('btn-gps-state').onclick = gpsPreselect;
  $('btn-start').onclick = function () {
    var code = $('onboard-state').value;
    if (!code) { toast('Pick your trapping state first.'); return; }
    var al0 = activeLine();
    if (al0) al0.state = code;
    Store.save();
    /* Q53: home-ground step comes right after the state pick. */
    $('onboard-state-card').hidden = true;
    $('onboard-home-card').hidden = false;
  };
  /* Q53: home step — asked exactly once, attaches to the first line. Skip keeps today's behavior. */
  $('btn-home-skip').onclick = function () {
    var l0 = activeLine();
    if (l0) l0.homeAsked = true;
    Store.data.onboarded = true; Store.save();
    enterMain();
  };
  $('btn-home-gps').onclick = function () {
    var out = $('gps-home-result');
    if (!('geolocation' in navigator)) { out.textContent = 'This device has no GPS — choose on the map instead.'; return; }
    out.textContent = 'Getting your location…';
    navigator.geolocation.getCurrentPosition(function (pos) {
      saveHome(pos.coords.latitude, pos.coords.longitude);
      Store.data.onboarded = true; Store.save();
      enterMain();
    }, function () {
      out.textContent = 'Location unavailable — choose on the map instead.';
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  };
  $('btn-home-map').onclick = function () {
    var l1 = activeLine();
    if (l1) l1.homeAsked = true;
    Store.data.onboarded = true; Store.save();
    enterMain();
    startHomePick();
  };
  /* Q53: home picker bar on the map. */
  $('btn-home-ok').onclick = confirmHomePin;
  $('btn-home-cancel').onclick = cancelHomePick;
  /* Q53: change home from Settings — re-settable, never permanent. */
  $('btn-change-home').onclick = function () { switchTab('map'); startHomePick(); };

  /* tabs */
  var tabs = document.querySelectorAll('#tabbar button');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].onclick = (function (t) { return function () { switchTab(t.getAttribute('data-tab')); }; })(tabs[i]);
  }

  /* active line bar -> jump to Lines tab */
  var lb = $('line-bar');
  if (lb) lb.onclick = function () { switchTab('lines'); };

  /* map buttons */
  $('btn-locate').onclick = locateMe;
  /* Q8: while a route estimate is drawn, a chip offers the way back to the
     mileage dialog it came from. */
  var rbc = $('route-back-chip');
  if (rbc) rbc.onclick = function () {
    var id = routeShownFor;
    /* BQ1 (2026-09-30): the chip must ALWAYS go away on tap. A visible
       "Back to mileage" button that won't dismiss is never acceptable,
       even if the route state is somehow out of sync — so clear first,
       then navigate only when there's a line to go back to. */
    clearRouteEstimate();
    if (!id) return;
    switchTab('lines');
    showMileageModal(id);
  };
  /* Coming back from lock screen / background: iOS may have killed the GPS
     watch, so restart it if follow was engaged. Q70: silent — no routine
     GPS chatter on every wake. */
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && (locateState === 'following' || locateState === 'paused')) {
      restartFollowWatch();
    }
  });
  var bs = $('build-stamp'); if (bs) bs.textContent = APP_VERSION;
  $('btn-drop-pin').onclick = function () { setDropPinMode(!dropPinMode); };
  $('btn-add-gps').onclick = function () {
    /* + means "I'm standing on it": drop the pin at the live GPS fix right
       now and go straight into the New Set form — no draggable confirm.
       The middle pin icon stays the only path with a "Looks right" step.
       Never saves on a stale fix: waits for a fresh one first. */
    setDropPinMode(false);
    cancelPlacePin();
    if (lastFix && (Date.now() - (lastFix.at || 0) < 15000)) {
      openSetForm({ lat: lastFix.lat, lng: lastFix.lng });
      return;
    }
    toast('Waiting for GPS…');
    if (!('geolocation' in navigator)) { toast('This device has no GPS.'); return; }
    var done = false, timer = null;
    function fin(fix) {
      if (done) return; done = true;
      if (timer) clearTimeout(timer);
      if (fix) openSetForm({ lat: fix.lat, lng: fix.lng });
      else toast('No fresh GPS fix — move into open sky and try again.');
    }
    timer = setTimeout(function () { fin(null); }, 20000);
    try {
      navigator.geolocation.getCurrentPosition(function (p) {
        var c = p.coords || {};
        if (typeof c.latitude !== 'number' || typeof c.longitude !== 'number') { fin(null); return; }
        var ageMs = Date.now() - (p.timestamp || 0);
        if (ageMs > 30000 || ageMs < 0) { fin(null); return; } /* stale — refuse it */
        var acc = (typeof c.accuracy === 'number' && isFinite(c.accuracy)) ? Math.round(c.accuracy) : 9999;
        drawFix({ lat: c.latitude, lng: c.longitude, acc: acc }, false);
        fin({ lat: c.latitude, lng: c.longitude });
      }, function () { fin(null); },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
    } catch (e) { fin(null); }
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
  /* Q26: attractant rows wire their own suggestions in renderAttrRows */
  /* Q12: app-wide saved-entry suggestions — tap-to-fill, never auto-fill.
     Each kind is scoped to its own field. */
  attachSuggest('sf-name', 'sf-name-suggest', 'setname');
  attachSuggest('sf-missing-detail', 'sf-missing-detail-suggest', 'missingdetail');
  $('sf-date').onchange = function () { updateDateDOW('sf-date', 'sf-date-dow'); };
  $('btn-voice-setnotes').onclick = function () {
    var ta = $('sf-notes');
    Voice.start($('voice-setnotes-preview'), function (t) {
      ta.value = (ta.value ? ta.value.replace(/\s+$/, '') + ' ' : '') + t;
    });
  };
  /* Q37: photo option on the New Set form */
  $('btn-sf-photo').onclick = function () { $('sf-photo-input').click(); };
  $('sf-photo-input').onchange = function () {
    var f = this.files[0];
    this.value = '';
    if (!f) return;
    downscalePhoto(f, function (blob) {
      pendingSetPhotos.push({ blob: blob });
      renderPendingSetPhotos();
    });
  };

  /* Q67: sponsors now surface inside the bait/lure suggestion menus —
     no standalone badge row anymore. */

  /* Q36: citation photo for a confiscated set — take a photo or upload one */
  $('btn-sf-missing-photo').onclick = function () { $('sf-missing-photo-input').click(); };
  $('sf-missing-photo-input').onchange = function () {
    var f = this.files[0];
    this.value = '';
    if (!f) return;
    downscalePhoto(f, function (blob) {
      pendingSetPhotos.push({ blob: blob, kind: 'confiscation' });
      renderMissingPhotoStrip();
    });
  };

  /* Q36: missing-reason row on the set form */
  /* Status buttons on the set form (replaced the dropdown) */
  wireStatusSeg();
  var mrBtns = document.querySelectorAll('#sf-missing-reason button');
  for (var mrb = 0; mrb < mrBtns.length; mrb++) {
    mrBtns[mrb].onclick = (function (b) {
      return function () {
        setMissingReason = b.getAttribute('data-mr');
        hideSetFormError();
        renderMissingReasonRow();
      };
    })(mrBtns[mrb]);
  }
  /* Q71: status edits and recovery go through "Edit this set" now. */

  /* set detail */
  $('btn-sd-log').onclick = function () { openLogSheet(detailSetId); };
  $('btn-sd-emptycheck').onclick = function () {
    /* Tanner 2026-09-30: confirm first — a check-in restarts the clock and
       can't be undone. */
    var s = getSet(detailSetId);
    var name = s ? s.name : 'this set';
    confirmModal('Are you sure there are no changes?',
      'This restarts the check clock for <b>' + esc(name) + '</b> \u2014 no going back.',
      'Yes', function () { quickEmptyCheck(); });
    /* Tanner 2026-09-30: arm the confirm's OK button after a beat, so a fast
       double-tap on the sheet button can't fire straight through it. */
    var okBtn = $('m-ok');
    if (okBtn) {
      okBtn.disabled = true;
      setTimeout(function () { var b = $('m-ok'); if (b) b.disabled = false; }, 700);
    }
  };
  $('btn-sd-edit').onclick = function () { openSetForm(null, detailSetId); };
  $('btn-sd-delete').onclick = function () { deleteSet(detailSetId); };
  /* Q38: per-catch delete in the set-detail log list */
  $('sd-logs').addEventListener('click', function (e) {
    var delBtn = e.target.closest ? e.target.closest('[data-del-log]') : null;
    if (delBtn) { deleteLog(delBtn.getAttribute('data-del-log')); return; }
    var memoBtn = e.target.closest ? e.target.closest('[data-memo-play]') : null;
    if (memoBtn) toggleLogMemoPlayer(memoBtn);
  });
  /* Q71: memo recording, playback, and deletion live on the Edit Set form.
     The summary sheet is strictly read-only. */
  $('btn-se-memo').onclick = function () { Memo.toggle(editingSetId, $('btn-se-memo'), null, 'se-memos', true); };

  /* log sheet */
  /* Q12: Other-event species + log notes learn from use, tap-to-fill */
  attachSuggest('log-species-free', 'log-species-free-suggest', 'otherspecies');
  /* #6 (2026-10-01): Tanner — no tap-to-fill suggestions on catch-log notes either. */
  $('log-species-search').oninput = function () { renderSpeciesList(this.value); };
  var dispBtns = document.querySelectorAll('#log-disposition button');
  for (var db = 0; db < dispBtns.length; db++) {
    dispBtns[db].onclick = (function (b) {
      return function () {
        logDisposition = b.getAttribute('data-disp');
        for (var k = 0; k < dispBtns.length; k++) dispBtns[k].classList.toggle('selected', dispBtns[k] === b);
        hideLogFormError();
        renderLogWarnings();
      };
    })(dispBtns[db]);
  }
  $('log-count-minus').onclick = function () { if (logCount > 1) { logCount--; $('log-count').textContent = logCount; renderLogWarnings(); } };
  $('log-count-plus').onclick = function () { if (logCount < 99) { logCount++; $('log-count').textContent = logCount; renderLogWarnings(); } };
  /* event-type toggle: Catch vs Other event */
  var evBtns = document.querySelectorAll('#log-eventtype button');
  for (var eb = 0; eb < evBtns.length; eb++) {
    evBtns[eb].onclick = (function (b) {
      return function () { setLogEventType(b.getAttribute('data-ev')); };
    })(evBtns[eb]);
  }
  $('log-othertype').onchange = function () { logOtherType = this.value; updateLogNotesPlaceholder(); updateLogDispositionRow(); updateOtherSubtypeRows(); };
  $('log-date').onchange = function () { updateDateDOW('log-date', 'log-date-dow'); renderLogWarnings(); };
  $('btn-save-log').onclick = saveLog;
  $('btn-voice-lognotes').onclick = function () {
    var ta = $('log-notes');
    Voice.start($('voice-lognotes-preview'), function (t) {
      ta.value = (ta.value ? ta.value.replace(/\s+$/, '') + ' ' : '') + t;
    });
  };
  /* Voice memo on the catch: records to the set's memo store now, and the
     memo id is linked to this catch when it saves. */
  $('btn-log-memo').onclick = function () {
    var btn = this;
    Memo.toggle(logSetId, btn, function (memoId) {
      if (!logSheetLive) { IDB.del('memos', memoId).catch(function () { /* noop */ }); return; } /* landed after the sheet closed: orphan */
      pendingLogMemos.push(memoId);
    }, 'sd-memos', false); /* Q71: the set's memo list is playback-only outside Edit */
  };
  $('btn-log-photo').onclick = function () { $('log-photo-input').click(); };
  $('log-photo-input').onchange = function () {
    var f = this.files[0];
    this.value = '';
    if (!f) return;
    downscalePhoto(f, function (blob) {
      pendingLogPhotos.push({ blob: blob });
      renderPendingLogPhotos();
    });
  };

  /* seasons search */
  $('seasons-search').oninput = function () { renderSeasons(this.value); };

  /* history filters */
  $('history-search').oninput = function () { histUI.q = this.value; renderHistory(); };
  /* report filters (Settings) */
  $('exp-from').onchange = function () { exportUI.from = this.value; renderExportFilterBar(); };
  $('exp-to').onchange = function () { exportUI.to = this.value; renderExportFilterBar(); };
  $('exp-filters-clear').onclick = function () { clearExportFilters(); renderExportDimChips(); renderExportFilterBar(); };
  $('pane-settings').addEventListener('click', function (e) {
    var fchip = e.target.closest ? e.target.closest('[data-efdim]') : null;
    if (fchip) {
      var fkey = fchip.getAttribute('data-efdim'), fval = fchip.getAttribute('data-efval');
      var farr = exportUI[fkey];
      var fix = farr.indexOf(fval);
      if (fix === -1) farr.push(fval); else farr.splice(fix, 1);
      renderExportDimChips(); renderExportFilterBar();
      return;
    }
  });
  $('pane-totals').addEventListener('click', function (e) {
    var chip = e.target.closest ? e.target.closest('#totals-sec-chips .chip') : null;
    if (chip) {
      var ts = totalsSections(), k = chip.getAttribute('data-sec');
      ts[k] = !ts[k];
      Store.save();
      renderTotals();
      return;
    }
    /* Tanner 2026-09-30: collapse/expand a whole Totals section card. */
    var thead = e.target.closest ? e.target.closest('.totals-card-head') : null;
    if (thead) {
      var skey = thead.getAttribute('data-tsec');
      var tco = Store.data.totalsCollapsed || {};
      tco[skey] = !tco[skey];
      Store.data.totalsCollapsed = tco; Store.save();
      var tbody = thead.parentNode.querySelector('.totals-card-body');
      if (tbody) { if (tco[skey]) tbody.setAttribute('hidden', ''); else tbody.removeAttribute('hidden'); }
      thead.setAttribute('aria-expanded', String(!tco[skey]));
      var thchev = thead.querySelector('.tchev');
      if (thchev) thchev.textContent = tco[skey] ? '▸' : '▾';
      return;
    }
    /* Tap a By Species / By Set row to expand/collapse its details. */
    var trow = e.target.closest ? e.target.closest('[data-totkey]') : null;
    if (!trow) return;
    var tkey = trow.getAttribute('data-totkey');
    totalsExpanded[tkey] = !totalsExpanded[tkey];
    var det = trow.nextElementSibling;
    if (det && det.className.indexOf('totals-detail') !== -1) {
      if (totalsExpanded[tkey]) det.removeAttribute('hidden');
      else det.setAttribute('hidden', '');
    }
    var chev = trow.querySelector('.tchev');
    if (chev) chev.textContent = totalsExpanded[tkey] ? '▾' : '▸';
  });
  $('pane-history').addEventListener('click', function (e) {
    var delBtn = e.target.closest ? e.target.closest('[data-del-log]') : null;
    if (delBtn) { deleteLog(delBtn.getAttribute('data-del-log')); return; }
    var segBtn = e.target.closest ? e.target.closest('#hist-view-seg button') : null;
    if (segBtn) {
      histUI.view = segBtn.getAttribute('data-view');
      renderHistory();
      return;
    }
    /* Q40: season scope. */
    var seasonBtn = e.target.closest ? e.target.closest('#hist-season-seg button') : null;
    if (seasonBtn) {
      histUI.season = seasonBtn.getAttribute('data-season');
      renderHistory();
      return;
    }
    var chip = e.target.closest ? e.target.closest('.chip') : null;
    if (chip) {
      if (chip.hasAttribute('data-disp')) histUI.disp = chip.getAttribute('data-disp');
      renderHistory();
      return;
    }
    var spHead = e.target.closest ? e.target.closest('.sp-head') : null;
    if (spHead && !spHead.classList.contains('tt-head')) {
      var s = spHead.getAttribute('data-sp');
      histUI.spOpen[s] = !histUI.spOpen[s];
      renderHistory();
      return;
    }
    var ttHead = e.target.closest ? e.target.closest('.tt-head') : null;
    if (ttHead) {
      var t = ttHead.getAttribute('data-tt');
      histUI.ttOpen[t] = !histUI.ttOpen[t];
      renderHistory();
      return;
    }
    var dh = e.target.closest ? e.target.closest('.day-head') : null;
    if (dh) {
      var d = dh.getAttribute('data-day');
      histUI.collapsed[d] = !histUI.collapsed[d];
      renderHistory();
      /* Q85 (2026-10-01): Tanner — opening a group below the fold scrolls it
         into view so he lands on it. */
      if (!histUI.collapsed[d]) {
        var reopened = document.querySelector('.day-head[data-day="' + d + '"]');
        if (reopened && reopened.scrollIntoView) reopened.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
      return;
    }
    var memoBtn = e.target.closest ? e.target.closest('[data-memo-play]') : null;
    if (memoBtn) { toggleLogMemoPlayer(memoBtn); return; }
    var row = e.target.closest ? e.target.closest('.log-row') : null;
    if (row && row.getAttribute('data-log')) {
      var k = row.getAttribute('data-log');
      histUI.expanded[k] = !histUI.expanded[k];
      row.classList.toggle('expanded', !!histUI.expanded[k]);
    }
  });

  /* licenses */
  $('btn-add-license').onclick = function () { $('license-input').click(); };
  $('license-input').onchange = function () {
    var files = this.files;
    if (!files || !files.length) return;
    var done = 0;
    for (var i = 0; i < files.length; i++) {
      (function (f) {
        IDB.put('photos', { id: uid('p'), name: f.name, blob: f, lineId: activeLineId(), createdAt: Date.now() })
          .then(function () { done++; if (done === files.length) { renderLicenses(); toast('License photo saved on this phone.'); } })
          .catch(function () { toast('Could not save that photo.'); });
      })(files[i]);
    }
    this.value = '';
  };

  /* Q52: landowner notebook */
  $('btn-add-landowner').onclick = function () { openLandownerForm(null); };
  $('landowner-search').oninput = function () { renderLandowners(); };

  /* settings */
  $('settings-state').onchange = function () {
    var code = this.value;
    var al = activeLine();
    if (!code || !al || code === al.state) return;
    al.state = code;
    Store.save();
    renderSeasons('');
    fitMapHome(); /* Q110: the line's home wins over the new state's center */
    /* Tanner 2026-09-30: the state-mismatch alert must re-evaluate now —
       otherwise it sits on screen after the state was just fixed in Settings. */
    checkStateMismatch(lastStateInfo);
    var e = stateEntry(code);
    toast('Trapping state is now ' + (e ? e.name : code) + '.');
  };
  $('btn-backup').onclick = exportFullBackup;
  $('btn-export-catches').onclick = exportCatches;
  $('btn-export-sets').onclick = exportSets;
  $('btn-export-mileage').onclick = exportMileage; /* Q8 */
  $('btn-import').onclick = function () { $('import-file').click(); };
  $('import-file').onchange = function () {
    if (this.files && this.files[0]) importDataFile(this.files[0]);
    this.value = '';
  };
  $('btn-import-pins').onclick = function () { $('import-pins-file').click(); };
  $('import-pins-file').onchange = function () {
    if (this.files && this.files[0]) importPinsFile(this.files[0]);
    this.value = '';
  };
  $('btn-erase').onclick = eraseAll;
  wirePurge(); /* Q82 */

  /* Q49: wire the collapsible settings section headers */
  var secHeads = document.querySelectorAll('.setsec-head');
  for (var shi = 0; shi < secHeads.length; shi++) {
    (function (h) {
      h.addEventListener('click', function () { toggleSettingsSection(h.getAttribute('data-sec')); });
    })(secHeads[shi]);
  }

  /* Q145: apply the saved pin scheme (default Earthy) and paint the picker. */
  try { document.body.setAttribute('data-pinscheme', pinSchemeId()); } catch (e) {}
  renderPinSchemeList();

  /* trap lines */
  $('btn-add-line').onclick = showAddLineModal;

  /* sheets + modal */
  $('scrim').onclick = function () { Voice.stop(); closeSheets(); };
  var xs = document.querySelectorAll('.sheet-x');
  for (var k = 0; k < xs.length; k++) xs[k].onclick = function () {
    Voice.stop();
    var sheet = this.closest ? this.closest('.sheet') : null;
    /* B11: closing a half-entered catch asks first — an untouched form just closes. */
    if (sheet && sheet.id === 'sheet-log' && logFormDirty()) {
      confirmModal('Abandon this catch?', 'Nothing here is saved yet. Close and lose what you entered?', 'Abandon', function () { closeSheets(); });
      return;
    }
    closeSheets();
  };
  /* Q140: stacked-pin menu — tapping a row opens that set's detail sheet. */
  $('stack-list').addEventListener('click', function (e) {
    var row = e.target && e.target.closest ? e.target.closest('[data-stack-id]') : null;
    if (row) openSetDetail(row.getAttribute('data-stack-id'));
  });
  /* Q105 (2026-10-01): Tanner — no backdrop-tap dismissal on any dialog;
     every confirm closes only via its own buttons. The old
     "$('modal').onclick = ... closeModal()" handler is gone. */

  /* offline banner + county backfill when service returns */
  function net() { $('offline-banner').classList.toggle('show', !navigator.onLine); }
  window.addEventListener('online', function () {
    net(); backfillCounties();
    if (lastFix) maybeRetryCountyBanner(lastFix.lat, lastFix.lng); /* Q96 */
  });
  window.addEventListener('offline', net);
  net();
  /* Q13: never let a pinch scale the app page itself. iOS Safari ignores the
     viewport maximum-scale for pinch gestures, so it is enforced here:
     gesturestart (iOS-only event) and two-finger touchmove are cancelled
     everywhere EXCEPT on the Leaflet map, which owns its own pinch-zoom.
     Desktop trackpad pinch (ctrl+wheel) is cancelled the same way. */
  function pinchOnMap(e) {
    return !!(e.target && e.target.closest && e.target.closest('#map'));
  }
  document.addEventListener('gesturestart', function (e) {
    if (!pinchOnMap(e)) e.preventDefault();
  });
  document.addEventListener('touchmove', function (e) {
    if (e.touches && e.touches.length > 1 && !pinchOnMap(e)) e.preventDefault();
  }, { passive: false });
  document.addEventListener('wheel', function (e) {
    if (e.ctrlKey && !pinchOnMap(e)) e.preventDefault();
  }, { passive: false });
  backfillCounties();
}

/* ================= 16. BOOT ================= */
function boot() {
  Store.load();
  /* Q55: one delegated listener reveals the "What is it?" box under any
     Other-capable dropdown, wherever it was rendered. */
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t && t.tagName === 'SELECT' && t.getAttribute('data-has-other')) toggleOtherWrap(t);
  });
  /* demo mode: seed fictional data only on a completely fresh install */
  if (DEMO && Store.data.sets.length === 0 && Store.data.logs.length === 0) {
    seedDemoStore();
    DEMO_ACTIVE = true;
    document.body.classList.add('demo-shot');
  }
  buildStateSelect($('onboard-state'), activeStateCode());
  wireUp();
  IDB.open().then(function () {
    if (DEMO_ACTIVE) seedDemoIDB();
    $('splash-status').textContent = 'Ready.';
    /* B17: hold the splash a few seconds so the logo gets its moment. */
    setTimeout(function () {
      if (Store.data.onboarded && activeStateCode() && stateData()) enterMain();
      else showView('view-onboard');
      if (DEMO_ACTIVE) toast('Demo mode — fictional data.');
    }, 3000);
  });
  /* service worker: http(s) only — skipped on file:// */
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* offline still works without it */ });
      /* A new build took charge while this page still runs the old one:
         offer a one-tap reload. Never force it — the user might be mid-log. */
      navigator.serviceWorker.addEventListener('message', function (ev) {
        if (ev.data && ev.data.type === 'OF_NEW_VERSION') showUpdateBanner();
      });
      /* backstop: version stamp check when the app is foregrounded / periodically */
      document.addEventListener('visibilitychange', function () { if (!document.hidden) checkBuildFresh(); });
      setInterval(checkBuildFresh, 5 * 60 * 1000);
    });
  }
}

var _updateBannerShown = false;
function showUpdateBanner() {
  if (_updateBannerShown) return;
  _updateBannerShown = true;
  var d = document.createElement('div');
  d.id = 'update-banner';
  var s = document.createElement('span');
  s.textContent = 'New version ready.';
  var b = document.createElement('button');
  b.type = 'button';
  b.id = 'update-reload';
  b.textContent = 'Reload';
  b.addEventListener('click', function () { window.location.reload(); });
  d.appendChild(s);
  d.appendChild(b);
  document.body.appendChild(d);
}
function checkBuildFresh() {
  if (_updateBannerShown) return;
  fetch('version.txt', { cache: 'no-store' }).then(function (r) {
    if (!r.ok) throw 0;
    return r.text();
  }).then(function (t) {
    t = (t || '').trim();
    if (t && APP_VERSION.indexOf(t) === -1) showUpdateBanner();
  }).catch(function () { /* offline: stay quiet */ });
}

document.addEventListener('DOMContentLoaded', boot);
