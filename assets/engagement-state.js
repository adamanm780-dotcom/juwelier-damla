export const styles={solitaire:['Solitaire','Ein einzelner Diamant in einer offenen Krappenfassung.'],pave:['Pavé','Kleine Brillanten begleiten den Mittelstein auf beiden Schultern.'],halo:['Halo','Ein feiner Brillantkranz umrahmt den Mittelstein.']};
export const cuts={round:'Brillant',oval:'Oval',emerald:'Smaragdschliff'};
export const metals={yellow:['Gelbgold',0xf8d17c],white:['Weißgold',0xe2e4e8],rose:['Roségold',0xdca18a],platinum:['Platin',0xcdd1d8]};
export const defaults=()=>({style:'solitaire',cut:'round',metal:'yellow',alloy:'585',carat:1,width:2.2,size:54,prongs:4,engraving:''});
const clamp=(n,min,max,step,fallback)=>typeof n==='number'&&Number.isFinite(n)?Number((Math.round(Math.min(max,Math.max(min,n))/step)*step).toFixed(2)):fallback;
export function validateConfig(raw={}) {
  if(!raw||typeof raw!=='object')raw={};
  const v=defaults();
  for(const [key,values] of Object.entries({style:styles,cut:cuts,metal:metals}))if(Object.hasOwn(values,raw[key]))v[key]=raw[key];
  v.alloy=v.metal==='platinum'?'950':raw.alloy==='750'?'750':'585';
  v.carat=clamp(raw.carat,.3,2,.05,1);v.width=clamp(raw.width,1.8,3,.1,2.2);v.size=clamp(raw.size,44,70,1,54);
  v.prongs=raw.prongs===6&&v.cut!=='emerald'?6:4;
  v.engraving=typeof raw.engraving==='string'?Array.from(raw.engraving).slice(0,24).join(''):'';
  return v;
}
export const encodeConfig=s=>btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(s)))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
export function decodeConfig(code){try{return validateConfig(JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(code.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0)))));}catch{return defaults();}}
