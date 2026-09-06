import * as THREE from 'three';
import { OrbitControls } from 'three/OrbitControls.js';
import { loadJewelry, weddingGeometry, createStudio, diamondMesh, metalMaterial } from './jewelry-studio.js';
import { styles, cuts, metals, defaults, validateConfig, encodeConfig as encode, decodeConfig } from './engagement-state.js';

const $=id=>document.getElementById(id);
function fromHash(){return decodeConfig(location.hash.slice(3));}
let state=location.hash.startsWith('#e=')?fromHash():defaults();
let renderer,scene,camera,controls,studio,models,ring,ready=false,rotation=false,visible=true,scheduled=false;
const stage=$('erStage');
const format=n=>n.toLocaleString('de-DE',{maximumFractionDigits:2});
const diameter=()=>6.5*Math.cbrt(state.carat/(state.cut==='oval'?1.38:state.cut==='emerald'?1.35:1));

function choice(id,options,value,onChange){
  const el=$(id),focus=el.contains(document.activeElement)?document.activeElement.dataset.value:null;
  el.replaceChildren();
  for(const [key,label] of Object.entries(options)){
    const button=document.createElement('button');button.type='button';button.className='kf-chip'+(key===value?' is-on':'');
    button.dataset.value=key;button.setAttribute('aria-pressed',String(key===value));
    if(id==='erMetal'){const dot=document.createElement('span');dot.className='atelier-metal';dot.style.setProperty('--metal','#'+metals[key][1].toString(16));dot.setAttribute('aria-hidden','true');button.append(dot);}
    button.append(document.createTextNode(label));button.onclick=()=>onChange(key);el.append(button);
    if(focus===key)button.focus({preventScroll:true});
  }
}
function summary(){return `Verlobungsring – Juwelier Damla\n${styles[state.style][0]} · ${state.prongs} Krappen\n${cuts[state.cut]} · ${format(state.carat)} ct Mittelstein\n${metals[state.metal][0]} ${state.alloy} · Schiene ${format(state.width)} mm\nRinggröße ${state.size}${state.engraving?'\nInnengravur: '+state.engraving:''}\nPreis und Verfügbarkeit auf Anfrage.`;}
function change(key,value){state=validateConfig({...state,[key]:value});update();}
let hashTimer;
function update(){
  choice('erStyle',Object.fromEntries(Object.entries(styles).map(([k,v])=>[k,v[0]])),state.style,v=>change('style',v));
  choice('erCut',cuts,state.cut,v=>change('cut',v));
  choice('erMetal',Object.fromEntries(Object.entries(metals).map(([k,v])=>[k,v[0]])),state.metal,v=>change('metal',v));
  choice('erAlloy',state.metal==='platinum'?{'950':'950 Platin'}:{'585':'585 · 14 Karat','750':'750 · 18 Karat'},state.alloy,v=>change('alloy',v));
  $('erStyleNote').textContent=styles[state.style][1];$('erProngs').value=state.prongs;$('erProngs').options[1].disabled=state.cut==='emerald';
  for(const [id,key,suffix] of [['erCarat','carat',' ct'],['erWidth','width',' mm'],['erSize','size','']]){$(id).value=state[key];$(id+'Value').textContent=format(state[key])+suffix;}
  $('erEngraving').value=state.engraving;$('erChars').textContent=Array.from(state.engraving).length;
  const d=diameter();$('erDiamondSize').textContent=state.cut==='round'?`Durchmesser im Modell: ca. ${format(d)} mm`:`Maße im Modell: ca. ${format(d)} × ${format(d*(state.cut==='oval'?1.38:1.35))} mm`;
  $('erName').textContent=styles[state.style][0]+' · '+cuts[state.cut];
  $('erSpecs').textContent=`${metals[state.metal][0]} ${state.alloy} · ${format(state.carat)} ct · Größe ${state.size}`;
  $('erSummary').textContent=summary();
  const link=location.href.split('#')[0]+'#e='+encode(state);
  $('erWhatsapp').href='https://wa.me/496115807830?text='+encodeURIComponent(summary()+'\n\nMein Entwurf: '+link);
  clearTimeout(hashTimer);hashTimer=setTimeout(()=>history.replaceState(null,'',link),250);
  if(ready&&!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;buildRing();});}
}

