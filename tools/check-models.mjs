import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { GLTFLoader } from '../assets/vendor/GLTFLoader.js';
import { weddingGeometry, diamondMesh } from '../assets/jewelry-studio.js';
import * as THREE from 'three';
const data=await readFile('assets/models/jewelry.glb');
const gltf=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
const library=new Map();gltf.scene.updateMatrixWorld(true);
gltf.scene.traverse(o=>{if(o.isMesh)library.set(o.name,o.geometry.clone().applyMatrix4(o.matrixWorld));});
for(const name of ['flach','bombiert','oval','konkav','kantig']){
  const source=library.get('Wedding_'+name);assert(source,name);
  for(const size of [44,54,70])for(const T of [1.2,1.6,2.4])for(const W of [1.8,3.5,8]){
    const ri=size/(2*Math.PI),geo=weddingGeometry(source,ri,T,W),p=geo.attributes.position,n=geo.attributes.normal;
    let minR=Infinity,maxR=0,minY=Infinity,maxY=-Infinity;
    for(let i=0;i<p.count;i++){
      const r=Math.hypot(p.getX(i),p.getZ(i));minR=Math.min(minR,r);maxR=Math.max(maxR,r);minY=Math.min(minY,p.getY(i));maxY=Math.max(maxY,p.getY(i));
      assert(Number.isFinite(r));assert(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<.001);
    }
    assert(Math.abs(minR-ri)<.025,`${name}: inner size ${minR} vs ${ri}`);
    assert(maxR<=ri+T+.01);assert(Math.abs(maxY-minY-W)<.025);geo.dispose();
  }
  console.log('DIMENSIONS_OK',name,'81 combinations');
}
for(const name of ['round','oval','emerald']){
  const geo=library.get('Diamond_'+name);assert(geo,name);
  const gem=diamondMesh(geo,null);const {facets,facetCount}=gem.material.uniforms;
  const p=geo.attributes.position;
  for(const plane of facets.value.slice(0,facetCount.value))for(let i=0;i<p.count;i++)
    assert(plane.x*p.getX(i)+plane.y*p.getY(i)+plane.z*p.getZ(i)-plane.w<.001,'Nonconvex facet');
  assert(facetCount.value>=40&&facetCount.value<=96);
  console.log('FACETS_OK',name,facetCount.value);gem.material.dispose();
}
assert(library.has('Basket_4'));assert(library.has('Basket_6'));
console.log('GLB_OK',data.length,'bytes',library.size,'meshes');
