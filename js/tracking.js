/* ============ Q192 — Live route tracking (2026-10-18) ============
   Tanner's definition, locked: "the actual tracking that follows your
   green dot" — while running the line, the app follows the live GPS
   dot, lays the traveled path down behind it, and from that path
   produces the route and its mileage. On Stop, the track files as a
   mileage trip on the active line (miles ride the existing trip log +
   CSV export) with the route itself saved on the trip, plus a
   set-coverage readout: which active sets the dot passed, which it
   missed. Honest limit (same class as Q10): the web app records while
   it is open on screen; true background recording comes with the
   store wrapper.
   gk (2026-11-16, Tanner's Boone County field report): when the phone
   slept mid-run, the next fix was joined to the last pre-sleep point
   with one straight line — the track cut diagonally across a section
   corner he never drove, and the diagonal counted toward mileage.
   Two fixes: (1) a recording gap over GAP_MS breaks the track into
   segments — no line is drawn across a gap and no distance is counted
   for it, live or saved; (2) a screen wake lock is held while
   tracking so the phone does not sleep mid-run in the first place. */
var Tracking = (function () {
  var mapRef = null, layer = null, savedLayer = null;
  var watchId = null, state = 'idle'; /* idle | tracking | paused */
  var pts = [], distM = 0, startT = 0, pauseAccum = 0, pauseStart = 0, timer = null;
  var line = null, lastFixAt = 0;
  var GAP_MS = 40000; /* gk: a fix arriving later than this after the previous one starts a new segment */
  var wakeSentinel = null;

  function hav(a, b) {
    var R = 6371000, dLa = (b.lat - a.lat) * Math.PI / 180, dLo = (b.lng - a.lng) * Math.PI / 180;
    var s = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLo / 2) * Math.sin(dLo / 2);
    return 2 * R * Math.asin(Math.sqrt(s));
  }
  function attach(map) {
    mapRef = map;
    layer = L.layerGroup().addTo(map);
    savedLayer = L.layerGroup().addTo(map);
  }
  function fmtElapsed(ms) {
    var s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    return (h > 0 ? h + ':' : '') + (h > 0 && m < 10 ? '0' : '') + m + ':' + (ss < 10 ? '0' : '') + ss;
  }
  function elapsedMs() {
    if (state === 'idle') return 0;
    var now = Date.now();
    var paused = pauseAccum + (state === 'paused' ? now - pauseStart : 0);
    return now - startT - paused;
  }
  function updateBar() {
    var el = $('track-stats');
    /* gk (Tanner's call, 2026-11-16): no elapsed-time ticker — how long a
       run takes swings with the day's catches and a dozen other things,
       so the clock says nothing worth showing. Miles are the record. */
    if (el) el.textContent = (distM / 1609.344).toFixed(1) + ' mi';
    var dot = $('track-dot');
    if (dot) dot.style.opacity = state === 'paused' ? '.35' : (Math.floor(Date.now() / 600) % 2 ? '1' : '.45');
  }
  /* gk: split a point list into segments at gap flags (p.g). A point
     with .g starts a new segment; nothing is ever drawn or measured
     across the break. */
  function segments(list) {
    var segs = [], cur = [];
    (list || []).forEach(function (p) {
      if (p.g && cur.length) { segs.push(cur); cur = []; }
      cur.push(p);
    });
    if (cur.length) segs.push(cur);
    return segs;
  }
  function draw() {
    if (!layer) return;
    layer.clearLayers();
    segments(pts).forEach(function (seg) {
      if (seg.length > 1) {
        L.polyline(seg.map(function (p) { return [p.lat, p.lng]; }), { color: '#e5484d', weight: 4, opacity: 0.85 }).addTo(layer);
      }
    });
  }
  function onPos(pos) {
    if (state !== 'tracking') return;
    var c = pos.coords;
    if (!c || (c.accuracy && c.accuracy > 35)) return;
    var p = { lat: c.latitude, lng: c.longitude, t: Date.now() };
    var last = pts[pts.length - 1];
    if (last) {
      var d = hav(last, p), dt = (p.t - last.t) / 1000;
      if (d < 8 && dt < 20) return;              /* standing still — GPS jitter is not travel */
      if (dt > 0 && d / dt > 24 && dt < 30) return; /* teleport jump, not a road */
      if (dt * 1000 > GAP_MS) { p.g = 1; }       /* gk: the recorder was asleep/away — break here, count nothing across the gap (a long Pause breaks the same way: paused travel was never recorded) */
      else distM += d;
    }
    pts.push(p); lastFixAt = p.t;
    draw(); updateBar();
  }
  function onErr() { /* a dropped fix is not a stopped track; the watch retries on its own */ }
  /* gk: hold the screen awake while a track runs, so iOS does not
     suspend the app mid-run. Best-effort: unsupported browsers skip it,
     and iOS drops the lock when the app leaves the screen — it is
     re-acquired on return (visibilitychange below). The gap break
     covers whatever still gets through. */
  function acquireWake() {
    if (!('wakeLock' in navigator) || wakeSentinel) return;
    try {
      navigator.wakeLock.request('screen').then(function (s) {
        wakeSentinel = s;
        s.addEventListener('release', function () { wakeSentinel = null; });
      }).catch(function () { /* not visible / not allowed — the gap break covers it */ });
    } catch (e) {}
  }
  function releaseWake() {
    if (wakeSentinel) { try { wakeSentinel.release(); } catch (e) {} wakeSentinel = null; }
  }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && state === 'tracking') acquireWake();
  });
  function start() {
    if (state !== 'idle') return;
    if (!navigator.geolocation) { toast('This phone has no GPS available to the app.'); return; }
    clearSaved();
    pts = []; distM = 0; startT = Date.now(); pauseAccum = 0;
    state = 'tracking';
    acquireWake();
    watchId = navigator.geolocation.watchPosition(onPos, onErr, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
    timer = setInterval(updateBar, 500);
    $('track-bar').classList.add('show');
    syncFab();
    $('btn-track-pause').textContent = 'Pause';
    updateBar();
    toast('Tracking — your route and mileage are recording.');
  }
  function pauseResume() {
    if (state === 'tracking') {
      state = 'paused'; pauseStart = Date.now();
      $('btn-track-pause').textContent = 'Resume';
    } else if (state === 'paused') {
      state = 'tracking'; pauseAccum += Date.now() - pauseStart;
      $('btn-track-pause').textContent = 'Pause';
    }
    updateBar();
  }
  function coverage() {
    var passed = [], missed = [];
    if (typeof activeSets !== 'function') return { passed: passed, missed: missed };
    activeSets().forEach(function (s) {
      if (normStatus(s.status) !== 'active') return;
      var best = Infinity;
      for (var i = 0; i < pts.length; i++) { var d = hav(pts[i], s); if (d < best) best = d; }
      (best <= 40 ? passed : missed).push(s.name || 'Unnamed set');
    });
    return { passed: passed, missed: missed };
  }
  var pending = null;
  function stop() {
    if (state === 'idle') return;
    releaseWake();
    if (watchId !== null) { try { navigator.geolocation.clearWatch(watchId); } catch (e) {} watchId = null; }
    if (timer) { clearInterval(timer); timer = null; }
    state = 'idle';
    $('track-bar').classList.remove('show');
    syncFab();
    var cov = coverage();
    var miles = distM / 1609.344;
    pending = { miles: miles, elapsed: elapsedMs(), cov: cov, pts: pts.slice() };
    $('track-done-stats').innerHTML = '<strong>' + miles.toFixed(1) + ' mi</strong> on the line';
    $('track-done-cov').innerHTML = cov.passed.length + ' of ' + (cov.passed.length + cov.missed.length) + ' active sets passed' +
      (cov.missed.length ? '<br><span class="mk-safety">Missed: ' + cov.missed.map(function (n) { return esc(n); }).join(', ') + '</span>' : '<br>Every active set on this line got a visit.');
    openSheet('sheet-track-done');
  }
  function discard() { pending = null; if (layer) layer.clearLayers(); clearSaved(); closeSheets(); }
  function downsampleSeg(arr, max) {
    if (arr.length <= max) return arr.map(function (p) { return [Math.round(p.lat * 1e5) / 1e5, Math.round(p.lng * 1e5) / 1e5]; });
    var step = arr.length / max, out = [];
    for (var i = 0; i < arr.length; i += step) { var p = arr[Math.floor(i)]; out.push([Math.round(p.lat * 1e5) / 1e5, Math.round(p.lng * 1e5) / 1e5]); }
    return out;
  }
  /* gk: downsample per segment so a saved route keeps its gap breaks.
     One segment saves in the original flat shape ([[lat,lng],...]);
     several save as an array of those arrays. drawSaved reads both. */
  function downsample(arr, max) {
    var segs = segments(arr);
    if (segs.length <= 1) return downsampleSeg(arr, max);
    var out = [];
    segs.forEach(function (seg) {
      out.push(downsampleSeg(seg, Math.max(2, Math.round(max * seg.length / Math.max(1, arr.length)))));
    });
    return out;
  }
  function saveToMileage() {
    if (!pending) return;
    if (!Array.isArray(Store.data.trips)) Store.data.trips = [];
    var lineId = (typeof activeLine === 'function' && activeLine() || {}).id || null;
    var cov = pending.cov;
    Store.data.trips.push({
      id: uid('trip'), lineId: lineId, createdAt: Date.now(), date: todayISO(),
      source: 'gps-track', miles: Math.round(pending.miles * 10) / 10, track: downsample(pending.pts, 400),
      notes: 'GPS track · ' + fmtElapsed(pending.elapsed) + ' · passed ' + cov.passed.length + ' of ' + (cov.passed.length + cov.missed.length) + ' active sets'
    });
    Store.save();
    pending = null;
    if (layer) layer.clearLayers();
    closeSheets();
    toast('Route filed in the mileage log.');
  }
  function drawSaved(track) {
    if (!savedLayer || !track || !track.length) return;
    savedLayer.clearLayers();
    /* gk: a saved track is either the flat shape ([[lat,lng],...]) or,
       when the run had recording gaps, an array of segment arrays. */
    var isSegs = Array.isArray(track[0]) && track[0].length > 0 && Array.isArray(track[0][0]);
    var lines = isSegs ? track : [track], all = [];
    lines.forEach(function (seg) {
      if (seg && seg.length > 1) L.polyline(seg, { color: '#e5484d', weight: 4, opacity: 0.85 }).addTo(savedLayer);
      (seg || []).forEach(function (p) { all.push(p); });
    });
    syncRouteBar();
    if (mapRef && all.length) mapRef.fitBounds(L.latLngBounds(all.map(function (p) { return L.latLng(p[0], p[1]); })), { padding: [30, 30] });
  }
  /* Q200 (2026-10-18): Tanner — a drawn route had NO way off the map. The
     route bar's Hide button, a fresh track, and a discard all clear it. */
  function clearSaved() {
    if (savedLayer) savedLayer.clearLayers();
    syncRouteBar();
  }
  /* Q201: the route bar is the standing home of a drawn route AND of an
     unsaved just-tracked route: it says which state things are in, offers
     Save while a route is unsaved, and Hide always. */
  function syncRouteBar() {
    var bar = $('route-bar'); if (!bar) return;
    var drawn = !!(savedLayer && savedLayer.getLayers().length);
    bar.classList.toggle('show', drawn || !!pending);
    var sv = $('btn-route-save'); if (sv) sv.style.display = pending ? '' : 'none';
    var lb = $('route-bar-label'); if (lb) lb.textContent = pending ? 'Route — not saved yet' : 'Route on the map';
  }
  /* Q201: Hide while a route is still unsaved asks first — hiding is the
     one tap that could throw the route away. */
  function hideRoute() {
    if (pending) {
      if (!window.confirm('This route has not been saved to the mileage log. Hide it without saving?')) return;
      pending = null;
      if (layer) layer.clearLayers();
    }
    clearSaved();
  }
  /* Q201: called whenever sheets close (app.js closeSheets). If the
     track-finish sheet went away with the route unsaved — Show button, X,
     or scrim — the route draws itself and the bar carries the Save button,
     so the choice is never stranded behind a closed sheet. Draws only
     when nothing is drawn yet, so later sheet closes never yank the map. */
  function rescuePending() {
    if (!pending) return;
    if (savedLayer && !savedLayer.getLayers().length && pending.pts && pending.pts.length) {
      drawSaved(downsample(pending.pts, 400));
    }
    syncRouteBar();
  }
  function showLastRoute() {
    if (!pending || !pending.pts.length) { toast('No route recorded this time.'); return; }
    closeSheets();
    drawSaved(downsample(pending.pts, 400));
    toast('Your route is on the map.');
  }
  /* Q206 (2026-10-19): Tanner — the Track fab is back on the map (Q196 had
     moved it into Paperwork), shown only while Route & mileage tracking is
     toggled on in Settings, and hidden while a track is running (the track
     bar owns the screen then). app.js calls syncFab when the toggle flips. */
  function syncFab() {
    var fab = $('btn-track');
    if (!fab) return;
    var off = window.Store && Store.data && Store.data.mileageOn === false;
    fab.style.display = (off || state !== 'idle') ? 'none' : '';
  }
  function wire() {
    var fab = $('btn-track');
    if (fab) fab.onclick = function () {
      if (Store.data && Store.data.mileageOn === false) { toast('Mileage tracking is off — turn it on in Settings → Feature Toggles.'); return; }
      start();
    };
    syncFab();
    var p = $('btn-track-pause'); if (p) p.onclick = pauseResume;
    var s = $('btn-track-stop'); if (s) s.onclick = stop;
    var sv = $('btn-track-save'); if (sv) sv.onclick = saveToMileage;
    var sh = $('btn-track-show'); if (sh) sh.onclick = showLastRoute;
    var d = $('btn-track-discard'); if (d) d.onclick = discard;
    var h = $('btn-route-hide'); if (h) h.onclick = hideRoute;
    var rs = $('btn-route-save'); if (rs) rs.onclick = function () { saveToMileage(); syncRouteBar(); };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
  return { attach: attach, start: start, syncFab: syncFab, active: function () { return state !== 'idle'; }, drawSaved: drawSaved, clearSaved: clearSaved, rescuePending: rescuePending, _test: { hav: hav, start: start, onPos: onPos, stop: stop, state: function () { return state; }, pts: function () { return pts; }, miles: function () { return distM / 1609.344; }, segs: function () { return segments(pts).length; }, downsample: downsample, wake: function () { return !!wakeSentinel; } } };
})();
