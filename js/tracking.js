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
  var line = null, lastFixAt = 0, lastAt = 0; /* lastAt: arrival clock of the last accepted fix (go) */
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
    fixLayer = L.layerGroup().addTo(map);
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
  /* gl (Tanner, 2026-11-16): short runs read in FEET — a man walking a
     line covers hundreds of feet, and tenths of a mile tell him nothing.
     At a mile and beyond it reads in miles. The saved trip always files
     in miles; this only changes what the bar and finish sheet show. */
  function fmtDist(m) {
    if (m < 1609.344) return Math.round(m * 3.28084) + ' ft';
    return (m / 1609.344).toFixed(1) + ' mi';
  }
  function updateBar() {
    var el = $('track-stats');
    /* gk (Tanner's call, 2026-11-16): no elapsed-time ticker — how long a
       run takes swings with the day's catches and a dozen other things,
       so the clock says nothing worth showing. Miles are the record. */
    if (el) el.textContent = fmtDist(distM);
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
    var now = Date.now();
    /* go (2026-11-17, Tanner's field failure of the gk break): a fix
       carries its own time (pos.timestamp), and iOS does not always hand
       fixes over when they happen — on wake it can deliver a cached
       pre-sleep position, and a stuck daemon can keep re-sending one
       frozen fix. Stamping every point with the ARRIVAL time made a
       minutes-long sleep look like a run of fresh <40 s steps, so the
       gk gap test (which measures from the last accepted point) never
       fired and the wake fix joined across the fields. Two defences:
       (1) the point is stamped with the fix's own time when that time
       is sane, and the gap test runs on BOTH clocks — fix time and
       arrival time (lastAt); either one can call the gap.
       (2) the old teleport test switched off at dt 30 while the gap
       only started at dt 40, leaving a 30–40 s window where a far fix
       was neither rejected nor broken, just joined and counted. A jump
       too fast to be travel is now a break whenever it is not a lone
       spike: spikes (dt < 30) are still dropped whole, but a sustained
       relocation starts a new segment instead of drawing the diagonal. */
    var ft = (typeof pos.timestamp === 'number' && isFinite(pos.timestamp) &&
              pos.timestamp <= now + 5000 && pos.timestamp >= now - 86400000) ? pos.timestamp : now;
    var p = { lat: c.latitude, lng: c.longitude, t: ft };
    var last = pts[pts.length - 1];
    if (last) {
      var d = hav(last, p), dt = (p.t - last.t) / 1000, adt = (now - lastAt) / 1000;
      if (d < 8 && dt < 20 && adt < 20) return;   /* standing still — GPS jitter is not travel */
      var gap = (dt * 1000 > GAP_MS) || (adt * 1000 > GAP_MS);
      if (dt > 0 && d / dt > 24 && !gap) {
        if (dt < 30) return;                     /* teleport spike, not a road — drop it */
        p.g = 1;                                 /* sustained relocation — break, never join */
      } else if (gap) { p.g = 1; }               /* gk: the recorder was asleep/away — break here, count nothing across the gap (a long Pause breaks the same way: paused travel was never recorded) */
      if (!p.g) distM += d;
    }
    pts.push(p); lastFixAt = p.t; lastAt = now;
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
    endFix();
    clearSaved();
    pts = []; distM = 0; startT = Date.now(); pauseAccum = 0; lastAt = 0;
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
    $('track-done-stats').innerHTML = '<strong>' + fmtDist(distM) + '</strong> on the line';
    $('track-done-cov').innerHTML = cov.passed.length + ' of ' + (cov.passed.length + cov.missed.length) + ' active sets passed' +
      (cov.missed.length ? '<br><span class="mk-safety">Missed: ' + cov.missed.map(function (n) { return esc(n); }).join(', ') + '</span>' : '<br>Every active set on this line got a visit.');
    openSheet('sheet-track-done');
  }
  function discard() { pending = null; if (layer) layer.clearLayers(); endFix(); clearSaved(); closeSheets(); }
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
      /* gl: no elapsed stamp on the trip note — the timer stalls whenever
         the phone sleeps, so saved trips were landing stamped 0:00. The
         note is the coverage record, nothing it can't stand behind. */
      notes: 'Passed ' + cov.passed.length + ' of ' + (cov.passed.length + cov.missed.length) + ' active sets'
    });
    Store.save();
    pending = null;
    if (layer) layer.clearLayers();
    closeSheets();
    toast('Route filed in the mileage log.');
  }
  /* gr (2026-11-18, Tanner): who the drawn saved route belongs to.
     When app.js draws a saved trip from the Paperwork readout (Show on
     map, or the landing after a Fix route Done), it passes a context
     with fix/back callbacks and the route bar offers Fix route for
     that same trip plus Back to the readout — checking a repair no
     longer means digging back through Paperwork to find the trip.
     Draws without a context (an unsaved just-tracked route) clear it,
     so the two buttons only ever ride a saved trip's route. */
  var savedCtx = null;
  function drawSaved(track, ctx) {
    if (!savedLayer || !track || !track.length) return;
    savedCtx = ctx || null;
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
    savedCtx = null;
    if (savedLayer) savedLayer.clearLayers();
    syncRouteBar();
  }
  /* go (2026-11-17): Fix route — repair a SAVED trip whose line jumped
     (a sleep diagonal recorded before the intake fix, or through any
     path it could not see). The stored points go on the map as tappable
     dots; Tanner taps the last good point before the bad stretch and
     the first good point after it, the bar says what the cut removes,
     and Apply drops the points between and leaves a segment BREAK
     between the two kept points — the same segment model as live
     tracking, so nothing is drawn or counted across it. Miles are
     recomputed from the stored geometry.
     gp (2026-11-17, Tanner): two changes. (1) Every point is now a
     DRAGGABLE handle — grab a point and drag it to where it should be
     (his art-app model: pull the shape right instead of only cutting).
     Dragging redraws the line and recomputes miles live, and a point
     stays in its own segment — a drag never crosses a break. Cut stays
     for stretches that never happened at all (a tower-fix spike, an
     empty sleep gap): nothing there to drag. (2) Deferred save —
     entering fix mode takes a WORKING COPY; drags and cuts touch only
     that copy. Done commits it through the caller's callback (which
     writes the trip and saves); Cancel throws the whole edit away and
     the stored trip is never touched.
     gq (2026-11-18, Tanner's field case on gp): the gap logic can
     strand points — a lone single-point segment sitting as a bare dot
     mid-route, a trip's tail broken off unconnected. JOIN is the third
     verb: tap a point on each side of ONE break and the bar offers
     Join instead of Cut — the boundary comes out of the working copy,
     the line draws through, and the connecting leg counts again.
     More than one break between the taps is a hint, not a join: one
     break at a time, so no leg is ever restored sight unseen.
     gr (2026-11-18, Tanner): Done used to leave a blank map — the
     fix layer cleared and nothing was drawn, so the repaired route
     vanished and he had to dig back through Paperwork to look at it.
     The caller's callback now draws the saved trip (drawSaved with
     the trip's context, above), so Done lands on the fixed route
     itself with Fix route and Back riding the route bar. Cancel is
     unchanged: discard and out, nothing drawn. */
  var fixLayer = null, fixPts = null, fixSel = null, fixCb = null;
  var fixMks = null, fixLines = null, fixDragEndAt = 0;
  function fixFlatten(track) {
    var out = [];
    if (!track || !track.length) return out;
    var isSegs = Array.isArray(track[0]) && track[0].length > 0 && Array.isArray(track[0][0]);
    var lines = isSegs ? track : [track];
    lines.forEach(function (seg, si) {
      (seg || []).forEach(function (p) { out.push({ lat: p[0], lng: p[1], seg: si }); });
    });
    return out;
  }
  function fixSegs(list) {
    var segs = [], cur = [], curSeg = null;
    (list || []).forEach(function (p) {
      if (curSeg === null || p.seg !== curSeg) { if (cur.length) segs.push(cur); cur = []; curSeg = p.seg; }
      cur.push(p);
    });
    if (cur.length) segs.push(cur);
    return segs;
  }
  function fixShape(list) {
    /* back to the stored shape drawSaved reads: flat for one segment,
       an array of segment arrays when the route has breaks */
    var segs = fixSegs(list).map(function (seg) {
      return seg.map(function (p) { return [p.lat, p.lng]; });
    });
    return segs.length <= 1 ? (segs[0] || []) : segs;
  }
  function fixMiles(list) {
    var m = 0;
    for (var i = 1; i < (list || []).length; i++) {
      if (list[i].seg === list[i - 1].seg) m += hav(list[i - 1], list[i]);
    }
    return Math.round((m / 1609.344) * 10) / 10;
  }
  function fixStretch() {
    /* what an Apply removes: the points strictly between the two taps,
       and the within-segment path length from the first tap to the
       second — after the cut that length is gone and the break between
       the kept points counts nothing. */
    var a = fixSel.a, b = fixSel.b, m = 0;
    for (var i = a + 1; i <= b; i++) {
      if (fixPts[i].seg === fixPts[i - 1].seg) m += hav(fixPts[i - 1], fixPts[i]);
    }
    return { n: b - a - 1, m: m };
  }
  /* gq: the leg a Join restores — the boundary pair between the two
     tapped segments (last point of the earlier segment, first point
     of the next). Joining draws and counts exactly that leg, no more:
     whatever lies inside each tapped segment was already counted. */
  function fixJoinLeg() {
    var a = fixSel.a, b = fixSel.b;
    for (var i = a; i < b; i++) {
      if (fixPts[i + 1].seg !== fixPts[i].seg) return hav(fixPts[i], fixPts[i + 1]);
    }
    return 0;
  }
  /* gp: a fix point is a divIcon marker — a ~30px touch handle with a
     ~14px visible dot (red, or gold + larger when picked for a cut).
     circleMarkers cannot be dragged; markers can, by touch or mouse,
     and Leaflet keeps the map from panning while a handle is dragged. */
  function fixIcon(chosen) {
    return L.divIcon({
      className: 'fix-pt' + (chosen ? ' fix-pt-sel' : ''),
      html: '<i></i>', iconSize: [30, 30], iconAnchor: [15, 15]
    });
  }
  /* gp: polylines live in their own group so a drag can redraw ONLY the
     lines — rebuilding the markers mid-drag would kill the drag. */
  function fixDrawLines() {
    if (!fixLines) return;
    fixLines.clearLayers();
    if (!fixPts) return;
    fixSegs(fixPts).forEach(function (seg) {
      if (seg.length > 1) {
        L.polyline(seg.map(function (p) { return [p.lat, p.lng]; }), { color: '#e5484d', weight: 4, opacity: 0.5 }).addTo(fixLines);
      }
    });
    if (fixSel && fixSel.a !== null && fixSel.b !== null) {
      var stretch = fixPts.slice(fixSel.a, fixSel.b + 1);
      L.polyline(stretch.map(function (p) { return [p.lat, p.lng]; }), { color: '#e7c945', weight: 6, opacity: 0.95 }).addTo(fixLines);
    }
  }
  function fixDraw() {
    if (!fixLayer) return;
    fixLayer.clearLayers();
    fixMks = [];
    if (!fixPts) { fixLines = null; return; }
    fixLines = L.layerGroup().addTo(fixLayer);
    fixDrawLines();
    fixPts.forEach(function (p, i) {
      var chosen = !!fixSel && (i === fixSel.a || i === fixSel.b);
      var mk = L.marker([p.lat, p.lng], {
        icon: fixIcon(chosen), draggable: true, autoPan: false, keyboard: false
      });
      /* a drag ends with a click event on some browsers — that click is
         the drag finishing, not a cut tap, so it is ignored. */
      mk.on('click', function () {
        if (Date.now() - fixDragEndAt < 250) return;
        fixTap(i);
      });
      mk.on('drag', function () {
        var ll = mk.getLatLng();
        p.lat = ll.lat; p.lng = ll.lng;
        fixDrawLines(); fixBar();
      });
      mk.on('dragend', function () {
        fixDragEndAt = Date.now();
        var ll = mk.getLatLng();
        p.lat = ll.lat; p.lng = ll.lng;
        fixDrawLines(); fixBar();
      });
      mk.addTo(fixLayer);
      fixMks.push(mk);
    });
  }
  function fixBar() {
    var bar = $('fix-bar'), lb = $('fix-bar-label'), ap = $('btn-fix-apply');
    if (!bar || !lb || !ap) return;
    if (!fixPts) { bar.classList.remove('show'); return; }
    bar.classList.add('show');
    /* gp: the working trip's miles ride the bar and move live as points
       are dragged or stretches are cut — same format as the Paperwork
       readout (fmtMiles: tenths of a mile). */
    var mi = $('fix-bar-miles');
    if (mi) mi.textContent = 'Trip: ' + fmtMiles(fixMiles(fixPts));
    if (!fixSel || fixSel.a === null) {
      lb.textContent = 'Fix route — drag a point to move it, or tap two points to cut between them or join across a break.';
      ap.style.display = 'none';
    } else if (fixSel.b === null) {
      lb.textContent = 'Now tap the second point — the first good point past the bad stretch, or a point across the break to join.';
      ap.style.display = 'none';
    } else if (fixPts[fixSel.b].seg === fixPts[fixSel.a].seg) {
      var st = fixStretch();
      lb.textContent = st.n > 0
        ? 'Cut ' + st.n + ' point' + (st.n === 1 ? '' : 's') + ' — ' + fmtDist(st.m) + ' of route comes out.'
        : 'Join these two points with a break — ' + fmtDist(st.m) + ' of route comes out.';
      ap.textContent = 'Cut it';
      ap.style.display = '';
    } else if (fixPts[fixSel.b].seg === fixPts[fixSel.a].seg + 1) {
      /* gq: exactly one break between the taps — the offer is Join */
      lb.textContent = 'Join these two stretches — ' + fmtDist(fixJoinLeg()) + ' of route comes back in.';
      ap.textContent = 'Join';
      ap.style.display = '';
    } else {
      /* gq: more than one break between the taps — a hint, no action */
      lb.textContent = 'Those have more than one break between them — join one break at a time.';
      ap.style.display = 'none';
    }
  }
  function fixTap(i) {
    if (!fixPts || i < 0 || i >= fixPts.length) return;
    if (!fixSel || fixSel.a === null) { fixSel = { a: i, b: null }; }
    else if (fixSel.b === null) {
      if (i === fixSel.a) { fixSel = { a: null, b: null }; }
      else if (i < fixSel.a) { fixSel = { a: i, b: fixSel.a }; }
      else { fixSel.b = i; }
    } else { fixSel = { a: i, b: null }; }
    fixDraw(); fixBar();
  }
  function fixApply() {
    if (!fixPts || !fixSel || fixSel.a === null || fixSel.b === null) return;
    /* gq: the one button serves both verbs — the segment relationship
       of the two taps decides. Across exactly one break it joins;
       across more than one it does nothing (the bar already hinted). */
    if (fixPts[fixSel.b].seg === fixPts[fixSel.a].seg + 1) { fixJoin(); return; }
    if (fixPts[fixSel.b].seg !== fixPts[fixSel.a].seg) return;
    var a = fixSel.a, b = fixSel.b, sameSeg = fixPts[a].seg === fixPts[b].seg, cutSeg = fixPts[a].seg;
    var kept = [];
    fixPts.forEach(function (p, i) { if (i <= a || i >= b) kept.push(p); });
    if (sameSeg) {
      /* the second kept point opens a new segment; everything from it
         onward in its old segment (and later segments, harmlessly)
         renumbers with it, so earlier breaks survive untouched */
      kept.forEach(function (p, i) { if (i > a && p.seg >= cutSeg) p.seg += 1; });
    }
    fixPts = kept;
    fixSel = { a: null, b: null };
    /* gp: the cut lands in the working copy only — nothing is written
       to the trip until Done (see fixDone). */
    fixDraw(); fixBar();
    toast('Cut made in the edit — Done saves it, Cancel throws it away.');
  }
  /* gq: Join — take the one boundary break between the two tapped
     segments out of the working copy. The later segment folds into
     the earlier one and every segment after it renumbers down, so
     exactly one boundary disappears and later breaks survive. The
     stranded-dot case is this same move twice: join the dot to the
     stretch before it, then to the stretch after it. Like drags and
     cuts, a join lives in the working copy only until Done. */
  function fixJoin() {
    if (!fixPts || !fixSel || fixSel.a === null || fixSel.b === null) return;
    var sA = fixPts[fixSel.a].seg, sB = fixPts[fixSel.b].seg;
    if (sB !== sA + 1) return;
    fixPts.forEach(function (p) {
      if (p.seg === sB) p.seg = sA;
      else if (p.seg > sB) p.seg -= 1;
    });
    fixSel = { a: null, b: null };
    fixDraw(); fixBar();
    toast('Joined in the edit — Done saves it, Cancel throws it away.');
  }
  /* gp: Done is the only door out that saves — it hands the working
     copy to the caller's callback (which writes the trip + Store.save)
     exactly once, with every drag and cut of the session in it. */
  function fixDone() {
    if (!fixPts) { endFix(); return; }
    var res = { track: fixShape(fixPts), miles: fixMiles(fixPts) };
    var cb = fixCb;
    endFix();
    if (cb) cb(res);
  }
  /* gp: Cancel discards the working copy whole — drags and cuts alike —
     and leaves fix mode with the stored trip untouched. */
  function fixCancel() {
    if (!fixPts) return;
    endFix();
    toast('Edit thrown away — the trip is unchanged.');
  }
  function startFix(track, cb) {
    if (!fixLayer) return;
    clearSaved();
    fixPts = fixFlatten(track);
    fixSel = { a: null, b: null };
    fixCb = cb || null;
    fixDraw(); fixBar();
    if (mapRef && fixPts.length) {
      mapRef.fitBounds(L.latLngBounds(fixPts.map(function (p) { return L.latLng(p.lat, p.lng); })), { padding: [30, 30] });
    }
  }
  function endFix() {
    fixPts = null; fixSel = null; fixCb = null; fixMks = null; fixLines = null;
    if (fixLayer) fixLayer.clearLayers();
    fixBar();
  }
  /* Q201: the route bar is the standing home of a drawn route AND of an
     unsaved just-tracked route: it says which state things are in, offers
     Save while a route is unsaved, and Hide always. */
  function syncRouteBar() {
    var bar = $('route-bar'); if (!bar) return;
    var drawn = !!(savedLayer && savedLayer.getLayers().length);
    bar.classList.toggle('show', drawn || !!pending);
    var sv = $('btn-route-save'); if (sv) sv.style.display = pending ? '' : 'none';
    /* gr: Fix route + Back ride the bar only while a saved trip's
       route is drawn with its context (see drawSaved) — never on an
       unsaved route, whose bar carries Save instead. */
    var tripDrawn = drawn && !!savedCtx && !pending;
    var rf = $('btn-route-fix'); if (rf) rf.style.display = tripDrawn ? '' : 'none';
    var rb = $('btn-route-back'); if (rb) rb.style.display = tripDrawn ? '' : 'none';
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
    var rf2 = $('btn-route-fix'); if (rf2) rf2.onclick = function () { if (savedCtx && savedCtx.fix) savedCtx.fix(); };
    var rb2 = $('btn-route-back'); if (rb2) rb2.onclick = function () { if (savedCtx && savedCtx.back) savedCtx.back(); };
    var fa = $('btn-fix-apply'); if (fa) fa.onclick = fixApply;
    var fd = $('btn-fix-done'); if (fd) fd.onclick = fixDone;
    var fc = $('btn-fix-cancel'); if (fc) fc.onclick = fixCancel;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
  return { attach: attach, start: start, syncFab: syncFab, active: function () { return state !== 'idle'; }, drawSaved: drawSaved, clearSaved: clearSaved, rescuePending: rescuePending, startFix: startFix, endFix: endFix, _test: { hav: hav, start: start, onPos: onPos, stop: stop, state: function () { return state; }, pts: function () { return pts; }, miles: function () { return distM / 1609.344; }, segs: function () { return segments(pts).length; }, downsample: downsample, wake: function () { return !!wakeSentinel; }, fixTap: fixTap, fixApply: fixApply, fixJoin: fixJoin, fixDone: fixDone, fixCancel: fixCancel, fixMarkers: function () { return fixMks; }, fixPoints: function () { return fixPts ? fixPts.map(function (p) { return { lat: p.lat, lng: p.lng, seg: p.seg }; }) : null; }, fixState: function () { return { active: !!fixPts, n: fixPts ? fixPts.length : 0, sel: fixSel, shape: fixPts ? fixShape(fixPts) : null, miles: fixPts ? fixMiles(fixPts) : null }; }, routeBar: function () { var bar = $('route-bar'), fx = $('btn-route-fix'), bk = $('btn-route-back'); return { shown: !!(bar && bar.classList.contains('show')), fix: !!(fx && fx.style.display !== 'none'), back: !!(bk && bk.style.display !== 'none'), ctx: !!savedCtx, drawn: savedLayer ? savedLayer.getLayers().length : 0 }; } } };
})();
