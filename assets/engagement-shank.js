import * as THREE from 'three';
import { surfaceMaps, roughness as FINISH_ROUGHNESS } from './wedding-finishes.js?v=20260929-real4';
import { stoneMesh } from './engagement-stones.js?v=20260930-er3';
// The shank: a procedural sweep around the finger with a chosen cross-section profile, width and form, plus
// cathedral shoulders, pavé, channel walls and milgrain. Ring space: y up, band axis z, x to the right; the
// angle theta runs from the top (theta = 0) towards +x. Units mm; the inner radius ri is the ring size.

export const THICKNESS=1.6;
const smooth=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
const twistDims=width=>{const rho=Math.min(.7,width*.26);return {rho,A:Math.max(.05,width/2-rho),B:rho*.82};};
// Outer radius at the top of the shank (theta = 0), where the head sits.
export function shankTop(s,ri){if(s.shank==='twist'){const {rho,B}=twistDims(s.width);return ri+2*rho+B;}return ri+THICKNESS;}

// Cross-section as a closed loop u in [0, 1): a rounded rectangle (superellipse) whose outer half is shaped by
// the profile. Returns [radial offset from ri, z] for a width w and thickness t. The inside is always a gentle
// comfort curve: the ring size sits at the middle, the edges lift away from the finger.
function section(profile,u,w,t){
  const phi=u*Math.PI*2,c=Math.cos(phi),s=Math.sin(phi),p=profile==='flach'?7:4.2;
  const zn=Math.sign(c)*Math.abs(c)**(2/p),yn=Math.sign(s)*Math.abs(s)**(2/p);
  const shape=yn<=0?1:profile==='flach'?1:profile==='messerkante'?.52+.48*(1-Math.abs(zn))**1.15:.6+.4*Math.sqrt(Math.max(0,1-zn*zn));
  const r=t/2+t/2*yn*shape+(yn<0?.12*zn*zn*(-yn):0);
  return [r,zn*w/2];
}
/**
 * sweep({profile, theta0, theta1, closed, width(theta), thick(theta), zShift(theta), ri, steps}) -> BufferGeometry
 * With uv: u runs around the ring (0..1 per full turn), v around the cross-section, for finish textures.
 */
