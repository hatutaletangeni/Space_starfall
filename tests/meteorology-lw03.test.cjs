'use strict';
const assert=require('node:assert/strict');
global.StarfallCompositionCW01=require('../src/physics/celestial-composition-cw01.js');
global.StarfallStableTerrain=require('../src/terrain/stable-surface.js');
global.StarfallFieldScience=require('../src/physics/science-field.js');
const W=global.StarfallMeteorologyLW03=require('../src/physics/meteorology-lw03.js');
const EV=require('../src/events/events.js');
const {generateGalaxy}=require('../src/galaxy.js');
const galaxy=generateGalaxy(742,64);
assert.equal(galaxy.systems.length,2368);
const find=type=>galaxy.allWorlds.find(b=>b.kind==='planet'&&b.type===type);
const ocean=find('Ocean'),desert=find('Desert'),ice=find('Ice'),moon=galaxy.allWorlds.find(b=>b.kind==='moon'&&b.landable);
assert.ok(ocean&&desert&&ice&&moon,'expected representative seeded bodies');
const d=[.42,.64,.65],time=23456;
for(const body of [ocean,desert,ice,moon]){
 const climate=W.base(body,742),a=W.cell(body,d,time,742),b=W.cell(body,d,time,742);
 assert.deepEqual(a,b);assert.equal(a.bodyId,body.id);
 assert.ok(Number.isFinite(a.temperatureK)&&a.temperatureK>0);
 assert.ok(a.visibility>0&&a.visibility<=1&&a.solarFactor>0&&a.solarFactor<=1);
 assert.ok(a.precipitationKgM2S>=0&&a.windMS>=0);
 assert.ok(a.precipitationKgM2S*W.STEP<=climate.pressurePa/Math.max(.12,climate.gravityMS2)*1.01);
 assert.ok(a.cloudFraction>=0&&a.cloudFraction<=1);
 const ev=EV.meteorologicalEvent(body,d,time,742);
 if(ev)assert.equal(ev.bodyId,body.id);
 if(climate.vacuum){assert.equal(a.regime,'vacuum');assert.equal(a.precipitationKgM2S,0);assert.equal(a.charge,0);assert.equal(ev,null);}
}
assert.equal(W.base(moon,742).vacuum,true);
assert.notEqual(W.saturation('H2O',270),W.saturation('H2O',310));
assert.ok(W.saturation('H2O',310)>W.saturation('H2O',270));
assert.equal(W.reservoir({type:'Desert'}, {temperatureK:500,mixture:{CO2:1}}),null);
assert.equal(W.reservoir({type:'Ice'}, {temperatureK:110,mixture:{CH4:.08}}),'CH4');
assert.equal(W.reservoir({type:'Temperate'}, {temperatureK:285,mixture:{CH4:.1}}),'H2O');
const oldMoon=JSON.stringify(moon);
for(let i=0;i<20;i++)W.cell(moon,d,time+i*10,742);
assert.equal(JSON.stringify(moon),oldMoon,'weather may not modify existing body identities');
assert.throws(()=>W.cell(ocean,d,-1,742));
// Verify that a real seeded Ocean-world weather front has a single event and
// instrument source; do not create test-only bodies or fake storms.
let wet=null;
for(let i=0;i<120&&!wet;i++){
 const d=[.8*Math.cos(i*.43),.6*Math.sin(i*.17),.8*Math.sin(i*.43)],t=330*i;
 const w=W.cell(ocean,d,t,742);
 if(w.precipitationKgM2S>1e-9)wet={d,t,w};
}
assert.ok(wet,'actual seed-742 Ocean world must have a possible rain event');
const event=EV.meteorologicalEvent(ocean,wet.d,wet.t,742);
assert.ok(event&&['rain','electrical','snow'].includes(event.kind));
assert.equal(event.sourceSpecies,wet.w.sourceSpecies);
assert.equal(event.precipitationKgM2S,wet.w.precipitationKgM2S);
assert.deepEqual(event,EV.meteorologicalEvent(ocean,wet.d,wet.t,742));
const truth=global.StarfallFieldScience.localTruth(ocean,742,wet.d,wet.t);
assert.ok(truth.temperatureK>=wet.w.temperatureK&&truth.temperatureK<=wet.w.temperatureK+91);
assert.ok(EV.skyTransmission(ocean,wet.d,wet.t,742)<=wet.w.solarFactor+1e-12);
console.log('LW03 2368 systems; rain/ice/vacuum model; mass cap; deterministic weather and journal PASS');

