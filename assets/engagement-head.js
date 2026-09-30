import * as THREE from 'three';
import { sideSizes } from './engagement-state.js?v=20260930-er3';
import { CUT, clawLayout, diameter, girdleOutline, clawStone, stoneMesh, stoneOptics, accentOptics, available } from './engagement-stones.js?v=20260930-er3';
import { basketGeometry } from './engagement-basket.js?v=20260930-er3';
// The ring's head: centre stone(s), their claws, bezels, halos, hidden halo, surprise stone and side stones.
// Ring space: y up, band axis z; the head sits on the shank top at x = 0. Units mm.

// Cuts a design needs (centre, trilogy sides, second Toi-et-Moi stone), so their libraries can be loaded first.
export function requiredCuts(s){
  const list=[s.cut];
  if(s.arrangement==='trilogie')list.push(sideCutOf(s,s.cut));
  if(s.arrangement==='toietmoi')list.push(secondCutOf(s));
  return list;
}
export const sideCutOf=(s,cut)=>s.sideShape==='auto'?CUT[cut].sides??'round':s.sideShape;
export const secondCutOf=s=>s.secondShape==='same'?s.cut:s.secondShape;
const fallback=cut=>available(cut)?cut:'round';

// Bezel profile rows: [scale of the girdle outline, height in stone radii], from the lip over the crown edge down
// into the cup. Rows outside the girdle keep a constant wall thickness (mitred offset along the outline normal).
const BEZEL=[[.95,.05],[1,.13],[1.055,.17],[1.11,.155],[1.14,.1],[1.15,0],[1.13,-.2],[1.03,-.45],[.84,-.68],[.62,-.84],[.5,-.8],[.8,-.4],[.95,-.05]];
function outlineNormals(outline){
  const n=outline.length;let area=0;for(let i=0;i<n;i++){const a=outline[i],b=outline[(i+1)%n];area+=a.x*b.y-b.x*a.y;}
  const orient=Math.sign(area)||1;
  return outline.map((p,i)=>{
    const e1=p.clone().sub(outline[(i+n-1)%n]).normalize(),e2=outline[(i+1)%n].clone().sub(p).normalize();
    const n1=new THREE.Vector2(e1.y,-e1.x),mid=n1.clone().add(new THREE.Vector2(e2.y,-e2.x));
    if(mid.lengthSq()<1e-8)return n1.multiplyScalar(orient);
    mid.normalize();return mid.multiplyScalar(orient*Math.min(2.5,1/Math.max(.2,mid.dot(n1))));
  });
}
const bezelPoint=(p,normal,k)=>k>=1?p.clone().addScaledVector(normal,k-1):p.clone().multiplyScalar(k);
// Full bezel, or (half bezel) only the outline stretches in `keep`, each closed with end caps.
function bezelGeometry(outline,r,keep=null){
  const n=outline.length,m=BEZEL.length,normals=outlineNormals(outline),position=[],index=[];
  const ranges=[];
  if(!keep)ranges.push({start:0,count:n,closed:true});
  else{let i=0;while(i<n){if(keep(i)){let j=i;while(j<n&&keep(j))j++;ranges.push({start:i,count:j-i,closed:false});i=j;}else i++;}
    if(ranges.length>1&&ranges[0].start===0&&ranges.at(-1).start+ranges.at(-1).count===n){const last=ranges.pop();ranges[0]={start:last.start,count:last.count+ranges[0].count,closed:false};}}
  const profile2d=BEZEL.map(([k,y])=>new THREE.Vector2(k,y)),caps=THREE.ShapeUtils.triangulateShape(profile2d,[]);
  for(const {start,count,closed} of ranges){
    const base=position.length/3;
    for(let c=0;c<count;c++){const i=(start+c)%n;for(const [k,y] of BEZEL){const q=bezelPoint(outline[i],normals[i],k);position.push(q.x*r,y*r,q.y*r);}}
    const rows=closed?count:count-1;
    for(let c=0;c<rows;c++)for(let j=0;j<m;j++){const a=base+c*m+j,b=base+((c+1)%count)*m+j,cc=base+((c+1)%count)*m+(j+1)%m,d=base+c*m+(j+1)%m;index.push(a,d,b,b,d,cc);}
    if(!closed)for(const [row,flip] of [[0,true],[count-1,false]])for(const t of caps)index.push(...(flip?[t[0],t[2],t[1]]:t).map(j=>base+row*m+j));
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(position,3));geo.setIndex(index);geo.computeVertexNormals();
  // The winding follows the outline direction: make the outer wall face outward.
  const probe=ranges[0].start,normal=geo.attributes.normal,out=outline[probe];
  if(normal.getX(6)*out.x+normal.getZ(6)*out.y<0){for(let i=0;i<index.length;i+=3)[index[i+1],index[i+2]]=[index[i+2],index[i+1]];geo.setIndex(index);geo.computeVertexNormals();}
  return geo;
}
// Beaded edge (milgrain): small metal beads along a path, instanced.
const bead=new THREE.SphereGeometry(1,10,8);
function milgrain(points,radius,material,closed=true){
  const list=[],spacing=radius*2.15;let carry=0;
  for(let i=0;i<(closed?points.length:points.length-1);i++){
    const a=points[i],b=points[(i+1)%points.length],length=a.distanceTo(b);let t=carry;
    while(t<length){list.push(a.clone().lerp(b,t/length));t+=spacing;}carry=t-length;
  }
  const mesh=new THREE.InstancedMesh(bead,material,list.length),m=new THREE.Matrix4();
  list.forEach((p,i)=>mesh.setMatrixAt(i,m.makeScale(radius,radius,radius).setPosition(p)));mesh.userData.sharedGeometry=true;return mesh;
}
// Melee ring along a path (halo, hidden halo), stones spaced by path length; beads or claws between them.
function meleeRing(group,ctx,path,{radius,tilt=null,optics,beadMaterial,y}){
  const count=Math.max(8,Math.round(path.getLength()/(radius*2.2))),normal=new THREE.Vector3();
  for(let i=0;i<count;i++){
    const t=i/count,p=path.getPointAt(t).setY(y);
    const gem=stoneMesh(ctx.models,ctx.env,'round',radius,optics);gem.position.copy(p);
    if(tilt){normal.set(p.x,0,p.z).normalize().multiplyScalar(Math.sin(tilt)).setY(Math.cos(tilt));gem.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),normal);}
    group.add(gem);
    const b=new THREE.Mesh(new THREE.SphereGeometry(radius*.27,8,6),beadMaterial());b.position.copy(path.getPointAt((i+.5)/count)).setY(y+radius*.06);group.add(b);
  }
  return count;
}

