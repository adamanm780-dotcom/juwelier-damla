import {individualMarkup,mountIndividual} from './wedding-engraving.js?v=3';
import * as C from './wedding-catalog.js?v=3';
import * as S from './wedding-state.js?v=3';
import {WeddingViewer} from './wedding-viewer.js?v=3';
const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>n.toLocaleString('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0});
let state=S.normalizeState(C.initialState()),step=0,segment=0,divisionCount=1,undo=[],notice='',viewer,saveTimer;
try{if(/^#[dk]=/.test(location.hash))state=S.decode(location.href);}catch{notice='Der gespeicherte Link konnte nicht geladen werden.';}
const current=()=>state.rings[Math.min(state.active,state.rings.length-1)];
const pathGet=(o,p)=>p.split('.').reduce((a,k)=>a?.[k],o);
function pathSet(o,p,v){const parts=p.split('.');let node=o;for(const key of parts.slice(0,-1))node=node[key];node[parts.at(-1)]=v;}
function remember(){const json=JSON.stringify(state);if(undo.at(-1)!==json){undo.push(json);if(undo.length>80)undo.shift();}}
function persist(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{const code=S.encode(state);history.replaceState(null,'',location.pathname+location.search+'#d='+code);try{localStorage.setItem('damla-draft-v3',JSON.stringify(state));}catch{}},300);}
function apply(path,value,refresh=true){
 if(refresh)remember();notice='';
 const targetMatch=path.match(/^@(\d)\.(.*)$/);if(targetMatch)path=targetMatch[2];const targets=targetMatch?[state.rings[Number(targetMatch[1])]]:state.pair?state.rings:[current()];
 for(const ring of targets){
  const previous=pathGet(ring,path);pathSet(ring,path,value);
  const gradeChange=path.match(/^metals\.(\d)\.grade$/);if(gradeChange){const color=ring.metals[Number(gradeChange[1])].color;for(const m of ring.metals)if(m.color===color||(S.isGold(color)&&S.isGold(m.color)))m.grade=Number(value);if(color==='palladium')for(const m of ring.metals)if(S.isGold(m.color))m.grade=Number(value)===950?750:585;}
  if(path==='division'){ring.surfaceDivision='none';segment=0;const division=S.OPTIONS.divisions.find(d=>d.id===value);ring.separations=Array.from({length:Math.max(0,(division?.rates.length||1)-1)},()=>true);if(value!=='none'&&previous==='none'){ring.metals[1].color='white';ring.metals[2].color='red';}}
  if(path==='surfaceDivision'){segment=0;if(value!=='none'){ring.metals[1].finish='sandmatte-fine';ring.division=value;ring.surfaceDivision='none';}}
  if(path==='groove.form'&&value!=='none'){ring.groove.quantity=ring.groove.quantity||1;ring.groove.width=C.GROOVES[value].widths[0];}
  if(path==='groove.quantity'){const n=Number(value);ring.groove.positions=Array.from({length:n},(_,i)=>ring.groove.positions[i]??([.5,.75,.25,.875][i]-.5)*ring.width);}
  if(path==='stone.preset'){ring.stone.rows=1;ring.stone.quantity=1;if(value.startsWith('memoire')){ring.stone.memoireQuantity='ringDependent50';ring.metals=ring.metals.map(()=>({...ring.metals[0]}));ring.separations=[];}if(value==='top')ring.stone.size='brilliant-1000-0';}
  if(path==='engraving.type'&&value==='laser')ring.engraving.font='amazonebt';
  const before={width:ring.width,height:ring.height,division:ring.division,preset:ring.stone.preset};
  Object.assign(ring,S.normalizeRing(ring));
  const changes=[];if(before.width!==ring.width)changes.push('Breite '+C.mm(ring.width));if(before.height!==ring.height)changes.push('Höhe '+C.mm(ring.height));if(before.division!==ring.division)changes.push('Farbaufteilung einfarbig');if(before.preset!==ring.stone.preset)changes.push('Steinbesatz ohne Steine');if(changes.length)notice='An diese Ausführung angepasst: '+changes.join(' · ')+'.';
 }
 persist();viewer?.update(state);
 if(refresh)render();else{renderSummary();renderPrices();}
}
function option(path,id,text,selected,disabled=false,visual='',title=''){
 return `<button type="button" class="wc-option" data-path="${esc(path)}" data-value="${esc(id)}" aria-pressed="${String(selected)===String(id)}" ${disabled?'disabled':''} ${title?`title="${esc(title)}"`:''}>${visual}${esc(text)}</button>`;
}
function choices(title,path,values,selected,{allowed,visual,cls='',help=''}={}){
 const entries=Array.isArray(values)?values.map(x=>typeof x==='object'?[x.id,x.label||x.id]:[x,x]):Object.entries(values).map(([id,v])=>[id,v.label||v]);
 return `<fieldset class="wc-group"><legend>${esc(title)}</legend><div class="wc-options ${cls}">${entries.map(([id,text])=>option(path,id,text,selected,allowed&&!allowed.includes(id),visual?.(id)||'',allowed&&!allowed.includes(id)?'Für die gewählten Maße oder das Profil nicht verfügbar':'')).join('')}</div>${help?`<p class="wc-note">${esc(help)}</p>`:''}</fieldset>`;
}
function select(title,path,values,selected){return `<label class="wc-field"><span>${esc(title)}</span><select data-path="${esc(path)}">${values.map(x=>{const id=typeof x==='object'?x.id:x,text=typeof x==='object'?x.label:x;return `<option value="${esc(id)}" ${String(id)===String(selected)?'selected':''} ${x.disabled?'disabled':''}>${esc(text)}</option>`;}).join('')}</select></label>`;}
function slider(title,path,value,min,max,step=1,unit='mm',offset=0){return `<label class="wc-field"><span>${esc(title)}<output>${esc(Number(value+offset).toLocaleString('de-DE'))}${unit?' '+unit:''}</output></span><input type="range" data-path="${esc(path)}" data-offset="${offset}" min="${min+offset}" max="${max+offset}" step="${step}" value="${value+offset}"></label>`;}
function check(title,path,value){return `<label class="wc-check"><input type="checkbox" data-path="${path}" ${value?'checked':''}>${esc(title)}</label>`;}
function profileIcon(id){return viewer?.profileIcon(id)||`<svg viewBox="0 0 76 32" aria-hidden="true"><rect x="7" y="9" width="62" height="14" rx="${id==='PB08'?8:3}"/></svg>`;}
function render(){
 const k=current();segment=Math.min(segment,S.effectiveDivision(k).rates.length-1);
 $('#wcSteps').innerHTML=C.STEPS.map((name,i)=>`<button type="button" data-step="${i}" ${i===step?'aria-current="step"':''}><span>${String(i+1).padStart(2,'0')}</span>${esc(name)}</button>`).join('');
 $('#wcStepCount').textContent=`Schritt ${step+1} von 6`;
 $('#wcStepTitle').textContent=C.STEPS[step];$('#wcEditing').textContent=state.pair&&state.rings.length===2?'Ringpaar bearbeiten · Änderungen gelten für beide Ringe':`Ring ${state.active+1} bearbeiten`;
 $('#wcNotice').hidden=!notice;$('#wcNotice').textContent=notice;
 $('#wcPrev').disabled=step===0;$('#wcNext').textContent=step===5?'Zusammenfassung ↓':'Weiter →';$('#wcUndo').disabled=!undo.length;
 $('#wcControls').innerHTML=[profiles,dimensions,metals,stones,grooves,engraving][step](k);
 if(step===5&&k.engraving.type==='individual')setupArt();
 renderPrices();renderSummary();
}
function profiles(k){return choices('Ringprofil','profile',Object.keys(S.PROFILES),k.profile,{cls:'wc-profile-grid',visual:profileIcon})+`<p class="wc-note">${profileDescription(k.profile)}. Der Querschnitt zeigt die Außenform und die Rundung auf der Innenseite.</p>`;}
const profileDescription=id=>({PB01:'Außen flach, innen leicht gerundet',PB02:'Außen leicht gewölbt, innen stark gerundet',PB03:'Außen gewölbt, innen komfortabel gerundet',PB04:'Innen und außen sanft gerundet',PB05:'Oval mit weichen Übergängen',PB06:'Leichte Außenwölbung, kräftige Innenrundung',PB07:'Schmale ovale Kontur',PB08:'Runder Querschnitt',PB09:'Gewölbte Form mit schrägen Seiten',PB10:'Konkave Außenfläche',PB11:'Kräftig gewölbte Außenfläche',PB12:'Innen und außen flach, gerundete Kanten',PB13:'Flache Außenfläche mit schrägen Seiten'}[id]||id);
function dimensions(k){
 return select('Ringbreite','width',S.widths(k).map(v=>({id:v,label:C.mm(v)})),k.width)+select('Ringhöhe','height',S.heights(k).map(v=>({id:v,label:C.mm(v)})),k.height)+select('Ringgröße · Innenumfang','size',Array.from({length:61},(_,i)=>({id:45+i*.5,label:(45+i*.5).toLocaleString('de-DE')+' · Ø '+((45+i*.5)/Math.PI).toLocaleString('de-DE',{maximumFractionDigits:2})+' mm'})),k.size)+`<div class="wc-section-diagram">${viewer?.sectionDiagram(k)||profileIcon(k.profile)}<p>${esc(k.profile)} · ${C.mm(k.width)} breit · ${C.mm(k.height)} hoch</p></div><p class="wc-note">Die wählbaren Höhen richten sich nach Profil und Breite. Ihre genaue Ringgröße messen wir gerne bei Damla.</p>`;
}
function divisions(k,path){
 const selected=path==='division'?k.division:k.surfaceDivision||'none';
 return choices(path==='division'?'Farbaufteilung':'Oberflächenaufteilung',path,S.OPTIONS.divisions.map(d=>({id:d.id,label:C.divisionLabel(d)})),selected,{allowed:S.availableDivisions(k),visual:id=>{const d=S.OPTIONS.divisions.find(x=>x.id===id);return `<span class="wc-division-swatch" style="display:flex;height:14px;margin:1px 5px 9px;overflow:hidden;border:1px solid #d4c6ae;border-radius:3px">${d.rates.map((r,i)=>`<i style="flex:${r};background:${['#ddc399','#dedddb','#d1a494'][i]}"></i>`).join('')}</span>`;}});
}
function metals(k){
 const d=S.effectiveDivision(k),m=k.metals[segment],count=d.rates.length;
 let out=d.id==='memoire'?'<p class="wc-note">Die Kranzfassung teilt den Ring automatisch in Ringschiene und Kranzband auf. Metall, Feingehalt und Oberfläche lassen sich je Segment gestalten.</p>':divisions(k,'division');
 if(k.division==='none'&&d.id!=='memoire')out+=`<details ${k.surfaceDivision&&k.surfaceDivision!=='none'?'open':''}><summary class="wc-label">Ein Metall, mehrere Oberflächen</summary>${divisions(k,'surfaceDivision')}</details>`;
 if(d.type==='wave')out+=select('Wellenanzahl','cycles',Array.from({length:count===3?6:4},(_,i)=>i+1),k.cycles);
 if(count>1)out+=`<div class="wc-segments" aria-label="Segment auswählen">${d.rates.map((r,i)=>`<button type="button" data-segment="${i}" aria-pressed="${i===segment}">${d.type==='horizontal'?(i===0?'Außen':'Innen'):`Segment ${i+1}`}</button>`).join('')}</div>`;
 out+=choices('Edelmetall',`metals.${d.rates.length===1?0:segment}.color`,C.METALS,m.color,{visual:id=>`<span class="wc-metal-dot" style="--metal:#${C.METALS[id].color.toString(16)}"></span>`});
 out+=choices('Feingehalt',`metals.${d.rates.length===1?0:segment}.grade`,S.grades(k,segment).map(n=>({id:n,label:String(n)+(S.isGold(m.color)?' / '+({333:'8',375:'9',585:'14',750:'18',900:'21,6',916:'22'}[n]||'')+' kt':'')})),m.grade,{cls:'wc-compact'});
 out+=choices('Oberfläche',`metals.${segment}.finish`,C.FINISHES,m.finish,{visual:id=>`<img class="wc-finish-thumb" data-finish="${id}" src="assets/configurator-finishes/${id}.jpg" alt="" loading="lazy" width="300" height="180">`});
 return out;
}
function stoneQuantity(k,secondary=false){const path=secondary?'secondaryQuantity':k.stone.preset.startsWith('memoire')?'memoireQuantity':'quantity',max=S.maxQuantity(k,secondary);const values=[{id:'ringDependent33',label:'⅓ Ringumfang'},{id:'ringDependent50',label:'½ Ringumfang'},{id:'ringDependent100',label:'Ganzer Ringumfang'},...Array.from({length:max},(_,i)=>({id:i+1,label:(i+1)+' '+(i?'Steine':'Stein')})).filter(x=>!secondary||Number(x.id)%2===0)];return select(secondary?'Anzahl der Nebensteine':'Steinanzahl','stone.'+path,values,k.stone[path]);}
const spreadLabels={together:'Zusammenhängend','stoneDependent-25':'Abstand ¼ Stein','stoneDependent-50':'Abstand ½ Stein','stoneDependent-100':'Abstand 1 Stein','stoneDependent-200':'Abstand 2 Steine','ringDependent-33':'Über ⅓ des Rings','ringDependent-50':'Über ½ des Rings','ringDependent-100':'Über den ganzen Ring'};
function sizeSelect(k,secondary=false){const path=secondary?'secondarySize':'size';const cut=secondary?'brilliant':k.stone.cut,available=S.sizes(k,secondary).map(x=>x.id);return select(secondary?'Größe der Nebensteine':'Steingröße','stone.'+path,(S.STONE_DATA.size_catalogs[cut]||S.OPTIONS.sizes).map(s=>({id:s.id,label:s.carat.toLocaleString('de-DE',{maximumFractionDigits:3})+' ct · '+C.mm(s.width)+(s.height!==s.width?' × '+C.mm(s.height):'')+(s.rotation?' · '+s.rotation+'° gedreht':''),disabled:!available.includes(s.id)})),k.stone[path]);}
function stones(k){
 const s=k.stone,available=S.availablePresets(k);
 let out=choices('Fassart','stone.preset',C.PRESETS,s.preset,{allowed:available});
 if(available.length<15)out+='<p class="wc-note">Weitere Fassarten werden mit passenden Profilen und Maßen wählbar. Breite, Höhe und Seitenform bestimmen den verfügbaren Platz.</p>';
 if(s.preset==='none')return out;
 if(s.preset==='free')return out+freeStones(k);
 out+=choices('Steinform','stone.cut',C.CUTS,s.cut,{allowed:S.cuts(k),cls:'wc-compact'});
 out+=select('Steinqualität / Farbe','stone.quality',Object.entries(C.QUALITIES).map(([id,label])=>({id,label})),s.quality)+sizeSelect(k);
 if(!['top','clamping-open','combined','cross-channel'].includes(s.preset))out+=stoneQuantity(k);
 if(['section','cross-channel'].includes(s.preset))out+=select('Steinreihen','stone.rows',Array.from({length:S.maxRows(k)},(_,i)=>i+1),s.rows);
 if(S.count(k)>=2&&!s.preset.startsWith('memoire')&&!['cross-channel','top','combined'].includes(s.preset))out+=select('Verteilung','stone.spreading',Object.entries(spreadLabels).map(([id,label])=>({id,label})),s.spreading);
 if(['bezel','section','channel'].includes(s.preset))out+=choices('Position über die Ringbreite','stone.orientation',C.ORIENTATIONS,s.orientation,{allowed:s.preset==='channel'?['center','free']:Object.keys(C.ORIENTATIONS),cls:'wc-compact'});
 if(s.orientation==='free'){const margin=S.stoneSize(k).width/2+.35;out+=slider('Abstand von der Mitte','stone.position',s.position,-Math.max(0,k.width/2-margin),Math.max(0,k.width/2-margin),.01);}
 if(s.preset.startsWith('memoire'))out+=check('Kranzfassung auf beiden Seiten','stone.bothSides',s.bothSides);
 if(s.preset==='top'||(s.preset==='combined'&&s.setting==='top'))out+=(s.cut==='brilliant'?choices('Aufsatzfassung','stone.mounting',{round4:'4 Krappen',round6:'6 Krappen'},s.mounting):'')+select('Metall der Fassung','stone.mountingMetal',[{id:'585-yellow',label:'Gelbgold 585'},{id:'585-white',label:'Weißgold 585'},{id:'585-red',label:'Rotgold 585'},{id:'950-platinum',label:'Platin 950'}],s.mountingMetal);
 if(s.preset==='combined')out+=choices('Fassung des Hauptsteins','stone.setting',{rubbed:'Eingerieben',tension:'Spannfassung',top:'Aufsatz'},s.setting,{allowed:S.stoneOptions(k,'setting')?.map(x=>x.id)||['rubbed']})+`<h3 class="wc-label">Nebensteine</h3>`+choices('Fassart der Nebensteine','stone.secondarySetting',{rubbed:'Eingerieben',section:'Verschnitt',channel:'Kanal'},s.secondarySetting)+select('Qualität der Nebensteine','stone.secondaryQuality',Object.entries(C.QUALITIES).map(([id,label])=>({id,label})),s.secondaryQuality)+sizeSelect(k,true)+stoneQuantity(k,true);
 out+=`<p class="wc-note">${S.estimate(k).stones} Steine in Ihrer aktuellen Konfiguration. Die Anzahl bei Teil- und Vollbesatz passt sich an Ringgröße und Steindurchmesser an.</p>`;
 return out;
}
function freeStones(k){return `<p class="wc-note">Platzieren Sie jeden Stein einzeln auf dem Ring. Winkel und Position lassen sich unabhängig einstellen.</p><div class="wc-free-list">${k.stone.free.map((s,i)=>`<div class="wc-free-stone"><button type="button" data-delete-stone="${i}" aria-label="Stein ${i+1} entfernen">×</button><span class="wc-label">Stein ${i+1}</span>${select('Größe',`stone.free.${i}.size`,S.sizes(k).map(x=>({id:x.id,label:x.carat+' ct · '+C.mm(x.width)})),s.size)}${select('Qualität',`stone.free.${i}.quality`,Object.entries(C.QUALITIES).map(([id,label])=>({id,label})),s.quality)}${slider('Position am Umfang',`stone.free.${i}.angle`,s.angle,0,359,1,'°')}${slider('Position über die Breite',`stone.free.${i}.position`,s.position,-k.width/2+.6,k.width/2-.6,.01)}</div>`).join('')}</div><button type="button" class="wc-free-add" id="wcAddStone">+ Stein hinzufügen</button>${k.stone.free.length?'<button type="button" class="wc-free-add" id="wcClearStones">Alle entfernen</button>':''}`;}
function grooves(k){
 let out='';const d=S.effectiveDivision(k);
 if(d.rates.length>1&&d.type!=='horizontal')out+=`<fieldset class="wc-group"><legend>Trennfugen</legend>${d.rates.slice(1).map((_,i)=>check(`Trennfuge ${i+1}`,`separations.${i}`,k.separations[i])).join('')}<p class="wc-note">Betont die Grenze zwischen den Segmenten.</p></fieldset>`+select('Breite der Trennfugen','separation.width',[.4,.6,.8,1,1.5,1.8].map(v=>({id:v,label:C.mm(v),disabled:v>k.width/d.rates.length-.5})),k.separation.width)+choices('Beschichtung der Trennfugen','separation.color',{none:'Keine',yellow:'Gelb',white:'Weiß',red:'Rot'},k.separation.color,{cls:'wc-compact'});
 out+=choices('Designfuge','groove.form',C.GROOVES,k.groove.form);
 if(k.groove.form!=='none'){
 out+=`<div class="wc-two">${select('Fugenbreite','groove.width',C.GROOVES[k.groove.form].widths.map(v=>({id:v,label:C.mm(v),disabled:!S.grooveWidths(k).includes(v)})),k.groove.width)}${select('Fugenanzahl','groove.quantity',[0,1,2,3,4],k.groove.quantity)}</div>`;
 out+=k.groove.positions.map((v,i)=>slider(`Position Fuge ${i+1}`,`groove.positions.${i}`,v,-k.width/2+.2,k.width/2-.2,.01,'mm',k.width/2)).join('');
 if(!['v-groove-60','perlage'].includes(k.groove.form))out+=choices('Fugenfarbe · Beschichtung','groove.color',{none:'Keine',yellow:'Gelb',white:'Weiß',red:'Rot'},k.groove.color,{cls:'wc-compact'});
 if(k.groove.form!=='perlage')out+=select('Fugenoberfläche','groove.surface',[{id:'polished',label:'Poliert'}],k.groove.surface);
 }
 out+=choices('Stufen','edge.type',C.EDGE_TYPES,k.edge.type,{cls:'wc-compact'});
 for(const side of ['left','right'])if(k.edge.type===side||k.edge.type==='both')out+=`<div class="wc-two">${select('Stufenbreite '+(side==='left'?'links':'rechts'),'edge.'+side+'Width',[.5,1,1.5,2].map(n=>({id:n,label:C.mm(n),disabled:!S.edgeWidths(k,side).includes(n)})),k.edge[side+'Width'])}${select('Oberfläche '+(side==='left'?'links':'rechts'),'edge.'+side+'Surface',[{id:'polished',label:'Poliert'}],k.edge[side+'Surface'])}</div>`;
 return out;
}
function engraving(k,individual=false){
 if(state.pair&&state.rings.length===2&&!individual&&state.rings.every(r=>r.engraving.type!=='individual'))return state.rings.map((r,i)=>`<section data-engraving-ring="${i}"><h3 class="wc-label">Gravur Ring ${i+1}</h3>${engraving(r,true).replaceAll('data-path="engraving.','data-path="@'+i+'.engraving.').replace('id="wcEngravingText"','id="wcEngravingText'+i+'"')}</section>`).join('');
 const e=k.engraving;
 let out=choices('Innengravur','engraving.type',C.ENGRAVINGS,e.type);
 if(e.type==='none')return out;
 if(e.type==='individual')return out+individualMarkup;
 const fonts=e.type==='diamond'?{palscri:{label:'Skript 4L'},KozukaGothicPr6NEL:{label:'SL 513'}}:C.FONTS;
 out+=choices('Schrift','engraving.font',fonts,e.font,{cls:'wc-compact'});
 out+=`<label class="wc-field"><span>Ihr Gravurtext <output>${e.text.length} / 40</output></span><input id="wcEngravingText" type="text" maxlength="40" data-path="engraving.text" value="${esc(e.text)}" placeholder="z. B. Für immer · 12.09.2027" autocomplete="off"></label><div class="wc-symbols">${Object.entries(C.SYMBOLS).map(([id,symbol])=>`<button type="button" data-symbol="${id}" aria-label="Symbol ${id} einfügen">${symbol}</button>`).join('')}</div><div class="wc-engraving-preview" style="font-family:${esc(C.engravingFont(e))}">${esc(e.text||'Für immer verbunden')}</div><p class="wc-note">Bis 40 Zeichen einschließlich Leerzeichen und Symbolen. In der Ansicht „Innen“ sehen Sie die Gravur im Ring.</p>`;
 return out;
}
function renderPrices(){const estimates=state.rings.map(S.estimate);$('#wcPrice').textContent=money(estimates.reduce((a,b)=>a+b.price,0));$('#wcRingTabs').innerHTML=state.rings.map((r,i)=>`<button type="button" data-ring="${i}" aria-pressed="${!state.pair&&state.active===i}">Ring ${i+1}<small>${money(estimates[i].price)}</small></button>`).join('')+(state.rings.length===2?`<button type="button" data-ring="pair" aria-pressed="${state.pair}">Ringpaar<small>Gemeinsam bearbeiten</small></button>`:'');}
function summaryData(k){const d=S.effectiveDivision(k),s=k.stone;return [
 ['Profil',k.profile+' · '+profileDescription(k.profile)],['Maße',C.mm(k.width)+' breit · '+C.mm(k.height)+' hoch · Größe '+k.size],['Aufteilung',C.divisionLabel(d)],
 ...d.rates.map((_,i)=>['Segment '+(i+1),C.METALS[k.metals[i].color].label+' '+k.metals[i].grade+' · '+C.FINISHES[k.metals[i].finish]]),
 ['Steinbesatz',C.PRESETS[s.preset]+(s.preset!=='none'?' · '+S.estimate(k).stones+' Steine · '+C.CUTS[s.cut]+' · '+C.QUALITIES[s.quality]+' · '+S.stoneSize(k).carat+' ct je Stein':'')],
 ...(s.preset==='combined'?[['Nebensteine',S.count(k,true)+' · '+S.stoneSize(k,true).carat+' ct · '+C.QUALITIES[s.secondaryQuality]]]:[]),
 ...(s.preset.startsWith('memoire')?[['Kranzfassung',s.bothSides?'Beidseitig':'Einseitig']]:[]),
 ...(s.preset==='free'?s.free.map((g,i)=>['Stein '+(i+1),g.angle+'° · Position '+C.mm(g.position+k.width/2)+' · '+C.QUALITIES[g.quality]+' · '+(S.OPTIONS.sizes.find(x=>x.id===g.size)?.carat||0)+' ct']):[]),
 ...(s.preset!=='none'&&s.preset!=='free'?[['Anordnung',(s.rows>1?s.rows+' Reihen · ':'')+(spreadLabels[s.spreading]||'Zusammenhängend')+' · '+(C.ORIENTATIONS[s.orientation]||'Mitte')]]:[]),
 ...(d.type==='wave'?[['Wellenanzahl',k.cycles]]:[]),
 ...(k.separations.some(Boolean)?[['Trennfugen',k.separations.map((enabled,i)=>enabled?'Grenze '+(i+1):'').filter(Boolean).join(', ')+' · '+C.mm(k.separation.width)]]:[]),
 ['Designfugen',k.groove.quantity?k.groove.quantity+' · '+C.GROOVES[k.groove.form].label+' · '+C.mm(k.groove.width)+' · Positionen '+k.groove.positions.map(x=>C.mm(x+k.width/2)).join(', '):'Keine'],['Stufen',C.EDGE_TYPES[k.edge.type]+(k.edge.type!=='none'?' · links '+C.mm(k.edge.leftWidth)+' · rechts '+C.mm(k.edge.rightWidth):'')],
 ['Gravur',C.ENGRAVINGS[k.engraving.type]+(k.engraving.text?' · '+k.engraving.text:'')+(k.engraving.type==='individual'&&k.engraving.art?' · Eigenes Motiv hinterlegt':'')],['Richtwert',money(S.estimate(k).price)]
 ];}
function renderSummary(){$('#wcSummaryContent').innerHTML=state.rings.map((k,i)=>`<article><h3>Ring ${i+1}</h3><dl>${summaryData(k).map(([name,value])=>`<dt>${esc(name)}</dt><dd>${esc(value)}</dd>`).join('')}</dl></article>`).join('');}
const summaryText=()=>state.rings.map((r,i)=>'Ring '+(i+1)+'\n'+summaryData(r).map(([k,v])=>k+': '+v).join('\n')).join('\n\n')+'\n\nEntwurf: '+location.origin+location.pathname+'#d='+S.encode(state);
function toast(text){$('#wcToast').textContent=text;$('#wcToast').hidden=false;setTimeout(()=>$('#wcToast').hidden=true,3500);}
async function copy(text){try{await navigator.clipboard.writeText(text);toast('In die Zwischenablage kopiert.');}catch{dialog('<h2>Zum Kopieren</h2><textarea readonly>'+esc(text)+'</textarea>');$('#wcDialog textarea').select();}}
function dialog(html){$('#wcDialogContent').innerHTML=html;$('#wcDialog').showModal();}
function saveDialog(){
 const code='DAM3-'+S.encode(state),link=location.origin+location.pathname+'#d='+S.encode(state);let saved=[];try{saved=JSON.parse(localStorage.getItem('damla-designs-v3')||'[]');}catch{}
 dialog(`<h2>Speichern & laden</h2><p>Ihr Link enthält die komplette Konfiguration und funktioniert auch auf einem anderen Gerät.</p><button type="button" id="wcShareLink">Link kopieren</button><button type="button" id="wcDownload">Entwurf herunterladen</button><label class="wc-field"><span>Entwurf in diesem Browser merken</span><input id="wcSaveName" maxlength="60" placeholder="z. B. Unsere Trauringe"></label><button type="button" id="wcStore">Merken</button>${saved.length?`<label class="wc-field"><span>Gemerkte Entwürfe</span><select id="wcSaved"><option value="">Auswählen …</option>${saved.map((s,i)=>`<option value="${i}">${esc(s.name)}</option>`).join('')}</select></label>`:''}<label class="wc-field"><span>Konfigurationslink oder Damla-Code laden</span><textarea id="wcLoadCode" placeholder="Link oder DAM3-Code einfügen"></textarea></label><button type="button" id="wcLoad">Laden</button><label class="wc-field"><span>Entwurfsdatei laden</span><input id="wcLoadFile" type="file" accept="application/json,.json"></label><p id="wcLoadError" role="alert"></p>`);
 $('#wcShareLink').onclick=()=>copy(link);
 $('#wcDownload').onclick=()=>download(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),'damla-trauring-entwurf.json');
 $('#wcStore').onclick=()=>{try{saved.unshift({name:$('#wcSaveName').value.trim()||'Trauringe '+new Date().toLocaleDateString('de-DE'),state:C.clone(state)});localStorage.setItem('damla-designs-v3',JSON.stringify(saved.slice(0,20)));toast('Entwurf in diesem Browser gespeichert.');}catch{toast('Lokales Speichern nicht möglich. Bitte den Link kopieren.');}};
 if($('#wcSaved'))$('#wcSaved').onchange=e=>{if(e.target.value!=='')loadState(saved[Number(e.target.value)].state);};
 $('#wcLoad').onclick=()=>{try{loadState(S.decode($('#wcLoadCode').value.trim()));}catch{$('#wcLoadError').textContent='Dieser Link oder Code ist nicht gültig.';}};
 $('#wcLoadFile').onchange=async e=>{try{const file=e.target.files[0];if(file.size>1000000)throw Error();loadState(JSON.parse(await file.text()));}catch{$('#wcLoadError').textContent='Diese Entwurfsdatei konnte nicht geladen werden.';}};
}
function loadState(value){remember();state=S.normalizeState(value);state.active=Math.min(state.active,state.rings.length-1);segment=0;$('#wcDialog').close();persist();render();viewer?.update(state,true);toast('Entwurf geladen.');}
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function setupArt(){mountIndividual($('.wc-individual'),{engraving:current().engraving,ringCount:state.rings.length,onApply:(value,target)=>{remember();const indices=target==='all'?state.rings.map((_,i)=>i):[target==='current'?state.active:Number(target)];for(const i of indices){if(state.rings[i]){Object.assign(state.rings[i].engraving,{...value,type:'individual'});state.rings[i]=S.normalizeRing(state.rings[i]);}}persist();viewer?.update(state);renderSummary();toast('Individualgravur übernommen.');}});}
$('.wc').addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.step!==undefined){step=Number(b.dataset.step);notice='';render();}
 else if(b.dataset.ring!==undefined){state.pair=b.dataset.ring==='pair';if(!state.pair)state.active=Number(b.dataset.ring);segment=0;render();}
 else if(b.dataset.segment!==undefined){segment=Number(b.dataset.segment);render();}
 else if(b.dataset.path){apply(b.dataset.path,b.dataset.value);}
 else if(b.dataset.view){viewer?.view(b.dataset.view);if(b.dataset.view==='rotate'){b.setAttribute('aria-pressed',String(viewer.rotating));b.setAttribute('aria-label',viewer.rotating?'Drehung pausieren':'Drehung starten');b.textContent=viewer.rotating?'Ⅱ':'▷';}}
 else if(b.dataset.symbol){const region=b.closest('[data-engraving-ring]'),index=region?Number(region.dataset.engravingRing):state.active,field=(region||$('#wcControls')).querySelector('input[type=text]'),text=state.rings[index].engraving.text,start=field?.selectionStart??text.length,end=field?.selectionEnd??start;apply('@'+index+'.engraving.text',(text.slice(0,start)+C.SYMBOLS[b.dataset.symbol]+text.slice(end)).slice(0,40));}
 else if(b.dataset.deleteStone!==undefined){const stones=C.clone(current().stone.free);stones.splice(Number(b.dataset.deleteStone),1);apply('stone.free',stones);}
 else if(b.id==='wcAddStone'){const list=C.clone(current().stone.free);list.push({angle:(list.length*20)%360,position:0,size:'brilliant-100-0',quality:'tw/vsi'});apply('stone.free',list);}
 else if(b.id==='wcClearStones')apply('stone.free',[]);
});
$('#wcControls').addEventListener('change',e=>{const input=e.target;if(!input.dataset.path)return;const deferred=['range','text'].includes(input.type);apply(input.dataset.path,input.type==='checkbox'?input.checked:input.type==='range'?Number(input.value)-Number(input.dataset.offset||0):input.value,!deferred);if(input.type==='range')render();});
$('#wcControls').addEventListener('focusin',e=>{if(e.target.type==='text')remember();});
$('#wcControls').addEventListener('pointerdown',e=>{if(e.target.type==='range')remember();});
$('#wcControls').addEventListener('input',e=>{const input=e.target;if(!input.dataset.path||!['range','text'].includes(input.type))return;if(input.type==='range')input.closest('label').querySelector('output').textContent=Number(input.value).toLocaleString('de-DE')+(input.max==='359'?' °':' mm');apply(input.dataset.path,input.type==='range'?Number(input.value)-Number(input.dataset.offset||0):input.value,false);if(input.type==='text'){input.closest('label').querySelector('output').textContent=input.value.length+' / 40';const preview=(input.closest('[data-engraving-ring]')||$('#wcControls')).querySelector('.wc-engraving-preview');if(preview)preview.textContent=input.value||'Für immer verbunden';}});
$('#wcPrev').onclick=()=>{step=Math.max(0,step-1);render();};$('#wcNext').onclick=()=>{if(step===5)$('#wcSummary').scrollIntoView({behavior:'smooth'});else{step++;render();}};
$('#wcUndo').onclick=()=>{if(undo.length){state=S.normalizeState(JSON.parse(undo.pop()));persist();render();viewer?.update(state,true);}};
$('#wcNew').onclick=()=>{remember();state=S.normalizeState(C.initialState());step=0;segment=0;persist();render();viewer?.update(state,true);toast('Neue Konfiguration gestartet. Mit Rückgängig wiederherstellen.');};
$('#wcRingCount').onclick=()=>{remember();if(state.rings.length===2){state.rings.splice(1,1);state.active=0;state.pair=false;}else{state.rings.push(S.normalizeRing({...C.clone(state.rings[0]),size:54}));state.active=1;}persist();render();viewer?.update(state,true);};
$('#wcSave').onclick=saveDialog;$('#wcDetails').onclick=()=>$('#wcSummary').scrollIntoView({behavior:'smooth'});$('#wcCopy').onclick=()=>copy(summaryText());$('#wcImage').onclick=()=>viewer?.download();
$('#wcPrint').onclick=()=>{const url=viewer?.snapshot();$('.wc-print-image')?.remove();if(url){const image=document.createElement('img');image.className='wc-print-image';image.src=url;$('#wcSummary').prepend(image);}window.print();};
$('#wcWhatsapp').onclick=()=>window.open('https://wa.me/?text='+encodeURIComponent(summaryText()),'_blank','noopener');$('#wcMail').onclick=()=>{location.href='mailto:?subject='+encodeURIComponent('Meine Trauring-Konfiguration bei Damla')+'&body='+encodeURIComponent(summaryText());};
$('#wcFullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else $('.wc-studio').requestFullscreen?.().catch(()=>toast('Vollbild ist in diesem Browser nicht verfügbar.'));};
window.addEventListener('hashchange',()=>{try{if(/^#[dk]=/.test(location.hash))loadState(S.decode(location.href));}catch{toast('Der Konfigurationslink ist nicht gültig.');}});
render();
try{viewer=new WeddingViewer($('#kfBuehne'));await viewer.init();viewer.update(state,true);render();}catch(error){console.error('3D-Ansicht:',error);$('#kfWebglHinweis').hidden=false;$('.wc-loading').hidden=true;}
// Expose immutable diagnostics for browser QA and support, never renderer internals.
window.damlaConfigurator={getState:()=>C.clone(state),getCatalog:()=>({profiles:Object.keys(S.PROFILES).length,metals:Object.keys(C.METALS).length,finishes:Object.keys(C.FINISHES).length,divisions:S.OPTIONS.divisions.length,presets:Object.keys(C.PRESETS).length}),setState:loadState};
