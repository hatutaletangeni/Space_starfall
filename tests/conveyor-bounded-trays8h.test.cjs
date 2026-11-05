'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
require('../src/physics/material-ledger8a.js');
require('../src/physics/physical-inventory8a.js');
require('../src/physics/kit-recipes8f.js');
const Site=require('../src/physics/industrial-site8e.js');
const M=globalThis.StarfallMaterials8A;
const local=a=>[Math.cos(a),Math.sin(a),0];
function payload(){
 return{jobId:'plant8e:conveyor-tray:1',assetId:'facility8e:drive-tray-1',
  materials:{schema:1,containers:[{id:'8d:ship-main:materials',
   ownerId:'ship-main',maxMassKg:500,maxVolumeM3:20}],
   lots:[{id:'genuine-180kg-fabricated-kit',materialId:'plant_kit_conveyor_drive',
    containerId:'8d:ship-main:materials',massKg:180,volumeM3:.55,
    grade:.99,provenance:'8f:real-paid-fabrication'}],operations:[]},
  physical:{schema:1,assets:[],transfers:[]},
  shipContainerId:'8d:ship-main:materials',kitLotId:'genuine-180kg-fabricated-kit',
  bodyId:'star-0-p0',bodyRadius:1000,local:local(.05),
  shipLocal:local(0),operatorLocal:local(.05),
  energyReceipt:{operationId:'plant8e:conveyor-tray:1',
   sourceId:'ship-main:engineering-battery',usedJ:410000}};
}
test('8E installs one EMPTY physically owned 40kg/0.05m3 dry conveyor tray from real 180kg kit',()=>{
 const args=payload(),original=structuredClone(args);
 const out=Site.install(args);
 assert.equal(out.machine.massKg,180);
 assert.equal(out.machine.state.station,'conveyor_drive');
 assert.equal(out.machine.state.containerId,'conveyor8h:facility8e:drive-tray-1');
 const tray=out.materials.containers.find(c=>c.id===out.machine.state.containerId);
 assert.ok(tray,'real 8A bounded conveyor-tray container registered');
 assert.equal(tray.ownerId,out.machine.id);
 assert.equal(tray.kind,'guarded dry-solid conveyor tray');
 assert.equal(tray.maxMassKg,40);
 assert.equal(tray.maxVolumeM3,.05);
 assert.deepEqual(M.create(out.materials).inventory(tray.id),[]);
 assert.equal(out.materials.lots.length,0,'zero cargo can appear from hardware installation');
 assert.equal(out.physical.assets[0].massKg,180);
 assert.equal(out.physical.transfers[0].sourceLotId,'genuine-180kg-fabricated-kit');
 assert.deepEqual(args,original,'before durable commit no original owner mutates');
});
test('original 8A container capacity rejects material over 40kg or 0.05 m3',()=>{
 const q=Site.install(payload());
 const l=M.create(q.materials),id=q.machine.state.containerId;
 l.registerContainer({id:'real-ore-source',ownerId:'genuine-mine',
  maxMassKg:100,maxVolumeM3:2});
 l.importLot({id:'ore:1',materialId:'iron_ore',containerId:'real-ore-source',
  provenance:'8D:surveyed:ore',massKg:60,volumeM3:.12});
 assert.throws(()=>l.reserve('hold:too-heavy','ore:1',id,41),/capacity/);
 assert.throws(()=>l.reserve('hold:too-bulky','ore:1',id,30),/capacity/);
 assert.equal(l.inventory(id).length,0);
 assert.equal(l.inventory('real-ore-source')[0].massKg,60);
});
test('unpaid or unmanufactured kit can never create a conveyor tray',()=>{
 const p=payload();
 p.energyReceipt.usedJ=0;
 assert.throws(()=>Site.install(p),/Insufficient actual installation power/);
 p.energyReceipt.usedJ=410000;
 p.materials.lots.length=0;
 assert.throws(()=>Site.install(p),/not onboard/);
 assert.equal(p.materials.containers.length,1);
 assert.equal(p.physical.assets.length,0);
});
