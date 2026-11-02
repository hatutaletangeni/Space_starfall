'use strict';
const assert=require('node:assert/strict');
const O=require('../src/physics/outposts.js');
const T04=require('../src/physics/antenna-hardware-t04.js');
require('../src/physics/power-ledger-t02.js');
const body={id:'star-0-p0',systemId:'star-0',kind:'planet',type:'Temperate',landable:true,
 position:[0,0,0],radius:2150,spinAxis:[0,1,0],spinAngle:0,spinPeriod:500,orbitPeriod:4000,
 atmosphere:'thin'};
const root=[0,1,0],fwd=[1,0,0],at=d=>O.offset(root,fwd,d,0,body.radius);
const store=new O.Store(742),add=(kind,d)=>store.add(kind,body,at(d),fwd,()=>0).item;
const solar=add('solar',0),battery=add('battery',14),tower=add('antenna',28),lab=add('lab',42);
store.link(solar.id,battery.id,body);store.link(battery.id,tower.id,body);store.link(tower.id,lab.id,body);
const before=store.items.find(x=>x.id===battery.id).energyJ;
const star=[0,1e7,0],luminosity=4*Math.PI*(1e7)**2*1000;
const power=store.power(body,star,luminosity,5,5,1);
assert(power.byId[tower.id].power,'wired tower receives actual 48V power');
assert(power.byId[tower.id].busId===power.byId[lab.id].busId);
const towerItem=()=>store.items.find(x=>x.id===tower.id);
const s=()=>T04.station(towerItem(),body,power,O.rotate);
assert(s()?.powered);
assert.equal(s().mode,'omni','legacy tower defaults to omni');
assert.equal(s().rangeScene,O.SPECS.antenna.rangeScene);
const pos=(local,e)=>O.V.add(body.position,O.V.mul(local,body.radius+e));
const ship={id:'starfall-ship',kind:'ship-radio',bodyId:body.id,position:pos(at(0),12),
 rangeScene:45,bandwidthBps:128000,txPowerW:60,powered:true};
const rover={id:'probe',kind:'rover-radio',bodyId:body.id,position:pos(at(68),3),
 rangeScene:45,bandwidthBps:48000,txPowerW:34,powered:true};
const direct=T04.link(ship,rover,body,O.radioLink,O.rotate,1000);
assert(!direct.connected,'rover/ship omni mast too far for direct radio');
const routes=T04.candidates(ship,rover,[s()],body,O.radioLink,O.rotate,1000);
assert(routes.length>0,'powered real tower should bridge ship to remote mast');
assert.deepEqual(routes[0].hops,[ship.id,tower.id,rover.id]);
assert.equal(routes[0].hopReports.length,2);
assert(routes[0].bandwidthBps>0&&routes[0].quality>0);
assert(routes[0].hopReports.every(x=>x.distanceM>0&&x.delayS>0));
const baseW=power.byId[tower.id].servedW;
assert.equal(baseW,O.SPECS.antenna.watts);
store.configureRadio(tower.id,{mode:'fixed',boresightLocal:[0,1,0]});
assert.equal(T04.candidates(ship,rover,[s()],body,O.radioLink,O.rotate,1000).length,0,
 'dish pointed away must actually block both-hop route');
store.configureRadio(tower.id,{mode:'tracking',targetId:ship.id});
const grid2=store.power(body,star,luminosity,10,5,1);
assert.equal(grid2.byId[tower.id].servedW,baseW+T04.TRACK_W,'tracking motor draws real extra DC watts');
assert.equal(T04.candidates(ship,rover,[T04.station(towerItem(),body,grid2,O.rotate)],body,O.radioLink,O.rotate,1000).length,0,
 'single target cannot magically track two different peers');
