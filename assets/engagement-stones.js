import * as THREE from 'three';
import { GLTFLoader } from 'three/GLTFLoader.js';
import { diamondMesh } from './jewelry-studio.js?v=20260929-real2';
import { stones, colors, accents } from './engagement-state.js?v=20260930-er3';
// Stone shapes, their proportions and claw layouts, the libraries they come from, and their optics.

// ratio: girdle length / width; size: width relative to a round brilliant of the same weight
// (1 ct: pear about 5.7 x 9.2 mm, marquise 5.1 x 10.5 mm, heart 6.2 mm wide, Asscher 5.5 mm).
// lib: model library loaded on demand; claws: claw angles in the xz plane (z = sin), vTips: points guarded by V claws;
// sides: trilogy side-stone cut when "passend"; concave: traced with the convex companion.
const deg=Math.PI/180,corner=ratio=>Math.atan(ratio);
export const CUT={
  round:{ratio:1,size:1,round:true},oval:{ratio:1.38,size:1,round:true},oldEuropean:{ratio:1,size:.95,lib:'shapes',round:true},
  emerald:{ratio:1.35,size:1,sides:'taperedBaguette'},princess:{ratio:1,size:.86,lib:'wedding',sides:'princess'},cushion:{ratio:1,size:.9,lib:'wedding',sides:'cushion'},
  elongatedCushion:{ratio:1.2,size:.9,lib:'shapes'},radiant:{ratio:1,size:.87,lib:'wedding',sides:'radiant'},asscher:{ratio:1,size:.85,lib:'shapes',sides:'asscher'},
  pear:{ratio:1.62,size:1.03,lib:'shapes',claws:[42*deg,138*deg],vTips:[270*deg],fixed:'2 Krappen und V-Krappe an der Spitze',sideZ:.54},
  marquise:{ratio:2.05,size:1,lib:'shapes',claws:[22*deg,158*deg,202*deg,338*deg],vTips:[90*deg,270*deg],fixed:'4 Krappen und 2 V-Krappen an den Spitzen'},
  heart:{ratio:.91,size:.93,lib:'shapes',claws:[218*deg,322*deg],vTips:[90*deg],fixed:'2 Krappen und V-Krappe an der Spitze',concave:true},
  // Side stones only.
  taperedBaguette:{ratio:.5,size:1,lib:'shapes',step:true},trapez:{ratio:.82,size:1,lib:'shapes',step:true}};
export const LIBS={wedding:['models/wedding-gems.glb?v=3'],shapes:['models/engagement-shapes.glb?v=2']};
// Claw directions for a cut and a claw choice ('4' | '6' | 'double'); corners for rectangular stones.
export function clawLayout(cut,prongs){
  const c=CUT[cut];if(c.claws)return {angles:c.claws,vTips:c.vTips};
  if(c.round&&prongs==='6')return {angles:[0,1,2,3,4,5].map(i=>i*Math.PI/3+Math.PI/6),vTips:[]};
  const a=c.round?Math.PI/4:corner(c.ratio);return {angles:[a,Math.PI-a,Math.PI+a,2*Math.PI-a],vTips:[]};
}
export const diameter=(carat,cut)=>6.5*CUT[cut].size*Math.cbrt(carat/CUT[cut].ratio);

// Libraries: the base jewellery file has round/oval/emerald; the rest load when a shape first needs them.
// A stone's dense analytic girdle (glTF extras) comes along for bezels, halos, rails and claws.
const extras={},loaded=new Set(),failed=new Set();
export const libraryState=lib=>!lib||loaded.has(lib)?'ready':failed.has(lib)?'failed':'loading';
export function loadLibrary(lib,models){
  extras[lib]??=Promise.all(LIBS[lib].map(file=>new GLTFLoader().loadAsync(new URL(file,import.meta.url).href)))
    .then(list=>{for(const gltf of list){gltf.scene.updateMatrixWorld(true);gltf.scene.traverse(o=>{if(!o.isMesh)return;const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);if(o.userData.girdle)geometry.userData.girdle=o.userData.girdle;models.set(o.name,geometry);});}loaded.add(lib);failed.delete(lib);})
    .catch(error=>{delete extras[lib];failed.add(lib);throw error;});
  return extras[lib];
}
export const available=cut=>!CUT[cut].lib||loaded.has(CUT[cut].lib);

