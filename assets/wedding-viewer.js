import {isTension,closedTensionGeometry,stoneChannels,channelDisplacement,stoneFrame,stoneSeats,seatDisplacement,smoothRingSeams} from './wedding-settings.js?v=20260922-quality4';
import * as THREE from 'three';
import {OrbitControls} from 'three/OrbitControls.js';
import {GLTFLoader} from 'three/GLTFLoader.js';
import {loadJewelry,weddingGeometry,createWeddingStudio,createStudio,diamondMesh} from './jewelry-studio.js?v=20260922-quality4';
import {sampleRingProfile} from './wedding-materials.js?v=20260921-blender2';
import {metalMaterial,metalColor} from './wedding-finishes.js?v=20260922-quality4';
import {METALS,GEM_COLORS,FONTS,engravingFont,clone} from './wedding-catalog.js?v=3';
import {effectiveDivision,stoneSize,count,OPTIONS,STONE_DATA,PROFILES} from './wedding-state.js?v=3';
const TAU=Math.PI*2,up=new THREE.Vector3(0,1,0);
const fontStyle=engravingFont;
const sample=(rows,y)=>{let low=0,high=rows.length-1;y=Math.max(rows[0][0],Math.min(rows[high][0],y));while(high-low>1){const mid=(high+low)>>1;if(rows[mid][0]>y)high=mid;else low=mid;}const a=rows[low],b=rows[high];return a[1]+(b[1]-a[1])*(y-a[0])/(b[0]-a[0]||1);};
function contour(geometry){const p=geometry.attributes.position,points=new Map();for(let i=0;i<p.count;i++){const y=p.getY(i),r=Math.hypot(p.getX(i),p.getZ(i));points.set(y.toFixed(4)+':'+r.toFixed(4),[y,r]);}return [...points.values()].sort((a,b)=>Math.atan2(b[1]-9.85,b[0])-Math.atan2(a[1]-9.85,a[0]));}
function dispose(group){const materials=new Set();group.traverse(o=>{if(!o.isMesh)return;if(!o.userData.sharedGeometry)o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])if(m&&!m.userData.sharedJewelry&&!materials.has(m)){materials.add(m);for(const property of ['map','normalMap','roughnessMap','bumpMap'])m[property]?.dispose();m.dispose();}});group.clear();}
function shadow(){
 const group=new THREE.Group();group.rotation.x=-Math.PI/2;
 const layer=(width,height,opacity,z)=>{const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(128,128,0,128,128,128);g.addColorStop(0,`rgba(48,40,28,${opacity})`);g.addColorStop(.28,`rgba(48,40,28,${opacity*.68})`);g.addColorStop(.62,`rgba(48,40,28,${opacity*.20})`);g.addColorStop(1,'rgba(48,40,28,0)');ctx.fillStyle=g;ctx.fillRect(0,0,256,256);const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false}));mesh.position.z=z;group.add(mesh);};
 layer(1,1,.17,0);layer(.35,.19,.40,.002);return group;
}
function lowestContact(ring){const mesh=ring.children[0],p=mesh.geometry.attributes.position,m=ring.matrixWorld.elements;let low=Infinity,best=new THREE.Vector3();for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),height=m[1]*x+m[5]*y+m[9]*z;if(height<low){low=height;best.set(m[0]*x+m[4]*y+m[8]*z,height,m[2]*x+m[6]*y+m[10]*z);}}return best;}

