/* ══════════════════════════════════════════════════════════════
   Shop-3D — Juwelier Damla
   ──────────────────────────────────────────────────────────────
   Schlanke Fassung der Ringdarstellung aus konfigurator.js: dieselben
   Profilfunktionen, dasselbe PBR-Metall, dieselbe Studio-Umgebung —
   aber ohne Bedienfeld und Preisrechnung. Der Shop braucht nur zwei
   Dinge: einen Ring zeigen und ihn drehen.

   Exporte:
     ringSpec(...)   Stammdaten eines Modells -> Bauplan
     Ansicht         ein WebGL-Fenster, das einen Bauplan zeigt
   ══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { OrbitControls } from 'three/OrbitControls.js';
import { RoomEnvironment } from 'three/RoomEnvironment.js';

/* Basisfarben fuer metalness = 1 (585er Toene). */
export const LEGIERUNG = {
  gelbgold:  0xe2be79,
  weissgold: 0xe4e5e8,
  rotgold:   0xdfa77f,
};

/* aussen(t)/innen(t): radialer Abstand zur Innenkante, t von -1 bis 1. */
const PROFILE = {
  flach:    { aussen: (t, T) => T - 0.04 * T * Math.pow(Math.abs(t), 8), innen: () => 0 },
  bombiert: { aussen: (t, T) => T - 0.30 * T * t * t,                    innen: () => 0 },
  oval:     { aussen: (t, T) => T - 0.40 * T * t * t,                    innen: (t, T) => 0.20 * T * t * t },
  kantig:   { aussen: (t, T) => { const a = Math.abs(t), k = 0.72;
                                  return a <= k ? T : T - 0.34 * T * ((a - k) / (1 - k)); },
              innen: () => 0 },
};

const OBERFLAECHE = {
  poliert:    { rauheit: 0.05, textur: null },
  seidenmatt: { rauheit: 0.34, textur: 'feinkorn' },
  laengsmatt: { rauheit: 0.28, textur: 'buerste' },
};

/* ── Geometrie ───────────────────────────────────────────────── */

function ringGeometrie(ri, T, W, profil) {
  const N = 64;
  const er = Math.min(0.13, T * 0.26, W * 0.12);
  const tf = 1 - (2 * er) / W;
  const y = (t) => (t * W) / 2;
  const rA = (t) => ri + profil.aussen(t, T);
  const rI = (t) => ri + profil.innen(t, T);
  const pts = [];
  for (let i = 0; i <= N; i++) { const t = -1 + (2 * i) / N; pts.push(new THREE.Vector2(rI(t), y(t))); }
  const rOben = rA(tf);
  pts.push(new THREE.Vector2(rOben - er, y(1)));
  for (let i = 1; i <= 14; i++) {
    const a = (Math.PI / 2) * (1 - i / 14);
    pts.push(new THREE.Vector2(rOben - er * (1 - Math.cos(a)), y(tf) + er * Math.sin(a)));
  }
  for (let i = 0; i <= N; i++) { const t = tf - (2 * tf * i) / N; pts.push(new THREE.Vector2(rA(t), y(t))); }
  const rUnten = rA(-tf);
  for (let i = 1; i <= 14; i++) {
    const a = (Math.PI / 2) * (i / 14);
    pts.push(new THREE.Vector2(rUnten - er * (1 - Math.cos(a)), y(-tf) - er * Math.sin(a)));
  }
  pts.push(new THREE.Vector2(rI(-1), y(-1)));
  const geo = new THREE.LatheGeometry(pts, 320);
  geo.computeVertexNormals();
  return geo;
}

/* Duenne Aussenhaut als Zweitmetall — `spanne` ist der Anteil der Breite. */
function bandGeometrie(ri, T, W, profil, spanne, mitte) {
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = mitte - spanne + (2 * spanne * i) / 24;
    pts.push(new THREE.Vector2(ri + profil.aussen(t, T) + 0.02, (t * W) / 2));
  }
  return new THREE.LatheGeometry(pts, 192);
}