// One stone in its setting (claws or bezel), centred at the local origin with the girdle at y = 0.
// Returns the group plus the rail geometry the shoulders attach to.
function setStone(ctx,s,cut,r,optics,{setting=s.setting,orientEW=false,low=false,prongs=s.prongs,withExtras=true}={}){
  const group=new THREE.Group(),crown=new THREE.Group();group.add(crown);if(orientEW)crown.rotation.y=Math.PI/2;
  crown.add(stoneMesh(ctx.models,ctx.env,cut,r,optics));
  const outline=girdleOutline(ctx.models,cut),length=Math.max(...outline.map(p=>Math.abs(p.y))),width=Math.max(...outline.map(p=>Math.abs(p.x)));
  let railX,railY;
  if(setting==='zarge'||setting==='halbzarge'){
    // Half bezel: open towards the shank sides (world x), whatever the stone's orientation.
    const keep=setting==='halbzarge'?(i=>{const p=outline[i],side=orientEW?Math.abs(p.x)/p.length():Math.abs(p.y)/p.length();return side>.5;}):null;
    const bezel=new THREE.Mesh(bezelGeometry(outline,r,keep),ctx.part(ctx.headMetal));crown.add(bezel);
    if(withExtras&&s.milgrain==='milgrain'){const normals=outlineNormals(outline);crown.add(milgrain(outline.map((p,i)=>{const q=bezelPoint(p,normals[i],1.13);return new THREE.Vector3(q.x*r,.13*r,q.y*r);}),.075,ctx.part(ctx.headMetal)));}
    railX=r*.6;railY=-.5*r;
  }else if(setting==='krappen'){
    const layout=clawLayout(cut,prongs),geometry=basketGeometry(clawStone(ctx.models,cut),outline,layout,{double:prongs==='double',tip:s.prongTip,low,key:cut+'|'+prongs});
    const basket=new THREE.Mesh(geometry,ctx.part(ctx.headMetal));basket.userData.sharedGeometry=true;basket.scale.setScalar(r);crown.add(basket);
    // Upper gallery rail: y -0.345, scale 0.805 (long stones step in by the same distance along their length).
    railX=r*(orientEW?(length>1?length-(1-.805):.805*length):.805*width);railY=-.345*r;
  }
  return {group,crown,outline,length:length*r,width:width*r,railX,railY,extentX:(orientEW?length:width)*r,extentZ:(orientEW?width:length)*r};
}

