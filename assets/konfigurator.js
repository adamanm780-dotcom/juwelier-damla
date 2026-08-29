/* ══════════════════════════════════════════════════════════════
   Trauring-Konfigurator — Juwelier Damla
   ──────────────────────────────────────────────────────────────
   Rendert das Ringpaar live in 3D (three.js). Jede Kombination aus
   Legierung, Profil, Breite, Staerke, Oberflaeche und Steinbesatz
   entsteht als echte Geometrie — es gibt KEINE vorgerenderten Bilder.

   Aufbau:
     1) KATALOG      Stammdaten: Legierungen, Profile, Oberflaechen, Steine
     2) PREISE       Kalkulationsgrundlage — vom Haus zu pflegen
     3) GEOMETRIE    Querschnitt -> LatheGeometry
     4) MATERIAL     PBR-Metall + prozedurale Oberflaechen-Maps
     5) SZENE        Kamera, Licht, Environment, Bodenschatten
     6) ZUSTAND/UI   Bedienfeld, Preis, Zusammenfassung, Anfrage
   ══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { OrbitControls } from 'three/OrbitControls.js';
import { RoomEnvironment } from 'three/RoomEnvironment.js';

/* ══════════════════════════════════════════════════════════════
   1) KATALOG
   ══════════════════════════════════════════════════════════════ */

/* Basisfarben fuer metalness = 1. Hoeherer Feingoldanteil = satterer Ton.
   dichte in g/cm3 — geht in die Gewichts- und damit Preisrechnung ein. */
const LEGIERUNGEN = {
  gelbgold: {
    label: 'Gelbgold',
    karate: {
      '333': { label: '333 / 8 kt',  farbe: 0xd8c79c, dichte: 11.0 },
      '585': { label: '585 / 14 kt', farbe: 0xe2be79, dichte: 13.1 },
      '750': { label: '750 / 18 kt', farbe: 0xecb857, dichte: 15.5 },
    },
  },
  weissgold: {
    label: 'Weißgold',
    karate: {
      '333': { label: '333 / 8 kt',  farbe: 0xdedee0, dichte: 11.4 },
      '585': { label: '585 / 14 kt', farbe: 0xe4e5e8, dichte: 13.0 },
      '750': { label: '750 / 18 kt', farbe: 0xeaebee, dichte: 15.0 },
    },
  },
  rotgold: {
    label: 'Rotgold',
    karate: {
      '333': { label: '333 / 8 kt',  farbe: 0xd8b39c, dichte: 11.2 },
      '585': { label: '585 / 14 kt', farbe: 0xdfa77f, dichte: 13.2 },
      '750': { label: '750 / 18 kt', farbe: 0xe49a6a, dichte: 15.2 },
    },
  },
  platin: {
    label: 'Platin',
    karate: {
      '950': { label: '950 Platin', farbe: 0xd6d7da, dichte: 20.1 },
    },
  },
};

/* Zweitmetall fuer Bicolor — als schmales Mittelband auf der Aussenseite. */
const BICOLOR_PARTNER = {
  gelbgold:  'weissgold',
  rotgold:   'weissgold',
  weissgold: 'gelbgold',
  platin:    'gelbgold',
};

/* Profile: beschreiben den Querschnitt.
   aussen(t) / innen(t) liefern den radialen Abstand zur Innenkante,
   t laeuft von -1 (eine Ringkante) bis +1 (andere Ringkante).
   volumen = Fuellgrad gegenueber dem umschriebenen Rechteck (fuer das Gewicht). */
const PROFILE = {
  flach: {
    label: 'Flach',
    hinweis: 'Klarer, moderner Klassiker mit gerader Außenfläche.',
    volumen: 0.97,
    aussen: (t, T) => T - 0.04 * T * Math.pow(Math.abs(t), 8),
    innen:  ()      => 0,
  },
  bombiert: {
    label: 'Halbrund / bombiert',
    hinweis: 'Die meistgewählte Form — außen sanft gewölbt, trägt sich weich.',
    volumen: 0.88,
    aussen: (t, T) => T - 0.30 * T * t * t,
    innen:  ()      => 0,
  },
  oval: {
    label: 'Oval',
    hinweis: 'Außen und innen gerundet. Die bequemste Form, auch für breite Ringe.',
    volumen: 0.78,
    aussen: (t, T) => T - 0.40 * T * t * t,
    innen:  (t, T) => 0.20 * T * t * t,
  },
  konkav: {
    label: 'Konkav',
    hinweis: 'Nach innen geschwungene Außenfläche mit markanten Kanten.',
    volumen: 0.84,
    aussen: (t, T) => T - 0.26 * T * (1 - t * t),
    innen:  ()      => 0,
  },
  kantig: {
    label: 'Kantig mit Fase',
    hinweis: 'Gerade Fläche mit angeschrägten Kanten — ruhig und markant.',
    volumen: 0.92,
    aussen: (t, T) => {
      const a = Math.abs(t), k = 0.72;
      if (a <= k) return T;
      return T - 0.34 * T * ((a - k) / (1 - k));
    },
    innen: () => 0,
  },
};

/* Oberflaechen: rauheit steuert den Glanz, textur die prozedurale Map. */
const OBERFLAECHEN = {
  poliert:     { label: 'Poliert',        rauheit: 0.05, textur: null,      aufpreis: 0 },
  seidenmatt:  { label: 'Seidenmatt',     rauheit: 0.34, textur: 'feinkorn', aufpreis: 25 },
  eismatt:     { label: 'Eismatt',        rauheit: 0.58, textur: 'grobkorn', aufpreis: 30 },
  laengsmatt:  { label: 'Längsmattiert',  rauheit: 0.28, textur: 'buerste',  aufpreis: 30 },
  hammer:      { label: 'Hammerschlag',   rauheit: 0.22, textur: 'hammer',   aufpreis: 55 },
};

/* Steinbesatz — Brillanten in der Aussenflaeche, mittig auf der Breite. */
const BESATZ = {
  ohne:    { label: 'Ohne Stein',        anzahl: 0,  karat: 0 },
  eins:    { label: '1 Brillant',        anzahl: 1,  karat: 0.03 },
  drei:    { label: '3 Brillanten',      anzahl: 3,  karat: 0.03 },
  fuenf:   { label: '5 Brillanten',      anzahl: 5,  karat: 0.02 },
  memoire: { label: 'Memoire-Reihe (11)', anzahl: 11, karat: 0.015 },
};

