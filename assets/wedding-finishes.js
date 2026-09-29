import * as THREE from 'three';
import {METALS} from './wedding-catalog.js?v=3';
import {metalF0,metalF82} from './ring-optics.js?v=20260929-real2';
const cache=new Map();
const random=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
// Roughness along the tool marks; brushed finishes get their cross-groove roughness from anisotropy.
export const roughness={polished:.05,'vertical-brushed':.2,'horizontal-matte':.2,'diagonal-matte':.21,'ice-matte':.4,'sandmatte-fine':.5,starbrush:.27,'hammered-matte':.34,'hammered-big':.09,'tree-bark':.3,'horizontal-diamond-coated':.19,'diagonal-diamond-coated':.2,'cross-matte':.33};
// Periodic 1D value noise over n samples: the groove profile left by a brushing wheel.
function streaks(n,seed){
 const octave=(period,amp)=>{const k=n/period,v=Array.from({length:k},(_,i)=>random(i*1.37+seed,period*.71+seed*3.1)*2-1);return x=>{const f=x/period,i=Math.floor(f),t=f-i,s=t*t*(3-2*t);return amp*(v[((i%k)+k)%k]*(1-s)+v[((i+1)%k+k)%k]*s);};};
 // Dense fine grooves plus a few deeper scratches, 4..64 texels (30..500 um at the 4 mm tile).
 const o=[octave(64,.35),octave(32,.45),octave(16,.5),octave(8,.42),octave(4,.3)],line=new Float32Array(n);
 for(let i=0;i<n;i++){let h=0;for(const f of o)h+=f(i);const scratch=random(i*.913+seed,seed*.37);h+=scratch>.965?(scratch-.965)*26:0;line[i]=h;}
 return x=>{const f=((x%n)+n)%n,i=Math.floor(f),t=f-i;return line[i]*(1-t)+line[(i+1)%n]*t;};
}
// Hand-hammered surface: overlapping spherical dents of varying size and depth on a jittered grid
// (5x5 search); cell parameters are drawn once per grid, so the per-texel loop is plain arithmetic.
function hammer(grid,seed){
 const cells=Array.from({length:grid*grid},(_,c)=>{const ix=c%grid,iy=(c/grid)|0;return [.12+random(ix+seed,iy)*.76,.12+random(iy+seed*2,ix+7)*.76,1/(.62+random(ix*3+seed,iy*5)*.55)**2,.75+random(ix+11,iy*3+seed)*.5];});
 return (u,v)=>{
  let h=1e9;const gx=u*grid,gy=v*grid,cx=Math.floor(gx),cy=Math.floor(gy);
  for(let j=-2;j<=2;j++)for(let i=-2;i<=2;i++){
   const x=cx+i,y=cy+j,[ox,oy,inv,depth]=cells[(((y%grid)+grid)%grid)*grid+((x%grid)+grid)%grid];
   h=Math.min(h,(((gx-x-ox)**2+(gy-y-oy)**2)*inv-1)*depth);
  }
  return Math.min(h,0);
 };
}
export function surfaceMaps(finish){
 if(cache.has(finish))return cache.get(finish);
 const N=512,values=new Float32Array(N*N),roughValues=new Float32Array(N*N);
 const s1=streaks(N,1),s2=streaks(N,7),along=streaks(N,13),dents=finish.startsWith('hammered')?hammer(finish==='hammered-big'?4:7,finish==='hammered-big'?3:5):null;
 // Brushed: grooves run along one axis; their depth wanders slowly along the stroke.
 const brush=(t,a,grain)=>s1(t)*(.85+.15*along(a*.25))+grain*.05;
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){
  const u=x/N,v=y/N,grain=random(x,y);let h=0,r=0;
  if(finish==='horizontal-matte'||finish==='horizontal-diamond-coated'){h=brush(y,x,grain);r=s2(y);}
  else if(finish==='vertical-brushed'){h=brush(x,y,grain);r=s2(x);}
  else if(finish==='diagonal-matte'||finish==='diagonal-diamond-coated'){h=brush(x+y,x-y,grain);r=s2(x+y);}
  else if(finish==='cross-matte'){h=(brush(x+y,x-y,grain)+s2(x-y+N))*.6;r=grain;}
  else if(finish==='ice-matte')h=Math.sin((u*27+v*19)*6.283+Math.sin(v*31)*2)*.25+Math.sin((u*51-v*41)*6.283)*.2+grain*.2;
  else if(finish==='starbrush'){const a=Math.atan2(Math.sin(v*6.283),Math.sin(u*6.283));h=Math.sin(a*127+Math.hypot(u-.5,v-.5)*100)*.22+grain*.08;}
  else if(finish==='hammered-big')h=dents(u,v)*.5;
  else if(finish==='hammered-matte'){h=dents(u,v)*.34+grain*.03;r=grain;}
  else if(finish==='tree-bark')h=Math.sin(v*6.283*17+Math.sin(u*6.283*3)*2)*.4+Math.sin(v*6.283*41+Math.sin(u*6.283*5))*.16+grain*.1;
  else h=grain*.16;
  if(finish.includes('diamond'))h+=(random(x+3,y+5)>.93?random(y,x)*.6:0);
  values[y*N+x]=h;roughValues[y*N+x]=r;
 }
 const normal=document.createElement('canvas'),rough=document.createElement('canvas');normal.width=normal.height=rough.width=rough.height=N;
 const nc=normal.getContext('2d'),rc=rough.getContext('2d'),ni=nc.createImageData(N,N),ri=rc.createImageData(N,N);
 const at=(x,y)=>values[((y+N)%N)*N+(x+N)%N];
 const hammered=finish.startsWith('hammered'),brushed=/brushed|horizontal|diagonal|cross/.test(finish);
 const strength=hammered?26:finish==='tree-bark'?2:brushed?1.6:1;
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){const dx=(at(x+1,y)-at(x-1,y))*strength,dy=(at(x,y+1)-at(x,y-1))*strength,l=Math.hypot(dx,dy,1),i=(y*N+x)*4;ni.data.set([(-dx/l*.5+.5)*255,(-dy/l*.5+.5)*255,(1/l*.5+.5)*255,255],i);
  // Deeper grooves scatter a little more light; hammered dents keep a polished floor.
  const r=brushed?214+roughValues[y*N+x]*26+random(x+7,y+9)*14:220+random(x+7,y+9)*35;ri.data.set([r,r,r,255],i);}
 nc.putImageData(ni,0,0);rc.putImageData(ri,0,0);
 const maps={normal:new THREE.CanvasTexture(normal),rough:new THREE.CanvasTexture(rough)};
 for(const t of Object.values(maps)){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.NoColorSpace;}
 cache.set(finish,maps);return maps;
}
// Measured-reflectance alloy colours (linear F0) by metal and fineness; METALS.color stays the UI swatch.
export function metalColor(m){return metalF0(METALS[m.color]?m.color:'yellow',Number(m.grade)||585);}
export function metalMaterial(m,finish,dimensions,aniso){
 const mat=new THREE.MeshPhysicalMaterial({color:metalColor(m),metalness:1,roughness:roughness[finish]??.15,envMapIntensity:1,clearcoat:0});mat.userData.f82=metalF82(METALS[m.color]?m.color:'yellow');
 if(finish!=='polished'){
  const maps=surfaceMaps(finish),tile=finish.startsWith('hammered')?5:4,brushed=/brushed|horizontal|diagonal|cross/.test(finish);
  for(const [property,key] of [['normalMap','normal'],['roughnessMap','rough']]){const t=maps[key].clone();t.needsUpdate=true;t.repeat.set(Math.max(1,Math.round(dimensions.circumference/tile)),Math.max(1,Math.round(dimensions.perimeter/tile)));t.anisotropy=aniso;mat[property]=t;}
  const strength=finish==='hammered-big'?.5:finish==='hammered-matte'?.42:finish.includes('diamond')?.4:finish==='ice-matte'?.32:brushed?.36:.23;mat.normalScale.set(strength,strength);
  // Brushing scatters light across the grooves, so the highlight stretches perpendicular to the tool
  // marks (u runs around the ring, v across the band; the canvas is flipped in v).
  if(/matte|brushed|diamond/.test(finish)&&!['sandmatte-fine','ice-matte','hammered-matte'].includes(finish)){mat.anisotropy=finish==='cross-matte'?.45:.8;mat.anisotropyRotation=finish==='vertical-brushed'?0:finish.includes('diagonal')||finish==='cross-matte'?Math.PI*.75:Math.PI/2;}
 }
 return mat;
}
