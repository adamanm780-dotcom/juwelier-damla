/** Physically based metal response for the Damla ring viewers.
 * - Reflectance (F0) per alloy and fineness, in linear RGB, from measured spectral data
 *   of gold/copper/silver alloys and rhodium/platinum-group plating.
 * - Grazing-angle Fresnel with an F82 tint (Lazanyi-Schlick, Hoffman 2019), fitted to the complex refractive
 *   index of each metal: gold, silver and copper follow Schlick, while platinum, palladium and rhodium plating
 *   dip ~18 % below it around 75-85 deg, which gives white metals their denser, darker contour.
 * - Bore inter-reflection: rays reflected on the inside of a band are traced analytically
 *   to the opposite inner wall, giving the deep, saturated second bounce seen in photographs. */
import * as THREE from 'three';

// Linear RGB normal-incidence reflectance, indexed by fineness (per mille). Yellow, honey and champagne
// and red golds are derived from CIELab colour coordinates of standard gold colours (ISO 8654 2N/3N, 5N;
// a* +1..+11, b* 14..36); white, platinum and palladium follow rhodium/Pt/Pd reflectance.
const F0 = {
 yellow: [[333, [.863, .752, .576]], [375, [.884, .749, .546]], [585, [.95, .745, .40]], [750, [.977, .708, .380]], [900, [1, .691, .331]], [916, [1, .690, .327]]],
 red: [[333, [.91, .655, .54]], [375, [.925, .645, .525]], [585, [.955, .62, .49]], [750, [.96, .595, .465]]],
 honey: [[585, [.99, .665, .33]], [750, [1, .635, .27]]],
 champagne: [[585, [.88, .745, .63]], [750, [.895, .74, .61]]],
 white: [[333, [.762, .764, .766]], [375, [.765, .767, .769]], [585, [.77, .773, .777]], [750, [.78, .783, .787]]],
 gray: [[585, [.47, .47, .46]], [750, [.49, .49, .48]]],
 palladium: [[500, [.66, .65, .63]], [950, [.69, .68, .66]]],
 platinum: [[600, [.60, .605, .60]], [950, [.62, .625, .62]]],
 silver: [[925, [.955, .945, .915]]]
};
export function metalF0(color, grade = 585) {
 const rows = F0[color] || F0.yellow;
 if (grade <= rows[0][0]) return new THREE.Color(...rows[0][1]);
 for (let i = 1; i < rows.length; i++) if (grade <= rows[i][0]) {
  const [g0, a] = rows[i - 1], [g1, b] = rows[i], t = (grade - g0) / (g1 - g0);
  return new THREE.Color(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
 }
 return new THREE.Color(...rows.at(-1)[1]);
}

// Ratio of the exact conductor Fresnel to Schlick at 82 deg (linear RGB), from n + ik of the base metal.
const F82 = {yellow: [.985, .995, 1], honey: [.985, .995, 1], champagne: [.985, .995, 1], red: [.98, .975, .985], silver: [.98, .99, 1],
 white: [.81, .827, .846], gray: [.836, .853, .877], palladium: [.836, .853, .877], platinum: [.79, .818, .852]};
export function metalF82(color) { return new THREE.Vector3(...(F82[color] || F82.yellow)); }
// Fallback for materials without an alloy name: low-chroma metals of platinum-group reflectance dip, silver does not.
function f82FromColor(c) {
 const max = Math.max(c.r, c.g, c.b), chroma = (max - Math.min(c.r, c.g, c.b)) / Math.max(max, 1e-4), luma = .2126 * c.r + .7152 * c.g + .0722 * c.b;
 const w = (1 - THREE.MathUtils.smoothstep(chroma, .12, .3)) * (1 - THREE.MathUtils.smoothstep(luma, .84, .9));
 return new THREE.Vector3(.985 + (.81 - .985) * w, .995 + (.827 - .995) * w, 1 + (.846 - 1) * w);
}
// edgeTint: share of the alloy colour kept in the grazing Fresnel term (0 = Schlick; a light touch keeps rims warm).
// chromaLift: extra colour saturation of the reflected light for coloured alloys (gold, rose) only,
// like a jeweller's colour grade: gold stays rich yellow into the highlights; white metals are untouched.
export const OPTICS = {edgeTint: .12, boreGain: 1, boreFeather: .12, chromaLift: .1};
function alloyChroma(c) { const max = Math.max(c.r, c.g, c.b); return max > 0 ? (max - Math.min(c.r, c.g, c.b)) / max : 0; }

// Patched copies of three's physical lighting chunks (r169). Built once; verified below.
const LIGHTS_CHUNK = THREE.ShaderChunk.lights_physical_pars_fragment
 .replace('vec3 FssEss = Fr * fab.x + specularF90 * fab.y;', `vec3 FssEss = Fr * fab.x + mix( vec3( specularF90 ), Fr, uEdgeTint ) * fab.y;
	float ringMu = saturate( dot( normal, viewDir ) );
	FssEss = max( FssEss - ( Fr + ( 1.0 - Fr ) * 0.462664 ) * ( 1.0 - uF82 ) * 17.6479 * ringMu * pow( 1.0 - ringMu, 6.0 ) * ( fab.x + fab.y ), 0.0 );`);
const ENV_CHUNK = THREE.ShaderChunk.envmap_physical_pars_fragment
 .replace(/vec4 envMapColor = textureCubeUV\( envMap, envMapRotation \* reflectVec, roughness \);\s*return envMapColor\.rgb \* envMapIntensity;/, `vec3 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness ).rgb;
			#ifdef RING_BORE
			{
				vec3 d = normalize( uToLocal * reflectVec );
				vec3 p = vRingLocal;
				float pr = length( p.xz );
				float inward = -dot( normalize( vRingLocalNormal.xz + 1e-6 ), p.xz / max( pr, 1e-5 ) );
				float a = dot( d.xz, d.xz );
				if ( inward > 0.05 && a > 1e-5 ) {
					float b = dot( p.xz, d.xz );
					float c = pr * pr - uBore.x * uBore.x;
					// Only points inside the bore cylinder see its opposite wall (c < 0); the rounded lip does not.
					float disc = b * b - a * c;
					float t = ( - b + sqrt( max( disc, 0.0 ) ) ) / a;
					if ( c < 0.0 && t > 1e-3 ) {
						vec3 h = p + d * t;
						float wall = 1.0 - smoothstep( uBore.y - uBore.z, uBore.y + uBore.z, abs( h.y ) );
						vec3 n2 = normalize( vec3( - h.x, 0.0, - h.z ) );
						vec3 d2 = reflect( d, n2 );
						vec3 second = textureCubeUV( envMap, envMapRotation * ( uToWorld * d2 ), roughness ).rgb;
						float cosine = clamp( dot( - d, n2 ), 0.0, 1.0 );
						vec3 f2 = diffuse + ( mix( vec3( 1.0 ), diffuse, uEdgeTint ) - diffuse ) * pow( 1.0 - cosine, 5.0 );
						f2 -= ( diffuse + ( 1.0 - diffuse ) * 0.462664 ) * ( 1.0 - uF82 ) * 17.6479 * cosine * pow( 1.0 - cosine, 6.0 );
						envMapColor = mix( envMapColor, second * f2 * uBore.w, wall * smoothstep( 0.05, 0.35, inward ) * ( 1.0 - smoothstep( uBore.x - 0.15, uBore.x, pr ) ) );
					}
				}
			}
			#endif
			return envMapColor * envMapIntensity;`);
export const opticsAvailable = LIGHTS_CHUNK.includes('uEdgeTint ) * fab.y') && LIGHTS_CHUNK.includes('ringMu') && ENV_CHUNK.includes('second * f2');
if (!opticsAvailable) console.warn('Ring optics: three.js shader chunks changed; using standard metal shading.');

const matrix3 = new THREE.Matrix3();
/** Enhance a MeshPhysicalMaterial (metalness 1). bore = {radius, halfWidth} in the mesh's local frame
 * (ring axis = local Y), or null for settings, prongs and other small parts. */
export function enhanceMetal(material, bore = null) {
 const uniforms = {
  uEdgeTint: {value: OPTICS.edgeTint}, uF82: {value: material.userData.f82 || f82FromColor(material.color)},
  uChroma: {value: OPTICS.chromaLift * THREE.MathUtils.smoothstep(alloyChroma(material.color), .15, .4)},
  uBore: {value: new THREE.Vector4(bore?.radius || 1, bore?.halfWidth || 1, OPTICS.boreFeather, OPTICS.boreGain)},
  uToLocal: {value: new THREE.Matrix3()}, uToWorld: {value: new THREE.Matrix3()}
 };
 material.userData.ringOptics = uniforms;
 if (!opticsAvailable) return material;
 material.onBeforeCompile = shader => {
  if (!material.userData.f82) uniforms.uF82.value.copy(f82FromColor(material.color));
  Object.assign(shader.uniforms, uniforms);
  if (bore) {
   shader.defines = {...shader.defines, RING_BORE: ''};
   shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vRingLocal;\nvarying vec3 vRingLocalNormal;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRingLocal = position;\nvRingLocalNormal = normal;');
  }
  shader.fragmentShader = shader.fragmentShader
   .replace('#include <common>', `#include <common>
uniform float uEdgeTint; uniform vec3 uF82; uniform vec4 uBore; uniform mat3 uToLocal; uniform mat3 uToWorld; uniform float uChroma;
#ifdef RING_BORE
varying vec3 vRingLocal; varying vec3 vRingLocalNormal;
#endif`)
   .replace('#include <lights_physical_pars_fragment>', LIGHTS_CHUNK)
   .replace('#include <envmap_physical_pars_fragment>', ENV_CHUNK)
   .replace('#include <opaque_fragment>', `float ringLuma = dot( outgoingLight, vec3( 0.2126, 0.7152, 0.0722 ) );
outgoingLight = max( vec3( 0.0 ), mix( vec3( ringLuma ), outgoingLight, 1.0 + uChroma ) );
#include <opaque_fragment>`);
 };
 material.customProgramCacheKey = () => 'damla-ring-optics-' + (bore ? 'bore' : 'plain');
 material.needsUpdate = true;
 return material;
}

/** Call from Mesh.onBeforeRender so the local frame follows the animated ring. */
export function syncRingOptics(mesh) {
 matrix3.setFromMatrix4(mesh.matrixWorld);
 const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
 for (const m of materials) {
  const u = m?.userData?.ringOptics;
  if (!u) continue;
  u.uToWorld.value.copy(matrix3);
  u.uToLocal.value.copy(matrix3).transpose();
 }
}
