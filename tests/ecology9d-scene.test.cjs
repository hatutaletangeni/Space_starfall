'use strict';
// Integration test of the ACTUAL ecology-ui scene adapter with 9A biology and
// 9C+9D locomotion, not a fixture replacing StarfallEcologyUI.scene().
const assert=require('node:assert/strict');
const v={
 add:(a,b)=>a.map((x,i)=>x+b[i]),sub:(a,b)=>a.map((x,i)=>x-b[i]),
 mul:(a,k)=>a.map(x=>x*k),dot:(a,b)=>a.reduce((x,y,i)=>x+y*b[i],0),
 cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
 norm:a=>{const l=Math.hypot(...a)||1;return a.map(x=>x/l);},
 rot:(a,axis,angle)=>{const u=v.norm(axis),c=Math.cos(angle),s=Math.sin(angle);return v.add(v.add(v.mul(a,c),v.mul(v.cross(u,a),s)),v.mul(u,v.dot(u,a)*(1-c)));}
};
const local=[0,1,0],planet={id:'planet-test',kind:'planet',type:'Lush',landable:true,
 life:true,radius:1500,seed:42,spinAxis:[0,1,0],spinAngle:0,orbitRadius:100000,systemId:'test-star'};
const sites=[
 {id:'eco-a1',bodyId:planet.id,kind:'flier',group:'fauna',local:[0,1,0],distance:0},
 {id:'eco-a2',bodyId:planet.id,kind:'crawler',group:'fauna',local:v.norm([.011,1,.008]),distance:20}
];
global.StarfallFieldScience={rand:()=>.68,profile:()=>({temperatureK:286,pressurePa:95000,waterIcePotential:.72})};
global.StarfallCompositionCW01={bodyFor:()=>({atmosphereMoleFractions:{O2:.20,N2:.79,CO2:.01}})};
global.StarfallBiomes={profile:()=>({moisture:.75}),classify:()=>({material:'soil',lifePotential:true})};
global.StarfallStableTerrain={normalize:v.norm};
global.Starfall3D={V:v,sampleTerrain:()=>({height:0,field:.5})};
global.StarfallPhysics={bodyProfile:()=>({surfaceGravityMS2:9.81})};
global.SF={load:()=>({}),save:()=>{}};
const els=new Map();
global.document={getElementById(id){
 if(!els.has(id))els.set(id,{id,style:{},hidden:true,addEventListener(){},value:'',replaceChildren(){},querySelectorAll(){return []}});
 return els.get(id);
}};
const basis=a=>{const up=v.norm(a),east=v.norm(v.cross([0,0,1],up)),north=v.norm(v.cross(up,east));return {up,east,north}};
global.StarfallEcology={
 basis,arc:(a,b,r)=>Math.acos(Math.max(-1,Math.min(1,v.dot(v.norm(a),v.norm(b)))))*r,
 offset:(a,x,z,r)=>{const b=basis(a);return v.norm(v.add(b.up,v.add(v.mul(b.east,x/r),v.mul(b.north,z/r))))},
 nearby:()=>sites, sanitizeRecords:()=>[],KINDS:{},climate:()=>({suitable:true,temperatureK:286,pressurePa:95000})
};
global.StarfallRuntime={time:0,galaxy:{seed:742,byId:new Map()},interiorState:null,
 outpostContext:()=>({body:planet,local,landed:true,eva:true,roverOccupied:false})};
require('../src/ecology/locomotion9d.js');
require('../src/ecology/flight-dynamics9c.js');
require('../src/ecology/living-biosphere.js');
require('../src/ecology/ecology-ui.js');
const UI=global.StarfallEcologyUI,first=UI.scene();
assert(first.some(a=>a.kind==='aurora'||a.kind==='flier'),'actual scene contains winged fauna');
assert(first.some(a=>a.kind==='burrower'),'actual scene spawns real soil decomposer');
assert(first.some(a=>a.kind==='grazer'||a.kind==='crawler'),'actual scene has walking life');
assert(first.some(a=>a.kind==='stalker'),'actual scene has predator');
const positions=new Map(first.filter(a=>a.alive&&a.id.startsWith('bio-')).map(a=>[a.id,a.position]));
let changed=0,animated=0;
for(let k=1;k<=16;k++){
 global.StarfallRuntime.time=k*.15;const frame=UI.scene();
 for(const a of frame){
  if(!positions.has(a.id)||a.kind==='aurora'||a.kind==='flier')continue;
  const d=Math.hypot(...v.sub(positions.get(a.id),a.position));
  if(d>.20)changed++;
  if(Number.isFinite(a.gaitPhase)&&a.gaitPhase>0)animated++;
 }
}
assert(changed>3,'actual field agents cannot remain static across gameplay frames');
assert(animated>4,'actual field agents have independently animated gaits');
assert(UI.livingPatches.some(p=>p.agents.some(a=>a.role==='detritivore')),'ecosystem persists decomposers');
console.log('PASS 9D full ecology scene: real population, ground movement, gait, predator and burrower, flier');
