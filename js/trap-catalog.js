/* Opossum Foot — trap manufacturer catalog (Q39).
   Manufacturer-first trap picker data. Researched 2026-09-28/29 from
   manufacturer sites, dealer catalogs (incl. a full Funke Trap Tags sweep),
   and Fur Institute of Canada certification lists.
   Certification documents what is certified, not what is currently
   manufactured — retail/manufacturer evidence decides "currently sold".
   Legacy makers stay in the picker (trappers log traps they own), flagged
   legacy: true.
   To add a maker: append an entry in MAKER_ORDER below and a types map in
   TRAP_MAKERS. Catalog type names must exist in MAKER_TYPE_MAP. */
'use strict';

/* Catalog trap-type name -> { t: app trapType value, spring: implied spring or '' } */
var MAKER_TYPE_MAP = {
  'Coil-spring foothold': { t: 'Foothold', spring: 'Coil-spring' },
  'Coil-spring foothold — Pro Series': { t: 'Foothold', spring: 'Coil-spring' },
  'Longspring foothold': { t: 'Foothold', spring: 'Longspring' },
  'Bodygrip': { t: 'Bodygrip / Conibear', spring: '' },
  'Bear trap': { t: 'Bear trap', spring: '' },
  'Snare': { t: 'Snare', spring: '' },
  'Cable restraint': { t: 'Snare', spring: '' },
  'Foot snare': { t: 'Snare', spring: '' },
  'Cage': { t: 'Cage live trap', spring: '' },
  'Colony': { t: 'Colony trap', spring: '' },
  'Dog-proof': { t: 'Dog-proof', spring: '' }
};

/* Value used for "no manufacturer picked" — falls back to today's full
   unfiltered type lists and generic detail fields. */
var MIXED_MAKER_LABEL = 'Not sure / mixed brands';

/* Custom-model select sentinel inside the size/model dropdown. */
var MODEL_CUSTOM = '__custom';