/* ══════════════════════════════════════════════════════════════
   2) PREISE  —  Kalkulationsgrundlage
   ──────────────────────────────────────────────────────────────
   ACHTUNG: Diese Saetze sind die einzige Stelle, an der der Preis
   haengt. Sie sind Richtwerte und muessen vom Haus gepflegt werden;
   die Seite weist den Preis ausdruecklich als unverbindlich aus.
   ══════════════════════════════════════════════════════════════ */
const PREISE = {
  /* Euro je Gramm, inkl. Fertigung des Rohrings */
  grammpreis: { '333': 32, '585': 52, '750': 68, '950': 78 },
  /* Grundpauschale je Ring: Anfertigung, Innenpolitur, Endkontrolle */
  grundpreis: 130,
  /* Aufpreis Bicolor je Ring */
  bicolor: 90,
  /* Brillant je Stein, gefasst (0,015–0,03 ct) */
  stein: 48,
  /* Innengravur je Ring */
  gravur: 25,
  /* auf diesen Betrag runden */
  rundung: 10,
};

const RINGGROESSEN = []; // Innenumfang in mm
for (let g = 44; g <= 70; g++) RINGGROESSEN.push(g);

/* ══════════════════════════════════════════════════════════════
   3) GEOMETRIE — Querschnitt als LatheGeometry
   ══════════════════════════════════════════════════════════════ */

/**
 * Baut den geschlossenen Ringquerschnitt in der r/y-Ebene und rotiert
 * ihn um die Y-Achse. Die Aussenkanten bekommen eine kleine Fase, sonst
 * faengt das Licht dort keine Kante und der Ring wirkt wie ein Rohr.
 *
 * @param {number} ri  Innenradius in mm
 * @param {number} T   Wandstaerke in mm
 * @param {number} W   Ringbreite in mm
 * @param {object} profil Eintrag aus PROFILE
 */
function ringGeometrie(ri, T, W, profil) {
  const N = 64;                               // Abtastung ueber die Breite
  const er = Math.min(0.16, T * 0.3, W * 0.14); // Kantenradius
  const tf = 1 - (2 * er) / W;                // Beginn der Kantenfase
  const y = (t) => (t * W) / 2;
  const rAussen = (t) => ri + profil.aussen(t, T);
  const rInnen = (t) => ri + profil.innen(t, T);

  const pts = [];

  // Innenflaeche: von der einen Kante zur anderen
  for (let i = 0; i <= N; i++) {
    const t = -1 + (2 * i) / N;
    pts.push(new THREE.Vector2(rInnen(t), y(t)));
  }

  // Seitenflaeche oben: von innen nach aussen
  const rOben = rAussen(tf);
  pts.push(new THREE.Vector2(rOben - er, y(1)));

  // Kantenfase oben (Viertelbogen, nach aussen einlaufend)
  for (let i = 1; i <= 8; i++) {
    const a = (Math.PI / 2) * (1 - i / 8);
    pts.push(new THREE.Vector2(rOben - er * (1 - Math.cos(a)), y(tf) + er * Math.sin(a)));
  }

  // Aussenflaeche zurueck ueber die Breite
  for (let i = 0; i <= N; i++) {
    const t = tf - (2 * tf * i) / N;
    pts.push(new THREE.Vector2(rAussen(t), y(t)));
  }

  // Kantenfase unten
  const rUnten = rAussen(-tf);
  for (let i = 1; i <= 8; i++) {
    const a = (Math.PI / 2) * (i / 8);
    pts.push(new THREE.Vector2(rUnten - er * (1 - Math.cos(a)), y(-tf) - er * Math.sin(a)));
  }

  // Seitenflaeche unten: zurueck nach innen, Kontur schliessen
  pts.push(new THREE.Vector2(rInnen(-1), y(-1)));

  const geo = new THREE.LatheGeometry(pts, 192);
  geo.computeVertexNormals();
  return geo;
}

/** Duenne Aussenhaut fuer das Bicolor-Mittelband. */
function bandGeometrie(ri, T, W, profil) {
  const pts = [];
  const spanne = 0.30;
  for (let i = 0; i <= 24; i++) {
    const t = -spanne + (2 * spanne * i) / 24;
    pts.push(new THREE.Vector2(ri + profil.aussen(t, T) + 0.02, (t * W) / 2));
  }
  return new THREE.LatheGeometry(pts, 192);
}

/**
 * Brillant nach den ueblichen Proportionen des Rundschliffs:
 * Tafel 56 %, Kronenhoehe 16 %, Pavillontiefe 43 % des Durchmessers.
 * 16 Facetten statt 8 — das Feuer entsteht ueber die Kanten, mit acht
 * Seiten sieht der Stein von der Seite aus wie ein Dreieck.
 */
function brillantGeometrie(r) {
  const d = r * 2;
  const krone = new THREE.CylinderGeometry(r * 0.56, r, d * 0.16, 16, 1);
  krone.translate(0, d * 0.08, 0);
  const pavillon = new THREE.ConeGeometry(r, d * 0.43, 16, 1);
  pavillon.rotateX(Math.PI);
  pavillon.translate(0, -d * 0.215, 0);
  return { krone, pavillon };
}

/* ══════════════════════════════════════════════════════════════
   3b) QUERSCHNITT ALS ZEICHNUNG
   ──────────────────────────────────────────────────────────────
   Dieselben Profilfunktionen wie fuer die 3D-Geometrie, nur flach
   gezeichnet — „konkav" oder „bombiert" versteht man am Bild sofort.
   ══════════════════════════════════════════════════════════════ */

/**
 * SVG-Pfad des Querschnitts. Breite laeuft waagerecht, Staerke senkrecht;
 * (0,0) liegt links oben im Kasten.
 *
 * @param {object} profil Eintrag aus PROFILE
 * @param {number} bx     Kastenbreite in px  (entspricht der Ringbreite)
 * @param {number} by     Kastenhoehe in px   (entspricht der Wandstaerke)
 */
function querschnittPfad(profil, bx, by) {
  const N = 40;
  const T = 1;                              // normiert, by skaliert
  const oben = [];
  const unten = [];
  for (let i = 0; i <= N; i++) {
    const t = -1 + (2 * i) / N;
    const x = ((t + 1) / 2) * bx;
    oben.push([x, by - profil.aussen(t, T) * by]);
    unten.push([x, by - profil.innen(t, T) * by]);
  }
  const p = oben.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(2) + ' ' + y.toFixed(2));
  unten.reverse().forEach(([x, y]) => p.push('L' + x.toFixed(2) + ' ' + y.toFixed(2)));
  return p.join(' ') + ' Z';
}

