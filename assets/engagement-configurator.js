import * as THREE from 'three';
import { OrbitControls } from 'three/OrbitControls.js';
import { GLTFLoader } from 'three/GLTFLoader.js';
import { loadJewelry, weddingGeometry, createStudio, diamondMesh, metalMaterial } from './jewelry-studio.js?v=20260929-real2';
import { styles, cuts, stones, grades, metals, heads, fourProngCuts, isDiamond, defaults, validateConfig, encodeConfig as encode, decodeConfig } from './engagement-state.js?v=20260929-er1';
import { createRingStudio, applyCameraResponse } from './ring-studio.js?v=20260929-real5';
import { enhanceMetal, syncRingOptics, metalF0, metalF82 } from './ring-optics.js?v=20260929-real4';
import { ContactShadows } from './contact-shadow.js?v=20260929-real2';
import { engravingMaps, engravedMetal, faceInward } from './engraving.js?v=20260929-real3';

const $=id=>document.getElementById(id);
function fromHash(){return decodeConfig(location.hash.slice(3));}
let state=location.hash.startsWith('#e=')?fromHash():defaults();
let renderer,scene,camera,controls,studio,models,ring,contact,ready=false,rotation=false,visible=true,scheduled=false,dirty=true;
const stage=$('erStage');
const format=n=>n.toLocaleString('de-DE',{maximumFractionDigits:2});
// Girdle length/width ratio and width relative to a round stone of the same weight.
// Princess, cushion and radiant stones and their baskets come from the wedding libraries (`extra`).
const CUT={round:{ratio:1,size:1},oval:{ratio:1.38,size:1},emerald:{ratio:1.35,size:1},princess:{ratio:1,size:.86,extra:true},cushion:{ratio:1,size:.9,extra:true},radiant:{ratio:1,size:.87,extra:true}};
const diameter=(carat=state.carat,cut=state.cut)=>6.5*CUT[cut].size*Math.cbrt(carat/CUT[cut].ratio);
// Trilogy: side stones 0.55 x the centre width, same cut for square stones, brilliants otherwise.
const SIDE=.55;
const sideCut=(cut=state.cut)=>CUT[cut].extra?cut:'round';
const sideCarat=()=>{const cut=sideCut(),d=diameter()*SIDE;return Math.max(.05,Math.round(CUT[cut].ratio*(d/(6.5*CUT[cut].size))**3/.05)*.05);};
// Coloured centre stones for the facet tracer; diamonds keep the approved defaults, grade I-J gets a faint warm body colour.
const STONE_OPTICS={sapphire:{color:0x2447a8,ior:1.77,dispersion:.009,absorption:.55,escapeWeight:.35},ruby:{color:0xc0203f,ior:1.77,dispersion:.009,absorption:.55,escapeWeight:.35},smaragd:{color:0x1f8a55,ior:1.58,dispersion:.006,absorption:.5,escapeWeight:.35}};
const centerOptics=()=>isDiamond(state)?(state.grade==='good'?{color:0xfff8ec,absorption:.3}:{}):STONE_OPTICS[state.stone];
const SWATCH={diamond:0xf4f6f8,lab:0xeaf0f5};