// Girdle outline in plan view (x, z), resampled by angle, in stone radii. Round and oval stones are true
// ellipses; shapes with a dense analytic girdle use it; others use the convex hull of their vertices.
const outlines=new Map();
export function girdleOutline(models,cut,n=192){
  const key=cut+'|'+n;if(outlines.has(key))return outlines.get(key);
  const geometry=models.get('Diamond_'+cut),dense=geometry.userData.girdle;let polygon;
  if(cut==='round'||cut==='oval'){
    const box=geometry.boundingBox??(geometry.computeBoundingBox(),geometry.boundingBox),outline=[];
    for(let i=0;i<n;i++){const a=i/n*Math.PI*2;outline.push(new THREE.Vector2(Math.cos(a)*box.max.x,Math.sin(a)*box.max.z));}
    outlines.set(key,outline);return outline;
  }
  if(dense){polygon=[];for(let i=0;i<dense.length;i+=2)polygon.push([dense[i],dense[i+1]]);}
  else{
    const p=geometry.attributes.position,points=[];for(let i=0;i<p.count;i++)points.push([p.getX(i),p.getZ(i)]);
    points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
    const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),lower=[],upper=[];
    for(const q of points){while(lower.length>=2&&cross(lower.at(-2),lower.at(-1),q)<=0)lower.pop();lower.push(q);}
    for(const q of points.slice().reverse()){while(upper.length>=2&&cross(upper.at(-2),upper.at(-1),q)<=0)upper.pop();upper.push(q);}
    polygon=lower.slice(0,-1).concat(upper.slice(0,-1));
  }
  // Every shape is star-shaped around its centre (the heart too), so each ray meets the outline once.
  const outline=[];
  for(let i=0;i<n;i++){
    const a=i/n*Math.PI*2,dx=Math.cos(a),dz=Math.sin(a);let reach=0;
    for(let j=0;j<polygon.length;j++){
      const A=polygon[j],B=polygon[(j+1)%polygon.length],ex=B[0]-A[0],ez=B[1]-A[1],den=dx*ez-dz*ex;if(Math.abs(den)<1e-9)continue;
      const t=(A[0]*ez-A[1]*ex)/den,u=(A[0]*dz-A[1]*dx)/den;if(t>0&&u>=-1e-6&&u<=1+1e-6)reach=Math.max(reach,t);
    }
    outline.push(new THREE.Vector2(dx*reach,dz*reach));
  }
  outlines.set(key,outline);return outline;
}
// Geometry whose planes give the claw contact radii (the convex companion for concave stones).
export const clawStone=(models,cut)=>models.get('Optics_'+cut)??models.get('Diamond_'+cut);

// Optics for the facet tracer. Diamonds keep the approved defaults; colours are body colours.
const COLOURED={sapphire:{ior:1.77,dispersion:.009,absorption:.55,escapeWeight:.35},ruby:{color:0xc0203f,ior:1.77,dispersion:.009,absorption:.55,escapeWeight:.35},
  smaragd:{color:0x1f8a55,ior:1.58,dispersion:.006,absorption:.5,escapeWeight:.35},aquamarine:{color:0x9fd3e6,ior:1.57,dispersion:.007,absorption:.35,escapeWeight:.4},
  morganite:{color:0xf4bfae,ior:1.58,dispersion:.007,absorption:.35,escapeWeight:.4},moissanite:{ior:2.65,dispersion:.03,escapeWeight:.65},fancy:{ior:2.417,dispersion:.014,absorption:.5,escapeWeight:.6}};
const FANCY={fancyYellow:{color:0xf6d24a,absorption:.45},champagne:{color:0xe0b284,absorption:.5},fancyPink:{color:0xf2a9c0,absorption:.45},black:{color:0x141418,absorption:9,escapeWeight:.15,environmentIntensity:.9}};
const GRADE_TINT={good:{color:0xfff8ec,absorption:.3},I:{color:0xfffaf2,absorption:.22},J:{color:0xfff8ec,absorption:.3},K:{color:0xfff3e0,absorption:.36}};
export function stoneOptics(kind,{color='',grade='veryGood',colorGrade='G'}={}){
  if(kind==='diamond'||kind==='lab'||kind==='own')return grade==='good'?GRADE_TINT.good:grade==='custom'?GRADE_TINT[colorGrade]??{}:{};
  if(kind==='sapphire')return {...COLOURED.sapphire,color:colors.sapphire[color]?.[1]??colors.sapphire.blue[1],...(color==='white'?{absorption:.05}:{})};
  if(kind==='fancy')return {...COLOURED.fancy,...(FANCY[color]??FANCY.fancyYellow)};
  return COLOURED[kind]??{};
}
// Accent stones (halo, pavé, side stones, hidden halo): diamonds or the three classic coloured stones.
export const accentOptics=kind=>kind==='diamond'?{}:stoneOptics(kind,{color:'blue'});

// A stone mesh at a position; `normal` tilts its table. Concave stones trace against their convex companion.
export function stoneMesh(models,environment,cut,radius,optics={}){
  const shape=models.get('Diamond_'+cut),hull=models.get('Optics_'+cut);
  const gem=diamondMesh(hull??shape,environment,optics);if(hull)gem.geometry=shape;
  gem.scale.setScalar(radius);gem.userData.sharedGeometry=true;return gem;
}
