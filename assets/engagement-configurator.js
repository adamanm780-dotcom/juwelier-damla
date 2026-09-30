import * as THREE from 'three';
import { OrbitControls } from 'three/OrbitControls.js';
import { loadJewelry, weddingGeometry, createStudio, metalMaterial } from './jewelry-studio.js?v=20260929-real2';
import * as S from './engagement-state.js?v=20260930-er3';
import { createRingStudio, applyCameraResponse } from './ring-studio.js?v=20260929-real5';
import { enhanceMetal, syncRingOptics, metalF0, metalF82 } from './ring-optics.js?v=20260929-real4';
import { ContactShadows } from './contact-shadow.js?v=20260929-real2';
import { engravingMaps, engravedMetal, faceInward } from './engraving.js?v=20260929-real3';
import { CUT, diameter, libraryState, loadLibrary, accentOptics } from './engagement-stones.js?v=20260930-er3';
import { buildHead, requiredCuts, sideCutOf, secondCutOf } from './engagement-head.js?v=20260930-er3';
import { buildShank, shankTop } from './engagement-shank.js?v=20260930-er3';

const $=id=>document.getElementById(id);
const format=n=>n.toLocaleString('de-DE',{maximumFractionDigits:2});
const labels=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,Array.isArray(v)?v[0]:v]));
function fromHash(){
  if(location.hash.startsWith('#e='))return S.decodeConfig(location.hash.slice(3));
  if(location.hash.startsWith('#c='))return S.decodeDesignCode(decodeURIComponent(location.hash.slice(3)))??S.defaults();
  return null;
}
let state=fromHash()??S.defaults();
// Private enquiry details (never in links or codes), kept as a local draft only.
const PRIVATE_KEY='damla-er-private',SAVED_KEY='damla-er-saved';
let priv={proposal:false,date:'',budget:'open',note:''};
try{priv={...priv,...JSON.parse(localStorage.getItem(PRIVATE_KEY)||'{}')};}catch{}
let renderer,scene,camera,controls,studio,models,ring,contact,ready=false,rotation=false,visible=true,scheduled=false,dirty=true;
const stage=$('erStage'),waiting=new Set();