function brillantGeometrie(r) {
  const d = r * 2;
  const krone = new THREE.CylinderGeometry(r * 0.56, r, d * 0.16, 16, 1);
  krone.translate(0, d * 0.08, 0);
  const pavillon = new THREE.ConeGeometry(r, d * 0.43, 16, 1);
  pavillon.rotateX(Math.PI);
  pavillon.translate(0, -d * 0.215, 0);
  return { krone, pavillon };
}

/* ── Material ────────────────────────────────────────────────── */

const texturCache = new Map();
let maxAniso = 1;

function rauheitsMap(art) {
  const key = 'r-' + art;
  if (texturCache.has(key)) return texturCache.get(key);
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const bild = ctx.createImageData(S, S);
  const d = bild.data;
  for (let yy = 0; yy < S; yy++) {
    for (let xx = 0; xx < S; xx++) {
      const i = (yy * S + xx) * 4;
      const v = art === 'feinkorn'
        ? 200 + Math.random() * 55
        : 190 + Math.sin(yy * 2.3) * 12 + Math.random() * 45;
      d[i] = d[i + 1] = d[i + 2] = Math.max(0, Math.min(255, v));
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(bild, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(art === 'buerste' ? 1 : 8, art === 'buerste' ? 10 : 3);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = maxAniso;
  texturCache.set(key, tex);
  return tex;
}

function metall(farbe, oberflaeche) {
  const o = OBERFLAECHE[oberflaeche] || OBERFLAECHE.poliert;
  const m = new THREE.MeshPhysicalMaterial({
    color: farbe,
    metalness: 1.0,
    roughness: Math.max(0.08, o.rauheit),
    envMapIntensity: 1.55,
    clearcoat: o.textur ? 0.0 : 0.45,
    clearcoatRoughness: 0.08,
  });
  if (o.textur) m.roughnessMap = rauheitsMap(o.textur);
  return m;
}

const BRILLANT = new THREE.MeshPhysicalMaterial({
  color: 0xf2f6fb, metalness: 0, roughness: 0, ior: 2.42,
  specularIntensity: 1, clearcoat: 1, clearcoatRoughness: 0,
  envMapIntensity: 6, flatShading: true,
});

/* ── Bauplan ─────────────────────────────────────────────────── */

/**
 * Bauplan eines Rings. Alles in Millimetern.
 * @param {object} s
 *   legierung   gelbgold | weissgold | rotgold
 *   profil      flach | bombiert | oval | kantig
 *   breite      mm
 *   staerke     mm
 *   oberflaeche poliert | seidenmatt | laengsmatt
 *   band        { legierung, spanne, oberflaeche } — Zweitmetall aussen, optional
 *   steine      { anteil (0..1), lage: 'mitte'|'rand' } — Memoire, optional
 *   groesse     Innenumfang mm (Standard 54)
 */
export function ringSpec(s) {
  return Object.assign({ groesse: 54, staerke: 1.7, profil: 'bombiert',
                         oberflaeche: 'poliert', breite: 5 }, s);
}

function ringBauen(spec) {
  const g = new THREE.Group();
  const profil = PROFILE[spec.profil] || PROFILE.bombiert;
  const ri = spec.groesse / (2 * Math.PI);
  const T = spec.staerke, W = spec.breite;

  g.add(new THREE.Mesh(ringGeometrie(ri, T, W, profil),
                       metall(LEGIERUNG[spec.legierung] || LEGIERUNG.gelbgold, spec.oberflaeche)));

  if (spec.band) {
    const b = spec.band;
    g.add(new THREE.Mesh(bandGeometrie(ri, T, W, profil, b.spanne || 0.3, b.mitte || 0),
                         metall(LEGIERUNG[b.legierung] || LEGIERUNG.weissgold, b.oberflaeche || 'poliert')));
  }

  if (spec.steine && spec.steine.anteil > 0) {
    const t = spec.steine.lage === 'rand' ? 0.5 : 0;
    const rStein = Math.min((W * (1 - Math.abs(t))) / 2 - 0.05, T * 0.42, 0.85);
    if (rStein > 0.12) {
      const y = (t * W) / 2;
      const rA = ri + profil.aussen(t, T);
      const h = 0.01;
      const dr = (profil.aussen(t + h, T) - profil.aussen(t - h, T)) / (2 * h);
      const len = Math.hypot(W / 2, dr) || 1;
      const nR = (W / 2) / len, nY = -dr / len;
      const abstand = rStein * 2.6;
      const n = Math.max(1, Math.floor((spec.steine.anteil * 2 * Math.PI * rA) / abstand));
      const schritt = spec.steine.anteil >= 1 ? (2 * Math.PI) / n : abstand / rA;
      const start = spec.steine.anteil >= 1 ? -Math.PI / 2 : -Math.PI / 2 - ((n - 1) / 2) * schritt;
      const { krone, pavillon } = brillantGeometrie(rStein);
      const senke = rStein * 0.44;
      for (let i = 0; i < n; i++) {
        const phi = start + i * schritt;
        const stein = new THREE.Group();
        stein.add(new THREE.Mesh(krone, BRILLANT), new THREE.Mesh(pavillon, BRILLANT));
        // In die Flaechennormale kippen, dann auf den Umfang setzen
        const r = rA - senke * nR;
        stein.position.set(Math.cos(phi) * r, y - senke * nY, Math.sin(phi) * r);
        const normale = new THREE.Vector3(Math.cos(phi) * nR, nY, Math.sin(phi) * nR).normalize();
        stein.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normale);
        g.add(stein);
      }
    }
  }

  // Die Lathe-Achse ist Y. Um X gekippt zeigt die Achse zur Kamera (+Z):
  // der Ring steht wie ein Rad und man sieht von vorn den Kreis, aus dem
  // Dreiviertelblick das Profil. Um Z gekippt saehe man ihn von der Kante.
  g.rotation.x = Math.PI / 2;
  g.position.y = ri + T;
  return g;
}

function entsorgen(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material && o.material !== BRILLANT) o.material.dispose();
  });
}

