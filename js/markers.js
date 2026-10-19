/* ============ Q190/Q191 — Sign & Forage markers ============
   A marker is NOT a set: no status, no checks, no catches, no season
   alerts, never counted in set totals. It is a scouting/intel layer:
   71 mammal-sign kinds (5 families) + 44 forage & finds kinds, each
   with its own glyph, field info behind the pin, sources cited in-app.
   Q191: a marker is a pin OR an area (polygon) for patches.
   Data: Store.data.markers = [{ id, cat:'sign'|'forage', ref, fam,
   name, lat, lng } | { ..., poly:[[lat,lng],...] }, note, createdAt,
   lineId]. Photos live in IndexedDB 'photos' with markerId set. */
var Markers = (function () {
  var layer = null, mapRef = null;
  var FAM_LABEL = { homes: 'Homes & structures', ground: 'Ground sign', tree: 'Tree & vegetation', feeding: 'Feeding & remains', scent: 'Scent & communication', forage: 'Forage & finds' };
  var FORAGE_FAM_LABEL = { fungi: 'Fungi & mushrooms', fruit: 'Fruits & berries', greens: 'Greens, shoots & plants', mast: 'Nuts & mast', other: 'Other finds' };

  function data() {
    if (!Store.data) return [];
    if (!Array.isArray(Store.data.markers)) Store.data.markers = [];
    return Store.data.markers;
  }
  function markersOn() { return !Store.data || Store.data.markersOn !== false; }
  function showModel() {
    var d = Store.data || {};
    if (!d.mapShow) d.mapShow = {};
    var m = d.mapShow;
    ['active', 'sprung', 'pulled', 'missing', 'prospect'].forEach(function (k) { if (m[k] === undefined) m[k] = true; });
    if (!m.fam) m.fam = {};
    ['homes', 'ground', 'tree', 'feeding', 'scent', 'forage'].forEach(function (k) { if (m.fam[k] === undefined) m.fam[k] = true; });
    return m;
  }
  function signEntry(ref) { for (var i = 0; i < SIGN_CATALOG.length; i++) if (SIGN_CATALOG[i].ref === ref) return SIGN_CATALOG[i]; return null; }
  function forageEntry(glyph) { for (var i = 0; i < FORAGE_CATALOG.length; i++) if (FORAGE_CATALOG[i].glyph === glyph) return FORAGE_CATALOG[i]; return null; }
  function glyphSvg(inner) {
    return '<svg viewBox="0 0 24 24" class="mk-glyph">' + (inner || '') + '</svg>';
  }
  function glyphFor(mk) {
    if (mk.cat === 'sign') { var e = signEntry(mk.ref); return glyphSvg(e && SIGN_GLYPHS[mk.ref]); }
    return glyphSvg(FORAGE_GLYPHS[mk.ref]);
  }
  function famOf(mk) { return mk.cat === 'sign' ? mk.fam : 'forage'; }

  function visible(mk) {
    if (!markersOn()) return false;
    var m = showModel();
    return m.fam[famOf(mk)] !== false;
  }

  function pinIcon(mk) {
    return L.divIcon({
      className: '',
      html: '<div class="mk-pin">' + glyphFor(mk) + '</div>',
      iconSize: [30, 30], iconAnchor: [15, 15]
    });
  }

  function render() {
    if (!layer || !mapRef) return;
    layer.clearLayers();
    data().forEach(function (mk) {
      if (!visible(mk)) return;
      if (mk.poly && mk.poly.length > 2) {
        var p = L.polygon(mk.poly, { className: 'mk-area', color: '#f0d28a', weight: 2, fillColor: '#2c3e2d', fillOpacity: 0.45 });
        p.on('click', function () { if (document.body.classList.contains('placing')) return; openDetail(mk.id); });
        layer.addLayer(p);
        var c = p.getBounds().getCenter();
        var cm = L.marker(c, { icon: pinIcon(mk), title: mk.name });
        cm.on('click', function () { if (document.body.classList.contains('placing')) return; openDetail(mk.id); });
        layer.addLayer(cm);
      } else if (isFinite(+mk.lat) && isFinite(+mk.lng)) {
        var m = L.marker([+mk.lat, +mk.lng], { icon: pinIcon(mk), title: mk.name });
        m.on('click', function () { if (document.body.classList.contains('placing')) return; openDetail(mk.id); });
        layer.addLayer(m);
      }
    });
  }

  function attach(map) {
    mapRef = map;
    if (!layer) { layer = L.layerGroup().addTo(map); }
    render();
  }

  /* ---------- placement: pin ---------- */
  var placeMk = null, pendingKind = null;
  function setLock(on) { document.body.classList.toggle('placing', !!on); }
  function startPinPlace() {
    cancelAll();
    setLock(true);
    $('mk-hint').textContent = 'Tap the map where the sign is.';
    $('mk-hint').classList.add('show');
    mode = 'pin-tap';
  }
  var mode = null; /* 'pin-tap' | 'pin-drag' | 'area' */
  function onMapClick(e) {
    if (mode === 'pin-tap') {
      cancelHint();
      placeMk = L.marker(e.latlng, { draggable: true, icon: L.divIcon({ className: '', html: '<div class="mk-pin mk-place">' + glyphSvg('') + '</div>', iconSize: [36, 36], iconAnchor: [18, 18] }) }).addTo(mapRef);
      $('mk-place-bar').classList.add('show');
      mode = 'pin-drag';
      return true;
    }
    if (mode === 'area') {
      areaPts.push([e.latlng.lat, e.latlng.lng]);
      drawAreaDraft();
      return true;
    }
    return false;
  }
  function cancelHint() { var h = $('mk-hint'); if (h) h.classList.remove('show'); }
  function cancelAll() {
    mode = null; areaPts = []; pendingKind = null;
    cancelHint();
    if (placeMk && mapRef) { try { mapRef.removeLayer(placeMk); } catch (e) {} placeMk = null; }
    var pb = $('mk-place-bar'); if (pb) pb.classList.remove('show');
    var ab = $('mk-area-bar'); if (ab) ab.classList.remove('show');
    if (areaDraft && mapRef) { try { mapRef.removeLayer(areaDraft); } catch (e) {} areaDraft = null; }
    setLock(false);
  }

  /* ---------- placement: area (Q191) ---------- */
  var areaPts = [], areaDraft = null;
  function startAreaPlace() {
    cancelAll();
    setLock(true);
    mode = 'area'; areaPts = [];
    $('mk-hint').textContent = 'Tap the corners around the patch.';
    $('mk-hint').classList.add('show');
    $('mk-area-bar').classList.add('show');
    updateAreaBar();
  }
  function drawAreaDraft() {
    if (areaDraft && mapRef) { try { mapRef.removeLayer(areaDraft); } catch (e) {} }
    if (areaPts.length > 1) {
      areaDraft = L.polygon(areaPts, { color: '#f0d28a', weight: 2, dashArray: '5 4', fillColor: '#2c3e2d', fillOpacity: 0.3 }).addTo(mapRef);
    } else if (areaPts.length === 1) {
      areaDraft = L.circleMarker(areaPts[0], { radius: 5, color: '#f0d28a' }).addTo(mapRef);
    }
    updateAreaBar();
  }
  function updateAreaBar() {
    var b = $('btn-mk-area-done'); if (b) b.disabled = areaPts.length < 3;
    var n = $('mk-area-count'); if (n) n.textContent = areaPts.length ? areaPts.length + (areaPts.length === 1 ? ' corner' : ' corners') : 'No corners yet';
  }

  /* ---------- form ---------- */
  var formCtx = null; /* { mode:'pin'|'area', latlng | poly, editId? } */
  function openForm(ctx) {
    formCtx = ctx;
    pendingKind = ctx.kind || null;
    $('mk-note').value = ctx.note || '';
    renderKindChoice();
    renderFormPhotos(ctx.editId || null);
    openSheet('sheet-marker-form');
  }
  function renderKindChoice() {
    var el = $('mk-kind-name');
    if (!pendingKind) { el.textContent = 'Choose the kind of sign…'; return; }
    el.innerHTML = glyphFor(pendingKind) + '<span>' + esc(pendingKind.name) + '</span>';
  }
  function openKindPicker() {
    var q = $('mk-kind-search'); if (q) q.value = '';
    renderKindList('');
    openSheet('sheet-marker-kinds');
  }
  function renderKindList(filter) {
    var host = $('mk-kind-list'); if (!host) return;
    var f = (filter || '').toLowerCase(), html = '';
    function row(cat, ref, fam, name, glyphInner) {
      return '<button type="button" class="mk-kind-row" data-cat="' + cat + '" data-ref="' + esc(ref) + '">' +
        '<span class="mk-kind-ic">' + glyphSvg(glyphInner) + '</span><span class="mk-kind-nm">' + esc(name) + '</span></button>';
    }
    var any = false;
    ['homes', 'ground', 'tree', 'feeding', 'scent'].forEach(function (fam) {
      var rows = '';
      SIGN_CATALOG.forEach(function (e) {
        if (e.fam !== fam) return;
        if (f && e.name.toLowerCase().indexOf(f) < 0) return;
        rows += row('sign', e.ref, fam, e.name, SIGN_GLYPHS[e.ref]); any = true;
      });
      if (rows) html += '<div class="mk-fam-head">' + FAM_LABEL[fam] + '</div>' + rows;
    });
    var frows = '';
    FORAGE_CATALOG.forEach(function (e) {
      if (f && e.name.toLowerCase().indexOf(f) < 0) return;
      frows += row('forage', e.glyph, 'forage', e.name, FORAGE_GLYPHS[e.glyph]); any = true;
    });
    if (frows) html += '<div class="mk-fam-head">' + FAM_LABEL.forage + '</div>' +
      '<p class="dim mk-disclaimer">Not a foraging guide: these pins mark where things grow and what feeds on them — not what is safe to eat. Never eat a wild plant or mushroom based on this app; confirm any identification with a trusted field guide or an expert first.</p>' + frows;
    host.innerHTML = any ? html : '<p class="dim">No kinds match that search.</p>';
    var btns = host.querySelectorAll('.mk-kind-row');
    for (var i = 0; i < btns.length; i++) btns[i].onclick = function () {
      var cat = this.getAttribute('data-cat'), ref = this.getAttribute('data-ref');
      if (cat === 'sign') { var e = signEntry(ref); pendingKind = { cat: 'sign', ref: ref, fam: e.fam, name: e.name }; }
      else { var fe = forageEntry(ref); pendingKind = { cat: 'forage', ref: ref, fam: 'forage', name: fe.name }; }
      closeSheets(); renderKindChoice();
      if (formCtx) openSheet('sheet-marker-form');
    };
  }
  function renderFormPhotos(editId) {
    var host = $('mk-form-photos'); if (!host) return;
    host.innerHTML = '';
    if (!editId) return;
    IDB.all('photos').then(function (all) {
      all.filter(function (p) { return p.markerId === editId; }).forEach(function (p) {
        var img = document.createElement('img'); img.className = 'mk-thumb'; img.src = URL.createObjectURL(p.blob); host.appendChild(img);
      });
    }).catch(function () {});
  }
  function saveForm() {
    if (!pendingKind) { toast('Choose the kind of sign first.'); return; }
    if (!formCtx) return;
    var note = $('mk-note').value.trim();
    if (formCtx.editId) {
      var ex = data().filter(function (m) { return m.id === formCtx.editId; })[0];
      if (ex) { ex.cat = pendingKind.cat; ex.ref = pendingKind.ref; ex.fam = pendingKind.fam; ex.name = pendingKind.name; ex.note = note; }
    } else {
      var mk = { id: uid('mk'), cat: pendingKind.cat, ref: pendingKind.ref, fam: pendingKind.fam, name: pendingKind.name, note: note, createdAt: Date.now(), lineId: (activeLine() || {}).id || null };
      if (formCtx.mode === 'area') mk.poly = formCtx.poly; else { mk.lat = formCtx.latlng.lat; mk.lng = formCtx.latlng.lng; }
      data().push(mk);
      formCtx.editId = mk.id;
    }
    Store.save(); render();
    var newFiles = formPhotoFiles;
    if (newFiles.length) {
      var mid = formCtx.editId;
      newFiles.forEach(function (file) {
        downscalePhoto(file, function (blob) {
          IDB.put('photos', { id: uid('p'), markerId: mid, blob: blob, createdAt: Date.now() }).then(function () { renderFormPhotos(mid); });
        });
      });
      formPhotoFiles = [];
    }
    closeSheets();
    /* Q199 (2026-10-18): Tanner saved a marker with its layer toggled off and
       it looked broken — the app now SAYS why a saved marker won't show,
       instead of leaving the trapper guessing. His words: "Perfect, I like that." */
    var savedMk = data().filter(function (m) { return m.id === formCtx.editId; })[0];
    if (!markersOn()) toast('Marker saved — but the Sign & forage markers layer is off in Settings, so it won\'t show on the map until you turn it back on.');
    else if (savedMk && !visible(savedMk)) toast('Marker saved — but that kind is turned off in the Show list, so it won\'t show on the map until you turn it on there.');
    else toast('Marker saved.');
  }
  var formPhotoFiles = [];

  /* ---------- detail ---------- */
  var detailId = null;
  function openDetail(id) {
    var mk = data().filter(function (m) { return m.id === id; })[0];
    if (!mk) return;
    detailId = id;
    var html = '<div class="mk-detail-head"><span class="mk-kind-ic big">' + glyphFor(mk) + '</span><div><h3>' + esc(mk.name) + '</h3>' +
      '<p class="dim">' + esc(mk.cat === 'sign' ? FAM_LABEL[mk.fam] : FORAGE_FAM_LABEL[(forageEntry(mk.ref) || {}).fam] || 'Forage & finds') + ' · ' + (mk.poly ? 'Area' : 'Pin') + ' · ' + new Date(mk.createdAt).toLocaleDateString() + '</p></div></div>';
    /* Q194 (2026-10-18): Tanner — his photo and his note come FIRST; the
       catalog description lives as a tab at the bottom of the page. */
    html += '<div class="mk-detail-photos" id="mk-detail-photos"></div>';
    if (mk.note) html += '<div class="card mk-note-card"><strong>Your note</strong><p>' + esc(mk.note) + '</p></div>';
    $('mk-detail-body').innerHTML = html;
    var infoHost = $('mk-detail-info');
    if (infoHost) {
      infoHost.innerHTML = '<div class="setsec" style="margin-top:14px">' +
        '<button type="button" class="setsec-head" id="mk-info-head" aria-expanded="false"><span>' + (mk.cat === 'sign' ? 'How to read it' : 'About this find') + '</span><span class="setsec-chev" aria-hidden="true">›</span></button>' +
        '<div class="setsec-body" id="mk-info-body" hidden><div class="card mk-info-card">' + infoHtml(mk) + '</div></div></div>';
      $('mk-info-head').onclick = function () {
        var b = $('mk-info-body'); if (!b) return;
        var open = b.hidden; b.hidden = !open;
        this.setAttribute('aria-expanded', open ? 'true' : 'false');
      };
    }
    IDB.all('photos').then(function (all) {
      var host = $('mk-detail-photos'); if (!host) return;
      all.filter(function (p) { return p.markerId === id; }).forEach(function (p) {
        var img = document.createElement('img'); img.className = 'mk-thumb'; img.src = URL.createObjectURL(p.blob); host.appendChild(img);
      });
    }).catch(function () {});
    openSheet('sheet-marker-detail');
  }
  function infoHtml(mk) {
    if (mk.cat === 'sign') {
      var e = signEntry(mk.ref); if (!e) return '';
      return '<strong>How to read it</strong><p>' + esc(e.desc) + '</p>' +
        '<p><strong>Who makes it:</strong> ' + esc(e.species) + '</p>' +
        '<p><strong>Skill:</strong> ' + esc(e.skill) + '</p>' +
        '<p class="dim">From the Sign &amp; Forage Reference — sources cited there.</p>';
    }
    var f = forageEntry(mk.ref); if (!f) return '';
    return '<strong>How to spot it</strong><p>' + esc(f.recog) + '</p>' +
      '<p><strong>Where:</strong> ' + esc(f.region) + ' · <strong>Season:</strong> ' + esc(f.season) + '</p>' +
      '<p><strong>Who feeds on it:</strong> ' + esc(f.animals) + '</p>' +
      '<p><strong>Skill:</strong> ' + esc(f.skill) + '</p>' +
      (f.safety ? '<p class="mk-safety"><strong>Caution:</strong> ' + esc(f.safety) + '</p>' : '') +
      '<p class="dim">Not a foraging guide — this pin marks where it grows and what feeds on it, not what is safe to eat.</p>';
  }
  function deleteDetail() {
    if (!detailId) return;
    var id = detailId;
    if (!window.confirm('Delete this marker for good? This cannot be undone.')) return;
    Store.data.markers = data().filter(function (m) { return m.id !== id; });
    Store.save();
    IDB.all('photos').then(function (all) {
      all.filter(function (p) { return p.markerId === id; }).forEach(function (p) { IDB.del('photos', p.id); });
    }).catch(function () {});
    detailId = null; closeSheets(); render();
    toast('Marker deleted.');
  }

  return {
    attach: attach, render: render, onMapClick: onMapClick,
    startPinPlace: startPinPlace, startAreaPlace: startAreaPlace,
    cancelAll: cancelAll, openForm: openForm, openKindPicker: openKindPicker,
    renderKindList: renderKindList, saveForm: saveForm, openDetail: openDetail,
    deleteDetail: deleteDetail, showModel: showModel, data: data,
    famLabel: FAM_LABEL, forageFamLabel: FORAGE_FAM_LABEL,
    getPlaceMarker: function () { return placeMk; },
    clearPlaceMarker: function () { placeMk = null; },
    addPhotoFiles: function (files) { for (var i = 0; i < files.length; i++) formPhotoFiles.push(files[i]); },
    areaPts: function () { return areaPts; },
    finishPin: function () {
      if (!placeMk) return;
      var ll = placeMk.getLatLng();
      cancelAll();
      openForm({ mode: 'pin', latlng: { lat: ll.lat, lng: ll.lng } });
    },
    finishArea: function () {
      if (areaPts.length < 3) return;
      var poly = areaPts.slice();
      cancelAll();
      openForm({ mode: 'area', poly: poly });
    },
    undoArea: function () { areaPts.pop(); drawAreaDraft(); },
    editDetail: function () {
      var mk = data().filter(function (m) { return m.id === detailId; })[0];
      if (!mk) return;
      closeSheets();
      openForm({ mode: mk.poly ? 'area' : 'pin', latlng: { lat: mk.lat, lng: mk.lng }, poly: mk.poly, editId: mk.id, kind: { cat: mk.cat, ref: mk.ref, fam: mk.fam, name: mk.name }, note: mk.note });
    },
    isPlacing: function () { return !!mode; }
  };
})();

