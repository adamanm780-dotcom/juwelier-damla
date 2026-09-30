// Option catalogue, validation and share links for the engagement-ring configurator.
// Labels are German trade terms. Keys are part of share links and design codes: never rename, only append.

export const arrangements={solitaire:['Solitär','Ein einzelner Mittelstein, ganz auf sich gestellt.'],halo:['Halo','Ein Kranz kleiner Brillanten umrahmt den Mittelstein und lässt ihn größer wirken.'],
  doppelhalo:['Doppel-Halo','Zwei Kränze aus Brillanten umrahmen den Mittelstein.'],trilogie:['Trilogie','Drei Steine für Vergangenheit, Gegenwart und Zukunft: der Mittelstein mit zwei kleineren Steinen an den Seiten.'],
  toietmoi:['Toi et Moi','Zwei Steine, du und ich: schräg versetzt nebeneinander gefasst.']};
export const settings={krappen:['Krappen','Krappen halten den Stein mit wenig Metall, so fällt das meiste Licht hinein.'],zarge:['Zarge','Ein polierter Metallkragen umschließt den Stein: flach, schützend und alltagstauglich.'],
  halbzarge:['Halbzarge','Der Metallkragen fasst den Stein vorn und hinten, an den Seiten bleibt er offen.'],spann:['Spannring-Optik','Der Stein scheint zwischen den Enden der Schiene zu schweben.']};
export const prongOptions={'4':'Vier Krappen','6':'Sechs Krappen',double:'Doppelkrappen'};
export const prongTips={rund:'Rund',kralle:'Krallenkrappe (spitz)'};
export const galleries={offen:'Offen',hiddenhalo:'Verdeckter Halo'};
export const surprises={none:'Ohne',diamond:'Diamant',sapphire:'Saphir',ruby:'Rubin',smaragd:'Smaragd'};
export const heights={standard:'Standard',niedrig:'Niedrig'};
export const haloShapes={stone:'Folgt dem Stein',cushion:'Kissenform'};
export const sideShapes={auto:'Passend zum Mittelstein',round:'Brillant',pear:'Tropfen',taperedBaguette:'Baguette konisch',trapez:'Trapez'};
export const sideSizes={fein:['Fein',.45],klassisch:['Klassisch',.55],kraeftig:['Kräftig',.65]};
export const secondShapes={same:'Wie der Mittelstein',round:'Brillant',oval:'Oval',pear:'Tropfen',princess:'Princess',emerald:'Smaragdschliff'};
export const secondSizes={gleich:'Gleich groß',kleiner:'Etwas kleiner'};
// Stone shapes, in the order of the chips.
export const cuts={round:'Brillant',oval:'Oval',princess:'Princess',cushion:'Cushion',elongatedCushion:'Cushion länglich',pear:'Tropfen',emerald:'Smaragdschliff',radiant:'Radiant',marquise:'Marquise',asscher:'Asscher',heart:'Herz',oldEuropean:'Altschliff'};
export const elongatedCuts=['oval','elongatedCushion','pear','emerald','marquise'];
export const orientations={ns:'Längs (Nord-Süd)',ew:'Quer (Ost-West)'};
// Stone kinds: label and swatch colour (null = colourless). "Synthetisch" per BV Schmuck+Uhren / ISO 18323.
export const stones={diamond:['Diamant',null],lab:['Synthetischer Diamant',null],sapphire:['Saphir',0x2447a8],ruby:['Rubin',0xc0203f],smaragd:['Smaragd',0x1f8a55],
  aquamarine:['Aquamarin',0x8cc7de],morganite:['Morganit',0xf0b6a4],moissanite:['Moissanit (synthetisch)',null],fancy:['Farbdiamant',0xe8c14a],own:['Eigener Stein',null]};
export const colors={sapphire:{blue:['Blau',0x2447a8],pink:['Rosa',0xe07aa6],yellow:['Gelb',0xf2c230],padparadscha:['Padparadscha',0xf29a79],teal:['Petrol',0x1f7f86],white:['Weiß',0xeef1f4]},
  fancy:{fancyYellow:['Gelb',0xf0c93a],champagne:['Champagner',0xd6a878],fancyPink:['Rosa',0xf0a0b8],black:['Schwarz',0x1c1c20]}};
export const grades={exceptional:'D · IF – River, lupenrein',excellent:'E–F · VVS – River / Top Wesselton',veryGood:'G–H · VS – Top Wesselton / Wesselton',good:'I–J · SI – Top Crystal',custom:'Individuell'};
export const colorGrades=['D','E','F','G','H','I','J','K'];
export const clarities=['IF','VVS1','VVS2','VS1','VS2','SI1','SI2'];
export const certs={advice:'Empfehlung im Gespräch',gia:'GIA',igi:'IGI',hrd:'HRD',none:'Ohne Zertifikat'};
export const gemCerts={advice:'Im Gespräch',report:'Edelsteingutachten gewünscht',none:'Nicht nötig'};
export const metals={yellow:['Gelbgold',0xf8d17c],white:['Weißgold',0xe2e4e8],rose:['Roségold',0xe8b098],red:['Rotgold',0xd99a7e],platinum:['Platin',0xcdd1d8],
  champagne:['Champagnergold',0xd9c6a6],honey:['Honiggold',0xeec07e],gray:['Graugold',0xbfc0ba]};
