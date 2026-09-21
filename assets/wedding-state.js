import {METALS,FINISHES,PRESETS,CUTS,QUALITIES,GROOVES,FONTS,ENGRAVINGS,EDGE_TYPES,ORIENTATIONS,defaults,initialState,clone,number} from './wedding-catalog.js?v=3';
const read=async name=>{const response=await fetch(new URL(name,import.meta.url));if(!response.ok)throw new Error('Auswahldaten fehlen: '+name);return response.json();};
export const [OPTIONS,PROFILES,DIMENSIONS]=await Promise.all([read('wedding-options.json?v=3'),read('wedding-profiles.json?v=3'),read('wedding-dimensions.json?v=3')]);
export let STONE_DATA={presets:{},size_catalogs:{brilliant:OPTIONS.sizes}};
try{STONE_DATA=await read('wedding-stones.json?v=3');}catch(error){console.warn(error.message);}
export const nearest=(values,value)=>values.reduce((best,n)=>Math.abs(n-value)<Math.abs(best-value)?n:best,values[0]);
const known=(map,value,fallback)=>Object.hasOwn(map,value)?value:fallback;
export const dimensionRow=k=>DIMENSIONS[k.profile].find(r=>Math.abs(r.width-k.width)<.001)||DIMENSIONS[k.profile][0];
export const widths=k=>[...new Set(DIMENSIONS[k.profile].map(r=>r.width))].sort((a,b)=>a-b);
export const heights=k=>dimensionRow(k).heights;
export const memoireBandWidth=k=>Math.min(k.width-.6,(stoneSize(k).width||1.7)+(k.stone.preset==='memoire2'?.3:.4));
export function effectiveDivision(k){if(k.stone?.preset?.startsWith('memoire')){const band=memoireBandWidth(k);return{id:'memoire',type:'vertical',rates:k.stone.bothSides&&2*band<k.width-.3?[band,k.width-2*band,band]:[k.width-band,band]};}return OPTIONS.divisions.find(d=>d.id===(k.division==='none'?k.surfaceDivision:k.division))||OPTIONS.divisions[0];}
export const colorDivision=k=>OPTIONS.divisions.find(d=>d.id===k.division)||OPTIONS.divisions[0];
export const availableDivisions=k=>dimensionRow(k).divisions;
export function availablePresets(k){
 const matrix=STONE_DATA.heightAvailability?.[k.profile];
 if(!matrix)return dimensionRow(k).presets;
 const row=matrix.heights.reduce((best,r)=>Math.abs(r.height-k.height)<Math.abs(best.height-k.height)?r:best,matrix.heights[0]);
 let result=row?.allowedPresets||dimensionRow(k).presets; if(effectiveDivision(k).type==='wave')result=result.filter(x=>!['free','combined'].includes(x));if(k.width<3)result=result.filter(x=>!x.startsWith('memoire'));return result;
}
export function observation(k){
 const observations=STONE_DATA.presets[k.stone.preset]?.observations||[];
 return observations.reduce((best,o)=>{
 const score=x=>Math.abs(x.configuration.width-k.width)+Math.abs(x.configuration.height-k.height)*2+(x.configuration.profile===k.profile?0:3)+(x.selection.cut===k.stone.cut?0:10)+(x.selection.quality===k.stone.quality?0:4)+(x.selection.size===k.stone.size?0:.1);
 return !best||score(o)<score(best)?o:best;
 },null);
}
export function stoneOptions(k,key){
 const o=observation(k)?.options[key];return Array.isArray(o)?o.filter(x=>x.selectable!==false):o;
}
export function cuts(k){const o=stoneOptions(k,'cut');return o?.length?o.map(x=>x.id):['brilliant'];}
export function sizes(k,secondary=false){
 const cut=secondary?'brilliant':k.stone.cut;
 const list=STONE_DATA.size_catalogs[cut]||OPTIONS.sizes;
 const set=k.stone.preset;
 const raised=set==='top'||set==='clamping-open'||(set==='combined'&&k.stone.setting==='top');
 const maxWidth=raised?10:set.startsWith('side-')?k.height-.3:k.width-.65;
 const maxDepth=raised?10:(k.height-.24)/.55;
 const quality=secondary?k.stone.secondaryQuality:k.stone.quality;
 const o=observation(k),values=o?.options[secondary?'secondarySize':'size'];
 const exact=o&&o.configuration.profile===k.profile&&Math.abs(o.configuration.width-k.width)<.01&&Math.abs(o.configuration.height-k.height)<.01&&(secondary||o.selection.cut===k.stone.cut);
 let allowed=null;
 if(exact&&Array.isArray(values))allowed=values.filter(x=>x.selectable!==false).map(x=>x.id);
 const matrix=STONE_DATA.heightAvailability?.[k.profile],heightRow=matrix?.heights.find(r=>Math.abs(r.height-k.height)<.01);
 if(!secondary&&set==='bezel'&&cut==='brilliant'&&heightRow)allowed=heightRow.bezelSizes;
 if(!allowed&&raised&&Array.isArray(values))allowed=values.filter(x=>x.selectable!==false).map(x=>x.id);
 return list.filter(x=>(allowed?allowed.includes(x.id):x.width<=Math.min(maxWidth,maxDepth)+.015)&&(!x.meta?.qualities||x.meta.qualities.includes(quality))&&x.width<=maxWidth+.015);
}
export function stoneSize(k,secondary=false){const list=STONE_DATA.size_catalogs[secondary?'brilliant':k.stone.cut]||OPTIONS.sizes;return list.find(x=>x.id===k.stone[secondary?'secondarySize':'size'])||list[0];}
export function maxQuantity(k,secondary=false){
 const size=stoneSize(k,secondary);const spacing=size.width+.2;
 if(k.stone.preset==='cross-channel')return Math.max(1,Math.floor((k.width-.5)/spacing));
 if(['top','clamping-open','combined'].includes(k.stone.preset)&&!secondary)return 1;
 const key=k.stone.preset.startsWith('memoire')?'memoireQuantity':secondary?'secondaryQuantity':'quantity',observed=stoneOptions(k,key);const full=Array.isArray(observed)?observed.find(x=>x.id==='ringDependent100'):null;if(full?.count){const context=observation(k);const observedSize=(STONE_DATA.size_catalogs[secondary?'brilliant':k.stone.cut]||OPTIONS.sizes).find(x=>x.id===context.selection[secondary?'secondarySize':'size']);if(observedSize&&Math.abs(observedSize.width-size.width)<.01)return Math.max(1,Math.floor(full.count*k.size/context.configuration.size));}
 return Math.max(1,Math.floor(k.size/spacing));
}
export function maxRows(k){return k.stone.preset==='section'?Math.max(1,Math.min(3,Math.floor((k.width-.4)/(stoneSize(k).width+.1)))):k.stone.preset==='cross-channel'?2:1;}
export function count(k,secondary=false){
 if(k.stone.preset==='none')return 0;
 if(k.stone.preset==='free')return k.stone.free.length;
 const q=k.stone[secondary?'secondaryQuantity':k.stone.preset.startsWith('memoire')?'memoireQuantity':'quantity'];
 const max=maxQuantity(k,secondary);
 const n=typeof q==='string'&&q.startsWith('ringDependent')?(q==='ringDependent33'?Math.round(max/3):Math.floor(max*Number(q.replace('ringDependent',''))/100)):Number(q)||1;
 return Math.max(1,Math.min(max,n))*(secondary?1:k.stone.rows||1)*(k.stone.bothSides?2:1);
}
export function grooveWidths(k){const g=k.groove,left=['left','both'].includes(k.edge.type)?k.edge.leftWidth:0,right=['right','both'].includes(k.edge.type)?k.edge.rightWidth:0,n=Math.max(1,g.quantity);return GROOVES[g.form].widths.filter(w=>w*n+Math.max(0,n-1)*.15<=k.width-left-right-.3+.001);}
export function edgeWidths(k,side){const both=k.edge.type==='both',space=k.width-(k.groove.quantity?k.groove.width*k.groove.quantity+.3:.3);return [.5,1,1.5,2].filter(w=>w*(both?2:1)<space+.001);}
export const isGold=color=>['white','red','yellow','gray','champagne','honey'].includes(color);
export function grades(k,index){
 const color=k.metals[index].color,used=k.metals.slice(0,effectiveDivision(k).rates.length);let result=METALS[color].grades;
 if(isGold(color)){for(const m of used)result=result.filter(n=>isGold(m.color)?METALS[m.color].grades.includes(n):(m.color==='silver'?[585]:[585,750]).includes(n));}
 if(color==='platinum'&&effectiveDivision(k).rates.length===3&&used.some(m=>isGold(m.color)))result=result.filter(n=>n===600);
 return result;
}
export function normalizeRing(input){
 const d=defaults(),k={...d,...input};
 k.profile=known(PROFILES,k.profile,'PB04');k.width=nearest(widths(k),Number(k.width)||3.5);k.height=nearest(heights(k),Number(k.height)||1.2);k.size=number(k.size,45,75,.5);
 k.division=OPTIONS.divisions.some(d=>d.id===k.division)&&availableDivisions(k).includes(k.division)?k.division:'none';
 k.surfaceDivision=OPTIONS.divisions.some(d=>d.id===k.surfaceDivision)&&availableDivisions(k).includes(k.surfaceDivision)?k.surfaceDivision:'none';
 k.cycles=number(k.cycles,1,effectiveDivision(k).rates.length===3?6:4);
 k.metals=d.metals.map((m,i)=>{const a={...m,...input?.metals?.[i]};a.color=known(METALS,a.color,m.color);a.grade=METALS[a.color].grades.includes(Number(a.grade))?Number(a.grade):METALS[a.color].grades.includes(585)?585:METALS[a.color].grades[0];a.finish=known(FINISHES,a.finish,'polished');return a;});
 if(k.division==='none'&&!k.stone?.preset?.startsWith('memoire'))for(const m of k.metals){m.color=k.metals[0].color;m.grade=k.metals[0].grade;}
 const sharedGrades=new Map();for(let i=0;i<effectiveDivision(k).rates.length;i++){const m=k.metals[i],allowed=grades(k,i),family=isGold(m.color)?'gold':m.color;if(!allowed.includes(m.grade))m.grade=allowed.includes(585)?585:allowed[0];if(sharedGrades.has(family)&&allowed.includes(sharedGrades.get(family)))m.grade=sharedGrades.get(family);else sharedGrades.set(family,m.grade);}
 const gold=k.metals.slice(0,effectiveDivision(k).rates.length).find(m=>isGold(m.color));if(gold)for(const m of k.metals)if(m.color==='palladium')m.grade=gold.grade===750?950:500;
 k.stone={...d.stone,...input?.stone};k.stone.preset=known(PRESETS,k.stone.preset,'none');
 if(!availablePresets(k).includes(k.stone.preset))k.stone.preset='none';
 k.stone.cut=known(CUTS,k.stone.cut,'brilliant');if(!cuts(k).includes(k.stone.cut))k.stone.cut=cuts(k)[0];
 k.stone.quality=known(QUALITIES,k.stone.quality,'tw/vsi');k.stone.secondaryQuality=known(QUALITIES,k.stone.secondaryQuality,'tw/vsi');
 for(const secondary of [false,true]){const field=secondary?'secondarySize':'size',list=sizes(k,secondary);if(!list.some(x=>x.id===k.stone[field]))k.stone[field]=list.at(-1)?.id||'brilliant-50-0';}
 k.stone.orientation=known(ORIENTATIONS,k.stone.orientation,'center');k.stone.position=number(k.stone.position,-k.width/2+.6,k.width/2-.6,.01);k.stone.offset=number(k.stone.offset,0,360,1);
 k.stone.bothSides=k.stone.preset.startsWith('memoire')&&!!k.stone.bothSides&&memoireBandWidth(k)*2<k.width-.3;
 k.stone.rows=number(k.stone.rows,1,maxRows(k));
 for(const key of ['quantity','secondaryQuantity','memoireQuantity'])if(!['ringDependent33','ringDependent50','ringDependent100'].includes(k.stone[key]))k.stone[key]=number(k.stone[key],1,maxQuantity(k,key==='secondaryQuantity'));
 if(k.stone.preset==='combined'&&typeof k.stone.secondaryQuantity==='number')k.stone.secondaryQuantity=Math.max(2,Math.floor(k.stone.secondaryQuantity/2)*2);if(k.stone.preset==='cross-channel')k.stone.quantity=maxQuantity(k);if(!['bezel','section','channel'].includes(k.stone.preset))k.stone.orientation='center';if(k.stone.preset==='channel'&&!['center','free'].includes(k.stone.orientation))k.stone.orientation='center';
 if(k.stone.preset==='top')for(const metal of k.metals)metal.finish='polished';
 k.stone.free=Array.isArray(k.stone.free)?k.stone.free.slice(0,64).map(s=>({angle:number(s.angle,0,360),position:number(s.position,-k.width/2+.55,k.width/2-.55,.01),size:OPTIONS.sizes.some(x=>x.id===s.size)?s.size:'brilliant-100-0',quality:known(QUALITIES,s.quality,'tw/vsi')})):[];
 k.groove={...d.groove,...input?.groove};k.groove.form=known(GROOVES,k.groove.form,'none');k.groove.quantity=k.groove.form==='none'?0:number(k.groove.quantity,0,4);const gw=GROOVES[k.groove.form].widths;if(gw.length)k.groove.width=nearest(gw,Number(k.groove.width)||gw[0]);k.groove.color=known({none:1,yellow:1,white:1,red:1},k.groove.color,'none');k.groove.surface='polished';if(['v-groove-60','perlage'].includes(k.groove.form))k.groove.color='none';k.groove.angle=number(k.groove.angle,-90,90);
 k.groove.positions=Array.from({length:k.groove.quantity},(_,i)=>number(k.groove.positions?.[i]??((i+1)*k.width/(k.groove.quantity+1)-k.width/2),-k.width/2+.2,k.width/2-.2,.01));
 k.edge={...d.edge,...input?.edge};k.edge.type=known(EDGE_TYPES,k.edge.type,'none');for(const side of ['left','right']){k.edge[side+'Width']=nearest([.5,1,1.5,2].filter(n=>n<k.width/2),Number(k.edge[side+'Width'])||.5);k.edge[side+'Surface']='polished';}
 // Resolve machining conflicts locally; retain existing positions whenever possible.
 for(const side of ['left','right']){const options=edgeWidths(k,side);k.edge[side+'Width']=nearest(options.length?options:[.5],k.edge[side+'Width']);}
 const widthsForGroove=grooveWidths(k);if(widthsForGroove.length)k.groove.width=nearest(widthsForGroove,k.groove.width);else if(k.groove.quantity){k.groove.quantity=0;k.groove.positions=[];}
 const left=['left','both'].includes(k.edge.type)?k.edge.leftWidth:0,right=['right','both'].includes(k.edge.type)?k.edge.rightWidth:0;
 const low=-k.width/2+left+k.groove.width/2+.025,high=k.width/2-right-k.groove.width/2-.025,placed=[];
 for(let position of k.groove.positions){position=Math.max(low,Math.min(high,position));if(placed.some(v=>Math.abs(v-position)<k.groove.width+.1)){let best=null,dist=Infinity;for(let t=low;t<=high+.001;t+=.01)if(placed.every(v=>Math.abs(v-t)>=k.groove.width+.1)&&Math.abs(t-position)<dist){best=t;dist=Math.abs(t-position);}if(best===null)continue;position=best;}placed.push(Math.round(position*100)/100);}
 k.groove.positions=placed;k.groove.quantity=placed.length;
 k.separation={width:.4,color:'none',surface:'polished',...input?.separation};k.separation.width=nearest([.4,.6,.8,1,1.5,1.8],Number(k.separation.width)||.4);k.separation.color=known({none:1,yellow:1,white:1,red:1},k.separation.color,'none');k.separation.surface='polished';
 k.separations=Array.isArray(k.separations)?k.separations.slice(0,2).map(x=>!!x):[];
 k.engraving={...d.engraving,...input?.engraving};k.engraving.type=known(ENGRAVINGS,k.engraving.type,'none');k.engraving.font=known({...FONTS,palscri:1,KozukaGothicPr6NEL:1},k.engraving.font,'arial');if(k.engraving.type==='diamond'&&!['palscri','KozukaGothicPr6NEL'].includes(k.engraving.font))k.engraving.font='palscri';if(k.engraving.type==='laser'&&!FONTS[k.engraving.font])k.engraving.font='arial';k.engraving.text=String(k.engraving.text||'').slice(0,40);k.engraving.art=typeof k.engraving.art==='string'&&/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(k.engraving.art)&&k.engraving.art.length<250000?k.engraving.art:null;
 k.engraving.motifs=(Array.isArray(k.engraving.motifs)?k.engraving.motifs:[]).slice(0,80).map(o=>({kind:['heart','text','symbol','image'].includes(o.kind)?o.kind:'text',x:number(o.x,0,1000,.1),y:number(o.y,0,220,.1),scale:number(o.scale,.01,1.5,.001),rotation:number(o.rotation,-180,180),variant:number(o.variant,0,24),text:String(o.text||'').slice(0,100),font:known(FONTS,o.font,'arial'),align:['left','center','right'].includes(o.align)?o.align:'center',...(typeof o.image==='string'&&/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(o.image)&&o.image.length<250000?{image:o.image}:{})}));
 return k;
}
export function normalizeState(s){return{version:3,active:s.active===0||s.rings?.length===1?0:1,pair:!!s.pair&&s.rings?.length!==1,rings:(Array.isArray(s.rings)&&s.rings.length?s.rings:initialState().rings).slice(0,2).map(normalizeRing)};}
export function encode(state){const raw=new TextEncoder().encode(JSON.stringify(state));let str='';for(const x of raw)str+=String.fromCharCode(x);return btoa(str).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}

