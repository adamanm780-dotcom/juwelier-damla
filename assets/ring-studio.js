/** Procedural jewellery photo studio, rendered on the GPU in scene-linear HDR.
 * Flat softboxes are evaluated in gnomonic (panel) coordinates, so they appear
 * exactly as rectangular diffusers would (curved strips are measured on the sphere instead);
 * black flags subtract light and give polished metal its defining dark contours.
 * No image download, no third-party HDRI. */
import * as THREE from 'three';

const MAX_PANELS = 16;
const rad = THREE.MathUtils.degToRad;

/** Angles in degrees. az 0 = behind the camera (+z), az 90 = right (+x), el 90 = zenith.
 * w/h = angular panel size, soft = edge feather (fraction of the smaller half size),
 * falloff = centre-to-edge brightness drop of the diffusion fabric, roll = panel rotation,
 * grad = vertical diffusion ramp (+ = brighter at the top edge), fade = share of the long half-length over which
 * the ends fade out (graded strip boxes and cards have no hard ends; flags take grad/fade too),
 * core = [strength, width] brighter centre line along a strip box's long axis (width in half-widths),
 * band = true: a curved strip that follows the horizon, w/h measured in azimuth/elevation (panels and flags).
 * nadir = [sine of the depression angle where the sweep enters the piece's own shadow, light left there]. */
export const METAL_STUDIO = {
 // Strip-light jewellery set: a lit tent with a seamless sweep, a key side (left) of five tall strip boxes and a fill
 // side (right) of two strips plus one broad graded box, long low strips for the bore, a curved overhead strip, and
 // soft black cards between the strips. Graded diffusion and fading ends keep every reflection soft-edged.
 sky: [.38, .38, .38], horizon: [.17, .167, .162], floor: [.8, .78, .74], floorEdge: .1, skyCurve: .6, nadir: [.4, .42],
 panels: [
  {az: 180, el: 66, w: 110, h: 60, i: 1.4, soft: .6, falloff: .5, color: [1, .99, .975]},
  {band: 1, az: 180, el: 48, w: 210, h: 7, i: 2.0, soft: .5, falloff: .2, fade: .3, color: [1, .99, .975]},
  {az: 34, el: -8, w: 10, h: 100, i: 1.6, soft: .6, falloff: .3, grad: .3, fade: .35, core: [.4, .35], color: [.99, .99, 1]},
  {az: 57, el: -14, w: 11, h: 116, i: 3.8, soft: .45, falloff: .25, grad: .25, fade: .3, core: [.4, .35], color: [.99, .99, 1]},
  {az: 102, el: 8, w: 28, h: 84, i: 2.8, soft: .45, falloff: .6, grad: .3, fade: .3, core: [.7, .22], color: [.99, .99, 1]},
  {az: 146, el: 8, w: 7, h: 70, i: 2.2, soft: .5, falloff: .2, grad: .25, fade: .3, color: [1, .98, .95]},
  {az: -40, el: -20, w: 6, h: 92, i: 2.6, soft: .5, falloff: .2, grad: .25, fade: .35, core: [.4, .35], color: [1, .98, .955]},
  {az: -60, el: -10, w: 15, h: 112, i: 3.4, soft: .55, falloff: .3, grad: .25, fade: .3, core: [.4, .35], color: [1, .98, .955]},
  {az: -94, el: 2, w: 9, h: 88, i: 3.5, soft: .5, falloff: .2, grad: .25, fade: .3, core: [.4, .35], color: [1, .98, .955]},
  {az: -115, el: 2, w: 12, h: 92, i: 3.9, soft: .45, falloff: .25, grad: .25, fade: .3, core: [.4, .35], color: [1, .98, .955]},
  {az: -146, el: 2, w: 7, h: 80, i: 2.6, soft: .5, falloff: .2, grad: .25, fade: .3, core: [.4, .35], color: [1, .98, .95]},
  {band: 1, az: 180, el: 9, w: 80, h: 12, i: 1.4, soft: .6, falloff: .3, fade: .3, color: [1, .985, .96]},
  {az: -20, el: 4, w: 18, h: 34, i: 1.0, soft: .7, falloff: .3, color: [1, .985, .96]},
  {az: 20, el: 4, w: 18, h: 34, i: 1.0, soft: .7, falloff: .3, color: [1, .985, .96]}
 ],
 flags: [
  {az: 76, el: 4, w: 10, h: 84, dark: .42, soft: .8, fade: .3},
  {az: -77, el: 4, w: 10, h: 84, dark: .46, soft: .8, fade: .3},
  {az: -131, el: 4, w: 9, h: 76, dark: .38, soft: .8, fade: .3},
  {az: -163, el: 10, w: 12, h: 60, dark: .5, soft: .7, fade: .35},
  {az: 165, el: 10, w: 14, h: 60, dark: .5, soft: .7, fade: .35},
  {az: 0, el: 14, w: 16, h: 12, dark: .9, soft: .5}
 ]
};