function disposeRing(){if(!ring)return;scene.remove(ring);ring.traverse(o=>{if(o.isMesh){if(!o.userData.sharedGeometry)o.geometry.dispose();o.material.map?.dispose();o.material.dispose();}});}
function addGem(group,cut,radius,position,normal){
  const gem=diamondMesh(models.get('Diamond_'+cut),studio.diamond);gem.scale.setScalar(radius);gem.position.copy(position);
  if(normal)gem.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),normal);
  gem.userData.sharedGeometry=true;group.add(gem);return gem;
}
function tube(points,radius,material){return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),48,radius,12,false),material.clone());}
function buildRing(){
  disposeRing();ring=new THREE.Group();scene.add(ring);
  const ri=state.size/(Math.PI*2),T=1.6,r=diameter()/2;
  const tone=new THREE.Color(state.alloy==='750'&&state.metal==='yellow'?0xf8c767:metals[state.metal][1]);
  const metal=metalMaterial(tone);
  const band=new THREE.Mesh(weddingGeometry(models.get('Wedding_oval'),ri,T,state.width),metal.clone());band.rotation.x=Math.PI/2;ring.add(band);
  const seat=ri+T+r*.92;
  const center=new THREE.Vector3(0,seat,0);
  addGem(ring,state.cut,r,center);
  const basket=new THREE.Mesh(models.get('Basket_'+state.prongs),metal.clone());basket.userData.sharedGeometry=true;
  basket.scale.set(r,r,r*(state.cut==='oval'?1.38:state.cut==='emerald'?1.35:1));basket.position.copy(center);ring.add(basket);
  // Rising cathedral shoulders meet the basket beneath the pavilion.
  for(const sign of [-1,1])ring.add(tube([[sign*4.5,Math.sqrt((ri+T*.65)**2-4.5**2),0],[sign*3.4,ri+T+.3,0],[sign*r*.52,seat-r*.72,0]],.38,metal));
  if(state.style==='pave'){
    for(const sign of [-1,1])for(let i=0;i<7;i++){
      const a=Math.PI/2+sign*(.37+i*.098),normal=new THREE.Vector3(Math.cos(a),Math.sin(a),0);
      addGem(ring,'round',.43,normal.clone().multiplyScalar(ri+T-.12),normal);
      for(const z of [-.53,.53]){
        const bead=new THREE.Mesh(new THREE.SphereGeometry(.115,8,6),metal.clone());bead.position.copy(normal.clone().multiplyScalar(ri+T-.10));bead.position.z=z;ring.add(bead);
      }
    }
  }
  if(state.style==='halo'){
    const stretch=state.cut==='oval'?1.38:state.cut==='emerald'?1.35:1;
    const count=20,hr=r+.62;
    const outline=state.cut==='emerald'?new THREE.CurvePath():null;
    if(outline){
      const points=[[-.64,-1],[.64,-1],[1,-.64],[1,.64],[.64,1],[-.64,1],[-1,.64],[-1,-.64]].map(([x,z])=>new THREE.Vector3(x*hr,seat-.24,z*hr*stretch));
      points.forEach((p,i)=>outline.add(new THREE.LineCurve3(p,points[(i+1)%points.length])));
      ring.add(new THREE.Mesh(new THREE.TubeGeometry(outline,160,.22,10,true),metal.clone()));
    }else{
      const rim=new THREE.Mesh(new THREE.TorusGeometry(hr,.22,10,96),metal.clone());rim.rotation.x=Math.PI/2;rim.scale.y=stretch;rim.position.set(0,seat-.24,0);ring.add(rim);
    }
    const haloPoint=t=>outline?outline.getPointAt(t).setY(seat):new THREE.Vector3(Math.cos(t*Math.PI*2)*hr,seat,Math.sin(t*Math.PI*2)*hr*stretch);
    for(let i=0;i<count;i++){
      addGem(ring,'round',.39,haloPoint(i/count));
      const bead=new THREE.Mesh(new THREE.SphereGeometry(.105,8,6),metal.clone());bead.position.copy(haloPoint((i+.5)/count)).setY(seat+.025);ring.add(bead);
    }
  }
  if(state.engraving.trim()){
    const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=256;const ctx=canvas.getContext('2d');
    ctx.translate(2048,0);ctx.scale(-1,1);ctx.fillStyle='#4d4035';ctx.font='72px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(state.engraving,1024,128,1800);
    const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
    const engraving=new THREE.Mesh(new THREE.CylinderGeometry(ri-.014,ri-.014,state.width*.8,192,1,true),new THREE.MeshBasicMaterial({map:tex,side:THREE.BackSide,transparent:true,depthWrite:false}));engraving.rotation.x=Math.PI/2;ring.add(engraving);
  }
  metal.dispose();
  stage.setAttribute('aria-label',`3D-Ansicht: ${styles[state.style][0]}, ${cuts[state.cut]}, ${format(state.carat)} Karat, ${metals[state.metal][0]}`);
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
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
    renderer.outputColorSpace=THREE.SRGBColorSpace;stage.append(renderer.domElement);renderer.domElement.setAttribute('aria-hidden','true');
    scene=new THREE.Scene();studio=createStudio(renderer);scene.environment=studio.metal;
    camera=new THREE.PerspectiveCamera(32,1,.1,400);controls=new OrbitControls(camera,renderer.domElement);controls.enablePan=false;controls.enableDamping=true;controls.dampingFactor=.08;controls.autoRotateSpeed=.65;
    // Keep the chosen rotation mode during wheel, pinch and button zoom.
    ready=true;buildRing();
    new ResizeObserver(()=>{camera.aspect=stage.clientWidth/stage.clientHeight;camera.updateProjectionMatrix();renderer.setSize(stage.clientWidth,stage.clientHeight);fit();}).observe(stage);
    new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;}).observe(stage);
    renderer.setAnimationLoop(()=>{if(document.hidden||!visible)return;controls.autoRotate=rotation;controls.update();renderer.render(scene,camera);stage.classList.add('is-bereit');});
    renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();ready=false;renderer.setAnimationLoop(null);fallback();});
    document.querySelectorAll('[data-er-view]').forEach(b=>b.disabled=false);$('erImage').disabled=false;
  }catch(error){console.error('Ringansicht',error);ready=false;renderer?.setAnimationLoop(null);fallback();}
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
$('erReset').onclick=()=>{state=defaults();update();rotation=false;rotationLabel();fit();};
$('erCopy').onclick=async()=>{try{await navigator.clipboard.writeText(summary()+'\n\n'+location.href.split('#')[0]+'#e='+encode(state));$('erStatus').textContent='Konfiguration und Link kopiert.';}catch{$('erStatus').textContent='Kopieren nicht möglich. Markieren Sie die Zusammenfassung und kopieren Sie den Link aus der Adresszeile.';}};
$('erImage').disabled=true;$('erImage').onclick=()=>{
  if(!ready)return;
  const ratio=renderer.getPixelRatio();try{renderer.setPixelRatio(Math.min(ratio*2,3));renderer.render(scene,camera);const a=document.createElement('a');a.download='damla-verlobungsring.png';a.href=renderer.domElement.toDataURL('image/png');a.click();}finally{renderer.setPixelRatio(ratio);renderer.render(scene,camera);}
};
window.addEventListener('hashchange',()=>{state=location.hash.startsWith('#e=')?fromHash():defaults();update();});
update();start();
