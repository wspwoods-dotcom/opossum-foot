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
var APP_VERSION = 'beta 0.1 · build 2026-09-24bd';
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
    if (!Array.isArray(this.data.sets)) this.data.sets = [];
    if (!Array.isArray(this.data.logs)) this.data.logs = [];
    if (typeof this.data.weatherOn !== 'boolean') this.data.weatherOn = false;
    if (typeof this.data.voiceOn !== 'boolean') this.data.voiceOn = true;
    if (typeof this.data.licensesOn !== 'boolean') this.data.licensesOn = true;
    if (typeof this.data.seasonsOn !== 'boolean') this.data.seasonsOn = true;
    /* New-set field visibility toggles — all default on. */
    var sfDef = { traptype: true, settype: true, bait: true, lure: true, notes: true };
    if (!this.data.setFields || typeof this.data.setFields !== 'object') this.data.setFields = {};
    for (var sfk in sfDef) if (typeof this.data.setFields[sfk] !== 'boolean') this.data.setFields[sfk] = true;
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
      trapType: trapType, setType: setType, bait: bait, lure: lure,
      status: status, dateSet: dateSet, notes: notes || '', createdAt: now,
      lineId: 'line-1'
    };
    if (extra) for (var k in extra) s[k] = extra[k];
    return s;
  }
  var sets = [
    S('s-demo-01', 'Creek bend', 41.8800, -95.1500, '1.5 coil-spring', 'Dirt hole', 'Sweet corn', 'Raccoon gland lure', 'active', '2026-11-14', 'Good coon sign along the bank.'),
    S('s-demo-02', 'Fence corner', 41.8200, -95.3200, 'Dog-proof', 'Post set', 'Cat food', '', 'active', '2026-11-14', ''),
    S('s-demo-03', 'Culvert east', 41.7500, -95.1200, '220 body-grip', 'Trail set', '', 'Beaver castor', 'active', '2026-11-20', 'Fresh chew on the north side.'),
    S('s-demo-04', 'Timber edge', 41.6800, -95.4800, '1.75 coil-spring', 'Flat set', '', 'Canine gland lure', 'active', '2026-11-15', 'Coyote scat on the field road.'),
    S('s-demo-05', 'Pond dam', 41.9100, -95.4000, '330 body-grip', 'Dam crossover', '', 'Beaver castor', 'sprung', '2026-11-16', 'Sprung empty — reset with fresh castor.'),
    S('s-demo-06', 'Brush pile', 41.6200, -95.2500, 'Live cage trap', 'Blind set', 'Sardines', '', 'active', '2026-11-21', ''),
    S('s-demo-07', 'Old barn', 41.7300, -95.5200, 'Dog-proof', 'Post set', 'Fish oil', 'Raccoon lure', 'pulled', '2026-11-10', 'Pulled — landowner request.', { datePulled: '2026-11-18' }),
    S('s-demo-08', 'Ditch crossing', 41.6600, -95.3300, '1.5 coil-spring', 'Trail set', '', 'Red fox urine', 'active', '2026-11-15', ''),
    S('s-demo-09', 'Walnut grove', 41.8400, -95.4700, 'Snare', 'Trail set', '', '', 'active', '2026-11-22', ''),
    S('s-demo-10', 'Pasture gate', 41.6000, -95.1800, 'Dog-proof', 'Bucket set', 'Honey bun', 'Cherry lure', 'sprung', '2026-11-12', '')
  ];
  function L(id, setId, species, count, disposition, date, notes) {
    var s = null;
    for (var i = 0; i < sets.length; i++) if (sets[i].id === setId) s = sets[i];
    return {
      id: id, setId: setId, setName: s ? s.name : '(deleted set)',
      species: species, count: count, disposition: disposition, date: date, seasonYear: '2026-27',
      bait: s ? s.bait : '', lure: s ? s.lure : '', trapType: s ? s.trapType : '',
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
    onboarded: true, state: 'IA', weatherOn: false, voiceOn: true, licensesOn: true, seasonsOn: true,
    setFields: { traptype: true, settype: true, bait: true, lure: true, notes: true },
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
  return 'Dispatched';
}

function dispBadge(d) {
  var cls = d === 'released' ? 'released' : d === 'kept-alive' ? 'alive' : d === 'transported' ? 'transported' : 'kept';
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
    if (!l.otherType && l.species === name && seasonYearOf(l.date) === seasonYear && l.disposition !== 'released' && l.disposition !== 'transported') n += (l.count * 1 || 0);
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

/* Warn when the GPS fix is in a different state than the trapping state. */
function checkStateMismatch(info) {
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

/* ---- weather tab ---- */
var weatherTabBusy = false;
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
  $('weather-updated').textContent = staleNote || 'Updated just now · Open-Meteo';
}
function showCachedWeather(msg) {
  var c = Store.data.weatherTabCache;
  if (c && c.payload && c.payload.current) {
    paintWeather(c.payload, msg + ' Showing last update from ' + timeAgo(c.at) + '.');
  } else {
    $('weather-now').innerHTML = '<p class="dim">' + esc(msg) + '</p>';
    $('weather-hourly').innerHTML = '';
    $('weather-updated').textContent = '';
  }
}
function renderWeatherTab() {
  if (weatherTabBusy) return;
  weatherTabBusy = true;
  $('weather-now').innerHTML = '<p class="dim">Loading weather…</p>';
  $('weather-hourly').innerHTML = '';
  getTabFix(function (fix) {
    if (!fix) {
      weatherTabBusy = false;
      $('weather-loc').textContent = 'Location unavailable.';
      showCachedWeather('No location fix yet — open the Map tab and tap the crosshair, then come back.');
      return;
    }
    $('weather-loc').textContent = 'Near ' + fix.lat.toFixed(3) + ', ' + fix.lng.toFixed(3);
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

/* ---- feature toggles ---- */
function applyFeatureToggles() {
  var vOn = Store.data.voiceOn !== false;
  ['btn-voice-setnotes', 'voice-setnotes-preview', 'btn-voice-lognotes', 'voice-lognotes-preview',
   'btn-sd-memo', 'sd-memos-head', 'sd-memos',
   'sd-notes-head', 'sd-notes', 'btn-voice-sdnotes', 'voice-sdnotes-preview'].forEach(function (id) {
    var el = $(id);
    if (el) el.style.display = vOn ? '' : 'none';
  });
  var lOn = Store.data.licensesOn !== false;
  var tab = document.querySelector('#tabbar button[data-tab="licenses"]');
  if (tab) tab.style.display = lOn ? '' : 'none';
  if (!lOn && $('pane-licenses') && $('pane-licenses').classList.contains('active')) switchTab('map');
  var wOn = !!Store.data.weatherOn;
  var wtab = document.querySelector('#tabbar button[data-tab="weather"]');
  if (wtab) wtab.style.display = wOn ? '' : 'none';
  if (!wOn && $('pane-weather') && $('pane-weather').classList.contains('active')) switchTab('map');
  var sOn = Store.data.seasonsOn !== false;
  var stab = document.querySelector('#tabbar button[data-tab="seasons"]');
  if (stab) stab.style.display = sOn ? '' : 'none';
  if (!sOn && $('pane-seasons') && $('pane-seasons').classList.contains('active')) switchTab('map');
}

/* ---- new-set field toggles ---- */
var SET_FIELD_IDS = { traptype: 'setfield-traptype', trapcount: 'setfield-trapcount', trapdetail: 'setfield-trapdetail', settype: 'setfield-settype', bait: 'setfield-bait', lure: 'setfield-lure', notes: 'setfield-notes' };
function setFieldOn(key) { return !Store.data.setFields || Store.data.setFields[key] !== false; }
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
  var h = '<label class="field" for="' + id + '">' + label + '</label><select id="' + id + '">';
  h += '<option value="">—</option>';
  for (var i = 0; i < options.length; i++) {
    h += '<option value="' + esc(options[i]) + '"' + (val === options[i] ? ' selected' : '') + '>' + esc(options[i]) + '</option>';
  }
  return h + '</select>';
}
/* Read the current dynamic trap-detail field values ('' when absent). */
function trapDetailValues() {
  var f = function (id) { var el = $(id); return el ? el.value : ''; };
  return {
    trapSpring: f('sf-trapspring'), trapSize: f('sf-trapsize'),
    snareDia: f('sf-snaredia'), snareLock: f('sf-snarelock'), snareLen: f('sf-snarelen'),
    trapModel: f('sf-trapmodel').trim()
  };
}
/* Render the subcategory inputs for the currently picked trap type. `saved`
   is a set (edit mode); otherwise current field values are preserved. */
function renderTrapDetailFields(saved) {
  var type = $('sf-type').value;
  var v = saved || trapDetailValues();
  var host = $('trapdetail-fields');
  var cfg = TRAP_SUB[type];
  if (!cfg) { host.innerHTML = ''; return; }
  var h = '';
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
  }
  if (cfg.model) {
    h += '<label class="field" for="sf-trapmodel">Brand / model</label>' +
      '<input type="text" id="sf-trapmodel" placeholder="e.g. Bridger #1.75" autocomplete="off" value="' + esc(v.trapModel || '') + '">';
  }
  host.innerHTML = h;
  var springEl = $('sf-trapspring');
  if (springEl) springEl.onchange = function () { renderTrapDetailFields(); };
}
/* One-line human summary of a set's trap details, for set detail + logs. */
function trapDetailSummary(s) {
  if (!s) return '';
  var parts = [];
  if (s.trapType === 'Foothold') {
    if (s.trapSpring) parts.push(s.trapSpring);
    if (s.trapSize) parts.push(s.trapSize);
  } else if (s.trapType === 'Snare') {
    if (s.snareDia) parts.push(s.snareDia + ' cable');
    if (s.snareLock) parts.push(s.snareLock + ' lock');
    if (s.snareLen) parts.push(s.snareLen);
  } else {
    if (s.trapSize) parts.push(s.trapSize);
  }
  if (s.trapModel) parts.push(s.trapModel);
  return parts.join(' · ');
}
/* Clear detail fields that don't belong to the set's trap type, so a type
   switch can't leave stale values behind. */
function normalizeTrapDetail(s) {
  var t = s.trapType;
  if (t === 'Foothold') { s.snareDia = s.snareLock = s.snareLen = ''; }
  else if (t === 'Snare') { s.trapSpring = s.trapSize = s.trapModel = ''; }
  else if (t === 'Bodygrip / Conibear' || t === 'Cage live trap' || t === 'Colony trap') {
    s.trapSpring = s.snareDia = s.snareLock = s.snareLen = '';
  } else { s.trapSpring = s.trapSize = s.snareDia = s.snareLock = s.snareLen = ''; }
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
  L.control.zoom({ position: 'bottomleft' }).addTo(map);
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
  L.control.layers({ 'Street': streetL, 'Satellite': satL, 'Topo': topoL }, null, { position: 'bottomleft' }).addTo(map);
  markersLayer = L.layerGroup().addTo(map);

  map.on('click', function (e) {
    if (dropPinMode) {
      startPlacePin(e.latlng);
    }
  });
  refreshMarkers();
  fitMapToState();
  if (DEMO_ACTIVE) {
    /* frame the fictional trapline and blur the tiles for screenshots */
    map.fitBounds([[41.700, -95.400], [41.740, -95.360]], { padding: [30, 30] });
    var tp = document.querySelector('.leaflet-tile-pane');
    if (tp) tp.style.filter = 'blur(7px)';
  }
}

function setIcon(set) {
  return L.divIcon({
    className: '',
    html: '<div class="pin pin-' + esc(normStatus(set.status)) + '"></div>',
    iconSize: [30, 30], iconAnchor: [15, 15]
  });
}

function refreshMarkers() {
  if (!map || !markersLayer) return;
  markersLayer.clearLayers();
  activeSets().forEach(function (s) {
    if (!mapStatusFilter[normStatus(s.status)]) return;
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

/* One fresh fix from the follow-mode watch: move the dot on every fix, and
   recenter the map only once the dot drifts out of the inner view — no glide
   animation, so the map tracks instead of lagging behind. Transient GPS
   errors never kill follow; only a permission denial does. */
var followErrs = 0;
function onFollowFix(pos) {
  var c = pos.coords || {};
  if (typeof c.latitude !== 'number' || typeof c.longitude !== 'number') return;
  var ageMs = Date.now() - (pos.timestamp || 0);
  if (ageMs > 30000 || ageMs < 0) return; /* stale cached fix — ignore it */
  followErrs = 0;
  var acc = (typeof c.accuracy === 'number' && isFinite(c.accuracy)) ? Math.round(c.accuracy) : 9999;
  drawFix({ lat: c.latitude, lng: c.longitude, acc: acc }, false);
  if (map) {
    var pt = map.latLngToContainerPoint([c.latitude, c.longitude]);
    var size = map.getSize();
    if (Math.abs(pt.x - size.x / 2) > size.x * 0.28 ||
        Math.abs(pt.y - size.y / 2) > size.y * 0.28) {
      map.panTo([c.latitude, c.longitude], { animate: false });
    }
  }
}
function onFollowError(err) {
  if (locateState !== 'following') return;
  if (err && err.code === 1) {
    stopFollow(true);
    toast('Location permission denied — follow stopped.');
    return;
  }
  /* iOS fires transient timeouts under tree cover and in dips — ride them out */
  followErrs++;
  if (followErrs >= 3) { followErrs = 0; toast('GPS signal weak — still trying.'); }
}

/* Field-grade locate: watch the GPS for up to 45 seconds (a cold iPhone radio
   often needs 30-60 s for its first high-accuracy fix — 20 s was giving up
   early), throw away stale cached fixes, and settle on the most accurate
   fresh fix. Transient errors while the radio warms up are ignored; only a
   permission denial ends the attempt early. */
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
      locateWatch = navigator.geolocation.watchPosition(onFollowFix, onFollowError,
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
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
  $('sf-name').placeholder = s ? '' : 'e.g. Set ' + (activeSets().length + 1);
  $('sf-type').value = s ? s.trapType : 'Foothold';
  $('sf-trapcount').value = (s && s.trapCount) ? s.trapCount : 1;
  $('sf-type').onchange = function () { renderTrapDetailFields(); };
  renderTrapDetailFields(s || null);
  $('sf-settype').value = s ? (s.setType || 'Dirt hole') : 'Dirt hole';
  $('sf-bait').value = s ? (s.bait || '') : '';
  $('sf-lure').value = s ? (s.lure || '') : '';
  $('sf-status').value = s ? normStatus(s.status) : 'active';
  $('sf-date').value = s ? s.dateSet : todayISO();
  $('sf-notes').value = s ? (s.notes || '') : '';
  $('voice-setnotes-preview').classList.remove('show');
  $('voice-setnotes-preview').innerHTML = '';
  hideSetFormError();
  applySetFieldToggles();
  var c = s ? { lat: s.lat, lng: s.lng } : coords;
  $('setform-coords').textContent = c ? (c.lat.toFixed(5) + ', ' + c.lng.toFixed(5)) : '';
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

function saveSetForm() {
  var name = $('sf-name').value.trim();
  var status = $('sf-status').value;
  var dateSet = $('sf-date').value;
  if (!name) { showSetFormError('Set name is required — give this set a name.'); return; }
  if (!status) { showSetFormError('Status is required — pick one.'); return; }
  if (!dateSet) { showSetFormError('Date set is required — pick the date.'); return; }
  hideSetFormError();
  var trapCount = Math.max(1, parseInt($('sf-trapcount').value, 10) || 1);
  var td = trapDetailValues();
  if (editingSetId) {
    var s = getSet(editingSetId);
    if (!s) { closeSheets(); return; }
    s.name = name;
    s.trapType = $('sf-type').value;
    s.trapCount = trapCount;
    s.trapSpring = td.trapSpring; s.trapSize = td.trapSize;
    s.snareDia = td.snareDia; s.snareLock = td.snareLock; s.snareLen = td.snareLen;
    s.trapModel = td.trapModel;
    normalizeTrapDetail(s);
    s.setType = $('sf-settype').value;
    s.bait = $('sf-bait').value.trim();
    s.lure = $('sf-lure').value.trim();
    s.status = status;
    s.dateSet = dateSet;
    s.notes = $('sf-notes').value.trim();
    if (s.status === 'pulled' && !s.datePulled) s.datePulled = todayISO();
    if (s.status !== 'pulled' && s.datePulled) delete s.datePulled;
    Store.save(); refreshMarkers();
    closeSheets(); openSetDetail(s.id);
    toast('Set updated.');
  } else {
    if (!pendingCoords) { toast('No location for this set.'); return; }
    var ns = {
      id: uid('s'), name: name,
      lat: pendingCoords.lat, lng: pendingCoords.lng, county: null,
      trapType: $('sf-type').value,
      trapCount: trapCount,
      trapSpring: td.trapSpring, trapSize: td.trapSize,
      snareDia: td.snareDia, snareLock: td.snareLock, snareLen: td.snareLen,
      trapModel: td.trapModel,
      setType: $('sf-settype').value,
      bait: $('sf-bait').value.trim(), lure: $('sf-lure').value.trim(),
      status: status,
      dateSet: dateSet,
      notes: $('sf-notes').value.trim(),
      createdAt: Date.now()
    };
    normalizeTrapDetail(ns);
    if (ns.status === 'pulled') ns.datePulled = ns.dateSet;
    ns.lineId = activeLineId();
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
  var st = normStatus(s.status);
  $('sd-badges').innerHTML =
    '<span class="badge status-' + esc(st) + '">' + esc(statusLabel(st)) + '</span> ' +
    (s.county ? '<span class="badge yearround">' + esc(s.county) + ' Co.</span>' : '');
  /* manual-only status control at check time: changing this never touches
     catches or logs — it only re-labels the set. */
  var sdStatus = $('sd-status');
  if (sdStatus) {
    sdStatus.value = st;
    sdStatus.onchange = function () {
      var cur = getSet(detailSetId);
      if (!cur) return;
      cur.status = this.value;
      if (cur.status === 'pulled' && !cur.datePulled) cur.datePulled = todayISO();
      if (cur.status !== 'pulled' && cur.datePulled) delete cur.datePulled;
      Store.save(); refreshMarkers();
      var st2 = normStatus(cur.status);
      $('sd-badges').innerHTML =
        '<span class="badge status-' + esc(st2) + '">' + esc(statusLabel(st2)) + '</span> ' +
        (cur.county ? '<span class="badge yearround">' + esc(cur.county) + ' Co.</span>' : '');
      toast('Status set to ' + statusLabel(st2) + '.');
    };
  }
  $('sd-fields').innerHTML =
    '<dt>Trap</dt><dd>' + esc(s.trapType) + (function () { var d = trapDetailSummary(s); return d ? ' · ' + esc(d) : ''; })() + '</dd>' +
    ((s.trapCount && s.trapCount > 1) ? '<dt>Traps</dt><dd>' + (s.trapCount * 1) + '</dd>' : '') +
    '<dt>Set type</dt><dd>' + esc(s.setType || '—') + '</dd>' +
    '<dt>Bait</dt><dd>' + esc(s.bait || '—') + '</dd>' +
    '<dt>Lure</dt><dd>' + esc(s.lure || '—') + '</dd>' +
    '<dt>Date set</dt><dd>' + esc(fmtDate(s.dateSet)) + '</dd>' +
    '<dt>Location</dt><dd>' + s.lat.toFixed(5) + ', ' + s.lng.toFixed(5) + '</dd>' +
    '<dt>Weather</dt><dd>' + esc(weatherText(s.weather)) + '</dd>';
  loadSetPhotos(s.id, function (setPhotos, byLog) {
    renderSetPhotos(setPhotos);
    renderSetLogs(s, byLog);
  });
  renderMemos(s.id);
  $('sd-notes').value = s.notes || '';
  $('voice-sdnotes-preview').classList.remove('show');
  $('voice-sdnotes-preview').innerHTML = '';
  $('btn-sd-memo').innerHTML = '🎤 Record memo';
  openSheet('sheet-setdetail');
}

/* set-detail notes: textarea edits and voice/memo transcripts land in s.notes */
function saveDetailNotes() {
  var s = getSet(detailSetId);
  if (!s) return;
  s.notes = $('sd-notes').value.trim();
  Store.save();
}
function appendTranscriptToSetNotes(setId, tr) {
  var s = getSet(setId);
  if (!s || !tr) return;
  s.notes = (s.notes ? s.notes.replace(/\s+$/, '') + ' ' : '') + tr;
  Store.save();
  if (setId === detailSetId && $('sd-notes')) $('sd-notes').value = s.notes;
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
      '</span><span class="lr-count">×' + esc(l.count) + '</span>' +
      dispBadge(l.disposition) + '</div>' +
      '<div class="dim">' + esc(fmtDate(l.date)) + (l.notes ? ' · ' + esc(l.notes) : '') + '</div>' +
      (l.weather ? '<div class="dim">🌤 ' + esc(weatherText(l.weather)) + '</div>' : '') +
      (ph ? '<div class="log-photos">' + ph + '</div>' : '') + '</div>';
  }).join('');
  var imgs = $('sd-logs').querySelectorAll('img[data-ph]');
  for (var i = 0; i < imgs.length; i++) {
    imgs[i].onclick = function () {
      var p = photoById[this.getAttribute('data-ph')];
      if (p) openPhotoViewer(p, function () {
        loadSetPhotos(detailSetId, function (sp, bl) { renderSetPhotos(sp); renderSetLogs(getSet(detailSetId), bl); });
      });
    };
  }
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
      IDB.all('photos').then(function (all) {
        all.forEach(function (p) { if (p.setId === id) IDB.del('photos', p.id); });
      }).catch(function () { /* noop */ });
      Store.save(); refreshMarkers(); closeSheets();
      toast('Set deleted.');
    });
}

/* ================= 8. CATCH LOGGING ================= */
var logSetId = null, logSpecies = null, logCount = 1, logDisposition = null, pendingLogPhotos = [];

/* Catch-log "Other event" (build au): non-catch events recorded on a set.
   otherType is one of 'sprung' | 'non-native' | 'non-game' | 'domestic' |
   'fur' | 'animal-part', null/absent for normal catches. Other events are
   events, not catches: they never change the set's trap status and are
   excluded from Totals and the bait/lure scorecard.
   Log-sheet entry state: logEventType starts unchosen (null) and
   logDisposition starts null — both are REQUIRED and the trapper must pick
   them explicitly before saving. logOtherType keeps its 'sprung' default. */
var logEventType = null, logOtherType = 'sprung';
var OTHER_LABELS = { 'sprung': 'Sprung', 'non-native': 'Non-native animal', 'non-game': 'Non-game animal', 'domestic': 'Domestic animal', 'fur': 'Fur', 'animal-part': 'Animal part', 'other': 'Other' };

/* Notes placeholder nudge: the catch-all 'Other' subtype gets a descriptive
   prompt; every other subtype keeps the plain default. Notes stay optional. */
var LOG_NOTES_PLACEHOLDER_DEFAULT = 'Optional…';
var LOG_NOTES_PLACEHOLDER_OTHER = 'Describe what happened…';
function updateLogNotesPlaceholder() {
  $('log-notes').placeholder = (logOtherType === 'other') ? LOG_NOTES_PLACEHOLDER_OTHER : LOG_NOTES_PLACEHOLDER_DEFAULT;
}

function openLogSheet(setId) {
  var s = getSet(setId);
  if (!s) return;
  logSetId = setId; logSpecies = null; logCount = 1; logDisposition = null; pendingLogPhotos = [];
  logEventType = null; logOtherType = 'sprung';
  renderPendingLogPhotos();
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
  $('log-species-free').value = '';
  $('log-othertype').value = 'sprung';
  updateLogNotesPlaceholder();
  setLogEventType(null);
  hideLogFormError();
  $('log-warnings').innerHTML = '';
  $('voice-lognotes-preview').classList.remove('show');
  $('voice-lognotes-preview').innerHTML = '';
  renderSpeciesList('');
  openSheet('sheet-log');
}

/* Event-type toggle at the top of the Log-a-catch sheet. Neither option starts
   selected — the trapper must choose Catch or Other event explicitly.
   "Other" reveals the subtype dropdown and swaps the species picker for
   optional free text. Disposition buttons stay visible in both modes. */
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
    '<button class="btn-secondary" id="m-close" type="button">Close</button></div>');
  $('m-close').onclick = function () { URL.revokeObjectURL(url); closeModal(); };
  $('m-ph-del').onclick = function () {
    confirmModal('Remove this photo?', 'It will not be saved with this catch.', 'Remove', function () {
      URL.revokeObjectURL(url);
      pendingLogPhotos.splice(idx, 1);
      renderPendingLogPhotos();
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
      '<span class="badge ' + info.badgeClass + '">' + info.badge + '</span></button>';
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
    html += '<div class="warnbox"><div class="wb-title">📍 County/city rules apply to ' + esc(sp.common_name) +
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
  var isOther = (logEventType === 'other');
  var species = isOther ? $('log-species-free').value.trim() : logSpecies;
  if (!isOther && !species) { showLogFormError('Pick a species first.'); return; }
  if (!logDisposition) { showLogFormError('Choose a disposition — Dispatched, Kept alive, Released, or Transported.'); return; }
  hideLogFormError();
  var s = getSet(logSetId);
  var date = $('log-date').value || todayISO();
  var log = {
    id: uid('l'), setId: logSetId,
    setName: s ? s.name : '(deleted set)',
    species: species || '',
    otherType: isOther ? logOtherType : null,
    count: logCount * 1 || 1,
    disposition: logDisposition,
    date: date, seasonYear: seasonYearOf(date),
    bait: s ? (s.bait || '') : '', lure: s ? (s.lure || '') : '',
    trapType: s ? (s.trapType || '') : '',
    trapDetail: s ? trapDetailSummary(s) : '',
    trapCount: s ? (s.trapCount || 1) : 1,
    setType: s ? (s.setType || '') : '',
    county: s ? (s.county || '') : '',
    lat: s ? s.lat : null, lng: s ? s.lng : null,
    notes: $('log-notes').value.trim(),
    createdAt: Date.now()
  };
  log.lineId = activeLineId();
  Store.data.logs.push(log);
  Store.save();
  pendingLogPhotos.forEach(function (ph) {
    IDB.put('photos', {
      id: uid('p'), setId: log.setId, logId: log.id, blob: ph.blob,
      mime: ph.blob.type || 'image/jpeg',
      lat: s ? s.lat : null, lng: s ? s.lng : null, createdAt: Date.now()
    }).catch(function () { /* noop */ });
  });
  pendingLogPhotos = [];
  closeSheets();
  renderHistory(); renderTotals();
  toast(isOther
    ? 'Logged ' + (OTHER_LABELS[logOtherType] || 'Other event') + (species ? ' — ' + species : '') + ' (' + dispLabel(logDisposition) + ')' + (s ? ' at ' + s.name : '') + '.'
    : 'Logged ' + log.count + ' ' + species + ' (' + dispLabel(logDisposition) + ')' + (s ? ' at ' + s.name : '') + '.');
  /* INVARIANT: saving a log — catch or Other event — NEVER changes the
     set's trap status. Status is manual-only: no s.status assignment
     exists in saveLog or any log code path. */
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
      openPhotoViewer(p, function () {
        loadSetPhotos(detailSetId, function (sp, bl) {
          renderSetPhotos(sp); renderSetLogs(getSet(detailSetId), bl);
        });
      });
    };
    box.appendChild(img);
  });
}
function openPhotoViewer(p, onDelete) {
  var when = '';
  try { when = new Date(p.createdAt).toLocaleString(); } catch (e) { /* noop */ }
  showModal('<img src="' + photoURL(p) + '" style="width:100%;border-radius:8px" alt="Photo">' +
    (when ? '<div class="dim" style="margin-top:6px;text-align:center">' + esc(when) + '</div>' : '') +
    '<div class="btn-row" style="margin-top:10px"><button class="btn-danger" id="m-ph-del" type="button">Delete</button>' +
    '<button class="btn-secondary" id="m-close" type="button">Close</button></div>');
  $('m-close').onclick = closeModal;
  $('m-ph-del').onclick = function () {
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
        var memoTranscript = (self._transcript || '').trim();
        IDB.put('memos', {
          id: uid('m'), setId: self.targetSetId, mime: blob.type,
          blob: blob, createdAt: Date.now(),
          transcript: memoTranscript
        }).then(function () {
          appendTranscriptToSetNotes(self.targetSetId, memoTranscript);
          renderMemos(self.targetSetId);
          toast(memoTranscript ? 'Voice memo saved — transcript added to notes.' : 'Voice memo saved.');
        }).catch(function () { toast('Could not save the memo.'); });
      };
      rec.start();
      self.recorder = rec; self.recording = true; self.targetSetId = setId;
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
    if (btn) btn.textContent = '🎤 Record memo';
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
function renderMemos(setId) {
  var box = $('sd-memos');
  IDB.all('memos').then(function (all) {
    var memos = all.filter(function (m) { return m.setId === setId; })
      .sort(function (a, b) { return a.createdAt - b.createdAt; });
    if (!memos.length) { box.innerHTML = '<p class="dim">No memos yet.</p>'; return; }
    box.innerHTML = '';
    memos.forEach(function (m) {
      var wrap = document.createElement('div');
      wrap.className = 'memo-card';
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
  });
}

/* ================= 10. HISTORY / TOTALS / SEASONS ================= */
var histUI = { q: '', disp: 'all', view: 'date', scoreBy: 'lure', collapsed: {}, expanded: {}, spOpen: {}, defaultsSet: false,
  filtersOpen: false, from: '', to: '', fSetType: [], fTrapType: [], fLure: [], fBait: [], fStatus: [] };
var DOWS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
var MONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function dayLabel(iso) {
  var p = (iso || '').split('-');
  if (p.length !== 3) return iso || '';
  var d = new Date(p[0] * 1, p[1] * 1 - 1, p[2] * 1);
  return DOWS[d.getDay()] + ', ' + MONS[d.getMonth()] + ' ' + (p[2] * 1);
}
function dispOf(l) { return l.disposition || 'kept'; }

/* ---------- Trap status (build ar) ----------
   The canonical status list: Active, Sprung, Pulled, Other.
   Status is manual-only: it changes only when the user picks a new value
   (New/Edit set form, or the status control on the set-detail sheet at
   check time). Logging a catch or recording a Sprung event NEVER changes
   a set's status — no code path below may set s.status automatically. */
var STATUS_VALUES = ['active', 'sprung', 'pulled', 'other'];
var STATUS_LABELS = { active: 'Active', sprung: 'Sprung', pulled: 'Pulled', other: 'Other' };
function statusLabel(v) { return STATUS_LABELS[normStatus(v)] || 'Other'; }
/* Map any saved status value onto the canonical five. Legacy/unknown
   values are never dropped — they land in the closest bucket. */
function normStatus(v) {
  var s = (v === null || v === undefined) ? '' : String(v).toLowerCase().trim();
  if (s === 'active' || s === 'sprung' || s === 'pulled' || s === 'other') return s;
  if (s === 'fresh') return 'active'; /* Fresh retired in build at — old Fresh sets read as Active */
  if (s === 'set' || s === 'live' || s === 'open' || s === 'working') return 'active';
  if (s === 'new' || s === 'just set' || s === 'just-set' || s === 'freshly set') return 'active';
  if (s === 'tripped' || s === 'fired' || s === 'sprung-empty' || s === 'sprung empty' || s === 'empty') return 'sprung';
  if (s === 'removed' || s === 'inactive' || s === 'closed' || s === 'retired' || s === 'gone') return 'pulled';
  if (s === '') return 'active'; /* pre-status sets defaulted to active */
  return 'other'; /* unknown values land in the catch-all */
}
/* Map-view status filters: independent multi-select toggles. Several can be
   on at once; a set shows when its current status is toggled on. */
var mapStatusFilter = { active: true, sprung: true, pulled: true, other: true };
function renderMapStatusFilters() {
  var host = $('map-status-filters');
  if (!host) return;
  host.innerHTML = STATUS_VALUES.map(function (v) {
    return '<button type="button" class="chip' + (mapStatusFilter[v] ? ' on' : '') +
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
    };
  }
}
function logStatus(l) {
  var s = l.setId ? getSet(l.setId) : null;
  return s ? normStatus(s.status) : '';
}
var DIM_DEFS = [
  { key: 'fSetType', field: 'setType', label: 'Set type' },
  { key: 'fTrapType', field: 'trapType', label: 'Trap type' },
  { key: 'fLure', field: 'lure', label: 'Lure' },
  { key: 'fBait', field: 'bait', label: 'Bait' },
  { key: 'fStatus', field: '__status', label: 'Trap status' }
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
    var v = dimValue(l, def);
    if (!seen[v]) { seen[v] = true; out.push(v); }
  });
  out.sort(function (a, b) {
    var la = dimLabel(def, a).toLowerCase(), lb = dimLabel(def, b).toLowerCase();
    return la < lb ? -1 : (la > lb ? 1 : 0);
  });
  return out;
}
function dimPass(val, sel) {
  if (!sel || !sel.length) return true;
  return sel.indexOf(val || '') !== -1;
}
/* The single shared filter: every current History filter (search, disposition,
   date range, dimensions) applies here. renderHistory and exportCatches both
   draw from this, so the CSV always matches the on-screen report. */
function histFilteredLogs() {
  var f = histUI, q = f.q.toLowerCase();
  return activeLogs().slice().sort(function (a, b) {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return b.createdAt - a.createdAt;
  }).filter(function (l) {
    if (f.disp !== 'all' && dispOf(l) !== f.disp) return false;
    if (f.from && l.date < f.from) return false;
    if (f.to && l.date > f.to) return false;
    for (var i = 0; i < DIM_DEFS.length; i++) {
      if (!dimPass(dimValue(l, DIM_DEFS[i]), f[DIM_DEFS[i].key])) return false;
    }
    if (q) {
      var hay = ((l.species || '') + ' ' + (l.setName || '') + ' ' + (l.notes || '')).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  });
}
function countActiveFilters() {
  var f = histUI, n = 0;
  if (f.from) n++;
  if (f.to) n++;
  n += f.fSetType.length + f.fTrapType.length + f.fLure.length + f.fBait.length + f.fStatus.length;
  return n;
}
function filtersActive() { return countActiveFilters() > 0; }
function renderHistDimChips() {
  var host = $('hist-dim-filters');
  if (!host) return;
  host.innerHTML = DIM_DEFS.map(function (def) {
    var vals = dimValues(def);
    if (!vals.length) return '';
    var sel = histUI[def.key];
    return '<div class="dim-label">' + esc(def.label) + '</div>' +
      '<div class="chip-row">' + vals.map(function (v) {
        return '<button type="button" class="chip' + (sel.indexOf(v) !== -1 ? ' on' : '') +
          '" data-fdim="' + esc(def.key) + '" data-fval="' + esc(v) + '">' +
          esc(dimLabel(def, v)) + '</button>';
      }).join('') + '</div>';
  }).join('');
}
function renderHistFilterBar() {
  var tgl = $('hist-filters-toggle'), panel = $('hist-filters');
  if (!tgl || !panel) return;
  panel.hidden = !histUI.filtersOpen;
  var n = countActiveFilters();
  var cnt = $('hist-filters-count');
  if (cnt) cnt.textContent = n ? ' · ' + n + ' active' : '';
  var fr = $('hist-from'), to = $('hist-to');
  if (fr && fr.value !== histUI.from) fr.value = histUI.from;
  if (to && to.value !== histUI.to) to.value = histUI.to;
}
function clearHistFilters() {
  histUI.from = ''; histUI.to = '';
  histUI.fSetType = []; histUI.fTrapType = []; histUI.fLure = []; histUI.fBait = []; histUI.fStatus = [];
}

function renderHistChips() {
  var dc = $('hist-disp-chips');
  var defs = [['all', 'All'], ['kept', 'Dispatched'], ['kept-alive', 'Kept alive'], ['released', 'Released'], ['transported', 'Transported']];
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
    var c = l.count * 1 || 0;
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
  var meta = (showDate ? esc(dayLabel(l.date)) : '') +
    ((l.setName || '') ? (showDate ? ' · ' : '') + esc(l.setName) : '') +
    ((l.bait || l.lure) ? ' · ' + esc([l.bait, l.lure].filter(Boolean).join(' / ')) : '');
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
    '<span class="lr-count">×' + esc(l.count) + '</span>' +
    dispBadge(l.disposition) + '</div>' +
    (meta ? '<div class="dim">' + meta + '</div>' : '') +
    (l.notes ? '<div class="lr-notes">' + esc(l.notes) + '</div>' : '') +
    (l.weather ? '<div class="dim">🌤 ' + esc(weatherText(l.weather)) + '</div>' : '') + '</div>';
}

function renderHistByDate(list) {
  var f = histUI;
  /* Default-collapse day groups older than 7 days (once per session). */
  if (!f.defaultsSet) {
    var cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
    var seenDays = {};
    list.forEach(function (l) {
      if (!l.date || seenDays[l.date]) return; seenDays[l.date] = true;
      var p = l.date.split('-');
      if (new Date(p[0] * 1, p[1] * 1 - 1, p[2] * 1) < cutoff) f.collapsed[l.date] = true;
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
      list.forEach(function (m) { if (m.date === l.date && (m.seasonYear || seasonYearOf(m.date)) === sy) dayCatches += (m.count * 1 || 0); });
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
    var c = l.count * 1 || 0;
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

function renderHistory() {
  var box = $('history-list');
  var logs = activeLogs();
  renderHistChips();
  renderHistDimChips();
  renderHistFilterBar();
  var seg = $('hist-view-seg');
  if (seg) {
    var btns = seg.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('selected', btns[i].getAttribute('data-view') === histUI.view);
    }
  }
  if (!logs.length) {
    renderHistSummary([]);
    box.innerHTML = '<div class="empty"><div class="big">📒</div>No catches logged yet.<br>Tap a set pin on the map to log your first catch.</div>';
    return;
  }
  var list = histFilteredLogs();
  renderHistSummary(list);
  if (!list.length) {
    box.innerHTML = '<div class="empty"><div class="big">🔍</div>No catches match those filters.</div>';
    return;
  }
  box.innerHTML = (histUI.view === 'species') ? renderHistBySpecies(list)
    : (histUI.view === 'scorecard') ? renderScorecard()
    : renderHistByDate(list);
}

/* Bait & lure scorecard: catch per trap-night, grouped by each set's current bait/lure. */
function renderScorecard() {
  var by = histUI.scoreBy || 'lure';
  var groups = {};
  function grp(key) {
    var k = key || '';
    if (!groups[k]) groups[k] = { name: k || '(none)', nights: 0, catches: 0, nsets: 0 };
    return groups[k];
  }
  activeSets().forEach(function (s) {
    var g = grp(by === 'lure' ? s.lure : s.bait);
    g.nights += trapNights(s);
    g.nsets++;
  });
  activeLogs().forEach(function (l) {
    if (l.otherType) return; /* Other events never inflate catch-per-trap-night rates */
    var s = l.setId ? getSet(l.setId) : null;
    var key = s ? (by === 'lure' ? s.lure : s.bait)
                : (by === 'lure' ? (l.lure || '') : (l.bait || ''));
    grp(key).catches += (l.count * 1 || 0);
  });
  var rows = Object.keys(groups).map(function (k) { return groups[k]; });
  rows.sort(function (a, b) {
    var ra = a.nights ? a.catches / a.nights : 0;
    var rb = b.nights ? b.catches / b.nights : 0;
    return rb - ra;
  });
  var html = '<div class="seg compact" style="margin-bottom:10px">' +
    '<button type="button" data-scoreby="lure"' + (by === 'lure' ? ' class="selected"' : '') + '>By lure</button>' +
    '<button type="button" data-scoreby="bait"' + (by === 'bait' ? ' class="selected"' : '') + '>By bait</button></div>';
  if (!activeSets().length) {
    return html + '<div class="empty"><div class="big">🎯</div>No sets yet — the scorecard fills in as you trap.</div>';
  }
  html += '<p class="dim">All-time catch per trap-night, grouped by each set\'s current ' + (by === 'lure' ? 'lure' : 'bait') + '.</p>';
  html += rows.map(function (g) {
    var rate = g.nights ? (g.catches / g.nights) : 0;
    return '<div class="sc-row"><span class="sc-name">' + esc(g.name) + '</span>' +
      '<span class="dim">' + g.catches + ' caught · ' + g.nights + ' nights · ' + g.nsets + ' set' + (g.nsets === 1 ? '' : 's') + '</span>' +
      '<span class="sc-rate"><strong>' + rate.toFixed(2) + '</strong>/night</span></div>';
  }).join('');
  return html;
}

function renderTotals() {
  var box = $('totals-body');
  var logs = activeLogs();
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
    if (l.otherType) return; /* Other events are events, not catches — excluded from Totals */
    var y = l.seasonYear || seasonYearOf(l.date);
    if (y !== sy) return;
    var c = l.count * 1 || 0, d = l.disposition || 'kept';
    bySpecies[l.species] = bySpecies[l.species] || { kept: 0, alive: 0, released: 0, transported: 0 };
    bySite[l.setName || '(deleted set)'] = bySite[l.setName || '(deleted set)'] || { kept: 0, alive: 0, released: 0, transported: 0 };
    var bucket = (d === 'released') ? 'released' : (d === 'kept-alive' ? 'alive' : (d === 'transported' ? 'transported' : 'kept'));
    bySpecies[l.species][bucket] += c; bySite[l.setName || '(deleted set)'][bucket] += c;
  });
  function rows(obj) {
    function tot(o) { return o.kept + o.alive + o.released + o.transported; }
    return Object.keys(obj).sort(function (a, b) { return tot(obj[b]) - tot(obj[a]); }).map(function (k) {
      return '<div class="rowline"><span>' + esc(k) +
        (obj[k].alive ? '<span class="dim"> · ' + obj[k].alive + ' kept alive</span>' : '') +
        (obj[k].released ? '<span class="dim"> · ' + obj[k].released + ' released</span>' : '') +
        (obj[k].transported ? '<span class="dim"> · ' + obj[k].transported + ' transported/released</span>' : '') +
        '</span><span class="big-num">' + obj[k].kept + '</span></div>';
    }).join('');
  }
  box.innerHTML =
    '<div class="card"><h3>By species</h3>' + rows(bySpecies) + '</div>' +
    '<div class="card"><h3>By site</h3>' + rows(bySite) + '</div>';
}

function renderSeasons(filter) {
  var d = stateData();
  var entry = stateEntry(activeStateCode());
  if (!d) {
    $('seasons-list').innerHTML = '<p class="dim">No season data loaded.</p>';
    return;
  }
  $('seasons-title').textContent = 'Season reminders — ' + d.state_name;
  $('seasons-sub').textContent = d.season_year + ' season year' + (entry && entry.provisional ? ' · data provisional' : '');
  $('seasons-disclaimer').innerHTML = '<div class="wb-title">⚠ ' + esc(REMINDER_LINE) + '</div>' + esc(d.disclaimer || '');
  var rl = $('seasons-regs');
  if (d.regs_url) {
    rl.hidden = false;
    rl.href = d.regs_url;
    rl.innerHTML = '📄 Official ' + esc(d.state_name) + ' trapping regulations' +
      (d.regs_kind === 'page' ? ' <span class="dim">(agency site)</span>' : ' <span class="dim">(PDF)</span>');
  } else {
    rl.hidden = true;
    rl.removeAttribute('href');
  }
  var q = (filter || '').toLowerCase();
  var list = sortSpeciesAlpha(stateSpecies().filter(function (sp) {
    return !q || sp.common_name.toLowerCase().indexOf(q) !== -1;
  }));
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
  if (sp.domestic) html += '<p class="dim">' + esc(domesticNotes()) + '</p>';
  else if (sp.notes) html += '<p class="dim">' + esc(sp.notes) + '</p>';
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
    /* License wallet is per trap line. Photos saved before lines existed
       have no lineId and belong to the first line. */
    var lid = activeLineId();
    var firstId = (Store.data.lines && Store.data.lines[0] && Store.data.lines[0].id) || null;
    all = all.filter(function (p) {
      if (p.setId || p.logId) return false; /* license wallet only */
      return (p.lineId || firstId) === lid;
    });
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
    var btnLabel = link ? 'Open license site ↗'
      : 'Official ' + esc(d.state_name) + ' license site ↗';
    html += '<a class="btn-primary" style="display:block;text-align:center;margin-top:10px;text-decoration:none" href="' +
      esc(btnUrl) + '" target="_blank" rel="noopener">' + btnLabel + '</a>';
    if (!link && d.license_note) {
      html += '<p class="dim" style="margin-top:8px">' + esc(d.license_note) + '</p>';
    }
  }
  html += '<label class="field" for="m-lic-link" style="margin-top:12px">Custom link (optional — overrides the official site above)</label>' +
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
  var total = activeLogs().length;
  if (!total) { toast('No catches to export yet.'); return; }
  /* Same shared filter as the on-screen History report: the CSV always
     matches exactly what the filtered view shows. */
  var list = histFilteredLogs().slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  if (!list.length) { toast('No catches match the current filters.'); return; }
  var rows = [['Date', 'Season', 'Set', 'Species', 'Count', 'Disposition', 'Set type', 'Trap type', 'Trap detail', 'Weather', 'Bait', 'Lure', 'County', 'Latitude', 'Longitude', 'Notes']];
  list.forEach(function (l) {
    /* Other events with no species entered show the subtype label in the
       Species column — no format change needed. */
    var spCol = (l.otherType && !l.species) ? (OTHER_LABELS[l.otherType] || 'Other event') : l.species;
    /* Trap detail: snapshot on the log, falling back to the set's current details for older logs. */
    var det = l.trapDetail || (function () { var s2 = l.setId ? getSet(l.setId) : null; return s2 ? trapDetailSummary(s2) : ''; })();
    rows.push([l.date, l.seasonYear || seasonYearOf(l.date), l.setName, spCol, l.count,
      dispLabel(l.disposition), l.setType, l.trapType, det, weatherText(l.weather), l.bait, l.lure, l.county, l.lat, l.lng, l.notes]);
  });
  var filt = filtersActive();
  downloadCSV('opossum-foot-catches-' + lineFileSlug() + '-' + todayISO() + (filt ? '-filtered' : '') + '.csv', rows);
  toast('Catches CSV downloaded (' + list.length + (list.length === total ? '' : ' of ' + total) + ').');
}
function exportSets() {
  if (!activeSets().length) { toast('No sets to export yet.'); return; }
  var rows = [['Name', 'Latitude', 'Longitude', 'County', 'Set type', 'Trap type', 'Trap count', 'Trap spring', 'Trap size', 'Snare diameter', 'Snare lock', 'Snare length', 'Trap model', 'Weather', 'Bait', 'Lure', 'Status', 'Date set', 'Notes']];
  activeSets().forEach(function (s) {
    rows.push([s.name, s.lat, s.lng, s.county, s.setType, s.trapType, (s.trapCount || 1), (s.trapSpring || ''), (s.trapSize || ''), (s.snareDia || ''), (s.snareLock || ''), (s.snareLen || ''), (s.trapModel || ''), weatherText(s.weather), s.bait, s.lure, s.status, s.dateSet, s.notes]);
  });
  downloadCSV('opossum-foot-sets-' + lineFileSlug() + '-' + todayISO() + '.csv', rows);
  toast('Sets CSV downloaded.');
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
        trapSpring: s.trapSpring || '', trapSize: s.trapSize || '',
        snareDia: s.snareDia || '', snareLock: s.snareLock || '', snareLen: s.snareLen || '',
        trapModel: s.trapModel || '',
        bait: s.bait || '', lure: s.lure || '',
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
        species: l.species || 'Unknown', count: (l.count * 1) || 1,
        otherType: l.otherType || null,
        disposition: l.disposition || 'kept',
        date: date, seasonYear: l.seasonYear || seasonYearOf(date),
        bait: l.bait || '', lure: l.lure || '',
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
    var al = activeLine();
    if (al && !al.state && data.state) al.state = data.state;
    if (!Store.data.onboarded && activeStateCode()) Store.data.onboarded = true;
    Store.save();
    refreshMarkers(); renderHistory(); renderTotals();
    toast('Imported ' + nSets + ' sets and ' + nLogs + ' logs.');
  };
  reader.readAsText(file);
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
  if (name === 'weather') renderWeatherTab();
  if (name === 'lines') renderLines();
}

/* ================= 13b. TRAP LINES UI =================
   One line active at a time; every view follows it via the activeSets() /
   activeLogs() / activeStateCode() accessors. */
function refreshForLine() {
  /* history filters belong to the old line's data — reset so a stale
     species or date filter can't show a confusing empty report */
  histUI.q = ''; histUI.disp = 'all'; histUI.from = ''; histUI.to = '';
  histUI.fSetType = []; histUI.fTrapType = []; histUI.fLure = []; histUI.fBait = []; histUI.fStatus = [];
  histUI.collapsed = {}; histUI.expanded = {}; histUI.spOpen = {}; histUI.defaultsSet = false;
  var hs = $('history-search'); if (hs) hs.value = '';
  refreshMarkers();
  renderHistory();
  renderTotals();
  renderSeasons($('seasons-search') ? $('seasons-search').value : '');
  renderLicenses();
  renderMapStatusFilters();
  buildStateSelect($('settings-state'), activeStateCode());
  renderSettingsLineName();
  renderLineBar();
  fitMapToState();
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
    '<h3>New trap line</h3>' +
    '<label class="field" for="m-line-name">Line name</label>' +
    '<input type="text" id="m-line-name" maxlength="40" placeholder="e.g. River bottoms">' +
    '<label class="field" for="m-line-state" style="margin-top:10px">Trapping state</label>' +
    '<select id="m-line-state"></select>' +
    '<div class="btn-row" style="margin-top:14px"><button class="btn-secondary" id="m-cancel" type="button">Cancel</button>' +
    '<button class="btn-primary" id="m-ok" type="button">Add line</button></div>'
  );
  buildStateSelect($('m-line-state'), activeStateCode());
  $('m-cancel').onclick = closeModal;
  $('m-ok').onclick = function () {
    var name = $('m-line-name').value.trim();
    if (!name) { toast('Give the line a name.'); return; }
    var code = $('m-line-state').value;
    if (!code) { toast('Pick the trapping state for this line.'); return; }
    var ln = { id: newLineId(), name: name, state: code };
    Store.data.lines.push(ln);
    closeModal();
    activateLine(ln.id);
  };
  setTimeout(function () { var el = $('m-line-name'); if (el) el.focus(); }, 60);
}
function showLineEditModal(id) {
  var ln = lineById(Store.data, id);
  if (!ln) return;
  showModal(
    '<h3>Edit trap line</h3>' +
    '<label class="field" for="m-line-name">Line name</label>' +
    '<input type="text" id="m-line-name" maxlength="40" value="' + esc(ln.name) + '">' +
    '<label class="field" for="m-line-state" style="margin-top:10px">Trapping state</label>' +
    '<select id="m-line-state"></select>' +
    '<div class="btn-row" style="margin-top:14px"><button class="btn-secondary" id="m-cancel" type="button">Cancel</button>' +
    '<button class="btn-secondary" id="m-del" type="button">Delete</button>' +
    '<button class="btn-primary" id="m-ok" type="button">Save</button></div>'
  );
  buildStateSelect($('m-line-state'), ln.state);
  $('m-cancel').onclick = closeModal;
  $('m-ok').onclick = function () {
    var name = $('m-line-name').value.trim();
    if (!name) { toast('Give the line a name.'); return; }
    var code = $('m-line-state').value;
    if (!code) { toast('Pick the trapping state for this line.'); return; }
    ln.name = name;
    ln.state = code;
    Store.save();
    closeModal();
    renderLines();
    renderSettingsLineName();
    renderLineBar();
    if (id === Store.data.activeLineId) { renderSeasons($('seasons-search').value); fitMapToState(); }
    toast('Line saved.');
  };
  $('m-del').onclick = function () { closeModal(); deleteLine(id); };
}
function deleteLine(id) {
  var d = Store.data;
  var ln = lineById(d, id);
  if (!ln) return;
  if (d.lines.length <= 1) { toast('You need at least one trap line.'); return; }
  var nSets = 0, nLogs = 0;
  d.sets.forEach(function (s) { if (s.lineId === id) nSets++; });
  d.logs.forEach(function (l) { if (l.lineId === id) nLogs++; });
  if (nSets || nLogs) {
    toast('\u201C' + ln.name + '\u201D still has ' + nSets + ' set' + (nSets === 1 ? '' : 's') +
      ' and ' + nLogs + ' catch' + (nLogs === 1 ? '' : 'es') + ' \u2014 empty it first.');
    return;
  }
  confirmModal('Delete \u201C' + esc(ln.name) + '\u201D?',
    'The empty line will be removed. This cannot be undone.',
    'Delete line', function () {
      d.lines = d.lines.filter(function (x) { return x.id !== id; });
      if (d.activeLineId === id) d.activeLineId = d.lines[0].id;
      Store.save();
      refreshForLine();
      renderLines();
      toast('Line deleted.');
    });
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
  renderMapStatusFilters();
  buildStateSelect($('settings-state'), activeStateCode());
  renderSettingsLineName();
  renderLineBar();
  $('settings-weather').checked = !!Store.data.weatherOn;
  $('settings-weather').onchange = function () {
    Store.data.weatherOn = this.checked;
    Store.save(); applyFeatureToggles();
    toast(this.checked ? 'Weather is on — tab and auto-record.' : 'Weather is off.');
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
  $('settings-seasons').checked = Store.data.seasonsOn !== false;
  $('settings-seasons').onchange = function () {
    Store.data.seasonsOn = this.checked;
    Store.save(); applyFeatureToggles();
    toast(this.checked ? 'Seasons tab is on.' : 'Seasons tab is off.');
  };
  var sfKeys = ['traptype', 'trapcount', 'trapdetail', 'settype', 'bait', 'lure', 'notes'];
  sfKeys.forEach(function (key) {
    var cb = $('settings-sf-' + key);
    if (!cb) return;
    cb.checked = setFieldOn(key);
    cb.onchange = function () {
      Store.data.setFields[key] = this.checked;
      Store.save(); applySetFieldToggles();
    };
  });
  $('btn-features-reset').onclick = function () {
    Store.data.weatherOn = false; Store.data.voiceOn = true; Store.data.licensesOn = true;
    Store.data.seasonsOn = true;
    Store.data.setFields = { traptype: true, trapcount: true, trapdetail: true, settype: true, bait: true, lure: true, notes: true };
    Store.save();
    $('settings-weather').checked = false; $('settings-voice').checked = true; $('settings-licenses').checked = true;
    $('settings-seasons').checked = true;
    sfKeys.forEach(function (key) { var cb = $('settings-sf-' + key); if (cb) cb.checked = true; });
    applyFeatureToggles(); applySetFieldToggles();
    toast('Features reset to defaults.');
  };
  $('btn-weather-refresh').onclick = function () { renderWeatherTab(); };
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
    var al0 = activeLine();
    if (al0) al0.state = code;
    Store.data.onboarded = true;
    Store.save();
    enterMain();
  };

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
  $('btn-sd-photo').onclick = function () { $('sd-photo-input').click(); };
  $('sd-photo-input').onchange = function () {
    var f = this.files[0];
    this.value = '';
    if (!f || !detailSetId) return;
    var s = getSet(detailSetId);
    if (!s) return;
    downscalePhoto(f, function (blob) {
      IDB.put('photos', {
        id: uid('p'), setId: s.id, blob: blob, mime: blob.type || 'image/jpeg',
        lat: s.lat, lng: s.lng, createdAt: Date.now()
      }).then(function () {
        loadSetPhotos(s.id, function (sp) { renderSetPhotos(sp); });
        toast('Photo added to ' + s.name + '.');
      }).catch(function () { toast('Could not save that photo.'); });
    });
  };
  $('sd-notes').onchange = saveDetailNotes;
  $('btn-voice-sdnotes').onclick = function () {
    var ta = $('sd-notes');
    Voice.start($('voice-sdnotes-preview'), function (t) {
      ta.value = (ta.value ? ta.value.replace(/\s+$/, '') + ' ' : '') + t;
      saveDetailNotes();
    });
  };

  /* log sheet */
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
  $('log-othertype').onchange = function () { logOtherType = this.value; updateLogNotesPlaceholder(); };
  $('log-date').onchange = renderLogWarnings;
  $('btn-save-log').onclick = saveLog;
  $('btn-voice-lognotes').onclick = function () {
    var ta = $('log-notes');
    Voice.start($('voice-lognotes-preview'), function (t) {
      ta.value = (ta.value ? ta.value.replace(/\s+$/, '') + ' ' : '') + t;
    });
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
  $('hist-filters-toggle').onclick = function () { histUI.filtersOpen = !histUI.filtersOpen; renderHistory(); };
  $('hist-filters-clear').onclick = function () { clearHistFilters(); renderHistory(); };
  $('hist-from').onchange = function () { histUI.from = this.value; renderHistory(); };
  $('hist-to').onchange = function () { histUI.to = this.value; renderHistory(); };
  $('pane-history').addEventListener('click', function (e) {
    var fchip = e.target.closest ? e.target.closest('[data-fdim]') : null;
    if (fchip) {
      var fkey = fchip.getAttribute('data-fdim'), fval = fchip.getAttribute('data-fval');
      var farr = histUI[fkey];
      var fix = farr.indexOf(fval);
      if (fix === -1) farr.push(fval); else farr.splice(fix, 1);
      renderHistory();
      return;
    }
    var segBtn = e.target.closest ? e.target.closest('#hist-view-seg button') : null;
    if (segBtn) {
      histUI.view = segBtn.getAttribute('data-view');
      renderHistory();
      return;
    }
    var sbBtn = e.target.closest ? e.target.closest('[data-scoreby]') : null;
    if (sbBtn) {
      histUI.scoreBy = sbBtn.getAttribute('data-scoreby');
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
    if (spHead) {
      var s = spHead.getAttribute('data-sp');
      histUI.spOpen[s] = !histUI.spOpen[s];
      renderHistory();
      return;
    }
    var dh = e.target.closest ? e.target.closest('.day-head') : null;
    if (dh) {
      var d = dh.getAttribute('data-day');
      histUI.collapsed[d] = !histUI.collapsed[d];
      renderHistory();
      return;
    }
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

  /* settings */
  $('settings-state').onchange = function () {
    var code = this.value;
    var al = activeLine();
    if (!code || !al || code === al.state) return;
    al.state = code;
    Store.save();
    renderSeasons('');
    fitMapToState();
    var e = stateEntry(code);
    toast('Trapping state is now ' + (e ? e.name : code) + '.');
  };
  $('btn-export-catches').onclick = exportCatches;
  $('btn-export-sets').onclick = exportSets;
  $('btn-import').onclick = function () { $('import-file').click(); };
  $('import-file').onchange = function () {
    if (this.files && this.files[0]) importDataFile(this.files[0]);
    this.value = '';
  };
  $('btn-erase').onclick = eraseAll;

  /* trap lines */
  $('btn-add-line').onclick = showAddLineModal;

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
    setTimeout(function () {
      if (Store.data.onboarded && activeStateCode() && stateData()) enterMain();
      else showView('view-onboard');
      if (DEMO_ACTIVE) toast('Demo mode — fictional data.');
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