/* ── Ansicht ─────────────────────────────────────────────────── */

export function webglVerfuegbar() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}

/**
 * Ein WebGL-Fenster. Zeichnet nur, wenn es im Bild ist — sonst frisst
 * ein Ring, den niemand sieht, den Akku leer.
 */
export class Ansicht {
  constructor(el, opt = {}) {
    this.el = el;
    this.opt = Object.assign({ interaktiv: true, autoRotate: true, fov: 40 }, opt);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    el.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.02).texture;

    this.camera = new THREE.PerspectiveCamera(this.opt.fov, 1, 1, 400);
    const key = new THREE.DirectionalLight(0xfff6e8, 1.35); key.position.set(-18, 26, 34);
    const fill = new THREE.DirectionalLight(0xfffaf2, 0.55); fill.position.set(26, 8, 20);
    const rim = new THREE.DirectionalLight(0xffffff, 0.85);  rim.position.set(10, 14, -30);
    this.scene.add(key, fill, rim);

    this.wurzel = new THREE.Group();      // Drehung von aussen (Scroll)
    this.scene.add(this.wurzel);
    this.ring = null;
    this.ziel = new THREE.Vector3(0, 0, 0);

    if (this.opt.interaktiv) {
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.08;
      this.controls.enablePan = false;
      this.controls.enableZoom = false;
      this.controls.minPolarAngle = Math.PI * 0.2;
      this.controls.maxPolarAngle = Math.PI * 0.62;
      this.controls.autoRotate = this.opt.autoRotate;
      this.controls.autoRotateSpeed = 0.9;
      this.letzteBeruehrung = 0;
      this.controls.addEventListener('start', () => { this.letzteBeruehrung = performance.now(); });
    }