export function decodeLegacy(text){
 const code=text.split('#k=')[1],bytes=Uint8Array.from(atob(code.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)),old=JSON.parse(new TextDecoder().decode(bytes));
 const metal={gelbgold:'yellow',weissgold:'white',rotgold:'red',platin:'platinum'},finish={poliert:'polished',laengsmatt:'horizontal-matte',quer:'vertical-brushed',quermatt:'vertical-brushed',eismatt:'ice-matte',sandmatt:'sandmatte-fine',gehammert:'hammered-big'},profile={flach:'PB12',bombiert:'PB03',oval:'PB04',konkav:'PB10',kantig:'PB13'};
 const ring=a=>{const k=defaults();k.profile=profile[a.profil]||'PB12';k.width=Number(a.breite)||4.5;k.height=Number(a.staerke)||1.6;k.size=Number(a.groesse)||54;k.metals[0]={color:metal[a.legierung]||'yellow',grade:Number(a.karat)||585,finish:finish[a.oberflaeche]||'polished'};if(a.bicolor){k.division=a.teilung==='halb'?'vertical-1-1':'vertical-1-2-1';k.metals[1].color=metal[a.zweitmetall]||'white';k.metals[2]={...k.metals[0]};}if(a.besatz&&a.besatz!=='ohne'){k.stone.preset='bezel';k.stone.quantity={eins:1,drei:3,fuenf:5,sieben:7,halb:'ringDependent50',rundum:'ringDependent100'}[a.besatz]||1;}if(a.gravur){k.engraving.type='laser';k.engraving.text=a.gravur;k.engraving.font=a.schrift==='modern'?'arial':'amazonebt';}return k;};
 return normalizeState({rings:[ring(old.a||{}),ring(old.b||{})],active:0,pair:!!old.g});
}
export function decode(text){if(text.includes('#k='))return decodeLegacy(text);const code=text.includes('#d=')?text.split('#d=')[1]:text.replace(/^DAM3-/,'');if(code.length>1500000)throw Error('Der Entwurf ist zu groß.');const bytes=Uint8Array.from(atob(code.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));return normalizeState(JSON.parse(new TextDecoder().decode(bytes)));}
export function estimate(k){
 const division=effectiveDivision(k),total=division.rates.reduce((a,b)=>a+b,0);let weight=0,material=0;
 const volume=(Math.pow(k.size/(2*Math.PI)+k.height,2)-Math.pow(k.size/(2*Math.PI),2))*Math.PI*k.width*.82/1000;
 division.rates.forEach((r,i)=>{const metal=k.metals[i],m=METALS[metal.color],g=volume*r/total*m.density;weight+=g;material+=g*(metal.color==='silver'?7:metal.color==='palladium'?57:metal.color==='platinum'?78:metal.grade*.09);});
 let stoneCost=0;const gem=(s,q)=>q==='lab-grown/F/VS'?24+s.carat*200:55+s.carat*1600;
 if(k.stone.preset==='free')stoneCost=k.stone.free.reduce((a,s)=>a+gem(OPTIONS.sizes.find(x=>x.id===s.size)||OPTIONS.sizes[0],s.quality),0);
 else if(k.stone.preset!=='none'){stoneCost=count(k)*gem(stoneSize(k),k.stone.quality);if(k.stone.preset==='combined')stoneCost+=count(k,true)*gem(stoneSize(k,true),k.stone.secondaryQuality);}
 const sum=130+material+stoneCost+(division.rates.length-1)*70+k.groove.quantity*25+(k.edge.type==='none'?0:35)+(k.engraving.type==='none'?0:30)+k.metals.slice(0,division.rates.length).filter(m=>m.finish!=='polished').length*25;
 return{weight,price:Math.round(sum/10)*10,stones:count(k)+(k.stone.preset==='combined'?count(k,true):0)};
}
