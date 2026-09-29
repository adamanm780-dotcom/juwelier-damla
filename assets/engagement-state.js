export const styles={solitaire:['Solitaire','Ein einzelner Stein in einer offenen Krappenfassung.'],pave:['Pavé','Kleine Brillanten begleiten den Mittelstein auf beiden Schultern.'],halo:['Halo','Ein feiner Brillantkranz umrahmt den Mittelstein.'],zarge:['Zarge','Ein polierter Metallkragen umschließt den Stein: flach, schützend und alltagstauglich.'],trilogie:['Trilogie','Drei Steine für Vergangenheit, Gegenwart und Zukunft: der Mittelstein mit zwei kleineren Brillanten.'],twist:['Twist','Zwei Schienenstränge winden sich umeinander und tragen den Mittelstein.']};
export const cuts={round:'Brillant',oval:'Oval',emerald:'Smaragdschliff',princess:'Princess',cushion:'Cushion',radiant:'Radiant'};
// Stone kinds: label and swatch colour (null = colourless diamond).
export const stones={diamond:['Diamant',null],lab:['Labordiamant',null],sapphire:['Saphir',0x2447a8],ruby:['Rubin',0xc0203f],smaragd:['Smaragd',0x1f8a55]};
export const grades={excellent:'Exzellent · E–F · VVS',veryGood:'Sehr gut · G–H · VS',good:'Gut · I–J · SI'};
export const metals={yellow:['Gelbgold',0xf8d17c],white:['Weißgold',0xe2e4e8],rose:['Roségold',0xdca18a],platinum:['Platin',0xcdd1d8]};
// Metal of the setting (crown, prongs, bezel); 'same' follows the shank.
export const heads={same:'Wie die Schiene',white:'Weißgold',platinum:'Platin',yellow:'Gelbgold'};
// Four-prong-only cuts: square and cornered stones are held at their corners.
export const fourProngCuts=['emerald','princess','cushion','radiant'];
export const defaults=()=>({style:'solitaire',cut:'round',metal:'yellow',alloy:'585',carat:1,width:2.2,size:54,prongs:4,engraving:'',stone:'diamond',grade:'veryGood',head:'same'});
const clamp=(n,min,max,step,fallback)=>typeof n==='number'&&Number.isFinite(n)?Number((Math.round(Math.min(max,Math.max(min,n))/step)*step).toFixed(2)):fallback;
export function validateConfig(raw={}) {
  if(!raw||typeof raw!=='object')raw={};
  const v=defaults();
  for(const [key,values] of Object.entries({style:styles,cut:cuts,metal:metals,stone:stones,grade:grades,head:heads}))if(Object.hasOwn(values,raw[key]))v[key]=raw[key];
  v.alloy=v.metal==='platinum'?'950':raw.alloy==='750'?'750':'585';
  v.carat=clamp(raw.carat,.3,2,.05,1);v.width=clamp(raw.width,1.8,3,.1,2.2);v.size=clamp(raw.size,44,70,1,54);
  v.prongs=raw.prongs===6&&!fourProngCuts.includes(v.cut)?6:4;
  if(v.head===v.metal)v.head='same';
  v.engraving=typeof raw.engraving==='string'?Array.from(raw.engraving).slice(0,24).join(''):'';
  return v;
}
export const isDiamond=s=>s.stone==='diamond'||s.stone==='lab';
export const encodeConfig=s=>btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(s)))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
export function decodeConfig(code){try{return validateConfig(JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(code.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0)))));}catch{return defaults();}}