// Plan-view silhouettes for the shape chips (24 x 24, outlined in the chip's text colour).
const SHAPE_ICONS={round:'<circle cx="12" cy="12" r="8.5"/>',oval:'<ellipse cx="12" cy="12" rx="6.4" ry="9.2"/>',
  princess:'<rect x="4" y="4" width="16" height="16"/>',cushion:'<rect x="4" y="4" width="16" height="16" rx="5"/>',elongatedCushion:'<rect x="5.5" y="2.5" width="13" height="19" rx="4.6"/>',
  pear:'<path d="M12 2.6C14.6 6.4 18.4 10.2 18.4 14.9A6.4 6.4 0 0 1 5.6 14.9C5.6 10.2 9.4 6.4 12 2.6Z"/>',
  emerald:'<path d="M8.6 2.8H15.4L18 5.4V18.6L15.4 21.2H8.6L6 18.6V5.4Z"/><path d="M9.6 6.2H14.4V17.8H9.6Z" stroke-width=".8"/>',
  radiant:'<path d="M6.8 4H17.2L20 6.8V17.2L17.2 20H6.8L4 17.2V6.8Z"/><path d="M6.8 4L17.2 20M17.2 4L6.8 20" stroke-width=".7"/>',
  marquise:'<path d="M12 1.8C19 7 19 17 12 22.2C5 17 5 7 12 1.8Z"/>',
  asscher:'<path d="M8.4 3.6H15.6L20.4 8.4V15.6L15.6 20.4H8.4L3.6 15.6V8.4Z"/><path d="M9.8 7.2H14.2L16.8 9.8V14.2L14.2 16.8H9.8L7.2 14.2V9.8Z" stroke-width=".8"/>',
  heart:'<path d="M12 20.4L3.9 12.3A4.6 4.6 0 1 1 12 7.1A4.6 4.6 0 1 1 20.1 12.3Z"/>',oldEuropean:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.6" stroke-width=".8"/>'};
const SWATCH={diamond:0xf4f6f8,lab:0xeaf0f5,moissanite:0xf1f4f7,own:0xefe9df,same:0xf4f6f8};
const STONE_NOTES={lab:'Synthetischer Diamant: im Labor hergestellt, chemisch und optisch ein Diamant.',moissanite:'Moissanit ist kein Diamant, sondern ein synthetischer Stein mit noch mehr Feuer.',
  smaragd:'Smaragd ist weicher als Diamant und am besten in einer Zarge oder im Halo geschützt.',aquamarine:'Aquamarin ist weicher als Diamant und am besten in einer Zarge oder im Halo geschützt.',
  morganite:'Morganit ist weicher als Diamant und am besten in einer Zarge oder im Halo geschützt.',fancy:'Ob die Farbe natürlich oder behandelt ist, klären wir persönlich.',
  own:'Bringen Sie Ihren Stein mit: Die 3D-Ansicht zeigt ihn beispielhaft als Diamant in der gewählten Form.'};
const COLOR_NAMES={D:'River',E:'River',F:'Top Wesselton',G:'Top Wesselton',H:'Wesselton',I:'Top Crystal',J:'Top Crystal',K:'Crystal'};
const CLARITY_NAMES={IF:'lupenrein',VVS1:'sehr, sehr kleine Einschlüsse',VVS2:'sehr, sehr kleine Einschlüsse',VS1:'sehr kleine Einschlüsse',VS2:'sehr kleine Einschlüsse',SI1:'kleine Einschlüsse',SI2:'kleine Einschlüsse'};

function choice(id,options,value,onChange,{swatch=null,icon=null,disabled=null,font=null}={}){
  const el=$(id),focus=el.contains(document.activeElement)?document.activeElement.dataset.value:null;
  el.replaceChildren();
  for(const [key,label] of Object.entries(options)){
    const button=document.createElement('button');button.type='button';button.className='kf-chip'+(key===value?' is-on':'');
    button.dataset.value=key;button.setAttribute('aria-pressed',String(key===value));
    const why=disabled?.(key);if(why){button.disabled=true;button.title=why;}
    const color=swatch?.(key);
    if(color!=null){const dot=document.createElement('span');dot.className='atelier-metal';dot.style.setProperty('--metal','#'+color.toString(16).padStart(6,'0'));dot.setAttribute('aria-hidden','true');button.append(dot);}
    const shape=icon?.(key);if(shape)button.insertAdjacentHTML('beforeend',`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" aria-hidden="true" focusable="false" style="flex-shrink:0">${shape}</svg>`);
    const text=document.createElement('span');text.textContent=label;if(font)text.style.fontFamily=font(key);button.append(text);
    button.onclick=()=>onChange(key);el.append(button);
    if(focus===key)button.focus({preventScroll:true});
  }
}
const show=(id,on)=>{$(id).hidden=!on;};
function change(key,value){state=S.validateConfig({...state,[key]:value});update();}

// Derived facts for text and 3D.
const shankKey=()=>state.metal==='rose'?'red':state.metal;
const alloyNumber=()=>Number(state.alloy)||585;
const headGrade=()=>state.head==='platinum'?950:state.metal==='platinum'?750:alloyNumber();
const metalName=()=>`${S.metals[state.metal][0]} ${state.alloy}${state.metal==='white'?' (rhodiniert)':''}`;
const headName=()=>state.head==='same'?'':`${S.heads[state.head]} ${headGrade()}`;
const sideCarat=()=>{const side=sideCutOf(state,state.cut),d=diameter(state.carat,state.cut)*S.sideSizes[state.sideSize][1];return Math.max(.01,Math.round(CUT[side].ratio*(d/(6.5*CUT[side].size))**3*100)/100);};
const secondCarat=()=>state.secondSize==='kleiner'?Math.round(state.carat*.55*100)/100:state.carat;
const sizeText=()=>{const c=state.size,d=c/Math.PI,us=Math.max(0,(d-11.63)/.8128),uk=Math.round((c-37.8)/1.25);return `Innenumfang ${format(c)} mm · Ø ${format(Math.round(d*10)/10)} mm · US ${format(Math.round(us*4)/4)} · UK ${String.fromCharCode(65+Math.max(0,Math.min(25,Math.floor(uk/2))))}${uk%2?' ½':''}`;};
function flushBlockers(){
  const list=[];
  if(state.height!=='niedrig')list.push('Standardhöhe der Fassung');
  if(!['gerade','verjuengt'].includes(state.shank))list.push('Schienenform '+S.shanks[state.shank][0]);
  if(state.gallery==='hiddenhalo')list.push('verdeckter Halo');if(state.surprise!=='none')list.push('Überraschungsstein');
  if(!['solitaire','trilogie'].includes(state.arrangement))list.push(S.arrangements[state.arrangement][0]);
  return list;
}
const gradeText=()=>state.stone==='lab'&&state.cert==='gia'?'GIA-Einstufung Premium / Standard':state.grade==='custom'?`Farbe ${state.colorGrade} (${COLOR_NAMES[state.colorGrade]}) · Reinheit ${state.clarity}`:S.grades[state.grade];
const sideName=cut=>S.cuts[cut]??S.sideShapes[cut];
function summary({privateDetails=true}={}){
  const s=state,lines=['Verlobungsring – Juwelier Damla','Entwurfsnummer: '+S.designCode(s)];
  const setting=[S.arrangements[s.arrangement][0],S.settings[s.setting][0]];
  if(s.setting==='krappen')setting.push((CUT[s.cut].fixed??S.prongOptions[s.prongs])+(s.prongs==='double'&&CUT[s.cut].fixed?', als Doppelkrappen':''),s.prongTip==='kralle'?'Krallenkrappen':'runde Krappen');
  if(s.height==='niedrig')setting.push('niedrig gefasst');if(s.gallery==='hiddenhalo')setting.push('verdeckter Halo');if(s.surprise!=='none')setting.push('Überraschungsstein: '+S.surprises[s.surprise]);
  if(['halo','doppelhalo'].includes(s.arrangement)&&s.haloShape==='cushion')setting.push('Halo in Kissenform');
  lines.push('Fassung: '+setting.join(' · '));
  const stone=[`${S.cuts[s.cut]} · ${format(s.carat)} ct ${S.stones[s.stone][0]}`];
  if(S.hasColors(s))stone.push('Farbe '+S.colors[s.stone][s.color][0]);if(s.orient==='ew')stone.push('quer gefasst (Ost-West)');
  lines.push('Mittelstein: '+stone.join(' · '));
  if(S.isDiamond(s))lines.push('Qualität: '+gradeText()+' · Schliff sehr gut bis exzellent');
  else if(!['own','moissanite'].includes(s.stone))lines.push('Qualität und Behandlung: besprechen wir persönlich');
  if(s.stone==='own')lines.push('Eigener Stein: wird mitgebracht, die Darstellung ist beispielhaft');
  if(s.stone==='moissanite')lines.push('Hinweis: Moissanit ist kein Diamant');
  if(!['own','moissanite'].includes(s.stone))lines.push(S.isDiamond(s)?'Zertifikat: '+S.certs[s.cert]:'Edelsteingutachten: '+S.gemCerts[s.cert]);
  if(s.arrangement==='trilogie')lines.push(`Seitensteine: 2 × ${sideName(sideCutOf(s,s.cut))}, je ca. ${format(sideCarat())} ct, ${S.accents[s.accent]}`);
  if(s.arrangement==='toietmoi'){const kind=s.secondStone==='same'?s.stone:s.secondStone;lines.push(`Zweiter Stein: ${S.cuts[secondCutOf(s)]} · ca. ${format(secondCarat())} ct ${S.stones[kind][0]}`);}
  if(['halo','doppelhalo'].includes(s.arrangement)||s.gallery==='hiddenhalo'||s.band!=='glatt')lines.push(`Besatzsteine: ${S.accents[s.accent]} · ${S.accentSizes[s.accentSize]}`);
  lines.push(`Edelmetall: ${metalName()}${headName()?' · Fassung in '+headName():''} · Oberfläche ${S.finishes[s.finish]}`);
  const shank=[S.shanks[s.shank][0],S.profiles[s.profile],format(s.width)+' mm'];
  if(s.band!=='glatt')shank.push(`${S.bands[s.band]} (${S.bandSettings[s.bandSetting]})`);if(s.milgrain==='milgrain')shank.push('Perlrand');
  lines.push('Schiene: '+shank.join(' · '));
  lines.push(s.sizeUnknown?'Ringgröße: noch unbekannt, Anpassung nach dem Antrag':`Ringgröße: ${format(s.size)} (Ø ${format(Math.round(s.size/Math.PI*10)/10)} mm)`);
  if(s.engraving)lines.push(`Innengravur: „${s.engraving}“ · ${S.fonts[s.font][0]} · ${S.engravingTypes[s.engravingType]}`);
  if(s.special!=='none')lines.push(`Sondergravur: ${S.specials[s.special]} – Vorlage klären wir persönlich`);
  if(s.weddingBand!=='none')lines.push(`Passender Trauring: ${S.weddingBands[s.weddingBand]} (${flushBlockers().length?'ein gerader Trauring liegt nicht bündig an':'ein gerader Trauring liegt bündig an'})`);
  if(privateDetails){
    if(priv.proposal)lines.push('Anlass: Überraschungsantrag');
    if(priv.date)lines.push('Wunschtermin: '+new Date(priv.date+'-01T12:00').toLocaleDateString('de-DE',{month:'long',year:'numeric'}));
    if(priv.budget!=='open')lines.push('Budgetrahmen: '+S.budgets[priv.budget]);
    if(priv.note.trim())lines.push('Sonderwunsch: '+priv.note.trim());
  }
  lines.push('Preis und Verfügbarkeit auf Anfrage.');
  return lines.join('\n');
}
const shareLink=()=>location.href.split('#')[0]+'#e='+S.encodeConfig(state);
// Matching wedding band: a preset for the Trauring configurator (same metal, width and size; plain band).
function weddingLink(){
  const metal=state.metal==='rose'?'red':state.metal,grade=state.metal==='platinum'?950:alloyNumber();
  const profile={bombiert:'PB03',flach:'PB12',messerkante:'PB13'}[state.profile];
  const woman={profile,width:Math.max(2,state.width),size:Math.min(75,Math.max(45,state.size)),division:'none',metals:[{color:metal,grade,finish:state.finish}]};
  const rings=state.weddingBand==='pair'?[woman,{...woman,size:62,width:Math.max(3,state.width)}]:[woman];
  const code=btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify({version:3,active:0,pair:rings.length>1,rings})))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  return 'trauring-konfigurator.html#d='+code;
}
let hashTimer;
function update(){
  const s=state,diamond=S.isDiamond(s),fixed=CUT[s.cut].fixed;
  // 1 Fassung
  choice('erArrangement',labels(S.arrangements),s.arrangement,v=>change('arrangement',v));$('erArrangementNote').textContent=S.arrangements[s.arrangement][1];
  choice('erSetting',labels(S.settings),s.setting,v=>change('setting',v),{disabled:k=>k==='spann'&&(s.arrangement!=='solitaire'||!S.spannCuts.includes(s.cut))?'Spannring-Optik gibt es als Solitär mit Brillant, Oval, Princess, Smaragd- oder Asscherschliff.':k==='halbzarge'&&['halo','doppelhalo'].includes(s.arrangement)?'Im Halo wird der Stein ganz gefasst.':''});
  $('erSettingNote').textContent=S.settings[s.setting][1];
  show('erProngsWrap',s.setting==='krappen');
  choice('erProngs',fixed?{'4':'Einfache Krappen',double:'Doppelkrappen'}:S.prongOptions,s.prongs,v=>change('prongs',v),{disabled:k=>k==='6'&&!S.sixProngCuts.includes(s.cut)?'Sechs Krappen gibt es für runde und ovale Steine.':''});
  show('erProngsFixed',s.setting==='krappen'&&!!fixed);$('erProngsFixed').textContent=fixed?`Bei dieser Form: ${fixed}. Die V-Krappen schützen die Spitzen.`:'';
  show('erTipWrap',s.setting==='krappen');choice('erTip',S.prongTips,s.prongTip,v=>change('prongTip',v));
  show('erGalleryWrap',['solitaire','trilogie'].includes(s.arrangement)&&s.setting!=='spann');choice('erGallery',S.galleries,s.gallery,v=>change('gallery',v));
  show('erSurpriseWrap',s.setting==='krappen');choice('erSurprise',S.surprises,s.surprise,v=>change('surprise',v),{swatch:k=>k==='none'?null:S.stones[k]?.[1]??SWATCH[k]});
  show('erHeightWrap',['solitaire','trilogie'].includes(s.arrangement)&&s.setting!=='spann');
  choice('erHeight',S.heights,s.height,v=>change('height',v),{disabled:k=>k==='niedrig'&&s.carat>1.25?'Niedrig gefasst bis 1,25 ct.':''});
  $('erHeightNote').textContent=s.height==='niedrig'?'Niedrig gefasst bleibt der Ring im Alltag seltener hängen.':'';
  show('erHaloShapeWrap',['halo','doppelhalo'].includes(s.arrangement)&&['round','oval','oldEuropean'].includes(s.cut));choice('erHaloShape',S.haloShapes,s.haloShape,v=>change('haloShape',v));
  show('erSideWrap',s.arrangement==='trilogie');choice('erSideShape',S.sideShapes,s.sideShape,v=>change('sideShape',v));choice('erSideSize',labels(S.sideSizes),s.sideSize,v=>change('sideSize',v));
  show('erSecondWrap',s.arrangement==='toietmoi');choice('erSecondShape',S.secondShapes,s.secondShape,v=>change('secondShape',v));
  choice('erSecondStone',{same:'Wie der Mittelstein',...Object.fromEntries(Object.entries(S.stones).filter(([k])=>k!=='own').map(([k,v])=>[k,v[0]]))},s.secondStone,v=>change('secondStone',v),{swatch:k=>S.stones[k]?.[1]??SWATCH[k]});
  choice('erSecondSize',S.secondSizes,s.secondSize,v=>change('secondSize',v));
  // 2 Mittelstein
  choice('erCut',S.cuts,s.cut,v=>change('cut',v),{icon:k=>SHAPE_ICONS[k]});
  show('erOrientWrap',S.elongatedCuts.includes(s.cut)&&!['trilogie','toietmoi'].includes(s.arrangement));choice('erOrient',S.orientations,s.orient,v=>change('orient',v));
  choice('erStone',labels(S.stones),s.stone,v=>change('stone',v),{swatch:k=>S.stones[k][1]??SWATCH[k]});
  show('erStoneNote',!!STONE_NOTES[s.stone]);$('erStoneNote').textContent=STONE_NOTES[s.stone]??'';
  show('erColorWrap',S.hasColors(s));if(S.hasColors(s))choice('erColor',labels(S.colors[s.stone]),s.color,v=>change('color',v),{swatch:k=>S.colors[s.stone][k][1]});
  $('erCarat').min=['trilogie','toietmoi','doppelhalo'].includes(s.arrangement)?.3:.1;$('erWidth').min=s.shank==='twist'?2:1.5;
  for(const [id,key,suffix] of [['erCarat','carat',' ct'],['erWidth','width',' mm'],['erSize','size','']]){$(id).value=s[key];$(id+'Value').textContent=format(s[key])+suffix;}
  const d=diameter(s.carat,s.cut),ratio=CUT[s.cut].ratio,libs=requiredCuts(s).map(c=>CUT[c].lib).filter(Boolean);
  $('erDiamondSize').textContent=(CUT[s.cut].round&&ratio===1?`Durchmesser im Modell: ca. ${format(d)} mm`:ratio===1?`Seitenlänge im Modell: ca. ${format(d)} mm`:`Maße im Modell: ca. ${format(d*ratio)} × ${format(d)} mm (Länge × Breite)`)
    +(s.carat>2?(S.sixProngCuts.includes(s.cut)?' · Ab 2 ct empfehlen wir sechs Krappen, Doppelkrappen oder eine Zarge.':' · Ab 2 ct empfehlen wir Doppelkrappen oder eine Zarge.'):'')
    +(ready&&libs.some(l=>libraryState(l)!=='ready')?(libs.some(l=>libraryState(l)==='failed')?' · Diese Form konnte gerade nicht geladen werden. Bitte laden Sie die Seite neu.':' · Die Form wird geladen …'):'');
  const gia=s.stone==='lab'&&s.cert==='gia';
  show('erGradeWrap',diamond);choice('erGrade',S.grades,s.grade,v=>change('grade',v),{disabled:()=>gia?'GIA stuft synthetische Diamanten nur als Premium oder Standard ein.':''});
  show('erCustomGrade',diamond&&s.grade==='custom'&&!gia);$('erColorGrade').value=s.colorGrade;$('erClarity').value=s.clarity;
  $('erGradeNote').textContent=gia?'GIA stuft synthetische Diamanten seit Oktober 2025 nur noch als Premium oder Standard ein.':'Schliff: sehr gut bis exzellent.';
  show('erCertWrap',!['own','moissanite'].includes(s.stone));choice('erCert',diamond?S.certs:S.gemCerts,s.cert,v=>change('cert',v));
  show('erCertNote',!diamond&&!['own','moissanite'].includes(s.stone));$('erCertNote').textContent='Qualität und Behandlung eines Farbsteins besprechen wir persönlich, mit dem Stein in der Hand.';
  // 3 Edelmetall
  choice('erMetal',labels(S.metals),s.metal,v=>change('metal',v),{swatch:k=>S.metals[k][1]});
  choice('erAlloy',s.metal==='platinum'?{'950':'950 Platin'}:{'585':'585 · 14 Karat','750':'750 · 18 Karat'},s.alloy,v=>change('alloy',v));
  choice('erHead',Object.fromEntries(Object.entries(S.heads).filter(([k])=>k!==s.metal).map(([k,v])=>[k,k==='same'?v:`${v} ${k==='platinum'?950:s.metal==='platinum'?750:s.alloy}`])),s.head,v=>change('head',v),{swatch:k=>S.metals[k==='same'?s.metal:k][1]});
  choice('erFinish',S.finishes,s.finish,v=>change('finish',v),{disabled:k=>k!=='polished'&&s.band==='rundum'?'Rundum ausgefasst bleibt die Schiene poliert.':''});
  // 4 Schiene
  const shankOk=S.shankOptions(s),bandOk=S.bandOptions(s);
  choice('erShank',labels(S.shanks),s.shank,v=>change('shank',v),{disabled:k=>shankOk.includes(k)?'':'Passt nicht zu dieser Fassung.'});$('erShankNote').textContent=S.shanks[s.shank][1];
  choice('erProfile',S.profiles,s.profile,v=>change('profile',v),{disabled:k=>k==='messerkante'&&s.band!=='glatt'?'Die Messerkante bleibt ohne Steinbesatz.':''});
  choice('erBand',S.bands,s.band,v=>change('band',v),{disabled:k=>bandOk.includes(k)?'':s.shank==='twist'||s.shank==='bypass'?'Bei dieser Schienenform bleibt die Schiene glatt.':'Dafür ist die Schiene zu schmal oder geteilt.'});
  show('erBandNote',s.band==='rundum');$('erBandNote').textContent='Rundum ausgefasst lässt sich die Ringgröße später kaum noch ändern.';
  show('erBandSettingWrap',s.band!=='glatt');choice('erBandSetting',S.bandSettings,s.bandSetting,v=>change('bandSetting',v),{disabled:k=>k==='kanal'&&s.width<2?'Die Kanalfassung braucht mindestens 2 mm Schienenbreite.':''});
  choice('erAccent',S.accents,s.accent,v=>change('accent',v),{swatch:k=>S.stones[k]?.[1]??SWATCH[k]});
  choice('erAccentSize',S.accentSizes,s.accentSize,v=>change('accentSize',v));choice('erMilgrain',S.milgrains,s.milgrain,v=>change('milgrain',v));
  // 5 Persönliche Note
  $('erSizeNote').textContent=sizeText()+((s.band==='rundum'||s.head!=='same')&&s.sizeUnknown?' · Hinweis: Rundum ausgefasste oder zweifarbige Ringe lassen sich nur begrenzt in der Größe ändern.':'');
  $('erSizeUnknown').checked=s.sizeUnknown;
  $('erEngraving').value=s.engraving;$('erChars').textContent=Array.from(s.engraving).length;
  choice('erFont',labels(S.fonts),s.font,v=>change('font',v),{font:k=>S.fonts[k][1]});choice('erEngravingType',S.engravingTypes,s.engravingType,v=>change('engravingType',v));choice('erSpecial',S.specials,s.special,v=>change('special',v));
  // 6 Trauring
  choice('erWeddingBand',S.weddingBands,s.weddingBand,v=>change('weddingBand',v));$('erShowBand').checked=s.showBand;
  const blockers=flushBlockers();$('erBandFit').textContent=blockers.length?`Ein gerader Trauring liegt nicht bündig an (${blockers.join(', ')}). Ein angepasster Kurvenring schließt die Lücke.`:'Ein gerader Trauring liegt bündig an diesem Ring an.';
  $('erWeddingLink').href=weddingLink();$('erWeddingLink').hidden=s.weddingBand==='none';
  // 7 Anfrage (private)
  $('erProposal').checked=priv.proposal;$('erDate').value=priv.date;$('erBudget').value=priv.budget;if(document.activeElement!==$('erNote'))$('erNote').value=priv.note;$('erNoteChars').textContent=priv.note.length;
  // Texts, links, hash
  $('erName').textContent=[S.arrangements[s.arrangement][0],S.cuts[s.cut],...(diamond?[]:[S.stones[s.stone][0]])].join(' · ');
  $('erSpecs').textContent=`${metalName()}${headName()?' mit Fassung in '+headName():''} · ${format(s.carat)} ct ${S.stones[s.stone][0]} · ${s.sizeUnknown?'Größe offen':'Größe '+format(s.size)}`;
  $('erSummary').textContent=summary();$('erCode').textContent=S.designCode(s);
  const text=summary()+'\n\nMein Entwurf: '+shareLink();
  $('erWhatsapp').href='https://wa.me/496115807830?text='+encodeURIComponent(text);
  $('erAppointment').href='https://wa.me/496115807830?text='+encodeURIComponent('Terminwunsch: Ich möchte einen Beratungstermin im Atelier vereinbaren.\n\n'+text);
  $('erMail').href='mailto:?subject='+encodeURIComponent('Mein Verlobungsring-Entwurf bei Juwelier Damla')+'&body='+encodeURIComponent(text);
  clearTimeout(hashTimer);hashTimer=setTimeout(()=>history.replaceState(null,'',shareLink()),250);
  scheduleBuild();
}
function scheduleBuild(){if(ready&&!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;buildRing();});}}
function savePrivate(){try{localStorage.setItem(PRIVATE_KEY,JSON.stringify(priv));}catch{}}

