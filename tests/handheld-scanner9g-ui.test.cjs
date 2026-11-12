'use strict';
const assert=require('node:assert/strict');
let save={},shipEnergyJ=150000,readings=0,opened=0;
global.SF={load:()=>save,save:patch=>{save={...save,...patch};return save;}};
const S=require('../src/physics/science-field.js'),M=require('../src/physics/handheld-scanner9g.js'),journal=S.journal(null);
const world={id:'test-9g-surface',landable:true,life:true,type:'Lush',kind:'planet',spinPeriod:600};
let eva=true,body=world;
const ctx=()=>({landed:true,eva,truckOccupied:false,manufacturedOccupied:false,
 body,local:[0,1,0],position:[0,0,0],forward:[0,0,-1]});
global.StarfallRuntime={
 outpostContext:ctx,get eva(){return eva},get truckOccupied(){return false},
 get manufacturedOccupied8G(){return false},get interiorState(){return null},
 acquireFieldReading:instrument=>S.sample({body,seed:742,local:[0,1,0],altitudeM:.6,
 instrument,simTime:readings+1,nonce:readings}),
 rechargeHandheldScanner9G(amount){if(!eva)throw Error('Requires EVA');const taken=Math.min(amount,shipEnergyJ);shipEnergyJ-=taken;return taken;}
};
global.StarfallScienceUI={
 measure(instrument){const obs=global.StarfallRuntime.acquireFieldReading(instrument);assert(journal.add(obs));readings++;return obs;},
 open(){opened++;}
};
global.StarfallEcologyUI={scene:()=>[{id:'wild-a-9g',kind:'aurora',position:[0,0,-10],alive:true,behavior:'cruise',encounterOnly:true}]};
const elementIds=['multitool9g','mt9g-mode','mt9g-scan','mt9g-charge','mt9g-energy','mt9g-battery',
 'mt9g-readout','mt9g-target','mt9g-progress','mt9g-journal'];
const nodes=new Map(elementIds.map(id=>[id,{id,style:{},value:'',textContent:'',hidden:id==='multitool9g',disabled:false,
 append(child){this.options??=[];this.options.push(child);},onchange:null,onclick:null}]));
global.document={getElementById:id=>nodes.get(id),createElement:tag=>({tag,value:'',textContent:''}),
 querySelectorAll:()=>[]};
const listeners=new Map();global.addEventListener=(kind,fn)=>listeners.set(kind,fn);
require('../src/physics/handheld-scanner-ui9g.js');
const UI=global.StarfallMultitoolUI9G;
const N=id=>nodes.get(id);
assert(!N('multitool9g').hidden,'scanner is on EVA HUD');
assert.equal(N('mt9g-mode').options.length,5);
let keyPrevented=0;
listeners.get('keydown')({code:'KeyP',repeat:false,ctrlKey:false,altKey:false,metaKey:false,
 target:{closest:()=>null},preventDefault(){keyPrevented++}});
assert(UI.isScanning,'keyboard P starts scanner');
assert.equal(keyPrevented,1);
assert.equal(readings,0,'start does not create an instantaneous reading');
assert.equal(UI.batteryJ,M.CAPACITY_J,'power remains until receipt succeeds');
for(let i=0;i<110;i++)UI.tick(.04);
assert(!UI.isScanning,'scanner completes after simulated wall time');
assert.equal(readings,1,'exactly one canonical journal receipt');
assert.equal(journal.list().length,1);
assert.equal(UI.batteryJ,M.CAPACITY_J-S.INSTRUMENTS.spectrometer.seconds*S.INSTRUMENTS.spectrometer.powerW);
assert.equal(SF.load().multitool9g.history[0].id,journal.list()[0].id,'tool log links original journal identity');
assert.equal(shipEnergyJ,150000,'scanning uses handheld energy, not ship power');
UI.recharge();
assert.equal(shipEnergyJ,150000-560,'recharge consumes exact source-owned ship Joules');
assert.equal(UI.batteryJ,M.CAPACITY_J,'source-paid refill completes');
assert.equal(SF.load().multitool9g.batteryJ,M.CAPACITY_J,'charge persists');
N('mt9g-mode').value='life';N('mt9g-mode').onchange();
assert.equal(UI.mode,'life');
assert(UI.start(),'bio scan starts');
assert(UI.isScanning);
for(let i=0;i<205;i++)UI.tick(.04);
assert.equal(readings,2);assert.equal(UI.status.history.at(-1).target,'wild-a-9g');
assert.equal(UI.status.history.at(-1).targetKind,'aurora');
assert.equal(UI.status.history.at(-1).instrument,'bioassay');
assert.equal(UI.status.history.at(-1).model,'procedural estimate');
assert.equal(UI.batteryJ,M.CAPACITY_J-1440);
assert(UI.start());
eva=false;UI.tick(.04);
assert(!UI.isScanning,'leaving EVA cancels pending acquisition');
assert(N('multitool9g').hidden,'HUD hides outside EVA');
assert.equal(readings,2,'cancelled reading does not write evidence or spend energy');
eva=true;UI.tick(.2);
assert(!N('multitool9g').hidden);
N('mt9g-journal').onclick();assert.equal(opened,1);
listeners.get('keydown')({code:'KeyO',repeat:false,ctrlKey:false,altKey:false,metaKey:false,
 target:{closest:()=>null},preventDefault(){keyPrevented++}});
assert.equal(UI.mode,'temperature','keyboard O cycles sensor mode');
console.log('PASS 9G actual handheld UI: EVA gating, keyboard/mobile buttons, timed source-backed scans, target identification, persistent log, exact paid ship recharging');
