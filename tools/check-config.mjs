import assert from 'node:assert/strict';
import { defaults, validateConfig, encodeConfig, decodeConfig } from '../assets/engagement-state.js';
const customized={style:'halo',cut:'oval',metal:'rose',alloy:'750',carat:1.25,width:2.5,size:58,prongs:6,engraving:'Für immer · A & M ♥',stone:'sapphire',grade:'excellent',head:'white'};
assert.deepEqual(decodeConfig(encodeConfig(customized)),customized,'Unicode share-link round trip');
for(const bad of ['', '#bad', '////', btoa('null'),btoa('{"metal":"__proto__","cut":"constructor"}')])assert.deepEqual(decodeConfig(bad),defaults());
assert.equal(validateConfig({...customized,cut:'emerald'}).prongs,4);
assert.equal(validateConfig({...customized,metal:'platinum'}).alloy,'950');
assert.equal(validateConfig({...customized,alloy:'950'}).alloy,'585');
assert.equal(validateConfig({size:1000,carat:-5,width:2.27}).size,70);
assert.equal(validateConfig({size:1000,carat:-5,width:2.27}).carat,.3);
assert.equal(validateConfig({width:2.27}).width,2.3);
assert.deepEqual(validateConfig({size:NaN,carat:null,width:'not a number'}),defaults());
assert.equal(Array.from(validateConfig({engraving:'♥'.repeat(40)}).engraving).length,24);
// New options: settings, cuts, stone kind, grade, head metal; old links without them stay valid.
for(const style of ['zarge','trilogie','twist'])assert.equal(validateConfig({style}).style,style);
for(const cut of ['princess','cushion','radiant']){assert.equal(validateConfig({cut}).cut,cut);assert.equal(validateConfig({cut,prongs:6}).prongs,4,cut+' is four-prong only');}
assert.equal(validateConfig({cut:'oval',prongs:6}).prongs,6);
for(const stone of ['diamond','lab','sapphire','ruby','smaragd'])assert.equal(validateConfig({stone}).stone,stone);
assert.equal(validateConfig({stone:'glass'}).stone,'diamond');assert.equal(validateConfig({grade:'flawless'}).grade,'veryGood');
assert.equal(validateConfig({metal:'white',head:'white'}).head,'same','head equal to shank collapses to same');
assert.equal(validateConfig({metal:'yellow',head:'platinum'}).head,'platinum');
const legacy=encodeConfig({style:'pave',cut:'round',metal:'yellow',alloy:'585',carat:1,width:2.2,size:54,prongs:4,engraving:''});
assert.deepEqual(decodeConfig(legacy),{...defaults(),style:'pave'},'links from before the new options still open');
console.log('CONFIG_OK: round trip, malformed links, limits, alloy and setting constraints, new settings/cuts/stones/head metal, legacy links');
