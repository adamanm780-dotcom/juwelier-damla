/** Original machining geometry for the Damla Blender profile library. */
import * as THREE from 'three';
const TAU=Math.PI*2,wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
export const isTension=k=>k.stone.preset==='clamping-open'||(k.stone.preset==='combined'&&k.stone.setting==='tension');

/** Closed C-shaped solid from the sampled Blender cross-section. Exact cut planes,
 * separate cap vertices for sharp normals, real triangle caps, no centroid culling.
 * Use AFTER existing machining resample and BEFORE ring material grouping.
 * Replace the old clamping-open triangle skip entirely. */
export function closedTensionGeometry(view,k,diameter){
 const ri=k.size/TAU,center=-.25+(k.stone.offset||0)/180*Math.PI;
 const half=Math.asin(Math.min(.45,Math.max(.1,diameter*.94)/(2*(ri+k.height))));
 const start=center+half,end=center+TAU-half,segments=Math.max(96,Math.ceil((end-start)/TAU*384));
 const source=view.contours.get(k.profile),section=[];
 for(let i=0;i<source.length;i++){
  const a=source[i],b=source[(i+1)%source.length],dy=(b[0]-a[0])*k.width/4.5,dr=(b[1]-a[1])*k.height/1.7;
  const steps=Math.max(1,Math.ceil(Math.hypot(dy,dr)/.045));
  for(let j=0;j<steps;j++){const t=j/steps;const p=new THREE.Vector2((a[0]+(b[0]-a[0])*t)*k.width/4.5,ri+(a[1]+(b[1]-a[1])*t-9)*k.height/1.7);if(!section.length||p.distanceToSquared(section.at(-1))>1e-12)section.push(p);}
 }
 const N=section.length,positions=[],uvs=[],index=[],lengths=[0];let perimeter=0;
 for(let i=1;i<=N;i++){perimeter+=section[i%N].distanceTo(section[(i-1)%N]);lengths.push(perimeter);}
 // THREE.ShapeUtils accepts either winding; surface winding is explicitly oriented.
 const cw=THREE.ShapeUtils.isClockWise(section);
 const point=(i,phi)=>{const p=section[i%N],previous=section[(i+N-1)%N],next=section[(i+1)%N];const outwardY=(next.x-previous.x)*(cw?1:-1);let r=p.y;if(outwardY>1e-7)r-=view.grooveDepth(k,p.x,phi);return new THREE.Vector3(r*Math.cos(phi),p.x,r*Math.sin(phi));};
 for(let j=0;j<=segments;j++){const phi=start+(end-start)*j/segments;for(let i=0;i<=N;i++){const p=point(i,phi);positions.push(p.x,p.y,p.z);uvs.push(phi/TAU,lengths[i]/perimeter);}}
 for(let j=0;j<segments;j++)for(let i=0;i<N;i++){
  const a=j*(N+1)+i,b=a+1,c=a+N+1,d=c+1;
  if(cw)index.push(a,b,d,a,d,c);else index.push(a,d,b,a,c,d);
 }
 for(const [phi,sign]of [[start,-1],[end,1]]){
  const first=positions.length/3,expected=new THREE.Vector3(-Math.sin(phi)*sign,0,Math.cos(phi)*sign),cap=[];
  for(let i=0;i<N;i++){const p=point(i,phi);cap.push(p);positions.push(p.x,p.y,p.z);uvs.push(section[i].x/k.width+.5,(section[i].y-ri)/k.height);}
  // Simplify collinear edges for Earcut, then split the cap triangles back at
  // every boundary sample. This avoids both zero-area ears and T-junctions.
  const polygon=cap.map(p=>new THREE.Vector2(p.y,Math.hypot(p.x,p.z))),core=polygon.map((_,i)=>i);
  let simplified=true;
  while(simplified&&core.length>3){simplified=false;for(let i=0;i<core.length;i++){const a=polygon[core[(i+core.length-1)%core.length]],b=polygon[core[i]],c=polygon[core[(i+1)%core.length]],ac=c.clone().sub(a),ab=b.clone().sub(a);if(Math.abs(ac.cross(ab))/Math.max(1e-9,ac.length())<2e-6&&ab.dot(ac)>=0&&ab.dot(ac)<=ac.lengthSq()){core.splice(i,1);simplified=true;break;}}}
  const boundary=new Map();for(let i=0;i<core.length;i++){const a=core[i],b=core[(i+1)%core.length],chain=[a];for(let j=(a+1)%N;j!==b;j=(j+1)%N)chain.push(j);chain.push(b);boundary.set(a+':'+b,chain);boundary.set(b+':'+a,[...chain].reverse());}
  const pending=THREE.ShapeUtils.triangulateShape(core.map(i=>polygon[i]),[]).map(face=>face.map(i=>core[i])),faces=[];
  while(pending.length){const t=pending.pop();let split=false;for(let edge=0;edge<3;edge++){const a=t[edge],b=t[(edge+1)%3],opposite=t[(edge+2)%3],chain=boundary.get(a+':'+b);if(chain?.length>2){for(let j=0;j<chain.length-1;j++)pending.push([chain[j],chain[j+1],opposite]);split=true;break;}}if(!split)faces.push(t);}

  for(const [a,b,c]of faces){const normal=new THREE.Vector3().subVectors(cap[b],cap[a]).cross(new THREE.Vector3().subVectors(cap[c],cap[a]));if(normal.dot(expected)>0)index.push(first+a,first+b,first+c);else index.push(first+a,first+c,first+b);}
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(index);geo.computeVertexNormals();
 // Join the duplicated UV seam of the section without blending cap normals.
 const normals=geo.attributes.normal;
 for(let j=0;j<=segments;j++){const a=j*(N+1),b=a+N,v=new THREE.Vector3().fromBufferAttribute(normals,a).add(new THREE.Vector3().fromBufferAttribute(normals,b)).normalize();normals.setXYZ(a,v.x,v.y,v.z);normals.setXYZ(b,v.x,v.y,v.z);}
 geo.userData={...geo.userData,tensionCut:{center,halfAngle:half,closedCaps:true},profile_perimeter_mm:perimeter};geo.computeBoundingBox();geo.computeBoundingSphere();return geo;
}

/** Build machining rectangles in (angle, axial-position) for longitudinal,
 * transverse and axial-face channels. Call with viewer.stonePlan(k).
 * Keys reflect observed renderer stonePlan fields, not reference assets. */
export function stoneChannels(view,k,points){
 const channelPoints=points.filter(p=>p.preset.includes('channel'));
 const groups=new Map(),ri=k.size/TAU;
 for(const p of channelPoints){const cross=p.preset==='cross-channel',key=cross?'cross:'+p.phi.toFixed(5):p.side?'side:'+p.sideSign:'outer:'+p.y.toFixed(4);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);}
 return [...groups].map(([key,g])=>{
  const p=g[0],size=p.size.width,r=ri+k.height,angles=g.map(s=>s.phi),ys=g.map(s=>s.y),isCross=key.startsWith('cross'),side=key.startsWith('side'),full=!isCross&&k.stone.quantity==='ringDependent100';
  const half=(size/2+.085),phiMid=(Math.min(...angles)+Math.max(...angles))/2;
  return {side,full,sign:p.sideSign||-1,cross:isCross,phi:phiMid,phiHalf:full?Math.PI:(isCross?half/r:(Math.max(...angles)-Math.min(...angles))/2+half/r),y:isCross?(Math.min(...ys)+Math.max(...ys))/2:p.y,yHalf:isCross?(Math.max(...ys)-Math.min(...ys))/2+half:half,radial:ri+k.height*.52,radialHalf:half,depth:Math.min(side?k.width*.3:k.height*.64,size*.48+.035),radius:r};
 });
}
const ramp=(edge,fade=.055)=>Math.min(1,Math.max(0,edge/fade));
/** Displace existing densely sampled exterior vertices INWARD, preserving a
 * closed solid and a visible metal floor. Material grouping can call this same
 * function and assign a polished material wherever depth>0.
 * Do not add the old raised Torus/Tube rails on top of these cavities. */
