'use strict';
const assert=require('node:assert/strict');
const V={
 add:(a,b)=>a.map((x,i)=>x+b[i]),sub:(a,b)=>a.map((x,i)=>x-b[i]),
 mul:(a,k)=>a.map(x=>x*k),dot:(a,b)=>a.reduce((x,y,i)=>x+y*b[i],0),
 cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
 norm:a=>{const l=Math.hypot(...a)||1;return a.map(x=>x/l);},
 rot:(a,axis,angle)=>{const u=V.norm(axis),c=Math.cos(angle),s=Math.sin(angle);
  return V.add(V.add(V.mul(a,c),V.mul(V.cross(u,a),s)),V.mul(u,V.dot(u,a)*(1-c)));}
};
const hash=s=>{let h=2166136261;for(const ch of String(s))h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0;};
global.StarfallFieldScience={hash,rand:s=>hash(s)/4294967296,
 profile:()=>({temperatureK:287,pressurePa:100000,waterIcePotential:.85})};
global.StarfallCompositionCW01={bodyFor:()=>({atmosphereMoleFractions:{O2:.20,N2:.79,CO2:.01}})};
global.Starfall3D={V,sampleTerrain:(body,dir)=>({height:body.type==='Ocean'?0:20,field:.83})};
require('../src/terrain/stable-surface.js');require('../src/terrain/biomes.js');
const original=require('../src/ecology/ecology.js');
global.StarfallEcology={...original,nearby:()=>[]}; // explicitly NO 9A survey sites
require('../src/ecology/living-biosphere.js');
require('../src/ecology/locomotion9d.js');require('../src/ecology/flight-dynamics9c.js');
require('../src/ecology/biome-wildlife9f.js');
global.SF={load:()=>({}),save:()=>{}};
const elements=new Map();global.document={getElementById(id){
 if(!elements.has(id))elements.set(id,{style:{},hidden:true,addEventListener(){},value:'',
  replaceChildren(){},querySelectorAll(){return []},append(){}});
 return elements.get(id);
}};
const local=[0,1,0];
let body={id:'9f-forest',kind:'planet',type:'Lush',radius:1500,
 landable:true,life:true,seed:59,atmosphere:'dense',position:[0,0,0],
 spinAxis:[0,1,0],spinAngle:0,orbitRadius:100000,systemId:'test-star'};
global.StarfallRuntime={time:0,galaxy:{seed:742,byId:new Map()},interiorState:null,
 outpostContext:()=>({body,local,landed:true,eva:true,roverOccupied:false})};
global.StarfallPhysics={bodyProfile:()=>({surfaceGravityMS2:9.81})};
require('../src/ecology/ecology-ui.js');
const UI=global.StarfallEcologyUI;
const first=UI.scene();
assert(first.length>0,'wildlife renders when ecology survey site list is completely empty');
assert(first.every(x=>x.encounterOnly),'ambient encounters are identified separately from resource-backed 9A agents');
assert(first.length<=18,'existing renderer cap respected');
assert(first.some(x=>['grazer','crawler','burrower','stalker','flier','aurora'].includes(x.kind)),
 'land biomes contain moving animal classes');
const last=new Map(first.map(x=>[x.id,x.position.slice()]));
let movement=0,animated=0;
for(let k=1;k<=22;k++){
 global.StarfallRuntime.time=k*.16;
 for(const a of UI.scene()){
  if(!last.has(a.id))continue;
  const d=Math.hypot(...V.sub(a.position,last.get(a.id)));
  if(d>.025)movement++;
  if((a.gaitPhase||0)>0||(a.wingPhase||0)>0)animated++;
 }
}
assert(movement>5,'creatures must change real world coordinates across multiple frames');
assert(animated>5,'creatures must use locomotion and wing animation uniforms');
assert(UI.livingPatches.length===0,'ambient-only animals do not create phantom 9A inventories');
body={...body,id:'9f-sea',type:'Ocean'};global.StarfallRuntime.time=15;
const wet=UI.scene();
assert(wet.length>0&&wet.every(x=>['jelly','eel'].includes(x.kind)), 'ocean only swims aquatic wildlife');
body={...body,id:'9f-sterile',life:false};global.StarfallRuntime.time=16;
assert.deepEqual(UI.scene(),[],'sterile world must remain truly lifeless');
console.log('PASS 9F actual scene: biome-wide land and ocean encounters beyond survey sites, walking/flight, sterile gate, finite 9A stock');