// ---------- 3D ----------
function disposeRing(){if(!ring)return;scene.remove(ring);ring.traverse(o=>{if(o.isMesh){if(o.isInstancedMesh)o.dispose();if(!o.userData.sharedGeometry)o.geometry.dispose();for(const key of ['map','normalMap','roughnessMap','aoMap','alphaMap'])o.material[key]?.dispose();o.material.dispose();}});}
const part=(material,bore=null)=>enhanceMetal(material.clone(),bore);
// Roségold (4N) sits between Rotgold (5N) and Gelbgold in colour.
const tone=(key,grade)=>key==='rose'?metalF0('red',grade).lerp(metalF0('yellow',grade),.35):metalF0(key,grade);
function buildRing(){
  const s=state;
  // Load the libraries this design needs; until they arrive a missing shape shows as a brilliant.
  for(const lib of new Set(requiredCuts(s).map(c=>CUT[c].lib).filter(Boolean)))
    if(libraryState(lib)==='loading'&&!waiting.has(lib)){waiting.add(lib);loadLibrary(lib,models).then(()=>update(),error=>{console.warn('Steinformen:',error);update();}).finally(()=>waiting.delete(lib));}
  disposeRing();ring=new THREE.Group();scene.add(ring);
  const ri=s.size/(Math.PI*2),grade=alloyNumber(),shankTone=tone(s.metal,grade);
  const metal=metalMaterial(shankTone,.06);metal.userData.f82=metalF82(shankKey());
  const headTone=s.head==='same'?shankTone:tone(s.head,headGrade()),headMetal=metalMaterial(headTone,.06);headMetal.userData.f82=metalF82(s.head==='same'?shankKey():s.head);
  const top=shankTop(s,ri);
  const ctx={models,env:studio.diamond,part,metal,headMetal,ri,bandTop:top,bandTopAt:x=>Math.sqrt(Math.max(0,top*top-x*x)),accentOptics:accentOptics(s.accent),aniso:renderer.capabilities.getMaxAnisotropy(),sync:syncRingOptics};
  const head=buildHead(s,ctx);ring.add(head.group);
  head.group.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(head.group);head.footprintX=Math.max(Math.abs(box.min.x),Math.abs(box.max.x));
  ring.add(buildShank(s,ctx,head).group);
  if(s.engraving.trim()&&s.shank!=='twist'){
    // Laser or diamond-cut lettering in the inner surface; under the head, or at the bottom when the top is open.
    const mask=document.createElement('canvas');mask.width=2048;mask.height=256;const c=mask.getContext('2d',{willReadFrequently:true});
    c.fillStyle='#000';c.fillRect(0,0,2048,256);c.translate(2048,0);c.scale(-1,1);c.fillStyle='#fff';c.font=`72px ${S.fonts[s.font][1]}`;c.textAlign='center';c.textBaseline='middle';c.fillText(s.engraving,1024,128,1800);
    const material=engravedMetal(shankTone,engravingMaps(mask,s.engravingType),renderer.capabilities.getMaxAnisotropy());material.userData.f82=metalF82(shankKey());enhanceMetal(material,{radius:ri+.1,halfWidth:s.width*.4});
    const engraving=new THREE.Mesh(faceInward(new THREE.CylinderGeometry(ri-.014,ri-.014,Math.min(s.width,1.8)*.8,192,1,true)),material);engraving.onBeforeRender=()=>syncRingOptics(engraving);
    engraving.rotation.x=Math.PI/2;if(s.setting==='spann'||['bypass','geteilt'].includes(s.shank))engraving.rotation.y=Math.PI;ring.add(engraving);
  }
  if(s.showBand){
    // The matching plain band beside the ring, as it sits on the finger.
    const w=Math.max(2,s.width),band=new THREE.Mesh(weddingGeometry(models.get(s.profile==='flach'?'Wedding_flach':'Wedding_oval'),ri,1.6,w),part(metal,{radius:ri+.1,halfWidth:w*.4}));
    band.onBeforeRender=()=>syncRingOptics(band);band.rotation.x=Math.PI/2;band.position.z=s.width/2+w/2+.06;ring.add(band);
  }
  metal.dispose();headMetal.dispose();
  // The ring stands on the studio floor: contact line where the band touches, soft shadow around it.
  ring.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(ring,true);contact.fit(bounds,bounds.min.y);contact.setBounce(shankTone);scene.updateMatrixWorld();contact.update(scene);
  dirty=true;
  stage.setAttribute('aria-label',`3D-Ansicht: ${S.arrangements[s.arrangement][0]}, ${S.settings[s.setting][0]}, ${S.cuts[s.cut]}, ${format(s.carat)} Karat ${S.stones[s.stone][0]}, ${S.metals[s.metal][0]}, Schiene ${S.shanks[s.shank][0]}`);
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
    // A shared link with a shape from another library waits for it instead of showing a brilliant first.
    await Promise.all([...new Set(requiredCuts(state).map(c=>CUT[c].lib).filter(Boolean))].map(lib=>loadLibrary(lib,models).catch(error=>console.warn('Steinformen:',error))));
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
function snapshot(width=0){
  if(!ready)return null;const ratio=renderer.getPixelRatio();
  try{renderer.setPixelRatio(Math.min(ratio*2,3));renderer.render(scene,camera);const full=renderer.domElement.toDataURL('image/png');if(!width)return full;
    const canvas=document.createElement('canvas'),src=renderer.domElement;canvas.width=width;canvas.height=Math.round(width*src.height/src.width);canvas.getContext('2d').drawImage(src,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',.82);}
  finally{renderer.setPixelRatio(ratio);renderer.render(scene,camera);}
}

// ---------- Controls ----------
document.querySelectorAll('[data-er-view]').forEach(button=>{button.disabled=true;button.onclick=()=>{
  if(!ready)return;const v=button.dataset.erView;
  if(v==='rotate'){rotation=!rotation;rotationLabel();}
  else if(v==='in'||v==='out'){const dir=camera.position.clone().sub(controls.target);camera.position.copy(controls.target).add(dir.setLength(THREE.MathUtils.clamp(dir.length()*(v==='in'?.8:1.25),controls.minDistance,controls.maxDistance)));controls.update();}
  else{rotation=false;rotationLabel();fit(v);}
};});
for(const [id,key] of [['erCarat','carat'],['erWidth','width'],['erSize','size']])$(id).oninput=e=>change(key,Number(e.target.value));
$('erEngraving').oninput=e=>change('engraving',e.target.value);
$('erSymbols').append(...Object.entries(S.symbols).map(([key,glyph])=>{
  const b=document.createElement('button');b.type='button';b.textContent=glyph;b.setAttribute('aria-label','Symbol einfügen: '+{infinity:'Unendlich',heart:'Herz','2hearts':'Zwei Herzen','2rings':'Verschlungene Ringe'}[key]);
  b.onclick=()=>{const input=$('erEngraving'),at=input.selectionStart??input.value.length,end=input.selectionEnd??at;change('engraving',input.value.slice(0,at)+glyph+input.value.slice(end));input.focus();const pos=Math.min(input.value.length,at+glyph.length);input.setSelectionRange(pos,pos);};
  return b;}));
$('erSizeUnknown').onchange=e=>change('sizeUnknown',e.target.checked);$('erShowBand').onchange=e=>change('showBand',e.target.checked);
$('erBudget').append(...Object.entries(S.budgets).map(([k,v])=>new Option(v,k)));
for(const [id,key,read] of [['erProposal','proposal',e=>e.target.checked],['erDate','date',e=>e.target.value],['erBudget','budget',e=>e.target.value],['erNote','note',e=>e.target.value.slice(0,300)]])
  $(id).addEventListener(id==='erNote'?'input':'change',e=>{priv[key]=read(e);savePrivate();update();});
$('erColorGrade').append(...S.colorGrades.map(c=>new Option(`${c} – ${COLOR_NAMES[c]}`,c)));
$('erClarity').append(...S.clarities.map(c=>new Option(`${c} – ${CLARITY_NAMES[c]}`,c)));
$('erColorGrade').onchange=e=>change('colorGrade',e.target.value);$('erClarity').onchange=e=>change('clarity',e.target.value);
// Fetch a shape's library as soon as someone reaches for its chip, so a click rarely waits for it.
for(const type of ['pointerover','focusin'])for(const id of ['erCut','erSideShape','erSecondShape'])$(id).addEventListener(type,event=>{
  const key=event.target.closest('button')?.dataset.value,lib=CUT[key==='same'?state.cut:key]?.lib;
  if(models&&lib&&libraryState(lib)==='loading'&&!waiting.has(lib))loadLibrary(lib,models).catch(()=>{});});
$('erReset').onclick=()=>{state=S.defaults();update();rotation=false;rotationLabel();fit();};
$('erCopy').onclick=async()=>{try{await navigator.clipboard.writeText(summary()+'\n\n'+shareLink());$('erStatus').textContent='Konfiguration und Link kopiert.';}catch{$('erStatus').textContent='Kopieren nicht möglich. Markieren Sie die Zusammenfassung und kopieren Sie den Link aus der Adresszeile.';}};
$('erImage').disabled=true;$('erImage').onclick=()=>{const url=snapshot();if(!url)return;const a=document.createElement('a');a.download='damla-verlobungsring.png';a.href=url;a.click();};
// Saved designs: up to three on this device, with a small picture, to compare and reopen.
function readSaved(){try{return JSON.parse(localStorage.getItem(SAVED_KEY)||'[]');}catch{return [];}}
function renderSaved(){
  const list=readSaved(),root=$('erSaved');root.replaceChildren();if(!list.length)return;
  const title=document.createElement('p');title.className='atelier-label';title.textContent='Gemerkte Entwürfe';
  const grid=document.createElement('div');grid.className='atelier-merk__grid';root.append(title,grid);
  list.forEach((item,i)=>{
    const fig=document.createElement('figure');if(item.thumb){const img=new Image();img.src=item.thumb;img.alt='';fig.append(img);}
    const cap=document.createElement('figcaption');cap.textContent=item.name;
    const open=document.createElement('a');open.href='#e='+item.config;open.textContent='Öffnen';
    const drop=document.createElement('button');drop.type='button';drop.textContent='Entfernen';
    drop.onclick=()=>{const next=readSaved();next.splice(i,1);try{localStorage.setItem(SAVED_KEY,JSON.stringify(next));}catch{}renderSaved();};
    fig.append(cap,open,drop);grid.append(fig);
  });
}
$('erSave').onclick=()=>{
  const list=[{config:S.encodeConfig(state),name:$('erName').textContent,thumb:snapshot(220)},...readSaved()].slice(0,3);
  try{localStorage.setItem(SAVED_KEY,JSON.stringify(list));$('erStatus').textContent='Entwurf gemerkt. Er bleibt auf diesem Gerät gespeichert.';}catch{$('erStatus').textContent='Merken ist in diesem Browser nicht möglich.';}
  renderSaved();
};
// Printing shows the picture and the design, but not the private enquiry details.
$('erPrint').onclick=()=>window.print();
addEventListener('beforeprint',()=>{$('erSummary').textContent=summary({privateDetails:false});const url=snapshot(900);let img=$('erPrintShot');if(!img){img=new Image();img.id='erPrintShot';img.alt='Ansicht des Entwurfs';$('erSummary').before(img);}if(url)img.src=url;});
addEventListener('afterprint',()=>{$('erSummary').textContent=summary();$('erPrintShot')?.remove();});
window.addEventListener('hashchange',()=>{const next=fromHash();if(next&&S.encodeConfig(next)!==S.encodeConfig(state)){state=next;update();}});
renderSaved();update();start();