export function channelDisplacement(k,channels,x,y,z,nx,ny,nz){
 const r=Math.hypot(x,z),phi=Math.atan2(z,x),radial=(nx*x+nz*z)/r;let dr=0,dy=0;
 for(const c of channels){
  const angularEdge=c.full?Infinity:(c.phiHalf-Math.abs(wrap(phi-c.phi)))*c.radius;if(angularEdge<=0)continue;
  if(c.side){if(ny*c.sign<.3)continue;const edge=c.radialHalf-Math.abs(r-c.radial);if(edge>0)dy=-c.sign*Math.max(Math.abs(dy),c.depth*ramp(edge)*ramp(angularEdge));}
  else {if(radial<.15)continue;const edge=c.yHalf-Math.abs(y-c.y);if(edge>0)dr=Math.max(dr,c.depth*ramp(edge)*ramp(angularEdge));}
 }
 return {x:x*(r-dr)/r,y:y+dy,z:z*(r-dr)/r,depth:Math.max(dr,Math.abs(dy))};
}

/** Stable local frame: gem width is tangential, height is across the band.
 * Apply selected cut rotation to gem.rotation.y separately. */
export function stoneFrame(phi,normal){
 const tangent=new THREE.Vector3(-Math.sin(phi),0,Math.cos(phi));
 const width=tangent.clone().addScaledVector(normal,-tangent.dot(normal)).normalize();
 const cross=width.clone().cross(normal).normalize();
 return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(width,normal,cross));
}
