'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
const read=x=>fs.readFileSync(path.join(root,x),'utf8');
const html=read('index.html'),flight=read('src/flight.js'),
 outposts=read('src/physics/outposts-ui.js'),
 ui=read('src/physics/logistics-conveyor-live-ui8h.js'),
 adapter=read('src/physics/conveyor-native-bridge8h.js');
test('source-owned 8A finite conveyor packets and already-paid native 48V bridge load before original flight',()=>{
 for(const name of ['logistics-powered-network8h.js','conveyor-packets8h.js',
  'conveyor-native-bridge8h.js']){
  const needle='src/physics/'+name;
  assert.ok(html.includes(needle),'missing physical source '+needle);
  assert.ok(html.indexOf(needle)<html.indexOf('src/flight.js'),needle+' must load before flight');
 }
 assert.ok(html.indexOf('src/physics/logistics-conveyor-live-ui8h.js')>
  html.indexOf('src/flight.js'));
});
test('runtime uses original 8A material and active T02 grid ownership for replay-safe durable packet advances',()=>{
 assert.match(flight,/conveyorPackets8h=StarfallConveyorPackets8H\.create\(session\.logisticsConveyorPackets8h\)/);
 assert.match(flight,/logisticsConveyorPackets8h:conveyorPackets8h\.snapshot\(\)/);
 assert.match(flight,/logisticsConveyorStart8H\(/);
 assert.match(flight,/logisticsConveyorNativeTick8H\(/);
 assert.match(flight,/StarfallConveyorNativeBridge8H\.observe/);
 assert.match(flight,/outpost5:store/);
 assert.match(flight,/outpost5};/);
 assert.match(flight,/SF\.save\(patch\)/);
 assert.match(flight,/SF\.storageStatus\(\)\.durable!==true/);
 const begin=flight.indexOf('function logisticsConveyorNativeTick8H('),
  end=flight.indexOf('function logisticsOffworldContext8H(');
 assert.ok(begin>0&&end>begin);
 const runtime=flight.slice(begin,end);
 assert.doesNotMatch(runtime,/StarfallPowerLedgerT02\.grid\(|shipBody\s*=|pos\s*=|warp\s*=/);
 assert.doesNotMatch(adapter,/StarfallPowerLedgerT02\.grid\(/);
});
test('native T02 finishes its real source-owned energy debit only ONCE and persists clock with material',()=>{
 assert.match(outposts,/function durableSnapshot\(\)/);
 assert.match(outposts,/lastPoweredAt:\{\.\.\.lastPoweredAt\}/);
 // 8H active packets now receive an exact native END-of-paid-pulse timestamp
 // rather than the older 600s midpoint stamp; verify both ORIGINAL T02
 // source clock and atomic source-owner write remain ahead of cargo movement.
 assert.match(outposts,/const nativeStepEndS=root\.StarfallNativePowerSubsteps8H\.endpoint\(start,plan,i\)/);
 assert.match(outposts,/lastPoweredAt\[bodyId\]=nativeStepEndS/);
 assert.match(outposts,/const nativeReportAtS=activePaid8H\?nativeStepEndS:atTime\+past/);
 const stamp=outposts.indexOf('report=store.power('),bridge=outposts.indexOf('RT.logisticsConveyorNativeTick8H(');
 assert.ok(stamp>0&&bridge>stamp,'native original power before conveyor observer');
 assert.match(outposts,/outpost5:durableSnapshot\(\)/);
});
test('Engineer UI reads actual original dry containers, T02 drives, and requires on-foot EVA',()=>{
 for(const s of ['logisticsConveyorContext8H','logisticsConveyorStart8H',
   'source.value','target.value','drive.value','lot.value','ctx.onFoot',
   'selectedLot','START PHYSICAL POWER-PAID PACKET'])assert.ok(ui.includes(s),s);
 assert.match(flight,/StarfallOutposts\.arc\(ctx\.operatorLocal,source\.location\.local,ctx\.bodyRadius\)>15/);
 assert.doesNotMatch(ui,/spawn\(|createFreeLot\(|setShipPosition\(/);
});
