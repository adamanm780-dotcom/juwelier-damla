/** Engraved lettering as real metal relief instead of printed ink.
 * A white-on-black mask (letters = 1) becomes a groove height field, from which a tangent-space
 * normal map (lit groove walls), roughness (frosted laser floor or polished diamond cut) and
 * ambient/specular occlusion (darker groove floor) are derived. The overlay uses the ring's own
 * alloy and optics, so only the grooves differ from the polished bore around them. */
import * as THREE from 'three';

// Groove character per engraving type: wall softness (px), relief strength, floor roughness, occlusion and
// floorTone (reflectance left on the laser-frosted floor; a diamond cut stays mirror bright).
const STYLE = {
 laser: {walls: [1, 1], strength: 2.8, floorRough: .66, edgeRough: .38, occlusion: .62, floorTone: .62},
 diamond: {walls: [2, 2], strength: 3.2, floorRough: .06, edgeRough: .04, occlusion: .4, floorTone: .8}
};

function boxBlur(src, w, h, r) {
 if (r < 1) return src;
 const tmp = new Float32Array(w * h), out = new Float32Array(w * h), n = 2 * r + 1;
 for (let y = 0; y < h; y++) {
  let s = 0; const row = y * w;
  for (let x = -r; x <= r; x++) s += src[row + Math.min(w - 1, Math.max(0, x))];
  for (let x = 0; x < w; x++) {
   tmp[row + x] = s / n;
   s += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
  }
 }
 for (let x = 0; x < w; x++) {
  let s = 0;
  for (let y = -r; y <= r; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
  for (let y = 0; y < h; y++) {
   out[y * w + x] = s / n;
   s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
  }
 }
 return out;
}

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

/** Build (or rebuild after the mask changed) the relief maps of a mask canvas. */
export function engravingMaps(mask, type = 'laser', maps = null) {
 const style = STYLE[type] || STYLE.laser, w = mask.width, h = mask.height;
 const pixels = mask.getContext('2d').getImageData(0, 0, w, h).data, m = new Float32Array(w * h);
 for (let i = 0; i < w * h; i++) m[i] = pixels[i * 4] / 255;
 let depth = m;
 for (const r of style.walls) depth = boxBlur(depth, w, h, r);
 if (!maps) maps = {normal: canvas(w, h), orm: canvas(w, h), alpha: canvas(w, h), tone: canvas(w, h)};
 const nc = maps.normal.getContext('2d'), oc = maps.orm.getContext('2d'), ac = maps.alpha.getContext('2d'), tc = maps.tone.getContext('2d');
 const ni = nc.createImageData(w, h), oi = oc.createImageData(w, h), ai = ac.createImageData(w, h), ti = tc.createImageData(w, h);
 const at = (x, y) => depth[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
 for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const i = y * w + x, d = depth[i], o = i * 4;
  // Height = -depth. Texture v runs up the canvas (flipY), so the v gradient uses the row above.
  const du = (at(x + 1, y) - at(x - 1, y)) * .5 * style.strength, dv = (at(x, y - 1) - at(x, y + 1)) * .5 * style.strength;
  const l = Math.hypot(du, dv, 1);
  ni.data[o] = (du / l * .5 + .5) * 255; ni.data[o + 1] = (dv / l * .5 + .5) * 255; ni.data[o + 2] = (1 / l * .5 + .5) * 255; ni.data[o + 3] = 255;
  const wall = Math.min(1, Math.hypot(du, dv) * 1.5);
  oi.data[o] = (1 - style.occlusion * d) * 255;
  oi.data[o + 1] = (style.edgeRough + (style.floorRough - style.edgeRough) * (1 - wall)) * 255;
  oi.data[o + 2] = 0; oi.data[o + 3] = 255;
  const a = Math.min(1, d * 3) * 255; ai.data[o] = ai.data[o + 1] = ai.data[o + 2] = a; ai.data[o + 3] = 255;
  const tone = (1 - (1 - style.floorTone) * d) * 255; ti.data[o] = ti.data[o + 1] = ti.data[o + 2] = tone; ti.data[o + 3] = 255;
 }
 nc.putImageData(ni, 0, 0); oc.putImageData(oi, 0, 0); ac.putImageData(ai, 0, 0); tc.putImageData(ti, 0, 0);
 if (!maps.textures) {
  maps.textures = {normal: new THREE.CanvasTexture(maps.normal), orm: new THREE.CanvasTexture(maps.orm), alpha: new THREE.CanvasTexture(maps.alpha), tone: new THREE.CanvasTexture(maps.tone)};
  for (const t of Object.values(maps.textures)) t.colorSpace = THREE.NoColorSpace;
 } else for (const t of Object.values(maps.textures)) t.needsUpdate = true;
 return maps;
}

/** Metal overlay for the engraving; color = linear alloy F0 of the band. */
export function engravedMetal(color, maps, anisotropy = 8) {
 for (const t of Object.values(maps.textures)) t.anisotropy = anisotropy;
 return new THREE.MeshPhysicalMaterial({
  color, map: maps.textures.tone, metalness: 1, roughness: 1, roughnessMap: maps.textures.orm, aoMap: maps.textures.orm, aoMapIntensity: 1,
  normalMap: maps.textures.normal, alphaMap: maps.textures.alpha, transparent: true, depthWrite: false,
  polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1
 });
}

/** Turn an outward-facing surface of revolution into one whose front faces look into the bore,
 * so lighting, normal maps and the bore optics all see the inner side directly. */
export function faceInward(geometry) {
 const index = geometry.index, n = geometry.attributes.normal;
 for (let i = 0; i < index.count; i += 3) { const b = index.getX(i + 1); index.setX(i + 1, index.getX(i + 2)); index.setX(i + 2, b); }
 for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
 index.needsUpdate = n.needsUpdate = true;
 return geometry;
}