// Halo rail around a setting (outline in stone radii, rotated with the stone), clear of the claws.
function haloPath(ctx,s,cut,r,y,extra=0){
  let outline=girdleOutline(ctx.models,cut);
  if(s.haloShape==='cushion'){const ratio=CUT[cut].ratio;outline=outline.map((_,i)=>{const a=i/outline.length*Math.PI*2,c=Math.cos(a),sn=Math.sin(a),k=2/3.5;return new THREE.Vector2(Math.sign(c)*Math.abs(c)**k*1.02,Math.sign(sn)*Math.abs(sn)**k*1.02*ratio);});}
  const n=outline.length,claw=new Float32Array(n);
  if(s.setting==='krappen'){
    const geometry=basketGeometry(clawStone(ctx.models,cut),girdleOutline(ctx.models,cut),clawLayout(cut,s.prongs),{double:s.prongs==='double',tip:s.prongTip,key:cut+'|'+s.prongs}),bp=geometry.attributes.position;
    for(let i=0;i<bp.count;i++){if(bp.getY(i)*r<-.6)continue;const x=bp.getX(i),z=bp.getZ(i),k=((Math.round(Math.atan2(z,x)/(Math.PI*2)*n))%n+n)%n;claw[k]=Math.max(claw[k],Math.hypot(x,z)*r);}
  }
  const bezel=s.setting==='zarge'?1.15*r:0;
  const floor=outline.map((p,i)=>Math.max(p.length()*r+.62+extra,bezel+.5+extra,Math.max(claw[(i+n-1)%n],claw[i],claw[(i+1)%n])+.47+extra));
  let reach=floor.slice();for(let pass=0;pass<3;pass++)reach=reach.map((v,i)=>Math.max(floor[i],(reach[(i+n-1)%n]+2*v+reach[(i+1)%n])/4));
  return new THREE.CatmullRomCurve3(outline.map((p,i)=>{const d=p.length()||1;return new THREE.Vector3(p.x/d*reach[i],y,p.y/d*reach[i]);}),true);
}

/**
 * buildHead(state, ctx) -> {group, seat, r, cut, mounts, tension, flushBlockers}
 * ctx: {models, env, part(material) -> enhanced clone, headMetal, bandTop (shank top at x = 0, mm), bandTopAt(x)}
 * mounts: [{x, y, z}] points the shoulders run into (per side, +x first); empty when the head has no shoulders.
 * tension: for the tension look, {seat, grip (half width of the stone along x), depth} for the shank ends.
 */