var TRAP_MAKERS = {
  'Minnesota Brand': {
    legacy: false,
    types: {
      'Coil-spring foothold': ['MB-450 (FH)', 'MB-450 (OS)', 'MB-450 (FOX)',
        'MB-550 (RC)', 'MB-550 (CL)', 'MB-550 (RJ)',
        'MB-650 (C)', 'MB-650 (OS)', 'MB-650 (OL)', 'MB-650 (1L)',
        'MB-750 (Beaver)', 'MB-750 (OS Beaver)'],
      'Snare': ['Micro Lock #3 — 60", 3/32" 7x7', '#7 w/ cam lock — 84", 3/32" 7x7', '#17 Wolf/Hog']
    }
  },
  'Duke': {
    legacy: false,
    types: {
      'Coil-spring foothold': ['#1', '#1 DJ double-jaw', '#1½', '#1½ DJ', '#1½ padded',
        '#1¾', '#1¾ OS', '#1¾ 4X', '#1¾ OS 4X4',
        '#2', '#2 OS', '#2 SJ', '#2 SJ OS', '#2 SJ 4X4', '#2 SJ OS 4X4', '#2 dogless 4-coil',
        '#3', '#3 OS', '#3 padded', '#4 CS 4X', '#4 OS 4X', '#4 padded'],
      'Coil-spring foothold — Pro Series': ['450 closed jaw', '450-OS', '450-FJ', '550-OS',
        '650-OS', '850 closed jaw', '850-OS', '850-FJ'],
      'Longspring foothold': ['#0', '#1', '#1 DJ', '#1 Guard Trap', '#11', '#11 DJ', '#5 Beaver Special'],
      'Bear trap': ['#15', '#16'],
      'Bodygrip': ['110', '110 Magnum', '120', '120 Super Mag', '155', '160', '160 Super Mag',
        '220', '220 Super Mag', '280', '330', '330 Magnum', '330 Super Mag'],
      'Cage': ['Standard single door', 'Heavy Duty single door'],
      'Dog-proof': ['DP Coon Trap']
    }
  },
  'Bridger': {
    legacy: false,
    types: {
      'Coil-spring foothold': ['#1', '#1½', '#1½ Special', '#1.65', '#1¾',
        '#2 2-coil', '#2 4-coil', '#2 dogless 2-coil', '#2 dogless 4-coil', '#2 dogless Modified',
        '#3 2-coil', '#3 4-coil', '#3 dogless 2-coil', '#3 dogless 4-coil', '#3 dogless Modified',
        '#5', '#5 dogless', '#5 Alaskan Modified', '#1½ muskrat',
        'Brawn #9', 'Alaskan #9'],
      'Longspring foothold': ['#1', '#11', '#4', '#5', '#5 double'],
      'Bodygrip': ['110', '110 Magnum', '120', '120 Magnum', '150', '155', '159', '160', '160 Magnum',
        '220', '220 Magnum', '280', '280 Magnum', '330', '330 Magnum'],
      'Dog-proof': ['T3']
    }
  },
  'Bélisle': {
    legacy: false,
    types: {
      'Bodygrip': ['Super X 110', 'Super X 120', 'Super X 160', 'Super X 220', 'Super X 280', 'Super X 330',
        'Classique 120', 'Classique 220', 'Classique 330'],
      'Cable restraint': ['Footsnare #6', 'Footsnare #8', 'Sélectif']
    }
  },
  'Sauvageau': {
    legacy: false,
    types: {
      'Bodygrip': ['2001-5', '2001-6', '2001-7', '2001-8', '2001-11', '2001-12', '2001-14',
        'C120 Reverse Bend', 'C120 Magnum', '1000-11F']
    }
  },
  'LDL': {
    legacy: false,
    types: {
      'Bodygrip': ['B120', 'B120 Magnum', 'C160', 'C160 Magnum', 'C220', 'C220 Magnum',
        'C280', 'C280 Magnum', 'C330', 'C330 Magnum']
    }
  },
  'RBG': {
    legacy: false,
    types: {
      'Bodygrip': ['#220 Round', '#330 Round', '1022']
    }
  },
  'BMI': {
    legacy: false,
    types: {
      'Bodygrip': ['120', '126 Magnum', '220', '280', '280 Magnum', '330', 'BT 300']
    }
  },
  'Northwoods': {
    legacy: false,
    types: {
      'Bodygrip': ['150 (single spring)', '155 (double spring)']
    }
  },
  'Species-Specific': {
    legacy: false,
    types: {
      'Bodygrip': ['330 Dislocator Half Magnum', '440 Dislocator Half Magnum']
    }
  },
  'Rudy': {
    legacy: false,
    types: {
      /* Plus models are certification-backed; retail evidence is thin. */
      'Bodygrip': ['110', '120', '120 MAG', '160 Plus', '220 Plus', '280', '330']
    }
  },
  "Funke's": {
    legacy: false,
    types: {
      'Cage': ['Mullet live trap', 'Rabbit trap', 'Weasel trap'],
      'Colony': ['Colony trap']
    }
  },
  'Havahart': {
    legacy: false,
    types: {
      'Cage': ['1025', '1045', '1079', '1085 Easy Set', '1092 collapsible']
    }
  },
  'Tomahawk': {
    legacy: false,
    types: {
      'Cage': ['606', '108', '101SS', '107SS', '108SS', '608SS (Pro Series stainless)', 'DT1 drop trap'],
      'Colony': ['102C Rigid', '102CS Rigid', '202CS collapsible', '203CS', '204CS']
    }
  },
  'Tru Catch': {
    legacy: false,
    types: {
      'Cage': ['Tuffy 24', 'R24 skunk', '30LTD', '30D', '30FCD Fat Cat', '36D', '42D', '48D']
    }
  },
  'Safeguard': {
    legacy: false,
    types: {
      'Cage': ['53000 Universal', '52830', '52848 Large Dog']
    }
  },
  'Humane Way': {
    legacy: false,
    types: {
      'Cage': ['Small', 'Large', 'Super Size']
    }
  },
  'Comstock': {
    legacy: false,
    types: {
      'Cage': ['Beaver cage']
    }
  },
  'Ztraps': {
    legacy: false,
    types: {
      'Cage': ['Skunk-N-More tube', 'Cage trap (3 sizes)'],
      'Dog-proof': ['Z-Trap']
    }
  },
  'DakotaLine': {
    legacy: false,
    types: {
      'Snare': ['1x19 3/32" coyote — 84", Blackdog Mini-Camlock',
        'Ghost Rider coyote — 84", 3/32" 7x7']
    }
  },
  'Snare Shop / F&T': {
    legacy: false,
    types: {
      'Snare': ['Round-Up Special — 5 ft, 3/32" 7x7, micro lock', 'Coyote Catcher']
    }
  },
  'Southern Snares': {
    legacy: false,
    types: {
      'Snare': ['60" 7x7 3/32" micro lock', '60" 5/64" micro lock'],
      'Dog-proof': ['Southern Snares DP']
    }
  },
  'Razorback Snares': {
    legacy: false,
    types: {
      'Snare': ['Premium coyote — 49" 5/64" 1x19 loop, 30" 3/32" 7x7 tail, micro lock',
        'Microlight universal cat/fox — 1/16" 1x19, micro lock (not for coyote)']
    }
  },
  'Select-A-Catch': {
    legacy: false,
    types: {
      /* Weight-selectable foot snares; source named 8 models but not individually. */
      'Foot snare': ['Weight-selectable foot snare']
    }
  },
  'Freedom Brand': {
    legacy: false,
    types: {
      'Dog-proof': ['FB1', 'FB2']
    }
  },
  'NO-BS': {
    legacy: false,
    types: {
      'Dog-proof': ['NO-BS']
    }
  },
  'Sterling': {
    legacy: false,
    types: {
      'Dog-proof': ['Grizz (Twistloc)']
    }
  },
  'Coon Cuff': {
    legacy: false,
    types: {
      'Dog-proof': ['Coon Cuff']
    }
  },
  "Duffer's": {
    legacy: false,
    types: {
      'Dog-proof': ["Duffer's"]
    }
  },
  'WCS': {
    legacy: false,
    types: {
      'Dog-proof': ['Bandit Buster', '"Soup can"']
    }
  },
  'PCS': {
    legacy: false,
    types: {
      'Dog-proof': ['Feather Light']
    }
  },
  'TrapShed Brand': {
    legacy: false,
    types: {
      'Dog-proof': ['TrapShed Brand']
    }
  },
  'AuSable Brand': {
    legacy: false,
    types: {
      'Colony': ['Muskrat colony trap'],
      'Snare': ['5 ft 3/32" coyote & fox w/ Sure Lock']
    }
  },
  'Oneida Victor': {
    legacy: true,
    types: {
      'Coil-spring foothold': ['#1', '#1½', '#1¾', '#2', '#3', 'Soft Catch line'],
      'Longspring foothold': ['#0', '#1', '#1½', '#11', '#2', '#3', '#4', '#5'],
      'Bodygrip': ['110', '120', '160', '220', '280', '330']
    }
  },
  'Sleepy Creek': {
    legacy: true,
    types: {
      'Coil-spring foothold': ['#1', '#1½', '#1¾', '#2', '#3', '#4 (+ offsets, 4x4s)'],
      'Longspring foothold': ['#11', '#2', '#3', '#4', '#5'],
      /* Sleepy Creek bodygrip numbers with standard-size equivalencies. */
      'Bodygrip': ['450 (= 110)', '455 (= 120)', '600 (= 160)', '700 (= 220)', '800 (= 280)', '1000 (= 330)']
    }
  }
};

