import assert from 'node:assert/strict';
import { defaults, validateConfig, encodeConfig, decodeConfig, designCode, decodeDesignCode, cuts, stones, shanks, arrangements, settings } from '../assets/engagement-state.js';
const customized={...defaults(),arrangement:'halo',setting:'zarge',cut:'oval',metal:'rose',alloy:'750',carat:1.25,width:2.5,size:58.5,prongs:'6',engraving:'Für immer · A & M ♥',stone:'sapphire',color:'padparadscha',
  grade:'excellent',head:'white',finish:'ice-matte',shank:'verjuengt',profile:'flach',band:'halb',bandSetting:'kanal',accent:'ruby',accentSize:'kraeftig',milgrain:'milgrain',haloShape:'cushion',
  font:'script',engravingType:'diamond',special:'fingerprint',weddingBand:'pair',showBand:true,cert:'report',sizeUnknown:true};
assert.deepEqual(decodeConfig(encodeConfig(customized)),validateConfig(customized),'share-link round trip');
assert.equal(validateConfig(customized).color,'padparadscha');assert.equal(validateConfig(customized).haloShape,'cushion');
for(const bad of ['', '#bad', '////', btoa('null'),btoa('{"metal":"__proto__","cut":"constructor"}')])assert.deepEqual(decodeConfig(bad),defaults());
// Ranges.
assert.equal(validateConfig({size:1000}).size,75);assert.equal(validateConfig({size:54.3}).size,54.5);assert.equal(validateConfig({carat:-5}).carat,.1);
assert.equal(validateConfig({carat:.1,arrangement:'trilogie'}).carat,.3,'multi-stone designs start at 0.3 ct');assert.equal(validateConfig({carat:9}).carat,3);
assert.equal(validateConfig({width:1}).width,1.5);assert.equal(validateConfig({width:2.27}).width,2.3);
assert.deepEqual(validateConfig({size:NaN,carat:null,width:'not a number'}),defaults());
assert.equal(Array.from(validateConfig({engraving:'♥'.repeat(40)}).engraving).length,24);
// Catalogue.
assert.equal(Object.keys(cuts).length,12,'twelve stone shapes');assert.equal(Object.keys(stones).length,10);assert.equal(Object.keys(shanks).length,6);
for(const key of Object.keys(arrangements))assert.equal(validateConfig({arrangement:key}).arrangement,key);
for(const key of Object.keys(settings))assert.equal(validateConfig({setting:key}).setting,key);
// Combination rules.
assert.equal(validateConfig({cut:'princess',prongs:'6'}).prongs,'4','six claws only for round stones');
assert.equal(validateConfig({cut:'oldEuropean',prongs:'6'}).prongs,'6');
assert.equal(validateConfig({setting:'spann',arrangement:'halo'}).setting,'krappen','tension look only as a solitaire');
assert.equal(validateConfig({setting:'spann',cut:'pear'}).setting,'krappen');
assert.equal(validateConfig({setting:'spann',shank:'kathedrale'}).shank,'gerade');
assert.equal(validateConfig({setting:'halbzarge',arrangement:'halo'}).setting,'zarge');
assert.equal(validateConfig({gallery:'hiddenhalo',arrangement:'halo'}).gallery,'offen');
assert.equal(validateConfig({surprise:'ruby',setting:'zarge'}).surprise,'none');
assert.equal(validateConfig({height:'niedrig',carat:2}).height,'standard');
assert.equal(validateConfig({orient:'ew',cut:'round'}).orient,'ns');assert.equal(validateConfig({orient:'ew',cut:'marquise'}).orient,'ew');
assert.equal(validateConfig({shank:'twist',width:1.6}).width,2,'twist needs two strands of width');
assert.equal(validateConfig({shank:'twist',band:'halb'}).band,'glatt');
assert.equal(validateConfig({shank:'geteilt',band:'rundum'}).band,'schultern');
assert.equal(validateConfig({band:'halb',profile:'messerkante'}).profile,'bombiert');
assert.equal(validateConfig({band:'rundum',finish:'ice-matte'}).finish,'polished');
assert.equal(validateConfig({arrangement:'toietmoi',shank:'kathedrale'}).shank,'gerade');
assert.equal(validateConfig({stone:'lab'}).cert,'igi','synthetic diamonds default to IGI');
assert.equal(validateConfig({stone:'ruby',cert:'gia'}).cert,'advice','coloured stones get a gem report, not GIA');
assert.equal(validateConfig({stone:'sapphire'}).color,'blue');assert.equal(validateConfig({stone:'diamond',color:'blue'}).color,'');
assert.equal(validateConfig({metal:'white',head:'white'}).head,'same','head equal to shank collapses to same');
assert.equal(validateConfig({metal:'platinum',alloy:'585'}).alloy,'950');
assert.equal(validateConfig({secondStone:'own'}).secondStone,'same');
// Links from before the option overhaul keep their look.
const legacy=o=>decodeConfig(encodeConfig({style:'solitaire',cut:'round',metal:'yellow',alloy:'585',carat:1,width:2.2,size:54,prongs:4,engraving:'',...o}));
assert.deepEqual(legacy({style:'pave'}),{...defaults(),band:'schultern'});
assert.deepEqual(legacy({style:'halo',prongs:6}),{...defaults(),arrangement:'halo',prongs:'6'});
assert.deepEqual(legacy({style:'zarge'}),{...defaults(),setting:'zarge'});
assert.deepEqual(legacy({style:'trilogie'}),{...defaults(),arrangement:'trilogie',shank:'gerade'});
assert.deepEqual(legacy({style:'twist'}),{...defaults(),shank:'twist'});
assert.equal(legacy({stone:'lab',style:'solitaire'}).cert,'igi');
// Design codes: stable, checked, round trip without the engraving text.
const code=designCode(validateConfig(customized));assert.match(code,/^[0-9A-Z]{4}(-[0-9A-Z]{1,4})+$/);
assert.deepEqual(decodeDesignCode(code),{...validateConfig(customized),engraving:''});
assert.deepEqual(decodeDesignCode(designCode(defaults())),defaults());
assert.equal(decodeDesignCode(code.slice(0,-1)+(code.at(-1)==='0'?'1':'0')),null,'check character catches typos');
console.log('CONFIG_OK: round trip, ranges, catalogue, combination rules, legacy links, design codes ('+code+')');