export const heads={same:'Wie die Schiene',white:'Weißgold',platinum:'Platin',yellow:'Gelbgold'};
export const finishes={polished:'Poliert','horizontal-matte':'Längsmatt','vertical-brushed':'Quermatt','ice-matte':'Eismatt','sandmatte-fine':'Sandmatt','hammered-matte':'Hammerschlag matt','hammered-big':'Hammerschlag grob'};
export const shanks={gerade:['Gerade','Gleich breite Schiene, schlicht und zeitlos.'],verjuengt:['Verjüngt','Die Schiene wird zum Stein hin schmaler und lässt ihn größer wirken.'],
  kathedrale:['Kathedrale','Die Schultern steigen in Bögen zum Stein auf.'],twist:['Twist','Zwei Stränge winden sich umeinander.'],geteilt:['Geteilt','Die Schiene teilt sich an den Schultern in zwei Stränge.'],
  bypass:['Bypass','Die Enden der Schiene laufen versetzt am Stein vorbei.']};
export const profiles={bombiert:'Bombiert',flach:'Flach',messerkante:'Messerkante'};
export const bands={glatt:'Glatt',schultern:'Pavé an den Schultern',halb:'Halb ausgefasst',rundum:'Rundum ausgefasst'};
export const bandSettings={pave:'Krappen-Pavé',french:'French Pavé',kanal:'Kanalfassung'};
export const accents={diamond:'Diamant',sapphire:'Saphir',ruby:'Rubin',smaragd:'Smaragd'};
export const accentSizes={fein:'Fein',kraeftig:'Kräftig'};
export const milgrains={none:'Ohne',milgrain:'Perlrand (Milgrain)'};
export const fonts={antiqua:['Antiqua','"Times New Roman", Georgia, serif'],block:['Blockschrift','Arial, "Helvetica Neue", sans-serif'],
  script:['Schreibschrift','"Monotype Corsiva", "Segoe Script", "Apple Chancery", "Snell Roundhand", "URW Chancery L", cursive']};
export const engravingTypes={laser:'Lasergravur',diamond:'Diamantgravur'};
export const symbols={infinity:'∞',heart:'♥','2hearts':'♡♥','2rings':'⚭'};
export const specials={none:'Keine',fingerprint:'Fingerabdruck',handwriting:'Handschrift',motif:'Eigenes Motiv / Koordinaten'};
export const weddingBands={none:'Nein, danke',single:'Ja, passender Damenring',pair:'Ja, als Paar mit Herrenring',curved:'Ja, angepasster Kurvenring',later:'Später entscheiden'};
// Private enquiry details: WhatsApp / e-mail only, never in share links or design codes.
export const budgets={open:'Lieber im Gespräch',b1:'bis 1.000 €',b2:'1.000–2.500 €',b3:'2.500–5.000 €',b4:'5.000–10.000 €',b5:'über 10.000 €'};

export const isDiamond=s=>s.stone==='diamond'||s.stone==='lab';
export const hasColors=s=>Object.hasOwn(colors,s.stone);
export const sixProngCuts=['round','oval','oldEuropean'];
export const fourProngCuts=Object.keys(cuts).filter(c=>!sixProngCuts.includes(c));
export const spannCuts=['round','princess','oval','emerald','asscher'];
export const defaults=()=>({arrangement:'solitaire',setting:'krappen',prongs:'4',prongTip:'rund',gallery:'offen',surprise:'none',height:'standard',haloShape:'stone',
  sideShape:'auto',sideSize:'klassisch',secondShape:'same',secondStone:'same',secondSize:'gleich',
  cut:'round',orient:'ns',stone:'diamond',color:'',carat:1,grade:'veryGood',colorGrade:'G',clarity:'VS1',cert:'advice',
  metal:'yellow',alloy:'585',head:'same',finish:'polished',shank:'kathedrale',profile:'bombiert',width:2.2,band:'glatt',bandSetting:'pave',accent:'diamond',accentSize:'fein',milgrain:'none',
  size:54,sizeUnknown:false,engraving:'',font:'antiqua',engravingType:'laser',special:'none',weddingBand:'none',showBand:false});
const clamp=(n,min,max,step,fallback)=>typeof n==='number'&&Number.isFinite(n)?Number((Math.round(Math.min(max,Math.max(min,n))/step)*step).toFixed(2)):fallback;
const pick=(options,value,fallback)=>Object.hasOwn(options,value)?value:fallback;

