'use strict';
const assert=require('node:assert/strict');
const Stock=require('../src/physics/material-ledger8a.js');
const Asset=require('../src/physics/physical-inventory8a.js');
const Installer=require('../src/physics/industrial-install8f.js');
const kit=Installer.KITS.cnc,stock=Stock.create();
stock.registerContainer({id:'ship',ownerId:'ship-main',maxMassKg:9000,maxVolumeM3:16});
for(const [materialId,massKg] of Object.entries(kit.parts))
 stock.importLot({id:'batch:'+materialId,materialId,containerId:'ship',massKg,volumeM3:massKg*.0005,grade:1,
 provenance:'manufacturing:'+materialId});
const assets=Asset.create(),initial=stock.used('ship').massKg,shipLocal=[0,1,0],
local=[Math.sin(.0003),Math.cos(.0003),0];
const opts={id:'factory8f:world:1',kitId:'cnc',materials:stock.snapshot(),assets:assets.serialize(),
 sourceContainerId:'ship',bodyId:'world',local,forward:[0,0,1],shipLocal,
 bodyRadiusScene:3000,energyReceipt:{operationId:'factory8f:world:1',sourceId:'ship-main:engineering-battery',usedJ:kit.workJ},existingStructures:[]};
const made=Installer.commission(opts);
assert.equal(Stock.create(made.materials).used('ship').massKg,0);
const installed=Asset.create(made.assets);
const machine=installed.get(opts.id);
assert.equal(machine.massKg,initial);assert.equal(machine.state.station,'machine');
assert.ok(machine.state.tools.includes('cnc'));assert.equal(machine.location.bodyId,'world');
assert.equal(installed.list().filter(a=>a.id===opts.id).length,1);
assert.throws(()=>Installer.commission({...opts,assets:made.assets,materials:made.materials}),/already commissioned/);
assert.throws(()=>Installer.commission({...opts,energyReceipt:{...opts.energyReceipt,usedJ:0}}),/energy/);
assert.throws(()=>Installer.commission({...opts,local:[1,0,0]}),/range/);
assert.throws(()=>Installer.commission({...opts,existingStructures:[{bodyId:'world',local}]}),/overlap/);
const bad=Stock.create(stock.snapshot()); // Grade below certification must fail.
const spoiled=bad.snapshot();spoiled.lots[0].grade=.5;
assert.throws(()=>Installer.commission({...opts,materials:spoiled}),/Missing manufactured/);
const missing=stock.snapshot();missing.lots.pop();
assert.throws(()=>Installer.commission({...opts,materials:missing}),/Missing manufactured/);
assert.equal(stock.used('ship').massKg,initial,'original input must remain intact when staging');
console.log('PASS: 8F physically commissioned CNC conserves mass, unique owner, tool capability, battery and site checks');