function sweep({profile,theta0,theta1,closed,width,thick,zShift=()=>0,rise=()=>0,ri,steps=360,m=48,clampX=null}){
  const rows=closed?steps:steps+1,position=[],uv=[],index=[];
  for(let i=0;i<rows;i++){
    const th=theta0+(theta1-theta0)*i/steps,nx=Math.sin(th),ny=Math.cos(th),w=width(th),t=thick(th),dz=zShift(th),lift=rise(th);
    for(let j=0;j<m;j++){
      const [r,z]=section(profile,j/m,w,t);let x=nx*(ri+lift+r),y=ny*(ri+lift+r);
      if(clampX&&Math.abs(x)<clampX&&y>0){x=Math.sign(nx||1)*clampX;}
      position.push(x,y,z+dz);uv.push(th/(Math.PI*2),j/m);
    }
  }
  for(let i=0;i<(closed?rows:rows-1);i++)for(let j=0;j<m;j++){const a=i*m+j,b=((i+1)%rows)*m+j,c=((i+1)%rows)*m+(j+1)%m,d=i*m+(j+1)%m;index.push(a,b,d,b,c,d);}
  if(!closed){
    // End caps: fans from each end section's centre.
    for(const [row,flip] of [[0,false],[rows-1,true]]){
      const base=position.length/3;let cx=0,cy=0,cz=0;for(let j=0;j<m;j++){cx+=position[(row*m+j)*3];cy+=position[(row*m+j)*3+1];cz+=position[(row*m+j)*3+2];}
      position.push(cx/m,cy/m,cz/m);uv.push(0,0);
      for(let j=0;j<m;j++){const a=row*m+j,b=row*m+(j+1)%m;index.push(...(flip?[base,b,a]:[base,a,b]));}
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(position,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(index);
  g.computeVertexNormals();g.computeBoundingSphere();return g;
}
// Tube along a curve; `tip` tapers the last half so a shoulder can run into the thin gallery rail.
function tube(points,radius,material,tip=radius){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),geo=new THREE.TubeGeometry(curve,48,radius,12,false);
  if(tip!==radius){const p=geo.attributes.position,c=new THREE.Vector3(),v=new THREE.Vector3();
    for(let i=0;i<=48;i++){const k=1+(tip/radius-1)*smooth(.45,1,i/48);curve.getPointAt(i/48,c);
      for(let j=0;j<=12;j++){const n=i*13+j;v.fromBufferAttribute(p,n).sub(c).multiplyScalar(k).add(c);p.setXYZ(n,v.x,v.y,v.z);}}
    p.needsUpdate=true;geo.computeVertexNormals();geo.computeBoundingSphere();}
  return new THREE.Mesh(geo,material);
}
// Twist: one strand running round the finger twice; the passes lie side by side under the head and cross
// on both shoulders and at the bottom.
function twistGeometry(ri,width){
  const {rho,A,B}=twistDims(width),R0=ri+rho+B,points=[];
  for(let i=0;i<384;i++){const t=i/384*Math.PI*4,angle=Math.PI/2+t,radius=R0+B*Math.sin(t*1.5);points.push(new THREE.Vector3(Math.cos(angle)*radius,Math.sin(angle)*radius,A*Math.cos(t*1.5)));}
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,true,'centripetal'),1152,rho,20,true);
}
// Finish textures on the shank (the head always stays polished).
function finished(metal,finish,circumference,perimeter,aniso){
  if(finish==='polished')return metal;
  const m=metal.clone();m.userData.f82=metal.userData.f82;m.roughness=FINISH_ROUGHNESS[finish]??.2;
  const maps=surfaceMaps(finish),tile=finish.startsWith('hammered')?5:4,brushed=/brushed|horizontal/.test(finish);
  for(const [property,key] of [['normalMap','normal'],['roughnessMap','rough']]){const t=maps[key].clone();t.needsUpdate=true;t.repeat.set(Math.max(1,Math.round(circumference/tile)),Math.max(1,Math.round(perimeter/tile)));t.anisotropy=aniso;m[property]=t;}
  const strength=finish==='hammered-big'?.5:finish==='hammered-matte'?.42:finish==='ice-matte'?.32:brushed?.36:.23;m.normalScale.set(strength,strength);
  if(brushed){m.anisotropy=.8;m.anisotropyRotation=finish==='vertical-brushed'?0:Math.PI/2;}
  return m;
}
const bead=new THREE.SphereGeometry(1,10,8);
function instanced(points,radius,material){
  const mesh=new THREE.InstancedMesh(bead,material,points.length),m=new THREE.Matrix4();
  points.forEach((p,i)=>mesh.setMatrixAt(i,m.makeScale(radius,radius,radius).setPosition(p)));mesh.userData.sharedGeometry=true;return mesh;
}

/**
 * buildShank(state, ctx, head) -> {group, bore, bands (top paths for later use), openTop}
 * ctx: {models, env, part(material, bore) -> enhanced clone, metal (shank alloy), headMetal, ri, accentOptics, aniso}
 * head: result of buildHead (seat, r, mounts, tension, extentX/extentZ, second, footprintX)
 */
