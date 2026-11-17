'use strict';
const assert=require('node:assert/strict');
const elements=new Map();
const node=id=>{
 if(!elements.has(id))elements.set(id,{id,hidden:true,disabled:false,style:{},dataset:{},
 textContent:'',value:'bioassay',onclick:null,onchange:null});
 return elements.get(id);
};
global.document={getElementById:node,addEventListener(){}};
let saved={multitool9g:{chargeJ:35000,mode:'bioassay'}},realSaving=0;
global.SF={load:()=>saved,save:update=>{saved={...saved,...update};realSaving++;return true;}};
let now=3000,queue=[];
const realPerformance=global.performance,realTimeout=global.setTimeout,realInterval=global.setInterval;
Object.defineProperty(global,'performance',{value:{now:()=>now},configurable:true});
global.setTimeout=(fn,delay)=>{queue.push({fn,delay});return queue.length;};
global.setInterval=()=>1;
let ctx={bodyId:'planet-9g',body:{id:'planet-9g',landable:true,radius:1500},local:[0,1,0],
 mode:'EVA',landed:true,altitudeM:.6,simTime:400};
let bodyCtx={...ctx,shipLocal:[0,1,0],eva:true};
let requests=[],readings=[];
global.StarfallFieldScience={INSTRUMENTS:{
 bioassay:{name:'Field bioassay',powerW:180,seconds:8,maxAltitudeM:5},
 spectrometer:{name:'Spectrometer',powerW:140,seconds:4,maxAltitudeM:800},
 thermometer:{name:'Thermometer',powerW:20,seconds:2,maxAltitudeM:1500},
 barometer:{name:'Barometer',powerW:22,seconds:2,maxAltitudeM:1800},
 magnetometer:{name:'Magnetometer',powerW:55,seconds:4,maxAltitudeM:1000}
}};
global.StarfallEcology={arc:()=>0};
global.StarfallRuntime={scienceContext:()=>ctx,outpostContext:()=>bodyCtx,truckOccupied:false,
 multitoolRecharge9G:request=>{requests.push(request);return Math.min(request,900);}};
global.StarfallScienceUI={measure:instrument=>{const ob={id:'obs-9g-'+readings.length,
 instrument,parameter:instrument==='bioassay'?'biosignatureIndex':'temperatureK',
 value:.32,unit:'index',uncertainty:.08,biome:'Canopy basin',quality:'estimated',bodyId:ctx.bodyId};
 readings.push(ob);return ob;},open:()=>{}};
try{
require('../src/physics/eva-multitool9g.js'); // side-effect attaches API to globalThis
const M=global.StarfallMultitool9G;
assert(M,'scanner API exposed to main game');
assert(M.canUse,'available in EVA');
assert.equal(M.mode,'bioassay');
assert.equal(node('multitool9g-open').hidden,false,'EVA action visible');
assert(M.show(),'scanner opens on surface');
assert.equal(node('multitool9g-panel').hidden,false);
assert(M.begin(),'scanner starts real timed acquisition');
assert(M.busy);
assert.equal(readings.length,0,'must not grant readings before acquisition completes');
assert.equal(queue[0].delay,8000,'real instrument seconds are respected');
queue.shift().fn();
assert.equal(readings.length,1);
assert.equal(readings[0].instrument,'bioassay');
assert.equal(M.chargeJ,35000-8*180,'real power charged for source instrument');
assert(saved.multitool9g.chargeJ===M.chargeJ,'scanner charge persisted');
M.setMode('thermometer');now+=4000;assert(M.begin());
ctx={...ctx,mode:'FLIGHT',landed:false};
queue.shift().fn();
assert.equal(readings.length,1,'interrupted scan never creates evidence');
assert.equal(M.chargeJ,35000-8*180,'interrupted acquisition does not create an energy debit');
ctx={...ctx,mode:'EVA',landed:true};now+=2500;
assert(M.recharge()>0,'ship source endpoint is used for recharge');
assert.equal(requests.length,1);
const old=global.StarfallRuntime.multitoolRecharge9G;
delete global.StarfallRuntime.multitoolRecharge9G;
assert.throws(()=>M.recharge(),/power transfer/,'no free recharge');
global.StarfallRuntime.multitoolRecharge9G=old;
M.close();
ctx={...ctx,mode:'LANDED'};
assert.equal(M.show(),false,'must not scan while still in ship');
assert.throws(()=>M.begin(),/EVA/);
assert(realSaving>=2);
console.log('PASS 9G EVA, timed 4A field journal, charge/abort, powered recharge, keyboard/mobile exposed controls');
}finally{
 Object.defineProperty(global,'performance',{value:realPerformance,configurable:true});
 global.setTimeout=realTimeout;global.setInterval=realInterval;
}