/** Kleines Piktogramm fuer die Profil-Knoepfe — feste Vergleichsmasse. */
function profilPiktogramm(profil) {
  const bx = 30, by = 11;
  return '<svg class="kf-pikto" viewBox="0 0 ' + bx + ' ' + (by + 2) + '" aria-hidden="true">' +
         '<path d="' + querschnittPfad(profil, bx, by) + '"/></svg>';
}

/* ══════════════════════════════════════════════════════════════
   4) MATERIAL — prozedurale Oberflaechen
   ══════════════════════════════════════════════════════════════ */

const texturCache = new Map();

/* Ohne anisotrope Filterung zerfallen die Oberflaechen-Maps auf der
   stark gekruemmten Aussenflaeche zu Streifen. Wird gesetzt, sobald
   der Renderer da ist, und auf alle bereits gebauten Texturen angewandt. */
let maxAniso = 1;
function anisoAnwenden(tex) {
  tex.anisotropy = maxAniso;
  tex.needsUpdate = true;
  return tex;
}

function leinwand(groesse) {
  const c = document.createElement('canvas');
  c.width = c.height = groesse;
  return c;
}

/** Rauheits-Map: koerniges bzw. gebuerstetes Finish. */
function rauheitsMap(art) {
  const key = 'r-' + art;
  if (texturCache.has(key)) return texturCache.get(key);

  const S = 512;
  const c = leinwand(S);
  const ctx = c.getContext('2d');
  const bild = ctx.createImageData(S, S);
  const d = bild.data;

  for (let yy = 0; yy < S; yy++) {
    for (let xx = 0; xx < S; xx++) {
      const i = (yy * S + xx) * 4;
      let v;
      if (art === 'feinkorn') {
        v = 200 + Math.random() * 55;
      } else if (art === 'grobkorn') {
        // groebere Struktur: Rauschen auf einem gefilterten Raster
        const grob = Math.sin(xx * 0.7) * Math.cos(yy * 0.9);
        v = 175 + grob * 25 + Math.random() * 55;
      } else {
        // Buerste: feine Riefen laengs der Ringkontur (u-Richtung)
        v = 190 + Math.sin(yy * 2.3) * 12 + Math.random() * 45;
      }
      d[i] = d[i + 1] = d[i + 2] = Math.max(0, Math.min(255, v));
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(bild, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  // Laengsmattierung laeuft um den Ring, die Koernungen bleiben gleichmaessig
  tex.repeat.set(art === 'buerste' ? 1 : 8, art === 'buerste' ? 10 : 3);
  tex.colorSpace = THREE.NoColorSpace;
  anisoAnwenden(tex);
  texturCache.set(key, tex);
  return tex;
}

/** Normal-Map fuer Hammerschlag: ueberlagerte runde Diedel. */
function hammerMap() {
  if (texturCache.has('n-hammer')) return texturCache.get('n-hammer');

  const S = 512;
  const hoehe = new Float32Array(S * S);
  const dellen = 90;
  for (let k = 0; k < dellen; k++) {
    const cx = Math.random() * S, cy = Math.random() * S;
    const rad = 22 + Math.random() * 26;
    const tiefe = 0.45 + Math.random() * 0.55;
    for (let yy = Math.max(0, cy - rad) | 0; yy < Math.min(S, cy + rad); yy++) {
      for (let xx = Math.max(0, cx - rad) | 0; xx < Math.min(S, cx + rad); xx++) {
        const dx = xx - cx, dy = yy - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > rad) continue;
        const h = Math.cos((dist / rad) * (Math.PI / 2)) * tiefe;
        const i = yy * S + xx;
        if (h > hoehe[i]) hoehe[i] = h;
      }
    }
  }

  const c = leinwand(S);
  const ctx = c.getContext('2d');
  const bild = ctx.createImageData(S, S);
  const d = bild.data;
  const at = (x, y) => hoehe[((y + S) % S) * S + ((x + S) % S)];
  for (let yy = 0; yy < S; yy++) {
    for (let xx = 0; xx < S; xx++) {
      const dx = (at(xx + 1, yy) - at(xx - 1, yy)) * 2.2;
      const dy = (at(xx, yy + 1) - at(xx, yy - 1)) * 2.2;
      const len = Math.sqrt(dx * dx + dy * dy + 1);
      const i = (yy * S + xx) * 4;
      d[i]     = ((-dx / len) * 0.5 + 0.5) * 255;
      d[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      d[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(bild, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  // Grob kacheln: die Lathe-UVs stauchen v auf den Seitenflanken stark,
  // bei feiner Kachelung zerfaellt die Struktur dort zu Streifen.
  tex.repeat.set(6, 2);
  tex.colorSpace = THREE.NoColorSpace;
  anisoAnwenden(tex);
  texturCache.set('n-hammer', tex);
  return tex;
}

function metallMaterial(farbe, oberflaeche) {
  const o = OBERFLAECHEN[oberflaeche];
  const mat = new THREE.MeshPhysicalMaterial({
    color: farbe,
    metalness: 1.0,
    roughness: o.rauheit,
    envMapIntensity: 1.35,
  });
  if (o.textur === 'hammer') {
    mat.normalMap = hammerMap();
    mat.normalScale = new THREE.Vector2(0.55, 0.55);
  } else if (o.textur) {
    mat.roughnessMap = rauheitsMap(o.textur);
  }
  return mat;
}

/* Ein Brillant ist nicht weiss, sondern fast farblos: was man sieht, sind
   Spiegelungen. Deshalb hoher Brechungsindex und kraeftige Environment-
   Intensitaet — mit gedaempfter Reflexion wirken die Steine wie Milchglas. */
const BRILLANT_MATERIAL = new THREE.MeshPhysicalMaterial({
  color: 0xf2f6fb,
  metalness: 0.0,
  roughness: 0.0,
  ior: 2.42,
  specularIntensity: 1.0,
  clearcoat: 1.0,
  clearcoatRoughness: 0.0,
  envMapIntensity: 6.0,
  flatShading: true,
});

/* ══════════════════════════════════════════════════════════════
   5) SZENE
   ══════════════════════════════════════════════════════════════ */

const buehne = document.getElementById('kfBuehne');
const hinweisWebgl = document.getElementById('kfWebglHinweis');

let renderer, scene, camera, controls, ringGruppe;
let letzteInteraktion = 0;
let laeuft = false;
let bereit = false;   // erstes gerendertes Bild da -> Ladezustand aus

function webglVerfuegbar() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) {
    return false;
  }
}

function szeneAufbauen() {
  // preserveDrawingBuffer haelt das Bild nach dem Zeichnen im Puffer —
  // ohne das liefert toDataURL() fuer den Export ein leeres Bild.
  renderer = new THREE.WebGLRenderer({
    antialias: true, alpha: true, preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(buehne.clientWidth, buehne.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  buehne.appendChild(renderer.domElement);

  maxAniso = renderer.capabilities.getMaxAnisotropy();

  scene = new THREE.Scene();

  // Studio-Environment ohne externe HDR-Datei
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  camera = new THREE.PerspectiveCamera(32, buehne.clientWidth / buehne.clientHeight, 1, 400);
  // Dreiviertelblick: frontal sieht man nur den Kreis, hier auch das Profil
  camera.position.set(30, 21, 70);

  // gerichtetes Licht fuer definierte Glanzkanten auf den Fasen
  const key = new THREE.DirectionalLight(0xfff6e8, 1.5);
  key.position.set(-18, 26, 34);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 0.7);
  rim.position.set(24, -10, -22);
  scene.add(rim);

  ringGruppe = new THREE.Group();
  scene.add(ringGruppe);
  schatten.eins = bodenSchatten();
  schatten.zwei = bodenSchatten();
  scene.add(schatten.eins, schatten.zwei);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 10, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 40;
  controls.maxDistance = 130;
  controls.minPolarAngle = Math.PI * 0.14;
  controls.maxPolarAngle = Math.PI * 0.62;
  controls.autoRotateSpeed = 0.7;
  controls.addEventListener('start', () => { letzteInteraktion = performance.now(); });
  controls.addEventListener('change', () => { letzteInteraktion = performance.now(); });

  new ResizeObserver(groesseAnpassen).observe(buehne);
  laeuft = true;
  renderer.setAnimationLoop(tick);
}

const schatten = { eins: null, zwei: null };

/** Weicher Bodenschatten je Ring — spart eine zweite Rendering-Passage. */
function bodenSchatten() {
  const S = 256;
  const c = leinwand(S);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(60,52,40,0.30)');
  g.addColorStop(0.45, 'rgba(60,52,40,0.12)');
  g.addColorStop(1, 'rgba(60,52,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);

  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  // Einheitsgroesse 1 — wird je Ring auf dessen Durchmesser skaliert
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = 0.02;   // die Ringe stehen auf y = 0
  return plane;
}

/** Schatten unter einen Ring legen: so breit wie der Ring, flach in der Tiefe. */
function schattenSetzen(mesh, x, z, radius) {
  if (!mesh) return;
  mesh.position.set(x, 0.02, z);
  mesh.scale.set(radius * 3.1, radius * 1.5, 1);
}

function groesseAnpassen() {
  if (!renderer || !buehne.clientWidth) return;
  camera.aspect = buehne.clientWidth / buehne.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(buehne.clientWidth, buehne.clientHeight);
  kameraEinpassen(true);
}

/**
 * Haelt das Paar im Bild — auf einem schmalen Handy-Viewport reicht die
 * feste Kameradistanz sonst nicht und der zweite Ring wird angeschnitten.
 * Beim Umkonfigurieren nur nachfuehren, wenn es wirklich noetig ist,
 * damit ein selbst gewaehlter Zoom nicht bei jedem Klick zurueckspringt.
 */
function kameraEinpassen(erzwingen) {
  if (!camera || !controls) return;
  const rEins = zustand.eins.groesse / (2 * Math.PI) + zustand.eins.staerke;
  const rZwei = zustand.zwei.groesse / (2 * Math.PI) + zustand.zwei.staerke;
  const breite = 2 * (rEins + rZwei) + 3.6;
  const hoehe = 2 * Math.max(rEins, rZwei);

  const fovY = THREE.MathUtils.degToRad(camera.fov);
  const fovX = 2 * Math.atan(Math.tan(fovY / 2) * camera.aspect);
  const noetig = Math.max(
    breite / 2 / Math.tan(fovX / 2),
    hoehe / 2 / Math.tan(fovY / 2)
  ) * 1.3;

  controls.target.set(0, hoehe / 2, 0);
  controls.minDistance = noetig * 0.5;
  controls.maxDistance = noetig * 2.4;

  const jetzt = camera.position.distanceTo(controls.target);
  if (erzwingen || jetzt > noetig * 1.35 || jetzt < noetig * 0.72) {
    const richtung = camera.position.clone().sub(controls.target).normalize();
    camera.position.copy(controls.target).add(richtung.multiplyScalar(noetig));
  }
  controls.update();
}

function tick() {
  // Nach kurzer Ruhe kreist die Kamera weiter — das Paar bleibt stehen,
  // waehrend Profil und Oberflaeche von allen Seiten sichtbar werden.
  controls.autoRotate = performance.now() - letzteInteraktion > 2600;
  controls.update();
  renderer.render(scene, camera);
  if (!bereit) { bereit = true; buehne.classList.add('is-bereit'); }
}

/* ── Ansicht als Bild sichern ──────────────────────────────────
   Die Ringe zweifach aufgeloest rendern, greifen, Groesse zurueck.
   Kunden speichern sich ihren Entwurf, wir bekommen ihn per Nachricht. */
function bildSpeichern() {
  if (!renderer) return;
  const b = buehne.clientWidth, h = buehne.clientHeight;
  const pr = renderer.getPixelRatio();
  renderer.setPixelRatio(Math.min(pr * 2, 4));
  renderer.setSize(b, h, false);
  renderer.render(scene, camera);

  let url = '';
  try {
    url = renderer.domElement.toDataURL('image/png');
  } finally {
    renderer.setPixelRatio(pr);
    renderer.setSize(b, h);
    renderer.render(scene, camera);
  }
  if (!url) return;

  const a = document.createElement('a');
  a.href = url;
  a.download = 'trauringe-juwelier-damla.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* ══════════════════════════════════════════════════════════════
   6) ZUSTAND
   ══════════════════════════════════════════════════════════════ */

const standard = () => ({
  legierung: 'gelbgold',
  karat: '585',
  letztesKarat: '585',   // ueberlebt einen Abstecher zu Platin
  bicolor: false,
  profil: 'bombiert',
  breite: 4.5,
  staerke: 1.6,
  oberflaeche: 'poliert',
  besatz: 'ohne',
  groesse: 54,
  gravur: '',
});

const zustand = {
  aktiv: 'eins',
  gekoppelt: true,
  eins: Object.assign(standard(), { breite: 3.5, besatz: 'drei', groesse: 54 }),
  zwei: Object.assign(standard(), { breite: 5.5, besatz: 'ohne', groesse: 62 }),
};

/* Diese Felder bleiben beim Koppeln individuell — Groesse und Gravur
   sind pro Person, alles andere macht ein Paar erst zum Paar. */
const NICHT_KOPPELN = ['groesse', 'gravur', 'breite', 'besatz'];

/* ── Konfiguration in der Adresszeile ──────────────────────────
   Damit ist ein Entwurf teilbar und wiederfindbar: der Link, den
   der Besucher uns schickt, oeffnet exakt dieses Paar. */

function inBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let roh = '';
  bytes.forEach((b) => { roh += String.fromCharCode(b); });
  return btoa(roh).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function ausBase64Url(code) {
  const roh = atob(code.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(roh, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Nur bekannte Werte uebernehmen — ein manipulierter Link darf
    hoechstens beim Standard landen, nie in einem kaputten Zustand. */
function pruefen(k) {
  const s = standard();
  if (LEGIERUNGEN[k.legierung]) s.legierung = k.legierung;
  if (LEGIERUNGEN[s.legierung].karate[k.karat]) s.karat = k.karat;
  s.letztesKarat = LEGIERUNGEN.gelbgold.karate[k.letztesKarat] ? k.letztesKarat : s.karat;
  if (PROFILE[k.profil]) s.profil = k.profil;
  if (OBERFLAECHEN[k.oberflaeche]) s.oberflaeche = k.oberflaeche;
  if (BESATZ[k.besatz]) s.besatz = k.besatz;
  s.bicolor = !!k.bicolor;
  s.breite = Math.min(8, Math.max(2.5, Number(k.breite) || s.breite));
  s.staerke = Math.min(2.4, Math.max(1.2, Number(k.staerke) || s.staerke));
  s.groesse = Math.min(70, Math.max(44, parseInt(k.groesse, 10) || s.groesse));
  s.gravur = typeof k.gravur === 'string' ? k.gravur.slice(0, 24) : '';
  return s;
}

function ausAdresse() {
  const code = (location.hash || '').replace(/^#k=/, '');
  if (!code || code === location.hash) return false;
  try {
    const d = JSON.parse(ausBase64Url(code));
    zustand.eins = pruefen(d.a || {});
    zustand.zwei = pruefen(d.b || {});
    zustand.gekoppelt = !!d.g;
    return true;
  } catch (e) {
    return false;
  }
}

/* Merkt sich, was wir selbst geschrieben haben — damit der Lauscher unten
   den eigenen Schreibvorgang nicht als fremden Link missversteht. */
let eigenerHash = '';

/* Gedrosselt: an einem Schieberegler feuert `input` dutzende Male, und
   Browser deckeln die Zahl der History-Schreibvorgaenge. */
let adressTimer = 0;
function inAdresse() {
  clearTimeout(adressTimer);
  adressTimer = setTimeout(() => {
    const code = inBase64Url(JSON.stringify({
      a: zustand.eins, b: zustand.zwei, g: zustand.gekoppelt,
    }));
    eigenerHash = '#k=' + code;
    // replaceState statt hash, damit der Zurueck-Knopf nicht zumuellt
    history.replaceState(null, '', location.pathname + location.search + eigenerHash);
  }, 350);
}

/* Ein Link, der erst nach dem Laden in die Adresszeile kommt — eingefuegt
   oder ueber den Zurueck-Knopf — soll genauso greifen wie beim Aufruf.
   Der eigene replaceState loest kein hashchange aus; der Vergleich faengt
   trotzdem den Fall ab, dass jemand exakt den aktuellen Stand einfuegt. */
window.addEventListener('hashchange', () => {
  if (location.hash === eigenerHash) return;
  if (ausAdresse()) zeichnen();
});

/* ══════════════════════════════════════════════════════════════
   RING BAUEN
   ══════════════════════════════════════════════════════════════ */

const ringe = { eins: null, zwei: null };

/* Geometrien und Materialien des alten Standes freigeben. Die prozeduralen
   Maps liegen im Cache und werden bewusst behalten — sie sind teuer und
   fuer alle Ringe gleich. Ebenso das gemeinsame Brillant-Material. */
function altEntsorgen(gruppe) {
  gruppe.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry.dispose();
    if (o.material !== BRILLANT_MATERIAL) {
      if (o.material.map && !texturGecacht(o.material.map)) o.material.map.dispose();
      o.material.dispose();
    }
  });
  gruppe.clear();
}

function texturGecacht(tex) {
  for (const t of texturCache.values()) if (t === tex) return true;
  return false;
}

function ringBauen(seite) {
  const k = zustand[seite];
  const profil = PROFILE[k.profil];
  const leg = LEGIERUNGEN[k.legierung];
  const karat = leg.karate[k.karat] || Object.values(leg.karate)[0];
  const ri = k.groesse / (2 * Math.PI);
  const T = k.staerke;
  const W = k.breite;

  let gruppe = ringe[seite];
  if (!gruppe) {
    gruppe = new THREE.Group();
    ringGruppe.add(gruppe);
    ringe[seite] = gruppe;
  } else {
    altEntsorgen(gruppe);
  }

  // Grundring
  const koerper = new THREE.Mesh(
    ringGeometrie(ri, T, W, profil),
    metallMaterial(karat.farbe, k.oberflaeche)
  );
  gruppe.add(koerper);

  // Bicolor-Mittelband
  if (k.bicolor) {
    const partner = LEGIERUNGEN[BICOLOR_PARTNER[k.legierung]];
    const pKarat = partner.karate[k.karat] || Object.values(partner.karate)[0];
    const band = new THREE.Mesh(
      bandGeometrie(ri, T, W, profil),
      metallMaterial(pKarat.farbe, k.oberflaeche)
    );
    band.material.side = THREE.DoubleSide;
    gruppe.add(band);
  }

  // Brillanten in der Aussenflaeche, mittig auf der Breite
  const anzahl = BESATZ[k.besatz].anzahl;
  if (anzahl > 0) {
    // Der Stein muss in die Wandstaerke passen, nicht nur auf die Breite:
    // ein 2-mm-Brillant in einer 1,8 mm starken Schiene gibt es nicht.
    const rStein = Math.min(W * 0.16, T * 0.42, 0.85);
    const { krone, pavillon } = brillantGeometrie(rStein);
    const rAussen = ri + profil.aussen(0, T);
    const schritt = (rStein * 2.4) / rAussen;   // Bogenmass zwischen den Steinen
    const start = -Math.PI / 2 - ((anzahl - 1) / 2) * schritt;

    const hoch = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < anzahl; i++) {
      const phi = start + i * schritt;
      const stein = new THREE.Group();
      stein.add(new THREE.Mesh(krone, BRILLANT_MATERIAL));
      stein.add(new THREE.Mesh(pavillon, BRILLANT_MATERIAL));
      // Die Steinachse (lokales +Y) auf die Flaechennormale drehen,
      // damit die Tafel buendig liegt und der Pavillon nach innen zeigt.
      const nach = new THREE.Vector3(Math.cos(phi), 0, Math.sin(phi));
      stein.quaternion.setFromUnitVectors(hoch, nach);
      // tief genug versenkt, dass nur die Krone aus der Flaeche schaut
      // Rundiste knapp unter der Oberflaeche, nur die Krone schaut heraus
      stein.position.copy(nach).multiplyScalar(rAussen - rStein * 0.30);
      gruppe.add(stein);
    }
  }

  // Innengravur
  if (k.gravur.trim()) {
    gruppe.add(gravurMesh(ri, W, k.gravur.trim()));
  }

  // Ring aufstellen: Lochachse zeigt zum Betrachter
  gruppe.rotation.x = Math.PI / 2;
  return gruppe;
}

/** Innengravur als halbtransparente Textur auf der Innenwand. */
function gravurMesh(ri, W, text) {
  const S = 2048, H = 256;
  const c = document.createElement('canvas');
  c.width = S; c.height = H;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, S, H);
  ctx.save();
  ctx.translate(S, 0);
  ctx.scale(-1, 1);              // Innenseite wird gespiegelt betrachtet
  ctx.fillStyle = 'rgba(40,34,26,0.62)';
  ctx.font = '600 92px Raleway, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.slice(0, 24), S / 2, H / 2);
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.CylinderGeometry(ri - 0.012, ri - 0.012, W * 0.9, 160, 1, true);
  const mat = new THREE.MeshBasicMaterial({
    map: tex, transparent: true, side: THREE.BackSide, depthWrite: false,
  });
  return new THREE.Mesh(geo, mat);
}

function paarNeuBauen() {
  if (!laeuft) return;
  ringBauen('eins');
  ringBauen('zwei');
  // Nebeneinander, jeder auf seinem tatsaechlichen Aussenradius stehend
  const rEins = zustand.eins.groesse / (2 * Math.PI) + zustand.eins.staerke;
  const rZwei = zustand.zwei.groesse / (2 * Math.PI) + zustand.zwei.staerke;
  ringe.eins.position.set(-(rEins + 1.8), rEins, 1.4);
  ringe.zwei.position.set(rZwei + 1.8, rZwei, -1.4);
  schattenSetzen(schatten.eins, -(rEins + 1.8), 1.4, rEins);
  schattenSetzen(schatten.zwei, rZwei + 1.8, -1.4, rZwei);
  kameraEinpassen(false);
}

/* ══════════════════════════════════════════════════════════════
   PREIS
   ══════════════════════════════════════════════════════════════ */

function ringPreis(seite) {
  const k = zustand[seite];
  const profil = PROFILE[k.profil];
  const leg = LEGIERUNGEN[k.legierung];
  const karat = leg.karate[k.karat] || Object.values(leg.karate)[0];

  const ri = k.groesse / (2 * Math.PI);
  const ra = ri + k.staerke;
  // Volumen des umschriebenen Rings, mit dem Fuellgrad des Profils
  const mm3 = Math.PI * (ra * ra - ri * ri) * k.breite * profil.volumen;
  const gramm = (mm3 / 1000) * karat.dichte;

  const material = gramm * (PREISE.grammpreis[k.karat] || PREISE.grammpreis['585']);
  const oberflaeche = OBERFLAECHEN[k.oberflaeche].aufpreis;
  const bicolor = k.bicolor ? PREISE.bicolor : 0;
  const steine = BESATZ[k.besatz].anzahl * PREISE.stein;
  const gravur = k.gravur.trim() ? PREISE.gravur : 0;

  const summe = PREISE.grundpreis + material + oberflaeche + bicolor + steine + gravur;
  return {
    gramm,
    posten: { material, grundpreis: PREISE.grundpreis, oberflaeche, bicolor, steine, gravur },
    summe: Math.round(summe / PREISE.rundung) * PREISE.rundung,
  };
}

const euro = (n) =>
  n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

/* ══════════════════════════════════════════════════════════════
   UI
   ══════════════════════════════════════════════════════════════ */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

/**
 * Baut eine Gruppe Auswahlknoepfe.
 * `schmuck(wert)` darf HTML vor das Label setzen — Farbpunkt der Legierung
 * oder Querschnitt-Piktogramm des Profils.
 */
function knopfGruppe(container, eintraege, aktuell, beiWahl, schmuck) {
  container.innerHTML = '';
  eintraege.forEach(([wert, label]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'kf-chip' + (wert === aktuell ? ' is-on' : '');
    b.setAttribute('aria-pressed', String(wert === aktuell));
    b.innerHTML = (schmuck ? schmuck(wert) : '') + '<span>' + label + '</span>';
    b.addEventListener('click', () => beiWahl(wert));
    container.appendChild(b);
  });
}

/**
 * Querschnittzeichnung zum aktuellen Ring. 3,5 mm und 6 mm Breite sind als
 * Zahl schwer zu greifen — als Zeichnung sofort. Der Massstab ist fest, die
 * Zeichnung waechst also mit den Maßen; Breite und Staerke stehen zueinander
 * im richtigen Verhaeltnis.
 *
 * NICHT in Originalgroesse: CSS-Pixel entsprechen keinem physischen Millimeter,
 * ein echter 3,5-mm-Schnitt waere nur ein Strich. Die Bildunterschrift sagt das.
 */
const MM = 26;   // px je Millimeter in der Zeichnung

function querschnittZeichnen(k) {
  const flaeche = $('#kfQuerschnitt');
  if (!flaeche) return;

  const profil = PROFILE[k.profil];
  const bx = k.breite * MM;
  const by = k.staerke * MM;
  const rand = 30;                       // Platz fuer Masslinien
  const w = 8 * MM + rand * 2;           // feste Buehne: max. Breite 8 mm
  const h = 2.4 * MM + rand * 2;
  const x0 = (w - bx) / 2;
  const y0 = (h - by) / 2;

  const pfad = querschnittPfad(profil, bx, by);
  const zahl = (n) => n.toFixed(1).replace('.', ',');

  flaeche.innerHTML =
    '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Querschnitt: ' +
      profil.label + ', ' + zahl(k.breite) + ' Millimeter breit, ' +
      zahl(k.staerke) + ' Millimeter stark">' +
      '<g transform="translate(' + x0.toFixed(2) + ' ' + y0.toFixed(2) + ')">' +
        '<path class="qs-koerper" d="' + pfad + '"/>' +
      '</g>' +
      // Massline Breite, unter dem Profil
      '<g class="qs-mass">' +
        '<line x1="' + x0 + '" y1="' + (y0 + by + 13) + '" x2="' + (x0 + bx) +
          '" y2="' + (y0 + by + 13) + '"/>' +
        '<line x1="' + x0 + '" y1="' + (y0 + by + 8) + '" x2="' + x0 +
          '" y2="' + (y0 + by + 18) + '"/>' +
        '<line x1="' + (x0 + bx) + '" y1="' + (y0 + by + 8) + '" x2="' + (x0 + bx) +
          '" y2="' + (y0 + by + 18) + '"/>' +
        '<text x="' + (w / 2) + '" y="' + (y0 + by + 28) + '" text-anchor="middle">' +
          zahl(k.breite) + ' mm</text>' +
      '</g>' +
      // Massline Staerke, rechts daneben
      '<g class="qs-mass">' +
        '<line x1="' + (x0 + bx + 13) + '" y1="' + y0 + '" x2="' + (x0 + bx + 13) +
          '" y2="' + (y0 + by) + '"/>' +
        '<line x1="' + (x0 + bx + 8) + '" y1="' + y0 + '" x2="' + (x0 + bx + 18) +
          '" y2="' + y0 + '"/>' +
        '<line x1="' + (x0 + bx + 8) + '" y1="' + (y0 + by) + '" x2="' + (x0 + bx + 18) +
          '" y2="' + (y0 + by) + '"/>' +
        '<text x="' + (x0 + bx + 23) + '" y="' + (y0 + by / 2 + 4) + '">' +
          zahl(k.staerke) + '</text>' +
      '</g>' +
    '</svg>';
}

/** Farbpunkt in der Legierungsfarbe — zeigt den Ton vor dem Klick. */
function metallPunkt(legierung, karat) {
  const leg = LEGIERUNGEN[legierung];
  const k = leg.karate[karat] || Object.values(leg.karate)[0];
  const hex = '#' + k.farbe.toString(16).padStart(6, '0');
  return '<i class="kf-punkt" style="background:' + hex + '" aria-hidden="true"></i>';
}

function setzen(feld, wert) {
  const seiten = zustand.gekoppelt && !NICHT_KOPPELN.includes(feld)
    ? ['eins', 'zwei']
    : [zustand.aktiv];
  seiten.forEach((s) => {
    const k = zustand[s];
    if (feld === 'karat') k.letztesKarat = wert;   // Wunsch merken
    k[feld] = wert;

    // Karat auf die Legierung abgleichen: Platin kennt nur 950, und wer
    // von dort zurueckwechselt, soll seinen Feingehalt wiederbekommen
    // statt stillschweigend beim billigsten zu landen.
    const leg = LEGIERUNGEN[k.legierung];
    if (!leg.karate[k.karat]) {
      k.karat = leg.karate[k.letztesKarat] ? k.letztesKarat
              : leg.karate['585'] ? '585'
              : Object.keys(leg.karate)[0];
    }
  });
  zeichnen();
}

function zeichnen() {
  const k = zustand[zustand.aktiv];
  const leg = LEGIERUNGEN[k.legierung];

  // Ringwahl
  $$('.kf-tab').forEach((t) => {
    const an = t.dataset.seite === zustand.aktiv;
    t.classList.toggle('is-on', an);
    t.setAttribute('aria-selected', String(an));
  });
  $('#kfKoppeln').checked = zustand.gekoppelt;

  // Legierung + Karat
  knopfGruppe(
    $('#kfLegierung'),
    Object.entries(LEGIERUNGEN).map(([w, v]) => [w, v.label]),
    k.legierung,
    (w) => setzen('legierung', w),
    (w) => metallPunkt(w, k.karat)
  );
  knopfGruppe(
    $('#kfKarat'),
    Object.entries(leg.karate).map(([w, v]) => [w, v.label]),
    k.karat,
    (w) => setzen('karat', w),
    (w) => metallPunkt(k.legierung, w)
  );
  $('#kfBicolor').checked = k.bicolor;
  $('#kfBicolorLabel').textContent =
    'Bicolor — Mittelband in ' + LEGIERUNGEN[BICOLOR_PARTNER[k.legierung]].label;

  // Profil
  knopfGruppe(
    $('#kfProfil'),
    Object.entries(PROFILE).map(([w, v]) => [w, v.label]),
    k.profil,
    (w) => setzen('profil', w),
    (w) => profilPiktogramm(PROFILE[w])
  );
  $('#kfProfilHinweis').textContent = PROFILE[k.profil].hinweis;

  // Masse
  $('#kfBreite').value = k.breite;
  $('#kfBreiteWert').textContent = k.breite.toFixed(1).replace('.', ',') + ' mm';
  $('#kfStaerke').value = k.staerke;
  $('#kfStaerkeWert').textContent = k.staerke.toFixed(1).replace('.', ',') + ' mm';
  querschnittZeichnen(k);

  // Oberflaeche
  knopfGruppe(
    $('#kfOberflaeche'),
    Object.entries(OBERFLAECHEN).map(([w, v]) => [w, v.label]),
    k.oberflaeche,
    (w) => setzen('oberflaeche', w)
  );

  // Besatz
  knopfGruppe(
    $('#kfBesatz'),
    Object.entries(BESATZ).map(([w, v]) => [w, v.label]),
    k.besatz,
    (w) => setzen('besatz', w)
  );

  // Groesse + Gravur
  $('#kfGroesse').value = k.groesse;
  $('#kfGroesseWert').textContent = 'Größe ' + k.groesse;
  $('#kfGravur').value = k.gravur;

  paarNeuBauen();
  preisZeichnen();
  inAdresse();
}

function preisZeichnen() {
  const pEins = ringPreis('eins');
  const pZwei = ringPreis('zwei');
  $('#kfPreisEins').textContent = euro(pEins.summe);
  $('#kfPreisZwei').textContent = euro(pZwei.summe);
  $('#kfPreisPaar').textContent = euro(pEins.summe + pZwei.summe);
  $('#kfGewichtEins').textContent = pEins.gramm.toFixed(1).replace('.', ',') + ' g';
  $('#kfGewichtZwei').textContent = pZwei.gramm.toFixed(1).replace('.', ',') + ' g';
  $('#kfZusammenfassung').textContent = zusammenfassung();
}

function ringText(seite) {
  const k = zustand[seite];
  const leg = LEGIERUNGEN[k.legierung];
  const karat = leg.karate[k.karat] || Object.values(leg.karate)[0];
  const teile = [
    leg.label + ' ' + karat.label.split(' / ')[0],
    k.bicolor ? 'Bicolor mit ' + LEGIERUNGEN[BICOLOR_PARTNER[k.legierung]].label : null,
    PROFILE[k.profil].label,
    k.breite.toFixed(1).replace('.', ',') + ' mm breit',
    k.staerke.toFixed(1).replace('.', ',') + ' mm stark',
    OBERFLAECHEN[k.oberflaeche].label,
    BESATZ[k.besatz].label,
    'Größe ' + k.groesse,
    k.gravur.trim() ? 'Gravur: „' + k.gravur.trim() + '“' : null,
  ].filter(Boolean);
  return teile.join(' · ');
}

function zusammenfassung(mitLink) {
  const pEins = ringPreis('eins').summe;
  const pZwei = ringPreis('zwei').summe;
  const text =
    'Trauring-Konfiguration Juwelier Damla\n\n' +
    'Ring 1: ' + ringText('eins') + '\n' +
    'Ring 2: ' + ringText('zwei') + '\n\n' +
    'Richtwert Paarpreis: ' + euro(pEins + pZwei) +
    ' (' + euro(pEins) + ' + ' + euro(pZwei) + ') — unverbindlich';
  return mitLink ? text + '\n\nZur Ansicht: ' + location.href : text;
}

/* ── Bedienung ────────────────────────────────────────────── */

function uiVerdrahten() {
  $$('.kf-tab').forEach((t) => {
    t.addEventListener('click', () => { zustand.aktiv = t.dataset.seite; zeichnen(); });
  });

  $('#kfKoppeln').addEventListener('change', (e) => {
    zustand.gekoppelt = e.target.checked;
    if (zustand.gekoppelt) {
      // aktive Seite gibt den gemeinsamen Nenner vor
      const quelle = zustand[zustand.aktiv];
      const ziel = zustand[zustand.aktiv === 'eins' ? 'zwei' : 'eins'];
      Object.keys(quelle).forEach((f) => {
        if (!NICHT_KOPPELN.includes(f)) ziel[f] = quelle[f];
      });
    }
    zeichnen();
  });

  $('#kfBicolor').addEventListener('change', (e) => setzen('bicolor', e.target.checked));
  $('#kfBreite').addEventListener('input', (e) => setzen('breite', parseFloat(e.target.value)));
  $('#kfStaerke').addEventListener('input', (e) => setzen('staerke', parseFloat(e.target.value)));
  $('#kfGroesse').addEventListener('input', (e) => setzen('groesse', parseInt(e.target.value, 10)));
  $('#kfGravur').addEventListener('input', (e) => setzen('gravur', e.target.value.slice(0, 24)));

  const bildKnopf = $('#kfBild');
  if (bildKnopf) {
    // Ohne 3D gibt es kein Bild zu sichern — dann den Knopf gar nicht anbieten.
    if (!laeuft) bildKnopf.hidden = true;
    else bildKnopf.addEventListener('click', bildSpeichern);
  }

  $('#kfKopieren').addEventListener('click', async () => {
    const btn = $('#kfKopieren');
    try {
      await navigator.clipboard.writeText(zusammenfassung(true));
      btn.textContent = 'Kopiert ✓';
    } catch (e) {
      btn.textContent = 'Bitte manuell markieren';
    }
    setTimeout(() => { btn.textContent = 'Konfiguration kopieren'; }, 2400);
  });

  $('#kfWhatsapp').addEventListener('click', () => {
    const url = 'https://wa.me/496115807830?text=' + encodeURIComponent(zusammenfassung(true));
    window.open(url, '_blank', 'noopener');
  });

  $('#kfMail').addEventListener('click', () => {
    const betreff = 'Trauring-Anfrage über den Konfigurator';
    window.location.href =
      'mailto:?subject=' + encodeURIComponent(betreff) +
      '&body=' + encodeURIComponent(zusammenfassung(true));
  });

  $('#kfReset').addEventListener('click', () => {
    zustand.eins = Object.assign(standard(), { breite: 3.5, besatz: 'drei', groesse: 54 });
    zustand.zwei = Object.assign(standard(), { breite: 5.5, besatz: 'ohne', groesse: 62 });
    zustand.gekoppelt = true;
    zustand.aktiv = 'eins';
    zeichnen();
  });

  // Ringgroessen-Skala beschriften
  const liste = $('#kfGroessenListe');
  RINGGROESSEN.filter((g) => g % 4 === 0).forEach((g) => {
    const o = document.createElement('option');
    o.value = String(g);
    liste.appendChild(o);
  });
}

/* ── Start ────────────────────────────────────────────────── */

ausAdresse();          // geteilten Link uebernehmen, falls vorhanden

if (!webglVerfuegbar()) {
  hinweisWebgl.hidden = false;
  buehne.hidden = true;
  uiVerdrahten();
  // Preis, Zusammenfassung und Anfrage funktionieren auch ohne 3D
  zeichnen();
} else {
  szeneAufbauen();
  uiVerdrahten();
  zeichnen();
}