/* Alphabetical maker order for the picker; legacy makers sort with the rest,
   marked in the label. */
var MAKER_ORDER = Object.keys(TRAP_MAKERS).sort(function (a, b) {
  return a.toLowerCase() < b.toLowerCase() ? -1 : 1;
});

/* Full unfiltered trap-type list (the "Not sure / mixed brands" path —
   today's behavior, plus Bear trap). */
var ALL_TRAP_TYPES = ['Bear trap', 'Bodygrip / Conibear', 'Cage live trap', 'Colony trap',
  'Dog-proof', 'Foothold', 'Snare', 'Other'];

/* ---- Modifications (Q39) ----
   Optional per-set section. Chain hardware (swivels, shock springs, stakes,
   drags) is deliberately excluded — anything beyond the trap stays out.
   Factory variants (4-coil, padded, dogless, offset...) already live in the
   model names above, so this section is for work the trapper did after
   buying the trap. */
var FOOTHOLD_MODS = ['Laminated top', 'Laminated bottom', 'Rubber pads', 'Four-coiled',
  'Night-latched', 'Pan tension set', 'Pan stops', 'Base-plated'];
var BODYGRIP_MODS = ['Trigger replaced', 'Bait clip added'];
var PAN_SIZES = ['Stock', 'Large', 'Small'];

/* localStorage key for the trapper's own saved custom modifications. */
var CUSTOM_MODS_KEY = 'opf_custom_mods';

function getCustomMods() {
  try {
    var v = JSON.parse(localStorage.getItem(CUSTOM_MODS_KEY) || '[]');
    return Array.isArray(v) ? v.filter(function (x) { return typeof x === 'string' && x; }) : [];
  } catch (e) { return []; }
}
function addCustomMod(name) {
  name = String(name || '').trim();
  if (!name) return false;
  var list = getCustomMods();
  for (var i = 0; i < list.length; i++) if (list[i].toLowerCase() === name.toLowerCase()) return false;
  list.push(name);
  try { localStorage.setItem(CUSTOM_MODS_KEY, JSON.stringify(list)); } catch (e) {}
  return true;
}

/* Resolve a picker type key (catalog name or plain app type) to the stored
   { t: trapType, spring: implied spring }. */
function resolveTrapType(pickerType) {
  var m = MAKER_TYPE_MAP[pickerType];
  if (m) return { t: m.t, spring: m.spring };
  return { t: pickerType || '', spring: '' };
}

/* Reverse: given saved set fields + maker, find the picker type key that
   produced them (model match first, then type+spring). */
function pickerTypeFor(maker, trapType, trapSpring, trapModel) {
  var entry = maker && TRAP_MAKERS[maker];
  if (!entry) return trapType || '';
  var types = entry.types, key;
  if (trapModel) {
    for (key in types) {
      if (types[key].indexOf(trapModel) >= 0) return key;
    }
  }
  for (key in types) {
    var m = MAKER_TYPE_MAP[key];
    if (m && m.t === trapType && (!m.spring || m.spring === trapSpring)) return key;
  }
  return '';
}

/* Normalize saved mods: top+bottom lamination displays as double-laminated. */
function normalizeMods(mods) {
  var out = [], hasTop = false, hasBottom = false, i;
  (mods || []).forEach(function (m) {
    if (m === 'Laminated top') hasTop = true;
    else if (m === 'Laminated bottom') hasBottom = true;
    else if (out.indexOf(m) < 0) out.push(m);
  });
  if (hasTop && hasBottom) out.unshift('Double-laminated');
  else { if (hasTop) out.unshift('Laminated top'); if (hasBottom) out.push('Laminated bottom'); }
  return out;
}