// Links from before the option overhaul: the old `style` described head and shank at once.
function migrate(raw){
  if(!raw||typeof raw!=='object'||'arrangement' in raw||!('style' in raw))return raw;
  const map={solitaire:{},pave:{band:'schultern'},halo:{arrangement:'halo'},zarge:{setting:'zarge'},trilogie:{arrangement:'trilogie',shank:'gerade'},twist:{shank:'twist'}};
  const {style,...rest}=raw;return {...rest,...(map[style]??{}),prongs:String(raw.prongs??4)};
}

export function validateConfig(input={}){
  const raw=migrate(input&&typeof input==='object'?input:{}),d=defaults(),v={...d};
  for(const [key,options] of Object.entries({arrangement:arrangements,setting:settings,prongs:prongOptions,prongTip:prongTips,gallery:galleries,surprise:surprises,height:heights,haloShape:haloShapes,
    sideShape:sideShapes,sideSize:sideSizes,secondShape:secondShapes,secondSize:secondSizes,cut:cuts,orient:orientations,stone:stones,grade:grades,metal:metals,head:heads,finish:finishes,
    shank:shanks,profile:profiles,band:bands,bandSetting:bandSettings,accent:accents,accentSize:accentSizes,milgrain:milgrains,font:fonts,engravingType:engravingTypes,special:specials,weddingBand:weddingBands}))
    v[key]=pick(options,raw[key],d[key]);
  v.secondStone=raw.secondStone==='same'||Object.hasOwn(stones,raw.secondStone)&&raw.secondStone!=='own'?raw.secondStone:'same';
  v.color=hasColors(v)?pick(colors[v.stone],raw.color,Object.keys(colors[v.stone])[0]):'';
  v.colorGrade=colorGrades.includes(raw.colorGrade)?raw.colorGrade:d.colorGrade;v.clarity=clarities.includes(raw.clarity)?raw.clarity:d.clarity;
  // Certificates: diamonds GIA/IGI/HRD, coloured stones a gem report; synthetic diamonds default to IGI.
  const certOptions=isDiamond(v)?certs:gemCerts;v.cert=Object.hasOwn(certOptions,raw.cert)?raw.cert:(v.stone==='lab'&&!('cert' in raw)?'igi':'advice');
  v.alloy=v.metal==='platinum'?'950':raw.alloy==='750'?'750':'585';
  if(v.head===v.metal)v.head='same';
  // Setting rules: tension look only as a solitaire with a stone it can grip; half bezel not inside a halo.
  if(v.setting==='spann'&&(v.arrangement!=='solitaire'||!spannCuts.includes(v.cut)))v.setting='krappen';
  if(v.setting==='halbzarge'&&['halo','doppelhalo'].includes(v.arrangement))v.setting='zarge';
  if(v.prongs==='6'&&!sixProngCuts.includes(v.cut))v.prongs='4';
  if(v.gallery==='hiddenhalo'&&!(['solitaire','trilogie'].includes(v.arrangement)&&v.setting!=='spann'))v.gallery='offen';
  if(v.surprise!=='none'&&v.setting!=='krappen')v.surprise='none';
  const minCarat=['trilogie','toietmoi','doppelhalo'].includes(v.arrangement)?.3:.1;
  v.carat=clamp(raw.carat,minCarat,3,.05,Math.max(minCarat,d.carat));
  if(v.height==='niedrig'&&!(v.carat<=1.25&&['solitaire','trilogie'].includes(v.arrangement)&&v.setting!=='spann'))v.height='standard';
  if(v.orient==='ew'&&!(elongatedCuts.includes(v.cut)&&!['trilogie','toietmoi'].includes(v.arrangement)))v.orient='ns';
  if(v.haloShape==='cushion'&&!(['halo','doppelhalo'].includes(v.arrangement)&&['round','oval','oldEuropean'].includes(v.cut)))v.haloShape='stone';
  // Shank rules.
  v.width=clamp(raw.width,1.5,3.5,.1,d.width);
  const allowed=shankOptions(v);
  if(!allowed.includes(v.shank))v.shank=allowed.includes('kathedrale')?'kathedrale':'gerade';
  if(v.shank==='twist'&&v.width<2)v.width=2;
  const bandsFor=bandOptions(v);
  if(!bandsFor.includes(v.band))v.band=bandsFor.includes('schultern')&&v.band!=='glatt'?'schultern':'glatt';
  if(v.band!=='glatt'&&v.profile==='messerkante')v.profile='bombiert';
  if(v.bandSetting==='kanal'&&v.width<2)v.bandSetting='pave';
  if(v.band==='rundum')v.finish='polished';
  v.size=clamp(raw.size,44,75,.5,d.size);v.sizeUnknown=raw.sizeUnknown===true;v.showBand=raw.showBand===true;
  v.engraving=typeof raw.engraving==='string'?Array.from(raw.engraving).slice(0,24).join(''):'';
  return v;
}
// Shank forms and band pavé that fit a design (the UI greys out the others).
export function shankOptions(v){
  if(v.setting==='spann')return ['gerade','verjuengt'];
  if(v.arrangement==='toietmoi')return ['gerade','verjuengt','bypass'];
  if(v.arrangement==='trilogie')return ['gerade','verjuengt','twist','geteilt'];
  return Object.keys(shanks);
}
export function bandOptions(v){
  if(v.shank==='twist'||v.shank==='bypass')return ['glatt'];
  if(v.shank==='geteilt'||v.width<1.8)return ['glatt','schultern'];
  return Object.keys(bands);
}

