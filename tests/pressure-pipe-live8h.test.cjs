'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('index.html'),flight=read('src/flight.js'),
 ui=read('src/physics/pressure-pipe-live-ui8h.js'),
 outpost=read('src/physics/outposts-ui.js'),
 gas=read('src/physics/pressure-gas-packets8h.js');
test('certified original pressure 8A packets and native 420W load are loaded before actual flight, real Engineer UI after',()=>{
 for(const f of ['pressure-pipe-power-port8h.js','pressure-gas-packets8h.js']){
  const tag='src/physics/'+f;
  assert.ok(html.includes(tag),'missing actual original model '+tag);
  assert.ok(html.indexOf(tag)<html.indexOf('src/flight.js'));
 }
 assert.ok(html.indexOf('src/physics/pressure-pipe-live-ui8h.js')>
  html.indexOf('src/flight.js'));
});
test('8H real native on-foot EVA pipe port installation only writes actual original 8A physical and native T02 owners atomically',()=>{
 const start=flight.indexOf('function logisticsPressureInstallPort8H('),
  end=flight.indexOf('function logisticsPressureStart8H(');
 assert.ok(start>0&&end>start);
 const s=flight.slice(start,end);
 for(const marker of [
  'ctx.onFoot','ctx.operatorLocal','StarfallPressurePipePowerPort8H.attach',
  'SF.storageStatus().durable','SF.save(patch)','const stored=SF.load()',
  'physical8a=StarfallPhysical8A.create','os.store.restore',
  'os.advancePowerTo(simTime)','outpost5:{...outpost,...q.outpost5}'])
  assert.ok(s.includes(marker),marker);
 assert.ok(s.indexOf('SF.save(patch)')<s.indexOf('physical8a=StarfallPhysical8A.create'));
 assert.ok(s.indexOf('const stored=SF.load()')<s.indexOf('os.store.restore(q.outpost5)'));
 assert.doesNotMatch(s,/StarfallPowerLedgerT02\.grid\(|\.importLot\(|\.setShipPosition\(/);
});
test('8H actual original source gas 8A reservation and each paid T02 pulse durably save original material, pressure packet and energy owner',()=>{
 assert.match(flight,/pressureGasPackets8h=StarfallPressureGasPackets8H\.create\(session\.logisticsPressureGasPackets8h\)/);
 assert.match(flight,/logisticsPressureGasPackets8h:pressureGasPackets8h\.snapshot\(\)/);
 assert.match(flight,/function logisticsPressureStart8H/);
 assert.match(flight,/function logisticsPressureNativeTick8H/);
 assert.match(flight,/logisticsPressureHasActive8H/);
 assert.match(flight,/StarfallPressureGasPackets8H\.create/);
 const a=flight.indexOf('function logisticsPressureNativeTick8H'),
 b=flight.indexOf('function logisticsOffworldContext8H');
 assert.ok(a>0&&b>a);
 const s=flight.slice(a,b);
 for(const marker of ['.observe(','materials8a:materials8a.snapshot()',
  'outpost5,powerReport','logisticsPressureGasPackets8h:q.packets',
  'SF.save(patch)','SF.load()','StarfallMaterials8A.create(q.materials8a)'])
  assert.ok(s.includes(marker),marker);
 assert.ok(s.indexOf('SF.save(patch)')<s.indexOf('materials8a=StarfallMaterials8A.create'));
 assert.doesNotMatch(s,/StarfallPowerLedgerT02\.grid\(|shipBody\s*=|pos\s*=|warp\s*=/);
 assert.doesNotMatch(gas,/StarfallPowerLedgerT02\.grid\(|\.energyJ\s*-=|\.importLot\(/);
});
test('actual original T02 charged the battery exactly once BEFORE observing gas and original habitat clock remains',()=>{
 const native=outpost.indexOf('report=store.power('),
   convection=outpost.indexOf('RT.logisticsConveyorNativeTick8H'),
   gasStep=outpost.indexOf('RT.logisticsPressureNativeTick8H');
 assert.ok(native>=0&&convection>native&&gasStep>convection);
 assert.match(outpost,/bodyId,outpost5:durableSnapshot\(\),powerReport:report/);
 assert.ok(outpost.indexOf('root.StarfallHabitatT09',gasStep)>gasStep,
  'original physically pressurized habitat T09 service must keep its place');
});
test('actual original Engineer UI requires paid 320kg pipe, real source/destination 8A stock, EVA and physical wiring',()=>{
 for(const marker of ['pressure8h-pipe','pressure8h-install-port',
   'pressure8h-open-wiring','pressure8h-start','pressure8h-mass',
   'logisticsPressureInstallPort8H','logisticsPressureStart8H','ctx.onFoot',
   'picked.massKg','420 W','8 MPa','original T02'])
  assert.ok(ui.includes(marker),marker);
 assert.doesNotMatch(ui,/\.importLot\(|spawnFree|giveGas\(/);
});
