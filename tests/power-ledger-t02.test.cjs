'use strict';
/* STARFALL T02 — watt/J conservation, source provenance, grid outages,
 * battery clipping, switches, same-body wiring, save/reload and fuel-source labels.
 */
const assert=require('node:assert/strict');
require('../src/physics/outposts.js');
const O=globalThis.StarfallOutposts;
const L=require('../src/physics/power-ledger-t02.js');
const V=require('../src/physics/power.js');
const body={id:'star-0-p0',systemId:'star-0',kind:'planet',type:'Temperate',landable:true,atmosphere:'Thin, O₂, N₂',
 radius:2150,position:[0,0,0],spinAxis:[0,1,0],spinAngle:0,spinPeriod:300};
const sun=[0,10000000,0],night=[0,-10000000,0],power=4*Math.PI*(10000000)**2*1200;
const radial=a=>[Math.sin(a),Math.cos(a),0];
function make(){const st=new O.Store(742);const add=(kind,a)=>st.add(kind,body,radial(a),[0,0,1],()=>0).item.id;
 const solar=add('solar',0),battery=add('battery',.013),connector=add('connector',.026),antenna=add('antenna',.039),lab=add('lab',.052);
 st.link(solar,battery,body);st.link(battery,connector,body);st.link(connector,antenna,body);st.link(antenna,lab,body);
 return{st,solar,battery,connector,antenna,lab};
}
const {st,solar,battery,connector,antenna,lab}=make();
const store=id=>st.items.find(x=>x.id===id);
const before=store(battery).energyJ;
const r=st.power(body,sun,power,0,10,1,[],()=>1);
assert.equal(r.schema,1);assert(r.byId[antenna].power,'wired antenna powered by real sources');
assert(r.byId[antenna].sourceIds.includes(solar),'antenna provenance names actual solar asset');
assert(Math.abs(r.byId[antenna].sourceWatts[solar]-r.byId[antenna].servedW)<1e-3,'metered photovoltaic contribution equals powered antenna watts');
assert.equal(r.byId[solar].generatedW,4000);
assert(r.byId[antenna].servedW>0&&r.byId[lab].servedW>0);
assert.equal(r.byId[antenna].busId,r.byId[battery].busId);
assert(store(battery).energyJ>before,'excess daytime solar charges real battery');
assert(r.currentA>0&&r.currentA<=500);
assert(r.chargedJ>0&&r.dischargedJ===0);
assert(r.lossJ>=0&&r.wireLossW>0);
// Verify exact bus joule balance including curtailment: no credited energy from nowhere.
const usedSolarJ=r.generationW*10;const spentLoadJ=r.servedW*10+r.wireLossW*10;
const actualCharge=store(battery).energyJ-before;
assert(Math.abs(actualCharge-r.chargedJ)<1e-6);
assert(spentLoadJ+actualCharge/L.ETA_CHARGE<=usedSolarJ+1e-6);
// Solar physically dark, battery supplies; source provenance changes.
const dark=st.power(body,night,power,10,10,1,[],()=>1);
assert.equal(dark.byId[solar].generatedW,0);assert(dark.byId[antenna].power);
assert(dark.byId[antenna].sourceIds.includes(battery));
assert(Math.abs(dark.byId[antenna].sourceWatts[battery]-dark.byId[antenna].servedW)<1e-3,'nighttime real battery source contributes radio watts');
assert(dark.dischargedJ>0);
const eBefore=store(battery).energyJ;
assert(Math.abs(store(battery).energyJ - (before+r.chargedJ-dark.dischargedJ))<1e-5);
const raw=st.serialize(),saved=new O.Store(742,raw);assert.equal(saved.items.length,st.items.length);
assert.equal(saved.items.find(x=>x.id===battery).energyJ,store(battery).energyJ);
const next=st.power(body,night,power,20,5,1,[],()=>1);
const reload=saved.power(body,night,power,20,5,1,[],()=>1);
assert.deepEqual(next.byId[antenna],reload.byId[antenna],'source report replay stable across save');
assert.equal(store(battery).energyJ,saved.items.find(x=>x.id===battery).energyJ);
// Cut the real connector: electrical circuit splits, no phantom supply to antenna/lab.
st.setEnabled(connector,false);const isolated=st.power(body,night,power,25,0,1,[],()=>1);
assert.equal(isolated.byId[antenna].power,false);
assert.match(isolated.byId[antenna].fault,/NO_SUPPLY/);
assert.notEqual(isolated.byId[antenna].busId,isolated.byId[battery].busId);
st.setEnabled(connector,true);assert(st.power(body,night,power,25,0,1,[],()=>1).byId[antenna].power);
// No solar at night + exhausted battery => explicit radio outage.
store(battery).energyJ=0;const blackout=st.power(body,night,power,30,10,1,[],()=>1);
assert.equal(blackout.byId[antenna].power,false);
assert(blackout.shed.includes(antenna));assert.equal(blackout.generationW,0);
for(const it of st.items)assert(it.energyJ>=0&&it.energyJ<=O.SPECS[it.kind].capacityJ+1e-7);
// Separation: invalid cross-world power wiring rejected.
const other={...body,id:'star-0-p1'};const detached=st.add('solar',other,[0,1,0],[0,0,1],()=>0).item;
assert.throws(()=>st.link(antenna,detached.id,body),/same body/);
// Real charging has physical draw and loss; hard cutoff at 7.5 kW for 60 s.
const transfer=L.transfer({id:'battery',energyJ:1000000,capacityJ:1000000},{id:'truck',energyJ:0,capacityJ:44e6},1e7,
 {efficiency:.9,maxSourceJ:450000,maxPowerW:7500,seconds:60});
assert.equal(transfer.drawnJ,450000);assert.equal(transfer.deliveredJ,405000);
assert.equal(transfer.lossJ,45000);assert.equal(transfer.fromEnergyJ+transfer.toEnergyJ+transfer.lossJ,1000000);
assert.throws(()=>L.transfer({id:'a',energyJ:-1,capacityJ:10},{id:'b',energyJ:0,capacityJ:10},1),/invalid/i);
assert.throws(()=>L.transfer({id:'a',energyJ:4,capacityJ:10},{id:'a',energyJ:0,capacityJ:10},1),/distinct/);
// Disconnected solar-only bus cannot power a radio at night or provide free energy.
const solo=new O.Store(99);solo.add('solar',body,[0,1,0],[0,0,1],()=>0);const solorep=solo.power(body,night,power,3,100,1);
assert.equal(solorep.generationW,0);assert.equal(solorep.servedW,0);
// Underlying vehicle generator finite, expressly fictional: no false fuel claim.
const vehicle=V.generation({maxSolarW:100,solarAreaM2:1,solarEfficiency:.2,generatorW:4200},{distanceM:1e8,luminosityW:1e19,incidence:1,transmission:1});
assert.equal(vehicle.generatorW,4200);assert.match(vehicle.generatorModel,/FICTIONAL/);
console.log('PASS T02 model: daylight solar→battery→antenna, night battery draw, finite bus, connector isolation, blackout, reload, real charge loss, zero free energy and fictional source labeling');
