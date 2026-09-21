/** Deterministic micro-surface maps; dimensions are in millimetres. */
import * as THREE from 'three';
const cache = new Map();
function noise(x,y) { const v=Math.sin(x*127.1+y*311.7)*43758.5453; return v-Math.floor(v); }
function maps(finish) {
  if(cache.has(finish))return cache.get(finish);
  const size=512, height=new Float32Array(size*size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const u=x/size,v=y/size;
    let h=0;
    if(finish==='laengsmatt') h=Math.sin(v*Math.PI*2*101)*.3+Math.sin(v*Math.PI*2*177+Math.sin(u*6.283)*.12)*.15+noise(x,y)*.04;
    else if(finish==='quermatt') h=Math.sin(u*Math.PI*2*101)*.3+Math.sin(u*Math.PI*2*177+Math.sin(v*6.283)*.12)*.15+noise(x,y)*.04;
    else if(finish==='hammer') {
      // Periodic, overlapping shallow spherical hammer impressions.
      h=1;
      for(let cy=-1;cy<=4;cy++)for(let cx=-1;cx<=4;cx++) {
        const ix=(cx+4)%4,iy=(cy+4)%4;
        const px=(cx+.18+noise(ix,iy)*.64)/4,py=(cy+.18+noise(iy+7,ix)*.64)/4;
        const d=Math.hypot((u-px)*4,(v-py)*4);
        h=Math.min(h,Math.min(1,d*d*.6));
      }
    } else if(finish==='eismatt') h=noise(x,y)*.4+Math.sin((u*31+v*47)*6.283)*.08;
    else h=noise(x,y)*.16;
    height[y*size+x]=h;
  }
  const normal=document.createElement('canvas'),rough=document.createElement('canvas');
  normal.width=normal.height=rough.width=rough.height=size;
  const nc=normal.getContext('2d'),rc=rough.getContext('2d');
  const ni=nc.createImageData(size,size),ri=rc.createImageData(size,size);
  const at=(x,y)=>height[((y+size)%size)*size+(x+size)%size];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const strength=finish==='hammer'?14:1;
    const dx=(at(x+1,y)-at(x-1,y))*strength,dy=(at(x,y+1)-at(x,y-1))*strength;
    const len=Math.hypot(dx,dy,1),i=(y*size+x)*4;
    ni.data.set([(-dx/len*.5+.5)*255,(-dy/len*.5+.5)*255,(1/len*.5+.5)*255,255],i);
    const val=225+noise(x+9,y+3)*30;
    ri.data.set([val,val,val,255],i);
  }
  nc.putImageData(ni,0,0);rc.putImageData(ri,0,0);
  const result={normal:new THREE.CanvasTexture(normal),rough:new THREE.CanvasTexture(rough)};
  for(const t of Object.values(result)){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.NoColorSpace;}
  cache.set(finish,result);return result;
}

export function weddingMetal(color, finish, dimensions, anisotropy=8) {
  const roughness={poliert:.12,seidenmatt:.34,eismatt:.48,laengsmatt:.36,quermatt:.36,hammer:.18}[finish]??.12;
  const material=new THREE.MeshPhysicalMaterial({color,metalness:1,roughness,envMapIntensity:1,clearcoat:0});
  if(finish!=='poliert') {
    const source=maps(finish);
    const tile=finish==='hammer'?5:4;
    const repeats=[dimensions.circumference/tile,dimensions.width/tile];
    for(const [property,key] of [['normalMap','normal'],['roughnessMap','rough']]){
      const texture=source[key].clone();texture.needsUpdate=true;texture.repeat.set(...repeats);texture.anisotropy=anisotropy;
      material[property]=texture;
    }
    const strength=finish==='hammer'?.38:finish==='eismatt'?.4:.26;
    material.normalScale.set(strength,strength);
    if(finish==='laengsmatt'||finish==='quermatt'){
      material.anisotropy=.65;material.anisotropyRotation=finish==='quermatt'?Math.PI/2:0;
    }
  }
  return material;
}

/** Material zones on a single welded mesh: no overlaid second ring skins. */
export function assignRingMaterials(geometry, config, bands) {
  const p=geometry.attributes.position,n=geometry.attributes.normal,source=geometry.index;
  const groups=[[],[],[],[]],count=source?source.count:p.count;
  for(let i=0;i<count;i+=3){
    const ids=[0,1,2].map(j=>source?source.getX(i+j):i+j);
    let y=0,radialNormal=0;
    for(const index of ids){
      const x=p.getX(index),z=p.getZ(index),r=Math.hypot(x,z);
      y+=p.getY(index)/3;radialNormal+=(n.getX(index)*x+n.getZ(index)*z)/r/3;
    }
    const t=y*2/config.breite;
    const second=config.bicolor&&bands.some(([start,end])=>t>=start&&t<=end);
    const outside=radialNormal>.42;
    groups[(second?2:0)+(outside?0:1)].push(...ids);
  }
  const indices=[];geometry.clearGroups();
  groups.forEach((group,index)=>{if(group.length){geometry.addGroup(indices.length,group.length,index);for(const value of group)indices.push(value);}});
  geometry.setIndex(indices);
  return geometry;
}

/** Sample Blender's actual surfaces; settings and section drawings use the same model. */
export function sampleRingProfile(source) {
  const p=source.attributes.position,n=source.attributes.normal;
  const outer=new Map(),inner=new Map();
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=Math.hypot(x,z),radial=(n.getX(i)*x+n.getZ(i)*z)/r;
    const map=radial>.15?outer:radial<-.15?inner:null;
    if(map)map.set(y.toFixed(5),r);
  }
  const curve=map=>{
    const rows=[...map].map(([y,r])=>[Number(y),r]).sort((a,b)=>a[0]-b[0]);
    return (t,T)=>{
      const y=Math.max(rows[0][0],Math.min(rows.at(-1)[0],t*2.25));
      let low=0,high=rows.length-1;
      while(high-low>1){const mid=(low+high)>>1;if(rows[mid][0]>y)high=mid;else low=mid;}
      const a=rows[low],b=rows[high],blend=(y-a[0])/(b[0]-a[0]||1);
      return (a[1]+(b[1]-a[1])*blend-9)*T/1.7;
    };
  };
  return {outside:curve(outer),inside:curve(inner)};
}
