/** Original Damla configuration model. Catalog facts audited against the public reference. */
export const STEPS = ['Profile','Maße','Edelmetall','Steinbesatz','Fugen / Stufen','Gravur'];
export const METALS = {
 white:{label:'Weißgold',color:0xe5e4e0,grades:[333,375,585,750],density:14.1},
 red:{label:'Rotgold',color:0xe6ad91,grades:[333,375,585,750],density:13.8},
 yellow:{label:'Gelbgold',color:0xf6d69c,grades:[333,375,585,750,900,916],density:13.5},
 palladium:{label:'Palladium',color:0xc5c7ca,grades:[500,950],density:11.8},
 gray:{label:'Graugold',color:0xbfc0ba,grades:[585,750],density:14.3},
 champagne:{label:'Champagnergold',color:0xd5c5aa,grades:[585,750],density:14.0},
 honey:{label:'Honiggold',color:0xeac285,grades:[585,750],density:14.2},
 platinum:{label:'Platin',color:0xd8dadd,grades:[600,950],density:20.1},
 silver:{label:'Silber',color:0xf1f1ed,grades:[925],density:10.4}
};
export const FINISHES = {
 'polished':'Poliert','vertical-brushed':'Quermatt','horizontal-matte':'Längsmatt',
 'diagonal-matte':'Schrägmatt','ice-matte':'Eismatt','sandmatte-fine':'Sandmatt fein',
 'starbrush':'Sternmatt','hammered-matte':'Hammerschlag matt','hammered-big':'Hammerschlag grob',
 'tree-bark':'Baumrinde','horizontal-diamond-coated':'Längsdiamantiert',
 'diagonal-diamond-coated':'Schrägdiamantiert','cross-matte':'Kreuzmatt'
};
export const PRESETS = {
 none:'Ohne Steine',bezel:'Eingerieben',section:'Verschnitt',channel:'Kanal','cross-channel':'Kanal quer',
 'side-bezel':'Seitlich eingerieben','side-section':'Seitlicher Verschnitt','side-channel':'Seitlicher Kanal',
 free:'Freie Steine','clamping-open':'Spannringoptik',combined:'Kombifassung',
 memoire2:'Kranzfassung Steg',memoire3:'Kranzfassung Pavé',memoire4:'Kranzfassung Twin',top:'Aufsatzfassung'
};
export const CUTS={brilliant:'Brillant',princess:'Princess',cushion:'Cushion',radiant:'Radiant',oval:'Oval'};
export const QUALITIES={
 'tw/if':'Diamant TW / IF','tw/vsi':'Diamant TW / VSI',black:'Schwarz',blue:'Blau',green:'Grün',yellow:'Gelb',brown:'Braun',rubin:'Rubin',saphir:'Saphir','lab-grown/F/VS':'Lab Grown F / VS'
};
export const GEM_COLORS={black:0x191a21,blue:0x579de2,green:0x45a474,yellow:0xffd159,brown:0xa97148,rubin:0xc32a4a,saphir:0x244daa};
export const GROOVES={
 none:{label:'Ohne Fuge',widths:[]},'v-groove-60':{label:'V-Fuge 60°',widths:[.3,.65,1]},
 'u-groove':{label:'U-Fuge',widths:[.4,.6,.8,1,1.5,1.8]},
 'square-groove':{label:'Eckige Fuge',widths:[.4,.6,.8,1,1.5,2]},
 'facet-groove':{label:'Facettierte Fuge',widths:[.4,.6,.8,1,1.5,2]},
 'raised-groove':{label:'Bombierte Fuge',widths:[.2,.4,.6,.8,1,1.5,2]},
 perlage:{label:'Perlfuge',widths:[.7,.9]}
};
export const FONTS={
 amazonebt:{label:'Amazone',css:'"Amazone BT", "URW Chancery L", cursive'},
 arial:{label:'Arial',css:'Arial, sans-serif'},
 monotypeCorsiva:{label:'Monotype Corsiva',css:'"Monotype Corsiva", "Brush Script MT", cursive'},
 TimesNewRoman:{label:'Times New Roman',css:'"Times New Roman", serif'},
 LucidaCalligraphy:{label:'Lucida Calligraphy',css:'"Lucida Calligraphy", "Segoe Script", cursive'}
};
export const engravingFont=e=>FONTS[e.font]?.css||(e.font==='palscri'?'"Monotype Corsiva", "Brush Script MT", cursive':'Arial, sans-serif');
export const ENGRAVINGS={none:'Ohne Gravur',laser:'Lasergravur',diamond:'Diamantgravur',individual:'Eigene Handschrift / Motiv'};
export const SYMBOLS={infinity:'∞',heart:'♥','2hearts':'♡♥','2rings':'⚭'};
export const ORIENTATIONS={left:'Links',center:'Mittig',right:'Rechts',free:'Frei positionieren'};
export const EDGE_TYPES={none:'Ohne Stufe',left:'Links',right:'Rechts',both:'Beidseitig'};
export const SPREADING={continuous:'Zusammenhängend',uniform:'Gleichmäßig verteilt',grouped:'Gruppiert'};
export const clone=value=>structuredClone(value);
export const number=(v,min,max,step=1)=>Math.round(Math.max(min,Math.min(max,Number.isFinite(Number(v))?Number(v):min))/step)*step;
export const mm=v=>Number(v).toLocaleString('de-DE',{maximumFractionDigits:2})+' mm';
export const label=(map,id)=>map[id]?.label||map[id]||id;
export const divisionLabel=d=>d.id==='memoire'?'Kranzaufteilung · '+d.rates.map(mm).join(' / '):d.id==='none'?'Einfarbig':(d.type==='wave'?'Welle ':d.type==='diagonal'?'Diagonal ':d.type==='horizontal'?'Innen / außen ':'')+d.rates.join(' : ');
export const defaults=()=>({
 profile:'PB04',width:3.5,height:1.2,size:54,division:'none',surfaceDivision:'none',cycles:2,
 metals:[{color:'yellow',grade:585,finish:'polished'},{color:'white',grade:585,finish:'polished'},{color:'red',grade:585,finish:'polished'}],
 stone:{preset:'none',cut:'brilliant',quality:'tw/vsi',size:'brilliant-100-0',quantity:1,memoireQuantity:'ringDependent50',rows:1,orientation:'center',position:0,spreading:'together',offset:0,secondaryQuality:'tw/vsi',secondarySize:'brilliant-100-0',secondaryQuantity:2,secondarySetting:'section',bothSides:false,mounting:'round4',mountingMetal:'585-white',setting:'rubbed',free:[]},
 groove:{form:'none',width:.3,quantity:0,positions:[0],surface:'polished',color:'none',angle:0},
 edge:{type:'none',leftWidth:.5,rightWidth:.5,leftSurface:'polished',rightSurface:'polished'},
 separation:{width:.4,color:'none',surface:'polished'},separations:[],engraving:{type:'none',font:'arial',text:'',art:null}
});
export const initialState=()=>({version:3,active:1,pair:false,rings:[{...defaults(),size:62},{...defaults(),stone:{...defaults().stone,preset:'bezel'}}]});
