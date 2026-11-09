/* Isolated TEST_FIXTURE: paid original T02 48 V power conservation.
 * Proves native rated modules (not free legacy 4kW or 72MJ devices), 680W
 * habitat power delivery, finite battery charging and no-source brownout.
 */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const script=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const shipReceipt=(id,kind,kg,workJ)=>({id,kind:'T02_PAID_INSTALL_8I',
 status:'COMMITTED',deviceId:'t02paid:'+id,bodyId:'planet',
 sourceContainerId:'8d:ship-main:materials',installedMassKg:kg,
 workJ,sourceBatteryJBefore:1000000,sourceBatteryJAfter:1000000-workJ});
function setup(fresh=true,forged=false){
 const ids=['t02paid8i:1','t02paid8i:2','t02paid8i:3'],
  receipts=[shipReceipt(ids[0],'solar',8.8,250000),
   shipReceipt(ids[1],'solar',8.8,250000),
   shipReceipt(ids[2],'battery',15.6,450000)];
 if(forged)receipts.pop();
 const saved={freshExpedition:fresh?{schema:1}:null,
  materials8a:{operations:receipts}};
 const sandbox={module:{exports:{}},SF:{load:()=>saved},console};
 sandbox.globalThis=sandbox;
 for(const p of ['src/physics/outposts.js','src/physics/power-ledger-t02.js'])
  vm.runInNewContext(script(p),sandbox,{filename:p});
 const O=sandbox.StarfallOutposts,T=sandbox.StarfallPowerLedgerT02;
 const items=ids.map((id,i)=>({
  id:'t02paid:'+id,kind:i===2?'battery':'solar',bodyId:'planet',
  local:[1,0,0],facing:[0,0,1],condition:1,enabled:true,
  installedMassKg:i===2?15.6:8.8,installOperationId:id,
  paidCertified8I:true,energyJ:0,temperatureK:290,
  ...(i===2?{ratedCapacityJ:9600000,ratedChargeW:1000,ratedDischargeW:1800}:
   {ratedSolarW:400,areaM2:2.3,efficiency:.24})
 }));
 items.push({id:'hab8i:structure8g:1',kind:'hab',bodyId:'planet',
  local:[1,0,0],facing:[0,0,1],condition:1,enabled:true,
  energyJ:0,temperatureK:290});
 const store=new O.Store(742,{schema:1,seed:742,serial:0,items,
  wires:[{a:items[0].id,b:items[2].id},
   {a:items[1].id,b:items[2].id},
   {a:items[2].id,b:items[3].id}],receipts:[],relays:[]});
 const body={id:'planet',position:[0,0,0],radius:100,
  kind:'moon',spinAxis:[0,1,0],spinAngle:0};
 const lum=4*Math.PI*9900**2*2000;
 return{saved,sandbox,O,T,store,items,body,lum};
}
test('two paid 400W modules supply an actual 680W habitat and charge finite battery only from surplus',()=>{
 const a=setup(),o=a.store.items;
 const report=a.T.grid(a.store,a.body,[10000,0,0],a.lum,100,30,1,[],()=>1);
 assert.ok(Math.abs(report.generationW-800)<1e-5,report.generationW);
 assert.equal(report.byId['hab8i:structure8g:1'].power,true,'680W habitat served on native 48V bus');
 assert.ok(report.servedW>=680);
 assert.ok(o[2].energyJ>0&&o[2].energyJ<9600000,'only real surplus charges real battery');
 assert.ok(report.chargedJ>0);
 assert.ok(report.chargedJ <= Math.max(0,report.generationW-report.servedW)*30);
 assert.ok(report.buses[0].sourceIds.includes(o[0].id));
 assert.ok(report.buses[0].sourceIds.includes(o[1].id));
});
test('paid empty battery cannot serve 680W habitat without sunlight, but previously charged storage can',()=>{
 const a=setup();
 const no=a.T.grid(a.store,a.body,[-10000,0,0],a.lum,0,1,1,[],()=>1);
 assert.equal(no.generationW,0);
 assert.equal(no.byId['hab8i:structure8g:1'].power,false);
 assert.equal(a.store.items[2].energyJ,0,'no old free 36MJ starter battery');
 a.T.grid(a.store,a.body,[10000,0,0],a.lum,60,60,1,[],()=>1);
 const stored=a.store.items[2].energyJ;
 assert.ok(stored>0);
 const night=a.T.grid(a.store,a.body,[-10000,0,0],a.lum,61,1,1,[],()=>1);
 assert.equal(night.generationW,0);
 assert.equal(night.byId['hab8i:structure8g:1'].power,true);
 assert.ok(a.store.items[2].energyJ<stored,'night battery energy is actually debited');
});
test('forged solar/battery modules in fresh Industrial save are disconnected by native restore',()=>{
 const a=setup(true,true);
 const bad=a.store.items.find(x=>x.kind==='battery');
 assert.equal(bad.paidCertified8I,false);
 assert.equal(bad.enabled,false);
 assert.equal(bad.energyJ,0);
 assert.equal(a.O.ratedSpec(bad).capacityJ,0);
 const noSolar=setup(true,false);
 noSolar.saved.materials8a.operations=[];
 noSolar.store.restore({schema:1,seed:742,items:noSolar.items,serial:0});
 for(const node of noSolar.store.items.filter(x=>['solar','battery'].includes(x.kind))){
  assert.equal(node.enabled,false);
  assert.equal(noSolar.O.ratedSpec(node).solarW,0);
  assert.equal(noSolar.O.ratedSpec(node).capacityJ,0);
 }
});
test('unmodified legacy solar/battery retain original T02 nameplates',()=>{
 const a=setup(false);
 const legacy=new a.O.Store(742,{schema:1,seed:742,items:[
  {id:'legacy-solar',kind:'solar',bodyId:'planet',local:[1,0,0],enabled:true},
  {id:'legacy-battery',kind:'battery',bodyId:'planet',local:[1,0,0],
    enabled:true,energyJ:36000000}]});
 assert.equal(a.O.ratedSpec(legacy.items[0]).solarW,4000);
 assert.equal(a.O.ratedSpec(legacy.items[1]).capacityJ,72000000);
 assert.equal(legacy.items[1].energyJ,36000000);
});
