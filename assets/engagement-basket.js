import * as THREE from 'three';
// Claw baskets for engagement stones, generated from the stone itself: the same tapered forged claw and open
// gallery rails as the wedding basket library (tools/build-wedding-settings.py), ported to the browser so every
// shape, claw count, double claws, pointed claw tips and a low setting come from one generator.
// Units are stone radii (girdle half-width = 1), y up, girdle at y = 0; angles run in the xz plane (z = sin).

// Optical planes of a stone (outward normals), deduplicated; the tracer companion is used for concave stones.
const planeCache=new WeakMap();
export function stonePlanes(geometry){
  if(planeCache.has(geometry))return planeCache.get(geometry);
  const p=geometry.attributes.position,index=geometry.index,count=index?index.count:p.count,planes=[];
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
  for(let i=0;i<count;i+=3){
    a.fromBufferAttribute(p,index?index.getX(i):i);b.fromBufferAttribute(p,index?index.getX(i+1):i+1);c.fromBufferAttribute(p,index?index.getX(i+2):i+2);
    const n=b.clone().sub(a).cross(c.clone().sub(a));if(n.lengthSq()<1e-12)continue;n.normalize();const d=n.dot(a);
    if(!planes.some(q=>q.n.dot(n)>.99999&&Math.abs(q.d-d)<1e-4))planes.push({n,d});
  }
  planeCache.set(geometry,planes);return planes;
}
// Distance from the stone axis to its surface along the horizontal direction `angle`, at height y.
function radial(planes,angle,y){
  const dx=Math.cos(angle),dz=Math.sin(angle);let best=100;
  for(const {n,d} of planes){const den=n.x*dx+n.z*dz;if(den>1e-8)best=Math.min(best,(d-n.y*y)/den);}
  return best;
}
function catmull(values,t){
  const n=values.length,x=t*(n-1),i=Math.min(n-2,Math.floor(x)),f=x-i,at=j=>values[Math.max(0,Math.min(n-1,j))];
  const a=at(i-1),b=at(i),c=at(i+1),d=at(i+2);
  return b.map((_,k)=>(2*b[k]+(-a[k]+c[k])*f+(2*a[k]-5*b[k]+4*c[k]-d[k])*f*f+(-a[k]+3*b[k]-3*c[k]+d[k])*f*f*f)*.5);
}
// Mesh accumulator: every part is a closed tube; parts overlap at the joints like the Blender library.
class Parts{
  constructor(){this.position=[];this.index=[];}
  add(verts,faces){const o=this.position.length/3;for(const v of verts)this.position.push(v.x,v.y,v.z);for(const f of faces)this.index.push(...f.map(i=>i+o));}
  geometry(){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(this.position,3));g.setIndex(this.index);g.computeVertexNormals();g.computeBoundingSphere();g.computeBoundingBox();return g;}
}
// One claw: from the bearer up the pavilion, over the girdle and folded onto the crown edge.
// `tip`: 'rund' (rounded bead) or 'kralle' (claw drawn out to a point over the crown); `low`: basket ends higher.
function prong(parts,planes,angle,{scale=1,tip='rund',low=false}={}){
  const rg=radial(planes,angle,0),rc=radial(planes,angle,.105);
  let controls=[[rg*.39,-.945,0,0],[rg*.47,-.875,.117,.094],[rg*.66,-.65,.104,.085],[rg*.85,-.37,.094,.087],[rg+.030,-.085,.099,.096],[rg+.016,.025,.096,.092],[rg*.968,.108,.085,.067],[rc+.032,.132,.060,.040],[rc-.015,.106,0,0]];
  if(tip==='kralle')controls=[...controls.slice(0,7),[rc+.01,.138,.058,.036],[rc-.07,.122,.022,.014],[rc-.115,.108,0,0]];
  if(low)controls=[[rg*.66,-.64,0,0],[rg*.72,-.6,.108,.088],[rg*.85,-.37,.094,.087],...controls.slice(4)];
  const steps=80,sides=20,verts=[],faces=[],across=new THREE.Vector3(-Math.sin(angle),0,Math.cos(angle)),out=new THREE.Vector3(Math.cos(angle),0,Math.sin(angle));
  const at=t=>catmull(controls,Math.max(0,Math.min(1,t))),point=(r,y)=>out.clone().multiplyScalar(r).setY(y);
  for(let j=1;j<steps;j++){
    const t=j/steps,[r,y,w,h]=at(t),[r0,y0]=at(t-1e-4),[r1,y1]=at(t+1e-4);
    const direction=point(r1,y1).sub(point(r0,y0)).normalize(),normal=new THREE.Vector3().crossVectors(across,direction).normalize(),center=point(r,y);
    for(let i=0;i<sides;i++){const a=Math.PI*2*i/sides;verts.push(center.clone().addScaledVector(across,Math.max(3e-4,w*scale)*Math.cos(a)).addScaledVector(normal,Math.max(3e-4,h*scale)*Math.sin(a)));}
  }
  // The section turns from `across` towards `normal` (= across x direction), so outward faces wind a-c-b.
  for(let j=0;j<steps-2;j++)for(let i=0;i<sides;i++){const a=j*sides+i,b=j*sides+(i+1)%sides,c=(j+1)*sides+(i+1)%sides,d=(j+1)*sides+i;faces.push([a,c,b],[a,d,c]);}
  const first=verts.length;verts.push(point(controls[0][0],controls[0][1]));const last=verts.length;verts.push(point(controls.at(-1)[0],controls.at(-1)[1]));
  for(let i=0;i<sides;i++){faces.push([first,i,(i+1)%sides]);const a=(steps-2)*sides+i,b=(steps-2)*sides+(i+1)%sides;faces.push([last,b,a]);}
  parts.add(verts,faces);
}
// Tube with a flattened rounded section (w across, h up) along points; open paths end in rounded domes.
function sweep(parts,points,w,h,closed=false,sides=16){
  points=points.filter((p,i)=>i===0||p.distanceTo(points[i-1])>1e-4);if(closed&&points[0].distanceTo(points.at(-1))<1e-4)points.pop();
  const n=points.length,verts=[],faces=[];
  points.forEach((p,j)=>{
    const a=closed||j>0?points[(j-1+n)%n]:p,b=closed||j<n-1?points[(j+1)%n]:p,d=b.clone().sub(a).setY(0).normalize(),across=new THREE.Vector3(d.z,0,-d.x);
    const u=Math.min(1,Math.min(j,n-1-j)/6),taper=closed?1:Math.max(.2,Math.sqrt(1-(1-u)**2));
    for(let i=0;i<sides;i++){const t=Math.PI*2*i/sides;verts.push(p.clone().addScaledVector(across,w*taper*Math.cos(t)).add(new THREE.Vector3(0,h*taper*Math.sin(t),0)));}
  });
  for(let j=0;j<(closed?n:n-1);j++)for(let i=0;i<sides;i++){const a=j*sides+i,b=j*sides+(i+1)%sides,c=((j+1)%n)*sides+(i+1)%sides,d=((j+1)%n)*sides+i;faces.push([a,b,c],[a,c,d]);}
  if(!closed){const first=verts.length;verts.push(points[0]);const last=verts.length;verts.push(points.at(-1));for(let i=0;i<sides;i++){faces.push([first,(i+1)%sides,i],[last,(n-1)*sides+i,(n-1)*sides+(i+1)%sides]);}}
  parts.add(verts,faces);
}
// Closed outline resampled by arc length and lightly smoothed (sharp points get a small fillet, not a folded tube).
function railPath(outline,count=200){
  const n=outline.length,lengths=[0];for(let i=1;i<=n;i++)lengths.push(lengths[i-1]+outline[i%n].distanceTo(outline[i-1]));
  const total=lengths[n],pts=[];let k=0;
  for(let i=0;i<count;i++){const d=total*i/count;while(lengths[k+1]<d)k++;const f=(d-lengths[k])/(lengths[k+1]-lengths[k]||1);pts.push(outline[k].clone().lerp(outline[(k+1)%n],f));}
  return pts.map((_,i)=>{const s=new THREE.Vector2();for(let j=-4;j<=4;j++)s.add(pts[(i+j+count)%count]);return s.divideScalar(9);});
}
function gallery(parts,outline,scale,y,w,h,length){
  // Long stones step in by the same distance along their length as across the width, like their pavilion rings.
  const sx=scale,sz=length>1?1-(1-scale)/length:scale;
  sweep(parts,railPath(outline).map(p=>new THREE.Vector3(p.x*sx,y,p.y*sz)),w,h,true);
}
// V claw guarding a point: lip over the crown edge plus a wall hugging both flanks under the girdle.
function vClaw(parts,outline,angle,reach=.36){
  const dir=new THREE.Vector2(Math.cos(angle),Math.sin(angle)),n=outline.length;
  let tip=0;for(let i=1;i<n;i++)if(outline[i].dot(dir)>outline[tip].dot(dir))tip=i;
  const walk=step=>{const path=[outline[tip]];let length=0,i=tip;while(length<reach&&path.length<n/2){const j=(i+step+n)%n;length+=outline[j].distanceTo(outline[i]);path.push(outline[j]);i=j;}return path;};
  const arm=walk(-1).reverse().concat(walk(1).slice(1));
  sweep(parts,arm.map(p=>new THREE.Vector3(p.x*1.012,.045,p.y*1.012)),.05,.05);
  sweep(parts,arm.map(p=>new THREE.Vector3(p.x*1.045,-.09,p.y*1.045)),.045,.14);
}
/**
 * basketGeometry(stone, outline, layout, options) -> BufferGeometry in stone radii
 *  stone:   stone geometry (or its convex tracer companion) for the claw contact radii
 *  outline: dense closed girdle outline (THREE.Vector2 in x/z, stone radii)
 *  layout:  {angles:[...], vTips:[...]}  claw directions and pointed ends guarded by V claws (radians, xz plane)
 *  options: {double, tip:'rund'|'kralle', low}
 * The upper gallery rail sits at y = -0.345, scale 0.805 (shoulders end in it); the lower rail at y = -0.872
 * (a low setting omits it and ends at y = -0.64).
 */
const cache=new Map();
export function basketGeometry(stone,outline,layout,{double=false,tip='rund',low=false,key=''}={}){
  const id=key&&`${key}|${double}|${tip}|${low}`;if(id&&cache.has(id))return cache.get(id);
  const planes=stonePlanes(stone),parts=new Parts(),length=Math.max(...outline.map(p=>Math.abs(p.y)));
  for(const angle of layout.angles){
    if(double){const spread=.1/Math.max(.8,radial(planes,angle,0));for(const s of [-1,1])prong(parts,planes,angle+s*spread,{scale:.74,tip,low});}
    else prong(parts,planes,angle,{tip,low});
  }
  for(const angle of layout.vTips??[]){prong(parts,planes,angle,{tip:'rund',low});vClaw(parts,outline,angle);}
  gallery(parts,outline,.805,-.345,.073,.054,length);
  if(!low)gallery(parts,outline,.465,-.872,.087,.06,length);
  const geometry=parts.geometry();if(id)cache.set(id,geometry);return geometry;
}