/** Diamonds need small, very bright sources on a dark room for crisp facet contrast and fire. */
export const DIAMOND_STUDIO = {
 sky: [.03, .03, .033], horizon: [.01, .01, .011], floor: [.10, .095, .09], floorEdge: .05, skyCurve: 1,
 panels: [
  {az: 0, el: 40, w: 40, h: 22, i: 16, soft: .25, falloff: .3, color: [1, 1, 1]},
  {az: 0, el: 70, w: 50, h: 30, i: 20, soft: .25, falloff: .3, color: [1, .99, .98]},
  {az: -60, el: 30, w: 16, h: 44, i: 21.6, soft: .2, falloff: .3, color: [1, .98, .96]},
  {az: 60, el: 30, w: 16, h: 44, i: 21.6, soft: .2, falloff: .3, color: [.97, .99, 1]},
  {az: -120, el: 40, w: 22, h: 22, i: 12, soft: .2, falloff: .2, color: [1, 1, 1]},
  {az: 120, el: 40, w: 22, h: 22, i: 12, soft: .2, falloff: .2, color: [1, 1, 1]},
  {az: 180, el: 12, w: 40, h: 18, i: 9, soft: .25, falloff: .2, color: [1, 1, 1]},
  {az: -30, el: -8, w: 20, h: 8, i: 5, soft: .3, falloff: .2, color: [1, .98, .95]},
  {az: 30, el: -8, w: 20, h: 8, i: 5, soft: .3, falloff: .2, color: [1, .98, .95]}
 ],
 flags: [{az: 0, el: 0, w: 16, h: 16, dark: .97, soft: .35}]
};

