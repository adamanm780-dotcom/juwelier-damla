import * as THREE from 'three';
import {METALS} from './wedding-catalog.js?v=3';
const cache=new Map();
const random=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
export const roughness={polished:.065,'vertical-brushed':.28,'horizontal-matte':.29,'diagonal-matte':.3,'ice-matte':.43,'sandmatte-fine':.58,starbrush:.33,'hammered-matte':.39,'hammered-big':.13,'tree-bark':.32,'horizontal-diamond-coated':.22,'diagonal-diamond-coated':.24,'cross-matte':.37};
export function surfaceMaps(finish){
 if(cache.has(finish))return cache.get(finish);
 const N=512,values=new Float32Array(N*N);
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){
  const u=x/N,v=y/N,grain=random(x,y);let h=0;
  const line=t=>Math.sin(t*Math.PI*2*93)*.32+Math.sin(t*Math.PI*2*173)*.17;
  if(finish==='horizontal-matte'||finish==='horizontal-diamond-coated')h=line(v)+grain*.08;
  else if(finish==='vertical-brushed')h=line(u)+grain*.08;
  else if(finish==='diagonal-matte'||finish==='diagonal-diamond-coated')h=line(u+v)+grain*.08;
  else if(finish==='cross-matte')h=(line(u+v)+line(u-v))*.55+grain*.07;
  else if(finish==='ice-matte')h=Math.sin((u*27+v*19)*6.283+Math.sin(v*31)*2)*.25+Math.sin((u*51-v*41)*6.283)*.2+grain*.2;
  else if(finish==='starbrush'){const a=Math.atan2(Math.sin(v*6.283),Math.sin(u*6.283));h=Math.sin(a*127+Math.hypot(u-.5,v-.5)*100)*.22+grain*.08;}
  else if(finish.startsWith('hammered')){h=1;for(let cy=-1;cy<5;cy++)for(let cx=-1;cx<5;cx++){const ix=(cx+4)%4,iy=(cy+4)%4;const px=(cx+.15+random(ix,iy)*.7)/4,py=(cy+.15+random(iy+7,ix)*.7)/4;const d=Math.hypot((u-px)*4,(v-py)*4);h=Math.min(h,Math.min(1,d*d*.65));}if(finish==='hammered-matte')h+=grain*.03;}
  else if(finish==='tree-bark')h=Math.sin(v*6.283*17+Math.sin(u*6.283*3)*2)*.4+Math.sin(v*6.283*41+Math.sin(u*6.283*5))*.16+grain*.1;
  else h=grain*.16;
  values[y*N+x]=h;
 }
 const normal=document.createElement('canvas'),rough=document.createElement('canvas');normal.width=normal.height=rough.width=rough.height=N;
 const nc=normal.getContext('2d'),rc=rough.getContext('2d'),ni=nc.createImageData(N,N),ri=rc.createImageData(N,N);
 const at=(x,y)=>values[((y+N)%N)*N+(x+N)%N];
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){const strength=finish.startsWith('hammered')?18:finish==='tree-bark'?2:1;const dx=(at(x+1,y)-at(x-1,y))*strength,dy=(at(x,y+1)-at(x,y-1))*strength,l=Math.hypot(dx,dy,1),i=(y*N+x)*4;ni.data.set([(-dx/l*.5+.5)*255,(-dy/l*.5+.5)*255,(1/l*.5+.5)*255,255],i);const r=220+random(x+7,y+9)*35;ri.data.set([r,r,r,255],i);}
 nc.putImageData(ni,0,0);rc.putImageData(ri,0,0);
 const maps={normal:new THREE.CanvasTexture(normal),rough:new THREE.CanvasTexture(rough)};
 for(const t of Object.values(maps)){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.NoColorSpace;}
 cache.set(finish,maps);return maps;
}
export function metalColor(m){const color=new THREE.Color(METALS[m.color].color);if(['yellow','red','honey','champagne'].includes(m.color))color.lerp(new THREE.Color(0xf5ede0),Math.max(0,(585-m.grade)/900));return color;}
export function metalMaterial(m,finish,dimensions,aniso){
 const mat=new THREE.MeshPhysicalMaterial({color:metalColor(m),metalness:1,roughness:roughness[finish]??.15,envMapIntensity:1.1,clearcoat:0});
 if(finish!=='polished'){
  const maps=surfaceMaps(finish),tile=finish.startsWith('hammered')?5:4;
  for(const [property,key] of [['normalMap','normal'],['roughnessMap','rough']]){const t=maps[key].clone();t.needsUpdate=true;t.repeat.set(dimensions.circumference/tile,dimensions.perimeter/tile);t.anisotropy=aniso;mat[property]=t;}
  const strength=finish.startsWith('hammered')?.48:finish.includes('diamond')?.4:finish==='ice-matte'?.32:.23;mat.normalScale.set(strength,strength);
  if(/matte|brushed|diamond/.test(finish)&&!['sandmatte-fine','ice-matte','hammered-matte'].includes(finish)){mat.anisotropy=.62;mat.anisotropyRotation=finish==='vertical-brushed'?Math.PI/2:finish.includes('diagonal')?Math.PI/4:0;}
 }
 return mat;
}
