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
 yellow: [[333, [.863, .752, .576]], [375, [.884, .749, .546]], [585, [.942, .727, .443]], [750, [.977, .708, .380]], [900, [1, .691, .331]], [916, [1, .690, .327]]],
 red: [[333, [.91, .655, .54]], [375, [.925, .645, .525]], [585, [.955, .62, .49]], [750, [.96, .595, .465]]],
 honey: [[585, [.979, .706, .395]], [750, [1, .689, .354]]],
 champagne: [[585, [.888, .746, .564]], [750, [.905, .743, .541]]],
 white: [[333, [.765, .757, .74]], [375, [.768, .76, .744]], [585, [.775, .768, .755]], [750, [.785, .778, .765]]],
 gray: [[585, [.58, .565, .54]], [750, [.60, .585, .56]]],
 palladium: [[500, [.70, .675, .64]], [950, [.73, .705, .67]]],
 platinum: [[600, [.63, .615, .585]], [950, [.65, .635, .60]]],
 silver: [[925, [.95, .93, .88]]]
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
export const OPTICS = {edgeTint: .12, boreGain: 1, boreFeather: .12};

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
					float disc = max( b * b - a * c, 0.0 );
					float t = ( - b + sqrt( disc ) ) / a;
					if ( t > 1e-3 ) {
						vec3 h = p + d * t;
						float wall = 1.0 - smoothstep( uBore.y - uBore.z, uBore.y + uBore.z, abs( h.y ) );
						vec3 n2 = normalize( vec3( - h.x, 0.0, - h.z ) );
						vec3 d2 = reflect( d, n2 );
						vec3 second = textureCubeUV( envMap, envMapRotation * ( uToWorld * d2 ), roughness ).rgb;
						float cosine = clamp( dot( - d, n2 ), 0.0, 1.0 );
						vec3 f2 = diffuse + ( mix( vec3( 1.0 ), diffuse, uEdgeTint ) - diffuse ) * pow( 1.0 - cosine, 5.0 );
						f2 -= ( diffuse + ( 1.0 - diffuse ) * 0.462664 ) * ( 1.0 - uF82 ) * 17.6479 * cosine * pow( 1.0 - cosine, 6.0 );
						envMapColor = mix( envMapColor, second * f2 * uBore.w, wall * smoothstep( 0.05, 0.35, inward ) );
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
uniform float uEdgeTint; uniform vec3 uF82; uniform vec4 uBore; uniform mat3 uToLocal; uniform mat3 uToWorld;
#ifdef RING_BORE
varying vec3 vRingLocal; varying vec3 vRingLocalNormal;
#endif`)
   .replace('#include <lights_physical_pars_fragment>', LIGHTS_CHUNK)
   .replace('#include <envmap_physical_pars_fragment>', ENV_CHUNK);
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