const vertexShader = `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const fragmentShader = `precision highp float;
#define MAX_PANELS ${MAX_PANELS}
uniform vec3 sky; uniform vec3 horizon; uniform vec3 floorColor; uniform float floorEdge; uniform float skyCurve; uniform vec2 nadir;
uniform int panelCount; uniform vec4 panelDir[MAX_PANELS]; uniform vec4 panelShape[MAX_PANELS]; uniform vec4 panelColor[MAX_PANELS]; uniform vec4 panelExtra[MAX_PANELS];
uniform int flagCount; uniform vec4 flagDir[MAX_PANELS]; uniform vec4 flagShape[MAX_PANELS]; uniform vec4 flagExtra[MAX_PANELS];
varying vec3 vDir;
float rbox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
// Returns coverage (0..1), normalised radius and the normalised panel coordinates (-1..1 inside).
// shape.z < 0 marks a curved strip that follows the horizon (extent measured on the sphere).
vec4 panel(vec3 d, vec4 dirRoll, vec4 shape){
 vec3 n = dirRoll.xyz; bool band = shape.z < 0.0;
 float c = dot(d, n); if(!band && c <= 0.0) return vec4(0.0, 1.0, 0.0, 0.0);
 vec2 p = vec2(0.0);
 if(band){
  vec2 hd = dot(d.xz, d.xz) > 1e-10 ? d.xz : vec2(0.0, 1.0), hn = dot(n.xz, n.xz) > 1e-10 ? n.xz : vec2(0.0, 1.0);
  float el0 = asin(clamp(n.y, -1.0, 1.0));
  float da = mod(atan(hd.x, hd.y) - atan(hn.x, hn.y) + 3.14159265, 6.28318531) - 3.14159265;
  p = vec2(da * cos(el0), asin(clamp(d.y, -1.0, 1.0)) - el0);
 } else {
  vec3 upRef = abs(n.y) > .98 ? vec3(0.0, 0.0, -1.0) : vec3(0.0, 1.0, 0.0);
  vec3 r = normalize(cross(upRef, n)), u = cross(n, r);
  p = vec2(dot(d, r), dot(d, u)) / c;
  float cr = cos(dirRoll.w), sr = sin(dirRoll.w); p = mat2(cr, -sr, sr, cr) * p;
 }
 vec2 half_ = shape.xy; float m = min(half_.x, half_.y), feather = max(1e-4, abs(shape.z) * m);
 float sd = rbox(p, half_, m * .35);
 float cover = 1.0 - smoothstep(-feather, feather, sd);
 vec2 q = p / half_; float radius = clamp(dot(q, q) * .5, 0.0, 1.0);
 return vec4(cover, radius, q);
}
void main(){
 vec3 d = normalize(vDir);
 float y = d.y;
 vec3 upper = mix(horizon, sky, pow(clamp(y, 0.0, 1.0), skyCurve));
 // nadir.x = sin(depression) where the sweep enters the piece's own shadow, nadir.y = remaining light there.
 vec3 base = y >= 0.0 ? upper : mix(horizon, floorColor, smoothstep(0.0, floorEdge, -y)) * mix(1.0, nadir.y, smoothstep(nadir.x, 1.0, -y));
 vec3 light = base;
 for(int i = 0; i < MAX_PANELS; i++){ if(i >= panelCount) break;
  vec4 pc = panel(d, panelDir[i], panelShape[i]);
  vec4 ex = panelExtra[i];
  // Graded diffusion: a vertical ramp, ends that fade out along the long axis, and the brighter core of a strip box.
  bool tall = panelShape[i].x < panelShape[i].y;
  float across = tall ? pc.z : pc.w, along = tall ? pc.w : pc.z;
  float grade = max(0.0, 1.0 + ex.x * pc.w) * (1.0 - smoothstep(1.0 - max(ex.y, 1e-3), 1.0, abs(along)) * step(1e-3, ex.y));
  float core = ex.z * exp(- across * across / max(ex.w * ex.w, 1e-4));
  light += panelColor[i].rgb * panelColor[i].a * pc.x * grade * (1.0 - panelShape[i].w * pc.y + core);
 }
 for(int i = 0; i < MAX_PANELS; i++){ if(i >= flagCount) break;
  vec4 pc = panel(d, flagDir[i], flagShape[i]);
  bool tall = flagShape[i].x < flagShape[i].y; float along = tall ? pc.w : pc.z;
  float grade = clamp(1.0 + flagExtra[i].x * pc.w, 0.0, 1.0) * (1.0 - smoothstep(1.0 - max(flagExtra[i].y, 1e-3), 1.0, abs(along)) * step(1e-3, flagExtra[i].y));
  light *= 1.0 - flagShape[i].w * pc.x * grade;
 }
 gl_FragColor = vec4(light, 1.0);
}`;

function direction(az, el) {
 const a = rad(az), e = rad(el);
 return new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
}
function uniformsFor(preset) {
 const pad = () => Array.from({length: MAX_PANELS}, () => new THREE.Vector4());
 const u = {
  sky: {value: new THREE.Vector3(...preset.sky)}, horizon: {value: new THREE.Vector3(...preset.horizon)},
  floorColor: {value: new THREE.Vector3(...preset.floor)}, floorEdge: {value: preset.floorEdge ?? .06}, skyCurve: {value: preset.skyCurve ?? 1}, nadir: {value: new THREE.Vector2(...(preset.nadir || [.999, 1]))},
  panelCount: {value: Math.min(MAX_PANELS, preset.panels.length)}, panelDir: {value: pad()}, panelShape: {value: pad()}, panelColor: {value: pad()}, panelExtra: {value: pad()},
  flagCount: {value: Math.min(MAX_PANELS, (preset.flags || []).length)}, flagDir: {value: pad()}, flagShape: {value: pad()}, flagExtra: {value: pad()}
 };
 preset.panels.slice(0, MAX_PANELS).forEach((p, i) => {
  const d = direction(p.az, p.el);
  u.panelDir.value[i].set(d.x, d.y, d.z, rad(p.roll || 0));
  if (p.band) u.panelShape.value[i].set(rad(p.w / 2) * Math.cos(rad(p.el)), rad(p.h / 2), -(p.soft ?? .4), p.falloff ?? .4);
  else u.panelShape.value[i].set(Math.tan(rad(p.w / 2)), Math.tan(rad(p.h / 2)), p.soft ?? .4, p.falloff ?? .4);
  const c = p.color || [1, 1, 1];
  u.panelColor.value[i].set(c[0], c[1], c[2], p.i);
  const core = p.core || [0, .3];
  u.panelExtra.value[i].set(p.grad || 0, p.fade || 0, core[0], core[1]);
 });
 (preset.flags || []).slice(0, MAX_PANELS).forEach((f, i) => {
  const d = direction(f.az, f.el);
  u.flagDir.value[i].set(d.x, d.y, d.z, rad(f.roll || 0));
  if (f.band) u.flagShape.value[i].set(rad(f.w / 2) * Math.cos(rad(f.el)), rad(f.h / 2), -(f.soft ?? .5), f.dark ?? .8);
  else u.flagShape.value[i].set(Math.tan(rad(f.w / 2)), Math.tan(rad(f.h / 2)), f.soft ?? .5, f.dark ?? .8);
  u.flagExtra.value[i].set(f.grad || 0, f.fade || 0, 0, 0);
 });
 return u;
}

function renderCube(renderer, preset, size) {
 const scene = new THREE.Scene();
 const material = new THREE.ShaderMaterial({uniforms: uniformsFor(preset), vertexShader, fragmentShader, side: THREE.BackSide, depthWrite: false, depthTest: false, toneMapped: false});
 const sphere = new THREE.Mesh(new THREE.SphereGeometry(50, 64, 32), material);
 scene.add(sphere);
 const target = new THREE.WebGLCubeRenderTarget(size, {type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter});
 const camera = new THREE.CubeCamera(.1, 100, target);
 camera.update(renderer, scene);
 sphere.geometry.dispose(); material.dispose();
 return target;
}

/** Camera response of a jewellery product photograph (standard picture profile), evaluated per fragment,
 * so no extra pass: saturation that fades out towards the highlights and is held back where a colour is
 * already saturated (multi-bounce gold inside the bore), a per-channel toe (deep tones of gold turn amber
 * instead of muddy olive) and the hue-preserving highlight shoulder of Khronos PBR Neutral. */
export const CAMERA = {exposure: .89, saturation: .6, toe: .07, desaturation: .06, satFrom: .04, satTo: 1.2};
const CUSTOM_STUB = 'vec3 CustomToneMapping( vec3 color ) { return color; }';
const cameraCurveAvailable = THREE.ShaderChunk.tonemapping_pars_fragment.includes(CUSTOM_STUB);
if (cameraCurveAvailable) THREE.ShaderChunk.tonemapping_pars_fragment = THREE.ShaderChunk.tonemapping_pars_fragment.replace(CUSTOM_STUB, `vec3 CustomToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	float luma = dot( color, vec3( 0.2126, 0.7152, 0.0722 ) );
	float peak0 = max( color.r, max( color.g, color.b ) );
	float chroma = peak0 > 1e-5 ? ( peak0 - min( color.r, min( color.g, color.b ) ) ) / peak0 : 0.0;
	float sat = ${CAMERA.saturation.toFixed(4)} * ( 1.0 - smoothstep( ${CAMERA.satFrom.toFixed(4)}, ${CAMERA.satTo.toFixed(4)}, luma ) ) * ( 1.0 - chroma * chroma );
	color = max( vec3( 0.0 ), mix( vec3( luma ), color, 1.0 + sat ) );
	color = color * color * ${(1 + CAMERA.toe).toFixed(4)} / ( color + ${CAMERA.toe.toFixed(4)} );
	const float StartCompression = 0.76;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( ${CAMERA.desaturation.toFixed(4)} * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}`);
/** Use the camera response (falls back to Khronos PBR Neutral if three's chunk text ever changes). */
export function applyCameraResponse(renderer, exposure = CAMERA.exposure) {
 renderer.toneMapping = cameraCurveAvailable ? THREE.CustomToneMapping : THREE.NeutralToneMapping;
 renderer.toneMappingExposure = cameraCurveAvailable ? exposure : 1;
}

/** Returns {metal: PMREM texture for scene.environment, diamond: sharp cube for the gem tracer}. */
export function createRingStudio(renderer, {metal = METAL_STUDIO, diamond = DIAMOND_STUDIO, size = 512} = {}) {
 const metalCube = renderCube(renderer, metal, size);
 const pmrem = new THREE.PMREMGenerator(renderer);
 const filtered = pmrem.fromCubemap(metalCube.texture);
 pmrem.dispose(); metalCube.dispose();
 const diamondCube = renderCube(renderer, diamond, Math.min(size, 512));
 return {metal: filtered.texture, diamond: diamondCube.texture, dispose() { filtered.dispose(); diamondCube.dispose(); }};
}