function choice(id,options,value,onChange,swatch=null){
  const el=$(id),focus=el.contains(document.activeElement)?document.activeElement.dataset.value:null;
  el.replaceChildren();
  for(const [key,label] of Object.entries(options)){
    const button=document.createElement('button');button.type='button';button.className='kf-chip'+(key===value?' is-on':'');
    button.dataset.value=key;button.setAttribute('aria-pressed',String(key===value));
    const color=swatch?.(key);
    if(color!=null){const dot=document.createElement('span');dot.className='atelier-metal';dot.style.setProperty('--metal','#'+color.toString(16).padStart(6,'0'));dot.setAttribute('aria-hidden','true');button.append(dot);}
    button.append(document.createTextNode(label));button.onclick=()=>onChange(key);el.append(button);
    if(focus===key)button.focus({preventScroll:true});
  }
}
const headText=()=>state.head==='same'?'':` · Fassung in ${heads[state.head]}`;
function summary(){
  const lines=['Verlobungsring – Juwelier Damla',styles[state.style][0]+(state.style==='zarge'?'':` · ${state.prongs} Krappen`),
    `Mittelstein: ${cuts[state.cut]} · ${format(state.carat)} ct ${stones[state.stone][0]}`+(isDiamond(state)?` · ${grades[state.grade]}`:'')];
  if(state.style==='trilogie')lines.push(`Seitensteine: 2 × ${cuts[sideCut()]} Diamant, je ca. ${format(sideCarat())} ct`);
  lines.push(`${metals[state.metal][0]} ${state.alloy} · Schiene ${format(state.width)} mm${headText()}`,`Ringgröße ${state.size}`);
  if(state.engraving)lines.push('Innengravur: '+state.engraving);
  lines.push('Preis und Verfügbarkeit auf Anfrage.');
  return lines.join('\n');
}
function change(key,value){state=validateConfig({...state,[key]:value});update();}
let hashTimer;
function update(){
  const labels=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,v[0]]));
  choice('erStyle',labels(styles),state.style,v=>change('style',v));
  choice('erStone',labels(stones),state.stone,v=>change('stone',v),k=>stones[k][1]??SWATCH[k]);
  choice('erCut',cuts,state.cut,v=>change('cut',v));
  choice('erGrade',grades,state.grade,v=>change('grade',v));$('erGradeWrap').hidden=!isDiamond(state);
  choice('erMetal',labels(metals),state.metal,v=>change('metal',v),k=>metals[k][1]);
  choice('erAlloy',state.metal==='platinum'?{'950':'950 Platin'}:{'585':'585 · 14 Karat','750':'750 · 18 Karat'},state.alloy,v=>change('alloy',v));
  choice('erHead',Object.fromEntries(Object.entries(heads).filter(([k])=>k!==state.metal)),state.head,v=>change('head',v),k=>metals[k==='same'?state.metal:k][1]);
  $('erStyleNote').textContent=styles[state.style][1];$('erProngs').value=state.prongs;$('erProngs').options[1].disabled=fourProngCuts.includes(state.cut);$('erProngsWrap').hidden=state.style==='zarge';
  for(const [id,key,suffix] of [['erCarat','carat',' ct'],['erWidth','width',' mm'],['erSize','size','']]){$(id).value=state[key];$(id+'Value').textContent=format(state[key])+suffix;}
  $('erEngraving').value=state.engraving;$('erChars').textContent=Array.from(state.engraving).length;
  const d=diameter();$('erDiamondSize').textContent=state.cut==='round'?`Durchmesser im Modell: ca. ${format(d)} mm`:CUT[state.cut].ratio===1?`Seitenlänge im Modell: ca. ${format(d)} mm`:`Maße im Modell: ca. ${format(d)} × ${format(d*CUT[state.cut].ratio)} mm`;
  $('erName').textContent=styles[state.style][0]+' · '+cuts[state.cut]+(isDiamond(state)?'':' · '+stones[state.stone][0]);
  $('erSpecs').textContent=`${metals[state.metal][0]} ${state.alloy}${headText()} · ${format(state.carat)} ct ${stones[state.stone][0]} · Größe ${state.size}`;
  $('erSummary').textContent=summary();
  const link=location.href.split('#')[0]+'#e='+encode(state);
  $('erWhatsapp').href='https://wa.me/496115807830?text='+encodeURIComponent(summary()+'\n\nMein Entwurf: '+link);
  clearTimeout(hashTimer);hashTimer=setTimeout(()=>history.replaceState(null,'',link),250);
  if(ready&&!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;buildRing();});}
}