export function buildHead(s,ctx){
  const group=new THREE.Group(),cut=fallback(s.cut),r=diameter(s.carat,cut)/2,low=s.height==='niedrig',ew=s.orient==='ew';
  const optics=stoneOptics(s.stone,s),accent=accentOptics(s.accent),meleeR=s.accentSize==='kraeftig'?.5:.39;
  const bezel=s.setting==='zarge'||s.setting==='halbzarge';
  const result={group,r,cut,mounts:[],tension:null,flushBlockers:[]};
  if(s.setting==='spann'){
    // Tension look: the stone floats between the shank ends; its culet stays clear of the finger.
    const seat=Math.max(ctx.bandTop+.35*r,ctx.ri+.3+.85*r),stone=setStone(ctx,s,cut,r,optics,{setting:'none'});
    stone.group.position.set(0,seat,0);group.add(stone.group);
    Object.assign(result,{seat,tension:{seat,grip:stone.width,depth:.85*r}});
    return result;
  }
  if(s.arrangement==='toietmoi'){
    // Two stones side by side on a diagonal, each in its own setting; the second can differ in shape, kind and size.
    const cut2=fallback(secondCutOf(s)),r2=s.secondSize==='kleiner'?r*.82:r*Math.cbrt(CUT[cut].ratio/CUT[cut2].ratio)*(CUT[cut2].size/CUT[cut].size);
    const kind2=s.secondStone==='same'?s.stone:s.secondStone,optics2=stoneOptics(kind2,{...s,color:kind2===s.stone?s.color:(kind2==='sapphire'?'blue':kind2==='fancy'?'fancyYellow':'')});
    const a=setStone(ctx,s,cut,r,optics),b=setStone(ctx,s,cut2,r2,optics2);
    const along=(a.extentZ+b.extentZ)/2*1.02,across=Math.min(r,r2)*.55;
    const place=(stone,x,z,rr)=>{const top=ctx.bandTopAt(x),seat=top+rr*(bezel?.5:.92);stone.group.position.set(x,seat,z);group.add(stone.group);result.mounts.push({x:x+Math.sign(x)*stone.railX,y:seat+stone.railY,z});return seat;};
    result.seat=Math.max(place(a,-across,-along/2,r),place(b,across,along/2,r2));
    result.second={cut:cut2,r:r2,kind:kind2};
    return result;
  }
  const seat=ctx.bandTop+r*(bezel?.5:low?.64:.92),main=setStone(ctx,s,cut,r,optics,{orientEW:ew,low});
  main.group.position.set(0,seat,0);group.add(main.group);Object.assign(result,{seat,extentX:main.extentX,extentZ:main.extentZ});
  if(s.arrangement!=='trilogie')result.mounts=[{x:main.railX,y:seat+main.railY,z:0},{x:-main.railX,y:seat+main.railY,z:0}];
  // Hidden halo: a ring of melee under the girdle, tilted outward; visible from the side only.
  if(s.gallery==='hiddenhalo'){
    const y=bezel?-.52*r:-.3*r,scale=bezel?1.08:.88,outline=girdleOutline(ctx.models,cut),path=new THREE.CatmullRomCurve3(outline.map(p=>{const q=ew?new THREE.Vector2(-p.y,p.x):p;const d=q.length()||1;return new THREE.Vector3(q.x*r*scale+q.x/d*.28,0,q.y*r*scale+q.y/d*.28);}),true);
    const holder=new THREE.Group();holder.position.set(0,seat,0);group.add(holder);
    meleeRing(holder,ctx,path,{radius:.3,tilt:.95,optics:accent,beadMaterial:()=>ctx.part(ctx.headMetal),y});
    const rail=new THREE.Mesh(new THREE.TubeGeometry(path,200,.12,8,true),ctx.part(ctx.headMetal));rail.position.y=y-.24;holder.add(rail);
    result.flushBlockers.push('verdeckter Halo');
  }
  // Surprise stone: one small stone in the side of the basket, facing the side view.
  if(s.surprise!=='none'&&s.setting==='krappen'){
    const x=(ew?main.length:main.width)*.62,y=seat-.56*r,gem=stoneMesh(ctx.models,ctx.env,'round',.55,s.surprise==='diamond'?{}:accentOptics(s.surprise));
    gem.position.set(x+.12,y,0);gem.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(1,0,0));group.add(gem);
    const collet=new THREE.Mesh(new THREE.TorusGeometry(.58,.11,8,32),ctx.part(ctx.headMetal));collet.position.set(x+.06,y,0);collet.rotation.y=Math.PI/2;group.add(collet);
    result.flushBlockers.push('Überraschungsstein');
  }
  // Halo and double halo around the centre setting.
  if(s.arrangement==='halo'||s.arrangement==='doppelhalo'){
    const rings=s.arrangement==='doppelhalo'?2:1;
    for(let k=0;k<rings;k++){
      const path=haloPath(ctx,s,cut,r,0,k*(meleeR*2+.18)),holder=new THREE.Group();holder.position.set(0,seat,0);if(ew)holder.rotation.y=Math.PI/2;group.add(holder);
      holder.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path.points.map(p=>p.clone().setY(-.24-k*.12)),true),240,.22,10,true),ctx.part(ctx.headMetal)));
      meleeRing(holder,ctx,path,{radius:meleeR,optics:accent,beadMaterial:()=>ctx.part(ctx.headMetal),y:-k*.12});
      if(s.milgrain==='milgrain'){const pts=path.getSpacedPoints(240).slice(0,-1);for(const side of [-1,1])holder.add(milgrain(pts.map(p=>{const d=Math.hypot(p.x,p.z)||1;return new THREE.Vector3(p.x+p.x/d*side*(meleeR+.1),-.2-k*.12,p.z+p.z/d*side*(meleeR+.1));}),.06,ctx.part(ctx.headMetal)));}
    }
  }
  // Trilogy: two side stones close beside the centre, raised on short posts and tilted half as far as the shank.
  if(s.arrangement==='trilogie'){
    const side=fallback(sideCutOf(s,cut)),factor=sideSizes[s.sideSize][1],rs=r*factor*(CUT[side].step?.95:1),sideOptics=accent;
    const turn=side==='pear'?Math.PI/2:0,sideOutline=girdleOutline(ctx.models,side);
    // Half extent of the side stone towards the centre (pear rotated to point inward).
    const reachX=rs*Math.max(...sideOutline.map(p=>turn?Math.abs(p.y):Math.abs(p.x)));
    const lift=rs*.92+r*.42,gap=(r+reachX)*1.04+(side==='pear'?-.1*rs:0),along=(CUT[cut].sideZ??0)*r;
    let angle=Math.asin(Math.min(.9,gap/ctx.bandTop));
    for(let i=0;i<4;i++)angle=Math.asin(Math.min(.9,(gap-lift*Math.sin(angle*.5)-(reachX-rs))/ctx.bandTop));
    for(const sign of [-1,1]){
      const base=new THREE.Vector3(sign*Math.sin(angle),Math.cos(angle),0).multiplyScalar(ctx.bandTop-.3).setZ(along),axis=new THREE.Vector3(sign*Math.sin(angle*.5),Math.cos(angle*.5),0);
      const stone=setStone(ctx,s,side,rs,sideOptics,{prongs:'4',withExtras:false,setting:s.setting==='halbzarge'?'zarge':s.setting});
      // Pear sides point their tip inward; step-cut sides turn their wide end to the centre.
      stone.crown.rotation.y=side==='pear'?(sign>0?Math.PI/2:-Math.PI/2):CUT[side].step&&sign<0?Math.PI:0;
      stone.group.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis);stone.group.position.copy(base).addScaledVector(axis,lift+.3);group.add(stone.group);
      const length=lift-rs*.92+.3,post=new THREE.Mesh(new THREE.CylinderGeometry(rs*.22,rs*.3,length,20),ctx.part(ctx.headMetal));
      post.position.copy(base).addScaledVector(axis,length/2);post.quaternion.copy(stone.group.quaternion);group.add(post);
    }
    result.side={cut:side,r:rs};
  }
  return result;
}