export function buildShank(s,ctx,head){
  const group=new THREE.Group(),ri=ctx.ri,W=s.width,T=THICKNESS,R=ri+T,profile=s.profile;
  const bore={radius:ri+.1,halfWidth:W*.4},circumference=Math.PI*2*(ri+T/2),perimeter=2*W+1.2*T;
  const shankMetal=finished(ctx.metal,s.finish,circumference,perimeter,ctx.aniso);
  const add=(geometry,material=shankMetal,withBore=true)=>{const mesh=new THREE.Mesh(geometry,ctx.part(material,withBore?bore:null));if(withBore)mesh.onBeforeRender=()=>ctx.sync(mesh);group.add(mesh);return mesh;};
  const result={group,bore,openTop:false};
  // Top centre line of the band (for pavé and milgrain): radius, z and width at angle theta, per strand.
  let topAt=th=>({r:R,z:0,w:W});
  if(s.shank==='twist'){
    add(twistGeometry(ri,W));
  }else if(s.shank==='geteilt'){
    // Split shank: the band parts at the shoulders into two strands that rise to the head's gallery.
    const split=.95,spread=Math.max(W*.3,(head.extentZ??2*head.r)*.5-W/4),lift=Math.max(0,head.seat-.35*head.r-R);
    add(sweep({profile,theta0:split,theta1:Math.PI*2-split,closed:false,width:()=>W,thick:()=>T,ri,steps:300}));
    const k=th=>smooth(0,1,1-Math.abs(th)/split),up=th=>lift*smooth(.3,1,k(th)),strand=(th,side)=>({r:ri+up(th)+T*(1-.12*k(th)),z:side*(W/4+spread*k(th)),w:W/2*(1-.08*k(th))});
    for(const side of [-1,1])add(sweep({profile,theta0:-split-.04,theta1:split+.04,closed:false,width:th=>strand(th,side).w,thick:th=>T*(1-.12*k(th)),rise:up,zShift:th=>strand(th,side).z,ri,steps:160}));
    topAt=(th,side)=>side?strand(th,side):{r:R,z:0,w:W};
  }else if(s.shank==='bypass'){
    // Bypass: the band ends run past the head on either side, offset along the finger.
    const toi=s.arrangement==='toietmoi',Z=toi?Math.abs(head.mounts[0]?.z??1.5):(head.extentZ??2*head.r)/2+W/2+.15;
    const beta=Math.asin(Math.min(.9,(toi?Math.abs(head.mounts[0]?.x??1)+.5:(head.extentX??2*head.r)*.55)/R));
    const end=th=>Math.max(smooth(beta+.35,-beta,th),smooth(Math.PI*2-beta-.35,Math.PI*2+beta,th));
    const up=Math.max(0,toi?head.seat-.95*head.r-R:head.seat-.62*head.r-R);
    add(sweep({profile,theta0:-beta,theta1:Math.PI*2+beta,closed:false,width:th=>W*(1-.5*smooth(.2,1,end(th))),thick:th=>T*(1-.35*smooth(.3,1,end(th))),rise:th=>up*smooth(.15,1,end(th)),
      zShift:th=>-Z*smooth(beta+.35,-beta,th)+Z*smooth(Math.PI*2-beta-.35,Math.PI*2+beta,th),ri,steps:420}));
  }else if(s.setting==='spann'&&head.tension){
    // Tension look: the band is open at the top; its ends thicken to the girdle and grip the stone.
    const grip=head.tension.grip,gap=Math.asin(Math.min(.95,grip/R)),reach=head.tension.seat+.28-ri,verj=s.shank==='verjuengt';
    add(sweep({profile,theta0:gap,theta1:Math.PI*2-gap,closed:false,width:th=>W*(verj?1-.3*smooth(.4,1,Math.cos(th)):1),
      thick:th=>T+(reach-T)*smooth(Math.cos(gap+.75),Math.cos(gap),Math.cos(th)),ri,steps:420,clampX:grip}));
    result.openTop=true;
  }else{
    const verj=s.shank==='verjuengt',taper=th=>verj?smooth(.45,1,Math.cos(th)):0;
    const width=th=>Math.max(1.3,W*(1-.38*taper(th))),thick=th=>T+.12*taper(th);
    add(sweep({profile,theta0:0,theta1:Math.PI*2,closed:true,width,thick,ri,steps:360}));
    topAt=th=>({r:ri+thick(th),z:0,w:width(th)});
    // Cathedral: shoulders rise in arches from the band into the head's gallery rail (or the bezel cup).
    if(s.shank==='kathedrale'&&head.mounts.length){
      const foot=R-T*.35,bezel=s.setting==='zarge'||s.setting==='halbzarge';
      for(const mount of head.mounts){const sign=Math.sign(mount.x)||1,rise=bezel?Math.min(3.4,head.r*.96):3.4;
        group.add(tube([[sign*4.5,Math.sqrt(foot**2-4.5**2),0],[sign*Math.min(rise,Math.abs(mount.x)+1.2),R+.3,0],[mount.x*(bezel?1:1),mount.y,mount.z]],.38,ctx.part(shankMetal),bezel?.38:head.r*.06));}
    }
  }
  // Pavé along the top of the band: shoulders, half or all the way round, in claws, French pavé or a channel.
  if(s.band!=='glatt'&&!['twist','bypass'].includes(s.shank)){
    const size=s.accentSize==='kraeftig'?.55:.43,clear=head.footprintX??head.r,start=Math.max(.3,Math.asin(Math.min(.95,(clear+.55)/R)));
    const split=s.shank==='geteilt',stop=split?.9:s.band==='schultern'?start+.62:s.band==='halb'?Math.PI/2:Math.PI;
    for(const strand of split?[-1,1]:[0])for(const sign of [-1,1]){
      const list=[];let th=start;
      while(th<=stop+1e-6){const {r,z,w}=topAt(th,strand),rad=Math.min(size,w/2-.2);if(rad>.2)list.push({th,rad,r,z});th+=(2*Math.max(.25,Math.min(size,w/2-.2))+.14)/r;}
      if(s.band==='rundum'&&list.length&&Math.abs(list.at(-1).th-Math.PI)<.02&&sign<0)list.pop();
      const points=list.map(({th,rad,r,z})=>{const n=new THREE.Vector3(sign*Math.sin(th),Math.cos(th),0);return {n,rad,p:n.clone().multiplyScalar(r-(s.bandSetting==='french'?.07:.12)).setZ(z)};});
      for(const {n,rad,p} of points){const gem=stoneMesh(ctx.models,ctx.env,'round',rad,ctx.accentOptics);gem.position.copy(p);gem.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),n);group.add(gem);}
      if(s.bandSetting==='kanal'){
        for(const side of [-1,1]){const path=points.map(({n,rad,p})=>p.clone().addScaledVector(n,.06).setZ(p.z+side*(rad+.1)));if(path.length>1)group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path),path.length*6,.13,8,false),ctx.part(shankMetal)));}
      }else{
        const beadR=s.bandSetting==='french'?.075:.11,beads=[];
        for(let i=0;i<points.length;i++){const a=points[i],b=points[i+1]??a;const mid=a.p.clone().lerp(b.p,i+1<points.length?.5:0).addScaledVector(a.n,.02);for(const side of [-1,1])beads.push(mid.clone().setZ(mid.z+side*a.rad*(s.bandSetting==='french'?.78:.92)));}
        if(beads.length)group.add(instanced(beads,beadR,ctx.part(shankMetal)));
      }
    }
  }
  // Milgrain: fine beads along both top edges of the band.
  if(s.milgrain==='milgrain'&&!['twist','geteilt'].includes(s.shank)){
    const beads=[],from=result.openTop?Math.asin(Math.min(.95,head.tension.grip/R))+.05:.25,to=Math.PI*2-from;
    for(let th=from;th<=to;){const {r,w}=topAt(th),[er,ez]=section(profile,.07,w,r-ri);const n=new THREE.Vector3(Math.sin(th),Math.cos(th),0);for(const side of [-1,1])beads.push(n.clone().multiplyScalar(ri+er+.03).setZ(side*Math.abs(ez)));th+=.16/r;}
    group.add(instanced(beads,.065,ctx.part(shankMetal)));
  }
  return result;
}
