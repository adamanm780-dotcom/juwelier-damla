/** Procedural jewellery photo studio, rendered on the GPU in scene-linear HDR.
 * Flat softboxes are evaluated in gnomonic (panel) coordinates, so they appear
 * exactly as rectangular diffusers would; black flags subtract light and give
 * polished metal its defining dark contours. No image download, no third-party HDRI. */
import * as THREE from 'three';

const MAX_PANELS = 16;
const rad = THREE.MathUtils.degToRad;

/** Angles in degrees. az 0 = behind the camera (+z), az 90 = right (+x), el 90 = zenith.
 * w/h = angular panel size, soft = edge feather (fraction of the smaller half size),
 * falloff = centre-to-edge brightness drop of the diffusion fabric, roll = panel rotation.
 * nadir = [sine of the depression angle where the sweep enters the piece's own shadow, light left there]. */
export const METAL_STUDIO = {
 // White light tent: lit fabric walls, seamless sweep, large side softboxes with a strong centre-to-edge falloff,
 // overhead diffusion, rim strips behind the piece, bounce cards in front and soft black cards for the contours.
 sky: [.42, .42, .42], horizon: [.165, .162, .158], floor: [.88, .858, .814], floorEdge: .1, skyCurve: .6, nadir: [.4, .42],
 panels: [
  {az: 180, el: 66, w: 110, h: 64, i: 2.0, soft: .5, falloff: .5, color: [1, .99, .975]},
  {az: -97, el: 20, w: 32, h: 80, i: 3.0, soft: .42, falloff: .7, color: [1, .98, .955]},
  {az: 97, el: 20, w: 32, h: 80, i: 2.7, soft: .42, falloff: .7, color: [.99, .99, 1]},
  {az: 180, el: 12, w: 70, h: 30, i: 1.2, soft: .6, falloff: .3, color: [1, .985, .96]},
  {az: -152, el: 20, w: 16, h: 56, i: 2.0, soft: .4, falloff: .5, color: [1, .98, .95]},
  {az: 152, el: 20, w: 16, h: 56, i: 2.0, soft: .4, falloff: .5, color: [1, .98, .95]},
  {az: -50, el: 10, w: 36, h: 50, i: 1.0, soft: .6, falloff: .3, color: [1, .985, .96]},
  {az: 50, el: 10, w: 36, h: 50, i: 1.0, soft: .6, falloff: .3, color: [1, .985, .96]}
 ],
 flags: [
  {az: -126, el: 20, w: 18, h: 84, dark: .72, soft: .45},
  {az: 127, el: 20, w: 18, h: 84, dark: .72, soft: .45},
  {az: -72, el: 22, w: 15, h: 74, dark: .6, soft: .5},
  {az: 73, el: 22, w: 15, h: 74, dark: .6, soft: .5},
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
uniform int panelCount; uniform vec4 panelDir[MAX_PANELS]; uniform vec4 panelShape[MAX_PANELS]; uniform vec4 panelColor[MAX_PANELS];
uniform int flagCount; uniform vec4 flagDir[MAX_PANELS]; uniform vec4 flagShape[MAX_PANELS];
varying vec3 vDir;
float rbox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
// Returns coverage (0..1) and normalised radius inside the panel.
vec2 panel(vec3 d, vec4 dirRoll, vec4 shape){
 vec3 n = dirRoll.xyz; float c = dot(d, n); if(c <= 0.0) return vec2(0.0, 1.0);
 vec3 upRef = abs(n.y) > .98 ? vec3(0.0, 0.0, -1.0) : vec3(0.0, 1.0, 0.0);
 vec3 r = normalize(cross(upRef, n)), u = cross(n, r);
 vec2 p = vec2(dot(d, r), dot(d, u)) / c;
 float cr = cos(dirRoll.w), sr = sin(dirRoll.w); p = mat2(cr, -sr, sr, cr) * p;
 vec2 half_ = shape.xy; float m = min(half_.x, half_.y), feather = max(1e-4, shape.z * m);
 float sd = rbox(p, half_, m * .35);
 float cover = 1.0 - smoothstep(-feather, feather, sd);
 vec2 q = p / half_; float radius = clamp(dot(q, q) * .5, 0.0, 1.0);
 return vec2(cover, radius);
}
void main(){
 vec3 d = normalize(vDir);
 float y = d.y;
 vec3 upper = mix(horizon, sky, pow(clamp(y, 0.0, 1.0), skyCurve));
 // nadir.x = sin(depression) where the sweep enters the piece's own shadow, nadir.y = remaining light there.
 vec3 base = y >= 0.0 ? upper : mix(horizon, floorColor, smoothstep(0.0, floorEdge, -y)) * mix(1.0, nadir.y, smoothstep(nadir.x, 1.0, -y));
 vec3 light = base;
 for(int i = 0; i < MAX_PANELS; i++){ if(i >= panelCount) break;
  vec2 pc = panel(d, panelDir[i], panelShape[i]);
  light += panelColor[i].rgb * panelColor[i].a * pc.x * (1.0 - panelShape[i].w * pc.y);
 }
 for(int i = 0; i < MAX_PANELS; i++){ if(i >= flagCount) break;
  vec2 pc = panel(d, flagDir[i], flagShape[i]);
  light *= 1.0 - flagShape[i].w * pc.x;
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
  panelCount: {value: Math.min(MAX_PANELS, preset.panels.length)}, panelDir: {value: pad()}, panelShape: {value: pad()}, panelColor: {value: pad()},
  flagCount: {value: Math.min(MAX_PANELS, (preset.flags || []).length)}, flagDir: {value: pad()}, flagShape: {value: pad()}
 };
 preset.panels.slice(0, MAX_PANELS).forEach((p, i) => {
  const d = direction(p.az, p.el);
  u.panelDir.value[i].set(d.x, d.y, d.z, rad(p.roll || 0));
  u.panelShape.value[i].set(Math.tan(rad(p.w / 2)), Math.tan(rad(p.h / 2)), p.soft ?? .4, p.falloff ?? .4);
  const c = p.color || [1, 1, 1];
  u.panelColor.value[i].set(c[0], c[1], c[2], p.i);
 });
 (preset.flags || []).slice(0, MAX_PANELS).forEach((f, i) => {
  const d = direction(f.az, f.el);
  u.flagDir.value[i].set(d.x, d.y, d.z, rad(f.roll || 0));
  u.flagShape.value[i].set(Math.tan(rad(f.w / 2)), Math.tan(rad(f.h / 2)), f.soft ?? .5, f.dark ?? .8);
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
export const CAMERA = {exposure: .92, saturation: .6, toe: .07, desaturation: .06, satFrom: .04, satTo: 1.2};
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