/* ---------- Q190 wiring + reference (init) ---------- */
(function () {
  function glyphSpan(inner) { return '<span class="mk-kind-ic">' + '<svg viewBox="0 0 24 24" class="mk-glyph">' + (inner || '') + '</svg></span>'; }
  /* Q205 (2026-10-19): Tanner — the reference lives in the Trapper's Guide
     now (a chapter of the guide, rendered by app.js into the guide sheet),
     with a search bar filtering it. This renderer takes any host + filter;
     app.js owns the chapter shell and the search field, and calls this. */
  function renderReference(host, filter) {
    if (!host) return;
    var q = String(filter || '').trim().toLowerCase();
    function hit() {
      if (!q) return true;
      for (var i = 0; i < arguments.length; i++) {
        if (String(arguments[i] || '').toLowerCase().indexOf(q) !== -1) return true;
      }
      return false;
    }
    var html = '';
    var any = false;
    ['homes', 'ground', 'tree', 'feeding', 'scent'].forEach(function (fam) {
      var rows = '';
      SIGN_CATALOG.forEach(function (e) {
        if (e.fam !== fam) return;
        if (!hit(e.name, e.species, e.desc)) return;
        rows += '<div class="mk-ref-row">' + glyphSpan(SIGN_GLYPHS[e.ref]) + '<div><strong>' + esc(e.name) + '</strong>' +
          '<p>' + esc(e.desc) + '</p><p class="dim">Who makes it: ' + esc(e.species) + ' · Skill: ' + esc(e.skill) + '</p></div></div>';
      });
      if (rows) { html += '<h4 class="mk-ref-fam">' + Markers.famLabel[fam] + '</h4>' + rows; any = true; }
    });
    var frows = '';
    FORAGE_CATALOG.forEach(function (e) {
      if (!hit(e.name, e.recog, e.animals)) return;
      frows += '<div class="mk-ref-row">' + glyphSpan(FORAGE_GLYPHS[e.glyph]) + '<div><strong>' + esc(e.name) + '</strong>' +
        '<p>' + esc(e.recog) + '</p><p class="dim">' + esc(e.region) + ' · ' + esc(e.season) + ' · Skill: ' + esc(e.skill) + '</p>' +
        '<p class="dim">Who feeds on it: ' + esc(e.animals) + '</p>' +
        (e.safety ? '<p class="mk-safety">Caution: ' + esc(e.safety) + '</p>' : '') + '</div></div>';
    });
    if (frows) {
      html += '<h4 class="mk-ref-fam">Forage &amp; finds</h4>' +
        '<p class="dim mk-disclaimer">Not a foraging guide: these pins mark where things grow and what feeds on them — not what is safe to eat. Never eat a wild plant or mushroom based on this app; confirm any identification with a trusted field guide or an expert first.</p>' + frows;
      any = true;
    }
    if (!any) html = '<p class="dim">Nothing in the reference matches that search.</p>';
    if (!q) {
      function srcList(title, arr) {
        if (!arr || !arr.length) return '';
        var h = '<h4 class="mk-ref-fam">' + title + '</h4><ul class="mk-src">';
        arr.forEach(function (s) {
          var m = String(s).match(/https?:\/\/[^\s)]+/);
          var txt = esc(String(s).replace(/https?:\/\/[^\s)]+/, '').replace(/\s+—\s*$/, '').trim());
          h += '<li>' + (m ? '<a href="' + esc(m[0]) + '" target="_blank" rel="noopener">' + txt + '</a>' : txt) + '</li>';
        });
        return h + '</ul>';
      }
      html += srcList('Sources — sign', CATALOG_SOURCES.sign) + srcList('Sources — forage &amp; finds', CATALOG_SOURCES.forage);
    }
    host.innerHTML = html;
  }
  window.renderSignReference = renderReference;
  function syncSettings() {
    var cb = $('settings-markers'); if (!cb || !window.Store || !Store.data) return false;
    cb.checked = Store.data.markersOn !== false;
    var fab = $('btn-mark'); if (fab) fab.style.display = Store.data.markersOn === false ? 'none' : '';
    return true;
  }
  function wire() {
    var fab = $('btn-mark');
    if (fab) fab.onclick = function () { openSheet('sheet-marker-add'); };
    $('btn-mk-add-pin').onclick = function () { closeSheets(); Markers.startPinPlace(); };
    $('btn-mk-add-area').onclick = function () { closeSheets(); Markers.startAreaPlace(); };
    $('btn-mk-place-ok').onclick = function () { Markers.finishPin(); };
    $('btn-mk-place-cancel').onclick = function () { Markers.cancelAll(); };
    $('btn-mk-area-done').onclick = function () { Markers.finishArea(); };
    $('btn-mk-area-undo').onclick = function () { Markers.undoArea(); };
    $('btn-mk-area-cancel').onclick = function () { Markers.cancelAll(); };
    $('mk-kind-choice').onclick = function () { Markers.openKindPicker(); };
    $('mk-kind-search').addEventListener('input', function () { Markers.renderKindList(this.value); });
    $('btn-mk-photo').onclick = function () { $('mk-photo-input').click(); };
    $('mk-photo-input').addEventListener('change', function () {
      if (this.files && this.files.length) { Markers.addPhotoFiles(this.files); toast(this.files.length + (this.files.length === 1 ? ' photo' : ' photos') + ' will attach when you save.'); }
      this.value = '';
    });
    $('btn-mk-save').onclick = function () { Markers.saveForm(); };
    $('btn-mk-edit').onclick = function () { Markers.editDetail(); };
    $('btn-mk-delete').onclick = function () { Markers.deleteDetail(); };
    /* Q205: the marker sheet's Reference & sources opens the Trapper's Guide
       at the Sign & Forage Reference chapter (app.js owns the guide). */
    $('btn-mk-ref').onclick = function () { if (window.openGuideReference) window.openGuideReference(); };
    var cb = $('settings-markers');
    if (cb) cb.addEventListener('change', function () {
      Store.data.markersOn = this.checked; Store.save();
      var f = $('btn-mark'); if (f) f.style.display = this.checked ? '' : 'none';
      Markers.render();
    });
    var tries = 0;
    var iv = setInterval(function () { if (syncSettings() || ++tries > 16) clearInterval(iv); }, 300);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