store.configureRadio(tower.id,{mode:'omni',targetId:''});
const grid3=store.power(body,star,luminosity,15,5,1);
assert.equal(grid3.byId[tower.id].servedW,baseW);
store.configureRadio(tower.id,{radioEnabled:false});
const gridStandby=store.power(body,star,luminosity,20,5,1);
assert.equal(gridStandby.byId[tower.id].servedW,12,'RF-off standby saves real joules');
assert(!T04.station(towerItem(),body,gridStandby,O.rotate).powered);
store.configureRadio(tower.id,{radioEnabled:true});
store.unlink(battery.id,tower.id);
const unplugged=store.power(body,star,luminosity,25,0,1);
assert.equal(unplugged.byId[tower.id].power,false);
assert.equal(T04.candidates(ship,rover,[T04.station(towerItem(),body,unplugged,O.rotate)],body,O.radioLink,O.rotate,1000).length,0);
store.link(battery.id,tower.id,body);
const restoredGrid=store.power(body,star,luminosity,30,0,1);
assert(T04.station(towerItem(),body,restoredGrid,O.rotate).powered);
const labNode={id:lab.id,kind:'wired-lab-port',bodyId:body.id,position:pos(at(42),4),
 powered:true,busId:restoredGrid.byId[lab.id].busId,rangeScene:0,bandwidthBps:1e6};
assert(T04.link(T04.station(towerItem(),body,restoredGrid,O.rotate),labNode,body,O.radioLink,O.rotate,1000).connected);
assert.equal(T04.link(T04.station(towerItem(),body,restoredGrid,O.rotate),{...labNode,busId:'unplugged'},body,O.radioLink,O.rotate,1000).connected,false);
const satellite={id:'relay-real',kind:'orbital-radio',bodyId:body.id,position:pos(at(30),180),
 powered:true,rangeScene:180000,bandwidthBps:1000000,txPowerW:125};
const orbitRoute=T04.candidates(ship,rover,[satellite],body,O.radioLink,O.rotate,1000);
assert.deepEqual(orbitRoute[0].hops,[ship.id,satellite.id,rover.id]);
assert.equal(T04.candidates(ship,rover,[{...satellite,powered:false,reason:'BATTERY_EMPTY'}],body,O.radioLink,O.rotate,1000).length,0);
const packets=[{id:'abc',route:[ship.id,tower.id,rover.id],encodedBytes:120000,state:'TRANSMITTING'},
{id:'done',route:[ship.id,tower.id,rover.id],encodedBytes:120000,state:'ACKED'}];
assert.equal(T04.bufferLoad(packets,tower.id),120000);
assert.equal(T04.bufferLoad(packets,ship.id),0);
const diagnostics=T04.diagnostics(towerItem(),body,restoredGrid,packets,O.rotate,30);
assert.equal(diagnostics.bufferUsedBytes,120000);
assert.equal(diagnostics.packetsAwaitingACK,1);
const json=store.serialize(),migrated=new O.Store(742,json);
assert.equal(migrated.items.find(x=>x.id===tower.id).radioT04.mode,'omni');
const legacy=json;delete legacy.items.find(x=>x.id===tower.id).radioT04;
const older=new O.Store(742,legacy);
assert.equal(T04.repair(older.items.find(x=>x.id===tower.id).radioT04).mode,'omni','old saves remain usable');
const ref={schema:1,mode:'omni',inbox:[{packetId:'p',observationId:'obs',sourceId:'rover',bytes:1024,receivedAtS:11},
 {packetId:'p',observationId:'obs',sourceId:'rover',bytes:1024,receivedAtS:11}]};
assert.equal(T04.repair(ref).inbox.length,1,'idempotent tower custody records');
assert.throws(()=>store.link(solar.id,{bodyId:'elsewhere'},body),/same body|Connect two modules/);
assert(store.items.every(x=>x.energyJ>=0),'no phantom negative battery');
console.log('PASS T04 model: real 48V tower, hop budgets, off-axis pointing, powered tracking watts, no DC link, real orbit relay LOS, lab socket, finite custody and old-save migration');
