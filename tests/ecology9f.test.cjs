'use strict';
const assert=require('node:assert/strict');
global.StarfallFieldScience={hash:s=>{
 let h=2166136261;for(const x of String(s))h=Math.imul(h^x.charCodeAt(0),16777619);return h>>>0;
},rand:s=>{let h=2166136261;for(const x of String(s))h=Math.imul(h^x.charCodeAt(0),16777619);return(h>>>0)/4294967296;},
 profile:()=>({temperatureK:288,pressurePa:94000,waterIcePotential:.65})};
require('../src/terrain/stable-surface.js');
require('../src/terrain/biomes.js');
require('../src/ecology/ecology.js');
const Wild=require('../src/ecology/biome-wildlife9f.js');
const viewer=[0,1,0],land={
 id:'test-planet-9f',radius:1500,type:'Lush',kind:'planet',seed:59,
 landable:true,life:true,atmosphere:'thick'
};
const ocean={...land,id:'test-ocean-9f',type:'Ocean'};
const data={life:true,level:4,subsurface:false,pressurePa:95000,temperatureK:289,waterPotential:.8};
let terrainReads=0;
const terrain=(body,dir)=>{terrainReads++;return{height:body.type==='Ocean'?0:20,field:.84}};
const landA=Wild.nearby(land,viewer,terrain,data,742),landB=Wild.nearby(land,viewer,terrain,data,742);
assert.deepEqual(landA,landB,'same world and viewer must produce exactly the same seeded wildlife');
assert(landA.length>=3,'viable lush planet should have ambient wildlife without ecology sites');
assert(landA.length<=12,'bound active ambient creature count');
assert(landA.every(a=>a.id.startsWith('wild-')&&a.encounterOnly));
assert(landA.every(a=>!['filterer','aquatic_predator'].includes(a.role)),'no ocean animals on soil');
assert(landA.every(a=>a.material!=='water'&&a.distance<=220));
assert.equal(new Set(landA.map(a=>a.id)).size,landA.length,'unique encounter IDs');
const wet=Wild.nearby(ocean,viewer,terrain,data,742);
assert(wet.length>0,'water world has water-column wildlife');
assert(wet.every(a=>['filterer','aquatic_predator'].includes(a.role)),'aquatic biome roles only');
assert(wet.every(a=>a.material==='water'));
const before=terrainReads;
assert.deepEqual(Wild.nearby({...land,life:false},viewer,terrain,{...data,life:false},742),[]);
assert.deepEqual(Wild.nearby(land,viewer,terrain,{...data,level:0},742),[]);
assert.deepEqual(Wild.nearby(land,viewer,terrain,{...data,subsurface:true},742),[]);
assert.equal(terrainReads,before,'sterile world must not waste any sampling work');
const near=Wild.nearby(land,[.015,.99989,.0002],terrain,data,742);
assert(near.length>0,'moving viewer has live wildlife');
const initialCell=landA[0],same=Wild.cellPlan(land,global.StarfallEcology.cell(land,initialCell.local),terrain,742,data);
assert(same.some(a=>a.id===initialCell.id),'organism cell ID persists independently of player');
const nearFace=global.StarfallStableTerrain.normalize([.7071,.7071,0]);
assert.deepEqual(Wild.nearby(land,nearFace,terrain,data,742),Wild.nearby(land,nearFace,terrain,data,742),'cross-face seed stability');
for(let i=0;i<25;i++){
 const x=global.StarfallStableTerrain.normalize([Math.sin(i*.33),Math.cos(i*.33),.2]);
 const found=Wild.nearby(land,x,terrain,data,742,{max:9});
 assert(found.length<=9&&found.every(a=>Number.isFinite(a.distance)),'finite bounded streamed wildlife');
}
console.log('PASS 9F planet-fixed biome wildlife: stable IDs, land and water ecology, sterile gates, cell seams and 12-agent budget');