export const encodeConfig=s=>btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(s)))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
export function decodeConfig(code){try{return validateConfig(JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(code.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0)))));}catch{return defaults();}}

// Design code ("Entwurfsnummer"): every choice packed into bits, Crockford Base32 (no I, L, O, U), a version
// character first and a check character last, printed in groups of four. Engraving text and private details
// are not included; the code opens the same design at #c=<code>.
const FIELDS=()=>[['arrangement',Object.keys(arrangements)],['setting',Object.keys(settings)],['prongs',Object.keys(prongOptions)],['prongTip',Object.keys(prongTips)],['gallery',Object.keys(galleries)],
  ['surprise',Object.keys(surprises)],['height',Object.keys(heights)],['haloShape',Object.keys(haloShapes)],['sideShape',Object.keys(sideShapes)],['sideSize',Object.keys(sideSizes)],
  ['secondShape',Object.keys(secondShapes)],['secondStone',['same',...Object.keys(stones)]],['secondSize',Object.keys(secondSizes)],['cut',Object.keys(cuts)],['orient',Object.keys(orientations)],
  ['stone',Object.keys(stones)],['color',['',...new Set(Object.values(colors).flatMap(Object.keys))]],['carat',[.1,3,.05]],['grade',Object.keys(grades)],['colorGrade',colorGrades],['clarity',clarities],
  ['cert',[...new Set([...Object.keys(certs),...Object.keys(gemCerts)])]],['metal',Object.keys(metals)],['alloy',['585','750','950']],['head',Object.keys(heads)],['finish',Object.keys(finishes)],
  ['shank',Object.keys(shanks)],['profile',Object.keys(profiles)],['width',[1.5,3.5,.1]],['band',Object.keys(bands)],['bandSetting',Object.keys(bandSettings)],['accent',Object.keys(accents)],
  ['accentSize',Object.keys(accentSizes)],['milgrain',Object.keys(milgrains)],['size',[44,75,.5]],['sizeUnknown',[false,true]],['font',Object.keys(fonts)],['engravingType',Object.keys(engravingTypes)],
  ['special',Object.keys(specials)],['weddingBand',Object.keys(weddingBands)],['showBand',[false,true]]];
const ALPHABET='0123456789ABCDEFGHJKMNPQRSTVWXYZ',CODE_VERSION='1';
const isRange=f=>typeof f[1][0]==='number'&&f[1].length===3;
const slots=f=>isRange(f)?Math.round((f[1][1]-f[1][0])/f[1][2])+1:f[1].length;
const checksum=body=>ALPHABET[[...body].reduce((sum,c,i)=>sum+ALPHABET.indexOf(c)*(i+1),0)%32];
export function designCode(state){
  let value=0n;
  for(const f of FIELDS()){const i=isRange(f)?Math.round((state[f[0]]-f[1][0])/f[1][2]):Math.max(0,f[1].indexOf(state[f[0]]));value=value*BigInt(slots(f))+BigInt(i);}
  let digits='';do{digits=ALPHABET[Number(value%32n)]+digits;value/=32n;}while(value>0n);
  const body=CODE_VERSION+digits;return (body+checksum(body)).match(/.{1,4}/g).join('-');
}
export function decodeDesignCode(code){
  const clean=String(code).toUpperCase().replace(/[^0-9A-Z]/g,'').replace(/[IL]/g,'1').replace(/O/g,'0');
  if(clean.length<3||clean[0]!==CODE_VERSION)return null;
  const body=clean.slice(0,-1);if(checksum(body)!==clean.at(-1))return null;
  let value=0n;for(const c of body.slice(1)){const i=ALPHABET.indexOf(c);if(i<0)return null;value=value*32n+BigInt(i);}
  const out={};for(const f of FIELDS().reverse()){const n=BigInt(slots(f)),i=Number(value%n);value/=n;out[f[0]]=isRange(f)?Number((f[1][0]+i*f[1][2]).toFixed(2)):f[1][i];}
  return validateConfig(out);
}
