import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GLTFLoader} from '../assets/vendor/GLTFLoader.js';
import {weddingGeometry,diamondMesh} from '../assets/jewelry-studio.js';
const dimensions=JSON.parse(await readFile('assets/wedding-dimensions.json','utf8'));
const load=async file=>{const data=await readFile(file),scene=(await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'')).scene;scene.updateMatrixWorld(true);const meshes=new Map();scene.traverse(o=>{if(o.isMesh)meshes.set(o.name,o.geometry.clone().applyMatrix4(o.matrixWorld));});return meshes;};
const profiles=await load('assets/models/wedding-profiles.glb');let checks=0;
for(const [id,rows] of Object.entries(dimensions)){
 const source=profiles.get('Wedding_'+id);assert(source,id);
 for(const row of rows)for(const height of [row.heights[0],row.heights.at(-1)]){
  const ri=54/(Math.PI*2),geo=weddingGeometry(source,ri,height,row.width),pos=geo.attributes.position,norm=geo.attributes.normal;let minR=Infinity,maxR=0,minY=Infinity,maxY=-Infinity;
  for(let i=0;i<pos.count;i++){const r=Math.hypot(pos.getX(i),pos.getZ(i));minR=Math.min(minR,r);maxR=Math.max(maxR,r);minY=Math.min(minY,pos.getY(i));maxY=Math.max(maxY,pos.getY(i));assert(Number.isFinite(r));assert(Math.abs(Math.hypot(norm.getX(i),norm.getY(i),norm.getZ(i))-1)<.001);}
  assert(Math.abs(minR-ri)<.026,id+' bore');assert(Math.abs(maxR-ri-height)<.026,id+' height');assert(Math.abs(maxY-minY-row.width)<.026,id+' width');geo.dispose();checks++;
 }
}
const gems=await load('assets/models/wedding-gems.glb');
for(const [name,geo] of gems){const material=diamondMesh(geo,null).material,{facets,facetCount}=material.uniforms,p=geo.attributes.position;assert(facetCount.value<=96);assert(facetCount.value>=40);for(const plane of facets.value.slice(0,facetCount.value))for(let i=0;i<p.count;i++)assert(plane.x*p.getX(i)+plane.y*p.getY(i)+plane.z*p.getZ(i)-plane.w<.001,name+' convex');material.dispose();console.log(name,facetCount.value,'facets OK');}
console.log('CATALOG_MODELS_OK',profiles.size,'profiles',checks,'boundary dimensions');