// Princess, cushion and radiant stones with their four-prong baskets, loaded when first needed.
let extras=null,extrasReady=false;
function loadExtras(){
  extras??=Promise.all(['models/wedding-gems.glb?v=3','models/wedding-settings.glb?v=4'].map(file=>new GLTFLoader().loadAsync(new URL(file,import.meta.url).href)))
    .then(list=>{for(const gltf of list){gltf.scene.updateMatrixWorld(true);gltf.scene.traverse(o=>{if(o.isMesh)models.set(o.name,o.geometry.clone().applyMatrix4(o.matrixWorld));});}extrasReady=true;})
    .catch(error=>{extras=null;throw error;});
  return extras;
}
function disposeRing(){if(!ring)return;scene.remove(ring);ring.traverse(o=>{if(o.isMesh){if(!o.userData.sharedGeometry)o.geometry.dispose();for(const key of ['map','normalMap','roughnessMap','aoMap','alphaMap'])o.material[key]?.dispose();o.material.dispose();}});}
function addGem(group,cut,radius,position,normal,optics={}){
  const gem=diamondMesh(models.get('Diamond_'+cut),studio.diamond,optics);gem.scale.setScalar(radius);gem.position.copy(position);
  if(normal)gem.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),normal);
  gem.userData.sharedGeometry=true;group.add(gem);return gem;
}
// Each part gets its own enhanced clone: Material.clone() does not carry shader hooks.
const part=(metal,bore=null)=>enhanceMetal(metal.clone(),bore);
// Tube along a curve; `tip` tapers the last half so a shoulder can run into the thin gallery rail.
function tube(points,radius,material,tip=radius){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),geo=new THREE.TubeGeometry(curve,48,radius,12,false);
  if(tip!==radius){const p=geo.attributes.position,c=new THREE.Vector3(),v=new THREE.Vector3();
    for(let i=0;i<=48;i++){const k=1+(tip/radius-1)*THREE.MathUtils.smoothstep(i/48,.45,1);curve.getPointAt(i/48,c);
      for(let j=0;j<=12;j++){const n=i*13+j;v.fromBufferAttribute(p,n).sub(c).multiplyScalar(k).add(c);p.setXYZ(n,v.x,v.y,v.z);}}
    p.needsUpdate=true;geo.computeVertexNormals();geo.computeBoundingSphere();}
  return new THREE.Mesh(geo,part(material));
}
// Girdle outline of a stone model in plan view (convex hull, resampled by angle), in stone radii.
const outlines=new WeakMap();
function girdleOutline(geometry,n=96){
  if(outlines.has(geometry))return outlines.get(geometry);
  // Round and oval girdles are true curves; their facet polygon would flute a polished collar.
  if(geometry===models.get('Diamond_round')||geometry===models.get('Diamond_oval')){
    const box=geometry.boundingBox??(geometry.computeBoundingBox(),geometry.boundingBox),outline=[];
    for(let i=0;i<n;i++){const a=i/n*Math.PI*2;outline.push(new THREE.Vector2(Math.cos(a)*box.max.x,Math.sin(a)*box.max.z));}
    outlines.set(geometry,outline);return outline;
  }
  const p=geometry.attributes.position,points=[];for(let i=0;i<p.count;i++)points.push([p.getX(i),p.getZ(i)]);
  points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),lower=[],upper=[];
  for(const q of points){while(lower.length>=2&&cross(lower.at(-2),lower.at(-1),q)<=0)lower.pop();lower.push(q);}
  for(const q of points.slice().reverse()){while(upper.length>=2&&cross(upper.at(-2),upper.at(-1),q)<=0)upper.pop();upper.push(q);}
  const hull=lower.slice(0,-1).concat(upper.slice(0,-1)),outline=[];
  for(let i=0;i<n;i++){
    const a=i/n*Math.PI*2,dx=Math.cos(a),dz=Math.sin(a);let reach=0;
    for(let j=0;j<hull.length;j++){
      const A=hull[j],B=hull[(j+1)%hull.length],ex=B[0]-A[0],ez=B[1]-A[1],den=dx*ez-dz*ex;if(Math.abs(den)<1e-9)continue;
      const t=(A[0]*ez-A[1]*ex)/den,u=(A[0]*dz-A[1]*dx)/den;if(t>0&&u>=-1e-6&&u<=1+1e-6)reach=Math.max(reach,t);
    }
    outline.push(new THREE.Vector2(dx*reach,dz*reach));
  }
  outlines.set(geometry,outline);return outline;
}
// Bezel ("Zarge"): a polished collar lofted along the girdle. Its rounded lip is pressed onto the crown edge,
// the wall narrows into a cup below the stone. Profile rows: [scale of the girdle outline, height in stone radii].
const BEZEL=[[.95,.05],[1,.13],[1.055,.17],[1.11,.155],[1.14,.1],[1.15,0],[1.13,-.2],[1.03,-.45],[.84,-.68],[.62,-.84],[.5,-.8],[.8,-.4],[.95,-.05]];
function bezelGeometry(outline,r){
  const n=outline.length,m=BEZEL.length,position=[],index=[];
  for(const p of outline)for(const [k,y] of BEZEL)position.push(p.x*k*r,y*r,p.y*k*r);
  for(let i=0;i<n;i++)for(let j=0;j<m;j++){const a=i*m+j,b=((i+1)%n)*m+j,c=((i+1)%n)*m+(j+1)%m,d=i*m+(j+1)%m;index.push(a,d,b,b,d,c);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(position,3));geo.setIndex(index);geo.computeVertexNormals();
  // The winding depends on the outline direction: make the outer wall face outward.
  const normal=geo.attributes.normal;if(normal.getX(6)*outline[0].x+normal.getZ(6)*outline[0].y<0){for(let i=0;i<index.length;i+=3)[index[i+1],index[i+2]]=[index[i+2],index[i+1]];geo.setIndex(index);geo.computeVertexNormals();}
  return geo;
}
// Twist: one continuous strand that runs around the finger twice. The two passes lie side by side under the
// head, cross each other on both shoulders and once more at the bottom of the shank.
function twistBand(ri,width,material){
  const rho=Math.min(.7,width*.26),A=Math.max(.05,width/2-rho),B=rho*.82,R0=ri+rho+B,points=[];
  for(let i=0;i<384;i++){const t=i/384*Math.PI*4,angle=Math.PI/2+t,radius=R0+B*Math.sin(t*1.5);points.push(new THREE.Vector3(Math.cos(angle)*radius,Math.sin(angle)*radius,A*Math.cos(t*1.5)));}
  const mesh=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,true,'centripetal'),1152,rho,20,true),part(material));
  return {mesh,top:R0+rho};
}
// Prong head: stone, basket and the bearer ring joining the prong feet; local y runs along the setting axis.
function prongHead(cut,radius,prongs,headMetal,optics){
  const head=new THREE.Group(),stretch=CUT[cut].extra?1:CUT[cut].ratio;
  addGem(head,cut,radius,new THREE.Vector3(),null,optics);
  const basket=new THREE.Mesh(models.get(CUT[cut].extra?'Basket_'+cut:'Basket_'+prongs),part(headMetal));basket.userData.sharedGeometry=true;basket.scale.set(radius,radius,radius*stretch);head.add(basket);
  const bearer=new THREE.Mesh(new THREE.TorusGeometry(radius*.44,radius*.045,10,64),part(headMetal));bearer.rotation.x=Math.PI/2;bearer.scale.y=stretch;bearer.position.y=-radius*.92;head.add(bearer);
  return head;
}
function buildRing(){
  // Until the cut library has loaded, a new square or cushion stone shows as a brilliant; the ring rebuilds once it is there.
  const cut=CUT[state.cut].extra&&!extrasReady?'round':state.cut;
  if(cut!==state.cut)loadExtras().then(()=>{if(ready)buildRing();},error=>console.warn('Schliffe:',error));
  disposeRing();ring=new THREE.Group();scene.add(ring);
  const ri=state.size/(Math.PI*2),T=1.6,r=diameter(state.carat,cut)/2,shank=state.metal==='rose'?'red':state.metal;
  const tone=metalF0(shank,Number(state.alloy)||585);
  const metal=metalMaterial(tone,.06);metal.userData.f82=metalF82(shank);
  // Two-tone: the crown (prongs, bezel, halo) can be set in another metal than the shank.
  const headTone=state.head==='same'?tone:metalF0(state.head,state.head==='platinum'?950:state.alloy==='750'?750:585);
  const headMetal=metalMaterial(headTone,.06);headMetal.userData.f82=metalF82(state.head==='same'?shank:state.head);
  let bandTop=ri+T;
  if(state.style==='twist'){const twist=twistBand(ri,state.width,metal);ring.add(twist.mesh);bandTop=twist.top;}
  else{const band=new THREE.Mesh(weddingGeometry(models.get('Wedding_oval'),ri,T,state.width),part(metal,{radius:ri+.1,halfWidth:state.width*.4}));band.onBeforeRender=()=>syncRingOptics(band);band.rotation.x=Math.PI/2;ring.add(band);}
  const zarge=state.style==='zarge',optics=centerOptics();
  const seat=bandTop+r*(zarge?.5:.92),center=new THREE.Vector3(0,seat,0);
  if(zarge){
    // The stone sits lower in its collar; the cup sinks into the top of the shank.
    addGem(ring,cut,r,center,null,optics);
    const bezel=new THREE.Mesh(bezelGeometry(girdleOutline(models.get('Diamond_'+cut)),r),part(headMetal));bezel.position.copy(center);ring.add(bezel);
  }else{
    const head=prongHead(cut,r,state.prongs,headMetal,optics);head.position.copy(center);ring.add(head);
  }
  if(state.style!=='trilogie'){
    // Rising cathedral shoulders end inside the basket's gallery rail (local y -0.42, radius 0.81), tapered to its thickness;
    // under a bezel they run into the cup wall.
    const foot=bandTop-T*.35,rise=zarge?Math.min(3.4,r*.96):3.4;
    for(const sign of [-1,1])ring.add(tube([[sign*4.5,Math.sqrt(foot**2-4.5**2),0],[sign*rise,bandTop+.3,0],zarge?[sign*r*.6,seat-r*.5,0]:[sign*r*.79,seat-r*.42,0]],.38,metal,zarge?.38:r*.05));
  }
  if(state.style==='trilogie'){
    // Two side stones close beside the centre stone, raised on short posts and tilted only half as far as the
    // shank curves, so their girdles sit just below the centre girdle instead of sliding down the shoulders.
    const rs=r*SIDE,side=sideCut(cut),lift=rs*.92+r*.42,gap=(r+rs)*1.06;
    let angle=Math.asin(Math.min(.9,gap/bandTop));
    for(let i=0;i<4;i++)angle=Math.asin(Math.min(.9,(gap-lift*Math.sin(angle*.5))/bandTop));
    for(const sign of [-1,1]){
      const base=new THREE.Vector3(sign*Math.sin(angle),Math.cos(angle),0).multiplyScalar(bandTop-.3),axis=new THREE.Vector3(sign*Math.sin(angle*.5),Math.cos(angle*.5),0);
      const head=prongHead(side,rs,4,headMetal,{});head.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis);head.position.copy(base).addScaledVector(axis,lift+.3);ring.add(head);
      const length=lift-rs*.92+.3,post=new THREE.Mesh(new THREE.CylinderGeometry(rs*.22,rs*.3,length,20),part(headMetal));post.position.copy(base).addScaledVector(axis,length/2);post.quaternion.copy(head.quaternion);ring.add(post);
    }
  }
  if(state.style==='pave'){
    for(const sign of [-1,1])for(let i=0;i<7;i++){
      const a=Math.PI/2+sign*(.37+i*.098),normal=new THREE.Vector3(Math.cos(a),Math.sin(a),0);
      addGem(ring,'round',.43,normal.clone().multiplyScalar(ri+T-.12),normal);
      for(const z of [-.53,.53]){
        const bead=new THREE.Mesh(new THREE.SphereGeometry(.115,8,6),part(metal));bead.position.copy(normal.clone().multiplyScalar(ri+T-.10));bead.position.z=z;ring.add(bead);
      }
    }
  }
  if(state.style==='halo'){
    const count=20,hr=r+.62;let haloPoint;
    if(CUT[cut].extra){
      // Square and cushion stones: the halo follows the girdle outline at a constant distance.
      const path=new THREE.CatmullRomCurve3(girdleOutline(models.get('Diamond_'+cut)).map(p=>{const d=p.length()||1;return new THREE.Vector3(p.x*r+p.x/d*.62,seat-.24,p.y*r+p.y/d*.62);}),true);
      ring.add(new THREE.Mesh(new THREE.TubeGeometry(path,200,.22,10,true),part(headMetal)));
      haloPoint=t=>path.getPointAt(t%1).setY(seat);
    }else if(cut==='emerald'){
      const stretch=CUT.emerald.ratio,outline=new THREE.CurvePath(),points=[[-.64,-1],[.64,-1],[1,-.64],[1,.64],[.64,1],[-.64,1],[-1,.64],[-1,-.64]].map(([x,z])=>new THREE.Vector3(x*hr,seat-.24,z*hr*stretch));
      points.forEach((p,i)=>outline.add(new THREE.LineCurve3(p,points[(i+1)%points.length])));
      ring.add(new THREE.Mesh(new THREE.TubeGeometry(outline,160,.22,10,true),part(headMetal)));
      haloPoint=t=>outline.getPointAt(t%1).setY(seat);
    }else{
      const stretch=CUT[cut].ratio,rim=new THREE.Mesh(new THREE.TorusGeometry(hr,.22,10,96),part(headMetal));rim.rotation.x=Math.PI/2;rim.scale.y=stretch;rim.position.set(0,seat-.24,0);ring.add(rim);
      haloPoint=t=>new THREE.Vector3(Math.cos(t*Math.PI*2)*hr,seat,Math.sin(t*Math.PI*2)*hr*stretch);
    }
    for(let i=0;i<count;i++){
      addGem(ring,'round',.39,haloPoint(i/count));
      const bead=new THREE.Mesh(new THREE.SphereGeometry(.105,8,6),part(headMetal));bead.position.copy(haloPoint((i+.5)/count)).setY(seat+.025);ring.add(bead);
    }
  }
  if(state.engraving.trim()&&state.style!=='twist'){
    // Laser-engraved lettering cut into the inner surface (relief maps, same alloy and optics as the band).
    // The twisted shank has no cylindrical inside to engrave, so it is only listed in the summary there.
    const mask=document.createElement('canvas');mask.width=2048;mask.height=256;const ctx=mask.getContext('2d',{willReadFrequently:true});
    ctx.fillStyle='#000';ctx.fillRect(0,0,2048,256);ctx.translate(2048,0);ctx.scale(-1,1);ctx.fillStyle='#fff';ctx.font='72px Georgia, "Times New Roman", serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(state.engraving,1024,128,1800);
    const material=engravedMetal(tone,engravingMaps(mask,'laser'),renderer.capabilities.getMaxAnisotropy());material.userData.f82=metalF82(shank);enhanceMetal(material,{radius:ri+.1,halfWidth:state.width*.4});
    const engraving=new THREE.Mesh(faceInward(new THREE.CylinderGeometry(ri-.014,ri-.014,state.width*.8,192,1,true)),material);engraving.onBeforeRender=()=>syncRingOptics(engraving);engraving.rotation.x=Math.PI/2;ring.add(engraving);
  }
  metal.dispose();headMetal.dispose();
  // The ring stands on the studio floor: contact line where the band touches, soft shadow around it.
  ring.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(ring,true);contact.fit(bounds,bounds.min.y);contact.setBounce(tone);scene.updateMatrixWorld();contact.update(scene);
  dirty=true;
  stage.setAttribute('aria-label',`3D-Ansicht: ${styles[state.style][0]}, ${cuts[state.cut]}, ${format(state.carat)} Karat ${stones[state.stone][0]}, ${metals[state.metal][0]}${state.head==='same'?'':', Fassung in '+heads[state.head]}`);
}
function fit(view='hero'){
  if(!ready)return;
  const bounds=new THREE.Box3().setFromObject(ring),target=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3()),aspect=stage.clientWidth/stage.clientHeight;
  const distance=Math.max(size.y,size.x/aspect)*1.24/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));
  controls.target.copy(target);
  const direction=view==='top'?new THREE.Vector3(.05,1,.06):view==='side'?new THREE.Vector3(1,.2,.02):new THREE.Vector3(.65,.48,1);
  camera.position.copy(target).add(direction.normalize().multiplyScalar(distance));controls.minDistance=distance*.38;controls.maxDistance=distance*1.8;controls.update();
}
async function start(){
  try{
    models=await loadJewelry();
    // A shared link with a princess, cushion or radiant stone waits for that library instead of showing a brilliant first.
    if(CUT[state.cut].extra)await loadExtras().catch(error=>console.warn('Schliffe:',error));
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(Math.max(devicePixelRatio||1,1.5),2));
    applyCameraResponse(renderer);
    renderer.outputColorSpace=THREE.SRGBColorSpace;stage.append(renderer.domElement);renderer.domElement.setAttribute('aria-hidden','true');
    scene=new THREE.Scene();makeStudio();contact=new ContactShadows(renderer,{softHeight:14,softOpacity:.38});scene.add(contact.plane);
    camera=new THREE.PerspectiveCamera(32,1,.1,400);controls=new OrbitControls(camera,renderer.domElement);controls.addEventListener('change',()=>{dirty=true;});controls.enablePan=false;controls.enableDamping=true;controls.dampingFactor=.08;controls.autoRotateSpeed=.65;
    // Keep the chosen rotation mode during wheel, pinch and button zoom.
    ready=true;buildRing();
    new ResizeObserver(()=>{camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();renderer.setSize(stage.clientWidth,stage.clientHeight);fit();dirty=true;}).observe(stage);
    new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;}).observe(stage);
    renderer.setAnimationLoop(loop);
    renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();ready=false;renderer.setAnimationLoop(null);fallback();});
    renderer.domElement.addEventListener('webglcontextrestored',restore);
    document.querySelectorAll('[data-er-view]').forEach(b=>b.disabled=false);$('erImage').disabled=false;
  }catch(error){console.error('Ringansicht',error);ready=false;renderer?.setAnimationLoop(null);fallback();}
}
function makeStudio(){try{studio=createRingStudio(renderer);}catch(error){console.warn('Studiolicht:',error);studio=createStudio(renderer);}scene.environment=studio.metal;}
function loop(){if(document.hidden||!visible)return;controls.autoRotate=rotation;const moved=controls.update();if(!moved&&!dirty)return;dirty=false;renderer.render(scene,camera);stage.classList.add('is-bereit');}
// After a lost WebGL context the browser hands back an empty one: three re-uploads meshes and textures
// by itself, but rendered environments are gone, so the studio and the ring are rebuilt.
function restore(){
  try{makeStudio();if(ring){scene.remove(ring);ring=null;}stage.hidden=false;$('erFallback').hidden=true;$('erImage').hidden=false;
    document.querySelectorAll('[data-er-view]').forEach(b=>b.disabled=false);ready=true;buildRing();fit();dirty=true;renderer.setAnimationLoop(loop);}
  catch(error){console.error('Ringansicht',error);ready=false;fallback();}
}
function fallback(){stage.hidden=true;$('erFallback').hidden=false;$('erImage').hidden=true;document.querySelectorAll('[data-er-view]').forEach(b=>b.disabled=true);}
function rotationLabel(){const b=document.querySelector('[data-er-view="rotate"]');b.textContent=rotation?'Drehung pausieren':'Drehung starten';b.setAttribute('aria-pressed',String(rotation));}
document.querySelectorAll('[data-er-view]').forEach(button=>{button.disabled=true;button.onclick=()=>{
  if(!ready)return;const v=button.dataset.erView;
  if(v==='rotate'){rotation=!rotation;rotationLabel();}
  else if(v==='in'||v==='out'){const dir=camera.position.clone().sub(controls.target);camera.position.copy(controls.target).add(dir.setLength(THREE.MathUtils.clamp(dir.length()*(v==='in'?.8:1.25),controls.minDistance,controls.maxDistance)));controls.update();}
  else{rotation=false;rotationLabel();fit(v);}
};});
for(const [id,key] of [['erCarat','carat'],['erWidth','width'],['erSize','size']])$(id).oninput=e=>change(key,Number(e.target.value));
$('erProngs').onchange=e=>change('prongs',Number(e.target.value));$('erEngraving').oninput=e=>change('engraving',e.target.value);
// Fetch the cut library as soon as someone reaches for the cut chips, so a click rarely waits for it.
for(const type of ['pointerover','focusin'])$('erCut').addEventListener(type,()=>{if(models)loadExtras().catch(()=>{});});
$('erReset').onclick=()=>{state=defaults();update();rotation=false;rotationLabel();fit();};
$('erCopy').onclick=async()=>{try{await navigator.clipboard.writeText(summary()+'\n\n'+location.href.split('#')[0]+'#e='+encode(state));$('erStatus').textContent='Konfiguration und Link kopiert.';}catch{$('erStatus').textContent='Kopieren nicht möglich. Markieren Sie die Zusammenfassung und kopieren Sie den Link aus der Adresszeile.';}};
$('erImage').disabled=true;$('erImage').onclick=()=>{
  if(!ready)return;
  const ratio=renderer.getPixelRatio();try{renderer.setPixelRatio(Math.min(ratio*2,3));renderer.render(scene,camera);const a=document.createElement('a');a.download='damla-verlobungsring.png';a.href=renderer.domElement.toDataURL('image/png');a.click();}finally{renderer.setPixelRatio(ratio);renderer.render(scene,camera);}
};
window.addEventListener('hashchange',()=>{state=location.hash.startsWith('#e=')?fromHash():defaults();update();});
update();start();
