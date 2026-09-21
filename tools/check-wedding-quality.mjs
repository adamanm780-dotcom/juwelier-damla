import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GLTFLoader} from '../assets/vendor/GLTFLoader.js';
import {weddingGeometry} from '../assets/jewelry-studio.js';
import {sampleRingProfile,assignRingMaterials} from '../assets/wedding-materials.js';
const bytes=await readFile('assets/models/jewelry.glb');
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
gltf.scene.updateMatrixWorld(true);
for(const mesh of gltf.scene.children){
 if(!mesh.name.startsWith('Wedding_'))continue;
 const source=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
 const profile=sampleRingProfile(source);
 for(const t of [-.65,-.3,0,.3,.65]){
  assert(profile.outside(t,1.7)>profile.inside(t,1.7)+.6,mesh.name+' thickness');
  assert(Math.abs(profile.outside(t,1.7)-profile.outside(-t,1.7))<.0001,'symmetric profile');
 }
 for(const bands of [[[-.3,.3]],[[0,1]],[[-1,-.6],[.6,1]]]){
  const geo=weddingGeometry(source,54/(2*Math.PI),1.6,4.5),before=geo.index.count;
  assignRingMaterials(geo,{breite:4.5,bicolor:true},bands);
  assert.equal(geo.index.count,before);
  assert.equal(geo.groups.reduce((n,g)=>n+g.count,0),before);
  assert.equal(geo.groups.length,4,'each metal has a finish and a polished inside');
  assert.equal(new Set(geo.groups.map(g=>g.materialIndex)).size,4);
  assert(geo.boundingBox.min.y>=-2.251&&geo.boundingBox.max.y<=2.251);
 }
 console.log('WEDDING_SURFACE_OK',mesh.name);
}