    this.sichtbar = false;
    this.beob = new IntersectionObserver((e) => {
      this.sichtbar = e[0].isIntersecting;
      if (this.sichtbar) this.start();
    }, { rootMargin: '80px' });
    this.beob.observe(el);
    new ResizeObserver(() => this.groesse()).observe(el);
    this.groesse();
    this.tick = this.tick.bind(this);
    this.laeuft = false;
  }

  groesse() {
    const w = this.el.clientWidth, h = this.el.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.einpassen();
  }

  /* Kamera so weit weg, dass der Ring mit Luft ins Bild passt. */
  einpassen() {
    if (!this.ring) return;
    const r = this.ring.userData.radius;
    const fovY = THREE.MathUtils.degToRad(this.camera.fov);
    const fovX = 2 * Math.atan(Math.tan(fovY / 2) * this.camera.aspect);
    const d = Math.max(r / Math.tan(fovX / 2), r / Math.tan(fovY / 2)) * (this.opt.luft || 1.55);
    // Die Blickrichtung aus der ALTEN Zielposition ableiten: wird das Ziel
    // erst gesetzt und dann die Richtung aus Kamera minus Ziel gebildet,
    // ist die Richtung beim ersten Mal (0, -r, 0) — die Kamera landet
    // senkrecht unter dem Ring und sieht ihn von der Kante.
    const richtung = this.camera.position.clone().sub(this.ziel);
    this.ziel.set(0, r, 0);
    if (!this.ausgerichtet) {
      // Erste Blickrichtung: frontal, kaum erhoeht — von oben sieht man
      // vor allem die Innenwand und der Ring wirkt wie eine Huelse.
      richtung.set(0.0, 0.08, 1);
      this.ausgerichtet = true;
    }
    this.camera.position.copy(this.ziel).add(richtung.normalize().multiplyScalar(d));
    this.camera.lookAt(this.ziel);
    if (this.controls) { this.controls.target.copy(this.ziel); this.controls.update(); }
  }

  zeige(spec) {
    if (this.ring) { this.wurzel.remove(this.ring); entsorgen(this.ring); }
    this.ring = ringBauen(spec);
    this.ring.userData.radius = spec.groesse / (2 * Math.PI) + spec.staerke;
    this.wurzel.add(this.ring);
    this.spec = spec;
    this.einpassen();
    this.start();
  }

  /* Legierung wechseln, ohne die Geometrie neu zu bauen — nur die Farbe
     laeuft ueber ein paar Bilder in den neuen Ton. */
  legierung(name) {
    if (!this.ring) return;
    const zielFarbe = new THREE.Color(LEGIERUNG[name] || LEGIERUNG.gelbgold);
    const m = this.ring.children[0].material;
    this.farbZiel = zielFarbe;
    this.farbVon = m.color.clone();
    this.farbStart = performance.now();
    this.spec.legierung = name;
    this.start();
  }

  /* Drehung von aussen, 0..1 — fuer den Scroll. */
  drehung(p) {
    // Schwenk von -23 auf +49 Grad: der Kreis bleibt immer sichtbar und
    // dreht durch den Dreiviertelblick. Ueber 90 Grad hinaus staende der
    // Ring als Strich von der Kante da.
    // Symmetrisch um die Frontale, ±29 Grad: Gelbgold schraeg von links,
    // Weissgold frontal, Rotgold schraeg von rechts. Die Kamera selbst
    // steht mittig, nur leicht erhoeht — sonst addieren sich beide Winkel
    // und der Ring wirkt an den Enden wie ein Armreif.
    this.wurzel.rotation.y = -0.6 + p * 1.2;
    this.wurzel.rotation.x = 0.05 + p * 0.06;
    this.start();
  }

  start() {
    if (this.laeuft) return;
    this.laeuft = true;
    requestAnimationFrame(this.tick);
  }

  tick() {
    if (!this.sichtbar) { this.laeuft = false; return; }
    let weiter = false;
    if (this.farbZiel && this.ring) {
      const t = Math.min(1, (performance.now() - this.farbStart) / 420);
      const e = 1 - Math.pow(1 - t, 3);
      this.ring.children[0].material.color.copy(this.farbVon).lerp(this.farbZiel, e);
      if (t < 1) weiter = true; else this.farbZiel = null;
    }
    if (this.controls) {
      // Nach kurzer Ruhe dreht es von selbst weiter
      this.controls.autoRotate = this.opt.autoRotate && performance.now() - this.letzteBeruehrung > 2200;
      this.controls.update();
      weiter = true;
    }
    this.renderer.render(this.scene, this.camera);
    if (!this.bereit) { this.bereit = true; this.el.classList.add('is-bereit'); }
    if (weiter) requestAnimationFrame(this.tick); else this.laeuft = false;
  }
}
