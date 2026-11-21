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
  { code: "MS", name: "Mississippi", file: "mississippi-2026-27.json", provisional: false },
  { code: "MO", name: "Missouri", file: "missouri-2026-27.json", provisional: false },
  { code: "MT", name: "Montana", file: "montana-2026-27.json", provisional: false },
  { code: "NE", name: "Nebraska", file: "nebraska-2026-27.json", provisional: false },
  { code: "NV", name: "Nevada", file: "nevada-2026-27.json", provisional: false },
  { code: "NH", name: "New Hampshire", file: "new-hampshire-2026-27.json", provisional: false },
  { code: "NJ", name: "New Jersey", file: "new-jersey-2026-27.json", provisional: false },
  { code: "NM", name: "New Mexico", file: "new-mexico-2026-27.json", provisional: false },
  { code: "NY", name: "New York", file: "new-york-2026-27.json", provisional: false },
  { code: "NC", name: "North Carolina", file: "north-carolina-2026-27.json", provisional: false },
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
  { code: "VT", name: "Vermont", file: "vermont-2026-27.json", provisional: false },
  { code: "VA", name: "Virginia", file: "virginia-2026-27.json", provisional: false },
  { code: "WA", name: "Washington", file: "washington-2026-27.json", provisional: false },
  { code: "WV", name: "West Virginia", file: "west-virginia-2026-27.json", provisional: false },
  { code: "WI", name: "Wisconsin", file: "wisconsin-2026-27.json", provisional: false },
  { code: "WY", name: "Wyoming", file: "wyoming-2026-27.json", provisional: false }
];
var REMINDER_LINE = 'Reminder only — always verify with your state agency and local ordinances.';
var APP_VERSION = 'beta 0.1 · build 2026-11-21hs';
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
    /* Q183 (2026-10-14): weather defaults ON for a fresh install — the
       Surface's blank copy surprised Tanner with the chip missing. This
       fill only fires when the key is absent, so existing installs keep
       whatever they chose. */
    if (typeof this.data.weatherOn !== 'boolean') this.data.weatherOn = true;
    if (typeof this.data.voiceOn !== 'boolean') this.data.voiceOn = true;
    if (typeof this.data.rulerOn !== 'boolean') this.data.rulerOn = true; /* fy: map ruler on by default */
    if (typeof this.data.windArrowsOn !== 'boolean') this.data.windArrowsOn = true; /* Q17: on by default */
    /* Q68: trap check clock — hours between required checks, default 24. */
    if (typeof this.data.checkIntervalHours !== 'number' || this.data.checkIntervalHours <= 0) this.data.checkIntervalHours = 24;
    if (typeof this.data.checkClockOn !== 'boolean') this.data.checkClockOn = true; /* alerts on by default */
    /* gn: the trapper's own trap tag text (Settings → Where You Trap),
       shown back beside the state's Cat 1 trap-tag rule on the Seasons tab. */
    if (typeof this.data.trapTag !== 'string') this.data.trapTag = '';
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
    /* gd (2026-11-15): the Totals section chips are gone — every section
       card always stands; collapsing a card is the one mechanism. Stored
       totalsSections values from the chip era are simply ignored. */
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
    /* Q182: per-line catch-log alerts. Default on — the reminders have
       always been on for everyone; a line only goes quiet when its
       owner turns them off for that line. Old backups lack the flag
       and land here, so they keep the old behavior. */
    if (typeof ln.catchAlerts !== 'boolean') ln.catchAlerts = true;
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
    onboarded: true, state: 'IA', weatherOn: true, voiceOn: true, rulerOn: true,
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
  /* Q201: if the track-finish sheet went away with a route still unsaved,
     the route surfaces itself on the map with a Save button in the route
     bar — an unsaved route is never stranded behind a closed sheet. */
  try { if (window.Tracking && Tracking.rescuePending) Tracking.rescuePending(); } catch (e) { /* noop */ }
}

/* modal — dialogs close only via their buttons, never a backdrop tap (Q105). */
function showModal(html) {
  $('modal-card').innerHTML = html;
  $('modal').classList.remove('sponsor-sheet'); /* Q171: sheet mode is opt-in per open */
  $('modal').classList.remove('sheet-dress'); /* gx: the bulk family's sheet dress is opt-in per open, same pattern */
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

/* ho (Q255): a season record's method + land label, e.g. "Trapping ·
   Public land". Land "all" carries no tag — the season runs everywhere. */
function seasonMethodLand(s) {
  if (!s) return '';
  var m = s.method === 'trapping' ? 'Trapping' : s.method === 'hunting' ? 'Hunting' : s.method === 'both' ? 'Trapping & hunting' : '';
  var l = s.land_type === 'private' ? 'Private land' : s.land_type === 'public' ? 'Public land' : '';
  return [m, l].filter(Boolean).join(' · ');
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
  fitCountyName();
}

/* fq (2026-11-14, Tanner): the county name must shrink to fit on ONE line
   in the space between the two sponsor logos, never overlapping them and
   never wrapping. Long names (Pottawattamie, Prince George's, San Bernardino
   — up to ~22 chars) are wider than the ~264px between the logos at 22px, so
   they used to wrap to two lines and grow the banner ~28px. fitCountyName
   resets to the CSS base size, then steps the font down (proportionally, so
   it lands in 1–2 passes) until the text fits its box, with a 14px floor.
   The longest real US county name fits at ~16px, well above the floor, so
   the floor is a safety net real names never hit. Runs whenever the name is
   set and on resize/rotation (the box width changes). Skips when the banner
   isn't laid out yet (clientWidth 0, e.g. onboarding) — the next set or
   resize re-runs it. */
function fitCountyName() {
  var el = $('cb-county');
  if (!el) return;
  el.style.fontSize = ''; /* reset to the CSS base (22px known, 16px unknown) */
  var box = el.clientWidth;
  if (!box) return;
  var size = parseFloat(getComputedStyle(el).fontSize) || 22;
  var guard = 0;
  while (el.scrollWidth > box && size > 14 && guard++ < 20) {
    size = Math.max(14, size * box / el.scrollWidth);
    el.style.fontSize = size.toFixed(1) + 'px';
  }
}
window.addEventListener('resize', fitCountyName);
window.addEventListener('orientationchange', fitCountyName);

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
      noteCountyBannerAt(lat, lng); /* Q225 */
    }
  });
}

/* Q225 (2026-10-28): the banner was written once — on the crosshair-acquire
   final fix — and never reconsidered. Q96's retry only heals an UNKNOWN
   banner, so a trapper who crossed a county line carried the old county in
   the header for the whole outing (Tanner's field report: dot in Boone,
   banner still GREENE — for him that banner carries legal weight). Now the
   banner remembers where it was set from; once a follow fix lands more than
   400 m from that point (well beyond GPS jitter, well inside any real
   crossing), the county is looked up again and the banner corrected. The
   60 s throttle matches Q96's. A successful lookup re-arms the gate from the
   new point, changed county or not, so steady travel doesn't re-fetch on
   every throttle window. */
var countyBannerAt = null;
var lastCountyMoveCheck = 0;
function noteCountyBannerAt(lat, lng) {
  if (typeof lat === 'number' && typeof lng === 'number') countyBannerAt = { lat: lat, lng: lng };
}
function maybeMoveCountyBanner(lat, lng) {
  var banner = $('county-banner');
  if (!banner || banner.classList.contains('unknown')) return; /* Q96 owns the unknown case */
  if (typeof lat !== 'number' || typeof lng !== 'number') return;
  if (!countyBannerAt) { noteCountyBannerAt(lat, lng); return; }
  if (haversineMi(countyBannerAt.lat, countyBannerAt.lng, lat, lng) * 1609.34 < 400) return;
  var now = Date.now();
  if (now - lastCountyMoveCheck < 60000) return;
  lastCountyMoveCheck = now;
  reverseGeocode(lat, lng).then(function (info) {
    if (info && info.county) {
      setCountyBanner(info);
      checkStateMismatch(info);
      noteCountyBannerAt(lat, lng);
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
  /* ho (2026-11-21, Q257, Tanner): every freshness stamp names its own
     provider — a bare "just now" riding beside another provider's stale
     note read as a claim about the stale data ("53 hr ago · NWS just
     now"). A stamp may only ever describe the data its own provider
     fetched in this load. */
  wxOmStamp = staleNote || 'Open-Meteo updated just now';
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
    : 'NWS updated just now'; /* ho (Q257): provider-scoped, like Open-Meteo's */
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
/* Q182: the active line's catch-alerts switch. A line normalized before
   this build has no flag — missing reads as on (the old behavior). */
function lineCatchAlerts() {
  var l = activeLine();
  return !l || l.catchAlerts !== false;
}
/* Q182: syncs the Settings Catch warnings switch to the active line.
   Called from the same places as renderTabToggles so a line switch
   re-binds it to the new line. */
function renderCatchAlertsToggle() {
  var l = activeLine();
  var cb = $('settings-catchalerts');
  if (cb) cb.checked = lineCatchAlerts();
  var nameEl = $('catchalerts-line-name');
  if (nameEl) nameEl.textContent = l ? l.name : '';
}
/* ---- feature toggles ---- */
function applyFeatureToggles() {
  var vOn = Store.data.voiceOn !== false;
  ['btn-voice-setnotes', 'voice-setnotes-preview', 'btn-voice-lognotes', 'voice-lognotes-preview',
   'btn-se-memo', 'se-memos-label', 'se-memos', 'setform-memos',
   'sd-memos-label', 'sd-memos',
   'sd-notes-head', 'sd-notes'].forEach(function (id) {
    var el = $(id);
    if (el) el.style.display = vOn ? '' : 'none';
  });
  /* ga: in the installed iPhone app the Voice → notes buttons cannot listen
     (Apple blocks dictation there) — they only printed instructions, which
     Tanner called redundant. Hide the buttons and show the one-line keyboard
     tip instead. Record memo still works on iPhone and stays. */
  if (isIOSPWA()) {
    ['btn-voice-setnotes', 'voice-setnotes-preview', 'btn-voice-lognotes', 'voice-lognotes-preview'].forEach(function (id) {
      var el = $(id);
      if (el) el.style.display = 'none';
    });
  }
  ['voice-setnotes-tip', 'voice-lognotes-tip'].forEach(function (id) {
    var el = $(id);
    if (el) el.style.display = (vOn && isIOSPWA()) ? '' : 'none';
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
  /* Q8 + gb (2026-11-15): the mileage toggle stops NEW recording — it no
     longer hides records already made. The CSV export stays while any line
     has trips; the Paperwork card stays while the ACTIVE line has trips
     (renderPaperworkMileage applies the same rule when it renders). */
  var mOn = Store.data.mileageOn !== false;
  var mexp = $('btn-export-mileage');
  if (mexp) mexp.style.display = (mOn || (Store.data.trips || []).length > 0) ? '' : 'none';
  var pmc = $('setsec-mileage');
  if (pmc) {
    var aln = activeLine();
    var pmcTrips = !!(aln && tripsForLine(aln.id).length);
    pmc.style.display = (mOn || pmcTrips) ? '' : 'none';
  }
  /* Q206 (2026-10-19): the map's Track fab follows this same toggle. */
  if (window.Tracking && Tracking.syncFab) Tracking.syncFab();
  /* fy: ruler toggle — off hides the map's measure button entirely and ends
     any measurement in progress. Default on. */
  var rOn = Store.data.rulerOn !== false;
  var rbtn = $('btn-measure');
  if (rbtn) rbtn.style.display = rOn ? '' : 'none';
  if (!rOn && typeof measureMode !== 'undefined' && measureMode) setMeasureMode(false);
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
  /* ho (Q249): combo fields are INPUTs — the typed text IS the value.
     Novel text (not among the field's current options) is remembered as
     a custom option, the Q55 rule carried over; the maker's mixed-brands
     label resolves to the '__mixed' sentinel the readers already know. */
  if (sel.tagName === 'INPUT') {
    var iv = sel.value.trim();
    if (id === 'sf-maker' && iv === MIXED_MAKER_LABEL) return '__mixed';
    if (iv && comboBaseCache[id] && comboBaseCache[id].indexOf(iv) === -1) rememberCustomOption(id, iv);
    return iv;
  }
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
/* Q67: sponsored products ride INSIDE the bait/lure suggestion menus,
   with a Sponsored tag. Tapping the product name fills the row; the eye
   opens the sponsor bio without filling anything.
   gl (Tanner's ruling, 2026-11-16): the regular entries — the built-in
   products and the trapper's own remembered ones — list FIRST; matching
   sponsored products follow. His everyday products outrank the sponsors
   in his own suggestion box. */
/* Q69: the sponsor's logo (product badge) replaces the eye in the suggestion
   row; tapping it still opens the sponsor bio. No badge on file → the eye
   stays as the fallback so the info page is always one tap away. */
/* Q238 (2026-11-07): one row per sponsor PRODUCT, not one per sponsor.
   The row fills that product; the eye/logo opens the sponsor bio. */
function sponsorSuggestRowHtml(sp, productName) {
  var mark = sp.badge
    ? '<img class="sponsor-logo" src="' + esc(sp.badge) + '" alt="' + esc(sp.name) + ' logo">'
    : '&#128065;';
  return '<div class="suggest-sponsor">' +
    '<button type="button" class="suggest-fill" data-v="' + esc(productName) + '"><span class="suggest-name">' + esc(productName) + '</span> <span class="pill">Sponsored</span></button>' +
    '<button type="button" class="sponsor-eye" data-sp="' + esc(sp.id) + '" aria-label="About ' + esc(sp.name) + '">' + mark + '</button>' +
    '</div>';
}
/* Q238: expand each sponsor's products array into individual rows. Filter
   is PREFIX on the product name only (Tanner's ruling 2026-11-07): typing
   "M" shows what starts with M, "G" what starts with G. No sponsor-name
   fallback — it made "g" match everything ("Pine Hollow Trapping" has a
   "g"). Empty query shows all products for the section. */
/* fg: a product carries its own section when its sponsor spans
   sections (Pine Hollow: bait/lure/urine/visual); otherwise it falls back
   to the sponsor's single section, so existing sponsors behave as before.
   Rows sort alphabetically by product name. */
function sponsorSuggests(key, q) {
  var out = [];
  for (var i = 0; i < SPONSORS.length; i++) {
    var sp = SPONSORS[i];
    var products = sp.products || (sp.product ? [{ name: sp.product }] : []);
    for (var j = 0; j < products.length; j++) {
      var name = products[j] && products[j].name ? String(products[j].name) : '';
      if (!name) continue;
      var psec = (products[j] && products[j].section) || sp.section;
      if (psec !== key) continue;
      if (q && name.toLowerCase().indexOf(q) !== 0) continue;
      out.push({ sp: sp, name: name });
    }
  }
  out.sort(function (a, b) {
    var al = a.name.toLowerCase(), bl = b.name.toLowerCase();
    return al < bl ? -1 : (al > bl ? 1 : 0);
  });
  return out;
}
/* ft (2026-11-14, Tanner): typeToFilter — for the product lists (bait, lure,
   urine, visual, audio, other) the suggestion box stays shut until you start
   typing. Tap the field and only the keyboard opens; type 'C' and the
   products starting with C appear. A value already in the field stays put
   (auto-saved — no need to look it up again). Other suggest fields keep the
   old focus-pop behavior. */
/* ---- hr (2026-11-21, Q273, Tanner): a typing field must sit where he can
   see it AND its suggestion list. On his phone the form never scrolled:
   tap a lure box low in the form, the keyboard rises, and the list opens
   UNDER the field — straight behind the keyboard (his screenshot: the
   "Cedar Creek Lures…" row sliced in half at the keyboard's top edge,
   and the field itself riding low instead of centered). After any
   suggest render that shows the box, pull the field up to about 30% of
   the VISIBLE height (visualViewport — the part the keyboard does not
   cover) inside its scroll container, leaving the list room beneath it.
   Two passes: one quick (typing, keyboard already up) and one after the
   keyboard finishes rising (focus); a pass no-ops when the field
   already sits right or is no longer focused. */
function comboReveal(input, box) {
  if (!input || !box) return;
  [60, 380].forEach(function (delay) {
    setTimeout(function () {
      if (!box.className || box.className.indexOf('show') === -1) return;
      if (document.activeElement !== input) return;
      var sc = input.closest ? input.closest('.scroll') : null;
      if (!sc) {
        var p = input.parentElement;
        while (p && p !== document.body) {
          var cs = getComputedStyle(p);
          if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && p.scrollHeight > p.clientHeight) { sc = p; break; }
          p = p.parentElement;
        }
      }
      var vv = window.visualViewport;
      var visH = vv ? vv.height : window.innerHeight;
      var ir = input.getBoundingClientRect();
      var br = box.getBoundingClientRect();
      var target = Math.max(10, visH * 0.30);
      var listWanted = Math.min(br.height, 230);
      if (ir.top >= 0 && ir.top <= target + 4 && ir.bottom + listWanted <= visH + 4) return;
      if (sc) sc.scrollTop += ir.top - target;
      else if (input.scrollIntoView) input.scrollIntoView(true);
    }, delay);
  });
}
/* ---- hs (2026-11-21, Q275, Tanner): tapping a filled box selects the
   whole entry, so typing replaces it — the way most form boxes behave.
   His report, with a screenshot: the cursor landed exactly where his
   finger tapped, mid-word, and his typing went in there ("Not sure /
   mixed brands" became "Notdu sure / mixed brands"). One delegated
   focusin listener covers every fillable box in the app, including rows
   built on the fly. His exception: Notes and memo boxes keep placing
   the cursor — they are all <textarea>s, never touched here — and
   date/time/pick fields are not text boxes. A second tap in an
   already-focused box still places the cursor where he points: focus
   does not refire, so nothing re-selects. The select is deferred a tick
   because WebKit places the tap's caret after focus fires; selecting
   after that placement is what makes it stick on his phone. */
document.addEventListener('focusin', function (e) {
  var el = e.target;
  if (!el || el.tagName !== 'INPUT' || el.readOnly || el.disabled) return;
  var t = (el.type || 'text').toLowerCase();
  if (t !== 'text' && t !== 'search' && t !== 'number' && t !== 'tel' && t !== 'url' && t !== 'email') return;
  if (!el.value) return;
  setTimeout(function () {
    if (document.activeElement !== el) return;
    try { el.select(); } catch (err) { /* a type that refuses keeps its cursor */ }
  }, 0);
});
/* hs (2026-11-21, Q276): is this saved entry one of the sponsors'
   products for this section? His bag holds two shapes: the plain
   product name (what picking a sponsor row fills) and the
   "Sponsor - Product" string (what bulk edits and his own typing
   leave). Compare alphanumerics-only so "Cavens - Terminator" and
   "Caven's Terminator" are the same product. */
function sponsorEntryMatch(key, entry) {
  var norm = function (s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ''); };
  var e = norm(entry);
  if (!e) return null;
  for (var i = 0; i < SPONSORS.length; i++) {
    var sp = SPONSORS[i];
    var products = sp.products || (sp.product ? [{ name: sp.product }] : []);
    for (var j = 0; j < products.length; j++) {
      var name = products[j] && products[j].name ? String(products[j].name) : '';
      if (!name) continue;
      var psec = (products[j] && products[j].section) || sp.section;
      if (psec !== key) continue;
      if (e === norm(name) || e === norm(sp.name + ' ' + name)) return { sp: sp, name: name };
    }
  }
  return null;
}
function attachSuggest(inputId, boxId, key, typeToFilter) {
  var input = $(inputId), box = $(boxId);
  if (!input || !box || input._suggestWired) return;
  input._suggestWired = true;
  /* Q236 (2026-11-07): an × that wipes the field in one tap — the manual
     entries auto-populate from the last thing used, and clearing them took
     deleting every letter. The button rides inside the input's right edge
     and only shows while the field has text. It clears the text only: it
     does NOT forget the entry from the saved-entry history (the × on a
     suggestion row is the way to remove one from history; the last-used
     value is usually wanted again). */
  var wrap = document.createElement('span');
  wrap.className = 'clear-wrap';
  input.parentNode.insertBefore(wrap, input);
  wrap.appendChild(input);
  var clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'input-clear';
  clearBtn.setAttribute('aria-label', 'Clear');
  clearBtn.textContent = '×';
  clearBtn.hidden = !input.value;
  wrap.appendChild(clearBtn);
  clearBtn.onclick = function (e) {
    if (e && e.stopPropagation) e.stopPropagation();
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
  };
  function updateClear() { clearBtn.hidden = !input.value; }
  function fillFrom(btn) {
    input.value = btn.getAttribute('data-v');
    box.className = 'suggest'; box.innerHTML = '';
    input.focus();
    /* ft: the input event below fires render — without this flag it would
       pop the box straight back up with matches for the value just picked. */
    input._justFilled = true;
    /* Q98 fix (2026-10-01): a programmatic fill fires no input event, so the
       "+ Add Another" button never appeared after tapping a suggestion.
       Dispatch it so the button (and the bait-rule check) update. */
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function render(bagMode) {
    /* ft: a just-picked value closes the box and keeps it closed. */
    if (input._justFilled) { input._justFilled = false; box.className = 'suggest'; box.innerHTML = ''; return; }
    var q = input.value.trim().toLowerCase();
    /* hs (2026-11-21, Q276, Tanner — reversing the ft type-to-filter call
       at his word; he named the back-and-forth himself): on an attractant
       field, an empty box — tapped into, or typed back to empty — shows
       HIS BAG: every entry he has put in this kind of box so far. Typing
       takes over from there: the list filters by letter and the sponsor
       products come in, as before. A bag entry that IS a sponsor product
       carries its Sponsored pill + logo tag (see the items map below). */
    var bag = typeToFilter && (bagMode === 'bag' || !q);
    var sps = bag ? [] : sponsorSuggests(key, q);
    var items = savedEntries(key).filter(function (v) {
      var vl = v.toLowerCase();
      if (bag) return true;
      return vl !== q && (!q || vl.indexOf(q) === 0); /* Q238: saved entries filter by prefix too */
    });
    /* fg: saved entries sort alphabetically in the suggestion list. */
    items.sort(function (a, b) {
      var al = a.toLowerCase(), bl = b.toLowerCase();
      return al < bl ? -1 : (al > bl ? 1 : 0);
    });
    if (!bag) items = items.slice(0, 6); /* the bag shows whole — his word: "all of them" */
    /* fg: a "None" row tops every attractant suggestion box — shown
       when the field is empty or the query matches "none" by prefix.
       hs: not in the bag view — the bag is his entries, nothing else. */
    var showNone = !bag && (!q || 'none'.indexOf(q) === 0) && q !== 'none';
    if (!sps.length && !items.length && !showNone) { box.className = 'suggest'; box.innerHTML = ''; return; }
    var noneHtml = showNone
      ? '<div class="suggest-row"><button type="button" class="suggest-item" data-v="None">None</button></div>'
      : '';
    var html = noneHtml + items.map(function (v) {
      /* Q79 (2026-10-01): Tanner — user-typed entries get a × to remove them
         from the list; built-in seeds don't. */
      var del = isSeedEntry(key, v)
        ? ''
        : '<button type="button" class="suggest-del" data-v="' + esc(v) + '" aria-label="Remove from list">×</button>';
      /* hs (Q276): a bag entry that is a sponsor product wears the tag —
         the Sponsored pill and the sponsor's logo eye, same as its row
         in the sponsor list below. */
      var m = sponsorEntryMatch(key, v);
      if (m) {
        var mark = m.sp.badge
          ? '<img class="sponsor-logo" src="' + esc(m.sp.badge) + '" alt="' + esc(m.sp.name) + ' logo">'
          : '&#128065;';
        return '<div class="suggest-row"><button type="button" class="suggest-item" data-v="' + esc(v) + '"><span class="suggest-name">' + esc(v) + '</span> <span class="pill">Sponsored</span></button>' +
          '<button type="button" class="sponsor-eye" data-sp="' + esc(m.sp.id) + '" aria-label="About ' + esc(m.sp.name) + '">' + mark + '</button>' + del + '</div>';
      }
      return '<div class="suggest-row"><button type="button" class="suggest-item" data-v="' + esc(v) + '">' + esc(v) + '</button>' + del + '</div>';
    }).join('') + sps.map(function (r) { return sponsorSuggestRowHtml(r.sp, r.name); }).join('');
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
    comboReveal(input, box); /* hr (Q273): keep the field + list above the keyboard */
  }
  input.addEventListener('input', function () { render(); });
  input.addEventListener('input', updateClear); /* Q236: the × shows only while the field has text */
  /* ft was: type-to-filter fields do NOT pop the box on focus. hs (Q276)
     reverses that for attractant fields at Tanner's word: focus pops
     HIS BAG. Every other suggest field keeps the old focus-pop. */
  input.addEventListener('focus', function () { render(typeToFilter ? 'bag' : undefined); });
  input.addEventListener('blur', function () {
    setTimeout(function () { box.className = 'suggest'; }, 160);
  });
}
/* ================= ho (2026-11-21, Q249 + Q248, Tanner) =================
   TYPE-TO-FILTER COMBO FIELDS. Every list field on the set form is now a
   text field with a suggestion box, on the pattern he ruled: tap the field
   and the FULL list opens with the keyboard up; typing filters the list
   live; tapping a row fills the field; text that matches nothing simply
   IS the entry, and is remembered for next time (the Q55 custom-option
   memory, now keyed by the field). The old <select> + "Other…" + "What is
   it?" two-step is gone for these fields — typing replaced it. Notes are
   the one exception (Q249): they stay plain writing boxes.
   A pick dispatches a bubbling 'change', so every existing cascade that
   listened for a select's change (maker → types → details, foundation →
   variations, spring → sizes) fires exactly as before. The field also
   carries the Q248 clear × (the Q236 .clear-wrap/.input-clear pattern).
   getOptions() returns strings or {v, label} pairs and is read live on
   every render, so cascades never need the box rebuilt. */
var comboBaseCache = {}; /* id -> last option values, for selVal's remember-guard */
var pendingCombos = [];  /* selHtml-built fields awaiting attachment */
function comboAttach(inputId, boxId, getOptions, opts) {
  var input = $(inputId), box = $(boxId);
  if (!input || !box) return;
  opts = opts || {};
  if (!input._comboWired) {
    input._comboWired = true;
    var wrap = document.createElement('span');
    wrap.className = 'clear-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    var clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'input-clear';
    clearBtn.setAttribute('aria-label', 'Clear');
    clearBtn.textContent = '×';
    clearBtn.hidden = !input.value;
    wrap.appendChild(clearBtn);
    clearBtn.onclick = function (e) {
      if (e && e.stopPropagation) e.stopPropagation();
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
    };
    input._comboClear = clearBtn;
    input.addEventListener('input', function () { clearBtn.hidden = !input.value; renderCombo(false); });
    input.addEventListener('focus', function () { renderCombo(true); });
    input.addEventListener('blur', function () {
      setTimeout(function () { box.className = 'suggest'; }, 160);
    });
  }
  function renderCombo(showAll) {
    var raw = getOptions() || [];
    var values = raw.map(function (o) { return (o && typeof o === 'object') ? o.v : o; });
    comboBaseCache[inputId] = values;
    var q = showAll ? '' : input.value.trim().toLowerCase();
    var rows = raw.filter(function (o) {
      var lbl = ((o && typeof o === 'object') ? o.label : o) || '';
      var v = (o && typeof o === 'object') ? o.v : o;
      return !q || lbl.toLowerCase().indexOf(q) !== -1 || String(v).toLowerCase().indexOf(q) !== -1;
    });
    var html = '';
    if (opts.noneLabel && (!q || opts.noneLabel.toLowerCase().indexOf(q) !== -1)) {
      html += '<div class="suggest-row"><button type="button" class="suggest-item" data-v="">' + esc(opts.noneLabel) + '</button></div>';
    }
    html += rows.map(function (o) {
      var v = (o && typeof o === 'object') ? o.v : o;
      var lbl = (o && typeof o === 'object') ? o.label : o;
      return '<div class="suggest-row"><button type="button" class="suggest-item" data-v="' + esc(v) + '">' + esc(lbl) + '</button></div>';
    }).join('');
    if (!html) { box.className = 'suggest'; box.innerHTML = ''; return; }
    box.innerHTML = html;
    box.className = 'suggest show';
    box.querySelectorAll('.suggest-item').forEach(function (b) {
      b.onclick = function () {
        input.value = this.getAttribute('data-v');
        if (input._comboClear) input._comboClear.hidden = !input.value;
        box.className = 'suggest'; box.innerHTML = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        if (opts.onPick) opts.onPick(input.value);
      };
    });
    comboReveal(input, box); /* hr (Q273) */
  }
  input._comboRender = renderCombo;
}
/* selHtml-built combo fields attach once their HTML lands in the DOM. */
function drainCombos() {
  var list = pendingCombos; pendingCombos = [];
  list.forEach(function (c) {
    comboAttach(c.id, c.id + '-suggest', function () { return c.options; }, { noneLabel: c.noneLabel });
  });
}
/* Q248: the clear × for a plain typed field that has none (Set Name model). */
function ensureClearInput(input) {
  if (!input || input.closest('.clear-wrap') || input._clearWired) return;
  input._clearWired = true;
  var wrap = document.createElement('span');
  wrap.className = 'clear-wrap';
  input.parentNode.insertBefore(wrap, input);
  wrap.appendChild(input);
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'input-clear';
  btn.setAttribute('aria-label', 'Clear');
  btn.textContent = '×';
  btn.hidden = !input.value;
  wrap.appendChild(btn);
  btn.onclick = function (e) {
    if (e && e.stopPropagation) e.stopPropagation();
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
  };
  input.addEventListener('input', function () { btn.hidden = !input.value; });
}

/* ---- gm (2026-11-17, Tanner): Set Name clear × + live suggestions ----
   The gl build made the Set Name field plain; Tanner reversed that on his
   phone: renaming a set meant backspacing the whole name by hand, and the
   old name list was missed. So: (1) a clear × inside the field's right
   edge — the same Q236 .clear-wrap/.input-clear pattern the manual-entry
   fields use — shown only while the field has text; tapping it empties
   the field and keeps focus there. (2) While typing, the dormant
   #sf-name-suggest box lists the ACTIVE LINE's existing set names that
   contain the typed text, in natural alpha-numerical order (Muskrat 2
   before Muskrat 10). No match = the box hides completely and typing is
   free — nothing blocks, and the duplicate-name check at save is
   unchanged. Tapping a suggestion fills the field with that exact name
   and closes the box. Existing set names only: no None row, no sponsors. */
var setNameClearBtn = null;
function updateSetNameClear() {
  var inp = $('sf-name');
  if (setNameClearBtn) setNameClearBtn.hidden = !(inp && inp.value);
}
function hideSetNameSuggest() {
  var box = $('sf-name-suggest');
  if (box) { box.className = 'suggest'; box.innerHTML = ''; }
}
function renderSetNameSuggest() {
  var inp = $('sf-name'), box = $('sf-name-suggest');
  if (!inp || !box) return;
  if (inp._justFilled) { inp._justFilled = false; hideSetNameSuggest(); return; }
  var q = inp.value.trim().toLowerCase();
  if (!q) { hideSetNameSuggest(); return; }
  var seen = {}, names = [];
  activeSets().forEach(function (s) {
    var nm = String(s.name || '').trim();
    if (!nm) return;
    var k = nm.toLowerCase();
    if (seen[k] || k.indexOf(q) === -1) return;
    seen[k] = true; names.push(nm);
  });
  names.sort(function (a, b) { return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }); });
  if (!names.length) { hideSetNameSuggest(); return; }
  box.innerHTML = names.map(function (n) {
    return '<button type="button" class="suggest-item" data-v="' + esc(n) + '">' + esc(n) + '</button>';
  }).join('');
  box.className = 'suggest show';
  var btns = box.querySelectorAll('.suggest-item');
  for (var i = 0; i < btns.length; i++) {
    btns[i].onclick = function () {
      inp.value = this.getAttribute('data-v');
      hideSetNameSuggest();
      updateSetNameClear();
      inp.focus();
      /* Set AFTER focus() — the same order attachSuggest uses: refocusing
         fires a focus render that would reopen the box, and the flag is
         what the input render below consumes to keep it shut. */
      inp._justFilled = true;
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    };
  }
  comboReveal(inp, box); /* hr (Q273) */
}
function wireSetNameField() {
  var inp = $('sf-name'), box = $('sf-name-suggest');
  if (!inp || !box || inp._setNameWired) return;
  inp._setNameWired = true;
  var wrap = document.createElement('span');
  wrap.className = 'clear-wrap';
  inp.parentNode.insertBefore(wrap, inp);
  wrap.appendChild(inp);
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'input-clear';
  btn.id = 'sf-name-clear';
  btn.setAttribute('aria-label', 'Clear set name');
  btn.textContent = '×';
  btn.hidden = !inp.value;
  wrap.appendChild(btn);
  setNameClearBtn = btn;
  btn.onclick = function (e) {
    if (e && e.stopPropagation) e.stopPropagation();
    inp.value = '';
    hideSetNameSuggest();
    updateSetNameClear();
    inp.focus();
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  };
  inp.addEventListener('input', renderSetNameSuggest);
  inp.addEventListener('input', updateSetNameClear);
  inp.addEventListener('focus', renderSetNameSuggest);
  inp.addEventListener('blur', function () { setTimeout(hideSetNameSuggest, 160); });
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
    /* ft: the product rows are type-to-filter — nothing pops until typing. */
    attachSuggest('sf-' + field + '-row-' + j, 'sf-' + field + '-row-' + j + '-suggest', field, true);
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
  'Snare': { snare: true, model: true }, /* Q239 (2026-11-07): snare sets get a Brand/model field so sponsor snares can appear as suggestion rows */
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
  /* ho (Q249): a combo field now, not a <select> — the trapper's
     remembered customs ride with the base options (mergeCustomOptions),
     typing filters them, and novel typed text is the entry (remembered
     at read time by selVal). The Other… hatch is gone: typing is the
     hatch. Attachment happens in drainCombos() once the HTML lands. */
  var opts = mergeCustomOptions(id, options).filter(function (o) { return o !== OTHER_VALUE && o !== 'Other'; });
  pendingCombos.push({ id: id, options: opts, noneLabel: '—' });
  return '<label class="field" for="' + id + '">' + label + '</label>' +
    '<input type="text" id="' + id + '" autocomplete="off" value="' + esc(val || '') + '">' +
    '<div class="suggest" id="' + id + '-suggest"></div>';
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
  /* ho (Q249): the maker field is a combo input now — its options are
     computed live by makerComboOptions() at render time, so there is no
     option list to rebuild on form open. This stub stays for its caller. */
  return;
}
function makerComboOptions() {
  var out = [{ v: 'None', label: 'None' }, { v: MIXED_MAKER_LABEL, label: MIXED_MAKER_LABEL }];
  var seen = { 'none': 1 };
  seen[MIXED_MAKER_LABEL.toLowerCase()] = 1;
  MAKER_ORDER.forEach(function (m) {
    out.push({ v: m, label: m + (TRAP_MAKERS[m].legacy ? ' (legacy)' : '') });
    seen[m.toLowerCase()] = 1;
  });
  customOptionsFor('sf-maker').forEach(function (t) {
    if (!seen[t.toLowerCase()]) { out.push({ v: t, label: t }); seen[t.toLowerCase()] = 1; }
  });
  return out;
}
/* Type options for the picked maker. keepKey re-selects a picker type key
   when it exists in the new list. */
function renderTrapTypeOptions(maker, keepKey) {
  var sel = $('sf-type');
  if (maker === MIXED_MAKER_LABEL) maker = '__mixed'; /* ho: combo holds the label */
  var entry = maker && TRAP_MAKERS[maker];
  var keys = entry ? Object.keys(entry.types) : ALL_TRAP_TYPES.slice();
  /* ho (Q249): no "Other" hatch in the combo list (Q57-B's escape hatch
     is the typing itself now). The trapper's custom types ride along so
     a remembered value reselects (Q55). The list is stashed for the
     combo's live getOptions; the field's text is set, not rebuilt. */
  keys = keys.filter(function (k) { return k !== 'Other'; });
  var seenTypes = {};
  keys.forEach(function (k) { seenTypes[k.toLowerCase()] = 1; });
  customOptionsFor('sf-type').forEach(function (t) {
    if (!seenTypes[t.toLowerCase()]) { keys.push(t); seenTypes[t.toLowerCase()] = 1; }
  });
  window._sfTypeOpts = keys;
  var cur = sel.value;
  if (keepKey && keys.indexOf(keepKey) >= 0) sel.value = keepKey;
  else if (keys.indexOf(cur) >= 0) sel.value = cur;
  else sel.value = '';
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
  /* ho (Q249): the maker-path model is a combo input now — its text is
     the value, resolved (and remembered when novel) through selVal. */
  if (modelSel) trapModel = selVal('sf-trapmodel-select');
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
  /* Q204 (2026-10-19): Tanner — Modifications folds up like the other
     sections. Starts folded unless the set carries mods (Q99 rule: folded
     when empty, open when there's something in it). */
  var hasContent = saved.length > 0 || (v.panSize && v.panSize !== 'Stock') || !!v.jawShape || !!v.jawClose || !!(forceCheck && forceCheck.length);
  var h = '<div class="setsec" id="setform-modssec"' + (hasContent ? ' data-has-content="1"' : '') + '>' +
    '<button type="button" class="setsec-head" id="setform-modssec-head" data-sec="setform-modssec" aria-expanded="false"><span>Modifications <span class="dim">— optional</span></span><span class="setsec-chev" aria-hidden="true">›</span></button>' +
    '<div class="setsec-body" id="setform-modssec-body" hidden>' +
    '<div class="mods-hint">Work you did after buying the trap. Factory options are already in the model name above.</div>';
  if (t === 'Foothold') {
    /* ho (Q249): pan size is a combo field like the rest (was an
       Other-capable dropdown under Q55; typing is the hatch now). */
    var pv = v.panSize || 'Stock';
    h += selHtml('sf-pansize', 'Pan size', PAN_SIZES, pv);
    /* Q102 (2026-10-01): Tanner — round jaw vs square jaw, footholds only. */
    h += selHtml('sf-jawshape', 'Jaw shape', ['Round jaw', 'Square jaw'], v.jawShape || '');
    /* Tanner 2026-10-01 — jaw closure: offset vs closed, footholds only. */
    h += selHtml('sf-jawclose', 'Jaw closure', ['Offset', 'Closed'], v.jawClose || '');
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
    '<button type="button" class="btn-ghost btn-small" id="sf-modadd">Add</button></div></div></div>';
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
  if (maker === MIXED_MAKER_LABEL) maker = '__mixed'; /* ho: the combo holds the label; readers key on the sentinel */
  var pickerType = $('sf-type').value;
  var rt = resolvedTrapType();
  var v = saved || trapDetailValues();
  var host = $('trapdetail-fields');
  var entry = maker && TRAP_MAKERS[maker];
  var models = (entry && entry.types[pickerType]) || null;
  var h = '';
  if (models) {
    /* ho (Q249): the maker-filtered size/model list is a combo field —
       the saved model, or the list's first model as the select used to
       preselect; anything typed past the list is the entry. */
    var mv = v.trapModel || '';
    pendingCombos.push({ id: 'sf-trapmodel-select', options: mergeCustomOptions('sf-trapmodel-select', models) });
    h += '<label class="field" for="sf-trapmodel-select">Size / model</label>' +
      '<input type="text" id="sf-trapmodel-select" autocomplete="off" value="' + esc(mv || models[0]) + '">' +
      '<div class="suggest" id="sf-trapmodel-select-suggest"></div>';
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
  /* Q204: the fold survives re-renders within THIS form-open only. A fresh
     load (saved values, or a new open of the form) decides from content
     alone — otherwise a modded set's open section would leak into the next
     set's form. */
  var modsFresh = !!saved || modsRenderSeq !== setFormOpenSeq;
  var modsWasOpen = false;
  if (!modsFresh) { var mb = $('setform-modssec-body'); modsWasOpen = !!(mb && !mb.hidden); }
  modsRenderSeq = setFormOpenSeq;
  host.innerHTML = h;
  drainCombos(); /* ho (Q249): wire the combo fields this render built */
  /* Q12: custom model text learns from use */
  if ($('sf-trapmodel')) attachSuggest('sf-trapmodel', 'sf-trapmodel-suggest', 'trapmodel');
  var springEl = $('sf-trapspring');
  if (springEl) springEl.onchange = function () { renderTrapDetailFields(); };
  bindModAdd();
  /* Q204: wire the Modifications fold + restore its open state — open if it
     was open mid-edit, or the set carries mods; folded otherwise. */
  var modsHead = $('setform-modssec-head');
  if (modsHead) modsHead.onclick = function () { toggleSettingsSection('setform-modssec'); };
  var modsSec = $('setform-modssec');
  setSectionOpen('setform-modssec', !!(modsWasOpen || (forceCheck && forceCheck.length) || (modsSec && modsSec.getAttribute('data-has-content'))));
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
  else if (t === 'Snare') { s.trapSpring = s.trapSize = ''; } /* Q239: snare keeps its Brand/model — no longer wiped here */
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
  /* hn (2026-11-21, Tanner): drop the Leaflet name-and-flag prefix from the
     attribution bar. The imagery credits themselves (Mapbox / OpenStreetMap
     / Maxar / USGS) are contractual and stay, legible — see styles.css. */
  if (map.attributionControl) map.attributionControl.setPrefix(false);
  /* Q10 / gy (2026-11-18): Mapbox Satellite became the default aerial.
     The provider comparison (research_notes/map-provider-comparison-
     20261118) found it the freshest deep-zoom rural imagery feeding
     Leaflet, and its terms allow the app's on-device tile cache capped
     at 30 days. The token is a PUBLIC token, URL-restricted to the
     app's own origins; it is meant to ship here.
     hg (2026-11-19): the Mapbox layers carry referrerPolicy
     'unsafe-url' (Leaflet 1.9.4's TileLayer option — createTile
     assigns it to each tile <img>) and index.html sets the same
     policy document-wide. hf did the referrer work from sw.js with a
     worker-constructed fetch instead; WebKit refused to play along
     and the map stayed black on the phone — see the note above
     fetchTile in sw.js. hh took the worker out of the chain entirely
     (Mapbox tiles bypass it), and hi convicted the true cause at the
     wire: WebKit sends only the bare origin as Referer, and the
     token's restriction now admits that origin (console change,
     2026-11-19) — the map paints on the phone.
     hi amendment (2026-11-19, Tanner — "build Mapbox into the app
     and take ESRI completely out of the app"): the stack below is
     the whole story now. Esri is GONE — World_Street_Map,
     World_Imagery, and the Reference roads/labels overlays that
     rode over every aerial are all removed. satellite-streets-v12
     bakes its roads and labels into the imagery, so no overlay is
     needed anywhere; streets-v12 takes the Street seat and
     outdoors-v12 the Topo seat, all on the same token, all with
     the same handling (real tiles to z19, Leaflet upscales to the
     z22 map cap; tiles bypass sw.js per hh). NAIP stays as the one
     non-Mapbox aerial, now standing bare. */
  var MAPBOX_TOKEN = 'pk.eyJ1Ijoib3Bvc3N1bWZvb3RhcHAiLCJhIjoiY213bXhmaThzMDRndjMwcGxmOXpsNjUwOCJ9.v0VzgWCuGzscCePZmw2AjQ';
  var mapboxSat = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}?access_token=' + MAPBOX_TOKEN,
    { maxZoom: 22, maxNativeZoom: 19, referrerPolicy: 'unsafe-url', attribution: 'Imagery © Mapbox © OpenStreetMap © Maxar' });
  /* gy: second aerial — USDA NAIP (public domain), served as standard
     tiles by the USGS National Map's USGSImageryOnly cache. (USDA's own
     FPAC ImageServer exposes no XYZ tile cache — its metadata calls it a
     test service — and the APFO endpoint does not answer.) Native NAIP
     detail ends near z18; past that Leaflet upscales. */
  var naip = L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}',
    { maxZoom: 22, maxNativeZoom: 18, attribution: 'Imagery © USGS' });
  var mapboxStreet = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/256/{z}/{x}/{y}?access_token=' + MAPBOX_TOKEN,
    { maxZoom: 22, maxNativeZoom: 19, referrerPolicy: 'unsafe-url', attribution: '© Mapbox © OpenStreetMap' });
  var mapboxTopo = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/256/{z}/{x}/{y}?access_token=' + MAPBOX_TOKEN,
    { maxZoom: 22, maxNativeZoom: 19, referrerPolicy: 'unsafe-url', attribution: '© Mapbox © OpenStreetMap' });
  mapboxSat.addTo(map);
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
  /* gy (2026-11-18): Q10 lands — the cycle grows the two fallback aerials.
     Settled order then: Mapbox Satellite (default) → Esri Satellite →
     NAIP → Street → Topo.
     hi amendment (2026-11-19): Esri leaves the cycle with the rest of
     Esri, and the Street and Topo seats become Mapbox's. Settled order
     now: Mapbox Satellite (default) → NAIP → Mapbox Street → Mapbox
     Topo → back to Satellite. */
  var baseLayers = [
    { name: 'Mapbox Satellite', layer: mapboxSat, icon: '🛰️' },
    { name: 'NAIP', layer: naip, icon: '🛩️' },
    { name: 'Mapbox Street', layer: mapboxStreet, icon: '🗺️' },
    { name: 'Mapbox Topo', layer: mapboxTopo, icon: '⛰️' }
  ];
  var baseIdx = 0; /* mapboxSat is already on the map */
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
  if (window.Markers) Markers.attach(map);
  if (window.Tracking) Tracking.attach(map);

  map.on('click', function (e) {
    if (homePickMode && homeMapLive) {
      placeHomePin(e.latlng);
    } else if (dropPinMode) {
      startPlacePin(e.latlng);
    } else if (measureMode) {
      measureTap(e.latlng);
    } else if (window.Tracking && Tracking.mapTap(e)) {
      /* gt: while the route editor owns the map (Fix route's Draw, or
         standalone Draw a route), map taps are drawing taps — they
         never fall through to marker placement. */
    } else if (window.Markers) {
      Markers.onMapClick(e);
    }
  });
  map.on('zoomend', function () { refreshMarkers(); }); /* Q17: wind arrows are zoom-gated */
  refreshMarkers();
  /* Q188 (2026-10-18): reopen where you left off — the last map view wins
     on launch. Fresh installs (no saved view) keep the Q53 behavior:
     home ground, else the trapping state. No auto-GPS-locate on open. */
  if (!restoreLastView()) fitMapHome();
  map.on('moveend', function () {
    if (saveViewTimer) clearTimeout(saveViewTimer);
    saveViewTimer = setTimeout(saveLastView, 700);
  });
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
  /* gz: a set picked in selection mode wears the gold ring + check (the
     class rides the icon HTML, so refreshMarkers re-applies it on every
     re-render and Leaflet carries it through pan/zoom). */
  var sel = selMode && selIds[set.id];
  return L.divIcon({
    className: '',
    html: '<div class="pin ' + pinCls + (sel ? ' pin-sel' : '') + '">' + (sel ? '<span class="pin-check">✓</span>' : '') + windArrowHtml(set) + '</div>',
    iconSize: [30, 30], iconAnchor: [15, 15]
  });
}

function refreshMarkers() {
  if (!map || !markersLayer) return;
  /* Q207 (2026-10-20, Tanner): sync the status mirror from the saved Show
     model BEFORE painting. The mirror used to start all-on and only picked
     up his selections as a side effect of other calls, so a cold open
     painted every pin, then removed the unselected ones a beat later (his
     screenshot: "Show: Active, Pulled" with purple/orange/blue pins still
     standing). Reading the model here makes the first paint filtered. */
  showModel();
  markersLayer.clearLayers();
  activeSets().forEach(function (s) {
    if (!mapStatusFilter[normStatus(s.status)]) return;
    var m = L.marker([s.lat, s.lng], { icon: setIcon(s), title: s.name });
    /* B15: no opening set details mid-placement — finish the pin first. */
    m.on('click', function () { if (document.body.classList.contains('placing') || document.body.classList.contains('editor-lock') || measureMode) return; if (selMode) { selTapSet(s.id); return; } openSetOrStack(s.id); });
    m._setId = s.id;
    markersLayer.addLayer(m);
  });
  refreshPinWinds();
  renderBulkBar(); /* Q229: the bar counts the live prospect sets on this line */
}

/* fw (2026-11-15): one map command at a time, for real. The picking modes
   (set pin, marker/sign, measure, home pick) each lived in their own switch
   and never cancelled each other — a pin hint and a sign hint could stack,
   and a pin drag bar and a marker drag bar could stack (Tanner, 2026-11-15).
   Every mode entry runs cancelAllMapModes() first; `except` keeps the mode
   being entered from cancelling itself. */
function cancelAllMapModes(except) {
  /* gz: one map command at a time extends to set-selection mode — every
     editor (Fix route / Draw, via tracking.js) and every picking mode
     enters through here, so entering any of them ends selection mode. */
  if (selMode || bulkSelCtx) exitSelMode();
  if (except !== 'pin' && dropPinMode) setDropPinMode(false);
  if (except !== 'measure' && measureMode) setMeasureMode(false);
  if (except !== 'home' && homePickMode) cancelHomePick();
  cancelPlacePin();
  if (window.Markers) Markers.cancelAll();
  /* ho (2026-11-21, Q259, Tanner): the Mark sheet itself is part of the
     Mark tap-mode — another mode starting closes it, so its sheet never
     stacks over a live Measure/editor banner. Tracking is exempt by his
     ruling: nothing here touches the recorder. */
  if (except !== 'mark') {
    var ms = $('sheet-marker-add');
    if (ms && ms.classList.contains('show')) {
      ms.classList.remove('show');
      if (!document.querySelector('.sheet.show')) $('scrim').classList.remove('show');
    }
  }
}

function setDropPinMode(on) {
  dropPinMode = on;
  if (on) { cancelAllMapModes('pin'); } /* Q53/fw: one picking mode at a time */
  $('pin-hint').classList.toggle('show', on);
  $('btn-drop-pin').classList.toggle('active-mode', on);
  /* B15-fix: the placement lock starts the moment placement is ARMED, not
     after the pin drops. The drop-pin button stays live so an armed
     placement can still be cancelled. */
  setPlacingLock(on);
}

/* fg / Lefty note 3 (2026-11-14): map distance measurement. The ruler fab
   toggles measuring on — it stays on until tapped off (Tanner: toggled
   often on). Tap two points: gold dots, a gold line, and the distance
   (feet + yards under a mile, miles above). A third tap starts a new
   measurement. One picking mode at a time (Q53). */
var measureMode = false, measureA = null, measureB = null, measureLayer = null;
function setMeasureMode(on) {
  measureMode = on;
  if (on) { cancelAllMapModes('measure'); } /* Q53/fw: one picking mode at a time */
  if (!on) clearMeasure();
  var h = $('measure-hint'); if (h) h.classList.toggle('show', on);
  var b = $('btn-measure'); if (b) b.classList.toggle('active-mode', on);
  /* fx: the ruler is a picking mode too — it takes the same placement lock as
     pin/sign/home (Tanner: "Same with ruler"), so Show/Actions, the tab bar
     and the other map controls stay dead until it is toggled off. Runs last
     so the unlock calls inside cancelAllMapModes never win over an arm. */
  setPlacingLock(on);
}
function clearMeasure() {
  measureA = null; measureB = null;
  if (measureLayer && map) { try { map.removeLayer(measureLayer); } catch (e) { /* noop */ } }
  measureLayer = null;
}
function fmtMeasure(meters) {
  var ft = meters * 3.28084;
  if (ft < 5280) return Math.round(ft).toLocaleString('en-US') + ' ft · ' + Math.round(ft / 3).toLocaleString('en-US') + ' yd';
  return (ft / 5280).toFixed(2) + ' mi';
}
function measureTap(ll) {
  if (!map) return;
  if (measureA && measureB) clearMeasure();
  if (!measureA) {
    measureA = ll;
    if (!measureLayer) measureLayer = L.layerGroup().addTo(map);
    L.circleMarker(ll, { radius: 6, color: '#E7C945', weight: 2, fillColor: '#E7C945', fillOpacity: 1 }).addTo(measureLayer);
    return;
  }
  measureB = ll;
  L.circleMarker(ll, { radius: 6, color: '#E7C945', weight: 2, fillColor: '#E7C945', fillOpacity: 1 }).addTo(measureLayer);
  var line = L.polyline([measureA, measureB], { color: '#E7C945', weight: 3 }).addTo(measureLayer);
  line.bindTooltip(fmtMeasure(map.distance(measureA, measureB)), { permanent: true, direction: 'center', className: 'measure-label', interactive: false }).openTooltip();
}

/* Draggable placement pin: GPS gets you close, your finger dials it in. */
var placeMarker = null;
/* B15: pin placement locks the rest of the app until the pin is confirmed or
   cancelled — you finish this decision before doing anything else. */
function setPlacingLock(on) {
  document.body.classList.toggle('placing', !!on);
}
function placeIcon() {
  /* Q217 (2026-10-27): the signature drag pin is now Lydia's opossum-track
     pin, the delivered SVG used exactly as-is. The artwork sits centered in
     the SVG's square canvas (content bbox measured at x 49.9%, tip y 72.2%),
     so the anchor compensates in placement math only — file untouched. */
  return L.icon({
    iconUrl: 'assets/pin-track-ol.png',
    iconSize: [110, 110], iconAnchor: [55, 81]
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
/* Q188: persist + restore the last map view. */
var saveViewTimer = null;
function saveLastView() {
  if (!map || !Store.data) return;
  try {
    var c = map.getCenter();
    Store.data.lastView = { lat: Math.round(c.lat * 1e5) / 1e5, lng: Math.round(c.lng * 1e5) / 1e5, zoom: map.getZoom() };
    Store.save();
  } catch (e) { /* a half-built map must never break saving */ }
}
function restoreLastView() {
  var v = Store.data && Store.data.lastView;
  if (!v || !isFinite(+v.lat) || !isFinite(+v.lng)) return false;
  map.invalidateSize();
  map.setView([+v.lat, +v.lng], isFinite(+v.zoom) ? +v.zoom : HOME_ZOOM);
  return true;
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
  cancelAllMapModes('home'); /* fw: one picking mode at a time */
  /* ho (2026-11-21, Q266, Tanner): follow stands down while the picker
     owns the map — its guard was dragging the map back to his physical
     position within seconds of a ZIP/city jump, so the jump never held.
     The established jump doctrine (Q246): follow pauses and stays paused
     until the user taps the crosshair again. */
  pauseFollow();
  homePickMode = true; homeMapLive = true;
  document.body.classList.add('home-picking'); /* ho (Q265): map chrome steps back */
  /* Tanner 2026-10-01: no A/B choice — the GPS button duplicated the previous
     screen. Straight to pin drop: tap the map, drag the pin, tap OK. */
  $('home-bar').classList.add('show');
  $('home-bar-prompt').textContent = 'Tap the map to drop your home pin, then drag it onto the exact spot.';
  $('btn-home-ok').hidden = true;
  var jr = $('home-jump-row'); if (jr) jr.style.display = ''; /* ho (Q265): the jump row returns for a fresh pick */
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
  document.body.classList.remove('home-picking'); /* ho (Q265) */
  if (homeMarker && map) { try { map.removeLayer(homeMarker); } catch (e) {} homeMarker = null; }
  var bar = $('home-bar'); if (bar) bar.classList.remove('show');
  setPlacingLock(false);
}
/* Tanner 2026-10-07: type a ZIP in the home picker and the map jumps there —
   then drag the house to the exact spot as usual. The ZIP table is bundled
   (js/zipdb.js), so this works offline with zero tracking. Shows up everywhere
   the picker does: first-run onboarding, Settings, and the mileage Set home. */
function homeZipJump() {
  var inp = $('home-zip');
  var z = inp ? inp.value.replace(/\D/g, '').slice(0, 5) : '';
  if (z.length < 5) { toast('Type a 5-digit ZIP.'); return; }
  var ll = (typeof zipLookup === 'function') ? zipLookup(z) : null;
  if (!ll) { toast('That ZIP is not on the list — drag the map instead.'); return; }
  if (map) map.setView([ll.lat, ll.lng], Math.min(map.getZoom(), 11));
  $('home-bar-prompt').textContent = 'Jumped to ' + z + ' — tap the map to drop your home pin, then drag it onto the exact spot.';
  toast('Jumped to ZIP ' + z + '.');
}
/* Q186 (2026-10-18): the home picker's third way in — type a US city.
   Matches come from the bundled on-device city list (js/citydb.js,
   GeoNames), largest first, shown with their state. Fully offline. */
function cityMatches(q) {
  q = (q || '').trim().toLowerCase();
  if (q.length < 2 || typeof CITYDB === 'undefined') return [];
  /* Rank: exact name first, then starts-with, then contains. Within a
     tier, the user's own state comes first, then largest population
     (CITYDB is pre-sorted by population) — a trapper typing "jefferson"
     in Iowa means Jefferson, Iowa, not Jefferson City. */
  var home = ((Store.data && Store.data.state) || '').toUpperCase();
  var exact = [], starts = [], contains = [];
  for (var i = 0; i < CITYDB.length; i++) {
    var c = CITYDB[i], n = c[0].toLowerCase();
    if (n === q) exact.push(c);
    else if (n.indexOf(q) === 0) starts.push(c);
    else if (n.indexOf(q) > 0) contains.push(c);
  }
  function stateFirst(arr) {
    var a = [], b = [];
    arr.forEach(function (c) { (c[1] === home ? a : b).push(c); });
    return a.concat(b);
  }
  return stateFirst(exact).concat(stateFirst(starts), stateFirst(contains)).slice(0, 6);
}
function renderCityMatches() {
  var inp = $('home-city'), host = $('home-city-matches');
  if (!inp || !host) return;
  var ms = cityMatches(inp.value);
  if (!ms.length) { host.hidden = true; host.innerHTML = ''; return; }
  host.innerHTML = ms.map(function (c, i) {
    return '<button type="button" class="city-match" data-ci="' + i + '">' + esc(c[0]) + ', ' + esc(c[1]) + '</button>';
  }).join('');
  host.hidden = false;
  var btns = host.querySelectorAll('.city-match');
  for (var i = 0; i < btns.length; i++) {
    btns[i].onclick = (function (c) {
      return function () { homeCityJump(c); };
    })(ms[i]);
  }
}
function homeCityJump(c) {
  if (!c || !map) return;
  map.setView([c[2], c[3]], Math.min(Math.max(map.getZoom(), 11), 12));
  var host = $('home-city-matches'); if (host) { host.hidden = true; host.innerHTML = ''; }
  var inp = $('home-city'); if (inp) inp.value = c[0] + ', ' + c[1];
  $('home-bar-prompt').textContent = 'Jumped to ' + c[0] + ', ' + c[1] + ' — tap the map to drop your home pin, then drag it onto the exact spot.';
  toast('Jumped to ' + c[0] + ', ' + c[1] + '.');
}
function placeHomePin(latlng) {
  if (!map) return;
  if (homeMarker) { try { map.removeLayer(homeMarker); } catch (e) {} }
  homeMarker = L.marker(latlng, { draggable: true, icon: homeIcon() }).addTo(map);
  map.panTo(latlng);
  $('btn-home-ok').hidden = false;
  var jr2 = $('home-jump-row'); if (jr2) jr2.style.display = 'none'; /* ho (Q265): the jump row's work is done once the pin is down */
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
var followGuardTimer = null;
/* Q233 (2026-11-06fm): one-shot tap correction — a tap centers on lastFix at
   once, then the first converged fix re-centers if the tap-time fix was off.
   Armed by centerOnFix; disarmed by firing, by a drag-pause, by stop, or
   after 60 s. */
var tapCorrectArmed = false, tapCenter = null, tapCorrectTimer = null;

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
  disarmTapCorrection(); /* Q233: a drag cancels the correction — his pause rule stands */
  var b = $('btn-locate'); if (b) b.classList.add('paused-mode');
  /* BQ3: silent pause — no toast. The button's paused state shows it. */
}

/* Only called on location permission denial — there is no manual off. */
function stopFollow(silent) {
  disarmFollowWatchdog();
  stopFollowGuard(); /* Q233 */
  disarmTapCorrection(); /* Q233 */
  stopLocateWatch();
  locateState = 'idle';
  var b = $('btn-locate'); if (b) b.classList.remove('active-mode', 'paused-mode');
  if (lastFix) lastFix.at = 0; /* next tap takes a fresh fix, not follow */
  if (!silent) toast('Follow off.');
}

/* Q233: one definition of "the dot is far enough off-center that the map
   should re-center on it" — shared by the follow watch and the periodic
   guard, so the two can never drift apart. */
function dotPastDeadband(lat, lng) {
  if (!map || typeof lat !== 'number' || typeof lng !== 'number') return false;
  var pt = map.latLngToContainerPoint([lat, lng]);
  var size = map.getSize();
  return Math.abs(pt.x - size.x / 2) > size.x * 0.15 ||
         Math.abs(pt.y - size.y / 2) > size.y * 0.15;
}
function panToFixIfOffCenter(lat, lng) {
  if (dotPastDeadband(lat, lng)) map.panTo([lat, lng], { animate: false });
}

/* Q234 (2026-11-07): the follow watch's own re-pan is the first line, but a watch hiccup
   must not strand the map off-center — while following, re-check every few
   seconds and pan to the last fix whenever the dot sits past the deadband.
   Paused (dragged) never pans; the guard only runs while following.
   Q234: never pan to a STALE fix — a lastFix older than 60 s is untrusted
   (the watchdog restarts the watch to fetch a fresh one); panning to it
   would actively hold the map on a wrong spot. */
function followGuardTick() {
  if (locateState !== 'following' || !map || !lastFix || lastFix.lat == null) return;
  if (Date.now() - (lastFix.at || 0) > 60000) return; /* Q234: stale fix — do not trust it */
  panToFixIfOffCenter(lastFix.lat, lastFix.lng);
}
function startFollowGuard() {
  stopFollowGuard();
  followGuardTimer = setInterval(followGuardTick, 4000);
}
function stopFollowGuard() {
  if (followGuardTimer) { clearInterval(followGuardTimer); followGuardTimer = null; }
}

/* Q233: tap correction — arm on every tap-centering, fire once on the first
   converged fix that lands well away from the tap center. */
function armTapCorrection() {
  disarmTapCorrection();
  if (!lastFix || lastFix.lat == null) return;
  tapCenter = { lat: lastFix.lat, lng: lastFix.lng };
  tapCorrectArmed = true;
  tapCorrectTimer = setTimeout(disarmTapCorrection, 60000);
}
function disarmTapCorrection() {
  tapCorrectArmed = false; tapCenter = null;
  if (tapCorrectTimer) { clearTimeout(tapCorrectTimer); tapCorrectTimer = null; }
}

/* Q234 (2026-11-07): the tap trusts lastFix, and the Q233 tap correction
   only fires on a CONVERGED watch fix — if the watch never converges, the
   map can sit on a stale/displaced tap center while the guard (which also
   trusts lastFix) holds it there. So every tap also fires a one-shot fresh
   read that depends on neither the watch nor convergence: a fresh fix
   landing >12 m from the tap center re-centers the map once. The one-shot
   supersedes the watch-based correction when it lands. */
function verifyTapCenter() {
  if (!('geolocation' in navigator)) return;
  var tc = tapCenter ? { lat: tapCenter.lat, lng: tapCenter.lng } : (lastFix ? { lat: lastFix.lat, lng: lastFix.lng } : null);
  if (!tc) return;
  try {
    navigator.geolocation.getCurrentPosition(function (pos) {
      var c = pos.coords || {};
      if (typeof c.latitude !== 'number' || typeof c.longitude !== 'number') return;
      var ageMs = Date.now() - (pos.timestamp || 0);
      if (ageMs > 30000 || ageMs < 0) return; /* stale cached fix — ignore */
      var acc = (typeof c.accuracy === 'number' && isFinite(c.accuracy)) ? Math.round(c.accuracy) : 9999;
      if (acc > 25) return; /* too coarse to trust over the tap center */
      if (locateState !== 'following') return; /* user paused/stopped since the tap */
      if (haversineMi(tc.lat, tc.lng, c.latitude, c.longitude) * 1609.34 > 12) {
        drawFix({ lat: c.latitude, lng: c.longitude, acc: acc }, false);
        if (map) { map.invalidateSize(); map.panTo([c.latitude, c.longitude], { animate: false }); }
      }
      disarmTapCorrection(); /* the one-shot supersedes the watch-based correction */
    }, function () { /* one-shot failed — the watch + guard still cover it */ },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 });
  } catch (e) { /* geolocation unavailable — watch + guard still cover it */ }
}

/* Enter follow mode: one tap on the crosshair gets you here, and follow
   stays on from this point. */
function enterFollow() {
  hookFollowDrag();
  setLocateSearching(false);
  locateState = 'following';
  var b = $('btn-locate');
  if (b) { b.classList.add('active-mode'); b.classList.remove('paused-mode'); }
  followLastPan = 0; staleDropCount = 0;
  lastFollowFixAt = Date.now();
  startFollowWatch();
  armFollowWatchdog();
  startFollowGuard(); /* Q233 */
  /* Q234: re-measure before panning — a stale cached container size (B13)
     lands the pan off-center. */
  if (map && lastFix && lastFix.lat != null) { map.invalidateSize(); map.panTo([lastFix.lat, lastFix.lng], { animate: false }); }
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
      /* BQ2/gs/gx: one crosshair tap always ends at the working zoom
         (19) — no accuracy-based wide zoom that forces a second tap.
         History: the landing was 19 under the old BQ2 rule; gs
         (2026-11-18) dropped it to 17 on Tanner's driving field report
         (one tap left him staring at smeared pixels with the accuracy
         circle filling the screen; Esri rural imagery is only sharp to
         ~17). gx (2026-11-18, Tanner's verdict after living with 17 on
         his own ground): restore 19. He can still pinch tighter or
         wider by hand (map maxZoom unchanged). */
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
      if (info && info.county) noteCountyBannerAt(fix.lat, fix.lng); /* Q225 */
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
  var prevFix = lastFix; /* fix before this one — the Q215 convergence comparison */
  drawFix({ lat: c.latitude, lng: c.longitude, acc: acc }, false);
  maybeRetryCountyBanner(c.latitude, c.longitude); /* Q96: heal a missed county lookup */
  maybeMoveCountyBanner(c.latitude, c.longitude); /* Q225: correct the banner after a county-line crossing */
  /* Q233: tap correction — if the tap centered on a stale fix, the first
     converged fix (Q215 rule: fresh ≤12 m claimed within 12 m of the
     previous fresh ≤25 m claimed) landing more than 12 m from the tap
     center re-centers the map once, while still following. */
  if (tapCorrectArmed && locateState === 'following' && tapCenter && prevFix &&
      typeof prevFix.acc === 'number' && prevFix.acc <= 25 && acc <= 12 &&
      haversineMi(prevFix.lat, prevFix.lng, c.latitude, c.longitude) * 1609.34 <= 12) {
    if (haversineMi(tapCenter.lat, tapCenter.lng, c.latitude, c.longitude) * 1609.34 > 12) {
      map.panTo([c.latitude, c.longitude], { animate: false });
    }
    disarmTapCorrection();
  }
  /* Q215: 15% deadband (was 28% — at zoom 19 the old band let the view
     sit ~40 m off the trapper before it bothered to recenter). */
  if (map && locateState === 'following') panToFixIfOffCenter(c.latitude, c.longitude);
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
/* Q187 (2026-10-18): acquiring must be VISIBLE — a pulsing crosshair and a
   plain hint line — and every exit (fix, cancel, denial, timeout) clears it. */
function setLocateSearching(on) {
  var b = $('btn-locate'); if (b) b.classList.toggle('searching-mode', !!on);
  var h = $('locate-hint'); if (h) h.classList.toggle('show', !!on);
}
function startAcquire() {
  locateState = 'acquiring';
  setLocateSearching(true);
  var best = null, finished = false, prevFix = null, acqTrail = []; /* Q233: trail for motion convergence */
  /* Q70: acquire runs silent — the dot moves, no progress chatter.
     Denial and no-fix still speak up below. */
  hookFollowDrag();

  /* Q215 (2026-10-24): a cold iPhone radio's first fixes can sit displaced
     (Tanner: the send landed ~50 yards west of his ditch) while CLAIMING
     good accuracy — a single optimistic fix must not end the acquire. The
     stream has to CONVERGE: a fresh fix (≤12 m claimed) landing within
     12 m of the previous fresh fix (≤25 m claimed). Only then is the
     position settled enough to send him to it. */
  function fixDistM(a, b) {
    var dx = (a.lng - b.lng) * 111320 * Math.cos(a.lat * Math.PI / 180);
    var dy = (a.lat - b.lat) * 110540;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function consider(pos) {
    var c = pos.coords || {};
    if (typeof c.latitude !== 'number' || typeof c.longitude !== 'number') return false;
    var ageMs = Date.now() - (pos.timestamp || 0);
    if (ageMs > 30000 || ageMs < 0) return false; /* stale cached fix — ignore it */
    var acc = (typeof c.accuracy === 'number' && isFinite(c.accuracy)) ? Math.round(c.accuracy) : 9999;
    var fx = { lat: c.latitude, lng: c.longitude, acc: acc };
    if (!best || acc < best.acc) {
      best = fx;
      drawFix(best, false);
    }
    var converged = !!(prevFix && prevFix.acc <= 25 && acc <= 12 && fixDistM(prevFix, fx) <= 12);
    prevFix = fx;
    /* Q233: a moving phone can never meet the stationary convergence rule —
       at road speed consecutive fixes land ~20 m apart, so the acquire would
       run the full 45 s while driving. Three fresh fixes in a straight line
       at road-step distances mean the radio is live and the phone is moving:
       take the latest fix and go. */
    if (!converged) {
      acqTrail.push(fx);
      if (acqTrail.length > 3) acqTrail.shift();
      if (acqTrail.length === 3) {
        var t0 = acqTrail[0], t1 = acqTrail[1], t2 = acqTrail[2];
        var s1 = haversineMi(t0.lat, t0.lng, t1.lat, t1.lng) * 1609.34;
        var s2 = haversineMi(t1.lat, t1.lng, t2.lat, t2.lng) * 1609.34;
        if (t0.acc <= 25 && t1.acc <= 25 && t2.acc <= 25 && s1 >= 5 && s1 <= 80 && s2 >= 5 && s2 <= 80) {
          var turn = Math.abs(((bearingDeg(t1.lat, t1.lng, t2.lat, t2.lng) - bearingDeg(t0.lat, t0.lng, t1.lat, t1.lng) + 540) % 360) - 180);
          if (turn < 60) { converged = true; best = fx; }
        }
      }
    }
    return converged;
  }

  function finish() {
    if (finished) return;
    finished = true;
    stopLocateWatch();
    setLocateSearching(false);
    if (!best) { locateState = 'idle'; toast('No fresh GPS fix — move into open sky and try again.'); return; }
    drawFix(best, true);
    enterFollow(); /* one tap = acquire + follow, automatically */
  }

  locateTimer = setTimeout(finish, 45000);
  try {
    locateWatch = navigator.geolocation.watchPosition(function (pos) {
      if (consider(pos)) finish(); /* Q215: stream converged — send him */
    }, function (err) {
      /* transient iOS timeouts while the radio warms up are normal — keep
       * waiting; only a permission denial ends the attempt early. */
      if (err && err.code === 1 && !best && !finished) {
        finished = true; stopLocateWatch(); locateState = 'idle'; setLocateSearching(false);
        toast('Location permission denied. Allow it in Settings and try again.');
      }
    }, { enableHighAccuracy: true, timeout: 45000, maximumAge: 0 });
  } catch (e) { finish(); }
}

/* Crosshair tap centers on the fix AND zooms in when the view is wide —
   an explicit locate tap should put you on yourself, not just pan. */
/* B22: every crosshair tap ends zoomed in on the latest fix —
   no conditional half-zoom. gs (2026-11-18) landed the recenter at 17,
   the same working zoom as the acquire landing in drawFix; gx
   (2026-11-18) restores 19 on Tanner's verdict after living with 17
   (see the BQ2/gs/gx note in drawFix). */
function centerOnFix() {
  if (!map || !lastFix || lastFix.lat == null) return;
  /* Q234: re-measure before centering — a stale cached container size (B13)
     lands the setView off-center. */
  map.invalidateSize();
  map.setView([lastFix.lat, lastFix.lng], 19, { animate: false });
  armTapCorrection(); /* Q233: verify the tap center against the next converged fix */
  verifyTapCenter(); /* Q234: verify the tap center against a one-shot fresh fix */
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
    stopLocateWatch(); locateState = 'idle'; setLocateSearching(false); toast('Location search cancelled.'); return;
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
var editingSetId = null, pendingCoords = null, pendingSetPhotos = [], editSetPhotos = [], formNoteEntries = [];
var setFormOpenSeq = 0, modsRenderSeq = -1; /* Q204: mods fold state is per form-open */
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
  var hint = $('sf-prospect-hint');
  if (hint) hint.hidden = v !== 'prospect'; /* Q189 */
}
/* Wire the status buttons once: tap sets the hidden sf-status value,
   highlights the button, refreshes the missing-reason row. */
function wireStatusSeg() {
  var stBtns = document.querySelectorAll('#sf-status-seg button');
  for (var stb = 0; stb < stBtns.length; stb++) {
    stBtns[stb].onclick = (function (b) {
      return function () {
        var prevSt = $('sf-status').value; /* Q229 */
        $('sf-status').value = b.getAttribute('data-st');
        if ($('sf-status').value === 'active' && prevSt !== 'active') $('sf-date').value = todayISO(); /* Q229: show the date jumping to today the moment Active is picked, so the save never rewrites a visible field silently */
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
  { id: 'pine-hollow', name: 'Pine Hollow Trapping and Supplies', product: 'Ghost Dancer',
    section: 'bait', tier: 1, tagline: 'Trapping supplies — Arkansas',
    badge: 'assets/sponsors/pine-hollow.png',
    brandLogo: 'assets/sponsors/pine-hollow.png',
    story: ['Pine Hollow Trapping and Supplies is a family-run trapping supply company in Arkansas, and Opossum Foot\u2019s founding sponsor and first distribution partner.'],
    products: [
      { name: 'Ghost Dancer', section: 'bait' },
      { name: 'Medicine Man', section: 'bait' },
      { name: 'Dog Soldier', section: 'bait' },
      { name: 'Dream Catcher', section: 'bait' },
      { name: 'Hoochie Coochie', section: 'lure' },
      { name: 'Snag a Puss', section: 'lure' },
      { name: 'Feline Hitter', section: 'lure' },
      { name: 'Destabalizer', section: 'lure' },
      { name: 'Texas 2 Step', section: 'lure' },
      { name: 'Boomshakala', section: 'lure' },
      { name: 'Toe Jam', section: 'lure' },
      { name: 'Big Juju', section: 'lure' },
      { name: 'K9 Hitter', section: 'lure' },
      { name: 'K9 Thumper', section: 'lure' },
      { name: 'K9 Venom', section: 'lure' },
      { name: 'Beaver Tail Oil', section: 'lure' },
      { name: 'Buffalo Oil', section: 'lure' },
      { name: 'Killer Beaver Paste', section: 'lure' },
      { name: 'Black Hat Brand Beaver Lure', section: 'lure' },
      { name: 'Next of Kin', section: 'lure' },
      { name: 'Knockout', section: 'lure' },
      { name: 'Kristy\'s Nest Raider', section: 'lure' },
      { name: 'Executioner', section: 'lure' },
      { name: 'Fishy Sweet Raccoon Lure', section: 'lure' },
      { name: 'Dream Catcher Lure', section: 'lure' },
      { name: 'Liquid Killer Beaver', section: 'lure' },
      { name: 'Karma', section: 'lure' },
      { name: 'Catfish Oil', section: 'lure' },
      { name: 'Smokey Fish Oil', section: 'lure' },
      { name: 'All Call LDC', section: 'lure' },
      { name: 'Bobcat', section: 'urine' },
      { name: 'Coyote', section: 'urine' },
      { name: 'Fox', section: 'urine' },
      { name: 'Bone', section: 'visual' }
    ],
    url: 'https://pinehollowtrappingandsupplies.com/', urlLabel: 'pinehollowtrappingandsupplies.com' },
  { id: 'kansas-trapline', name: 'Kansas Trapline Products', product: 'Last Stop',
    section: 'bait', tier: 1, tagline: 'Trapping supplies — Kansas',
    badge: 'assets/sponsors/kansas-trapline.png',
    brandLogo: 'assets/sponsors/kansas-trapline.png',
    story: ['Kansas Trapline Products makes baits and lures for trappers, sold alongside Pine Hollow as a founding sponsor partner.'],
    products: [
      { name: 'Last Stop', section: 'bait' },
      { name: 'Felines Revenge', section: 'bait' },
      { name: 'Flint Hills Fox paste bait', section: 'bait' },
      { name: 'Die Hard B', section: 'bait' },
      { name: 'Die Hard C', section: 'bait' },
      { name: 'Schneider Chunky', section: 'bait' },
      { name: 'Woodchopper', section: 'bait' },
      { name: 'Alpine Call', section: 'lure' },
      { name: 'Blood Runner', section: 'lure' },
      { name: 'Bobcat Gland Lure', section: 'lure' },
      { name: 'Big Muddy', section: 'lure' },
      { name: 'Beaver Nut Buster', section: 'lure' },
      { name: 'Beaver Lure #1', section: 'lure' },
      { name: 'Beaver Lure', section: 'lure' },
      { name: 'Bobs Nub Rub', section: 'lure' },
      { name: 'Bootheel Beaver', section: 'lure' },
      { name: 'Bud Halls Mink Lure', section: 'lure' },
      { name: 'Bucktooth Buffett', section: 'lure' },
      { name: 'Cat a Strophic', section: 'lure' },
      { name: 'Coyote Gland Lure', section: 'lure' },
      { name: 'Catty Coyote', section: 'lure' },
      { name: 'Crazy Coon', section: 'lure' },
      { name: 'Death Scent', section: 'lure' },
      { name: 'Dakota Breaks', section: 'lure' },
      { name: 'Final Approach', section: 'lure' },
      { name: 'Final Destination', section: 'lure' },
      { name: 'Feline Finalizer', section: 'lure' },
      { name: 'High Hill Gland Lure', section: 'lure' },
      { name: 'Kansas Predator Extreme', section: 'lure' },
      { name: 'Kansas Call LDC', section: 'lure' },
      { name: 'Last Dance', section: 'lure' },
      { name: 'My Last Sunset', section: 'lure' },
      { name: 'Minus 9 Lives', section: 'lure' },
      { name: 'Mystery Mink', section: 'lure' },
      { name: 'Moon Shot Call Lure', section: 'lure' },
      { name: 'Oklahoma Suicide Sauce', section: 'lure' },
      { name: 'Old Faithful-Red Fox gland lure', section: 'lure' },
      { name: 'Positive Attraction', section: 'lure' },
      { name: 'Pants Down', section: 'lure' },
      { name: 'Running J Coon Gland Lure', section: 'lure' },
      { name: 'Ratter Up', section: 'lure' },
      { name: 'Red Fox gland lure', section: 'lure' },
      { name: 'Seldom Fails', section: 'lure' },
      { name: 'Tall Grass Supreme', section: 'lure' },
      { name: 'Western Any and All call lure', section: 'lure' },
      { name: 'X Factor', section: 'lure' },
      { name: 'You dirty Rat', section: 'lure' },
      { name: 'Doodles Coon Killer', section: 'lure' },
      { name: 'Muskcoonotter', section: 'lure' }
    ],
    url: 'https://kansastraplineproducts.com/', urlLabel: 'kansastraplineproducts.com' }
];
function sponsorById(id) {
  for (var i = 0; i < SPONSORS.length; i++) if (SPONSORS[i].id === id) return SPONSORS[i];
  return null;
}
/* Scorecard sponsor chips: match a ranked attractant name to a sponsor's
   product (normalized). Q238: match any product in the sponsor's products
   array, not just the single main product. The chip never affects the rank
   — it only marks products whose maker sponsors the app. */
function sponsorForProduct(name) {
  var n = String(name == null ? '' : name).toLowerCase().trim();
  if (!n) return null;
  for (var i = 0; i < SPONSORS.length; i++) {
    var sp = SPONSORS[i];
    if (String(sp.product == null ? '' : sp.product).toLowerCase().trim() === n) return sp;
    var products = sp.products || [];
    for (var j = 0; j < products.length; j++) {
      if (products[j] && String(products[j].name || '').toLowerCase().trim() === n) return sp;
    }
  }
  return null;
}
/* Q67: the old standalone sponsor badge row under the Bait field is gone —
   sponsors live inside the suggestion menus now (see sponsorSuggests). */
/* Q171 (2026-10-08): sponsor bio is the full-screen demo sheet — X close, logo,
   name, gold tagline, OUR STORY, PRODUCTS, SPONSORED footer.
   Tier 1 = bio + product names + the gold VISIT WEBSITE button (Tanner's ruling
   2026-10-21: the direct link to the sponsor's sales page is Tier 1's biggest
   benefit). Product descriptions stay tier-gated in the data (Tier 2+), but NO
   tier or upsell language ever renders in the app — tiers live in sales
   materials only (Tanner's ruling 2026-11-14: the "Tier 2 adds full product
   descriptions" line is removed; it had ridden along since Q171). Every caller
   (pickers, scorecard, directory) rides this one function. */
function openSponsorBio(id) {
  var sp = sponsorById(id);
  if (!sp) return;
  var tier = sp.tier || 1;
  var logo = sp.brandLogo || sp.badge;
  var story = sp.story || (sp.bio ? [sp.bio] : []);
  var products = sp.products || (sp.product ? [{ name: sp.product }] : []);
  var html = '<div class="sp-bio-sheet">' +
    '<button type="button" class="sp-bio-x" id="m-sp-x" aria-label="Close">\u00d7</button>' +
    (logo ? '<img class="sp-bio-logo" src="' + esc(logo) + '" alt="' + esc(sp.name) + ' logo">' : '') +
    '<h2 class="sp-bio-name">' + esc(sp.name) + '</h2>' +
    (sp.tagline ? '<div class="sp-bio-tagline">' + esc(sp.tagline) + '</div>' : '') +
    '<hr class="sp-bio-div">' +
    '<h4 class="sp-bio-h">Our Story</h4>' +
    story.map(function (p) { return '<p class="sp-bio-p">' + esc(p) + '</p>'; }).join('') +
    '<h4 class="sp-bio-h">Products</h4>' +
    products.map(function (pr) {
      return '<div class="sp-bio-prod"><div class="sp-bio-prodname">' + esc(pr.name) + '</div>' +
        ((tier >= 2 && pr.description) ? '<div class="sp-bio-proddesc dim">' + esc(pr.description) + '</div>' : '') + '</div>';
    }).join('') +
    (sp.url
      ? '<a class="sp-bio-visit" href="' + esc(sp.url) + '" target="_blank" rel="noopener">Visit Website</a>'
      : '') +
    '<div class="sp-bio-sponsored">Sponsored</div>' +
    '</div>';
  showModal(html);
  $('modal').classList.add('sponsor-sheet');
  $('m-sp-x').onclick = function () { $('modal').classList.remove('sponsor-sheet'); closeModal(); };
}

/* fh (2026-11-14, Tanner's ruling): the map-banner logos are display-only
   — NO tap handler here. Sponsor bios open only from the logo next to a
   product in the bait/lure lists, from the Scorecard, or from the Visit
   Website link inside a bio sheet. (The fg build wired the banner logos to
   open the bio; Tanner caught it on his phone.) */

function openSetForm(coords, setId) {
  setFormOpenSeq++;
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
  updateSetNameClear(); hideSetNameSuggest(); /* gm: the × mirrors the prefilled name; the suggestion box starts shut */
  renderMakerOptions();
  $('sf-maker').value = s ? (s.trapMaker || MIXED_MAKER_LABEL) : (tmpl ? (tmpl.trapMaker || MIXED_MAKER_LABEL) : '');
  var pk = (s && s.trapMaker) ? pickerTypeFor(s.trapMaker, s.trapType, s.trapSpring, s.trapModel)
    : (s ? (s.trapType || '') : (tmpl ? pickerTypeFor(tmpl.trapMaker, tmpl.trapType, tmpl.trapSpring, tmpl.trapModel) : ''));
  renderTrapTypeOptions($('sf-maker').value, pk);
  paintSelectHint($('sf-maker'));
  $('sf-type').onchange = function () { renderTrapDetailFields(); paintSelectHint(this); };
  $('sf-maker').onchange = onMakerChange;
  renderTrapDetailFields(s || tmpl || null);
  renderSetTypeOptions(); /* Q212: rebuild the foundation picker each open so legacy values reset */
  /* Q208: with Set type toggled off, a new set's hidden dropdown holds blank,
     not the "Dirt hole" fallback — the save forces blank regardless (Q208 in
     saveSetForm); this keeps the form itself honest. */
  var stv = s ? (s.setType || 'Dirt hole') : (tmpl && tmpl.setType ? tmpl.setType : (setFieldOn('settype') ? 'Dirt hole' : ''));
  var svar = s ? (s.variation || '') : (tmpl ? (tmpl.variation || '') : '');
  if (!s && !setFieldOn('settype')) svar = ''; /* Q162/Q208: off means blank, carried template included */
  if (stv === 'Other') {
    /* ho (Q249): a legacy literal Other opens on a blank foundation
       field — the trapper types the real name (Q55's intent, one step). */
    $('sf-settype').value = '';
    renderVariationOptions();
    setVariationFields('', svar);
  } else if (stv) {
    var fnd = foundationOf(stv);
    if (fnd) {
      /* Q212: the form opens structured. A legacy name selects its
         foundation and rides as the variation (unless the record already
         carries a variation of its own); a foundation name selects
         itself. Nothing stored is renamed by opening — the structure is
         only written if the trapper saves. */
      $('sf-settype').value = fnd;
      renderVariationOptions();
      setVariationFields(fnd, svar || (stv !== fnd ? stv : ''));
    } else {
      /* No foundation home ("Drowning set", a custom name): rides along
         verbatim as its own option, exactly as before. */
      ensureSetTypeOption(stv);
      $('sf-settype').value = stv;
      renderVariationOptions();
      setVariationFields('', svar);
    }
  } else {
    $('sf-settype').value = '';
    renderVariationOptions();
    setVariationFields('', '');
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
  /* ga: the notes box is a composer now — the set's notes live as dated
     entries above it, staged in formNoteEntries until Save. */
  $('sf-notes').value = '';
  formNoteEntries = s ? setNoteEntries(s).map(function (e) {
    return { id: e.id, text: e.text, date: e.date || '', at: e.at || 0 };
  }) : [];
  renderFormNoteEntries();
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
  if (!setFieldOn('settype')) { c.setType = ''; c.variation = ''; /* Q212: the variation rides the settype toggle */ }
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
/* hp (Q270): the purge half of a set delete, without deleteSet's own
   confirm and UI flow — used by Save over it, whose confirm is the
   caller's. Same Q38 rule: the set, its catch logs (History included),
   its photos and its voice memos all go, for good. */
function purgeSetEverywhere(id) {
  Store.data.sets = Store.data.sets.filter(function (x) { return x.id !== id; });
  Store.data.logs = Store.data.logs.filter(function (l) { return l.setId !== id; });
  if (Array.isArray(Store.data.activity)) Store.data.activity = Store.data.activity.filter(function (a) { return a.setId !== id; }); /* Q272 */
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
  Store.save();
}
/* hp (Q270, Tanner 2026-11-21): Save over it — the second, explicit
   warning before the name's current owner is deleted and the set being
   saved takes its name. */
function confirmSaveOverSet(ds) {
  var line = lineById(Store.data, ds.lineId);
  var lineName = line ? line.name : 'another line';
  var nLogs = Store.data.logs.filter(function (l) { return l.setId === ds.id; }).length;
  showModal('<h3>Save over &ldquo;' + esc(ds.name) + '&rdquo;?</h3>' +
    '<p>The set named &ldquo;' + esc(ds.name) + '&rdquo; on the ' + esc(lineName) + ' line will be deleted' +
    (nLogs ? ' with its ' + nLogs + ' catch log' + (nLogs > 1 ? 's' : '') : '') +
    ', its photos and voice memos — gone for good, History included. The set you are saving takes the name.</p>' +
    '<div class="btn-row"><button class="btn-secondary" id="m-cancel" type="button">Cancel</button>' +
    '<button class="btn-primary" id="m-ok" type="button">Delete it and save mine</button></div>');
  $('m-cancel').onclick = closeModal;
  $('m-ok').onclick = function () {
    purgeSetEverywhere(ds.id);
    closeModal();
    saveSetForm();
  };
}
/* ================= Q272 (2026-11-21, Tanner): SET ACTIVITY TRAIL ======
   Every edit, status change, pull, and bulk change writes a dated entry
   on the set — what changed, old -> new — with the weather stamped the
   way a catch stamps it. Entries live in Store.data.activity:
   { id, setId, lineId, ts, kind, lines, weather }.
   kind: 'created' | 'edit' | 'status' | 'bulk'.
   Other events are NOT duplicated here: both readers union the set's
   Other-event logs in directly, so a deleted log leaves no ghost and
   the logs' own Q38 purge covers them. Deleting a set purges its
   entries (deleteSet / purgeSetEverywhere). Forward-only — the trail
   starts with this build; nothing backfills.
   Surfaces (Tanner's ruling): the set detail sheet's Activity section
   AND a History view beside By Date / By Trap Type. */
function activityArr() {
  if (!Store.data) return [];
  if (!Array.isArray(Store.data.activity)) Store.data.activity = [];
  return Store.data.activity;
}
function recordActivity(s, kind, lines) {
  if (!s || !lines || !lines.length) return null;
  var act = { id: uid('a'), setId: s.id, lineId: s.lineId || activeLineId(), ts: Date.now(), kind: kind, lines: lines.slice() };
  activityArr().push(act);
  Store.save();
  stampLogWeather(s, act); /* async: fills act.weather + saves, like a catch */
  return act;
}
function attrChangeLines(label, oldV, newV) {
  var o = toAttrArray(oldV), n = toAttrArray(newV);
  var oL = o.map(function (x) { return String(x).toLowerCase(); });
  var nL = n.map(function (x) { return String(x).toLowerCase(); });
  var out = [];
  n.forEach(function (x) { if (oL.indexOf(String(x).toLowerCase()) === -1) out.push(label + ' added: ' + x); });
  o.forEach(function (x) { if (nL.indexOf(String(x).toLowerCase()) === -1) out.push(label + ' removed: ' + x); });
  return out;
}
function setSnapshot(s) {
  return { name: s.name, status: normStatus(s.status), setType: s.setType || '', trapType: s.trapType || '',
    bait: toAttrArray(s.bait), lure: toAttrArray(s.lure), urine: toAttrArray(s.urine),
    visual: toAttrArray(s.visual), audio: toAttrArray(s.audio), other: toAttrArray(s.other) };
}
function snapshotDiffLines(before, s) {
  var lines = [];
  if (before.name !== s.name) lines.push('Renamed: ' + before.name + ' → ' + (s.name || ''));
  if (before.status !== normStatus(s.status)) lines.push('Status: ' + statusLabel(before.status) + ' → ' + statusLabel(normStatus(s.status)));
  if (before.setType !== (s.setType || '')) lines.push('Set type: ' + (before.setType || '—') + ' → ' + (s.setType || '—'));
  if (before.trapType !== (s.trapType || '')) lines.push('Trap: ' + (before.trapType || '—') + ' → ' + (s.trapType || '—'));
  lines = lines.concat(attrChangeLines('Bait', before.bait, s.bait));
  lines = lines.concat(attrChangeLines('Lure', before.lure, s.lure));
  lines = lines.concat(attrChangeLines('Urine', before.urine, s.urine));
  lines = lines.concat(attrChangeLines('Visual', before.visual, s.visual));
  lines = lines.concat(attrChangeLines('Audio', before.audio, s.audio));
  lines = lines.concat(attrChangeLines('Other attractant', before.other, s.other));
  return lines;
}
var ACTIVITY_KIND_TITLES = { created: 'Set created', edit: 'Edited', status: 'Status change', bulk: 'Edit all', event: 'Event' };
function activityItemsForSet(s) {
  var items = [];
  activityArr().forEach(function (a) {
    if (a.setId === s.id) items.push({ ts: a.ts || 0, kind: a.kind, title: ACTIVITY_KIND_TITLES[a.kind] || 'Activity', lines: a.lines || [], weather: a.weather || null });
  });
  (Store.data.logs || []).forEach(function (l) {
    if (l.setId !== s.id || !l.otherType) return;
    var t = OTHER_LABELS[l.otherType] || 'Other event';
    var line = t + (l.species ? ' — ' + l.species : '') + (l.notes ? ' · ' + l.notes : '');
    items.push({ ts: l.createdAt || 0, date: l.date || '', kind: 'event', title: t, lines: [line], weather: l.weather || null });
  });
  items.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
  return items;
}
function activityDayOf(item) {
  if (item.date) return item.date;
  var d = new Date(item.ts || 0);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function activityRowHtml(item, setName) {
  var when = item.ts ? new Date(item.ts) : null;
  var timeTxt = when ? when.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
  var html = '<div class="log-row"><div class="lr-top"><span class="lr-species">' + esc(item.title) + '</span>' +
    (setName ? '<span class="dim">' + esc(setName) + '</span>' : '') + '</div>' +
    '<div class="dim">' + esc(fmtDate(activityDayOf(item))) + (timeTxt ? ' · ' + esc(timeTxt) : '') + '</div>';
  (item.lines || []).forEach(function (ln) { html += '<div>' + esc(ln) + '</div>'; });
  if (item.weather) html += '<div class="dim">🌤 ' + esc(weatherText(item.weather)) + '</div>';
  return html + '</div>';
}
function renderSetActivity(s) {
  var box = $('sd-activity');
  if (!box) return;
  var items = activityItemsForSet(s);
  var cnt = $('sd-activity-count');
  if (cnt) cnt.textContent = items.length ? '· ' + items.length : '';
  box.innerHTML = items.length ? items.map(function (it) { return activityRowHtml(it, null); }).join('')
    : '<p class="dim">Nothing here yet — edits, status changes, and other events at this set will file here.</p>';
}
/* History's Activity view: the whole active line's trail — entries plus
   Other-event logs (Empty check-ins included; History's catch views hide
   them, the trail is their home). Season scope + search apply. */
function renderHistActivity() {
  var f = histUI, q = (f.q || '').toLowerCase();
  var lineId = activeLineId();
  var thisSY = seasonYearOf(todayISO()), lastSY = prevSeasonLabel(thisSY);
  var items = [];
  activityArr().forEach(function (a) {
    if (a.lineId !== lineId) return;
    var s = getSet(a.setId);
    items.push({ ts: a.ts || 0, kind: a.kind, title: ACTIVITY_KIND_TITLES[a.kind] || 'Activity', lines: a.lines || [], weather: a.weather || null, setName: s ? s.name : '' });
  });
  (Store.data.logs || []).forEach(function (l) {
    if (!l.otherType) return;
    var s = getSet(l.setId);
    if (!s || s.lineId !== lineId) return;
    var t = OTHER_LABELS[l.otherType] || 'Other event';
    var line = t + (l.species ? ' — ' + l.species : '') + (l.notes ? ' · ' + l.notes : '');
    items.push({ ts: l.createdAt || 0, date: l.date || '', kind: 'event', title: t, lines: [line], weather: l.weather || null, setName: s.name });
  });
  items.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
  items = items.filter(function (it) {
    if (f.season === 'this' || f.season === 'last') {
      var sy = seasonYearOf(activityDayOf(it));
      if (sy && sy !== (f.season === 'this' ? thisSY : lastSY)) return false;
    }
    if (q) {
      var hay = ((it.setName || '') + ' ' + (it.title || '') + ' ' + (it.lines || []).join(' ')).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  });
  if (!items.length) return '<div class="empty"><div class="big"><img class="bi inv" src="assets/icons/logbook.png" alt=""></div>No activity yet.<br>Edits, status changes, and other events on this line will file here.</div>';
  var html = '', lastSY2 = null, curDay = null;
  items.forEach(function (it) {
    var day = activityDayOf(it);
    var sy = seasonYearOf(day);
    if (sy !== lastSY2) {
      if (curDay !== null) { html += '</div>'; curDay = null; }
      html += '<div class="season-group-head">Season ' + esc(sy) + '</div>';
      lastSY2 = sy;
    }
    if (day !== curDay) {
      if (curDay !== null) html += '</div>';
      html += '<div class="day-group"><div class="day-head">' + esc(dayLabel(day)) + '</div><div class="day-body">';
      curDay = day;
    }
    html += activityRowHtml(it, it.setName);
  });
  if (curDay !== null) html += '</div>';
  return html;
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
  /* fg / Lefty note 2 (2026-11-11): duplicate set names are blocked with a
     popup — two sets can't share a name, or the History and map get
     ambiguous. Compare trimmed, case-insensitive; the set being edited is
     allowed to keep its own name. The auto-numbered name from nextSetName
     passes through the same check. */
  var dupSet = null;
  for (var di = 0; di < Store.data.sets.length; di++) {
    var ds = Store.data.sets[di];
    if (editingSetId && ds.id === editingSetId) continue;
    if (String(ds.name || '').trim().toLowerCase() === name.toLowerCase()) { dupSet = ds; break; }
  }
  if (dupSet) {
    /* hp (Q270, Tanner 2026-11-21): the warning NAMES the line the
       living set sits on — the old modal never said where it was, so a
       name deleted on one line still blocked on another — and offers
       Save over it beside OK: one more explicit warning
       (confirmSaveOverSet), then the old set is purged (Q38) and this
       save proceeds under the name. OK stays the rename-only path. */
    var dupLine = lineById(Store.data, dupSet.lineId);
    var dupLineName = dupLine ? dupLine.name : 'another line';
    showModal('<h3>That name is already taken</h3><p>There is already a set named &ldquo;' + esc(dupSet.name) + '&rdquo; on the ' + esc(dupLineName) + ' line. Give this set a different name — or save over it, which deletes that set and puts this one in its place.</p>' +
      '<div class="btn-row"><button class="btn-secondary" id="m-ok" type="button">OK</button>' +
      '<button class="btn-primary" id="m-over" type="button">Save over it</button></div>');
    $('m-ok').onclick = closeModal;
    $('m-over').onclick = function () { confirmSaveOverSet(dupSet); };
    return;
  }
  var td = trapDetailValues();
  var rt = resolvedTrapType();
  /* Q208 (2026-10-20): Tanner — a field toggled off in Settings must not be
     logged at all. Q162 blanked the carry-forward template, but the form's
     own defaults refilled the hidden fields (set type falls back to "Dirt
     hole"; the trap picker resolves its first type) and this save wrote
     them anyway. For a NEW set, every toggled-off group is forced blank
     here, at the save itself, so nothing the user turned off can reach
     storage. Edit mode keeps td/rt untouched on purpose: values logged
     while a field was on are the set's real data, and an unrelated edit
     must not strip them. */
  var ntd = td, nrt = rt, nSetType = selVal('sf-settype'), nVariation = variationFieldValue();
  /* gj: a variation typed in the custom box is remembered under its
     foundation at save too (the box's change listener usually beat us here). */
  var vCust = $('sf-setvariation-custom');
  if (nSetType && vCust && vCust.value.trim()) rememberCustomOption('sf-setvariation:' + nSetType, vCust.value.trim());
  if (!editingSetId) {
    ntd = {}; for (var nk in td) if (Object.prototype.hasOwnProperty.call(td, nk)) ntd[nk] = td[nk];
    nrt = { t: rt.t, spring: rt.spring };
    if (!setFieldOn('traptype')) { nrt.t = ''; nrt.spring = ''; ntd.trapMaker = ''; }
    if (!setFieldOn('trapdetail')) {
      ntd.trapSpring = ''; ntd.trapSize = ''; ntd.snareDia = ''; ntd.snareLock = '';
      ntd.snareLen = ''; ntd.snarePurpose = ''; ntd.trapModel = ''; ntd.trapMods = [];
      ntd.panSize = ''; ntd.jawShape = ''; ntd.jawClose = '';
    }
    if (!setFieldOn('settype')) { nSetType = ''; nVariation = ''; /* Q212: the variation blanks with its foundation */ }
  }
  if (editingSetId) {
    var s = getSet(editingSetId);
    if (!s) { closeSheets(); return; }
    var actBefore = setSnapshot(s); /* Q272: the trail diffs against this */
    s.name = name;
    s.trapType = rt.t;
    s.trapMaker = td.trapMaker;
    s.trapSpring = td.trapSpring || rt.spring || ''; s.trapSize = td.trapSize;
    s.snareDia = td.snareDia; s.snareLock = td.snareLock; s.snareLen = td.snareLen;
    s.snarePurpose = td.snarePurpose;
    s.trapModel = td.trapModel;
    s.trapMods = normalizeMods(td.trapMods); s.panSize = td.panSize; s.jawShape = td.jawShape; s.jawClose = td.jawClose;
    normalizeTrapDetail(s);
    s.setType = selVal('sf-settype'); /* Q55: Other… resolves to the typed custom */
    s.variation = variationFieldValue(); /* Q212: the form opened with the stored variation on it (openSetForm), so an unrelated edit writes the same value back — never a blank */
    /* Q26: stacked attractant rows -> arrays (deduped, empties dropped) */
    s.bait = collectAttrRows('bait');
    s.lure = collectAttrRows('lure');
    s.urine = collectAttrRows('urine');
    s.visual = collectAttrRows('visual');
    s.audio = collectAttrRows('audio');
    s.other = collectAttrRows('other');
    var oldStatus = normStatus(s.status); /* Q229: the date rule keys on the move */
    s.status = status;
    s.dateSet = activeDateFor(oldStatus, status, dateSet, todayISO()); /* Q229: any move TO Active restarts the set date — the day it goes active is day one. A set that stays Active keeps its date. */
    stageComposerNote(); /* ga: a note still in the box files as an entry too */
    s.noteLog = formNoteEntries.slice();
    syncSetNotesText(s);
    if (td.trapModel) rememberEntry('trapmodel', td.trapModel); /* Q12 */
    /* Q36: missing reason rides the status */
    s.missingReason = (status === 'missing') ? setMissingReason : null;
    s.missingDetail = (status === 'missing' && setMissingReason === 'confiscated') ? $('sf-missing-detail').value.trim() : null;
    if (s.missingDetail) rememberEntry('missingdetail', s.missingDetail); /* Q12 */
    if (s.status === 'pulled' && !s.datePulled) s.datePulled = todayISO();
    if (s.status !== 'pulled' && s.datePulled) delete s.datePulled;
    var actLines = snapshotDiffLines(actBefore, s); /* Q272 */
    if (actLines.length) recordActivity(s, 'edit', actLines);
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
    stageComposerNote(); /* ga: file any note still in the box before building the record */
    var ns = {
      id: uid('s'), name: name,
      lat: pendingCoords.lat, lng: pendingCoords.lng, county: null,
      trapType: nrt.t,
      trapMaker: ntd.trapMaker,
      trapSpring: ntd.trapSpring || nrt.spring || '', trapSize: ntd.trapSize,
      snareDia: ntd.snareDia, snareLock: ntd.snareLock, snareLen: ntd.snareLen,
      snarePurpose: ntd.snarePurpose,
      trapModel: ntd.trapModel,
      trapMods: normalizeMods(ntd.trapMods), panSize: ntd.panSize, jawShape: ntd.jawShape, jawClose: ntd.jawClose,
      setType: nSetType, /* Q55: Other… resolves to the typed custom; Q208: '' when the field is toggled off */
      variation: nVariation, /* Q212: '' unless a variation/custom was picked; Q208: '' when toggled off */
      /* Q26: stacked attractant rows -> arrays; Q208: a toggled-off attractant saves empty */
      bait: setFieldOn('bait') ? collectAttrRows('bait') : [], lure: setFieldOn('lure') ? collectAttrRows('lure') : [],
      urine: setFieldOn('urine') ? collectAttrRows('urine') : [],
      /* Q209 (2026-10-20): visual/audio were missing from the new-set record
         entirely — picks made on the New Set form silently vanished (Edit
         saved them fine). They ride here now, under the same Q208 guard. */
      visual: setFieldOn('visual') ? collectAttrRows('visual') : [], audio: setFieldOn('audio') ? collectAttrRows('audio') : [],
      other: setFieldOn('other') ? collectAttrRows('other') : [],
      status: status,
      dateSet: dateSet,
      notes: formNoteEntries.map(function (e) { return e.text; }).join('\n'),
      noteLog: formNoteEntries.slice(), /* ga: dated note entries */
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
    recordActivity(ns, 'created', ['Set created']); /* Q272: the trail's first entry */
    Store.save(); refreshMarkers(); closeSheets();
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
    /* hm (2026-11-20, Tanner's word — the he follow-up he flagged on
       2026-11-18 and approved today): the save fly-to takes the wheel
       exactly as a Show-list jump does (jumpToSet, he). While following,
       the follow watch and the Q234 guard would drag the view back to
       his fix on the next fix/tick, snapping off the set he just saved;
       a programmatic flyTo never fires dragstart, so nothing paused it.
       Pause follow through the same pauseFollow() the jump and a drag
       use — the watch keeps running, the dot stays live, the crosshair
       tap resumes. A pending acquire is cancelled for the jump's reason:
       its landing would setView to his fix and enter follow over the
       set he just saved. The save flow, destination, and zoom are
       unchanged — only the follow interaction. */
    if (locateState === 'following') pauseFollow();
    else if (locateState === 'acquiring') { stopLocateWatch(); setLocateSearching(false); locateState = 'idle'; }
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
  /* Q208 (2026-10-20): the detail sheet honors the same field toggles — a
     field switched off shows no row here even when an older set still
     carries a value logged while the field was on. Stored data untouched. */
  var sdTrapParts = [];
  if (setFieldOn('traptype') && s.trapType) sdTrapParts.push(s.trapType);
  if (setFieldOn('trapdetail')) { var sdDet0 = trapDetailSummary(s); if (sdDet0) sdTrapParts.push(sdDet0); }
  sdRow('Trap', sdTrapParts.join(' · '));
  if (setFieldOn('settype')) sdRow('Set type', setTypeLabel(s)); /* Q212: "Foundation — Variation"; legacy names verbatim */
  if (setFieldOn('bait')) sdRow('Bait', joinAttr(s.bait));
  if (setFieldOn('lure')) sdRow('Lure', joinAttr(s.lure));
  if (setFieldOn('urine')) sdRow('Urine', joinAttr(s.urine));
  if (setFieldOn('visual')) sdRow('Visual', joinAttr(s.visual));
  if (setFieldOn('audio')) sdRow('Audio', joinAttr(s.audio));
  if (setFieldOn('other')) sdRow('Other Attractants', joinAttr(s.other));
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
  /* Q178 (2026-10-08): view-only div, not a textarea. */
  renderSetNotes(s); /* ga: dated entries, newest first */
  refreshNotesBox('setdetail-notessec', 'sd-notes', 'sd-memos', 'sd-photos'); /* Q99 */
  renderSetActivity(s); /* Q272: the set's activity trail */
  setSectionOpen('setdetail-catchessec', false); /* Q203: every open starts folded */
  setSectionOpen('setdetail-activitysec', false); /* Q272: folded too */
  openSheet('sheet-setdetail');
}
/* ================= ga (2026-11-15): SET NOTES AS DATED ENTRIES ==============
   Tanner: a note should file as a transcript in the set, not live forever in
   one box — and he may want several. Each set now carries noteLog: a list of
   {id, text, date, at}, oldest first, shown newest first. The Edit Set form
   stages entries in formNoteEntries (Save commits, X discards — the form's
   contract); a note still sitting in the box at Save files as an entry too.
   s.notes stays as the plain-text join of the entries so History lines,
   exports and older readers keep seeing the same words. Sets written before
   ga have no noteLog: their notes text shows as one undated "Earlier note"
   entry and carries into noteLog the first time an entry is added. */
function setNoteEntries(s) {
  if (!s) return [];
  if (Array.isArray(s.noteLog)) return s.noteLog;
  if (s.notes && s.notes.trim()) {
    return [{ id: 'legacy', text: s.notes, date: '', at: s.createdAt || 0 }];
  }
  return [];
}
function syncSetNotesText(s) {
  var es = Array.isArray(s.noteLog) ? s.noteLog : [];
  s.notes = es.map(function (e) { return e.text; }).join('\n');
}
function addSetNoteEntry(s, text) {
  var t = String(text || '').trim();
  if (!s || !t) return false;
  if (!Array.isArray(s.noteLog)) {
    s.noteLog = (s.notes && s.notes.trim())
      ? [{ id: uid('n'), text: s.notes, date: '', at: s.createdAt || 0 }]
      : [];
  }
  s.noteLog.push({ id: uid('n'), text: t, date: todayISO(), at: Date.now() });
  syncSetNotesText(s);
  return true;
}
function noteEntryHTML(e) {
  return '<div class="note-entry"><div class="note-date">' +
    (e.date ? esc(fmtDate(e.date)) : 'Earlier note') + '</div>' +
    '<div class="note-text">' + esc(e.text) + '</div></div>';
}
function renderSetNotes(s) {
  var el = $('sd-notes');
  if (!el) return;
  var es = setNoteEntries(s);
  if (!es.length) { el.textContent = '—'; return; }
  el.innerHTML = es.slice().reverse().map(noteEntryHTML).join('');
}
function renderFormNoteEntries() {
  var box = $('sf-note-entries');
  if (!box) return;
  box.innerHTML = '';
  formNoteEntries.slice().reverse().forEach(function (e) {
    var div = document.createElement('div');
    div.className = 'note-entry';
    var head = document.createElement('div');
    head.className = 'note-entry-head';
    var dl = document.createElement('span');
    dl.className = 'note-date';
    dl.textContent = e.date ? fmtDate(e.date) : 'Earlier note';
    head.appendChild(dl);
    var del = document.createElement('button');
    del.type = 'button';
    del.className = 'note-del';
    del.textContent = '✕';
    del.title = 'Remove this note';
    del.onclick = function () {
      formNoteEntries = formNoteEntries.filter(function (x) { return x.id !== e.id; });
      renderFormNoteEntries();
    };
    head.appendChild(del);
    div.appendChild(head);
    var tx = document.createElement('div');
    tx.className = 'note-text';
    tx.textContent = e.text;
    div.appendChild(tx);
    box.appendChild(div);
  });
  if (formNoteEntries.length) setSectionOpen('setform-notessec', true);
}
function stageComposerNote() {
  var ta = $('sf-notes');
  if (!ta) return false;
  var t = ta.value.trim();
  if (!t) return false;
  formNoteEntries.push({ id: uid('n'), text: t, date: todayISO(), at: Date.now() });
  ta.value = '';
  renderFormNoteEntries();
  return true;
}
function appendTranscriptToSetNotes(setId, tr) {
  var s = getSet(setId);
  if (!s || !tr) return;
  addSetNoteEntry(s, tr); /* ga: a memo transcript files as its own dated entry */
  touchSet(s); /* Q68 */
  Store.save();
  if (setId === detailSetId && $('sd-notes')) { renderSetNotes(s); refreshNotesBox('setdetail-notessec', 'sd-notes', 'sd-memos', 'sd-photos'); /* Q99 */ }
}

function renderSetLogs(s, byLog) {
  var logs = Store.data.logs.filter(function (l) { return l.setId === s.id; })
    .sort(function (a, b) { return b.date < a.date ? -1 : 1; });
  if (!logs.length) { $('sd-logs').innerHTML = '<p class="dim">No catches logged at this set yet.</p>'; if ($('sd-catches-count')) $('sd-catches-count').textContent = ''; return; }
  if ($('sd-catches-count')) $('sd-catches-count').textContent = '· ' + logs.length;
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
        if (Array.isArray(Store.data.activity)) Store.data.activity = Store.data.activity.filter(function (a) { return a.setId !== id; }); /* Q272: the trail dies with the set */
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
/* gw: the unsaved catch's tag photo — one photo, { blob } like the catch
   photos, saved with kind 'tag' when the catch saves. */
var pendingTagPhoto = null;
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
  pendingTagPhoto = null; renderPendingTagPhoto(); /* gw */
  $('log-tag-number').value = ''; $('log-tag-date').value = ''; /* gw: fresh tag fields per catch */
  logSheetLive = true;
  logEventType = 'catch'; logOtherType = 'sprung';
  renderPendingLogPhotos();
  $('log-setline').innerHTML = '<strong>' + esc(s.name) + '</strong>' +
    (s.setType ? ' · ' + esc(setTypeLabel(s)) : '') +
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
  updateLogTagSection(); /* gw: Other events never show the Tag section */
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
/* gw: the log form's Tag section lives and dies by three conditions —
   Tag records on, a Catch (never an Other event), and a picked species
   the state actually tags. It starts collapsed and every field in it is
   optional; an untouched section saves nothing and blocks nothing. */
function updateLogTagSection() {
  var sec = $('logform-tagsec');
  if (!sec) return;
  var entry = (logEventType === 'catch' && logSpecies) ? tagEntryForSpecies(logSpecies) : null;
  var show = tagRecordsOn() && !!entry;
  sec.hidden = !show;
  if (!show) { setSectionOpen('logform-tagsec', false); return; }
  var rule = $('log-tag-rule');
  if (rule) rule.textContent = tagRuleText(entry);
}
function renderPendingTagPhoto() {
  var box = $('log-tag-photos');
  if (!box) return;
  box.innerHTML = '';
  if (!pendingTagPhoto) return;
  var img = document.createElement('img');
  img.className = 'photo-thumb'; img.alt = 'Tag photo';
  img.src = URL.createObjectURL(pendingTagPhoto.blob);
  img.title = 'Tap to enlarge';
  img.onclick = function () {
    var url = URL.createObjectURL(pendingTagPhoto.blob);
    showModal('<img src="' + url + '" style="width:100%;border-radius:8px" alt="Tag photo">' +
      '<div class="btn-row" style="margin-top:10px"><button class="btn-danger" id="m-tph-del" type="button">Remove</button>' +
      '<button class="btn-secondary" id="m-close" type="button">Close</button></div>');
    wirePhotoZoom($('modal-card'));
    $('m-close').onclick = closeModal;
    $('m-tph-del').onclick = function () { pendingTagPhoto = null; renderPendingTagPhoto(); closeModal(); };
  };
  box.appendChild(img);
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
  wirePhotoZoom($('modal-card')); /* Q241: pinch-to-zoom */
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
  wirePhotoZoom($('modal-card')); /* Q241: pinch-to-zoom */
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
      updateLogTagSection(); /* gw: the Tag section follows the picked species */
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
  /* Q182: the active line can quiet these catch-log reminders. Only the
     pop-up boxes are gated — the season badges on the animal list are
     information and stay visible for everybody, always. */
  if (!lineCatchAlerts()) return;
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
  /* gw: the tag record rides on the catch — only when the Tag section
     applied to this catch's species, and exactly as filled (blank fields
     stay blank; the section untouched is a perfectly good save). */
  if (tagRecordsOn() && !isOther && species && isTagSpecies(species)) {
    log.tagNumber = ($('log-tag-number').value || '').trim();
    log.tagDate = $('log-tag-date').value || '';
  }
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
  /* gw: the pending tag photo saves as the catch's tag photo — same
     store, same shape as a catch photo, marked kind 'tag' so My Tags
     and the photo pack can tell it from the catch's own photos. */
  if (pendingTagPhoto && log.tagNumber !== undefined) {
    IDB.put('photos', {
      id: uid('p'), setId: log.setId, logId: log.id, kind: 'tag', blob: pendingTagPhoto.blob,
      mime: pendingTagPhoto.blob.type || 'image/jpeg',
      lat: s ? s.lat : null, lng: s ? s.lng : null, createdAt: Date.now()
    }).catch(function () { /* noop */ });
  }
  pendingTagPhoto = null;
  pendingLogPhotos = [];
  pendingLogMemos = [];
  closeSheets();
  renderHistory(); renderTotals(); refreshMarkers(); /* Q75 (2026-10-01): Tanner — the pin repaints the moment the catch is logged, no tab switch needed. */
  /* fg / Lefty note 1 (2026-11-10): the "Logged …" toast used to sit on top
     of the post-catch sheet's two buttons ("Update this set" / "Keep as-is")
     — toast is z-index 1100, sheets are 950. When the post-catch sheet
     opens, its own "Catch logged!" header IS the confirmation, so no toast:
     nothing covers the buttons. Other events open no sheet, so they keep
     the toast as their only confirmation. */
  if (isOther) {
    toast('Logged ' + (OTHER_LABELS[logOtherType] || 'Other event') + (species ? ' — ' + species : '') + (logDisposition && logDisposition !== 'none' ? ' (' + dispLabel(logDisposition) + ')' : '') + (s ? ' at ' + s.name : '') + '.');
  }
  /* Q226 (2026-10-31): Tanner — after a real catch (not an Other event),
     offer the "Update this set?" prompt: the trapper just remade the set
     and may want the set to reflect the new trap, set type, or attractants.
     Past catches keep what they were stamped with; only future catches
     pick up the change (B32). */
  if (!isOther) openPostCatchPrompt(logSetId, log);
  /* INVARIANT: saving a log — catch or Other event — NEVER changes the
     set's trap status. Status is manual-only: no s.status assignment
     exists in saveLog or any log code path. */
  /* weather snapshot in background */
  stampLogWeather(s, log);
}

/* Q226 (2026-10-31): Tanner — post-catch "Update this set?" prompt. Shows
   the set as it stands (same rows as the detail sheet: only fields actually
   logged, honoring the field toggles) so the trapper can spot anything that
   changed when they remade the set. "Update this set" opens the full Edit
   Set form; "Keep as-is" just closes. Editing never rewrites past catches. */
var postCatchSetId = null;
/* gw scope 3: the post-catch sheet's tag entry. The sheet has no save of
   its own, so these fields WRITE THROUGH to the just-saved catch as they
   change — closing the sheet any way (Update, ×, scrim) keeps whatever
   was entered and loses nothing; untouched fields change nothing. */
var postCatchLogId = null;
var pcTagPhoto = null; /* { existing } — the photo saves the moment it's picked */
function setupPcTagEntry(log) {
  var wrap = $('pc-tag-entry');
  if (!wrap) return;
  postCatchLogId = null; pcTagPhoto = null;
  var show = !!(log && tagRecordsOn() && tagEntryForSpecies(log.species));
  wrap.hidden = !show;
  if (!show) return;
  postCatchLogId = log.id;
  pcTagPhoto = { existing: null };
  $('pc-tag-number').value = log.tagNumber || '';
  $('pc-tag-date').value = log.tagDate || '';
  renderPcTagPhoto();
  IDB.all('photos').then(function (all) {
    if (postCatchLogId !== log.id || !pcTagPhoto) return;
    (all || []).forEach(function (p) { if (p && p.logId === log.id && p.kind === 'tag') pcTagPhoto.existing = p; });
    renderPcTagPhoto();
  }).catch(function () { /* noop */ });
}
function renderPcTagPhoto() {
  var box = $('pc-tag-photos');
  if (!box) return;
  box.innerHTML = '';
  var has = !!(pcTagPhoto && pcTagPhoto.existing);
  var rm = $('btn-pc-tagphoto-remove');
  if (rm) rm.hidden = !has;
  if (!has) return;
  var img = document.createElement('img');
  img.className = 'photo-thumb'; img.alt = 'Tag photo';
  img.src = photoURL(pcTagPhoto.existing);
  img.onclick = function () { if (pcTagPhoto && pcTagPhoto.existing) openPhotoViewer(pcTagPhoto.existing, null, true); };
  box.appendChild(img);
}
function pcTagWrite() {
  var l = postCatchLogId ? tagLogById(postCatchLogId) : null;
  if (!l) return;
  l.tagNumber = ($('pc-tag-number').value || '').trim();
  l.tagDate = $('pc-tag-date').value || '';
  Store.save();
}
function openPostCatchPrompt(setId, log) {
  var s = getSet(setId);
  if (!s) return;
  postCatchSetId = setId;
  /* gn: if this species carries a sealing deadline (Cat 2) or an
     incidental-catch procedure (Cat 9) in this state, note it under the
     set summary — informational only, never blocks anything. */
  var noteBox = $('pc-gap-note');
  if (noteBox) {
    var notes = log ? gapNotesForCatch(log.species) : [];
    noteBox.innerHTML = notes.map(function (n) {
      return '<div class="warnbox"><div class="wb-title">' + esc(n.cat === 2 ? 'Tagging / sealing — ' : 'Incidental catch — ') + esc(log.species) + '</div>' +
        esc(n.entry.rule) +
        (n.entry.deadline ? ' <strong>Deadline: ' + esc(n.entry.deadline) + '.</strong>' : '') +
        '<div class="reminder-tag">' + esc(REMINDER_LINE) + '</div></div>';
    }).join('');
  }
  setupPcTagEntry(log); /* gw scope 3: the tag entry under the note */
  var html = '';
  function pcRow(label, val) {
    if (val) html += '<dt>' + esc(label) + '</dt><dd>' + esc(val) + '</dd>';
  }
  var trapParts = [];
  if (setFieldOn('traptype') && s.trapType) trapParts.push(s.trapType);
  if (setFieldOn('trapdetail')) { var det = trapDetailSummary(s); if (det) trapParts.push(det); }
  pcRow('Trap', trapParts.join(' · '));
  if (setFieldOn('settype')) pcRow('Set type', setTypeLabel(s));
  if (setFieldOn('bait')) pcRow('Bait', joinAttr(s.bait));
  if (setFieldOn('lure')) pcRow('Lure', joinAttr(s.lure));
  if (setFieldOn('urine')) pcRow('Urine', joinAttr(s.urine));
  if (!html) html = '<dt>Set</dt><dd class="dim">No trap, set type, or attractants on this set yet.</dd>';
  $('pc-fields').innerHTML = html;
  openSheet('sheet-postcatch');
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
  /* ho (Q251): photos land async — re-run the section's empty-state pass
     so the Photos part (and the all-empty line) reflect what arrived. */
  if (detailSetId) refreshNotesBox('setdetail-notessec', 'sd-notes', 'sd-memos', 'sd-photos');
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
  /* fy fallback: the share sheet refused the file (some phones balk at the
     camera's own format). Re-encode to a plain JPEG and offer the sheet once
     more. If it still won't go, stay put — every caller shows the photo on
     screen already, so a long-press saves it right there. Never kick the
     user out to a separate screen just to save a photo. */
  blobToJpeg(blob, function (jpg) {
    if (jpg && nav.canShare && nav.share) {
      var jf = null;
      try { jf = new File([jpg], (baseName || 'opossum-foot-photo') + '.jpg', { type: 'image/jpeg' }); } catch (e) { jf = null; }
      if (jf) {
        var ok2 = false;
        try { ok2 = !!nav.canShare({ files: [jf] }); } catch (e) { ok2 = false; }
        if (ok2) {
          nav.share({ files: [jf] }).catch(function (err) {
            if (!err || err.name !== 'AbortError') toast('Long-press the photo and tap Save Image to save it to your Photos.');
          });
          return;
        }
      }
    }
    toast('Long-press the photo and tap Save Image to save it to your Photos.');
  });
}
/* fy: decode any photo blob and hand back a plain JPEG (or null). */
function blobToJpeg(blob, cb) {
  try {
    var url = URL.createObjectURL(blob);
    var img = new Image();
    img.onload = function () {
      try {
        var c = document.createElement('canvas');
        c.width = img.naturalWidth || img.width;
        c.height = img.naturalHeight || img.height;
        c.getContext('2d').drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        if (c.toBlob) c.toBlob(function (b) { cb(b || null); }, 'image/jpeg', 0.92);
        else cb(null);
      } catch (e) { cb(null); }
    };
    img.onerror = function () { URL.revokeObjectURL(url); cb(null); };
    img.src = url;
  } catch (e) { cb(null); }
}
/* Q71: ro = read-only (summary sheet) — no Delete button, just view + save. */
/* Q241 (2026-11-14): pinch-to-zoom for every photo viewer in the app.
   The PWA viewport locks page zoom, so the viewer zooms itself: the img
   grows by width (100%–400%) inside a scrollable wrap, so panning is
   native scrolling. Pinch scales around the fingers; double-tap toggles
   1x / 2.5x around the tap point; one-finger drag pans while zoomed.
   Call right after the viewer's showModal/showModal2, passing its card. */
function wirePhotoZoom(cardEl) {
  var img = cardEl ? cardEl.querySelector('img') : null;
  if (!img) return;
  var wrap = document.createElement('div');
  wrap.className = 'pv-zoom';
  img.parentNode.insertBefore(wrap, img);
  wrap.appendChild(img);
  var hint = document.createElement('div');
  hint.className = 'pv-zoom-hint';
  hint.textContent = 'Pinch or double-tap to zoom · drag to move around';
  wrap.parentNode.insertBefore(hint, wrap.nextSibling);
  var scale = 1, MIN = 1, MAX = 4;
  var pts = {};
  var lastTap = 0;
  function applyScale(ns, fx, fy) {
    ns = Math.max(MIN, Math.min(MAX, ns));
    var w0 = img.clientWidth || wrap.clientWidth;
    var h0 = img.clientHeight || 0;
    var sx = (fx != null) ? fx : 0.5, sy = (fy != null) ? fy : 0.5;
    var rx = (wrap.scrollLeft + sx * wrap.clientWidth) / (w0 || 1);
    var ry = (wrap.scrollTop + sy * wrap.clientHeight) / (h0 || 1);
    scale = ns;
    img.style.width = (scale * 100) + '%';
    wrap.scrollLeft = rx * img.clientWidth - sx * wrap.clientWidth;
    wrap.scrollTop = ry * img.clientHeight - sy * wrap.clientHeight;
  }
  function pt(e) { var r = wrap.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
  wrap.addEventListener('pointerdown', function (e) {
    try { wrap.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
    pts[e.pointerId] = pt(e);
    var ids = Object.keys(pts);
    if (ids.length === 2) {
      wrap._pinchD = dist(pts[ids[0]], pts[ids[1]]);
      wrap._pinchS = scale;
    }
  });
  wrap.addEventListener('pointermove', function (e) {
    if (!pts[e.pointerId]) return;
    var prev = pts[e.pointerId];
    pts[e.pointerId] = pt(e);
    var ids = Object.keys(pts);
    if (ids.length === 2) {
      var d = dist(pts[ids[0]], pts[ids[1]]);
      if (wrap._pinchD && d > 0) {
        var mx = (pts[ids[0]].x + pts[ids[1]].x) / 2 / wrap.clientWidth;
        var my = (pts[ids[0]].y + pts[ids[1]].y) / 2 / wrap.clientHeight;
        applyScale(wrap._pinchS * (d / wrap._pinchD), mx, my);
      }
    } else if (ids.length === 1 && scale > 1) {
      wrap.scrollLeft -= (pts[e.pointerId].x - prev.x);
      wrap.scrollTop -= (pts[e.pointerId].y - prev.y);
    }
  });
  function endPt(e) {
    var wasSingle = Object.keys(pts).length === 1;
    var p = pts[e.pointerId];
    delete pts[e.pointerId];
    if (wasSingle && p && e.type === 'pointerup') {
      var now = Date.now();
      if (now - lastTap < 300) {
        applyScale(scale > 1.2 ? 1 : 2.5, p.x / wrap.clientWidth, p.y / wrap.clientHeight);
        lastTap = 0;
      } else lastTap = now;
    }
    if (!Object.keys(pts).length) wrap._pinchD = null;
  }
  wrap.addEventListener('pointerup', endPt);
  wrap.addEventListener('pointercancel', endPt);
  /* fy: on iPhone, Safari can take the pinch for itself before the pointer
     events finish — its own gesture events are the reliable signal there.
     Drive the same applyScale from them (e.scale is relative to the pinch
     start; the focal point rides along when the event carries one). */
  var gS = 1;
  wrap.addEventListener('gesturestart', function (e) { e.preventDefault(); gS = scale; });
  wrap.addEventListener('gesturechange', function (e) {
    e.preventDefault();
    if (!e.scale) return;
    var fx = null, fy2 = null;
    if (typeof e.clientX === 'number' && wrap.clientWidth) {
      var r = wrap.getBoundingClientRect();
      fx = (e.clientX - r.left) / wrap.clientWidth;
      fy2 = (e.clientY - r.top) / wrap.clientHeight;
    }
    applyScale(gS * e.scale, fx, fy2);
  });
  wrap.addEventListener('gestureend', function (e) { e.preventDefault(); });
}

function openPhotoViewer(p, onDelete, ro) {
  var when = '';
  try { when = new Date(p.createdAt).toLocaleString(); } catch (e) { /* noop */ }
  showModal('<img src="' + photoURL(p) + '" style="width:100%;border-radius:8px" alt="Photo">' +
    (when ? '<div class="dim" style="margin-top:6px;text-align:center">' + esc(when) + '</div>' : '') +
    '<div class="btn-row" style="margin-top:10px">' +
    (ro ? '' : '<button class="btn-danger" id="m-ph-del" type="button">Delete</button>') +
    '<button class="btn-secondary" id="m-ph-save" type="button">Save Photo</button>' +
    '<button class="btn-secondary" id="m-close" type="button">Close</button></div>');
  wirePhotoZoom($('modal-card')); /* Q241: pinch-to-zoom */
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

/* fy: trip photos have called openFullPhoto(blob) since Q163, but the
   function itself was lost in an earlier refactor — those taps did nothing.
   Full-size in the app modal, zoom wired, Save Photo like every other
   viewer (better than the old open-in-a-new-tab intent). */
function openFullPhoto(blob) {
  if (!blob) return;
  var url = URL.createObjectURL(blob);
  showModal('<img src="' + url + '" style="width:100%;border-radius:8px" alt="Photo">' +
    '<div class="btn-row" style="margin-top:10px">' +
    '<button class="btn-secondary" id="m-ph-save" type="button">Save Photo</button>' +
    '<button class="btn-secondary" id="m-close" type="button">Close</button></div>');
  wirePhotoZoom($('modal-card')); /* Q241/fy: pinch-to-zoom */
  $('m-close').onclick = function () { URL.revokeObjectURL(url); closeModal(); };
  $('m-ph-save').onclick = function () { sharePhotoFile(blob, 'opossum-foot-photo'); };
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
    /* Q179 (2026-10-08): Tanner — no "No memos yet." placeholder. Empty is
       implied; the list simply appears below the Record button when memos
       exist. */
    if (!memos.length) { box.innerHTML = ''; return; }
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
/* Q174 (2026-10-08): multi-select checklist sheets — which dimension's sheet
   is open (null when closed). */
var msOpenKey = null;
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
var STATUS_VALUES = ['active', 'sprung', 'pulled', 'missing', 'prospect'];
var STATUS_LABELS = { active: 'Active', sprung: 'Sprung', pulled: 'Pulled', missing: 'Missing', prospect: 'Prospect' };
function statusLabel(v) { return STATUS_LABELS[normStatus(v)] || 'Missing'; }
/* Map any saved status value onto the canonical four. Legacy/unknown
   values are never dropped — they land in the closest bucket. */
function normStatus(v) {
  var s = (v === null || v === undefined) ? '' : String(v).toLowerCase().trim();
  if (s === 'active' || s === 'sprung' || s === 'pulled' || s === 'missing' || s === 'prospect') return s;
  if (s === 'scouted' || s === 'scouted spot' || s === 'staked') return 'prospect'; /* Q189 aliases */
  if (s === 'other') return 'missing'; /* 'Other' renamed to 'Missing' 2026-09-27 — same bucket */
  if (s === 'fresh') return 'active'; /* Fresh retired in build at — old Fresh sets read as Active */
  if (s === 'set' || s === 'live' || s === 'open' || s === 'working') return 'active';
  if (s === 'new' || s === 'just set' || s === 'just-set' || s === 'freshly set') return 'active';
  if (s === 'tripped' || s === 'fired' || s === 'sprung-empty' || s === 'sprung empty' || s === 'empty') return 'sprung';
  if (s === 'removed' || s === 'inactive' || s === 'closed' || s === 'retired' || s === 'gone') return 'pulled';
  if (s === '') return 'active'; /* pre-status sets defaulted to active */
  return 'missing'; /* unknown values land in the catch-all */
}
/* Q229 (2026-11-05, Tanner): the date a set went active. A move TO Active
   restarts the set date — the day it goes active is day one, whether it was
   a prospect, a sprung set or a pulled one. Anything else keeps the stored
   date, and a set that stays Active keeps its date. Pure: no DOM, no Store. */
function activeDateFor(oldStatus, newStatus, currentDate, today) {
  if (normStatus(newStatus) === 'active' && normStatus(oldStatus) !== 'active') return today;
  return currentDate;
}
/* Map-view status filters: independent multi-select toggles. Several can be
   on at once; a set shows when its current status is toggled on. */
var mapStatusFilter = { active: true, sprung: true, pulled: true, missing: true, prospect: true };
/* Q145 — pin color schemes (Lydia's ask, Tanner approved 2026-10-02).
   Earthy is the default. Every scheme keeps the same hue→status mapping
   (greenish=Active, goldish=Sprung, grayish=Pulled, blueish=Missing) so the
   status language survives. Colors live in CSS vars; JS only flips
   body[data-pinscheme] and persists the choice in Store.data (rides backup). */
var PIN_SCHEMES = [
  { id: 'earthy', name: 'Earthy', colors: { active:'#7fa650', sprung:'#d19a2f', pulled:'#7d7663', missing:'#5b8dd9', prospect:'#7a5fa0' } },
  { id: 'classic', name: 'Classic', colors: { active:'#4caf50', sprung:'#d19a2f', pulled:'#8a8a8a', missing:'#3b82f6', prospect:'#7e57c2' } },
  { id: 'bold', name: 'Bold', colors: { active:'#2ecc40', sprung:'#f5a623', pulled:'#a8a8a8', missing:'#2f7bff', prospect:'#9b59b6' } },
  { id: 'pastel', name: 'Pastel', colors: { active:'#a9d6a5', sprung:'#eacd7d', pulled:'#c9c9c9', missing:'#a9c6f2', prospect:'#c3a6dd' } }
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
    var dots = ['active', 'sprung', 'pulled', 'missing', 'prospect'].map(function (k) {
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
/* Q190/Show (2026-10-18, Tanner's design): the four status chips became ONE
   "Show" button opening a checklist sheet ("Show on map"). The label names
   what's on — each status in its pin color with its live count, plus Sign
   by name when any sign family is on — and each sheet line carries its
   pin-color dot as the key. The model persists in Store.data.mapShow;
   mapStatusFilter mirrors the set statuses for the existing readers, and
   Markers reads the same model. */
function showModel() {
  var d = Store.data || {};
  if (!d.mapShow) d.mapShow = {};
  var m = d.mapShow;
  STATUS_VALUES.forEach(function (k) { if (m[k] === undefined) m[k] = true; });
  if (!m.fam) m.fam = {};
  ['homes', 'ground', 'tree', 'feeding', 'scent', 'forage'].forEach(function (k) { if (m.fam[k] === undefined) m.fam[k] = true; });
  STATUS_VALUES.forEach(function (k) { mapStatusFilter[k] = m[k] !== false; });
  return m;
}
function saveShowModel() {
  /* The model is the source of truth; showModel() syncs mapStatusFilter
     from it. Writers set model values first, then call this. */
  showModel();
  Store.save();
}
/* fv (2026-11-14, Tanner's redundancy audit): the Show sheet applies LIVE —
   a checkbox tap writes straight to the live model, saves, and repaints the
   map and the Show pill behind the sheet. The Q193 draft is gone (Done went
   with it; the X just closes), the same live-apply the Filter sheet already
   had. applyShowChange() is the one place a Show toggle lands. */
function applyShowChange() {
  saveShowModel();
  renderShowButton();
  refreshMarkers();
  if (window.Markers) Markers.render();
  afterShowToggle();
}
function lighten(hex, amt) {
  var n = parseInt(String(hex).replace('#', ''), 16);
  if (isNaN(n)) return hex;
  var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.round(r + (255 - r) * amt); g = Math.round(g + (255 - g) * amt); b = Math.round(b + (255 - b) * amt);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}
var SHOW_FAM_TINTS = { homes: '#c9a06a', ground: '#a8bf6f', tree: '#7fae5c', feeding: '#cf9455', scent: '#b48ec7', forage: '#e5c15c' };
function showGroups() {
  var m = showModel();
  var groups = STATUS_VALUES.map(function (v) { return { key: v, label: STATUS_LABELS[v], on: m[v] !== false, color: pinSchemeById(pinSchemeId()).colors[v] }; });
  var anyFam = ['homes', 'ground', 'tree', 'feeding', 'scent', 'forage'].some(function (k) { return m.fam[k] !== false; });
  groups.push({ key: 'sign', label: 'Sign', on: anyFam, color: '#f0d28a' });
  return groups;
}
  /* Q232 (2026-11-06): the pill carries the live counts on the active line.
   One status on: "Show: 18 Sprung" (count first, Tanner's wording). Two or
   more on: each status with its count, "Sprung 18 · Active 16" — a quick
   reference, and the Select all button is gone (bulk needs one status).
   Nothing on shows Sign if its families are on, else None. The Sign layer
   rides by NAME only, never a count (Tanner, 2026-11-06: sign is 71
   mammal-sign kinds in 5 families plus 44 forage kinds — one number would
   mean nothing), always last, whenever any family is on. There is no
   "Show: All" anymore (Tanner, 2026-11-06) — all on lists everything: the
   five statuses with counts plus Sign. Sizes are measured (headless
   Chromium, DejaVu — SF Pro runs narrower): 1-2 items at 16px, 3-4 at
   14px, 5-6 at 11px — the six-item all-on list measures 317px at 11px
   against a 329px content box. The "Show: " prefix stays at 3 items or
   fewer and drops above that.
   Fix (Tanner's 06:51 field report, build fj): NO "N of 5" — all five
   statuses show with their counts, smaller, so the whole list fits. A bare
   <button> centers its text and clips both ends with no ellipsis (his
   screenshot: "v: Active 0 · Sprung 18 · Pulled 0 · Missi"), so the label
   rides in a .show-label span that shrink-to-fits, centers itself, and
   ellipsizes from the start if it ever overflows.
   Slim (Tanner, 2026-11-06): the pill was 70px tall while the text is
   18px — the app's 52px button touch-height was leaking in — so .show-btn
   sets min-height: 0 and the pill padding is 4px vertical, landing the
   pill near 33px tall (41px with the bulk button showing). */
function renderShowButton() {
  var btn = $('btn-show'); if (!btn || !Store.data) return;
  var m = showModel();
  var onStatus = STATUS_VALUES.filter(function (v) { return m[v] !== false; });
  var groups = showGroups();
  var signOn = groups.some(function (g) { return g.key === 'sign' && g.on; });
  var colors = pinSchemeById(pinSchemeId()).colors;
  var nameHtml = function (v) { return '<span style="color:' + lighten(colors[v], 0.38) + '">' + esc(STATUS_LABELS[v]) + '</span>'; };
  var countOf = function (v) {
    var n = 0;
    activeSets().forEach(function (s) { if (normStatus(s.status) === v) n++; });
    return n;
  };
  var signHtml = '<span style="color:#f0d28a">Sign</span>';
  var items = onStatus.length + (signOn ? 1 : 0);
  var size = 16, html;
  if (onStatus.length === 0) {
    html = signOn ? 'Show: <span style="color:#f5efdd">Sign</span>' : 'Show: <span style="color:#f5efdd">None</span>';
  }
  else if (onStatus.length === 1) html = 'Show: ' + countOf(onStatus[0]) + ' ' + nameHtml(onStatus[0]) + (signOn ? ' · ' + signHtml : '');
  else {
    /* hl (2026-11-20, Q242, Tanner): each status rides in a .show-part
       span that never breaks internally, so when the list outgrows one
       line the label wraps BETWEEN statuses into a second row instead
       of ellipsizing (his hk-check screenshot: "…Pulled 23 · Missi…",
       with Prospect and Sign never showing at all). */
    var parts = onStatus.map(function (v) { return '<span class="show-part">' + nameHtml(v) + ' <span style="color:#f5efdd">' + countOf(v) + '</span></span>'; });
    if (signOn) parts.push('<span class="show-part">' + signHtml + '</span>');
    size = items <= 2 ? 16 : (items <= 4 ? 14 : 11);
    html = items <= 3 ? 'Show: ' + parts.join(' · ') : parts.join(' · ');
  }
  btn.innerHTML = '<span class="show-label">' + html + '</span>';
  btn.style.fontSize = size + 'px';
}
var showSignOpen = false;
var showExpandedStatus = null; /* ft: which status group is expanded to its set names in the Show sheet (one at a time, null = none) */
/* ft (2026-11-14, Tanner): the sets on the active line in one status, names
   A–Z — the Show pill's list. Sorted case-insensitive so it reads the same
   as every other name list in the app. */
function showSetsFor(v) {
  return activeSets().filter(function (s) { return normStatus(s.status) === v; })
    .sort(function (a, b) {
      var an = (a.name || '').toLowerCase(), bn = (b.name || '').toLowerCase();
      return an < bn ? -1 : (an > bn ? 1 : 0);
    });
}
/* ft2 (2026-11-14, Tanner, after trying ft): the jump lands on the MAP, not
   the detail. Tap a name and the map flies to that set — then he taps the
   pin from there, and the detail opens with Edit this set / Log a catch.
   ft opened the detail straight away, so he never saw the set on the map.
   The pin has to be standing to tap it: if its status is filtered off, the
   jump switches it back on first (the Show pill shows it). */
function jumpToSet(id) {
  var s = getSet(id); if (!s) return;
  var st = normStatus(s.status);
  var m = showModel();
  if (m[st] === false) {
    m[st] = true;
    saveShowModel();
    renderShowButton();
    refreshMarkers();
    if (window.Markers) Markers.render();
    afterShowToggle();
  }
  /* he (2026-11-18, Tanner's field report on hd): an explicit jump takes
     the wheel, exactly as a drag does (hookFollowDrag → pauseFollow).
     While following, the follow watch (onFollowFix) and the Q234 guard
     both re-pan to his fix whenever the dot sits past the deadband —
     and a programmatic flyTo never fires dragstart, so the jump landed
     on the set and the next fix (or the next 4 s guard tick) snapped
     the map straight back to his position. Proven in the bench both
     ways before this fix. Pausing keeps the watch running (the dot
     stays live) and the crosshair tap resumes + re-centers, as with a
     drag pause. A pending acquire is cancelled for the same reason:
     its landing would setView to his fix and enter follow over the
     jump he just asked for. */
  if (locateState === 'following') pauseFollow();
  else if (locateState === 'acquiring') { stopLocateWatch(); setLocateSearching(false); locateState = 'idle'; }
  closeSheets();
  /* hi amendment (2026-11-19, Tanner, from the field with the Mapbox map
     live): the jump arrived too far out — Math.max(zoom, 14) stopped at
     14 from his usual working view, so he had to pinch in by hand after
     every pick. He ordered the jump to land at the crosshair's extent.
     The crosshair's rule (drawFix, final fix) is an absolute setView to
     19 — always 19, whether the view sits shallower or deeper — so the
     jump now flies to exactly 19 under the same rule. The flight itself
     stays animated; only the landing zoom changes. */
  if (map) map.flyTo([s.lat, s.lng], 19, { duration: 0.8 });
}
function renderShowList() {
  var host = $('show-list'); if (!host) return;
  var m = showModel();
  var famCount = function (fam) {
    if (!window.Markers || !window.SIGN_CATALOG) return '';
    var n = 0;
    if (fam === 'forage') n = FORAGE_CATALOG.length;
    else SIGN_CATALOG.forEach(function (e) { if (e.fam === fam) n++; });
    return ' <span class="show-count">' + n + ' kinds</span>';
  };
  /* Q216 (2026-10-26, Tanner approved the mockup "Perfect"): live count of
     the active line's sets beside each status, in the same .show-count
     style the sign families use for their "N kinds". */
  var statusCount = function (v) {
    var n = 0;
    activeSets().forEach(function (s) { if (normStatus(s.status) === v) n++; });
    return ' <span class="show-count">' + n + (n === 1 ? ' set' : ' sets') + '</span>';
  };
  /* ft (2026-11-14, Tanner): the Show pill is the set-name list he asked
     for. Each status row expands to that status's set names on this line,
     A–Z; tapping a name jumps the map to the set. The name is a button
     (expand); the checkbox still toggles the map filter. The row is a div
     now, not a label, so tapping the name expands instead of flipping the
     filter — the checkbox is the filter's only switch. */
  var html = STATUS_VALUES.map(function (v) {
    var c = pinSchemeById(pinSchemeId()).colors[v];
    var open = showExpandedStatus === v;
    var row = '<div class="show-row"><span class="show-dot" style="background:' + c + '"></span>' +
      '<button type="button" class="show-name-btn" data-show-expand="' + v + '" aria-expanded="' + open + '">' +
      '<span class="show-name">' + esc(STATUS_LABELS[v]) + statusCount(v) + '</span>' +
      '<span class="show-chev">' + (open ? '▾' : '▸') + '</span></button>' +
      '<input type="checkbox" data-show-status="' + v + '"' + (m[v] !== false ? ' checked' : '') + '></div>';
    if (open) {
      var names = showSetsFor(v);
      if (!names.length) {
        row += '<div class="show-names"><span class="dim show-noname">No sets</span></div>';
      } else {
        row += '<div class="show-names">' + names.map(function (s) {
          return '<button type="button" class="show-setname" data-jump-set="' + s.id + '">' +
            '<span class="show-setname-label">' + esc(s.name || 'Unnamed set') + '</span></button>';
        }).join('') + '</div>';
      }
    }
    return row;
  }).join('');
  var famKeys = ['homes', 'ground', 'tree', 'feeding', 'scent', 'forage'];
  var anyFam = famKeys.some(function (k) { return m.fam[k] !== false; });
  html += '<div class="show-row show-sign-head"><span class="show-dot" style="background:#f0d28a"></span>' +
    '<span class="show-name">Sign</span>' +
    '<button type="button" class="show-expand" id="show-sign-toggle" aria-label="Show sign families">' + (showSignOpen ? '▾' : '▸') + '</button>' +
    '<input type="checkbox" id="show-sign-all"' + (anyFam ? ' checked' : '') + '></div>';
  if (showSignOpen) {
    html += famKeys.map(function (k) {
      var label = k === 'forage' ? 'Forage & finds' : Markers.famLabel[k];
      return '<label class="show-row show-fam"><span class="show-dot" style="background:' + SHOW_FAM_TINTS[k] + '"></span>' +
        '<span class="show-name">' + esc(label) + famCount(k) + '</span>' +
        '<input type="checkbox" data-show-fam="' + k + '"' + (m.fam[k] !== false ? ' checked' : '') + '></label>';
    }).join('');
  }
  host.innerHTML = html;
  host.querySelectorAll('input[data-show-status]').forEach(function (cb) {
    cb.addEventListener('change', function () {
      showModel()[this.getAttribute('data-show-status')] = this.checked;
      applyShowChange();
    });
  });
  /* ft: the name button expands/collapses its status's set list; a set name
     jumps the map to that set. */
  host.querySelectorAll('[data-show-expand]').forEach(function (b) {
    b.addEventListener('click', function () {
      var v = this.getAttribute('data-show-expand');
      showExpandedStatus = (showExpandedStatus === v) ? null : v;
      renderShowList();
    });
  });
  /* hd (2026-11-18, Tanner — "We only want one door"): a name here JUMPS,
     in every mode. hc briefly made these names pick while selection mode
     was open; he superseded that the same evening — picking lives behind
     the selection bar's "Pick from list" button and its own sheet
     (renderPickList), never on the Show road. */
  host.querySelectorAll('[data-jump-set]').forEach(function (b) {
    b.addEventListener('click', function () {
      jumpToSet(this.getAttribute('data-jump-set'));
    });
  });
  host.querySelectorAll('input[data-show-fam]').forEach(function (cb) {
    cb.addEventListener('change', function () {
      showModel().fam[this.getAttribute('data-show-fam')] = this.checked;
      applyShowChange();
      renderShowList();
    });
  });
  var all = $('show-sign-all');
  if (all) all.addEventListener('change', function () {
    var mm = showModel();
    famKeys.forEach(function (k) { mm.fam[k] = all.checked; });
    applyShowChange();
    renderShowList();
  });
  var tg = $('show-sign-toggle');
  if (tg) tg.onclick = function () { showSignOpen = !showSignOpen; renderShowList(); };
}
function afterShowToggle() {
  /* Q168 (2026-10-07): if the route is up while he toggles, it redraws live. */
  if (typeof routeShownFor !== 'undefined' && routeShownFor &&
      typeof drawRouteEstimate === 'function') {
    var rl = routeShownFor;
    if (!drawRouteEstimate(rl)) toast('Not enough visible sets for a route.');
  }
  renderBulkBar(); /* Q229: the bar lives and dies with the Show filter */
}
function renderMapStatusFilters() {
  /* Legacy name kept for existing callers — now renders the Show button. */
  showModel();
  renderShowButton();
  var btn = $('btn-show');
  if (btn && !btn._wired) {
    btn._wired = true;
    btn.onclick = function () { showSignOpen = false; showExpandedStatus = null; renderShowList(); openSheet('sheet-show'); };
  }
  var bulkBtn = $('btn-bulk');
  if (bulkBtn && !bulkBtn._wired) {
    bulkBtn._wired = true;
    bulkBtn.onclick = function () {
      /* hj (2026-11-19, Tanner): the button (renamed "Pick sets" — see
         renderBulkBar) enters selection mode DIRECTLY. The menu that
         used to intercept this tap (openBulkActions) is removed
         entirely; the bulk operations live in the selection bar's
         Actions sheet, aimed at the picked sets. */
      bulkSelCtx = null; /* a fresh pick aims at no frozen bulk flow */
      enterSelMode();
    };
  }
  wireSelBar(); /* gz: the selection bar's buttons, wired once */
  renderBulkBar();
}
/* Q229 (2026-11-05, Tanner; widened same day on the ff check): bulk status
   change. When the Show filter is narrowed to ANY one status, the Show pill
   offers Actions on this line (Q232 moved it out of the bottom bar and
   into the pill; Q237 dropped the Select-all step, so one tap opens the
   menu), then a confirm naming count, line, from ->
   to and the date rule. The picker offers every status except the one
   you're coming from and except Missing as a target — Missing needs a
   reason per set (Q35), Confiscated needs details per set, so it stays
   one-at-a-time. Leaving Missing in bulk clears the reason/detail, like the
   Edit save does. Scope is the active line only. */
var bulkSelected = false;
function bulkFilterStatus() {
  var m = showModel();
  var on = STATUS_VALUES.filter(function (k) { return m[k] !== false; });
  return on.length === 1 ? on[0] : null;
}
function bulkFilteredSets() {
  var st = bulkFilterStatus();
  if (!st) return [];
  var lid = activeLineId();
  return ((Store.data && Store.data.sets) || []).filter(function (s) { return s.lineId === lid && normStatus(s.status) === st; });
}
/* he (2026-11-18): every set the Show filter is currently showing on the
   active line — any status on. bulkFilteredSets() is the single-status
   special case of this; the pill button's reachability (below) is
   measured against this wider set. */
function shownLineSets() {
  var m = showModel();
  var lid = activeLineId();
  return ((Store.data && Store.data.sets) || []).filter(function (s) {
    return s.lineId === lid && m[normStatus(s.status)] !== false;
  });
}
/* gz (2026-11-18, Tanner): SET-SELECTION MODE. The Actions menu's bulk
   operations take everything the narrowed Show filter holds; Tanner's
   line doesn't sort that way — 12 dog-proof sets sharing one bait and one
   lure can stand among 14 other varieties, and he needs to grab JUST the
   12 and Edit all of them the same. "Select sets" in the Actions menu
   enters this mode: tap pins to pick (tap again to unpick; a stack opens
   its list and each row toggles), the selection bar counts live and
   carries the same three bulk operations retargeted at the selection,
   plus Select all shown / Clear / Done. (he, 2026-11-18: the bar itself
   was slimmed to one row — count, Pick from list, Actions, Done — and
   the five operations re-homed into the Actions sheet; see
   openSelActions.) Session state only — nothing is
   persisted, no stored keys, no data-model change. While a bulk flow
   launched from the bar is open, bulkSelCtx freezes the picked ids so
   every step of the flow (picker, confirm, apply) aims at the same sets;
   the classic flows read bulkFlowSets(), which is bulkFilteredSets()
   untouched whenever no selection flow is in flight. A completed
   operation exits the mode and clears the pick; Done exits changing
   nothing. Entering any editor or picking mode (cancelAllMapModes)
   also ends it, and switching lines ends it — a pick belongs to the
   line and filter it was made on. */
var selMode = false;
var selIds = {};
/* gy: the entry hint lived until the session's first pick. hf
   (2026-11-18, Tanner): the hint grows a SECOND stage — the first
   pick swaps its text instead of retiring it, and it then lives
   until the Actions sheet first opens. selHintPicked marks stage 2
   reached (sticky for the session, Clear-proof); selHintDone marks
   the retirement (also sticky). enterSelMode resets both. */
var SEL_HINT_STAGE1 = 'Tap sets on the map to pick them, or use Pick from list.';
var SEL_HINT_STAGE2 = 'Now tap Actions to change the picked sets together.';
var selHintPicked = false;
var selHintDone = false;
var bulkSelCtx = null;
function selCount() { return Object.keys(selIds).length; }
function bulkFlowSets() {
  if (bulkSelCtx) {
    return ((Store.data && Store.data.sets) || []).filter(function (s) { return bulkSelCtx.ids[s.id]; });
  }
  return bulkFilteredSets();
}
function enterSelMode() {
  if (selMode) return;
  /* Unavailable while an editor or a placement owns the map — the same
     guards the pin taps themselves answer to. */
  if (document.body.classList.contains('editor-lock') || document.body.classList.contains('placing') || measureMode) return;
  selMode = true;
  selIds = {};
  selHintPicked = false; /* hf: a fresh session starts at stage 1 again */
  selHintDone = false;
  document.body.classList.add('sel-mode');
  renderSelBar();
  renderBulkBar(); /* hides the Actions button — the bar replaces it */
  /* B13's lesson, gz's miss: the bar is a flex sibling, so showing it
     shrinks the map container — but Leaflet caches its size, so without
     a re-measure the pins keep the stale geometry and the far ones land
     outside the shrunken pane, untappable. Re-measure first. */
  if (map) map.invalidateSize();
  refreshMarkers();
  toast('Tap pins to select sets.');
}
function exitSelMode() {
  if (!selMode && !bulkSelCtx) return;
  selMode = false;
  selIds = {};
  bulkSelCtx = null;
  document.body.classList.remove('sel-mode');
  renderSelBar();
  renderBulkBar();
  if (map) map.invalidateSize(); /* the bar hid — the map grew back (B13) */
  refreshMarkers();
}
function renderSelBar() {
  var bar = $('sel-bar'); if (!bar) return;
  bar.classList.toggle('show', selMode);
  var hint = $('sel-hint');
  if (!selMode) { if (hint) hint.classList.remove('show'); return; }
  $('sel-bar-count').textContent = selCount() + ' selected';
  /* he: the bar carries no operation buttons anymore (they live in the
     Actions sheet, openSelActions) — the 0-picked disablement is applied
     there, at open time, where the rows are rendered.
     hj (2026-11-19, Tanner — picking splits from acting): the
     disablement moves onto the bar's Actions button itself. At 0
     picked it is disabled — the house dress dims it (button:disabled)
     and a tap opens nothing; the first pick by ANY door (pin tap,
     list circle, per-status Select all, Select all shown) lands
     through this render and lights it, the same moment the hint
     reaches stage 2; back at 0 (Clear, or the last set unpicked) it
     dims again. */
  var ab = $('btn-sel-actions');
  if (ab) ab.disabled = selCount() === 0;
  /* gy (2026-11-18, Tanner — "hint line until the first pick"): a slim
     entry hint under the bar. hf (same night, Tanner): the hint is now
     TWO stages. Stage 1 (nothing picked yet this session) reads
     SEL_HINT_STAGE1. The first pick — pin, picker, Select all shown,
     all of them land here through renderSelBar — does NOT retire it:
     the text swaps to SEL_HINT_STAGE2, pointing at the Actions sheet,
     and stage 2 persists for the rest of the session, even if the
     picks are Cleared back to zero (its advice is the point of the
     mode). Opening the Actions sheet (openSelActions) retires the
     hint for good that session. The text swap changes no geometry
     (one line either way); only a visibility flip re-measures the
     map — the hint is a flex sibling like the bar (the B13 lesson). */
  if (hint) {
    if (selCount() > 0) selHintPicked = true;
    var want = !selHintDone;
    var txt = selHintPicked ? SEL_HINT_STAGE2 : SEL_HINT_STAGE1;
    if (hint.textContent !== txt) hint.textContent = txt;
    if (want !== hint.classList.contains('show')) {
      hint.classList.toggle('show', want);
      if (map) map.invalidateSize();
    }
  }
}
function toggleSel(id) {
  if (selIds[id]) delete selIds[id]; else selIds[id] = true;
  refreshMarkers(); /* re-renders the pins with/without the gold ring */
  renderSelBar();
}
function selTapSet(id) {
  var s = getSet(id); if (!s) return;
  var stack = setsAtSpot(s.lat, s.lng);
  if (stack.length >= 2) { openSelStack(stack); return; }
  toggleSel(id);
}
/* The stack list in selection dress: same sheet, same rows, each row
   carrying its picked state; tapping a row toggles it and the list
   re-renders in place — no set detail sheet opens in this mode. */
function openSelStack(stack) {
  stack = stack.slice().sort(function (a, b) { return a.name < b.name ? -1 : 1; });
  $('stack-title').textContent = stack.length + ' sets at this spot';
  $('stack-list').innerHTML = stack.map(function (x) {
    var st = normStatus(x.status);
    var on = !!selIds[x.id];
    return '<button type="button" class="stack-row' + (on ? ' stack-row-sel' : '') + '" data-stack-id="' + x.id + '">' +
      '<span class="stack-check">' + (on ? '✓' : '') + '</span>' +
      '<span class="stack-name">' + esc(x.name) + '</span>' +
      '<span class="badge status-' + esc(st) + '">' + esc(statusLabel(st)) + '</span>' +
      '<span class="dim">' + esc(x.trapType || '—') + '</span></button>';
  }).join('');
  openSheet('sheet-stackmenu');
}
/* Launch one of the existing bulk flows at the frozen pick. */
function selLaunch(fn) {
  if (!selCount()) return;
  var ids = {};
  Object.keys(selIds).forEach(function (k) { ids[k] = true; });
  bulkSelCtx = { ids: ids };
  fn();
}
/* hd (2026-11-18, Tanner): picking gets ONE door — this sheet, opened
   only by the selection bar's "Pick from list" button. hc had hung the
   picker on the Show sheet's list (the road in ran through the Show
   pill); he found it, called it confusing, and then ruled the Show road
   back to jumping in every mode. So the picker is its own sheet: the
   same grouped list (statuses of the active line, one expanded at a
   time, names A–Z, every status shown whatever the Show filter says),
   the same dress (hc's gold tint + check circle, the stack rows'
   family), and the marks rendered from selIds on every render — the
   one selection the pins also write to, so a pick made by either road
   shows on both. A name tap here toggles and re-renders in place: no
   map flight, no detail sheet, and the mode and its count wait behind
   the sheet untouched. The Sign families stay on the Show sheet — this
   list is for sets. */
var pickExpandedStatuses = new Set(); /* which status groups are expanded here */
/* hk (2026-11-19, Tanner): the groups stay open together now. hj's
   one-at-a-time accordion (the hd note above) made "see them all"
   impossible on a real line — opening Pulled folded Active shut — so
   the single pickExpandedStatus became a set: tapping a header joins
   or leaves the open set and every other group stays as it is. The
   sheet still opens with every group closed, as hj did. The Show
   sheet keeps its own one-at-a-time accordion (showExpandedStatus) —
   untouched. */
function renderPickList() {
  var host = $('pick-list'); if (!host) return;
  var statusCount = function (v) {
    var n = 0;
    activeSets().forEach(function (s) { if (normStatus(s.status) === v) n++; });
    return ' <span class="show-count">' + n + (n === 1 ? ' set' : ' sets') + '</span>';
  };
  /* hp (Q268, Tanner 2026-11-21): the "Select all shown" row that rode
     at the TOP of this sheet since hj is REMOVED at his ruling — each
     status group carries its own Select all / Clear all, and the
     sheet's Clear empties the whole pick, so the cross-group row was
     one control too many. Picking is group by group now. */
  host.innerHTML = STATUS_VALUES.map(function (v) {
    var c = pinSchemeById(pinSchemeId()).colors[v];
    var open = pickExpandedStatuses.has(v);
    var row = '<div class="show-row"><span class="show-dot" style="background:' + c + '"></span>' +
      '<button type="button" class="show-name-btn" data-pick-expand="' + v + '" aria-expanded="' + open + '">' +
      '<span class="show-name">' + esc(STATUS_LABELS[v]) + statusCount(v) + '</span>' +
      '<span class="show-chev">' + (open ? '▾' : '▸') + '</span></button></div>';
    if (open) {
      var names = showSetsFor(v);
      if (!names.length) {
        row += '<div class="show-names"><span class="dim show-noname">No sets</span></div>';
      } else {
        /* hj (2026-11-19, Tanner): directly under the status header, a
           Select all for the group — one tap picks every set the sheet
           lists under the status; once the whole group is picked the
           same control reads Clear all and lets just that group go.
           It wears a setname row's dress and size; the picked dress
           (gold tint + filled check) is the group's all-picked state,
           the same signal a picked row gives. */
        var allPicked = names.every(function (s) { return !!selIds[s.id]; });
        row += '<div class="show-names">' +
          '<button type="button" class="show-setname show-setname-pick show-pickall' + (allPicked ? ' show-setname-sel' : '') + '" data-pick-all="' + v + '">' +
          '<span class="show-setcheck">' + (allPicked ? '✓' : '') + '</span>' +
          '<span class="show-setname-label">' + (allPicked ? 'Clear all' : 'Select all') + '</span></button>' +
          names.map(function (s) {
          var picked = !!selIds[s.id];
          return '<button type="button" class="show-setname show-setname-pick' + (picked ? ' show-setname-sel' : '') + '" data-pick-set="' + s.id + '">' +
            '<span class="show-setcheck">' + (picked ? '✓' : '') + '</span>' +
            '<span class="show-setname-label">' + esc(s.name || 'Unnamed set') + '</span></button>';
        }).join('') + '</div>';
      }
    }
    return row;
  }).join('');
  host.querySelectorAll('[data-pick-expand]').forEach(function (b) {
    b.addEventListener('click', function () {
      var v = this.getAttribute('data-pick-expand');
      if (pickExpandedStatuses.has(v)) pickExpandedStatuses.delete(v); else pickExpandedStatuses.add(v);
      renderPickList();
    });
  });
  host.querySelectorAll('[data-pick-set]').forEach(function (b) {
    b.addEventListener('click', function () {
      toggleSel(this.getAttribute('data-pick-set'));
      renderPickList();
    });
  });
  host.querySelectorAll('[data-pick-all]').forEach(function (b) {
    b.addEventListener('click', function () {
      togglePickGroup(this.getAttribute('data-pick-all'));
      renderPickList();
    });
  });
}
/* hj (2026-11-19, Tanner): the pick list's per-status Select all. It
   writes the same selIds the name taps and pin taps write — only the
   sets this sheet lists for the current line under that one status —
   and lands through the same refreshMarkers + renderSelBar a single
   toggle lands through, so the count, the pins' gold rings and the
   two-stage hint move exactly as they do for manual picks. A group
   only partly picked completes; a group fully picked clears, and
   only that group. */
function togglePickGroup(v) {
  var names = showSetsFor(v);
  if (!names.length) return;
  var allPicked = names.every(function (s) { return !!selIds[s.id]; });
  names.forEach(function (s) {
    if (allPicked) delete selIds[s.id]; else selIds[s.id] = true;
  });
  refreshMarkers();
  renderSelBar();
}
function openSelPickList() {
  pickExpandedStatuses = new Set();
  renderPickList();
  /* gy (2026-11-18, Tanner's field report on hd — "there is no 'OK'
     button, you just have to X out"): the sheet carries a plain Done in
     its footer. A pure close — the identical end state the X gives
     (closeSheets): picks are already live in selIds, the mode persists.
     The label is plain "Done" at all times (Tanner's final ruling). */
  $('btn-pick-done').onclick = function () { closeSheets(); };
  /* hj: Clear — the picking tool that moved out of the Actions sheet.
     Empties every pick (selClearSelection lands through renderSelBar,
     so the bar count falls and its Actions dims again) and the list
     re-renders in place, marks gone; the sheet stays open. */
  $('btn-pick-clear').onclick = function () { selClearSelection(); renderPickList(); };
  openSheet('sheet-picklist');
}
/* he (2026-11-18, Tanner — the hd bar was "really busy"): the selection
   bar is slimmed to one row — the count, Pick from list, Actions, Done —
   and the five operations move into an Actions sheet wearing the same
   standard sheet treatment as the bulk Actions menu (gx). A re-homing,
   not a behavior change: every row runs the identical handler the bar
   button ran (the three bulk flows through selLaunch, Select all shown
   and Clear through the two functions below), and the three bulk rows
   render disabled at 0 picked, exactly as the bar disabled them.
   hj (2026-11-19, Tanner): the split is completed — Select all shown
   and Clear LEAVE this sheet for the Pick sets sheet (they pick; this
   sheet acts), leaving only Change status / Edit all / Delete all
   over the Cancel row. The 0-picked disablement moved to the bar's
   Actions button (renderSelBar), so the sheet can no longer open at
   0 picked and its rows no longer need the disabled dress. */
function selClearSelection() {
  selIds = {};
  refreshMarkers();
  renderSelBar();
}
function openSelActions() {
  if (!selMode) return;
  if (selCount() === 0) return; /* hj: at 0 picked the bar button is inert; this is the same wall behind it */
  selHintDone = true; /* hf: opening Actions retires the hint for the session */
  renderSelBar();
  showModal('<div id="sa-body"></div>');
  $('modal').classList.add('sheet-dress'); /* gx: standard sheet dress for the bulk family */
  renderSelActions();
}
/* ho (2026-11-21, Q253, Tanner): the Actions sheet names what is picked —
   left-aligned under the count, scrollable when long — and tapping a name
   UNPICKS that set: count, selection bar, map pin and the Pick-from-list
   row all move together because every surface reads the one selIds state.
   The list only subtracts; adding still happens solely through Pick from
   list and the map. At 0 picked the action buttons go dim and inert (the
   hj rule), with the sheet left open so the state is plain to see. */
function renderSelActions() {
  var host = $('sa-body'); if (!host) return;
  var n = selCount();
  var picked = activeSets().filter(function (s) { return !!selIds[s.id]; });
  host.innerHTML = '<h3>' + n + ' selected</h3>' +
    (picked.length ? '<div class="sel-names">' + picked.map(function (s) {
      return '<button type="button" class="sel-name-row" data-unpick="' + s.id + '"><span>' + esc(s.name || 'Unnamed set') + '</span><span class="sel-name-x">✕</span></button>';
    }).join('') + '</div>' : '<p class="dim">Nothing picked. Pick sets from the list or the map.</p>') +
    '<div class="sheet-actions">' +
    '<button type="button" class="btn-secondary" id="sa-status"' + (n ? '' : ' disabled') + '>Change status</button>' +
    '<button type="button" class="btn-secondary" id="sa-edit"' + (n ? '' : ' disabled') + '>Edit all</button>' +
    '<button type="button" class="btn-danger" id="sa-delete"' + (n ? '' : ' disabled') + '>Delete all</button></div>' +
    '<div class="btn-row" style="margin-top:14px"><button class="btn-secondary" id="m-cancel" type="button">Cancel</button></div>';
  host.querySelectorAll('[data-unpick]').forEach(function (b) {
    b.addEventListener('click', function () {
      toggleSel(this.getAttribute('data-unpick'));
      renderSelActions();
      renderPickList(); /* the pick sheet behind reads the same state */
    });
  });
  $('m-cancel').onclick = function () { closeModal(); };
  if (n) {
    $('sa-status').onclick = function () { closeModal(); selLaunch(openBulkStatusPicker); };
    $('sa-edit').onclick = function () { closeModal(); selLaunch(openBulkEdit); };
    $('sa-delete').onclick = function () { closeModal(); selLaunch(openBulkDeleteConfirm); };
  }
}
function wireSelBar() {
  var bar = $('sel-bar');
  if (!bar || bar._wired) return;
  bar._wired = true;
  $('btn-sel-picklist').onclick = function () { openSelPickList(); };
  $('btn-sel-actions').onclick = function () { openSelActions(); };
  $('btn-sel-done').onclick = function () { exitSelMode(); };
}
/* Q232 (2026-11-06): the bulk bar is gone — the control lives in the Show
   pill. renderBulkBar now only drives the pill's gold button: it shows when
   the filter is narrowed to ANY one status with sets on this line and reads
   "Actions" (Q237, 2026-11-07: one tap opens the menu — the Select-all step
   is gone). Two or more statuses on, or none, and the button is gone — bulk
   needs one status. The count itself lives in renderShowButton, refreshed
   here and on every marker refresh. bulkSelected is vestigial — the bulk
   actions reset it after they run, but nothing reads it for the label/flow
   anymore.
   he (2026-11-18, Tanner's field report on hd — "my button on the top is
   gone", pill reading "Active 34 · Pulled 23"): gz moved selection mode's
   only door INTO this button's menu, so fi's hide rule stranded it — with
   2+ statuses on there was no way into Select sets / Pick from list at
   all. The button now shows whenever at least one status with sets is
   showing on the active line; with 2+ on, its menu offers the Select sets
   door only (openBulkActions) — the classic bulk ops still aim at one
   status, and there is still no multi-status Select all (fi's intent).
   Hidden only when nothing is showing, and while selection mode owns the
   bar (gz, below).
   hj (2026-11-19, Tanner): the button is renamed and its menu is gone.
   It reads "Pick sets" now, and one tap enters selection mode
   directly — no "N sets showing / Select sets / Cancel" prompt (the
   2+ branch) and no classic bulk menu (the one-status branch) in
   between. The three bulk operations live where he put them in he:
   the selection bar's Actions sheet, aimed at the picked sets through
   selLaunch ("Select all shown" there reproduces the old filter-wide
   aim). "Actions" survives only on that bar button — the one the
   two-stage hint names. */
function renderBulkBar() {
  var btn = $('btn-bulk');
  if (!btn) return;
  /* gz: while selection mode owns the bulk work, the Pick sets button
     rests — the selection bar is the bulk control until Done. */
  if (selMode) { btn.hidden = true; renderShowButton(); return; }
  var st = bulkFilterStatus();
  var sets = st ? bulkFilteredSets() : shownLineSets();
  if (!sets.length) {
    btn.hidden = true;
    bulkSelected = false;
  } else {
    btn.hidden = false;
    btn.textContent = 'Pick sets'; /* hj: renamed from Actions (Q237) — it is the picking door; the bar's Actions keeps the name alone */
  }
  renderShowButton();
}
/* hj (2026-11-19, Tanner): openBulkActions is REMOVED — the whole menu,
   both branches. It was the intermediate prompt on the counts-bar
   button's road: "N sets showing / Select sets / Cancel" with 2+
   statuses on, and the classic bulk menu ("N sets selected": Change
   status / Edit all / Select sets / Delete all) with one status on.
   The button — renamed "Pick sets" — now enters selection mode
   directly (see renderMapStatusFilters), and the three bulk
   operations live in the selection bar's Actions sheet, aimed at the
   picked sets through selLaunch. The flows themselves
   (openBulkStatusPicker / openBulkEdit / openBulkDeleteConfirm,
   below) are unchanged and still read bulkFlowSets(). */
/* Q232: Edit all — one menu with ALL the shared fields, so the sets can all
   be changed to look the same in one pass. Options come from the app's own
   lists: set-type foundations (+ his remembered customs), all trap types
   (+ customs), and his remembered attractant values (Q11). Only fields that
   are toggled on are offered (visual has no toggle — always on). Every
   field starts at "(no change)": a field left alone keeps each set's own
   value, never blanked.
   hp (Q269, Tanner 2026-11-21): the fields are the SAME type-to-filter
   combos as the normal set form — tap opens the full list, typing
   filters, typed text becomes the value and is remembered. Attractant
   lists are the normal form's lists too: the sponsor products plus his
   remembered entries, not remembered entries alone. "(no change)" is
   the pinned top row (empty value), exactly the bulk editor's standing
   leave-alone rule. */
function bulkEditOptions() {
  var out = [];
  if (setFieldOn('settype')) {
    var stOpts = [];
    ['Land', 'Water'].forEach(function (g) {
      SET_FOUNDATIONS[g].forEach(function (t) { stOpts.push(t); });
    });
    customOptionsFor('sf-settype').forEach(function (t) {
      if (stOpts.indexOf(t) === -1) stOpts.push(t);
    });
    /* ft (2026-11-14, Tanner): the Edit-all set-type list sorts A–Z too,
       same as the form picker — one rule everywhere. */
    stOpts.sort(function (a, b) {
      var al = a.toLowerCase(), bl = b.toLowerCase();
      return al < bl ? -1 : (al > bl ? 1 : 0);
    });
    out.push({ field: 'setType', label: 'Set type', options: stOpts });
  }
  if (setFieldOn('traptype')) {
    var ttOpts = ALL_TRAP_TYPES.slice();
    customOptionsFor('sf-type').forEach(function (t) {
      if (ttOpts.indexOf(t) === -1) ttOpts.push(t);
    });
    out.push({ field: 'trapType', label: 'Trap type', options: ttOpts });
  }
  /* hp (Q269): attractant options = the normal form's lists — sponsor
     products for the section plus his remembered entries, one A–Z run. */
  var attrOptions = function (key) {
    var seen = {}, list = [];
    sponsorSuggests(key, '').forEach(function (p) {
      var k = p.name.toLowerCase();
      if (!seen[k]) { seen[k] = 1; list.push(p.name); }
    });
    savedEntries(key).forEach(function (v) {
      var k = String(v).toLowerCase();
      if (!seen[k]) { seen[k] = 1; list.push(v); }
    });
    list.sort(function (a, b) {
      var al = String(a).toLowerCase(), bl = String(b).toLowerCase();
      return al < bl ? -1 : (al > bl ? 1 : 0);
    });
    return list;
  };
  [['bait', 'Bait'], ['lure', 'Lure'], ['urine', 'Urine']].forEach(function (pair) {
    if (!setFieldOn(pair[0])) return;
    out.push({ field: pair[0], label: pair[1], options: attrOptions(pair[0]) });
  });
  out.push({ field: 'visual', label: 'Visual', options: attrOptions('visual') });
  return out;
}
function openBulkEdit() {
  var sets = bulkFlowSets(); /* gz: the frozen pick when launched from the selection bar */
  if (!sets.length) { renderBulkBar(); return; }
  var fields = bulkEditOptions();
  var rows = fields.map(function (f) {
    /* hp (Q269): combo fields, built like the normal form's — an input
       plus its suggestion box inside the row's label. */
    return '<label class="bulk-edit-row">' + esc(f.label) +
      '<input type="text" id="be-' + f.field + '" autocomplete="off" placeholder="(no change)">' +
      '<div class="suggest" id="be-' + f.field + '-suggest"></div></label>';
  }).join('');
  showModal('<h3>Edit all ' + sets.length + ' sets</h3>' +
    '<p>Set as many fields as you want — fields you leave alone stay as they are on each set. Bait, lure, urine and visual are added to what each set already has — never taken away.</p>' + rows +
    '<div class="btn-row" style="margin-top:14px"><button class="btn-secondary" id="m-cancel" type="button">Cancel</button>' +
    '<button class="btn-primary" id="m-ok" type="button">Review changes</button></div>');
  $('modal').classList.add('sheet-dress'); /* gx: standard sheet dress for the bulk family */
  fields.forEach(function (f) {
    comboAttach('be-' + f.field, 'be-' + f.field + '-suggest',
      function () { return f.options; }, { noneLabel: '(no change)' });
  });
  $('m-cancel').onclick = function () { closeModal(); };
  $('m-ok').onclick = function () {
    var changes = [];
    fields.forEach(function (f) {
      var v = (($('be-' + f.field) || {}).value || '').trim();
      if (v && v !== '(no change)') changes.push({ field: f.field, label: f.label, value: v });
    });
    if (!changes.length) { closeModal(); toast('Nothing to change.'); return; }
    /* hp (Q269): a typed value is remembered exactly as the normal
       form remembers it — attractants into their entry lists, novel
       set/trap types into their custom lists. */
    changes.forEach(function (c) {
      if (c.field === 'setType') {
        if (allFoundationNames().indexOf(c.value) === -1) rememberCustomOption('sf-settype', c.value);
      } else if (c.field === 'trapType') {
        if (ALL_TRAP_TYPES.indexOf(c.value) === -1) rememberCustomOption('sf-type', c.value);
      } else {
        rememberEntry(c.field, c.value);
      }
    });
    closeModal(); openBulkEditConfirm(changes);
  };
}
function openBulkEditConfirm(changes) {
  var sets = bulkFlowSets(); /* gz: same target as the Edit-all form showed */
  if (!sets.length) { renderBulkBar(); return; }
  var n = sets.length;
  var lines = changes.map(function (c) {
    var note = c.field === 'setType' ? ' (variations cleared)'
      : (c.field === 'bait' || c.field === 'lure' || c.field === 'urine' || c.field === 'visual') ? ' (added to what is there now)' : '';
    return '<p>' + esc(c.label) + ' → ' + esc(c.value) + note + '</p>';
  }).join('');
  showModal('<h3>Change ' + n + ' sets?</h3>' + lines +
    '<p>Fields you left alone stay as they are on each set.</p>' +
    '<div class="btn-row" style="margin-top:14px"><button class="btn-secondary" id="m-cancel" type="button">Cancel</button>' +
    '<button class="btn-primary" id="m-ok" type="button">Change ' + n + ' sets</button></div>');
  $('modal').classList.add('sheet-dress'); /* gx: standard sheet dress for the bulk family */
  $('m-cancel').onclick = function () { closeModal(); };
  $('m-ok').onclick = function () { closeModal(); applyBulkEdit(changes); };
}
function applyBulkEdit(changes) {
  var sets = bulkFlowSets(); /* gz: applies to exactly the sets the flow counted */
  if (!sets.length) { renderBulkBar(); return; }
  var n = sets.length;
  sets.forEach(function (s) {
    var actLines = []; /* Q272: what Edit all actually changed on this set */
    changes.forEach(function (c) {
      if (c.field === 'setType') {
        if ((s.setType || '') !== c.value) actLines.push('Set type: ' + (s.setType || '—') + ' → ' + c.value);
        s.setType = c.value; s.variation = '';
      } /* the old variation belongs to the old foundation */
      else if (c.field === 'trapType') {
        if ((s.trapType || '') !== c.value) actLines.push('Trap: ' + (s.trapType || '—') + ' → ' + c.value);
        s.trapType = c.value;
      } /* maker + trap details untouched */
      else { /* hp (Q271, Tanner 2026-11-21): attractants ADD — the value
               joins what the set already carries, exactly as adding a
               row in the one-set form; never a duplicate, never a
               replacement. Set type and trap type above still replace:
               a set carries exactly one of each. */
        var arr = toAttrArray(s[c.field]).slice();
        var dupe = arr.some(function (x) { return String(x).toLowerCase() === c.value.toLowerCase(); });
        if (!dupe) { arr.push(c.value); actLines.push((c.label || c.field) + ' added: ' + c.value); }
        s[c.field] = arr;
      }
    });
    if (actLines.length) recordActivity(s, 'bulk', actLines); /* Q272 */
    touchSet(s); /* Q68: any edit restarts the check clock */
  });
  Store.save();
  refreshMarkers();
  bulkSelected = false;
  renderBulkBar();
  if (bulkSelCtx) exitSelMode(); /* gz: a finished operation ends selection mode */
  toast(n + ' sets updated.');
}
/* Q232: Delete all — the clone-a-line cleanup (Tanner, 2026-11-06). Same
   gone-everywhere rule as a single delete (Q38): sets, their pins, catch
   logs (History included), photos, and voice memos — one confirm naming
   the counts, with the gone-forever warning, before anything is removed. */
function openBulkDeleteConfirm() {
  var sets = bulkFlowSets(); /* gz: the frozen pick when launched from the selection bar */
  if (!sets.length) { renderBulkBar(); return; }
  var n = sets.length;
  var ln = lineById(Store.data, activeLineId());
  var ids = {};
  sets.forEach(function (s) { ids[s.id] = true; });
  /* The warning names the status when every set in the pile shares one —
     always true of the classic filter pile, whose status is the filter's.
     A mixed pick is worded to the count instead: "N selected sets". */
  var froms = {};
  sets.forEach(function (s) { froms[normStatus(s.status)] = true; });
  var fromKeys = Object.keys(froms);
  var pile = fromKeys.length === 1 ? n + ' ' + STATUS_LABELS[fromKeys[0]] + ' sets' : n + ' selected sets';
  var nLogs = (Store.data.logs || []).filter(function (l) { return ids[l.setId]; }).length;
  function ask(nPhotos, nMemos) {
    var bits = [pile + ' from “' + esc(ln ? ln.name : '') + '” will be permanently deleted'];
    if (nLogs) bits.push('their ' + nLogs + ' catch log' + (nLogs > 1 ? 's' : '') + ' (removed from History too)');
    if (nPhotos) bits.push(nPhotos + ' photo' + (nPhotos > 1 ? 's' : ''));
    if (nMemos) bits.push(nMemos + ' voice memo' + (nMemos > 1 ? 's' : ''));
    confirmModal('Delete ' + n + ' sets?',
      bits.join(', ') + '. This cannot be undone — deleted data is gone forever.',
      'Delete', function () { applyBulkDelete(ids, n); });
  }
  IDB.all('photos').then(function (all) {
    var nPhotos = all.filter(function (p) { return ids[p.setId]; }).length;
    return IDB.all('memos').then(function (memos) {
      ask(nPhotos, memos.filter(function (m) { return ids[m.setId]; }).length);
    });
  }).catch(function () { ask(0, 0); });
}
function applyBulkDelete(ids, n) {
  Store.data.sets = Store.data.sets.filter(function (x) { return !ids[x.id]; });
  Store.data.logs = Store.data.logs.filter(function (l) { return !ids[l.setId]; });
  if (Array.isArray(Store.data.activity)) Store.data.activity = Store.data.activity.filter(function (a) { return !ids[a.setId]; }); /* Q272 */
  IDB.all('photos').then(function (all) {
    all.forEach(function (p) {
      if (!ids[p.setId]) return;
      if (photoURLs[p.id]) { URL.revokeObjectURL(photoURLs[p.id]); delete photoURLs[p.id]; }
      delete photoById[p.id];
      IDB.del('photos', p.id);
    });
  }).catch(function () { /* noop */ });
  IDB.all('memos').then(function (all) {
    all.forEach(function (m) {
      if (!ids[m.setId]) return;
      if (memoURLs[m.id]) { URL.revokeObjectURL(memoURLs[m.id]); delete memoURLs[m.id]; }
      IDB.del('memos', m.id);
    });
  }).catch(function () { /* noop */ });
  Store.save(); refreshMarkers(); renderHistory(); renderTotals();
  bulkSelected = false;
  renderBulkBar();
  if (bulkSelCtx) exitSelMode(); /* gz: a finished operation ends selection mode */
  toast(n + ' sets deleted.');
}
function openBulkStatusPicker() {
  if (bulkSelCtx) { openBulkStatusPickerSel(); return; } /* gz: a pick may span statuses — its own picker below */
  var st = bulkFilterStatus();
  var sets = bulkFilteredSets();
  if (!st || !sets.length) { renderBulkBar(); return; }
  var colors = pinSchemeById(pinSchemeId()).colors;
  var rows = STATUS_VALUES.filter(function (k) { return k !== st && k !== 'missing'; }).map(function (k) {
    return '<button type="button" class="btn-secondary bulk-pick-row" data-st="' + k + '">' +
      '<span class="bulk-dot" style="background:' + colors[k] + '"></span>' + esc(STATUS_LABELS[k]) + '</button>';
  }).join('');
  showModal('<h3>Change ' + sets.length + ' sets to…</h3>' + rows +
    '<div class="btn-row" style="margin-top:14px"><button class="btn-secondary" id="m-cancel" type="button">Cancel</button></div>');
  $('modal').classList.add('sheet-dress'); /* gx: standard sheet dress for the bulk family */
  $('m-cancel').onclick = function () { closeModal(); };
  var btns = document.querySelectorAll('#modal-card .bulk-pick-row');
  for (var i = 0; i < btns.length; i++) {
    btns[i].onclick = function () { var t = this.getAttribute('data-st'); closeModal(); openBulkConfirm(t); };
  }
}
/* gz: the status picker for a hand pick. Missing stays one-at-a-time
   (it needs a reason per set — the same rule as the classic picker), and
   the one status every picked set already wears is not offered; a mixed
   pick offers every other status. The header counts the pick. */
function openBulkStatusPickerSel() {
  var sets = bulkFlowSets();
  if (!sets.length) { bulkSelCtx = null; renderSelBar(); return; }
  var froms = {};
  sets.forEach(function (s) { froms[normStatus(s.status)] = true; });
  var uniform = Object.keys(froms).length === 1 ? Object.keys(froms)[0] : null;
  var colors = pinSchemeById(pinSchemeId()).colors;
  var rows = STATUS_VALUES.filter(function (k) { return k !== 'missing' && k !== uniform; }).map(function (k) {
    return '<button type="button" class="btn-secondary bulk-pick-row" data-st="' + k + '">' +
      '<span class="bulk-dot" style="background:' + colors[k] + '"></span>' + esc(STATUS_LABELS[k]) + '</button>';
  }).join('');
  showModal('<h3>Change ' + sets.length + ' sets to…</h3>' + rows +
    '<div class="btn-row" style="margin-top:14px"><button class="btn-secondary" id="m-cancel" type="button">Cancel</button></div>');
  $('modal').classList.add('sheet-dress'); /* gx: standard sheet dress for the bulk family */
  $('m-cancel').onclick = function () { closeModal(); };
  var btns = document.querySelectorAll('#modal-card .bulk-pick-row');
  for (var i = 0; i < btns.length; i++) {
    btns[i].onclick = function () { var t = this.getAttribute('data-st'); closeModal(); openBulkConfirm(t); };
  }
}
function openBulkConfirm(target) {
  if (bulkSelCtx) { openBulkConfirmSel(target); return; } /* gz: a pick may come from several statuses */
  var st = bulkFilterStatus();
  var sets = bulkFilteredSets();
  if (!st || !sets.length) { renderBulkBar(); return; }
  var n = sets.length;
  var ln = lineById(Store.data, activeLineId());
  var colors = pinSchemeById(pinSchemeId()).colors;
  var dateLine = target === 'active'
    ? '<p>Date set becomes today, ' + fmtDate(todayISO()) + '.</p>'
    : '';
  showModal('<h3>Change ' + n + ' sets to ' + esc(STATUS_LABELS[target]) + '?</h3>' +
    '<p>' + esc(ln ? ln.name : '') + '</p>' +
    '<p><span class="bulk-dot" style="background:' + colors[st] + '"></span> ' + esc(STATUS_LABELS[st]) + ' → ' +
    '<span class="bulk-dot" style="background:' + colors[target] + '"></span> ' + esc(STATUS_LABELS[target]) + '</p>' +
    dateLine +
    '<p>You can change any set back one at a time from Edit this set.</p>' +
    '<div class="btn-row" style="margin-top:14px"><button class="btn-secondary" id="m-cancel" type="button">Cancel</button>' +
    '<button class="btn-primary" id="m-ok" type="button">Change ' + n + ' sets</button></div>');
  $('m-cancel').onclick = function () { closeModal(); };
  $('m-ok').onclick = function () { closeModal(); applyBulkStatus(target); };
}
/* gz: the confirm for a hand pick — same shape as the classic confirm,
   but the "from" side is honest about a mixed pick: one shared status
   reads as the classic from → to; several read as a counted list. */
function openBulkConfirmSel(target) {
  var sets = bulkFlowSets();
  if (!sets.length) { bulkSelCtx = null; renderSelBar(); return; }
  var n = sets.length;
  var ln = lineById(Store.data, activeLineId());
  var colors = pinSchemeById(pinSchemeId()).colors;
  var dateLine = target === 'active'
    ? '<p>Date set becomes today, ' + fmtDate(todayISO()) + '.</p>'
    : '';
  var counts = {};
  sets.forEach(function (s) { var k = normStatus(s.status); counts[k] = (counts[k] || 0) + 1; });
  var keys = Object.keys(counts);
  var fromLine;
  if (keys.length === 1) {
    fromLine = '<p><span class="bulk-dot" style="background:' + colors[keys[0]] + '"></span> ' + esc(STATUS_LABELS[keys[0]]) + ' → ' +
      '<span class="bulk-dot" style="background:' + colors[target] + '"></span> ' + esc(STATUS_LABELS[target]) + '</p>';
  } else {
    fromLine = '<p>Currently: ' + keys.map(function (k) {
      return '<span class="bulk-dot" style="background:' + colors[k] + '"></span> ' + esc(STATUS_LABELS[k]) + ' ×' + counts[k];
    }).join(' · ') + '</p>';
  }
  showModal('<h3>Change ' + n + ' sets to ' + esc(STATUS_LABELS[target]) + '?</h3>' +
    '<p>' + esc(ln ? ln.name : '') + '</p>' +
    fromLine +
    dateLine +
    '<p>You can change any set back one at a time from Edit this set.</p>' +
    '<div class="btn-row" style="margin-top:14px"><button class="btn-secondary" id="m-cancel" type="button">Cancel</button>' +
    '<button class="btn-primary" id="m-ok" type="button">Change ' + n + ' sets</button></div>');
  $('m-cancel').onclick = function () { closeModal(); };
  $('m-ok').onclick = function () { closeModal(); applyBulkStatus(target); };
}
function applyBulkStatus(target) {
  if (bulkSelCtx) { applyBulkStatusSel(target); return; } /* gz: per-set from-status rules below */
  var st = bulkFilterStatus();
  var sets = bulkFilteredSets();
  if (!st || !sets.length) { renderBulkBar(); return; }
  var n = sets.length;
  var today = todayISO();
  sets.forEach(function (s) {
    s.status = target;
    s.dateSet = activeDateFor(st, target, s.dateSet, today);
    if (target === 'pulled' && !s.datePulled) s.datePulled = today;
    if (target !== 'pulled' && s.datePulled) delete s.datePulled;
    if (st === 'missing') { s.missingReason = null; s.missingDetail = null; } /* Q229: leaving Missing clears the reason/detail, like the Edit save */
    if (normStatus(st) !== normStatus(target)) recordActivity(s, 'status', ['Status: ' + statusLabel(st) + ' → ' + statusLabel(target)]); /* Q272 */
    touchSet(s); /* Q68: any edit restarts the check clock */
  });
  Store.save();
  /* Q235 (2026-11-07, Tanner): the filter follows the sets — after a bulk
     status change the Show filter was still narrowed to the old status,
     which now holds 0 sets, so the map showed nothing. Toggle the new
     status on (and the old one off) so the sets land in view. */
  var m = showModel();
  m[st] = false;
  m[target] = true;
  saveShowModel();
  refreshMarkers();
  bulkSelected = false;
  renderBulkBar();
  toast(n + ' sets now ' + STATUS_LABELS[target] + '.');
}
/* gz: bulk status change over a hand pick. Each set follows the classic
   rules from its OWN status: a move to Active restarts that set's date,
   leaving Missing clears that set's reason/detail. The Q235 filter
   follow is softened to match a mixed pick — the target status turns ON
   so the changed sets land in view, but nothing turns off (the pick may
   span statuses, and the unpicked sets keep the filter they had). The
   finished operation exits selection mode. */
function applyBulkStatusSel(target) {
  var sets = bulkFlowSets();
  if (!sets.length) { bulkSelCtx = null; renderSelBar(); return; }
  var n = sets.length;
  var today = todayISO();
  sets.forEach(function (s) {
    var from = normStatus(s.status);
    s.status = target;
    s.dateSet = activeDateFor(from, target, s.dateSet, today);
    if (target === 'pulled' && !s.datePulled) s.datePulled = today;
    if (target !== 'pulled' && s.datePulled) delete s.datePulled;
    if (from === 'missing') { s.missingReason = null; s.missingDetail = null; } /* Q229: leaving Missing clears the reason/detail */
    if (from !== normStatus(target)) recordActivity(s, 'status', ['Status: ' + statusLabel(from) + ' → ' + statusLabel(target)]); /* Q272 */
    touchSet(s); /* Q68: any edit restarts the check clock */
  });
  Store.save();
  var m = showModel();
  m[target] = true;
  saveShowModel();
  exitSelMode(); /* refreshes markers + the pill, clears the pick */
  toast(n + ' sets now ' + STATUS_LABELS[target] + '.');
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
  /* Q212: the Set Type filter always offers the 15 foundations + Other,
     merged with whatever type values the trapper's own sets and logs
     actually carry — legacy names included — so an old season stays
     filterable by the names it was logged under. */
  if (def.field === 'setType' && Store.data) {
    allFoundationNames().concat([SET_TYPE_OTHER]).forEach(function (v) {
      if (!seen[v]) { seen[v] = true; out.push(v); }
    });
    (Store.data.sets || []).forEach(function (s) {
      var v = s ? (s.setType || '') : '';
      if (v && !seen[v]) { seen[v] = true; out.push(v); }
    });
  }
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
/* Q174 (2026-10-08): Tanner — report filters look like the app's other dropdowns
   but stay multi-select: each dimension is a dropdown-style button showing its
   current pick; tapping opens a checklist sheet. Clean at rest, full power
   when opened. Scales as products grow. */
function msSummary(def) {
  var sel = exportUI[def.key];
  if (!sel.length) return 'All';
  if (sel.length === 1) return dimLabel(def, sel[0]);
  return sel.length + ' selected';
}
function renderExportDimChips() {
  var host = $('exp-dim-filters');
  if (!host) return;
  host.innerHTML = DIM_DEFS.map(function (def) {
    var vals = dimValues(def);
    if (!vals.length) return '';
    return '<label class="field" for="ms-' + esc(def.key) + '">' + esc(def.label) + '</label>' +
      '<button type="button" class="ms-select" id="ms-' + esc(def.key) + '" data-msbtn="' + esc(def.key) + '">' +
      '<span class="ms-value">' + esc(msSummary(def)) + '</span>' +
      '<span class="ms-chev">⌄</span></button>';
  }).join('');
}
function msDef(key) {
  for (var i = 0; i < DIM_DEFS.length; i++) if (DIM_DEFS[i].key === key) return DIM_DEFS[i];
  return null;
}
function renderMsList() {
  var def = msDef(msOpenKey);
  var list = $('sheet-ms-list');
  if (!def || !list) return;
  $('sheet-ms-title').textContent = def.label;
  var sel = exportUI[def.key];
  list.innerHTML = dimValues(def).map(function (v) {
    var on = sel.indexOf(v) !== -1;
    return '<button type="button" class="ms-row' + (on ? ' on' : '') + '" data-msval="' + esc(v) + '">' +
      '<span class="ms-check">' + (on ? '✓' : '') + '</span>' +
      '<span>' + esc(dimLabel(def, v)) + '</span></button>';
  }).join('');
}
function openMsSheet(key) {
  msOpenKey = key;
  renderMsList();
  openSheet('sheet-ms');
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
  exportUI.fSetType = []; exportUI.fTrapType = []; exportUI.fLure = []; exportUI.fBait = []; exportUI.fUrine = []; exportUI.fOther = []; exportUI.fStatus = [];
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
    (l.weather ? '<div class="dim">🌤 ' + esc(weatherText(l.weather)) + '</div>' : '') +
    /* gw: tag-species catches carry a tag line + editor button, visible
       when the row is expanded (CSS rides .expanded like the notes). */
    (function () {
      if (l.otherType || !l.species || !tagRecordsOn() || !isTagSpecies(l.species)) return '';
      var sum = (l.tagNumber || '').trim()
        ? 'Tag № ' + esc(l.tagNumber) + (l.tagDate ? ' · tagged ' + esc(fmtDate(l.tagDate)) : '')
        : 'Not tagged yet';
      return '<div class="tag-line"><span class="dim">' + sum + '</span>' +
        '<button type="button" class="btn-small btn-secondary" data-tag-edit="' + l.id + '">Tag record</button></div>';
    })() + '</div>';
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
        '<span class="chev' + (shut ? '' : ' open') + '">›</span></button>' + /* gw scope 5: standard chevron */
        '<div class="day-body"' + (shut ? ' hidden' : '') + '>';
      curDay = l.date;
    }
    html += logRowHtml(l, false);
  });
  if (curDay !== null) html += '</div>';
  return html;
}

/* Q16: History "By trap type" view — entries grouped under their trap type
   stamped at log time (Foothold, Snare, Dog-proof…). One set = one trap, so
   the type is unambiguous; labeled "By Trap Type" (not "By Trap") for that
   reason. Collapsible group pattern. (The By Species twin that used to sit
   here was cut in gc — Totals owns species counts.) */
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
      '<span class="chev' + (open ? ' open' : '') + '">›</span></button>' + /* gw scope 5: standard chevron */
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
  var histFiltering = !!(histUI.q && histUI.q.trim());
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
  /* Q272: the Activity view reads the trail, not the catch list — it
     renders even on a line with no catches yet. The disposition chips
     are catch furniture and hide here. */
  var dispChips = $('hist-disp-chips');
  if (dispChips) dispChips.style.display = (histUI.view === 'activity') ? 'none' : '';
  if (histUI.view === 'activity') {
    renderHistSummary(histFilteredLogs());
    box.innerHTML = renderHistActivity();
    holdListHeight(box, histFiltering);
    return;
  }
  if (!logs.length) {
    renderHistSummary([]);
    box.innerHTML = '<div class="empty"><div class="big"><img class="bi inv" src="assets/icons/logbook.png" alt=""></div>No catches logged yet.<br>Tap a set pin on the map to log your first catch.</div>';
    holdListHeight(box, histFiltering);
    return;
  }
  var list = histFilteredLogs();
  renderHistSummary(list);
  if (!list.length) {
    box.innerHTML = '<div class="empty"><div class="big">🔍</div>No catches match those filters.</div>';
    holdListHeight(box, histFiltering);
    return;
  }
  /* gc (2026-11-15): History is the record — By Date or By Trap Type.
     Species counts live on Totals now; the old By Species view duplicated
     that card catch for catch. */
  box.innerHTML = (histUI.view === 'traptype') ? renderHistByTrapType(list)
    : renderHistByDate(list);
  holdListHeight(box, histFiltering);
}

/* ================= Q5. LURE SCORECARD TAB =================
   Its own bottom tab. Answers "what's actually producing?" from the lure /
   bait / urine (Q11) stamped on each catch at log time — changing a set's
   attractants mid-season never rewrites past catches. Unstamped catches sit
   in an "Unspecified" bucket below the rankings: honest numbers, never
   competing in them. */
var scoreUI = { season: 'this', by: 'lure', species: '', h2hA: '', h2hB: '', spCat: '', spQ: '' };
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
  /* Q170 (2026-10-08): head-to-head can also compare sponsored products, even
     ones with no logged catches yet — sponsor names join the picker options. */
  function h2hNames() {
    var opts = names.slice();
    SPONSORS.forEach(function (sp) {
      if (sp.section === u.by && opts.indexOf(sp.product) === -1) opts.push(sp.product);
    });
    return opts;
  }
  var h2hAll = h2hNames();
  if (u.h2hA && h2hAll.indexOf(u.h2hA) === -1) u.h2hA = '';
  if (u.h2hB && h2hAll.indexOf(u.h2hB) === -1) u.h2hB = '';
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
    var seasonShort = u.season === 'this' ? 'This Season' : (u.season === 'last' ? 'Last Season' : 'All-Time');
    html += '<div class="sc-results"><div class="sc-results-head"><span>' + nounCap + ' · ' + seasonShort + '</span></div>' +
    data.rows.map(function (g) {
      var sp = sponsorForProduct(g.name);
      var chip = (sp && sp.brandLogo)
        ? '<button type="button" class="sc-chip" data-sp="' + esc(sp.id) + '" aria-label="About ' + esc(sp.name) + '">' +
          '<img src="' + esc(sp.brandLogo) + '" alt="' + esc(sp.name) + ' logo"></button>'
        : '';
      return '<div class="sc-row">' + chip + '<span class="sc-name">' + esc(g.name) + '</span>' +
        '<span class="dim">' + g.nsets + ' set' + (g.nsets === 1 ? '' : 's') + '</span>' +
        '<span class="sc-rate"><strong>' + g.catches + '</strong> caught</span></div>';
    }).join('') + '</div>';
    html += '<p class="dim" style="margin-top:8px">A catch credits every ' + phrase + ' on the set — totals can exceed the catch count.</p>';
  }
  /* unspecified bucket: below the rankings, never competing in them */
  if (data.unspec.catches) {
    html += '<div class="warnbox green"><div class="wb-title">Unspecified ' + nounCap + '</div>' +
      data.unspec.catches + ' caught across ' + data.unspec.nsets + ' set' + (data.unspec.nsets === 1 ? '' : 's') +
      ' with no ' + phrase + ' recorded. Fill in the ' + phrase + ' on those sets and apply it to past catches to move them into the rankings.</div>';
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
    return h2hNames().map(function (n) {
      return '<option value="' + esc(n) + '"' + (sel === n ? ' selected' : '') + '>' + esc(n) + '</option>';
    }).join('');
  }
  html += '<div class="card" style="margin-top:12px"><h3>Head-to-Head</h3>' +
    '<div class="btn-row"><div><label class="field" for="sc-h2h-a">First</label>' +
    '<select id="sc-h2h-a"><option value="">Pick one…</option>' + h2hOpts(u.h2hA) + '</select></div>' +
    '<div><label class="field" for="sc-h2h-b">Second</label>' +
    '<select id="sc-h2h-b"><option value="">Pick one…</option>' + h2hOpts(u.h2hB) + '</select></div></div>' +
    h2h + '</div>';
  /* Q170 (2026-10-08): Sponsored Products — a searchable, sponsor-only directory
     sitting between head-to-head and the honesty line (which stays dead last).
     One search box + category chips; every card wears the gold SPONSORED pill;
     Compare drops the product into the head-to-head picker. */
  var spCat = u.spCat || u.by;
  html += '<div class="card" style="margin-top:12px"><h3>Sponsored Products</h3>' +
    segBtns('sc-sp-seg', 'spcat', [['lure', 'Lures'], ['bait', 'Bait'], ['urine', 'Urine'], ['visual', 'Visual'], ['audio', 'Audio'], ['other', 'Other']]) +
    '<input type="search" id="sc-sp-q" placeholder="Search sponsored products…" value="' + esc(u.spQ || '') + '" aria-label="Search sponsored products">' +
    '<div id="sc-sp-list"></div></div>';
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
  /* Q170: Sponsored Products wiring — chips re-render the tab, search filters
     the list in place (no re-render, so the keyboard stays up). */
  renderSpList();
  (function () {
    var seg = $('sc-sp-seg');
    if (!seg) return;
    var btns = seg.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('selected', btns[i].getAttribute('data-spcat') === (u.spCat || u.by));
      btns[i].onclick = (function (b) {
        return function () { u.spCat = b.getAttribute('data-spcat'); renderScorecardTab(); };
      })(btns[i]);
    }
  })();
  var spq = $('sc-sp-q');
  if (spq) spq.oninput = function () { u.spQ = this.value; renderSpList(); };
  var splist = $('sc-sp-list');
  if (splist) splist.addEventListener('click', function (e) {
    var cmp = e.target && e.target.closest ? e.target.closest('[data-sp-compare]') : null;
    if (cmp) { e.stopPropagation(); spCompare(cmp.getAttribute('data-sp-compare')); return; }
    var card = e.target && e.target.closest ? e.target.closest('[data-sp]') : null;
    if (card) openSponsorBio(card.getAttribute('data-sp'));
  });
  if (splist) splist.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (e.target && e.target.closest && e.target.closest('[data-sp-compare]')) return;
    var card = e.target && e.target.closest ? e.target.closest('[data-sp]') : null;
    if (card) { e.preventDefault(); openSponsorBio(card.getAttribute('data-sp')); }
  });
}
/* Q170 (2026-10-08): sponsor-only product list for the Scorecard tab.
   Only real sponsors appear — typed-in/autofilled products never do. */
function renderSpList() {
  var list = $('sc-sp-list');
  if (!list) return;
  var u = scoreUI;
  var cat = u.spCat || u.by;
  var q = String(u.spQ || '').toLowerCase().trim();
  var PHRASE = { lure: 'lures', bait: 'baits', urine: 'urines', visual: 'visual attractants', audio: 'audio attractants', other: 'other attractants' };
  var items = SPONSORS.filter(function (sp) {
    if (sp.section !== cat) return false;
    if (!q) return true;
    return (String(sp.product) + ' ' + String(sp.name)).toLowerCase().indexOf(q) !== -1;
  });
  if (!items.length) {
    list.innerHTML = '<p class="dim" style="margin:8px 0 0">No sponsored ' + esc(PHRASE[cat] || cat) + ' yet.</p>';
    return;
  }
  list.innerHTML = items.map(function (sp) {
    var logo = sp.badge || sp.brandLogo || '';
    return '<div class="sp-card" data-sp="' + esc(sp.id) + '" role="button" tabindex="0" aria-label="About ' + esc(sp.name) + '">' +
      (logo ? '<img class="sp-logo" src="' + esc(logo) + '" alt="' + esc(sp.name) + ' logo">' : '') +
      '<div class="sp-info"><div class="sp-product">' + esc(sp.product) + '</div>' +
      '<div class="sp-brand dim">' + esc(sp.name) + '</div></div>' +
      '<span class="pill">Sponsored</span>' +
      '<button type="button" class="btn-small btn-secondary" data-sp-compare="' + esc(sp.id) + '">Compare</button></div>';
  }).join('');
}
/* Q170: drop a sponsored product into head-to-head — the scorecard switches
   to the product's section and it becomes the First pick. */
function spCompare(id) {
  var sp = sponsorById(id);
  if (!sp) return;
  scoreUI.by = sp.section;
  scoreUI.spCat = sp.section;
  scoreUI.h2hA = sp.product;
  scoreUI.h2hB = '';
  renderScorecardTab();
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
  var byMonth = {}; /* ge: catches grouped by calendar month, 'YYYY-MM' keys */
  var bySetType = {}, byTrapType = {}; /* gm (2026-11-17): catches grouped by the log's stamped set type / trap type */
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
    var mk = (l.date || '').slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(mk)) {
      byMonth[mk] = byMonth[mk] || { kept: 0, alive: 0, released: 0, transported: 0 };
      byMonth[mk][bucket] += c;
    }
    /* gm: group by what the catch was stamped with when it was logged
       (saveLog stamps setType + trapType onto every log). A log with no
       stamp (legacy/imported) falls back to its set's current values via
       setId; a log whose set is gone and carries no stamp lands in
       Unspecified. The stamp holds the foundation name only — logs never
       carried the set's variation — so By Set Type groups by foundation /
       legacy name exactly as stamped. */
    var srcSet = l.setId ? getSet(l.setId) : null;
    var stVal = (typeof l.setType === 'string' ? l.setType.trim() : '');
    if (!stVal && srcSet) stVal = setTypeLabel(srcSet);
    var stKey = stVal || 'Unspecified';
    bySetType[stKey] = bySetType[stKey] || { kept: 0, alive: 0, released: 0, transported: 0 };
    bySetType[stKey][bucket] += c;
    var ttVal = (typeof l.trapType === 'string' ? l.trapType.trim() : '');
    if (!ttVal && srcSet) ttVal = String(srcSet.trapType || '').trim();
    var ttKey = ttVal || 'Unspecified';
    byTrapType[ttKey] = byTrapType[ttKey] || { kept: 0, alive: 0, released: 0, transported: 0 };
    byTrapType[ttKey][bucket] += c;
  });
  function rows(obj, withSetup, prefix) {
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
         tap, so the tab reads clean. gm: each card passes its own key
         prefix so expanded-row state never collides across cards. */
      var key = (prefix || (withSetup ? 'set:' : 'sp:')) + k;
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
      setType: setTypeLabel(s) /* Q212: Totals shows the same label as everywhere else */
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
  box.innerHTML = totalsSectionCards();

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
      '<h3>' + title + '</h3><span class="tchev">›</span></button>'; /* gw scope 5: one glyph, rotation shows state */
  }
  function totalsSectionCards() {
    var tc = totalsCollapsed(), cards = '';
    cards += '<div class="card totals-card">' + totalsCardHead('species', 'By Species') + '<div class="totals-card-body"' + (tc.species ? ' hidden' : '') + '>' + rows(bySpecies, false) + '</div></div>';
    cards += '<div class="card totals-card">' + totalsCardHead('set', 'By Set') + '<div class="totals-card-body"' + (tc.set ? ' hidden' : '') + '>' + rows(bySet, true) + '</div></div>';
    cards += '<div class="card totals-card">' + totalsCardHead('settype', 'By Set Type') + '<div class="totals-card-body"' + (tc.settype ? ' hidden' : '') + '>' + rows(bySetType, false, 'st:') + '</div></div>';
    cards += '<div class="card totals-card">' + totalsCardHead('traptype', 'By Trap Type') + '<div class="totals-card-body"' + (tc.traptype ? ' hidden' : '') + '>' + rows(byTrapType, false, 'tt:') + '</div></div>';
    {
      var names = [['kept', 'Dispatched'], ['alive', 'Kept alive'], ['released', 'Released'], ['transported', 'Transported']];
      /* Q86 (2026-10-01): Tanner — sort largest count first, it reads cleaner. */
      names.sort(function (a, b) { return (byDisp[b[0]] || 0) - (byDisp[a[0]] || 0); });
      /* Q61: each disposition row taps open to show what was caught under it. */
      cards += '<div class="card totals-card">' + totalsCardHead('disposition', 'By Disposition') + '<div class="totals-card-body"' + (tc.disposition ? ' hidden' : '') + '>' + names.map(function (n) {
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
    cards += '<div class="card totals-card">' + totalsCardHead('month', 'By Month') + '<div class="totals-card-body"' + (tc.month ? ' hidden' : '') + '>' + monthRows() + '</div></div>';
    return cards;
  }
  /* ge: By Month rows — chronological, so the season reads in the order it
     happened; headline is total caught, disposition breakdown behind the
     tap, same as the other cards' rows. */
  function monthRows() {
    var MN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    function tot(o) { return o.kept + o.alive + o.released + o.transported; }
    return Object.keys(byMonth).sort().map(function (mk) {
      var o = byMonth[mk], sub = [];
      if (o.alive) sub.push(o.alive + ' kept alive');
      if (o.released) sub.push(o.released + ' released');
      if (o.transported) sub.push(o.transported + ' transported');
      var label = MN[parseInt(mk.slice(5, 7), 10) - 1] + ' ' + mk.slice(0, 4);
      var key = 'mo:' + mk;
      var hasDetail = sub.length > 0;
      var open = hasDetail && !!totalsExpanded[key];
      var html = '<div class="rowline"' + (hasDetail ? ' data-totkey="' + esc(key) + '"' : '') + '>' +
        '<span>' + (hasDetail ? '<span class="tchev">' + (open ? '▾' : '▸') + '</span> ' : '') + esc(label) +
        '</span><span class="big-num">' + tot(o) + '</span></div>';
      if (hasDetail) {
        html += '<div class="totals-detail"' + (open ? '' : ' hidden') + '>' +
          '<div class="dim">' + sub.join(' · ') + '</div></div>';
      }
      return html;
    }).join('');
  }
}

/* Q202 (2026-10-19): hold a results list at its unfiltered height while a
   search filter is active. A filtered list that collapses also collapses the
   pane's scroll height; the browser clamps the scroll position and the search
   field leaps down the screen mid-typing (Tanner, Seasons search: the field
   fell 330px over "Rac"). The sheets solved this class with fixed geometry
   (Q198); panes get the same hold. Unfiltered renders record the full height
   (only while visible — a hidden pane measures 0); filtered renders pin it
   as min-height so the scroll height, and the field, never move. */
function holdListHeight(listEl, filtering) {
  if (!listEl) return;
  if (!filtering) {
    listEl.style.minHeight = '';
    var h = listEl.offsetHeight;
    if (h > 0) listEl._fullH = h;
  } else if (listEl._fullH) {
    listEl.style.minHeight = listEl._fullH + 'px';
  }
}

/* hb (2026-11-18): Tanner's gz phone check — in Seasons he typed "Bo" and
   got a blank pane: the search bar sticks at the pane top while the
   filtered list restarts at its own top, which — with the pane scrolled —
   sits up behind the bar/pane head, so the matches were nowhere visible.
   After a filter render with a live query, if the first match is not
   already sitting visible beneath the bar, scroll the pane so the bar
   tops the view and the match follows right under it. No-op when the
   match already sits right, and when the query is empty. */
function revealFirstMatch(input, row) {
  if (!input || !row || !input.value) return;
  var sc = input.closest ? input.closest('.scroll') : null;
  if (!sc) return;
  var ir = input.getBoundingClientRect(), rr = row.getBoundingClientRect(),
      sr = sc.getBoundingClientRect();
  if (rr.top >= ir.bottom - 1 && rr.top >= sr.top && rr.bottom <= sr.bottom + 1) return;
  if (ir.top - sr.top <= 16) {
    /* The bar is perched at the pane top and its rect will not move while
       it stays perched, so one live-rect delta lands the first match
       right under it. (scrollIntoView cannot do this: for a stuck
       element it aligns the stuck position and barely scrolls.) */
    sc.scrollTop += rr.top - (ir.bottom + 6);
  } else {
    input.scrollIntoView(true);
  }
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
  renderSeasonsGap(d);
  renderSeasonsDeadlines(d);
  renderSeasonsList(filter);
}

/* gw: the animal list is its OWN render, and the search box calls only
   this — the way every other search bar in the app behaves (the log
   form's species search re-renders its list, History's search its
   rows). Before gw, each keystroke ran the whole renderSeasons: the
   rules and gap cards above the search were rebuilt shut, the page
   above the list collapsed by hundreds of pixels, the scroll lurched,
   and the matched rows ended up scrolled out of sight above the sticky
   search — the list area read as blank (Tanner's field report,
   2026-11-18). Filtering now touches nothing above the search bar. */
function renderSeasonsList(filter) {
  var d = stateData();
  if (!d) {
    $('seasons-list').innerHTML = '<p class="dim">No season data loaded.</p>';
    return;
  }
  var q = (filter || '').toLowerCase();
  var list = sortSpeciesAlpha(stateSpecies().filter(function (sp) {
    return !q || sp.common_name.toLowerCase().indexOf(q) !== -1;
  }));
  $('seasons-list').innerHTML = list.length ? list.map(function (sp) {
    var info = speciesSeasonInfo(sp);
    return '<button type="button" class="species-row" data-sp="' + esc(sp.common_name) + '">' + speciesIcon(sp.common_name) +
      '<span class="sp-name">' + esc(sp.common_name) +
      (sp.scientific_name ? '<span class="sci">' + esc(sp.scientific_name) + '</span>' : '') + '</span>' +
      '<span class="badge ' + info.badgeClass + '">' + info.badge + '</span>' + '</button>';
  }).join('') : '<p class="dim">No species match.</p>';
  var btns = $('seasons-list').querySelectorAll('.species-row');
  for (var i = 0; i < btns.length; i++) {
    btns[i].onclick = function (e) {
      var t = e && e.target;
      showSpeciesDetail(this.getAttribute('data-sp'));
    };
  }
  holdListHeight($('seasons-list'), !!q);
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

/* ================= 10b. GAP-REGULATION CATEGORIES (gn, 2026-11-17) ======
   The gap sweep: requirement categories the season data never carried —
   trap owner-ID tags (1), permission (5), snare construction (10),
   setbacks (11), carcass/waste (12), trapper education (6) and
   nonresident rules (7) render here on the Seasons tab; pelt sealing (2),
   harvest reporting (3) and sell-by deadlines (4) plus the nuisance
   operator note (8) render on the Paperwork tab; incidental-catch
   procedures (9) and sealing notes ride the post-catch confirmation.
   hk (2026-11-19, Tanner): (2), (3), (4) and (8) moved to the Seasons
   tab too — they stand there as the Deadlines & Permits card under
   the Tags card (renderSeasonsDeadlines); Paperwork no longer
   carries them. The sentence above is the gn record.
   Data: js/gap-data.js, generated from data/us-gap-categories.json by
   tools/build-gap-data.js. Reminder-grade reference only, like
   everything else on these tabs. */
var GAP_CAT_LABELS = {
  1: 'Trap tags (owner ID)', 2: 'Pelt tagging & sealing', 3: 'Harvest reporting',
  4: 'Selling & holding pelts', 5: 'Permission to trap', 6: 'Trapper education',
  7: 'Nonresident trappers', 8: 'Nuisance wildlife work', 9: 'Incidental catch',
  10: 'Snare construction', 11: 'Setbacks', 12: 'Carcasses & waste'
};
function gapEntries(code, cat) {
  var all = (window.OPOSSUM_FOOT_GAP_DATA || {})[code || activeStateCode()] || [];
  if (!cat) return all;
  return all.filter(function (e) { return e.category === cat; });
}
function gapSourceHost(url) {
  var m = /^\w+:\/\/([^\/]+)/.exec(url || '');
  return m ? m[1].replace(/^www\./, '') : (url || '');
}
/* Seasons tab: a second collapsible card under the Trap & Snare Rules
   card — same markup, same toggle behaviour. The season data's
   license_summary is never rendered as its own view, so the licensing
   categories (6, 7) ride in this card under their own headings. */
function renderSeasonsGap(d) {
  var box = $('seasons-gap');
  if (!box) return;
  var code = activeStateCode();
  var secs = [];
  function sec(cat, extra) {
    var list = gapEntries(code, cat);
    if (!list.length) return;
    var h = '<p class="rules-sec">' + esc(GAP_CAT_LABELS[cat]) + '</p><ul class="rules-list">' +
      list.map(function (e) { return '<li>' + esc(e.rule) + '</li>'; }).join('') + '</ul>';
    if (extra) h += extra;
    secs.push(h);
  }
  var tag = (Store.data.trapTag || '').trim();
  sec(1, tag
    ? '<p class="dim">Your trap tag: <strong>' + esc(tag) + '</strong></p>'
    : '<p class="dim">You haven\'t saved your trap tag yet — add it under Settings → Where You Trap and it will show here with this rule.</p>');
  sec(5); sec(10); sec(11); sec(12); sec(6); sec(7);
  if (!secs.length) { box.innerHTML = ''; box.hidden = true; return; }
  var srcs = [];
  gapEntries(code).forEach(function (e) {
    if (e.source && srcs.indexOf(e.source) < 0) srcs.push(e.source);
  });
  box.innerHTML = '<div class="card setsec" id="gap-card">' +
    '<button type="button" class="setsec-head" id="gap-toggle"><span>' + esc(d.state_name) + ' — Tags, Permission, Setbacks &amp; Licensing</span>' +
    '<span class="setsec-chev">›</span></button>' +
    '<div class="setsec-body" hidden>' + secs.join('') +
    '<p class="dim rules-src">Sources: ' + srcs.map(function (u) {
      return '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(gapSourceHost(u)) + '</a>';
    }).join(' · ') + '<br>' + esc(REMINDER_LINE) + '</p></div></div>';
  box.hidden = false;
  $('gap-toggle').onclick = function () {
    var card = $('gap-card');
    var body = card.querySelector('.setsec-body');
    var open = !body.hasAttribute('hidden');
    if (open) { body.setAttribute('hidden', ''); card.classList.remove('open'); }
    else { body.removeAttribute('hidden'); card.classList.add('open'); }
  };
}
/* hk (2026-11-19, Tanner): Deadlines & Permits moved here from the
   Paperwork tab (gn's card, 2026-11-17) and stands as a Seasons
   official item under the Tags card — same card markup, same toggle,
   same yellow bar and dark panel as its two neighbours (the scoped
   CSS covers #seasons-deadlines with them). The CONTENT is gn's
   verbatim: pelt sealing (2), harvest reporting (3) and sell-by
   deadlines (4) — live-verified entries only — plus the nuisance
   operator note (8) where one exists, and the Reminder-only footer
   inside the panel. The whole card hides when the state has none of
   these, exactly as it did in Paperwork. No data changed. */
function renderSeasonsDeadlines(d) {
  var box = $('seasons-deadlines');
  if (!box) return;
  var code = activeStateCode();
  var h = '';
  [[2, GAP_CAT_LABELS[2]], [3, GAP_CAT_LABELS[3]], [4, GAP_CAT_LABELS[4]]].forEach(function (g) {
    var list = gapEntries(code, g[0]);
    if (!list.length) return;
    h += '<p class="rules-sec">' + esc(g[1]) + '</p><ul class="rules-list">' + list.map(function (e) {
      return '<li>' + (e.deadline ? '<strong>' + esc(e.deadline) + '</strong> — ' : '') + esc(e.rule) + '</li>';
    }).join('') + '</ul>';
  });
  var nwco = gapEntries(code, 8);
  if (nwco.length) {
    h += '<p class="rules-sec">' + esc(GAP_CAT_LABELS[8]) + '</p><ul class="rules-list">' +
      nwco.map(function (e) { return '<li>' + esc(e.rule) + '</li>'; }).join('') + '</ul>';
  }
  if (!h) { box.innerHTML = ''; box.hidden = true; return; }
  box.innerHTML = '<div class="card setsec" id="deadlines-card">' +
    '<button type="button" class="setsec-head" id="deadlines-toggle"><span>Deadlines &amp; Permits — ' + esc(d ? d.state_name : code) + '</span>' +
    '<span class="setsec-chev">›</span></button>' +
    '<div class="setsec-body" hidden>' + h +
    '<p class="dim rules-src">' + esc(REMINDER_LINE) + '</p></div></div>';
  box.hidden = false;
  $('deadlines-toggle').onclick = function () {
    var card = $('deadlines-card');
    var body = card.querySelector('.setsec-body');
    var open = !body.hasAttribute('hidden');
    if (open) { body.setAttribute('hidden', ''); card.classList.remove('open'); }
    else { body.removeAttribute('hidden'); card.classList.add('open'); }
  };
}
/* Does a gap entry's rule text name this species? Matches the full common
   name, its last word, and a few everyday aliases (the app says
   "River Otter"; the rules say "otter"). */
function gapSpeciesTerms(name) {
  var n = (name || '').toLowerCase().trim();
  if (!n) return [];
  var terms = [n];
  var words = n.split(/\s+/);
  if (words.length > 1 && terms.indexOf(words[words.length - 1]) < 0) terms.push(words[words.length - 1]);
  var alias = { 'river otter': 'otter', 'american marten': 'marten', 'pine marten': 'marten', 'canada lynx': 'lynx', 'striped skunk': 'skunk', 'spotted skunk': 'skunk', 'red fox': 'fox', 'gray fox': 'fox', 'grey fox': 'fox' };
  if (alias[n] && terms.indexOf(alias[n]) < 0) terms.push(alias[n]);
  return terms;
}
/* gn: sealing (Cat 2) and incidental-catch (Cat 9) notes for a logged
   catch of the given species, in the active line's state. */
function gapNotesForCatch(species) {
  var terms = gapSpeciesTerms(species);
  if (!terms.length) return [];
  var out = [];
  [2, 9].forEach(function (cat) {
    gapEntries(null, cat).forEach(function (e) {
      var t = (e.rule || '').toLowerCase();
      var hit = terms.some(function (term) { return t.indexOf(term) >= 0; });
      if (hit) out.push({ cat: cat, entry: e });
    });
  });
  return out;
}

/* ================= gw: TAG RECORDS =================
   Tanner's law for this feature (2026-11-18): optional by default,
   removable by choice, blocking never. The record lives ON the catch
   (log.tagNumber / log.tagDate, plus one photo record with kind 'tag'
   and the catch's logId) — Paperwork → My Tags is a view over catches,
   not a second store, so deleting a catch takes its tag record with it
   everywhere, per the Q38 rule. The Settings toggle hides every surface
   and deletes nothing. */
function tagRecordsOn() { return Store.data.tagRecordsOn !== false; }
/* The app has no global log-by-id helper (the one logById in the file is
   nested inside the gallery section) — tag records use this one. */
function tagLogById(id) {
  var logs = Store.data.logs || [];
  for (var i = 0; i < logs.length; i++) if (logs[i].id === id) return logs[i];
  return null;
}

/* The Cat 2 (pelt tagging & sealing) entry covering this species in the
   active line's state, or null — the same matching the post-catch
   sealing note uses, so the form, History, and My Tags always agree
   about which species get tagged. */
function tagEntryForSpecies(species) {
  var notes = gapNotesForCatch(species);
  for (var i = 0; i < notes.length; i++) if (notes[i].cat === 2) return notes[i].entry;
  return null;
}
function isTagSpecies(species) { return !!tagEntryForSpecies(species); }
function tagRuleText(entry) {
  return entry ? entry.rule + (entry.deadline ? ' Deadline: ' + entry.deadline + '.' : '') : '';
}
/* A catch "carries tag data" when any of the three fields is filled. */
function logHasTagData(l, tagPhotos) {
  if (!l) return false;
  if ((l.tagNumber || '').trim() || l.tagDate) return true;
  return !!(tagPhotos && tagPhotos[l.id]);
}

/* The tag record editor (sheet-tag): opened from an expanded History row
   or a My Tags row. Prefilled with whatever is stored; every field stays
   optional, and saving an untouched sheet changes nothing of substance. */
var tagEditLogId = null;
/* photo state: existing = the saved photo record (or null); blob = a
   newly picked replacement; removed = the saved photo is to be deleted.
   Nothing touches IndexedDB until Save. */
var tagEditPhoto = null;
function openTagEditor(logId) {
  var l = tagLogById(logId);
  if (!l) return;
  tagEditLogId = logId;
  tagEditPhoto = { existing: null, blob: null, removed: false };
  $('tag-edit-line').innerHTML = '<strong>' + esc(l.species || 'Catch') + '</strong>' +
    ' · ' + esc(fmtDate(l.date)) + (l.setName ? ' · ' + esc(l.setName) : '');
  $('tag-edit-rule').textContent = tagRuleText(tagEntryForSpecies(l.species));
  $('tag-number').value = l.tagNumber || '';
  $('tag-date').value = l.tagDate || '';
  renderTagEditPhoto();
  IDB.all('photos').then(function (all) {
    if (tagEditLogId !== logId) return;
    (all || []).forEach(function (p) { if (p && p.logId === logId && p.kind === 'tag') tagEditPhoto.existing = p; });
    renderTagEditPhoto();
  }).catch(function () { /* noop */ });
  openSheet('sheet-tag');
}
function renderTagEditPhoto() {
  var box = $('tag-photos');
  if (!box) return;
  box.innerHTML = '';
  var rm = $('btn-tag-photo-remove');
  var has = !!(tagEditPhoto && (tagEditPhoto.blob || (tagEditPhoto.existing && !tagEditPhoto.removed)));
  if (rm) rm.hidden = !has;
  if (!tagEditPhoto) return;
  var img = document.createElement('img');
  img.className = 'photo-thumb'; img.alt = 'Tag photo';
  if (tagEditPhoto.blob) {
    img.src = URL.createObjectURL(tagEditPhoto.blob);
    img.onclick = function () { openFullPhoto(tagEditPhoto.blob); };
  } else if (tagEditPhoto.existing && !tagEditPhoto.removed) {
    img.src = photoURL(tagEditPhoto.existing);
    img.onclick = function () { openPhotoViewer(tagEditPhoto.existing, null, true); };
  } else return;
  box.appendChild(img);
}
function deleteTagPhotoRec(p) {
  if (!p) return;
  if (photoURLs[p.id]) { URL.revokeObjectURL(photoURLs[p.id]); delete photoURLs[p.id]; }
  delete photoById[p.id];
  IDB.del('photos', p.id).catch(function () { /* noop */ });
}
function saveTagRecord() {
  var l = tagLogById(tagEditLogId);
  if (!l) { closeSheets(); return; }
  l.tagNumber = ($('tag-number').value || '').trim();
  l.tagDate = $('tag-date').value || '';
  var ph = tagEditPhoto;
  if (ph) {
    if (ph.removed && ph.existing) deleteTagPhotoRec(ph.existing);
    if (ph.blob) {
      if (ph.existing && !ph.removed) deleteTagPhotoRec(ph.existing);
      IDB.put('photos', {
        id: uid('p'), setId: l.setId, logId: l.id, kind: 'tag', blob: ph.blob,
        mime: ph.blob.type || 'image/jpeg',
        lat: (l.lat != null ? l.lat : null), lng: (l.lng != null ? l.lng : null),
        createdAt: Date.now()
      }).catch(function () { /* noop */ });
    }
  }
  tagEditPhoto = null; tagEditLogId = null;
  Store.save();
  closeSheets();
  renderHistory();
  renderMyTags();
  toast('Tag record saved.');
}

function showSpeciesDetail(name) {
  var sp = findSpecies(name);
  if (!sp) return;
  var info = speciesSeasonInfo(sp);
  var d = stateData();
  /* ho (2026-11-21, Q256, Tanner): the species header is one centered
     stack — silhouette on top, common name under it, scientific name
     under the name, status pill beneath — while the season cards below
     stay left-aligned reading text. (Titles and pills center; lists and
     reading text align left — the house rule with Q247/Q252.) */
  var html = '<div class="sp-detail-head">' + speciesIcon(name, 'sp-icon-lg') + '<h3>' + esc(sp.common_name) + '</h3>';
  if (sp.scientific_name) html += '<p class="dim sp-sci">' + esc(sp.scientific_name) + '</p>';
  html += '<p><span class="badge ' + info.badgeClass + '">' + info.badge + '</span></p></div>';
  (sp.seasons || []).forEach(function (s) {
    html += '<div class="card" style="margin:10px 0">';
    /* ho (2026-11-21, Q255, Tanner): every season bubble carries its
       method + land label — two records with identical dates and limits
       (Iowa raccoon: trapping/public and hunting/public) were rendering
       as the same bubble twice because neither was ever shown. */
    var ml = seasonMethodLand(s);
    if (ml) html += '<div class="sp-season-ml">' + esc(ml) + '</div>';
    html += '<div class="dim">';
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
  /* hj (2026-11-19): tripId and markerId join the owner exclusions —
     trip photos and sign/forage marker photos carry no lineId, so the
     legacy fallback below routed them all into the FIRST line's
     wallet. The wallet's taxonomy now matches the export and gallery
     classifiers, which already test both fields. Display-side only:
     no data is moved or rewritten. */
  if (!p || p.setId || p.logId || p.landownerId || p.tripId || p.markerId) return false;
  return (p.lineId || firstId) === lid;
}
/* Tanner 2026-10-07: trips live on the Paperwork tab, not in a modal.
   Each line gets its trip rows right here with info + thumbnails, like the
   License Wallet above. Tanner 2026-10-07 (later): every photo on this tab
   is a license-style card — tap the image to view, X to delete just it.
   Tanner 2026-10-07 (dg): like the other two sections — no camera/delete
   buttons on the trip; tap the trip box to edit it. Deleting a trip moved
   into the trip form.
   gl (2026-11-16): superseded in part — trips are collapsible rows now;
   tapping the row's head opens it, and the odometer trip's form opens
   from its Edit trip button inside. GPS trips keep Show on map + Delete
   inside the open row. */
/* gl (Tanner, 2026-11-16): the trip's detail line, cleaned for display.
   Old GPS notes read "GPS track \u00b7 0:00 \u00b7 passed 29 of 34 active sets" \u2014
   the kind now rides on the collapsed row itself and the elapsed stamp
   was never trustworthy (the timer stalls while the phone sleeps), so
   both come off here; the stored note itself is not rewritten. */
function tripDetail(tr) {
  var n = (tr.notes || '').trim();
  if (tr.source === 'gps-track') {
    n = n.replace(/^GPS track\s*\u00b7\s*/, '');
    n = n.replace(/^\d+:\d{2}(:\d{2})?\s*\u00b7\s*/, '');
    if (n) n = n.charAt(0).toUpperCase() + n.slice(1);
  }
  return n;
}
/* gl: trips file as COLLAPSIBLE one-line rows \u2014 date, miles, and the kind
   (GPS track, or Odometer with its readings) on the line; tap the line to
   open the row for the details, photos, and buttons. A season of trips
   reads as one screen instead of an endless scroll of full-size cards. */
function tripRowHTML(tr) {
  var head = '<div class="line-row trip-head" data-trip-toggle="' + esc(tr.id) + '">' +
    '<div class="line-main">' +
    '<span class="line-name">' + esc(fmtDate(tr.date)) + ' \u00b7 ' + esc(fmtMiles(tripMiles(tr))) + '</span>';
  var chev = '</div><span class="trip-chev">\u25b8</span></div>';
  /* gt: a hand-drawn route files in the same row family as a GPS
     track — Show on map, Fix route, Delete — wearing its own honest
     label: Drawn route. The record says how it came to be. */
  if (tr.source === 'gps-track' || tr.source === 'drawn-route') {
    var det = tripDetail(tr);
    return '<div class="trip-block">' +
      head + '<span class="dim">' + (tr.source === 'drawn-route' ? 'Drawn route' : 'GPS track') + '</span>' + chev +
      '<div class="trip-body">' +
      (det ? '<div class="dim" style="margin-bottom:8px">' + esc(det) + '</div>' : '') +
      '<div class="btn-row">' +
      '<button type="button" class="btn-secondary" data-trip-show="' + esc(tr.id) + '">Show on map</button>' +
      (tr.track && tr.track.length > 1 ? '<button type="button" class="btn-secondary" data-trip-fix="' + esc(tr.id) + '">Fix route</button>' : '') +
      '<button type="button" class="btn-ghost" data-trip-gdel="' + esc(tr.id) + '">Delete</button>' +
      '</div>' +
      '</div>' +
      '</div>';
  }
  return '<div class="trip-block">' +
    head + '<span class="dim">Odometer \u00b7 ' + esc(String(tr.startOdo) + ' \u2192 ' + String(tr.endOdo)) + '</span>' + chev +
    '<div class="trip-body">' +
    (tr.notes ? '<div class="dim" style="margin-bottom:8px">' + esc(tr.notes) + '</div>' : '') +
    '<div class="lic-grid trip-photogrid" data-trip-thumbs="' + esc(tr.id) + '"></div>' +
    '<div class="btn-row" style="margin-top:8px">' +
    '<button type="button" class="btn-secondary" data-trip-edit="' + esc(tr.id) + '">Edit trip</button>' +
    '</div>' +
    '</div>' +
    '</div>';
}
function fillTripThumbs(box) {
  IDB.all('photos').then(function (all) {
    var byTrip = {};
    all.forEach(function (p) {
      if (!p || !p.tripId || !p.blob) return;
      (byTrip[p.tripId] = byTrip[p.tripId] || []).push(p);
    });
    var slots = box.querySelectorAll('[data-trip-thumbs]');
    for (var s = 0; s < slots.length; s++) {
      (function (slot) {
        var list = byTrip[slot.getAttribute('data-trip-thumbs')] || [];
        list.forEach(function (p) {
          var item = document.createElement('div');
          item.className = 'lic-item';
          var img = document.createElement('img');
          img.src = photoURL(p);
          img.alt = p.kind === 'map' ? 'Road directions screenshot' : (p.kind === 'note' ? 'Note photo' : 'Odometer photo');
          /* dg: the trip box opens the edit form — photo taps must not bubble. */
          img.onclick = function (ev) { ev.stopPropagation(); openFullPhoto(p.blob); };
          var del = document.createElement('button');
          del.type = 'button'; del.textContent = '\u00d7'; del.setAttribute('aria-label', 'Delete photo');
          del.onclick = function (e) { e.stopPropagation(); deleteTripPhoto(p.id); };
          item.appendChild(img); item.appendChild(del);
          slot.appendChild(item);
        });
      })(slots[s]);
    }
  }).catch(function () { /* photos optional */ });
}
/* Tanner 2026-10-07: the X on a trip photo deletes just that photo —
   the whole trip still deletes from the trip row's Delete button. */
function deleteTripPhoto(photoId) {
  confirmModal('Delete this photo?', 'It will be removed from this phone.', 'Delete', function () {
    IDB.del('photos', photoId).then(function () { renderPaperworkMileage(); });
  });
}
/* gr (2026-11-18, Tanner): the trip-map context. While a saved trip's
   route is drawn from this readout — Show on map, or the landing after
   a Fix route Done — the route bar carries Fix route for that same
   trip and Back to this readout, so the route (and a repair just made
   to it) can be checked right where it landed. Back is the Paperwork
   tab itself; the drawn route stays on the map, as Show on map has
   always left it. */
function tripMapCtx(tr) {
  return {
    fix: function () { openTripFix(tr); },
    back: function () { switchTab('licenses'); }
  };
}
/* go/gp/gq: Fix route — Tracking owns the map work and the working
   copy; this callback fires ONCE, when Tanner taps Done in the fix
   bar, and writes the finished edit to the trip and saves, so the
   readout, the map, and the mileage agree and survive a reload.
   Cancel never calls back at all.
   gr: after the write, the saved trip is drawn the way Show on map
   draws it, with its context — Done lands on the fixed route itself
   instead of leaving a blank map behind. */
function openTripFix(tr) {
  switchTab('map');
  Tracking.startFix(tr.track, function (res) {
    tr.track = res.track; tr.miles = res.miles;
    Store.save(); renderPaperworkMileage();
    Tracking.drawSaved(tr.track, tripMapCtx(tr));
  });
}
/* gt (2026-11-18, Tanner): Draw a route — the standalone drawing
   hand. Tracking owns the map work; when he taps Save in the draw
   bar, this asks for the trip's date the way Log Trip does (a date
   field, today filled in) and files the trip on the line he drew it
   from. The record is honest about its making: source 'drawn-route',
   and every stored point carries the hand flag. Points round to the
   same five decimals a saved GPS track keeps. Cancelling the date
   prompt leaves the drawn route on the map, untouched; saving lands
   where Log Trip's save lands — back on the Paperwork readout. */
function openDrawRoute(lineId) {
  switchTab('map');
  if (window.Tracking) Tracking.startDrawRoute(function (res) { openDrawnTripSave(lineId, res); });
}
function openDrawnTripSave(lineId, res) {
  showModal(
    '<h3>Save drawn route</h3>' +
    '<p class="dim" style="margin:0 0 6px">' + esc(fmtMiles(res.miles)) + ' drawn by hand on the map.</p>' +
    '<label class="field" for="m-draw-date">Date</label>' +
    '<input type="date" id="m-draw-date" value="' + esc(todayISO()) + '">' +
    '<div class="btn-row" style="margin-top:14px"><button class="btn-secondary" id="m-cancel" type="button">Cancel</button>' +
    '<button class="btn-primary" id="m-ok" type="button">Save route</button></div>'
  );
  $('m-cancel').onclick = function () { closeModal(); };
  $('m-ok').onclick = function () {
    var date = $('m-draw-date').value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) { toast('Pick a date for the trip.'); return; }
    if (!Array.isArray(Store.data.trips)) Store.data.trips = [];
    Store.data.trips.push({
      id: uid('trip'), lineId: lineId, createdAt: Date.now(), date: date,
      source: 'drawn-route', miles: res.miles,
      track: res.pts.map(function (p) { return [Math.round(p.lat * 1e5) / 1e5, Math.round(p.lng * 1e5) / 1e5, 1]; }),
      notes: ''
    });
    Store.save();
    if (window.Tracking) Tracking.endDrawRoute();
    closeModal(); renderPaperworkMileage(); switchTab('licenses');
    toast('Drawn route filed in the mileage log.');
  };
}
function renderPaperworkMileage() {
  var box = $('paperwork-mileage-lines');
  if (!box) return;
  var card = $('setsec-mileage');
  var on = Store.data.mileageOn !== false;
  /* gb: off stops new recording only — a line with trips keeps its section,
     with the record buttons swapped for a one-line note (below). The section
     hides only when recording is off AND this line has no trips. */
  var ln0 = activeLine();
  var hasTrips = !!(ln0 && tripsForLine(ln0.id).length);
  if (card) card.style.display = (on || hasTrips) ? '' : 'none';
  if (!on && !hasTrips) return;
  var lines = (Store.data.lines || []);
  if (!lines.length) { box.innerHTML = '<p class="dim">No lines yet.</p>'; return; }
  /* Tanner 2026-10-07 (df): the Mileage section follows the active line only —
     switch lines and it shows that line's trips. The all-lines export lives
     in Settings. */
  var ln = activeLine();
  if (!ln) { box.innerHTML = '<p class="dim">No active line.</p>'; return; }
  var trips = tripsForLine(ln.id);
  var rows = trips.map(tripRowHTML).join('') || '<p class="dim">No trips logged yet.</p>';
  /* Tanner 2026-10-07 (dg): like the other two sections — the add button is
     full-width below the last trip; the trip box itself is the edit target. */
  /* gb: with recording off, the two record buttons give way to one line
     saying so — past trips above stay listed and readable. */
  var actions = on
    ? '<div style="display:flex;flex-direction:column;gap:10px;margin-top:10px">' +
      '<button type="button" class="btn-secondary" data-pm-logtrip="' + esc(ln.id) + '">\uFF0B Log Trip</button>' +
      '<button type="button" class="btn-secondary" data-pm-track="' + esc(ln.id) + '"><span style="color:#e5484d">\u25CF</span> Track a route</button>' +
      '<button type="button" class="btn-secondary" data-pm-draw="' + esc(ln.id) + '">Draw a route</button></div>'
    : '<p class="dim" style="margin-top:10px">Mileage is off \u2014 these trips stay here to read. To record new trips, turn on Mileage log in Settings \u2192 Toggles \u2192 Feature Toggles.</p>';
  box.innerHTML = '<div class="pm-line" data-pm-line-block="' + esc(ln.id) + '">' +
    '<div class="pm-line-head"><span><strong>' + esc(ln.name) + '</strong> ' +
    '<span class="dim">' + esc(fmtMiles(lineTripTotal(ln.id))) + '</span></span></div>' +
    rows +
    actions + '</div>';
  function lineOf(el) {
    var b = el.closest ? el.closest('[data-pm-line-block]') : null;
    return b ? b.getAttribute('data-pm-line-block') : null;
  }
  var trk = box.querySelectorAll('[data-pm-track]');
  for (var t = 0; t < trk.length; t++) {
    trk[t].onclick = function () {
      if (Store.data.mileageOn === false) { toast('Route & mileage tracking is off — turn it on in Settings \u2192 Toggles \u2192 Feature Toggles.'); return; }
      switchTab('map');
      if (window.Tracking) Tracking.start();
    };
  }
  var lts = box.querySelectorAll('[data-pm-logtrip]');
  for (var i = 0; i < lts.length; i++) {
    (function (el) {
      el.onclick = function () { showTripModal(el.getAttribute('data-pm-logtrip'), null); };
    })(lts[i]);
  }
  /* gt: Draw a route — same visibility rules as Track a route (the
     actions block only renders while mileage recording is on). */
  var drs = box.querySelectorAll('[data-pm-draw]');
  for (var d2 = 0; d2 < drs.length; d2++) {
    (function (el) {
      el.onclick = function () {
        if (Store.data.mileageOn === false) { toast('Route & mileage tracking is off — turn it on in Settings → Toggles → Feature Toggles.'); return; }
        openDrawRoute(el.getAttribute('data-pm-draw'));
      };
    })(drs[d2]);
  }
  var edits = box.querySelectorAll('[data-trip-edit]');
  for (var e = 0; e < edits.length; e++) {
    (function (el) {
      el.onclick = function () { showTripModal(lineOf(el), el.getAttribute('data-trip-edit')); };
    })(edits[e]);
  }
  /* Q201: GPS-track rows — see the route again, or delete the trip. */
  var shows = box.querySelectorAll('[data-trip-show]');
  for (var s2 = 0; s2 < shows.length; s2++) {
    (function (el) {
      el.onclick = function () {
        var tr = tripById(el.getAttribute('data-trip-show'));
        if (tr && tr.track && tr.track.length > 1 && window.Tracking) { switchTab('map'); Tracking.drawSaved(tr.track, tripMapCtx(tr)); }
        else toast('No route is saved on that trip.');
      };
    })(shows[s2]);
  }
  var gdels = box.querySelectorAll('[data-trip-gdel]');
  for (var g = 0; g < gdels.length; g++) {
    (function (el) {
      el.onclick = function () { deleteTrip(lineOf(el), el.getAttribute('data-trip-gdel')); };
    })(gdels[g]);
  }
  /* go: Fix route — a GPS trip whose line jumped (the sleep diagonal)
     can be repaired after the fact. The wiring lives in openTripFix
     (above renderPaperworkMileage): gp's once-only Done callback, and
     gr's landing on the drawn fixed route after it. */
  var fixes = box.querySelectorAll('[data-trip-fix]');
  for (var f2 = 0; f2 < fixes.length; f2++) {
    (function (el) {
      el.onclick = function () {
        var tr = tripById(el.getAttribute('data-trip-fix'));
        if (tr && tr.track && tr.track.length > 1 && window.Tracking) openTripFix(tr);
        else toast('No route is saved on that trip.');
      };
    })(fixes[f2]);
  }
  /* gl: a trip row's head taps the row open and closed. */
  var togs = box.querySelectorAll('[data-trip-toggle]');
  for (var tg = 0; tg < togs.length; tg++) {
    (function (el) {
      el.onclick = function () {
        var b = el.closest ? el.closest('.trip-block') : null;
        if (b) b.classList.toggle('open');
      };
    })(togs[tg]);
  }
  fillTripThumbs(box);
}
/* hk (2026-11-19): gn's Paperwork deadlines card (renderPaperworkDeadlines)
   is gone from here — the section moved to the Seasons tab as
   renderSeasonsDeadlines, content verbatim. Nothing in Paperwork
   referenced it but its two render calls, both removed. */

/* gw: Paperwork → My Tags — a view over the active line's catches, never
   a second store. Two groups, newest catch first in each: records on
   file (number, date, photo) and tag-species catches still awaiting a
   tag number, carrying the state's deadline text. No badges, counters,
   or mentions anywhere else in the app. The whole card hides when Tag
   records are off — stored records are untouched. */
function renderMyTags() {
  var card = $('setsec-mytags');
  var box = $('mytags-list');
  if (!card || !box) return;
  if (!tagRecordsOn()) { card.style.display = 'none'; box.innerHTML = ''; return; }
  card.style.display = '';
  var logs = activeLogs().filter(function (l) {
    return !l.otherType && l.species && isTagSpecies(l.species);
  });
  if (!logs.length) {
    box.innerHTML = '<p class="dim">No catches on this line need a tag yet. When you log a species your state tags — bobcat, otter, and the like — its tag record will live here.</p>';
    return;
  }
  IDB.all('photos').then(function (all) {
    var tagPhotos = {};
    (all || []).forEach(function (p) { if (p && p.logId && p.kind === 'tag') tagPhotos[p.logId] = p; });
    var filled = [], waiting = [];
    logs.forEach(function (l) { (logHasTagData(l, tagPhotos) ? filled : waiting).push(l); });
    function byDateDesc(a, b) { return (b.date || '') < (a.date || '') ? -1 : ((b.date || '') > (a.date || '') ? 1 : (b.createdAt || 0) - (a.createdAt || 0)); }
    filled.sort(byDateDesc); waiting.sort(byDateDesc);
    function row(l) {
      var p = tagPhotos[l.id];
      var has = logHasTagData(l, tagPhotos);
      var top = has
        ? (l.tagNumber ? '<span class="tag-num">Tag № ' + esc(l.tagNumber) + '</span>' : '<span class="dim">Tag photo / date on file</span>')
        : '<span class="dim">Awaiting tag</span>';
      var meta = esc(fmtDate(l.date)) + (l.setName ? ' · ' + esc(l.setName) : '') +
        (l.tagDate ? ' · Tagged ' + esc(fmtDate(l.tagDate)) : '');
      var dl = '';
      if (!has) {
        var e = tagEntryForSpecies(l.species);
        if (e) dl = '<div class="dim">' + (e.deadline ? '<strong>Deadline: ' + esc(e.deadline) + '</strong> — ' : '') + esc(e.rule) + '</div>';
      }
      return '<div class="tag-row" data-tag-edit="' + l.id + '"><div class="tag-flex">' +
        '<div class="tag-main"><div class="tag-top"><span class="tag-species">' + esc(l.species) + '</span>' + top + '</div>' +
        '<div class="dim">' + meta + '</div>' + dl + '</div>' +
        (p ? '<img class="tag-thumb" data-tag-photo="' + l.id + '" src="' + photoURL(p) + '" alt="Tag photo">' : '') +
        '</div></div>';
    }
    var h = '';
    if (filled.length) h += (waiting.length ? '<p class="rules-sec">On record</p>' : '') + filled.map(row).join('');
    if (waiting.length) h += (filled.length ? '<p class="rules-sec">Waiting for a tag</p>' : '') + waiting.map(row).join('');
    box.innerHTML = h;
    box.onclick = function (e) {
      var th = e.target.closest ? e.target.closest('[data-tag-photo]') : null;
      if (th) {
        var p = tagPhotos[th.getAttribute('data-tag-photo')];
        if (p) openPhotoViewer(p, null, true);
        return;
      }
      var r = e.target.closest ? e.target.closest('[data-tag-edit]') : null;
      if (r) openTagEditor(r.getAttribute('data-tag-edit'));
    };
  }).catch(function () { box.innerHTML = '<p class="dim">Could not load tag photos.</p>'; });
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
      /* hl (2026-11-20, Q245): the linked-photo badge is gone with the
         custom-link override it marked. A stored p.link is simply
         ignored now — the official state site governs. */
      grid.appendChild(item);
    });
  });
}

/* Tap a license photo: view it (zoomable — the warden reads it off the
   phone) and open the official state license site. hl (2026-11-20, Q245,
   Tanner, on Aron Arthur's word): the per-photo custom-link override is
   retired — picture + zoom + the state site link is more than enough.
   A previously saved p.link is simply ignored; no migration. */
function openLicenseDetail(p) {
  var d = stateData();
  /* Official state license vendor is automatic — no typing needed. */
  var officialUrl = (d && d.license_url) ? d.license_url : '';
  var html = '<img src="' + licURLs[p.id] + '" style="width:100%;border-radius:8px" alt="License photo">';
  if (officialUrl) {
    /* Tanner 2026-10-01: title case on buttons and labels. */
    html += '<a class="btn-primary" style="display:block;text-align:center;margin-top:10px;text-decoration:none;border-radius:var(--radius)" href="' +
      esc(officialUrl) + '" target="_blank" rel="noopener">' + 'Official ' + esc(d.state_name) + ' License Site ↗' + '</a>';
    if (d.license_note) {
      html += '<p class="dim" style="margin-top:8px">' + esc(d.license_note) + '</p>';
    }
  }
  html += '<div class="btn-row btn-compact" style="margin-top:10px">' +
    '<button class="btn-secondary" id="m-ph-save" type="button">Save Photo</button>' +
    '<button class="btn-secondary" id="m-close" type="button">Close</button></div>';
  showModal(html);
  wirePhotoZoom($('modal-card')); /* fy: the license photo zooms like every other photo */
  $('m-close').onclick = closeModal;
  $('m-ph-save').onclick = function () { sharePhotoFile(p.blob, 'opossum-foot-license'); };
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
  wirePhotoZoom($('modal2-card')); /* Q241: pinch-to-zoom */
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
      holdListHeight(list, !!q);
      return;
    }
    all.forEach(function (lo) { list.appendChild(landownerCard(lo, byLo[lo.id] || [])); });
    holdListHeight(list, !!q);
  });
}
function landownerCard(lo, photos) {
  var card = document.createElement('div');
  card.className = 'card';
  var slips = photos.filter(function (p) { return p.kind === 'slip'; });
  var bounds = photos.filter(function (p) { return p.kind === 'boundary'; });
  var html = '<h3 style="text-align:left;cursor:pointer" data-lo-name title="Tap to edit">' + esc(lo.name) + '</h3>';
  html += landownerPhoneHtml(lo);
  if (lo.notes) html += '<p class="dim lo-notes-box" style="margin:4px 0">' + esc(lo.notes) + '</p>';
  /* Q158 (2026-10-06): Tanner — slip and boundary photos viewable right on
     the card, like the license wallet: thumbnails, tap for full screen.
     Tanner 2026-10-07 (later): every photo on this tab gets the X too —
     tap the image to view, X deletes just that photo.
     Tanner 2026-10-07 (db): Edit/Delete buttons off the card — tap the
     name to edit; deleting a landowner moved into the Edit screen. */
  var viewable = slips.concat(bounds);
  if (viewable.length) {
    html += '<div class="lic-grid" data-lo-photos></div>';
  } else if (lo.boundaryNote) {
    html += '<p class="dim" style="margin:4px 0">boundary on file</p>';
  }
  card.innerHTML = html;
  card.querySelector('[data-lo-name]').onclick = function () { openLandownerForm(lo.id); };
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
      /* Tanner 2026-10-07: X on every photo on this tab — deletes just it. */
      (function (photo) {
        var del = document.createElement('button');
        del.type = 'button'; del.textContent = '\u00d7'; del.setAttribute('aria-label', 'Delete photo');
        del.onclick = function (e) {
          e.stopPropagation();
          confirmModal('Delete this photo?', 'It will be removed from this phone.', 'Delete', function () {
            IDB.del('photos', photo.id).then(function () {
              if (photo.id && loPhotoURLs[photo.id]) { URL.revokeObjectURL(loPhotoURLs[photo.id]); delete loPhotoURLs[photo.id]; }
              renderLandowners();
            });
          });
        };
        item.appendChild(del);
      })(p);
      grid.appendChild(item);
    });
  }
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
    '<button class="btn-primary" id="lo-save" type="button">Save landowner</button></div>' +
    /* Tanner 2026-10-07 (db): card buttons are gone — deleting a landowner
       happens here in the Edit screen. New landowners have nothing to delete. */
    (isNew ? '' : '<button class="btn-danger" id="lo-del" type="button" style="margin-top:10px;width:100%">Delete landowner</button>')
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
  if (!isNew) $('lo-del').onclick = function () { deleteLandowner(lo.id); };
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

/* Q214 (2026-10-23, Tanner): full media export. The JSON backup carries the
   data but NOT the pictures — photos and voice memos live in the IDB stores,
   so a lost phone used to lose every license photo and permission slip.
   This builds ONE ZIP on the phone holding every photo and memo from EVERY
   line: set photos, catch photos, licenses, landowner permission slips and
   boundary maps, trip photos, marker (Forage & Finds) photos, voice memos —
   in named folders, each file named by its record and date, with an INDEX
   (txt + csv) mapping every file back to its record. Nothing is sent
   anywhere; the ZIP downloads like every other export and the trapper
   decides where it goes. The ZIP is written by hand (store method — photos
   and audio are already compressed) so it works offline with no library,
   like the rest of the app. The same function ships in Jon's fur-sale clone,
   where receipt photos ride along the same way. */
function zipDosDateTime(ts) {
  var dt = new Date(ts || Date.now());
  var time = ((dt.getHours() & 31) << 11) | ((dt.getMinutes() & 63) << 5) | ((dt.getSeconds() >> 1) & 31);
  var date = (((Math.max(1980, dt.getFullYear()) - 1980) & 127) << 9) | (((dt.getMonth() + 1) & 15) << 5) | (dt.getDate() & 31);
  return { time: time, date: date };
}
var ZIP_CRC_TABLE = null;
function zipCrc32(bytes) {
  if (!ZIP_CRC_TABLE) {
    ZIP_CRC_TABLE = [];
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      ZIP_CRC_TABLE[n] = c >>> 0;
    }
  }
  var crc = 0xFFFFFFFF;
  for (var i = 0; i < bytes.length; i++) crc = ZIP_CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function blobToBytes(blob) {
  if (blob.arrayBuffer) return blob.arrayBuffer().then(function (ab) { return new Uint8Array(ab); });
  return new Promise(function (resolve, reject) {
    var r = new FileReader();
    r.onload = function () { resolve(new Uint8Array(r.result)); };
    r.onerror = function () { reject(new Error('read failed')); };
    r.readAsArrayBuffer(blob);
  });
}
/* entries: [{path, blob, when}] -> Promise<Blob> of the complete ZIP. */
function buildZipBlob(entries) {
  var parts = [], central = [], offset = 0, chain = Promise.resolve();
  var enc = new TextEncoder();
  entries.forEach(function (e) {
    chain = chain.then(function () {
      return blobToBytes(e.blob).then(function (bytes) {
        var nameBytes = enc.encode(e.path);
        var crc = zipCrc32(bytes), dt = zipDosDateTime(e.when);
        var lh = new DataView(new ArrayBuffer(30));
        lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true);
        lh.setUint16(6, 0x0800, true); /* UTF-8 file names */
        lh.setUint16(8, 0, true);      /* store — no compression */
        lh.setUint16(10, dt.time, true); lh.setUint16(12, dt.date, true);
        lh.setUint32(14, crc, true);
        lh.setUint32(18, bytes.length, true); lh.setUint32(22, bytes.length, true);
        lh.setUint16(26, nameBytes.length, true); lh.setUint16(28, 0, true);
        parts.push(new Blob([lh.buffer, nameBytes, bytes]));
        var ch = new DataView(new ArrayBuffer(46));
        ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true);
        ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
        ch.setUint16(12, dt.time, true); ch.setUint16(14, dt.date, true);
        ch.setUint32(16, crc, true);
        ch.setUint32(20, bytes.length, true); ch.setUint32(24, bytes.length, true);
        ch.setUint16(28, nameBytes.length, true);
        ch.setUint32(42, offset, true);
        central.push(new Blob([ch.buffer, nameBytes]));
        offset += 30 + nameBytes.length + bytes.length;
      });
    });
  });
  return chain.then(function () {
    var cdSize = central.reduce(function (n, b) { return n + b.size; }, 0);
    var eo = new DataView(new ArrayBuffer(22));
    eo.setUint32(0, 0x06054b50, true);
    eo.setUint16(8, entries.length, true); eo.setUint16(10, entries.length, true);
    eo.setUint32(12, cdSize, true); eo.setUint32(16, offset, true);
    return new Blob(parts.concat(central).concat([new Blob([eo.buffer])]), { type: 'application/zip' });
  });
}
function mediaFileSlug(s) {
  var out = String(s == null ? '' : s).replace(/[\/\\:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim();
  if (out.length > 70) out = out.slice(0, 70).trim();
  return out || 'Untitled';
}
function mediaExt(blob, rec) {
  var mime = (rec && rec.mime) || (blob && blob.type) || '';
  var map = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'image/heic': 'heic',
    'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/aac': 'aac', 'audio/webm': 'webm', 'audio/ogg': 'ogg' };
  if (map[mime]) return map[mime];
  var nm = rec && rec.name && /\.([A-Za-z0-9]{2,5})$/.exec(rec.name);
  if (nm) return nm[1].toLowerCase();
  return mime.indexOf('audio') === 0 ? 'm4a' : 'jpg';
}
function mediaDateStamp(ts) {
  var d = new Date(ts || Date.now());
  function p2(n) { return ('0' + n).slice(-2); }
  return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
}
function buildMediaEntries(photos, memos) {
  var lines = Store.data.lines || [];
  var firstLineId = lines.length ? lines[0].id : null;
  function lineName(id) {
    for (var i = 0; i < lines.length; i++) if (lines[i].id === id) return lines[i].name || 'Line';
    return lines.length ? (lines[0].name || 'Line') : 'Line';
  }
  function logById(id) {
    var found = null;
    (Store.data.logs || []).forEach(function (x) { if (x.id === id) found = x; });
    return found;
  }
  var usedPaths = {}, entries = [], indexRows = [];
  function add(folder, label, lineId, rec, blob, note) {
    if (!blob) return;
    var when = rec.createdAt || Date.now();
    var base = mediaDateStamp(when) + ' — ' + mediaFileSlug(label);
    var ext = mediaExt(blob, rec);
    var path = folder + '/' + base + '.' + ext, n = 2;
    while (usedPaths[path]) { path = folder + '/' + base + ' (' + n + ').' + ext; n++; }
    usedPaths[path] = true;
    entries.push({ path: path, blob: blob, when: when });
    indexRows.push({ file: path, category: folder, line: lineName(lineId), record: label, date: mediaDateStamp(when), note: note || '' });
  }
  photos.forEach(function (p) {
    if (!p || !p.blob) return;
    if (p.landownerId) {
      var lo = landownerById(p.landownerId);
      add('Permission & Boundary', (lo ? lo.name : 'Landowner') + (p.kind === 'boundary' ? ' — Boundary map' : ' — Permission slip'),
        lo ? lo.lineId : firstLineId, p, p.blob, '');
    } else if (p.tripId) {
      var tr = tripById(p.tripId);
      add('Trip Photos', 'Trip ' + (tr ? fmtDate(tr.date) : '') + (p.kind === 'map' ? ' — Directions' : (p.kind === 'note' ? ' — Note photo' : ' — Odometer')),
        tr ? tr.lineId : firstLineId, p, p.blob, '');
    } else if (p.logId) {
      var lg = logById(p.logId);
      var st = lg && lg.setId ? getSet(lg.setId) : null;
      add('Catch Photos', (st ? st.name : 'Catch') + ' — ' + (lg ? (lg.species || lg.otherType || 'Catch') : 'Catch'),
        st ? st.lineId : firstLineId, p, p.blob, '');
    } else if (p.setId) {
      var s2 = getSet(p.setId);
      add('Set Photos', s2 ? s2.name : 'Set', s2 ? s2.lineId : firstLineId, p, p.blob, '');
    } else if (p.markerId) {
      var mk = null;
      (Store.data.markers || []).forEach(function (x) { if (x.id === p.markerId) mk = x; });
      add('Forage & Finds', mk ? (mk.name || mk.label || mk.ref || 'Marker') : 'Marker',
        mk ? mk.lineId : firstLineId, p, p.blob, '');
    } else {
      /* No set/log/trip/landowner/marker link: a license-wallet photo.
         hl (Q245): the old 'Linked site: …' index note is gone too — a
         stored custom link is ignored everywhere now. */
      add('Licenses', p.name ? p.name.replace(/\.[A-Za-z0-9]+$/, '') : 'License',
        p.lineId || firstLineId, p, p.blob, '');
    }
  });
  memos.forEach(function (m) {
    if (!m || !m.blob) return;
    var ms = m.setId ? getSet(m.setId) : null;
    var mlg = m.logId ? logById(m.logId) : null;
    var mSet = ms || (mlg && mlg.setId ? getSet(mlg.setId) : null);
    add('Voice Memos', mSet ? mSet.name : (mlg ? (mlg.species || 'Catch memo') : 'Voice memo'),
      mSet ? mSet.lineId : firstLineId, m, m.blob,
      m.transcript ? 'Transcript: ' + m.transcript : '');
  });
  return { entries: entries, indexRows: indexRows };
}
function mediaIndexText(rows) {
  var out = ['Opossum Foot — media export index', 'Exported ' + new Date().toLocaleString(), rows.length + ' files', ''];
  rows.forEach(function (r) {
    out.push(r.file + '  |  Line: ' + r.line + '  |  ' + r.record + (r.note ? '  |  ' + r.note : ''));
  });
  return out.join('\n');
}
function exportMediaZip() {
  Promise.all([IDB.all('photos'), IDB.all('memos')]).then(function (res) {
    var built = buildMediaEntries(res[0], res[1]);
    if (!built.entries.length) { toast('No photos or voice memos on this phone yet.'); return null; }
    toast('Building your media file…');
    var rows = built.indexRows;
    var csv = 'File,Category,Line,Record,Date,Notes\n' + rows.map(function (r) {
      return [r.file, r.category, r.line, r.record, r.date, r.note].map(function (v) {
        return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
      }).join(',');
    }).join('\n');
    built.entries.unshift({ path: 'INDEX.csv', blob: new Blob([csv], { type: 'text/csv' }), when: Date.now() });
    built.entries.unshift({ path: 'INDEX.txt', blob: new Blob([mediaIndexText(rows)], { type: 'text/plain' }), when: Date.now() });
    return buildZipBlob(built.entries).then(function (zip) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(zip);
      a.download = 'opossum-foot-media-' + todayISO() + '.zip';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 3000);
      toast('Media file downloaded: ' + rows.length + ' photos & recordings from every line (' +
        (zip.size / 1048576).toFixed(1) + ' MB). The INDEX file inside says what each one is.');
    });
  }).catch(function () { toast('Media export hit a snag — your data is untouched. Try again.'); });
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
    /* fx: a shared line file takes the line-transfer path — it lands as a
       NEW line, never merged into the active one. */
    if (data && data.kind === 'line-transfer') { importLineTransfer(data); return; }
    /* fz: a photo pack takes its own path — photos re-attach by set name. */
    if (data && data.kind === 'photo-pack') { importPhotoPack(data); return; }
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
        noteLog: (Array.isArray(s.noteLog) && s.noteLog.length) ? s.noteLog : undefined, /* ga */
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

/* ================= fx (2026-11-15): LINE TRANSFER — share a line ================
   Tanner: send ONE line (sets + logs) to another trapper. The sender taps
   "Share this line" (Reports → Data) and the OS share sheet carries the file
   (AirDrop on iPhone, Nearby Share on Android, or Messages/email). The
   receiver saves the file, taps "Import data (JSON)", and the line lands as
   a NEW line beside their own: fresh ids on the line, every set and log,
   log→set links remapped, and the file's transfer id remembered so importing
   the same shared file twice never duplicates the line. Nothing of the
   receiver's is merged or overwritten. Photos never ride along (they live in
   IndexedDB, not the data file) — the photo gallery shares separately.
   Landowners, licenses and signs never travel: those are the sender's own. */
function buildLineTransfer(ln) {
  var sets = (Store.data.sets || []).filter(function (s) { return s && s.lineId === ln.id; });
  var setIds = {};
  sets.forEach(function (s) { setIds[s.id] = true; });
  var logs = (Store.data.logs || []).filter(function (l) {
    return l && (l.lineId === ln.id || setIds[l.setId]);
  });
  return {
    app: 'opossum-foot',
    kind: 'line-transfer',
    transferId: uid('t'),
    exportedAt: new Date().toISOString(),
    version: APP_VERSION,
    line: {
      id: ln.id, name: ln.name || 'Line', state: ln.state || '',
      home: (ln.home && isFinite(+ln.home.lat) && isFinite(+ln.home.lng)) ? { lat: +ln.home.lat, lng: +ln.home.lng } : null
    },
    sets: sets,
    logs: logs
  };
}

function shareActiveLine() {
  var ln = activeLine();
  if (!ln) { toast('No line to share yet.'); return; }
  var data = buildLineTransfer(ln);
  if (!data.sets.length && !data.logs.length) {
    toast('“' + ln.name + '” has no sets or logs to share yet.');
    return;
  }
  var fname = 'opossum-foot-line-' + lineFileSlug() + '-' + todayISO() + '.json';
  var blob = new Blob([JSON.stringify(data)], { type: 'application/json;charset=utf-8' });
  var file = null;
  try { file = new File([blob], fname, { type: 'application/json' }); } catch (e) { file = null; }
  var nav = (typeof navigator !== 'undefined') ? navigator : {};
  if (file && nav.canShare && nav.share) {
    var ok = false;
    try { ok = !!nav.canShare({ files: [file] }); } catch (e) { ok = false; }
    if (ok) {
      nav.share({ files: [file], title: 'Opossum Foot line — ' + ln.name }).catch(function (err) {
        if (!err || err.name !== 'AbortError') toast('Could not open the share sheet.');
      });
      return;
    }
  }
  /* No file share sheet on this browser: download the transfer file instead —
     the sender passes it along however they like. */
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fname;
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 3000);
  toast('Line file saved (' + data.sets.length + ' sets, ' + data.logs.length + ' logs). Send it to your buddy — they open Opossum Foot and tap “Import data (JSON)”.');
}

function findImportedTransfer(transferId) {
  var list = Store.data.importedTransfers;
  if (!Array.isArray(list) || !transferId) return null;
  for (var i = 0; i < list.length; i++) {
    var e = list[i];
    if (e && (e.id === transferId || e === transferId)) return e;
  }
  return null;
}

/* Accept-first: the receiver always sees what is about to land and taps
   "Add line" before anything is written. */
function importLineTransfer(data) {
  if (!data.line || !Array.isArray(data.sets) || !Array.isArray(data.logs)) {
    toast('That line file looks incomplete.'); return;
  }
  var prior = findImportedTransfer(data.transferId);
  if (prior) {
    toast('You already added this line' + (prior.name ? ' — it is in your lines as “' + prior.name + '”' : '') + '.');
    return;
  }
  var srcName = String(data.line.name || 'Shared line').trim() || 'Shared line';
  var nS = data.sets.length, nL = data.logs.length;
  showModal2(
    '<h3>Add this line?</h3>' +
    '<p><strong>' + esc(srcName) + '</strong> — ' + nS + ' set' + (nS === 1 ? '' : 's') + ', ' + nL + ' log' + (nL === 1 ? '' : 's') + '.</p>' +
    '<p>It lands as a new line of your own, beside your lines. Nothing of yours is changed, and nothing merges into it. Photos do not ride along in a line share.</p>' +
    '<div class="btn-row"><button class="btn-secondary" id="m2-cancel" type="button">Cancel</button>' +
    '<button class="btn-primary" id="m2-ok" type="button">Add line</button></div>'
  );
  $('m2-cancel').onclick = closeModal2;
  $('m2-ok').onclick = function () { closeModal2(); applyLineTransfer(data, srcName); };
}

function applyLineTransfer(data, srcName) {
  var d = Store.data;
  if (!Array.isArray(d.importedTransfers)) d.importedTransfers = [];
  /* A name the receiver already uses gets a number — two lines with the same
     name would confuse the line picker. */
  var taken = {};
  (d.lines || []).forEach(function (l) { taken[String((l && l.name) || '').toLowerCase()] = true; });
  var name = srcName, n = 2;
  while (taken[name.toLowerCase()]) { name = srcName + ' (' + n + ')'; n++; }
  var ln = {
    id: newLineId(), name: name,
    state: data.line.state || activeStateCode(),
    tabs: { history: true, scorecard: true, seasons: true, licenses: true }
  };
  if (data.line.home && isFinite(+data.line.home.lat) && isFinite(+data.line.home.lng)) {
    ln.home = { lat: +data.line.home.lat, lng: +data.line.home.lng };
    ln.homeAsked = true;
  }
  d.lines.push(ln);
  var setIdMap = {}, nSets = 0, nLogs = 0;
  data.sets.forEach(function (s) {
    if (!s || typeof s !== 'object') return;
    var c;
    try { c = JSON.parse(JSON.stringify(s)); } catch (e) { return; }
    var oldId = c.id;
    c.id = uid('s');
    c.lineId = ln.id;
    c.name = String(s.name || 'Set');
    c.lat = +s.lat || 0; c.lng = +s.lng || 0;
    c.status = normStatus(s.status);
    c.trapMods = Array.isArray(s.trapMods) ? s.trapMods.slice() : [];
    c.bait = toAttrArray(s.bait); c.lure = toAttrArray(s.lure); c.urine = toAttrArray(s.urine);
    c.visual = toAttrArray(s.visual); c.audio = toAttrArray(s.audio); c.other = toAttrArray(s.other);
    if (oldId) setIdMap[oldId] = c.id;
    d.sets.push(c); nSets++;
  });
  data.logs.forEach(function (l) {
    if (!l || typeof l !== 'object') return;
    var c;
    try { c = JSON.parse(JSON.stringify(l)); } catch (e) { return; }
    c.id = uid('l');
    c.lineId = ln.id;
    c.setId = (l.setId && setIdMap[l.setId]) ? setIdMap[l.setId] : null;
    c.setName = String(l.setName || '(imported)');
    c.species = String(l.species || 'Unknown');
    c.count = normCount(l);
    c.date = /^\d{4}-\d{2}-\d{2}$/.test(l.date || '') ? l.date : todayISO();
    c.seasonYear = l.seasonYear || seasonYearOf(c.date);
    c.bait = toAttrArray(l.bait); c.lure = toAttrArray(l.lure); c.urine = toAttrArray(l.urine);
    c.visual = toAttrArray(l.visual); c.audio = toAttrArray(l.audio); c.other = toAttrArray(l.other);
    d.logs.push(c); nLogs++;
  });
  if (data.transferId) d.importedTransfers.push({ id: data.transferId, name: name, at: Date.now() });
  Store.save();
  refreshMarkers(); renderHistory(); renderTotals();
  if (typeof renderLines === 'function') renderLines();
  toast('Added “' + name + '” as a new line — ' + nSets + ' sets, ' + nLogs + ' logs. Find it in the line picker.');
}

/* ================= fx (2026-11-15): PHOTO GALLERY =================
   Tanner: one place that shows every photo on the line, each labeled with
   what it belongs to. Every photo record already carries its link — setId
   for set photos, logId for catches, landownerId / tripId / markerId for the
   rest, and no link at all means the license wallet — the same taxonomy the
   media ZIP export (Q214) uses. View-only: tap opens the standard viewer
   (zoom + Save); deleting still happens on the set or catch itself. */
function galleryPhotoLabel(p) {
  if (p.landownerId) {
    var lo = landownerById(p.landownerId);
    return { title: lo ? lo.name : 'Landowner', sub: p.kind === 'boundary' ? 'Boundary map' : 'Permission slip', lineId: lo ? lo.lineId : p.lineId };
  }
  if (p.tripId) {
    var tr = tripById(p.tripId);
    return { title: 'Trip ' + (tr ? fmtDate(tr.date) : ''), sub: p.kind === 'map' ? 'Directions' : (p.kind === 'note' ? 'Note photo' : 'Odometer'), lineId: tr ? tr.lineId : p.lineId };
  }
  if (p.logId) {
    var lg = null;
    (Store.data.logs || []).forEach(function (x) { if (x.id === p.logId) lg = x; });
    var st = lg && lg.setId ? getSet(lg.setId) : (p.setId ? getSet(p.setId) : null);
    return {
      title: lg ? (lg.species || lg.otherType || 'Catch') : 'Catch',
      sub: (st ? st.name : (lg ? (lg.setName || '') : '')) + (lg ? ' · ' + fmtDate(lg.date) : ''),
      lineId: st ? st.lineId : p.lineId
    };
  }
  if (p.setId) {
    var s2 = getSet(p.setId);
    if (!s2) return null; /* the set is gone; its photos are cascade-deleted with it */
    return { title: s2.name, sub: 'Set photo', lineId: s2.lineId };
  }
  if (p.markerId) {
    var mk = null;
    (Store.data.markers || []).forEach(function (x) { if (x.id === p.markerId) mk = x; });
    return { title: mk ? (mk.name || mk.label || mk.ref || 'Marker') : 'Marker', sub: 'Forage & Finds', lineId: mk ? mk.lineId : p.lineId };
  }
  return { title: p.name ? String(p.name).replace(/\.[A-Za-z0-9]+$/, '') : 'License', sub: 'Paperwork', lineId: p.lineId };
}

function openGallery() {
  openSheet('sheet-gallery');
  renderGallery();
}

function renderGallery() {
  var grid = $('gallery-grid'), empty = $('gallery-empty');
  if (!grid) return;
  grid.innerHTML = '';
  if (empty) empty.hidden = true;
  IDB.all('photos').then(function (all) {
    var lid = activeLineId(), items = [];
    (all || []).forEach(function (p) {
      if (!p || !p.blob) return;
      var lab = galleryPhotoLabel(p);
      if (!lab || lab.lineId !== lid) return;
      items.push({ p: p, title: lab.title, sub: lab.sub });
    });
    items.sort(function (a, b) { return (b.p.createdAt || 0) - (a.p.createdAt || 0); });
    if (!items.length) { if (empty) empty.hidden = false; return; }
    items.forEach(function (it) {
      var tile = document.createElement('div');
      tile.className = 'gal-tile';
      var img = document.createElement('img');
      img.src = photoURL(it.p);
      img.alt = it.title;
      tile.appendChild(img);
      var cap = document.createElement('div');
      cap.className = 'gal-cap';
      cap.innerHTML = '<span class="gal-title">' + esc(it.title) + '</span>' +
        (it.sub ? '<span class="gal-sub">' + esc(it.sub) + '</span>' : '');
      tile.appendChild(cap);
      tile.onclick = function () { openPhotoViewer(it.p, null, true); };
      grid.appendChild(tile);
    });
  }).catch(function () { if (empty) empty.hidden = false; });
}

/* ================= fz (2026-11-15): PHOTO PACK — share a line's photos =====
   Tanner: photos travel separately from the line share (fx). The sender opens
   the photo gallery and taps "Share photo pack" — one JSON file carrying the
   active line's SET and CATCH photos (slips, trips, signs and paperwork stay
   home: what they belong to doesn't travel). The receiver imports the line
   first, then the pack (same Import button): each photo names the set it
   belongs to, and on the other phone it re-attaches to the set with that
   name on the matching line — catch photos also name their catch (date +
   species), so they land back on the right log entry when it can be found.
   A pack is remembered by id, so importing it twice never doubles photos. */
function blobToDataURL(blob) {
  return new Promise(function (resolve, reject) {
    var r = new FileReader();
    r.onload = function () { resolve(String(r.result || '')); };
    r.onerror = function () { reject(r.error); };
    r.readAsDataURL(blob);
  });
}
function dataURLToBlob(durl) {
  var m = /^data:([^;,]*)(;base64)?,([\s\S]*)$/.exec(String(durl || ''));
  if (!m) return null;
  var bin = atob(m[3]);
  var bytes = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: m[1] || 'image/jpeg' });
}
function packPhotoOwner(p) {
  /* The set a photo belongs to, and its catch (log) when it has one. */
  var log = null;
  if (p.logId) {
    (Store.data.logs || []).forEach(function (x) { if (x.id === p.logId) log = x; });
  }
  var set = p.setId ? getSet(p.setId) : null;
  if (!set && log && log.setId) set = getSet(log.setId);
  return { set: set, log: log };
}
function buildPhotoPack(ln) {
  return IDB.all('photos').then(function (all) {
    var jobs = [];
    (all || []).forEach(function (p) {
      if (!p || !p.blob || (!p.setId && !p.logId)) return;
      var lab = galleryPhotoLabel(p);
      if (!lab || lab.lineId !== ln.id) return;
      var own = packPhotoOwner(p);
      if (!own.set) return;
      jobs.push(blobToDataURL(p.blob).then(function (durl) {
        return {
          setName: own.set.name,
          kind: p.kind || null,
          name: p.name || '',
          mime: (p.blob && p.blob.type) || p.mime || 'image/jpeg',
          createdAt: p.createdAt || Date.now(),
          log: own.log ? { date: own.log.date || '', species: own.log.species || own.log.otherType || '' } : null,
          data: durl
        };
      }).catch(function () { return null; }));
    });
    return Promise.all(jobs).then(function (photos) {
      return {
        app: 'opossum-foot',
        kind: 'photo-pack',
        packId: uid('pk'),
        exportedAt: new Date().toISOString(),
        version: APP_VERSION,
        lineName: ln.name || 'Line',
        photos: photos.filter(function (x) { return !!x; })
      };
    });
  });
}
function shareJsonFile(blob, fname, title, doneToast) {
  var file = null;
  try { file = new File([blob], fname, { type: 'application/json' }); } catch (e) { file = null; }
  var nav = (typeof navigator !== 'undefined') ? navigator : {};
  if (file && nav.canShare && nav.share) {
    var ok = false;
    try { ok = !!nav.canShare({ files: [file] }); } catch (e) { ok = false; }
    if (ok) {
      nav.share({ files: [file], title: title }).catch(function (err) {
        if (!err || err.name !== 'AbortError') toast('Could not open the share sheet.');
      });
      return;
    }
  }
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fname;
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 3000);
  if (doneToast) toast(doneToast);
}
function sharePhotoPack() {
  var ln = activeLine();
  if (!ln) { toast('No line to share photos from yet.'); return; }
  buildPhotoPack(ln).then(function (pack) {
    if (!pack.photos.length) {
      toast('No set or catch photos on “' + ln.name + '” yet — those are the photos a pack carries.');
      return;
    }
    var fname = 'opossum-foot-photos-' + lineFileSlug() + '-' + todayISO() + '.json';
    var blob = new Blob([JSON.stringify(pack)], { type: 'application/json;charset=utf-8' });
    shareJsonFile(blob, fname, 'Opossum Foot photos — ' + ln.name,
      'Photo pack saved (' + pack.photos.length + ' photos). Send it to your buddy — they import the line first, then this pack, and the photos re-attach to the sets.');
  }).catch(function () { toast('Could not build the photo pack.'); });
}
function normNameKey(s) { return String(s || '').trim().toLowerCase(); }
function findPhotoPackLine(data) {
  /* The receiver's line these photos belong to: the one holding the most of
     the pack's set names; the pack's line name breaks a tie. */
  var want = {};
  (data.photos || []).forEach(function (p) { if (p && p.setName) want[normNameKey(p.setName)] = true; });
  var best = null;
  (Store.data.lines || []).forEach(function (ln) {
    if (!ln) return;
    var names = {};
    (Store.data.sets || []).forEach(function (s) {
      if (s && s.lineId === ln.id) names[normNameKey(s.name)] = true;
    });
    var n = 0;
    Object.keys(want).forEach(function (k) { if (names[k]) n++; });
    var score = n * 2 + (normNameKey(ln.name) === normNameKey(data.lineName) ? 1 : 0);
    if (n > 0 && (!best || score > best.score)) best = { line: ln, matched: n, score: score };
  });
  return best;
}
function importPhotoPack(data) {
  if (!Array.isArray(data.photos) || !data.photos.length) {
    toast('That photo pack looks empty.'); return;
  }
  var packs = Store.data.importedPacks;
  if (Array.isArray(packs) && data.packId && packs.indexOf(data.packId) !== -1) {
    toast('You already added this photo pack.'); return;
  }
  var found = findPhotoPackLine(data);
  if (!found) {
    toast('None of the sets in this photo pack are on any of your lines. Import the line share first, then this pack.');
    return;
  }
  var ln = found.line;
  var setNames = {};
  (Store.data.sets || []).forEach(function (s) {
    if (s && s.lineId === ln.id) setNames[normNameKey(s.name)] = true;
  });
  var can = 0;
  data.photos.forEach(function (p) { if (p && setNames[normNameKey(p.setName)]) can++; });
  var cant = data.photos.length - can;
  showModal2(
    '<h3>Add these photos?</h3>' +
    '<p><strong>' + data.photos.length + ' photo' + (data.photos.length === 1 ? '' : 's') + '</strong> for <strong>' + esc(ln.name) + '</strong> — each one re-attaches to the set with the same name.' +
    (cant ? ' ' + cant + ' of them name a set that is not on that line and will be skipped.' : '') + '</p>' +
    '<div class="btn-row"><button class="btn-secondary" id="m2-cancel" type="button">Cancel</button>' +
    '<button class="btn-primary" id="m2-ok" type="button">Add photos</button></div>'
  );
  $('m2-cancel').onclick = closeModal2;
  $('m2-ok').onclick = function () { closeModal2(); applyPhotoPack(data, ln); };
}
function applyPhotoPack(data, ln) {
  var setByName = {};
  (Store.data.sets || []).forEach(function (s) {
    if (s && s.lineId === ln.id) setByName[normNameKey(s.name)] = s;
  });
  var logByKey = {};
  (Store.data.logs || []).forEach(function (l) {
    if (!l || l.lineId !== ln.id || !l.setId) return;
    var k = l.setId + '|' + (l.date || '') + '|' + normNameKey(l.species || l.otherType || '');
    if (!logByKey[k]) logByKey[k] = l;
  });
  var jobs = [], skipped = 0;
  data.photos.forEach(function (p) {
    var set = p && setByName[normNameKey(p.setName)];
    if (!set) { skipped++; return; }
    var blob = dataURLToBlob(p.data);
    if (!blob) { skipped++; return; }
    var rec = {
      id: uid('p'), setId: set.id, lineId: ln.id,
      name: p.name || '', blob: blob,
      mime: p.mime || blob.type || 'image/jpeg',
      createdAt: p.createdAt || Date.now()
    };
    if (p.kind) rec.kind = p.kind;
    if (p.log) {
      var lg = logByKey[set.id + '|' + (p.log.date || '') + '|' + normNameKey(p.log.species || '')];
      if (lg) rec.logId = lg.id;
    }
    jobs.push(IDB.put('photos', rec).then(function () { return true; }).catch(function () { return false; }));
  });
  Promise.all(jobs).then(function (results) {
    var added = results.filter(function (x) { return x; }).length;
    skipped += results.length - added;
    if (!Array.isArray(Store.data.importedPacks)) Store.data.importedPacks = [];
    if (data.packId) Store.data.importedPacks.push(data.packId);
    Store.save();
    renderGallery(); renderHistory();
    toast('Added ' + added + ' photo' + (added === 1 ? '' : 's') + ' to “' + ln.name + '” — attached to their sets.' +
      (skipped ? ' ' + skipped + ' skipped.' : ''));
  });
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
/* Q185: coordinates hiding inside a Google Maps URL. Tries, in order:
   the !3d<lat>!4d<lng> pair in place URLs, ?q=<lat>,<lng> (or &q=),
   the /@<lat>,<lng> viewport center, and ll=<lat>,<lng>. Then (ea):
   a bare "<lat>,<lng>" path segment — Google's Saved-list CSV writes
   dropped pins as …/search/<lat>,<lng> — and the ?api=1&query=
   parameter of share links. A 0,0 pair is Google's "no location"
   placeholder and never counts as a hit. */
function coordsFromMapsUrl(url) {
  if (!url) return null;
  var s = String(url), m;
  function take(latS, lngS) {
    var lat = parseFloat(latS), lng = parseFloat(lngS);
    if (!validPinCoord(lat, lng)) return null;
    if (lat === 0 && lng === 0) return null;
    return { lat: lat, lng: lng };
  }
  var hit = null;
  m = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(s);
  if (m) hit = take(m[1], m[2]);
  if (!hit) { m = /[?&]q=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/.exec(s); if (m) hit = take(m[1], m[2]); }
  if (!hit) { m = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(s); if (m) hit = take(m[1], m[2]); }
  if (!hit) { m = /[?&]ll=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(s); if (m) hit = take(m[1], m[2]); }
  if (!hit) {
    /* Path portion only (query/fragment stripped): a segment that is
       exactly "<lat>,<lng>", e.g. /search/41.9647303,-94.2002662 —
       also covers /place/ and /dir/ style tails. */
    var pathOnly = s.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]*/i, '').split(/[?#]/)[0];
    m = /(?:^|\/)(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)(?:\/|$)/.exec(pathOnly);
    if (m) hit = take(m[1], m[2]);
  }
  if (!hit) { m = /[?&]query=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/.exec(s); if (m) hit = take(m[1], m[2]); }
  return hit;
}
function isShortMapsLink(url) {
  return /(maps\.app\.goo\.gl|goo\.gl)\//i.test(String(url || ''));
}
/* Q185: short Maps links hide the location behind a redirect. Follow it
   (needs a connection) and read the coordinates off the final URL.
   Q230 (2026-11-05): a plain fetch dies here — Google's Maps pages send
   no Access-Control-Allow-Origin, so the browser rejects the fetch before
   it ever sees the final URL. mode:'no-cors' returns an opaque response
   whose .url (the final URL after the redirect) is still readable, and
   that is all the parser needs. */
function resolveMapsLink(url) {
  if (typeof fetch !== 'function') return Promise.resolve(null);
  return fetch(url, { redirect: 'follow', mode: 'no-cors' }).then(function (res) {
    return coordsFromMapsUrl(res && res.url ? res.url : url);
  }).catch(function () { return null; });
}
/* The place name riding in a /place/<name>/ Maps URL, when there is one. */
function placeNameFromMapsUrl(url) {
  var m = /\/place\/([^/]+)/.exec(String(url || ''));
  if (!m) return '';
  var raw = m[1].replace(/\+/g, ' ');
  try { return decodeURIComponent(raw).trim(); } catch (e) { return raw.trim(); }
}
/* Q185: KMZ is a zip archive holding one KML file. Minimal reader — no
   libraries: stored entries pass straight through, deflate entries
   inflate through the browser's built-in DecompressionStream. Returns
   a Promise of the KML text, or null when no readable KML is inside. */
function kmzToKmlText(buf) {
  try {
    var bytes = new Uint8Array(buf);
    var view = new DataView(buf);
    /* End Of Central Directory record: scan the tail for its signature. */
    var eocd = -1, minPos = Math.max(0, bytes.length - 65558);
    for (var i = bytes.length - 22; i >= minPos; i--) {
      if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) return Promise.resolve(null);
    var count = view.getUint16(eocd + 10, true);
    var off = view.getUint32(eocd + 16, true);
    var decoder = new TextDecoder();
    var target = null, fallback = null;
    for (var n = 0; n < count; n++) {
      if (view.getUint32(off, true) !== 0x02014b50) break;
      var nameLen = view.getUint16(off + 28, true);
      var extraLen = view.getUint16(off + 30, true);
      var commentLen = view.getUint16(off + 32, true);
      var name = decoder.decode(bytes.subarray(off + 46, off + 46 + nameLen));
      if (/\.kml$/i.test(name)) {
        var entry = {
          method: view.getUint16(off + 10, true),
          compSize: view.getUint32(off + 20, true),
          localOff: view.getUint32(off + 42, true)
        };
        if (/doc\.kml$/i.test(name)) { target = entry; break; }
        if (!fallback) fallback = entry;
      }
      off += 46 + nameLen + extraLen + commentLen;
    }
    var pick = target || fallback;
    if (!pick) return Promise.resolve(null);
    var lo = pick.localOff;
    if (view.getUint32(lo, true) !== 0x04034b50) return Promise.resolve(null);
    var start = lo + 30 + view.getUint16(lo + 26, true) + view.getUint16(lo + 28, true);
    var comp = bytes.subarray(start, start + pick.compSize);
    if (pick.method === 0) return Promise.resolve(decoder.decode(comp));
    if (pick.method === 8 && typeof DecompressionStream !== 'undefined' && typeof Blob !== 'undefined') {
      var stream = new Blob([comp]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return new Response(stream).text().catch(function () { return null; });
    }
    return Promise.resolve(null);
  } catch (e) { return Promise.resolve(null); }
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
   both accepted. The returned array carries a .noLoc list — the names of
   Point features that had no usable location, so the import summary can
   name them instead of dropping them silently. */
function parseGeoJsonPins(text) {
  var data = JSON.parse(text);
  var feats = Array.isArray(data.features) ? data.features
    : (data && data.type === 'Feature' ? [data] : []);
  var pins = [], noLoc = [];
  feats.forEach(function (f) {
    if (!f || !f.geometry || f.geometry.type !== 'Point') return;
    var p = f.properties || {};
    var name = p.name != null ? p.name : (p.Name != null ? p.Name : (p.title != null ? p.title : ''));
    name = String(name).trim();
    var c = f.geometry.coordinates;
    var lng = (c && c.length >= 2) ? +c[0] : NaN;
    var lat = (c && c.length >= 2) ? +c[1] : NaN;
    if (validPinCoord(lat, lng) && !(lat === 0 && lng === 0)) {
      pins.push({ name: name, lat: lat, lng: lng });
      return;
    }
    /* Q184: Google sometimes exports a saved place with coordinates
       [0,0] — its "no location available" placeholder — while the real
       spot rides along in the google_maps_url property. Rescue it from
       there; never plant a set in the ocean at 0,0. */
    var rescued = coordsFromMapsUrl(p.google_maps_url || '');
    if (rescued) { pins.push({ name: name, lat: rescued.lat, lng: rescued.lng }); return; }
    noLoc.push(name || 'Unnamed place');
  });
  pins.noLoc = noLoc;
  return pins;
}
/* Q185: Google Takeout "Saved" lists arrive as spreadsheets (CSV) —
   Title, Note, URL, Comment. Small quoted-field CSV reader; enough for
   what Google writes. */
function parseCsvTable(text) {
  var rows = [], row = [], field = '', inQ = false;
  var s = String(text || '').replace(/^\uFEFF/, '');
  for (var i = 0; i < s.length; i++) {
    var c = s[i];
    if (inQ) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else if (c === '"') { inQ = true; }
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(field); field = ''; rows.push(row); row = [];
    } else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}
/* Splits a Saved-list CSV into: pins (coordinates read straight out of
   the row's URL), jobs (short links that still need resolving online),
   and noLoc (rows with no location to give, kept by name). */
function savedCsvJobs(text) {
  var rows = parseCsvTable(text);
  var out = { pins: [], jobs: [], noLoc: [] };
  if (!rows.length) return out;
  var head = rows[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var ti = head.indexOf('title'), ui = head.indexOf('url');
  if (ui === -1) return out;
  for (var r = 1; r < rows.length; r++) {
    var row = rows[r];
    var name = ti >= 0 ? String(row[ti] || '').trim() : '';
    var url = String(row[ui] || '').trim();
    if (!url) { if (name) out.noLoc.push(name); continue; }
    var hit = coordsFromMapsUrl(url);
    if (hit) { out.pins.push({ name: name, lat: hit.lat, lng: hit.lng }); continue; }
    if (isShortMapsLink(url)) { out.jobs.push({ name: name, url: url }); continue; }
    out.noLoc.push(name || placeNameFromMapsUrl(url) || 'Unnamed place');
  }
  return out;
}
function importSavedCsvText(text) {
  var parsed;
  try { parsed = savedCsvJobs(text); }
  catch (e) { toast('Could not read that pin file.'); return; }
  var pins = parsed.pins, noLoc = parsed.noLoc.slice();
  if (!parsed.jobs.length) { finishPinParse(pins, noLoc); return; }
  toast('Looking up ' + parsed.jobs.length + ' pin link' + (parsed.jobs.length === 1 ? '' : 's') + '…');
  Promise.all(parsed.jobs.map(function (j) {
    return resolveMapsLink(j.url).then(function (coords) {
      if (coords) pins.push({ name: j.name, lat: coords.lat, lng: coords.lng });
      else noLoc.push(j.name || 'Unnamed place');
    });
  })).then(function () { finishPinParse(pins, noLoc); });
}
/* Shared landing for every pin-file parse: import what was placed, and
   say plainly — by name — what had no location to give. */
function finishPinParse(pins, noLoc) {
  pins = pins || []; noLoc = noLoc || [];
  if (!pins.length) {
    if (noLoc.length) {
      toast('No pins could be placed from that file — Google left the location out of ' +
        noLoc.length + ': ' + noLoc.slice(0, 3).join(', ') + (noLoc.length > 3 ? '…' : '') + '.');
    } else {
      toast('No pins found in that file.');
    }
    return;
  }
  runPinImport(pins, noLoc);
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
  var lower = String((file && file.name) || '').toLowerCase();
  /* Q185: KMZ is binary — read it as bytes and unzip in the browser. */
  if (/\.kmz$/i.test(lower) && file.arrayBuffer) {
    file.arrayBuffer().then(function (buf) { return kmzToKmlText(buf); }).then(function (kml) {
      if (!kml) { toast('Could not read that pin file.'); return; }
      var pins;
      try { pins = parseKmlPins(kml); }
      catch (e) { toast('Could not read that pin file.'); return; }
      finishPinParse(pins, []);
    }).catch(function () { toast('Could not read that pin file.'); });
    return;
  }
  var reader = new FileReader();
  reader.onload = function () {
    var text = String(reader.result);
    /* Q185: Takeout "Saved" lists are CSV spreadsheets, by extension or
       by their unmistakable header row. */
    if (/\.csv$/i.test(lower) || /^title,note,url/i.test(text.replace(/^\s+/, ''))) {
      importSavedCsvText(text);
      return;
    }
    var pins;
    try { pins = parsePinsFile(file.name, text); }
    catch (e) { toast('Could not read that pin file.'); return; }
    finishPinParse(pins, (pins && pins.noLoc) || []);
  };
  reader.readAsText(file);
}
/* Q185: paste-a-link — one pin from a Google Maps share link. In Maps:
   Share → Copy link, paste it here. Same set-creation path and the same
   duplicate check as a file import. */
function importPinFromLink() {
  showModal(
    '<h3>Paste a Maps link</h3>' +
    '<p>In Google Maps, open the place or dropped pin, tap <strong>Share</strong>, copy the link, and paste it here.</p>' +
    '<input type="text" id="m-pinlink" placeholder="https://maps.app.goo.gl/…" autocomplete="off" style="width:100%;margin:8px 0">' +
    '<div class="btn-row"><button class="btn-secondary" id="m-pinlink-cancel" type="button">Cancel</button>' +
    '<button class="btn-primary" id="m-pinlink-go" type="button">Add pin</button></div>'
  );
  var inp = $('m-pinlink');
  $('m-pinlink-cancel').onclick = closeModal;
  $('m-pinlink-go').onclick = function () {
    var url = (inp.value || '').trim();
    if (!url) { toast('Paste the link first.'); return; }
    function done(coords) {
      if (!coords) { toast('Could not find a location in that link.'); return; }
      closeModal();
      runPinImport([{ name: placeNameFromMapsUrl(url), lat: coords.lat, lng: coords.lng }], []);
    }
    var hit = coordsFromMapsUrl(url);
    if (hit) { done(hit); return; }
    if (isShortMapsLink(url)) {
      toast('Looking up that link…');
      resolveMapsLink(url).then(done);
      return;
    }
    toast('Could not find a location in that link.');
  };
  setTimeout(function () { try { inp.focus(); } catch (e) { /* noop */ } }, 150);
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
function runPinImport(pins, noLoc) {
  var lineId = activeLineId();
  if (!lineId) { toast('Add a trap line first.'); return; }
  var existing = activeSets().slice();
  var counts = { imported: 0, skipped: 0, merged: 0, deleted: 0 };
  var i = 0;
  function finish() {
    Store.save(); refreshMarkers(); renderHistory(); renderTotals();
    var msg = 'Pin import: ' + counts.imported + ' imported, ' + counts.skipped + ' skipped, ' + counts.merged + ' merged, ' + counts.deleted + ' deleted.';
    /* Q185: places Google left location-less are reported by name in
       the same breath — never silently dropped. */
    if (noLoc && noLoc.length) {
      msg += ' ' + noLoc.length + ' had no location in the file: ' +
        noLoc.slice(0, 3).join(', ') + (noLoc.length > 3 ? '…' : '') + '.';
    }
    toast(msg);
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
  if (name === 'reports') { renderExportDimChips(); renderExportFilterBar(); } /* Q231: the filters live on the Reports tab now — draw them when it opens, not only after a Settings visit */
  if (name === 'scorecard') renderScorecardTab();
  if (name === 'totals') renderTotals();
  if (name === 'seasons') renderSeasons($('seasons-search').value);
  if (name === 'licenses') { renderLicenses(); renderLandowners(); renderPaperworkMileage(); renderMyTags(); }
  if (name === 'lines') renderLines();
  reportViewport(); /* fj: keep the About diagnostic fresh, incl. bannerB while on the map */
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
  renderPaperworkMileage(); /* df: mileage follows the active line */
  renderMyTags(); /* gw: tag records follow the active line too */
  renderMapStatusFilters();
  buildStateSelect($('settings-state'), activeStateCode());
  renderSettingsLineName();
  renderTabToggles();
  renderCatchAlertsToggle(); /* Q182 */
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
  exitSelMode(); /* gz: a pick belongs to the line it was made on */
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
      '<button type="button" class="btn-small btn-secondary line-edit" data-act="edit">Edit</button>' +
      '</div>';
  }).join('');
  var rows = box.querySelectorAll('.line-row');
  for (var i = 0; i < rows.length; i++) {
    (function (row) {
      var id = row.getAttribute('data-line');
      row.querySelector('[data-act="switch"]').onclick = function () { activateLine(id); };
      row.querySelector('[data-act="edit"]').onclick = function () { showLineEditModal(id); };
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
      if (Array.isArray(d.activity)) d.activity = d.activity.filter(function (a) { return !(a.lineId === id || deadSetIds[a.setId]); }); /* Q272 */
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
   photos, mileage trips, and landowners stay on the source line.
   Q222 (2026-10-27, Tanner's pick): the dialog offers a checkbox — checked by
   default, shown only when the source line has landowners — to copy the
   landowner notebook too: records (fresh ids) AND their IDB photos (slips +
   boundary maps, re-keyed to the new records, lineId = the clone). The dialog
   says plainly the copies are last season's notes — permission still gets
   re-confirmed for the new season, the app copying a slip grants nothing. */
function cloneLine(id) {
  var d = Store.data;
  var src = lineById(d, id);
  if (!src) return;
  var nSets = 0;
  d.sets.forEach(function (s) { if (s.lineId === id) nSets++; });
  var nLo = 0;
  (d.landowners || []).forEach(function (lo) { if (lo && lo.lineId === id) nLo++; });
  /* Q83: the confirm doubles as the rename box — prefilled "<name> (copy)",
     editable — and spells out what crosses over and what stays behind. */
  showModal(
    '<h3>Clone \u201C' + esc(src.name) + '\u201D?</h3>' +
    '<label class="field" for="m-clone-name">Line name</label>' +
    '<input type="text" id="m-clone-name" maxlength="40" value="' + esc(src.name + ' (copy)') + '">' +
    '<p style="margin-top:10px">The new line gets this line\u2019s set locations and trap setups' +
    (nSets ? ' (' + nSets + ' set' + (nSets === 1 ? '' : 's') + ')' : '') +
    ' \u2014 no catches, no check history, no set photos, and no bait or lure (that changes day to day). ' +
    'Sets come back active with a fresh check clock.</p>' +
    (nLo ? '<label class="checkline" style="margin-top:12px"><input type="checkbox" id="m-clone-lo" checked>' +
      '<span>Also copy the landowner notebook \u2014 ' + nLo + ' landowner' + (nLo === 1 ? '' : 's') +
      ': names, phone numbers, notes, boundaries, and permission-slip and boundary photos.</span></label>' +
      '<p class="dim" style="margin-top:6px">Copies as last season\u2019s notes \u2014 re-confirm permission for the new season.</p>' : '') +
    '<div class="btn-row"><button class="btn-secondary" id="m-cancel" type="button">Cancel</button>' +
    '<button class="btn-primary" id="m-ok" type="button">Clone line</button></div>'
  );
  setTimeout(function () { var el = $('m-clone-name'); if (el) el.focus(); }, 60);
  $('m-cancel').onclick = closeModal;
  $('m-ok').onclick = function () {
    $('m-ok').disabled = true; /* Q222: photo copies finish async — no double-clone on a double tap */
    var copyLo = !!($('m-clone-lo') && $('m-clone-lo').checked);
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
          setType: s.setType, variation: s.variation || '', trapType: s.trapType, /* Q212: a copied set keeps its variation */
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
      /* Q222: landowner notebook copy — records first (fresh ids), then the
         IDB photos re-keyed to them. Best-effort on photos: the clone lands
         either way and the toast says if a photo did not copy. */
      var loCopied = 0, loPhotoChain = null;
      if (copyLo) {
        if (!Array.isArray(d.landowners)) d.landowners = [];
        var loIdMap = {};
        d.landowners.slice().forEach(function (lo) {
          if (!lo || lo.lineId !== id) return;
          var lc = { id: newLandownerId(), lineId: ln.id, name: lo.name, phones: lo.phones,
                     notes: lo.notes, boundaryNote: lo.boundaryNote, createdAt: Date.now() };
          d.landowners.push(lc); loIdMap[lo.id] = lc.id; loCopied++;
        });
        if (loCopied) {
          loPhotoChain = IDB.all('photos').then(function (all) {
            var chain = Promise.resolve();
            all.forEach(function (p) {
              if (p && p.landownerId && loIdMap[p.landownerId]) {
                chain = chain.then(function () {
                  return IDB.put('photos', { id: uid('p'), landownerId: loIdMap[p.landownerId], kind: p.kind, name: p.name, blob: p.blob, lineId: ln.id, createdAt: Date.now() });
                });
              }
            });
            return chain;
          });
        }
      }
      var finishClone = function (photoFailed) {
        closeModal();
        rememberEntry('linename', ln.name); /* Q12 */
        Store.save();
        activateLine(ln.id);
        maybePromptHomeOnce(); /* Q53: cloned line gets the home question once, skippable */
        refreshForLine();
        renderLines();
        toast('Line cloned \u2014 ' + nSets + ' set' + (nSets === 1 ? '' : 's') + ' carried over.' +
          (loCopied ? ' Landowner notebook copied too.' : '') +
          (photoFailed ? ' One photo did not copy.' : ''));
      };
      if (loPhotoChain) loPhotoChain.then(function () { finishClone(false); }, function () { finishClone(true); });
      else finishClone(false);
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
/* ho (2026-11-21, Q254, Tanner): opening a collapsible card scrolls the
   pane so the card's header lands at the top of the visible area, just
   under the trap-line bar — the opened card is what he's looking at, so
   it comes to him. Closing never yanks the scroll. */
function scrollHeadIntoView(head) {
  if (!head || !head.scrollIntoView) return;
  requestAnimationFrame(function () {
    try { head.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (e) {}
  });
}
function toggleSettingsSection(secId) {
  var sec = $(secId), body = $(secId + '-body'), head = $(secId + '-head');
  if (!sec || !body || !head) return false;
  var willOpen = !sec.classList.contains('open');
  if (willOpen) { sec.classList.add('open'); body.hidden = false; }
  else { sec.classList.remove('open'); body.hidden = true; }
  if (willOpen) reportViewport(); /* fj: refresh the About diagnostic when opened */
  head.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
  if (willOpen) scrollHeadIntoView(head); /* ho (Q254) */
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
  /* Q178: notesId may be a textarea (edit forms) or a view-only div (detail sheet). */
  var ntxt = nv ? (nv.value !== undefined ? nv.value : nv.textContent) || '' : '';
  var hasNotes = !!(ntxt.trim() && ntxt.trim() !== '—');
  /* ga: on the set form the box is just the composer — filed entries count too. */
  if (notesId === 'sf-notes' && document.querySelectorAll('#sf-note-entries .note-entry').length) hasNotes = true;
  var mb = memosId && $(memosId);
  var hasMemos = !!(mb && mb.querySelector('.memo-card'));
  var pb = photosId && $(photosId);
  var hasPhotos = !!(pb && pb.querySelector('img'));
  setSectionOpen(secId, hasNotes || hasMemos || hasPhotos);
  if (secId === 'setdetail-notessec') refreshDetailNotes(hasNotes, hasMemos, hasPhotos);
}
/* ho (2026-11-21, Q251, Tanner): on the set detail's read view, a part of
   Notes, Memos & Photos shows only when it has something in it — no bare
   "Voice memos" label over nothing. When all three are empty the section
   header stays and the opened body carries one quiet line instead. */
function refreshDetailNotes(hasNotes, hasMemos, hasPhotos) {
  var t = function (id, show) { var el = $(id); if (el) el.hidden = !show; };
  t('sd-notes-head', hasNotes); t('sd-notes', hasNotes);
  t('sd-memos-label', hasMemos); t('sd-memos', hasMemos);
  t('sd-photos-label', hasPhotos); t('sd-photos', hasPhotos);
  t('sd-notes-empty', !(hasNotes || hasMemos || hasPhotos));
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
  /* gn: my trap tag — plain text, saved like every other setting; shown
     back on the Seasons tab beside the state's trap-tag rule. */
  var tagInput = $('settings-traptag');
  if (tagInput) {
    tagInput.value = Store.data.trapTag || '';
    tagInput.onchange = function () {
      Store.data.trapTag = this.value.trim();
      Store.save();
      toast(Store.data.trapTag ? 'Trap tag saved.' : 'Trap tag cleared.');
    };
  }
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
  /* gw: tag records toggle — off hides the catch-sheet Tag section and
     My Tags everywhere; stored records are never deleted. Default on. */
  var tagBox = $('settings-tagrecords');
  if (tagBox) {
    tagBox.checked = tagRecordsOn();
    tagBox.onchange = function () {
      Store.data.tagRecordsOn = this.checked;
      Store.save();
      renderMyTags();
      toast(this.checked ? 'Tag records are on.' : 'Tag records are off — records already saved stay on this phone.');
    };
  }
  /* fy: ruler toggle — off hides the map's measure button entirely. Default on. */
  var rulerBox = $('settings-ruler');
  if (rulerBox) {
    rulerBox.checked = Store.data.rulerOn !== false;
    rulerBox.onchange = function () {
      Store.data.rulerOn = this.checked;
      Store.save(); applyFeatureToggles();
      toast(this.checked ? 'Map ruler is on.' : 'Map ruler is off.');
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
  /* Q182: per-line catch alerts — the Settings switch writes to the
     active line, like the tab toggles above it. */
  var caBox = $('settings-catchalerts');
  if (caBox) {
    caBox.onchange = function () {
      var l = activeLine();
      if (!l) return;
      l.catchAlerts = this.checked;
      Store.save();
      toast(this.checked
        ? 'Catch warnings are on for ' + l.name + '.'
        : 'Catch warnings are off for ' + l.name + ' — the season badges still show.');
    };
  }
  renderCatchAlertsToggle();
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
  /* Q205 (2026-10-19): Tanner — the Sign & Forage Reference lives in the
     Trapper's Guide as its own chapter (listed in the table of contents),
     with a search bar pinned at the top of the chapter. The chapter is
     rendered from the live marker catalogs (markers.js renderSignReference),
     so it never drifts from the pins themselves. */
  function fillGuideBody() {
    $('guide-title').textContent = "Trapper's guide";
    $('guide-body').innerHTML = (window.OPOSSUM_FOOT_GUIDE_HTML || '<p class="dim">Guide not loaded.</p>') +
      '<h3>Sign &amp; Forage Reference</h3>' +
      '<p>The field information behind every marker — how to read the sign, who makes it, and the sources it stands on.</p>' +
      '<div class="guide-ref-search"><input type="search" id="guide-ref-q" placeholder="Search the reference — a kind, an animal, a food…" autocomplete="off"></div>' +
      '<div id="guide-ref-host"></div>';
    if (window.renderSignReference) window.renderSignReference($('guide-ref-host'), '');
    var q = $('guide-ref-q');
    if (q) q.addEventListener('input', function () {
      if (window.renderSignReference) window.renderSignReference($('guide-ref-host'), q.value);
    });
    buildGuideTOC(); /* Q88 (2026-10-01): Tanner — tap-a-section table of contents. */
  }
  $('btn-guide').onclick = function () {
    fillGuideBody();
    openSheet('sheet-guide');
  };
  /* Q205: the marker sheet's "Reference & sources" lands here too — the
     guide opened with the reference chapter scrolled into view. */
  window.openGuideReference = function () {
    fillGuideBody();
    openSheet('sheet-guide');
    var heads = $('guide-body').querySelectorAll('h3');
    for (var i = 0; i < heads.length; i++) {
      if (heads[i].textContent === 'Sign & Forage Reference') {
        var t = heads[i];
        setTimeout(function () { if (t.scrollIntoView) t.scrollIntoView({ block: 'start' }); }, 60);
        break;
      }
    }
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
    Store.data.weatherOn = true; Store.data.voiceOn = true; Store.data.windArrowsOn = true; /* Q17; Q183: reset restores the fresh-install default (weather on) */
    Store.data.mileageOn = true; /* Q8 */
    Store.data.tagRecordsOn = true; /* gw */
    Store.data.rulerOn = true; /* fy */
    /* Q14/Q62: tab reset is per-line — restores all five toggleable tabs on the active line. */
    var l = activeLine();
    if (l) l.tabs = { history: true, scorecard: true, seasons: true, licenses: true, totals: true };
    Store.data.setFields = { traptype: true, trapdetail: true, settype: true, bait: true, lure: true, urine: true, visual: true, audio: true, other: true, notes: true };
    Store.save();
    $('settings-weather').checked = true; $('settings-voice').checked = true; $('settings-windarrows').checked = true;
    var mcb = $('settings-mileage'); if (mcb) mcb.checked = true;
    var tgcb = $('settings-tagrecords'); if (tgcb) tgcb.checked = true;
    renderMyTags(); /* gw: reset restores the My Tags section too */
    var rcb = $('settings-ruler'); if (rcb) rcb.checked = true;
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

/* ================= Q212. SET-TYPE FOUNDATIONS + VARIATIONS =================
   History: Q29 (2026-09-26) put the full researched taxonomy in the Set
   Type dropdown — 49 names, Land / Water. Lydia's tester note (Tanner's
   ruling 2026-10-21) called the scroll overwhelming, and she was right
   about the structure: Bean Duff, Scent post, T-bone, Staked hide are one
   foundation (Flat) dressed by attraction and location. Q212 splits the
   two: the picker offers FOUNDATIONS only (how the set is built), and the
   old names live on as VARIATIONS under their foundation — plus a
   free-text custom variation, because set names vary state to state.
   A set stores the foundation in setType and the variation in `variation`
   ('' when none). Display (setTypeLabel): "Foundation — Variation";
   foundation alone when there is no variation; and a LEGACY stored name
   (a set saved before Q212, type = an old variation name, no variation
   field) stands verbatim until the set is edited — then it opens
   structured (foundation picked by FOUNDATION_OF, its own name riding as
   the variation) and saves that way. Nothing here renames stored data:
   old sets, exports, and backups keep their strings. "Other" remains the
   escape hatch; there is still deliberately NO "Drowning set" entry —
   it's a dispatch method, not a set type. */
var SET_FOUNDATIONS = {
  Land: ['Flat', 'Dirt hole', 'Cubby', 'Trail / Blind', 'Pole', 'Snare', 'Positive'],
  Water: ['Pocket', 'Den & entrance', 'Bank edge', 'Dam', 'Channel & run',
    'Slide', 'Bank feature', 'Float & pole']
};
var SET_VARIATIONS = {
  'Flat': ['Flat', 'Bean Duff', 'Scent post', 'Urine post', 'T-bone', 'Staked hide', 'Rub', 'Flag', 'Mound', 'Carcass'],
  'Dirt hole': ['Dirt hole', 'Step-down', 'Trench', 'Hay'],
  'Cubby': ['Cubby', 'Bucket', 'Weasel box', 'Trash pile'],
  'Trail / Blind': ['Trail', 'Blind'],
  'Pole': ['Leaning pole', 'Leaning tree'],
  'Snare': ['Trail snare', 'Under-fence snare', 'Leg snare'],
  'Positive': ['Positive'],
  'Pocket': ['Pocket'],
  'Den & entrance': ['Bank den', 'Den / culvert', 'Den-entrance snare', 'Culvert snare', 'Drain tile'],
  'Bank edge': ['Bottom edge', 'Top edge', 'Overhanging bank'],
  'Dam': ['Dam break', 'Dam crossover'],
  'Channel & run': ['Canal / channel', 'Runway', 'Spring run'],
  'Slide': ['Slide', 'Slide snare'],
  'Bank feature': ['Scent mound', 'Feed bed', 'Latrine site', 'Open water', 'Obstruction'],
  'Float & pole': ['Float', 'Pole (under-ice)']
};
var SET_TYPE_OTHER = 'Other';
/* Every Q29 name -> its foundation, built by inverting SET_VARIATIONS. */
var FOUNDATION_OF = {};
Object.keys(SET_VARIATIONS).forEach(function (f) {
  SET_VARIATIONS[f].forEach(function (v) { FOUNDATION_OF[v] = f; });
});
/* A foundation maps to itself; a legacy name maps to its foundation;
   anything else (customs, "Drowning set") has no foundation home -> null. */
function foundationOf(v) {
  if (!v) return null;
  if (SET_VARIATIONS[v]) return v;
  return FOUNDATION_OF[v] || null;
}
function allFoundationNames() {
  return SET_FOUNDATIONS.Land.concat(SET_FOUNDATIONS.Water);
}
function allSetTypes() {
  /* Q212: known = the 15 foundations + all 49 legacy names + Other, so
     nothing already in a trapper's data ever reads as foreign. */
  return allFoundationNames().concat(Object.keys(FOUNDATION_OF)).concat([SET_TYPE_OTHER]);
}
function isKnownSetType(v) {
  return allSetTypes().indexOf(v) !== -1;
}
/* The one label used wherever a set's type is shown. */
function setTypeLabel(s) {
  if (!s) return '';
  var t = s.setType || '';
  var v = (typeof s.variation === 'string') ? s.variation.trim() : '';
  if (t && v && v !== t && foundationOf(t) === t) return t + ' — ' + v;
  return t;
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
  /* ft (2026-11-14, Tanner): straight A–Z, Other last. The picker used to
     run Land then Water in a curated foundation order — that was the one
     name list in the app that wasn't alphabetical. The foundations, the
     remembered customs, and Other all ride one flat list now; the variation
     dropdown still keys off the chosen foundation, so nothing else moves. */
  var byName = function (a, b) {
    var al = a.toLowerCase(), bl = b.toLowerCase();
    return al < bl ? -1 : (al > bl ? 1 : 0);
  };
  /* Q55: the trapper's remembered custom set types are their own
     foundations (a custom name has no variation family). gf (2026-11-15,
     Tanner): customs fold INTO the one A–Z run instead of riding in a
     block after the built-ins — they sit where he'd look for them.
     Known names never double-list; Other… stays last. */
  var fnds = allFoundationNames().slice();
  var seenST = {};
  fnds.forEach(function (t) { seenST[t.toLowerCase()] = 1; });
  var customs = customOptionsFor('sf-settype').filter(function (t) { return !seenST[t.toLowerCase()]; });
  /* ho (Q249): the foundation field is a combo input — the A–Z list is
     stashed for its live getOptions; no Other… row (typing is the hatch). */
  window._sfSetTypeOpts = fnds.concat(customs).sort(byName);
  renderVariationOptions();
}
/* Q212: the Variation dropdown under the foundation picker — "— None —"
   plus the chosen foundation's names. Customs and ride-along legacy values
   have no family, so they get None plus the free-text box only. */
function renderVariationOptions() {
  var sel = $('sf-setvariation');
  if (!sel) return;
  /* ho (Q249): the foundation is the set-type field's text; the variation
     list is stashed for the combo's live getOptions. */
  var f = $('sf-settype') ? $('sf-settype').value.trim() : '';
  var names = (SET_VARIATIONS[f] || []).slice();
  /* gj (2026-11-16, Tanner): his remembered custom variations for this
     foundation ride after its family names — a variation typed once is a
     plain dropdown option from then on, under the set type it was typed on. */
  var seenV = {};
  names.forEach(function (t) { seenV[t.toLowerCase()] = 1; });
  if (f) customOptionsFor('sf-setvariation:' + f).forEach(function (t) {
    if (!seenV[t.toLowerCase()]) { names.push(t); seenV[t.toLowerCase()] = 1; }
  });
  window._sfVarOpts = names;
}
/* Open-time fill: a name in the foundation's list selects in the dropdown;
   any other name (a custom variation) rides in the free-text box instead,
   so an edit opens with every stored character still on the form. */
function setVariationFields(foundation, name) {
  /* ho (Q249): one combo field now — the stored name, family or custom,
     simply sits in the field as text. */
  var sel = $('sf-setvariation');
  if (!sel) return;
  sel.value = name || '';
  /* A stored custom that predates remembering joins the list now, so it
     opens as a plain option from here on. (gj) */
  if (name && foundation && (SET_VARIATIONS[foundation] || []).indexOf(name) === -1) {
    rememberCustomOption('sf-setvariation:' + foundation, name);
  }
}
/* The variation as it should be stored: a typed custom name wins over the
   dropdown pick; blank when neither is set. */
function variationFieldValue() {
  /* ho (Q249): the combo field's text is the variation. A name outside
     the foundation's family is remembered under that foundation (gj's
     rule, moved from the old Custom box's change listener to read time). */
  var sel = $('sf-setvariation');
  var v = sel ? sel.value.trim() : '';
  if (v) {
    var f = selVal('sf-settype');
    if (f && (SET_VARIATIONS[f] || []).indexOf(v) === -1 &&
        customOptionsFor('sf-setvariation:' + f).indexOf(v) === -1) {
      rememberCustomOption('sf-setvariation:' + f, v);
    }
  }
  return v;
}
/* Stored values with no foundation home ("Drowning set",
   "Trail / blind set") still open fine in the form: they ride along as a
   selected first option until the user picks a foundation value. (Q212:
   the 49 taxonomy names never reach here — foundationOf homes them.) */
function ensureSetTypeOption(v) {
  /* ho (Q249): the foundation field is a text combo now — any stored
     name simply sits in the field; there is no option list to extend. */
  return;
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
  /* Q192: GPS-track trips carry their measured miles directly. */
  var gm = parseFloat(t && t.miles);
  if (isFinite(gm)) return gm;
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

/* Q163 (revised 2026-10-07): third mileage option — road directions via a
   Google Maps link-out. No API key, no routing of our own: the line's
   assigned home is the round-trip anchor (origin + destination); sets in
   check order become the waypoints. The driver snaps the map in Google
   Maps, comes back via the iOS back-link, and attaches the screenshot to
   the trip as a photo (Q72's infrastructure). */
/* Tanner 2026-10-07: the mileage modal is gone — trips live on the Paperwork
   tab itself (Mileage section), and the trip form returns straight there. */
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
  var startPhoto = null, endPhoto = null, mapPhoto = null;
  var notePhotos = [];
  /* hm (2026-11-20, Q195): notes parity — Tanner ruled note, voice, and
     photo in ALL notes sections, and the trip editor's Notes field was
     the one gap. It gains the set/log pattern: a Voice → notes button
     (hidden when voice is off; on the installed iPhone app it gives way
     to the keyboard-mic tip, the ga rule) and an Add photo button whose
     photos classify as trip photos (kind 'note'). */
  var tripVoiceBtn = '', tripVoiceTip = '';
  if (Store.data.voiceOn !== false) {
    if (isIOSPWA()) {
      tripVoiceTip = '<p class="dim" id="voice-tripnotes-tip" style="margin:8px 0 0">Tap the <svg viewBox="0 0 24 24" width="12" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" style="vertical-align:-3px"><rect x="9" y="2.5" width="6" height="11" rx="3"/><path d="M5.5 10.5v1a6.5 6.5 0 0 0 13 0v-1"/><path d="M12 18v3"/></svg> key on your keyboard to dictate a note.</p>';
    } else {
      tripVoiceBtn = '<button class="btn-small btn-secondary" id="m-voice-tripnotes" type="button"><img class="bi" src="assets/icons/mic.png" alt="">Voice → notes</button>';
    }
  }
  showModal(
    '<h3>' + (t ? 'Edit trip' : 'Log a trip') + '</h3>' +
    '<label class="field" for="m-trip-date">Date</label>' +
    '<input type="date" id="m-trip-date" value="' + esc(t ? t.date : todayISO()) + '">' +
    /* Tanner 2026-10-07: the trip form walks the same kind of numbered flow as
       the mileage screen — start reading + photo, end reading + photo, then
       optional documentation at the end. */
    '<div class="tflow-step"><span class="mflow-n">1</span>Starting odometer</div>' +
    '<div class="odo-photo-row"><button type="button" class="btn-secondary odo-photo-btn" id="m-start-photo">📷 Photo of the reading</button>' +
    '<span class="dim" id="m-start-photo-note"></span></div>' +
    '<input type="number" id="m-trip-start" inputmode="decimal" min="0" step="any" placeholder="e.g. 48210" value="' + esc(t ? t.startOdo : lastEnd) + '">' +
    '<div class="tflow-step"><span class="mflow-n">2</span>Ending odometer</div>' +
    '<div class="odo-photo-row"><button type="button" class="btn-secondary odo-photo-btn" id="m-end-photo">📷 Photo of the reading</button>' +
    '<span class="dim" id="m-end-photo-note"></span></div>' +
    '<input type="number" id="m-trip-end" inputmode="decimal" min="0" step="any" placeholder="e.g. 48296" value="' + esc(t ? t.endOdo : '') + '">' +
    '<div class="odo-miles" id="m-trip-miles"></div>' +
    '<div class="tflow-step"><span class="mflow-n">3</span>More photos <span class="dim">(optional)</span></div>' +
    '<p class="dim" style="margin:0 0 4px">Route map screenshot, paperwork — anything for the record.</p>' +
    '<div class="odo-photo-row"><button type="button" class="btn-secondary odo-photo-btn" id="m-map-photo">🗺 Road directions screenshot</button>' +
    '<span class="dim" id="m-map-photo-note"></span></div>' +
    '<div class="lic-grid" id="m-trip-photos"></div>' +
    '<label class="field" for="m-trip-notes">Notes <span class="dim">(optional)</span></label>' +
    '<input type="text" id="m-trip-notes" maxlength="80" placeholder="e.g. River bottoms check" value="' + esc(t ? t.notes || '' : '') + '">' +
    /* hm (Q195): the notes row — Voice → notes + Add photo, the same
       pair the set and log notes sections carry. */
    '<div class="btn-row" style="margin-top:8px">' + tripVoiceBtn +
    '<button class="btn-small btn-secondary" id="m-note-photo" type="button"><img class="bi" src="assets/icons/camera.png" alt="">Add a photo</button></div>' +
    tripVoiceTip +
    '<div class="voice-preview" id="voice-tripnotes-preview"></div>' +
    '<div class="photo-strip" id="m-trip-note-photos" style="margin-top:8px"></div>' +
    '<input type="file" id="m-odo-photo-input" class="hidden-file" accept="image/*">' +
    '<div class="btn-row" style="margin-top:14px"><button class="btn-secondary" id="m-cancel" type="button">Cancel</button>' +
    '<button class="btn-primary" id="m-ok" type="button">' + (t ? 'Save' : 'Add trip') + '</button></div>' +
    /* Tanner 2026-10-07 (dg): the trip box lost its Delete button — deleting
       a trip happens here in the form, like the landowner Edit screen. */
    (t ? '<button class="btn-danger" id="m-trip-del" type="button" style="margin-top:10px;width:100%">Delete trip</button>' : '')
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
  /* Q72: wire the camera buttons — one hidden input, reused for all three. */
  var photoTarget = null;
  $('m-start-photo').onclick = function () { photoTarget = 'start'; $('m-odo-photo-input').click(); };
  $('m-end-photo').onclick = function () { photoTarget = 'end'; $('m-odo-photo-input').click(); };
  $('m-map-photo').onclick = function () { photoTarget = 'map'; $('m-odo-photo-input').click(); };
  /* hm (Q195): the Notes photo button rides the same shared input. */
  $('m-note-photo').onclick = function () { photoTarget = 'note'; $('m-odo-photo-input').click(); };
  var tripVnBtn = $('m-voice-tripnotes');
  if (tripVnBtn) tripVnBtn.onclick = function () {
    var ta = $('m-trip-notes');
    Voice.start($('voice-tripnotes-preview'), function (t2) {
      ta.value = (ta.value ? ta.value.replace(/\s+$/, '') + ' ' : '') + t2;
    });
  };
  /* Pending notes photos, thumbnailed in the strip under the Notes
     field — the renderPendingLogPhotos pattern. Tap opens full-size. */
  function renderTripNotePhotos() {
    var box = $('m-trip-note-photos');
    if (!box) return;
    box.querySelectorAll('[data-pending-note]').forEach(function (el) { el.remove(); });
    notePhotos.forEach(function (b) {
      var img = document.createElement('img');
      img.className = 'photo-thumb'; img.alt = 'Note photo';
      img.setAttribute('data-pending-note', '1');
      img.src = URL.createObjectURL(b);
      img.title = 'Tap to enlarge';
      img.onclick = function () { openFullPhoto(b); };
      box.appendChild(img);
    });
  }
  /* Tanner 2026-10-07: attaching a photo pops a thumbnail right there, like
     everywhere else in the app — no "Photo attached." text getting shoved
     off the edge (that was also dragging the modal sideways). */
  function setPhotoThumb(noteId, blob) {
    var note = $(noteId);
    if (!note) return;
    note.textContent = '';
    var img = document.createElement('img');
    img.src = URL.createObjectURL(blob);
    img.alt = 'Photo attached';
    img.style.cssText = 'width:44px;height:44px;object-fit:cover;border-radius:6px;flex:0 0 auto;';
    note.appendChild(img);
  }
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
        if (target === 'start') { startPhoto = blob; setPhotoThumb('m-start-photo-note', blob); }
        else if (target === 'map') { mapPhoto = blob; setPhotoThumb('m-map-photo-note', blob); }
        else if (target === 'note') { notePhotos.push(blob); renderTripNotePhotos(); }
        else { endPhoto = blob; setPhotoThumb('m-end-photo-note', blob); }
      });
    } catch (e) { /* noop — saving the trip matters, the photo doesn't */ }
  };
  /* Q163 (revised): show already-attached trip photos as thumbnails; tap
     opens full-size in a new tab (back-link returns to the app). */
  if (t) {
    IDB.all('photos').then(function (all) {
      var grid = $('m-trip-photos');
      if (!grid) return;
      all.forEach(function (p) {
        if (!p || p.tripId !== t.id || !p.blob) return;
        var img = document.createElement('img');
        img.src = photoURL(p);
        /* hm (Q195): notes photos live in the Notes strip, not the
           odometer/map grid above it — each photo in its own home. */
        if (p.kind === 'note') {
          var strip = $('m-trip-note-photos');
          if (!strip) return;
          img.className = 'photo-thumb'; img.alt = 'Note photo'; img.title = 'Tap to enlarge';
          img.onclick = function () { openFullPhoto(p.blob); };
          strip.appendChild(img);
          return;
        }
        img.alt = p.kind === 'map' ? 'Road directions screenshot' : 'Odometer photo';
        img.style.cssText = 'width:72px;height:72px;object-fit:cover;border-radius:8px;cursor:pointer;';
        img.onclick = function () { openFullPhoto(p.blob); };
        grid.appendChild(img);
      });
    }).catch(function () { /* photos are optional */ });
  }
  $('m-cancel').onclick = function () { closeModal(); switchTab('licenses'); };
  if (t && $('m-trip-del')) $('m-trip-del').onclick = function () { deleteTrip(lineId, tripId); };
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
    /* Q72: attach odometer photos if any — failures are swallowed, the trip is already saved.
       hj (2026-11-19): each photo also carries the owning trip's lineId,
       stamped at write time — line-less photo records were the root of
       the License Wallet misfiling (see isLicenseWalletPhoto). */
    if (startPhoto) IDB.put('photos', { id: uid('p'), tripId: rec.id, lineId: rec.lineId, kind: 'odo-start', blob: startPhoto, mime: startPhoto.type || 'image/jpeg', createdAt: Date.now() }).catch(function () {});
    if (endPhoto) IDB.put('photos', { id: uid('p'), tripId: rec.id, lineId: rec.lineId, kind: 'odo-end', blob: endPhoto, mime: endPhoto.type || 'image/jpeg', createdAt: Date.now() }).catch(function () {});
    /* The route-map screenshot rides along the same way (directions link-out scrapped 2026-10-07). */
    if (mapPhoto) IDB.put('photos', { id: uid('p'), tripId: rec.id, lineId: rec.lineId, kind: 'map', blob: mapPhoto, mime: mapPhoto.type || 'image/jpeg', createdAt: Date.now() }).catch(function () {});
    /* hm (Q195): notes photos save with the trip too — the tripId is
       what classifies them: they stay out of the License Wallet and
       ride the trip's photo grid (Paperwork) and the media ZIP's
       Trip Photos folder like every other trip photo. */
    notePhotos.forEach(function (b) {
      IDB.put('photos', { id: uid('p'), tripId: rec.id, lineId: rec.lineId, kind: 'note', blob: b, mime: b.type || 'image/jpeg', createdAt: Date.now() }).catch(function () {});
    });
    closeModal(); switchTab('licenses');
    toast(t ? 'Trip updated.' : 'Trip logged.');
  };
}
function deleteTrip(lineId, tripId) {
  confirmModal('Delete this trip?',
    'The trip record will be removed. This cannot be undone.',
    'Delete trip', function () {
      Store.data.trips = (Store.data.trips || []).filter(function (x) { return !x || x.id !== tripId; });
      Store.save();
      closeModal(); switchTab('licenses');
    });
}

/* --- CSV export: one row per trip for every line, then a TOTAL row per line.
   Tanner 2026-10-07 (df): the export covers all lines at once; the Paperwork
   tab shows the active line only. The straight-line ROUTE ESTIMATE row stays
   cut -- it lies in the mountains, and the odometer is the truth. --- */
function buildMileageRows() {
  var rows = [['Date', 'Line', 'Start odometer', 'End odometer', 'Miles', 'Notes']];
  (Store.data.lines || []).forEach(function (ln) {
    var trips = tripsForLine(ln.id);
    if (!trips.length) return;
    trips.forEach(function (t) {
      rows.push([t.date, ln.name, t.startOdo, t.endOdo, Math.round(tripMiles(t) * 10) / 10, t.notes || '']);
    });
    rows.push(['TOTAL', ln.name, '', '', Math.round(lineTripTotal(ln.id) * 10) / 10, '']);
  });
  return rows;
}
function exportMileage() {
  var n = 0;
  (Store.data.lines || []).forEach(function (ln) { n += tripsForLine(ln.id).length; });
  if (!n) { toast('No trips logged on any line yet.'); return; }
  downloadCSV('opossum-foot-mileage-all-lines-' + todayISO() + '.csv', buildMileageRows());
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
  /* Tanner 2026-10-07: ZIP jump in the home picker. */
  $('btn-home-zip').onclick = homeZipJump;
  $('home-zip').addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter') { ev.preventDefault(); homeZipJump(); }
  });
  /* Q186: city jump in the home picker (bundled city list, offline). */
  $('home-city').addEventListener('input', renderCityMatches);
  $('home-city').addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      var ms = cityMatches(this.value);
      if (ms.length) homeCityJump(ms[0]);
    }
  });
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
    switchTab('licenses');
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
  $('btn-measure').onclick = function () { setMeasureMode(!measureMode); }; /* fg / Lefty note 3 */
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
  /* gm (Tanner's ruling, 2026-11-17): the Set Name field gets its clear ×
     and its existing-name suggestions back (see wireSetNameField) — the
     gl plain-field ruling is reversed. Suggestions never block: the
     duplicate-name check at save still does that job alone. */
  wireSetNameField();
  attachSuggest('sf-missing-detail', 'sf-missing-detail-suggest', 'missingdetail');
  $('sf-date').onchange = function () { updateDateDOW('sf-date', 'sf-date-dow'); };
  $('btn-voice-setnotes').onclick = function () {
    var ta = $('sf-notes');
    Voice.start($('voice-setnotes-preview'), function (t) {
      ta.value = (ta.value ? ta.value.replace(/\s+$/, '') + ' ' : '') + t;
    });
  };
  /* ga: file the composer's text as a dated entry on the set. */
  $('btn-add-note').onclick = function () {
    if (!stageComposerNote()) toast('Nothing to add yet — write the note first.');
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
  /* Q226: post-catch prompt actions — Update opens the full Edit Set form
     for the set just caught on; Keep just closes. */
  $('btn-pc-update').onclick = function () { var id = postCatchSetId; postCatchSetId = null; if (id) openSetForm(null, id); };
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
  /* gw: tag photo pickers — same behavior as the catch photo picker
     (capture the file synchronously, clear the input, downscale). */
  $('btn-log-tagphoto').onclick = function () { $('log-tag-photo-input').click(); };
  $('log-tag-photo-input').onchange = function () {
    var f = this.files[0];
    this.value = '';
    if (!f) return;
    downscalePhoto(f, function (blob) {
      pendingTagPhoto = { blob: blob };
      renderPendingTagPhoto();
    });
  };
  $('btn-tag-photo').onclick = function () { $('tag-photo-input').click(); };
  $('tag-photo-input').onchange = function () {
    var f = this.files[0];
    this.value = '';
    if (!f || !tagEditPhoto) return;
    downscalePhoto(f, function (blob) {
      tagEditPhoto.blob = blob;
      tagEditPhoto.removed = false;
      renderTagEditPhoto();
    });
  };
  $('btn-tag-photo-remove').onclick = function () {
    if (!tagEditPhoto) return;
    tagEditPhoto.blob = null;
    tagEditPhoto.removed = true;
    renderTagEditPhoto();
  };
  $('btn-save-tag').onclick = saveTagRecord;
  /* gw scope 3: post-catch sheet tag entry — write-through fields. */
  $('pc-tag-number').onchange = pcTagWrite;
  $('pc-tag-date').onchange = pcTagWrite;
  $('btn-pc-tagphoto').onclick = function () { $('pc-tag-photo-input').click(); };
  $('pc-tag-photo-input').onchange = function () {
    var f = this.files[0];
    this.value = '';
    if (!f || !postCatchLogId) return;
    downscalePhoto(f, function (blob) {
      var l = tagLogById(postCatchLogId);
      if (!l) return;
      if (pcTagPhoto && pcTagPhoto.existing) deleteTagPhotoRec(pcTagPhoto.existing);
      var rec = {
        id: uid('p'), setId: l.setId, logId: l.id, kind: 'tag', blob: blob,
        mime: blob.type || 'image/jpeg',
        lat: (l.lat != null ? l.lat : null), lng: (l.lng != null ? l.lng : null),
        createdAt: Date.now()
      };
      IDB.put('photos', rec).catch(function () { /* noop */ });
      if (!pcTagPhoto) pcTagPhoto = { existing: null };
      pcTagPhoto.existing = rec;
      renderPcTagPhoto();
    });
  };
  $('btn-pc-tagphoto-remove').onclick = function () {
    if (pcTagPhoto && pcTagPhoto.existing) { deleteTagPhotoRec(pcTagPhoto.existing); pcTagPhoto.existing = null; }
    renderPcTagPhoto();
  };

  /* seasons search — gw: filters the animal list ONLY, like the app's
     other search bars; the full renderSeasons runs on tab open.
     hb: revealFirstMatch keeps the first match visible under the bar. */
  $('seasons-search').oninput = function () {
    renderSeasonsList(this.value);
    revealFirstMatch(this, document.querySelector('#seasons-list .species-row'));
  };

  /* history filters */
  $('history-search').oninput = function () {
    histUI.q = this.value; renderHistory();
    /* hb: the visible face of a History match is its day-group head (the
       catch rows live in the collapsed day body), so that is the reveal
       target; in By Trap Type view the first row matches instead. */
    revealFirstMatch(this, document.querySelector('#history-list .day-head, #history-list .log-row'));
  };
  /* report filters (Settings) */
  $('exp-from').onchange = function () { exportUI.from = this.value; renderExportFilterBar(); };
  $('exp-to').onchange = function () { exportUI.to = this.value; renderExportFilterBar(); };
  $('exp-filters-clear').onclick = function () { clearExportFilters(); renderExportDimChips(); renderExportFilterBar(); };
  /* Q231 (2026-11-05): the filter buttons live in the Reports tab
     (#pane-reports, since Q180 moved Reports out of Settings) and the
     checklist sheet is a top-level element — neither sits inside
     pane-settings, so the old listener there never fired. Document-level
     delegation covers both. */
  document.addEventListener('click', function (e) {
    var msbtn = e.target.closest ? e.target.closest('[data-msbtn]') : null;
    if (msbtn) { openMsSheet(msbtn.getAttribute('data-msbtn')); return; }
    var msrow = e.target.closest ? e.target.closest('[data-msval]') : null;
    if (msrow && msOpenKey) {
      var mval = msrow.getAttribute('data-msval');
      var marr = exportUI[msOpenKey];
      var mix = marr.indexOf(mval);
      if (mix === -1) marr.push(mval); else marr.splice(mix, 1);
      renderMsList(); renderExportDimChips(); renderExportFilterBar();
      return;
    }
  });
  $('sheet-ms-clear').onclick = function () {
    if (msOpenKey) exportUI[msOpenKey] = [];
    renderMsList(); renderExportDimChips(); renderExportFilterBar();
  };
  $('pane-totals').addEventListener('click', function (e) {
    /* Tanner 2026-09-30: collapse/expand a whole Totals section card. */
    var thead = e.target.closest ? e.target.closest('.totals-card-head') : null;
    if (thead) {
      var skey = thead.getAttribute('data-tsec');
      var tco = Store.data.totalsCollapsed || {};
      tco[skey] = !tco[skey];
      Store.data.totalsCollapsed = tco; Store.save();
      var tbody = thead.parentNode.querySelector('.totals-card-body');
      if (tbody) { if (tco[skey]) tbody.setAttribute('hidden', ''); else tbody.removeAttribute('hidden'); }
      thead.setAttribute('aria-expanded', String(!tco[skey])); /* gw scope 5: the chevron rotates off aria-expanded; no glyph swap */
      if (!tco[skey]) scrollHeadIntoView(thead); /* ho (Q254): an opened card comes to the top */
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
    /* gw: the Tag record button opens the editor instead of expanding. */
    var tagBtn = e.target.closest ? e.target.closest('[data-tag-edit]') : null;
    if (tagBtn) { openTagEditor(tagBtn.getAttribute('data-tag-edit')); return; }
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
    /* Q223 (2026-10-27, Tanner's field report): snapshot the files into a plain
       array BEFORE clearing the input. this.files is a LIVE FileList — the old
       code compared done === files.length inside the async save, but clearing
       the input emptied the list first, so the count never matched: the photo
       saved silently and the wallet never re-rendered or toasted. Every other
       picker in the app captures this.files[0] synchronously; this one held
       the live list, and it alone broke. */
    var files = Array.prototype.slice.call(this.files || []);
    this.value = '';
    if (!files.length) return;
    var done = 0;
    for (var i = 0; i < files.length; i++) {
      (function (f) {
        IDB.put('photos', { id: uid('p'), name: f.name, blob: f, lineId: activeLineId(), createdAt: Date.now() })
          .then(function () { done++; if (done === files.length) { renderLicenses(); toast('License photo saved on this phone.'); } })
          .catch(function () { toast('Could not save that photo.'); });
      })(files[i]);
    }
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
  $('btn-export-media').onclick = exportMediaZip; /* Q214 */
  $('btn-share-line').onclick = shareActiveLine; /* fx: AirDrop / Nearby Share a line */
  $('btn-gallery').onclick = openGallery; /* fx: photo gallery */
  $('btn-share-photos').onclick = sharePhotoPack; /* fz: share the line's photo pack */
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
  $('btn-paste-pin').onclick = importPinFromLink; /* Q185 */
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
  /* Q140: stacked-pin menu — tapping a row opens that set's detail sheet.
     gz: in selection mode the same rows toggle the pick instead (the list
     re-renders in place with the new states); no detail sheet opens. */
  $('stack-list').addEventListener('click', function (e) {
    var row = e.target && e.target.closest ? e.target.closest('[data-stack-id]') : null;
    if (!row) return;
    var id = row.getAttribute('data-stack-id');
    if (selMode) {
      var s = getSet(id);
      toggleSel(id);
      if (s) openSelStack(setsAtSpot(s.lat, s.lng));
      return;
    }
    openSetDetail(id);
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
/* fk (2026-11-14): WebKit bug 254868 — in an installed iOS standalone PWA
   with viewport-fit=cover, window.innerHeight / 100dvh report the screen
   MINUS the top safe-area inset (874-62=812 on iPhone 16 Pro), while 100vh
   is the true full screen. The fh innerHeight fix baked the wrong 812 in.
   In standalone, size the shell from 100vh instead; in a tab or in-app
   browser keep innerHeight (100vh overshoots behind a URL bar there).
   Detect with navigator.standalone (reliable on iOS) plus the display-mode
   media query as backup — the media query alone is unreliable on iOS. */
function isStandaloneApp() {
  try {
    if (window.navigator && window.navigator.standalone) return true;
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
  } catch (e) { /* noop */ }
  return false;
}
function fitAppHeight() {
  try {
    if (isStandaloneApp()) {
      document.documentElement.classList.add('of-standalone');
      document.documentElement.style.setProperty('--app-h', '100vh');
    } else {
      document.documentElement.style.setProperty('--app-h', window.innerHeight + 'px');
    }
  } catch (e) { /* noop */ }
  reportViewport(); /* fj: fill the About diagnostic line with the phone's real numbers */
}
/* fj (2026-11-14): diagnostic readout for the dead-band below the banner —
   the fh innerHeight fix measures right in headless but the installed PWA
   still shows a ~62pt gap, so stop guessing and read the phone's own numbers:
   window size, visual viewport, screen size, safe-area bottom, --app-h, and
   where the banner actually ends. Shown in Settings → About. */
function reportViewport() {
  try {
    var vs = document.getElementById('viewport-stamp'); if (!vs) return;
    var vv = window.visualViewport;
    var probe = document.getElementById('viewport-probe');
    if (!probe) {
      probe = document.createElement('div'); probe.id = 'viewport-probe';
      probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;padding-bottom:env(safe-area-inset-bottom, 0px);visibility:hidden;pointer-events:none;';
      document.body.appendChild(probe);
    }
    var safeB = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
    /* fn (2026-11-14): the bottom banner is gone, so bannerB now reads the
       tab bar's bottom — the bottom edge of the app chrome. The field name
       stays so the diagnostic format (and the fj check) does not change. */
    var ban = document.getElementById('tabbar');
    /* bannerB only exists while the map view is laid out (Settings hides it),
       so keep the last real reading instead of reporting 0. */
    var banRect = ban ? ban.getBoundingClientRect() : null;
    if (banRect && banRect.height > 0) reportViewport.lastBanB = Math.round(banRect.bottom);
    var banB = (typeof reportViewport.lastBanB === 'number') ? reportViewport.lastBanB : -1;
    /* fk: appH is the shell's real px height (body border box), not the
       --app-h var — in standalone --app-h is '100vh', which getComputedStyle
       returns as a literal, and the diagnostic must prove the shell in px.
       NOTE: bannerB/appH are layout numbers; if the compositor clipped the
       shell they could read 874 while the gap stayed — the screenshot is
       the ground truth, these numbers are the supporting evidence. */
    var appH = -1;
    try { if (document.body) appH = Math.round(document.body.getBoundingClientRect().height); } catch (e) { /* noop */ }
    vs.textContent = 'win ' + window.innerWidth + 'x' + window.innerHeight +
      ' · vv ' + (vv ? Math.round(vv.width) + 'x' + Math.round(vv.height) : 'n/a') +
      ' · scr ' + window.screen.width + 'x' + window.screen.height +
      ' · safeB ' + Math.round(safeB) + ' · appH ' + appH + ' · bannerB ' + banB;
  } catch (e) { /* noop */ }
}
if (typeof window !== 'undefined') {
  window.addEventListener('resize', fitAppHeight);
  window.addEventListener('orientationchange', fitAppHeight);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fitAppHeight);
}
fitAppHeight(); /* set it at parse time too, before first paint */

function boot() {
  fitAppHeight(); /* fh: pin the app to the true visible height (see below) */
  Store.load();
  /* ho (Q249): the set form's static combo fields, wired once — their
     option lists are computed live (maker catalog, the type cascade's
     stash, the foundation/variation stashes). */
  comboAttach('sf-maker', 'sf-maker-suggest', function () { return makerComboOptions(); }, {});
  comboAttach('sf-type', 'sf-type-suggest', function () { return window._sfTypeOpts || ALL_TRAP_TYPES.slice(); }, {});
  comboAttach('sf-settype', 'sf-settype-suggest', function () { return window._sfSetTypeOpts || []; }, {});
  comboAttach('sf-setvariation', 'sf-setvariation-suggest', function () { return window._sfVarOpts || []; }, { noneLabel: '— None —' });
  /* ho (Q248): every other manually typed field in the sheets and the
     home bar gets the clear × (the Set Name model). Fields already
     carrying one (suggest/combo fields wrap themselves) are skipped by
     ensureClearInput; Notes are textareas and stay untouched. */
  document.querySelectorAll('.sheet input[type="text"], #home-bar input[type="text"]').forEach(function (inp) {
    /* sf-name and sf-missing-detail grow their own × in their own wiring
       (gm / attachSuggest) — a second one here would double them up. The
       home-bar jump fields are not entry fields (the city field carries
       its own match list) and wrapping the ZIP would break the Q265
       jump row's flex — they stay bare. */
    if (inp.id === 'sf-name' || inp.id === 'sf-missing-detail' || inp.id === 'home-zip' || inp.id === 'home-city') return;
    ensureClearInput(inp);
  });
  /* Q55: one delegated listener reveals the "What is it?" box under any
     Other-capable dropdown, wherever it was rendered. */
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t && t.tagName === 'SELECT' && t.getAttribute('data-has-other')) toggleOtherWrap(t);
    /* Q212: picking a different foundation refills the Variation dropdown
       with that foundation's names and clears any typed custom variation —
       a variation never outlives the foundation it belonged to. */
    if (t && t.id === 'sf-settype') {
      renderVariationOptions();
      /* ho (Q249): the variation is one combo field now — a foundation
         change clears it, as the rebuilt dropdown used to. */
      var vf = $('sf-setvariation');
      if (vf) vf.value = '';
    }
  });
  /* gi (2026-11-16, Tanner): a name typed under Other… joins its list the
     moment it's typed — not at the next save. On the box's change (blur),
     remember it and put it in the live dropdown right away: the Set Type
     picker rebuilds with the custom folded into the A–Z run (his place in
     the form untouched — the picker stays on Other… with his text in the
     box); every other dropdown gains the option just ahead of Other…. */
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (!t || t.tagName !== 'INPUT' || !/-othertext$/.test(t.id || '')) return;
    var selId = t.id.slice(0, -'-othertext'.length);
    var typed = (t.value || '').trim();
    if (!typed) return;
    rememberCustomOption(selId, typed);
    var sel = $(selId);
    if (!sel || sel.tagName !== 'SELECT') return;
    if (selId === 'sf-settype') {
      renderSetTypeOptions();
      sel.value = OTHER_VALUE;
      renderVariationOptions();
      toggleOtherWrap(sel);
      return;
    }
    var has = false, otherIdx = -1;
    for (var i = 0; i < sel.options.length; i++) {
      var o = sel.options[i];
      if (o.value === typed || o.text === typed) has = true;
      if (o.value === OTHER_VALUE) otherIdx = i;
    }
    if (!has) {
      var opt = document.createElement('option');
      opt.value = typed;
      opt.textContent = typed;
      if (otherIdx !== -1) sel.insertBefore(opt, sel.options[otherIdx]);
      else sel.appendChild(opt);
    }
  });
  /* gj (2026-11-16, Tanner): same rule for the Custom variation box — a
     variation typed once is remembered under the set type it's typed on
     and becomes the dropdown's selected option on the spot; the box
     clears because the name lives in the list now. */
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (!t || t.id !== 'sf-setvariation-custom') return;
    var typed = (t.value || '').trim();
    if (!typed) return;
    var f = selVal('sf-settype');
    if (!f) return;
    rememberCustomOption('sf-setvariation:' + f, typed);
    renderVariationOptions();
    var sel = $('sf-setvariation');
    if (sel) sel.value = typed;
    t.value = '';
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
    $('splash-status').textContent = 'Follow along.';
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
      var swReg = null;
      navigator.serviceWorker.register('sw.js').then(function (reg) { swReg = reg; })
        .catch(function () { /* offline still works without it */ });
      /* A new build took charge while this page still runs the old one:
         offer a one-tap reload. (hi: the version check below no longer
         waits for the tap — see reloadOnceFor. This message path keeps
         the banner as the manual fallback.) */
      navigator.serviceWorker.addEventListener('message', function (ev) {
        if (ev.data && ev.data.type === 'OF_NEW_VERSION') showUpdateBanner();
      });
      /* hi: when a new worker takes control of this page, ask whether
         the running build is stale — checkBuildFresh spends the one
         guarded reload if it is. A first-install claim finds the
         running build matching and does nothing. */
      navigator.serviceWorker.addEventListener('controllerchange', function () { checkBuildFresh(); });
      /* hh: an installed PWA can sit on an old worker for days if the
         browser only looks for a new one on cold navigation — ask for
         an update check whenever the app returns to the foreground.
         (The hg Mapbox field failure may have been exactly this: the
         new worker never took charge on the phone.) */
      function pokeSwUpdate() {
        if (!swReg || !swReg.update) return;
        try { swReg.update().catch(function () { /* offline: stay quiet */ }); }
        catch (e) { /* an update check is a backstop, never a fault */ }
      }
      /* backstop: version stamp check on load, when the app is
         foregrounded, and periodically */
      checkBuildFresh();
      document.addEventListener('visibilitychange', function () { if (!document.hidden) { checkBuildFresh(); pokeSwUpdate(); } });
      window.addEventListener('pageshow', function () { checkBuildFresh(); pokeSwUpdate(); });
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
/* hi (2026-11-19): a detected update now takes over ONCE on its
   own. Through hh, checkBuildFresh and the OF_NEW_VERSION message
   both ended at the banner — if the tap never came, the open page
   ran the old build under the new worker indefinitely (the
   nag-only takeover defect). Now a mismatch spends a single
   guarded reload: the guard is the target stamp kept in
   localStorage, so the same target can never reload twice; if
   the page comes back still mismatched, the banner returns as
   the manual path. The guard clears as soon as the running build
   matches the live stamp again. */
var UPDATE_GUARD_KEY = 'of-reload-for';
function reloadOnceFor(target) {
  var seen = null;
  try { seen = window.localStorage.getItem(UPDATE_GUARD_KEY); } catch (e) { /* storage unavailable: banner */ }
  if (seen === target) { showUpdateBanner(); return; }
  try { window.localStorage.setItem(UPDATE_GUARD_KEY, target); }
  catch (e) { showUpdateBanner(); return; }
  window.location.reload();
}
function checkBuildFresh() {
  fetch('version.txt', { cache: 'no-store' }).then(function (r) {
    if (!r.ok) throw 0;
    return r.text();
  }).then(function (t) {
    t = (t || '').trim();
    if (!t) return;
    if (APP_VERSION.indexOf(t) !== -1) {
      try { window.localStorage.removeItem(UPDATE_GUARD_KEY); } catch (e) { /* a spent guard may stay spent */ }
      return;
    }
    reloadOnceFor(t);
  }).catch(function () { /* offline: stay quiet */ });
}

document.addEventListener('DOMContentLoaded', boot);