export class WeddingViewer{
 constructor(stage){this.stage=stage;this.rings=[];this.signatures=[];this.rotating=!matchMedia('(prefers-reduced-motion: reduce)').matches;this.dirty=true;this.visible=true;this.ready=false;this.lastTime=0;this.motionPhase=0;this.motionQuaternion=new THREE.Quaternion();this.motionAxis=new THREE.Vector3(0,1,0);this.profiles=new Map();this.contours=new Map();}
 async init(){
  this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));this.renderer.setSize(this.stage.clientWidth,this.stage.clientHeight);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.NeutralToneMapping;this.renderer.toneMappingExposure=.98;this.aniso=this.renderer.capabilities.getMaxAnisotropy();this.stage.append(this.renderer.domElement);this.renderer.domElement.setAttribute('aria-hidden','true');
  this.scene=new THREE.Scene();
  const extra=async file=>{const gltf=await new GLTFLoader().loadAsync(new URL(file,import.meta.url).href),map=new Map();gltf.scene.updateMatrixWorld(true);gltf.scene.traverse(o=>{if(o.isMesh){const geo=o.geometry.clone().applyMatrix4(o.matrixWorld);geo.userData={...o.userData};map.set(o.name,geo);}});return map;};
  const [base,profiles,gems,settings,studio]=await Promise.all([loadJewelry(),extra('models/wedding-profiles.glb?v=3'),extra('models/wedding-gems.glb?v=3'),extra('models/wedding-settings.glb?v=4'),createWeddingStudio(this.renderer).catch(()=>createStudio(this.renderer))]);
  this.library=new Map([...base,...profiles,...gems,...settings]);this.studio=studio;this.scene.environment=studio.metal;this.stage.dataset.studio='blender';
  for(const id of Object.keys(PROFILES)){const geo=this.library.get('Wedding_'+id);this.profiles.set(id,sampleRingProfile(geo));this.contours.set(id,contour(geo));}
  this.camera=new THREE.PerspectiveCamera(32,this.stage.clientWidth/this.stage.clientHeight,.1,600);this.camera.position.set(5,24,82);
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=.08;this.controls.enablePan=false;this.controls.autoRotateSpeed=.65;this.controls.minPolarAngle=Math.PI*.12;this.controls.maxPolarAngle=Math.PI*.68;
  this.group=new THREE.Group();this.scene.add(this.group);this.shadows=[shadow(),shadow()];this.scene.add(...this.shadows);
  // Large studio sources provide metal reflections without pin-point highlights.
  new ResizeObserver(()=>this.resize()).observe(this.stage);new IntersectionObserver(([e])=>this.visible=e.isIntersecting).observe(this.stage);
  this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.renderer.setAnimationLoop(null);document.querySelector('#kfWebglHinweis').hidden=false;});
  this.renderer.setAnimationLoop(time=>this.tick(time));this.ready=true;
 }
 update(state,fit=false){if(!this.ready)return;this.pending={state:clone(state),fit};if(this.updateRequested)return;this.updateRequested=true;requestAnimationFrame(()=>{this.updateRequested=false;const next=this.pending;this.build(next.state,next.fit);});}
 build(state,fit){
  for(let i=0;i<2;i++){
   const k=state.rings[i],signature=JSON.stringify(k);if(this.signatures[i]===signature)continue;
   if(this.rings[i]){this.group.remove(this.rings[i]);dispose(this.rings[i]);this.rings[i]=null;}
   this.signatures[i]=signature;this.shadows[i].visible=!!k;
   if(!k)continue;const ring=this.makeRing(k);this.rings[i]=ring;this.group.add(ring);
   ring.rotation.set(Math.PI/2,0,0);if(i===0)ring.rotateY(Math.PI);ring.rotateOnWorldAxis(new THREE.Vector3(0,1,0),i===0?.94:-1.14);ring.rotateOnWorldAxis(new THREE.Vector3(0,0,1),i===0?-.17:-.035);ring.userData.basePose=ring.quaternion.clone();
  }
  this.state=state;
  for(let i=0;i<state.rings.length;i++){const ring=this.rings[i];ring.quaternion.copy(ring.userData.basePose);ring.position.set(0,0,0);ring.updateMatrixWorld(true);ring.userData.contact=lowestContact(ring);const bounds=new THREE.Box3().setFromObject(ring,true),sign=state.rings.length===1?0:i===0?-1:1;const x=sign*((bounds.max.x-bounds.min.x)/2+2.2),z=i===0?-1:1.6;ring.position.set(x,-bounds.min.y,z);const radius=state.rings[i].size/TAU+state.rings[i].height;this.shadows[i].position.set(x+ring.userData.contact.x,.015,z+ring.userData.contact.z);this.shadows[i].scale.set(radius*2.7,radius*1.5,1);}
  this.fit(fit||!this.hasFrame);this.dirty=true;
 }
 profileIcon(id){if(id==='PB08')return '<svg viewBox="0 0 76 32" aria-hidden="true"><circle cx="38" cy="16" r="12"/></svg>';const rows=this.contours.get(id);if(!rows)return '';const path=rows.map(([y,r],i)=>(i?'L':'M')+(8+(y+2.25)*13.33).toFixed(2)+' '+(26-(r-9)*11).toFixed(2)).join(' ')+'Z';return `<svg viewBox="0 0 76 32" aria-hidden="true"><path d="${path}"/></svg>`;}
 sectionDiagram(k){const rows=this.contours.get(k.profile);if(!rows)return '';const scale=Math.min(31,180/k.width),x0=(250-k.width*scale)/2,y0=80;const path=rows.map(([y,r],i)=>(i?'L':'M')+(x0+(y/4.5+.5)*k.width*scale).toFixed(2)+' '+(y0-(r-9)/1.7*k.height*scale).toFixed(2)).join(' ')+'Z';return `<svg viewBox="0 0 250 95" aria-label="Querschnitt ${k.profile}"><path d="${path}" fill="#d8c2a0" stroke="#9e7e4d" stroke-width="1"/><path d="M${x0} 89H${250-x0}" stroke="#aaa08f" stroke-width=".6"/></svg>`;}
 radius(k,y,inner=false){return k.size/TAU+this.profiles.get(k.profile)[inner?'inside':'outside'](Math.max(-1,Math.min(1,y*2/k.width)),k.height);}
 grooveDepth(k,y,phi){
  let depth=0;const g=k.groove;
  for(const center of g.positions){const distance=Math.abs(y-center),half=g.width/2;if(distance>half)continue;const t=distance/half,d=Math.min(half,k.height*.65);
   if(g.form==='v-groove-60')depth=Math.max(depth,Math.min(k.height*.65,half/Math.tan(Math.PI/6))*(1-t));
   else if(g.form==='u-groove')depth=Math.max(depth,d*Math.sqrt(Math.max(0,1-t*t)));
   else if(g.form==='square-groove')depth=Math.max(depth,d*Math.min(1,(1-t)*14));
   else if(g.form==='facet-groove')depth=Math.max(depth,d*Math.min(1,(1-t)*2.4));
   else if(g.form==='raised-groove')depth=Math.max(depth,d*(1-Math.sqrt(Math.max(0,1-t*t)))*Math.min(1,(1-t)*20));
   else if(g.form==='perlage')depth=Math.max(depth,d*.55*(1-t*t)*(1+.45*Math.cos(phi*Math.floor(k.size/(g.width*.8)))));
  }
  for(const side of ['left','right'])if(k.edge.type===side||k.edge.type==='both'){const sign=side==='left'?-1:1,edge=k.width/2-k.edge[side+'Width'];if(sign*y>edge)depth=Math.max(depth,.15*Math.min(1,(sign*y-edge)/.045));}
  const division=effectiveDivision(k);let sum=0,total=division.rates.reduce((a,b)=>a+b,0);for(let i=0;i<division.rates.length-1;i++){sum+=division.rates[i];if(k.separations[i]){const center=(sum/total-.5)*k.width+this.waveOffset(k,phi);const half=k.separation.width/2,t=Math.abs(y-center)/half;if(t<1){const cut=k.groove.form==='v-groove-60'?half/Math.tan(Math.PI/6)*(1-t):half*Math.sqrt(Math.max(0,1-t*t));depth=Math.max(depth,Math.min(k.height*.65,cut));}}}
  return depth;
 }
 waveOffset(k,phi){const d=effectiveDivision(k);return d.type==='wave'?Math.sin(phi*k.cycles)*k.width*(d.rates.length===2?.24:.14):d.type==='diagonal'?Math.cos(phi)*k.width*.28:0;}
 metalIndex(k,y,r,phi){const d=effectiveDivision(k);if(d.type==='horizontal')return r>k.size/TAU+k.height*.54?0:1;const t=(y-this.waveOffset(k,phi))/k.width+.5,total=d.rates.reduce((a,b)=>a+b,0);let sum=0;for(let i=0;i<d.rates.length;i++){sum+=d.rates[i]/total;if(t<sum)return i;}return d.rates.length-1;}
 ringGeometry(k){
  let geo=weddingGeometry(this.library.get('Wedding_'+k.profile),k.size/TAU,k.height,k.width);const plan=this.stonePlan(k),channels=stoneChannels(this,k,plan),seats=stoneSeats(k,plan),innerAtY=y=>this.radius(k,y,true);
  if(!isTension(k)&&(k.groove.quantity||k.edge.type!=='none'||k.separations.some(Boolean)||channels.length||seats.length)){
   // Resample the Blender section at machining boundaries before applying cuts.
   const source=this.contours.get(k.profile),rows=[];
   for(let i=0;i<source.length;i++){const a=source[i],b=source[(i+1)%source.length],length=Math.hypot((b[0]-a[0])*k.width/4.5,(b[1]-a[1])*k.height/1.7),n=Math.max(1,Math.ceil(length/.045));for(let j=0;j<n;j++){const t=j/n;rows.push(new THREE.Vector2(k.size/TAU+(a[1]+(b[1]-a[1])*t-9)*k.height/1.7,(a[0]+(b[0]-a[0])*t)*k.width/4.5));}}
   rows.push(rows[0].clone());geo.dispose();geo=new THREE.LatheGeometry(rows,seats.length?512:384);
   const pos=geo.attributes.position,norm=geo.attributes.normal;
   for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),r=Math.hypot(x,z),radial=(norm.getX(i)*x+norm.getZ(i)*z)/r;if(radial<.12)continue;const depth=this.grooveDepth(k,y,Math.atan2(z,x));pos.setXYZ(i,x*(r-depth)/r,y,z*(r-depth)/r);}
   geo.computeVertexNormals();smoothRingSeams(geo);
  }
  if(isTension(k)){geo.dispose();geo=closedTensionGeometry(this,k,stoneSize(k).width);}
   const machined=new Float32Array(geo.attributes.position.count);if(channels.length||seats.length){const p=geo.attributes.position,n=geo.attributes.normal;for(let i=0;i<p.count;i++){const args=[p.getX(i),p.getY(i),p.getZ(i),n.getX(i),n.getY(i),n.getZ(i)],channel=channelDisplacement(k,channels,...args),seat=seatDisplacement(k,seats,...args,innerAtY),result=channel.depth>seat.depth?channel:seat;p.setXYZ(i,result.x,result.y,result.z);machined[i]=result.depth;}geo.computeVertexNormals();smoothRingSeams(geo);}
   const pos=geo.attributes.position,norm=geo.attributes.normal,idx=geo.index,groups=Array.from({length:10},()=>[]);const ri=k.size/TAU;
  for(let i=0;i<idx.count;i+=3){const ids=[idx.getX(i),idx.getX(i+1),idx.getX(i+2)];let x=0,y=0,z=0,nr=0;for(const j of ids){const vx=pos.getX(j),vz=pos.getZ(j),r=Math.hypot(vx,vz);x+=vx/3;y+=pos.getY(j)/3;z+=vz/3;nr+=(norm.getX(j)*vx+norm.getZ(j)*vz)/r/3;}const radius=Math.hypot(x,z),phi=Math.atan2(z,x);let group=this.metalIndex(k,y,radius,phi)*2+(nr>.35?0:1);
   if(nr>.2){for(const side of ['left','right'])if((k.edge.type===side||k.edge.type==='both')&&(side==='left'?-y:y)>k.width/2-k.edge[side+'Width']+.025)group=side==='left'?6:7;if(k.groove.positions.some(p=>Math.abs(y-p)<k.groove.width*.49))group=k.groove.color==='none'?this.metalIndex(k,y,radius,phi)*2+1:8;const division=effectiveDivision(k);let sum=0,total=division.rates.reduce((a,b)=>a+b,0);for(let boundary=0;boundary<division.rates.length-1;boundary++){sum+=division.rates[boundary];const center=(sum/total-.5)*k.width+this.waveOffset(k,phi);if(k.separations[boundary]&&Math.abs(y-center)<k.separation.width*.49)group=k.separation.color==='none'?this.metalIndex(k,y,radius,phi)*2+1:9;}}
   // Tension settings have an actual opening instead of a stone lying on solid metal.
   if(ids.some(j=>machined[j]>.005))group=this.metalIndex(k,y,radius,phi)*2+1;
   groups[group].push(...ids);
  }
  const indices=[];geo.clearGroups();for(let i=0;i<groups.length;i++){if(groups[i].length){geo.addGroup(indices.length,groups[i].length,i);for(const n of groups[i])indices.push(n);}}geo.setIndex(indices);geo.computeBoundingBox();geo.computeBoundingSphere();return geo;
 }
 makeRing(k){
  const group=new THREE.Group(),geometry=this.ringGeometry(k),dimensions={circumference:k.size+TAU*k.height,perimeter:2*(k.width+k.height)},materials=[];
  for(let i=0;i<3;i++)materials.push(metalMaterial(k.metals[i],k.metals[i].finish,dimensions,this.aniso),metalMaterial(k.metals[i],'polished',dimensions,this.aniso));
  for(const side of ['left','right'])materials.push(metalMaterial(k.metals[side==='left'?0:effectiveDivision(k).rates.length-1],k.edge[side+'Surface'],dimensions,this.aniso));
  materials.push(metalMaterial({...k.metals[0],color:k.groove.color==='none'?k.metals[0].color:k.groove.color},k.groove.surface,dimensions,this.aniso));
  materials.push(metalMaterial({...k.metals[0],color:k.separation.color==='none'?k.metals[0].color:k.separation.color},'polished',dimensions,this.aniso));
  group.add(new THREE.Mesh(geometry,materials));
  const points=this.stonePlan(k);for(const p of points)this.addStone(group,k,p,materials);
  
  if(k.engraving.type!=='none'&&(k.engraving.text||k.engraving.art))group.add(this.engraving(k));
  return group;
 }
 stonePlan(k){
  const s=k.stone;if(s.preset==='none')return[];const list=[];
  if(s.preset==='free')return s.free.map(g=>({phi:g.angle/180*Math.PI-.25,y:g.position,size:OPTIONS.sizes.find(x=>x.id===g.size)||OPTIONS.sizes[0],quality:g.quality,cut:'brilliant',preset:'bezel',side:false}));
  const addSet=(secondary=false)=>{
   const size=stoneSize(k,secondary),quality=secondary?s.secondaryQuality:s.quality,preset=secondary?s.secondarySetting:s.preset,cut=secondary?'brilliant':s.cut,rows=secondary?1:s.rows;
   let total=count(k,secondary)/(s.bothSides?2:1),n=Math.max(1,Math.round(total/rows));if(s.preset==='combined'&&!secondary)n=1;
   const ri=k.size/TAU+k.height,spacing=size.width+.2;
   let delta=spacing/ri,start=-.25-(n-1)*delta/2;
   const quantity=secondary?s.secondaryQuantity:s.preset.startsWith('memoire')?s.memoireQuantity:s.quantity;
   if(quantity==='ringDependent100'){delta=TAU/n;start=-.25;}
   else if(s.spreading?.startsWith('stoneDependent-'))delta=spacing*(1+Number(s.spreading.split('-')[1])/100)/ri;
   else if(s.spreading?.startsWith('ringDependent-'))delta=(TAU*Number(s.spreading.split('-')[1])/100)/(s.spreading==='ringDependent-100'?n:Math.max(1,n-1));
   if(quantity!=='ringDependent100')start=-.25-(n-1)*delta/2;
   const margin=size.width/2+.35;
   let y=s.orientation==='left'?-k.width/2+margin:s.orientation==='right'?k.width/2-margin:s.orientation==='free'?s.position:0;if(s.preset.startsWith('memoire'))y=k.width/2-size.width/2-(s.preset==='memoire2'?.15:.20);
   for(let row=0;row<rows;row++)for(let i=0;i<n;i++){
    let phi=start+i*delta,yPos=y+(row-(rows-1)/2)*(size.width+.22);
    if(s.preset==='cross-channel'){phi=-.25+(row-(rows-1)/2)*spacing/ri;yPos=(i-(n-1)/2)*spacing;}
    if(secondary&&s.preset==='combined'){const side=i%2===0?-1:1,offset=(Math.floor(i/2)+1)*spacing+stoneSize(k).width*.55;phi=-.25+side*offset/ri;}
    list.push({phi:phi+s.offset/180*Math.PI,y:yPos,size,quality,cut,preset,side:s.preset.startsWith('side-'),sideSign:s.orientation==='right'?1:-1});
    if(s.bothSides&&s.preset.startsWith('memoire'))list.push({...list.at(-1),y:-yPos,side:false});
   }
  };
  addSet();if(s.preset==='combined')addSet(true);return list;
 }
 addStone(group,k,p,materials){
  const setting=new THREE.Group(),source=this.library.get('Diamond_'+(p.cut==='brilliant'?'round':p.cut)),r=(p.size.width3d||p.size.width)/2;
  let gem,topBasket;
  if(p.quality==='black')gem=new THREE.Mesh(source,new THREE.MeshPhysicalMaterial({color:0x151821,metalness:.12,roughness:.12,ior:2.42,clearcoat:.3,envMapIntensity:1.2,flatShading:true}));
  else gem=diamondMesh(source,this.studio.diamond,{color:GEM_COLORS[p.quality]??0xffffff,ior:['rubin','saphir'].includes(p.quality)?1.77:2.417,dispersion:['rubin','saphir'].includes(p.quality)?.009:.014,absorption:.72,escapeWeight:.22});
  gem.userData.sharedGeometry=true;gem.scale.set(r,r,r);if(p.cut!=='brilliant')gem.scale.z=(p.size.height3d||p.size.height||p.size.width)/2/(p.cut==='oval'?1.38:1);
  setting.add(gem);
  const primary=k.metals[this.metalIndex(k,p.y,this.radius(k,p.y),p.phi)],metal=new THREE.MeshPhysicalMaterial({color:metalColor(primary),metalness:1,roughness:.075,envMapIntensity:1.15});
  const tension=p.preset==='clamping-open'||(p.preset==='combined'&&k.stone.setting==='tension');
   const top=p.preset==='top'||(k.stone.preset==='combined'&&k.stone.setting==='top'&&p.preset==='combined');if(!top&&!tension)gem.position.y=-r*.12;
  if(top){const alloy=k.stone.mountingMetal?.split('-')[1]||'white';metal.color=metalColor({color:METALS[alloy]?alloy:'white',grade:585});const name=p.cut==='brilliant'?(k.stone.mounting==='round6'?'round6':'round4'):p.cut,basket=new THREE.Mesh(this.library.get('Basket_'+name),metal);basket.userData.sharedGeometry=true;basket.scale.set(r,r,(p.size.height3d||p.size.height||p.size.width)/2/(p.cut==='oval'?1.38:1));setting.add(basket);topBasket=basket;}
  else if(p.preset.includes('section')||p.preset.startsWith('memoire')){
   const n=p.preset==='memoire2'?2:4;
   for(let i=0;i<n;i++){const a=p.preset==='memoire2'?Math.PI*i:p.preset==='memoire4'?[.48,-.48,Math.PI+.48,Math.PI-.48][i]:TAU*i/n+Math.PI/4,bead=new THREE.Mesh(p.preset==='memoire2'?new THREE.CapsuleGeometry(r*.065,r*.9,6,12):new THREE.SphereGeometry(r*.12,24,16),metal);if(p.preset==='memoire2')bead.rotation.x=Math.PI/2;bead.position.set(Math.cos(a)*r*.97,r*.03,Math.sin(a)*r*.9);setting.add(bead);}
  }else if(!p.preset.includes('channel')&&!tension){
   if(p.cut==='brilliant'||p.cut==='oval'){const rim=new THREE.Mesh(new THREE.TorusGeometry(r*1.02,r*.045,8,40),metal);rim.rotation.x=Math.PI/2;if(p.cut==='oval')rim.scale.y=(p.size.height3d||p.size.height)/(p.size.width3d||p.size.width);setting.add(rim);}
   else{for(let i=0;i<4;i++){const bar=new THREE.Mesh(new THREE.BoxGeometry(r*2.05,r*.065,r*.065),metal);bar.rotation.y=i*Math.PI/2;bar.position.set(i%2?r*(i===1?1:-1):0,0,i%2?0:r*(i===0?1:-1));setting.add(bar);}}
  }
  const y=p.y,h=.005,dr=(this.radius(k,y+h)-this.radius(k,y-h))/(2*h);let normal=new THREE.Vector3(Math.cos(p.phi),-dr,Math.sin(p.phi)).normalize(),radius=this.radius(k,y),py=y;
  if(p.side){normal.set(0,p.sideSign,0);radius=k.size/TAU+k.height*.52;py=p.sideSign*k.width/2;}
  setting.quaternion.copy(stoneFrame(p.phi,normal));setting.rotateY((p.size.rotation||0)*Math.PI/180);const lift=top?r*.96:-r*.035;
  setting.position.set(Math.cos(p.phi)*radius+normal.x*lift,py+normal.y*lift,Math.sin(p.phi)*radius+normal.z*lift);
  if(topBasket){
   // Seat the authored gallery against the actual curved band, avoiding an air gap.
   topBasket.updateMatrix();setting.updateMatrix();const matrix=setting.matrix.clone().multiply(topBasket.matrix),positions=topBasket.geometry.attributes.position,v=new THREE.Vector3();let gap=Infinity;
   for(let i=0;i<positions.count;i++){v.fromBufferAttribute(positions,i).applyMatrix4(matrix);if(Math.abs(v.y)<=k.width/2)gap=Math.min(gap,Math.hypot(v.x,v.z)-this.radius(k,v.y));}
   if(Number.isFinite(gap)&&gap>0)setting.position.addScaledVector(normal,-(gap*1.03+.02));
  }
  group.add(setting);
 }
 engraving(k){
  const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=256;const ctx=canvas.getContext('2d');
  const draw=()=>{ctx.clearRect(0,0,2048,256);ctx.save();ctx.translate(2048,0);ctx.scale(-1,1);ctx.fillStyle='#8b784e';ctx.font='100px '+fontStyle(k.engraving);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(k.engraving.text,1024,128,1900);ctx.restore();};draw();
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  if(k.engraving.type==='individual'&&k.engraving.art){const image=new Image();image.onload=()=>{ctx.clearRect(0,0,2048,256);ctx.save();ctx.translate(2048,0);ctx.scale(-1,1);ctx.drawImage(image,0,0,2048,256);ctx.restore();const pixels=ctx.getImageData(0,0,2048,256);for(let i=0;i<pixels.data.length;i+=4){const shade=(pixels.data[i]+pixels.data[i+1]+pixels.data[i+2])/3;pixels.data[i]=112;pixels.data[i+1]=92;pixels.data[i+2]=52;pixels.data[i+3]=255-shade;}ctx.putImageData(pixels,0,0);texture.needsUpdate=true;this.dirty=true;};image.src=k.engraving.art;}
  const rows=[];for(let i=0;i<=64;i++){const y=(-.36+i/64*.72)*k.width;rows.push(new THREE.Vector2(this.radius(k,y,true)-.018,y));}
  const geometry=new THREE.LatheGeometry(rows,256,Math.PI*.2,Math.PI*1.6),material=new THREE.MeshPhysicalMaterial({color:metalColor(k.metals[0]),metalness:1,roughness:.34,map:texture,bumpMap:texture,bumpScale:-.045,transparent:true,side:THREE.BackSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});return new THREE.Mesh(geometry,material);
 }
 resize(){if(!this.ready)return;const w=this.stage.clientWidth,h=this.stage.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();if(this.state)this.fit(true);this.dirty=true;}
 fit(force=false){if(!this.rings.some(Boolean))return;const bounds=new THREE.Box3().setFromObject(this.group),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),fy=THREE.MathUtils.degToRad(this.camera.fov),fx=2*Math.atan(Math.tan(fy/2)*this.camera.aspect);const distance=Math.max(size.x/(2*Math.tan(fx/2)),size.y/(2*Math.tan(fy/2)))*1.22;const direction=this.camera.position.clone().sub(this.controls.target).normalize();this.controls.target.copy(center);this.controls.minDistance=distance*.48;this.controls.maxDistance=distance*2.6;const now=this.camera.position.distanceTo(center);if(force||now>distance*1.6||now<distance*.6)this.camera.position.copy(center).addScaledVector(direction,distance);this.controls.update();}
 tick(time){if(!this.ready||document.hidden||!this.visible||time-this.lastTime<32)return;const dt=Math.min((time-this.lastTime)/1000,.1);this.lastTime=time;this.controls.autoRotate=false;if(this.rotating){this.motionPhase+=dt*.23;this.rings.forEach((ring,i)=>{if(!ring)return;const angle=Math.sin(this.motionPhase)*(i===0?.18:-.22);ring.quaternion.copy(ring.userData.basePose).premultiply(this.motionQuaternion.setFromAxisAngle(this.motionAxis,angle));const c=ring.userData.contact,cos=Math.cos(angle),sin=Math.sin(angle);this.shadows[i].position.set(ring.position.x+c.x*cos+c.z*sin,.015,ring.position.z-c.x*sin+c.z*cos);});this.dirty=true;}const changed=this.controls.update(dt);if(!changed&&!this.dirty&&this.hasFrame)return;this.renderer.render(this.scene,this.camera);this.dirty=false;this.hasFrame=true;this.stage.classList.add('is-bereit');}
 view(name){if(name==='rotate'){this.rotating=!this.rotating;return;}if(name==='in'||name==='out'){const offset=this.camera.position.clone().sub(this.controls.target);offset.multiplyScalar(name==='in'?.86:1.16);offset.clampLength(this.controls.minDistance,this.controls.maxDistance);this.camera.position.copy(this.controls.target).add(offset);}else{const views={hero:[5,14,82],front:[0,2,82],side:[80,16,8],inside:[-25,50,60]},direction=new THREE.Vector3(...views[name]).normalize(),distance=this.camera.position.distanceTo(this.controls.target);this.camera.position.copy(this.controls.target).addScaledVector(direction,distance);}this.controls.update();this.dirty=true;}
 snapshot(){if(!this.ready)return'';this.renderer.render(this.scene,this.camera);return this.renderer.domElement.toDataURL('image/png');}
 download(){const a=document.createElement('a');a.download='damla-trauringe.png';a.href=this.snapshot();a.click();}
}
